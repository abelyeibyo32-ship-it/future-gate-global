'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ShieldCheck,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  KeyRound,
  Plus,
  X,
  ArrowUpRight,
  ArrowDownLeft,
  SlidersHorizontal,
  CheckSquare,
  UserPlus,
  GitBranch,
  Wallet,
  Trash2,
  AlertTriangle,
  Coins,
  ArrowUpDown,
  Calendar,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

type TransactionStatus = 'pending' | 'approved' | 'rejected' | string;
type SortDirection = 'desc' | 'asc';

interface AgentInfo {
  id?: string;
  username?: string | null;
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  tier?: string | null;
  balance?: number | string | null;
  created_at?: string | null;
}

interface AgentRecord {
  id: string;
  username?: string | null;
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  tier?: string | null;
  balance?: number | string | null;
  fgg_cap?: number | string | null;
  fggCap?: number | string | null;
  fgg_limit?: number | string | null;
  fgg_balance?: number | string | null;
  fgg?: number | string | null;
  daily_cap?: number | string | null;
  max_fgg?: number | string | null;
  cap?: number | string | null;
  status?: string | null;
  referral_count?: number | null;
  referred_by?: string | null;
  referrer_id?: string | null;
  invited_by?: string | null;
  created_at?: string | null;
}

interface DailyTaskRow {
  id?: string;
  agent_id?: string | null;
  created_at?: string | null;
  reward_amount?: number | string | null;
  commission_amount?: number | string | null;
  amount?: number | string | null;
  status?: string | null;
}

interface AgentCommissionBreakdown {
  todayTasks: number;
  totalTasks: number;
  taskCommission: number;
  referralCommission: number;
  totalCommission: number;
}

interface TransactionRequest {
  id: string;
  agent_id?: string | null;
  type?: string;
  tx_type?: string | null;
  request_type?: string | null;
  amount?: number | string | null;
  fee_amount?: number | string | null;
  net_amount?: number | string | null;
  remaining_balance?: number | string | null;
  status?: TransactionStatus;
  reference?: string | null;
  transaction_ref?: string | null;
  notes?: string | null;
  tier?: string | null;
  created_at?: string | null;
  agents?: AgentInfo | AgentInfo[] | null;
}

interface SuperAgentNode {
  id: string;
  name: string;
  region: string;
  phone?: string | null;
  telebirr_account?: string | null;
  cbe_account?: string | null;
  user_id?: string | null;
  status?: string | null;
  created_at?: string | null;
}

interface DateGroup<T> {
  dateKey: string;
  dateLabel: string;
  sortTimestamp: number;
  items: T[];
}

const API_SUPER_AGENT_PATH = '/api/portal/admin/super-agent';
const API_DELETE_AGENT_PATH = '/api/portal/admin/delete-agent';
const DEFAULT_WITHDRAWAL_FEE_PERCENT = 3;
const DEFAULT_TASK_COMMISSION_ETB = 10;
const DEFAULT_REFERRAL_COMMISSION_ETB = 25;

