// src/app/super-agent/[id]/page.tsx
'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Check,
  X,
  Loader2,
  ExternalLink,
  User,
  Phone,
  Wallet,
  Users,
  Layers,
  Smartphone,
  Building2,
  ShieldCheck,
  ShieldAlert,
  Search,
  LogOut,
  LogIn,
  TrendingUp,
  Hash,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

const WITHDRAWAL_FEE_RATE = 0.03; // 3%

function normalizePhone(raw: string): string {
  const cleaned = raw.trim().replace(/[\s\-()]/g, '');
  if (!cleaned) return '';
  if (cleaned.startsWith('+')) return cleaned;
  if (cleaned.startsWith('251')) return `+${cleaned}`;
  if (cleaned.startsWith('09') && cleaned.length === 10) {
    return `+251${cleaned.slice(1)}`;
  }
  if (cleaned.startsWith('9') && cleaned.length === 9) {
    return `+251${cleaned}`;
  }
  return cleaned;
}

function phoneDigitsOnly(raw?: string | null): string {
  if (!raw) return '';
  const normalized = normalizePhone(raw);
  return normalized.replace(/\D/g, '');
}

function roundMoney(val: number): number {
  return Number(val.toFixed(2));
}

function computeWithdrawalBreakdown(
  rawAmount: number,
  explicitFee?: number | null,
  explicitNet?: number | null
) {
  const amount = Math.max(0, Number(rawAmount) || 0);
  const fee =
    explicitFee != null && !Number.isNaN(Number(explicitFee))
      ? roundMoney(Number(explicitFee))
      : roundMoney(amount * WITHDRAWAL_FEE_RATE);
  const net =
    explicitNet != null && !Number.isNaN(Number(explicitNet))
      ? roundMoney(Number(explicitNet))
      : roundMoney(Math.max(0, amount - fee));
  return { amount, fee, net };
}

interface WalletRecord {
  id?: string;
  agent_id?: string | null;
  user_id?: string | null;
  balance?: number | null;
  available_balance?: number | null;
}

interface ReferredAgentSummary {
  id: string;
  full_name?: string | null;
  username?: string | null;
  phone?: string | null;
  tier?: string | null;
  balance?: number | null;
}

interface AgentProfile {
  id: string;
  user_id?: string | null;
  full_name?: string | null;
  username?: string | null;
  phone?: string | null;
  tier?: string | null;
  active_category?: string | null;
  balance?: number | null;
  capital_balance?: number | null;
  daily_task_profit?: number | null;
  daily_profit?: number | null;
  task_profit?: number | null;
  referred_by?: string | null;
  referral_count?: number;
  referred_agents?: ReferredAgentSummary[];
  wallet_id?: string | null;
  wallet_balance?: number;
  wallet_source?: 'wallets' | 'agents';
}

interface TransactionRequest {
  id: string;
  agent_id: string;
  super_agent_id?: string | null;
  super_agent_name?: string | null;
  tier?: string | null;
  type: 'deposit' | 'withdrawal' | 'registration' | string;
  method: 'telebirr' | 'cbe' | string;
  amount: number;
  fee_amount?: number | null;
  net_amount?: number | null;
  remaining_balance?: number | null;
  sender_or_receiver_number?: string | null;
  transaction_ref?: string | null;
  receipt_url?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  agents?: AgentProfile | null;
}

interface SuperAgentNode {
  id: string;
  name: string;
  tier?: string | null;
  region?: string | null;
  phone?: string | null;
  telebirr_account?: string | null;
  cbe_account?: string | null;
  user_id?: string | null;
  status?: string | null;
}

function getAgentDisplayName(ag?: AgentProfile | null, fallbackId?: string): string {
  return (
    ag?.full_name?.trim() ||
    ag?.username?.trim() ||
    fallbackId ||
    'Unknown Agent'
  );
}

function getAgentDailyProfit(ag?: AgentProfile | null): number {
  if (!ag) return 0;
  const val = ag.daily_task_profit ?? ag.daily_profit ?? ag.task_profit ?? 0;
  return Number(val) || 0;
}

function getWalletBalanceValue(w?: WalletRecord | null): number | null {
  if (!w) return null;
  if (w.balance != null && !Number.isNaN(Number(w.balance))) return Number(w.balance);
  if (w.available_balance != null && !Number.isNaN(Number(w.available_balance))) {
    return Number(w.available_balance);
  }
  return null;
}

