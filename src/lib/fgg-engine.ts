// src/lib/fgg-engine.ts
'use client';

export interface ActivityEvent {
  id: string;
  timestamp: string;
  actor: string;
  role: 'STANDARD_AGENT' | 'SUPER_AGENT' | 'SYSTEM';
  type: 'TASK_CLEARED' | 'AUTO_SETTLEMENT' | 'COMMISSION_OVERRIDE' | 'DEPOSIT' | 'WITHDRAWAL';
  description: string;
  amount: number;
}

export interface FGGSystemState {
  activeCategory: string;
  capitalBalance: number;
  pendingBalance: number;
  totalEarnings: number;
  completedTasks: number;
  lastResetDate: string;
  superAgentOverrideBalance: number;
  activityLogs: ActivityEvent[];
}

const STORAGE_KEY = 'FGG_LIVE_SYSTEM_SETTLEMENT_V4';

// Dynamic tier deposit floors (locked capital requirements per category)
const TIER_DEPOSIT_FLOORS: Record<string, number> = {
  'Electronics': 10500,
  'Furniture': 24000,
  'Solar Systems': 43000,
  'EV Bikes & Tuk-Tuks': 70000,
  'Real Estate': 110000,
  'Apparel': 15000,
  'Automotive': 25000,
  'Luxury': 50000,
};

// Fallback if a category isn't explicitly mapped
const getTierFloor = (category: string): number => {
  return TIER_DEPOSIT_FLOORS[category] ?? 10500;
};

const getTodayKey = (): string => new Date().toISOString().split('T')[0];
const isSunday = (): boolean => new Date().getDay() === 0;

const DEFAULT_STATE: FGGSystemState = {
  activeCategory: 'Electronics',
  capitalBalance: 10500,
  pendingBalance: 0,
  totalEarnings: 0,
  completedTasks: 0,
  lastResetDate: getTodayKey(),
  superAgentOverrideBalance: 4250,
  activityLogs: [
    {
      id: 'TX-9001',
      timestamp: '08:00 AM',
      actor: 'SYSTEM',
      role: 'SYSTEM',
      type: 'AUTO_SETTLEMENT',
      description: 'Daily Clearing Engine Initialized (Telebirr & CBE Rails Active)',
      amount: 0,
    },
    {
      id: 'TX-9002',
      timestamp: '08:15 AM',
      actor: 'abelyeibyo32',
      role: 'STANDARD_AGENT',
      type: 'DEPOSIT',
      description: 'Electronics Tier Capital Verified (Locked)',
      amount: 10500,
    },
  ],
};

export function saveSystemState(state: FGGSystemState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new Event('fgg-system-update'));
  } catch (e) {
    console.error('Error saving FGG system state:', e);
  }
}

