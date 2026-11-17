'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Users, 
  Copy, 
  Check, 
  Award, 
  Gift, 
  Network, 
  ShieldCheck, 
  ArrowUpRight, 
  FileText, 
  CheckCircle2,
  AlertCircle,
  Layers,
  Sparkles,
  CreditCard,
  Save
} from 'lucide-react';

const INITIAL_PORTAL_STATE = {
  agentName: 'Ermias Kebede',
  agentId: 'Agent #FGG-ADMIN-01',
  uplineSponsor: 'FGG Global Master Reserve',
  assignedSuperAgentNode: 'NODE-01 (Addis Ababa Central Hub)',
  payoutRail: 'Telebirr',
  payoutAccount: '+251 91 234 5678',
  availablePrizeWallet: 15000.00,
  totalPrizesClaimed: 45000.00,
  referralLink: 'https://fgg-global.com/ref/ERMIAS-01'
};

const INITIAL_DOWNLINES = [
  { id: 'FGG-99211', name: 'Dawit Bekele', layer: 'Tier 1 (Direct)', joined: 'Today, 11:20 EAT', status: 'Eligible for Prize Drop' },
  { id: 'FGG-10492', name: 'Kalkidan Tadesse', layer: 'Tier 2 (Sub-Node)', joined: 'Yesterday', status: 'Eligible for Prize Drop' },
  { id: 'FGG-33821', name: 'Samuel Girma', layer: 'Tier 3 (Affiliate)', joined: 'Oct 24, 2026', status: 'Pending Verification' },
];

const INITIAL_PRIZE_HISTORY = [
  { id: 'PRZ-901', title: 'Q3 Global Distribution Drop', amount: 10000.00, tierSource: 'Tier 1 Downline Activity', status: 'Claimed & Credited', time: 'Oct 15, 2026' },
  { id: 'PRZ-882', title: 'Founder Milestone Reward', amount: 5000.00, tierSource: 'Direct Allocation', status: 'Claimed & Credited', time: 'Sep 01, 2026' },
];

