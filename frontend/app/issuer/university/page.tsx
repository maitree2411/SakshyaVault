'use client';

import { useState } from 'react';
import { ethers } from 'ethers';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { FaGraduationCap, FaUserGraduate, FaCheck, FaArrowLeft, FaUniversity, FaShieldAlt, FaInfoCircle } from 'react-icons/fa';
import Link from 'next/link';
import TopNav from '@/components/TopNav';
import { useToast } from '@/components/Toast';

export default function UniversityIssuerPage() {
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    subjectAddress: '',
    studentName: '',
    degree: '',
    major: '',
    gpa: '',
    graduationYear: '',
    universityName: '',
  });
  const [isIssuing, setIsIssuing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showRegistration, setShowRegistration] = useState(false);
  const [registrationData, setRegistrationData] = useState({
    email: '',
    universityName: '',
    website: '',
    description: ''
  });

  async function ensureBackendAuth(): Promise<string | null> {
    try {
      const existing = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (existing) return existing;

      // Request wallet connection
      const eth: any = (window as any).ethereum;
      if (!eth) {
        setAuthError('MetaMask not found. Please install or enable it.');
        return null;
      }
      const accounts: string[] = await eth.request({ method: 'eth_requestAccounts' });
      const issuerAddress = accounts[0];
      if (!issuerAddress) {
        setAuthError('No wallet connected.');
        return null;
      }

      // 1) Get nonce
      const nonceRes = await fetch(`http://localhost:3001/api/v1/auth/nonce/${issuerAddress}`);
      const nonceJson = await nonceRes.json();
      const nonce = nonceJson?.nonce || nonceJson?.data?.nonce;
      if (!nonce) {
        setAuthError('Failed to obtain nonce from backend.');
        return null;
      }

      // 2) Sign nonce with a user-friendly message using ethers.js for compatibility
      const provider = new ethers.BrowserProvider(eth);
      const signer = await provider.getSigner();
      const messageToSign = `Sign this message to login. Nonce: ${nonce}`;
      const signature = await signer.signMessage(messageToSign);
      if (!signature) {
        setAuthError('Signature was not provided.');
        return null;
      }

      // 3) Login and get JWT
      const verifyRes = await fetch('http://localhost:3001/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: issuerAddress, signature, message: messageToSign }),
      });
      const verifyText = await verifyRes.text();
      let verifyJson: any = null;
      try { verifyJson = JSON.parse(verifyText); } catch { /* not JSON */ }
      const token = verifyJson?.token || verifyJson?.data?.token;
      if (!verifyRes.ok || !token) {
        // Auto-register if user not found, then retry login once
        if (verifyRes.status === 404 && /User not found/i.test(verifyJson?.message || '')) {
          const registerRes = await fetch('http://localhost:3001/api/v1/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address: issuerAddress, role: 'UNIVERSITY' }),
          });
          if (registerRes.ok) {
            const retryLogin = await fetch('http://localhost:3001/api/v1/auth/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ address: issuerAddress, signature, message: messageToSign }),
            });
            const retryText = await retryLogin.text();
            let retryJson: any = null;
            try { retryJson = JSON.parse(retryText); } catch {}
            const retryToken = retryJson?.token || retryJson?.data?.token;
            if (retryLogin.ok && retryToken) {
              localStorage.setItem('token', retryToken);
              setAuthError(null);
              return retryToken;
            }
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

  async function handleRegistration() {
    try {
      const eth: any = (window as any).ethereum;
      if (!eth) {
        setAuthError('MetaMask not found.');
        return;
      }
      const accounts: string[] = await eth.request({ method: 'eth_requestAccounts' });
      const issuerAddress = accounts[0];
      if (!issuerAddress) {
        setAuthError('No wallet connected.');
        return;
      }

      // Get nonce
      const nonceRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/nonce/${issuerAddress}`);
      const nonceJson = await nonceRes.json();
      const nonce = nonceJson?.nonce || nonceJson?.data?.nonce;
      if (!nonce) {
        setAuthError('Failed to obtain nonce.');
        return;
      }

      // Sign message
      const provider = new ethers.BrowserProvider(eth);
      const signer = await provider.getSigner();
      const messageToSign = `Sign this message to register as university. Nonce: ${nonce}`;
      const signature = await signer.signMessage(messageToSign);

      // Register
      const registerRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: issuerAddress,
          signature,
          message: messageToSign,
          email: registrationData.email,
          role: 'UNIVERSITY',
          universityName: registrationData.universityName,
          website: registrationData.website,
          description: registrationData.description
        })
      });

      const registerText = await registerRes.text();
      let registerJson: any = null;
      try { registerJson = JSON.parse(registerText); } catch {}

      if (registerRes.ok) {
        const token = registerJson?.token || registerJson?.data?.token;
        if (token) {
          localStorage.setItem('token', token);
          localStorage.setItem('tokenAddress', issuerAddress);
          setShowRegistration(false);
          setAuthError(null);
          showToast('University registration successful!', 'success');
        }
      } else {
        setAuthError(registerJson?.message || 'Registration failed.');
      }
    } catch (e: any) {
      setAuthError(e?.message || 'Registration error');
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleRegistrationInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setRegistrationData({
      ...registrationData,
      [e.target.name]: e.target.value,
    });
  };

  const handleIssueCredential = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsIssuing(true);
    
    try {
      // Ensure we have backend JWT before calling protected endpoint
      let token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) {
        token = await ensureBackendAuth();
        if (!token) {
          setIsIssuing(false);
          return;
        }
      }
      const response = await fetch('http://localhost:3001/api/v1/credentials/academic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          subjectAddress: formData.subjectAddress,
          studentName: formData.studentName,
          degree: formData.degree,
          major: formData.major,
          gpa: parseFloat(formData.gpa),
          graduationYear: parseInt(formData.graduationYear),
          // Backend expects institutionName
          institutionName: formData.universityName,
        }),
      });
      
      const text = await response.text();
      let json: any = null;
      try { json = JSON.parse(text); } catch { /* not JSON (likely HTML error) */ }
      // Normalize response and surface errors clearly
      if (!response.ok || json?.success === false) {
        setResult({ error: (json?.message || `Failed to issue credential (status ${response.status})`), raw: json ?? text });
      } else {
        const payload = json?.data ?? json;
        setResult({
          credentialHash: payload?.credentialHash,
          txHash: payload?.txHash,
          ipfsHash: payload?.ipfsHash,
        });
      }
      
      if (response.ok) {
        // Reset form on success
        setFormData({
          subjectAddress: '',
          studentName: '',
          degree: '',
          major: '',
          gpa: '',
          graduationYear: '',
          universityName: '',
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <TopNav title="AnonHire - University Issuer" accent="blue" />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Issue Academic Credentials
          </h2>
          <p className="text-xl text-gray-600">
            Issue verifiable academic credentials to students
          </p>
        </div>

        {/* Issue Credential Form */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">Student Information</h3>
          
          <form onSubmit={handleIssueCredential} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="subjectAddress" className="block text-sm font-medium text-gray-700 mb-2">
                  Student Wallet Address *
                </label>
                <input
                  type="text"
                  id="subjectAddress"
                  name="subjectAddress"
                  value={formData.subjectAddress}
                  onChange={handleInputChange}
                  placeholder="0x..."
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label htmlFor="studentName" className="block text-sm font-medium text-gray-700 mb-2">
                  Student Name *
                </label>
                <input
                  type="text"
                  id="studentName"
                  name="studentName"
                  value={formData.studentName}
                  onChange={handleInputChange}
                  placeholder="John Doe"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label htmlFor="degree" className="block text-sm font-medium text-gray-700 mb-2">
                  Degree *
                </label>
                <select
                  id="degree"
                  name="degree"
                  value={formData.degree}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Degree</option>
                  <option value="Bachelor of Science">Bachelor of Science</option>
                  <option value="Bachelor of Arts">Bachelor of Arts</option>
                  <option value="Master of Science">Master of Science</option>
                  <option value="Master of Arts">Master of Arts</option>
                  <option value="PhD">PhD</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="major" className="block text-sm font-medium text-gray-700 mb-2">
                  Major *
                </label>
                <input
                  type="text"
                  id="major"
                  name="major"
                  value={formData.major}
                  onChange={handleInputChange}
                  placeholder="Computer Science"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label htmlFor="gpa" className="block text-sm font-medium text-gray-700 mb-2">
                  GPA *
                </label>
                <input
                  type="number"
                  id="gpa"
                  name="gpa"
                  value={formData.gpa}
                  onChange={handleInputChange}
                  placeholder="3.75"
                  min="0"
                  max="10.00"
                  step="0.01"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label htmlFor="graduationYear" className="block text-sm font-medium text-gray-700 mb-2">
                  Graduation Year *
                </label>
                <input
                  type="number"
                  id="graduationYear"
                  name="graduationYear"
                  value={formData.graduationYear}
                  onChange={handleInputChange}
                  placeholder="2024"
                  min="1900"
                  max="2100"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="universityName" className="block text-sm font-medium text-gray-700 mb-2">
                University Name *
              </label>
              <input
                type="text"
                id="universityName"
                name="universityName"
                value={formData.universityName}
                onChange={handleInputChange}
                placeholder="University of Technology"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <button
              type="submit"
              disabled={isIssuing}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isIssuing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Issuing Credential...</span>
                </>
              ) : (
                <>
                  <FaUserGraduate />
                  <span>Issue Academic Credential</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Result */}
        {authError && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded mb-6">
            {authError}
          </div>
        )}

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
                    <strong>Credential Hash:</strong> {result?.credentialHash ?? '—'}
                    {result?.credentialHash && (
                      <button
                        type="button"
                        onClick={() => { navigator.clipboard.writeText(result.credentialHash); showToast('Credential hash copied', 'success'); }}
                        className="ml-2 px-2 py-1 text-xs border rounded hover:bg-gray-50"
                      >Copy</button>
                    )}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Transaction Hash:</strong> {result?.txHash ?? '—'}
                    {result?.txHash && (
                      <button
                        type="button"
                        onClick={() => { navigator.clipboard.writeText(result.txHash); showToast('Transaction hash copied', 'success'); }}
                        className="ml-2 px-2 py-1 text-xs border rounded hover:bg-gray-50"
                      >Copy</button>
                    )}
                  </p>
                  {result?.ipfsHash && (
                    <p className="text-sm text-gray-600">
                      <strong>IPFS CID:</strong> {result.ipfsHash}
                      <button
                        type="button"
                        onClick={() => { navigator.clipboard.writeText(result.ipfsHash); showToast('IPFS CID copied', 'success'); }}
                        className="ml-2 px-2 py-1 text-xs border rounded hover:bg-gray-50"
                      >Copy</button>
                    </p>
                  )}
                </div>
                {/* Debug: raw response payload to help troubleshooting */}
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
        <div className="bg-blue-50 rounded-lg p-6 mt-8">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">Instructions</h3>
          <ol className="list-decimal list-inside space-y-2 text-blue-800">
            <li>Connect your university wallet using the button above</li>
            <li>Fill in all the required student information</li>
            <li>Click &quot;Issue Academic Credential&quot; to create the credential</li>
            <li>The credential will be stored on IPFS and recorded on blockchain</li>
            <li>Share the credential hash with the student</li>
          </ol>
        </div>
      </main>

      {/* Registration Modal */}
      {showRegistration && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
            <div className="flex items-center space-x-3 mb-6">
              <div className="bg-blue-100 rounded-full p-3">
                <FaUniversity className="text-blue-600 text-2xl" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">University Registration</h3>
                <p className="text-sm text-gray-600">Complete your university registration</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  University Name *
                </label>
                <input
                  type="text"
                  name="universityName"
                  value={registrationData.universityName}
                  onChange={handleRegistrationInputChange}
                  placeholder="University of Technology"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  name="email"
                  value={registrationData.email}
                  onChange={handleRegistrationInputChange}
                  placeholder="admin@university.edu"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Website
                </label>
                <input
                  type="url"
                  name="website"
                  value={registrationData.website}
                  onChange={handleRegistrationInputChange}
                  placeholder="https://university.edu"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={registrationData.description}
                  onChange={handleRegistrationInputChange}
                  placeholder="Brief description of your university..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {authError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm">{authError}</p>
              </div>
            )}

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowRegistration(false)}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRegistration}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
              >
                <FaShieldAlt />
                <span>Register University</span>
              </button>
            </div>

            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <div className="flex items-start space-x-2">
                <FaInfoCircle className="text-blue-600 mt-1" />
                <div>
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> You&apos;ll need to sign a message with your wallet to complete registration.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

