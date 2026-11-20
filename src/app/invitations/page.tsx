// src/app/invitations/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Users,
  Copy,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  Globe,
  ShieldCheck,
  Hourglass,
  RefreshCw,
  AlertTriangle,
  LogIn,
  Menu,
  Wallet,
  ArrowUpRight,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Navbar from '@/lib/components/Navbar';
import MobileBottomNav from '@/lib/components/MobileBottomNav';

const REFERRAL_COMMISSION_RATE = 0.07; // 7%

function normalizePhone(rawPhone: string): string {
  const digitsOnly = rawPhone.replace(/\D/g, '');
  if (digitsOnly.startsWith('251') && digitsOnly.length === 12) {
    return `0${digitsOnly.slice(3)}`;
  }
  return digitsOnly;
}

interface ReferredAgentRow {
  id: string;
  username?: string | null;
  phone?: string | null;
  tier?: string | null;
  created_at?: string | null;
  referred_by?: string | null;
  referralCount: number;
  hasApprovedTx: boolean;
  pendingCommission: number;
  approvedCommission: number;
}

interface ReferralSummary {
  referralCount: number;
  activeReferrals: number;
  pendingCommission: number;
  approvedCommission: number;
  totalCommission: number;
}

export default function InvitationsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activeTier, setActiveTier] = useState<string>('Electronics');
  const [referralCode, setReferralCode] = useState<string>('');
  const [referredList, setReferredList] = useState<ReferredAgentRow[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [summary, setSummary] = useState<ReferralSummary>({
    referralCount: 0,
    activeReferrals: 0,
    pendingCommission: 0,
    approvedCommission: 0,
    totalCommission: 0,
  });

  const loadReferralsAndCommissions = useCallback(async (manual = false) => {
    if (manual) setIsRefreshing(true);
    setErrorMsg(null);

    try {
      const {
        data: { user },
        error: authErr,
      } = await supabase.auth.getUser();

      if (authErr) {
        setErrorMsg(`Auth error: ${authErr.message}`);
        setIsLoading(false);
        return;
      }

      if (!user) {
        setCurrentUserId(null);
        setIsLoading(false);
        return;
      }

      setCurrentUserId(user.id);

      const { data: selfRow, error: selfErr } = await supabase
        .from('agents')
        .select('id, referral_code, tier')
        .eq('id', user.id)
        .maybeSingle();

      if (selfErr) {
        setErrorMsg(`Agent lookup error: ${selfErr.message}`);
      }

      if (selfRow?.tier) {
        setActiveTier(selfRow.tier);
      }

      let code = (selfRow?.referral_code || '').trim();
      if (!code && selfRow) {
        code = `FGG-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        await supabase.from('agents').update({ referral_code: code }).eq('id', user.id);
      }
      setReferralCode(code);

      const { data: downlines, error: downlineErr } = await supabase
        .from('agents')
        .select('id, username, phone, tier, created_at, referred_by')
        .eq('referred_by', user.id)
        .order('created_at', { ascending: false });

      if (downlineErr) {
        setErrorMsg(`Referrals query error: ${downlineErr.message}`);
        setReferredList([]);
        setSummary({
          referralCount: 0,
          activeReferrals: 0,
          pendingCommission: 0,
          approvedCommission: 0,
          totalCommission: 0,
        });
        return;
      }

      const rows = downlines || [];
      const downlineIds = rows.map((r: any) => r.id).filter(Boolean);

      const subReferralCounts = new Map<string, number>();
      if (downlineIds.length > 0) {
        const { data: secondLevelRows } = await supabase
          .from('agents')
          .select('referred_by')
          .in('referred_by', downlineIds);

        if (secondLevelRows) {
          for (const sub of secondLevelRows) {
            if (sub.referred_by) {
              subReferralCounts.set(
                sub.referred_by,
                (subReferralCounts.get(sub.referred_by) || 0) + 1
              );
            }
          }
        }
      }

      let pendingComm = 0;
      let approvedComm = 0;
      const approvedAgentIds = new Set<string>();
      const pendingByAgent = new Map<string, number>();
      const approvedByAgent = new Map<string, number>();
      const seenTxIds = new Set<string>();

      if (downlineIds.length > 0) {
        const { data: txRows, error: txErr } = await supabase
          .from('transaction_requests')
          .select('id, agent_id, amount, status, type')
          .in('agent_id', downlineIds)
          .in('type', ['registration', 'deposit']);

        if (txErr) {
          setErrorMsg(`Commission transactions error: ${txErr.message}`);
        } else if (txRows) {
          for (const tx of txRows) {
            if (tx.id && seenTxIds.has(tx.id)) continue;
            if (tx.id) seenTxIds.add(tx.id);

            const amount = Number(tx.amount || 0);
            if (!Number.isFinite(amount) || amount <= 0) continue;

            const commission = Number((amount * REFERRAL_COMMISSION_RATE).toFixed(2));
            const status = String(tx.status || '').toLowerCase();

            if (status === 'approved') {
              approvedComm += commission;
              approvedAgentIds.add(tx.agent_id);
              approvedByAgent.set(
                tx.agent_id,
                Number(((approvedByAgent.get(tx.agent_id) || 0) + commission).toFixed(2))
              );
            } else if (status === 'pending') {
              pendingComm += commission;
              pendingByAgent.set(
                tx.agent_id,
                Number(((pendingByAgent.get(tx.agent_id) || 0) + commission).toFixed(2))
              );
            }
          }
        }
      }

      const enrichedList: ReferredAgentRow[] = rows.map((r: any) => ({
        id: r.id,
        username: r.username,
        phone: r.phone ? normalizePhone(r.phone) : null,
        tier: r.tier,
        created_at: r.created_at,
        referred_by: r.referred_by,
        referralCount: subReferralCounts.get(r.id) || 0,
        hasApprovedTx: approvedAgentIds.has(r.id),
        approvedCommission: approvedByAgent.get(r.id) || 0,
        pendingCommission: pendingByAgent.get(r.id) || 0,
      }));

      const roundedPending = Number(pendingComm.toFixed(2));
      const roundedApproved = Number(approvedComm.toFixed(2));

      setReferredList(enrichedList);
      setSummary({
        referralCount: enrichedList.length,
        activeReferrals: enrichedList.filter((item) => item.hasApprovedTx).length,
        pendingCommission: roundedPending,
        approvedCommission: roundedApproved,
        totalCommission: Number((roundedPending + roundedApproved).toFixed(2)),
      });
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to load referral counts and commissions.');
    } finally {
      setIsLoading(false);
      if (manual) setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadReferralsAndCommissions();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadReferralsAndCommissions();
      } else {
        setCurrentUserId(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loadReferralsAndCommissions]);

  useEffect(() => {
    const channel = supabase
      .channel('invitations-commission-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'agents' },
        () => loadReferralsAndCommissions()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transaction_requests' },
        () => loadReferralsAndCommissions()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadReferralsAndCommissions]);

  const referralLink =
    typeof window !== 'undefined' && referralCode
      ? `${window.location.origin}/signup?ref=${encodeURIComponent(referralCode)}`
      : 'Generating referral link...';

  const copyReferralLink = async () => {
    if (!referralCode || typeof window === 'undefined') return;
    try {
      await navigator.clipboard.writeText(referralLink);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = referralLink;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (!isLoading && !currentUserId) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] text-[#0B1B36] font-mono flex pb-24 lg:pb-0">
        <Navbar
          activeCategory={activeTier}
          isMobileOpen={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
        />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="bg-white border-b border-[#AEB8C4]/40 px-4 sm:px-8 py-3.5 flex items-center justify-between sticky top-0 z-30">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl border border-[#AEB8C4]/40 text-[#0B1B36] hover:bg-[#F5F7FA] cursor-pointer"
              aria-label="Open menu"
            >
              <Menu size={18} />
            </button>
            <div className="text-xs font-extrabold">FGG Clearing Network</div>
            <div className="w-8 lg:hidden" />
          </header>

          <div className="flex-1 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-3xl border border-[#AEB8C4]/40 shadow-xl p-8 text-center space-y-4">
              <div className="text-lg font-extrabold">Phone Sign In Required</div>
              <p className="text-xs text-[#536171]">
                Sign in with your phone number to view your referral count and 7% commissions.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-[#0B1B36] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#152d56] transition"
              >
                <LogIn size={15} /> Go to Login
              </Link>
            </div>
          </div>
        </div>
        <MobileBottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#0B1B36] font-mono flex pb-24 lg:pb-0">
      <Navbar
        activeCategory={activeTier}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      <main className="flex-1 flex flex-col min-w-0">
        <header className="bg-white/95 backdrop-blur-md border-b border-[#AEB8C4]/40 px-4 sm:px-8 py-3.5 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl border border-[#AEB8C4]/40 text-[#0B1B36] hover:bg-[#F5F7FA] cursor-pointer"
              aria-label="Open menu"
            >
              <Menu size={18} />
            </button>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#0B1B36] text-white flex items-center justify-center">
                <Globe size={16} />
              </div>
              <div>
                <div className="text-xs font-extrabold">Referrals &amp; 7% Commission</div>
                <div className="text-[10px] text-[#536171] hidden sm:block">
                  7% Referral Commission • Credited to Wallet Balance on Approval
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/wallet"
              className="px-3.5 py-2 rounded-xl bg-[#0B1B36] text-white hover:bg-[#152d56] text-xs font-bold transition flex items-center gap-1.5"
            >
              <Wallet size={13} />
              <span>Wallet</span>
              <ArrowUpRight size={13} />
            </Link>
            <button
              type="button"
              onClick={() => loadReferralsAndCommissions(true)}
              disabled={isRefreshing}
              className="px-3.5 py-2 rounded-xl bg-[#F5F7FA] hover:bg-[#0B1B36] hover:text-white border border-[#AEB8C4]/50 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">{isRefreshing ? 'Syncing...' : 'Refresh'}</span>
            </button>
          </div>
        </header>

        <div className="max-w-5xl w-full mx-auto p-4 sm:p-8 space-y-6">
          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl p-4 text-xs flex items-start gap-2.5">
              <AlertTriangle size={16} className="shrink-0 mt-0.5 text-rose-600" />
              <div>
                <div className="font-extrabold">Data Notice</div>
                <div className="mt-0.5 break-all">{errorMsg}</div>
              </div>
            </div>
          )}

          <section className="bg-gradient-to-br from-[#0B1B36] via-[#0B1B36] to-[#0E2447] text-white rounded-3xl p-6 sm:p-8 shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-white/70 font-bold">
                  Direct Referral Link
                </div>
                <h1 className="text-xl sm:text-2xl font-extrabold mt-1">
                  {summary.referralCount} {summary.referralCount === 1 ? 'Referral' : 'Referrals'} • ETB{' '}
                  {summary.totalCommission.toFixed(2)} Commission
                </h1>
                <p className="text-xs text-[#AEB8C4] mt-1.5 max-w-xl">
                  Earn 7% on tier registration or deposit amounts. Approved commissions are added
                  directly to your wallet balance.
                </p>
              </div>
              {referralCode && (
                <div className="bg-white/10 border border-white/15 px-4 py-2.5 rounded-2xl text-right shrink-0">
                  <div className="text-[9px] uppercase text-[#AEB8C4]">Your Code</div>
                  <div className="text-xs font-extrabold">{referralCode}</div>
                </div>
              )}
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2">
              <div className="text-[10px] uppercase tracking-wider text-[#AEB8C4] font-bold">
                Shareable Invite Link
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  readOnly
                  value={referralLink}
                  className="w-full bg-[#0B1B36] border border-white/20 rounded-xl px-4 py-3 text-xs text-white outline-none"
                />
                <button
                  type="button"
                  onClick={copyReferralLink}
                  className="px-6 py-3 rounded-xl bg-white text-[#0B1B36] hover:bg-[#AEB8C4] transition text-xs font-extrabold flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                >
                  {copied ? (
                    <CheckCircle2 size={15} className="text-emerald-600" />
                  ) : (
                    <Copy size={15} />
                  )}
                  {copied ? 'Copied!' : 'Copy Link'}
                </button>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-[#AEB8C4]/40 shadow-xs space-y-1">
              <div className="text-[10px] text-[#536171] uppercase font-bold flex items-center gap-1.5">
                <Users size={14} className="text-[#0B1B36]" /> Amount of Referrals
              </div>
              <div className="text-2xl font-extrabold text-[#0B1B36]">{summary.referralCount}</div>
              <div className="text-[10px] text-[#536171]">Direct referred agents</div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-[#AEB8C4]/40 shadow-xs space-y-1">
              <div className="text-[10px] text-[#536171] uppercase font-bold flex items-center gap-1.5">
                <TrendingUp size={14} className="text-emerald-600" /> Approved Referrals
              </div>
              <div className="text-2xl font-extrabold text-emerald-600">
                {summary.activeReferrals}
              </div>
              <div className="text-[10px] text-[#536171]">With approved transactions</div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-[#AEB8C4]/40 shadow-xs space-y-1">
              <div className="text-[10px] text-[#536171] uppercase font-bold flex items-center gap-1.5">
                <Hourglass size={14} className="text-amber-600" /> Pending (7%)
              </div>
              <div className="text-2xl font-extrabold text-amber-600">
                ETB {summary.pendingCommission.toFixed(2)}
              </div>
              <div className="text-[10px] text-[#536171]">Awaiting Super Agent approval</div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-[#AEB8C4]/40 shadow-xs space-y-1">
              <div className="text-[10px] text-[#536171] uppercase font-bold flex items-center gap-1.5">
                <DollarSign size={14} className="text-blue-600" /> Approved (7%)
              </div>
              <div className="text-2xl font-extrabold text-[#0B1B36]">
                ETB {summary.approvedCommission.toFixed(2)}
              </div>
              <div className="text-[10px] text-[#536171]">Credited to wallet balance</div>
            </div>
          </section>

          <section className="bg-white rounded-3xl p-6 sm:p-8 border border-[#AEB8C4]/40 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="font-extrabold text-sm flex items-center gap-2">
                <Users size={16} /> Referred Agents ({summary.referralCount})
              </div>
              <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-3 py-1 rounded-xl">
                ETB {summary.totalCommission.toFixed(2)} Total (7%)
              </span>
            </div>

            {isLoading ? (
              <div className="text-center py-10 text-xs font-bold text-[#536171]">
                Counting referrals and calculating commissions...
              </div>
            ) : referredList.length === 0 ? (
              <div className="text-center py-10 text-xs text-[#536171] border border-dashed border-[#AEB8C4]/50 rounded-2xl space-y-1">
                <div className="font-bold">0 referrals yet.</div>
                <div className="text-[11px] text-slate-400">
                  Share your referral link above to grow your referral count and earn 7% commission.
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#AEB8C4]/30 text-[10px] text-[#536171] uppercase">
                      <th className="pb-3 font-bold">Username</th>
                      <th className="pb-3 font-bold">Phone</th>
                      <th className="pb-3 font-bold">Tier</th>
                      <th className="pb-3 font-bold text-center">Sub-Referrals</th>
                      <th className="pb-3 font-bold text-right">7% Commission</th>
                      <th className="pb-3 font-bold text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#AEB8C4]/20">
                    {referredList.map((row) => {
                      const rowCommission = row.hasApprovedTx
                        ? row.approvedCommission
                        : row.pendingCommission;

                      return (
                        <tr key={row.id} className="hover:bg-[#F5F7FA] transition">
                          <td className="py-3.5 font-bold">{row.username || 'Operator'}</td>
                          <td className="py-3.5 text-[#536171]">{row.phone || 'N/A'}</td>
                          <td className="py-3.5 text-[#536171]">{row.tier || 'Electronics'}</td>
                          <td className="py-3.5 text-center font-bold text-[#0B1B36]">
                            {row.referralCount}
                          </td>
                          <td className="py-3.5 text-right font-bold">
                            ETB {rowCommission.toFixed(2)}
                          </td>
                          <td className="py-3.5 text-right">
                            {row.hasApprovedTx ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
                                <ShieldCheck size={12} /> Approved
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg">
                                <Hourglass size={12} /> Pending
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </main>

      <MobileBottomNav />
    </div>
  );
}