function parseNumericValue(val: unknown): number {
  if (typeof val === 'number') return Number.isFinite(val) ? val : 0;
  if (typeof val === 'string') {
    const cleaned = val.replace(/[^0-9.-]+/g, '');
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function roundMoney(value: number): number {
  return Number((Number.isFinite(value) ? value : 0).toFixed(2));
}

function getTimestamp(isoString?: string | null): number {
  if (!isoString) return 0;
  const ts = new Date(isoString).getTime();
  return Number.isNaN(ts) ? 0 : ts;
}

function compareByDateTime<T extends { created_at?: string | null }>(
  a: T,
  b: T,
  direction: SortDirection
): number {
  const diff = getTimestamp(a.created_at) - getTimestamp(b.created_at);
  return direction === 'desc' ? -diff : diff;
}

function formatDateTime(isoString?: string | null): string {
  if (!isoString) return '-';
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
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

  const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(
    2,
    '0'
  )}`;

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

function groupItemsByDate<T extends { created_at?: string | null }>(
  sortedItems: T[],
  direction: SortDirection
): DateGroup<T>[] {
  const map = new Map<string, DateGroup<T>>();

  for (const item of sortedItems) {
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
    const diff = a.sortTimestamp - b.sortTimestamp;
    return direction === 'desc' ? -diff : diff;
  });
}

function isSameUtcDay(isoString?: string | null): boolean {
  if (!isoString) return false;
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return (
    d.getUTCFullYear() === now.getUTCFullYear() &&
    d.getUTCMonth() === now.getUTCMonth() &&
    d.getUTCDate() === now.getUTCDate()
  );
}

function calculateAgentMetrics(
  agentId: string,
  taskRows: DailyTaskRow[],
  referralCount: number
): AgentCommissionBreakdown {
  let todayTasks = 0;
  let totalTasks = 0;
  let rawTaskRewardSum = 0;
  let foundExplicitReward = false;

  for (const row of taskRows) {
    if (!row.agent_id || String(row.agent_id) !== agentId) continue;
    const rowStatus = (row.status || 'completed').toLowerCase();
    if (rowStatus === 'rejected' || rowStatus === 'cancelled') continue;

    totalTasks += 1;
    if (isSameUtcDay(row.created_at)) {
      todayTasks += 1;
    }

    const explicitReward =
      row.commission_amount ?? row.reward_amount ?? row.amount ?? null;
    if (explicitReward != null && Number.isFinite(parseNumericValue(explicitReward))) {
      foundExplicitReward = true;
      rawTaskRewardSum += parseNumericValue(explicitReward);
    }
  }

  const taskCommission = roundMoney(
    foundExplicitReward ? rawTaskRewardSum : totalTasks * DEFAULT_TASK_COMMISSION_ETB
  );
  const referralCommission = roundMoney(referralCount * DEFAULT_REFERRAL_COMMISSION_ETB);
  const totalCommission = roundMoney(taskCommission + referralCommission);

  return {
    todayTasks,
    totalTasks,
    taskCommission,
    referralCommission,
    totalCommission,
  };
}

function getErrorMessage(err: unknown, fallback: string): string {
  if (!err) return fallback;
  if (typeof err === 'string') return err;
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === 'object') {
    const e = err as Record<string, any>;
    return e.message || e.details || e.hint || e.error_description || fallback;
  }
  return fallback;
}

function getStatusBadgeStyle(status?: string): string {
  const normalized = (status || 'pending').toLowerCase();
  if (normalized === 'approved' || normalized === 'active') {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }
  if (normalized === 'rejected' || normalized === 'suspended' || normalized === 'inactive') {
    return 'bg-rose-50 text-rose-700 border-rose-200';
  }
  return 'bg-amber-50 text-amber-700 border-amber-200';
}

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<'agents' | 'transactions' | 'super-agents'>('agents');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Raw activity rows for live metrics
  const [taskRows, setTaskRows] = useState<DailyTaskRow[]>([]);

  // Agents & live activity state
  const [agents, setAgents] = useState<AgentRecord[]>([]);
  const [loadingAgentsList, setLoadingAgentsList] = useState<boolean>(true);
  const [referralCountMap, setReferralCountMap] = useState<Record<string, number>>({});
  const [inviterMap, setInviterMap] = useState<Record<string, AgentRecord>>({});
  const [invitedChildrenMap, setInvitedChildrenMap] = useState<Record<string, AgentRecord[]>>({});
  const [selectedAgentForTree, setSelectedAgentForTree] = useState<AgentRecord | null>(null);
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);
  const [updatingAgentId, setUpdatingAgentId] = useState<string | null>(null);

  // Deletion modals state
  const [deletingAgentTarget, setDeletingAgentTarget] = useState<AgentRecord | null>(null);
  const [isDeletingAgent, setIsDeletingAgent] = useState<boolean>(false);
  const [confirmBulkDeleteOpen, setConfirmBulkDeleteOpen] = useState<boolean>(false);
  const [isBulkDeletingAgents, setIsBulkDeletingAgents] = useState<boolean>(false);

  const [agentActivityFilter, setAgentActivityFilter] = useState<
    'all' | 'active-today' | 'with-referrals'
  >('all');

  // Transactions state
  const [transactions, setTransactions] = useState<TransactionRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [filterStatus, setFilterStatus] = useState<string>('pending');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Super Agents state
  const [superAgents, setSuperAgents] = useState<SuperAgentNode[]>([]);
  const [loadingAgents, setLoadingAgents] = useState<boolean>(false);

  // Create Super Agent form state
  const [newName, setNewName] = useState<string>('');
  const [newRegion, setNewRegion] = useState<string>('');
  const [newPhone, setNewPhone] = useState<string>('');
  const [newTelebirr, setNewTelebirr] = useState<string>('');
  const [newCbe, setNewCbe] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [creatingAgent, setCreatingAgent] = useState<boolean>(false);

  // Edit / Reset Super Agent modal state
  const [editingAgent, setEditingAgent] = useState<SuperAgentNode | null>(null);
  const [editName, setEditName] = useState<string>('');
  const [editRegion, setEditRegion] = useState<string>('');
  const [editPhone, setEditPhone] = useState<string>('');
  const [editTelebirr, setEditTelebirr] = useState<string>('');
  const [editCbe, setEditCbe] = useState<string>('');
  const [editStatus, setEditStatus] = useState<string>('active');
  const [editPassword, setEditPassword] = useState<string>('');
  const [savingEdit, setSavingEdit] = useState<boolean>(false);
  const [deletingSuperAgent, setDeletingSuperAgent] = useState<boolean>(false);

  // Toast notification
  const [toast, setToast] = useState<{
    message: string;
    type: 'info' | 'success' | 'error';
  } | null>(null);

  const showToast = useCallback(
    (message: string, type: 'info' | 'success' | 'error' = 'info') => {
      setToast({ message, type });
    },
    []
  );

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(timer);
  }, [toast]);

  const fetchAgentsAndActivity = useCallback(async () => {
    setLoadingAgentsList(true);
    try {
      const [agentsRes, tasksRes, referralsRes] = await Promise.all([
        supabase.from('agents').select('*'),
        supabase.from('agent_daily_tasks').select('*'),
        supabase.from('referrals').select('*'),
      ]);

      if (agentsRes.error) throw agentsRes.error;
      const agentRows = (agentsRes.data || []) as AgentRecord[];
      const loadedTasks = (!tasksRes.error && Array.isArray(tasksRes.data)
        ? tasksRes.data
        : []) as DailyTaskRow[];

      setAgents(agentRows);
      setTaskRows(loadedTasks);

      const agentLookup: Record<string, AgentRecord> = {};
      for (const ag of agentRows) {
        agentLookup[ag.id] = ag;
      }

      const refCounts: Record<string, number> = {};
      const childTree: Record<string, AgentRecord[]> = {};
      const inviterLookup: Record<string, AgentRecord> = {};

      if (!referralsRes.error && Array.isArray(referralsRes.data) && referralsRes.data.length > 0) {
        for (const r of referralsRes.data as Array<Record<string, any>>) {
          const inviterId = String(
            r.referrer_id || r.referred_by || r.inviter_id || r.agent_id || ''
          );
          const inviteeId = String(r.invitee_id || r.user_id || r.child_id || '');

          if (inviterId) {
            refCounts[inviterId] = (refCounts[inviterId] || 0) + 1;
            if (inviteeId && agentLookup[inviteeId]) {
              if (!childTree[inviterId]) childTree[inviterId] = [];
              childTree[inviterId].push(agentLookup[inviteeId]);

              if (agentLookup[inviterId]) {
                inviterLookup[inviteeId] = agentLookup[inviterId];
              }
            }
          }
        }
      } else {
        for (const child of agentRows) {
          const inviterId = child.referred_by || child.referrer_id || child.invited_by;
          if (inviterId && agentLookup[inviterId]) {
            const parent = agentLookup[inviterId];
            inviterLookup[child.id] = parent;
            refCounts[parent.id] = (refCounts[parent.id] || 0) + 1;

            if (!childTree[parent.id]) childTree[parent.id] = [];
            childTree[parent.id].push(child);
          }
        }
        for (const ag of agentRows) {
          if (
            typeof ag.referral_count === 'number' &&
            ag.referral_count > (refCounts[ag.id] || 0)
          ) {
            refCounts[ag.id] = ag.referral_count;
          }
        }
      }

      setReferralCountMap(refCounts);
      setInviterMap(inviterLookup);
      setInvitedChildrenMap(childTree);
    } catch (err: any) {
      console.error('Error fetching agents activity:', err);
      showToast(getErrorMessage(err, 'Failed to load agents activity.'), 'error');
    } finally {
      setLoadingAgentsList(false);
    }
  }, [showToast]);

  const fetchTransactions = useCallback(
    async (manual = false) => {
      if (manual) setIsRefreshing(true);

      try {
        const { data, error } = await supabase
          .from('transaction_requests')
          .select(`
            *,
            agents:agent_id (*)
          `);

        if (error) throw error;
        setTransactions((data || []) as TransactionRequest[]);
      } catch (err: any) {
        console.error('Error fetching transactions:', err);
        showToast(getErrorMessage(err, 'Failed to load transaction records.'), 'error');
      } finally {
        setLoading(false);
        if (manual) {
          setIsRefreshing(false);
          showToast('Admin ledger synchronized.', 'success');
        }
      }
    },
    [showToast]
  );

  const fetchSuperAgents = useCallback(
    async (manual = false) => {
      if (manual) setLoadingAgents(true);
      else setLoadingAgents(true);

      try {
        const { data, error } = await supabase.from('super_agents').select('*');

        if (error) throw error;
        setSuperAgents((data || []) as SuperAgentNode[]);
      } catch (err: any) {
        console.error('Error fetching super agents:', err);
        showToast(getErrorMessage(err, 'Failed to load Super Agent nodes.'), 'error');
      } finally {
        setLoadingAgents(false);
      }
    },
    [showToast]
  );

  useEffect(() => {
    fetchAgentsAndActivity();
    fetchTransactions(false);
    fetchSuperAgents(false);
  }, [fetchAgentsAndActivity, fetchTransactions, fetchSuperAgents]);

  useEffect(() => {
    const channel = supabase
      .channel('admin-dashboard-live-activity')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'agents' },
        () => {
          fetchAgentsAndActivity();
          fetchTransactions(false);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'agent_daily_tasks' },
        () => {
          fetchAgentsAndActivity();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transaction_requests' },
        () => {
          fetchTransactions(false);
          fetchAgentsAndActivity();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'super_agents' },
        () => {
          fetchSuperAgents(false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAgentsAndActivity, fetchTransactions, fetchSuperAgents]);

  const { todayTaskMap, totalTaskMap, commissionMap } = useMemo(() => {
    const todayCounts: Record<string, number> = {};
    const totalCounts: Record<string, number> = {};
    const nextCommissionMap: Record<string, AgentCommissionBreakdown> = {};

    for (const ag of agents) {
      const metrics = calculateAgentMetrics(
        ag.id,
        taskRows,
        referralCountMap[ag.id] || 0
      );
      todayCounts[ag.id] = metrics.todayTasks;
      totalCounts[ag.id] = metrics.totalTasks;
      nextCommissionMap[ag.id] = metrics;
    }

    return {
      todayTaskMap: todayCounts,
      totalTaskMap: totalCounts,
      commissionMap: nextCommissionMap,
    };
  }, [agents, taskRows, referralCountMap]);

  const handleUpdateAgentStatus = async (agentId: string, nextStatus: string) => {
    setUpdatingAgentId(agentId);
    try {
      const { data, error } = await supabase
        .from('agents')
        .update({ status: nextStatus })
        .eq('id', agentId)
        .select('id, status');

      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error('Status update was not applied (check RLS UPDATE policy on agents).');
      }

      setAgents((prev) =>
        prev.map((ag) => (ag.id === agentId ? { ...ag, status: nextStatus } : ag))
      );
      showToast(`Agent status updated to ${nextStatus}.`, 'success');
    } catch (err: any) {
      console.error('Error updating agent status:', err);
      showToast(getErrorMessage(err, 'Failed to update agent status.'), 'error');
    } finally {
      setUpdatingAgentId(null);
    }
  };

  const handleResetFilters = useCallback(() => {
    setFilterStatus('pending');
    setAgentActivityFilter('all');
    setSearchQuery('');
    setSortDirection('desc');
    setSelectedIds([]);
    setSelectedAgentIds([]);
    showToast('Filters, sorting, and selection reset.', 'info');
  }, [showToast]);

  const handleGenerateTempPassword = useCallback(() => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#!';
    let generated = '';
    for (let i = 0; i < 12; i++) {
      generated += chars[Math.floor(Math.random() * chars.length)];
    }
    setEditPassword(generated);
    showToast('Temporary password generated.', 'info');
  }, [showToast]);

  const handleResetCreateForm = useCallback(() => {
    setNewName('');
    setNewRegion('');
    setNewPhone('');
    setNewTelebirr('');
    setNewCbe('');
    setNewPassword('');
  }, []);

  const deleteAgentsViaApi = async (ids: string[]) => {
    const res = await fetch(API_DELETE_AGENT_PATH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });

    if (res.status === 404) {
      const deletedIds: string[] = [];
      const errors: Array<{ id: string; message: string }> = [];

      for (const id of ids) {
        await supabase.from('agents').update({ referred_by: null }).eq('referred_by', id);
        await supabase.from('agents').update({ referrer_id: null }).eq('referrer_id', id);
        await supabase.from('agents').update({ invited_by: null }).eq('invited_by', id);
        await supabase.from('agent_daily_tasks').delete().eq('agent_id', id);
        await supabase
          .from('referrals')
          .delete()
          .or(`referrer_id.eq.${id},invitee_id.eq.${id}`);
        await supabase.from('transaction_requests').delete().eq('agent_id', id);

        const { data, error } = await supabase
          .from('agents')
          .delete()
          .eq('id', id)
          .select('id');

        if (error) {
          errors.push({ id, message: error.message });
        } else if (!data || data.length === 0) {
          errors.push({
            id,
            message:
              'Delete route returned 404 and client delete returned 0 rows (check RLS or add /api/portal/admin/delete-agent).',
          });
        } else {
          deletedIds.push(id);
        }
      }

      return { deletedIds, errors };
    }

    const payload = await res.json().catch(() => null);
    if (!res.ok || !payload) {
      throw new Error(
        payload?.error || `Delete route failed (${res.status} ${res.statusText}).`
      );
    }

    return {
      deletedIds: Array.isArray(payload.deletedIds) ? (payload.deletedIds as string[]) : [],
      errors: Array.isArray(payload.errors)
        ? (payload.errors as Array<{ id: string; message: string }>)
        : [],
    };
  };

  // Single Delete Agent Account
  const handleDeleteAgentAccount = async () => {
    if (!deletingAgentTarget) return;

    setIsDeletingAgent(true);
    try {
      const { deletedIds, errors } = await deleteAgentsViaApi([deletingAgentTarget.id]);
      if (!deletedIds.includes(deletingAgentTarget.id)) {
        throw new Error(errors[0]?.message || 'Failed to delete agent account.');
      }

      setAgents((prev) => prev.filter((a) => a.id !== deletingAgentTarget.id));
      setSelectedAgentIds((prev) => prev.filter((id) => id !== deletingAgentTarget.id));
      if (selectedAgentForTree?.id === deletingAgentTarget.id) {
        setSelectedAgentForTree(null);
      }
      setDeletingAgentTarget(null);
      showToast('Agent account permanently deleted.', 'success');

      await fetchAgentsAndActivity();
    } catch (err: any) {
      console.error('Error deleting agent account:', err);
      showToast(getErrorMessage(err, 'Failed to delete agent account.'), 'error');
    } finally {
      setIsDeletingAgent(false);
    }
  };

  // Resilient Bulk Delete Agent Accounts
  const handleBulkDeleteAgents = async () => {
    if (selectedAgentIds.length === 0) return;

    setIsBulkDeletingAgents(true);
    const idsToDelete = [...selectedAgentIds];

    try {
      const { deletedIds, errors } = await deleteAgentsViaApi(idsToDelete);

      if (deletedIds.length > 0) {
        setAgents((prev) => prev.filter((a) => !deletedIds.includes(a.id)));
        setSelectedAgentIds((prev) => prev.filter((id) => !deletedIds.includes(id)));
        await fetchAgentsAndActivity();
      }

      setConfirmBulkDeleteOpen(false);

      if (errors.length === 0) {
        showToast(
          `Permanently deleted ${deletedIds.length} agent account${
            deletedIds.length > 1 ? 's' : ''
          }.`,
          'success'
        );
      } else if (deletedIds.length > 0) {
        showToast(
          `Deleted ${deletedIds.length}/${idsToDelete.length}. Blocked: ${errors[0].message}`,
          'error'
        );
      } else {
        showToast(`Bulk delete failed: ${errors[0]?.message || 'Unknown error'}`, 'error');
      }
    } catch (err: any) {
      console.error('Error bulk deleting agents:', err);
      showToast(getErrorMessage(err, 'Failed to delete selected agent accounts.'), 'error');
    } finally {
      setIsBulkDeletingAgents(false);
    }
  };

  // Delete Super Agent Node
  const handleDeleteSuperAgentNode = async () => {
    if (!editingAgent) return;

    setDeletingSuperAgent(true);
    try {
      const res = await fetch(API_SUPER_AGENT_PATH, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingAgent.id }),
      });

      let payload: any = null;
      try {
        payload = await res.json();
      } catch {
        payload = null;
      }

      if (!res.ok || (payload && payload.success === false)) {
        throw new Error(
          payload?.error ||
            `Super Agent DELETE failed (${res.status} ${res.statusText}). Check ${API_SUPER_AGENT_PATH}.`
        );
      }

      setSuperAgents((prev) => prev.filter((item) => item.id !== editingAgent.id));
      setEditingAgent(null);
      showToast('Super Agent node deleted.', 'success');
    } catch (err: any) {
      console.error('Delete Super Agent error:', err);
      showToast(getErrorMessage(err, 'Failed to delete Super Agent.'), 'error');
    } finally {
      setDeletingSuperAgent(false);
    }
  };

  const applySingleApproval = async (
    tx: TransactionRequest,
    nextStatus: 'approved' | 'rejected'
  ) => {
    const currentStatus = (tx.status || 'pending').toLowerCase();
    if (currentStatus !== 'pending') {
      throw new Error(`Transaction is already ${currentStatus} and cannot be modified.`);
    }

    const amount = roundMoney(Math.max(0, parseNumericValue(tx.amount)));
    const txType = (tx.type || tx.tx_type || tx.request_type || '').toLowerCase();
    const feeRateDecimal = DEFAULT_WITHDRAWAL_FEE_PERCENT / 100;
    const feeAmount =
      txType === 'withdrawal' ? roundMoney(amount * feeRateDecimal) : 0;
    const netAmount =
      txType === 'withdrawal' ? roundMoney(Math.max(0, amount - feeAmount)) : amount;

    let currentBalance = 0;
    let agentExists = false;

    if (tx.agent_id) {
      const { data: agentRow, error: readErr } = await supabase
        .from('agents')
        .select('id, balance, tier')
        .eq('id', tx.agent_id)
        .maybeSingle();

      if (readErr) throw readErr;
      if (agentRow) {
        agentExists = true;
        currentBalance = roundMoney(parseNumericValue(agentRow.balance));
      }
    }

    if (nextStatus === 'approved' && ['withdrawal', 'withdraw', 'payout'].includes(txType)) {
      if (!agentExists) {
        throw new Error(`Agent ${tx.agent_id} not found in public.agents.`);
      }
      if (amount > currentBalance) {
        throw new Error(
          `Insufficient balance (ETB ${currentBalance.toLocaleString()}) for withdrawal of ETB ${amount.toLocaleString()}.`
        );
      }
    }

    let nextBalance = currentBalance;
    if (nextStatus === 'approved') {
      if (['withdrawal', 'withdraw', 'payout'].includes(txType)) {
        nextBalance = roundMoney(Math.max(0, currentBalance - amount));
      } else if (['deposit', 'top_up', 'topup', 'credit', 'fund'].includes(txType)) {
        nextBalance = roundMoney(currentBalance + amount);
      }
    }

    const { error: txErr } = await supabase
      .from('transaction_requests')
      .update({ status: nextStatus })
      .eq('id', tx.id)
      .eq('status', 'pending');

    if (txErr) throw txErr;

    if (nextStatus === 'approved' && tx.agent_id && agentExists) {
      const agentUpdate: Record<string, any> = { balance: nextBalance };
      if (tx.tier) {
        agentUpdate.tier = tx.tier;
      }

      const { error: agentErr } = await supabase
        .from('agents')
        .update(agentUpdate)
        .eq('id', tx.agent_id);

      if (agentErr) throw agentErr;

      const metaUpdate: Record<string, any> = {
        remaining_balance: nextBalance,
        balance_applied: true,
      };
      if (['withdrawal', 'withdraw', 'payout'].includes(txType)) {
        metaUpdate.fee_amount = feeAmount;
        metaUpdate.net_amount = netAmount;
      }

      const { error: metaErr } = await supabase
        .from('transaction_requests')
        .update(metaUpdate)
        .eq('id', tx.id);

      if (metaErr) {
        console.warn('Optional transaction metadata columns skipped:', metaErr.message);
      }
    }

    return { nextBalance, feeAmount, netAmount, amount, txType };
  };

  const handleUpdateTransactionStatus = async (
    id: string,
    nextStatus: 'approved' | 'rejected'
  ) => {
    const targetTx = transactions.find((item) => item.id === id);
    if (!targetTx) return;

    setProcessingId(id);
    try {
      const { nextBalance, feeAmount, netAmount, amount, txType } =
        await applySingleApproval(targetTx, nextStatus);

      await Promise.all([fetchTransactions(false), fetchAgentsAndActivity()]);
      setSelectedIds((prev) => prev.filter((item) => item !== id));

      const isWithdrawal = ['withdrawal', 'withdraw', 'payout'].includes(txType);

      showToast(
        nextStatus === 'approved'
          ? `Approved ${txType || 'request'} of ETB ${amount.toLocaleString()}${
              isWithdrawal
                ? ` (${DEFAULT_WITHDRAWAL_FEE_PERCENT}% Fee: ETB ${feeAmount.toLocaleString()}, Net: ETB ${netAmount.toLocaleString()})`
                : ''
            } • Balance: ETB ${nextBalance.toLocaleString()}.`
          : `Transaction marked as rejected.`,
        'success'
      );
    } catch (err: any) {
      console.error('Error updating transaction:', err);
      showToast(
        getErrorMessage(err, `Failed to mark transaction as ${nextStatus}.`),
        'error'
      );
    } finally {
      setProcessingId(null);
    }
  };

  const handleBulkStatusUpdate = async (nextStatus: 'approved' | 'rejected') => {
    if (selectedIds.length === 0) return;
    setProcessingId('bulk');

    try {
      const eligibleTxs = transactions.filter(
        (tx) =>
          selectedIds.includes(tx.id) &&
          (tx.status || 'pending').toLowerCase() === 'pending'
      );

      if (eligibleTxs.length === 0) {
        throw new Error('Only pending transactions can be approved or rejected.');
      }

      for (const tx of eligibleTxs) {
        await applySingleApproval(tx, nextStatus);
      }

      await Promise.all([fetchTransactions(false), fetchAgentsAndActivity()]);
      setSelectedIds([]);
      showToast(
        `Updated ${eligibleTxs.length} pending transaction${
          eligibleTxs.length > 1 ? 's' : ''
        } to ${nextStatus}.`,
        'success'
      );
    } catch (err: any) {
      console.error('Bulk update failed:', err);
      showToast(getErrorMessage(err, 'Bulk transaction update failed.'), 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleCreateSuperAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newRegion.trim()) {
      showToast('Name and region are required.', 'error');
      return;
    }

    setCreatingAgent(true);
    try {
      const res = await fetch(API_SUPER_AGENT_PATH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          region: newRegion.trim(),
          phone: newPhone.trim() || null,
          telebirr_account: newTelebirr.trim() || null,
          cbe_account: newCbe.trim() || null,
          password: newPassword.trim() || undefined,
        }),
      });

      const payload = await res.json();
      if (!res.ok || !payload.success) {
        throw new Error(payload?.error || 'Failed to create Super Agent.');
      }

      if (payload.data) {
        setSuperAgents((prev) => [payload.data as SuperAgentNode, ...prev]);
      } else {
        await fetchSuperAgents(false);
      }

      handleResetCreateForm();
      showToast('Super Agent created successfully.', 'success');
    } catch (err: any) {
      console.error('Create Super Agent error:', err);
      showToast(getErrorMessage(err, 'Failed to create Super Agent.'), 'error');
    } finally {
      setCreatingAgent(false);
    }
  };

  const openEditAgentModal = (agent: SuperAgentNode) => {
    setEditingAgent(agent);
    setEditName(agent.name || '');
    setEditRegion(agent.region || '');
    setEditPhone(agent.phone || '');
    setEditTelebirr(agent.telebirr_account || '');
    setEditCbe(agent.cbe_account || '');
    setEditStatus(agent.status || 'active');
    setEditPassword('');
  };

  const handleSaveAgentChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAgent) return;

    setSavingEdit(true);
    try {
      const res = await fetch(API_SUPER_AGENT_PATH, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingAgent.id,
          name: editName.trim(),
          region: editRegion.trim(),
          phone: editPhone.trim() || null,
          telebirr_account: editTelebirr.trim() || null,
          cbe_account: editCbe.trim() || null,
          user_id: editingAgent.user_id ?? null,
          status: editStatus,
          newPassword: editPassword.trim() || undefined,
        }),
      });

      const payload = await res.json();
      if (!res.ok || !payload.success) {
        throw new Error(payload?.error || 'Failed to update Super Agent.');
      }

      setSuperAgents((prev) =>
        prev.map((item) =>
          item.id === editingAgent.id
            ? ({ ...item, ...(payload.data || {}) } as SuperAgentNode)
            : item
        )
      );

      const passwordWasReset = Boolean(editPassword.trim());
      setEditingAgent(null);
      setEditPassword('');
      showToast(
        passwordWasReset
          ? 'Super Agent profile and login password reset.'
          : 'Super Agent updated.',
        'success'
      );
    } catch (err: any) {
      console.error('Update Super Agent error:', err);
      showToast(getErrorMessage(err, 'Failed to update Super Agent.'), 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  const stats = useMemo(() => {
    const activeTodayAgents = agents.filter((a) => (todayTaskMap[a.id] || 0) > 0).length;
    const totalReferrals = Object.values(referralCountMap).reduce((sum, c) => sum + c, 0);
    const totalAgentBalances = roundMoney(
      agents.reduce((sum, a) => sum + parseNumericValue(a.balance), 0)
    );

    const totalFggCap = roundMoney(
      agents.reduce((sum, a) => {
        const record = a as unknown as Record<string, unknown>;
        const rawCap =
          record.fgg_cap ??
          record.fggCap ??
          record.fgg_limit ??
          record.fgg_balance ??
          record.fgg ??
          record.daily_cap ??
          record.max_fgg ??
          record.cap ??
          0;
        return sum + parseNumericValue(rawCap);
      }, 0)
    );

    const getTxType = (tx: TransactionRequest) =>
      String(tx.type || tx.tx_type || tx.request_type || '')
        .trim()
        .toLowerCase();

    const isExcludedStatus = (status?: string | null) => {
      const normalized = String(status || '').trim().toLowerCase();
      return ['rejected', 'cancelled', 'canceled', 'failed', 'declined'].includes(normalized);
    };

    const totalDeposits = roundMoney(
      transactions
        .filter((t) => {
          const type = getTxType(t);
          const matchesDeposit =
            type.includes('deposit') ||
            type.includes('top') ||
            type.includes('credit') ||
            type.includes('fund') ||
            type.includes('recharge');
          return matchesDeposit && !isExcludedStatus(t.status);
        })
        .reduce((sum, t) => sum + parseNumericValue(t.amount), 0)
    );

    const totalWithdrawals = roundMoney(
      transactions
        .filter((t) => {
          const type = getTxType(t);
          const matchesWithdrawal =
            type.includes('withdraw') || type.includes('payout') || type.includes('cash_out');
          return matchesWithdrawal && !isExcludedStatus(t.status);
        })
        .reduce((sum, t) => sum + parseNumericValue(t.amount), 0)
    );

    const pendingCount = transactions.filter(
      (t) => (t.status || 'pending').toLowerCase() === 'pending'
    ).length;

    return {
      activeTodayAgents,
      totalReferrals,
      totalAgentBalances,
      totalFggCap,
      totalDeposits,
      totalWithdrawals,
      pendingCount,
    };
  }, [agents, todayTaskMap, referralCountMap, transactions]);

  const filteredAgents = useMemo(() => {
    return agents
      .filter((ag) => {
        const todayTasks = todayTaskMap[ag.id] || 0;
        const referrals = referralCountMap[ag.id] || 0;

        if (agentActivityFilter === 'active-today' && todayTasks === 0) return false;
        if (agentActivityFilter === 'with-referrals' && referrals === 0) return false;

        if (!searchQuery.trim()) return true;
        const q = searchQuery.trim().toLowerCase();
        const inviterName = inviterMap[ag.id]?.full_name || inviterMap[ag.id]?.username || '';

        return (
          ag.id.toLowerCase().includes(q) ||
          (ag.username || '').toLowerCase().includes(q) ||
          (ag.full_name || '').toLowerCase().includes(q) ||
          (ag.email || '').toLowerCase().includes(q) ||
          (ag.phone || '').toLowerCase().includes(q) ||
          (ag.tier || '').toLowerCase().includes(q) ||
          inviterName.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => compareByDateTime(a, b, sortDirection));
  }, [
    agents,
    todayTaskMap,
    referralCountMap,
    inviterMap,
    agentActivityFilter,
    searchQuery,
    sortDirection,
  ]);

  const groupedAgents = useMemo(() => {
    return groupItemsByDate(filteredAgents, sortDirection);
  }, [filteredAgents, sortDirection]);

  const filteredAgentIds = useMemo(() => {
    return filteredAgents.map((ag) => ag.id);
  }, [filteredAgents]);

  const toggleSelectAgentId = (id: string) => {
    setSelectedAgentIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((tx) => {
        const matchesStatus =
          filterStatus === 'all' ||
          (tx.status || '').toLowerCase() === filterStatus.toLowerCase();

        const agentObj = Array.isArray(tx.agents) ? tx.agents[0] : tx.agents;
        const rawType = tx.type || tx.tx_type || tx.request_type || '';
        const haystack = [
          tx.id,
          tx.agent_id,
          rawType,
          tx.reference,
          tx.transaction_ref,
          tx.notes,
          String(tx.amount ?? ''),
          agentObj?.username,
          agentObj?.full_name,
          agentObj?.email,
          agentObj?.phone,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        const matchesQuery =
          !searchQuery.trim() || haystack.includes(searchQuery.trim().toLowerCase());
        return matchesStatus && matchesQuery;
      })
      .sort((a, b) => compareByDateTime(a, b, sortDirection));
  }, [transactions, filterStatus, searchQuery, sortDirection]);

  const groupedTransactions = useMemo(() => {
    return groupItemsByDate(filteredTransactions, sortDirection);
  }, [filteredTransactions, sortDirection]);

  const sortedSuperAgents = useMemo(() => {
    return [...superAgents].sort((a, b) => compareByDateTime(a, b, sortDirection));
  }, [superAgents, sortDirection]);

  const groupedSuperAgents = useMemo(() => {
    return groupItemsByDate(sortedSuperAgents, sortDirection);
  }, [sortedSuperAgents, sortDirection]);

  const pendingFilteredIds = useMemo(() => {
    return filteredTransactions
      .filter((t) => (t.status || 'pending').toLowerCase() === 'pending')
      .map((t) => t.id);
  }, [filteredTransactions]);

  const toggleSelectId = (id: string) => {
    const target = transactions.find((t) => t.id === id);
    if ((target?.status || 'pending').toLowerCase() !== 'pending') return;
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#0B1B36] p-4 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Toast */}
        {toast && (
          <div
            className={`fixed bottom-6 right-6 z-50 rounded-2xl px-4 py-3 text-xs font-medium shadow-xl border backdrop-blur-md transition max-w-md ${
              toast.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : toast.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-white border-[#AEB8C4]/50 text-[#0B1B36]'
            }`}
          >
            {toast.message}
          </div>
        )}

        {/* Top Header Card */}
        <div className="bg-white border border-[#AEB8C4]/40 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#0B1B36] text-white flex items-center justify-center shadow-xs">
              <ShieldCheck size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs text-[#536171]">
                <span className="font-semibold text-[#0B1B36]">Master Admin</span>
                <span>•</span>
                <span className="inline-flex items-center gap-1.5 text-emerald-700 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Activity Stream
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0B1B36]">
                Admin Control Center
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="bg-[#F5F7FA] p-1 rounded-2xl border border-[#AEB8C4]/40 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('agents')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'agents'
                    ? 'bg-[#0B1B36] text-white shadow-xs'
                    : 'text-[#536171] hover:text-[#0B1B36]'
                }`}
              >
                Agents Live ({agents.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('transactions')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'transactions'
                    ? 'bg-[#0B1B36] text-white shadow-xs'
                    : 'text-[#536171] hover:text-[#0B1B36]'
                }`}
              >
                Transactions ({transactions.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('super-agents')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'super-agents'
                    ? 'bg-[#0B1B36] text-white shadow-xs'
                    : 'text-[#536171] hover:text-[#0B1B36]'
                }`}
              >
                Super Agents ({superAgents.length})
              </button>
            </div>

            <button
              type="button"
              onClick={() =>
                setSortDirection((prev) => (prev === 'desc' ? 'asc' : 'desc'))
              }
              className="px-3.5 py-2.5 rounded-2xl text-xs font-semibold bg-white hover:bg-[#F5F7FA] text-[#0B1B36] border border-[#AEB8C4]/50 transition flex items-center gap-1.5 cursor-pointer"
              title="Sort by date & time"
            >
              <ArrowUpDown size={13} />
              <span>{sortDirection === 'desc' ? 'Newest First' : 'Oldest First'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                fetchAgentsAndActivity();
                fetchTransactions(true);
                fetchSuperAgents(false);
              }}
              disabled={isRefreshing}
              className="px-3.5 py-2.5 rounded-2xl text-xs font-semibold bg-white hover:bg-[#F5F7FA] text-[#0B1B36] border border-[#AEB8C4]/50 transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
              <span>{isRefreshing ? 'Syncing...' : 'Sync'}</span>
            </button>
          </div>
        </div>

        {/* Live Activity & Ledger Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-[#AEB8C4]/40 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-medium text-[#536171]">
              <span>Total FGG Cap</span>
              <Coins size={15} className="text-[#0B1B36]" />
            </div>
            <div className="text-2xl font-bold text-[#0B1B36] mt-1">
              ETB {stats.totalFggCap.toLocaleString()}
            </div>
            <div className="text-xs text-[#536171] mt-1">Combined agent FGG cap</div>
          </div>

          <div className="bg-white border border-[#AEB8C4]/40 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-medium text-[#536171]">
              <span>Total Deposits</span>
              <ArrowDownLeft size={15} className="text-emerald-600" />
            </div>
            <div className="text-2xl font-bold text-emerald-700 mt-1">
              ETB {stats.totalDeposits.toLocaleString()}
            </div>
            <div className="text-xs text-[#536171] mt-1">All non-rejected deposits</div>
          </div>

          <div className="bg-white border border-[#AEB8C4]/40 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-medium text-[#536171]">
              <span>Total Withdrawals</span>
              <ArrowUpRight size={15} className="text-amber-600" />
            </div>
            <div className="text-2xl font-bold text-amber-700 mt-1">
              ETB {stats.totalWithdrawals.toLocaleString()}
            </div>
            <div className="text-xs text-[#536171] mt-1">All non-rejected withdrawals</div>
          </div>

          <div className="bg-white border border-[#AEB8C4]/40 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-medium text-[#536171]">
              <span>Total Agent Liquidity</span>
              <Wallet size={15} className="text-emerald-600" />
            </div>
            <div className="text-2xl font-bold text-emerald-700 mt-1">
              ETB {stats.totalAgentBalances.toLocaleString()}
            </div>
            <div className="text-xs text-[#536171] mt-1">
              {stats.activeTodayAgents} / {agents.length} active today • {stats.pendingCount} pending
            </div>
          </div>
        </div>

        {/* AGENTS LIVE ACTIVITY TAB (SEPARATED BY DATE) */}
        {activeTab === 'agents' && (
          <div className="space-y-4">
            <div className="bg-white border border-[#AEB8C4]/40 rounded-3xl p-4 sm:p-5 shadow-xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    { key: 'all', label: 'All Agents' },
                    { key: 'active-today', label: 'Active Daily Tasks Today' },
                    { key: 'with-referrals', label: 'Has Referrals' },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setAgentActivityFilter(item.key)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                      agentActivityFilter === item.key
                        ? 'bg-[#0B1B36] text-white'
                        : 'bg-[#F5F7FA] text-[#536171] hover:text-[#0B1B36]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-72">
                  <Search
                    size={14}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#536171]"
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search agent, inviter, phone, tier..."
                    className="w-full bg-[#F5F7FA] border border-[#AEB8C4]/50 rounded-xl pl-9 pr-3 py-2 text-xs text-[#0B1B36] placeholder:text-[#536171] focus:outline-none focus:border-[#0B1B36] focus:bg-white transition"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-3 py-2 rounded-xl text-xs font-semibold bg-[#F5F7FA] hover:bg-slate-200/70 text-[#536171] hover:text-[#0B1B36] border border-[#AEB8C4]/40 transition cursor-pointer"
                >
                  Reset
                </button>
              </div>
            </div>

            {selectedAgentIds.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-rose-200 px-5 py-3 rounded-2xl shadow-xs text-xs">
                <span className="font-semibold text-[#0B1B36]">
                  {selectedAgentIds.length} agent account{selectedAgentIds.length > 1 ? 's' : ''} selected
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isBulkDeletingAgents}
                    onClick={() => setConfirmBulkDeleteOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold transition disabled:opacity-50 cursor-pointer"
                  >
                    <Trash2 size={13} />
                    <span>Delete Selected</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedAgentIds([])}
                    className="px-3 py-1.5 rounded-xl bg-[#F5F7FA] hover:bg-slate-200/70 text-[#536171] font-semibold transition cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}

            {loadingAgentsList ? (
              <div className="bg-white border border-[#AEB8C4]/40 rounded-3xl p-10 text-center text-xs text-[#536171] shadow-xs">
                Loading agents and live task/referral status...
              </div>
            ) : groupedAgents.length === 0 ? (
              <div className="bg-white border border-[#AEB8C4]/40 rounded-3xl p-10 text-center text-xs text-[#536171] shadow-xs">
                No agents match the active filter.
              </div>
            ) : (
              <div className="space-y-6">
                {groupedAgents.map((group) => (
                  <div key={group.dateKey} className="space-y-2.5">
                    <div className="flex items-center justify-between px-4 py-2.5 bg-white border border-[#AEB8C4]/40 rounded-2xl shadow-2xs">
                      <div className="flex items-center gap-2 text-xs font-bold text-[#0B1B36]">
                        <Calendar size={14} className="text-[#0B1B36]" />
                        <span>{group.dateLabel}</span>
                      </div>
                      <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#F5F7FA] text-[#536171] border border-[#AEB8C4]/30">
                        {group.items.length} {group.items.length === 1 ? 'agent' : 'agents'}
                      </span>
                    </div>

                    <div className="overflow-x-auto bg-white border border-[#AEB8C4]/40 rounded-3xl shadow-xs">
                      <table className="w-full text-left text-xs">
                        <thead className="border-b border-[#AEB8C4]/30 text-[11px] uppercase tracking-wider text-[#536171] bg-[#F5F7FA]/80">
                          <tr>
                            <th className="p-4 w-11">
                              <input
                                type="checkbox"
                                className="rounded border-[#AEB8C4]"
                                disabled={group.items.length === 0}
                                checked={
                                  group.items.length > 0 &&
                                  group.items.every((ag) => selectedAgentIds.includes(ag.id))
                                }
                                onChange={(e) => {
                                  const groupIds = group.items.map((ag) => ag.id);
                                  setSelectedAgentIds((prev) =>
                                    e.target.checked
                                      ? Array.from(new Set([...prev, ...groupIds]))
                                      : prev.filter((id) => !groupIds.includes(id))
                                  );
                                }}
                              />
                            </th>
                            <th className="p-4">Agent</th>
                            <th className="p-4">Date &amp; Time</th>
                            <th className="p-4">Current Account Balance</th>
                            <th className="p-4">Invited By (Inviter)</th>
                            <th className="p-4">Daily Tasks</th>
                            <th className="p-4">Calculated Commission</th>
                            <th className="p-4">Referrals Made</th>
                            <th className="p-4">Status</th>
                            <th className="p-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#AEB8C4]/25">
                          {group.items.map((ag) => {
                            const metrics = commissionMap[ag.id] || {
                              todayTasks: todayTaskMap[ag.id] || 0,
                              totalTasks: totalTaskMap[ag.id] || 0,
                              taskCommission: 0,
                              referralCommission: 0,
                              totalCommission: 0,
                            };
                            const todayTasks = metrics.todayTasks;
                            const totalTasks = metrics.totalTasks;
                            const referrals = referralCountMap[ag.id] || 0;
                            const isDoingTasksToday = todayTasks > 0;
                            const inviter = inviterMap[ag.id];
                            const currBalance = roundMoney(parseNumericValue(ag.balance));
                            const currentStatus = ag.status || 'active';

                            return (
                              <tr key={ag.id} className="hover:bg-[#F5F7FA]/70 transition">
                                <td className="p-4">
                                  <input
                                    type="checkbox"
                                    className="rounded border-[#AEB8C4]"
                                    checked={selectedAgentIds.includes(ag.id)}
                                    onChange={() => toggleSelectAgentId(ag.id)}
                                  />
                                </td>

                                <td className="p-4">
                                  <div className="font-semibold text-sm text-[#0B1B36]">
                                    {ag.full_name ||
                                      ag.username ||
                                      ag.email ||
                                      ag.id.slice(0, 8)}
                                  </div>
                                  <div className="text-[11px] text-[#536171] mt-0.5">
                                    {ag.phone || ag.email || ag.id} • Tier:{' '}
                                    <span className="font-semibold text-[#0B1B36]">
                                      {ag.tier || 'Standard'}
                                    </span>
                                  </div>
                                </td>

                                <td className="p-4 text-[11px] text-[#536171] whitespace-nowrap">
                                  {formatDateTime(ag.created_at)}
                                </td>

                                <td className="p-4">
                                  <div className="font-bold text-sm text-emerald-700">
                                    ETB {currBalance.toLocaleString()}
                                  </div>
                                  <div className="text-[10px] text-[#536171] mt-0.5">
                                    {currBalance > 0 ? 'Active Funds' : 'Zero Balance'}
                                  </div>
                                </td>

                                <td className="p-4">
                                  {inviter ? (
                                    <div className="flex items-center gap-1.5">
                                      <GitBranch size={13} className="text-[#0B1B36]" />
                                      <div>
                                        <div className="font-semibold text-xs text-[#0B1B36]">
                                          {inviter.full_name ||
                                            inviter.username ||
                                            inviter.phone ||
                                            inviter.id.slice(0, 8)}
                                        </div>
                                        <div className="text-[10px] text-[#536171]">
                                          Direct Parent
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-[11px] text-[#536171] italic">
                                      Direct Sign-up (No Inviter)
                                    </span>
                                  )}
                                </td>

                                <td className="p-4">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                                        isDoingTasksToday
                                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                          : 'bg-slate-100 text-[#536171] border-slate-200'
                                      }`}
                                    >
                                      <CheckSquare size={12} />
                                      <span>
                                        {isDoingTasksToday
                                          ? `Active (${todayTasks} today)`
                                          : 'Idle today'}
                                      </span>
                                    </span>
                                    <span className="text-[11px] text-[#536171] font-mono">
                                      ({totalTasks} total)
                                    </span>
                                  </div>
                                </td>

                                <td className="p-4">
                                  <div className="font-bold text-xs text-[#0B1B36]">
                                    ETB {metrics.totalCommission.toLocaleString()}
                                  </div>
                                  <div className="text-[10px] text-[#536171] font-mono mt-0.5">
                                    T:{metrics.taskCommission} + R:{metrics.referralCommission}
                                  </div>
                                </td>

                                <td className="p-4">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedAgentForTree(ag)}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#F5F7FA] text-[#0B1B36] border border-[#AEB8C4]/40 hover:bg-[#0B1B36] hover:text-white transition cursor-pointer"
                                  >
                                    <UserPlus size={12} />
                                    <span>
                                      {referrals} {referrals === 1 ? 'referral' : 'referrals'}
                                    </span>
                                  </button>
                                </td>

                                <td className="p-4">
                                  <select
                                    disabled={updatingAgentId === ag.id}
                                    value={currentStatus}
                                    onChange={(e) =>
                                      handleUpdateAgentStatus(ag.id, e.target.value)
                                    }
                                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize border focus:outline-none cursor-pointer ${getStatusBadgeStyle(
                                      currentStatus
                                    )}`}
                                  >
                                    <option value="active">active</option>
                                    <option value="suspended">suspended</option>
                                    <option value="inactive">inactive</option>
                                  </select>
                                </td>

                                <td className="p-4 text-right">
                                  <button
                                    type="button"
                                    onClick={() => setDeletingAgentTarget(ag)}
                                    className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition cursor-pointer"
                                    title="Delete Agent Account"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TRANSACTIONS TAB (SEPARATED BY DATE) */}
        {activeTab === 'transactions' && (
          <div className="space-y-4">
            <div className="bg-white border border-[#AEB8C4]/40 rounded-3xl p-4 sm:p-5 shadow-xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {['pending', 'approved', 'rejected', 'all'].map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setFilterStatus(status)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold capitalize transition cursor-pointer ${
                      filterStatus === status
                        ? 'bg-[#0B1B36] text-white'
                        : 'bg-[#F5F7FA] text-[#536171] hover:text-[#0B1B36]'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search
                    size={14}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#536171]"
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search agent, phone, ref, amount..."
                    className="w-full bg-[#F5F7FA] border border-[#AEB8C4]/50 rounded-xl pl-9 pr-3 py-2 text-xs text-[#0B1B36] placeholder:text-[#536171] focus:outline-none focus:border-[#0B1B36] focus:bg-white transition"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-3 py-2 rounded-xl text-xs font-semibold bg-[#F5F7FA] hover:bg-slate-200/70 text-[#536171] hover:text-[#0B1B36] border border-[#AEB8C4]/40 transition cursor-pointer"
                >
                  Reset
                </button>
              </div>
            </div>

            {selectedIds.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-[#0B1B36]/20 px-5 py-3 rounded-2xl shadow-xs text-xs">
                <span className="font-semibold text-[#0B1B36]">
                  {selectedIds.length} pending transaction{selectedIds.length > 1 ? 's' : ''} selected
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={processingId === 'bulk'}
                    onClick={() => handleBulkStatusUpdate('approved')}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition disabled:opacity-50 cursor-pointer"
                  >
                    Approve Selected
                  </button>
                  <button
                    type="button"
                    disabled={processingId === 'bulk'}
                    onClick={() => handleBulkStatusUpdate('rejected')}
                    className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold transition disabled:opacity-50 cursor-pointer"
                  >
                    Reject Selected
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedIds([])}
                    className="px-3 py-1.5 rounded-xl bg-[#F5F7FA] hover:bg-slate-200/70 text-[#536171] font-semibold transition cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}

            {loading ? (
              <div className="bg-white border border-[#AEB8C4]/40 rounded-3xl p-10 text-center text-xs text-[#536171] shadow-xs">
                Loading transaction requests...
              </div>
            ) : groupedTransactions.length === 0 ? (
              <div className="bg-white border border-[#AEB8C4]/40 rounded-3xl p-10 text-center text-xs text-[#536171] shadow-xs">
                No matching transactions found.
              </div>
            ) : (
              <div className="space-y-6">
                {groupedTransactions.map((group) => {
                  const groupPendingIds = group.items
                    .filter((t) => (t.status || 'pending').toLowerCase() === 'pending')
                    .map((t) => t.id);

                  return (
                    <div key={group.dateKey} className="space-y-2.5">
                      <div className="flex items-center justify-between px-4 py-2.5 bg-white border border-[#AEB8C4]/40 rounded-2xl shadow-2xs">
                        <div className="flex items-center gap-2 text-xs font-bold text-[#0B1B36]">
                          <Calendar size={14} className="text-[#0B1B36]" />
                          <span>{group.dateLabel}</span>
                        </div>
                        <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#F5F7FA] text-[#536171] border border-[#AEB8C4]/30">
                          {group.items.length}{' '}
                          {group.items.length === 1 ? 'transaction' : 'transactions'}
                        </span>
                      </div>

                      <div className="overflow-x-auto bg-white border border-[#AEB8C4]/40 rounded-3xl shadow-xs">
                        <table className="w-full text-left text-xs">
                          <thead className="border-b border-[#AEB8C4]/30 text-[11px] uppercase tracking-wider text-[#536171] bg-[#F5F7FA]/80">
                            <tr>
                              <th className="p-4 w-11">
                                <input
                                  type="checkbox"
                                  className="rounded border-[#AEB8C4]"
                                  disabled={groupPendingIds.length === 0}
                                  checked={
                                    groupPendingIds.length > 0 &&
                                    groupPendingIds.every((id) => selectedIds.includes(id))
                                  }
                                  onChange={(e) =>
                                    setSelectedIds((prev) =>
                                      e.target.checked
                                        ? Array.from(new Set([...prev, ...groupPendingIds]))
                                        : prev.filter((id) => !groupPendingIds.includes(id))
                                    )
                                  }
                                />
                              </th>
                              <th className="p-4">Agent</th>
                              <th className="p-4">Date &amp; Time</th>
                              <th className="p-4">Type</th>
                              <th className="p-4">Amount</th>
                              <th className="p-4">Reference</th>
                              <th className="p-4">Status</th>
                              <th className="p-4 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#AEB8C4]/25">
                            {group.items.map((tx) => {
                              const agentObj = Array.isArray(tx.agents)
                                ? tx.agents[0]
                                : tx.agents;
                              const isBusy =
                                processingId === tx.id || processingId === 'bulk';
                              const normalizedStatus = (tx.status || 'pending').toLowerCase();
                              const isPending = normalizedStatus === 'pending';
                              const rawType = tx.type || tx.tx_type || tx.request_type || '-';
                              const isWithdrawal = ['withdrawal', 'withdraw', 'payout'].includes(
                                rawType.toLowerCase()
                              );

                              return (
                                <tr key={tx.id} className="hover:bg-[#F5F7FA]/70 transition">
                                  <td className="p-4">
                                    <input
                                      type="checkbox"
                                      className="rounded border-[#AEB8C4] disabled:opacity-35"
                                      disabled={!isPending}
                                      checked={isPending && selectedIds.includes(tx.id)}
                                      onChange={() => toggleSelectId(tx.id)}
                                    />
                                  </td>
                                  <td className="p-4">
                                    <div className="font-semibold text-sm text-[#0B1B36]">
                                      {agentObj?.username ||
                                        agentObj?.full_name ||
                                        agentObj?.email ||
                                        tx.agent_id ||
                                        'Unknown'}
                                    </div>
                                    <div className="text-[11px] text-[#536171] mt-0.5">
                                      {agentObj?.phone || 'No phone'}
                                      {agentObj?.balance != null
                                        ? ` • Bal: ETB ${roundMoney(
                                            parseNumericValue(agentObj.balance)
                                          ).toLocaleString()}`
                                        : ''}
                                    </div>
                                  </td>
                                  <td className="p-4 text-[11px] text-[#536171] whitespace-nowrap">
                                    {formatDateTime(tx.created_at)}
                                  </td>
                                  <td className="p-4">
                                    <span className="inline-flex items-center gap-1 capitalize font-semibold text-[#0B1B36]">
                                      {isWithdrawal ? (
                                        <ArrowUpRight size={13} className="text-amber-600" />
                                      ) : (
                                        <ArrowDownLeft size={13} className="text-emerald-600" />
                                      )}
                                      {rawType}
                                    </span>
                                  </td>
                                  <td className="p-4 font-bold text-sm text-[#0B1B36]">
                                    ETB{' '}
                                    {roundMoney(parseNumericValue(tx.amount)).toLocaleString()}
                                  </td>
                                  <td className="p-4 font-mono text-[11px] text-[#536171]">
                                    {tx.reference || tx.transaction_ref || '-'}
                                  </td>
                                  <td className="p-4">
                                    <span
                                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize border ${getStatusBadgeStyle(
                                        tx.status
                                      )}`}
                                    >
                                      {tx.status || 'pending'}
                                    </span>
                                  </td>
                                  <td className="p-4 text-right whitespace-nowrap">
                                    {isPending ? (
                                      <div className="inline-flex items-center gap-2">
                                        <button
                                          type="button"
                                          disabled={isBusy}
                                          onClick={() =>
                                            handleUpdateTransactionStatus(tx.id, 'approved')
                                          }
                                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition disabled:opacity-50 cursor-pointer"
                                        >
                                          <CheckCircle2 size={13} />
                                          <span>Approve</span>
                                        </button>
                                        <button
                                          type="button"
                                          disabled={isBusy}
                                          onClick={() =>
                                            handleUpdateTransactionStatus(tx.id, 'rejected')
                                          }
                                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold transition disabled:opacity-50 cursor-pointer"
                                        >
                                          <XCircle size={13} />
                                          <span>Reject</span>
                                        </button>
                                      </div>
                                    ) : (
                                      <span className="text-[11px] font-medium text-[#536171]">
                                        Processed
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* SUPER AGENTS TAB (SEPARATED BY DATE) */}
        {activeTab === 'super-agents' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <form
              onSubmit={handleCreateSuperAgent}
              className="bg-white border border-[#AEB8C4]/40 rounded-3xl p-6 shadow-xs space-y-4 h-fit"
            >
              <div className="flex items-center justify-between border-b border-[#AEB8C4]/30 pb-3">
                <h2 className="text-base font-bold text-[#0B1B36] flex items-center gap-2">
                  <Plus size={16} />
                  <span>Add Super Agent</span>
                </h2>
                <button
                  type="button"
                  onClick={handleResetCreateForm}
                  className="text-xs font-medium text-[#536171] hover:text-[#0B1B36] cursor-pointer"
                >
                  Clear
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#536171] mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-[#F5F7FA] border border-[#AEB8C4]/50 rounded-xl px-3.5 py-2 text-xs text-[#0B1B36] focus:outline-none focus:border-[#0B1B36] focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#536171] mb-1">
                  Region *
                </label>
                <input
                  type="text"
                  required
                  value={newRegion}
                  onChange={(e) => setNewRegion(e.target.value)}
                  className="w-full bg-[#F5F7FA] border border-[#AEB8C4]/50 rounded-xl px-3.5 py-2 text-xs text-[#0B1B36] focus:outline-none focus:border-[#0B1B36] focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#536171] mb-1">
                  Phone
                </label>
                <input
                  type="text"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="+2519..."
                  className="w-full bg-[#F5F7FA] border border-[#AEB8C4]/50 rounded-xl px-3.5 py-2 text-xs text-[#0B1B36] focus:outline-none focus:border-[#0B1B36] focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#536171] mb-1">
                  Telebirr Account
                </label>
                <input
                  type="text"
                  value={newTelebirr}
                  onChange={(e) => setNewTelebirr(e.target.value)}
                  className="w-full bg-[#F5F7FA] border border-[#AEB8C4]/50 rounded-xl px-3.5 py-2 text-xs text-[#0B1B36] focus:outline-none focus:border-[#0B1B36] focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#536171] mb-1">
                  CBE Account
                </label>
                <input
                  type="text"
                  value={newCbe}
                  onChange={(e) => setNewCbe(e.target.value)}
                  className="w-full bg-[#F5F7FA] border border-[#AEB8C4]/50 rounded-xl px-3.5 py-2 text-xs text-[#0B1B36] focus:outline-none focus:border-[#0B1B36] focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#536171] mb-1">
                  Initial Password (optional, min 6 chars)
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-[#F5F7FA] border border-[#AEB8C4]/50 rounded-xl px-3.5 py-2 text-xs text-[#0B1B36] focus:outline-none focus:border-[#0B1B36] focus:bg-white transition"
                />
              </div>

              <button
                type="submit"
                disabled={creatingAgent}
                className="w-full py-2.5 rounded-xl bg-[#0B1B36] hover:bg-[#162d57] text-white font-semibold text-xs transition disabled:opacity-50 cursor-pointer"
              >
                {creatingAgent ? 'Creating...' : 'Create Super Agent'}
              </button>
            </form>

            <div className="lg:col-span-2 bg-white border border-[#AEB8C4]/40 rounded-3xl p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-[#AEB8C4]/30 pb-3">
                <h2 className="text-base font-bold text-[#0B1B36] flex items-center gap-2">
                  <SlidersHorizontal size={16} />
                  <span>Super Agent Nodes</span>
                </h2>
                <button
                  type="button"
                  onClick={() => fetchSuperAgents(true)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-[#F5F7FA] hover:bg-slate-200/70 text-[#0B1B36] border border-[#AEB8C4]/40 transition cursor-pointer"
                >
                  Refresh Nodes
                </button>
              </div>

              {loadingAgents ? (
                <p className="text-xs text-[#536171] py-6">Loading Super Agents...</p>
              ) : groupedSuperAgents.length === 0 ? (
                <p className="text-xs text-[#536171] py-6">No Super Agents registered yet.</p>
              ) : (
                <div className="space-y-6">
                  {groupedSuperAgents.map((group) => (
                    <div key={group.dateKey} className="space-y-2">
                      <div className="flex items-center justify-between px-3.5 py-2 bg-[#F5F7FA] border border-[#AEB8C4]/30 rounded-xl">
                        <div className="flex items-center gap-2 text-xs font-bold text-[#0B1B36]">
                          <Calendar size={13} />
                          <span>{group.dateLabel}</span>
                        </div>
                        <span className="text-[11px] font-semibold text-[#536171]">
                          {group.items.length} {group.items.length === 1 ? 'node' : 'nodes'}
                        </span>
                      </div>

                      <div className="divide-y divide-[#AEB8C4]/25 border border-[#AEB8C4]/30 rounded-2xl px-4 bg-white">
                        {group.items.map((agent) => (
                          <div
                            key={agent.id}
                            className="py-4 flex flex-wrap items-center justify-between gap-3"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-[#0B1B36]">
                                  {agent.name}
                                </span>
                                <span
                                  className={`text-[11px] font-semibold capitalize px-2.5 py-0.5 rounded-full border ${getStatusBadgeStyle(
                                    agent.status || 'active'
                                  )}`}
                                >
                                  {agent.status || 'active'}
                                </span>
                              </div>
                              <div className="text-xs text-[#536171]">
                                Region: <strong className="text-[#0B1B36]">{agent.region}</strong>
                                {agent.phone ? ` • Phone: ${agent.phone}` : ''}
                              </div>
                              <div className="text-[11px] font-mono text-[#536171]">
                                Telebirr: {agent.telebirr_account || '-'} • CBE:{' '}
                                {agent.cbe_account || '-'}
                              </div>
                              <div className="text-[10px] text-[#536171]">
                                Created: {formatDateTime(agent.created_at)}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => openEditAgentModal(agent)}
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#F5F7FA] hover:bg-[#0B1B36] text-[#0B1B36] hover:text-white border border-[#AEB8C4]/50 text-xs font-semibold transition cursor-pointer"
                            >
                              <KeyRound size={13} />
                              <span>Edit / Reset</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal: Confirm Bulk Agent Deletion */}
        {confirmBulkDeleteOpen && (
          <div className="fixed inset-0 z-50 bg-[#0B1B36]/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-white border border-rose-200 rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center gap-3 text-rose-600">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0B1B36]">Bulk Delete Agents</h3>
                  <p className="text-xs text-[#536171]">This action cannot be undone</p>
                </div>
              </div>

              <p className="text-xs text-[#536171]">
                Are you sure you want to permanently delete{' '}
                <strong className="text-[#0B1B36]">
                  {selectedAgentIds.length} selected agent account
                  {selectedAgentIds.length > 1 ? 's' : ''}
                </strong>
                ? Associated referral links, tasks, transactions, and balances will be removed.
              </p>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={isBulkDeletingAgents}
                  onClick={() => setConfirmBulkDeleteOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#F5F7FA] hover:bg-slate-200/70 text-[#536171] text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isBulkDeletingAgents}
                  onClick={handleBulkDeleteAgents}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition disabled:opacity-50 cursor-pointer"
                >
                  {isBulkDeletingAgents ? 'Deleting...' : 'Delete Selected'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Confirm Agent Deletion */}
        {deletingAgentTarget && (
          <div className="fixed inset-0 z-50 bg-[#0B1B36]/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-white border border-rose-200 rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center gap-3 text-rose-600">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0B1B36]">Delete Agent Account</h3>
                  <p className="text-xs text-[#536171]">This action cannot be undone</p>
                </div>
              </div>

              <p className="text-xs text-[#536171]">
                Are you sure you want to permanently delete agent{' '}
                <strong className="text-[#0B1B36]">
                  {deletingAgentTarget.full_name ||
                    deletingAgentTarget.username ||
                    deletingAgentTarget.id}
                </strong>
                ? Associated referral links, tasks, transactions, and balances will be removed.
              </p>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={isDeletingAgent}
                  onClick={() => setDeletingAgentTarget(null)}
                  className="px-4 py-2 rounded-xl bg-[#F5F7FA] hover:bg-slate-200/70 text-[#536171] text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeletingAgent}
                  onClick={handleDeleteAgentAccount}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition disabled:opacity-50 cursor-pointer"
                >
                  {isDeletingAgent ? 'Deleting...' : 'Delete Permanently'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Referrals, Tasks & Commission Breakdown */}
        {selectedAgentForTree && (
          <div className="fixed inset-0 z-50 bg-[#0B1B36]/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-white border border-[#AEB8C4]/50 rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#AEB8C4]/30 pb-3">
                <div>
                  <h3 className="text-base font-bold text-[#0B1B36]">
                    Referral Network, Tasks &amp; Commission
                  </h3>
                  <p className="text-xs text-[#536171]">
                    Agent:{' '}
                    <strong className="text-[#0B1B36]">
                      {selectedAgentForTree.full_name ||
                        selectedAgentForTree.username ||
                        selectedAgentForTree.phone}
                    </strong>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedAgentForTree(null)}
                  className="p-1.5 rounded-xl text-[#536171] hover:text-[#0B1B36] hover:bg-[#F5F7FA] cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {(() => {
                const m = commissionMap[selectedAgentForTree.id] || {
                  todayTasks: 0,
                  totalTasks: 0,
                  taskCommission: 0,
                  referralCommission: 0,
                  totalCommission: 0,
                };
                return (
                  <div className="grid grid-cols-3 gap-2.5 bg-[#F5F7FA] border border-[#AEB8C4]/40 rounded-2xl p-3.5 text-xs">
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[#536171] block">
                        Daily Tasks
                      </span>
                      <span className="font-bold text-sm text-[#0B1B36]">
                        {m.todayTasks} today / {m.totalTasks} total
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[#536171] block">
                        Task + Ref Comm.
                      </span>
                      <span className="font-bold text-sm text-emerald-700">
                        ETB {m.totalCommission.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[#536171] block">
                        Breakdown
                      </span>
                      <span className="font-mono text-[11px] text-[#0B1B36]">
                        T:{m.taskCommission} • R:{m.referralCommission}
                      </span>
                    </div>
                  </div>
                );
              })()}

              <div className="bg-[#F5F7FA] border border-[#AEB8C4]/40 rounded-2xl p-3.5 text-xs">
                <span className="font-semibold text-[#536171] uppercase tracking-wider text-[10px] block mb-1">
                  Invited By (Parent)
                </span>
                {inviterMap[selectedAgentForTree.id] ? (
                  <div className="flex items-center gap-2">
                    <GitBranch size={14} className="text-[#0B1B36]" />
                    <span className="font-bold text-[#0B1B36]">
                      {inviterMap[selectedAgentForTree.id].full_name ||
                        inviterMap[selectedAgentForTree.id].username ||
                        inviterMap[selectedAgentForTree.id].phone}
                    </span>
                    <span className="text-[11px] text-[#536171]">
                      (Bal: ETB{' '}
                      {roundMoney(
                        parseNumericValue(inviterMap[selectedAgentForTree.id].balance)
                      ).toLocaleString()}
                      )
                    </span>
                  </div>
                ) : (
                  <span className="text-[#536171] italic">Direct Registration (No Referrer)</span>
                )}
              </div>

              <div className="space-y-2">
                <span className="font-semibold text-[#536171] uppercase tracking-wider text-[10px] block">
                  Direct Referrals Onboarded (
                  {invitedChildrenMap[selectedAgentForTree.id]?.length || 0})
                </span>
                {invitedChildrenMap[selectedAgentForTree.id]?.length ? (
                  <div className="space-y-3 max-h-64 overflow-y-auto border border-[#AEB8C4]/40 rounded-2xl bg-white p-3">
                    {groupItemsByDate(
                      [...(invitedChildrenMap[selectedAgentForTree.id] || [])].sort((a, b) =>
                        compareByDateTime(a, b, sortDirection)
                      ),
                      sortDirection
                    ).map((childGroup) => (
                      <div key={childGroup.dateKey} className="space-y-1">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-[#536171] px-2 py-1 bg-[#F5F7FA] rounded-lg">
                          {childGroup.dateLabel}
                        </div>
                        <div className="divide-y divide-[#AEB8C4]/20">
                          {childGroup.items.map((child) => (
                            <div
                              key={child.id}
                              className="py-2 px-2.5 flex items-center justify-between text-xs hover:bg-[#F5F7FA] rounded-xl"
                            >
                              <div>
                                <div className="font-semibold text-[#0B1B36]">
                                  {child.full_name || child.username || child.phone}
                                </div>
                                <div className="text-[10px] text-[#536171]">
                                  {child.email || child.id} • {formatDateTime(child.created_at)}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-bold text-emerald-700">
                                  ETB {roundMoney(parseNumericValue(child.balance)).toLocaleString()}
                                </div>
                                <div className="text-[10px] text-[#536171]">
                                  {child.status || 'active'}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#536171] py-4 text-center border border-dashed border-[#AEB8C4]/40 rounded-2xl">
                    This agent has not invited any sub-agents yet.
                  </p>
                )}
              </div>

              <div className="pt-2 text-right">
                <button
                  type="button"
                  onClick={() => setSelectedAgentForTree(null)}
                  className="px-4 py-2 rounded-xl bg-[#0B1B36] text-white text-xs font-semibold transition cursor-pointer"
                >
                  Close Network
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit / Reset Password Modal */}
        {editingAgent && (
          <div className="fixed inset-0 z-50 bg-[#0B1B36]/40 backdrop-blur-xs flex items-center justify-center p-4">
            <form
              onSubmit={handleSaveAgentChanges}
              className="w-full max-w-md bg-white border border-[#AEB8C4]/50 rounded-3xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-[#AEB8C4]/30 pb-3">
                <h3 className="text-base font-bold text-[#0B1B36]">
                  Edit / Reset Super Agent
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setEditingAgent(null);
                    setEditPassword('');
                  }}
                  className="p-1.5 rounded-xl text-[#536171] hover:text-[#0B1B36] hover:bg-[#F5F7FA] cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#536171] mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-[#F5F7FA] border border-[#AEB8C4]/50 rounded-xl px-3.5 py-2 text-xs text-[#0B1B36] focus:outline-none focus:border-[#0B1B36] focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#536171] mb-1">
                  Region *
                </label>
                <input
                  type="text"
                  required
                  value={editRegion}
                  onChange={(e) => setEditRegion(e.target.value)}
                  className="w-full bg-[#F5F7FA] border border-[#AEB8C4]/50 rounded-xl px-3.5 py-2 text-xs text-[#0B1B36] focus:outline-none focus:border-[#0B1B36] focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#536171] mb-1">
                  Phone
                </label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full bg-[#F5F7FA] border border-[#AEB8C4]/50 rounded-xl px-3.5 py-2 text-xs text-[#0B1B36] focus:outline-none focus:border-[#0B1B36] focus:bg-white transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#536171] mb-1">
                    Telebirr
                  </label>
                  <input
                    type="text"
                    value={editTelebirr}
                    onChange={(e) => setEditTelebirr(e.target.value)}
                    className="w-full bg-[#F5F7FA] border border-[#AEB8C4]/50 rounded-xl px-3.5 py-2 text-xs text-[#0B1B36] focus:outline-none focus:border-[#0B1B36] focus:bg-white transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#536171] mb-1">
                    CBE
                  </label>
                  <input
                    type="text"
                    value={editCbe}
                    onChange={(e) => setEditCbe(e.target.value)}
                    className="w-full bg-[#F5F7FA] border border-[#AEB8C4]/50 rounded-xl px-3.5 py-2 text-xs text-[#0B1B36] focus:outline-none focus:border-[#0B1B36] focus:bg-white transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#536171] mb-1">
                  Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full bg-[#F5F7FA] border border-[#AEB8C4]/50 rounded-xl px-3.5 py-2 text-xs text-[#0B1B36] focus:outline-none focus:border-[#0B1B36] focus:bg-white transition"
                >
                  <option value="active">active</option>
                  <option value="suspended">suspended</option>
                  <option value="inactive">inactive</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-[#536171]">
                    Reset Login Password (optional)
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateTempPassword}
                    className="text-xs font-semibold text-[#0B1B36] hover:underline cursor-pointer"
                  >
                    Generate Temp Password
                  </button>
                </div>
                <input
                  type="text"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="Leave blank to keep current password"
                  className="w-full bg-[#F5F7FA] border border-[#AEB8C4]/50 rounded-xl px-3.5 py-2 text-xs font-mono text-[#0B1B36] focus:outline-none focus:border-[#0B1B36] focus:bg-white transition"
                />
              </div>

              <div className="flex items-center justify-between gap-2 pt-3 border-t border-[#AEB8C4]/30">
                <button
                  type="button"
                  disabled={deletingSuperAgent}
                  onClick={handleDeleteSuperAgentNode}
                  className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 size={13} />
                  <span>{deletingSuperAgent ? 'Deleting...' : 'Delete Node'}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingAgent(null);
                      setEditPassword('');
                    }}
                    className="px-4 py-2 rounded-xl bg-[#F5F7FA] hover:bg-slate-200/70 text-[#536171] text-xs font-semibold transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingEdit}
                    className="px-4 py-2 rounded-xl bg-[#0B1B36] hover:bg-[#162d57] text-white text-xs font-semibold transition disabled:opacity-50 cursor-pointer"
                  >
                    {savingEdit ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}