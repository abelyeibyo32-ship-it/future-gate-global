// src/app/super-agent/[id]/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Lock, ShieldCheck, Loader2, Clock, CheckCircle2, XCircle, RefreshCw, Smartphone, Building2, ArrowLeft } from 'lucide-react';

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

export default function SuperAgentPortal() {
  const params = useParams();
  const router = useRouter();
  const agentId = params?.id as string;

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [nodeData, setNodeData] = useState<SuperAgentNode | null>(null);
  const [transactionRequests, setTransactionRequests] = useState<TransactionRequest[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [fetchingData, setFetchingData] = useState(false);

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

      const { data: reqsRes, error: reqsErr } = await supabase
        .from('transaction_requests')
        .select('*')
        .eq('super_agent_id', agentId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (reqsErr) throw reqsErr;
      if (reqsRes) setTransactionRequests(reqsRes);

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
      <div className="max-w-5xl mx-auto w-full space-y-6">
        
        {/* Top Header Bar */}
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

        {/* Node Account Details Summary */}
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

        {/* Pending Verification Queue for this Node */}
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
                    <div className="flex items-center gap-2">
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
                        <a href={req.receipt_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline font-bold hover:text-blue-800 text-[11px]">
                          View Uploaded Receipt Proof →
                        </a>
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

      </div>
    </div>
  );
}