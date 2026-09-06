'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { FaArrowLeft, FaPlus, FaShieldAlt, FaGraduationCap, FaBriefcase, FaUserTie, FaCopy, FaExternalLinkAlt, FaCheckCircle, FaExclamationTriangle, FaClock, FaQrcode, FaDownload } from 'react-icons/fa';
import { QRCodeSVG } from 'qrcode.react';
import Link from 'next/link';
import TopNav from '@/components/TopNav';
import { decryptCredentialData, generateClientProofPackage } from '@/lib/client-zkp';

function resolveIssuerLabel(issuer: any): string {
  if (!issuer) return 'Unknown';

  if (typeof issuer === 'string') {
    return issuer;
  }

  const nestedProfile = issuer.profile || issuer.organization || issuer.metadata || {};
  const candidates = [
    issuer.name,
    issuer.displayName,
    issuer.organizationName,
    issuer.companyName,
    issuer.universityName,
    issuer.institutionName,
    issuer.issuerName,
    issuer.legalName,
    nestedProfile.name,
    nestedProfile.displayName,
    nestedProfile.organizationName,
    nestedProfile.companyName,
    nestedProfile.universityName,
    nestedProfile.institutionName,
    issuer.address,
  ];

  const match = candidates.find((value) => typeof value === 'string' && value.trim().length > 0);
  return match || 'Unknown';
}

function resolveIssuerFromCredentialDetails(type: string, details: any, fallback: string): string {
  if (!details || typeof details !== 'object') return fallback;

  if (type === 'ACADEMIC') {
    return (
      details.institution ||
      details.institutionName ||
      details.university ||
      details.universityName ||
      details.college ||
      details.school ||
      fallback
    );
  }

  if (type === 'JOB' || type === 'INTERNSHIP') {
    return (
      details.company ||
      details.organization ||
      details.organizationName ||
      details.employer ||
      details.department ||
      fallback
    );
  }

  return fallback;
}

