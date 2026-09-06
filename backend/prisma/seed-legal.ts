import '../src/config/env';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('🏛️ Seeding NyayDMS / NCRB LegiChain database with realistic legal records...');

  // 1. Create Department Officers
  const ioUser = await prisma.user.upsert({
    where: { address: '0x71C84901b6e4F4692B86E80e9f1967208759C901' },
    update: {},
    create: {
      address: '0x71C84901b6e4F4692B86E80e9f1967208759C901',
      name: 'Insp. Vikramaditya Sharma',
      badgeNumber: 'DL-POL-4412',
      department: 'Cyber Crime Police Station, North District, Delhi Police',
      role: 'POLICE',
      email: 'io.vikramaditya@delhipolice.gov.in'
    }
  });

  const fslUser = await prisma.user.upsert({
    where: { address: '0x2546BcD3c84621e976D8185a91A922aE77ECEc30' },
    update: {},
    create: {
      address: '0x2546BcD3c84621e976D8185a91A922aE77ECEc30',
      name: 'Dr. Sunita Rao',
      badgeNumber: 'CFSL-SSO-89',
      department: 'Central Forensic Science Laboratory (CFSL), CBI Complex',
      role: 'FORENSIC',
      email: 'dr.sunitarao@cfsl.gov.in'
    }
  });

  const courtUser = await prisma.user.upsert({
    where: { address: '0xbDA5747bFD65F08deb54cb465eB87D40e51B197E' },
    update: {},
    create: {
      address: '0xbDA5747bFD65F08deb54cb465eB87D40e51B197E',
      name: 'Hon\'ble Shri A. K. Verma (Chief Metropolitan Magistrate)',
      badgeNumber: 'RO-JUD-04',
      department: 'District & Sessions Court, Tis Hazari, Delhi',
      role: 'JUDICIARY',
      email: 'cmm.tishazari@delhicourts.gov.in'
    }
  });

  const ncrbUser = await prisma.user.upsert({
    where: { address: '0xcd3B766CCDd6AE721141F452C550Ca635964ce71' },
    update: {},
    create: {
      address: '0xcd3B766CCDd6AE721141F452C550Ca635964ce71',
      name: 'Dy. Director Meenakshi Sundaram',
      badgeNumber: 'NCRB-WS-01',
      department: 'NCRB Women Safety Division, Ministry of Home Affairs',
      role: 'NCRB_ADMIN',
      email: 'wsd.director@ncrb.gov.in'
    }
  });

  console.log('✅ Created Department Officers (Police, FSL, Court, NCRB)');

  // 2. Case 1: Cyber Financial Fraud & Deepfake Impersonation
  const case1 = await prisma.case.upsert({
    where: { caseNumber: 'DL/CYB/2026/0412' },
    update: {},
    create: {
      caseNumber: 'DL/CYB/2026/0412',
      firNumber: 'FIR-089/2026',
      title: 'State vs. Cyber Impersonation Syndicate (AI Voice Clone & Bank Theft)',
      description: 'Sophisticated deepfake audio phishing and unauthorized bank transfer of INR 48.5 Lakhs through mule accounts.',
      policeStation: 'Cyber Crime Police Station, North District',
      district: 'North District',
      state: 'Delhi',
      sections: 'Sec 66C, 66D IT Act, Sec 419, 420, 120B IPC / Sec 318, 319 BNS',
      status: 'CHARGE_SHEETED',
      isSensitive: false,
      investigatingOfficerId: ioUser.id
    }
  });

  // FIR for Case 1
  const fir1Hash = '0x' + crypto.createHash('sha256').update('FIR-089-ORIGINAL-DELHI-POLICE-AUTHENTIC').digest('hex');
  const fir1Doc = await prisma.legalDocument.upsert({
    where: { documentHash: fir1Hash },
    update: {},
    create: {
      caseId: case1.id,
      title: 'First Information Report (FIR No. 089/2026) Certified Copy',
      documentType: 'FIR',
      documentHash: fir1Hash,
      ipfsHash: 'QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco',
      fileSize: 245760,
      fileType: 'application/pdf',
      version: 1,
      txHash: '0x8f3c4e21a78912d0981e4b3a56c7d8e9f0123456789abcdef0123456789abcde',
      uploaderAddress: ioUser.address,
      uploaderId: ioUser.id
    }
  });

  await prisma.chainOfCustody.create({
    data: {
      documentId: fir1Doc.id,
      fromParty: 'Duty Officer SI Ramesh Kumar',
      toParty: 'Insp. Vikramaditya Sharma (IO)',
      transferReason: 'Assignment of investigation and case docket handover',
      location: 'Cyber Crime Police Station, North District',
      txHash: fir1Doc.txHash,
      officerSignature: 'SIG-FIR-089-VERIFIED'
    }
  });

  // Forensic Report for Case 1
  const fsl1Hash = '0x' + crypto.createHash('sha256').update('CFSL-CYBER-REPORT-AUDIO-DEEPFAKE-SPECTROGRAM-9901').digest('hex');
  const fsl1Doc = await prisma.legalDocument.upsert({
    where: { documentHash: fsl1Hash },
    update: {},
    create: {
      caseId: case1.id,
      title: 'CFSL Digital Forensics & Voice Spectrogram Examination Report',
      documentType: 'FORENSIC_REPORT',
      documentHash: fsl1Hash,
      ipfsHash: 'QmZtmD2qtYBPmzFUWEdgm15jT7zB9GzP9Hxy4t56Fv2a1z',
      fileSize: 491520,
      fileType: 'application/pdf',
      version: 1,
      txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      uploaderAddress: fslUser.address,
      uploaderId: fslUser.id
    }
  });

  await prisma.chainOfCustody.createMany({
    data: [
      {
        documentId: fsl1Doc.id,
        fromParty: 'Insp. Vikramaditya Sharma (IO)',
        toParty: 'Dr. Sunita Rao (Senior Scientific Officer, CFSL)',
        transferReason: 'Submission of seized hard drive and audio sample for acoustic forensic examination',
        location: 'Central Forensic Science Laboratory, CBI Complex, New Delhi',
        txHash: '0xabc1234567890defabc1234567890defabc1234567890defabc1234567890def',
        officerSignature: 'CFSL-RCV-88192'
      },
      {
        documentId: fsl1Doc.id,
        fromParty: 'Dr. Sunita Rao (CFSL)',
        toParty: 'Insp. Vikramaditya Sharma (IO)',
        transferReason: 'Return of scientific examination report with sealed evidentiary findings',
        location: 'CFSL Forensic Dispatch Bureau',
        txHash: '0xdef7890123456abcdef7890123456abcdef7890123456abcdef7890123456abc',
        officerSignature: 'CFSL-DSP-99201'
      }
    ]
  });

  // Charge Sheet for Case 1
  const cs1Hash = '0x' + crypto.createHash('sha256').update('FINAL-CHARGE-SHEET-SEC-173-CRPC-CASE-0412').digest('hex');
  const cs1Doc = await prisma.legalDocument.upsert({
    where: { documentHash: cs1Hash },
    update: {},
    create: {
      caseId: case1.id,
      title: 'Final Police Investigation Report / Charge Sheet (Sec 173 CrPC)',
      documentType: 'CHARGE_SHEET',
      documentHash: cs1Hash,
      ipfsHash: 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG',
      fileSize: 1048576,
      fileType: 'application/pdf',
      version: 1,
      txHash: '0x99887766554433221100aabbccddeeff99887766554433221100aabbccddeeff',
      uploaderAddress: ioUser.address,
      uploaderId: ioUser.id
    }
  });

  await prisma.chainOfCustody.create({
    data: {
      documentId: cs1Doc.id,
      fromParty: 'Insp. Vikramaditya Sharma (IO)',
      toParty: 'Hon\'ble Chief Metropolitan Magistrate, Tis Hazari Court',
      transferReason: 'Filing of charge sheet in court for judicial cognizance',
      location: 'Courtroom No. 24, Tis Hazari Courts, Delhi',
      txHash: cs1Doc.txHash,
      officerSignature: 'JUD-COG-2026-089'
    }
  });

  console.log('✅ Created Case 1: Cyber Crime Syndicate with FIR, Forensic Report, and Charge Sheet');

  // 3. Case 2: Sensitive Women Safety & Protected Witness Case
  const case2 = await prisma.case.upsert({
    where: { caseNumber: 'DL/WSD/2026/0142' },
    update: {},
    create: {
      caseNumber: 'DL/WSD/2026/0142',
      firNumber: 'FIR-142/2026',
      title: 'Sensitive Cyber Harassment & Intimidation Investigation',
      description: 'Confidential investigation into organized digital stalking, threats, and targeted harassment. Governed under Section 228A IPC identity protection protocols.',
      policeStation: 'Special Women Police Station, New Delhi',
      district: 'New Delhi District',
      state: 'Delhi',
      sections: 'Sec 354A, 354D, 506, 509 IPC, Sec 67 IT Act / Sec 72, 75, 78 BNS',
      status: 'UNDER_INVESTIGATION',
      isSensitive: true,
      investigatingOfficerId: ioUser.id
    }
  });

  // Protected Witness Statement for Case 2
  const rawWitnessStatement = 'Statement of Ms. Ananya Sen, resident of House 42, Civil Lines, Delhi. I was contacted on WhatsApp from +91-9876543210 with persistent threats and morphing demands.';
  const rawBlindedHash = '0x' + crypto.createHash('sha256').update(rawWitnessStatement).digest('hex');

  const redactedStatement = 'Statement of [PROTECTED_VICTIM_ID], resident of [CONFIDENTIAL_LOCATION_REDACTED]. I was contacted on WhatsApp from [PHONE_REDACTED] with persistent threats and morphing demands.';
  const redactedHash = '0x' + crypto.createHash('sha256').update(redactedStatement).digest('hex');

  const protectedDoc = await prisma.legalDocument.upsert({
    where: { documentHash: redactedHash },
    update: {},
    create: {
      caseId: case2.id,
      title: '[PROTECTED] Key Victim Deposition under Sec 164 CrPC',
      documentType: 'WITNESS_STATEMENT',
      documentHash: redactedHash,
      previousHash: rawBlindedHash,
      ipfsHash: 'QmProtectedWitnessStorageCID77890123456789abcdef',
      fileSize: 128000,
      fileType: 'text/plain',
      version: 1,
      isAnonymized: true,
      redactedFields: JSON.stringify({
        statutoryProtocol: 'Section 228A IPC / Section 72 BNS Identity Protection',
        tokensRedacted: ['VICTIM_NAME', 'VICTIM_ADDRESS', 'PHONE_NUMBER'],
        originalBlindedCommitment: rawBlindedHash
      }),
      txHash: '0x7766554433221100ffeeddccbbaa99887766554433221100ffeeddccbbaa9988',
      uploaderAddress: ncrbUser.address,
      uploaderId: ncrbUser.id
    }
  });

  await prisma.chainOfCustody.create({
    data: {
      documentId: protectedDoc.id,
      fromParty: 'Dy. Director Meenakshi Sundaram (NCRB Women Safety Desk)',
      toParty: 'Special Judge / Public Prosecutor (In-Camera Proceedings)',
      transferReason: 'Sealed identity statement submission for in-camera judicial review',
      location: 'Patiala House Courts, New Delhi',
      txHash: protectedDoc.txHash,
      officerSignature: 'WSD-SEAL-2026-991'
    }
  });

  console.log('✅ Created Case 2: Sensitive Women Safety Protected Dossier');

  // 4. Verification Record & Audit Trail
  await prisma.verificationRecord.create({
    data: {
      documentHash: fir1Doc.documentHash,
      documentId: fir1Doc.id,
      isAuthentic: true,
      verifierAgency: 'Tis Hazari District Court Filing Section',
      verifierAddress: courtUser.address,
      remarks: 'Authentic: SHA-256 hash mathematically matches blockchain state'
    }
  });

  await prisma.auditLog.createMany({
    data: [
      {
        officerName: ioUser.name,
        action: 'REGISTER_FIR',
        resource: fir1Doc.documentHash,
        details: 'Anchored FIR-089/2026 onto LegalDocumentRegistry Smart Contract',
        ipAddress: '10.14.22.101'
      },
      {
        officerName: fslUser.name,
        action: 'SUBMIT_FORENSIC_REPORT',
        resource: fsl1Doc.documentHash,
        details: 'Submitted Voice Spectrogram FSL Analysis with CFSL Key Signature',
        ipAddress: '10.20.15.44'
      },
      {
        officerName: ncrbUser.name,
        action: 'REDACT_PROTECT_DOCUMENT',
        resource: protectedDoc.documentHash,
        details: 'Applied statutory PII mask under Section 228A IPC with blinded cryptographic commitment',
        ipAddress: '10.50.8.2'
      }
    ]
  });

  console.log('🎉 Seeding complete! Realistic law enforcement database initialized successfully.');
}

main()
  .catch((e) => {
    console.error('Error seeding legal database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
