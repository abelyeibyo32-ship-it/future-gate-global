// src/app/super-agent/[id]/page.tsx
'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ShieldCheck, 
  ArrowLeft, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  RefreshCw, 
  ExternalLink,
  Smartphone,
  Building2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface TransactionRequest {
  id: string;
  agent_id: string;
  type: 'deposit' | 'withdrawal' | 'registration';
  method: 'telebirr' | 'cbe';
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  sender_or_receiver_number: string;
  transaction_ref?: string;
  receipt_url?: string;
  created_at: string;
  super_agent_id: string;
  super_agent_name: string;
  tier?: string;
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

function SuperAgentPortalContent() {
  const params = useParams();
  const router = useRouter();
  const nodeId = params?.id as string;

  const [isMounted, setIsMounted] = useState(false);
  const [nodeData, setNodeData] = useState<SuperAgentNode | null>(null);
  const [requests, setRequests] = useState<TransactionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
    if (nodeId) {
      fetchNodeAndRequests();
    }
  }, [nodeId]);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchNodeAndRequests = async () => {
    setLoading(true);
    try {
      const { data: nodeRes, error: nodeErr } = await supabase
        .from('super_agents')
        .select('*')
        .eq('id', nodeId)
        .maybeSingle();

      if (nodeErr) throw nodeErr;
      if (nodeRes) {
        setNodeData(nodeRes as SuperAgentNode);
      }

      const { data: txRes } = await supabase
        .from('transaction_requests')
        .select('*')
        .or(`super_agent_id.eq.${nodeId},super_agent_name.ilike.%${nodeRes?.name || ''}%`)
        .order('created_at', { ascending: false });

      if (!txRes || txRes.length === 0) {
        const { data: allTx } = await supabase
          .from('transaction_requests')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);
        if (allTx) setRequests(allTx as TransactionRequest[]);
      } else {
        setRequests(txRes as TransactionRequest[]);
      }
    } catch (err: any) {
      console.error('Error fetching portal data:', err);
      showToast(`Error loading portal: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!nodeId) return;
    const channel = supabase
      .channel(`super-agent-portal-${nodeId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transaction_requests' },
        () => fetchNodeAndRequests()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [nodeId]);

  const handleApproveRequest = async (req: TransactionRequest) => {
    if (processingId) return;
    setProcessingId(req.id);

    try {
      if (req.type === 'withdrawal') {
        const { data: agentData, error: agentFetchErr } = await supabase
          .from('agents')
          .select('balance')
          .eq('id', req.agent_id)
          .single();

        if (agentFetchErr || !agentData) {
          throw new Error('Could not verify agent balance record.');
        }

        const currentBalance = Number(agentData.balance || 0);
        const withdrawAmount = Number(req.amount || 0);

        if (withdrawAmount > currentBalance) {
          throw new Error(`Insufficient balance. Agent has ETB ${currentBalance.toLocaleString()}, requested ETB ${withdrawAmount.toLocaleString()}.`);
        }

        const newBalance = Math.max(0, currentBalance - withdrawAmount);
        const { error: balanceUpdateErr } = await supabase
          .from('agents')
          .update({ balance: newBalance })
          .eq('id', req.agent_id);

        if (balanceUpdateErr) throw balanceUpdateErr;
      }

      if (req.type === 'deposit') {
        const { data: agentData } = await supabase
          .from('agents')
          .select('balance')
          .eq('id', req.agent_id)
          .maybeSingle();

        const currentBalance = Number(agentData?.balance || 0);
        const depositAmount = Number(req.amount || 0);

        await supabase
          .from('agents')
          .update({ balance: currentBalance + depositAmount })
          .eq('id', req.agent_id);
      }

      const { error: updateTxErr } = await supabase
        .from('transaction_requests')
        .update({ status: 'approved' })
        .eq('id', req.id);

      if (updateTxErr) throw updateTxErr;

      showToast(`Successfully approved ${req.type} of ETB ${Number(req.amount).toLocaleString()}`);
      await fetchNodeAndRequests();
    } catch (err: any) {
      console.error('Approval failed:', err);
      showToast(`Approval failed: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectRequest = async (reqId: string) => {
    if (processingId) return;
    setProcessingId(reqId);

    try {
      const { error } = await supabase
        .from('transaction_requests')
        .update({ status: 'rejected' })
        .eq('id', reqId);

      if (error) throw error;

      showToast('Transaction request rejected.');
      await fetchNodeAndRequests();
    } catch (err: any) {
      console.error('Rejection failed:', err);
      showToast(`Rejection failed: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  if (!isMounted) return <div className="min-h-screen bg-[#F5F7FA]" />;

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#0B1B36] font-mono p-4 sm:p-8 pb-28 selection:bg-[#0B1B36] selection:text-white relative">
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0B1B36] text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-white/20 text-xs font-mono flex items-center gap-3 animate-in fade-in">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
          <span>{notification}</span>
        </div>
      )}

      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/super-agent" className="inline-flex items-center gap-2 text-xs font-bold text-[#536171] hover:text-[#0B1B36] transition">
            <ArrowLeft size={16} /> Back to Super Agent Directory
          </Link>
          <button 
            onClick={fetchNodeAndRequests} 
            disabled={loading}
            className="px-3 py-1.5 rounded-xl bg-white border border-[#AEB8C4]/40 text-xs font-bold hover:bg-[#0B1B36] hover:text-white transition flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh Node
          </button>
        </div>

        <div className="bg-gradient-to-br from-[#0B1B36] via-[#0B1B36] to-[#0E2447] text-white rounded-3xl p-6 sm:p-8 border border-white/10 shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-extrabold text-emerald-300">
              <ShieldCheck size={18} /> Verified Super Agent Clearing Node
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
              {nodeData?.name || 'Super Agent Portal'}
            </h1>
            <p className="text-xs text-[#AEB8C4]">
              Tier: <strong className="text-white">{nodeData?.tier || 'General'}</strong> | Region: <strong className="text-white">{nodeData?.region || 'Central'}</strong>
            </p>
          </div>

          <div className="flex flex-wrap gap-3 text-xs">
            {nodeData?.telebirr_account && (
              <div className="bg-white/10 px-4 py-2.5 rounded-2xl border border-white/10 flex items-center gap-2">
                <Smartphone size={14} className="text-emerald-400" />
                <span>Telebirr: <strong>{nodeData.telebirr_account}</strong></span>
              </div>
            )}
            {nodeData?.cbe_account && (
              <div className="bg-white/10 px-4 py-2.5 rounded-2xl border border-white/10 flex items-center gap-2">
                <Building2 size={14} className="text-blue-300" />
                <span>CBE: <strong>{nodeData.cbe_account}</strong></span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#AEB8C4]/40 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-[#AEB8C4]/30 pb-4">
            <div>
              <h2 className="text-base font-extrabold text-[#0B1B36]">Pending Transaction & Withdrawal Queue</h2>
              <p className="text-[11px] text-[#536171]">Approve or reject agent deposit and withdrawal requests assigned to this node.</p>
            </div>
            <span className="px-3 py-1 rounded-full bg-slate-100 text-[#0B1B36] text-xs font-bold border border-slate-300">
              {requests.filter(r => r.status === 'pending').length} Pending
            </span>
          </div>

          {loading && requests.length === 0 ? (
            <div className="py-16 text-center text-xs text-[#536171] flex flex-col items-center justify-center gap-2">
              <Loader2 size={24} className="animate-spin text-[#0B1B36]" /> Synchronizing clearing queue...
            </div>
          ) : requests.length === 0 ? (
            <div className="py-16 text-center text-xs text-[#536171] bg-[#F5F7FA] rounded-2xl border border-[#AEB8C4]/30">
              No transaction requests found in the queue.
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((req) => (
                <div 
                  key={req.id} 
                  className={`p-5 rounded-2xl border transition flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                    req.status === 'pending' ? 'bg-[#F5F7FA] border-[#AEB8C4]/50 shadow-xs' : 'bg-white border-[#AEB8C4]/20 opacity-80'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold uppercase ${
                        req.type === 'deposit' ? 'bg-[#0B1B36] text-white' :
                        req.type === 'withdrawal' ? 'bg-emerald-600 text-white' : 'bg-indigo-700 text-white'
                      }`}>
                        {req.type}
                      </span>
                      <span className="font-extrabold text-base text-[#0B1B36]">ETB {Number(req.amount).toLocaleString()}</span>
                      <span className="text-[11px] font-bold text-[#536171] uppercase">({req.method})</span>
                      {req.tier && (
                        <span className="px-2 py-0.5 rounded bg-slate-200 text-[#0B1B36] text-[10px] font-bold">
                          {req.tier}
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-[#536171] space-y-1">
                      <div>Account / Phone: <strong className="text-[#0B1B36]">{req.sender_or_receiver_number}</strong></div>
                      <div>Date: {new Date(req.created_at).toLocaleString()} | Ref: <strong className="text-[#0B1B36]">{req.transaction_ref || 'N/A'}</strong></div>
                      {req.receipt_url && (
                        <div>
                          <a href={req.receipt_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 underline pt-1">
                            View Receipt Proof <ExternalLink size={12} />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                    {req.status === 'pending' ? (
                      <>
                        <button
                          onClick={() => handleApproveRequest(req)}
                          disabled={processingId === req.id}
                          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider transition flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                        >
                          {processingId === req.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                          Approve
                        </button>
                        <button
                          onClick={() => handleRejectRequest(req.id)}
                          disabled={processingId === req.id}
                          className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs uppercase tracking-wider transition flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                        >
                          {processingId === req.id ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                          Reject
                        </button>
                      </>
                    ) : (
                      <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase flex items-center gap-1.5 ${
                        req.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {req.status === 'approved' && <CheckCircle2 size={14} />}
                        {req.status === 'rejected' && <XCircle size={14} />}
                        {req.status}
                      </span>
                    )}
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

export default function SuperAgentPortalPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center font-mono text-xs text-[#0B1B36]">Loading Super Agent Portal...</div>}>
      <SuperAgentPortalContent />
    </Suspense>
  );
}