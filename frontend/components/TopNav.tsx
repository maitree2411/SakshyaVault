'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { 
  FaShieldAlt, 
  FaBalanceScale, 
  FaMicroscope, 
  FaUserSecret, 
  FaCheckCircle, 
  FaHistory, 
  FaFolderOpen 
} from 'react-icons/fa';

export default function TopNav({ title, subtitle, accent }: { title?: string; subtitle?: string; accent?: string }) {
  const pathname = usePathname();

  const navLinks = [
    { href: '/cases', label: 'Cases & Dossiers', icon: FaFolderOpen },
    { href: '/police', label: 'Police (IO)', icon: FaShieldAlt },
    { href: '/forensics', label: 'Forensics (CFSL)', icon: FaMicroscope },
    { href: '/judiciary', label: 'Judiciary', icon: FaBalanceScale },
    { href: '/women-safety', label: 'Women Safety (NCRB)', icon: FaUserSecret },
    { href: '/verify', label: 'Verify Integrity', icon: FaCheckCircle },
    { href: '/audit', label: 'Audit Trail', icon: FaHistory },
  ];

  return (
    <header className="bg-slate-900 text-white shadow-lg sticky top-0 z-50 border-b border-slate-800">
      {/* Top Ministry Bar */}
      <div className="bg-slate-950 px-4 py-1 text-xs text-slate-400 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-semibold text-slate-200">Ministry of Home Affairs (MHA)</span>
            <span>|</span>
            <span>National Crime Records Bureau (NCRB) - Women Safety Division</span>
          </div>
          <div className="hidden sm:flex items-center space-x-4">
            <span className="text-amber-400 font-medium">Sec 65B Evidence Act Compliant</span>
            <span>|</span>
            <span className="text-slate-400">Node: Hardhat/Ethereum</span>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
        <Link href="/" className="flex items-center space-x-3 group">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
            <FaShieldAlt className="text-xl" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xl font-bold tracking-tight text-white">NyayDMS</span>
              <span className="text-xs px-2 py-0.5 rounded bg-indigo-900/80 text-indigo-300 font-mono border border-indigo-700">NCRB LegiChain</span>
            </div>
            <p className="text-[11px] text-slate-400">Digital Evidence & Legal Document Management</p>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden xl:flex items-center space-x-1">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className="text-xs" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Action / Wallet */}
        <div className="flex items-center space-x-3">
          <ConnectButton 
            chainStatus="icon"
            showBalance={false}
            accountStatus={{
              smallScreen: 'avatar',
              largeScreen: 'full',
            }}
          />
        </div>
      </div>

      {/* Sub-header title banner if provided */}
      {title && (
        <div className="bg-slate-800/60 px-4 py-2 border-t border-slate-800">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-200">{title}</h2>
            {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
          </div>
        </div>
      )}
    </header>
  );
}
