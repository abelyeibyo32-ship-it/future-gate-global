// src/app/admin/page.tsx
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users,
  UserCheck,
  Award,
  Plus,
  Search,
  Check,
  Ban,
  RefreshCw,
  X,
  TrendingUp,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Wallet,
  Layers,
  Pencil,
  Trash2,
  KeyRound,
  Eye,
  EyeOff,
  RotateCcw
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface UserRecord {
  id: string;
  username: string;
  role: 'normal_agent' | 'super_agent' | 'ambassador';
  status: string;
  created_at: string;
  custom_ref_code?: string;
  phone_number?: string;
  payout_bank_account?: string;
  total_bounty_earned?: number;
  has_password?: boolean;
}

interface TransactionRecord {
  id: string;
  user_handle: string;
  type: string;
  amount: number;
  channel: string;
  status: string;
  super_agent: string;
  super_agent_code: string;
  tier: string;
  tx_date: string;
  timestamp: string;
}

interface FinancialMetrics {
  totalCapitalInjected: number;
  dailyPayoutCommitment: number;
  totalBountyPaid: number;
  netPlatformLiquidity: number;
}

type GroupByMode = 'date' | 'super_agent' | 'tier';
type ManagedRole = 'ambassador' | 'super_agent';

interface NodeFormState {
  username: string;
  full_name: string;
  ref_code: string;
  phone_number: string;
  payout_bank_account: string;
  password: string;
  status: 'active' | 'suspended';
}

const EMPTY_FORM: NodeFormState = {
  username: '',
  full_name: '',
  ref_code: '',
  phone_number: '',
  payout_bank_account: '',
  password: '',
  status: 'active',
};