async function resolveAgentWallet(agent: AgentProfile | null, agentId: string) {
  const candidateIds = Array.from(
    new Set([agentId, agent?.id, agent?.user_id].filter((x): x is string => Boolean(x)))
  );

  let walletRow: WalletRecord | null = null;

  if (candidateIds.length > 0) {
    const { data: byAgentId } = await supabase
      .from('wallets')
      .select('*')
      .in('agent_id', candidateIds)
      .limit(1)
      .maybeSingle();

    if (byAgentId) {
      walletRow = byAgentId as WalletRecord;
    } else {
      const { data: byUserId } = await supabase
        .from('wallets')
        .select('*')
        .in('user_id', candidateIds)
        .limit(1)
        .maybeSingle();

      if (byUserId) {
        walletRow = byUserId as WalletRecord;
      }
    }
  }

  const walletBal = getWalletBalanceValue(walletRow);
  const agentBal =
    agent?.balance != null && !Number.isNaN(Number(agent.balance))
      ? roundMoney(Number(agent.balance))
      : null;

  if (walletRow && walletBal !== null) {
    return {
      walletId: walletRow.id || null,
      balance: roundMoney(walletBal),
      source: 'wallets' as const,
    };
  }

  return {
    walletId: walletRow?.id || null,
    balance: agentBal ?? 0,
    source: agentBal !== null ? ('agents' as const) : ('wallets' as const),
  };
}

