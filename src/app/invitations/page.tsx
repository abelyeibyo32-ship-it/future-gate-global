// src/app/invitations/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  Copy,
  CheckCircle2,
  Share2,
  DollarSign,
  TrendingUp,
  Menu,
  Globe,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useFGGSystem } from '@/lib/useFGGSystem';
import Navbar from '@/lib/components/Navbar';
import MobileBottomNav from '@/lib/components/MobileBottomNav';

interface ReferredAgent {
  id: string;
  username: string;
  phone: string;
  tier: string;
  created_at: string;
}

interface ReferralStat {
  totalReferrals: number;
  activeReferrals: number;
  totalCommission: number;
}

export default function InvitationsPage() {
  const { state, timeUntilReset } = useFGGSystem();
  const [isMounted, setIsMounted] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const [referralCode, setReferralCode] = useState('');
  const [referredList, setReferredList] = useState<ReferredAgent[]>([]);
  const [stats, setStats] = useState<ReferralStat>({
    totalReferrals: 0,
    activeReferrals: 0,
    totalCommission: 0,
  });

  useEffect(() => {
    setIsMounted(true);
    fetchAgentReferralData();
  }, []);

  const fetchAgentReferralData = async () => {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) return;
    const userId = authData.user.id;

    // 1. Fetch or generate the agent's unique referral code & id
    let { data: agentData } = await supabase
      .from('agents')
      .select('referral_code, id')
      .eq('id', userId)
      .maybeSingle();

    let code = agentData?.referral_code;
    if (!code) {
      code = `FGG-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      await supabase.from('agents').update({ referral_code: code }).eq('id', userId);
    }
    setReferralCode(code);

    let totalCount = 0;
    let totalComm = 0;
    let downlines: ReferredAgent[] = [];

    try {
      // 2. Query agents referred by this user's UUID using 'referred_by'
      const { data: referredAgents, error: refError } = await supabase
        .from('agents')
        .select('id, username, phone, tier, created_at, referred_by')
        .eq('referred_by', userId);

      if (!refError && referredAgents && referredAgents.length > 0) {
        totalCount = referredAgents.length;
        downlines = referredAgents as ReferredAgent[];
        setReferredList(downlines);

        const referredIds = referredAgents.map(a => a.id);

        // 3. Fetch registration / deposit transaction amounts for these referred agents to compute 7% commission
        const { data: txData, error: txError } = await supabase
          .from('transaction_requests')
          .select('amount, agent_id, status, type')
          .in('agent_id', referredIds)
          .eq('status', 'approved');

        if (!txError && txData) {
          totalComm = txData.reduce((acc, tx) => {
            const feeAmount = Number(tx.amount || 0);
            return acc + (feeAmount * 0.07); // 7% commission rule
          }, 0);
        }
      }
    } catch (err) {
      console.error('Error calculating referral metrics:', err);
    }

    setStats({
      totalReferrals: totalCount,
      activeReferrals: downlines.length,
      totalCommission: totalComm,
    });
  };

  const referralLink = typeof window !== 'undefined' && referralCode
    ? `${window.location.origin}/signup?ref=${referralCode}` 
    : `Loading referral link...`;

  const copyToClipboard = () => {
    if (!referralCode) return;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  if (!isMounted) return <div className="min-h-screen bg-[#F5F7FA]" />;

  const activeCategory = state?.activeCategory ?? 'Electronics';

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#0B1B36] font-sans flex selection:bg-[#0B1B36] selection:text-white relative pb-28 lg:pb-0">
      
      <Navbar 
        activeCategory={activeCategory} 
        isMobileOpen={isMobileMenuOpen} 
        onCloseMobile={() => setIsMobileMenuOpen(false)} 
      />

      <main className="flex-1 flex flex-col min-w-0">
        <header className="bg-white/95 backdrop-blur-md border-b border-[#AEB8C4]/40 px-4 sm:px-8 py-3.5 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 text-[#0B1B36] hover:bg-[#F5F7FA] rounded-xl transition border border-[#AEB8C4]/30 cursor-pointer"
              aria-label="Open menu"
            >
              <Menu size={19} />
            </button>
            <div className="flex items-center gap-2 lg:hidden">
              <div className="w-7 h-7 rounded-lg bg-[#0B1B36] flex items-center justify-center">
                <Globe size={15} className="text-white" />
              </div>
              <span className="font-extrabold text-[#0B1B36] text-sm tracking-wider">FGG</span>
            </div>
            <div className="text-xs font-mono text-[#536171] hidden sm:flex items-center gap-2.5">
              <span className="font-extrabold text-[#0B1B36]">Referral Engine</span>
              <span className="text-[#AEB8C4]">/</span>
              <span className="text-slate-600">Invite Network</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#0B1B36] text-white text-[11px] font-mono shadow-xs">
              <Clock size={12} className="text-white" />
              <span className="text-[#AEB8C4]">Settlement Cycle:</span>
              <span className="font-bold text-white">{timeUntilReset || '23:59:59'}</span>
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-8 space-y-6 max-w-5xl mx-auto w-full font-mono">
          <div className="bg-gradient-to-br from-[#0B1B36] via-[#0B1B36] to-[#0E2447] text-white rounded-3xl p-6 sm:p-8 border border-white/10 shadow-xl space-y-6">
            <div>
              <div className="text-[10px] text-white/70 uppercase tracking-widest font-bold">
                Global Affiliate & Agent Network
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight mt-1">
                Expand Your Clearing Node
              </h1>
              <p className="text-xs text-[#AEB8C4] mt-2 max-w-xl leading-relaxed">
                Invite new standard agents to FGG. Earn an automated 7% commission yield from their account tier fees directly into your balance.
              </p>
            </div>

            <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-2">
              <span className="text-[10px] text-[#AEB8C4] uppercase tracking-wider font-bold">Your Unique Referral Link</span>
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <input
                  type="text"
                  readOnly
                  value={referralLink}
                  className="w-full bg-[#0B1B36] border border-white/20 rounded-xl px-4 py-3 text-xs text-white font-mono select-all outline-none"
                />
                <button
                  onClick={copyToClipboard}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white text-[#0B1B36] hover:bg-[#AEB8C4] transition text-xs font-extrabold flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                >
                  {copied ? <CheckCircle2 size={16} className="text-emerald-600" /> : <Copy size={16} />}
                  {copied ? 'Copied Link!' : 'Copy Link'}
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-3xl border border-[#AEB8C4]/40 shadow-xs space-y-1">
              <div className="text-[10px] text-[#536171] uppercase tracking-wider font-bold flex items-center gap-2">
                <Users size={14} className="text-[#0B1B36]" /> Total Referrals
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-[#0B1B36]">
                {stats.totalReferrals} Agents
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-[#AEB8C4]/40 shadow-xs space-y-1">
              <div className="text-[10px] text-[#536171] uppercase tracking-wider font-bold flex items-center gap-2">
                <TrendingUp size={14} className="text-emerald-600" /> Active Nodes
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600">
                {stats.activeReferrals} Active
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-[#AEB8C4]/40 shadow-xs space-y-1">
              <div className="text-[10px] text-[#536171] uppercase tracking-wider font-bold flex items-center gap-2">
                <DollarSign size={14} className="text-blue-600" /> Referral Earnings (7%)
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-[#0B1B36]">
                ETB {stats.totalCommission.toLocaleString()}
              </div>
            </div>
          </div>

          {/* REFERRED AGENTS HISTORY TABLE */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#AEB8C4]/40 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="font-extrabold text-sm text-[#0B1B36] flex items-center gap-2">
                <Users size={16} className="text-[#0B1B36]" /> Downline Referral History
              </div>
              <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-3 py-1 rounded-xl">
                {referredList.length} Connected
              </span>
            </div>

            {referredList.length === 0 ? (
              <div className="text-center py-12 text-[#536171] space-y-2 border border-dashed border-[#AEB8C4]/40 rounded-2xl">
                <div className="text-lg">📭</div>
                <div className="text-xs font-bold">No downline agents registered yet.</div>
                <p className="text-[11px] text-slate-400">Share your referral link above to start building your clearing network.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#AEB8C4]/30 text-[10px] text-[#536171] uppercase">
                      <th className="pb-3 font-bold">Agent Username</th>
                      <th className="pb-3 font-bold">Phone Number</th>
                      <th className="pb-3 font-bold">Clearing Tier</th>
                      <th className="pb-3 font-bold">Joined Date</th>
                      <th className="pb-3 font-bold text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#AEB8C4]/20">
                    {referredList.map((agent) => (
                      <tr key={agent.id} className="hover:bg-[#F5F7FA] transition">
                        <td className="py-3.5 font-bold text-[#0B1B36]">{agent.username}</td>
                        <td className="py-3.5 text-[#536171]">{agent.phone || 'N/A'}</td>
                        <td className="py-3.5 text-[#536171]">{agent.tier || 'Electronics'}</td>
                        <td className="py-3.5 text-[#536171]">{new Date(agent.created_at).toLocaleDateString()}</td>
                        <td className="py-3.5 text-right">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
                            <ShieldCheck size={12} /> Active Node
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      <MobileBottomNav />

    </div>
  );
}