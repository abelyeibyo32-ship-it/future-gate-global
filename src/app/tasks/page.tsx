// src/app/tasks/page.tsx
'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Loader2,
  CheckCircle2,
  Clock,
  Zap,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  LayoutDashboard,
  Wallet,
  Play,
} from 'lucide-react';
import { useFGGSystem } from '@/lib/useFGGSystem';
import Navbar from '@/lib/components/Navbar';
import MobileBottomNav from '@/lib/components/MobileBottomNav';

const DAILY_YIELD_RATE = 0.037; // 3.7%
const MAX_DAILY_TASKS = 5;

const TIER_DAILY_YIELDS: Record<
  string,
  { fee: number; dailyReturn: number; tierLevel: number; maxTasks: number; taskYieldNum: number }
> = {
  Electronics: {
    fee: 10500,
    dailyReturn: Number((10500 * DAILY_YIELD_RATE).toFixed(2)),
    tierLevel: 1,
    maxTasks: MAX_DAILY_TASKS,
    taskYieldNum: Number(((10500 * DAILY_YIELD_RATE) / MAX_DAILY_TASKS).toFixed(2)),
  },
  Furniture: {
    fee: 24000,
    dailyReturn: Number((24000 * DAILY_YIELD_RATE).toFixed(2)),
    tierLevel: 2,
    maxTasks: MAX_DAILY_TASKS,
    taskYieldNum: Number(((24000 * DAILY_YIELD_RATE) / MAX_DAILY_TASKS).toFixed(2)),
  },
  'Solar Systems': {
    fee: 43000,
    dailyReturn: Number((43000 * DAILY_YIELD_RATE).toFixed(2)),
    tierLevel: 3,
    maxTasks: MAX_DAILY_TASKS,
    taskYieldNum: Number(((43000 * DAILY_YIELD_RATE) / MAX_DAILY_TASKS).toFixed(2)),
  },
  'EV Bikes & Tuk-Tuks': {
    fee: 70000,
    dailyReturn: Number((70000 * DAILY_YIELD_RATE).toFixed(2)),
    tierLevel: 4,
    maxTasks: MAX_DAILY_TASKS,
    taskYieldNum: Number(((70000 * DAILY_YIELD_RATE) / MAX_DAILY_TASKS).toFixed(2)),
  },
  'Real Estate': {
    fee: 110000,
    dailyReturn: Number((110000 * DAILY_YIELD_RATE).toFixed(2)),
    tierLevel: 5,
    maxTasks: MAX_DAILY_TASKS,
    taskYieldNum: Number(((110000 * DAILY_YIELD_RATE) / MAX_DAILY_TASKS).toFixed(2)),
  },
};

const DB_TIER_ALIASES: Record<string, string> = {
  'tier 1': 'Electronics',
  'tier 2': 'Furniture',
  'tier 3': 'Solar Systems',
  'tier 4': 'EV Bikes & Tuk-Tuks',
  'tier 5': 'Real Estate',
  'vip 1': 'Electronics',
  'vip 2': 'Furniture',
  'vip 3': 'Solar Systems',
  'vip 4': 'EV Bikes & Tuk-Tuks',
  'vip 5': 'Real Estate',
  electronics: 'Electronics',
  furniture: 'Furniture',
  'solar systems': 'Solar Systems',
  'ev bikes & tuk-tuks': 'EV Bikes & Tuk-Tuks',
  'real estate': 'Real Estate',
};

function resolveTierKey(rawTier?: string | null, fallbackCategory?: string | null): string {
  const normalized = (rawTier || '').toLowerCase().trim();
  if (normalized && DB_TIER_ALIASES[normalized]) return DB_TIER_ALIASES[normalized];
  if (normalized.includes('electronics')) return 'Electronics';
  if (normalized.includes('furniture')) return 'Furniture';
  if (normalized.includes('solar')) return 'Solar Systems';
  if (normalized.includes('ev') || normalized.includes('bike')) return 'EV Bikes & Tuk-Tuks';
  if (normalized.includes('real estate')) return 'Real Estate';

  if (fallbackCategory && TIER_DAILY_YIELDS[fallbackCategory]) return fallbackCategory;
  return 'Furniture';
}