export function loadSystemState(): FGGSystemState {
  if (typeof window === 'undefined') return DEFAULT_STATE;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_STATE));
      return DEFAULT_STATE;
    }

    const parsed = JSON.parse(raw);
    const today = getTodayKey();

    const logs: ActivityEvent[] = Array.isArray(parsed.activityLogs)
      ? (parsed.activityLogs as ActivityEvent[])
      : DEFAULT_STATE.activityLogs;

    const currentState: FGGSystemState = {
      activeCategory: parsed.activeCategory || DEFAULT_STATE.activeCategory,
      capitalBalance: parsed.capitalBalance ?? DEFAULT_STATE.capitalBalance,
      pendingBalance: parsed.pendingBalance ?? DEFAULT_STATE.pendingBalance,
      totalEarnings: parsed.totalEarnings ?? DEFAULT_STATE.totalEarnings,
      completedTasks: parsed.completedTasks ?? DEFAULT_STATE.completedTasks,
      lastResetDate: parsed.lastResetDate || DEFAULT_STATE.lastResetDate,
      superAgentOverrideBalance: parsed.superAgentOverrideBalance ?? DEFAULT_STATE.superAgentOverrideBalance,
      activityLogs: logs,
    };

    if (currentState.lastResetDate !== today) {
      const newCronLog: ActivityEvent = {
        id: `TX-${Math.floor(1000 + Math.random() * 9000)}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actor: 'SYSTEM_CRON',
        role: 'SYSTEM',
        type: 'AUTO_SETTLEMENT',
        description: `24h Cycle Complete: Reset Daily Tasks Pipeline`,
        amount: 0,
      };

      const updatedState: FGGSystemState = {
        ...currentState,
        completedTasks: 0,
        lastResetDate: today,
        activityLogs: [newCronLog, ...currentState.activityLogs].slice(0, 50) as ActivityEvent[],
      };
      saveSystemState(updatedState);
      return updatedState;
    }

    return currentState;
  } catch {
    return DEFAULT_STATE;
  }
}

// Unified Portfolio Helper to prevent any 2x duplication or drifting
export function getAgentTotalPortfolio(state: FGGSystemState): number {
  return Number((state.capitalBalance + state.totalEarnings).toFixed(2));
}

export function recordTaskCompletion(taskTitle: string, taskYield: number): FGGSystemState {
  const current = loadSystemState();

  if (isSunday()) {
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const blockedEvent: ActivityEvent = {
      id: `TX-${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: now,
      actor: 'SYSTEM',
      role: 'SYSTEM',
      type: 'AUTO_SETTLEMENT',
      description: 'Market Clearing Closed — Sunday Rest Day',
      amount: 0,
    };

    const updatedWithBlock: FGGSystemState = {
      ...current,
      activityLogs: [blockedEvent, ...current.activityLogs].slice(0, 50) as ActivityEvent[],
    };
    saveSystemState(updatedWithBlock);
    return updatedWithBlock;
  }

  if (current.completedTasks >= 5) return current;

  const superAgentCut = Number((taskYield * 0.15).toFixed(2));
  const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const updatedTaskYield = Number(taskYield.toFixed(2));

  const newEvents: ActivityEvent[] = [
    {
      id: `TX-${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: now,
      actor: 'abelyeibyo32',
      role: 'STANDARD_AGENT',
      type: 'TASK_CLEARED',
      description: `Cleared [${current.activeCategory}] ${taskTitle}`,
      amount: updatedTaskYield,
    },
    {
      id: `TX-${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: now,
      actor: 'SuperAgent_Node01',
      role: 'SUPER_AGENT',
      type: 'COMMISSION_OVERRIDE',
      description: `Auto-Override (15%) from abelyeibyo32 batch`,
      amount: superAgentCut,
    },
  ];

  const updated: FGGSystemState = {
    ...current,
    completedTasks: current.completedTasks + 1,
    totalEarnings: Number((current.totalEarnings + updatedTaskYield).toFixed(2)),
    superAgentOverrideBalance: Number((current.superAgentOverrideBalance + superAgentCut).toFixed(2)),
    activityLogs: [...newEvents, ...current.activityLogs].slice(0, 50) as ActivityEvent[],
  };

  saveSystemState(updated);
  return updated;
}

export function recordDeposit(depositAmount: number): FGGSystemState {
  const current = loadSystemState();
  const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const cleanAmount = Number(depositAmount.toFixed(2));

  const depositEvent: ActivityEvent = {
    id: `TX-${Math.floor(1000 + Math.random() * 9000)}`,
    timestamp: now,
    actor: 'abelyeibyo32',
    role: 'STANDARD_AGENT',
    type: 'DEPOSIT',
    description: `Deposit Approved & Credited to Capital Baseline`,
    amount: cleanAmount,
  };

  const updated: FGGSystemState = {
    ...current,
    capitalBalance: Number((current.capitalBalance + cleanAmount).toFixed(2)),
    activityLogs: [depositEvent, ...current.activityLogs].slice(0, 50) as ActivityEvent[],
  };

  saveSystemState(updated);
  return updated;
}

export function withdrawEarnings(): { success: boolean; amountWithdrawn: number; newState: FGGSystemState } {
  const current = loadSystemState();
  
  const tierFloor = getTierFloor(current.activeCategory);
  const withdrawableAmount = Number(Math.max(0, current.totalEarnings).toFixed(2));

  if (withdrawableAmount <= 0) {
    return { success: false, amountWithdrawn: 0, newState: current };
  }

  const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const withdrawalEvent: ActivityEvent = {
    id: `TX-${Math.floor(1000 + Math.random() * 9000)}`,
    timestamp: now,
    actor: 'abelyeibyo32',
    role: 'STANDARD_AGENT',
    type: 'WITHDRAWAL',
    description: `Payout Pushed to Mobile Money (Telebirr/CBE) for [${current.activeCategory}] tier`,
    amount: withdrawableAmount,
  };

  const updatedState: FGGSystemState = {
    ...current,
    totalEarnings: 0, 
    capitalBalance: Number(Math.max(tierFloor, current.capitalBalance).toFixed(2)),
    activityLogs: [withdrawalEvent, ...current.activityLogs].slice(0, 50) as ActivityEvent[],
  };

  saveSystemState(updatedState);
  return { success: true, amountWithdrawn: withdrawableAmount, newState: updatedState };
}

export function switchSystemCategory(category: string, newCapital: number): FGGSystemState {
  const current = loadSystemState();
  const verifiedCapital = newCapital || getTierFloor(category);
  
  const depositEvent: ActivityEvent = {
    id: `TX-${Math.floor(1000 + Math.random() * 9000)}`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    actor: 'abelyeibyo32',
    role: 'STANDARD_AGENT',
    type: 'DEPOSIT',
    description: `Activated ${category} Clearing Tier (Capital: ${verifiedCapital.toLocaleString()} ETB)`,
    amount: verifiedCapital,
  };

  const updated: FGGSystemState = {
    ...current,
    activeCategory: category,
    capitalBalance: verifiedCapital,
    activityLogs: [depositEvent, ...current.activityLogs].slice(0, 50) as ActivityEvent[],
  };
  
  saveSystemState(updated);
  return updated;
}