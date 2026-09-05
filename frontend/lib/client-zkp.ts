import * as snarkjs from 'snarkjs';
import { buildPoseidon } from 'circomlibjs';

type DecryptedCredential = {
  credentialSubject?: Record<string, any>;
  [k: string]: any;
};

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.substr(i * 2, 2), 16);
  }
  return bytes;
}

async function deriveAesKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder().encode(secret);
  const hash = await crypto.subtle.digest('SHA-256', enc);
  return crypto.subtle.importKey('raw', hash, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function encryptCredentialData(payload: Record<string, any>): Promise<string> {
  const secret = process.env.NEXT_PUBLIC_AES_SECRET_KEY;
  if (!secret) {
    throw new Error('Missing NEXT_PUBLIC_AES_SECRET_KEY in frontend environment');
  }

  const key = await deriveAesKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(16));
  const plaintext = new TextEncoder().encode(JSON.stringify(payload));

  // WebCrypto AES-GCM output is ciphertext || authTag(16 bytes)
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv, tagLength: 128 }, key, plaintext)
  );

  const tagLength = 16;
  const cipherBytes = encrypted.slice(0, encrypted.length - tagLength);
  const tagBytes = encrypted.slice(encrypted.length - tagLength);

  return JSON.stringify({
    iv: bytesToHex(iv),
    authTag: bytesToHex(tagBytes),
    data: bytesToHex(cipherBytes),
  });
}

export async function decryptCredentialData(encryptedData: string): Promise<DecryptedCredential> {
  const secret = process.env.NEXT_PUBLIC_AES_SECRET_KEY;
  if (!secret) {
    throw new Error('Missing NEXT_PUBLIC_AES_SECRET_KEY in frontend environment');
  }

  const payload = JSON.parse(encryptedData || '{}');
  const { iv, authTag, data } = payload;
  if (!iv || !authTag || !data) {
    throw new Error('Invalid encrypted credential payload');
  }

  const key = await deriveAesKey(secret);
  const ivBytes = hexToBytes(iv);
  const cipherBytes = hexToBytes(data);
  const tagBytes = hexToBytes(authTag);
  const combined = new Uint8Array(cipherBytes.length + tagBytes.length);
  combined.set(cipherBytes, 0);
  combined.set(tagBytes, cipherBytes.length);

  const plainBuf = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBytes as any, tagLength: 128 },
    key,
    combined as any
  );

  const plainText = new TextDecoder().decode(plainBuf);
  return JSON.parse(plainText);
}

function randomSaltBigInt(): bigint {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return BigInt(`0x${hex}`);
}

function deriveExperienceMonths(subject: Record<string, any>): number {
  const direct = Number(subject?.experienceMonths);
  if (Number.isFinite(direct) && direct > 0) {
    return Math.floor(direct);
  }

  const start = subject?.startDate ? new Date(subject.startDate) : null;
  const end = subject?.present ? new Date() : (subject?.endDate ? new Date(subject.endDate) : null);
  if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    if (Number.isFinite(direct) && direct >= 0) return Math.floor(direct);
    throw new Error('Credential does not contain valid experience information');
  }

  const monthDiff = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  let months = Math.max(0, monthDiff + (end.getDate() >= start.getDate() ? 0 : -1));
  if (end > start && months === 0) months = 1;
  return months;
}

export async function generateClientProofPackage(input: {
  proofType: 'gpa' | 'experience';
  threshold: number;
  credentialHash: string;
  encryptedData: string;
  apiBaseUrl: string;
}): Promise<any> {
  const decrypted = await decryptCredentialData(input.encryptedData);
  const subject = decrypted?.credentialSubject || decrypted || {};

  const salt = randomSaltBigInt();
  const credHashBigInt = BigInt(input.credentialHash);
  const poseidon = await buildPoseidon();

  if (input.proofType === 'gpa') {
    const gpa = Number(subject?.gpa);
    if (!Number.isFinite(gpa)) {
      throw new Error('Credential does not contain a valid GPA');
    }

    const scaledGPA = Math.floor(gpa * 100);
    const scaledThreshold = Math.floor(Number(input.threshold) * 100);
    const expectedCommitment = poseidon.F.toString(
      poseidon([BigInt(scaledGPA), salt, credHashBigInt])
    );

    const circuitInput = {
      gpa: scaledGPA,
      salt: salt.toString(),
      credentialHash: credHashBigInt.toString(),
      threshold: scaledThreshold,
      expectedCommitment,
    };

    const wasmUrl = `${input.apiBaseUrl}/api/v1/zkp-artifacts/gpa_proof/gpa_proof_js/gpa_proof.wasm`;
    const zkeyUrl = `${input.apiBaseUrl}/api/v1/zkp-artifacts/gpa_proof/gpa_proof_final.zkey`;
    const { proof, publicSignals } = await (snarkjs as any).groth16.fullProve(circuitInput, wasmUrl, zkeyUrl);

    return {
      proofType: 'gpa',
      proof,
      publicSignals,
      threshold: Number(input.threshold),
      credentialHash: input.credentialHash,
    };
  }

  const experienceMonths = deriveExperienceMonths(subject);

  const requiredMonths = Math.floor(Number(input.threshold));
  const expectedCommitment = poseidon.F.toString(
    poseidon([BigInt(experienceMonths), salt, credHashBigInt])
  );

  const circuitInput = {
    experienceMonths: Math.floor(experienceMonths),
    salt: salt.toString(),
    credentialHash: credHashBigInt.toString(),
    requiredMonths,
    expectedCommitment,
  };

  const wasmUrl = `${input.apiBaseUrl}/api/v1/zkp-artifacts/experience_proof/experience_proof_js/experience_proof.wasm`;
  const zkeyUrl = `${input.apiBaseUrl}/api/v1/zkp-artifacts/experience_proof/experience_proof_final.zkey`;
  const { proof, publicSignals } = await (snarkjs as any).groth16.fullProve(circuitInput, wasmUrl, zkeyUrl);

  return {
    proofType: 'experience',
    proof,
    publicSignals,
    threshold: requiredMonths,
    credentialHash: input.credentialHash,
  };
}
