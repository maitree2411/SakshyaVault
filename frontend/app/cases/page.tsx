'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import TopNav from '../../components/TopNav';
import Footer from '../../components/Footer';
import { 
  FaFolderOpen, 
  FaSearch, 
  FaFilter, 
  FaShieldAlt, 
  FaUserSecret, 
  FaFileAlt, 
  FaArrowRight,
  FaPlusCircle
} from 'react-icons/fa';

interface CaseItem {
  id: string;
  caseNumber: string;
  firNumber: string;
  title: string;
  description: string;
  policeStation: string;
  district: string;
  state: string;
  sections: string;
  status: string;
  isSensitive: boolean;
  createdAt: string;
  investigatingOfficer?: {
    name: string;
    department: string;
    badgeNumber: string;
  };
  _count: {
    documents: number;
  };
}

export default function CasesDirectory() {
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sensitiveOnly, setSensitiveOnly] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const fetchCases = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      if (sensitiveOnly) params.append('isSensitive', 'true');

      const res = await fetch(`${apiUrl}/api/v1/cases?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setCases(data.data);
      }
    } catch (error) {
      console.error('Error fetching cases:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, [statusFilter, sensitiveOnly]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCases();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'UNDER_INVESTIGATION':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-900/60 text-amber-300 border border-amber-700">Under Investigation</span>;
      case 'CHARGE_SHEETED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-900/60 text-indigo-300 border border-indigo-700">Charge Sheet Filed</span>;
      case 'IN_TRIAL':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-900/60 text-emerald-300 border border-emerald-700">In Judicial Trial</span>;
      case 'DISPOSED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-700 text-slate-300">Disposed</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300">{status}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      <TopNav title="Central Case & Investigation Dossier Repository" subtitle="Official repository of active police investigations, FIR records, and court filings" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full">
        {/* Top Header Controls */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center space-x-2">
              <FaFolderOpen className="text-indigo-400" />
              <span>Investigation Case Dossiers</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Browse, inspect, and verify tamper-proof digital case files across all police stations
            </p>
          </div>

          <Link
            href="/police"
            className="self-start md:self-auto px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center space-x-2 shadow-md transition-colors"
          >
            <FaPlusCircle />
            <span>File New FIR / Case</span>
          </Link>
        </div>

        {/* Filter & Search Bar */}
        <div className="mt-6 bg-slate-800/80 p-4 rounded-xl border border-slate-700 flex flex-col md:flex-row gap-3">
          <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <FaSearch className="absolute left-3.5 top-3 text-slate-400 text-xs" />
              <input
                type="text"
                placeholder="Search by Case No, FIR No, Police Station, or IPC/BNS Section..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs text-white font-medium transition-colors"
            >
              Search
            </button>
          </form>

          <div className="flex items-center gap-3">
            <div className="flex items-center space-x-2">
              <FaFilter className="text-slate-400 text-xs" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="">All Statuses</option>
                <option value="UNDER_INVESTIGATION">Under Investigation</option>
                <option value="CHARGE_SHEETED">Charge Sheet Filed</option>
                <option value="IN_TRIAL">In Judicial Trial</option>
                <option value="DISPOSED">Disposed</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => setSensitiveOnly(!sensitiveOnly)}
              className={`px-3 py-2 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-colors border ${
                sensitiveOnly
                  ? 'bg-pink-900/60 border-pink-600 text-pink-300'
                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              <FaUserSecret />
              <span>Women Safety Only</span>
            </button>
          </div>
        </div>

        {/* Case Cards Grid */}
        <div className="mt-8 space-y-4">
          {loading ? (
            <div className="text-center py-16 space-y-3">
              <div className="inline-block w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs text-slate-400">Loading verified case dossiers from registry...</p>
            </div>
          ) : cases.length === 0 ? (
            <div className="text-center py-16 bg-slate-800/40 rounded-xl border border-slate-800">
              <FaFolderOpen className="mx-auto text-4xl text-slate-600 mb-2" />
              <p className="text-sm font-semibold text-slate-300">No matching investigation cases found</p>
              <p className="text-xs text-slate-500 mt-1">Try modifying your search or filters, or file a new case from the Police Workstation.</p>
            </div>
          ) : (
            cases.map((c) => (
              <div
                key={c.id}
                className="p-6 rounded-xl bg-slate-800/90 border border-slate-700 hover:border-slate-600 transition-all shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-bold text-amber-400">{c.firNumber}</span>
                    <span className="text-slate-500">•</span>
                    <span className="font-mono text-xs text-slate-400">Case No: {c.caseNumber}</span>
                    {getStatusBadge(c.status)}
                    {c.isSensitive && (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-pink-900/80 text-pink-300 border border-pink-600 flex items-center space-x-1">
                        <FaUserSecret className="text-[10px]" />
                        <span>Sec 228A Protected</span>
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-white hover:text-indigo-400 transition-colors">
                    <Link href={`/cases/${c.id}`}>{c.title}</Link>
                  </h3>

                  <p className="text-xs text-slate-400 line-clamp-2">
                    {c.description || 'No additional summary registered.'}
                  </p>

                  <div className="pt-2 flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-400">
                    <div>
                      <span className="text-slate-500">Police Station:</span>{' '}
                      <span className="text-slate-300">{c.policeStation}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Law Sections:</span>{' '}
                      <span className="text-amber-300/90 font-mono text-[11px]">{c.sections}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">IO:</span>{' '}
                      <span className="text-slate-300">{c.investigatingOfficer?.name || 'Assigned Officer'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Secured Documents:</span>{' '}
                      <span className="text-indigo-400 font-semibold">{c._count.documents}</span>
                    </div>
                  </div>
                </div>

                <div className="flex-shrink-0">
                  <Link
                    href={`/cases/${c.id}`}
                    className="px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center space-x-2 transition-colors shadow"
                  >
                    <FaFileAlt />
                    <span>View Dossier & Evidence Vault</span>
                    <FaArrowRight className="text-[10px]" />
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
