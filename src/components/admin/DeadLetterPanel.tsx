'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function DeadLetterPanel({ initialData }: { initialData: any[] }) {
  const [data, setData] = useState(initialData);
  const [filterProvider, setFilterProvider] = useState('');
  const [filterState, setFilterState] = useState('');
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const supabase = createClient();

  const handleReplay = async (id: string, provider: string, payload: any) => {
    setLoadingId(id);
    try {
      const res = await fetch('/api/admin/dead-letters/replay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, provider, payload })
      });
      if (res.ok) {
        // Mark as resolved locally
        setData(data.map(d => d.id === id ? { ...d, retry_state: 'resolved' } : d));
      } else {
        alert('Replay failed');
      }
    } catch (e) {
      alert('Error during replay');
    }
    setLoadingId(null);
  };

  const handleResolve = async (id: string) => {
    setLoadingId(id);
    const { error } = await supabase.from('webhook_dead_letters').update({ retry_state: 'resolved' }).eq('id', id);
    if (!error) {
      setData(data.map(d => d.id === id ? { ...d, retry_state: 'resolved' } : d));
    }
    setLoadingId(null);
  };

  const filtered = data.filter(d => 
    (filterProvider ? d.provider === filterProvider : true) &&
    (filterState ? d.retry_state === filterState : true)
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-200 flex gap-4 bg-gray-50">
        <select className="border border-gray-300 rounded px-3 py-1.5" onChange={e => setFilterProvider(e.target.value)}>
          <option value="">All Providers</option>
          <option value="resend">Resend</option>
          <option value="twilio_inbound">Twilio Inbound</option>
          <option value="twilio_outbound">Twilio Outbound</option>
          <option value="email_deliverability">Deliverability</option>
        </select>
        <select className="border border-gray-300 rounded px-3 py-1.5" onChange={e => setFilterState(e.target.value)}>
          <option value="">All States</option>
          <option value="pending">Pending</option>
          <option value="dropped">Dropped</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs border-b">
            <tr>
              <th className="px-6 py-3">Timestamp</th>
              <th className="px-6 py-3">Provider</th>
              <th className="px-6 py-3">Error</th>
              <th className="px-6 py-3">State</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filtered.map(item => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">{new Date(item.timestamp).toLocaleString()}</td>
                <td className="px-6 py-4">
                  <span className="font-medium text-gray-900">{item.provider}</span>
                  <div className="text-xs text-gray-500">{item.error_type}</div>
                </td>
                <td className="px-6 py-4 max-w-xs truncate text-red-600" title={item.error}>{item.error}</td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium
                    ${item.retry_state === 'resolved' ? 'bg-green-100 text-green-800' : 
                      item.retry_state === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>
                    {item.retry_state}
                  </span>
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button 
                    onClick={() => handleReplay(item.id, item.provider, item.payload)}
                    disabled={loadingId === item.id || item.retry_state === 'resolved'}
                    className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                  >
                    Replay
                  </button>
                  <button 
                    onClick={() => handleResolve(item.id)}
                    disabled={loadingId === item.id || item.retry_state === 'resolved'}
                    className="text-gray-600 hover:text-gray-900 disabled:opacity-50"
                  >
                    Resolve
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">No dead letters found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