export default function MasterAdminDashboard() {
  const [activeTab, setActiveTab] = useState<'financials' | 'agents' | 'super_agents' | 'ambassadors'>('financials');
  const [groupBy, setGroupBy] = useState<GroupByMode>('date');
  const [selectedSuperAgent, setSelectedSuperAgent] = useState<string>('ALL');
  const [selectedTier, setSelectedTier] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const [activeWindow, setActiveWindow] = useState<boolean>(true);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [modalRole, setModalRole] = useState<ManagedRole>('ambassador');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formState, setFormState] = useState<NodeFormState>(EMPTY_FORM);
  const [showPasswordField, setShowPasswordField] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [financials, setFinancials] = useState<FinancialMetrics>({
    totalCapitalInjected: 0,
    dailyPayoutCommitment: 0,
    totalBountyPaid: 0,
    netPlatformLiquidity: 0,
  });

  const syncEatWindow = useCallback(() => {
    const eatDay = new Date(
      new Date().toLocaleString('en-US', { timeZone: 'Africa/Addis_Ababa' })
    ).getDay();
    setActiveWindow(eatDay >= 1 && eatDay <= 6); // Monday (1) through Saturday (6)
  }, []);

  const toEatDateString = (isoOrDateStr: string) => {
    const parsed = new Date(isoOrDateStr);
    if (Number.isNaN(parsed.getTime())) {
      return new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Addis_Ababa' });
    }
    return parsed.toLocaleDateString('en-CA', { timeZone: 'Africa/Addis_Ababa' });
  };

  const normalizeChannel = (rawChannel?: string) => {
    const lower = String(rawChannel ?? 'Telebirr P2P').toLowerCase();
    return lower.includes('cbe') ? 'Commercial Bank of Ethiopia (CBE)' : 'Telebirr P2P';
  };

  const normalizeTransaction = useCallback(
    (
      row: any,
      idx: number,
      fallbackSaName?: string,
      fallbackSaCode?: string
    ): TransactionRecord => {
      const rawTs = String(row.created_at ?? row.timestamp ?? row.date ?? new Date().toISOString());
      const eatDateStr = row.tx_date ? String(row.tx_date) : toEatDateString(rawTs);
      const saLabel = String(
        row.super_agent ?? row.super_agent_name ?? fallbackSaName ?? 'Unassigned'
      );
      const saCode = String(
        row.super_agent_code ?? row.referral_code ?? fallbackSaCode ?? saLabel
      );

      return {
        id: String(row.id ?? row.tx_id ?? `TX-${idx + 1}`),
        user_handle: String(row.user_handle ?? row.username ?? row.agent_name ?? saLabel),
        type: String(row.tx_type ?? row.type ?? 'Super Agent Settlement'),
        amount: Number(row.amount ?? 0),
        channel: normalizeChannel(row.channel ?? row.payment_method),
        status: String(row.status ?? 'completed'),
        super_agent: saLabel,
        super_agent_code: saCode,
        tier: String(row.tier ?? row.tier_name ?? 'Super Agent'),
        tx_date: eatDateStr,
        timestamp: rawTs,
      };
    },
    []
  );

  const extractHistoryFromSuperAgents = useCallback(
    (saRows: any[]): TransactionRecord[] => {
      const sevenDaysAgoMs = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const extracted: TransactionRecord[] = [];

      for (const sa of saRows) {
        const saName = String(
          sa.username ?? sa.name ?? sa.full_name ?? sa.super_agent_code ?? sa.id ?? 'Super Agent'
        );
        const saCode = String(sa.super_agent_code ?? sa.referral_code ?? saName);

        const candidateArrays = [
          sa.transactions,
          sa.history,
          sa.payout_history,
          sa.transaction_history,
          sa.logs,
        ];

        for (const candidate of candidateArrays) {
          let entries: any[] = [];
          if (Array.isArray(candidate)) {
            entries = candidate;
          } else if (typeof candidate === 'string' && candidate.trim().startsWith('[')) {
            try {
              const parsed = JSON.parse(candidate);
              if (Array.isArray(parsed)) entries = parsed;
            } catch {
              // ignore malformed JSON string
            }
          }

          entries.forEach((entry, index) => {
            if (!entry || typeof entry !== 'object') return;
            const norm = normalizeTransaction(entry, extracted.length + index, saName, saCode);
            const entryTime = new Date(norm.timestamp).getTime();
            if (Number.isNaN(entryTime) || entryTime >= sevenDaysAgoMs) {
              extracted.push(norm);
            }
          });
        }
      }

      return extracted;
    },
    [normalizeTransaction]
  );

  const fetchData = useCallback(async () => {
    syncEatWindow();
    setLoading(true);
    try {
      const [{ data: userData, error: userError }, { data: ambRows }] = await Promise.all([
        supabase.from('admin_user_overview').select('*').order('created_at', { ascending: false }),
        supabase.from('ambassadors').select('*'),
      ]);

      const ambMap = new Map<string, any>();
      if (Array.isArray(ambRows)) {
        ambRows.forEach((row: any) => {
          if (row?.id) ambMap.set(String(row.id), row);
        });
      }

      if (userError) {
        console.error('Error fetching admin_user_overview:', userError);
      } else if (userData) {
        const enriched = (userData as UserRecord[]).map((u) => {
          if (u.role !== 'ambassador') return u;
          const ambRow = ambMap.get(String(u.id));
          return {
            ...u,
            phone_number: ambRow?.phone_number ?? ambRow?.phone ?? '',
            payout_bank_account:
              ambRow?.payout_bank_account ?? ambRow?.payout_account ?? ambRow?.bank_account ?? '',
            total_bounty_earned: Number(ambRow?.total_bounty_earned ?? 0),
            has_password: Boolean(ambRow?.password_hash && String(ambRow.password_hash).trim() !== ''),
          };
        });
        setUsers(enriched);
      }

      const { data: finData, error: finError } = await supabase
        .from('admin_financial_overview')
        .select('*')
        .maybeSingle();

      if (finError) {
        console.error('Error fetching admin_financial_overview:', finError);
      }

      const totalCapital = Number(finData?.total_capital_injected ?? 0);
      const dailyPayout = Number(finData?.estimated_daily_payout ?? 0);
      const totalBounty = Number(finData?.total_bounties_paid ?? 0);

      setFinancials({
        totalCapitalInjected: totalCapital,
        dailyPayoutCommitment: dailyPayout,
        totalBountyPaid: totalBounty,
        netPlatformLiquidity: totalCapital - totalBounty,
      });

      const mergedMap = new Map<string, TransactionRecord>();

      const { data: weeklyData, error: weeklyError } = await supabase
        .from('admin_weekly_transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (!weeklyError && Array.isArray(weeklyData)) {
        weeklyData.forEach((row, idx) => {
          const tx = normalizeTransaction(row, idx);
          mergedMap.set(tx.id, tx);
        });
      }

      const { data: saRows, error: saError } = await supabase.from('super_agents').select('*');

      if (!saError && Array.isArray(saRows)) {
        const fromSa = extractHistoryFromSuperAgents(saRows);
        fromSa.forEach((tx) => {
          if (!mergedMap.has(tx.id)) {
            mergedMap.set(tx.id, tx);
          }
        });
      }

      const combined = Array.from(mergedMap.values()).sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      setTransactions(combined);
    } catch (err) {
      console.error('Unexpected error loading admin telemetry:', err);
    } finally {
      setLoading(false);
    }
  }, [syncEatWindow, normalizeTransaction, extractHistoryFromSuperAgents]);

  useEffect(() => {
    syncEatWindow();
    fetchData();
  }, [syncEatWindow, fetchData]);

  const openCreateModal = (role: ManagedRole) => {
    setModalRole(role);
    setEditingId(null);
    setFormState(EMPTY_FORM);
    setShowPasswordField(false);
    setModalOpen(true);
  };

  const openEditModal = async (user: UserRecord) => {
    if (user.role !== 'ambassador' && user.role !== 'super_agent') return;
    setModalRole(user.role);
    setEditingId(user.id);
    setShowPasswordField(false);

    const tableName = user.role === 'ambassador' ? 'ambassadors' : 'super_agents';
    let baseForm: NodeFormState = {
      username: user.username,
      full_name: user.username,
      ref_code: user.custom_ref_code ?? '',
      phone_number: user.phone_number ?? '',
      payout_bank_account: user.payout_bank_account ?? '',
      password: '',
      status: user.status === 'suspended' ? 'suspended' : 'active',
    };

    try {
      const { data: row } = await supabase.from(tableName).select('*').eq('id', user.id).maybeSingle();
      if (row) {
        baseForm = {
          username: String(row.username ?? row.name ?? user.username),
          full_name: String(row.full_name ?? row.name ?? row.username ?? user.username),
          ref_code: String(
            row.custom_ref_code ?? row.super_agent_code ?? row.referral_code ?? user.custom_ref_code ?? ''
          ),
          phone_number: String(row.phone_number ?? row.phone ?? ''),
          payout_bank_account: String(
            row.payout_bank_account ?? row.payout_account ?? row.bank_account ?? ''
          ),
          password: '',
          status: String(row.status ?? user.status ?? 'active') === 'suspended' ? 'suspended' : 'active',
        };
      }
    } catch {
      // fallback to existing state
    }

    setFormState(baseForm);
    setModalOpen(true);
  };

  const handleSaveNode = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const cleanUsername = formState.username.trim();
      const cleanFullName = formState.full_name.trim() || cleanUsername;
      const cleanCode = formState.ref_code.trim().toUpperCase();
      const cleanPhone = formState.phone_number.trim();
      const cleanPayout = formState.payout_bank_account.trim();
      const cleanPassword = formState.password;

      if (modalRole === 'ambassador') {
        if (!editingId && !cleanPassword.trim()) {
          alert('Please set a login password for the new ambassador.');
          setSubmitting(false);
          return;
        }

        const payload: Record<string, any> = {
          username: cleanUsername,
          full_name: cleanFullName,
          custom_ref_code: cleanCode,
          phone_number: cleanPhone,
          payout_bank_account: cleanPayout,
          status: formState.status,
        };

        if (cleanPassword.trim() !== '') {
          payload.password_hash = cleanPassword;
        }

        if (editingId) {
          const { error } = await supabase.from('ambassadors').update(payload).eq('id', editingId);
          if (error) {
            alert(`Failed to update ambassador: ${error.message}`);
            return;
          }
          alert(`Updated ambassador @${cleanUsername}.`);
        } else {
          const { error } = await supabase.from('ambassadors').insert([payload]);
          if (error) {
            alert(`Failed to register ambassador: ${error.message}`);
            return;
          }
          alert(`Registered ambassador @${cleanUsername} [${cleanCode}] with phone login!`);
        }
      } else {
        const payload: Record<string, any> = {
          username: cleanUsername,
          name: cleanFullName,
          super_agent_code: cleanCode,
          phone_number: cleanPhone,
          payout_bank_account: cleanPayout,
          status: formState.status,
        };

        if (editingId) {
          const { error } = await supabase.from('super_agents').update(payload).eq('id', editingId);
          if (error) {
            alert(`Failed to update super agent: ${error.message}`);
            return;
          }
          alert(`Updated super agent @${cleanUsername}.`);
        } else {
          const { error } = await supabase.from('super_agents').insert([payload]);
          if (error) {
            alert(`Failed to register super agent: ${error.message}`);
            return;
          }
          alert(`Registered super agent @${cleanUsername} [${cleanCode}]!`);
        }
      }

      setModalOpen(false);
      setEditingId(null);
      setFormState(EMPTY_FORM);
      fetchData();
    } catch (err: any) {
      alert(`An error occurred: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (user: UserRecord) => {
    if (user.role !== 'ambassador' && user.role !== 'super_agent') return;

    const label = user.role === 'ambassador' ? 'Ambassador' : 'Super Agent';
    const confirmed = window.confirm(
      `Delete ${label} @${user.username}? This permanently removes their record.`
    );
    if (!confirmed) return;

    setDeletingId(user.id);
    try {
      const tableName = user.role === 'ambassador' ? 'ambassadors' : 'super_agents';
      const { error } = await supabase.from(tableName).delete().eq('id', user.id);

      if (error) {
        alert(`Failed to delete ${label.toLowerCase()}: ${error.message}`);
        return;
      }

      fetchData();
    } catch (err: any) {
      alert(`Error deleting record: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const handleStatusUpdate = async (user: UserRecord, nextStatus: 'active' | 'suspended') => {
    try {
      const targetTable =
        user.role === 'ambassador'
          ? 'ambassadors'
          : user.role === 'super_agent'
          ? 'super_agents'
          : 'agents';

      const { error } = await supabase
        .from(targetTable)
        .update({ status: nextStatus })
        .eq('id', user.id);

      if (error) {
        alert(`Could not update status: ${error.message}`);
        return;
      }

      fetchData();
    } catch (err: any) {
      alert(`Error updating status: ${err.message}`);
    }
  };

  const resetTransactionFilters = () => {
    setSelectedSuperAgent('ALL');
    setSelectedTier('ALL');
    setSearchTerm('');
  };

  const hasActiveTxFilters =
    selectedSuperAgent !== 'ALL' || selectedTier !== 'ALL' || searchTerm.trim() !== '';

  const superAgentOptions = useMemo(() => {
    const set = new Set<string>(['ALL']);
    transactions.forEach((tx) => {
      if (tx.super_agent) set.add(tx.super_agent);
    });
    return Array.from(set);
  }, [transactions]);

  const tierOptions = useMemo(() => {
    const set = new Set<string>(['ALL']);
    transactions.forEach((tx) => {
      if (tx.tier) set.add(tx.tier);
    });
    return Array.from(set);
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    const query = searchTerm.toLowerCase();
    return transactions.filter((tx) => {
      const matchesSuperAgent =
        selectedSuperAgent === 'ALL' || tx.super_agent === selectedSuperAgent;
      const matchesTier = selectedTier === 'ALL' || tx.tier === selectedTier;
      const matchesSearch =
        tx.user_handle.toLowerCase().includes(query) ||
        tx.type.toLowerCase().includes(query) ||
        tx.channel.toLowerCase().includes(query) ||
        tx.super_agent.toLowerCase().includes(query) ||
        tx.super_agent_code.toLowerCase().includes(query) ||
        tx.tier.toLowerCase().includes(query) ||
        tx.id.toLowerCase().includes(query);

      return matchesSuperAgent && matchesTier && matchesSearch;
    });
  }, [transactions, selectedSuperAgent, selectedTier, searchTerm]);

  const groupedTransactions = useMemo(() => {
    const groupsMap = new Map<
      string,
      { key: string; label: string; totalAmount: number; items: TransactionRecord[] }
    >();

    for (const tx of filteredTransactions) {
      const groupKey =
        groupBy === 'date'
          ? tx.tx_date
          : groupBy === 'super_agent'
          ? `${tx.super_agent} (${tx.super_agent_code})`
          : tx.tier || 'Standard';

      const existing = groupsMap.get(groupKey);
      if (existing) {
        existing.totalAmount += tx.amount;
        existing.items.push(tx);
      } else {
        groupsMap.set(groupKey, {
          key: groupKey,
          label: groupKey,
          totalAmount: tx.amount,
          items: [tx],
        });
      }
    }

    const list = Array.from(groupsMap.values());
    if (groupBy === 'date') {
      return list.sort((a, b) => b.key.localeCompare(a.key));
    }
    return list.sort((a, b) => b.totalAmount - a.totalAmount);
  }, [filteredTransactions, groupBy]);

  const weeklyTotalVolume = useMemo(
    () => filteredTransactions.reduce((sum, tx) => sum + tx.amount, 0),
    [filteredTransactions]
  );

  const filteredUsers = users.filter((u) => {
    const matchesTab =
      activeTab === 'agents'
        ? u.role === 'normal_agent'
        : activeTab === 'super_agents'
        ? u.role === 'super_agent'
        : u.role === 'ambassador';

    const query = searchTerm.toLowerCase();
    const matchesSearch =
      u.username.toLowerCase().includes(query) ||
      (u.custom_ref_code && u.custom_ref_code.toLowerCase().includes(query)) ||
      (u.phone_number && u.phone_number.toLowerCase().includes(query));

    return matchesTab && matchesSearch;
  });

  const normalAgentsCount = users.filter((u) => u.role === 'normal_agent').length;
  const superAgentsCount = users.filter((u) => u.role === 'super_agent').length;
  const ambassadorsCount = users.filter((u) => u.role === 'ambassador').length;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] font-mono p-4 sm:p-8 max-w-7xl mx-auto space-y-8">
      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
            <h1 className="text-2xl font-black text-[#0B1B36]">Master Command Terminal</h1>
            <span
              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                activeWindow
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {activeWindow ? 'Mon–Sat EAT Active Window' : 'Sunday Pause (EAT)'}
            </span>
          </div>
          <p className="text-xs text-slate-500 font-sans mt-1">
            Global oversight for Normal Agents, Super Agents, Ambassadors, and Telebirr P2P / CBE settlements.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={fetchData}
            className="p-3 bg-white border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 transition-all cursor-pointer shadow-xs"
            title="Refresh System Metrics"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin text-blue-600' : ''} />
          </button>

          <button
            onClick={() => openCreateModal('super_agent')}
            className="px-4 py-3 bg-white border border-slate-300 text-[#0B1B36] rounded-xl text-xs font-bold hover:bg-slate-100 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Plus size={15} />
            <span>Register Super Agent</span>
          </button>

          <button
            onClick={() => openCreateModal('ambassador')}
            className="px-4 py-3 bg-[#0B1B36] text-white rounded-xl text-xs font-bold hover:bg-[#152d56] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
          >
            <Plus size={15} />
            <span>Register Ambassador</span>
          </button>
        </div>
      </div>

      {/* GLOBAL FINANCIAL STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Capital Injected</span>
            <Wallet size={18} className="text-blue-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-[#0B1B36]">
            {loading
              ? '--'
              : `ETB ${financials.totalCapitalInjected.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`}
          </div>
          <div className="text-[10px] text-slate-500 font-sans">Cumulative tier buy-in volume</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Estimated Daily Payout</span>
            <Calendar size={18} className="text-amber-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-600">
            {loading
              ? '--'
              : `ETB ${financials.dailyPayoutCommitment.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`}
          </div>
          <div className="text-[10px] text-slate-500 font-sans">Active daily yield obligation (Mon–Sat)</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">7% Ambassador Bounties</span>
            <Award size={18} className="text-purple-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-purple-600">
            {loading
              ? '--'
              : `ETB ${financials.totalBountyPaid.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`}
          </div>
          <div className="text-[10px] text-slate-500 font-sans">Total influencer bounties accrued/paid</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Net Liquidity Balance</span>
            <TrendingUp size={18} className="text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-600">
            {loading
              ? '--'
              : `ETB ${financials.netPlatformLiquidity.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`}
          </div>
          <div className="text-[10px] text-slate-500 font-sans">Telebirr P2P & CBE net position</div>
        </div>
      </div>

      {/* ROLE COUNTS SUMMARY */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          type="button"
          onClick={() => setActiveTab('agents')}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between hover:border-slate-300 transition-all cursor-pointer text-left"
        >
          <div>
            <div className="text-[10px] font-bold uppercase text-slate-400">Normal Agents</div>
            <div className="text-xl font-black text-[#0B1B36]">{loading ? '--' : normalAgentsCount}</div>
          </div>
          <Users size={18} className="text-blue-600" />
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('super_agents')}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between hover:border-slate-300 transition-all cursor-pointer text-left"
        >
          <div>
            <div className="text-[10px] font-bold uppercase text-slate-400">Super Agents</div>
            <div className="text-xl font-black text-[#0B1B36]">{loading ? '--' : superAgentsCount}</div>
          </div>
          <UserCheck size={18} className="text-purple-600" />
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ambassadors')}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between hover:border-slate-300 transition-all cursor-pointer text-left"
        >
          <div>
            <div className="text-[10px] font-bold uppercase text-slate-400">Ambassadors</div>
            <div className="text-xl font-black text-emerald-600">{loading ? '--' : ambassadorsCount}</div>
          </div>
          <Award size={18} className="text-emerald-600" />
        </button>
      </div>

      {/* MAIN CONTROLS & DATA SECTION */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1.5 rounded-xl">
            <button
              onClick={() => setActiveTab('financials')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'financials'
                  ? 'bg-[#0B1B36] text-white shadow-xs'
                  : 'text-slate-600 hover:text-[#0B1B36]'
              }`}
            >
              Past 7d Transactions ({transactions.length})
            </button>
            <button
              onClick={() => setActiveTab('agents')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'agents'
                  ? 'bg-[#0B1B36] text-white shadow-xs'
                  : 'text-slate-600 hover:text-[#0B1B36]'
              }`}
            >
              Normal Agents ({normalAgentsCount})
            </button>
            <button
              onClick={() => setActiveTab('super_agents')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'super_agents'
                  ? 'bg-[#0B1B36] text-white shadow-xs'
                  : 'text-slate-600 hover:text-[#0B1B36]'
              }`}
            >
              Super Agents ({superAgentsCount})
            </button>
            <button
              onClick={() => setActiveTab('ambassadors')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'ambassadors'
                  ? 'bg-[#0B1B36] text-white shadow-xs'
                  : 'text-slate-600 hover:text-[#0B1B36]'
              }`}
            >
              Ambassadors ({ambassadorsCount})
            </button>
          </div>

          <div className="relative w-full lg:w-72">
            <Search size={16} className="absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder={`Search ${activeTab.replace('_', ' ')}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-[#0B1B36]"
            />
          </div>
        </div>

        {activeTab === 'financials' ? (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold uppercase text-slate-500 flex items-center gap-1 mr-1">
                  <Layers size={14} /> Group By:
                </span>
                <button
                  onClick={() => setGroupBy('date')}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    groupBy === 'date'
                      ? 'bg-[#0B1B36] text-white'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Date (EAT)
                </button>
                <button
                  onClick={() => setGroupBy('super_agent')}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    groupBy === 'super_agent'
                      ? 'bg-[#0B1B36] text-white'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Super Agent
                </button>
                <button
                  onClick={() => setGroupBy('tier')}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    groupBy === 'tier'
                      ? 'bg-[#0B1B36] text-white'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Tier
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 text-xs">
                <select
                  value={selectedSuperAgent}
                  onChange={(e) => setSelectedSuperAgent(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-bold text-[11px]"
                >
                  {superAgentOptions.map((sa) => (
                    <option key={sa} value={sa}>
                      {sa === 'ALL' ? 'All Super Agents' : `Super Agent: ${sa}`}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedTier}
                  onChange={(e) => setSelectedTier(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-bold text-[11px]"
                >
                  {tierOptions.map((t) => (
                    <option key={t} value={t}>
                      {t === 'ALL' ? 'All Tiers' : `Tier: ${t}`}
                    </option>
                  ))}
                </select>

                {hasActiveTxFilters && (
                  <button
                    type="button"
                    onClick={resetTransactionFilters}
                    className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-[11px] font-bold text-slate-700 flex items-center gap-1 cursor-pointer"
                    title="Reset Filters"
                  >
                    <RotateCcw size={12} />
                    <span>Reset</span>
                  </button>
                )}

                <div className="text-[11px] font-black text-[#0B1B36] bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                  7d Filtered Volume: ETB{' '}
                  {weeklyTotalVolume.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
              </div>
            </div>

            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400 border border-slate-200 rounded-xl">
                Loading past 7 days of super agent history...
              </div>
            ) : groupedTransactions.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 border border-slate-200 rounded-xl">
                No past-7-day transactions found in super agent records matching your filters.
              </div>
            ) : (
              <div className="space-y-6">
                {groupedTransactions.map((group) => (
                  <div
                    key={group.key}
                    className="border border-slate-200 rounded-xl overflow-hidden"
                  >
                    <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-[#0B1B36]">{group.label}</span>
                        <span className="text-[10px] font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">
                          {group.items.length} {group.items.length === 1 ? 'tx' : 'txs'}
                        </span>
                      </div>
                      <div className="text-xs font-black text-emerald-700">
                        Subtotal: ETB{' '}
                        {group.totalAmount.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs font-sans">
                        <thead className="bg-white border-b border-slate-100 font-mono text-[10px] uppercase text-slate-400 font-bold">
                          <tr>
                            <th className="p-3.5">Tx Reference</th>
                            <th className="p-3.5">Member Handle</th>
                            <th className="p-3.5">Super Agent / Code</th>
                            <th className="p-3.5">Tier</th>
                            <th className="p-3.5">Category</th>
                            <th className="p-3.5">Payment Rail</th>
                            <th className="p-3.5">Amount</th>
                            <th className="p-3.5 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono">
                          {group.items.map((tx) => (
                            <tr key={tx.id} className="hover:bg-slate-50/60">
                              <td className="p-3.5 font-bold text-[#0B1B36]">
                                {tx.id}
                                <div className="text-[10px] text-slate-400 font-sans">
                                  {tx.tx_date} ·{' '}
                                  {new Date(tx.timestamp).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </div>
                              </td>
                              <td className="p-3.5 font-bold text-slate-700">@{tx.user_handle}</td>
                              <td className="p-3.5 text-slate-700">
                                <div>{tx.super_agent}</div>
                                <div className="text-[10px] text-slate-400">{tx.super_agent_code}</div>
                              </td>
                              <td className="p-3.5">
                                <span className="bg-slate-100 text-[#0B1B36] px-2 py-0.5 rounded text-[10px] font-bold">
                                  {tx.tier}
                                </span>
                              </td>
                              <td className="p-3.5">
                                <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                                  {tx.type.toLowerCase().includes('payout') ||
                                  tx.type.toLowerCase().includes('bounty') ||
                                  tx.type.toLowerCase().includes('withdrawal') ? (
                                    <ArrowUpRight size={14} className="text-emerald-600" />
                                  ) : (
                                    <ArrowDownLeft size={14} className="text-blue-600" />
                                  )}
                                  {tx.type}
                                </span>
                              </td>
                              <td className="p-3.5 text-slate-600 font-sans text-[11px]">
                                {tx.channel}
                              </td>
                              <td className="p-3.5 font-black text-[#0B1B36]">
                                ETB{' '}
                                {tx.amount.toLocaleString('en-US', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </td>
                              <td className="p-3.5 text-right">
                                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                                  {tx.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* USER DIRECTORY TABLE */
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-slate-50 border-b border-slate-200 font-mono text-[10px] uppercase text-slate-500 font-bold">
                <tr>
                  <th className="p-4">User / Handle</th>
                  <th className="p-4">Role Tier</th>
                  <th className="p-4">Tracking / Code</th>
                  {activeTab === 'ambassadors' && (
                    <>
                      <th className="p-4">Phone & Login</th>
                      <th className="p-4">7% Bounty & Rail</th>
                    </>
                  )}
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {loading ? (
                  <tr>
                    <td
                      colSpan={activeTab === 'ambassadors' ? 7 : 5}
                      className="p-8 text-center text-slate-400"
                    >
                      Loading records from Supabase...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={activeTab === 'ambassadors' ? 7 : 5}
                      className="p-8 text-center text-slate-400"
                    >
                      No {activeTab.replace('_', ' ')} found matching your filters.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => {
                    const isEditableRole =
                      user.role === 'super_agent' || user.role === 'ambassador';

                    return (
                      <tr key={user.id} className="hover:bg-slate-50/50">
                        <td className="p-4 font-bold text-[#0B1B36]">
                          <div>@{user.username}</div>
                          <div className="text-[10px] text-slate-400 font-sans">
                            Joined: {new Date(user.created_at).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="capitalize text-[11px] font-bold text-slate-700">
                            {user.role.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="bg-slate-100 px-2.5 py-1 rounded-lg text-[11px] font-bold text-[#0B1B36]">
                            {user.custom_ref_code || user.id.substring(0, 8).toUpperCase()}
                          </span>
                        </td>
                        {activeTab === 'ambassadors' && (
                          <>
                            <td className="p-4">
                              <div className="text-[11px] font-bold text-slate-700">
                                {user.phone_number || 'No phone'}
                              </div>
                              <div className="mt-1">
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    user.has_password
                                      ? 'bg-blue-100 text-blue-800'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  {user.has_password ? 'Password Set' : 'No Password'}
                                </span>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="text-[11px] font-black text-purple-700">
                                ETB{' '}
                                {Number(user.total_bounty_earned ?? 0).toLocaleString('en-US', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </div>
                              <div className="text-[10px] text-slate-500 font-sans">
                                {user.payout_bank_account || 'Rail not set'}
                              </div>
                            </td>
                          </>
                        )}
                        <td className="p-4">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                              user.status === 'active'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {user.status || 'active'}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            {isEditableRole && (
                              <>
                                <button
                                  onClick={() => openEditModal(user)}
                                  className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg cursor-pointer"
                                  title="Edit Record"
                                >
                                  <Pencil size={14} />
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(user)}
                                  disabled={deletingId === user.id}
                                  className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg cursor-pointer disabled:opacity-40"
                                  title="Delete Record"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => handleStatusUpdate(user, 'active')}
                              className="p-1.5 hover:bg-emerald-50 text-emerald-600 rounded-lg cursor-pointer"
                              title="Set Active"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              onClick={() => handleStatusUpdate(user, 'suspended')}
                              className="p-1.5 hover:bg-amber-50 text-amber-600 rounded-lg cursor-pointer"
                              title="Suspend Account"
                            >
                              <Ban size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* REGISTER / EDIT SUPER AGENT OR AMBASSADOR MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-6 shadow-2xl relative max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => {
                setModalOpen(false);
                setEditingId(null);
              }}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X size={18} />
            </button>

            <div>
              <h2 className="text-lg font-black text-[#0B1B36]">
                {editingId
                  ? `Edit ${modalRole === 'ambassador' ? 'Ambassador' : 'Super Agent'}`
                  : `Register ${modalRole === 'ambassador' ? 'Ambassador' : 'Super Agent'}`}
              </h2>
              <p className="text-xs text-slate-500 font-sans mt-1">
                {modalRole === 'ambassador'
                  ? 'Manage referral code (7% bounty), phone + password login, and Telebirr P2P or CBE payout rail.'
                  : 'Manage super agent handle, code, and Telebirr P2P or CBE settlement rail.'}
              </p>
            </div>

            <form onSubmit={handleSaveNode} className="space-y-4 font-sans text-xs">
              <div>
                <label className="block font-bold mb-1 font-mono">Username / Handle</label>
                <input
                  type="text"
                  required
                  placeholder={modalRole === 'ambassador' ? 'ethio_influencer' : 'super_node_01'}
                  value={formState.username}
                  onChange={(e) => setFormState({ ...formState, username: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-300 font-mono font-bold focus:outline-none focus:border-[#0B1B36]"
                />
              </div>

              <div>
                <label className="block font-bold mb-1 font-mono">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="Abebe Bikila"
                  value={formState.full_name}
                  onChange={(e) => setFormState({ ...formState, full_name: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-300 font-bold focus:outline-none focus:border-[#0B1B36]"
                />
              </div>

              <div>
                <label className="block font-bold mb-1 font-mono">
                  {modalRole === 'ambassador' ? 'Custom Referral Code' : 'Super Agent Code'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={modalRole === 'ambassador' ? 'ETHIO_VIP' : 'SA_ADDIS_01'}
                  value={formState.ref_code}
                  onChange={(e) =>
                    setFormState({ ...formState, ref_code: e.target.value.toUpperCase() })
                  }
                  className="w-full p-3 rounded-xl border border-slate-300 font-mono font-bold focus:outline-none focus:border-[#0B1B36]"
                />
              </div>

              <div>
                <label className="block font-bold mb-1 font-mono">Phone Number</label>
                <input
                  type="text"
                  required
                  placeholder="+251911223344"
                  value={formState.phone_number}
                  onChange={(e) => setFormState({ ...formState, phone_number: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-300 font-mono font-bold focus:outline-none focus:border-[#0B1B36]"
                />
              </div>

              {modalRole === 'ambassador' && (
                <div>
                  <label className="block font-bold mb-1 font-mono flex items-center gap-1.5">
                    <KeyRound size={13} className="text-blue-600" />
                    <span>
                      {editingId ? 'Reset Login Password (leave blank to keep)' : 'Login Password'}
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswordField ? 'text' : 'password'}
                      required={!editingId}
                      placeholder={
                        editingId ? 'Enter new password to reset...' : 'Set ambassador password'
                      }
                      value={formState.password}
                      onChange={(e) => setFormState({ ...formState, password: e.target.value })}
                      className="w-full p-3 pr-10 rounded-xl border border-slate-300 font-bold focus:outline-none focus:border-[#0B1B36]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswordField((prev) => !prev)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                      title={showPasswordField ? 'Hide Password' : 'Show Password'}
                    >
                      {showPasswordField ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="block font-bold mb-1 font-mono">Payout Rail (Telebirr P2P or CBE)</label>
                <input
                  type="text"
                  required
                  placeholder="Telebirr P2P 0911223344 / CBE 1000..."
                  value={formState.payout_bank_account}
                  onChange={(e) =>
                    setFormState({ ...formState, payout_bank_account: e.target.value })
                  }
                  className="w-full p-3 rounded-xl border border-slate-300 font-bold focus:outline-none focus:border-[#0B1B36]"
                />
              </div>

              <div>
                <label className="block font-bold mb-1 font-mono">Status</label>
                <select
                  value={formState.status}
                  onChange={(e) =>
                    setFormState({
                      ...formState,
                      status: e.target.value === 'suspended' ? 'suspended' : 'active',
                    })
                  }
                  className="w-full p-3 rounded-xl border border-slate-300 bg-white font-mono font-bold focus:outline-none focus:border-[#0B1B36]"
                >
                  <option value="active">active</option>
                  <option value="suspended">suspended</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2 font-mono">
                <button
                  type="button"
                  onClick={() => {
                    setModalOpen(false);
                    setEditingId(null);
                  }}
                  className="flex-1 py-3 border border-slate-300 text-slate-700 rounded-xl font-bold hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 bg-[#0B1B36] text-white rounded-xl font-bold hover:bg-[#152d56] cursor-pointer disabled:opacity-50"
                >
                  {submitting
                    ? 'Saving...'
                    : editingId
                    ? 'Save Changes'
                    : modalRole === 'ambassador'
                    ? 'Create Ambassador'
                    : 'Create Super Agent'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}