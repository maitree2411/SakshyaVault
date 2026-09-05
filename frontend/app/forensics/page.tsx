'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import TopNav from '../../components/TopNav';
import Footer from '../../components/Footer';
import { 
  FaMicroscope, 
  FaFileAlt, 
  FaCheckCircle, 
  FaLock, 
  FaFolderOpen,
  FaShieldAlt,
  FaArrowRight
} from 'react-icons/fa';

interface CaseOption {
  id: string;
  caseNumber: string;
  firNumber: string;
  title: string;
}

export default function ForensicsWorkstation() {
  const [cases, setCases] = useState<CaseOption[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [division, setDivision] = useState('CYBER');
  const [reportTitle, setReportTitle] = useState('CFSL Digital Forensics & Volatile Memory Examination Report');
  const [findings, setFindings] = useState('');
  const [examinerName] = useState('Dr. Sunita Rao (Senior Scientific Officer, CFSL)');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  useEffect(() => {
    fetch(`${apiUrl}/api/v1/cases`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data.length > 0) {
          setCases(data.data);
          setSelectedCaseId(data.data[0].id);
        }
      })
      .catch((err) => console.error('Error fetching cases:', err));
  }, [apiUrl]);

  const handleForensicSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCaseId) return;

    setSubmitting(true);
    setResult(null);

    try {
      const fullReportContent = `=== CENTRAL FORENSIC SCIENCE LABORATORY (CFSL) ===\nDIVISION: ${division}\nEXAMINER: ${examinerName}\nFINDINGS SUMMARY:\n${findings}\nDATE OF EXAMINATION: ${new Date().toISOString()}`;

      const res = await fetch(`${apiUrl}/api/v1/legal-documents/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId: selectedCaseId,
          title: reportTitle,
          documentType: 'FORENSIC_REPORT',
          content: fullReportContent,
          officerName: examinerName,
          uploaderAddress: '0x2546BcD3c84621e976D8185a91A922aE77ECEc30'
        })
      });

      const data = await res.json();
      if (data.success) {
        setResult(data.data);
        setFindings('');
      } else {
        alert(data.error || 'Failed to anchor forensic report');
      }
    } catch (err) {
      console.error(err);
      alert('Network error submitting forensic report');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      <TopNav title="Forensic Science Laboratory (CFSL) Examination Portal" subtitle="Scientific Evidence Analysis, Hash Anchoring & Expert Testimony Vault" />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-8">
        {/* Examiner Banner */}
        <div className="bg-slate-800/80 rounded-2xl border border-slate-700 p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-900/80 border border-emerald-700 text-emerald-400 flex items-center justify-center text-2xl">
              <FaMicroscope />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold text-white">Forensic Evidence Ingestion & Cryptographic Seal</h1>
                <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 text-xs font-semibold border border-emerald-700">
                  Accredited Lab
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Examiner: <span className="text-slate-200 font-semibold">{examinerName}</span> | Complex: <span className="text-slate-200">CBI Complex, Lodhi Road, New Delhi</span>
              </p>
            </div>
          </div>

          <Link
            href="/cases"
            className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs text-slate-200 font-semibold flex items-center space-x-1.5 transition-colors"
          >
            <FaFolderOpen />
            <span>Case Repository</span>
          </Link>
        </div>

        {/* Report Submission Form */}
        <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 shadow-xl space-y-6">
          <div>
            <h2 className="text-base font-bold text-white">Submit Official Scientific Examination Report</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              The report will receive an on-chain cryptographic anchor and initiate an unbroken Chain of Custody to the Trial Court.
            </p>
          </div>

          {result && (
            <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 text-xs flex items-start space-x-3">
              <FaCheckCircle className="text-lg flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">Scientific Report Successfully Anchored on Legal Blockchain!</p>
                <p className="font-mono text-white text-[11px] truncate">SHA-256 Digest: {result.documentHash}</p>
                <p className="font-mono text-indigo-300 text-[11px] truncate">Tx Hash: {result.txHash}</p>
                <Link href={`/cases/${selectedCaseId}`} className="text-amber-400 underline block pt-1 font-semibold">
                  Inspect in Case Dossier ➔
                </Link>
              </div>
            </div>
          )}

          <form onSubmit={handleForensicSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-400 mb-1">Target Case File & FIR</label>
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

              <div>
                <label className="block text-slate-400 mb-1">Forensic Science Division</label>
                <select
                  value={division}
                  onChange={(e) => {
                    setDivision(e.target.value);
                    if (e.target.value === 'CYBER') {
                      setReportTitle('CFSL Digital Forensics & Voice Spectrogram Examination Report');
                    } else if (e.target.value === 'BALLISTICS') {
                      setReportTitle('CFSL Ballistic Examination & Microscopic Striation Report');
                    } else if (e.target.value === 'DNA') {
                      setReportTitle('CFSL Serology & DNA Profiling Report');
                    } else {
                      setReportTitle('CFSL Chemical & Toxicology Analysis Report');
                    }
                  }}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="CYBER">Digital, Cyber Forensics & Audio/Video Analysis</option>
                  <option value="BALLISTICS">Ballistics & Firearms Division</option>
                  <option value="DNA">Serology & DNA Profiling</option>
                  <option value="TOXICOLOGY">Toxicology & Chemical Analysis</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Report Title</label>
              <input
                type="text"
                required
                value={reportTitle}
                onChange={(e) => setReportTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Detailed Forensic Findings & Opinion</label>
              <textarea
                rows={7}
                required
                placeholder="Detail the scientific methodology, tool calibration, hash verified at time of acquisition, striation match, or acoustic spectral variance..."
                value={findings}
                onChange={(e) => setFindings(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center space-x-2 text-slate-400 text-[11px]">
              <FaLock className="text-emerald-400 flex-shrink-0" />
              <span>
                By submitting, you apply the CFSL Examiner cryptographic signature. The report cannot be altered, substituted, or repudiated in judicial proceedings.
              </span>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs disabled:opacity-50 flex items-center space-x-2 shadow-lg transition-colors"
              >
                <FaCheckCircle />
                <span>{submitting ? 'Anchoring Report...' : 'Sign & Anchor Forensic Report'}</span>
              </button>
            </div>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
}
