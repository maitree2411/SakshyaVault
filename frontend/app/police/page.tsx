'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import TopNav from '../../components/TopNav';
import Footer from '../../components/Footer';
import { 
  FaShieldAlt, 
  FaPlusCircle, 
  FaFileAlt, 
  FaCheckCircle, 
  FaLock, 
  FaFolderOpen,
  FaArrowRight,
  FaInfoCircle
} from 'react-icons/fa';

interface CaseOption {
  id: string;
  caseNumber: string;
  firNumber: string;
  title: string;
}

export default function PoliceWorkstation() {
  const [activeTab, setActiveTab] = useState<'NEW_CASE' | 'UPLOAD_DOC'>('NEW_CASE');
  const [cases, setCases] = useState<CaseOption[]>([]);
  const [loadingCases, setLoadingCases] = useState(false);

  // Form 1: New Case
  const [caseNumber, setCaseNumber] = useState(`DL/CYB/2026/${Math.floor(1000 + Math.random() * 9000)}`);
  const [firNumber, setFirNumber] = useState(`FIR-${Math.floor(100 + Math.random() * 900)}/2026`);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [policeStation, setPoliceStation] = useState('Cyber Crime Police Station, North District');
  const [sections, setSections] = useState('Sec 66D IT Act, Sec 420 IPC');
  const [isSensitive, setIsSensitive] = useState(false);
  const [officerName, setOfficerName] = useState('Insp. Vikramaditya Sharma (IO)');
  const [submittingCase, setSubmittingCase] = useState(false);
  const [caseSuccess, setCaseSuccess] = useState<any>(null);

  // Form 2: Upload Document
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [docTitle, setDocTitle] = useState('');
  const [docType, setDocType] = useState('FIR');
  const [docContent, setDocContent] = useState('');
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [docSuccess, setDocSuccess] = useState<any>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const fetchCases = async () => {
    setLoadingCases(true);
    try {
      const res = await fetch(`${apiUrl}/api/v1/cases`);
      const data = await res.json();
      if (data.success) {
        setCases(data.data);
        if (data.data.length > 0 && !selectedCaseId) {
          setSelectedCaseId(data.data[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching cases:', err);
    } finally {
      setLoadingCases(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, []);

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingCase(true);
    setCaseSuccess(null);

    try {
      const res = await fetch(`${apiUrl}/api/v1/cases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseNumber,
          firNumber,
          title,
          description,
          policeStation,
          sections,
          isSensitive,
          officerName
        })
      });
      const data = await res.json();
      if (data.success) {
        setCaseSuccess(data.data);
        fetchCases();
      } else {
        alert(data.error || 'Failed to create case');
      }
    } catch (err) {
      console.error(err);
      alert('Network error registering case');
    } finally {
      setSubmittingCase(false);
    }
  };

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCaseId) {
      alert('Please select or register a case first');
      return;
    }

    setUploadingDoc(true);
    setDocSuccess(null);

    try {
      const res = await fetch(`${apiUrl}/api/v1/legal-documents/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId: selectedCaseId,
          title: docTitle,
          documentType: docType,
          content: docContent,
          officerName,
          uploaderAddress: '0x71C84901b6e4F4692B86E80e9f1967208759C901'
        })
      });
      const data = await res.json();
      if (data.success) {
        setDocSuccess(data.data);
        setDocTitle('');
        setDocContent('');
      } else {
        alert(data.error || 'Failed to anchor document');
      }
    } catch (err) {
      console.error(err);
      alert('Network error uploading document');
    } finally {
      setUploadingDoc(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      <TopNav title="Police & Investigating Officer (IO) Workstation" subtitle="State Police Headquarters & Cyber Crime Investigation Bureau" />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-8">
        {/* Workstation Header */}
        <div className="bg-slate-800/80 rounded-2xl border border-slate-700 p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-900/80 border border-indigo-700 text-indigo-400 flex items-center justify-center text-2xl">
              <FaShieldAlt />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold text-white">Investigating Officer (IO) Command Console</h1>
                <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 text-xs font-semibold border border-emerald-700">
                  Officer Active
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Officer: <span className="text-slate-200 font-semibold">{officerName}</span> | Station: <span className="text-slate-200">{policeStation}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              href="/cases"
              className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs text-slate-200 font-semibold flex items-center space-x-1.5 transition-colors"
            >
              <FaFolderOpen />
              <span>View All Cases</span>
            </Link>
          </div>
        </div>

        {/* Tab Toggle */}
        <div className="flex space-x-2 border-b border-slate-800 pb-2 text-sm font-semibold">
          <button
            onClick={() => setActiveTab('NEW_CASE')}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
              activeTab === 'NEW_CASE'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <FaPlusCircle />
            <span>1. Register New FIR & Case File</span>
          </button>

          <button
            onClick={() => setActiveTab('UPLOAD_DOC')}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
              activeTab === 'UPLOAD_DOC'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <FaFileAlt />
            <span>2. Ingest & Anchor Evidence / Case Diary</span>
          </button>
        </div>

        {/* Form 1: Register Case */}
        {activeTab === 'NEW_CASE' && (
          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 shadow-xl space-y-6">
            <div>
              <h2 className="text-base font-bold text-white">First Information Report (FIR) Ingestion</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Registering a case automatically establishes the master root docket on the legal blockchain.
              </p>
            </div>

            {caseSuccess && (
              <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 text-xs flex items-start space-x-3">
                <FaCheckCircle className="text-lg flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">Investigation Case Docket Created Successfully!</p>
                  <p>FIR Number: <span className="font-mono text-white">{caseSuccess.firNumber}</span> | Case Number: <span className="font-mono text-white">{caseSuccess.caseNumber}</span></p>
                  <Link href={`/cases/${caseSuccess.id}`} className="text-amber-400 underline block pt-1 font-semibold">
                    Open Case Dossier & Add Exhibits ➔
                  </Link>
                </div>
              </div>
            )}

            <form onSubmit={handleCreateCase} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1">FIR Number</label>
                  <input
                    type="text"
                    required
                    value={firNumber}
                    onChange={(e) => setFirNumber(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Internal Case Tracking Number</label>
                  <input
                    type="text"
                    required
                    value={caseNumber}
                    onChange={(e) => setCaseNumber(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Case Title / Primary Charge</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. State vs. Cyber Extortion & Illegal SIM Cloning Syndicate"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1">Police Station</label>
                  <input
                    type="text"
                    required
                    value={policeStation}
                    onChange={(e) => setPoliceStation(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Applicable Sections of Law (IPC / BNS / IT Act)</label>
                  <input
                    type="text"
                    required
                    value={sections}
                    onChange={(e) => setSections(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-amber-300 font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Brief Description / Complainant Summary</label>
                <textarea
                  rows={3}
                  placeholder="Summary of offence, modus operandi, and initial investigative actions taken..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center space-x-3 p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                <input
                  type="checkbox"
                  id="sensitiveCheck"
                  checked={isSensitive}
                  onChange={(e) => setIsSensitive(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-800 border-slate-700"
                />
                <label htmlFor="sensitiveCheck" className="text-slate-300 cursor-pointer">
                  <span className="font-semibold text-pink-400">Classify as Sensitive / Women Safety Protected Case</span>
                  <span className="block text-slate-500 text-[11px]">Enforces strict Sec 228A IPC identity redaction & in-camera review protocols.</span>
                </label>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={submittingCase}
                  className="px-6 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs disabled:opacity-50 flex items-center space-x-2 shadow-lg transition-colors"
                >
                  <FaShieldAlt />
                  <span>{submittingCase ? 'Registering Case...' : 'Register FIR & Initialize Docket'}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Form 2: Ingest & Anchor Document */}
        {activeTab === 'UPLOAD_DOC' && (
          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 shadow-xl space-y-6">
            <div>
              <h2 className="text-base font-bold text-white">Ingest & Anchor Legal Exhibit / Case Diary</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Computes cryptographic SHA-256 fingerprint, encrypts content, and anchors proof on blockchain.
              </p>
            </div>

            {docSuccess && (
              <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 text-xs flex items-start space-x-3">
                <FaCheckCircle className="text-lg flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">Document Successfully Anchored on Blockchain!</p>
                  <p className="font-mono text-white text-[11px] truncate">SHA-256 Hash: {docSuccess.documentHash}</p>
                  <p className="font-mono text-indigo-300 text-[11px] truncate">Tx Anchor: {docSuccess.txHash}</p>
                  <Link href={`/cases/${selectedCaseId}`} className="text-amber-400 underline block pt-1 font-semibold">
                    View in Evidence Vault & Chain of Custody ➔
                  </Link>
                </div>
              </div>
            )}

            <form onSubmit={handleUploadDocument} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Target Case File</label>
                <select
                  value={selectedCaseId}
                  onChange={(e) => setSelectedCaseId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                >
                  {cases.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.firNumber} - {c.caseNumber} : {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1">Document Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Police Case Diary No. 12 (Sec 172 CrPC) or Panchnama"
                    value={docTitle}
                    onChange={(e) => setDocTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Legal Document Category</label>
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="FIR">FIR (First Information Report)</option>
                    <option value="CASE_DIARY">Police Case Diary (Sec 172 CrPC)</option>
                    <option value="SEIZURE_MEMO">Seizure Memo / Panchnama</option>
                    <option value="WITNESS_STATEMENT">Witness Statement (Sec 161 CrPC)</option>
                    <option value="CHARGE_SHEET">Final Police Report / Charge Sheet (Sec 173 CrPC)</option>
                    <option value="FORENSIC_REPORT">Forensic Examination Report</option>
                    <option value="COURT_ORDER">Court Order / Bail Order</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Document Content / Digital Statement</label>
                <textarea
                  rows={6}
                  required
                  placeholder="Paste electronic evidence text, diary entry, or digital memo content..."
                  value={docContent}
                  onChange={(e) => setDocContent(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center space-x-2 text-slate-400 text-[11px]">
                <FaLock className="text-amber-400 flex-shrink-0" />
                <span>The content will be encrypted with AES-256-GCM before storage, and its SHA-256 fingerprint will be anchored on the smart contract for tamper detection.</span>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={uploadingDoc}
                  className="px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs disabled:opacity-50 flex items-center space-x-2 shadow-lg transition-colors"
                >
                  <FaLock />
                  <span>{uploadingDoc ? 'Anchoring...' : 'Fingerprint & Anchor on Blockchain'}</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
