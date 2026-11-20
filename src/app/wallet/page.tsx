// src/app/wallet/page.tsx
'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  ArrowDownLeft,
  Smartphone,
  Building2,
  Upload,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  Menu,
  RefreshCw,
  ExternalLink,
  Calendar,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useFGGSystem } from '@/lib/useFGGSystem';
import Navbar from '@/lib/components/Navbar';
import MobileBottomNav from '@/lib/components/MobileBottomNav';

const WITHDRAWAL_FEE_RATE = 0.03; // 3%
const DAILY_YIELD_RATE = 0.037; // 3.7%
const TASKS_PER_DAY = 5;

interface TransactionRequest {
  id: string;
  agent_id?: string;
  type: 'deposit' | 'withdrawal' | 'registration';
  method: 'telebirr' | 'cbe';
  amount: number;
  fee_amount?: number;
  net_amount?: number;
  remaining_balance?: number | null;
  status: 'pending' | 'approved' | 'rejected';
  sender_or_receiver_number: string;
  transaction_ref?: string;
  receipt_url?: string;
  created_at: string;
  super_agent_name: string;
  tier?: string;
  balance_applied?: boolean;
}

interface SuperAgentNode {
  id: string;
  name: string;
  tier: string;
  region: string;
  phone?: string;
  telebirr_account?: string;
  cbe_account?: string;
}

interface DateGroup<T> {
  dateKey: string;
  dateLabel: string;
  sortTimestamp: number;
  items: T[];
}

function cleanId(val: unknown): string {
  return typeof val === 'string' ? val.replace(/[()]/g, '').trim() : '';
}