function SuperAgentNodePortalContent() {
  const params = useParams<{ id: string }>();
  const nodeId = params?.id || '';

  const [isMounted, setIsMounted] = useState(false);

  const [node, setNode] = useState<SuperAgentNode | null>(null);
  const [transactions, setTransactions] = useState<TransactionRequest[]>([]);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [authUserPhone, setAuthUserPhone] = useState<string | null>(null);
  const [isAuthorizedOwner, setIsAuthorizedOwner] = useState<boolean>(false);

  // Phone sign-in state
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [notification, setNotification] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  }, []);

  const fetchNodeData = useCallback(
    async (manual = false) => {
      if (!nodeId) return;
      if (manual) setIsRefreshing(true);

      try {
        const { data: userRes } = await supabase.auth.getUser();
        const currentUid = userRes?.user?.id || null;
        const currentPhone = userRes?.user?.phone || null;
        const currentPhoneDigits = phoneDigitsOnly(currentPhone);
        const isAdmin =
          (userRes?.user?.app_metadata as Record<string, any> | undefined)?.role === 'admin';

        setAuthUserId(currentUid);
        setAuthUserPhone(currentPhone);

        if (!currentUid) {
          setIsAuthorizedOwner(false);
          setNode(null);
          setTransactions([]);
          setLoading(false);
          setIsRefreshing(false);
          return;
        }

        const { data: nodeData, error: nodeError } = await supabase
          .from('super_agents')
          .select('*')
          .eq('id', nodeId)
          .maybeSingle();

        if (nodeError) throw nodeError;

        const typedNode = (nodeData as SuperAgentNode) || null;
        setNode(typedNode);

        const nodePhoneDigits = phoneDigitsOnly(typedNode?.phone);
        const matchesOwner =
          Boolean(typedNode) &&
          (isAdmin ||
            (typedNode?.user_id && String(typedNode.user_id) === String(currentUid)) ||
            (Boolean(currentPhoneDigits) &&
              Boolean(nodePhoneDigits) &&
              currentPhoneDigits === nodePhoneDigits));

        setIsAuthorizedOwner(Boolean(matchesOwner));

        if (!matchesOwner || !typedNode) {
          setTransactions([]);
          setLoading(false);
          setIsRefreshing(false);
          return;
        }

        const { data: txData, error: txError } = await supabase
          .from('transaction_requests')
          .select('*')
          .eq('super_agent_id', nodeId)
          .order('created_at', { ascending: false });

        if (txError) throw txError;

        const rawTxs = (txData || []) as TransactionRequest[];
        const agentIds = Array.from(new Set(rawTxs.map((t) => t.agent_id).filter(Boolean)));

        const agentMap: Record<string, AgentProfile> = {};
        const referralMap: Record<string, ReferredAgentSummary[]> = {};
        const walletBalanceMap: Record<
          string,
          { walletId: string | null; balance: number; source: 'wallets' | 'agents' }
        > = {};

        if (agentIds.length > 0) {
          const { data: agentsData, error: agentsErr } = await supabase
            .from('agents')
            .select('*')
            .in('id', agentIds);

          if (!agentsErr && agentsData) {
            for (const ag of agentsData as AgentProfile[]) {
              agentMap[ag.id] = ag;
            }
          }

          const { data: referredRows, error: refErr } = await supabase
            .from('agents')
            .select('*')
            .in('referred_by', agentIds);

          if (!refErr && referredRows) {
            for (const row of referredRows as (ReferredAgentSummary & { referred_by?: string | null })[]) {
              if (row.referred_by) {
                if (!referralMap[row.referred_by]) {
                  referralMap[row.referred_by] = [];
                }
                referralMap[row.referred_by].push({
                  id: row.id,
                  full_name: row.full_name,
                  username: row.username,
                  phone: row.phone,
                  tier: row.tier,
                  balance: row.balance,
                });
              }
            }
          }

          const { data: walletsData, error: walletsErr } = await supabase
            .from('wallets')
            .select('*');

          for (const aid of agentIds) {
            const ag = agentMap[aid];
            const match = !walletsErr && walletsData
              ? (walletsData as WalletRecord[]).find(
                  (w) =>
                    (w.agent_id && String(w.agent_id) === String(aid)) ||
                    (ag?.user_id && w.user_id && String(w.user_id) === String(ag.user_id))
                )
              : null;

            const wVal = getWalletBalanceValue(match);
            if (match && wVal !== null) {
              walletBalanceMap[aid] = {
                walletId: match.id || null,
                balance: roundMoney(wVal),
                source: 'wallets',
              };
            } else {
              walletBalanceMap[aid] = {
                walletId: match?.id || null,
                balance: roundMoney(Number(ag?.balance ?? 0)),
                source: 'agents',
              };
            }
          }
        }

        const enrichedTxs: TransactionRequest[] = rawTxs.map((tx) => {
          const profile = agentMap[tx.agent_id] || null;
          const referredList = referralMap[tx.agent_id] || [];
          const walletInfo = walletBalanceMap[tx.agent_id] || {
            walletId: null,
            balance: roundMoney(Number(profile?.balance ?? 0)),
            source: 'agents' as const,
          };

          return {
            ...tx,
            agents: profile
              ? {
                  ...profile,
                  balance: walletInfo.balance,
                  wallet_id: walletInfo.walletId,
                  wallet_balance: walletInfo.balance,
                  wallet_source: walletInfo.source,
                  referral_count: referredList.length,
                  referred_agents: referredList,
                }
              : {
                  id: tx.agent_id,
                  balance: walletInfo.balance,
                  wallet_id: walletInfo.walletId,
                  wallet_balance: walletInfo.balance,
                  wallet_source: walletInfo.source,
                  referral_count: referredList.length,
                  referred_agents: referredList,
                },
          };
        });

        setTransactions(enrichedTxs);

        if (manual) {
          showToast('Super Agent requests & wallets synced.');
        }
      } catch (err: any) {
        console.error('Error loading super agent node:', err);
        showToast(err?.message || 'Failed to load node data.');
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [nodeId, showToast]
  );

  useEffect(() => {
    setIsMounted(true);
    fetchNodeData(false);

    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      fetchNodeData(false);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [fetchNodeData]);

  useEffect(() => {
    if (!nodeId || !isAuthorizedOwner) return;

    const channel = supabase
      .channel(`super-agent-phone-auth-${nodeId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transaction_requests' },
        () => fetchNodeData(false)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'wallets' },
        () => fetchNodeData(false)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'agents' },
        () => fetchNodeData(false)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'super_agents' },
        () => fetchNodeData(false)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [nodeId, isAuthorizedOwner, fetchNodeData]);

  const handlePhoneSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signingIn) return;
    setSigningIn(true);
    setAuthError(null);

    try {
      const formattedPhone = normalizePhone(loginPhone);
      if (!formattedPhone) {
        throw new Error('Please enter a valid phone number.');
      }

      const { error } = await supabase.auth.signInWithPassword({
        phone: formattedPhone,
        password: loginPassword,
      });

      if (error) throw error;
      setLoginPassword('');
      await fetchNodeData(false);
    } catch (err: any) {
      setAuthError(err?.message || 'Phone sign-in failed.');
    } finally {
      setSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setIsAuthorizedOwner(false);
    setTransactions([]);
    showToast('Signed out.');
  };

  const handleDecision = async (tx: TransactionRequest, newStatus: 'approved' | 'rejected') => {
    if (!isAuthorizedOwner || processingId) return;
    setProcessingId(tx.id);

    try {
      const { data: latestTx, error: fetchTxError } = await supabase
        .from('transaction_requests')
        .select('*')
        .eq('id', tx.id)
        .single();

      if (fetchTxError) throw fetchTxError;

      const actorName = node?.name || `Super Agent (${nodeId})`;
      const txType = latestTx?.type || tx.type;
      const isWithdrawal = txType === 'withdrawal';
      const rawAmount = Math.max(0, Number(latestTx?.amount ?? tx.amount ?? 0));

      const feeCalc = roundMoney(rawAmount * WITHDRAWAL_FEE_RATE);
      const netCalc = roundMoney(Math.max(0, rawAmount - feeCalc));
      const breakdown = computeWithdrawalBreakdown(
        rawAmount,
        newStatus === 'approved' ? feeCalc : null,
        newStatus === 'approved' ? netCalc : null
      );

      let nextRemainingBalance: number | null = null;

      if (newStatus === 'approved' && latestTx?.status !== 'approved') {
        const { data: agentRow } = await supabase
          .from('agents')
          .select('*')
          .eq('id', tx.agent_id)
          .maybeSingle();

        const resolvedAgent = (agentRow as AgentProfile) || tx.agents || null;
        const walletInfo = await resolveAgentWallet(resolvedAgent, tx.agent_id);
        const currentBalance = walletInfo.balance;

        if (isWithdrawal) {
          nextRemainingBalance = Math.max(0, roundMoney(currentBalance - breakdown.amount));
        } else if (txType === 'deposit') {
          nextRemainingBalance = roundMoney(currentBalance + breakdown.amount);
        } else {
          nextRemainingBalance = currentBalance;
        }

        // 1. Update wallets table if a wallet row exists
        if (walletInfo.walletId) {
          const { error: walletUpdErr } = await supabase
            .from('wallets')
            .update({ balance: nextRemainingBalance })
            .eq('id', walletInfo.walletId);

          if (walletUpdErr) throw walletUpdErr;
        }

        // 2. Always update agents.balance (and tier if provided)
        const agentUpdates: Record<string, any> = {
          balance: nextRemainingBalance,
        };

        const resolvedTier = latestTx?.tier || tx.tier;
        if (resolvedTier) {
          agentUpdates.tier = resolvedTier;
          agentUpdates.active_category = resolvedTier;
        }

        if (agentRow) {
          const { error: updateAgentError } = await supabase
            .from('agents')
            .update(agentUpdates)
            .eq('id', tx.agent_id);

          if (updateAgentError) throw updateAgentError;
        }
      }

      const txUpdatePayload: Record<string, any> = {
        status: newStatus,
        super_agent_id: node?.id || nodeId,
        super_agent_name: actorName,
      };

      if (isWithdrawal && newStatus === 'approved') {
        txUpdatePayload.fee_amount = breakdown.fee;
        txUpdatePayload.net_amount = breakdown.net;
      }

      if (newStatus === 'approved' && nextRemainingBalance !== null) {
        txUpdatePayload.remaining_balance = nextRemainingBalance;
      }

      const { error: updateTxError } = await supabase
        .from('transaction_requests')
        .update(txUpdatePayload)
        .eq('id', tx.id);

      if (updateTxError && updateTxError.message?.toLowerCase().includes('remaining_balance')) {
        delete txUpdatePayload.remaining_balance;
        const { error: retryErr } = await supabase
          .from('transaction_requests')
          .update(txUpdatePayload)
          .eq('id', tx.id);
        if (retryErr) throw retryErr;
      } else if (updateTxError) {
        throw updateTxError;
      }

      // Immediately update local state so balance & remaining balance reflect right away
      if (newStatus === 'approved' && nextRemainingBalance !== null) {
        setTransactions((prev) =>
          prev.map((item) =>
            item.id === tx.id
              ? {
                  ...item,
                  status: 'approved',
                  super_agent_id: node?.id || nodeId,
                  super_agent_name: actorName,
                  fee_amount: isWithdrawal ? breakdown.fee : item.fee_amount,
                  net_amount: isWithdrawal ? breakdown.net : item.net_amount,
                  remaining_balance: nextRemainingBalance,
                  agents: item.agents
                    ? {
                        ...item.agents,
                        balance: nextRemainingBalance,
                        wallet_balance: nextRemainingBalance,
                      }
                    : item.agents,
                }
              : item
          )
        );
      }

      showToast(
        newStatus === 'approved'
          ? isWithdrawal
            ? `Approved: ${breakdown.net.toLocaleString()} ETB payout (-3% fee: ${breakdown.fee.toLocaleString()} ETB) • Remaining balance: ${(nextRemainingBalance ?? 0).toLocaleString()} ETB.`
            : `Approved • Updated balance: ${(nextRemainingBalance ?? 0).toLocaleString()} ETB.`
          : `Transaction ${newStatus} by ${actorName}.`
      );
      await fetchNodeData(false);
    } catch (err: any) {
      console.error('Approval error:', err);
      showToast(`Action failed: ${err?.message || 'Unable to update transaction.'}`);
    } finally {
      setProcessingId(null);
    }
  };

  if (!isMounted) return <div className="min-h-screen bg-[#F5F7FA]" />;

  const filtered = transactions.filter((tx) => {
    const matchesStatus = filterStatus === 'all' || tx.status === filterStatus;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return matchesStatus;

    const fullName = (tx.agents?.full_name || '').toLowerCase();
    const username = (tx.agents?.username || '').toLowerCase();
    const agentPhone = (tx.agents?.phone || '').toLowerCase();
    const acctNum = (tx.sender_or_receiver_number || '').toLowerCase();
    const ref = (tx.transaction_ref || '').toLowerCase();
    const aid = (tx.agent_id || '').toLowerCase();

    const matchesSearch =
      fullName.includes(q) ||
      username.includes(q) ||
      agentPhone.includes(q) ||
      acctNum.includes(q) ||
      ref.includes(q) ||
      aid.includes(q);

    return matchesStatus && matchesSearch;
  });

  const pendingCount = transactions.filter((t) => t.status === 'pending').length;
  const approvedCount = transactions.filter((t) => t.status === 'approved').length;
  const pendingVolume = transactions
    .filter((t) => t.status === 'pending')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#0B1B36] font-mono flex flex-col">
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0B1B36] text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-white/20 text-xs flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Top Navigation Header */}
      <header className="bg-white/95 backdrop-blur-md border-b border-[#AEB8C4]/40 px-4 sm:px-8 py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/super-agent"
            className="p-2 rounded-xl bg-[#F5F7FA] hover:bg-[#0B1B36] hover:text-white border border-[#AEB8C4]/40 transition shrink-0"
            title="Back to Super Agents Directory"
          >
            <ArrowLeft size={16} />
          </Link>
          <div className="text-xs flex items-center gap-2 truncate">
            <span className="font-extrabold text-[#0B1B36] truncate">
              {isAuthorizedOwner ? node?.name || 'Super Agent Node' : 'Super Agent Sign In'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {isAuthorizedOwner && (
            <button
              type="button"
              onClick={() => fetchNodeData(true)}
              disabled={isRefreshing}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-[#0B1B36] hover:text-white border border-[#AEB8C4]/40 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
              <span>Sync</span>
            </button>
          )}
          {authUserId && (
            <button
              type="button"
              onClick={handleSignOut}
              className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-700 border border-rose-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut size={13} />
              <span>Sign Out</span>
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full p-4 sm:p-8 space-y-6">
        {loading ? (
          <div className="py-20 bg-white rounded-3xl border border-[#AEB8C4]/40 flex items-center justify-center gap-2 text-xs text-[#536171]">
            <Loader2 size={16} className="animate-spin" /> Loading...
          </div>
        ) : !authUserId ? (
          /* PHONE NUMBER SIGN IN */
          <div className="max-w-md mx-auto bg-white rounded-3xl p-6 sm:p-8 border border-[#AEB8C4]/40 shadow-sm space-y-4 text-xs">
            <div className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#0B1B36]">
              <Phone size={15} /> Super Agent Sign In
            </div>

            {authError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-bold">
                {authError}
              </div>
            )}

            <form onSubmit={handlePhoneSignIn} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-[#536171]">Phone Number</label>
                <input
                  type="tel"
                  value={loginPhone}
                  onChange={(e) => setLoginPhone(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-[#F5F7FA] border border-[#AEB8C4]/40 font-bold focus:outline-none focus:border-[#0B1B36]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-[#536171]">Password</label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-[#F5F7FA] border border-[#AEB8C4]/40 font-bold focus:outline-none focus:border-[#0B1B36]"
                />
              </div>

              <button
                type="submit"
                disabled={signingIn}
                className="w-full py-3 rounded-xl bg-[#0B1B36] hover:bg-[#152d56] text-white font-extrabold uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {signingIn ? <Loader2 size={14} className="animate-spin" /> : <LogIn size={14} />}
                Sign In
              </button>
            </form>
          </div>
        ) : !isAuthorizedOwner ? (
          /* BLOCK ACCESS TO ANOTHER SUPER AGENT'S NODE */
          <div className="max-w-lg mx-auto bg-white rounded-3xl p-8 border border-rose-200 shadow-sm space-y-4 text-xs text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
              <ShieldAlert size={24} />
            </div>
            <h1 className="text-base font-extrabold text-[#0B1B36]">Access Restricted</h1>
            <p className="text-[#536171] leading-relaxed">
              Signed in as <strong className="text-[#0B1B36]">{authUserPhone || authUserId}</strong>. This node belongs to another Super Agent.
            </p>
            <div className="pt-2 flex items-center justify-center gap-3">
              <Link
                href="/super-agent"
                className="px-4 py-2.5 rounded-xl bg-[#0B1B36] text-white font-bold transition"
              >
                Back to Directory
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#0B1B36] font-bold transition cursor-pointer"
              >
                Switch Account
              </button>
            </div>
          </div>
        ) : (
          /* AUTHORIZED OWNER VIEW */
          <>
            <div className="bg-gradient-to-br from-[#0B1B36] via-[#0B1B36] to-[#0E2447] text-white rounded-3xl p-6 sm:p-8 border border-white/10 shadow-xl flex flex-col lg:flex-row justify-between gap-6">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 text-xs font-extrabold text-emerald-300">
                  <ShieldCheck size={15} /> Super Agent Portal
                </div>
                <h1 className="text-xl sm:text-2xl font-extrabold">{node?.name || `Node ${nodeId}`}</h1>
                <div className="text-xs text-[#AEB8C4] flex flex-wrap gap-x-5 gap-y-1 pt-1">
                  <span>Region: <strong className="text-white">{node?.region || 'Central'}</strong></span>
                  <span>Status: <strong className="text-emerald-300 uppercase">{node?.status || 'active'}</strong></span>
                  {(node?.phone || authUserPhone) && (
                    <span className="inline-flex items-center gap-1">
                      <Phone size={12} /> <strong className="text-white">{node?.phone || authUserPhone}</strong>
                    </span>
                  )}
                  {node?.telebirr_account && (
                    <span className="inline-flex items-center gap-1">
                      <Smartphone size={12} /> Telebirr: <strong className="text-white">{node.telebirr_account}</strong>
                    </span>
                  )}
                  {node?.cbe_account && (
                    <span className="inline-flex items-center gap-1">
                      <Building2 size={12} /> CBE: <strong className="text-white">{node.cbe_account}</strong>
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 shrink-0">
                <div className="bg-white/10 border border-white/10 px-4 py-3 rounded-2xl text-center">
                  <div className="text-[10px] text-[#AEB8C4] uppercase font-bold">Pending</div>
                  <div className="text-xl font-extrabold text-amber-300">{pendingCount}</div>
                </div>
                <div className="bg-white/10 border border-white/10 px-4 py-3 rounded-2xl text-center">
                  <div className="text-[10px] text-[#AEB8C4] uppercase font-bold">Approved</div>
                  <div className="text-xl font-extrabold text-emerald-400">{approvedCount}</div>
                </div>
                <div className="bg-white/10 border border-white/10 px-4 py-3 rounded-2xl text-center">
                  <div className="text-[10px] text-[#AEB8C4] uppercase font-bold">Pending ETB</div>
                  <div className="text-sm sm:text-base font-extrabold text-white mt-1">
                    {pendingVolume.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="bg-white rounded-2xl p-4 border border-[#AEB8C4]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap gap-2">
                {(['pending', 'approved', 'rejected', 'all'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setFilterStatus(st)}
                    className={`px-3.5 py-2 rounded-xl font-extrabold uppercase transition cursor-pointer ${
                      filterStatus === st
                        ? 'bg-[#0B1B36] text-white'
                        : 'bg-[#F5F7FA] text-[#536171] hover:text-[#0B1B36]'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-72">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#536171]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search full name, phone, ref..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#F5F7FA] border border-[#AEB8C4]/40 font-bold focus:outline-none focus:border-[#0B1B36]"
                />
              </div>
            </div>

            {/* Transaction Requests List */}
            {filtered.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 border border-[#AEB8C4]/40 text-center text-xs text-[#536171]">
                No {filterStatus === 'all' ? '' : filterStatus} transaction requests found.
              </div>
            ) : (
              <div className="space-y-4">
                {filtered.map((tx) => {
                  const isBusy = processingId === tx.id;
                  const isWithdrawal = tx.type === 'withdrawal';
                  const isApproved = tx.status === 'approved';
                  const rawAmount = Math.max(0, Number(tx.amount) || 0);
                  const { amount, fee, net } = computeWithdrawalBreakdown(
                    rawAmount,
                    isApproved ? tx.fee_amount : null,
                    isApproved ? tx.net_amount : null
                  );

                  const fullName = getAgentDisplayName(tx.agents, tx.agent_id);
                  const username = tx.agents?.username?.trim();
                  const dailyProfit = getAgentDailyProfit(tx.agents);
                  const referrals = tx.agents?.referred_agents || [];
                  const referralCount = tx.agents?.referral_count ?? referrals.length;
                  const walletBalance = Number(tx.agents?.wallet_balance ?? tx.agents?.balance ?? 0);
                  const capitalBalance = Number(tx.agents?.capital_balance ?? 0);

                  const remainingAfterApproval = isApproved
                    ? tx.remaining_balance != null && !Number.isNaN(Number(tx.remaining_balance))
                      ? roundMoney(Number(tx.remaining_balance))
                      : roundMoney(walletBalance)
                    : null;

                  return (
                    <div
                      key={tx.id}
                      className="bg-white rounded-3xl p-5 sm:p-6 border border-[#AEB8C4]/40 shadow-xs flex flex-col lg:flex-row lg:items-start justify-between gap-5 text-xs"
                    >
                      <div className="space-y-3 flex-1 min-w-0">
                        {/* Badges & Timestamp */}
                        <div className="flex flex-wrap items-center gap-2.5">
                          <span className="px-3 py-1 rounded-xl bg-[#0B1B36] text-white font-extrabold uppercase">
                            {tx.type}
                          </span>
                          <span className="px-3 py-1 rounded-xl bg-[#F5F7FA] border border-[#AEB8C4]/40 font-bold uppercase">
                            {tx.method}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-xl font-extrabold uppercase ${
                              tx.status === 'approved'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : tx.status === 'rejected'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {tx.status === 'approved' && <CheckCircle2 size={12} />}
                            {tx.status === 'rejected' && <XCircle size={12} />}
                            {tx.status === 'pending' && <Clock size={12} />}
                            {tx.status}
                          </span>
                          <span className="text-[11px] text-[#536171]">
                            {new Date(tx.created_at).toLocaleString()}
                          </span>
                        </div>

                        {/* Amount, Post-Approval -3% Fee & Remaining Wallet Balance */}
                        <div className="bg-[#F5F7FA] rounded-2xl p-3.5 border border-[#AEB8C4]/30 space-y-1.5">
                          {isWithdrawal ? (
                            isApproved ? (
                              <>
                                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                                  <span className="text-sm font-extrabold text-[#0B1B36]">
                                    Requested: {amount.toLocaleString()} ETB
                                  </span>
                                  <span className="text-xs font-extrabold text-rose-700">
                                    -3% Fee: -{fee.toLocaleString()} ETB
                                  </span>
                                  <span className="text-sm font-extrabold text-emerald-700">
                                    Final Payout: {net.toLocaleString()} ETB
                                  </span>
                                </div>
                                <div className="text-xs font-extrabold text-[#0B1B36] pt-0.5">
                                  Remaining Wallet Balance After Approval:{' '}
                                  <span className="text-emerald-700">
                                    {(remainingAfterApproval ?? 0).toLocaleString()} ETB
                                  </span>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="text-sm font-extrabold text-[#0B1B36]">
                                  Withdrawal Request: {amount.toLocaleString()} ETB
                                </div>
                                <div className="text-[11px] text-[#536171]">
                                  -3% fee, net payout, and remaining wallet balance will be calculated after approval.
                                </div>
                              </>
                            )
                          ) : (
                            <>
                              <div className="text-sm font-extrabold text-[#0B1B36]">
                                Amount: {amount.toLocaleString()} ETB
                              </div>
                              {isApproved && (
                                <div className="text-xs font-extrabold text-[#0B1B36]">
                                  Remaining Wallet Balance After Approval:{' '}
                                  <span className="text-emerald-700">
                                    {(remainingAfterApproval ?? 0).toLocaleString()} ETB
                                  </span>
                                </div>
                              )}
                            </>
                          )}
                        </div>

                        {/* Detailed Agent Info: Full Name, Numbers, Daily Task Profit, Linked Wallet Balance */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-[#536171]">
                          <div className="inline-flex items-center gap-1.5">
                            <User size={13} className="text-[#0B1B36] shrink-0" />
                            <span>
                              Full Name: <strong className="text-[#0B1B36]">{fullName}</strong>
                              {username && username !== fullName ? ` (@${username})` : ''}
                            </span>
                          </div>

                          <div className="inline-flex items-center gap-1.5">
                            <Phone size={13} className="text-[#0B1B36] shrink-0" />
                            <span>
                              Phone: <strong className="text-[#0B1B36]">{tx.agents?.phone || 'N/A'}</strong>
                            </span>
                          </div>

                          <div className="inline-flex items-center gap-1.5">
                            <Wallet size={13} className="text-[#0B1B36] shrink-0" />
                            <span>
                              {isWithdrawal ? 'Receive No.' : 'Sender No.'}:{' '}
                              <strong className="text-[#0B1B36]">
                                {tx.sender_or_receiver_number || 'N/A'}
                              </strong>
                            </span>
                          </div>

                          <div className="inline-flex items-center gap-1.5">
                            <TrendingUp size={13} className="text-emerald-700 shrink-0" />
                            <span>
                              Daily Task Profit:{' '}
                              <strong className="text-emerald-700">
                                {dailyProfit.toLocaleString()} ETB
                              </strong>
                            </span>
                          </div>

                          <div className="inline-flex items-center gap-1.5">
                            <Hash size={13} className="text-[#0B1B36] shrink-0" />
                            <span>
                              Wallet Balance:{' '}
                              <strong className="text-[#0B1B36]">{walletBalance.toLocaleString()} ETB</strong>
                              {capitalBalance > 0 ? ` (Cap: ${capitalBalance.toLocaleString()})` : ''}
                            </span>
                          </div>

                          <div className="inline-flex items-center gap-1.5">
                            <Users size={13} className="text-[#0B1B36] shrink-0" />
                            <span>
                              Referrals: <strong className="text-[#0B1B36]">{referralCount}</strong>
                            </span>
                          </div>

                          {tx.tier && (
                            <div className="inline-flex items-center gap-1.5">
                              <Layers size={13} className="text-[#0B1B36] shrink-0" />
                              <span>
                                Tier: <strong className="text-[#0B1B36]">{tx.tier}</strong>
                              </span>
                            </div>
                          )}

                          {tx.transaction_ref && (
                            <div className="sm:col-span-2">
                              <span>
                                Tx Ref: <strong className="text-[#0B1B36]">{tx.transaction_ref}</strong>
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Referred Agents List */}
                        {referrals.length > 0 && (
                          <div className="bg-[#F5F7FA]/80 rounded-xl p-3 border border-[#AEB8C4]/30 space-y-1">
                            <div className="text-[10px] font-extrabold uppercase text-[#536171]">
                              Referred Agents ({referrals.length})
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {referrals.map((refAgent) => (
                                <span
                                  key={refAgent.id}
                                  className="px-2.5 py-1 rounded-lg bg-white border border-[#AEB8C4]/40 text-[11px] text-[#0B1B36]"
                                >
                                  <strong>{getAgentDisplayName(refAgent, refAgent.id)}</strong>
                                  {refAgent.phone ? ` • ${refAgent.phone}` : ''}
                                  {refAgent.tier ? ` • ${refAgent.tier}` : ''}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {tx.receipt_url && (
                          <div>
                            <a
                              href={tx.receipt_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[#0B1B36] underline font-bold"
                            >
                              View Receipt <ExternalLink size={12} />
                            </a>
                          </div>
                        )}
                      </div>

                      {tx.status === 'pending' && (
                        <div className="flex items-center gap-2.5 shrink-0">
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleDecision(tx, 'approved')}
                            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold uppercase transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            {isBusy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                            Approve
                          </button>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleDecision(tx, 'rejected')}
                            className="px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 font-extrabold uppercase transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            <X size={14} />
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default function SuperAgentNodePortalPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center text-xs font-mono text-[#536171]">
          Loading...
        </div>
      }
    >
      <SuperAgentNodePortalContent />
    </Suspense>
  );
}