export default function WalletPage() {
  const { address, isConnected } = useAccount();
  const [isMounted, setIsMounted] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showZKPModal, setShowZKPModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedCredential, setSelectedCredential] = useState(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const [viewAddress, setViewAddress] = useState<string>('');
  const [loadingList, setLoadingList] = useState(false);
  const [credentials, setCredentials] = useState<any[]>([]);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (isConnected && address && !viewAddress) {
      setViewAddress(address);
    }
  }, [isConnected, address]);

  async function ensureBackendAuth(expectedAddress?: string): Promise<string | null> {
    try {
      const existing = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const existingAddr = typeof window !== 'undefined' ? localStorage.getItem('tokenAddress') : null;
      if (existing && (!expectedAddress || (existingAddr && existingAddr.toLowerCase() === expectedAddress.toLowerCase()))) {
        return existing;
      }

      const eth: any = (window as any).ethereum;
      if (!eth) { setAuthError('MetaMask not found.'); return null; }
      const accounts: string[] = await eth.request({ method: 'eth_requestAccounts' });
      const who = accounts[0];
      if (!who) { setAuthError('No wallet connected.'); return null; }
      if (expectedAddress && who.toLowerCase() !== expectedAddress.toLowerCase()) {
        setAuthError('Please switch MetaMask to the correct wallet for this action.');
        return null;
      }

      const api = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/$/, '');
      const nonceRes = await fetch(`${api}/api/v1/auth/nonce/${who}`);
      const nonceJson = await nonceRes.json();
      const nonce = nonceJson?.nonce || nonceJson?.data?.nonce;
      if (!nonce) { setAuthError('Failed to obtain nonce.'); return null; }

      const provider = new ethers.BrowserProvider(eth);
      const signer = await provider.getSigner();
      const messageToSign = `Sign this message to login. Nonce: ${nonce}`;
      const signature = await signer.signMessage(messageToSign);

      const loginRes = await fetch(`${api}/api/v1/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: who, signature, message: messageToSign })
      });
      const text = await loginRes.text();
      let json: any = null; try { json = JSON.parse(text); } catch {}
      const token = json?.token || json?.data?.token;
      if (!loginRes.ok || !token) { setAuthError(json?.message || `Login failed (${loginRes.status}).`); return null; }
      localStorage.setItem('token', token);
      localStorage.setItem('tokenAddress', who);
      setAuthError(null);
      return token;
    } catch (e: any) {
      setAuthError(e?.message || 'Authentication error');
      return null;
    }
  }

  const fetchCredentials = async (addr: string) => {
    if (!addr) return;
    setLoadingList(true);
    try {
      const api = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/$/, '');
      // Ensure we have backend JWT
      let token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) {
        token = await ensureBackendAuth();
        if (!token) { setLoadingList(false); return; }
      }
      // Correct endpoint requires auth
      const res = await fetch(`${api}/api/v1/credentials/subject/${addr}` , {
        headers: { Authorization: `Bearer ${token}` }
      });
      const text = await res.text();
      let json: any = null; try { json = JSON.parse(text); } catch {}
      const list = json?.data ?? [];
      // Normalize a few fields for UI
      const normalized = (list || []).map((c: any) => ({
        id: c.id || c.credentialHash || Math.random().toString(36).slice(2),
        dbId: c.id || null,
        type: c.credentialType || c.type || 'UNKNOWN',
        issuer: resolveIssuerLabel(c.issuer),
        issuedAt: c.issuedAt ? new Date(c.issuedAt).toISOString().split('T')[0] : '',
        status: c.isRevoked ? 'revoked' : 'active',
        details: {},
        credentialHash: c.credentialHash,
        encryptedData: c.encryptedData,
        ipfsHash: c.ipfsHash,
        txHash: c.txHash,
      }));
      setCredentials(normalized);
    } catch (e) {
      setCredentials([]);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (viewAddress) fetchCredentials(viewAddress);
  }, [viewAddress]);

  const handleViewCredential = (credential: any) => {
    // mark if the decrypt call should be allowed (owner viewing own wallet)
    const canDecrypt = viewAddress && address && viewAddress.toLowerCase() === address.toLowerCase();
    setSelectedCredential({ ...credential, canDecrypt });
    setShowViewModal(true);
  };

  const handleShareCredential = (credential: any) => {
    setSelectedCredential(credential);
    setShowShareModal(true);
  };

  // Prevent hydration mismatch by not rendering wallet-dependent content until mounted
  if (!isMounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-blue-600 hover:text-blue-700">
                <FaArrowLeft className="text-2xl" />
              </Link>
              <div className="flex items-center space-x-2">
                <FaShieldAlt className="text-blue-600 text-3xl" />
                <h1 className="text-2xl font-bold text-gray-900">My Wallet</h1>
              </div>
            </div>
            <ConnectButton />
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <div className="animate-pulse">
              <div className="h-16 w-16 bg-gray-300 rounded-full mx-auto mb-4"></div>
              <div className="h-8 w-64 bg-gray-300 rounded mx-auto mb-4"></div>
              <div className="h-4 w-96 bg-gray-300 rounded mx-auto"></div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <TopNav title="My Wallet" accent="blue" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!isConnected ? (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <FaShieldAlt className="text-blue-600 text-6xl mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Connect Your Wallet
            </h2>
            <p className="text-gray-600 mb-6">
              Please connect your wallet to view and manage your credentials
            </p>
            <ConnectButton />
          </div>
        ) : (
          <>
            {/* Wallet Info */}
            <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Wallet Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Address</p>
                  <p className="text-lg font-mono">{address}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Credentials</p>
                  <p className="text-3xl font-bold text-blue-600">{credentials.length}</p>
                </div>
              </div>
              {authError && (
                <div className="mt-3 bg-red-50 border border-red-200 text-red-700 p-3 rounded">{authError}</div>
              )}
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-sm text-gray-600 mb-1">View credentials for address</label>
                  <input
                    type="text"
                    value={viewAddress}
                    onChange={(e) => setViewAddress(e.target.value)}
                    placeholder="0x..."
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={() => fetchCredentials(viewAddress)}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
                    disabled={!viewAddress || loadingList}
                  >
                    {loadingList ? 'Loading...' : 'Refresh'}
                  </button>
                </div>
              </div>
            </div>

            {/* Credentials List */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-900">My Credentials</h3>
              </div>

              {loadingList ? (
                <p className="text-center text-gray-600 py-8">Loading credentials...</p>
              ) : credentials.length === 0 ? (
                <div className="text-center text-gray-600 py-12">
                  <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">🎓</div>
                  <p className="mb-1">No credentials yet.</p>
                  <p className="text-sm">Ask your issuer to create one, or visit the issuer pages.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {credentials.map((cred) => (
                    <CredentialCard 
                      key={cred.id} 
                      credential={cred} 
                      onView={handleViewCredential}
                      onShare={handleShareCredential}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
              <ActionCard
                title="Generate ZKP"
                description="Create a zero-knowledge proof for verification"
                color="bg-green-600"
                onClick={() => setShowZKPModal(true)}
              />
              <ActionCard
                title="Share Credential"
                description="Share your credential with a verifier"
                color="bg-purple-600"
                onClick={() => setShowShareModal(true)}
              />
              <ActionCard
                title="View History"
                description="See your verification history"
                color="bg-orange-600"
                onClick={() => setShowHistoryModal(true)}
              />
            </div>
          </>
        )}
      </main>

      {/* Modals */}
      {showAddModal && (
        <AddCredentialModal 
          onClose={() => setShowAddModal(false)}
          onAdd={(credential: UICredential) => {
            setCredentials([...credentials, credential]);
            setShowAddModal(false);
          }}
        />
      )}

      {showZKPModal && (
        <ZKPModal 
          onClose={() => setShowZKPModal(false)}
          credentials={credentials}
        />
      )}

      {showShareModal && (
        <ShareModal 
          onClose={() => {
            setShowShareModal(false);
            setSelectedCredential(null);
          }}
          credentials={credentials}
          preSelectedCredential={selectedCredential}
        />
      )}

      {showHistoryModal && (
        <HistoryModal 
          onClose={() => setShowHistoryModal(false)}
        />
      )}

      {showViewModal && selectedCredential && (
        <ViewCredentialModal 
          credential={selectedCredential}
          onClose={() => {
            setShowViewModal(false);
            setSelectedCredential(null);
          }}
        />
      )}
    </div>
  );
}

type UICredential = {
  id: string;
  type: string;
  issuer: string;
  issuedAt: string;
  status: string;
  details?: any;
  credentialHash?: string;
  encryptedData?: string;
  ipfsHash?: string;
  txHash?: string;
};

function CredentialCard({ credential, onView, onShare }: { credential: UICredential; onView: (c: UICredential)=>void; onShare: (c: UICredential)=>void; }) {
  const [cardTitle, setCardTitle] = useState<string>(credential.type);

  const toTitleCase = (value: string) =>
    value
      .replace(/[_-]+/g, ' ')
      .split(' ')
      .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
      .join(' ')
      .trim();

  const buildCardTitle = (type: string, details: any) => {
    if (type === 'JOB') {
      const role = details?.position || details?.role || details?.title || 'Work';
      const org = details?.company || details?.organization || details?.employer || 'Unknown organization';
      return `${role} experience at ${org}`;
    }

    if (type === 'ACADEMIC') {
      const degree = details?.degree || details?.program || details?.major || 'Academic credential';
      const institution =
        details?.institution ||
        details?.university ||
        details?.college ||
        details?.school ||
        'Unknown institution';
      return `${degree} at ${institution}`;
    }

    if (type === 'INTERNSHIP') {
      const role = details?.position || details?.role || 'Internship';
      const org = details?.company || details?.organization || details?.employer || 'Unknown organization';
      return `${role} internship at ${org}`;
    }

    return toTitleCase(type || 'Credential');
  };

  useEffect(() => {
    let cancelled = false;

    const loadTitle = async () => {
      try {
        let details = credential.details;
        if ((!details || Object.keys(details).length === 0) && credential.encryptedData) {
          const decrypted = await decryptCredentialData(credential.encryptedData);
          details = decrypted?.credentialSubject || decrypted || {};
        }

        const computed = buildCardTitle(credential.type, details || {});
        if (!cancelled) setCardTitle(computed);
      } catch {
        if (!cancelled) setCardTitle(toTitleCase(credential.type || 'Credential'));
      }
    };

    loadTitle();
    return () => {
      cancelled = true;
    };
  }, [credential.type, credential.encryptedData, credential.details]);

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

  const getCredentialColor = (type: string) => {
    switch (type) {
      case 'ACADEMIC':
        return 'from-blue-500 to-blue-700';
      case 'JOB':
        return 'from-green-500 to-green-700';
      case 'INTERNSHIP':
        return 'from-purple-500 to-purple-700';
      default:
        return 'from-gray-500 to-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return <FaCheckCircle className="text-green-400" />;
      case 'expired':
        return <FaExclamationTriangle className="text-yellow-400" />;
      case 'revoked':
        return <FaExclamationTriangle className="text-red-400" />;
      default:
        return <FaClock className="text-gray-400" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  };

  return (
    <div className={`bg-gradient-to-br ${getCredentialColor(credential.type)} text-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all hover:scale-105`}>
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center space-x-2">
          <div className="bg-white/20 p-2 rounded-lg">
            {getCredentialIcon(credential.type)}
          </div>
          <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-medium">
            {credential.type}
          </span>
        </div>
        <div className="flex items-center space-x-1">
          {getStatusIcon(credential.status)}
          <span className="text-xs font-medium">{credential.status}</span>
        </div>
      </div>

      {/* Content */}
      <div className="mb-4">
        <h4 className="text-lg font-bold mb-1 truncate">{cardTitle}</h4>
        <p className="text-xs text-white/75 truncate">Issued by {credential.issuer}</p>
        <p className="text-sm text-white/80">Issued: {formatDate(credential.issuedAt)}</p>
        
        {/* Credential Hash */}
        {credential.credentialHash && (
          <div className="mt-3 p-2 bg-white/10 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/70">Credential Hash:</span>
              <button
                onClick={() => copyToClipboard(credential.credentialHash ?? '', 'Credential Hash')}
                className="text-white/70 hover:text-white transition-colors"
              >
                <FaCopy className="text-xs" />
              </button>
            </div>
            <p className="text-xs font-mono text-white/90 break-all mt-1">
              {credential.credentialHash.slice(0, 12)}...{credential.credentialHash.slice(-8)}
            </p>
          </div>
        )}

        {/* Transaction Hash */}
        {credential.txHash && (
          <div className="mt-2 p-2 bg-white/10 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/70">Transaction:</span>
              <button
                onClick={() => copyToClipboard(credential.txHash ?? '', 'Transaction Hash')}
                className="text-white/70 hover:text-white transition-colors"
              >
                <FaCopy className="text-xs" />
              </button>
            </div>
            <p className="text-xs font-mono text-white/90 break-all mt-1">
              {credential.txHash.slice(0, 12)}...{credential.txHash.slice(-8)}
            </p>
          </div>
        )}

        {/* IPFS Hash */}
        {credential.ipfsHash && (
          <div className="mt-2 p-2 bg-white/10 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/70">IPFS CID:</span>
              <button
                onClick={() => copyToClipboard(credential.ipfsHash ?? '', 'IPFS CID')}
                className="text-white/70 hover:text-white transition-colors"
              >
                <FaCopy className="text-xs" />
              </button>
            </div>
            <p className="text-xs font-mono text-white/90 break-all mt-1">
              {credential.ipfsHash.slice(0, 12)}...{credential.ipfsHash.slice(-8)}
            </p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex space-x-2">
        <button 
          onClick={() => onView(credential)}
          className="flex-1 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-2"
        >
          <span>View Details</span>
        </button>
        <button 
          onClick={() => onShare(credential)}
          className="flex-1 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-2"
        >
          <FaExternalLinkAlt className="text-xs" />
          <span>Share</span>
        </button>
      </div>
    </div>
  );
}

function ActionCard({ title, description, color, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={`${color} text-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-all hover:scale-105 text-left`}
    >
      <h4 className="text-lg font-bold mb-2">{title}</h4>
      <p className="text-sm text-white/90">{description}</p>
    </button>
  );
}

// Add Credential Modal
function AddCredentialModal({ onClose, onAdd }: any) {
  const [formData, setFormData] = useState({
    type: 'ACADEMIC',
    issuer: '',
    issuedAt: new Date().toISOString().split('T')[0],
  });

  const handleSubmit = (e: any) => {
    e.preventDefault();
    const newCredential = {
      id: Date.now().toString(),
      ...formData,
      status: 'active',
    };
    onAdd(newCredential);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-xl font-bold mb-4">Add New Credential</h3>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Type</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({...formData, type: e.target.value})}
              className="w-full p-2 border rounded-lg"
            >
              <option value="ACADEMIC">Academic</option>
              <option value="JOB">Job</option>
              <option value="INTERNSHIP">Internship</option>
            </select>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Issuer</label>
            <input
              type="text"
              value={formData.issuer}
              onChange={(e) => setFormData({...formData, issuer: e.target.value})}
              className="w-full p-2 border rounded-lg"
              placeholder="e.g., MIT, Google Inc."
              required
            />
          </div>
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Issue Date</label>
            <input
              type="date"
              value={formData.issuedAt}
              onChange={(e) => setFormData({...formData, issuedAt: e.target.value})}
              className="w-full p-2 border rounded-lg"
            />
          </div>
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add Credential
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ZKP Modal
function ZKPModal({ onClose, credentials }: any) {
  const [selectedCredentialId, setSelectedCredentialId] = useState('');
  const [proofType, setProofType] = useState('gpa_proof');
  const [threshold, setThreshold] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedProof, setGeneratedProof] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [issuerLabels, setIssuerLabels] = useState<Record<string, string>>({});

  const isGPA = proofType === 'gpa_proof';

  // Filter credentials by compatible type
  const eligibleCredentials = credentials.filter((c: any) =>
    isGPA ? c.type === 'ACADEMIC' : (c.type === 'JOB' || c.type === 'INTERNSHIP')
  );

  useEffect(() => {
    let cancelled = false;

    const loadIssuerLabels = async () => {
      const nextLabels: Record<string, string> = {};

      await Promise.all(
        eligibleCredentials.map(async (credential: any) => {
          const key = String(credential.dbId || credential.id);
          nextLabels[key] = credential.issuer;

          if (!credential.encryptedData) return;

          try {
            const decrypted = await decryptCredentialData(credential.encryptedData);
            const details = decrypted?.credentialSubject || decrypted || {};
            nextLabels[key] = resolveIssuerFromCredentialDetails(credential.type, details, credential.issuer);
          } catch {
            nextLabels[key] = credential.issuer;
          }
        })
      );

      if (!cancelled) {
        setIssuerLabels(nextLabels);
      }
    };

    loadIssuerLabels();
    return () => {
      cancelled = true;
    };
  }, [credentials, proofType]);

  const getCredentialIssuerLabel = (credential: any) =>
    issuerLabels[String(credential.dbId || credential.id)] || credential.issuer;

  const generateZKP = async () => {
    if (!selectedCredentialId || !threshold) return;
    setIsGenerating(true);
    setError(null);
    setGeneratedProof(null);

    try {
      const api = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/$/, '');
      const selected = eligibleCredentials.find((c: any) => String(c.dbId || c.id) === String(selectedCredentialId));
      if (!selected?.encryptedData) {
        throw new Error('Credential encryption payload not available in wallet');
      }
      if (!selected?.credentialHash) {
        throw new Error('Credential hash is missing');
      }

      const proofPackage = await generateClientProofPackage({
        proofType: isGPA ? 'gpa' : 'experience',
        threshold: Number(threshold),
        credentialHash: selected.credentialHash,
        encryptedData: selected.encryptedData,
        apiBaseUrl: api,
      });

      setGeneratedProof(proofPackage);
    } catch (e: any) {
      setError(e.message || 'Failed to generate proof');
    } finally {
      setIsGenerating(false);
    }
  };

  const proofPackage = generatedProof
    ? JSON.stringify(generatedProof, null, 2)
    : '';

  const copyProof = () => {
    navigator.clipboard.writeText(proofPackage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const encodeProofForUrl = (payload: any) => {
    const json = JSON.stringify(payload);
    return btoa(unescape(encodeURIComponent(json)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');
  };

  const zkpShareUrl = generatedProof && typeof window !== 'undefined'
    ? `${window.location.origin}/verifier?zkp=${encodeURIComponent(encodeProofForUrl(generatedProof))}`
    : '';

  const copyShareLink = () => {
    if (!zkpShareUrl) return;
    navigator.clipboard.writeText(zkpShareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const downloadZkpQR = () => {
    const svg = document.getElementById('zkp-share-qr-svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0);
      const link = document.createElement('a');
      link.download = `zkp-proof-qr-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    img.src = `data:image/svg+xml;base64,${btoa(svgData)}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Generate Zero-Knowledge Proof</h3>
            <p className="text-sm text-gray-500 mt-1">Your actual credential data is never disclosed</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        <div className="p-6 space-y-5">
          {/* Proof Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Proof Type</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'gpa_proof', label: '🎓 GPA Proof', sub: 'Academic credential' },
                { value: 'experience_proof', label: '💼 Experience Proof', sub: 'Job / Internship' },
              ].map(({ value, label, sub }) => (
                <button
                  key={value}
                  onClick={() => { setProofType(value); setSelectedCredentialId(''); setThreshold(''); setGeneratedProof(null); setError(null); }}
                  className={`p-3 rounded-lg border-2 text-left transition-colors ${
                    proofType === value ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium text-gray-900">{label}</div>
                  <div className="text-xs text-gray-500">{sub}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Credential selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Credential</label>
            {eligibleCredentials.length === 0 ? (
              <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
                No {isGPA ? 'academic' : 'job/internship'} credentials found in your wallet.
              </p>
            ) : (
              <select
                value={selectedCredentialId}
                onChange={(e) => setSelectedCredentialId(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              >
                <option value="">Choose a credential…</option>
                {eligibleCredentials.map((cred: any) => (
                  <option key={cred.dbId || cred.id} value={cred.dbId || cred.id}>
                    {cred.type} — {getCredentialIssuerLabel(cred)} ({cred.issuedAt})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Threshold input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {isGPA ? 'Minimum GPA Threshold (0–10)' : 'Required Experience (months)'}
            </label>
            <input
              type="number"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              min={0}
              max={isGPA ? 10 : undefined}
              step={isGPA ? 0.1 : 1}
              placeholder={isGPA ? 'e.g. 7.0' : 'e.g. 12'}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              {isGPA
                ? 'The proof will confirm your GPA meets this threshold — the actual value stays hidden.'
                : 'The proof will confirm your experience meets this requirement — the actual months stay hidden.'}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
          )}

          {/* Generated proof output */}
          {generatedProof && (
            <div className="space-y-3">
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-green-600 font-semibold">✅ Proof generated successfully!</span>
                </div>
                <p className="text-xs text-green-700">
                  {isGPA
                    ? `This proof cryptographically confirms GPA ≥ ${threshold} without revealing your actual GPA.`
                    : `This proof cryptographically confirms experience ≥ ${threshold} months without revealing the actual value.`
                  }
                </p>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-sm font-medium text-gray-700">Proof Package (share with verifier)</label>
                  <button
                    onClick={copyProof}
                    className={`text-xs px-3 py-1 rounded-full transition-colors ${
                      copied ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {copied ? '✓ Copied' : 'Copy JSON'}
                  </button>
                </div>
                <textarea
                  readOnly
                  value={proofPackage}
                  rows={6}
                  className="w-full p-2 border border-gray-200 rounded-lg text-xs font-mono bg-gray-50 resize-none"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Send this JSON to the verifier. They paste it on the verifier page under &quot;ZKP Verification&quot;.
                </p>
              </div>

              {zkpShareUrl && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">ZKP Share Link / QR</label>
                    <button
                      onClick={copyShareLink}
                      className={`text-xs px-3 py-1 rounded-full transition-colors ${
                        copiedLink ? 'bg-green-600 text-white' : 'bg-purple-200 text-purple-800 hover:bg-purple-300'
                      }`}
                    >
                      {copiedLink ? '✓ Link Copied' : 'Copy Link'}
                    </button>
                  </div>

                  <div className="flex">
                    <input
                      type="text"
                      value={zkpShareUrl}
                      readOnly
                      className="flex-1 p-2 border border-gray-300 rounded-l-lg bg-gray-50 text-xs font-mono truncate"
                    />
                    <button
                      onClick={downloadZkpQR}
                      className="px-3 py-2 border border-l-0 border-gray-300 rounded-r-lg text-purple-700 hover:bg-purple-50"
                    >
                      <FaDownload />
                    </button>
                  </div>

                  <div className="flex flex-col items-center space-y-2">
                    <p className="text-xs text-gray-500 text-center">Scan to open verifier with this ZKP package pre-filled</p>
                    <div className="p-3 bg-white border-2 border-purple-200 rounded-xl shadow-inner">
                      <QRCodeSVG
                        id="zkp-share-qr-svg"
                        value={zkpShareUrl}
                        size={170}
                        bgColor="#ffffff"
                        fgColor="#14532d"
                        level="M"
                        includeMargin={false}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex space-x-3 px-6 pb-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
          >
            Close
          </button>
          <button
            onClick={generateZKP}
            disabled={!selectedCredentialId || !threshold || isGenerating}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <span className="flex items-center justify-center space-x-2">
                <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
                <span>Generating…</span>
              </span>
            ) : 'Generate ZKP'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Share Modal
function ShareModal({ onClose, credentials, preSelectedCredential }: any) {
  const initialId = preSelectedCredential?.id ?? '';
  const [selectedId, setSelectedId] = useState<string>(initialId);
  const [copied, setCopied] = useState(false);

  const cred = credentials.find((c: any) => c.id === selectedId) ?? preSelectedCredential ?? null;
  const hash = cred?.credentialHash ?? null;

  const shareUrl = hash
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/verifier?hash=${encodeURIComponent(hash)}`
    : '';

  const copyLink = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadQR = () => {
    const svg = document.getElementById('share-qr-svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0);
      const link = document.createElement('a');
      link.download = `credential-qr-${hash?.slice(0, 8) ?? 'share'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    img.src = `data:image/svg+xml;base64,${btoa(svgData)}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <div className="flex items-center space-x-3">
            <div className="bg-purple-100 p-2 rounded-lg">
              <FaQrcode className="text-purple-600 text-xl" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Share Credential</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        <div className="p-6 space-y-5">
          {/* Credential selector (only if not pre-selected or multiple available) */}
          {!preSelectedCredential && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Credential</label>
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">Choose a credential…</option>
                {credentials.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.type} — {c.issuer} ({c.issuedAt})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Pre-selected credential info */}
          {cred && (
            <div className="bg-gray-50 rounded-lg p-3 flex items-center space-x-3">
              <div className="text-2xl">{cred.type === 'ACADEMIC' ? '🎓' : cred.type === 'JOB' ? '💼' : '📋'}</div>
              <div>
                <p className="font-semibold text-gray-900">{cred.type} Credential</p>
                <p className="text-sm text-gray-500">{(cred.issuer || 'Issuer')} · {cred.issuedAt}</p>
              </div>
            </div>
          )}

          {/* QR Code */}
          {shareUrl ? (
            <div className="flex flex-col items-center space-y-3">
              <p className="text-sm text-gray-600 text-center">Scan this QR code to verify the credential</p>
              <div className="p-4 bg-white border-2 border-purple-200 rounded-xl shadow-inner">
                <QRCodeSVG
                  id="share-qr-svg"
                  value={shareUrl}
                  size={200}
                  bgColor="#ffffff"
                  fgColor="#1e1b4b"
                  level="H"
                  includeMargin={false}
                />
              </div>
              <button
                onClick={downloadQR}
                className="flex items-center space-x-2 text-sm text-purple-600 hover:text-purple-800 transition-colors"
              >
                <FaDownload className="text-xs" />
                <span>Download QR</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center py-8 text-gray-400">
              <FaQrcode className="text-5xl mb-3" />
              <p className="text-sm">Select a credential to generate a QR code</p>
            </div>
          )}

          {/* Share link */}
          {shareUrl && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Share Link</label>
              <div className="flex">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="flex-1 p-2 border border-gray-300 rounded-l-lg bg-gray-50 text-sm font-mono truncate"
                />
                <button
                  onClick={copyLink}
                  className={`px-4 py-2 rounded-r-lg text-sm font-medium transition-colors ${
                    copied ? 'bg-green-600 text-white' : 'bg-purple-600 text-white hover:bg-purple-700'
                  }`}
                >
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">The verifier will see the credential hash pre-filled.</p>
            </div>
          )}
        </div>

        <div className="px-6 pb-6">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// History Modal
function HistoryModal({ onClose }: any) {
  const history = [
    { id: 1, action: 'Credential Verified', timestamp: '2024-01-15 10:30', status: 'Success' },
    { id: 2, action: 'ZKP Generated', timestamp: '2024-01-14 15:45', status: 'Success' },
    { id: 3, action: 'Credential Shared', timestamp: '2024-01-13 09:20', status: 'Success' },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
        <h3 className="text-xl font-bold mb-4">Verification History</h3>
        
        <div className="space-y-3">
          {history.map((item) => (
            <div key={item.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium">{item.action}</p>
                <p className="text-sm text-gray-600">{item.timestamp}</p>
              </div>
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                {item.status}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-6">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// View Credential Modal
function ViewCredentialModal({ credential, onClose }: any) {
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [decrypted, setDecrypted] = useState<any>(null);

  const formatHumanDate = (value: any) => {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const deriveExperienceMonths = (details: any) => {
    const direct = Number(details?.experienceMonths);
    if (Number.isFinite(direct) && direct > 0) return Math.floor(direct);

    const start = details?.startDate ? new Date(details.startDate) : null;
    const end = details?.present ? new Date() : (details?.endDate ? new Date(details.endDate) : null);
    if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
      return Number.isFinite(direct) ? Math.floor(Math.max(0, direct)) : null;
    }

    const monthDiff = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    let months = Math.max(0, monthDiff + (end.getDate() >= start.getDate() ? 0 : -1));
    if (end > start && months === 0) months = 1;
    return months;
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      // Only attempt decrypt for owner and when ciphertext is available
      if (!credential?.canDecrypt) return;
      if (!credential?.encryptedData) return;
      setLoadingDetails(true);
      setDetailsError(null);
      try {
        const full = await decryptCredentialData(credential.encryptedData);
        if (!cancelled) {
          setDecrypted({
            details: full?.credentialSubject || full,
            full,
          });
        }
      } catch (e: any) {
        if (!cancelled) setDetailsError(e?.message || 'Failed to decrypt details in browser');
      } finally {
        if (!cancelled) setLoadingDetails(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [credential?.id, credential?.encryptedData, credential?.canDecrypt]);

  const effectiveDetails = decrypted?.details || credential.details;
  const renderCredentialDetails = () => {
    if (!effectiveDetails) return null;

    if (credential.type === 'ACADEMIC') {
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Degree</label>
            <p className="text-gray-900">{effectiveDetails.degree}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Major</label>
            <p className="text-gray-900">{effectiveDetails.major}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">GPA</label>
            <p className="text-gray-900">{effectiveDetails.gpa}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Graduation Year</label>
            <p className="text-gray-900">{effectiveDetails.graduationYear}</p>
          </div>
        </div>
      );
    } else if (credential.type === 'JOB') {
      const derivedMonths = deriveExperienceMonths(effectiveDetails);
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
            <p className="text-gray-900">{effectiveDetails.position}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
            <p className="text-gray-900">{effectiveDetails.company || effectiveDetails.department || '-'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <p className="text-gray-900">{formatHumanDate(effectiveDetails.startDate)}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <p className="text-gray-900">{effectiveDetails.present ? 'Present' : formatHumanDate(effectiveDetails.endDate)}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ongoing</label>
            <p className="text-gray-900">{effectiveDetails.present ? 'Yes' : 'No'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Experience (months)</label>
            <p className="text-gray-900">{derivedMonths ?? '-'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <p className="text-gray-900">{effectiveDetails.description || effectiveDetails.responsibilities || '-'}</p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold text-gray-900">Credential Details</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>
        
        <div className="space-y-6">
          {/* Basic Info */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="text-lg font-semibold mb-3 text-gray-900">Basic Information</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <p className="text-gray-900">{credential.type}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Issuer</label>
                <p className="text-gray-900">{credential.issuer}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Issued Date</label>
                <p className="text-gray-900">{credential.issuedAt}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                  {credential.status}
                </span>
              </div>
              {credential.credentialHash && (
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Credential Hash</label>
                  <p className="text-gray-900 break-all">{credential.credentialHash}</p>
                </div>
              )}
              {credential.txHash && (
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Transaction Hash</label>
                  <p className="text-gray-900 break-all">{credential.txHash}</p>
                </div>
              )}
              {credential.ipfsHash && (
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">IPFS CID</label>
                  <p className="text-gray-900 break-all">{credential.ipfsHash}</p>
                </div>
              )}
            </div>
          </div>

          {/* Detailed Information */}
          {(effectiveDetails || loadingDetails || detailsError || !credential.canDecrypt) && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-lg font-semibold mb-3 text-gray-900">Detailed Information</h4>
              {!credential.canDecrypt && (
                <p className="text-sm text-gray-600">You can only view details when viewing your own wallet.</p>
              )}
              {credential.canDecrypt && loadingDetails && (
                <p className="text-sm text-gray-600">Loading details...</p>
              )}
              {credential.canDecrypt && detailsError && (
                <div className="text-sm text-red-600 space-y-2">
                  <p>{detailsError}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setDetailsError(null);
                      setLoadingDetails(true);
                      if (!credential?.encryptedData) {
                        setDetailsError('Encrypted payload unavailable');
                        setLoadingDetails(false);
                        return;
                      }
                      (async () => {
                        try {
                          const full = await decryptCredentialData(credential.encryptedData);
                          setDecrypted({ details: full?.credentialSubject || full, full });
                          setDetailsError(null);
                        } catch (e: any) {
                          setDetailsError(e?.message || 'Failed to decrypt details in browser');
                        } finally {
                          setLoadingDetails(false);
                        }
                      })();
                    }}
                    className="px-3 py-1 border rounded text-gray-700 hover:bg-gray-50"
                  >
                    Retry decrypt
                  </button>
                </div>
              )}
              {credential.canDecrypt && !loadingDetails && !detailsError && renderCredentialDetails()}
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
            >
              Close
            </button>
            <button
              onClick={() => {
                // Copy credential details to clipboard
                const details = JSON.stringify(credential, null, 2);
                navigator.clipboard.writeText(details);
                alert('Credential details copied to clipboard!');
              }}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Copy Details
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
