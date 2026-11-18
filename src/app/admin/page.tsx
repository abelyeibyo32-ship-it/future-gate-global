// src/app/admin/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Search,
  ExternalLink,
  Layers,
  FileText,
  DollarSign,
  User,
  Smartphone,
  Check,
  X,
  Loader2,
  Filter,
  Image as ImageIcon,
  Calendar,
  Trash2,
  CheckSquare,
  Square,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Building2,
  Store,
  Plus,
  Lock,
  Eye,
  Edit3,
  Save,
  Info
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface TransactionRequest {
  id: string;
  agent_id: string;
  super_agent_id?: string;
  super_agent_name?: string;
  tier?: string;
  type: string;
  method: string;
  amount: number;
  transaction_ref: string;
  receipt_url?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  agents?: {
    username?: string;
    phone?: string;
    tier?: string;
    balance?: number;
  };
}

interface SuperAgentNode {
  id: string;
  name: string;
  region: string;
  phone?: string;
  telebirr_account?: string;
  cbe_account?: string;
  created_at?: string;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'transactions' | 'super_agents'>('transactions');
  
  // Transaction State
  const [transactions, setTransactions] = useState<TransactionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [notification, setNotification] = useState<string | null>(null);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedReceiptUrl, setSelectedReceiptUrl] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Super Agent Management State
  const [superAgents, setSuperAgents] = useState<SuperAgentNode[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentRegion, setNewAgentRegion] = useState('');
  const [newAgentPhone, setNewAgentPhone] = useState('');
  const [newAgentTelebirr, setNewAgentTelebirr] = useState('');
  const [newAgentCbe, setNewAgentCbe] = useState('');
  const [adminPin, setAdminPin] = useState('');
  const [addingAgent, setAddingAgent] = useState(false);

  // Super Agent Detail & Edit State
  const [selectedAgentDetail, setSelectedAgentDetail] = useState<SuperAgentNode | null>(null);
  const [editingAgent, setEditingAgent] = useState<SuperAgentNode | null>(null);
  const [editName, setEditName] = useState('');
  const [editRegion, setEditRegion] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editTelebirr, setEditTelebirr] = useState('');
  const [editCbe, setEditCbe] = useState('');
  const [editPin, setEditPin] = useState('');
  const [updatingAgent, setUpdatingAgent] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    fetchTransactions();
    fetchSuperAgents();
  }, []);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const fetchTransactions = async (manual = false) => {
    if (manual) setIsRefreshing(true);

    try {
      const { data, error } = await supabase
        .from('transaction_requests')
        .select(`
          *,
          agents:agent_id (username, phone, tier, balance)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) {
        setTransactions(data as TransactionRequest[]);
      }
    } catch (err: any) {
      console.error('Error fetching transactions:', err.message);
      showToast('Failed to load transaction records.');
    } finally {
      setLoading(false);
      if (manual) {
        setIsRefreshing(false);
        showToast('Admin ledger synchronized.');
      }
    }
  };

  const fetchSuperAgents = async () => {
    setLoadingAgents(true);
    try {
      const { data, error } = await supabase
        .from('super_agents')
        .select('*')
        .order('id', { ascending: true });

      if (error) throw error;
      if (data) {
        setSuperAgents(data as SuperAgentNode[]);
      }
    } catch (err: any) {
      console.error('Error fetching super agents:', err.message);
    } finally {
      setLoadingAgents(false);
    }
  };

  const handleAddSuperAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAgentName.trim() || !newAgentRegion.trim()) {
      showToast('Agent name and region are required.');
      return;
    }

    if (adminPin.trim() !== '88888888') {
      showToast('Invalid 8-figure security PIN code authorization.');
      return;
    }

    setAddingAgent(true);
    try {
      const { error } = await supabase.from('super_agents').insert([
        {
          name: newAgentName.trim(),
          region: newAgentRegion.trim(),
          phone: newAgentPhone.trim() || null,
          telebirr_account: newAgentTelebirr.trim() || null,
          cbe_account: newAgentCbe.trim() || null,
          created_at: new Date().toISOString(),
        }
      ]);

      if (error) throw error;

      showToast('Super Agent node registered successfully with PIN authorization.');
      setNewAgentName('');
      setNewAgentRegion('');
      setNewAgentPhone('');
      setNewAgentTelebirr('');
      setNewAgentCbe('');
      setAdminPin('');
      fetchSuperAgents();
    } catch (err: any) {
      showToast(`Failed to add agent: ${err.message}`);
    } finally {
      setAddingAgent(false);
    }
  };

  const handleOpenEditModal = (agent: SuperAgentNode) => {
    setEditingAgent(agent);
    setEditName(agent.name || '');
    setEditRegion(agent.region || '');
    setEditPhone(agent.phone || '');
    setEditTelebirr(agent.telebirr_account || '');
    setEditCbe(agent.cbe_account || '');
    setEditPin('');
  };

  const handleUpdateSuperAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAgent) return;

    if (editPin.trim() !== '88888888') {
      showToast('Invalid 8-figure security PIN code authorization for editing.');
      return;
    }

    setUpdatingAgent(true);
    try {
      const { error } = await supabase
        .from('super_agents')
        .update({
          name: editName.trim(),
          region: editRegion.trim(),
          phone: editPhone.trim() || null,
          telebirr_account: editTelebirr.trim() || null,
          cbe_account: editCbe.trim() || null,
        })
        .eq('id', editingAgent.id);

      if (error) throw error;

      showToast('Super Agent node updated successfully.');
      setEditingAgent(null);
      fetchSuperAgents();
    } catch (err: any) {
      showToast(`Update failed: ${err.message}`);
    } finally {
      setUpdatingAgent(false);
    }
  };

  const handleDeleteSuperAgent = async (agentId: string) => {
    if (!window.confirm('Are you sure you want to remove this Super Agent node from the rotation pool?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('super_agents')
        .delete()
        .eq('id', agentId);

      if (error) throw error;

      showToast('Super Agent node removed successfully.');
      setSuperAgents(prev => prev.filter(a => a.id !== agentId));
      setSelectedAgentDetail(null);
      setEditingAgent(null);
    } catch (err: any) {
      showToast(`Deletion failed: ${err.message}`);
    }
  };

  const handleUpdateStatus = async (txId: string, agentId: string, tierName: string, amount: number, newStatus: 'approved' | 'rejected') => {
    setProcessingId(txId);

    try {
      const adminName = 'System Administrator / Super Node';

      const { error: txError } = await supabase
        .from('transaction_requests')
        .update({ 
          status: newStatus,
          super_agent_name: adminName 
        })
        .eq('id', txId);

      if (txError) throw txError;

      if (newStatus === 'approved' && tierName) {
        const { error: agentError } = await supabase
          .from('agents')
          .update({ 
            tier: tierName,
            active_category: tierName
          })
          .eq('id', agentId);

        if (agentError) throw agentError;
      }

      showToast(`Transaction ${newStatus} by ${adminName}.`);
      fetchTransactions();
    } catch (err: any) {
      showToast(`Action failed: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeleteTransaction = async (txId: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this transaction record?')) {
      return;
    }

    setProcessingId(txId);

    try {
      const { error } = await supabase
        .from('transaction_requests')
        .delete()
        .eq('id', txId);

      if (error) throw error;

      showToast('Transaction record deleted successfully.');
      setTransactions(prev => prev.filter(t => t.id !== txId));
      setSelectedIds(prev => prev.filter(id => id !== txId));
    } catch (err: any) {
      showToast(`Deletion failed: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAllGroup = (dayTxIds: string[]) => {
    const allSelected = dayTxIds.every(id => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !dayTxIds.includes(id)));
    } else {
      const combined = Array.from(new Set([...selectedIds, ...dayTxIds]));
      setSelectedIds(combined);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to permanently delete ${selectedIds.length} selected transaction(s)?`)) {
      return;
    }

    setIsBulkDeleting(true);

    try {
      const { error } = await supabase
        .from('transaction_requests')
        .delete()
        .in('id', selectedIds);

      if (error) throw error;

      showToast(`Successfully deleted ${selectedIds.length} transaction records.`);
      setTransactions(prev => prev.filter(t => !selectedIds.includes(t.id)));
      setSelectedIds([]);
    } catch (err: any) {
      showToast(`Bulk deletion failed: ${err.message}`);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  if (!isMounted) return <div className="min-h-screen bg-[#F5F7FA]" />;

  const filteredTransactions = transactions.filter((tx) => {
    const matchesStatus = filterStatus === 'all' || tx.status === filterStatus;
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      tx.transaction_ref?.toLowerCase().includes(searchLower) ||
      tx.agents?.username?.toLowerCase().includes(searchLower) ||
      tx.agents?.phone?.toLowerCase().includes(searchLower) ||
      tx.tier?.toLowerCase().includes(searchLower) ||
      tx.super_agent_name?.toLowerCase().includes(searchLower);
    return matchesStatus && matchesSearch;
  });

  const totalVolume = transactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const approvedVolume = transactions.filter(t => t.status === 'approved').reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const pendingVolume = transactions.filter(t => t.status === 'pending').reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const groupedByDate = filteredTransactions.reduce((acc, tx) => {
    const dateKey = new Date(tx.created_at).toISOString().split('T')[0];
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(tx);
    return acc;
  }, {} as Record<string, TransactionRequest[]>);

  const sortedDateKeys = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#0B1B36] font-sans flex flex-col selection:bg-[#0B1B36] selection:text-white relative pb-32">
      
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0B1B36] text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-white/20 text-xs font-mono flex items-center gap-3 animate-in fade-in">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse shrink-0"></span>
          <span>{notification}</span>
        </div>
      )}

      {/* SUPER AGENT EDIT MODAL */}
      {editingAgent && (
        <div className="fixed inset-0 z-50 bg-[#0B1B36]/80 backdrop-blur-md flex items-center justify-center p-4 font-mono">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-[#0B1B36]/20 shadow-2xl space-y-6 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center pb-4 border-b border-[#0B1B36]/15">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-[#0B1B36]/10 text-[#0B1B36] flex items-center justify-center font-bold">
                  <Edit3 size={20} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#0B1B36]">Edit Super Agent Node</h3>
                  <span className="text-[10px] text-[#0B1B36]/60 uppercase font-bold">ID: {editingAgent.id}</span>
                </div>
              </div>
              <button
                onClick={() => setEditingAgent(null)}
                className="p-2 rounded-xl bg-[#0B1B36]/5 hover:bg-[#0B1B36]/10 text-[#0B1B36] transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateSuperAgent} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-[#0B1B36]/70 uppercase font-bold text-[10px]">Agent / Node Name *</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#F5F7FA] border border-[#0B1B36]/15 font-bold text-[#0B1B36] focus:outline-none focus:border-[#0B1B36]"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[#0B1B36]/70 uppercase font-bold text-[10px]">Region / Location *</label>
                <input
                  type="text"
                  value={editRegion}
                  onChange={(e) => setEditRegion(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#F5F7FA] border border-[#0B1B36]/15 font-bold text-[#0B1B36] focus:outline-none focus:border-[#0B1B36]"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[#0B1B36]/70 uppercase font-bold text-[10px]">Phone Number</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#F5F7FA] border border-[#0B1B36]/15 font-bold text-[#0B1B36] focus:outline-none focus:border-[#0B1B36]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[#0B1B36]/70 uppercase font-bold text-[10px]">Telebirr Account Number</label>
                <input
                  type="text"
                  value={editTelebirr}
                  onChange={(e) => setEditTelebirr(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#F5F7FA] border border-[#0B1B36]/15 font-bold text-[#0B1B36] focus:outline-none focus:border-[#0B1B36]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[#0B1B36]/70 uppercase font-bold text-[10px]">CBE Account Number</label>
                <input
                  type="text"
                  value={editCbe}
                  onChange={(e) => setEditCbe(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#F5F7FA] border border-[#0B1B36]/15 font-bold text-[#0B1B36] focus:outline-none focus:border-[#0B1B36]"
                />
              </div>

              <div className="space-y-1 pt-2 border-t border-[#0B1B36]/10">
                <label className="text-[#0B1B36]/70 uppercase font-bold text-[10px] flex items-center gap-1">
                  <Lock size={12} className="text-amber-600" /> 8-Figure Admin PIN Code *
                </label>
                <input
                  type="password"
                  maxLength={8}
                  placeholder="********"
                  value={editPin}
                  onChange={(e) => setEditPin(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-amber-50/50 border border-amber-300 font-bold text-[#0B1B36] focus:outline-none focus:border-[#0B1B36] tracking-widest"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#0B1B36]/15">
                <button
                  type="button"
                  onClick={() => setEditingAgent(null)}
                  className="px-4 py-2.5 rounded-xl bg-[#0B1B36]/10 hover:bg-[#0B1B36]/20 text-[#0B1B36] font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingAgent}
                  className="px-6 py-2.5 rounded-xl bg-[#0B1B36] hover:bg-[#152d56] text-white font-extrabold transition shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {updatingAgent ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUPER AGENT DETAIL MODAL */}
      {selectedAgentDetail && (
        <div className="fixed inset-0 z-50 bg-[#0B1B36]/80 backdrop-blur-md flex items-center justify-center p-4 font-mono">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-[#0B1B36]/20 shadow-2xl space-y-6 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center pb-4 border-b border-[#0B1B36]/15">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-[#0B1B36]/10 text-[#0B1B36] flex items-center justify-center font-bold">
                  <Store size={20} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#0B1B36]">{selectedAgentDetail.name}</h3>
                  <span className="text-[10px] text-[#0B1B36]/60 uppercase font-bold">Node ID: {selectedAgentDetail.id}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedAgentDetail(null)}
                className="p-2 rounded-xl bg-[#0B1B36]/5 hover:bg-[#0B1B36]/10 text-[#0B1B36] transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-[#F5F7FA] border border-[#0B1B36]/10 space-y-1">
                  <span className="text-[10px] text-[#0B1B36]/60 uppercase font-bold block">Operating Region</span>
                  <strong className="text-[#0B1B36] text-sm">{selectedAgentDetail.region || 'Central Node'}</strong>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#F5F7FA] border border-[#0B1B36]/10 space-y-1">
                  <span className="text-[10px] text-[#0B1B36]/60 uppercase font-bold block">Contact Phone</span>
                  <strong className="text-[#0B1B36] text-sm">{selectedAgentDetail.phone || 'Not Assigned'}</strong>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#F5F7FA] border border-[#0B1B36]/10 space-y-3">
                <div className="text-[10px] text-[#0B1B36]/60 uppercase font-bold">Escrow Account Numbers</div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-[#0B1B36]/10">
                    <span className="text-[#0B1B36]/70">Telebirr Account:</span>
                    <strong className="text-[#0B1B36] font-mono">{selectedAgentDetail.telebirr_account || selectedAgentDetail.phone || 'N/A'}</strong>
                  </div>
                  <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-[#0B1B36]/10">
                    <span className="text-[#0B1B36]/70">CBE Account:</span>
                    <strong className="text-[#0B1B36] font-mono">{selectedAgentDetail.cbe_account || 'N/A'}</strong>
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-[#0B1B36]/60 pt-1">
                Registered On: {selectedAgentDetail.created_at ? new Date(selectedAgentDetail.created_at).toLocaleString() : 'System Default'}
              </div>
            </div>

            <div className="flex justify-between gap-3 pt-2">
              <button
                onClick={() => { setSelectedAgentDetail(null); handleOpenEditModal(selectedAgentDetail); }}
                className="px-4 py-2.5 rounded-xl bg-[#0B1B36] text-white font-bold transition text-xs flex items-center gap-1.5 cursor-pointer hover:bg-[#152d56]"
              >
                <Edit3 size={14} /> Edit Node
              </button>
              <button
                onClick={() => setSelectedAgentDetail(null)}
                className="px-5 py-2.5 rounded-xl bg-white/10 text-[#0B1B36] border border-[#0B1B36]/20 font-bold transition text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedIds.length > 0 && activeTab === 'transactions' && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[#0B1B36] text-white px-6 py-4 rounded-2xl shadow-2xl border border-white/20 font-mono text-xs flex items-center gap-6 animate-in slide-in-from-bottom-6">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-[11px]">
              {selectedIds.length}
            </span>
            <span>Transactions Selected</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleBulkDelete}
              disabled={isBulkDeleting}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
            >
              {isBulkDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              Delete Selected
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {selectedReceiptUrl && (
        <div className="fixed inset-0 z-50 bg-[#0B1B36]/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full border border-[#0B1B36]/20 shadow-2xl space-y-4 font-mono">
            <div className="flex justify-between items-center pb-3 border-b border-[#0B1B36]/15">
              <h3 className="text-sm font-extrabold text-[#0B1B36] flex items-center gap-2">
                <ImageIcon size={16} /> Transaction Receipt Verification Proof
              </h3>
              <button
                onClick={() => setSelectedReceiptUrl(null)}
                className="p-2 rounded-xl bg-[#0B1B36]/5 hover:bg-[#0B1B36]/10 text-[#0B1B36] transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="bg-[#F5F7FA] rounded-2xl p-4 border border-[#0B1B36]/15 flex items-center justify-center overflow-hidden max-h-[70vh]">
              <img
                src={selectedReceiptUrl}
                alt="Payment Receipt"
                className="max-h-[60vh] object-contain rounded-xl shadow-md border border-[#0B1B36]/10"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <a
                href={selectedReceiptUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-xl bg-[#0B1B36]/10 hover:bg-[#0B1B36]/20 text-[#0B1B36] text-xs font-bold transition flex items-center gap-1.5"
              >
                Open Original <ExternalLink size={14} />
              </a>
              <button
                onClick={() => setSelectedReceiptUrl(null)}
                className="px-5 py-2 rounded-xl bg-[#0B1B36] text-white text-xs font-bold transition hover:bg-[#152d56]"
              >
                Close Viewer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADMIN TOP HEADER BAR */}
      <header className="bg-white/95 backdrop-blur-md border-b border-[#0B1B36]/15 px-6 py-4 flex items-center justify-between sticky top-0 z-30 font-mono">
        <div className="flex items-center gap-4">
          <div className="text-xs text-[#0B1B36]/70 flex items-center gap-2.5">
            <span className="font-extrabold text-[#0B1B36] text-sm">Future Gate Global - Master Admin</span>
            <span className="text-[#0B1B36]/30">/</span>
            <span className="inline-flex items-center gap-1.5 text-[#0B1B36] bg-[#0B1B36]/5 border border-[#0B1B36]/15 px-3 py-1 rounded-full text-xs font-bold">
              <ShieldAlert size={13} className="text-amber-600" /> Secure Terminal
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => { fetchTransactions(true); fetchSuperAgents(); }}
            disabled={isRefreshing}
            className="px-4 py-2 rounded-xl bg-white hover:bg-[#0B1B36] hover:text-white border border-[#0B1B36]/20 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs font-mono"
          >
            <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
            <span>Synchronize Terminal</span>
          </button>
        </div>
      </header>

      <main className="flex-1 p-4 sm:p-8 space-y-6 max-w-7xl mx-auto w-full font-mono">
        
        {/* NAVIGATION TABS */}
        <div className="flex items-center gap-3 border-b border-[#0B1B36]/15 pb-4">
          <button
            onClick={() => setActiveTab('transactions')}
            className={`px-5 py-2.5 rounded-2xl text-xs font-extrabold uppercase transition cursor-pointer flex items-center gap-2 border ${
              activeTab === 'transactions'
                ? 'bg-[#0B1B36] text-white border-[#0B1B36] shadow-md'
                : 'bg-white text-[#0B1B36] border-[#0B1B36]/15 hover:bg-[#0B1B36]/5'
            }`}
          >
            <FileText size={15} /> Transaction Ledger ({transactions.length})
          </button>
          <button
            onClick={() => setActiveTab('super_agents')}
            className={`px-5 py-2.5 rounded-2xl text-xs font-extrabold uppercase transition cursor-pointer flex items-center gap-2 border ${
              activeTab === 'super_agents'
                ? 'bg-[#0B1B36] text-white border-[#0B1B36] shadow-md'
                : 'bg-white text-[#0B1B36] border-[#0B1B36]/15 hover:bg-[#0B1B36]/5'
            }`}
          >
            <ShieldCheck size={15} /> Super Agent Nodes ({superAgents.length})
          </button>
        </div>

        {/* TAB 1: TRANSACTIONS AUDIT CONSOLE */}
        {activeTab === 'transactions' && (
          <div className="space-y-6 animate-in fade-in">
            
            <div className="bg-gradient-to-br from-[#0B1B36] via-[#0B1B36] to-[#122a52] text-white rounded-3xl p-6 sm:p-8 border border-white/15 shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <div className="space-y-3">
                  <span className="px-3 py-1 rounded-full bg-white/10 border border-white/20 text-[11px] font-extrabold">
                    Transaction Filing & Verification Hub
                  </span>
                  <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
                    <Layers size={24} className="text-white" /> Upgrade & Deposit Audit Console
                  </h1>
                  <p className="text-xs text-white/75 max-w-xl leading-relaxed">
                    Review incoming agent upgrade requests with detailed metadata, tracking exactly which super agent node or administrator authorized each entry.
                  </p>
                </div>

                <div className="bg-white/10 p-4 rounded-2xl border border-white/15 backdrop-blur-sm flex items-center gap-4">
                  <div>
                    <div className="text-[10px] text-white/70 uppercase font-bold">Pending Review</div>
                    <div className="text-2xl font-extrabold text-amber-300">
                      {transactions.filter(t => t.status === 'pending').length}
                    </div>
                  </div>
                  <div className="w-px h-8 bg-white/20"></div>
                  <div>
                    <div className="text-[10px] text-white/70 uppercase font-bold">Total Filings</div>
                    <div className="text-2xl font-extrabold text-white">
                      {transactions.length}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-white/15">
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-1">
                  <div className="text-[10px] text-white/70 uppercase font-bold flex items-center gap-1.5">
                    <DollarSign size={13} className="text-emerald-400" /> Total Ledger Volume
                  </div>
                  <div className="text-xl font-extrabold text-white">
                    ETB {totalVolume.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>

                <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-1">
                  <div className="text-[10px] text-white/70 uppercase font-bold flex items-center gap-1.5">
                    <CheckCircle2 size={13} className="text-emerald-400" /> Approved Volume
                  </div>
                  <div className="text-xl font-extrabold text-emerald-400">
                    ETB {approvedVolume.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>

                <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-1">
                  <div className="text-[10px] text-white/70 uppercase font-bold flex items-center gap-1.5">
                    <Clock size={13} className="text-amber-300" /> Pending Volume
                  </div>
                  <div className="text-xl font-extrabold text-amber-300">
                    ETB {pendingVolume.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 sm:p-6 rounded-3xl border border-[#0B1B36]/15 shadow-xs flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
                {(['pending', 'approved', 'rejected', 'all'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition cursor-pointer border ${
                      filterStatus === status
                        ? 'bg-[#0B1B36] text-white border-[#0B1B36]'
                        : 'bg-[#F5F7FA] text-[#0B1B36] border-[#0B1B36]/15 hover:bg-[#0B1B36]/5'
                    }`}
                  >
                    {status} ({transactions.filter(t => status === 'all' || t.status === status).length})
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-72">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#0B1B36]/50" />
                <input
                  type="text"
                  placeholder="Search by name, ref, super agent..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F5F7FA] border border-[#0B1B36]/15 text-xs font-bold text-[#0B1B36] focus:outline-none focus:border-[#0B1B36]"
                />
              </div>
            </div>

            {loading ? (
              <div className="bg-white rounded-3xl p-12 text-center flex items-center justify-center gap-3 text-xs text-[#0B1B36]/70 border border-[#0B1B36]/15">
                <Loader2 size={18} className="animate-spin text-[#0B1B36]" />
                <span>Loading Transaction Records...</span>
              </div>
            ) : sortedDateKeys.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center text-xs text-[#0B1B36]/60 border border-[#0B1B36]/15">
                No transaction filings found matching your criteria.
              </div>
            ) : (
              <div className="space-y-6">
                {sortedDateKeys.map((dateStr) => {
                  const dayTxs = groupedByDate[dateStr];
                  const dayTxIds = dayTxs.map(t => t.id);
                  const isAllGroupSelected = dayTxIds.length > 0 && dayTxIds.every(id => selectedIds.includes(id));
                  const dayTotalAmount = dayTxs.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

                  return (
                    <div key={dateStr} className="bg-white rounded-3xl border border-[#0B1B36]/15 shadow-xs overflow-hidden">
                      
                      <div className="bg-[#0B1B36]/5 px-6 py-4 border-b border-[#0B1B36]/15 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleToggleSelectAllGroup(dayTxIds)}
                            className="flex items-center gap-1.5 text-xs font-bold text-[#0B1B36] hover:opacity-80 cursor-pointer"
                          >
                            {isAllGroupSelected ? <CheckSquare size={16} className="text-[#0B1B36]" /> : <Square size={16} className="text-[#0B1B36]/50" />}
                            <span>Select Group</span>
                          </button>
                          <div className="w-px h-4 bg-[#0B1B36]/20"></div>
                          <div className="flex items-center gap-2 text-[#0B1B36] font-extrabold">
                            <Calendar size={16} className="text-[#0B1B36]" />
                            <span>Date: {dateStr}</span>
                            <span className="text-[11px] font-normal text-[#0B1B36]/60">({dayTxs.length} filing{dayTxs.length > 1 ? 's' : ''})</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 bg-white px-3.5 py-1.5 rounded-xl border border-[#0B1B36]/15 text-xs">
                          <span className="text-[#0B1B36]/60 uppercase font-bold text-[10px]">Total Amount After Transactions:</span>
                          <strong className="font-extrabold text-emerald-700">ETB {dayTotalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-white border-b border-[#0B1B36]/10 text-[10px] uppercase font-bold text-[#0B1B36]/70">
                            <tr>
                              <th className="p-4 w-10">
                                <span className="sr-only">Select</span>
                              </th>
                              <th className="p-4">Agent Details</th>
                              <th className="p-4">Upgrade Tier</th>
                              <th className="p-4">Amount & Method</th>
                              <th className="p-4">Assigned Super Agent</th>
                              <th className="p-4">Reference & Proof</th>
                              <th className="p-4">Status & Processor</th>
                              <th className="p-4 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#0B1B36]/10">
                            {dayTxs.map((tx) => {
                              const isProcessing = processingId === tx.id;
                              const isSelected = selectedIds.includes(tx.id);

                              return (
                                <tr key={tx.id} className={`hover:bg-[#F5F7FA]/70 transition ${isSelected ? 'bg-[#0B1B36]/5' : ''}`}>
                                  <td className="p-4">
                                    <button
                                      type="button"
                                      onClick={() => handleToggleSelect(tx.id)}
                                      className="cursor-pointer text-[#0B1B36] hover:opacity-80"
                                    >
                                      {isSelected ? <CheckSquare size={16} className="text-[#0B1B36]" /> : <Square size={16} className="text-[#0B1B36]/40" />}
                                    </button>
                                  </td>

                                  <td className="p-4 space-y-0.5">
                                    <div className="font-extrabold text-[#0B1B36] flex items-center gap-1.5">
                                      <User size={13} className="text-[#0B1B36]/60" />
                                      {tx.agents?.username || 'Unknown Agent'}
                                    </div>
                                    <div className="text-[11px] text-[#0B1B36]/60 flex items-center gap-1">
                                      <Smartphone size={11} /> {tx.agents?.phone || 'No Phone'}
                                    </div>
                                  </td>

                                  <td className="p-4">
                                    <span className="px-2.5 py-1 rounded-full bg-[#0B1B36]/10 text-[#0B1B36] font-extrabold text-[11px]">
                                      {tx.tier || 'N/A'}
                                    </span>
                                  </td>

                                  <td className="p-4">
                                    <div className="font-extrabold text-emerald-700">
                                      ETB {tx.amount?.toLocaleString()}
                                    </div>
                                    <div className="text-[10px] text-[#0B1B36]/60 uppercase font-bold">
                                      {tx.method || 'Telebirr'}
                                    </div>
                                  </td>

                                  <td className="p-4">
                                    <div className="font-bold text-[#0B1B36] flex items-center gap-1.5">
                                      <ShieldCheck size={13} className="text-blue-600 shrink-0" />
                                      <span>{tx.super_agent_name || 'Central Escrow Node'}</span>
                                    </div>
                                    <div className="text-[10px] text-[#0B1B36]/50">Round-robin pool routing</div>
                                  </td>

                                  <td className="p-4 space-y-1">
                                    <div className="font-mono font-bold text-[#0B1B36] bg-[#0B1B36]/5 px-2 py-0.5 rounded-md inline-block">
                                      {tx.transaction_ref}
                                    </div>
                                    <div>
                                      {tx.receipt_url ? (
                                        <button
                                          onClick={() => setSelectedReceiptUrl(tx.receipt_url!)}
                                          className="px-2.5 py-1 rounded-lg bg-white border border-[#0B1B36]/20 hover:bg-[#0B1B36] hover:text-white transition text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer shadow-xs mt-0.5"
                                        >
                                          <ImageIcon size={11} /> View Screenshot Proof
                                        </button>
                                      ) : (
                                        <span className="text-[10px] text-rose-600 font-bold">No Image</span>
                                      )}
                                    </div>
                                  </td>

                                  <td className="p-4 space-y-1">
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase inline-flex items-center gap-1 ${
                                      tx.status === 'approved'
                                        ? 'bg-emerald-500 text-white'
                                        : tx.status === 'rejected'
                                        ? 'bg-rose-500 text-white'
                                        : 'bg-amber-400 text-amber-950 animate-pulse'
                                    }`}>
                                      {tx.status === 'approved' && <CheckCircle2 size={11} />}
                                      {tx.status === 'rejected' && <XCircle size={11} />}
                                      {tx.status === 'pending' && <Clock size={11} />}
                                      {tx.status}
                                    </span>
                                    <div className="text-[10px] text-[#0B1B36]/60 flex items-center gap-1">
                                      <UserCheck size={11} /> {tx.super_agent_name || (tx.status === 'pending' ? 'Pending Review' : 'System Admin')}
                                    </div>
                                  </td>

                                  <td className="p-4 text-right space-x-2">
                                    <div className="flex items-center justify-end gap-2">
                                      {tx.status === 'pending' && (
                                        <>
                                          <button
                                            onClick={() => handleUpdateStatus(tx.id, tx.agent_id, tx.tier || 'Furniture', tx.amount, 'approved')}
                                            disabled={isProcessing}
                                            className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition cursor-pointer flex items-center gap-1 shadow-xs disabled:opacity-50"
                                          >
                                            {isProcessing ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Approve
                                          </button>
                                          <button
                                            onClick={() => handleUpdateStatus(tx.id, tx.agent_id, tx.tier || 'Furniture', tx.amount, 'rejected')}
                                            disabled={isProcessing}
                                            className="px-2.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition cursor-pointer flex items-center gap-1 shadow-xs disabled:opacity-50"
                                          >
                                            {isProcessing ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />} Reject
                                          </button>
                                        </>
                                      )}
                                      <button
                                        onClick={() => handleDeleteTransaction(tx.id)}
                                        disabled={isProcessing}
                                        title="Delete Transaction"
                                        className="p-2 rounded-xl bg-slate-100 hover:bg-rose-600 hover:text-white text-slate-700 transition cursor-pointer shadow-xs disabled:opacity-50"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
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

        {/* TAB 2: SUPER AGENT MANAGEMENT PANEL */}
        {activeTab === 'super_agents' && (
          <div className="space-y-6 animate-in fade-in">
            
            <div className="bg-gradient-to-br from-[#0B1B36] via-[#0B1B36] to-[#122a52] text-white rounded-3xl p-6 sm:p-8 border border-white/15 shadow-xl space-y-4">
              <span className="px-3 py-1 rounded-full bg-white/10 border border-white/20 text-[11px] font-extrabold">
                Round-Robin Payment Escrow Management
              </span>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
                <Store size={24} className="text-white" /> Super Agent Nodes Pool ({superAgents.length})
              </h1>
              <p className="text-xs text-white/75 max-w-xl leading-relaxed">
                Add, edit, or remove Super Agent nodes participating in the automated round-robin payment rotation. All modifications require an 8-figure admin authorization PIN.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* ADD SUPER AGENT FORM WITH 8-FIGURE PIN */}
              <div className="bg-white rounded-3xl p-6 border border-[#0B1B36]/15 shadow-xs space-y-4 lg:col-span-1">
                <h2 className="text-sm font-extrabold text-[#0B1B36] uppercase tracking-wider flex items-center gap-2">
                  <UserPlus size={16} /> Add Super Agent Node
                </h2>

                <form onSubmit={handleAddSuperAgent} className="space-y-3.5 text-xs">
                  <div className="space-y-1">
                    <label className="text-[#0B1B36]/70 uppercase font-bold text-[10px]">Agent / Node Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Addis Central Node"
                      value={newAgentName}
                      onChange={(e) => setNewAgentName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#F5F7FA] border border-[#0B1B36]/15 font-bold text-[#0B1B36] focus:outline-none focus:border-[#0B1B36]"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[#0B1B36]/70 uppercase font-bold text-[10px]">Region / Location *</label>
                    <input
                      type="text"
                      placeholder="e.g. Bole, Addis Ababa"
                      value={newAgentRegion}
                      onChange={(e) => setNewAgentRegion(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#F5F7FA] border border-[#0B1B36]/15 font-bold text-[#0B1B36] focus:outline-none focus:border-[#0B1B36]"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[#0B1B36]/70 uppercase font-bold text-[10px]">Phone Number</label>
                    <input
                      type="text"
                      placeholder="e.g. 0911223344"
                      value={newAgentPhone}
                      onChange={(e) => setNewAgentPhone(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#F5F7FA] border border-[#0B1B36]/15 font-bold text-[#0B1B36] focus:outline-none focus:border-[#0B1B36]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[#0B1B36]/70 uppercase font-bold text-[10px]">Telebirr Account Number</label>
                    <input
                      type="text"
                      placeholder="e.g. 0911223344"
                      value={newAgentTelebirr}
                      onChange={(e) => setNewAgentTelebirr(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#F5F7FA] border border-[#0B1B36]/15 font-bold text-[#0B1B36] focus:outline-none focus:border-[#0B1B36]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[#0B1B36]/70 uppercase font-bold text-[10px]">CBE Account Number</label>
                    <input
                      type="text"
                      placeholder="e.g. 1000293848592"
                      value={newAgentCbe}
                      onChange={(e) => setNewAgentCbe(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#F5F7FA] border border-[#0B1B36]/15 font-bold text-[#0B1B36] focus:outline-none focus:border-[#0B1B36]"
                    />
                  </div>

                  <div className="space-y-1 pt-2 border-t border-[#0B1B36]/10">
                    <label className="text-[#0B1B36]/70 uppercase font-bold text-[10px] flex items-center gap-1">
                      <Lock size={12} className="text-amber-600" /> 8-Figure Admin PIN Code *
                    </label>
                    <input
                      type="password"
                      maxLength={8}
                      placeholder="********"
                      value={adminPin}
                      onChange={(e) => setAdminPin(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-amber-50/50 border border-amber-300 font-bold text-[#0B1B36] focus:outline-none focus:border-[#0B1B36] tracking-widest"
                      required
                    />
                    <span className="text-[9px] text-[#0B1B36]/60">Required for master node authorization.</span>
                  </div>

                  <button
                    type="submit"
                    disabled={addingAgent}
                    className="w-full py-3 bg-[#0B1B36] hover:bg-[#152d56] text-white font-extrabold rounded-xl transition uppercase tracking-wider shadow-md cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
                  >
                    {addingAgent ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Register Agent Node
                  </button>
                </form>
              </div>

              {/* SUPER AGENTS LIST WITH EDIT & DETAILS ACCESSIBILITY */}
              <div className="bg-white rounded-3xl p-6 border border-[#0B1B36]/15 shadow-xs space-y-4 lg:col-span-2">
                <h2 className="text-sm font-extrabold text-[#0B1B36] uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck size={16} /> Active Rotation Pool ({superAgents.length})
                </h2>

                {loadingAgents ? (
                  <div className="p-8 text-center flex items-center justify-center gap-3 text-xs text-[#0B1B36]/70">
                    <Loader2 size={16} className="animate-spin text-[#0B1B36]" />
                    <span>Loading Super Agent Nodes...</span>
                  </div>
                ) : superAgents.length === 0 ? (
                  <div className="p-8 text-center text-xs text-[#0B1B36]/60">
                    No Super Agent nodes configured in pool.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {superAgents.map((agent) => (
                      <div key={agent.id} className="p-4 rounded-2xl bg-[#F5F7FA] border border-[#0B1B36]/15 space-y-3 flex flex-col justify-between">
                        <div className="space-y-1">
                          <div className="flex justify-between items-start">
                            <h3 className="font-extrabold text-[#0B1B36] text-sm">{agent.name}</h3>
                            <span className="px-2.5 py-0.5 rounded-full bg-[#0B1B36]/10 text-[#0B1B36] text-[10px] font-bold">
                              {agent.region || 'Central'}
                            </span>
                          </div>
                          <div className="text-[11px] text-[#0B1B36]/70 space-y-0.5 pt-1">
                            <div><strong>Telebirr:</strong> {agent.telebirr_account || agent.phone || 'N/A'}</div>
                            <div><strong>CBE:</strong> {agent.cbe_account || 'N/A'}</div>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-[#0B1B36]/10 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => setSelectedAgentDetail(agent)}
                              className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-[#0B1B36] hover:text-white border border-[#0B1B36]/20 font-bold text-xs transition flex items-center gap-1 cursor-pointer shadow-xs"
                            >
                              <Eye size={12} /> View
                            </button>
                            <button
                              onClick={() => handleOpenEditModal(agent)}
                              className="px-2.5 py-1.5 rounded-xl bg-[#0B1B36] text-white font-bold text-xs transition flex items-center gap-1 cursor-pointer shadow-xs hover:bg-[#152d56]"
                            >
                              <Edit3 size={12} /> Edit
                            </button>
                          </div>
                          <button
                            onClick={() => handleDeleteSuperAgent(agent.id)}
                            className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-700 font-bold text-xs transition flex items-center gap-1 cursor-pointer shadow-xs border border-rose-200"
                          >
                            <Trash2 size={12} /> Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

          </div>
        )}

      </main>

    </div>
  );
}