function parseNum(val: unknown): number {
  if (typeof val === 'number') return Number.isFinite(val) ? val : 0;
  if (typeof val === 'string') {
    const cleaned = val.replace(/[^0-9.-]+/g, '');
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function roundMoney(val: number): number {
  return Number((Number.isFinite(val) ? val : 0).toFixed(2));
}

function getLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const MARKETPLACE_TIERS: Record<
  string,
  { id: string; name: string; tierLabel: string; fee: number; maxTasks: number; taskYieldNum: number }
> = {
  Electronics: {
    id: 'Electronics',
    name: 'Electronics',
    tierLabel: 'Tier 1',
    fee: 10500,
    maxTasks: TASKS_PER_DAY,
    taskYieldNum: roundMoney((10500 * DAILY_YIELD_RATE) / TASKS_PER_DAY),
  },
  Furniture: {
    id: 'Furniture',
    name: 'Furniture',
    tierLabel: 'Tier 2',
    fee: 24000,
    maxTasks: TASKS_PER_DAY,
    taskYieldNum: roundMoney((24000 * DAILY_YIELD_RATE) / TASKS_PER_DAY),
  },
  'Solar Systems': {
    id: 'Solar Systems',
    name: 'Solar Systems',
    tierLabel: 'Tier 3',
    fee: 43000,
    maxTasks: TASKS_PER_DAY,
    taskYieldNum: roundMoney((43000 * DAILY_YIELD_RATE) / TASKS_PER_DAY),
  },
  'EV Bikes & Tuk-Tuks': {
    id: 'EV Bikes & Tuk-Tuks',
    name: 'EV Bikes & Tuk-Tuks',
    tierLabel: 'Tier 4',
    fee: 70000,
    maxTasks: TASKS_PER_DAY,
    taskYieldNum: roundMoney((70000 * DAILY_YIELD_RATE) / TASKS_PER_DAY),
  },
  'Real Estate': {
    id: 'Real Estate',
    name: 'Real Estate',
    tierLabel: 'Tier 5',
    fee: 110000,
    maxTasks: TASKS_PER_DAY,
    taskYieldNum: roundMoney((110000 * DAILY_YIELD_RATE) / TASKS_PER_DAY),
  },
};

const DB_TIER_ALIASES: Record<string, string> = {
  'tier 1': 'Electronics',
  'tier 2': 'Furniture',
  'tier 3': 'Solar Systems',
  'tier 4': 'EV Bikes & Tuk-Tuks',
  'tier 5': 'Real Estate',
  'vip 1': 'Electronics',
  'vip 2': 'Furniture',
  'vip 3': 'Solar Systems',
  'vip 4': 'EV Bikes & Tuk-Tuks',
  'vip 5': 'Real Estate',
  electronics: 'Electronics',
  furniture: 'Furniture',
  'solar systems': 'Solar Systems',
  'ev bikes & tuk-tuks': 'EV Bikes & Tuk-Tuks',
  'real estate': 'Real Estate',
};

function resolveCategory(rawTier?: string | null): string {
  const normalized = (rawTier || 'Furniture').toLowerCase().trim();
  if (DB_TIER_ALIASES[normalized]) return DB_TIER_ALIASES[normalized];
  if (normalized.includes('electronics')) return 'Electronics';
  if (normalized.includes('furniture')) return 'Furniture';
  if (normalized.includes('solar')) return 'Solar Systems';
  if (normalized.includes('ev') || normalized.includes('bike')) return 'EV Bikes & Tuk-Tuks';
  if (normalized.includes('real estate')) return 'Real Estate';
  return 'Furniture';
}

function getDateGroupInfo(isoString?: string | null): {
  dateKey: string;
  dateLabel: string;
  dayStartTimestamp: number;
} {
  if (!isoString) {
    return {
      dateKey: 'no-date',
      dateLabel: 'No Date Recorded',
      dayStartTimestamp: 0,
    };
  }

  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) {
    return {
      dateKey: 'no-date',
      dateLabel: 'No Date Recorded',
      dayStartTimestamp: 0,
    };
  }

  const year = d.getFullYear();
  const month = d.getMonth();
  const day = d.getDate();

  const dayStart = new Date(year, month, day, 0, 0, 0, 0);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const yesterdayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - 1,
    0,
    0,
    0,
    0
  );

  const dateKey = getLocalDateKey(dayStart);

  const formattedFullDate = dayStart.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  if (dayStart.getTime() === todayStart.getTime()) {
    return {
      dateKey,
      dateLabel: `Today • ${formattedFullDate}`,
      dayStartTimestamp: dayStart.getTime(),
    };
  }

  if (dayStart.getTime() === yesterdayStart.getTime()) {
    return {
      dateKey,
      dateLabel: `Yesterday • ${formattedFullDate}`,
      dayStartTimestamp: dayStart.getTime(),
    };
  }

  return {
    dateKey,
    dateLabel: formattedFullDate,
    dayStartTimestamp: dayStart.getTime(),
  };
}

function groupTransactionsByDate(items: TransactionRequest[]): DateGroup<TransactionRequest>[] {
  const map = new Map<string, DateGroup<TransactionRequest>>();

  for (const item of items) {
    const { dateKey, dateLabel, dayStartTimestamp } = getDateGroupInfo(item.created_at);
    const existing = map.get(dateKey);
    if (existing) {
      existing.items.push(item);
    } else {
      map.set(dateKey, {
        dateKey,
        dateLabel,
        sortTimestamp: dayStartTimestamp,
        items: [item],
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    if (a.dateKey === 'no-date') return 1;
    if (b.dateKey === 'no-date') return -1;
    return b.sortTimestamp - a.sortTimestamp;
  });
}

function renderStatusBadge(status: TransactionRequest['status']) {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'approved') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle2 size={11} /> Approved
      </span>
    );
  }
  if (normalized === 'rejected') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
        <XCircle size={11} /> Rejected
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
      <Clock size={11} /> Pending
    </span>
  );
}

