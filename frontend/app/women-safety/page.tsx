'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import TopNav from '../../components/TopNav';
import Footer from '../../components/Footer';
import { 
  FaUserSecret, 
  FaShieldAlt, 
  FaLock, 
  FaCheckCircle, 
  FaEyeSlash, 
  FaFileAlt,
  FaArrowRight
} from 'react-icons/fa';

interface SensitiveCase {
  id: string;
  caseNumber: string;
  firNumber: string;
  title: string;
  policeStation: string;
  sections: string;
  _count: {
    documents: number;
  };
}

export default function WomenSafetyPortal() {
  const [sensitiveCases, setSensitiveCases] = useState<SensitiveCase[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState('');

  // Redaction Inputs
  const [statementTitle, setStatementTitle] = useState('Victim Deposition under Section 164 CrPC');
  const [rawContent, setRawContent] = useState(
    'Statement of Ms. Ananya Sen, resident of House 42, Civil Lines, Delhi. I was contacted on WhatsApp from +91-9876543210 with persistent threats and morphing demands.'
  );
  const [victimName, setVictimName] = useState('Ananya Sen');
  const [victimAddress, setVictimAddress] = useState('House 42, Civil Lines, Delhi');
  const [victimPhone, setVictimPhone] = useState('+91-9876543210');

  const [processing, setProcessing] = useState(false);
  const [redactionResult, setRedactionResult] = useState<any>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  useEffect(() => {
    fetch(`${apiUrl}/api/v1/women-safety/sensitive-cases`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setSensitiveCases(data.data);
          if (data.data.length > 0) {
            setSelectedCaseId(data.data[0].id);
          }
        }
      })
      .catch((err) => console.error('Error fetching sensitive cases:', err));
  }, [apiUrl]);

  const handleRedactAndProtect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCaseId) return;

    setProcessing(true);
    setRedactionResult(null);

    try {
      const res = await fetch(`${apiUrl}/api/v1/women-safety/redact-protect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId: selectedCaseId,
          title: statementTitle,
          statementContent: rawContent,
          victimName,
          victimAddress,
          victimPhone,
          officerName: 'NCRB Women Safety Desk Officer',
          uploaderAddress: '0xcd3B766CCDd6AE721141F452C550Ca635964ce71'
        })
      });

      const data = await res.json();
      if (data.success) {
        setRedactionResult(data.data);
      } else {
        alert(data.error || 'Failed to process redaction');
      }
    } catch (err) {
      console.error(err);
      alert('Network error during redaction process');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      <TopNav title="NCRB Women Safety Division & Witness Protection Desk" subtitle="Ministry of Home Affairs | Section 228A IPC & POCSO Identity Masking Engine" />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-8">
        {/* Division Header */}
        <div className="bg-slate-800/80 rounded-2xl border border-slate-700 p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-pink-900/80 border border-pink-700 text-pink-400 flex items-center justify-center text-2xl">
              <FaUserSecret />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold text-white">Sensitive Witness & Victim Identity Vault</h1>
                <span className="px-2 py-0.5 rounded bg-pink-950 text-pink-400 text-xs font-semibold border border-pink-700">
                  Sec 228A IPC Protected
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Automated PII Redaction & Blinded Cryptographic Commitments for Evidentiary Admissibility
              </p>
            </div>
          </div>

          <Link
            href="/cases"
            className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs text-slate-200 font-semibold flex items-center space-x-1.5 transition-colors"
          >
            <FaShieldAlt />
            <span>Sensitive Case Files</span>
          </Link>
        </div>

        {/* Automated PII Redaction Workstation */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Form: PII Scanner */}
          <div className="lg:col-span-7 bg-slate-800 rounded-2xl border border-slate-700 p-6 shadow-xl space-y-5">
            <div>
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <FaEyeSlash className="text-pink-400" />
                <span>Automated PII Redaction & Cryptographic Masking</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Masks all identifying information while anchoring an immutable blinded hash for judicial integrity.
              </p>
            </div>

            <form onSubmit={handleRedactAndProtect} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Target Case File</label>
                <select
                  value={selectedCaseId}
                  onChange={(e) => setSelectedCaseId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-pink-500"
                >
                  {sensitiveCases.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.firNumber} - {c.caseNumber} : {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Document Title</label>
                <input
                  type="text"
                  required
                  value={statementTitle}
                  onChange={(e) => setStatementTitle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-pink-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Protected Victim / Witness Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Ananya Sen"
                    value={victimName}
                    onChange={(e) => setVictimName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-pink-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Confidential Address / Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Civil Lines, Delhi"
                    value={victimAddress}
                    onChange={(e) => setVictimAddress(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-pink-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Contact Phone / Aadhaar</label>
                  <input
                    type="text"
                    placeholder="e.g. +91-9876543210"
                    value={victimPhone}
                    onChange={(e) => setVictimPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-pink-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Raw Deposition Statement Content</label>
                <textarea
                  rows={5}
                  required
                  value={rawContent}
                  onChange={(e) => setRawContent(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-pink-500"
                />
              </div>

              <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 flex items-center space-x-2">
                <FaLock className="text-pink-400 flex-shrink-0" />
                <span>
                  Section 228A IPC Strict Enforcement: The public and trial record will strictly receive the redacted format with blinded SHA-256 commitments.
                </span>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={processing}
                  className="px-6 py-2.5 rounded-lg bg-pink-600 hover:bg-pink-500 text-white font-semibold text-xs disabled:opacity-50 flex items-center space-x-2 shadow-lg transition-colors"
                >
                  <FaEyeSlash />
                  <span>{processing ? 'Redacting & Anchoring...' : 'Redact & Anchor Protected Document'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Right Side: Live Redaction Output */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <FaFileAlt className="text-pink-400" />
                <span>Redaction Output & Cryptographic Proof</span>
              </h3>

              {redactionResult ? (
                <div className="space-y-4 text-xs">
                  <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/60 text-emerald-300">
                    <p className="font-bold flex items-center space-x-1">
                      <FaCheckCircle />
                      <span>{redactionResult.statutoryCompliance}</span>
                    </p>
                  </div>

                  <div>
                    <span className="text-slate-400 block mb-1 font-semibold">Protected Redacted Public Text:</span>
                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-700 text-amber-300 font-mono text-[11px] leading-relaxed">
                      {redactionResult.redactedContent}
                    </div>
                  </div>

                  <div className="space-y-1.5 font-mono text-[11px] p-3 rounded-lg bg-slate-900/80 border border-slate-800">
                    <div className="truncate">
                      <span className="text-slate-500">Public Document Hash:</span>{' '}
                      <span className="text-pink-300">{redactionResult.document.documentHash}</span>
                    </div>
                    <div className="truncate">
                      <span className="text-slate-500">Original Blinded Hash:</span>{' '}
                      <span className="text-slate-300">{redactionResult.originalBlindedCommitment}</span>
                    </div>
                    <div className="truncate">
                      <span className="text-slate-500">Blockchain Anchor Tx:</span>{' '}
                      <span className="text-indigo-400">{redactionResult.document.txHash}</span>
                    </div>
                  </div>

                  <Link
                    href={`/cases/${selectedCaseId}`}
                    className="block text-center py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors"
                  >
                    View In Case Dossier ➔
                  </Link>
                </div>
              ) : (
                <div className="py-16 text-center space-y-2 text-slate-500 text-xs">
                  <FaEyeSlash className="mx-auto text-3xl opacity-50" />
                  <p>Submit a statement on the left to view real-time automated redaction and cryptographic commitments.</p>
                </div>
              )}
            </div>

            {/* Statutory Reference Box */}
            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80 text-xs space-y-2">
              <h4 className="font-bold text-slate-200">Statutory Provisions & Guidelines:</h4>
              <ul className="list-disc list-inside text-slate-400 space-y-1 text-[11px]">
                <li><span className="text-slate-300 font-semibold">Section 228A IPC:</span> Penalty for disclosing identity of victim of certain offenses.</li>
                <li><span className="text-slate-300 font-semibold">Section 72 Bharatiya Nyaya Sanhita, 2023:</span> Prohibition of disclosure of victim particulars.</li>
                <li><span className="text-slate-300 font-semibold">POCSO Act, Section 33(7):</span> Mandatory child identity masking in judicial records.</li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