export default function PartnerPortal() {
  const [profile, setProfile] = useState(INITIAL_PORTAL_STATE);
  const [downlines, setDownlines] = useState(INITIAL_DOWNLINES);
  const [prizes, setPrizes] = useState(INITIAL_PRIZE_HISTORY);
  const [copied, setCopied] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Payout Configuration Form State
  const [rail, setRail] = useState(profile.payoutRail);
  const [accountNumber, setAccountNumber] = useState(profile.payoutAccount);

  const triggerNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(profile.referralLink);
    setCopied(true);
    triggerNotification('Exclusive referral link copied to clipboard.');
    setTimeout(() => setCopied(false), 3000);
  };

  const handleSavePayout = (e: React.FormEvent) => {
    e.preventDefault();
    setProfile(prev => ({ ...prev, payoutRail: rail, payoutAccount: accountNumber }));
    triggerNotification('Payout destination saved successfully.');
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#0B1B36] font-sans flex antialiased selection:bg-[#0B1B36] selection:text-white relative">
      
      {/* SIDEBAR NAVIGATION */}
      <aside className="w-64 bg-[#0B1B36] text-[#AEB8C4] flex-col justify-between hidden md:flex sticky top-0 h-screen border-r border-[#536171]/20 shrink-0">
        <div className="p-6 space-y-8">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/30">
              <Network size={20} className="text-blue-400" />
            </div>
            <div>
              <div className="font-extrabold text-white text-base tracking-wider leading-none">FGG ECOSYSTEM</div>
              <div className="text-[9px] font-mono text-blue-400 uppercase tracking-widest mt-1">Partner & Prize Portal</div>
            </div>
          </div>

          <div className="space-y-1 font-mono text-xs">
            <div className="px-4 py-3 rounded-xl bg-[#536171]/30 text-white font-bold flex items-center gap-2">
              <Gift size={15} className="text-blue-400" /> Dashboard & Network
            </div>
          </div>
        </div>

        <div className="p-4 m-4 bg-[#536171]/20 border border-[#536171]/40 rounded-2xl space-y-2 font-mono text-xs">
          <div className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">Regional Node Hub</div>
          <div className="text-white font-bold">{profile.assignedSuperAgentNode}</div>
          <div className="text-[10px] text-[#AEB8C4]">Default Rail: {profile.payoutRail}</div>
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <main className="flex-1 flex flex-col min-w-0">
        
        {/* TOP HEADER */}
        <header className="bg-white/90 backdrop-blur-md border-b border-[#AEB8C4]/40 px-6 py-4 flex items-center justify-between sticky top-0 z-20 font-mono text-xs">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[#0B1B36] font-bold">{profile.agentName} ({profile.agentId})</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg font-bold">
              Periodic Prize & Allocation Engine Active
            </span>
          </div>
        </header>

        <div className="p-4 sm:p-8 space-y-8 max-w-6xl mx-auto w-full">
          
          {/* NOTIFICATION TOAST */}
          {notification && (
            <div className="bg-[#0B1B36] text-white px-5 py-3 rounded-2xl border border-[#536171]/40 text-xs font-mono shadow-xl flex items-center justify-between">
              <span className="flex items-center gap-2 text-emerald-400">
                <Check size={16} /> {notification}
              </span>
            </div>
          )}

          {/* HERO WALLET & REFERRAL BANNER */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <div className="lg:col-span-2 bg-white rounded-3xl p-6 sm:p-8 border border-[#AEB8C4]/40 shadow-xs flex flex-col justify-between space-y-6">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-[10px] font-mono uppercase tracking-widest text-blue-700 font-bold">
                  Active Participant Session
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B1B36] tracking-tight">
                  Welcome back, {profile.agentName}.
                </h1>
                <p className="text-xs text-[#536171]">
                  Primary Sponsor: <strong className="text-[#0B1B36]">{profile.uplineSponsor}</strong>
                </p>
              </div>

              {/* REFERRAL LINK BOX */}
              <div className="space-y-2 font-mono">
                <label className="text-[11px] text-[#536171] font-bold">Your Exclusive Referral Link (One-Time Tier Assignment)</label>
                <div className="flex items-center gap-2 bg-[#F5F7FA] p-2 rounded-2xl border border-[#AEB8C4]/50 text-xs">
                  <input 
                    type="text" 
                    value={profile.referralLink} 
                    readOnly 
                    className="w-full bg-transparent px-3 text-blue-700 font-bold focus:outline-none truncate"
                  />
                  <button 
                    onClick={handleCopyLink}
                    className="px-4 py-2.5 bg-[#0B1B36] hover:bg-[#0B1B36]/90 text-white font-bold rounded-xl transition flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>

            {/* BALANCE CARD */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#AEB8C4]/40 shadow-xs flex flex-col justify-between space-y-4 font-mono">
              <div className="space-y-1">
                <div className="text-[10px] uppercase text-[#536171] tracking-widest">Available Prize Wallet</div>
                <div className="text-2xl sm:text-3xl font-extrabold text-emerald-700">
                  ETB {profile.availablePrizeWallet.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div className="pt-4 border-t border-[#AEB8C4]/30 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#536171]">Total Prizes Claimed:</span>
                  <strong className="text-[#0B1B36]">ETB {profile.totalPrizesClaimed.toLocaleString()}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#536171]">Downline Network:</span>
                  <strong className="text-[#0B1B36]">{downlines.length} Agents</strong>
                </div>
              </div>
            </div>

          </div>

          {/* TWO COLUMN GRID: PAYOUT CONFIGURATION & DOWNLINE TREE */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* COLUMN 1: PAYOUT DESTINATION CONFIGURATION */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#AEB8C4]/40 shadow-xs space-y-6">
              <div className="flex justify-between items-center border-b border-[#AEB8C4]/30 pb-4">
                <div>
                  <h3 className="text-base font-extrabold text-[#0B1B36]">Configure Prize Payout Destination</h3>
                  <p className="text-xs font-mono text-[#536171]">Where periodic prize drops are disbursed</p>
                </div>
                <CreditCard size={18} className="text-[#0B1B36]" />
              </div>

              <form onSubmit={handleSavePayout} className="space-y-4 font-mono text-xs">
                <div className="space-y-1.5">
                  <label className="text-[#536171] font-bold">Preferred Payout Rail</label>
                  <select 
                    value={rail} 
                    onChange={e => setRail(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-[#AEB8C4]/50 bg-[#F5F7FA] text-[#0B1B36] font-bold focus:outline-none focus:border-[#0B1B36]"
                  >
                    <option value="Telebirr">Telebirr Mobile Wallet</option>
                    <option value="CBE">Commercial Bank of Ethiopia (CBE)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[#536171] font-bold">Account / Phone Number</label>
                  <input 
                    type="text" 
                    value={accountNumber} 
                    onChange={e => setAccountNumber(e.target.value)}
                    placeholder="e.g. +251 91 234 5678"
                    className="w-full px-4 py-3 rounded-xl border border-[#AEB8C4]/50 bg-[#F5F7FA] text-[#0B1B36] font-bold focus:outline-none focus:border-[#0B1B36]"
                    required
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full py-3.5 bg-[#0B1B36] hover:bg-[#0B1B36]/90 text-white font-bold rounded-xl transition cursor-pointer shadow-sm mt-2 flex items-center justify-center gap-2"
                >
                  <Save size={14} /> Save Payout Settings
                </button>
              </form>
            </div>

            {/* COLUMN 2: RECURSIVE 3-LAYER DOWNLINE TREE */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#AEB8C4]/40 shadow-xs space-y-6">
              <div className="flex justify-between items-center border-b border-[#AEB8C4]/30 pb-4">
                <div>
                  <h3 className="text-base font-extrabold text-[#0B1B36]">Your 3-Layer Downline Tree</h3>
                  <p className="text-xs font-mono text-[#536171]">Linked participants for upcoming prize drops</p>
                </div>
                <Layers size={18} className="text-[#0B1B36]" />
              </div>

              <div className="space-y-3 font-mono text-xs">
                {downlines.map((item, index) => (
                  <div key={index} className="p-4 rounded-2xl border border-[#AEB8C4]/40 bg-[#F5F7FA] flex justify-between items-center">
                    <div className="space-y-1">
                      <div className="font-bold text-[#0B1B36] flex items-center gap-2">
                        {item.name} <span className="text-[10px] text-[#536171] font-normal">#{item.id}</span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-bold inline-block">
                        {item.layer}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] text-emerald-700 font-bold">{item.status}</div>
                      <div className="text-[10px] text-[#536171]">{item.joined}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* PRIZE CLAIM HISTORY */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#AEB8C4]/40 shadow-xs space-y-6 font-mono">
            <div className="flex justify-between items-center border-b border-[#AEB8C4]/30 pb-4">
              <h3 className="text-base font-extrabold text-[#0B1B36]">Periodic Prize & Allocation History</h3>
              <span className="text-xs bg-[#F5F7FA] px-3 py-1 rounded-xl border border-[#AEB8C4]/40 text-[#0B1B36] font-bold">{prizes.length} Distributions</span>
            </div>

            <div className="space-y-3">
              {prizes.map((prz) => (
                <div key={prz.id} className="p-4 rounded-2xl border border-[#AEB8C4]/40 bg-[#F5F7FA] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs">
                  <div className="space-y-1">
                    <div className="font-bold text-[#0B1B36] flex items-center gap-2">
                      {prz.id}: {prz.title} <span className="text-[10px] text-[#536171]">Source: {prz.tierSource}</span>
                    </div>
                    <div className="text-[11px] text-[#536171]">
                      Status: <strong className="text-emerald-700">{prz.status}</strong> • Date: {prz.time}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-extrabold text-emerald-700 text-sm">ETB {prz.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </main>

    </div>
  );
}