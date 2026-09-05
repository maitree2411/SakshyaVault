'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import TopNav from '../../components/TopNav';
import Footer from '../../components/Footer';
import { 
  FaShieldAlt, 
  FaCheckCircle, 
  FaExclamationTriangle, 
  FaFilePdf, 
  FaCopy, 
  FaCheck, 
  FaSearch, 
  FaHistory, 
  FaFileContract, 
  FaPrint 
} from 'react-icons/fa';

function VerifyContent() {
  const searchParams = useSearchParams();
  const initialHash = searchParams?.get('hash') || '';

  const [activeMode, setActiveMode] = useState<'HASH' | 'TEXT' | 'SIMULATOR'>('HASH');
  const [docHash, setDocHash] = useState(initialHash);
  const [textContent, setTextContent] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<any>(null);

  // Section 65B Certificate State
  const [certificateData, setCertificateData] = useState<any>(null);
  const [loadingCert, setLoadingCert] = useState(false);

  // Tamper Simulator States
  const [simOriginalText, setSimOriginalText] = useState('FIR No. 089/2026: Confiscated 2 Hard Drives and 4 Mobile SIM cards from accused premises.');
  const [simTamperedText, setSimTamperedText] = useState('FIR No. 089/2026: Confiscated 1 Hard Drive and 1 Mobile SIM card from accused premises.');

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const runHashVerification = async (hashToVerify: string) => {
    if (!hashToVerify.trim()) return;

    setVerifying(true);
    setResult(null);
    setCertificateData(null);

    try {
      const res = await fetch(`${apiUrl}/api/v1/integrity/verify-hash`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentHash: hashToVerify.trim(),
          verifierAgency: 'Judicial Registry / Public Verification Desk'
        })
      });
      const data = await res.json();
      setResult(data);

      if (data.isAuthentic && data.document) {
        fetchCertificate(data.document.id);
      }
    } catch (err) {
      console.error(err);
      setResult({
        success: false,
        isAuthentic: false,
        message: 'Network error contacting verification node'
      });
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    if (initialHash) {
      setDocHash(initialHash);
      runHashVerification(initialHash);
    }
  }, [initialHash]);

  const handleVerifyHash = (e: React.FormEvent) => {
    e.preventDefault();
    runHashVerification(docHash);
  };

  const handleVerifyContent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textContent.trim()) return;

    setVerifying(true);
    setResult(null);

    try {
      const res = await fetch(`${apiUrl}/api/v1/integrity/verify-content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: textContent,
          verifierAgency: 'Document Content Authenticator'
        })
      });
      const data = await res.json();
      setResult(data);

      if (data.isAuthentic && data.document) {
        fetchCertificate(data.document.id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setVerifying(false);
    }
  };

  const fetchCertificate = async (docId: string) => {
    setLoadingCert(true);
    try {
      const res = await fetch(`${apiUrl}/api/v1/integrity/certificate-65b/${docId}`);
      const data = await res.json();
      if (data.success) {
        setCertificateData(data.data);
      }
    } catch (err) {
      console.error('Error fetching certificate:', err);
    } finally {
      setLoadingCert(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      <TopNav title="Digital Evidence Authenticity & Section 65B Admissibility Verifier" subtitle="Section 65B(4) Indian Evidence Act / Section 63 BSA Cryptographic Admissibility Engine" />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-8">
        {/* Verifier Hero */}
        <div className="bg-slate-800/80 rounded-2xl border border-slate-700 p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-900/80 border border-indigo-700 text-indigo-400 flex items-center justify-center text-2xl">
              <FaShieldAlt />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold text-white">Digital Document & Evidence Integrity Engine</h1>
                <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 text-xs font-semibold border border-emerald-700">
                  Live Blockchain Verification
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Verifies SHA-256 fingerprint against the legal smart contract registry and generates certified Section 65B certificates.
              </p>
            </div>
          </div>

          <Link
            href="/cases"
            className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs text-slate-200 font-semibold flex items-center space-x-1.5 transition-colors"
          >
            <span>Browse Case Files</span>
          </Link>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex space-x-2 border-b border-slate-800 pb-2 text-xs font-semibold">
          <button
            onClick={() => setActiveMode('HASH')}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
              activeMode === 'HASH'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <FaSearch />
            <span>1. Verify by Cryptographic Hash</span>
          </button>

          <button
            onClick={() => setActiveMode('TEXT')}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
              activeMode === 'TEXT'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <FaFileContract />
            <span>2. Verify Raw Document Content</span>
          </button>

          <button
            onClick={() => setActiveMode('SIMULATOR')}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
              activeMode === 'SIMULATOR'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <FaExclamationTriangle />
            <span>3. Tampering Detection Simulation</span>
          </button>
        </div>

        {/* Mode 1: Hash Input */}
        {activeMode === 'HASH' && (
          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 shadow-xl space-y-4">
            <h2 className="text-sm font-bold text-white">Enter Document SHA-256 Digest</h2>
            <form onSubmit={handleVerifyHash} className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                required
                placeholder="e.g. 0x8f3c4e21a78912d0981e4b3a56c7d8e9f... or raw SHA-256 hash"
                value={docHash}
                onChange={(e) => setDocHash(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                disabled={verifying}
                className="px-6 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs disabled:opacity-50 flex items-center justify-center space-x-2 transition-colors whitespace-nowrap"
              >
                <FaShieldAlt />
                <span>{verifying ? 'Querying Blockchain...' : 'Check Registry'}</span>
              </button>
            </form>
          </div>
        )}

        {/* Mode 2: Content Input */}
        {activeMode === 'TEXT' && (
          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 shadow-xl space-y-4">
            <h2 className="text-sm font-bold text-white">Paste Document Payload / Certified Text</h2>
            <p className="text-xs text-slate-400">
              The engine will compute the SHA-256 fingerprint in memory and check against the smart contract anchor.
            </p>
            <form onSubmit={handleVerifyContent} className="space-y-3">
              <textarea
                rows={5}
                required
                placeholder="Paste the exact text of the document, FIR copy, or forensic report..."
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={verifying}
                  className="px-6 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs disabled:opacity-50 flex items-center space-x-2 transition-colors"
                >
                  <FaShieldAlt />
                  <span>{verifying ? 'Verifying...' : 'Calculate Hash & Verify'}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Mode 3: Tampering Simulation Demo */}
        {activeMode === 'SIMULATOR' && (
          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 shadow-xl space-y-6">
            <div>
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <FaExclamationTriangle className="text-amber-400" />
                <span>Live Tamper-Detection Demonstration</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                See how altering even a single digit or word causes immediate cryptographic hash mismatch, preventing unauthorized tampering in legal records.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              {/* Original Document */}
              <div className="p-4 rounded-xl bg-slate-900 border border-emerald-500/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-400 flex items-center space-x-1.5">
                    <FaCheckCircle />
                    <span>Original Document (Anchored)</span>
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 font-mono">
                    State Valid
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={simOriginalText}
                  onChange={(e) => setSimOriginalText(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 font-mono text-[11px] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    setTextContent(simOriginalText);
                    setActiveMode('TEXT');
                  }}
                  className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-colors"
                >
                  Verify Original Payload
                </button>
              </div>

              {/* Tampered Document */}
              <div className="p-4 rounded-xl bg-slate-900 border border-rose-500/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-rose-400 flex items-center space-x-1.5">
                    <FaExclamationTriangle />
                    <span>Altered / Tampered Version</span>
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-rose-950 text-rose-300 font-mono">
                    Tampered
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={simTamperedText}
                  onChange={(e) => setSimTamperedText(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-rose-200 font-mono text-[11px] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    setTextContent(simTamperedText);
                    setActiveMode('TEXT');
                  }}
                  className="w-full py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold transition-colors"
                >
                  Test Tampered Version
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Verification Result Banner */}
        {result && (
          <div className={`p-6 rounded-2xl border text-xs shadow-2xl transition-all ${
            result.isAuthentic
              ? 'bg-emerald-950/70 border-emerald-500/70 text-emerald-200'
              : 'bg-rose-950/70 border-rose-500/70 text-rose-200'
          }`}>
            <div className="flex items-start space-x-4">
              {result.isAuthentic ? (
                <FaCheckCircle className="text-emerald-400 text-3xl flex-shrink-0 mt-1" />
              ) : (
                <FaExclamationTriangle className="text-rose-400 text-3xl flex-shrink-0 mt-1" />
              )}
              <div className="space-y-3 flex-1">
                <div>
                  <h3 className="text-base font-bold text-white">{result.message}</h3>
                  <p className="text-slate-400 mt-0.5">
                    Verification Method: <span className="text-white font-mono">SHA-256 On-Chain Registry Check</span> | Timestamp: <span className="text-slate-300">{new Date(result.verifiedAt).toLocaleString()}</span>
                  </p>
                </div>

                {result.isAuthentic && result.document && (
                  <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 text-slate-300 space-y-2 font-mono text-[11px]">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div><span className="text-slate-500">Document Title:</span> <span className="text-white font-sans font-bold">{result.document.title}</span></div>
                      <div><span className="text-slate-500">Type:</span> <span className="text-indigo-400 font-bold">{result.document.documentType}</span></div>
                      <div><span className="text-slate-500">Case No:</span> <span className="text-amber-300">{result.document.case.caseNumber}</span></div>
                      <div><span className="text-slate-500">FIR:</span> <span className="text-amber-300">{result.document.case.firNumber}</span></div>
                      <div><span className="text-slate-500">Police Station:</span> <span>{result.document.case.policeStation}</span></div>
                      <div><span className="text-slate-500">Current Custody:</span> <span className="text-emerald-400">{result.document.latestCustodian}</span></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Section 65B Evidence Act Certificate Display */}
        {certificateData && (
          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-8 shadow-2xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-700">
              <div>
                <div className="flex items-center space-x-2">
                  <FaFilePdf className="text-amber-400 text-xl" />
                  <h2 className="text-lg font-bold text-white">Section 65B Electronic Evidence Admissibility Certificate</h2>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Issued under Section 65B(4) of the Indian Evidence Act, 1872 / Section 63 of Bharatiya Sakshya Adhiniyam, 2023
                </p>
              </div>

              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold flex items-center space-x-2 transition-colors shadow"
              >
                <FaPrint />
                <span>Print Official Certificate</span>
              </button>
            </div>

            {/* Certificate Body */}
            <div className="p-6 rounded-xl bg-slate-900 border border-slate-700/80 font-serif text-slate-200 text-xs leading-relaxed space-y-5">
              <div className="text-center space-y-1 pb-4 border-b border-slate-800">
                <h3 className="text-base font-bold text-white tracking-wide uppercase">CERTIFICATE UNDER SECTION 65B(4) OF THE INDIAN EVIDENCE ACT, 1872</h3>
                <p className="text-[11px] text-amber-400 font-mono">Certificate ID: {certificateData.certificateId}</p>
                <p className="text-xs text-slate-400">{certificateData.courtJurisdiction}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-sans">
                <div className="space-y-1">
                  <span className="text-slate-500 block">Case Particulars:</span>
                  <div className="font-semibold text-white">{certificateData.caseParticulars.caseTitle}</div>
                  <div className="text-slate-400">FIR No: {certificateData.caseParticulars.firNumber} | Case: {certificateData.caseParticulars.caseNumber}</div>
                  <div className="text-slate-400">Police Station: {certificateData.caseParticulars.policeStation}</div>
                  <div className="text-amber-300 font-mono text-[11px]">Sections: {certificateData.caseParticulars.sectionsOfLaw}</div>
                </div>

                <div className="space-y-1">
                  <span className="text-slate-500 block">Certifying Officer:</span>
                  <div className="font-semibold text-white">{certificateData.certifier.name}</div>
                  <div className="text-slate-400">{certificateData.certifier.designation}</div>
                  <div className="text-slate-400">{certificateData.certifier.agency}</div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono text-[11px] space-y-1">
                <div><span className="text-slate-500">Document Title:</span> <span className="text-white">{certificateData.electronicRecordDetails.documentTitle}</span></div>
                <div className="truncate"><span className="text-slate-500">Cryptographic Digest:</span> <span className="text-amber-300">{certificateData.electronicRecordDetails.cryptographicHash}</span></div>
                <div><span className="text-slate-500">Algorithm:</span> <span>{certificateData.electronicRecordDetails.hashAlgorithm}</span></div>
                <div className="truncate"><span className="text-slate-500">Blockchain Anchor Tx:</span> <span className="text-indigo-400">{certificateData.electronicRecordDetails.blockchainAnchorTx}</span></div>
                <div><span className="text-slate-500">Timestamp of Retention:</span> <span>{certificateData.electronicRecordDetails.creationTimestamp}</span></div>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-white font-sans">Statutory Declaration:</h4>
                <p className="italic text-slate-300">
                  &ldquo;{certificateData.statutoryDeclaration}&rdquo;
                </p>
              </div>

              <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center text-xs font-sans text-slate-400 gap-3">
                <div>
                  <span className="block text-slate-500 text-[10px]">Digital Verification Seal:</span>
                  <span className="font-mono text-emerald-400 text-[11px]">{certificateData.digitalSeal}</span>
                </div>
                <div className="text-right">
                  <span className="block text-slate-500 text-[10px]">Issued on:</span>
                  <span className="text-slate-300">{new Date(certificateData.issuedAt).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Loading Verifier...</div>}>
      <VerifyContent />
    </Suspense>
  );
}
