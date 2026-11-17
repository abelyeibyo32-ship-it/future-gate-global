'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

const VIP_TIERS = [
  {
    tier: 'VIP 1',
    fee: 10500,
    dailyTasks: 5,
    perTask: '100.00',
    dailyTotal: '500.00',
    monthlyTotal: '13,000.00',
    color: 'from-blue-600 to-indigo-600',
    badge: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
  },
  {
    tier: 'VIP 2',
    fee: 24500,
    dailyTasks: 5,
    perTask: '~188.46',
    dailyTotal: '942.30',
    monthlyTotal: '24,500.00',
    color: 'from-emerald-600 to-teal-600',
    badge: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  },
  {
    tier: 'VIP 3',
    fee: 43000,
    dailyTasks: 5,
    perTask: '~330.77',
    dailyTotal: '1,653.85',
    monthlyTotal: '43,000.00',
    color: 'from-purple-600 to-pink-600',
    badge: 'border-purple-500/30 bg-purple-500/10 text-purple-400',
  },
  {
    tier: 'VIP 4',
    fee: 70000,
    dailyTasks: 5,
    perTask: '~538.46',
    dailyTotal: '2,692.30',
    monthlyTotal: '70,000.00',
    color: 'from-amber-600 to-orange-600',
    badge: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
  },
  {
    tier: 'VIP 5',
    fee: 110000,
    dailyTasks: 5,
    perTask: '~846.15',
    dailyTotal: '4,230.75',
    monthlyTotal: '110,000.00',
    color: 'from-rose-600 to-red-600',
    badge: 'border-rose-500/30 bg-rose-500/10 text-rose-400',
  },
];

export default function VipSelectPage() {
  const [loading, setLoading] = useState(true);
  const [agent, setAgent] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const router = useRouter();

  useEffect(() => {
    fetchAgentData();
  }, []);

  const fetchAgentData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    const { data } = await supabase
      .from('agents')
      .select('*')
      .eq('id', user.id)
      .single();

    setAgent(data);
    setLoading(false);
  };

  const handlePurchaseVip = async (tierObj: typeof VIP_TIERS[0]) => {
    if (!agent) return;

    const currentBalance = Number(agent.deposit_balance || 0);

    if (currentBalance < tierObj.fee) {
      setMessage({
        text: `Insufficient balance! You need ETB ${tierObj.fee.toLocaleString()} but have ETB ${currentBalance.toLocaleString()}. Please deposit funds first.`,
        type: 'error',
      });
      return;
    }

    if (agent.vip_tier === tierObj.tier) {
      setMessage({ text: `You are already subscribed to ${tierObj.tier}!`, type: 'error' });
      return;
    }

    setActionLoading(tierObj.tier);
    setMessage(null);

    const newBalance = currentBalance - tierObj.fee;
    const todayStr = new Date().toISOString().split('T')[0];

    // Deduct fee, update VIP tier, and reset daily tasks to 5
    const { error } = await supabase
      .from('agents')
      .update({
        vip_tier: tierObj.tier,
        deposit_balance: newBalance,
        daily_tasks_remaining: 5,
        last_task_date: todayStr,
      })
      .eq('id', agent.id);

    if (error) {
      setMessage({ text: `Upgrade failed: ${error.message}`, type: 'error' });
    } else {
      setMessage({ text: `Successfully upgraded to ${tierObj.tier}! Tasks unlocked. Redirecting...`, type: 'success' });
      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);
    }

    setActionLoading(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center font-mono">
        Loading VIP Tiers...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans pb-16">
      {/* Header */}
      <nav className="border-b border-gray-800 bg-gray-900/60 backdrop-blur px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/dashboard')}>
          <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
          <h1 className="text-xl font-bold tracking-tight text-white">
            FUTURE GATE GLOBAL <span className="text-emerald-400 text-xs font-mono ml-1 uppercase">VIP UPGRADE</span>
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-xs font-mono text-gray-400">
            Balance: <span className="text-emerald-400 font-bold">ETB {Number(agent?.deposit_balance || 0).toFixed(2)}</span>
          </div>
          <button
            onClick={() => router.push('/wallet')}
            className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-bold rounded-lg transition"
          >
            + Deposit
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-xs font-mono text-gray-300 rounded-lg border border-gray-700 transition"
          >
            ← Dashboard
          </button>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto p-6 mt-6 space-y-8">
        <div>
          <h2 className="text-2xl font-extrabold text-white">Select Your Agent VIP Tier</h2>
          <p className="text-sm text-gray-400 mt-1">
            Upgrade your tier using your available wallet balance to increase your daily task earnings.
          </p>
        </div>

        {message && (
          <div
            className={`p-4 rounded-xl text-xs font-mono border ${
              message.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400'
                : 'bg-rose-950/40 border-rose-500/30 text-rose-400'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Tiers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {VIP_TIERS.map((v) => {
            const isCurrent = agent?.vip_tier === v.tier;

            return (
              <div
                key={v.tier}
                className={`bg-gray-900 border rounded-2xl p-6 flex flex-col justify-between space-y-6 relative overflow-hidden transition ${
                  isCurrent ? 'border-emerald-500 ring-1 ring-emerald-500/50' : 'border-gray-800 hover:border-gray-700'
                }`}
              >
                {isCurrent && (
                  <div className="absolute top-0 right-0 bg-emerald-500 text-gray-950 text-[10px] font-mono font-bold px-3 py-1 rounded-bl-xl uppercase">
                    Active Tier
                  </div>
                )}

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border ${v.badge}`}>
                      {v.tier}
                    </span>
                    <span className="text-xs font-mono text-gray-400">{v.dailyTasks} Tasks / Day</span>
                  </div>

                  <div>
                    <div className="text-3xl font-extrabold text-white font-mono">
                      ETB {v.fee.toLocaleString()}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Activation Fee</p>
                  </div>

                  <div className="p-3 bg-gray-950 rounded-xl space-y-2 text-xs font-mono border border-gray-800/80">
                    <div className="flex justify-between text-gray-300">
                      <span>Per Task:</span>
                      <span className="font-bold text-white">ETB {v.perTask}</span>
                    </div>
                    <div className="flex justify-between text-gray-300">
                      <span>Daily Return:</span>
                      <span className="font-bold text-emerald-400">ETB {v.dailyTotal}</span>
                    </div>
                    <div className="flex justify-between text-gray-300 border-t border-gray-800 pt-2">
                      <span>Monthly Total:</span>
                      <span className="font-bold text-white">ETB {v.monthlyTotal}</span>
                    </div>
                  </div>
                </div>

                <button
                  disabled={isCurrent || actionLoading === v.tier}
                  onClick={() => handlePurchaseVip(v)}
                  className={`w-full py-3 rounded-xl font-bold font-mono text-xs transition ${
                    isCurrent
                      ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-gray-950'
                  }`}
                >
                  {isCurrent
                    ? 'Current Tier'
                    : actionLoading === v.tier
                    ? 'Processing...'
                    : `Upgrade to ${v.tier}`}
                </button>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}