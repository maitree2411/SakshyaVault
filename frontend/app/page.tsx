'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import TopNav from '../components/TopNav';
import Footer from '../components/Footer';
import { 
  FaShieldAlt, 
  FaBalanceScale, 
  FaMicroscope, 
  FaUserSecret, 
  FaCheckCircle, 
  FaHistory, 
  FaFolderOpen,
  FaFileContract,
  FaSearch,
  FaArrowRight,
  FaLock,
  FaExclamationTriangle
} from 'react-icons/fa';

interface SystemStats {
  totalCases: number;
  sensitiveCases: number;
  totalDocumentsAnchored: number;
  totalVerificationsPerformed: number;
  totalAuditEvents: number;
  blockchainNetwork: string;
  smartContractStatus: string;
  legalCompliance: string;
}

export default function Home() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [quickHash, setQuickHash] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<any>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  useEffect(() => {
    fetch(`${apiUrl}/api/v1/audit/stats`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setStats(data.data);
      })
      .catch((err) => console.error('Error fetching stats:', err));
  }, [apiUrl]);

  const handleQuickVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickHash.trim()) return;

    setVerifying(true);
    setVerifyResult(null);

    try {
      const res = await fetch(`${apiUrl}/api/v1/integrity/verify-hash`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentHash: quickHash.trim(),
          verifierAgency: 'Portal Quick Verifier'
        })
      });
      const data = await res.json();
      setVerifyResult(data);
    } catch (error) {
      console.error('Verification error:', error);
      setVerifyResult({
        success: false,
        isAuthentic: false,
        message: 'Network error contacting verification node'
      });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      <TopNav />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-900 pt-12 pb-20 border-b border-slate-800">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.15),transparent_50%)] pointer-events-none"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(245,158,11,0.1),transparent_50%)] pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-xs text-amber-400 font-medium">
              <FaShieldAlt className="text-amber-400" />
              <span>National Crime Records Bureau | Women Safety Division</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
              Secure Digital Document & <br />
              <span className="bg-gradient-to-r from-amber-400 via-indigo-400 to-emerald-400 bg-clip-text text-transparent">
                Evidence Integrity System
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
              Tamper-proof legal dossier lifecycle management for Police, Forensics, and Courts.
              Anchored with blockchain cryptography for <span className="text-amber-400 font-semibold">Section 65B Indian Evidence Act</span> admissibility and automated <span className="text-indigo-400 font-semibold">Section 228A IPC</span> victim identity protection.
            </p>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap justify-center gap-4 pt-4">
              <Link
                href="/cases"
                className="px-6 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 flex items-center space-x-2 transition-all hover:scale-105"
              >
                <FaFolderOpen />
                <span>Explore Case Dossiers</span>
                <FaArrowRight className="text-xs" />
              </Link>
              <Link
                href="/verify"
                className="px-6 py-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 font-semibold text-sm border border-amber-500/30 shadow-lg flex items-center space-x-2 transition-all hover:scale-105"
              >
                <FaCheckCircle />
                <span>Verify Evidence Authenticity</span>
              </Link>
            </div>
          </div>

          {/* Quick On-Chain Hash Verifier Card */}
          <div className="mt-14 max-w-2xl mx-auto bg-slate-800/80 backdrop-blur-md rounded-2xl p-6 border border-slate-700 shadow-2xl">
            <div className="flex items-center space-x-2 mb-3">
              <FaSearch className="text-indigo-400" />
              <h3 className="text-sm font-semibold text-white">Instant On-Chain Document Verification</h3>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Enter any document cryptographic hash (SHA-256) to check mathematical integrity and Section 65B legal validity.
            </p>

            <form onSubmit={handleQuickVerify} className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder="e.g. 0x8f3c4e21a78912d0981e4b3a56c7d8e9f... or SHA-256 hash"
                value={quickHash}
                onChange={(e) => setQuickHash(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
              />
              <button
                type="submit"
                disabled={verifying}
                className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium text-xs flex items-center justify-center space-x-2 transition-colors whitespace-nowrap"
              >
                <FaShieldAlt />
                <span>{verifying ? 'Verifying...' : 'Verify Hash'}</span>
              </button>
            </form>

            {/* Verification Result Notification */}
            {verifyResult && (
              <div className={`mt-4 p-4 rounded-xl text-xs border ${
                verifyResult.isAuthentic
                  ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-300'
                  : 'bg-rose-950/60 border-rose-500/60 text-rose-300'
              }`}>
                <div className="flex items-start space-x-3">
                  {verifyResult.isAuthentic ? (
                    <FaCheckCircle className="text-emerald-400 text-lg flex-shrink-0 mt-0.5" />
                  ) : (
                    <FaExclamationTriangle className="text-rose-400 text-lg flex-shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1 flex-1">
                    <p className="font-semibold">{verifyResult.message}</p>
                    {verifyResult.isAuthentic && verifyResult.document && (
                      <div className="pt-2 text-slate-300 grid grid-cols-1 sm:grid-cols-2 gap-1 font-mono text-[11px]">
                        <div><span className="text-slate-400">Doc Title:</span> {verifyResult.document.title}</div>
                        <div><span className="text-slate-400">Case No:</span> {verifyResult.document.case.caseNumber}</div>
                        <div><span className="text-slate-400">FIR:</span> {verifyResult.document.case.firNumber}</div>
                        <div><span className="text-slate-400">Station:</span> {verifyResult.document.case.policeStation}</div>
                        <div className="col-span-2 pt-1">
                          <Link 
                            href={`/verify?hash=${verifyResult.document.documentHash}`}
                            className="text-amber-400 hover:underline flex items-center space-x-1"
                          >
                            <span>Download Section 65B Certificate & View Chain of Custody</span>
                            <FaArrowRight className="text-[10px]" />
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* National Live Metrics */}
          <div className="mt-14 grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-xl bg-slate-800/60 border border-slate-700/80 flex flex-col justify-between">
              <span className="text-xs text-slate-400 font-medium">Registered Cases</span>
              <span className="text-3xl font-extrabold text-white mt-2">
                {stats ? stats.totalCases : '2'}
              </span>
              <span className="text-[11px] text-indigo-400 mt-1">Multi-Department Dockets</span>
            </div>

            <div className="p-5 rounded-xl bg-slate-800/60 border border-slate-700/80 flex flex-col justify-between">
              <span className="text-xs text-slate-400 font-medium">Documents Anchored</span>
              <span className="text-3xl font-extrabold text-amber-400 mt-2">
                {stats ? stats.totalDocumentsAnchored : '4'}
              </span>
              <span className="text-[11px] text-amber-300 mt-1">SHA-256 On-Chain Registry</span>
            </div>

            <div className="p-5 rounded-xl bg-slate-800/60 border border-slate-700/80 flex flex-col justify-between">
              <span className="text-xs text-slate-400 font-medium">Sensitive Cases (WSD)</span>
              <span className="text-3xl font-extrabold text-pink-400 mt-2">
                {stats ? stats.sensitiveCases : '1'}
              </span>
              <span className="text-[11px] text-pink-300 mt-1">Sec 228A IPC Masked</span>
            </div>

            <div className="p-5 rounded-xl bg-slate-800/60 border border-slate-700/80 flex flex-col justify-between">
              <span className="text-xs text-slate-400 font-medium">Audit Events Logged</span>
              <span className="text-3xl font-extrabold text-emerald-400 mt-2">
                {stats ? stats.totalAuditEvents : '6'}
              </span>
              <span className="text-[11px] text-emerald-300 mt-1">Immutable Custody Trail</span>
            </div>
          </div>
        </div>
      </section>

      {/* Specialized Portals Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">Multi-Department Workstation Portals</h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-2">
            Seamless collaboration between Police Stations, Forensic Labs, Judicial Courts, and NCRB
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Police Station */}
          <Link
            href="/police"
            className="p-6 rounded-2xl bg-slate-800 border border-slate-700 hover:border-indigo-500 transition-all hover:-translate-y-1 shadow-lg group flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-indigo-900/60 text-indigo-400 border border-indigo-700/60 flex items-center justify-center text-xl mb-4 group-hover:scale-110 transition-transform">
                <FaShieldAlt />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Police & IO Workstation</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Register FIRs, log Case Diaries (Sec 172 CrPC), upload digital seizure memos, and initiate evidence handovers.
              </p>
            </div>
            <div className="mt-6 flex items-center text-xs text-indigo-400 font-semibold group-hover:translate-x-1 transition-transform">
              <span>Open IO Workstation</span>
              <FaArrowRight className="ml-1.5 text-[10px]" />
            </div>
          </Link>

          {/* Forensics Lab */}
          <Link
            href="/forensics"
            className="p-6 rounded-2xl bg-slate-800 border border-slate-700 hover:border-emerald-500 transition-all hover:-translate-y-1 shadow-lg group flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-emerald-900/60 text-emerald-400 border border-emerald-700/60 flex items-center justify-center text-xl mb-4 group-hover:scale-110 transition-transform">
                <FaMicroscope />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Forensics Lab (CFSL)</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Receive evidence consignments, upload scientific forensic/ballistic/cyber examination reports, and digitally sign findings.
              </p>
            </div>
            <div className="mt-6 flex items-center text-xs text-emerald-400 font-semibold group-hover:translate-x-1 transition-transform">
              <span>Access FSL Portal</span>
              <FaArrowRight className="ml-1.5 text-[10px]" />
            </div>
          </Link>

          {/* Judiciary & Courts */}
          <Link
            href="/judiciary"
            className="p-6 rounded-2xl bg-slate-800 border border-slate-700 hover:border-amber-500 transition-all hover:-translate-y-1 shadow-lg group flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-amber-900/60 text-amber-400 border border-amber-700/60 flex items-center justify-center text-xl mb-4 group-hover:scale-110 transition-transform">
                <FaBalanceScale />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Judiciary & Prosecution</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Review verified case dossiers, inspect unbroken Chain of Custody trails, issue court orders, and generate Section 65B certificates.
              </p>
            </div>
            <div className="mt-6 flex items-center text-xs text-amber-400 font-semibold group-hover:translate-x-1 transition-transform">
              <span>Open Judicial Docket</span>
              <FaArrowRight className="ml-1.5 text-[10px]" />
            </div>
          </Link>

          {/* NCRB Women Safety Division */}
          <Link
            href="/women-safety"
            className="p-6 rounded-2xl bg-slate-800 border border-slate-700 hover:border-pink-500 transition-all hover:-translate-y-1 shadow-lg group flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-pink-900/60 text-pink-400 border border-pink-700/60 flex items-center justify-center text-xl mb-4 group-hover:scale-110 transition-transform">
                <FaUserSecret />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">NCRB Women Safety</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Automated PII redaction engine for victim & witness identity protection under Sec 228A IPC, POCSO Act, and confidential inquiries.
              </p>
            </div>
            <div className="mt-6 flex items-center text-xs text-pink-400 font-semibold group-hover:translate-x-1 transition-transform">
              <span>Open Women Safety Desk</span>
              <FaArrowRight className="ml-1.5 text-[10px]" />
            </div>
          </Link>
        </div>
      </section>

      {/* Core Architectural Pillars */}
      <section className="bg-slate-950 py-16 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">System Security & Compliance Pillars</h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-2">
              Engineered to meet statutory requirements of Indian legal & forensic standards
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-950 border border-indigo-700 text-indigo-400 flex items-center justify-center text-lg">
                <FaLock />
              </div>
              <h4 className="text-base font-bold text-white">Cryptographic Tamper-Proofing</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Every FIR, case diary, or forensic report receives an immutable SHA-256 digest anchored into Ethereum smart contracts. Any unauthorized bit alteration triggers an immediate mathematical failure.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-amber-950 border border-amber-700 text-amber-400 flex items-center justify-center text-lg">
                <FaFileContract />
              </div>
              <h4 className="text-base font-bold text-white">Section 65B Electronic Evidence Admissibility</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Automated generation of statutory Section 65B(4) Evidence Act / Sec 63 BSA Certificates complete with custodian sworn declaration, device logs, blockchain hash timestamps, and digital verification seal.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-pink-950 border border-pink-700 text-pink-400 flex items-center justify-center text-lg">
                <FaUserSecret />
              </div>
              <h4 className="text-base font-bold text-white">Victim Identity Protection (Sec 228A IPC)</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Automated entity scanning and redaction masks victim names, locations, and phone numbers in sensitive crimes while anchoring blinded commitments to preserve legal validity.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
