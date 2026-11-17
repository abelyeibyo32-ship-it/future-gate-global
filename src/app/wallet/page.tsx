// src/app/wallet/page.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  Globe,
  RefreshCw,
  ExternalLink,
  Wallet as WalletIcon
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useFGGSystem } from '@/lib/useFGGSystem';
import Navbar from '@/lib/components/Navbar';
import MobileBottomNav from '@/lib/components/MobileBottomNav';

interface TransactionRequest {
  id: string;
  type: 'deposit' | 'withdrawal' | 'registration';
  method: 'telebirr' | 'cbe';
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  sender_or_receiver_number: string;
  transaction_ref?: string;
  receipt_url?: string;
  created_at: string;
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

const TIER_FLOORS: Record<string, number> = {
  'Electronics': 10500,
  'Furniture': 24000,
  'Solar Systems': 43000,
  'EV Bikes & Tuk-Tuks': 70000,
  'Real Estate': 110000,
};

export default function WalletPage() {
  const { timeUntilReset } = useFGGSystem();
  const [isMounted, setIsMounted] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Core Wallet Form & Request State
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
  
  // Database Mapped States (`tier` & `balance`)
  const [agentCategory, setAgentCategory] = useState<string>('Solar Systems');
  const [dbCapital, setDbCapital] = useState<number>(43000);
  const [dbEarnings, setDbEarnings] = useState<number>(0);
  const [currentUserId, setCurrentUserId] = useState<string>('');

  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
    fetchInitialData();
  }, []);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const fetchInitialData = async () => {
    const { data: nodesData } = await supabase.from('super_agents').select('*');
    if (nodesData && nodesData.length > 0) {
      setSuperAgentsPool(nodesData as SuperAgentNode[]);
      const randomIndex = Math.floor(Math.random() * nodesData.length);
      setAssignedNode(nodesData[randomIndex] as SuperAgentNode);
    } else {
      const fallbackNode: SuperAgentNode = {
        id: 'sa-default',
        name: 'Central Escrow Node',
        tier: 'Solar Systems',
        region: 'Addis Ababa',
        phone: '0911223344',
        telebirr_account: '0911223344',
        cbe_account: '1000293848592',
      };
      setSuperAgentsPool([fallbackNode]);
      setAssignedNode(fallbackNode);
    }

    await fetchData();
  };

  const fetchData = async (manualRefresh = false) => {
    if (manualRefresh) setIsRefreshing(true);

    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id || '00000000-0000-0000-0000-000000000001';
    setCurrentUserId(userId);

    // 1. Fetch transaction history requests
    const { data: txData } = await supabase
      .from('transaction_requests')
      .select('*')
      .eq('agent_id', userId)
      .order('created_at', { ascending: false });

    if (txData) {
      setRequests(txData as TransactionRequest[]);
    }

    // 2. Fetch ground-truth agent record
    const { data: agentData } = await supabase
      .from('agents')
      .select('tier, capital_balance, balance')
      .eq('id', userId)
      .maybeSingle();

    if (agentData) {
      const dbTierRaw = agentData.tier || 'Solar Systems';
      let category = 'Solar Systems';

      if (dbTierRaw.toLowerCase().includes('electronics')) category = 'Electronics';
      else if (dbTierRaw.toLowerCase().includes('furniture')) category = 'Furniture';
      else if (dbTierRaw.toLowerCase().includes('solar')) category = 'Solar Systems';
      else if (dbTierRaw.toLowerCase().includes('ev') || dbTierRaw.toLowerCase().includes('bike')) category = 'EV Bikes & Tuk-Tuks';
      else if (dbTierRaw.toLowerCase().includes('real estate')) category = 'Real Estate';

      setAgentCategory(category);

      // Strict ground-truth floor assignment for locked capital
      const expectedFloor = TIER_FLOORS[category] ?? 43000;
      setDbCapital(expectedFloor);
      setDbEarnings(Number(agentData.balance ?? 0));
    }

    setIsDataLoaded(true);
    if (manualRefresh) {
      setIsRefreshing(false);
      showToast('Wallet balances & transactions updated.');
    }
  };

  useEffect(() => {
    const channel = supabase
      .channel('wallet-realtime-strict-v23')
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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
  
  const activeTierFloor = TIER_FLOORS[agentCategory] ?? 43000;
  const withdrawableProfit = Math.max(0, dbEarnings);
  const totalAccountValue = dbCapital + dbEarnings;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || !assignedNode) return;

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

    if (activeTab === 'withdrawal') {
      if (parsedAmount > withdrawableProfit) {
        showToast(`Denied: Maximum withdrawable balance is ETB ${withdrawableProfit.toLocaleString()}.`);
        return;
      }

      // 24-Hour Withdrawal Cooldown Check
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      const recentWithdrawal = requests.find((req) => 
        req.type === 'withdrawal' && 
        (req.status === 'pending' || req.status === 'approved') &&
        new Date(req.created_at).getTime() > oneDayAgo
      );

      if (recentWithdrawal) {
        const lastDate = new Date(recentWithdrawal.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        showToast(`Cooldown Active: Withdrawals are limited to once every 24 hours. Last request was at ${lastDate}.`);
        return;
      }
    }

    // MANDATORY SCREENSHOT CHECK FOR DEPOSITS
    if (activeTab === 'deposit' && !receiptFile) {
      showToast('Mandatory: Please upload your transfer receipt screenshot proof before requesting a deposit.');
      return;
    }

    setLoading(true);

    let receiptUrl: string | null = null;
    if (activeTab === 'deposit' && receiptFile) {
      receiptUrl = await handleFileUpload(receiptFile);
      if (!receiptUrl) {
        showToast('Error uploading screenshot receipt proof.');
        setLoading(false);
        return;
      }
    }

    const payload = {
      agent_id: currentUserId,
      super_agent_id: assignedNode.id,
      super_agent_name: assignedNode.name,
      type: activeTab,
      method,
      amount: parsedAmount,
      sender_or_receiver_number: trimmedAccount,
      transaction_ref: activeTab === 'deposit' ? (transactionRef.trim() || `TXN-${Math.random().toString(36).substring(2, 8).toUpperCase()}`) : `WD-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      receipt_url: receiptUrl,
      status: 'pending',
      tier: agentCategory,
    };

    const { error: txError } = await supabase
      .from('transaction_requests')
      .insert([payload]);

    if (txError) {
      console.error('Supabase Transaction Error:', txError);
      showToast(`Error: ${txError.message}`);
      setLoading(false);
      return;
    }

    showToast(
      activeTab === 'deposit'
        ? `Deposit request of ETB ${parsedAmount.toLocaleString()} submitted successfully.`
        : `Withdrawal request of ETB ${parsedAmount.toLocaleString()} submitted for approval.`
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
    setLoading(false);
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
            <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden p-2 text-[#0B1B36] hover:bg-[#F5F7FA] rounded-xl border border-[#AEB8C4]/30">
              <Menu size={19} />
            </button>
            <div className="text-xs text-[#536171] hidden sm:flex items-center gap-2.5">
              <span className="font-extrabold text-[#0B1B36]">Wallet Ledger & Escrow</span>
              <span className="text-[#AEB8C4]">/</span>
              <span className="inline-flex items-center gap-1.5 text-[#0B1B36] bg-slate-100 border border-slate-300 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Calculated Ledger Active
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => fetchData(true)} disabled={isRefreshing} className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-[#0B1B36] hover:text-white border border-[#AEB8C4]/40 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer">
              <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <Link href="/dashboard" className="px-3.5 py-1.5 rounded-xl bg-[#0B1B36] text-white text-xs font-bold transition shadow-sm">
              Dashboard
            </Link>
          </div>
        </header>

        <div className="p-4 sm:p-8 space-y-6 max-w-5xl mx-auto w-full">
          
          {/* BALANCES HEADER */}
          <div className="bg-gradient-to-br from-[#0B1B36] via-[#0B1B36] to-[#0E2447] text-white rounded-3xl p-6 sm:p-8 border border-white/10 shadow-xl space-y-6 font-mono">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <div className="text-[10px] text-white/70 uppercase tracking-widest font-bold">
                  Escrow Treasury & Ledger ({agentCategory})
                </div>
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight mt-1">
                  Agent Financial Terminal
                </h1>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { setActiveTab('deposit'); scrollToForm(); }}
                  className="px-4 py-2.5 rounded-xl bg-white text-[#0B1B36] hover:bg-[#AEB8C4] transition text-xs font-extrabold cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <ArrowDownLeft size={14} /> Deposit
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveTab('withdrawal'); scrollToForm(); }}
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
                  <div className="text-[10px] text-[#AEB8C4] uppercase font-bold">Locked Tier Capital</div>
                  <div className="text-xl font-extrabold text-white">ETB {dbCapital.toLocaleString()}</div>
                </div>
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-1">
                  <div className="text-[10px] text-[#AEB8C4] uppercase font-bold">Withdrawable Balance</div>
                  <div className="text-xl font-extrabold text-emerald-400">ETB {withdrawableProfit.toLocaleString()}</div>
                </div>
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-1">
                  <div className="text-[10px] text-[#AEB8C4] uppercase font-bold">Total Portfolio Value</div>
                  <div className="text-xl font-extrabold text-blue-300">ETB {totalAccountValue.toLocaleString()}</div>
                </div>
              </div>
            )}
          </div>

          {/* FORM */}
          <div ref={formRef} className="bg-white rounded-3xl p-6 sm:p-8 border border-[#AEB8C4]/40 shadow-xs space-y-6 font-mono">
            <div className="flex border-b border-[#AEB8C4]/30 pb-4 gap-6">
              <button
                type="button"
                onClick={() => setActiveTab('deposit')}
                className={`pb-2 text-xs sm:text-sm font-extrabold uppercase transition border-b-2 cursor-pointer ${
                  activeTab === 'deposit' ? 'border-[#0B1B36] text-[#0B1B36]' : 'border-transparent text-[#536171]'
                }`}
              >
                Request Deposit
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('withdrawal')}
                className={`pb-2 text-xs sm:text-sm font-extrabold uppercase transition border-b-2 cursor-pointer ${
                  activeTab === 'withdrawal' ? 'border-[#0B1B36] text-[#0B1B36]' : 'border-transparent text-[#536171]'
                }`}
              >
                Request Withdrawal
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-[#536171] uppercase tracking-wider text-[10px]">Select Payment Gateway</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setMethod('telebirr')}
                    className={`p-3.5 rounded-2xl border font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                      method === 'telebirr' ? 'bg-[#0B1B36] text-white border-[#0B1B36]' : 'bg-[#F5F7FA] text-[#0B1B36] border-[#AEB8C4]/40'
                    }`}
                  >
                    <Smartphone size={16} /> Telebirr
                  </button>
                  <button
                    type="button"
                    onClick={() => setMethod('cbe')}
                    className={`p-3.5 rounded-2xl border font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                      method === 'cbe' ? 'bg-[#0B1B36] text-white border-[#0B1B36]' : 'bg-[#F5F7FA] text-[#0B1B36] border-[#AEB8C4]/40'
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
                      ? `Account: ${assignedNode.telebirr_account || assignedNode.phone || '0911223344'}` 
                      : `Account: ${assignedNode.cbe_account || '1000293848592'}`
                    }
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="font-bold text-[#536171] uppercase tracking-wider text-[10px]">Amount (ETB)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder={activeTab === 'withdrawal' ? `Max withdrawable: ETB ${withdrawableProfit}` : "Enter deposit amount e.g. 5000"}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-xl bg-[#F5F7FA] border border-[#AEB8C4]/50 focus:outline-none focus:border-[#0B1B36] font-bold text-sm"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-[#536171] uppercase tracking-wider text-[10px]">
                  {activeTab === 'deposit' ? 'Your Sender Account / Phone Number' : 'Your Receiving Account / Phone Number'}
                </label>
                <input
                  type="text"
                  placeholder={method === 'telebirr' ? '09xxxxxxxx' : '1000xxxxxxxx'}
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-[#F5F7FA] border border-[#AEB8C4]/50 focus:outline-none focus:border-[#0B1B36] font-bold text-sm"
                  required
                />
              </div>

              {activeTab === 'deposit' && (
                <div className="space-y-1.5">
                  <label className="font-bold text-[#536171] uppercase tracking-wider text-[10px]">Transaction Reference ID (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. TXN-994827"
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-[#F5F7FA] border border-[#AEB8C4]/50 focus:outline-none focus:border-[#0B1B36] font-bold text-sm"
                  />
                </div>
              )}

              {activeTab === 'deposit' && (
                <div className="space-y-1.5">
                  <label className="font-bold text-[#536171] uppercase tracking-wider text-[10px] flex items-center justify-between">
                    <span>Mandatory Transfer Receipt Screenshot Proof *</span>
                    <span className="text-amber-600 font-extrabold">Required</span>
                  </label>
                  <label className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl border border-dashed border-[#AEB8C4] hover:border-[#0B1B36] bg-[#F5F7FA] cursor-pointer transition font-bold text-[#536171]">
                    <Upload size={16} />
                    <span>{receiptFile ? receiptFile.name : 'Choose screenshot receipt image (Required)...'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => e.target.files && setReceiptFile(e.target.files[0])}
                      className="hidden"
                    />
                  </label>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-[#0B1B36] hover:bg-[#152d56] text-white font-bold uppercase tracking-wider transition shadow-md cursor-pointer flex items-center justify-center gap-2"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                {activeTab === 'deposit' ? 'Submit Deposit Request (Screenshot Required)' : 'Submit Withdrawal Request'}
              </button>
            </form>
          </div>

          {/* COMPREHENSIVE TRANSACTION HISTORY */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#AEB8C4]/40 shadow-xs space-y-4 font-mono">
            <h3 className="text-base font-extrabold text-[#0B1B36] flex items-center gap-2">
              <WalletIcon size={18} /> Complete Transaction History ({requests.length})
            </h3>

            {requests.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#536171] bg-[#F5F7FA] rounded-2xl border border-[#AEB8C4]/30">
                No recent transaction history recorded.
              </div>
            ) : (
              <div className="space-y-3">
                {requests.map((req) => (
                  <div
                    key={req.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[#F5F7FA] border border-[#AEB8C4]/30 text-xs"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold uppercase ${
                          req.type === 'deposit' ? 'bg-[#0B1B36] text-white' :
                          req.type === 'withdrawal' ? 'bg-emerald-600 text-white' : 'bg-indigo-700 text-white'
                        }`}>
                          {req.type}
                        </span>
                        <span className="font-extrabold text-sm text-[#0B1B36]">ETB {Number(req.amount).toLocaleString()}</span>
                        <span className="text-[10px] text-[#536171] uppercase">({req.method})</span>
                        {req.tier && (
                          <span className="px-2 py-0.5 rounded bg-slate-200 text-[#0B1B36] text-[10px] font-bold">
                            {req.tier}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#536171] space-y-0.5">
                        <div>Assigned Node: <strong className="text-[#0B1B36]">{req.super_agent_name || 'Escrow Gateway'}</strong> | Date: {new Date(req.created_at).toLocaleString()}</div>
                        {req.transaction_ref && <div>Ref: <strong className="text-[#0B1B36]">{req.transaction_ref}</strong></div>}
                        {req.receipt_url && (
                          <div>
                            <a href={req.receipt_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 underline pt-0.5">
                              View Attached Receipt <ExternalLink size={10} />
                            </a>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase flex items-center gap-1 ${
                        req.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                        req.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {req.status === 'approved' && <CheckCircle2 size={12} />}
                        {req.status === 'rejected' && <XCircle size={12} />}
                        {req.status === 'pending' && <Clock size={12} />}
                        {req.status}
                      </span>
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