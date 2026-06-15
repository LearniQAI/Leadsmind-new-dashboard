'use client';

import React, { useState } from 'react';
import { 
  Search, 
  ShieldAlert, 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  Plus, 
  X,
  FileCode,
  Lock,
  Calendar,
  DollarSign,
  Activity,
  User,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { 
  saveStrDraft, 
  finalizeAndFileStr, 
  previewStrSerialization 
} from '@/app/actions/complianceStr';
import { toast } from 'sonner';

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  id_number: string;
  kyc_risk_flag: string;
}

interface ComplianceAuditCenterProps {
  contacts: Contact[];
  initialReports: any[];
}

const PREDEFINED_ANOMALIES = [
  'Mismatched ID Number / Verification Mismatch',
  'Unusual High Value Cash Transaction',
  'Biometric Liveness Verification Mismatch',
  'Physical Address Verification Mismatch',
  'Third-Party Payment Routing Mismatch',
  'Corporate Ultimate Beneficial Owner Validation Fail'
];

export default function ComplianceAuditCenter({ contacts, initialReports }: ComplianceAuditCenterProps) {
  const [reports, setReports] = useState<any[]>(initialReports);
  const [activeTab, setActiveTab] = useState<'list' | 'draft' | 'preview'>('list');
  
  // Drafting Form States
  const [reportId, setReportId] = useState<string | undefined>(undefined);
  const [selectedContactId, setSelectedContactId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [currency, setCurrency] = useState<string>('ZAR');
  const [transactionDate, setTransactionDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState<string>('');
  const [anomalies, setAnomalies] = useState<string[]>([]);
  const [customAnomaly, setCustomAnomaly] = useState<string>('');
  
  // UI Interaction States
  const [contactSearchQuery, setContactSearchQuery] = useState<string>('');
  const [xmlPreview, setXmlPreview] = useState<string>('');
  const [jsonPreview, setJsonPreview] = useState<string>('');
  const [previewPayloadTab, setPreviewPayloadTab] = useState<'xml' | 'json'>('xml');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isFinalizing, setIsFinalizing] = useState<boolean>(false);
  const [selectedReportDetail, setSelectedReportDetail] = useState<any | null>(null);

  // Selected contact computed helper
  const selectedContact = contacts.find(c => c.id === selectedContactId);

  // Filter contacts based on search query
  const filteredContacts = contacts.filter(c => {
    const term = contactSearchQuery.toLowerCase();
    return (
      c.first_name.toLowerCase().includes(term) ||
      c.last_name.toLowerCase().includes(term) ||
      c.id_number.includes(term) ||
      c.email.toLowerCase().includes(term)
    );
  });

  // Toggle predefined anomalies
  const handleToggleAnomaly = (anomaly: string) => {
    if (anomalies.includes(anomaly)) {
      setAnomalies(anomalies.filter(a => a !== anomaly));
    } else {
      setAnomalies([...anomalies, anomaly]);
    }
  };

  // Add custom anomaly
  const handleAddCustomAnomaly = () => {
    if (!customAnomaly.trim()) return;
    if (!anomalies.includes(customAnomaly.trim())) {
      setAnomalies([...anomalies, customAnomaly.trim()]);
    }
    setCustomAnomaly('');
  };

  // Remove custom anomaly
  const handleRemoveAnomaly = (anomaly: string) => {
    setAnomalies(anomalies.filter(a => a !== anomaly));
  };

  // Preview FIC Schema serializations
  const handleGeneratePreview = async () => {
    if (!selectedContactId || !amount || !description) {
      toast.error('Please select a contact, and enter transaction details first.');
      return;
    }

    try {
      const res = await previewStrSerialization({
        contactId: selectedContactId,
        amount: parseFloat(amount),
        currency,
        transactionDate,
        description,
        anomalies
      });

      if (res.success && res.xml && res.json) {
        setXmlPreview(res.xml);
        setJsonPreview(JSON.stringify(res.json, null, 2));
        setActiveTab('preview');
        toast.success('FIC serialization schemas generated successfully!');
      } else {
        toast.error(res.error || 'Failed to generate FIC schema preview.');
      }
    } catch (err) {
      toast.error('An error occurred during serialization generation.');
    }
  };

  // Save draft action handler
  const handleSaveDraft = async () => {
    if (!selectedContactId || !amount || !description) {
      toast.error('Please select a contact, and fill out transaction amount and description.');
      return;
    }

    setIsSaving(true);
    try {
      const res = await saveStrDraft({
        contactId: selectedContactId,
        amount: parseFloat(amount),
        currency,
        transactionDate,
        description,
        anomalies
      }, reportId);

      if (res.success && res.report) {
        toast.success(reportId ? 'STR draft updated successfully!' : 'STR draft created successfully!');
        setReportId(res.report.id);
        
        // Refresh local reports list
        const updatedReports = reportId 
          ? reports.map(r => r.id === reportId ? { ...r, ...res.report } : r)
          : [res.report, ...reports];
        
        // Ensure contacts detail is linked locally
        const contactObj = contacts.find(c => c.id === selectedContactId);
        const reportWithContact = {
          ...res.report,
          contact: contactObj ? { first_name: contactObj.first_name, last_name: contactObj.last_name, id_number: contactObj.id_number } : null
        };

        setReports(reportId 
          ? reports.map(r => r.id === reportId ? reportWithContact : r)
          : [reportWithContact, ...reports]
        );

        setActiveTab('list');
      } else {
        toast.error(res.error || 'Failed to save draft.');
      }
    } catch (err) {
      toast.error('An error occurred while saving.');
    } finally {
      setIsSaving(false);
    }
  };

  // Finalize & File STR record (Absolute Lock)
  const handleFinalizeAndFile = async (id: string) => {
    if (!confirm('Are you sure you want to finalize and lock this STR? This will set str_filed to true, write-lock the record, and register it in the compliance vault. This action CANNOT be undone.')) {
      return;
    }

    setIsFinalizing(true);
    try {
      const res = await finalizeAndFileStr(id);
      if (res.success && res.report) {
        toast.success('STR finalized and locked successfully! Transmitted payload registered.');
        
        // Update local reports status
        setReports(reports.map(r => r.id === id ? { ...r, ...res.report } : r));
        
        if (selectedReportDetail?.id === id) {
          setSelectedReportDetail({ ...selectedReportDetail, ...res.report });
        }
        setActiveTab('list');
      } else {
        toast.error(res.error || 'Failed to finalize report.');
      }
    } catch (err) {
      toast.error('An error occurred during finalization.');
    } finally {
      setIsFinalizing(false);
    }
  };

  // Edit draft loader
  const handleLoadDraft = (report: any) => {
    setReportId(report.id);
    setSelectedContactId(report.contact_id);
    setAmount(report.transaction_details.amount.toString());
    setCurrency(report.transaction_details.currency || 'ZAR');
    setTransactionDate(report.transaction_details.transaction_date || '');
    setDescription(report.transaction_details.description || '');
    setAnomalies(report.anomalies || []);
    setContactSearchQuery('');
    
    // Automatically trigger preview schemas for preview tab
    setXmlPreview(report.xml_payload || '');
    setJsonPreview(report.json_payload ? JSON.stringify(report.json_payload, null, 2) : '');
    
    setActiveTab('draft');
  };

  // Reset drafting form
  const handleResetForm = () => {
    setReportId(undefined);
    setSelectedContactId('');
    setAmount('');
    setCurrency('ZAR');
    setTransactionDate(new Date().toISOString().split('T')[0]);
    setDescription('');
    setAnomalies([]);
    setContactSearchQuery('');
    setXmlPreview('');
    setJsonPreview('');
    setActiveTab('draft');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* LEFT COLUMN: Sidebar Navigation and Reports Log */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Navigation Tabs */}
        <div className="flex bg-[#0d1527] border border-slate-800 rounded-xl p-1 shadow-lg">
          <button
            onClick={() => setActiveTab('list')}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center justify-center space-x-2 ${
              activeTab === 'list' 
                ? 'bg-blue-600 text-white shadow-md' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
            }`}
          >
            <Activity size={16} />
            <span>Reports Log ({reports.length})</span>
          </button>
          <button
            onClick={handleResetForm}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center justify-center space-x-2 ${
              activeTab === 'draft' 
                ? 'bg-blue-600 text-white shadow-md' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
            }`}
          >
            <FileText size={16} />
            <span>Draft STR Canvas</span>
          </button>
          {xmlPreview && (
            <button
              onClick={() => setActiveTab('preview')}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center justify-center space-x-2 ${
                activeTab === 'preview' 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
              }`}
            >
              <FileCode size={16} />
              <span>FIC Transformation</span>
            </button>
          )}
        </div>

        {/* TAB 1: Reports List Log */}
        {activeTab === 'list' && (
          <div className="bg-[#0d1527] border border-slate-800 rounded-xl shadow-xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 bg-[#0d1527] flex items-center justify-between">
              <h3 className="font-bold text-white text-lg flex items-center space-x-2">
                <span>Suspicious Transaction Reports Ledger</span>
              </h3>
              <span className="text-xs text-slate-500 font-mono">Masked from standard CRM users</span>
            </div>

            <div className="overflow-x-auto">
              {reports.length === 0 ? (
                <div className="p-12 text-center">
                  <ShieldAlert className="mx-auto text-slate-600 mb-3" size={40} />
                  <p className="text-slate-400 font-medium">No Suspicious Transaction Reports logged.</p>
                  <p className="text-xs text-slate-500 mt-1">Select the "Draft STR Canvas" to record a suspicious activity draft.</p>
                </div>
              ) : (
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-900/60 border-b border-slate-800 text-slate-400 font-semibold uppercase text-xs">
                      <th className="p-4">Subject Contact</th>
                      <th className="p-4">Transaction Details</th>
                      <th className="p-4 text-center">Status</th>
                      <th className="p-4">Date Logged</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {reports.map((report) => {
                      const amountFormatted = `${report.transaction_details.currency} ${parseFloat(report.transaction_details.amount).toLocaleString()}`;
                      const isFiled = report.status === 'filed';
                      return (
                        <tr 
                          key={report.id}
                          className="hover:bg-slate-800/20 transition-colors duration-150 cursor-pointer"
                          onClick={() => setSelectedReportDetail(report)}
                        >
                          <td className="p-4">
                            <div className="font-semibold text-white">
                              {report.contact ? `${report.contact.first_name} ${report.contact.last_name}` : 'Unknown Contact'}
                            </div>
                            <div className="text-xs text-slate-400 font-mono">
                              ID: {report.contact?.id_number || 'N/A'}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="text-sm font-medium text-emerald-400 font-mono">
                              {amountFormatted}
                            </div>
                            <div className="text-xs text-slate-400 max-w-xs truncate">
                              {report.transaction_details.description}
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              isFiled 
                                ? 'bg-red-900/40 text-red-400 border border-red-800/60' 
                                : 'bg-amber-900/40 text-amber-400 border border-amber-800/60'
                            }`}>
                              {report.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="p-4 text-xs text-slate-400">
                            {new Date(report.created_at).toLocaleString('en-ZA')}
                          </td>
                          <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end space-x-2">
                              {!isFiled ? (
                                <>
                                  <button
                                    onClick={() => handleLoadDraft(report)}
                                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-2.5 py-1.5 rounded-lg border border-slate-700 font-semibold"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleFinalizeAndFile(report.id)}
                                    disabled={isFinalizing}
                                    className="bg-red-600 hover:bg-red-700 text-white text-xs px-2.5 py-1.5 rounded-lg font-semibold flex items-center space-x-1"
                                  >
                                    <Lock size={12} />
                                    <span>Lock & File</span>
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => setSelectedReportDetail(report)}
                                  className="bg-slate-900 text-slate-400 text-xs px-2.5 py-1.5 rounded-lg border border-slate-800 font-semibold cursor-pointer"
                                >
                                  View Output
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: Draft STR Canvas Form */}
        {activeTab === 'draft' && (
          <div className="bg-[#0d1527] border border-slate-800 rounded-xl p-6 shadow-xl space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                <FileText className="text-blue-500" size={20} />
                <span>{reportId ? 'Edit STR Draft Canvas' : 'STR Drafting & Canvas'}</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">Compile client verification outcomes, anomalies, and transaction parameters.</p>
            </div>

            {/* 1. Subject Contact Selector */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-300">Select Suspicious Account/Subject Contact</label>
              {!selectedContactId ? (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-3.5 text-slate-500" size={16} />
                    <input
                      type="text"
                      placeholder="Search contact by name, email, or ID number..."
                      value={contactSearchQuery}
                      onChange={(e) => setContactSearchQuery(e.target.value)}
                      className="w-full bg-[#04091a] border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
                    />
                  </div>
                  {contactSearchQuery && (
                    <div className="bg-[#04091a] border border-slate-800 rounded-xl divide-y divide-slate-800/80 max-h-48 overflow-y-auto">
                      {filteredContacts.length === 0 ? (
                        <p className="p-3 text-sm text-slate-500 text-center">No matching contacts found.</p>
                      ) : (
                        filteredContacts.map(c => (
                          <div
                            key={c.id}
                            onClick={() => {
                              setSelectedContactId(c.id);
                              setContactSearchQuery('');
                            }}
                            className="p-3 hover:bg-slate-800/30 cursor-pointer flex items-center justify-between text-sm transition-colors duration-150"
                          >
                            <div>
                              <div className="font-semibold text-white">{c.first_name} {c.last_name}</div>
                              <div className="text-xs text-slate-400 font-mono">ID: {c.id_number || 'N/A'}</div>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                              c.kyc_risk_flag === 'green' ? 'bg-green-900/40 text-green-400 border border-green-800/50' :
                              c.kyc_risk_flag === 'red' ? 'bg-red-900/40 text-red-400 border border-red-800/50' :
                              c.kyc_risk_flag === 'amber' ? 'bg-amber-900/40 text-amber-400 border border-amber-800/50' :
                              'bg-slate-850 text-slate-400 border border-slate-700/50'
                            }`}>
                              Risk: {c.kyc_risk_flag}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-[#04091a] border border-slate-800 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="bg-slate-800/60 p-2.5 rounded-lg">
                      <User className="text-blue-400" size={18} />
                    </div>
                    <div>
                      <div className="font-bold text-white">{selectedContact?.first_name} {selectedContact?.last_name}</div>
                      <div className="text-xs text-slate-400 font-mono">
                        ID: {selectedContact?.id_number || 'N/A'} | Email: {selectedContact?.email || 'N/A'}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedContactId('')}
                    className="text-slate-400 hover:text-slate-200 p-1.5 hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
            </div>

            {/* 2. Transaction Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-300">Transaction Amount</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 text-slate-500" size={16} />
                  <input
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-[#04091a] border border-slate-800 rounded-xl py-2.5 pl-9 pr-4 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 text-sm font-mono"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-300">Currency</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full bg-[#04091a] border border-slate-800 rounded-xl py-2.5 px-4 text-slate-200 focus:outline-none focus:border-blue-500 text-sm font-mono"
                >
                  <option value="ZAR">ZAR (R)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-300">Transaction Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 text-slate-500" size={16} />
                  <input
                    type="date"
                    value={transactionDate}
                    onChange={(e) => setTransactionDate(e.target.value)}
                    className="w-full bg-[#04091a] border border-slate-800 rounded-xl py-2.5 pl-9 pr-4 text-slate-200 focus:outline-none focus:border-blue-500 text-sm font-mono"
                  />
                </div>
              </div>
            </div>

            {/* 3. Transaction Description */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-300">Transaction Narrative & Suspicion Reason</label>
              <textarea
                rows={3}
                placeholder="Detail transaction history, anomalous cash flow behaviors, or suspicious narrative logged by compliance..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-[#04091a] border border-slate-800 rounded-xl p-4 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 text-sm"
              />
            </div>

            {/* 4. Predefined Verification Anomalies */}
            <div className="space-y-3">
              <label className="block text-sm font-bold text-slate-300">Select Verification Anomalies & Flags</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {PREDEFINED_ANOMALIES.map((anomaly, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleToggleAnomaly(anomaly)}
                    className={`p-3 border rounded-xl cursor-pointer transition-all duration-150 flex items-start space-x-3 text-xs ${
                      anomalies.includes(anomaly)
                        ? 'bg-blue-900/35 border-blue-600/60 text-blue-300 shadow-md'
                        : 'bg-[#04091a] border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={anomalies.includes(anomaly)}
                      onChange={() => {}} // toggled on container click
                      className="mt-0.5 rounded text-blue-600 focus:ring-0 focus:ring-offset-0"
                    />
                    <span>{anomaly}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 5. Custom Anomalies Registry */}
            <div className="space-y-3">
              <label className="block text-sm font-bold text-slate-300">Add Custom Anomaly / Flag</label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder="Enter custom operational flag or regulatory anomaly..."
                  value={customAnomaly}
                  onChange={(e) => setCustomAnomaly(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCustomAnomaly();
                    }
                  }}
                  className="flex-1 bg-[#04091a] border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 text-sm"
                />
                <button
                  type="button"
                  onClick={handleAddCustomAnomaly}
                  className="bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 px-4 py-2.5 rounded-xl font-semibold flex items-center space-x-1.5 text-sm"
                >
                  <Plus size={16} />
                  <span>Add</span>
                </button>
              </div>

              {/* Custom tags list */}
              {anomalies.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {anomalies.map((a, idx) => (
                    <span
                      key={idx}
                      className="bg-slate-800/80 text-slate-300 px-3 py-1 rounded-full text-xs font-medium border border-slate-750 flex items-center space-x-2"
                    >
                      <span className="truncate max-w-[200px]">{a}</span>
                      <button
                        onClick={() => handleRemoveAnomaly(a)}
                        className="text-slate-400 hover:text-slate-200 p-0.5 rounded-full hover:bg-slate-700"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Form Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 border-t border-slate-800 pt-5">
              <button
                type="button"
                onClick={handleGeneratePreview}
                className="w-full sm:w-auto bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center space-x-2"
              >
                <FileCode size={16} />
                <span>Serialize FIC Schemas</span>
              </button>
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={isSaving}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center space-x-2"
              >
                {isSaving ? (
                  <span>Saving...</span>
                ) : (
                  <>
                    <FileText size={16} />
                    <span>Save STR Draft</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: Schema transformation engine output */}
        {activeTab === 'preview' && (
          <div className="bg-[#0d1527] border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                  <FileCode className="text-emerald-500" size={20} />
                  <span>FIC Schema Serialization Output</span>
                </h3>
                <p className="text-xs text-slate-400">Compliant South African Financial Intelligence Centre transport schemas.</p>
              </div>
              
              {/* Serialization Payload Selector */}
              <div className="flex bg-[#04091a] border border-slate-800 rounded-lg p-0.5">
                <button
                  onClick={() => setPreviewPayloadTab('xml')}
                  className={`px-3 py-1 rounded text-xs font-semibold ${
                    previewPayloadTab === 'xml' 
                      ? 'bg-emerald-600 text-white' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  XML Format (goAML)
                </button>
                <button
                  onClick={() => setPreviewPayloadTab('json')}
                  className={`px-3 py-1 rounded text-xs font-semibold ${
                    previewPayloadTab === 'json' 
                      ? 'bg-emerald-600 text-white' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  JSON Payload
                </button>
              </div>
            </div>

            {/* Payload Display */}
            <div className="bg-[#04091a] border border-slate-800 rounded-xl p-4 overflow-x-auto max-h-96">
              <pre className="text-xs text-emerald-400 font-mono whitespace-pre select-all">
                {previewPayloadTab === 'xml' ? xmlPreview : jsonPreview}
              </pre>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
              <div className="flex items-center space-x-2 text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Ready for FIC Transport Layer</span>
              </div>
              <button
                onClick={() => setActiveTab('draft')}
                className="text-blue-400 hover:text-blue-300 font-semibold"
              >
                Return to Draft Canvas
              </button>
            </div>
          </div>
        )}

      </div>

      {/* RIGHT COLUMN: Right-aligned Detail view and Auditing metrics */}
      <div className="space-y-6">
        
        {/* Detail Panel for selected report */}
        {selectedReportDetail ? (
          <div className="bg-[#0d1527] border border-slate-800 rounded-xl p-6 shadow-xl space-y-6 relative overflow-hidden">
            {/* Top red warning overlay indicator for filed items */}
            {selectedReportDetail.status === 'filed' && (
              <div className="absolute top-0 right-0 left-0 bg-red-950/80 border-b border-red-800 px-4 py-2 flex items-center justify-between text-xs text-red-400 font-semibold uppercase tracking-wider">
                <div className="flex items-center space-x-2">
                  <Lock size={12} />
                  <span>Finalized Compliance Lock</span>
                </div>
                <span className="font-mono">FICA STR Secure</span>
              </div>
            )}

            <div className={`${selectedReportDetail.status === 'filed' ? 'pt-6' : ''} space-y-4`}>
              <div className="flex items-start justify-between border-b border-slate-800 pb-4">
                <div>
                  <h4 className="font-extrabold text-white text-lg">STR Details Preview</h4>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">Report ID: {selectedReportDetail.id.slice(0, 13).toUpperCase()}...</p>
                </div>
                <button
                  onClick={() => setSelectedReportDetail(null)}
                  className="text-slate-400 hover:text-slate-200 p-1 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Contact Profile Grid */}
              <div className="bg-[#04091a] border border-slate-800 rounded-xl p-4 space-y-3">
                <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Subject Profile</h5>
                <div>
                  <div className="text-sm font-semibold text-white">
                    {selectedReportDetail.contact ? `${selectedReportDetail.contact.first_name} ${selectedReportDetail.contact.last_name}` : 'Unknown Contact'}
                  </div>
                  <div className="text-xs text-slate-400 font-mono mt-0.5">
                    ID Card suffix: {selectedReportDetail.contact?.id_number || 'N/A'}
                  </div>
                </div>
              </div>

              {/* Transaction specifics */}
              <div className="bg-[#04091a] border border-slate-800 rounded-xl p-4 space-y-3">
                <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Transaction Specifics</h5>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-slate-400 block">Report Amount</span>
                    <span className="text-sm font-bold text-emerald-400 font-mono">
                      {selectedReportDetail.transaction_details.currency} {parseFloat(selectedReportDetail.transaction_details.amount).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block">Value Date</span>
                    <span className="text-sm text-slate-200 font-mono">{selectedReportDetail.transaction_details.transaction_date}</span>
                  </div>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block">Narrative / Reason</span>
                  <p className="text-xs text-slate-350 mt-1 leading-relaxed">{selectedReportDetail.transaction_details.description}</p>
                </div>
              </div>

              {/* Anomaly list */}
              {selectedReportDetail.anomalies && selectedReportDetail.anomalies.length > 0 && (
                <div className="bg-[#04091a] border border-slate-800 rounded-xl p-4 space-y-3">
                  <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Anomalies Detected ({selectedReportDetail.anomalies.length})</h5>
                  <ul className="space-y-1.5">
                    {selectedReportDetail.anomalies.map((anomaly: string, index: number) => (
                      <li key={index} className="flex items-start space-x-2 text-xs text-slate-300">
                        <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={12} />
                        <span>{anomaly}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Transmitted payload toggle */}
              {selectedReportDetail.status === 'filed' && (selectedReportDetail.xml_payload || selectedReportDetail.json_payload) && (
                <div className="border border-slate-800 rounded-xl overflow-hidden bg-[#04091a]">
                  <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 text-xs font-bold text-slate-300 flex items-center justify-between">
                    <span>Transmitted FIC Payloads</span>
                  </div>
                  <div className="p-3 text-[11px] text-emerald-400 font-mono max-h-48 overflow-y-auto whitespace-pre">
                    {selectedReportDetail.xml_payload}
                  </div>
                </div>
              )}

              {/* Action for drafts */}
              {selectedReportDetail.status !== 'filed' && (
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleLoadDraft(selectedReportDetail)}
                    className="flex-1 py-2 bg-slate-800 border border-slate-700 hover:bg-slate-750 text-slate-200 rounded-xl font-semibold text-xs transition"
                  >
                    Edit Draft
                  </button>
                  <button
                    onClick={() => handleFinalizeAndFile(selectedReportDetail.id)}
                    disabled={isFinalizing}
                    className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold text-xs flex items-center justify-center space-x-1.5 transition"
                  >
                    <Lock size={12} />
                    <span>Lock & File STR</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Static audit parameters */
          <div className="bg-[#0d1527] border border-slate-800 rounded-xl p-6 shadow-xl space-y-6">
            <h4 className="font-extrabold text-white text-md border-b border-slate-800 pb-3 flex items-center space-x-2">
              <ShieldAlert className="text-red-500" size={18} />
              <span>South African FICA Audit Parameters</span>
            </h4>
            
            <div className="space-y-4 text-xs">
              <p className="text-slate-400 leading-relaxed">
                As a registered accountable institution in South Africa under FICA guidelines, all transactions carrying suspicions of money laundering or terrorist financing must be filed as a <strong>Suspicious Transaction Report (STR)</strong> under Section 29 of the FIC Act.
              </p>
              
              <div className="bg-[#04091a] border border-slate-800 rounded-xl p-4 space-y-3 text-slate-300">
                <h5 className="font-bold text-slate-200">FICA Compliance Rules:</h5>
                <ul className="space-y-2 list-disc list-inside text-slate-400">
                  <li>File within 15 working days from detection.</li>
                  <li>Absolute write-lock encryption at rest.</li>
                  <li>No tipping-off to the suspect contact.</li>
                  <li>Keep audit logs and FICA POPIA consent records for at least 5 years.</li>
                </ul>
              </div>

              <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 text-slate-500 font-mono text-[10px] flex items-start space-x-2">
                <Lock size={14} className="shrink-0 text-slate-600 mt-0.5" />
                <span>
                  STR details are masked from standard sales/CRM workspace roles to prevent intentional or accidental tipping-off. Only compliance and administrator roles possess schema permissions.
                </span>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
