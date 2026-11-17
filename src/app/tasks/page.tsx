// src/app/tasks/page.tsx
'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Loader2, CheckCircle2, Clock, Zap, ArrowRight, ShieldCheck, RefreshCw, LayoutDashboard } from 'lucide-react';
import { useFGGSystem } from '@/lib/useFGGSystem';
import Navbar from '@/lib/components/Navbar';
import MobileBottomNav from '@/lib/components/MobileBottomNav';

const TIER_DAILY_YIELDS: Record<string, { fee: number; dailyReturn: number; tierLevel: number; maxTasks: number }> = {
  'Electronics': { fee: 10500, dailyReturn: 388.5, tierLevel: 1, maxTasks: 5 },
  'Furniture': { fee: 24000, dailyReturn: 888, tierLevel: 2, maxTasks: 5 },
  'Solar Systems': { fee: 43000, dailyReturn: 1591, tierLevel: 3, maxTasks: 5 },
  'EV Bikes & Tuk-Tuks': { fee: 70000, dailyReturn: 2590, tierLevel: 4, maxTasks: 5 },
  'Real Estate': { fee: 110000, dailyReturn: 4070, tierLevel: 5, maxTasks: 5 },
};

const VIP_TO_CATEGORY: Record<string, string> = {
  'VIP 1': 'Electronics',
  'VIP 2': 'Furniture',
  'VIP 3': 'Solar Systems',
  'VIP 4': 'EV Bikes & Tuk-Tuks',
  'VIP 5': 'Real Estate',
};

