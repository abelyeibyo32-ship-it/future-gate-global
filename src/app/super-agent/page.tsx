// src/app/super-agent/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Users, Cpu, Lock, RefreshCw, PhoneCall, Smartphone, Building2, Menu, Globe, ShieldCheck, CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Navbar from '@/lib/components/Navbar';
import MobileBottomNav from '@/lib/components/MobileBottomNav';

interface SuperAgentNode {
  id: string;
  name: string;
  tier: string;
  region: string;
  phone?: string;
  telebirr_account?: string;
  cbe_account?: string;
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

export default function SuperAgentsDirectoryPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [superAgents, setSuperAgents] = useState<SuperAgentNode[]>([]);
  const [transactionRequests, setTransactionRequests] = useState<TransactionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
    fetchAllData();

    const interval = setInterval(fetchAllData, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      // 1. Fetch super agents
      const { data: nodesData, error: nodesError } = await supabase
        .from('super_agents')
        .select('*')
        .order('id', { ascending: true });

      if (nodesError) throw nodesError;
      if (nodesData) setSuperAgents(nodesData);

      // 2. Fetch pending transaction requests assigned to super agents
      const { data: reqsData, error: reqsError } = await supabase
        .from('transaction_requests')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (reqsError) throw reqsError;
      if (reqsData) setTransactionRequests(reqsData);

    } catch (err) {
      console.error('Failed to synchronize super agent data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveRequest = async (req: TransactionRequest) => {
    setProcessingId(req.id);
    try {
      // 1. Update request status to approved
      const { error: updateError } = await supabase
        .from('transaction_requests')
        .update({ status: 'approved' })
        .eq('id', req.id);

      if (updateError) throw updateError;

      // 2. If it's a deposit or registration, credit the agent's capital or balance
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
      fetchAllData();
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
      fetchAllData();
    } catch (err: any) {
      alert(`Rejection Error: ${err.message || err}`);
    } finally {
      setProcessingId(null);
    }
  };

  if (!isMounted) return <div className="min-h-screen bg-[#F5F7FA]" />;

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#0B1B36] font-mono flex flex-col selection:bg-[#0B1B36] selection:text-white relative pb-28 lg:pb-0">
      
      <Navbar 
        activeCategory="Super Agent Nodes" 
        isMobileOpen={isMobileMenuOpen} 
        onCloseMobile={() => setIsMobileMenuOpen(false)} 
      />

      <main className="flex-1 flex flex-col min-w-0">
        <header className="bg-white/95 backdrop-blur-md border-b border-[#AEB8C4]/40 px-4 sm:px-8 py-3.5 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 text-[#0B1B36] hover:bg-[#F5F7FA] rounded-xl transition border border-[#AEB8C4]/30 cursor-pointer"
              aria-label="Open menu"
            >
              <Menu size={19} />
            </button>
            <div className="flex items-center gap-2 lg:hidden">
              <div className="w-7 h-7 rounded-lg bg-[#0B1B36] flex items-center justify-center">
                <Globe size={15} className="text-white" />
              </div>
              <span className="font-extrabold text-[#0B1B36] text-sm tracking-wider">FGG</span>
            </div>
            <div className="text-xs text-[#536171] hidden sm:flex items-center gap-2.5">
              <span className="font-extrabold text-[#0B1B36]">Financial Network</span>
              <span className="text-[#AEB8C4]">/</span>
              <span className="text-slate-600">Super Agent Directory & Approvals</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchAllData}
              disabled={loading}
              className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-[#0B1B36] hover:text-white border border-[#AEB8C4]/40 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              <span>Refresh Terminal</span>
            </button>
            <Link href="/dashboard" className="px-3.5 py-1.5 rounded-xl bg-[#0B1B36] text-white text-xs font-bold transition shadow-sm">
              Dashboard
            </Link>
          </div>
        </header>

        <div className="p-4 sm:p-8 space-y-8 max-w-6xl mx-auto w-full">
          
          {/* Header Banner */}
          <div className="bg-gradient-to-br from-[#0B1B36] via-[#0B1B36] to-[#0E2447] text-white rounded-3xl p-6 sm:p-8 border border-white/10 shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-extrabold text-emerald-300">
                <ShieldCheck size={16} /> FGG Clearing & Escrow Network
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">Active Super Agent Nodes & Requests</h1>
              <p className="text-xs text-[#AEB8C4] max-w-xl leading-relaxed">
                Manage network escrow nodes, inspect incoming registration buy-ins, and execute verification approvals or rejections.
              </p>
            </div>
            <div className="flex gap-3">
              <div className="bg-white/10 border border-white/10 px-4 py-3 rounded-2xl text-center shrink-0">
                <div className="text-[10px] text-[#AEB8C4] uppercase font-bold">Active Nodes</div>
                <div className="text-xl font-extrabold text-emerald-400">{superAgents.length}</div>
              </div>
              <div className="bg-white/10 border border-white/10 px-4 py-3 rounded-2xl text-center shrink-0">
                <div className="text-[10px] text-[#AEB8C4] uppercase font-bold">Pending Reqs</div>
                <div className="text-xl font-extrabold text-amber-400">{transactionRequests.length}</div>
              </div>
            </div>
          </div>

          {/* Pending Transaction Requests Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-[#0B1B36] uppercase tracking-wider flex items-center gap-2">
                <Clock size={16} className="text-amber-600" /> Pending Verification Queue ({transactionRequests.length})
              </h2>
            </div>

            {transactionRequests.length === 0 ? (
              <div className="bg-white p-8 rounded-3xl border border-[#AEB8C4]/40 text-center text-xs text-[#536171] shadow-xs">
                No pending transaction requests requiring node approval at this time.
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
                        Assigned Node: <strong className="text-[#0B1B36]">{req.super_agent_name}</strong> | Method: <strong className="uppercase">{req.method}</strong>
                      </div>
                      <div className="text-[#536171]">
                        Sender Account/Phone: <strong className="text-[#0B1B36]">{req.sender_or_receiver_number}</strong> | Amount: <strong className="text-emerald-700 font-bold">ETB {req.amount.toLocaleString()}</strong>
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

          {/* Super Agents Directory Grid */}
          <div className="space-y-4 pt-4">
            <h2 className="text-sm font-extrabold text-[#0B1B36] uppercase tracking-wider flex items-center gap-2">
              <Users size={16} className="text-[#0B1B36]" /> Registered Escrow Nodes ({superAgents.length})
            </h2>

            {loading && superAgents.length === 0 ? (
              <div className="py-16 text-center text-xs text-[#536171] bg-white rounded-3xl border border-[#AEB8C4]/40 shadow-xs">
                Synchronizing with Super Agent network...
              </div>
            ) : superAgents.length === 0 ? (
              <div className="py-16 text-center text-xs text-[#536171] bg-white rounded-3xl border border-[#AEB8C4]/40 shadow-xs">
                No active Super Agent nodes found. Please provision nodes from the Master Admin Console.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {superAgents.map((node) => (
                  <div key={node.id} className="bg-white p-6 rounded-3xl border border-[#AEB8C4]/40 shadow-sm hover:shadow-md transition space-y-4 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-[#0B1B36]/10 text-[#0B1B36] uppercase flex items-center gap-1">
                          <Cpu size={12} /> {node.tier}
                        </span>
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Online
                        </span>
                      </div>
                      <h3 className="text-base font-extrabold text-[#0B1B36]">{node.name}</h3>
                      <div className="text-[11px] text-[#536171]">Region: <strong className="text-[#0B1B36]">{node.region || 'Central'}</strong></div>
                    </div>

                    <div className="p-3.5 bg-[#F5F7FA] rounded-2xl border border-[#AEB8C4]/30 space-y-2 text-xs">
                      {node.phone && (
                        <div className="flex justify-between items-center text-[#536171]">
                          <span className="flex items-center gap-1"><PhoneCall size={12} /> Phone:</span>
                          <strong className="text-[#0B1B36]">{node.phone}</strong>
                        </div>
                      )}
                      {node.telebirr_account && (
                        <div className="flex justify-between items-center text-[#536171]">
                          <span className="flex items-center gap-1"><Smartphone size={12} /> Telebirr:</span>
                          <strong className="text-[#0B1B36]">{node.telebirr_account}</strong>
                        </div>
                      )}
                      {node.cbe_account && (
                        <div className="flex justify-between items-center text-[#536171]">
                          <span className="flex items-center gap-1"><Building2 size={12} /> CBE:</span>
                          <strong className="text-[#0B1B36]">{node.cbe_account}</strong>
                        </div>
                      )}
                    </div>

                    <Link
                      href={`/super-agent/${node.id}`}
                      className="w-full py-3 rounded-2xl bg-[#0B1B36] hover:bg-[#152d56] text-white font-extrabold text-xs uppercase tracking-wider transition text-center flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                    >
                      <Lock size={13} /> Open Node Portal
                    </Link>
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