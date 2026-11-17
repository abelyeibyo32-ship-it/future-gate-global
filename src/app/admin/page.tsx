// src/app/admin/page.tsx
'use client';

import React, { useState, useEffect, Suspense, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldAlert,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Lock,
  KeyRound,
  Smartphone,
  Building2,
  Plus,
  Edit,
  Trash2,
  Users,
  Layers,
  Filter,
  DollarSign,
  TrendingUp,
  CreditCard,
  Phone,
  User,
  Image as ImageIcon
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pgxjlplomzyktaumrovi.supabase.co';
const supabaseAnonKey = 'sb_publishable_xd8Anc2KXl0Gx_kgtK50mQ_HeI0no4C';
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const ADMIN_MASTER_PIN = '9999';

const ENTERPRISE_CATEGORIES = [
  { name: 'Electronics', deposit: 10500 },
  { name: 'Furniture', deposit: 24000 },
  { name: 'Solar Systems', deposit: 43000 },
  { name: 'EV Bikes & Tuk-Tuks', deposit: 70000 },
  { name: 'Real Estate', deposit: 110000 },
];

interface SuperAgentNode {
  id: string;
  name: string;
  tier: string;
  pin: string;
  region: string;
  phone?: string;
  telebirr_account?: string;
  cbe_account?: string;
  created_at?: string;
}

interface TransactionRequest {
  id: string;
  agent_id: string;
  super_agent_id: string | null;
  super_agent_name: string | null;
  type: 'deposit' | 'withdrawal' | 'registration';
  method: 'telebirr' | 'cbe';
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  sender_or_receiver_number: string;
  transaction_ref?: string;
  receipt_url?: string;
  created_at: string;
}

interface AgentRecord {
  id: string;
  username?: string;
  phone?: string;
  capital_balance?: number;
  balance?: number;
  tier?: string;
  created_at?: string;
}

function AdminConsoleContent() {
  const router = useRouter();

  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminPin, setAdminPin] = useState('');
  const [pinError, setPinError] = useState(false);

  // Data States
  const [superAgents, setSuperAgents] = useState<SuperAgentNode[]>([]);
  const [agents, setAgents] = useState<AgentRecord[]>([]);
  const [transactions, setTransactions] = useState<TransactionRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // UI Filters & Modals
  const [activeTab, setActiveTab] = useState<'overview' | 'nodes' | 'transactions'>('overview');
  const [txFilter, setTxFilter] = useState<'all' | 'registration' | 'deposit' | 'withdrawal'>('all');
  const [isNodeModalOpen, setIsNodeModalOpen] = useState(false);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);

  // Screenshot Preview Modal State
  const [previewReceiptUrl, setPreviewReceiptUrl] = useState<string | null>(null);

  // Form States for Node Creation/Edit
  const [nodeFormName, setNodeFormName] = useState('');
  const [nodeFormTier, setNodeFormTier] = useState('Solar Systems');
  const [nodeFormRegion, setNodeFormRegion] = useState('Addis Ababa');
  const [nodeFormPin, setNodeFormPin] = useState('1234');
  const [nodeFormPhone, setNodeFormPhone] = useState('');
  const [nodeFormTelebirr, setNodeFormTelebirr] = useState('');
  const [nodeFormCBE, setNodeFormCBE] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchAdminData = async () => {
    setLoading(true);

    const { data: nodesData } = await supabase
      .from('super_agents')
      .select('*')
      .order('id', { ascending: true });
    if (nodesData) setSuperAgents(nodesData as SuperAgentNode[]);

    const { data: agentsData } = await supabase
      .from('agents')
      .select('*');
    if (agentsData) setAgents(agentsData as AgentRecord[]);

    const { data: txData } = await supabase
      .from('transaction_requests')
      .select('*')
      .order('created_at', { ascending: false });
    if (txData) setTransactions(txData as TransactionRequest[]);

    setLoading(false);
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchAdminData();

    const channel = supabase
      .channel('admin-master-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'super_agents' }, () => fetchAdminData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agents' }, () => fetchAdminData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transaction_requests' }, () => fetchAdminData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated]);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPin.trim() === ADMIN_MASTER_PIN) {
      setIsAuthenticated(true);
      setPinError(false);
      showToast('Master Admin Console Unlocked.');
    } else {
      setPinError(true);
      setTimeout(() => setPinError(false), 2500);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingNodeId(null);
    setNodeFormName('');
    setNodeFormTier('Solar Systems');
    setNodeFormRegion('Addis Ababa');
    setNodeFormPin('1234');
    setNodeFormPhone('');
    setNodeFormTelebirr('');
    setNodeFormCBE('');
    setIsNodeModalOpen(true);
  };

  const handleOpenEditModal = (node: SuperAgentNode) => {
    setEditingNodeId(node.id);
    setNodeFormName(node.name || '');
    setNodeFormTier(node.tier || 'Solar Systems');
    setNodeFormRegion(node.region || 'Addis Ababa');
    setNodeFormPin(node.pin || '1234');
    setNodeFormPhone(node.phone || '');
    setNodeFormTelebirr(node.telebirr_account || '');
    setNodeFormCBE(node.cbe_account || '');
    setIsNodeModalOpen(true);
  };

  const handleSaveSuperAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const payload = {
      name: nodeFormName.trim(),
      region: nodeFormRegion.trim(),
      tier: nodeFormTier,
      pin: nodeFormPin.trim(),
      phone: nodeFormPhone.trim() || null,
      telebirr_account: nodeFormTelebirr.trim() || null,
      cbe_account: nodeFormCBE.trim() || null,
    };

    if (editingNodeId) {
      const { error } = await supabase
        .from('super_agents')
        .update(payload)
        .eq('id', editingNodeId);

      if (error) {
        showToast(`Update Failed: ${error.message}`);
      } else {
        showToast(`Node ${editingNodeId} & Wallets Updated!`);
      }
    } else {
      const newId = `sa-${Date.now().toString().slice(-4)}`;
      const { error } = await supabase
        .from('super_agents')
        .insert([{ id: newId, ...payload }]);

      if (error) {
        showToast(`Creation Failed: ${error.message}`);
      } else {
        showToast(`New Node ${newId} Created & Linked!`);
      }
    }

    await fetchAdminData();
    setIsSaving(false);
    setIsNodeModalOpen(false);
  };

  const handleDeleteNode = async (id: string) => {
    if (!confirm(`Are you sure you want to remove Super Agent Node ${id}?`)) return;

    const { error } = await supabase.from('super_agents').delete().eq('id', id);
    if (error) {
      showToast(`Delete Failed: ${error.message}`);
    } else {
      showToast(`Node ${id} deleted.`);
      fetchAdminData();
    }
  };

  const totalCapitalBase = useMemo(() => {
    return agents.reduce((sum, a) => sum + Number(a.capital_balance || 0), 0);
  }, [agents]);

  const totalInflow = useMemo(() => {
    return transactions
      .filter((t) => t.status === 'approved' && (t.type === 'deposit' || t.type === 'registration'))
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  }, [transactions]);

  const totalOutflow = useMemo(() => {
    return transactions
      .filter((t) => t.status === 'approved' && t.type === 'withdrawal')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    if (txFilter === 'all') return transactions;
    return transactions.filter((t) => t.type === txFilter);
  }, [transactions, txFilter]);

  const agentMap = useMemo(() => {
    const map = new Map<string, AgentRecord>();
    agents.forEach((a) => map.set(a.id, a));
    return map;
  }, [agents]);

  const superAgentMap = useMemo(() => {
    const map = new Map<string, SuperAgentNode>();
    superAgents.forEach((s) => map.set(s.id, s));
    return map;
  }, [superAgents]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] text-[#0B1B36] font-mono flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 border border-[#AEB8C4]/40 shadow-2xl max-w-md w-full space-y-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#0B1B36] text-white flex items-center justify-center mx-auto shadow-lg">
            <Lock size={28} className="text-emerald-400" />
          </div>

          <div className="space-y-1">
            <div className="text-xs text-[#536171] uppercase tracking-wider font-bold">Master Partition Access</div>
            <h2 className="text-xl font-extrabold text-[#0B1B36]">Admin Master Console</h2>
            <p className="text-[11px] text-[#536171]">Enter Master Admin PIN to oversee system network.</p>
          </div>

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div className="space-y-1 text-left">
              <label className="text-xs font-bold text-[#0B1B36]">Master PIN Code</label>
              <div className="relative">
                <KeyRound size={16} className="absolute left-4 top-3.5 text-[#536171]" />
                <input
                  type="password"
                  maxLength={4}
                  placeholder="••••"
                  value={adminPin}
                  onChange={(e) => setAdminPin(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-[#F5F7FA] border border-[#AEB8C4]/40 focus:outline-none focus:ring-2 focus:ring-[#0B1B36] text-[#0B1B36] font-bold text-center tracking-widest text-lg"
                  required
                />
              </div>
            </div>

            {pinError && (
              <div className="text-xs text-red-600 font-bold bg-red-50 p-2.5 rounded-xl border border-red-200 flex items-center gap-2 justify-center">
                <XCircle size={14} /> Master PIN Verification Failed.
              </div>
            )}

            <button
              type="submit"
              className="w-full py-4 rounded-2xl bg-[#0B1B36] hover:bg-[#152d56] text-white font-extrabold uppercase tracking-wider transition shadow-lg cursor-pointer text-xs"
            >
              Unlock Master Console
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#0B1B36] font-mono p-4 sm:p-8 relative selection:bg-[#0B1B36] selection:text-white">
      
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0B1B36] text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-white/20 text-xs font-mono flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
          <span>{toastMessage}</span>
        </div>
      )}

      {previewReceiptUrl && (
        <div className="fixed inset-0 bg-[#0B1B36]/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full shadow-2xl border border-[#AEB8C4]/40 space-y-4 text-center">
            <div className="flex justify-between items-center border-b border-[#AEB8C4]/30 pb-3">
              <h3 className="text-sm font-extrabold text-[#0B1B36] uppercase tracking-wider flex items-center gap-2">
                <ImageIcon size={16} className="text-[#0B1B36]" /> Transaction Receipt Proof
              </h3>
              <button onClick={() => setPreviewReceiptUrl(null)} className="text-[#536171] hover:text-[#0B1B36] font-bold cursor-pointer text-sm">✕</button>
            </div>
            <div className="overflow-auto max-h-[70vh] rounded-2xl border border-[#AEB8C4]/30 bg-slate-50 p-2 flex items-center justify-center">
              <img src={previewReceiptUrl} alt="Transaction Receipt Proof" className="max-w-full rounded-xl object-contain shadow-md" />
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setPreviewReceiptUrl(null)}
                className="px-5 py-2.5 rounded-xl bg-[#0B1B36] text-white text-xs font-bold hover:bg-[#152d56] transition cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {isNodeModalOpen && (
        <div className="fixed inset-0 bg-[#0B1B36]/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-[#AEB8C4]/40 space-y-6">
            <div className="flex justify-between items-center border-b border-[#AEB8C4]/30 pb-4">
              <h3 className="text-base font-extrabold text-[#0B1B36] uppercase tracking-tight flex items-center gap-2">
                <Building2 size={18} className="text-[#0B1B36]" />
                {editingNodeId ? `Edit Node: ${editingNodeId}` : 'Create New Super Agent Node'}
              </h3>
              <button onClick={() => setIsNodeModalOpen(false)} className="text-[#536171] hover:text-[#0B1B36] font-bold cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSaveSuperAgent} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-[#0B1B36]">Node / Business Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Merkato Main Hub"
                  value={nodeFormName}
                  onChange={(e) => setNodeFormName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F7FA] border border-[#AEB8C4]/40 font-bold focus:outline-none focus:ring-2 focus:ring-[#0B1B36]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-[#0B1B36]">Enterprise Category Tier</label>
                  <select
                    value={nodeFormTier}
                    onChange={(e) => setNodeFormTier(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F7FA] border border-[#AEB8C4]/40 font-bold focus:outline-none focus:ring-2 focus:ring-[#0B1B36]"
                  >
                    {ENTERPRISE_CATEGORIES.map((cat) => (
                      <option key={cat.name} value={cat.name}>
                        {cat.name} (ETB {cat.deposit.toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[#0B1B36]">Region / Jurisdiction</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Addis Ababa"
                    value={nodeFormRegion}
                    onChange={(e) => setNodeFormRegion(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F7FA] border border-[#AEB8C4]/40 font-bold focus:outline-none focus:ring-2 focus:ring-[#0B1B36]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-[#0B1B36]">Node Terminal Security PIN</label>
                  <input
                    type="text"
                    maxLength={4}
                    required
                    placeholder="1234"
                    value={nodeFormPin}
                    onChange={(e) => setNodeFormPin(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F7FA] border border-[#AEB8C4]/40 font-bold focus:outline-none focus:ring-2 focus:ring-[#0B1B36] text-center tracking-widest font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[#0B1B36]">Contact Phone Number</label>
                  <input
                    type="text"
                    placeholder="0911223344"
                    value={nodeFormPhone}
                    onChange={(e) => setNodeFormPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F7FA] border border-[#AEB8C4]/40 font-bold focus:outline-none focus:ring-2 focus:ring-[#0B1B36]"
                  />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-3 pt-3">
                <div className="text-[11px] font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                  <Wallet size={14} className="text-indigo-600" /> Linked Payment Gateways
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-[#536171] text-[10px] uppercase">Telebirr Account / Phone</label>
                    <input
                      type="text"
                      placeholder="e.g. 0911223344"
                      value={nodeFormTelebirr}
                      onChange={(e) => setNodeFormTelebirr(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-[#AEB8C4]/40 font-bold focus:outline-none focus:ring-2 focus:ring-[#0B1B36]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-[#536171] text-[10px] uppercase">CBE Account Number</label>
                    <input
                      type="text"
                      placeholder="e.g. 1000123456789"
                      value={nodeFormCBE}
                      onChange={(e) => setNodeFormCBE(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-[#AEB8C4]/40 font-bold focus:outline-none focus:ring-2 focus:ring-[#0B1B36]"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-3.5 rounded-xl bg-[#0B1B36] hover:bg-[#152d56] text-white font-extrabold uppercase tracking-wider transition cursor-pointer text-center"
                >
                  {isSaving ? 'Saving Node...' : editingNodeId ? 'Update Node & Wallets' : 'Create Super Agent Node'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto space-y-6">
        
        <div className="bg-[#0B1B36] text-white p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <div className="text-xs text-[#AEB8C4] uppercase tracking-wider font-bold flex items-center gap-2">
              <ShieldAlert size={16} className="text-emerald-400" /> Master Administrative Console
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">System Network Overview</h1>
            <div className="text-[11px] text-[#AEB8C4]">
              Active Nodes: <strong className="text-emerald-400">{superAgents.length}</strong> | Registered Agents: <strong className="text-emerald-400">{agents.length}</strong>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchAdminData}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold transition flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Sync System Data
            </button>
            <button
              onClick={handleOpenCreateModal}
              className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-[#0B1B36] text-xs font-extrabold transition flex items-center gap-1.5 cursor-pointer shadow-lg"
            >
              <Plus size={16} /> New Super Agent Node
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-3xl border border-[#AEB8C4]/40 shadow-xs space-y-1">
            <div className="text-[10px] text-[#536171] uppercase font-bold tracking-wider flex items-center gap-1.5">
              <Wallet size={14} className="text-[#0B1B36]" /> Total System Capital
            </div>
            <div className="text-xl font-extrabold text-[#0B1B36]">
              ETB {totalCapitalBase.toLocaleString()}
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-[#AEB8C4]/40 shadow-xs space-y-1">
            <div className="text-[10px] text-[#536171] uppercase font-bold tracking-wider flex items-center gap-1.5">
              <TrendingUp size={14} className="text-emerald-600" /> Confirmed Gross Inflow
            </div>
            <div className="text-xl font-extrabold text-emerald-700">
              ETB {totalInflow.toLocaleString()}
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-[#AEB8C4]/40 shadow-xs space-y-1">
            <div className="text-[10px] text-[#536171] uppercase font-bold tracking-wider flex items-center gap-1.5">
              <ArrowDownLeft size={14} className="text-amber-600" /> Confirmed Outflow
            </div>
            <div className="text-xl font-extrabold text-amber-700">
              ETB {totalOutflow.toLocaleString()}
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-[#AEB8C4]/40 shadow-xs space-y-1">
            <div className="text-[10px] text-[#536171] uppercase font-bold tracking-wider flex items-center gap-1.5">
              <Users size={14} className="text-blue-600" /> Active Agents Registered
            </div>
            <div className="text-xl font-extrabold text-blue-900">
              {agents.length} Network Agents
            </div>
          </div>
        </div>

        <div className="flex bg-white p-1.5 rounded-2xl border border-[#AEB8C4]/40 gap-2 font-mono text-xs max-w-md">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 py-2 rounded-xl font-bold transition cursor-pointer ${
              activeTab === 'overview' ? 'bg-[#0B1B36] text-white shadow-xs' : 'text-[#536171] hover:text-[#0B1B36]'
            }`}
          >
            System Overview
          </button>
          <button
            onClick={() => setActiveTab('nodes')}
            className={`flex-1 py-2 rounded-xl font-bold transition cursor-pointer ${
              activeTab === 'nodes' ? 'bg-[#0B1B36] text-white shadow-xs' : 'text-[#536171] hover:text-[#0B1B36]'
            }`}
          >
            Super Agent Nodes ({superAgents.length})
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`flex-1 py-2 rounded-xl font-bold transition cursor-pointer ${
              activeTab === 'transactions' ? 'bg-[#0B1B36] text-white shadow-xs' : 'text-[#536171] hover:text-[#0B1B36]'
            }`}
          >
            Global Transactions ({transactions.length})
          </button>
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-[#AEB8C4]/40 shadow-md space-y-4">
              <h3 className="text-base font-extrabold text-[#0B1B36] flex items-center gap-2">
                <Layers size={18} /> Enterprise Category Capital Tiers
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-5 gap-3 text-xs">
                {ENTERPRISE_CATEGORIES.map((cat) => {
                  const nodeCount = superAgents.filter((s) => s.tier === cat.name).length;
                  return (
                    <div key={cat.name} className="p-4 rounded-2xl bg-[#F5F7FA] border border-[#AEB8C4]/30 space-y-1">
                      <div className="font-extrabold text-[#0B1B36]">{cat.name}</div>
                      <div className="text-[11px] text-[#536171]">Deposit: ETB {cat.deposit.toLocaleString()}</div>
                      <div className="pt-2 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full inline-block">
                        {nodeCount} Active Nodes
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'nodes' && (
          <div className="bg-white rounded-3xl p-6 border border-[#AEB8C4]/40 shadow-md space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-[#AEB8C4]/30">
              <h3 className="text-base font-extrabold text-[#0B1B36]">Super Agent Partition Nodes ({superAgents.length})</h3>
              <button
                onClick={handleOpenCreateModal}
                className="px-3.5 py-2 rounded-xl bg-[#0B1B36] text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={14} /> Add Super Agent
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {superAgents.map((node) => (
                <div key={node.id} className="p-5 rounded-2xl bg-[#F5F7FA] border border-[#AEB8C4]/30 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-[10px] font-extrabold text-[#536171] uppercase tracking-wider">Node ID: {node.id}</div>
                      <h4 className="text-base font-extrabold text-[#0B1B36]">{node.name}</h4>
                      <div className="text-xs text-[#536171]">Region: {node.region || 'Central'} | PIN: <code className="bg-slate-200 px-1 py-0.5 rounded text-[#0B1B36]">{node.pin}</code></div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenEditModal(node)}
                        className="p-2 rounded-xl bg-white border border-[#AEB8C4]/40 text-[#0B1B36] hover:bg-slate-100 transition cursor-pointer"
                        title="Edit Node & Linked Wallets"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteNode(node.id)}
                        className="p-2 rounded-xl bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition cursor-pointer"
                        title="Delete Node"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-white border border-[#AEB8C4]/30 text-xs space-y-1">
                    <div className="text-[10px] font-bold text-[#536171] uppercase flex items-center gap-1">
                      <CreditCard size={12} className="text-emerald-600" /> Linked Payment Gateways
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-0.5 text-[11px] font-bold">
                      <div>
                        <span className="text-[#536171] font-normal block">Telebirr:</span>
                        {node.telebirr_account ? <span className="text-emerald-700">{node.telebirr_account}</span> : <span className="text-slate-400 font-normal">Not configured</span>}
                      </div>
                      <div>
                        <span className="text-[#536171] font-normal block">CBE Account:</span>
                        {node.cbe_account ? <span className="text-blue-900">{node.cbe_account}</span> : <span className="text-slate-400 font-normal">Not configured</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-800 font-extrabold text-[10px] uppercase">
                      Tier: {node.tier}
                    </span>

                    <button
                      onClick={() => router.push(`/super-agent/${node.id}`)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0B1B36] hover:underline cursor-pointer"
                    >
                      Open Terminal Dashboard <ExternalLink size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="bg-white rounded-3xl p-6 border border-[#AEB8C4]/40 shadow-md space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#AEB8C4]/30">
              <h3 className="text-base font-extrabold text-[#0B1B36] flex items-center gap-2">
                <Filter size={16} /> Global Transaction Audit Queue ({filteredTransactions.length})
              </h3>

              <div className="flex bg-[#F5F7FA] p-1.5 rounded-2xl border border-[#AEB8C4]/30 gap-1.5 text-xs font-mono">
                <button
                  onClick={() => setTxFilter('all')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                    txFilter === 'all' ? 'bg-[#0B1B36] text-white shadow-xs' : 'text-[#536171] hover:text-[#0B1B36]'
                  }`}
                >
                  All ({transactions.length})
                </button>
                <button
                  onClick={() => setTxFilter('registration')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                    txFilter === 'registration' ? 'bg-[#0B1B36] text-white shadow-xs' : 'text-[#536171] hover:text-[#0B1B36]'
                  }`}
                >
                  Registrations
                </button>
                <button
                  onClick={() => setTxFilter('deposit')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                    txFilter === 'deposit' ? 'bg-[#0B1B36] text-white shadow-xs' : 'text-[#536171] hover:text-[#0B1B36]'
                  }`}
                >
                  Deposits
                </button>
                <button
                  onClick={() => setTxFilter('withdrawal')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                    txFilter === 'withdrawal' ? 'bg-[#0B1B36] text-white shadow-xs' : 'text-[#536171] hover:text-[#0B1B36]'
                  }`}
                >
                  Withdrawals
                </button>
              </div>
            </div>

            {filteredTransactions.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#536171] bg-[#F5F7FA] rounded-2xl border border-[#AEB8C4]/30">
                No system transactions matching category <strong className="uppercase">{txFilter}</strong>.
              </div>
            ) : (
              <div className="space-y-4">
                {filteredTransactions.map((tx) => {
                  const senderAgent = agentMap.get(tx.agent_id);
                  const approverNode = tx.super_agent_id ? superAgentMap.get(tx.super_agent_id) : null;

                  return (
                    <div key={tx.id} className="p-5 rounded-2xl bg-[#F5F7FA] border border-[#AEB8C4]/30 space-y-4 text-xs">
                      
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#AEB8C4]/20 pb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase ${
                            tx.type === 'registration' ? 'bg-indigo-700 text-white' :
                            tx.type === 'deposit' ? 'bg-[#0B1B36] text-white' : 'bg-emerald-600 text-white'
                          }`}>
                            {tx.type}
                          </span>
                          <span className="font-bold text-[#0B1B36]">{tx.transaction_ref || `REF-${tx.id.slice(0, 8)}`}</span>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                            tx.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                            tx.status === 'rejected' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {tx.status}
                          </span>
                        </div>

                        <div className="text-right">
                          <div className="text-sm font-extrabold text-[#0B1B36]">ETB {Number(tx.amount || 0).toLocaleString()}</div>
                          <div className="text-[10px] text-[#536171]">{new Date(tx.created_at).toLocaleString()}</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        
                        <div className="p-3.5 rounded-xl bg-white border border-[#AEB8C4]/30 space-y-1.5">
                          <div className="text-[10px] font-bold text-[#536171] uppercase flex items-center gap-1.5">
                            <User size={13} className="text-[#0B1B36]" /> Sender / Operator Details
                          </div>
                          <div className="space-y-1 pt-0.5">
                            <div className="flex justify-between">
                              <span className="text-[#536171]">Username:</span>
                              <strong className="text-[#0B1B36]">{senderAgent?.username || 'Unknown Operator'}</strong>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[#536171]">Phone / Account Number:</span>
                              <strong className="text-[#0B1B36] font-mono">{tx.sender_or_receiver_number || senderAgent?.phone || 'N/A'}</strong>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[#536171]">Agent ID:</span>
                              <strong className="text-slate-500 font-mono text-[10px]">{tx.agent_id}</strong>
                            </div>
                          </div>
                        </div>

                        <div className="p-3.5 rounded-xl bg-white border border-[#AEB8C4]/30 space-y-1.5">
                          <div className="text-[10px] font-bold text-[#536171] uppercase flex items-center gap-1.5">
                            <Building2 size={13} className="text-indigo-600" /> Approver / Inviter Node Details
                          </div>
                          <div className="space-y-1 pt-0.5">
                            <div className="flex justify-between">
                              <span className="text-[#536171]">Node Name:</span>
                              <strong className="text-[#0B1B36]">{tx.super_agent_name || approverNode?.name || 'Central Escrow Node'}</strong>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[#536171]">Gateway Method:</span>
                              <strong className="text-[#0B1B36] uppercase">{tx.method || 'telebirr'}</strong>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[#536171]">Node ID:</span>
                              <strong className="text-slate-500 font-mono text-[10px]">{tx.super_agent_id || 'sa-default'}</strong>
                            </div>
                          </div>
                        </div>

                      </div>

                      {tx.receipt_url && (
                        <div className="pt-1 flex items-center justify-between border-t border-[#AEB8C4]/20 mt-2 pt-3">
                          <div className="text-[11px] text-[#536171] flex items-center gap-1">
                            <ImageIcon size={14} className="text-emerald-600" /> Payment transaction receipt attached.
                          </div>
                          <button
                            onClick={() => setPreviewReceiptUrl(tx.receipt_url || null)}
                            className="px-4 py-2 rounded-xl bg-[#0B1B36] text-white hover:bg-[#152d56] transition text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                          >
                            <ExternalLink size={13} /> View Screenshot Proof
                          </button>
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

export default function AdminConsolePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F5F7FA] text-[#0B1B36] flex items-center justify-center font-mono text-xs">
        <div className="flex items-center gap-3">
          <RefreshCw size={16} className="animate-spin text-[#0B1B36]" />
          <span>Initializing Admin Master Console...</span>
        </div>
      </div>
    }>
      <AdminConsoleContent />
    </Suspense>
  );
}