function TasksContent() {
  const router = useRouter();
  const { state } = useFGGSystem();

  const [agent, setAgent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [tasksCompletedToday, setTasksCompletedToday] = useState(0);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadAgentAndTasks = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.replace('/login');
        return;
      }

      const { data: agentData } = await supabase
        .from('agents')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      if (!agentData) return;

      const rawTier =
        agentData?.tier ||
        agentData?.active_category ||
        (agentData?.vip_tier ? VIP_TO_CATEGORY[agentData.vip_tier] : null) ||
        state?.activeCategory ||
        'Solar Systems';

      const currentTier = TIER_DAILY_YIELDS[rawTier] ? rawTier : 'Solar Systems';
      const tierConf = TIER_DAILY_YIELDS[currentTier];

      // 1. Fetch active tasks for this agent from agent_tasks
      const { data: tasksData } = await supabase
        .from('agent_tasks')
        .select('*')
        .eq('agent_id', session.user.id)
        .order('created_at', { ascending: false });

      let currentTasks = tasksData || [];

      // If no tasks exist, initialize the 5 quota tasks automatically
      if (currentTasks.length === 0) {
        const taskRewardPerItem = Number((tierConf.dailyReturn / 5).toFixed(2));
        const newBatch = Array.from({ length: 5 }, (_, index) => ({
          agent_id: session.user.id,
          category: currentTier,
          title: `Verification Task #${index + 1}`,
          description: `Execute verification tasks to generate commission yields of ETB ${taskRewardPerItem} / task (3.7% daily fee aggregate).`,
          reward_amount: taskRewardPerItem,
          status: 'pending',
          created_at: new Date().toISOString(),
        }));

        const { data: insertedTasks, error: insertErr } = await supabase
          .from('agent_tasks')
          .insert(newBatch)
          .select();

        if (!insertErr && insertedTasks) {
          currentTasks = insertedTasks;
        }
      }

      // 2. Sync with today's count in agent_daily_tasks table
      const todayStr = new Date().toISOString().split('T')[0];
      const { data: dailyRecord } = await supabase
        .from('agent_daily_tasks')
        .select('completed_count')
        .eq('agent_id', session.user.id)
        .eq('task_date', todayStr)
        .maybeSingle();

      if (dailyRecord) {
        setTasksCompletedToday(dailyRecord.completed_count);
      } else {
        await supabase.from('agent_daily_tasks').insert([
          { agent_id: session.user.id, task_date: todayStr, completed_count: 0 }
        ]);
        setTasksCompletedToday(0);
      }

      setTasks(currentTasks);
      setAgent(agentData);
    } catch (err) {
      console.error('Failed to load tasks telemetry:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router, state?.activeCategory]);

  useEffect(() => {
    loadAgentAndTasks();
  }, [loadAgentAndTasks]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] text-[#0B1B36] flex items-center justify-center font-mono text-xs">
        <div className="flex items-center gap-3">
          <Loader2 size={16} className="animate-spin text-[#0B1B36]" />
          <span>Synchronizing Task Quota Terminal...</span>
        </div>
      </div>
    );
  }

  const rawCurrentTier =
    agent?.tier ||
    agent?.active_category ||
    (agent?.vip_tier ? VIP_TO_CATEGORY[agent.vip_tier] : null) ||
    state?.activeCategory ||
    'Solar Systems';

  const currentTierName = TIER_DAILY_YIELDS[rawCurrentTier] ? rawCurrentTier : 'Solar Systems';
  const tierConfig = TIER_DAILY_YIELDS[currentTierName];

  const handleCompleteTask = async (taskId: string, rewardAmount: number) => {
    if (completingId || tasksCompletedToday >= tierConfig.maxTasks) return;
    setCompletingId(taskId);
    setMessage(null);

    try {
      // 1. Update individual task status in agent_tasks
      const { error: taskErr } = await supabase
        .from('agent_tasks')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', taskId);

      if (taskErr) throw taskErr;

      const newBalance = Number(((agent.balance || 0) + rewardAmount).toFixed(2));
      const newTotalEarnings = Number(((agent.total_earnings || 0) + rewardAmount).toFixed(2));
      const newCount = tasksCompletedToday + 1;
      const todayStr = new Date().toISOString().split('T')[0];

      // 2. Update agent balance and total earnings
      const { error: agentErr } = await supabase
        .from('agents')
        .update({ balance: newBalance, total_earnings: newTotalEarnings })
        .eq('id', agent.id);

      if (agentErr) throw agentErr;

      // 3. Upsert today's count in agent_daily_tasks
      const { error: dailyErr } = await supabase
        .from('agent_daily_tasks')
        .upsert({
          agent_id: agent.id,
          task_date: todayStr,
          completed_count: newCount,
          updated_at: new Date().toISOString()
        }, { onConflict: 'agent_id, task_date' });

      if (dailyErr) throw dailyErr;

      // 4. Log to task_history
      await supabase.from('task_history').insert([
        { agent_id: agent.id, tier: currentTierName, commission_earned: rewardAmount }
      ]);

      // 5. Update local state
      setAgent((prev: any) => ({ ...prev, balance: newBalance, total_earnings: newTotalEarnings }));
      setTasksCompletedToday(newCount);
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: 'completed', completed_at: new Date().toISOString() } : t))
      );

      setMessage({
        text: `Task verified successfully! Credited ETB ${rewardAmount.toLocaleString()} to your balance.`,
        type: 'success',
      });
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to complete task execution.', type: 'error' });
    } finally {
      setCompletingId(null);
    }
  };

  const completedTasks = tasks.filter((t) => t.status === 'completed' || t.status === 'complete');
  const pendingTasks = tasks.filter((t) => t.status !== 'completed' && t.status !== 'complete');
  
  const completedCount = Math.max(tasksCompletedToday, completedTasks.length);
  const completionRate = Math.min(Math.round((completedCount / 5) * 100), 100);
  const rewardPerTask = Number((tierConfig.dailyReturn / 5).toFixed(2));
  const accumulatedToday = Number((completedCount * rewardPerTask).toFixed(2));
  const isFullyCompleted = completedCount >= 5 || pendingTasks.length === 0;

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#0B1B36] font-sans flex relative pb-24 lg:pb-0 selection:bg-[#0B1B36] selection:text-white">
      <Navbar
        activeCategory={currentTierName}
        isMobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <main className="flex-1 flex flex-col min-w-0 bg-[#F5F7FA]">
        <header className="bg-white/95 backdrop-blur-md border-b border-[#AEB8C4]/40 px-4 sm:px-8 py-3.5 flex items-center justify-between sticky top-0 z-30 shadow-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="px-3.5 py-2 rounded-2xl bg-[#0B1B36] text-white hover:bg-[#152d56] transition text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <LayoutDashboard size={14} /> Dashboard
            </button>
            <div className="text-xs font-mono text-[#536171] hidden sm:flex items-center gap-2">
              <span className="text-[#AEB8C4]">/</span>
              <span className="text-[#0B1B36] bg-[#0B1B36]/10 border border-[#0B1B36]/20 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                {currentTierName} (Tier {tierConfig.tierLevel})
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setRefreshing(true);
                loadAgentAndTasks();
              }}
              disabled={refreshing}
              className="p-2.5 rounded-2xl bg-white hover:bg-[#0B1B36] hover:text-white border border-[#AEB8C4]/40 text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-xs"
              title="Refresh Quota"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            </button>
            <div className="text-xs font-mono font-bold text-[#0B1B36] bg-white px-3.5 py-2 rounded-2xl border border-[#AEB8C4]/40 shadow-xs">
              Balance: <span className="text-emerald-700">ETB {(agent?.balance || 0).toLocaleString()}</span>
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-8 space-y-6 max-w-4xl mx-auto w-full">
          {message && (
            <div
              className={`p-4 rounded-2xl text-xs font-mono border ${
                message.type === 'success'
                  ? 'bg-[#0B1B36]/10 text-[#0B1B36] border-[#0B1B36]/30'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Daily Task Quota Widget with Fully Functional Progress Graph */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#AEB8C4]/40 shadow-sm space-y-5 font-mono">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="space-y-1">
                <h2 className="text-sm font-extrabold text-[#0B1B36] uppercase tracking-wider flex items-center gap-2">
                  <Zap size={16} className="text-[#0B1B36]" /> Daily Task Quota ({currentTierName})
                </h2>
                <p className="text-xs text-[#536171]">
                  Execute verification tasks to generate commission yields of <strong className="text-[#0B1B36]">ETB {rewardPerTask} / task</strong> (3.7% daily fee aggregate).
                </p>
              </div>
              <span className="px-3.5 py-1.5 rounded-full bg-slate-100 text-[#0B1B36] text-xs font-extrabold border border-[#AEB8C4]/40 flex items-center gap-1.5">
                <CheckCircle2 size={13} className={isFullyCompleted ? 'text-emerald-600' : 'text-amber-500'} /> {completedCount} / 5 Completed
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-[#536171]">
                <span>Cycle Completion Rate</span>
                <span className={isFullyCompleted ? 'text-emerald-700 font-extrabold' : 'text-[#0B1B36]'}>{completionRate}%</span>
              </div>
              <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden border border-[#AEB8C4]/30 p-0.5">
                <div
                  className={`h-full transition-all duration-700 rounded-full ${isFullyCompleted ? 'bg-emerald-600' : 'bg-[#0B1B36]'}`}
                  style={{ width: `${completionRate}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="bg-[#F5F7FA] p-5 rounded-2xl border border-[#AEB8C4]/30 space-y-1">
                <div className="text-[10px] text-[#536171] uppercase font-bold tracking-wider">Accumulated Today</div>
                <div className="text-xl font-extrabold text-emerald-700">
                  +ETB {accumulatedToday.toLocaleString()}
                </div>
              </div>

              <div className="bg-[#F5F7FA] p-5 rounded-2xl border border-[#AEB8C4]/30 space-y-1">
                <div className="text-[10px] text-[#536171] uppercase font-bold tracking-wider">Target Daily Return (3.7%)</div>
                <div className="text-xl font-extrabold text-[#0B1B36]">
                  ETB {tierConfig.dailyReturn.toLocaleString()}
                </div>
              </div>
            </div>

            {isFullyCompleted && (
              <div className="w-full py-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-extrabold text-xs uppercase tracking-wider text-center flex items-center justify-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600" /> Daily Quota Completed (100%)
              </div>
            )}
          </div>

          {/* Pending Tasks Queue */}
          <div className="space-y-4 font-mono">
            <h2 className="text-sm font-extrabold text-[#0B1B36] uppercase tracking-wider flex items-center gap-2">
              <Clock size={16} className="text-amber-600" /> Pending Tasks Queue ({pendingTasks.length})
            </h2>

            {pendingTasks.length === 0 || completedCount >= 5 ? (
              <div className="bg-white rounded-3xl p-8 border border-[#AEB8C4]/40 text-center text-xs text-[#536171] space-y-2 shadow-xs">
                <CheckCircle2 size={28} className="mx-auto text-emerald-600" />
                <div className="font-bold text-[#0B1B36]">All 5 tasks completed for this cycle!</div>
                <div>Your daily commission yields have been fully credited.</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {pendingTasks.slice(0, 5 - completedCount).map((task, index) => (
                  <div
                    key={task.id}
                    className="bg-white rounded-3xl p-6 border border-[#AEB8C4]/40 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
                  >
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold uppercase text-[10px]">
                          Task Item #{completedCount + index + 1}
                        </span>
                        <span className="font-extrabold text-[#0B1B36]">{task.title}</span>
                      </div>
                      <p className="text-[#536171] max-w-lg">{task.description}</p>
                      <div className="text-emerald-700 font-bold pt-1">
                        Commission Yield: ETB {task.reward_amount || rewardPerTask}
                      </div>
                    </div>

                    <button
                      onClick={() => handleCompleteTask(task.id, task.reward_amount || rewardPerTask)}
                      disabled={completingId === task.id}
                      className="w-full sm:w-auto px-6 py-3.5 bg-[#0B1B36] hover:bg-[#152d56] text-white font-extrabold text-xs rounded-2xl transition uppercase tracking-wider shadow-md cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 shrink-0"
                    >
                      {completingId === task.id ? (
                        <>
                          <Loader2 size={15} className="animate-spin" /> Verifying...
                        </>
                      ) : (
                        <>
                          Complete Task <ArrowRight size={15} />
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Completed History */}
          {completedTasks.length > 0 && (
            <div className="space-y-4 pt-4 font-mono">
              <h2 className="text-sm font-extrabold text-[#0B1B36] uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck size={16} className="text-emerald-600" /> Completed Tasks History ({completedCount}/5)
              </h2>
              <div className="grid grid-cols-1 gap-3">
                {completedTasks.map((task) => (
                  <div
                    key={task.id}
                    className="bg-white/90 rounded-2xl p-4 border border-[#AEB8C4]/30 flex justify-between items-center text-xs shadow-xs"
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                      <div>
                        <div className="font-bold text-[#0B1B36]">{task.title}</div>
                        <div className="text-[10px] text-[#536171]">
                          Verified at {task.completed_at ? new Date(task.completed_at).toLocaleTimeString() : 'Today'}
                        </div>
                      </div>
                    </div>
                    <span className="font-extrabold text-emerald-700">
                      + ETB {task.reward_amount || rewardPerTask}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      <MobileBottomNav />
    </div>
  );
}

export default function TasksPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F5F7FA] text-[#0B1B36] flex items-center justify-center font-mono text-xs">
          <div className="flex items-center gap-3">
            <Loader2 size={16} className="animate-spin text-[#0B1B36]" />
            <span>Loading Tasks Quota Terminal...</span>
          </div>
        </div>
      }
    >
      <TasksContent />
    </Suspense>
  );
}