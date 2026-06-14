'use client';

import React, { useState, useMemo } from 'react';
import { Calendar, FileText, Download, Printer, X, ShieldCheck, Scale } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface StatementGeneratorModalProps {
  contact: any;
  workspace: any;
  invoices: any[];
}

export default function StatementGeneratorModal({
  contact,
  workspace,
  invoices,
}: StatementGeneratorModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Default date range: current calendar year
  const currentYear = new Date().getFullYear();
  const [startDate, setStartDate] = useState(`${currentYear}-01-01`);
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const statementData = useMemo(() => {
    if (!startDate || !endDate) return null;

    const start = new Date(startDate);
    const end = new Date(endDate);
    // Include the entire end day
    end.setHours(23, 59, 59, 999);

    let openingBalance = 0;
    const ledgerLines: any[] = [];

    // Filter and process all invoices
    invoices.forEach(inv => {
      const createdDate = new Date(inv.created_at);
      const totalAmt = Number(inv.total_amount || 0);
      const paidAmt = Number(inv.amount_paid || 0);
      
      // Resolve payment date
      const paymentDate = inv.paid_at 
        ? new Date(inv.paid_at) 
        : (inv.status === 'paid' ? new Date(inv.updated_at || inv.created_at) : null);

      // 1. Calculate Opening Balance (prior to start date)
      if (createdDate < start) {
        openingBalance += totalAmt;
      }
      if (paymentDate && paymentDate < start) {
        openingBalance -= paidAmt;
      }

      // 2. Capture transactions in date range
      // Invoice creation transaction (Debit)
      if (createdDate >= start && createdDate <= end) {
        ledgerLines.push({
          date: createdDate,
          type: 'Invoice',
          docNumber: inv.invoice_number || `INV-${inv.id.substring(0, 8)}`,
          description: inv.notes || `Invoice for services`,
          debit: totalAmt,
          credit: 0,
        });
      }

      // Payment confirmation transaction (Credit)
      if (paymentDate && paymentDate >= start && paymentDate <= end && paidAmt > 0) {
        ledgerLines.push({
          date: paymentDate,
          type: 'Payment',
          docNumber: `REC-${inv.id.substring(0, 8)}`,
          description: `Payment Received — Thank You`,
          debit: 0,
          credit: paidAmt,
        });
      }
    });

    // Sort ledger lines chronologically
    ledgerLines.sort((a, b) => a.date.getTime() - b.date.getTime());

    // Calculate running balance and accumulated totals
    let runningBalance = openingBalance;
    let totalInvoiced = 0;
    let totalPaid = 0;

    const processedLines = ledgerLines.map(line => {
      runningBalance += (line.debit - line.credit);
      totalInvoiced += line.debit;
      totalPaid += line.credit;
      return {
        ...line,
        runningBalance,
      };
    });

    const closingBalance = runningBalance;

    return {
      openingBalance,
      closingBalance,
      totalInvoiced,
      totalPaid,
      lines: processedLines,
    };
  }, [invoices, startDate, endDate]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 bg-[#111d47]/60 hover:bg-[#111d47] text-blue-400 hover:text-white border border-blue-500/10 hover:border-blue-500/30 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
      >
        <FileText size={14} /> Account Statement
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-[#04091a]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto no-print">
          <div className="bg-[#0b1121] border border-white/10 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold uppercase tracking-tight text-white font-space">
                  Generate <span className="text-[var(--accent2)]">Account Statement</span>
                </h2>
                <p className="text-[10px] text-t3 uppercase tracking-wider mt-1">SARS tax compliance self-generation</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center text-[#4a5a82] hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Date Selection Panel */}
            <div className="p-6 bg-[#111d47]/20 border-b border-white/5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#4a5a82]">Start Date</label>
                <div className="relative">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-[#080f28] border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#4a5a82]">End Date</label>
                <div className="relative">
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-[#080f28] border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Statement Preview */}
            <div className="flex-1 overflow-y-auto p-8 bg-gray-100/10 min-h-[400px]">
              {statementData ? (
                <div id="sars-statement" className="bg-white text-gray-900 p-12 shadow-inner font-sans max-w-[210mm] mx-auto min-h-[297mm] printable-area border border-gray-200">
                  {/* Print Styles */}
                  <style dangerouslySetInnerHTML={{__html: `
                    @media print {
                      body * {
                        visibility: hidden;
                      }
                      #sars-statement, #sars-statement * {
                        visibility: visible;
                      }
                      #sars-statement {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        border: none;
                        box-shadow: none;
                        padding: 0;
                        margin: 0;
                        color: #000;
                        background: #fff;
                      }
                    }
                  `}} />

                  {/* Header */}
                  <div className="flex justify-between items-start border-b-4 border-gray-900 pb-6 mb-8">
                    <div>
                      <h1 className="text-3xl font-black uppercase tracking-tighter text-gray-950 mb-1">
                        Statement of Account
                      </h1>
                      <div className="flex items-center gap-1.5 text-[9px] font-black text-blue-600 uppercase tracking-widest">
                        <ShieldCheck size={12} /> SARS Standard Ledger
                      </div>
                    </div>
                    <div className="text-right text-xs">
                      <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Statement Period</p>
                      <p className="font-bold font-mono">
                        {format(new Date(startDate), 'dd MMM yyyy')} – {format(new Date(endDate), 'dd MMM yyyy')}
                      </p>
                    </div>
                  </div>

                  {/* Seller / Customer Details */}
                  <div className="grid grid-cols-2 gap-12 text-xs mb-8">
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100 pb-1.5 mb-2">Issuer</p>
                      <h3 className="font-black text-gray-950 uppercase">{workspace?.name || 'LeadsMind Merchant'}</h3>
                      <p className="text-gray-500 font-medium leading-relaxed mt-1 whitespace-pre-line">
                        {workspace?.registered_address || 'Registered Address not configured'}
                      </p>
                      {workspace?.vat_number && (
                        <p className="mt-2 font-bold">VAT No: <span className="font-mono">{workspace.vat_number}</span></p>
                      )}
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100 pb-1.5 mb-2">Recipient</p>
                      <h3 className="font-black text-gray-950 uppercase">{contact?.first_name} {contact?.last_name || ''}</h3>
                      <p className="text-gray-500 font-medium mt-1">{contact?.email}</p>
                      {contact?.phone && <p className="text-gray-500 font-medium font-mono">{contact.phone}</p>}
                    </div>
                  </div>

                  {/* Financial Summary Box */}
                  <div className="grid grid-cols-4 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200/60 mb-8 text-center">
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Opening Balance</p>
                      <p className="text-sm font-black font-mono">R {statementData.openingBalance.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Total Invoiced</p>
                      <p className="text-sm font-black font-mono text-gray-900">+ R {statementData.totalInvoiced.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Total Payments</p>
                      <p className="text-sm font-black font-mono text-emerald-600">- R {statementData.totalPaid.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Closing Balance</p>
                      <p className="text-sm font-black font-mono text-blue-600">R {statementData.closingBalance.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</p>
                    </div>
                  </div>

                  {/* Transaction Table */}
                  <table className="w-full text-xs mb-12">
                    <thead>
                      <tr className="border-b-2 border-gray-900 text-[9px] font-black uppercase tracking-widest text-gray-400 text-left">
                        <th className="py-2.5">Date</th>
                        <th className="py-2.5">Doc Type</th>
                        <th className="py-2.5">Doc Number</th>
                        <th className="py-2.5">Description</th>
                        <th className="py-2.5 text-right">Debit (Inv)</th>
                        <th className="py-2.5 text-right">Credit (Paid)</th>
                        <th className="py-2.5 text-right">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium">
                      {/* Opening Balance Row */}
                      <tr className="bg-gray-50/50 font-bold">
                        <td className="py-3 font-mono">{format(new Date(startDate), 'yyyy-MM-dd')}</td>
                        <td className="py-3" colSpan={3}>Opening Balance Carried Forward</td>
                        <td className="py-3 text-right"></td>
                        <td className="py-3 text-right"></td>
                        <td className="py-3 text-right font-mono">R {statementData.openingBalance.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
                      </tr>

                      {/* Dynamic ledger lines */}
                      {statementData.lines.map((line, idx) => (
                        <tr key={idx}>
                          <td className="py-3 text-gray-500 font-mono">{format(line.date, 'yyyy-MM-dd')}</td>
                          <td className="py-3 text-gray-700">{line.type}</td>
                          <td className="py-3 font-mono font-bold text-gray-900">{line.docNumber}</td>
                          <td className="py-3 text-gray-500 max-w-[200px] truncate">{line.description}</td>
                          <td className="py-3 text-right font-mono">
                            {line.debit > 0 ? `R ${line.debit.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}` : ''}
                          </td>
                          <td className="py-3 text-right font-mono text-emerald-600">
                            {line.credit > 0 ? `R ${line.credit.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}` : ''}
                          </td>
                          <td className="py-3 text-right font-mono text-gray-900 font-bold">
                            R {line.runningBalance.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}

                      {/* Summary closing line */}
                      <tr className="bg-gray-50 font-black">
                        <td className="py-3.5 font-mono">{format(new Date(endDate), 'yyyy-MM-dd')}</td>
                        <td className="py-3.5" colSpan={3}>Statement Closing Balance</td>
                        <td className="py-3.5 text-right"></td>
                        <td className="py-3.5 text-right"></td>
                        <td className="py-3.5 text-right font-mono text-blue-600">
                          R {statementData.closingBalance.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Declaration Footer */}
                  <div className="flex justify-between items-start border-t border-gray-200 pt-8 mt-12 text-[10px] text-gray-400">
                    <div className="flex items-center gap-1.5">
                      <Scale size={14} />
                      <p>SARS Tax compliance certified ledger document.</p>
                    </div>
                    <p className="font-mono">Generated: {format(new Date(), 'yyyy-MM-dd HH:mm:ss')}</p>
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-[#4a5a82] text-xs">
                  Please select valid dates.
                </div>
              )}
            </div>

            {/* Modal Footer Controls */}
            <div className="p-6 border-t border-white/5 flex items-center justify-end gap-3">
              <button
                onClick={() => setIsOpen(false)}
                className="px-5 py-2.5 rounded-xl border border-white/5 text-xs text-t3 hover:text-white font-bold transition-all"
              >
                Close
              </button>
              <button
                onClick={handlePrint}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all inline-flex items-center gap-2"
              >
                <Printer size={14} /> Print / Save PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