function TasksContent() {
  const router = useRouter();
  const { state, timeUntilReset } = useFGGSystem();

  const [agent, setAgent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [executingDaily, setExecutingDaily] = useState(false);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [tasksCompletedToday, setTasksCompletedToday] = useState(0);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadAgentAndTasks = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        router.replace('/login');
        return;
      }

      const { data: agentData } = await supabase
        .from('agents')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      const resolvedAgent = agentData || {
        id: session.user.id,
        username: 'Operator',
        tier: 'Furniture',
        balance: 0,
      };

      const currentTier = resolveTierKey(
        resolvedAgent?.tier || resolvedAgent?.active_category || resolvedAgent?.vip_tier,
        state?.activeCategory
      );
      const tierConf = TIER_DAILY_YIELDS[currentTier] || TIER_DAILY_YIELDS.Furniture;

      // 1. Fetch active tasks for this agent from agent_tasks (best-effort if table exists)
      let currentTasks: any[] = [];
      const { data: tasksData, error: tasksFetchErr } = await supabase
        .from('agent_tasks')
        .select('*')
        .eq('agent_id', session.user.id)
        .order('created_at', { ascending: true });

      if (!tasksFetchErr) {
        currentTasks = tasksData || [];
        if (currentTasks.length === 0) {
          const newBatch = Array.from({ length: tierConf.maxTasks }, (_, index) => ({
            agent_id: session.user.id,
            category: currentTier,
            title: `Daily Verification Task #${index + 1}`,
            description: `Execute verification task #${index + 1} to earn ETB ${tierConf.taskYieldNum.toFixed(2)} (3.7% daily fee aggregate across ${tierConf.maxTasks} tasks).`,
            reward_amount: tierConf.taskYieldNum,
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
        setTasksCompletedToday(Number(dailyRecord.completed_count || 0));
      } else {
        await supabase.from('agent_daily_tasks').upsert(
          [{ agent_id: session.user.id, task_date: todayStr, completed_count: 0 }],
          { onConflict: 'agent_id, task_date' }
        );
        setTasksCompletedToday(0);
      }

      setTasks(currentTasks);
      setAgent(resolvedAgent);
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

  useEffect(() => {
    const channel = supabase
      .channel('tasks-realtime-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'agent_daily_tasks' },
        () => loadAgentAndTasks()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'agents' },
        () => loadAgentAndTasks()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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

  const currentTierName = resolveTierKey(
    agent?.tier || agent?.active_category || agent?.vip_tier,
    state?.activeCategory
  );
  const tierConfig = TIER_DAILY_YIELDS[currentTierName] || TIER_DAILY_YIELDS.Furniture;
  const rewardPerTask = tierConfig.taskYieldNum;

  const pendingTasks = tasks.filter((t) => t.status !== 'completed' && t.status !== 'complete');
  const completedTasks = tasks.filter((t) => t.status === 'completed' || t.status === 'complete');

  const completedCount = Math.min(tierConfig.maxTasks, tasksCompletedToday);
  const completionRate = Math.min(Math.round((completedCount / tierConfig.maxTasks) * 100), 100);
  const accumulatedToday = Number((completedCount * rewardPerTask).toFixed(2));
  const isFullyCompleted = completedCount >= tierConfig.maxTasks;

  const commitDailyTaskExecution = async (
    rewardAmount: number,
    targetTaskId?: string
  ) => {
    if (!agent || completedCount >= tierConfig.maxTasks) return;

    const earned = Number(rewardAmount || rewardPerTask);
    const newBalance = Number(((Number(agent.balance) || 0) + earned).toFixed(2));
    const newCount = completedCount + 1;
    const todayStr = new Date().toISOString().split('T')[0];

    // 1. Update agent balance (matching dashboard)
    const { error: agentErr } = await supabase
      .from('agents')
      .update({ balance: newBalance })
      .eq('id', agent.id);

    if (agentErr) throw agentErr;

    // 2. Upsert today's count in agent_daily_tasks (matching dashboard)
    const { error: dailyErr } = await supabase
      .from('agent_daily_tasks')
      .upsert(
        [
          {
            agent_id: agent.id,
            task_date: todayStr,
            completed_count: newCount,
            updated_at: new Date().toISOString(),
          },
        ],
        { onConflict: 'agent_id, task_date' }
      );

    if (dailyErr) throw dailyErr;

    // 3. Log to task_history (matching dashboard)
    await supabase.from('task_history').insert([
      {
        agent_id: agent.id,
        tier: currentTierName,
        commission_earned: earned,
      },
    ]);

    // 4. Mark individual task row completed if available
    if (targetTaskId) {
      await supabase
        .from('agent_tasks')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', targetTaskId);

      setTasks((prev) =>
        prev.map((t) =>
          t.id === targetTaskId
            ? { ...t, status: 'completed', completed_at: new Date().toISOString() }
            : t
        )
      );
    }

    setAgent((prev: any) => ({ ...prev, balance: newBalance }));
    setTasksCompletedToday(newCount);
    setMessage({
      text: `Daily task #${newCount}/${tierConfig.maxTasks} executed! Credited ETB ${earned.toFixed(2)} to your balance.`,
      type: 'success',
    });
  };

  const handleExecuteNextDailyTask = async () => {
    if (executingDaily || completingId || isFullyCompleted) return;
    setExecutingDaily(true);
    setMessage(null);

    try {
      const nextTask = pendingTasks[0];
      await commitDailyTaskExecution(
        nextTask?.reward_amount ?? rewardPerTask,
        nextTask?.id
      );
    } catch (err: any) {
      setMessage({
        text: err.message || 'Failed to execute daily task.',
        type: 'error',
      });
    } finally {
      setExecutingDaily(false);
    }
  };

  const handleCompleteTask = async (taskId: string, rewardAmount: number) => {
    if (executingDaily || completingId || isFullyCompleted) return;
    setCompletingId(taskId);
    setMessage(null);

    try {
      await commitDailyTaskExecution(rewardAmount, taskId);
    } catch (err: any) {
      setMessage({
        text: err.message || 'Failed to complete task execution.',
        type: 'error',
      });
    } finally {
      setCompletingId(null);
    }
  };

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
              onClick={() => loadAgentAndTasks(true)}
              disabled={refreshing}
              className="p-2.5 rounded-2xl bg-white hover:bg-[#0B1B36] hover:text-white border border-[#AEB8C4]/40 text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-xs"
              title="Refresh Quota"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            </button>
            <Link
              href="/wallet"
              className="text-xs font-mono font-bold text-[#0B1B36] bg-white hover:bg-slate-100 px-3.5 py-2 rounded-2xl border border-[#AEB8C4]/40 shadow-xs flex items-center gap-1.5"
            >
              <Wallet size={14} />
              <span>Balance:</span>
              <span className="text-emerald-700">
                ETB {(Number(agent?.balance) || 0).toLocaleString()}
              </span>
            </Link>
          </div>
        </header>

        <div className="p-4 sm:p-8 space-y-6 max-w-4xl mx-auto w-full">
          {message && (
            <div
              className={`p-4 rounded-2xl text-xs font-mono border ${
                message.type === 'success'
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Daily Task Quota Widget with Direct Daily Task Execution */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#AEB8C4]/40 shadow-sm space-y-5 font-mono">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="space-y-1">
                <h2 className="text-sm font-extrabold text-[#0B1B36] uppercase tracking-wider flex items-center gap-2">
                  <Zap size={16} className="text-[#0B1B36]" /> Daily Task Quota ({currentTierName})
                </h2>
                <p className="text-xs text-[#536171]">
                  Execute daily verification tasks to earn{' '}
                  <strong className="text-[#0B1B36]">
                    ETB {rewardPerTask.toFixed(2)} / task
                  </strong>{' '}
                  (3.7% daily fee aggregate • Reset in {timeUntilReset || '24h'}).
                </p>
              </div>
              <span className="px-3.5 py-1.5 rounded-full bg-slate-100 text-[#0B1B36] text-xs font-extrabold border border-[#AEB8C4]/40 flex items-center gap-1.5">
                <CheckCircle2
                  size={13}
                  className={isFullyCompleted ? 'text-emerald-600' : 'text-amber-500'}
                />{' '}
                {completedCount} / {tierConfig.maxTasks} Completed
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-[#536171]">
                <span>Cycle Completion Rate</span>
                <span
                  className={
                    isFullyCompleted ? 'text-emerald-700 font-extrabold' : 'text-[#0B1B36]'
                  }
                >
                  {completionRate}%
                </span>
              </div>
              <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden border border-[#AEB8C4]/30 p-0.5">
                <div
                  className={`h-full transition-all duration-700 rounded-full ${
                    isFullyCompleted ? 'bg-emerald-600' : 'bg-[#0B1B36]'
                  }`}
                  style={{ width: `${completionRate}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="bg-[#F5F7FA] p-5 rounded-2xl border border-[#AEB8C4]/30 space-y-1">
                <div className="text-[10px] text-[#536171] uppercase font-bold tracking-wider">
                  Accumulated Today
                </div>
                <div className="text-xl font-extrabold text-emerald-700">
                  +ETB {accumulatedToday.toFixed(2)}
                </div>
              </div>

              <div className="bg-[#F5F7FA] p-5 rounded-2xl border border-[#AEB8C4]/30 space-y-1">
                <div className="text-[10px] text-[#536171] uppercase font-bold tracking-wider">
                  Target Daily Return (3.7%)
                </div>
                <div className="text-xl font-extrabold text-[#0B1B36]">
                  ETB {tierConfig.dailyReturn.toFixed(2)}
                </div>
              </div>
            </div>

            {isFullyCompleted ? (
              <div className="w-full py-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-extrabold text-xs uppercase tracking-wider text-center flex items-center justify-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600" /> Daily Quota Completed (100%)
              </div>
            ) : (
              <button
                type="button"
                onClick={handleExecuteNextDailyTask}
                disabled={executingDaily || Boolean(completingId)}
                className="w-full py-4 rounded-2xl bg-[#0B1B36] hover:bg-[#152d56] disabled:bg-slate-300 disabled:text-slate-500 text-white font-extrabold text-xs uppercase tracking-wider transition shadow-md cursor-pointer flex items-center justify-center gap-2"
              >
                {executingDaily ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Executing Daily Task...
                  </>
                ) : (
                  <>
                    <Play size={15} /> Execute Daily Task #{completedCount + 1} (+ETB{' '}
                    {rewardPerTask.toFixed(2)})
                  </>
                )}
              </button>
            )}
          </div>

          {/* Pending Tasks Queue */}
          <div className="space-y-4 font-mono">
            <h2 className="text-sm font-extrabold text-[#0B1B36] uppercase tracking-wider flex items-center gap-2">
              <Clock size={16} className="text-amber-600" /> Pending Tasks Queue (
              {Math.max(0, tierConfig.maxTasks - completedCount)})
            </h2>

            {isFullyCompleted ? (
              <div className="bg-white rounded-3xl p-8 border border-[#AEB8C4]/40 text-center text-xs text-[#536171] space-y-2 shadow-xs">
                <CheckCircle2 size={28} className="mx-auto text-emerald-600" />
                <div className="font-bold text-[#0B1B36]">
                  All {tierConfig.maxTasks} daily tasks completed for this cycle!
                </div>
                <div>Your daily commission yields have been credited to your balance.</div>
              </div>
            ) : pendingTasks.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {pendingTasks.slice(0, tierConfig.maxTasks - completedCount).map((task, index) => (
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
                        Commission Yield: ETB{' '}
                        {Number(task.reward_amount ?? rewardPerTask).toFixed(2)}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        handleCompleteTask(
                          task.id,
                          Number(task.reward_amount ?? rewardPerTask)
                        )
                      }
                      disabled={Boolean(completingId) || executingDaily}
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
            ) : (
              <div className="bg-white rounded-3xl p-6 border border-[#AEB8C4]/40 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
                <div className="text-[#536171]">
                  Use the <strong className="text-[#0B1B36]">Execute Daily Task</strong> button
                  above to complete remaining tasks for today.
                </div>
                <button
                  type="button"
                  onClick={handleExecuteNextDailyTask}
                  disabled={executingDaily}
                  className="px-5 py-3 rounded-2xl bg-[#0B1B36] text-white font-bold uppercase tracking-wider cursor-pointer"
                >
                  {executingDaily ? 'Executing...' : 'Execute Next Task'}
                </button>
              </div>
            )}
          </div>

          {/* Completed History */}
          {completedCount > 0 && (
            <div className="space-y-4 pt-4 font-mono">
              <h2 className="text-sm font-extrabold text-[#0B1B36] uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck size={16} className="text-emerald-600" /> Completed Tasks Today (
                {completedCount}/{tierConfig.maxTasks})
              </h2>
              <div className="grid grid-cols-1 gap-3">
                {completedTasks.length > 0
                  ? completedTasks.map((task, idx) => (
                      <div
                        key={task.id || idx}
                        className="bg-white/90 rounded-2xl p-4 border border-[#AEB8C4]/30 flex justify-between items-center text-xs shadow-xs"
                      >
                        <div className="flex items-center gap-3">
                          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                          <div>
                            <div className="font-bold text-[#0B1B36]">{task.title}</div>
                            <div className="text-[10px] text-[#536171]">
                              Verified at{' '}
                              {task.completed_at
                                ? new Date(task.completed_at).toLocaleTimeString()
                                : 'Today'}
                            </div>
                          </div>
                        </div>
                        <span className="font-extrabold text-emerald-700">
                          + ETB {Number(task.reward_amount ?? rewardPerTask).toFixed(2)}
                        </span>
                      </div>
                    ))
                  : Array.from({ length: completedCount }, (_, idx) => (
                      <div
                        key={idx}
                        className="bg-white/90 rounded-2xl p-4 border border-[#AEB8C4]/30 flex justify-between items-center text-xs shadow-xs"
                      >
                        <div className="flex items-center gap-3">
                          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                          <div>
                            <div className="font-bold text-[#0B1B36]">
                              Daily Verification Task #{idx + 1}
                            </div>
                            <div className="text-[10px] text-[#536171]">Verified Today</div>
                          </div>
                        </div>
                        <span className="font-extrabold text-emerald-700">
                          + ETB {rewardPerTask.toFixed(2)}
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