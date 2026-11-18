// src/app/super-agent/[id]/page.tsx
'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Lock, ShieldCheck, Loader2, Clock, CheckCircle2, XCircle, RefreshCw, Smartphone, Building2, ArrowLeft, ExternalLink, Image as ImageIcon, History, Filter } from 'lucide-react';

interface SuperAgentNode {
  id: string;
  name: string;
  tier: string;
  region: string;
  phone?: string;
  telebirr_account?: string;
  cbe_account?: string;
  node_password?: string;
}

interface TransactionRequest {
  id: string;
  tier: string;
  transaction_ref: string;
  type: string;
  method: string;
  amount: number;
  sender_or_receiver_number: string;
  agent_id: string;
  super_agent_id: string;
  super_agent_name: string;
  receipt_url?: string;
  status: string;
  created_at?: string;
}

function SuperAgentPortalContent() {
  const params = useParams();
  const router = useRouter();
  const agentId = params?.id as string;

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [nodeData, setNodeData] = useState<SuperAgentNode | null>(null);
  
  const [transactionRequests, setTransactionRequests] = useState<TransactionRequest[]>([]);
  const [historyRequests, setHistoryRequests] = useState<TransactionRequest[]>([]);
  
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [historyFilter, setHistoryFilter] = useState<'all' | 'registration' | 'deposit' | 'withdrawal'>('all');
  
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [fetchingData, setFetchingData] = useState(false);
  const [previewReceiptUrl, setPreviewReceiptUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!agentId) return;

    const sessionAuth = sessionStorage.getItem(`fgg_sa_auth_${agentId}`);
    if (sessionAuth === 'true') {
      setIsAuthenticated(true);
      fetchPortalData();
    }
  }, [agentId]);

  const fetchPortalData = async () => {
    setFetchingData(true);
    try {
      const { data: nodeRes, error: nodeErr } = await supabase
        .from('super_agents')
        .select('*')
        .eq('id', agentId)
        .single();

      if (nodeErr) throw nodeErr;
      if (nodeRes) setNodeData(nodeRes);

      // Fetch Pending Requests
      const { data: reqsRes, error: reqsErr } = await supabase
        .from('transaction_requests')
        .select('*')
        .eq('super_agent_id', agentId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (reqsErr) throw reqsErr;
      if (reqsRes) setTransactionRequests(reqsRes as TransactionRequest[]);

      // Fetch History (Approved / Rejected)
      const { data: historyRes, error: historyErr } = await supabase
        .from('transaction_requests')
        .select('*')
        .eq('super_agent_id', agentId)
        .in('status', ['approved', 'rejected'])
        .order('created_at', { ascending: false });

      if (historyErr) throw historyErr;
      if (historyRes) setHistoryRequests(historyRes as TransactionRequest[]);

    } catch (err) {
      console.error('Failed to load portal data:', err);
    } finally {
      setFetchingData(false);
    }
  };

  const handleUnlockPortal = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('super_agents')
        .select('*')
        .eq('id', agentId)
        .single();

      if (error || !data) {
        alert('Node not found.');
        setLoading(false);
        return;
      }

      if (data.node_password && data.node_password !== passwordInput.trim()) {
        alert('Invalid node password. Access denied.');
        setLoading(false);
        return;
      }

      sessionStorage.setItem(`fgg_sa_auth_${agentId}`, 'true');
      setIsAuthenticated(true);
      setNodeData(data);
      fetchPortalData();
    } catch (err) {
      alert('Authentication error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveRequest = async (req: TransactionRequest) => {
    setProcessingId(req.id);
    try {
      const { error: updateError } = await supabase
        .from('transaction_requests')
        .update({ status: 'approved' })
        .eq('id', req.id);

      if (updateError) throw updateError;

      if (req.type === 'registration' || req.type === 'deposit') {
        const { data: agentData } = await supabase
          .from('agents')
          .select('capital_balance, balance')
          .eq('id', req.agent_id)
          .single();

        if (agentData) {
          const newCapital = (agentData.capital_balance || 0) + req.amount;
          await supabase
            .from('agents')
            .update({ capital_balance: newCapital })
            .eq('id', req.agent_id);
        }
      }

      alert(`Transaction ${req.transaction_ref} approved successfully.`);
      fetchPortalData();
    } catch (err: any) {
      alert(`Approval Error: ${err.message || err}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectRequest = async (req: TransactionRequest) => {
    const reason = prompt('Enter rejection reason for agent notification:', 'Invalid payment receipt or incorrect amount.');
    if (reason === null) return;

    setProcessingId(req.id);
    try {
      const { error: updateError } = await supabase
        .from('transaction_requests')
        .update({ status: 'rejected' })
        .eq('id', req.id);

      if (updateError) throw updateError;

      alert(`Transaction ${req.transaction_ref} rejected.`);
      fetchPortalData();
    } catch (err: any) {
      alert(`Rejection Error: ${err.message || err}`);
    } finally {
      setProcessingId(null);
    }
  };

  const filteredHistory = historyRequests.filter((req) => {
    if (historyFilter === 'all') return true;
    return req.type === historyFilter;
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] text-[#0B1B36] font-mono flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-md bg-white p-8 rounded-3xl border border-[#AEB8C4]/40 shadow-xl space-y-6 text-center">
          <div className="w-14 h-14 bg-[#0B1B36] text-white rounded-2xl mx-auto flex items-center justify-center shadow-md">
            <Lock size={24} />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-extrabold text-[#0B1B36]">Restricted Node Portal</h2>
            <p className="text-[11px] text-[#536171]">
              Enter your Super Agent authorization password to unlock terminal session.
            </p>
          </div>

          <form onSubmit={handleUnlockPortal} className="space-y-4 text-left">
            <div className="space-y-1">
              <label className="font-bold text-[#536171] uppercase text-[10px]">Node Password</label>
              <input
                type="password"
                placeholder="••••••••••••"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#F5F7FA] border border-[#AEB8C4]/50 focus:outline-none focus:border-[#0B1B36] font-bold text-xs"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-[#0B1B36] hover:bg-[#152d56] text-white font-bold uppercase tracking-wider text-xs transition shadow-md cursor-pointer flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={15} className="animate-spin" />}
              {loading ? 'Authenticating...' : 'Unlock Node Terminal'}
            </button>
          </form>

          <div className="pt-2">
            <button
              onClick={() => router.push('/super-agent')}
              className="text-xs text-[#536171] hover:text-[#0B1B36] font-bold underline cursor-pointer"
            >
              ← Back to Super Agent Directory
            </button>
          </div>

          <div className="text-[10px] text-[#536171] flex items-center justify-center gap-1 pt-2">
            <ShieldCheck size={13} /> Secured Escrow Authorization
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#0B1B36] font-mono flex flex-col p-6 sm:p-12 selection:bg-[#0B1B36] selection:text-white">
      
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

      <div className="max-w-5xl mx-auto w-full space-y-6">

        <div className="bg-white p-6 rounded-3xl border border-[#AEB8C4]/40 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push('/super-agent')}
                className="px-3 py-1.5 rounded-xl bg-[#F5F7FA] hover:bg-[#0B1B36] hover:text-white transition text-xs font-bold flex items-center gap-1 cursor-pointer border border-[#AEB8C4]/30"
              >
                <ArrowLeft size={14} /> Directory
              </button>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                ● Secure Session Active
              </span>
            </div>
            <h1 className="text-xl font-extrabold text-[#0B1B36] mt-2">Node Portal: {nodeData?.name}</h1>
            <p className="text-xs text-[#536171]">Tier: {nodeData?.tier} | Region: {nodeData?.region || 'Central'}</p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={fetchPortalData}
              disabled={fetchingData}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-[#0B1B36] hover:text-white border border-[#AEB8C4]/40 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <RefreshCw size={13} className={fetchingData ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => {
                sessionStorage.removeItem(`fgg_sa_auth_${agentId}`);
                setIsAuthenticated(false);
              }}
              className="px-4 py-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold hover:bg-rose-100 transition cursor-pointer"
            >
              Lock Session
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white p-5 rounded-3xl border border-[#AEB8C4]/40 shadow-xs space-y-2 text-xs">
            <div className="font-extrabold text-[#0B1B36] uppercase text-[10px] tracking-wider text-slate-400">Telebirr Node Account</div>
            <div className="font-bold text-sm text-[#0B1B36] flex items-center gap-2">
              <Smartphone size={16} className="text-emerald-600" /> {nodeData?.telebirr_account || nodeData?.phone || 'Not configured'}
            </div>
          </div>
          <div className="bg-white p-5 rounded-3xl border border-[#AEB8C4]/40 shadow-xs space-y-2 text-xs">
            <div className="font-extrabold text-[#0B1B36] uppercase text-[10px] tracking-wider text-slate-400">CBE Escrow Account</div>
            <div className="font-bold text-sm text-[#0B1B36] flex items-center gap-2">
              <Building2 size={16} className="text-blue-600" /> {nodeData?.cbe_account || 'Not configured'}
            </div>
          </div>
        </div>

        <div className="flex bg-white p-1.5 rounded-2xl border border-[#AEB8C4]/40 gap-2 font-mono text-xs max-w-sm">
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex-1 py-2.5 rounded-xl font-bold transition cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'pending' ? 'bg-[#0B1B36] text-white shadow-xs' : 'text-[#536171] hover:text-[#0B1B36]'
            }`}
          >
            <Clock size={14} /> Pending Queue ({transactionRequests.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2.5 rounded-xl font-bold transition cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'history' ? 'bg-[#0B1B36] text-white shadow-xs' : 'text-[#536171] hover:text-[#0B1B36]'
            }`}
          >
            <History size={14} /> Audit History ({historyRequests.length})
          </button>
        </div>

        {activeTab === 'pending' && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-[#0B1B36] uppercase tracking-wider flex items-center gap-2">
                <Clock size={16} className="text-amber-600" /> Pending Verification Queue ({transactionRequests.length})
              </h2>
            </div>

            {fetchingData && transactionRequests.length === 0 ? (
              <div className="bg-white p-12 rounded-3xl border border-[#AEB8C4]/40 text-center text-xs text-[#536171] shadow-xs">
                Synchronizing pending requests for this node...
              </div>
            ) : transactionRequests.length === 0 ? (
              <div className="bg-white p-12 rounded-3xl border border-[#AEB8C4]/40 text-center text-xs text-[#536171] shadow-xs">
                No pending registration or deposit requests assigned to this node.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {transactionRequests.map((req) => (
                  <div key={req.id} className="bg-white p-6 rounded-3xl border border-[#AEB8C4]/40 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold uppercase text-[10px]">
                          {req.type}
                        </span>
                        <span className="font-extrabold text-[#0B1B36]">{req.transaction_ref}</span>
                        <span className="text-slate-400">| Tier: {req.tier}</span>
                      </div>
                      <div className="text-[#536171]">
                        Method: <strong className="uppercase">{req.method}</strong> | Sender Account: <strong className="text-[#0B1B36]">{req.sender_or_receiver_number}</strong>
                      </div>
                      <div className="text-[#536171]">
                        Amount: <strong className="text-emerald-700 font-bold">ETB {req.amount.toLocaleString()}</strong>
                      </div>
                      {req.receipt_url && (
                        <div>
                          <button
                            onClick={() => setPreviewReceiptUrl(req.receipt_url || null)}
                            className="text-blue-600 underline font-bold hover:text-blue-800 text-[11px] cursor-pointer inline-flex items-center gap-1 mt-1"
                          >
                            <ImageIcon size={13} /> View Screenshot Receipt Proof →
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
                      <button
                        onClick={() => handleApproveRequest(req)}
                        disabled={processingId === req.id}
                        className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <CheckCircle2 size={15} /> Approve
                      </button>
                      <button
                        onClick={() => handleRejectRequest(req)}
                        disabled={processingId === req.id}
                        className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <XCircle size={15} /> Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-4 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
              <h2 className="text-sm font-extrabold text-[#0B1B36] uppercase tracking-wider flex items-center gap-2">
                <History size={16} className="text-[#0B1B36]" /> Audit History ({filteredHistory.length})
              </h2>

              {/* FILTER TABS FOR HISTORY */}
              <div className="flex bg-white p-1.5 rounded-2xl border border-[#AEB8C4]/40 gap-1 text-[11px] font-mono shadow-xs">
                <button
                  onClick={() => setHistoryFilter('all')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                    historyFilter === 'all' ? 'bg-[#0B1B36] text-white shadow-xs' : 'text-[#536171] hover:text-[#0B1B36]'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setHistoryFilter('registration')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                    historyFilter === 'registration' ? 'bg-[#0B1B36] text-white shadow-xs' : 'text-[#536171] hover:text-[#0B1B36]'
                  }`}
                >
                  Registrations
                </button>
                <button
                  onClick={() => setHistoryFilter('deposit')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                    historyFilter === 'deposit' ? 'bg-[#0B1B36] text-white shadow-xs' : 'text-[#536171] hover:text-[#0B1B36]'
                  }`}
                >
                  Deposits
                </button>
                <button
                  onClick={() => setHistoryFilter('withdrawal')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                    historyFilter === 'withdrawal' ? 'bg-[#0B1B36] text-white shadow-xs' : 'text-[#536171] hover:text-[#0B1B36]'
                  }`}
                >
                  Withdrawals
                </button>
              </div>
            </div>

            {filteredHistory.length === 0 ? (
              <div className="bg-white p-12 rounded-3xl border border-[#AEB8C4]/40 text-center text-xs text-[#536171] shadow-xs">
                No transaction audit records matching category <strong className="uppercase">{historyFilter}</strong>.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredHistory.map((req) => (
                  <div key={req.id} className="bg-white p-6 rounded-3xl border border-[#AEB8C4]/40 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                          req.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {req.status}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-bold uppercase text-[10px]">
                          {req.type}
                        </span>
                        <span className="font-extrabold text-[#0B1B36]">{req.transaction_ref}</span>
                        <span className="text-slate-400">| Tier: {req.tier}</span>
                      </div>
                      <div className="text-[#536171]">
                        Method: <strong className="uppercase">{req.method}</strong> | Account: <strong className="text-[#0B1B36]">{req.sender_or_receiver_number}</strong>
                      </div>
                      <div className="text-[#536171]">
                        Amount: <strong className="text-emerald-700 font-bold">ETB {req.amount.toLocaleString()}</strong> | Date: {req.created_at ? new Date(req.created_at).toLocaleString() : 'N/A'}
                      </div>
                      {req.receipt_url && (
                        <div>
                          <button
                            onClick={() => setPreviewReceiptUrl(req.receipt_url || null)}
                            className="text-blue-600 underline font-bold hover:text-blue-800 text-[11px] cursor-pointer inline-flex items-center gap-1 mt-1"
                          >
                            <ImageIcon size={13} /> View Receipt Proof
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

export default function SuperAgentPortal() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center font-mono text-xs text-[#0B1B36]">
        <div className="flex items-center gap-2">
          <Loader2 className="animate-spin" size={18} /> Loading Super Agent Portal...
        </div>
      </div>
    }>
      <SuperAgentPortalContent />
    </Suspense>
  );
}