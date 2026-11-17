'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Globe,
  LayoutDashboard,
  Store,
  Wallet,
  Users,
  Layers,
  Info,
  HelpCircle,
  FileText,
  ShieldCheck,
  X,
} from 'lucide-react';

interface NavbarProps {
  activeCategory?: string;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export default function Navbar({
  activeCategory = 'Electronics',
  isMobileOpen = false,
  onCloseMobile = () => {},
}: NavbarProps) {
  const pathname = usePathname();
  const isActive = (path: string) => pathname === path;

  const renderNavContent = (isMobile: boolean) => (
    <div className="flex flex-col h-full justify-between p-6 space-y-6 overflow-y-auto">
      <div className="space-y-6">
        {/* Brand / Logo */}
        <Link href="/dashboard" className="flex items-center gap-3.5 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-white/20 to-white/5 flex items-center justify-center border border-white/20 shadow-inner">
            <Globe size={21} className="text-white shrink-0" />
          </div>
          <div>
            <div className="font-extrabold text-white text-lg tracking-wider leading-none flex items-center gap-1.5">
              FGG
              <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
            </div>
            <div className="text-[9px] font-mono text-[#AEB8C4] uppercase tracking-[0.2em] mt-1">
              Future Gate Global
            </div>
          </div>
        </Link>

        {/* Agent Role / Category Badge */}
        <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-white font-bold flex items-center gap-1.5">
              <ShieldCheck size={13} /> Standard Agent
            </span>
            <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-white/15 text-white border border-white/25 font-bold">
              {activeCategory}
            </span>
          </div>
          <div className="text-[9px] font-mono text-[#AEB8C4]/80 flex items-center justify-between pt-1 border-t border-white/5">
            <span>Contract: Fixed 6-Mo</span>
            <span className="text-white/90">24h Auto-Pay</span>
          </div>
        </div>

        {/* Main Navigation Links */}
        <nav className="space-y-1 font-medium text-xs">
          <div className="pb-1.5 text-[10px] font-mono text-[#AEB8C4]/50 uppercase tracking-widest px-3">
            Clearing Operations
          </div>
          <Link
            href="/dashboard"
            onClick={isMobile ? onCloseMobile : undefined}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              isActive('/dashboard')
                ? 'bg-white/10 text-white font-bold shadow-sm'
                : 'text-[#AEB8C4] hover:text-white hover:bg-white/5'
            }`}
          >
            <LayoutDashboard size={16} /> Dashboard
          </Link>
          <Link
            href="/categories"
            onClick={isMobile ? onCloseMobile : undefined}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              isActive('/categories')
                ? 'bg-white/10 text-white font-bold shadow-sm'
                : 'text-[#AEB8C4] hover:text-white hover:bg-white/5'
            }`}
          >
            <Store size={16} /> Marketplace Categories
          </Link>
          <Link
            href="/wallet"
            onClick={isMobile ? onCloseMobile : undefined}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              isActive('/wallet')
                ? 'bg-white/10 text-white font-bold shadow-sm'
                : 'text-[#AEB8C4] hover:text-white hover:bg-white/5'
            }`}
          >
            <Wallet size={16} /> Wallet Ledger
          </Link>
          <Link
            href="/invitations"
            onClick={isMobile ? onCloseMobile : undefined}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              isActive('/invitations')
                ? 'bg-white/10 text-white font-bold shadow-sm'
                : 'text-[#AEB8C4] hover:text-white hover:bg-white/5'
            }`}
          >
            <Users size={16} /> Referrals & Invites
          </Link>

          <div className="pt-4 pb-1.5 text-[10px] font-mono text-[#AEB8C4]/50 uppercase tracking-widest px-3">
            Corporate & Governance
          </div>
          <Link
            href="/services"
            onClick={isMobile ? onCloseMobile : undefined}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${
              isActive('/services')
                ? 'bg-white/10 text-white font-bold shadow-sm'
                : 'text-[#AEB8C4] hover:text-white hover:bg-white/5'
            }`}
          >
            <Layers size={15} /> Services
          </Link>
          <Link
            href="/about"
            onClick={isMobile ? onCloseMobile : undefined}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${
              isActive('/about')
                ? 'bg-white/10 text-white font-bold shadow-sm'
                : 'text-[#AEB8C4] hover:text-white hover:bg-white/5'
            }`}
          >
            <Info size={15} /> About Us
          </Link>
          <Link
            href="/support"
            onClick={isMobile ? onCloseMobile : undefined}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${
              isActive('/support')
                ? 'bg-white/10 text-white font-bold shadow-sm'
                : 'text-[#AEB8C4] hover:text-white hover:bg-white/5'
            }`}
          >
            <HelpCircle size={15} /> Support Center
          </Link>
          <Link
            href="/terms"
            onClick={isMobile ? onCloseMobile : undefined}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${
              isActive('/terms')
                ? 'bg-white/10 text-white font-bold shadow-sm'
                : 'text-[#AEB8C4] hover:text-white hover:bg-white/5'
            }`}
          >
            <FileText size={15} /> Terms & Conditions
          </Link>
        </nav>
      </div>

      {/* Security Footer Box */}
      <div className="p-4 bg-gradient-to-br from-white/10 to-[#0B1B36] border border-white/20 rounded-2xl space-y-2.5 shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-extrabold text-white uppercase tracking-wider">Agent Security</span>
          <span className="text-[9px] font-mono text-white font-bold">Verified</span>
        </div>
        <p className="text-[11px] text-[#AEB8C4] leading-relaxed">
          UK Regulated Clearing Node #13489201. Secure 256-Bit session active.
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* 1. DESKTOP SIDEBAR */}
      <aside className="w-68 bg-gradient-to-b from-[#0B1B36] via-[#0B1B36] to-[#071226] text-[#AEB8C4] flex-col justify-between hidden lg:flex sticky top-0 h-screen border-r border-white/10 shrink-0 shadow-xl">
        {renderNavContent(false)}
      </aside>

      {/* 2. MOBILE SIDEBAR DRAWER */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="fixed inset-0 bg-[#0B1B36]/70 backdrop-blur-xs" onClick={onCloseMobile}></div>
          <div className="relative w-72 bg-gradient-to-b from-[#0B1B36] to-[#071226] text-[#AEB8C4] flex flex-col justify-between h-full shadow-2xl z-10">
            {/* Close button header wrapper inside mobile view */}
            <div className="absolute top-4 right-4 z-20">
              <button onClick={onCloseMobile} className="text-[#AEB8C4] hover:text-white p-1.5 rounded-lg bg-white/5">
                <X size={18} />
              </button>
            </div>
            {renderNavContent(true)}
          </div>
        </div>
      )}
    </>
  );
}