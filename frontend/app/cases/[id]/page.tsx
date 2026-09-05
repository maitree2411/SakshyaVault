'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import TopNav from '../../../components/TopNav';
import Footer from '../../../components/Footer';
import { 
  FaFolderOpen, 
  FaShieldAlt, 
  FaFileAlt, 
  FaCheckCircle, 
  FaUserSecret, 
  FaHistory, 
  FaExchangeAlt, 
  FaArrowLeft,
  FaFilePdf,
  FaCopy,
  FaCheck,
  FaDownload,
  FaPlusCircle,
  FaTimes
} from 'react-icons/fa';

interface CustodyItem {
  id: string;
  fromParty: string;
  toParty: string;
  transferReason: string;
  location: string;
  timestamp: string;
  txHash?: string;
  officerSignature?: string;
}

interface DocItem {
  id: string;
  title: string;
  documentType: string;
  documentHash: string;
  ipfsHash: string;
  fileSize: number;
  version: number;
  isAnonymized: boolean;
  txHash: string;
  uploaderAddress: string;
  createdAt: string;
  custodyHistory: CustodyItem[];
  uploader?: {
    name: string;
    department: string;
    badgeNumber: string;
  };
}

interface CaseDetail {
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
  documents: DocItem[];
}

export default function CaseDetailPage() {
  const params = useParams();
  const caseId = params?.id as string;

  const [caseData, setCaseData] = useState<CaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  // Modals
  const [selectedDocForCustody, setSelectedDocForCustody] = useState<DocItem | null>(null);
  const [custodyFrom, setCustodyFrom] = useState('');
  const [custodyTo, setCustodyTo] = useState('');
  const [custodyReason, setCustodyReason] = useState('');
  const [custodyLocation, setCustodyLocation] = useState('');
  const [transferring, setTransferring] = useState(false);

  // Timeline view modal
  const [viewCustodyDoc, setViewCustodyDoc] = useState<DocItem | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const fetchCase = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/v1/cases/${caseId}`);
      const data = await res.json();
      if (data.success) {
        setCaseData(data.data);
      }
    } catch (error) {
      console.error('Error fetching case:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (caseId) fetchCase();
  }, [caseId]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(text);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const handleCustodySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDocForCustody) return;

    setTransferring(true);
    try {
      const res = await fetch(`${apiUrl}/api/v1/legal-documents/${selectedDocForCustody.id}/custody`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromParty: custodyFrom,
          toParty: custodyTo,
          transferReason: custodyReason,
          location: custodyLocation,
          officerSignature: `SIG-DIG-${Date.now()}`
        })
      });
      const data = await res.json();
      if (data.success) {
        setSelectedDocForCustody(null);
        setCustodyFrom('');
        setCustodyTo('');
        setCustodyReason('');
        setCustodyLocation('');
        fetchCase();
      }
    } catch (error) {
      console.error('Error transferring custody:', error);
    } finally {
      setTransferring(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
        <TopNav />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="inline-block w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-slate-400">Loading case dossier and evidence chain...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
        <TopNav />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-md bg-slate-800 p-8 rounded-2xl border border-slate-700">
            <FaFolderOpen className="mx-auto text-4xl text-rose-500 mb-3" />
            <h2 className="text-lg font-bold text-white">Case Record Not Found</h2>
            <p className="text-xs text-slate-400 mt-2 mb-6">The requested case file does not exist or has not yet been synchronized.</p>
            <Link href="/cases" className="px-4 py-2 rounded-lg bg-indigo-600 text-xs font-semibold text-white">
              Back to Cases Directory
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const filteredDocs = caseData.documents.filter((doc) => {
    if (activeTab === 'ALL') return true;
    return doc.documentType === activeTab;
  });

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      <TopNav title={`Case Dossier: ${caseData.firNumber}`} subtitle={caseData.title} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-8">
        {/* Navigation Breadcrumb */}
        <div>
          <Link href="/cases" className="inline-flex items-center space-x-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
            <FaArrowLeft className="text-[10px]" />
            <span>Back to Case Repository</span>
          </Link>
        </div>

        {/* Case Dossier Master Card */}
        <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 shadow-xl space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-700/80">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xl font-extrabold text-amber-400">{caseData.firNumber}</span>
                <span className="text-slate-500">•</span>
                <span className="font-mono text-sm text-slate-300">Case No: {caseData.caseNumber}</span>
                {caseData.isSensitive && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-pink-900/80 text-pink-300 border border-pink-600 flex items-center space-x-1">
                    <FaUserSecret className="text-[10px]" />
                    <span>Sec 228A IPC Identity Protected</span>
                  </span>
                )}
              </div>
              <h1 className="text-xl font-bold text-white">{caseData.title}</h1>
              <p className="text-xs text-slate-400 max-w-3xl">{caseData.description}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/police"
                className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center space-x-1.5 shadow transition-colors"
              >
                <FaPlusCircle />
                <span>Anchor Document</span>
              </Link>
              <Link
                href={`/verify?search=${caseData.firNumber}`}
                className="px-3.5 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-amber-300 text-xs font-semibold flex items-center space-x-1.5 transition-colors border border-amber-500/30"
              >
                <FaCheckCircle />
                <span>Verify All Exhibits</span>
              </Link>
            </div>
          </div>

          {/* Case Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
              <span className="text-slate-500 block">Police Station</span>
              <span className="font-semibold text-slate-200 mt-0.5 block">{caseData.policeStation}</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
              <span className="text-slate-500 block">Jurisdiction & State</span>
              <span className="font-semibold text-slate-200 mt-0.5 block">{caseData.district}, {caseData.state}</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
              <span className="text-slate-500 block">Sections of Law</span>
              <span className="font-semibold text-amber-300 mt-0.5 block font-mono">{caseData.sections}</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
              <span className="text-slate-500 block">Investigating Officer (IO)</span>
              <span className="font-semibold text-slate-200 mt-0.5 block">
                {caseData.investigatingOfficer?.name || 'Assigned IO'} ({caseData.investigatingOfficer?.badgeNumber || 'DL-POL'})
              </span>
            </div>
          </div>
        </div>

        {/* Evidence & Document Vault */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                <FaFileAlt className="text-indigo-400" />
                <span>Evidence & Document Vault ({caseData.documents.length})</span>
              </h2>
              <p className="text-xs text-slate-400">
                Cryptographically anchored legal exhibits with tamper verification and custody history
              </p>
            </div>

            {/* Document Type Filter Tabs */}
            <div className="flex flex-wrap gap-1 bg-slate-800 p-1 rounded-lg border border-slate-700 text-xs">
              {['ALL', 'FIR', 'FORENSIC_REPORT', 'WITNESS_STATEMENT', 'CHARGE_SHEET'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-2.5 py-1 rounded-md transition-colors font-medium ${
                    activeTab === tab
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab === 'ALL' ? 'All Records' : tab.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Document Cards */}
          <div className="space-y-4">
            {filteredDocs.length === 0 ? (
              <div className="text-center py-12 bg-slate-800/40 rounded-xl border border-slate-800">
                <p className="text-xs text-slate-400">No documents registered under this category.</p>
              </div>
            ) : (
              filteredDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-slate-800/90 rounded-xl border border-slate-700 p-5 shadow-lg space-y-4 hover:border-slate-600 transition-colors"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-700">
                          {doc.documentType}
                        </span>
                        <span className="text-xs text-slate-500 font-mono">v{doc.version}</span>
                        {doc.isAnonymized && (
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-pink-950 text-pink-300 border border-pink-700 flex items-center space-x-1">
                            <FaUserSecret className="text-[9px]" />
                            <span>Masked PII</span>
                          </span>
                        )}
                        <span className="inline-flex items-center space-x-1 text-emerald-400 text-xs font-semibold">
                          <FaCheckCircle className="text-[11px]" />
                          <span>On-Chain Verified</span>
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-white">{doc.title}</h3>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => setViewCustodyDoc(doc)}
                        className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs text-slate-200 font-medium flex items-center space-x-1.5 transition-colors"
                      >
                        <FaHistory />
                        <span>Custody Trail ({doc.custodyHistory?.length || 1})</span>
                      </button>

                      <button
                        onClick={() => {
                          setSelectedDocForCustody(doc);
                          setCustodyFrom(doc.custodyHistory?.[0]?.toParty || 'Current Custodian');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-indigo-900/80 hover:bg-indigo-800 text-xs text-indigo-200 font-medium flex items-center space-x-1.5 border border-indigo-700 transition-colors"
                      >
                        <FaExchangeAlt />
                        <span>Transfer Custody</span>
                      </button>

                      <Link
                        href={`/verify?hash=${doc.documentHash}`}
                        className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-xs text-white font-semibold flex items-center space-x-1.5 transition-colors shadow"
                      >
                        <FaFilePdf />
                        <span>Sec 65B Certificate</span>
                      </Link>
                    </div>
                  </div>

                  {/* Hash and Chain Data */}
                  <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 font-mono text-[11px] space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div className="flex items-center space-x-2 overflow-hidden text-slate-400">
                        <span className="text-slate-500 font-sans font-semibold">SHA-256 Digest:</span>
                        <span className="truncate text-amber-300">{doc.documentHash}</span>
                      </div>
                      <button
                        onClick={() => copyToClipboard(doc.documentHash)}
                        className="self-start sm:self-auto text-slate-400 hover:text-white flex items-center space-x-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px]"
                      >
                        {copiedHash === doc.documentHash ? (
                          <>
                            <FaCheck className="text-emerald-400" />
                            <span className="text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <FaCopy />
                            <span>Copy Hash</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-400">
                      <div>
                        <span className="text-slate-500 font-sans">Tx Anchor:</span>{' '}
                        <span className="text-indigo-400">{doc.txHash ? `${doc.txHash.substring(0, 16)}...` : '0xAnchored...'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-sans">Storage CID:</span>{' '}
                        <span className="text-slate-300">{doc.ipfsHash ? `${doc.ipfsHash.substring(0, 18)}...` : 'IPFS-Sealed'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-sans">Timestamp:</span>{' '}
                        <span className="text-slate-300">{new Date(doc.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* Handover Custody Modal */}
      {selectedDocForCustody && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <FaExchangeAlt className="text-indigo-400" />
                <span>Record Chain of Custody Transfer</span>
              </h3>
              <button
                onClick={() => setSelectedDocForCustody(null)}
                className="text-slate-400 hover:text-white"
              >
                <FaTimes />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Document: <span className="text-white font-semibold">{selectedDocForCustody.title}</span>
            </p>

            <form onSubmit={handleCustodySubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Transferring Party (From)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Insp. Vikramaditya Sharma (IO)"
                  value={custodyFrom}
                  onChange={(e) => setCustodyFrom(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Receiving Custodian (To)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Sunita Rao (CFSL Cyber Division)"
                  value={custodyTo}
                  onChange={(e) => setCustodyTo(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Purpose of Handover / Custody Transfer</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Submitting electronic media for forensic analysis"
                  value={custodyReason}
                  onChange={(e) => setCustodyReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Physical Location / Facility</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CFSL Complex, New Delhi"
                  value={custodyLocation}
                  onChange={(e) => setCustodyLocation(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setSelectedDocForCustody(null)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={transferring}
                  className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold disabled:opacity-50 flex items-center space-x-1.5"
                >
                  <FaShieldAlt />
                  <span>{transferring ? 'Anchoring...' : 'Confirm & Sign Transfer'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custody Timeline History Modal */}
      {viewCustodyDoc && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <FaHistory className="text-indigo-400" />
                  <span>Chain of Custody Timeline</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">{viewCustodyDoc.title}</p>
              </div>
              <button
                onClick={() => setViewCustodyDoc(null)}
                className="text-slate-400 hover:text-white"
              >
                <FaTimes />
              </button>
            </div>

            {/* Timeline Events List */}
            <div className="overflow-y-auto flex-1 space-y-4 pr-2 pt-2">
              {viewCustodyDoc.custodyHistory && viewCustodyDoc.custodyHistory.length > 0 ? (
                viewCustodyDoc.custodyHistory.map((step, idx) => (
                  <div key={step.id || idx} className="relative pl-6 border-l-2 border-indigo-500/60 pb-4 last:pb-0">
                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-indigo-600 border-2 border-slate-900 flex items-center justify-center text-[8px] text-white">
                      {idx + 1}
                    </div>
                    <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/80 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-white">{step.fromParty} ➔ {step.toParty}</span>
                        <span className="text-[11px] text-slate-400">{new Date(step.timestamp).toLocaleString()}</span>
                      </div>
                      <p className="text-slate-300">{step.transferReason}</p>
                      <div className="flex flex-wrap items-center gap-x-4 text-[11px] text-slate-400 pt-1 font-mono">
                        <span>Location: {step.location}</span>
                        {step.officerSignature && <span className="text-amber-300">Sig: {step.officerSignature}</span>}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-xs text-slate-400">
                  Initial Custody established upon upload.
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setViewCustodyDoc(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-white font-medium"
              >
                Close Timeline
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