export default function WalletPage() {
  const { timeUntilReset } = useFGGSystem();
  const [isMounted, setIsMounted] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'deposit' | 'withdrawal'>('deposit');
  const [method, setMethod] = useState<'telebirr' | 'cbe'>('telebirr');
  const [amount, setAmount] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [transactionRef, setTransactionRef] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  const [superAgentsPool, setSuperAgentsPool] = useState<SuperAgentNode[]>([]);
  const [assignedNode, setAssignedNode] = useState<SuperAgentNode | null>(null);
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [requests, setRequests] = useState<TransactionRequest[]>([]);

  const [agentCategory, setAgentCategory] = useState<string>('Furniture');
  const [dbCapital, setDbCapital] = useState<number>(24000);
  const [dbEarnings, setDbEarnings] = useState<number>(0);
  const [referralProfitEarned, setReferralProfitEarned] = useState<number>(0);
  const [tasksCompletedToday, setTasksCompletedToday] = useState<number>(0);
  const [currentUserId, setCurrentUserId] = useState<string>('');

  const formRef = useRef<HTMLDivElement>(null);

  const showToast = useCallback((msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  }, []);

  const fetchData = useCallback(
    async (manualRefresh = false) => {
      if (manualRefresh) setIsRefreshing(true);

      try {
        const { data: authData } = await supabase.auth.getUser();
        const userId = cleanId(authData?.user?.id || '');
        setCurrentUserId(userId);

        if (!userId) {
          setRequests([]);
          setDbEarnings(0);
          setReferralProfitEarned(0);
          setTasksCompletedToday(0);
          return;
        }

        const [txRes, agentRes, refCommRes, taskRes] = await Promise.all([
          supabase
            .from('transaction_requests')
            .select('*')
            .eq('agent_id', userId)
            .order('created_at', { ascending: false }),
          supabase
            .from('agents')
            .select('id, tier, capital_balance, balance')
            .eq('id', userId)
            .maybeSingle(),
          supabase
            .from('referral_commissions')
            .select('commission_amount')
            .eq('referrer_id', userId),
          supabase
            .from('agent_daily_tasks')
            .select('completed_count')
            .eq('agent_id', userId)
            .eq('task_date', getLocalDateKey())
            .maybeSingle(),
        ]);

        const txList = !txRes.error && txRes.data ? (txRes.data as TransactionRequest[]) : [];
        const agentData = !agentRes.error ? agentRes.data : null;

        let refProfitTotal = 0;
        if (!refCommRes.error && refCommRes.data && refCommRes.data.length > 0) {
          refProfitTotal = roundMoney(
            refCommRes.data.reduce(
              (sum: number, row: any) => sum + parseNum(row.commission_amount),
              0
            )
          );
        }

        setReferralProfitEarned(refProfitTotal);
        setTasksCompletedToday(
          !taskRes.error ? Number(taskRes.data?.completed_count ?? 0) : 0
        );

        const authoritativeBalance = roundMoney(
          agentData?.balance != null && !Number.isNaN(Number(agentData.balance))
            ? parseNum(agentData.balance)
            : 0
        );

        const activeTierRaw = agentData?.tier || 'Furniture';

        setRequests(txList);

        const category = resolveCategory(activeTierRaw);
        const tierConfig = MARKETPLACE_TIERS[category] || MARKETPLACE_TIERS.Furniture;
        setAgentCategory(category);
        setDbCapital(tierConfig.fee);
        setDbEarnings(authoritativeBalance);
      } finally {
        setIsDataLoaded(true);
        if (manualRefresh) {
          setIsRefreshing(false);
          showToast('Wallet balances & transactions updated.');
        }
      }
    },
    [showToast]
  );

  const fetchInitialData = useCallback(async () => {
    const { data: nodesData } = await supabase.from('super_agents').select('*');
    if (nodesData && nodesData.length > 0) {
      setSuperAgentsPool(nodesData as SuperAgentNode[]);
      const randomIndex = Math.floor(Math.random() * nodesData.length);
      setAssignedNode(nodesData[randomIndex] as SuperAgentNode);
    } else {
      const fallbackNode: SuperAgentNode = {
        id: 'sa-default',
        name: 'Central Escrow Node',
        tier: 'Furniture',
        region: 'Addis Ababa',
        phone: '0911223344',
        telebirr_account: '0911223344',
        cbe_account: '1000293848592',
      };
      setSuperAgentsPool([fallbackNode]);
      setAssignedNode(fallbackNode);
    }

    await fetchData();
  }, [fetchData]);

  useEffect(() => {
    setIsMounted(true);
    fetchInitialData();
  }, [fetchInitialData]);

  useEffect(() => {
    const channel = supabase
      .channel('wallet-realtime-strict-v32')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transaction_requests' },
        () => fetchData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'agents' },
        () => fetchData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'referral_commissions' },
        () => fetchData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'agent_daily_tasks' },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  const handleFileUpload = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `receipts/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(filePath, file);

      if (uploadError) return null;

      const { data } = supabase.storage.from('receipts').getPublicUrl(filePath);
      return data.publicUrl;
    } catch {
      return null;
    }
  };

  const activeTierConfig = MARKETPLACE_TIERS[agentCategory] || MARKETPLACE_TIERS.Furniture;
  const todayTaskYieldEarned = roundMoney(tasksCompletedToday * activeTierConfig.taskYieldNum);
  const withdrawableProfit = Math.max(0, roundMoney(dbEarnings));
  const totalAccountValue = roundMoney(dbCapital + withdrawableProfit);

  const groupedRequests = useMemo(() => groupTransactionsByDate(requests), [requests]);

  const numericInputAmount = Number(amount) || 0;
  const withdrawalFeeAmount = Number((numericInputAmount * WITHDRAWAL_FEE_RATE).toFixed(2));
  const netWithdrawalPayout = Number((numericInputAmount - withdrawalFeeAmount).toFixed(2));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || !assignedNode) return;

    const { data: authData } = await supabase.auth.getUser();
    const activeUserId = cleanId(authData?.user?.id || currentUserId);
    if (!activeUserId) {
      showToast('Please sign in before submitting a transaction.');
      return;
    }

    const parsedAmount = Number(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      showToast('Please enter a valid amount.');
      return;
    }

    const trimmedAccount = accountNumber.trim();
    if (!trimmedAccount) {
      showToast('Please enter a valid account or phone number.');
      return;
    }

    const feeAmount =
      activeTab === 'withdrawal'
        ? Number((parsedAmount * WITHDRAWAL_FEE_RATE).toFixed(2))
        : 0;
    const netPayout =
      activeTab === 'withdrawal'
        ? Number((parsedAmount - feeAmount).toFixed(2))
        : parsedAmount;

    if (activeTab === 'withdrawal') {
      if (parsedAmount > withdrawableProfit) {
        showToast(
          `Denied: Maximum withdrawable balance is ETB ${withdrawableProfit.toLocaleString()}.`
        );
        return;
      }

      if (netPayout <= 0) {
        showToast('Withdrawal amount is too small after the 3% fee.');
        return;
      }

      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      const recentWithdrawal = requests.find(
        (req) =>
          req.type === 'withdrawal' &&
          (req.status === 'pending' || req.status === 'approved') &&
          new Date(req.created_at).getTime() > oneDayAgo
      );

      if (recentWithdrawal) {
        const lastDate = new Date(recentWithdrawal.created_at).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        });
        showToast(
          `Cooldown Active: Withdrawals are limited to once every 24 hours. Last request was at ${lastDate}.`
        );
        return;
      }
    }

    if (activeTab === 'deposit' && !receiptFile) {
      showToast(
        'Mandatory: Please upload your transfer receipt screenshot proof before requesting a deposit.'
      );
      return;
    }

    setLoading(true);

    try {
      let receiptUrl: string | null = null;
      if (activeTab === 'deposit' && receiptFile) {
        receiptUrl = await handleFileUpload(receiptFile);
        if (!receiptUrl) {
          showToast('Error uploading screenshot receipt proof.');
          return;
        }
      }

      const payload = {
        agent_id: activeUserId,
        super_agent_id: assignedNode.id,
        super_agent_name: assignedNode.name,
        type: activeTab,
        method,
        amount: parsedAmount,
        fee_amount: feeAmount,
        net_amount: netPayout,
        sender_or_receiver_number: trimmedAccount,
        transaction_ref:
          activeTab === 'deposit'
            ? transactionRef.trim() ||
              `TXN-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
            : `WD-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        receipt_url: receiptUrl,
        status: 'pending',
        tier: agentCategory,
      };

      const { error: txError } = await supabase.from('transaction_requests').insert([payload]);

      if (txError) {
        console.error('Supabase Transaction Error:', txError);
        showToast(`Error: ${txError.message}`);
        return;
      }

      showToast(
        activeTab === 'deposit'
          ? `Deposit request of ETB ${parsedAmount.toLocaleString()} submitted successfully.`
          : `Withdrawal of ETB ${parsedAmount.toLocaleString()} submitted (3% fee: ETB ${feeAmount.toLocaleString()}, Net: ETB ${netPayout.toLocaleString()}).`
      );

      setAmount('');
      setAccountNumber('');
      setTransactionRef('');
      setReceiptFile(null);

      if (superAgentsPool.length > 0) {
        const randomIdx = Math.floor(Math.random() * superAgentsPool.length);
        setAssignedNode(superAgentsPool[randomIdx]);
      }

      await fetchData();
    } finally {
      setLoading(false);
    }
  };

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  if (!isMounted) return <div className="min-h-screen bg-[#F5F7FA]" />;

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#0B1B36] font-sans flex selection:bg-[#0B1B36] selection:text-white relative pb-28 lg:pb-0">
      {notification && (
        <div className="fixed bottom-20 lg:bottom-6 right-6 z-50 bg-[#0B1B36] text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-white/20 text-xs font-mono flex items-center gap-3 animate-in fade-in">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
          <span>{notification}</span>
        </div>
      )}

      <Navbar
        activeCategory={agentCategory}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      <main className="flex-1 flex flex-col min-w-0">
        <header className="bg-white/95 backdrop-blur-md border-b border-[#AEB8C4]/40 px-4 sm:px-8 py-3.5 flex items-center justify-between sticky top-0 z-30 font-mono">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 text-[#0B1B36] hover:bg-[#F5F7FA] rounded-xl border border-[#AEB8C4]/30"
            >
              <Menu size={19} />
            </button>
            <div className="text-xs text-[#536171] hidden sm:flex items-center gap-2.5">
              <span className="font-extrabold text-[#0B1B36]">Wallet Ledger &amp; Escrow</span>
              <span className="text-[#AEB8C4]">/</span>
              <span className="inline-flex items-center gap-1.5 text-[#0B1B36] bg-slate-100 border border-slate-300 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Authoritative Ledger Active ({activeTierConfig.tierLabel})
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchData(true)}
              disabled={isRefreshing}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-[#0B1B36] hover:text-white border border-[#AEB8C4]/40 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <Link
              href="/dashboard"
              className="px-3.5 py-1.5 rounded-xl bg-[#0B1B36] text-white text-xs font-bold transition shadow-sm"
            >
              Dashboard
            </Link>
          </div>
        </header>

        <div className="p-4 sm:p-8 space-y-6 max-w-5xl mx-auto w-full">
          <div className="bg-gradient-to-br from-[#0B1B36] via-[#0B1B36] to-[#0E2447] text-white rounded-3xl p-6 sm:p-8 border border-white/10 shadow-xl space-y-6 font-mono">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <div className="text-[10px] text-white/70 uppercase tracking-widest font-bold">
                  Escrow Treasury &amp; Ledger ({activeTierConfig.tierLabel}: {agentCategory}) • Reset
                  in {timeUntilReset}
                </div>
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight mt-1">
                  Agent Financial Terminal
                </h1>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('deposit');
                    scrollToForm();
                  }}
                  className="px-4 py-2.5 rounded-xl bg-white text-[#0B1B36] hover:bg-[#AEB8C4] transition text-xs font-extrabold cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <ArrowDownLeft size={14} /> Deposit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('withdrawal');
                    scrollToForm();
                  }}
                  className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/25 transition text-xs font-extrabold cursor-pointer flex items-center gap-1.5 border border-white/20"
                >
                  <ArrowUpRight size={14} /> Withdraw
                </button>
              </div>
            </div>

            {!isDataLoaded ? (
              <div className="py-8 flex items-center justify-center text-xs text-white/70 gap-2">
                <Loader2 size={16} className="animate-spin" /> Loading Ledger Balances...
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-white/10">
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-1">
                  <div className="text-[10px] text-[#AEB8C4] uppercase font-bold">
                    Locked Tier Capital ({activeTierConfig.tierLabel})
                  </div>
                  <div className="text-xl font-extrabold text-white">
                    ETB {dbCapital.toLocaleString()}
                  </div>
                </div>
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-1">
                  <div className="text-[10px] text-[#AEB8C4] uppercase font-bold">
                    Withdrawable Balance
                  </div>
                  <div className="text-xl font-extrabold text-emerald-400">
                    ETB {withdrawableProfit.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-white/60">
                    Referral (7%): ETB {referralProfitEarned.toFixed(2)} • Tasks:{' '}
                    {tasksCompletedToday}/{activeTierConfig.maxTasks} (+ETB{' '}
                    {todayTaskYieldEarned.toFixed(2)})
                  </div>
                </div>
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-1">
                  <div className="text-[10px] text-[#AEB8C4] uppercase font-bold">
                    Total Portfolio Value
                  </div>
                  <div className="text-xl font-extrabold text-blue-300">
                    ETB {totalAccountValue.toLocaleString()}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div
            ref={formRef}
            className="bg-white rounded-3xl p-6 sm:p-8 border border-[#AEB8C4]/40 shadow-xs space-y-6 font-mono"
          >
            <div className="flex border-b border-[#AEB8C4]/30 pb-4 gap-6">
              <button
                type="button"
                onClick={() => setActiveTab('deposit')}
                className={`pb-2 text-xs sm:text-sm font-extrabold uppercase transition border-b-2 cursor-pointer ${
                  activeTab === 'deposit'
                    ? 'border-[#0B1B36] text-[#0B1B36]'
                    : 'border-transparent text-[#536171]'
                }`}
              >
                Request Deposit
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('withdrawal')}
                className={`pb-2 text-xs sm:text-sm font-extrabold uppercase transition border-b-2 cursor-pointer ${
                  activeTab === 'withdrawal'
                    ? 'border-[#0B1B36] text-[#0B1B36]'
                    : 'border-transparent text-[#536171]'
                }`}
              >
                Request Withdrawal
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-[#536171] uppercase tracking-wider text-[10px]">
                  Select Payment Gateway
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setMethod('telebirr')}
                    className={`p-3.5 rounded-2xl border font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                      method === 'telebirr'
                        ? 'bg-[#0B1B36] text-white border-[#0B1B36]'
                        : 'bg-[#F5F7FA] text-[#0B1B36] border-[#AEB8C4]/40'
                    }`}
                  >
                    <Smartphone size={16} /> Telebirr
                  </button>
                  <button
                    type="button"
                    onClick={() => setMethod('cbe')}
                    className={`p-3.5 rounded-2xl border font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                      method === 'cbe'
                        ? 'bg-[#0B1B36] text-white border-[#0B1B36]'
                        : 'bg-[#F5F7FA] text-[#0B1B36] border-[#AEB8C4]/40'
                    }`}
                  >
                    <Building2 size={16} /> Commercial Bank of Ethiopia
                  </button>
                </div>
              </div>

              {assignedNode && activeTab === 'deposit' && (
                <div className="p-4 rounded-2xl bg-[#F5F7FA] border border-[#AEB8C4]/30 text-[11px] text-[#536171] space-y-1">
                  <div className="font-bold text-[#0B1B36]">
                    Assigned Escrow Node ({assignedNode.name}):
                  </div>
                  <div>
                    {method === 'telebirr'
                      ? `Account: ${
                          assignedNode.telebirr_account || assignedNode.phone || '0911223344'
                        }`
                      : `Account: ${assignedNode.cbe_account || '1000293848592'}`}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-[#536171] uppercase text-[10px]">
                    Amount (ETB)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    max={activeTab === 'withdrawal' ? withdrawableProfit : undefined}
                    placeholder="e.g. 500"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-[#F5F7FA] border border-[#AEB8C4]/50 focus:outline-none focus:border-[#0B1B36] font-bold text-xs"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-[#536171] uppercase text-[10px]">
                    {method === 'telebirr' ? 'Telebirr Number' : 'CBE Account Number'}
                  </label>
                  <input
                    type="text"
                    placeholder={method === 'telebirr' ? '09xxxxxxxx' : '1000xxxxxxxx'}
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-[#F5F7FA] border border-[#AEB8C4]/50 focus:outline-none focus:border-[#0B1B36] font-bold text-xs"
                    required
                  />
                </div>
              </div>

              {activeTab === 'deposit' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-bold text-[#536171] uppercase text-[10px]">
                      Transaction Reference (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. FT26323..."
                      value={transactionRef}
                      onChange={(e) => setTransactionRef(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-[#F5F7FA] border border-[#AEB8C4]/50 focus:outline-none focus:border-[#0B1B36] font-bold text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-[#536171] uppercase text-[10px]">
                      Payment Receipt Screenshot *
                    </label>
                    <label className="w-full px-4 py-3 rounded-xl bg-[#F5F7FA] border border-dashed border-[#AEB8C4] hover:border-[#0B1B36] flex items-center justify-center gap-2 cursor-pointer font-bold text-[11px] text-[#536171] transition">
                      <Upload size={14} />
                      <span className="truncate">
                        {receiptFile
                          ? receiptFile.name
                          : 'Upload receipt image (PNG/JPG)'}
                      </span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-[#F5F7FA] border border-[#AEB8C4]/30 flex flex-wrap items-center justify-between gap-3 text-[11px]">
                  <div>
                    <span className="text-[#536171]">3% Withdrawal Fee: </span>
                    <strong className="text-[#0B1B36]">
                      ETB {withdrawalFeeAmount.toLocaleString()}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[#536171]">Estimated Net Payout: </span>
                    <strong className="text-emerald-700">
                      ETB {Math.max(0, netWithdrawalPayout).toLocaleString()}
                    </strong>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-2xl bg-[#0B1B36] hover:bg-[#132C56] disabled:opacity-60 text-white font-extrabold uppercase tracking-wider text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                {loading ? (
                  <>
                    <Loader2 size={15} className="animate-spin" /> Submitting...
                  </>
                ) : activeTab === 'deposit' ? (
                  'Submit Deposit Request'
                ) : (
                  'Submit Withdrawal Request'
                )}
              </button>
            </form>
          </div>

          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#AEB8C4]/40 shadow-xs space-y-5 font-mono">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-[#0B1B36]">
                Transaction History ({requests.length})
              </h2>
            </div>

            {groupedRequests.length === 0 ? (
              <div className="py-10 text-center text-xs text-[#536171]">
                No transactions recorded yet.
              </div>
            ) : (
              <div className="space-y-6">
                {groupedRequests.map((group) => (
                  <div key={group.dateKey} className="space-y-2.5">
                    <div className="flex items-center gap-2 text-[11px] font-bold text-[#536171] uppercase tracking-wider">
                      <Calendar size={13} />
                      <span>{group.dateLabel}</span>
                    </div>

                    <div className="divide-y divide-[#AEB8C4]/25 border border-[#AEB8C4]/35 rounded-2xl overflow-hidden">
                      {group.items.map((tx) => (
                        <div
                          key={tx.id}
                          className="p-4 bg-white hover:bg-[#F5F7FA]/70 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                        >
                          <div className="space-y-1">
                            <div className="font-extrabold uppercase text-[#0B1B36]">
                              {tx.type} • {tx.method}
                            </div>
                            <div className="text-[11px] text-[#536171]">
                              Account: {tx.sender_or_receiver_number} • Node: {tx.super_agent_name}
                            </div>
                            {tx.receipt_url && (
                              <a
                                href={tx.receipt_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:underline"
                              >
                                View Receipt <ExternalLink size={11} />
                              </a>
                            )}
                          </div>

                          <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1.5">
                            <div className="font-extrabold text-sm text-[#0B1B36]">
                              ETB {parseNum(tx.amount).toLocaleString()}
                            </div>
                            {renderStatusBadge(tx.status)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <MobileBottomNav />
    </div>
  );
}