'use client';

import Link from 'next/link';
import { FaShieldAlt, FaLock, FaCheckCircle } from 'react-icons/fa';

export default function Footer() {
  return (
    <footer className="bg-slate-950 text-slate-400 text-xs border-t border-slate-800 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <FaShieldAlt className="text-amber-500 text-xl" />
              <span className="text-base font-bold text-white">NyayDMS</span>
            </div>
            <p className="text-slate-400 leading-relaxed text-xs">
              National Crime Records Bureau (NCRB) - Women Safety Division.
              Cryptographically Anchored Legal & Investigation Document Management System.
            </p>
            <div className="flex items-center space-x-2 text-emerald-400 text-xs">
              <FaCheckCircle />
              <span>Smart Contract Verified (Hardhat/Sepolia)</span>
            </div>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-3">Department Portals</h4>
            <ul className="space-y-2">
              <li><Link href="/police" className="hover:text-indigo-400">Police & Investigating Officer (IO)</Link></li>
              <li><Link href="/forensics" className="hover:text-indigo-400">Forensic Science Laboratory (CFSL)</Link></li>
              <li><Link href="/judiciary" className="hover:text-indigo-400">Courts & Public Prosecutors</Link></li>
              <li><Link href="/women-safety" className="hover:text-indigo-400">NCRB Women Safety Division</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-3">Evidentiary Standards</h4>
            <ul className="space-y-2">
              <li><span className="text-slate-300">Section 65B Indian Evidence Act, 1872</span></li>
              <li><span className="text-slate-300">Section 63 Bharatiya Sakshya Adhiniyam, 2023</span></li>
              <li><span className="text-slate-300">Section 228A IPC / Sec 72 BNS (Victim Masking)</span></li>
              <li><span className="text-slate-300">POCSO Act Identity Protocols</span></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-3">Security & Compliance</h4>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <FaLock className="text-amber-400" />
                <span>AES-256-GCM Payload Encryption</span>
              </div>
              <div className="flex items-center space-x-2">
                <FaCheckCircle className="text-indigo-400" />
                <span>SHA-256 Immutability Fingerprinting</span>
              </div>
              <div className="flex items-center space-x-2">
                <FaShieldAlt className="text-emerald-400" />
                <span>Role-Based Custody Signatures</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center text-slate-500">
          <p>© 2026 Ministry of Home Affairs, Government of India. All rights reserved.</p>
          <p className="mt-2 sm:mt-0 font-mono text-[11px]">System: v2.4-Production Ready | Build: NCRB-SIH-2026</p>
        </div>
      </div>
    </footer>
  );
}
