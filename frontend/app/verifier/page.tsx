'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useToast } from '@/components/Toast';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { FaCheck, FaTimes, FaSearch, FaShieldAlt, FaArrowLeft, FaCopy, FaExternalLinkAlt, FaGraduationCap, FaBriefcase, FaUserTie, FaExclamationTriangle, FaCheckCircle, FaClock, FaQrcode, FaHistory } from 'react-icons/fa';
import Link from 'next/link';
import TopNav from '@/components/TopNav';

export default function VerifierPage() {
  const searchParams = useSearchParams();
  const [credentialHash, setCredentialHash] = useState('');
  const [hashFromQR, setHashFromQR] = useState(false);
  const [zkpFromQR, setZkpFromQR] = useState(false);

  const decodeZkpFromParam = (value: string) => {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const pad = normalized.length % 4;
    const padded = pad ? normalized + '='.repeat(4 - pad) : normalized;
    const json = decodeURIComponent(escape(atob(padded)));
    JSON.parse(json); // sanity-check
    return json;
  };

  // Auto-fill from QR/share links:
  // - standard: ?hash=0x...
  // - zkp: ?zkp=<base64url-encoded-json>
  useEffect(() => {
    const zkpParam = searchParams.get('zkp');
    if (zkpParam) {
      try {
        const decodedProofJson = decodeZkpFromParam(zkpParam);
        setVerifyMode('zkp');
        setZkpProofText(decodedProofJson);
        setZkpFromQR(true);
        setShowZkpJsonEditor(false);
        setHashFromQR(false);
        return;
      } catch {
        // fall through and try hash mode
      }
    }

    const hashParam = searchParams.get('hash');
    if (hashParam) {
      setCredentialHash(hashParam);
      setHashFromQR(true);
      setZkpFromQR(false);
    }
  }, [searchParams]);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationHistory, setVerificationHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showParams, setShowParams] = useState(false);
  const [verificationParams, setVerificationParams] = useState({
    minGpa: '',
    requiredDegree: '',
    requiredMajor: '',
    minGraduationYear: '',
    minExperience: '',
    requiredSkills: [] as string[]
  });
  const [newSkill, setNewSkill] = useState('');
  const [verifyMode, setVerifyMode] = useState<'standard' | 'zkp'>('standard');
  const [zkpProofText, setZkpProofText] = useState('');
  const [showZkpJsonEditor, setShowZkpJsonEditor] = useState(true);
  const [zkpResult, setZkpResult] = useState<any>(null);
  const [isVerifyingZKP, setIsVerifyingZKP] = useState(false);
  const { showToast } = useToast();

  const handleVerify = async () => {
    if (!credentialHash) return;
    
    setIsVerifying(true);
    try {
      let response;
      
      if (showParams && hasVerificationParams()) {
        // Use parameter-based verification
        const params = {
          credentialHash,
          verificationParams: {
            ...(verificationParams.minGpa && { minGpa: parseFloat(verificationParams.minGpa) }),
            ...(verificationParams.requiredDegree && { requiredDegree: verificationParams.requiredDegree }),
            ...(verificationParams.requiredMajor && { requiredMajor: verificationParams.requiredMajor }),
            ...(verificationParams.minGraduationYear && { minGraduationYear: parseInt(verificationParams.minGraduationYear) }),
            ...(verificationParams.minExperience && { minExperience: parseInt(verificationParams.minExperience) }),
            ...(verificationParams.requiredSkills.length > 0 && { requiredSkills: verificationParams.requiredSkills }),
          }
        };
        
        response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/verification/verify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(params),
        });
      } else {
        // Use basic verification
        response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/verification/verify/${credentialHash}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
      }
      
      const result = await response.json();
      setVerificationResult(result);
      
      // Add to verification history
      const historyEntry = {
        hash: credentialHash,
        result: result,
        timestamp: new Date().toISOString(),
        id: Date.now(),
        params: showParams ? verificationParams : null
      };
      setVerificationHistory(prev => [historyEntry, ...prev.slice(0, 9)]); // Keep last 10
      
      if (result.success) {
        showToast('Credential verified successfully!', 'success');
      } else {
        showToast('Verification failed', 'error');
      }
    } catch (error) {
      console.error('Verification failed:', error);
      setVerificationResult({ error: 'Verification failed' });
      showToast('Verification failed', 'error');
    } finally {
      setIsVerifying(false);
    }
  };

  const hasVerificationParams = () => {
    return verificationParams.minGpa || 
           verificationParams.requiredDegree || 
           verificationParams.requiredMajor || 
           verificationParams.minGraduationYear || 
           verificationParams.minExperience || 
           verificationParams.requiredSkills.length > 0;
  };

  const handleVerifyZKP = async () => {
    if (!zkpProofText.trim()) return;
    setIsVerifyingZKP(true);
    setZkpResult(null);
    try {
      let parsed: any;
      try {
        parsed = JSON.parse(zkpProofText);
      } catch {
        showToast('Invalid JSON — paste the full proof package from the candidate', 'error');
        setIsVerifyingZKP(false);
        return;
      }

      const { proof, publicSignals, proofType } = parsed;
      if (!proof || !publicSignals) {
        showToast('Proof package must contain "proof" and "publicSignals"', 'error');
        setIsVerifyingZKP(false);
        return;
      }

      const isGPA = proofType === 'gpa' || proofType === 'gpa_proof';
      const endpoint = isGPA
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/v1/zkp/gpa/verify`
        : `${process.env.NEXT_PUBLIC_API_URL}/api/v1/zkp/experience/verify`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proof, publicSignals }),
      });

      const json = await res.json();
      setZkpResult({ ...json?.data, proofType: isGPA ? 'gpa' : 'experience' });

      if (json?.data?.isValid && json?.data?.circuitValid) {
        showToast('ZKP verified successfully!', 'success');
      } else {
        showToast('ZKP verification failed', 'error');
      }
    } catch (e: any) {
      showToast(e.message || 'Verification request failed', 'error');
    } finally {
      setIsVerifyingZKP(false);
    }
  };

  const addSkill = () => {
    if (newSkill.trim() && !verificationParams.requiredSkills.includes(newSkill.trim())) {
      setVerificationParams(prev => ({
        ...prev,
        requiredSkills: [...prev.requiredSkills, newSkill.trim()]
      }));
      setNewSkill('');
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setVerificationParams(prev => ({
      ...prev,
      requiredSkills: prev.requiredSkills.filter(skill => skill !== skillToRemove)
    }));
  };

  const getCredentialIcon = (type: string) => {
    switch (type) {
      case 'ACADEMIC':
        return <FaGraduationCap className="text-blue-600" />;
      case 'JOB':
        return <FaBriefcase className="text-green-600" />;
      case 'INTERNSHIP':
        return <FaUserTie className="text-purple-600" />;
      default:
        return <FaShieldAlt className="text-gray-600" />;
    }
  };

  const getStatusIcon = (isValid: boolean, isRevoked: boolean) => {
    if (isRevoked) {
      return <FaExclamationTriangle className="text-red-500" />;
    }
    return isValid ? <FaCheckCircle className="text-green-500" /> : <FaTimes className="text-red-500" />;
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`${label} copied to clipboard`, 'success');
  };

  const handleVerificationSubmit = async () => {
    if (verifyMode === 'zkp') {
      await handleVerifyZKP();
      return;
    }

    await handleVerify();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <TopNav title="AnonHire - Verifier" accent="blue" />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Credential Verification Portal
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Verify the authenticity of academic, job, and internship credentials using blockchain technology and zero-knowledge proofs
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">1,000+</div>
            <div className="text-gray-600">Credentials Verified</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">99.9%</div>
            <div className="text-gray-600">Success Rate</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="text-3xl font-bold text-purple-600 mb-2">24/7</div>
            <div className="text-gray-600">Verification Available</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="text-3xl font-bold text-orange-600 mb-2">&lt;2s</div>
            <div className="text-gray-600">Average Time</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Verification Mode</h3>
              <p className="text-sm text-gray-600">
                Toggle ZKP mode to verify a candidate proof instead of running backend credential checks.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setVerifyMode((prev) => prev === 'zkp' ? 'standard' : 'zkp')}
              aria-pressed={verifyMode === 'zkp'}
              className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors ${
                verifyMode === 'zkp' ? 'bg-green-600' : 'bg-blue-600'
              }`}
            >
              <span className="sr-only">Toggle zero-knowledge proof verification</span>
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                  verifyMode === 'zkp' ? 'translate-x-9' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          <div className="mt-4 flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
            <span className={verifyMode === 'standard' ? 'font-semibold text-blue-700' : 'text-gray-500'}>
              Standard
            </span>
            <span className={verifyMode === 'zkp' ? 'font-semibold text-green-700' : 'text-gray-500'}>
              ZKP
            </span>
          </div>
        </div>

        {verifyMode === 'zkp' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-green-900 mb-1">Zero-Knowledge Proof Verification</h3>
            <p className="text-sm text-green-800">
              The candidate generates a cryptographic proof from their wallet. Verification checks the proof itself,
              not the decrypted credential payload.
            </p>
          </div>
        )}

        {/* Standard Verification (shown only in standard mode) */}
        {verifyMode === 'standard' && (
          <div>

        {/* Parameter Verification Toggle */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Advanced Verification</h3>
              <p className="text-sm text-gray-600">Set specific requirements to verify against credential data</p>
            </div>
            <button
              onClick={() => setShowParams(!showParams)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                showParams 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {showParams ? 'Hide Parameters' : 'Show Parameters'}
            </button>
          </div>
        </div>

        {/* Verification Parameters */}
        {showParams && (
          <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Verification Parameters</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Academic Parameters */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-gray-800 flex items-center">
                  <FaGraduationCap className="mr-2 text-blue-600" />
                  Academic Requirements
                </h4>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Minimum GPA
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={verificationParams.minGpa}
                    onChange={(e) => setVerificationParams(prev => ({ ...prev, minGpa: e.target.value }))}
                    placeholder="e.g., 6.0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Required Degree
                  </label>
                  <input
                    type="text"
                    value={verificationParams.requiredDegree}
                    onChange={(e) => setVerificationParams(prev => ({ ...prev, requiredDegree: e.target.value }))}
                    placeholder="e.g., Bachelor of Technology"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Required Major
                  </label>
                  <input
                    type="text"
                    value={verificationParams.requiredMajor}
                    onChange={(e) => setVerificationParams(prev => ({ ...prev, requiredMajor: e.target.value }))}
                    placeholder="e.g., Computer Science"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Minimum Graduation Year
                  </label>
                  <input
                    type="number"
                    min="2000"
                    max="2030"
                    value={verificationParams.minGraduationYear}
                    onChange={(e) => setVerificationParams(prev => ({ ...prev, minGraduationYear: e.target.value }))}
                    placeholder="e.g., 2020"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Professional Parameters */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-gray-800 flex items-center">
                  <FaBriefcase className="mr-2 text-green-600" />
                  Professional Requirements
                </h4>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Minimum Experience (months)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={verificationParams.minExperience}
                    onChange={(e) => setVerificationParams(prev => ({ ...prev, minExperience: e.target.value }))}
                    placeholder="e.g., 12"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Required Skills
                  </label>
                  <div className="space-y-2">
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={newSkill}
                        onChange={(e) => setNewSkill(e.target.value)}
                        placeholder="Add a skill"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        onKeyPress={(e) => e.key === 'Enter' && addSkill()}
                      />
                      <button
                        onClick={addSkill}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Add
                      </button>
                    </div>
                    {verificationParams.requiredSkills.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {verificationParams.requiredSkills.map((skill, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                          >
                            {skill}
                            <button
                              onClick={() => removeSkill(skill)}
                              className="ml-2 text-blue-600 hover:text-blue-800"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

          </div>
        )}
        {/* Verification Form */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-bold text-gray-900">
              {verifyMode === 'zkp' ? 'Verify Zero-Knowledge Proof' : 'Verify Credential'}
            </h3>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-blue-600 transition-colors"
              >
                <FaHistory />
                <span>History</span>
              </button>
              <button
                onClick={() => {
                  setCredentialHash('');
                  setZkpProofText('');
                  setShowZkpJsonEditor(true);
                  setHashFromQR(false);
                  setZkpFromQR(false);
                }}
                className="px-4 py-2 text-gray-600 hover:text-red-600 transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
          
          <div className="space-y-4">
            {verifyMode === 'standard' ? (
              <div>
                <label htmlFor="credentialHash" className="block text-sm font-medium text-gray-700 mb-2">
                  Credential Hash
                  {hashFromQR && (
                    <span className="ml-2 inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                      <FaQrcode className="text-xs" />
                      <span>Pre-filled from QR</span>
                    </span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="credentialHash"
                    value={credentialHash}
                    onChange={(e) => { setCredentialHash(e.target.value); setHashFromQR(false); }}
                    placeholder="Enter the credential hash to verify (0x...)"
                    className={`w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm ${
                      hashFromQR ? 'border-purple-400 bg-purple-50' : 'border-gray-300'
                    }`}
                  />
                  <button
                    onClick={() => copyToClipboard(credentialHash, 'Hash')}
                    disabled={!credentialHash}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                  >
                    <FaCopy />
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {hashFromQR
                    ? 'Hash loaded from QR code — click Verify to check this credential.'
                    : 'Enter the full credential hash provided by the candidate'}
                </p>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Proof JSON
                  {zkpFromQR && (
                    <span className="ml-2 inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      <FaQrcode className="text-xs" />
                      <span>Pre-filled from QR</span>
                    </span>
                  )}
                </label>
                {zkpFromQR && !showZkpJsonEditor ? (
                  <div className="w-full px-4 py-3 border border-green-300 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-800 font-medium">Proof package loaded from QR/share link.</p>
                    <p className="text-xs text-green-700 mt-1">JSON hidden for a simpler experience.</p>
                    <button
                      type="button"
                      onClick={() => setShowZkpJsonEditor(true)}
                      className="mt-2 text-xs px-3 py-1 rounded-full bg-green-200 text-green-900 hover:bg-green-300"
                    >
                      Show JSON details
                    </button>
                  </div>
                ) : (
                  <>
                    <textarea
                      value={zkpProofText}
                      onChange={(e) => { setZkpProofText(e.target.value); setZkpFromQR(false); setShowZkpJsonEditor(true); }}
                      placeholder={'{\n  "proofType": "gpa",\n  "proof": { ... },\n  "publicSignals": [ ... ],\n  "threshold": 3.5\n}'}
                      rows={8}
                      className={`w-full px-4 py-3 border rounded-lg font-mono text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                        zkpFromQR ? 'border-green-400 bg-green-50' : 'border-gray-300'
                      }`}
                    />
                    {zkpFromQR && (
                      <div className="mt-2">
                        <button
                          type="button"
                          onClick={() => setShowZkpJsonEditor(false)}
                          className="text-xs px-3 py-1 rounded-full bg-gray-200 text-gray-800 hover:bg-gray-300"
                        >
                          Hide JSON details
                        </button>
                      </div>
                    )}
                  </>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  {zkpFromQR
                    ? 'Proof package loaded from QR/share link — click Verify ZKP.'
                    : 'Paste the full proof package generated by the candidate wallet.'}
                </p>
              </div>
            )}
            
            <div className="flex space-x-4">
              <button
                onClick={handleVerificationSubmit}
                disabled={
                  verifyMode === 'zkp'
                    ? !zkpProofText.trim() || isVerifyingZKP
                    : !credentialHash || isVerifying
                }
                className={`flex-1 text-white py-3 px-6 rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center space-x-2 ${
                  verifyMode === 'zkp' ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {verifyMode === 'zkp' ? (
                  isVerifyingZKP ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Verifying proof...</span>
                    </>
                  ) : (
                    <>
                      <FaShieldAlt />
                      <span>Verify ZKP</span>
                    </>
                  )
                ) : isVerifying ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <FaSearch />
                    <span>Verify Credential</span>
                  </>
                )}
              </button>
              <button
                onClick={async () => {
                  try {
                    const text = await navigator.clipboard.readText();
                    const zkpMatch = text.match(/[?&]zkp=([^&\s]+)/);
                    const hashMatch = text.match(/[?&]hash=([^&\s]+)/);

                    if (zkpMatch) {
                      const decodedProofJson = decodeZkpFromParam(decodeURIComponent(zkpMatch[1]));
                      setVerifyMode('zkp');
                      setZkpProofText(decodedProofJson);
                      setZkpFromQR(true);
                      setShowZkpJsonEditor(false);
                      setHashFromQR(false);
                      showToast('ZKP package extracted from share URL', 'success');
                      return;
                    }

                    if (hashMatch) {
                      setVerifyMode('standard');
                      setCredentialHash(decodeURIComponent(hashMatch[1]));
                      setHashFromQR(true);
                      setZkpFromQR(false);
                      showToast('Hash extracted from share URL', 'success');
                      return;
                    }

                    if (text.trim().startsWith('0x')) {
                      setVerifyMode('standard');
                      setCredentialHash(text.trim());
                      setHashFromQR(true);
                      setZkpFromQR(false);
                      showToast('Hash pasted from clipboard', 'success');
                      return;
                    }

                    try {
                      const parsed = JSON.parse(text);
                      if (parsed?.proof && parsed?.publicSignals) {
                        setVerifyMode('zkp');
                        setZkpProofText(JSON.stringify(parsed, null, 2));
                        setZkpFromQR(false);
                        setShowZkpJsonEditor(true);
                        setHashFromQR(false);
                        showToast('ZKP JSON pasted from clipboard', 'success');
                        return;
                      }
                    } catch {}

                    showToast('Clipboard does not contain a valid hash, ZKP JSON, or share URL', 'error');
                  } catch {
                    showToast('Cannot read clipboard. Paste the share link manually.', 'error');
                  }
                }}
                className="px-6 py-3 border border-purple-300 text-purple-700 rounded-lg hover:bg-purple-50 flex items-center space-x-2"
              >
                <FaQrcode />
                <span>Paste QR Link</span>
              </button>
            </div>
          </div>
        </div>

        {/* ZKP Result */}
        {verifyMode === 'zkp' && zkpResult && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-6">ZKP Verification Result</h3>

            {zkpResult.isValid && zkpResult.circuitValid ? (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                      <FaCheckCircle className="text-green-600 text-3xl flex-shrink-0" />
                      <div>
                        <p className="font-bold text-green-800 text-lg">Zero-Knowledge Proof Valid ✅</p>
                        <p className="text-green-700 text-sm mt-1">{zkpResult.message}</p>
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-600">Proof Type:</span>
                        <span className="ml-2 text-gray-900 capitalize">{zkpResult.proofType}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">
                          {zkpResult.proofType === 'gpa' ? 'GPA Threshold:' : 'Experience Threshold:'}
                        </span>
                        <span className="ml-2 font-bold text-green-700">
                          {zkpResult.proofType === 'gpa'
                            ? `≥ ${zkpResult.threshold} GPA`
                            : `≥ ${zkpResult.threshold} months`}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className="font-medium text-gray-600">Privacy:</span>
                        <span className="ml-2 text-gray-700">
                          The actual {zkpResult.proofType === 'gpa' ? 'GPA' : 'experience duration'} was <strong>not revealed</strong> — only that the threshold was met.
                        </span>
                      </div>
                    </div>
                  </div>
                ) : zkpResult.isValid && !zkpResult.circuitValid ? (
                  <div className="flex items-center space-x-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <FaExclamationTriangle className="text-yellow-600 text-3xl flex-shrink-0" />
                    <div>
                      <p className="font-bold text-yellow-800">Threshold Not Met</p>
                      <p className="text-yellow-700 text-sm mt-1">{zkpResult.message}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center space-x-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <FaTimes className="text-red-600 text-3xl flex-shrink-0" />
                    <div>
                      <p className="font-bold text-red-800">Invalid Proof</p>
                      <p className="text-red-700 text-sm mt-1">{zkpResult.message}</p>
                    </div>
                  </div>
                )}
          </div>
        )}

        {/* Verification History */}
        {showHistory && verificationHistory.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Recent Verifications</h3>
            <div className="space-y-3">
              {verificationHistory.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(entry.result.success, entry.result.data?.isRevokedDb || entry.result.data?.isRevokedOnChain)}
                    <div>
                      <p className="font-mono text-sm">{entry.hash.slice(0, 12)}...{entry.hash.slice(-8)}</p>
                      <p className="text-xs text-gray-500">{new Date(entry.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setCredentialHash(entry.hash)}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Re-verify
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Verification Result */}
        {verifyMode === 'standard' && verificationResult && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Verification Result</h3>
              <div className="flex items-center space-x-2">
                {verificationResult.error ? (
                  <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                    Failed
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                    Verified
                  </span>
                )}
              </div>
            </div>
            
            {verificationResult.error ? (
              <div className="flex items-center space-x-3 text-red-600 p-4 bg-red-50 rounded-lg">
                <FaTimes className="text-2xl" />
                <div>
                  <p className="font-semibold">Verification Failed</p>
                  <p className="text-sm">{verificationResult.error}</p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Status Banner */}
                <div className={`p-4 rounded-lg ${(verificationResult?.data?.isRevokedDb || verificationResult?.data?.isRevokedOnChain) ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(verificationResult?.data?.isValid, verificationResult?.data?.isRevokedDb || verificationResult?.data?.isRevokedOnChain)}
                    <div>
                      <p className={`font-semibold ${(verificationResult?.data?.isRevokedDb || verificationResult?.data?.isRevokedOnChain) ? 'text-red-800' : 'text-green-800'}`}>
                        {(verificationResult?.data?.isRevokedDb || verificationResult?.data?.isRevokedOnChain) ? 'Credential Revoked' : 'Credential Verified Successfully'}
                      </p>
                      <p className={`text-sm ${(verificationResult?.data?.isRevokedDb || verificationResult?.data?.isRevokedOnChain) ? 'text-red-600' : 'text-green-600'}`}>
                        {verificationResult?.data?.isValid ? 'This credential is authentic and valid' : 'This credential could not be verified'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Parameter Validation Results */}
                {verificationResult?.data?.parameterValidation && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <FaShieldAlt className="text-blue-600 text-xl" />
                      <h4 className="text-lg font-semibold text-blue-900">Parameter Validation</h4>
                    </div>
                    
                    <div className={`p-3 rounded-lg mb-4 ${verificationResult.data.parameterValidation.isValid ? 'bg-green-100 border border-green-200' : 'bg-red-100 border border-red-200'}`}>
                      <div className="flex items-center space-x-2">
                        {verificationResult.data.parameterValidation.isValid ? (
                          <FaCheckCircle className="text-green-600" />
                        ) : (
                          <FaExclamationTriangle className="text-red-600" />
                        )}
                        <span className={`font-semibold ${verificationResult.data.parameterValidation.isValid ? 'text-green-800' : 'text-red-800'}`}>
                          {verificationResult.data.parameterValidation.summary}
                        </span>
                      </div>
                    </div>

                    {verificationResult.data.parameterValidation.results && (
                      <div className="space-y-3">
                        {verificationResult.data.parameterValidation.results.map((result: any, index: number) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                            <div className="flex items-center space-x-3">
                              {result.isValid ? (
                                <FaCheckCircle className="text-green-600" />
                              ) : (
                                <FaTimes className="text-red-600" />
                              )}
                              <div>
                                <p className="font-medium text-gray-900 capitalize">{result.parameter}</p>
                                <p className="text-sm text-gray-600">{result.message}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium text-gray-900">Required: {Array.isArray(result.required) ? result.required.join(', ') : String(result.required ?? '')}</p>
                              <p className="text-sm text-gray-600">Actual: {Array.isArray(result.actual) ? result.actual.join(', ') : String(result.actual ?? '')}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                
                {/* Credential Details */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <div className="flex items-center space-x-3 mb-4">
                      {getCredentialIcon(verificationResult?.data?.credential?.type)}
                      <h4 className="text-lg font-semibold text-gray-900">Credential Details</h4>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <span className="text-sm font-medium text-gray-600">Type:</span>
                        <span className="ml-2 text-sm text-gray-900">{verificationResult?.data?.credential?.type ?? 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-600">Issued:</span>
                        <span className="ml-2 text-sm text-gray-900">
                          {verificationResult?.data?.credential?.issuedAt ? new Date(verificationResult.data.credential.issuedAt).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-600">Status:</span>
                        <span className={`ml-2 text-sm font-medium ${(verificationResult?.data?.isRevokedDb || verificationResult?.data?.isRevokedOnChain) ? 'text-red-600' : 'text-green-600'}`}>
                          {(verificationResult?.data?.isRevokedDb || verificationResult?.data?.isRevokedOnChain) ? 'Revoked' : 'Active'}
                        </span>
                      </div>
                      {verificationResult?.data?.credential?.publicSummary && (
                        <div>
                          <span className="text-sm font-medium text-gray-600">Summary:</span>
                          <p className="text-sm text-gray-700 mt-1">
                            {typeof verificationResult.data.credential.publicSummary === 'string'
                              ? verificationResult.data.credential.publicSummary
                              : `${verificationResult.data.credential.publicSummary.type ?? ''} credential issued by ${verificationResult.data.credential.publicSummary.issuer ?? ''}`
                            }
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <div className="flex items-center space-x-3 mb-4">
                      <FaShieldAlt className="text-blue-600" />
                      <h4 className="text-lg font-semibold text-gray-900">Blockchain Information</h4>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <span className="text-sm font-medium text-gray-600">Credential Hash:</span>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-xs font-mono text-gray-900 break-all">
                            {verificationResult?.data?.credential?.credentialHash ?? credentialHash}
                          </span>
                          <button
                            onClick={() => copyToClipboard(verificationResult?.data?.credential?.credentialHash ?? credentialHash, 'Credential Hash')}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <FaCopy className="text-xs" />
                          </button>
                        </div>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-600">Transaction Hash:</span>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-xs font-mono text-gray-900 break-all">
                            {verificationResult?.data?.credential?.txHash ?? 'N/A'}
                          </span>
                          {verificationResult?.data?.credential?.txHash && (
                            <>
                              <button
                                onClick={() => copyToClipboard(verificationResult.data.credential.txHash, 'Transaction Hash')}
                                className="text-gray-400 hover:text-gray-600"
                              >
                                <FaCopy className="text-xs" />
                              </button>
                              <a
                                href={`https://sepolia.etherscan.io/tx/${verificationResult.data.credential.txHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800"
                              >
                                <FaExternalLinkAlt className="text-xs" />
                              </a>
                            </>
                          )}
                        </div>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-600">IPFS CID:</span>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-xs font-mono text-gray-900 break-all">
                            {verificationResult?.data?.credential?.ipfsHash ?? 'N/A'}
                          </span>
                          {verificationResult?.data?.credential?.ipfsHash && (
                            <>
                              <button
                                onClick={() => copyToClipboard(verificationResult.data.credential.ipfsHash, 'IPFS CID')}
                                className="text-gray-400 hover:text-gray-600"
                              >
                                <FaCopy className="text-xs" />
                              </button>
                              <a
                                href={`https://ipfs.io/ipfs/${verificationResult.data.credential.ipfsHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800"
                              >
                                <FaExternalLinkAlt className="text-xs" />
                              </a>
                            </>
                          )}
                        </div>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-600">Verified At:</span>
                        <span className="ml-2 text-sm text-gray-900">{new Date().toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 rounded-lg p-6 mt-8">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">How to Verify Credentials</h3>
          {verifyMode === 'zkp' ? (
            <ol className="list-decimal list-inside space-y-2 text-blue-800">
              <li>Ask the candidate to generate a proof package from their wallet</li>
              <li>Toggle ZKP mode on</li>
              <li>Paste the proof JSON in the form above</li>
              <li>Click &quot;Verify ZKP&quot; to validate the proof</li>
            </ol>
          ) : (
            <ol className="list-decimal list-inside space-y-2 text-blue-800">
              <li>Ask the candidate to provide their credential hash</li>
              <li>Enter the hash in the field above</li>
              <li>Click &quot;Verify Credential&quot; to check authenticity</li>
              <li>View the verification result and credential details</li>
            </ol>
          )}
        </div>

      </main>
    </div>
  );
}
