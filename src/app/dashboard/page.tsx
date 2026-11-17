// src/app/dashboard/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Wallet,
  CheckCircle2,
  TrendingUp,
  ShieldCheck,
  Clock,
  Layers,
  Menu,
  RefreshCw,
  Award,
  Sparkles,
  Activity,
  Lock,
  Zap,
  Cpu,
  PieChart,
  Check,
  CheckCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useFGGSystem } from '@/lib/useFGGSystem';
import Navbar from '@/lib/components/Navbar';
import MobileBottomNav from '@/lib/components/MobileBottomNav';

interface AgentRecord {
  id: string;
  username?: string;
  tier: string;
  capital_balance: number;
  balance: number;
  referral_code: string;
}

const MARKETPLACE_TIERS = [
  { 
    id: 'Electronics', 
    name: 'Electronics', 
    tierLevel: 1,
    tierLabel: 'Tier 1',
    fee: 10500, 
    duration: '10 Months',
    maxTasks: 5,
    status: 'available'
  },
  { 
    id: 'Furniture', 
    name: 'Furniture', 
    tierLevel: 2,
    tierLabel: 'Tier 2',
    fee: 24000, 
    duration: '10 Months',
    maxTasks: 5,
    status: 'available'
  },
  { 
    id: 'Solar Systems', 
    name: 'Solar Systems', 
    tierLevel: 3,
    tierLabel: 'Tier 3',
    fee: 43000, 
    duration: '10 Months',
    maxTasks: 5,
    status: 'available'
  },
  { 
    id: 'EV Bikes & Tuk-Tuks', 
    name: 'EV Bikes & Tuk-Tuks', 
    tierLevel: 4,
    tierLabel: 'Tier 4',
    fee: 70000, 
    duration: '10 Months',
    maxTasks: 5,
    status: 'upcoming'
  },
  { 
    id: 'Real Estate', 
    name: 'Real Estate', 
    tierLevel: 5,
    tierLabel: 'Tier 5',
    fee: 110000, 
    duration: '10 Months',
    maxTasks: 5,
    status: 'upcoming'
  },
].map(tier => {
  const dailyReturnVal = tier.fee * 0.037;
  const taskYieldVal = dailyReturnVal / 5;
  const est30DaysVal = dailyReturnVal * 30;
  return {
    ...tier,
    dailyReturnNum: dailyReturnVal,
    taskYieldNum: taskYieldVal,
    dailyReturn: `ETB ${dailyReturnVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    commission: `ETB ${taskYieldVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / task`,
    est30Days: `ETB ${est30DaysVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
  };
});

export default function DashboardPage() {
  const router = useRouter();
  const { timeUntilReset } = useFGGSystem();
  const [isMounted, setIsMounted] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const [agent, setAgent] = useState<AgentRecord | null>(null);
  const [tasksCompletedToday, setTasksCompletedToday] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [completingTask, setCompletingTask] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    fetchDashboardData();
  }, []);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const fetchDashboardData = async (manual = false) => {
    if (manual) setIsRefreshing(true);

    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id || '00000000-0000-0000-0000-000000000001';

    const { data: agentData } = await supabase
      .from('agents')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (agentData) {
      setAgent(agentData as AgentRecord);
    } else {
      setAgent({
        id: userId,
        username: 'Operator Alpha',
        tier: 'Solar Systems',
        capital_balance: 43000,
        balance: 1591.00,
        referral_code: 'FGG-DEMO88',
      });
    }

    // Fetch today's task count using local YYYY-MM-DD date string
    const todayStr = new Date().toISOString().split('T')[0];
    const { data: taskRecord } = await supabase
      .from('agent_daily_tasks')
      .select('completed_count')
      .eq('agent_id', userId)
      .eq('task_date', todayStr)
      .maybeSingle();

    if (taskRecord) {
      setTasksCompletedToday(taskRecord.completed_count);
    } else {
      // Initialize record for today if it doesn't exist yet
      await supabase.from('agent_daily_tasks').insert([
        { agent_id: userId, task_date: todayStr, completed_count: 0 }
      ]);
      setTasksCompletedToday(0);
    }

    if (manual) {
      setIsRefreshing(false);
      showToast('Dashboard terminal synchronized.');
    }
  };

  const handleExecuteTask = async () => {
    if (completingTask || !agent) return;
    const tierKey = agent.tier || 'Solar Systems';
    const tierObj = MARKETPLACE_TIERS.find(t => t.id === tierKey) || MARKETPLACE_TIERS[2];

    if (tasksCompletedToday >= tierObj.maxTasks) {
      showToast('Daily task quota fully exhausted for this cycle.');
      return;
    }

    setCompletingTask(true);

    const earned = tierObj.taskYieldNum;
    const newBalance = Number(agent.balance || 0) + earned;
    const newCount = tasksCompletedToday + 1;
    const todayStr = new Date().toISOString().split('T')[0];

    // 1. Update agent balance
    const { error: agentError } = await supabase
      .from('agents')
      .update({ balance: newBalance })
      .eq('id', agent.id);

    if (agentError) {
      showToast(`Execution error: ${agentError.message}`);
      setCompletingTask(false);
      return;
    }

    // 2. Upsert daily task count record
    const { error: taskError } = await supabase
      .from('agent_daily_tasks')
      .upsert({
        agent_id: agent.id,
        task_date: todayStr,
        completed_count: newCount,
        updated_at: new Date().toISOString()
      }, { onConflict: 'agent_id, task_date' });

    if (taskError) {
      showToast(`Task save error: ${taskError.message}`);
      setCompletingTask(false);
      return;
    }

    // 3. Log history item
    await supabase.from('task_history').insert([
      { agent_id: agent.id, tier: tierKey, commission_earned: earned }
    ]);

    setAgent({ ...agent, balance: newBalance });
    setTasksCompletedToday(newCount);
    showToast(`Task executed successfully! Earned ETB ${earned.toFixed(2)}.`);
    setCompletingTask(false);
  };

  if (!isMounted) return <div className="min-h-screen bg-[#F5F7FA]" />;

  const currentTierId = agent?.tier || 'Solar Systems';
  const activeTierConfig = MARKETPLACE_TIERS.find(t => t.id === currentTierId) || MARKETPLACE_TIERS[2];
  const maxTasks = activeTierConfig.maxTasks;
  const progressPercent = Math.min(100, (tasksCompletedToday / maxTasks) * 100);
  const taskYieldValue = activeTierConfig.taskYieldNum;
  const dailyTotalYield = tasksCompletedToday * taskYieldValue;

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#0B1B36] font-sans flex selection:bg-[#0B1B36] selection:text-white relative pb-28 lg:pb-0">
      
      {notification && (
        <div className="fixed bottom-20 lg:bottom-6 right-6 z-50 bg-[#0B1B36] text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-white/20 text-xs font-mono flex items-center gap-3 animate-in fade-in">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse shrink-0"></span>
          <span>{notification}</span>
        </div>
      )}

      <Navbar 
        activeCategory={currentTierId} 
        isMobileOpen={isMobileMenuOpen} 
        onCloseMobile={() => setIsMobileMenuOpen(false)} 
      />

      <main className="flex-1 flex flex-col min-w-0">
        <header className="bg-white/95 backdrop-blur-md border-b border-[#0B1B36]/15 px-4 sm:px-8 py-3.5 flex items-center justify-between sticky top-0 z-30 font-mono">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden p-2 text-[#0B1B36] hover:bg-[#0B1B36]/5 rounded-xl border border-[#0B1B36]/15">
              <Menu size={19} />
            </button>
            <div className="text-xs text-[#0B1B36]/70 hidden sm:flex items-center gap-2.5">
              <span className="font-extrabold text-[#0B1B36]">Operations Control Panel</span>
              <span className="text-[#0B1B36]/30">/</span>
              <span className="inline-flex items-center gap-1.5 text-[#0B1B36] bg-[#0B1B36]/5 border border-[#0B1B36]/15 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0B1B36] animate-pulse"></span>
                Node Connected ({activeTierConfig.tierLabel})
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => fetchDashboardData(true)} disabled={isRefreshing} className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#0B1B36] hover:text-white border border-[#0B1B36]/20 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs">
              <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <Link href="/wallet" className="px-3.5 py-1.5 rounded-xl bg-[#0B1B36] text-white hover:bg-[#152d56] transition text-xs font-bold shadow-sm flex items-center gap-1.5">
              <Wallet size={14} /> Wallet
            </Link>
          </div>
        </header>

        <div className="p-4 sm:p-8 space-y-6 max-w-6xl mx-auto w-full font-mono">
          
          {/* TOP BANNER & WELCOME */}
          <div className="bg-gradient-to-br from-[#0B1B36] via-[#0B1B36] to-[#122a52] text-white rounded-3xl p-6 sm:p-8 border border-white/10 shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 border border-white/20 text-[11px] font-extrabold shadow-inner">
                <Sparkles size={14} className="text-white animate-spin" /> Active Clearing Level: <span className="text-emerald-300 underline">{activeTierConfig.tierLabel}: {activeTierConfig.name}</span> (3.7% Daily Yield)
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
                <Cpu size={24} className="text-white" /> Welcome back, {agent?.username || 'Operator'}
              </h1>
              <p className="text-xs text-white/75 max-w-lg leading-relaxed">
                Your clearing escrow node is operating under <strong className="text-white">{activeTierConfig.name}</strong>. Complete your daily tasks (yielding 3.7% daily fee return) or upgrade your tier.
              </p>
            </div>

            <div className="bg-white/10 p-5 rounded-2xl border border-white/15 backdrop-blur-sm min-w-[220px] space-y-2 shadow-lg">
              <div className="text-[10px] text-white/70 uppercase tracking-widest font-bold flex items-center gap-1.5">
                <Clock size={13} /> Reset Countdown
              </div>
              <div className="text-lg font-extrabold text-white flex items-center gap-2">
                {timeUntilReset || '23h 45m remaining'}
              </div>
              <div className="text-[10px] text-white/60">Automated cycle refresh active</div>
            </div>
          </div>

          {/* FINANCIAL STATS GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-3xl border border-[#0B1B36]/15 shadow-xs space-y-3">
              <div className="text-[10px] text-[#0B1B36]/60 uppercase font-bold flex items-center justify-between">
                <span>Locked Tier Capital ({activeTierConfig.tierLabel})</span>
                <span className="p-2 rounded-xl bg-[#0B1B36]/5 text-[#0B1B36]"><ShieldCheck size={16} /></span>
              </div>
              <div className="text-2xl font-extrabold text-[#0B1B36]">
                ETB {(agent?.capital_balance || activeTierConfig.fee).toLocaleString()}
              </div>
              <div className="text-[11px] text-[#0B1B36]/70 flex items-center gap-1">
                <Lock size={11} /> Base escrow security floor
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-[#0B1B36]/15 shadow-xs space-y-3">
              <div className="text-[10px] text-[#0B1B36]/60 uppercase font-bold flex items-center justify-between">
                <span>Withdrawable Earnings</span>
                <span className="p-2 rounded-xl bg-[#0B1B36]/5 text-[#0B1B36]"><TrendingUp size={16} /></span>
              </div>
              <div className="text-2xl font-extrabold text-[#0B1B36]">
                ETB {(agent?.balance || 0).toLocaleString()}
              </div>
              <div className="text-[11px] text-[#0B1B36]/70 flex items-center gap-1">
                <Zap size={11} /> Ready for instant payout
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-[#0B1B36]/15 shadow-xs space-y-3">
              <div className="text-[10px] text-[#0B1B36]/60 uppercase font-bold flex items-center justify-between">
                <span>Referral Code</span>
                <span className="p-2 rounded-xl bg-[#0B1B36]/5 text-[#0B1B36]"><Award size={16} /></span>
              </div>
              <div className="text-xl font-extrabold text-[#0B1B36] tracking-wider">
                {agent?.referral_code || 'FGG-AGENT'}
              </div>
              <div className="text-[11px] text-[#0B1B36]/70 flex items-center gap-1">
                <PieChart size={11} /> Multi-level network ID
              </div>
            </div>
          </div>

          {/* TASK QUOTA SECTION */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Daily Task Quota Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#0B1B36]/15 shadow-xs space-y-6 lg:col-span-2 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-extrabold text-[#0B1B36] flex items-center gap-2">
                    <Activity size={18} className="text-[#0B1B36]" /> Daily Task Quota ({activeTierConfig.name})
                  </h3>
                  <span className="px-3 py-1 rounded-full bg-[#0B1B36]/10 text-[#0B1B36] text-[10px] font-bold flex items-center gap-1">
                    <CheckCircle2 size={12} /> {tasksCompletedToday} / {maxTasks} Completed
                  </span>
                </div>
                <p className="text-xs text-[#0B1B36]/70">
                  Execute verification tasks to generate commission yields of <strong className="text-[#0B1B36]">{activeTierConfig.commission}</strong> per task (3.7% daily fee aggregate).
                </p>
              </div>

              {/* Progress Bar Visual */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-[#0B1B36]">
                  <span>Cycle Completion Rate</span>
                  <span>{progressPercent.toFixed(0)}%</span>
                </div>
                <div className="w-full h-4 bg-[#0B1B36]/10 rounded-full overflow-hidden p-0.5 border border-[#0B1B36]/15">
                  <div 
                    className="h-full bg-[#0B1B36] rounded-full transition-all duration-500 shadow-inner" 
                    style={{ width: `${progressPercent}%` }}
                  ></div>
                </div>
              </div>

              {/* Yield Accumulation Summary Box */}
              <div className="p-4 rounded-2xl bg-[#F5F7FA] border border-[#0B1B36]/15 flex items-center justify-between text-xs">
                <div>
                  <div className="text-[10px] text-[#0B1B36]/60 uppercase font-bold">Accumulated Today</div>
                  <div className="text-lg font-extrabold text-[#0B1B36] mt-0.5">+ETB {dailyTotalYield.toFixed(2)}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-[#0B1B36]/60 uppercase font-bold">Target Daily Return (3.7%)</div>
                  <div className="text-lg font-extrabold text-emerald-600 mt-0.5">{activeTierConfig.dailyReturn}</div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleExecuteTask}
                disabled={completingTask || tasksCompletedToday >= maxTasks}
                className="w-full py-4 rounded-xl bg-[#0B1B36] hover:bg-[#152d56] disabled:bg-slate-300 disabled:text-slate-500 text-white font-bold uppercase tracking-wider transition shadow-md cursor-pointer flex items-center justify-center gap-2 text-xs"
              >
                {completingTask ? 'Executing Task...' : tasksCompletedToday >= maxTasks ? 'Daily Quota Completed' : `Execute Verification Task (+ETB ${taskYieldValue.toFixed(2)})`}
              </button>
            </div>

            {/* Node Efficiency & Distribution Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#0B1B36]/15 shadow-xs space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <h3 className="text-base font-extrabold text-[#0B1B36] flex items-center gap-2">
                  <Layers size={18} className="text-[#0B1B36]" /> Node Metrics ({activeTierConfig.tierLabel})
                </h3>

                <div className="space-y-3 text-xs">
                  <div className="p-3.5 rounded-2xl bg-[#F5F7FA] border border-[#0B1B36]/15 space-y-1">
                    <div className="text-[10px] text-[#0B1B36]/60 uppercase font-bold flex items-center gap-1"><Clock size={11} /> Contract Term</div>
                    <div className="font-extrabold text-[#0B1B36]">{activeTierConfig.duration}</div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#F5F7FA] border border-[#0B1B36]/15 space-y-1">
                    <div className="text-[10px] text-[#0B1B36]/60 uppercase font-bold flex items-center gap-1"><TrendingUp size={11} /> 30-Day Estimate</div>
                    <div className="font-extrabold text-emerald-600">{activeTierConfig.est30Days}</div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#F5F7FA] border border-[#0B1B36]/15 space-y-1">
                    <div className="text-[10px] text-[#0B1B36]/60 uppercase font-bold flex items-center gap-1"><ShieldCheck size={11} /> Security Hash</div>
                    <div className="font-mono text-[11px] font-extrabold text-[#0B1B36] truncate">SHA-256: FGG-SECURE-99</div>
                  </div>
                </div>
              </div>

              <Link
                href="/wallet"
                className="w-full py-3.5 rounded-xl bg-white text-[#0B1B36] hover:bg-slate-100 border border-[#0B1B36]/30 font-bold uppercase tracking-wider text-xs transition text-center block shadow-xs"
              >
                Access Wallet Escrow
              </Link>
            </div>

          </div>

          {/* MARKETPLACE PRICING & CONTRACT TIERS */}
          <div className="space-y-4 pt-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <div className="text-[10px] font-bold text-[#0B1B36]/60 uppercase tracking-widest">Transparent Pricing & Tiers (3.7% Daily Yield Model)</div>
                <h3 className="text-xl font-extrabold text-[#0B1B36]">Marketplace Pricing & Contract Tiers</h3>
                <p className="text-xs text-[#0B1B36]/70">Review entry fees, 3.7% daily returns, and projected 30-day earnings</p>
              </div>
              <span className="px-3.5 py-1.5 rounded-full bg-[#0B1B36]/10 text-[#0B1B36] text-xs font-extrabold">
                5 Structured Tiers
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {MARKETPLACE_TIERS.map((tier) => {
                const isCurrent = tier.id === currentTierId;
                const isUpcoming = tier.status === 'upcoming';
                const isDarkCard = isCurrent || isUpcoming;

                return (
                  <div
                    key={tier.id}
                    className={`rounded-3xl p-5 border flex flex-col justify-between transition-all duration-300 shadow-lg relative ${
                      isDarkCard
                        ? 'bg-[#0B1B36] text-white border-[#0B1B36]'
                        : 'bg-white text-[#0B1B36] border-[#0B1B36]/15 hover:border-[#0B1B36]'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm ${
                          isDarkCard ? 'bg-white/10 text-white' : 'bg-[#0B1B36]/5 text-[#0B1B36]'
                        }`}>
                          <Cpu size={20} />
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase flex items-center gap-1 ${
                          isCurrent
                            ? 'bg-emerald-500 text-white'
                            : isUpcoming
                            ? 'bg-white/10 text-white/80 border border-white/20'
                            : 'bg-[#0B1B36] text-white'
                        }`}>
                          {isCurrent && <CheckCircle size={10} />}
                          {isUpcoming && <Lock size={10} />}
                          {!isCurrent && !isUpcoming && <Check size={10} />}
                          {isCurrent ? 'ACTIVE TIER' : isUpcoming ? 'UPCOMING' : 'AVAILABLE'}
                        </span>
                      </div>

                      <div className="text-[10px] opacity-70 uppercase tracking-widest font-bold">{tier.tierLabel}</div>
                      <h4 className="text-base font-extrabold mt-0.5">{tier.name}</h4>
                      <p className={`text-[11px] mt-1 ${isDarkCard ? 'text-white/70' : 'text-[#0B1B36]/60'}`}>
                        {tier.id === 'Electronics' ? 'Entry-Level Consumer Tech' :
                         tier.id === 'Furniture' ? 'Commercial Office & Home Assets' :
                         tier.id === 'Solar Systems' ? 'High-Yield Green Energy Grid' :
                         tier.id === 'EV Bikes & Tuk-Tuks' ? 'Urban Transit Fleet' : 'Institutional Commercial Assets'}
                      </p>
                    </div>

                    <div className="space-y-3 pt-6 my-4 border-t border-current/15 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="opacity-70 text-[11px]">Account Fee:</span>
                        <strong className="font-extrabold">ETB {tier.fee.toLocaleString()}</strong>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="opacity-70 text-[11px]">Daily Return (3.7%):</span>
                        <strong className="font-extrabold">{tier.dailyReturn}</strong>
                      </div>
                      <div className="text-[10px] opacity-60 text-right">
                        (5 Tasks / Day): {tier.commission}
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-current/10">
                        <span className="opacity-70 text-[11px]">30-Day Est:</span>
                        <strong className="font-extrabold text-emerald-400">{tier.est30Days}</strong>
                      </div>
                    </div>

                    <div>
                      {isCurrent ? (
                        <div className="w-full py-3 rounded-xl bg-white/10 text-white text-center font-bold text-xs border border-white/20 cursor-not-allowed select-none opacity-80 flex items-center justify-center gap-1.5">
                          <CheckCircle size={14} className="text-emerald-400" /> Active Tier (Locked)
                        </div>
                      ) : isUpcoming ? (
                        <div className="w-full py-3 rounded-xl bg-white/5 text-white/50 text-center font-bold text-xs border border-white/10 cursor-not-allowed select-none">
                          Locked Tier
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => router.push('/wallet')}
                          className="w-full py-3 rounded-xl bg-[#0B1B36] text-white hover:bg-[#152d56] transition font-extrabold text-xs text-center block shadow-md cursor-pointer"
                        >
                          Select & Upgrade
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </main>

      <MobileBottomNav />

    </div>
  );
}