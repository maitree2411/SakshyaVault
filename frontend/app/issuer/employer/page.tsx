'use client';

import { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { FaBriefcase, FaUserTie, FaCheck, FaArrowLeft } from 'react-icons/fa';
import Link from 'next/link';
import TopNav from '@/components/TopNav';
import { useToast } from '@/components/Toast';
import { ethers } from 'ethers';
import { encryptCredentialData } from '@/lib/client-zkp';

export default function EmployerIssuerPage() {
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    subjectAddress: '',
    employeeName: '',
    position: '',
    companyName: '',
    startDate: '',
    endDate: '',
    isCurrent: false,
    description: '',
  });
  const [isIssuing, setIsIssuing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    });
  };

  async function ensureBackendAuth(): Promise<string | null> {
    try {
      const existing = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (existing) return existing;

      const eth: any = (window as any).ethereum;
      if (!eth) { setAuthError('MetaMask not found.'); return null; }
      const accounts: string[] = await eth.request({ method: 'eth_requestAccounts' });
      const issuerAddress = accounts[0];
      if (!issuerAddress) { setAuthError('No wallet connected.'); return null; }

      const nonceRes = await fetch(`http://localhost:3001/api/v1/auth/nonce/${issuerAddress}`);
      const nonceJson = await nonceRes.json();
      const nonce = nonceJson?.nonce || nonceJson?.data?.nonce;
      if (!nonce) { setAuthError('Failed to get nonce.'); return null; }

      const provider = new ethers.BrowserProvider(eth);
      const signer = await provider.getSigner();
      const messageToSign = `Sign this message to login. Nonce: ${nonce}`;
      const signature = await signer.signMessage(messageToSign);

      const verifyRes = await fetch('http://localhost:3001/api/v1/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: issuerAddress, signature, message: messageToSign })
      });
      const verifyText = await verifyRes.text();
      let verifyJson: any = null; try { verifyJson = JSON.parse(verifyText); } catch {}
      const token = verifyJson?.token || verifyJson?.data?.token;
      if (!verifyRes.ok || !token) {
        if (verifyRes.status === 404 && /User not found/i.test(verifyJson?.message || '')) {
          const registerRes = await fetch('http://localhost:3001/api/v1/auth/register', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address: issuerAddress, role: 'EMPLOYER' })
          });
          if (registerRes.ok) {
            const retry = await fetch('http://localhost:3001/api/v1/auth/login', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ address: issuerAddress, signature, message: messageToSign })
            });
            const retryText = await retry.text();
            let retryJson: any = null; try { retryJson = JSON.parse(retryText); } catch {}
            const retryToken = retryJson?.token || retryJson?.data?.token;
            if (retry.ok && retryToken) { localStorage.setItem('token', retryToken); setAuthError(null); return retryToken; }
          }
        }
        setAuthError(verifyJson?.message || `Authentication failed (status ${verifyRes.status}). ${verifyText?.slice(0,200)}`);
        return null;
      }
      localStorage.setItem('token', token);
      setAuthError(null);
      return token;
    } catch (e: any) {
      setAuthError(e?.message || 'Authentication error');
      return null;
    }
  }

  const handleIssueCredential = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsIssuing(true);
    
    try {
      const start = new Date(formData.startDate);
      const present = Boolean(formData.isCurrent);
      const end = present ? new Date() : new Date(formData.endDate);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        throw new Error('Invalid start/end date');
      }
      if (end < start) {
        throw new Error('End date cannot be earlier than start date');
      }

      const monthDiff = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
      let experienceMonths = Math.max(0, monthDiff + (end.getDate() >= start.getDate() ? 0 : -1));
      if (end > start && experienceMonths === 0) {
        experienceMonths = 1;
      }

      const credentialData = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        type: ['VerifiableCredential', 'JobCredential'],
        issuanceDate: new Date().toISOString(),
        credentialSubject: {
          id: formData.subjectAddress,
          name: formData.employeeName,
          position: formData.position,
          company: formData.companyName,
          startDate: start.toISOString(),
          endDate: present ? null : end.toISOString(),
          present,
          experienceMonths,
          description: formData.description,
          responsibilities: formData.description,
          skills: [],
        },
      };

      const encryptedData = await encryptCredentialData(credentialData);

      let token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) {
        token = await ensureBackendAuth();
        if (!token) { setIsIssuing(false); return; }
      }

      const response = await fetch('http://localhost:3001/api/v1/credentials/job', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          subjectAddress: formData.subjectAddress,
          encryptedData,
        }),
      });
      
      const text = await response.text();
      let json: any = null; try { json = JSON.parse(text); } catch {}
      setResult(json ?? { raw: text });
      
      if (response.ok) {
        // Reset form on success
        setFormData({
          subjectAddress: '',
          employeeName: '',
          position: '',
          companyName: '',
          startDate: '',
          endDate: '',
          isCurrent: false,
          description: '',
        });
      }
    } catch (error) {
      console.error('Failed to issue credential:', error);
      setResult({ error: 'Failed to issue credential' });
    } finally {
      setIsIssuing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      {/* Header */}
      <TopNav title="AnonHire - Employer Issuer" accent="green" />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Issue Job Credentials
          </h2>
          <p className="text-xl text-gray-600">
            Issue verifiable employment credentials to your employees
          </p>
        </div>

        {/* Issue Credential Form */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">Employee Information</h3>
          
          <form onSubmit={handleIssueCredential} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="subjectAddress" className="block text-sm font-medium text-gray-700 mb-2">
                  Employee Wallet Address *
                </label>
                <input
                  type="text"
                  id="subjectAddress"
                  name="subjectAddress"
                  value={formData.subjectAddress}
                  onChange={handleInputChange}
                  placeholder="0x..."
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label htmlFor="employeeName" className="block text-sm font-medium text-gray-700 mb-2">
                  Employee Name *
                </label>
                <input
                  type="text"
                  id="employeeName"
                  name="employeeName"
                  value={formData.employeeName}
                  onChange={handleInputChange}
                  placeholder="John Doe"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label htmlFor="position" className="block text-sm font-medium text-gray-700 mb-2">
                  Position *
                </label>
                <input
                  type="text"
                  id="position"
                  name="position"
                  value={formData.position}
                  onChange={handleInputChange}
                  placeholder="Software Engineer"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-2">
                  Company Name *
                </label>
                <input
                  type="text"
                  id="companyName"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleInputChange}
                  placeholder="Tech Corp"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date *
                </label>
                <input
                  type="date"
                  id="startDate"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  id="endDate"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleInputChange}
                  disabled={formData.isCurrent}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100"
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="isCurrent"
                name="isCurrent"
                checked={formData.isCurrent}
                onChange={handleInputChange}
                className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
              />
              <label htmlFor="isCurrent" className="text-sm font-medium text-gray-700">
                Currently employed
              </label>
            </div>
            
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Job Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={4}
                placeholder="Brief description of the role and responsibilities..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            
            <button
              type="submit"
              disabled={isIssuing}
              className="w-full bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isIssuing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Issuing Credential...</span>
                </>
              ) : (
                <>
                  <FaUserTie />
                  <span>Issue Job Credential</span>
                </>
              )}
            </button>
          </form>
        </div>

        {authError && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded mb-6">{authError}</div>
        )}

        {/* Result */}
        {result && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Result</h3>
            
            {result.error ? (
              <div className="text-red-600">
                <p className="font-semibold">Error:</p>
                <p>{result.error}</p>
              </div>
            ) : (
              <div className="text-green-600">
                <div className="flex items-center space-x-3 mb-4">
                  <FaCheck className="text-2xl" />
                  <span className="font-semibold">Credential Issued Successfully!</span>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">
                    <strong>Credential Hash:</strong> {result.credentialHash}
                    {result?.credentialHash && (
                      <button
                        type="button"
                        onClick={() => { navigator.clipboard.writeText(result.credentialHash); showToast('Credential hash copied', 'success'); }}
                        className="ml-2 px-2 py-1 text-xs border rounded hover:bg-gray-50"
                      >Copy</button>
                    )}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Transaction Hash:</strong> {result.txHash}
                    {result?.txHash && (
                      <button
                        type="button"
                        onClick={() => { navigator.clipboard.writeText(result.txHash); showToast('Transaction hash copied', 'success'); }}
                        className="ml-2 px-2 py-1 text-xs border rounded hover:bg-gray-50"
                      >Copy</button>
                    )}
                  </p>
                </div>
                <div className="mt-3">
                  <details className="text-gray-500 text-sm">
                    <summary>Response details</summary>
                    <pre className="whitespace-pre-wrap break-all bg-white p-3 rounded border border-gray-200 mt-2">{JSON.stringify(result, null, 2)}</pre>
                  </details>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="bg-green-50 rounded-lg p-6 mt-8">
          <h3 className="text-lg font-semibold text-green-900 mb-3">Instructions</h3>
          <ol className="list-decimal list-inside space-y-2 text-green-800">
            <li>Connect your company wallet using the button above</li>
            <li>Fill in all the required employee information</li>
            <li>Check &quot;Currently employed&quot; if the employee is still working</li>
            <li>Click &quot;Issue Job Credential&quot; to create the credential</li>
            <li>The credential will be stored on IPFS and recorded on blockchain</li>
            <li>Share the credential hash with the employee</li>
          </ol>
        </div>
      </main>
    </div>
  );
}
