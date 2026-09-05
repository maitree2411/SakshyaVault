'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import TopNav from '../../components/TopNav';
import Footer from '../../components/Footer';
import { 
  FaBalanceScale, 
  FaFileContract, 
  FaCheckCircle, 
  FaFolderOpen, 
  FaGavel, 
  FaFilePdf,
  FaArrowRight,
  FaSearch
} from 'react-icons/fa';

interface CaseItem {
  id: string;
  caseNumber: string;
  firNumber: string;
  title: string;
  policeStation: string;
  status: string;
  sections: string;
  isSensitive: boolean;
  createdAt: string;
  _count: {
    documents: number;
  };
}

export default function JudiciaryPortal() {
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [orderTitle, setOrderTitle] = useState('');
  const [orderType, setOrderType] = useState('COURT_ORDER');
  const [orderContent, setOrderContent] = useState('');
  const [newStatus, setNewStatus] = useState('IN_TRIAL');
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [orderResult, setOrderResult] = useState<any>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const fetchCases = async () => {
    setLoading(true);
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
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, []);

  const handleIssueCourtOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCaseId) return;

    setSubmittingOrder(true);
    setOrderResult(null);

    try {
      // 1. Upload court order document
      const docRes = await fetch(`${apiUrl}/api/v1/legal-documents/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId: selectedCaseId,
          title: orderTitle,
          documentType: orderType,
          content: orderContent,
          officerName: 'Chief Metropolitan Magistrate / Sessions Judge',
          uploaderAddress: '0xbDA5747bFD65F08deb54cb465eB87D40e51B197E'
        })
      });
      const docData = await docRes.json();

      // 2. Update case status
      await fetch(`${apiUrl}/api/v1/cases/${selectedCaseId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          officerName: 'Judicial Magistrate Bench',
          remarks: `Order issued: ${orderTitle}`
        })
      });

      if (docData.success) {
        setOrderResult(docData.data);
        setOrderTitle('');
        setOrderContent('');
        fetchCases();
      }
    } catch (err) {
      console.error(err);
      alert('Failed to issue court order');
    } finally {
      setSubmittingOrder(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      <TopNav title="Judicial Bench & Prosecution Evidence Admissibility Portal" subtitle="District & Sessions Court | Directorate of Prosecution" />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-8">
        {/* Bench Header */}
        <div className="bg-slate-800/80 rounded-2xl border border-slate-700 p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-amber-900/80 border border-amber-700 text-amber-400 flex items-center justify-center text-2xl">
              <FaBalanceScale />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold text-white">Judicial Cognizance & Section 65B Certification</h1>
                <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-400 text-xs font-semibold border border-amber-700">
                  Judicial Access
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Presiding: <span className="text-slate-200 font-semibold">Hon&apos;ble Shri A. K. Verma, CMM</span> | Court: <span className="text-slate-200">Tis Hazari Courts, Delhi</span>
              </p>
            </div>
          </div>

          <Link
            href="/verify"
            className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow"
          >
            <FaFilePdf />
            <span>Generate 65B Certificate</span>
          </Link>
        </div>

        {/* Section 1: Active Judicial Dockets */}
        <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <FaGavel className="text-amber-400" />
                <span>Active Case Dockets Submitted for Cognizance</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Cases with finalized police charge sheets and forensic scientific reports
              </p>
            </div>
            <Link href="/cases" className="text-xs text-indigo-400 hover:underline">
              View All Dockets ➔
            </Link>
          </div>

          <div className="divide-y divide-slate-700/60">
            {cases.map((c) => (
              <div key={c.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold text-amber-400">{c.firNumber}</span>
                    <span className="text-slate-500">•</span>
                    <span className="text-xs text-slate-300 font-semibold">{c.title}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900 text-slate-300 border border-slate-700">
                      {c.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center space-x-4">
                    <span>Station: {c.policeStation}</span>
                    <span>Sections: {c.sections}</span>
                    <span className="text-emerald-400 font-semibold">Evidence Exhibits: {c._count.documents}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 flex-shrink-0">
                  <Link
                    href={`/cases/${c.id}`}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center space-x-1"
                  >
                    <span>Inspect Evidence</span>
                    <FaArrowRight className="text-[10px]" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 2: Issue Court Order / Judgment */}
        <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 shadow-xl space-y-6">
          <div>
            <h2 className="text-base font-bold text-white">Record Judicial Order, Bail Decision, or Judgment</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Court orders are cryptographically signed and permanently sealed into the trial docket.
            </p>
          </div>

          {orderResult && (
            <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 text-xs flex items-start space-x-3">
              <FaCheckCircle className="text-lg flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">Court Order Sealed on Legal Blockchain!</p>
                <p className="font-mono text-white text-[11px] truncate">Hash: {orderResult.documentHash}</p>
                <p className="font-mono text-indigo-300 text-[11px] truncate">Tx: {orderResult.txHash}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleIssueCourtOrder} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

              <div>
                <label className="block text-slate-400 mb-1">Order Classification</label>
                <select
                  value={orderType}
                  onChange={(e) => setOrderType(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="COURT_ORDER">Bail Order / In-Camera Proceeding Order</option>
                  <option value="COURT_ORDER">Summons / Warrant of Arrest</option>
                  <option value="JUDGMENT">Final Court Judgment & Sentencing Order</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-400 mb-1">Order Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Order on Regular Bail Application u/s 437 CrPC"
                  value={orderTitle}
                  onChange={(e) => setOrderTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Update Case Trial Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="IN_TRIAL">In Judicial Trial</option>
                  <option value="DISPOSED">Disposed / Trial Concluded</option>
                  <option value="CHARGE_SHEETED">Cognizance Taken / Pre-Trial</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Judicial Ruling & Operative Part</label>
              <textarea
                rows={5}
                required
                placeholder="Enter judicial ruling, bail terms, conditions imposed, or disposal order..."
                value={orderContent}
                onChange={(e) => setOrderContent(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={submittingOrder}
                className="px-6 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs disabled:opacity-50 flex items-center space-x-2 shadow-lg transition-colors"
              >
                <FaGavel />
                <span>{submittingOrder ? 'Signing Order...' : 'Sign & Seal Court Order'}</span>
              </button>
            </div>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
}
