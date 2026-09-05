'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import TopNav from '../../components/TopNav';
import Footer from '../../components/Footer';
import { 
  FaHistory, 
  FaShieldAlt, 
  FaFilter, 
  FaLock, 
  FaCheckCircle, 
  FaUserSecret,
  FaFileAlt
} from 'react-icons/fa';

interface AuditItem {
  id: string;
  officerName: string;
  action: string;
  resource: string;
  details: string;
  ipAddress: string;
  timestamp: string;
}

export default function AuditTrailPage() {
  const [logs, setLogs] = useState<AuditItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const query = actionFilter ? `?action=${actionFilter}` : '';
      const res = await fetch(`${apiUrl}/api/v1/audit/logs${query}`);
      const data = await res.json();
      if (data.success) {
        setLogs(data.data);
      }
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter]);

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'UPLOAD_DOCUMENT':
      case 'REGISTER_FIR':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-700">UPLOAD / ANCHOR</span>;
      case 'TRANSFER_CUSTODY':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700">CUSTODY TRANSFER</span>;
      case 'REDACT_PROTECT_DOCUMENT':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-pink-950 text-pink-300 border border-pink-700">PII REDACTION (WSD)</span>;
      case 'EXPORT_65B_CERTIFICATE':
      case 'VERIFY':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-700">65B VERIFICATION</span>;
      case 'UPDATE_CASE_STATUS':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-950 text-blue-300 border border-blue-700">STATUS UPDATE</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">{action}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      <TopNav title="National Evidence & Legal Document Audit Trail" subtitle="Immutable cryptographic record of all document uploads, handovers, and judicial inspections" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-8">
        {/* Header Summary */}
        <div className="bg-slate-800/80 rounded-2xl border border-slate-700 p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-900/80 border border-indigo-700 text-indigo-400 flex items-center justify-center text-2xl">
              <FaHistory />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold text-white">Cryptographic Audit & Access Log</h1>
                <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 text-xs font-semibold border border-emerald-700">
                  Non-Repudiation Verified
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Every action is non-repudiable and tied to the officer digital identity and IP address.
              </p>
            </div>
          </div>

          {/* Action Filter */}
          <div className="flex items-center space-x-2 text-xs">
            <FaFilter className="text-slate-400" />
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Audit Actions</option>
              <option value="UPLOAD_DOCUMENT">Document Upload</option>
              <option value="TRANSFER_CUSTODY">Chain of Custody Handover</option>
              <option value="REDACT_PROTECT_DOCUMENT">PII Redaction (Women Safety)</option>
              <option value="EXPORT_65B_CERTIFICATE">Section 65B Certificate</option>
              <option value="UPDATE_CASE_STATUS">Case Status Update</option>
            </select>
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-xl overflow-hidden">
          <div className="p-4 border-b border-slate-700/80 flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center space-x-2">
              <FaShieldAlt className="text-indigo-400" />
              <span>Event Stream ({logs.length} logged events)</span>
            </h2>
            <button
              onClick={fetchLogs}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
            >
              Refresh Logs
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/80 text-slate-400 text-[11px] uppercase font-semibold border-b border-slate-700">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Authorized Officer</th>
                  <th className="px-4 py-3">Target Resource</th>
                  <th className="px-4 py-3">Audit Details</th>
                  <th className="px-4 py-3">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60 font-mono text-[11px]">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 font-sans text-slate-500">
                      Loading audit logs...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 font-sans text-slate-500">
                      No audit events found for this filter.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-700/30 transition-colors">
                      <td className="px-4 py-3 text-slate-400 whitespace-nowrap font-sans">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-sans">
                        {getActionBadge(log.action)}
                      </td>
                      <td className="px-4 py-3 text-white font-sans font-semibold">
                        {log.officerName || 'System Admin'}
                      </td>
                      <td className="px-4 py-3 text-amber-300 max-w-[200px] truncate">
                        {log.resource}
                      </td>
                      <td className="px-4 py-3 text-slate-400 max-w-[280px] truncate font-sans">
                        {log.details || '-'}
                      </td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                        {log.ipAddress}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
