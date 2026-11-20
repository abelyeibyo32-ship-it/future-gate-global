// src/app/login/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Loader2,
  Globe,
  ShieldCheck,
  Phone,
  Lock,
  AlertCircle,
  Hourglass,
  LogOut,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

function normalizePhone(rawPhone: string): string {
  const digitsOnly = rawPhone.replace(/\D/g, '');
  if (digitsOnly.startsWith('251') && digitsOnly.length === 12) {
    return `0${digitsOnly.slice(3)}`;
  }
  return digitsOnly;
}

function phoneToAuthEmail(rawPhone: string): string {
  const normalized = normalizePhone(rawPhone);
  return `phone_${normalized}@fgg.local`;
}

interface PendingRegistrationInfo {
  status: string;
  superAgentName?: string | null;
  tier?: string | null;
  amount?: number | null;
}

export default function LoginPage() {
  const router = useRouter();

  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pendingInfo, setPendingInfo] = useState<PendingRegistrationInfo | null>(null);

  useEffect(() => {
    const savedPhone = localStorage.getItem('fgg_current_phone');
    if (savedPhone) {
      setPhoneNumber(savedPhone);
    }
  }, []);

  const handleSignOutPending = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('fgg_current_user_id');
    setPendingInfo(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setErrorMsg(null);
    setPendingInfo(null);

    const cleanPhone = normalizePhone(phoneNumber);
    if (cleanPhone.length < 9) {
      setErrorMsg('Please enter a valid phone number (e.g. 0911223344).');
      return;
    }

    if (!password) {
      setErrorMsg('Please enter your password.');
      return;
    }

    setLoading(true);

    try {
      const authEmail = phoneToAuthEmail(cleanPhone);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password,
      });

      if (error || !data.user) {
        setErrorMsg(error?.message || 'Invalid phone number or password.');
        setLoading(false);
        return;
      }

      const userId = data.user.id;

      // Check registration approval status in transaction_requests
      const { data: regRows, error: regErr } = await supabase
        .from('transaction_requests')
        .select('status, super_agent_name, tier, amount, created_at')
        .eq('agent_id', userId)
        .eq('type', 'registration')
        .order('created_at', { ascending: false })
        .limit(1);

      if (regErr) {
        console.error('Registration check warning:', regErr);
      }

      const latestReg = regRows && regRows.length > 0 ? regRows[0] : null;
      const regStatus = String(latestReg?.status || '').toLowerCase();

      if (latestReg && regStatus !== 'approved') {
        setPendingInfo({
          status: regStatus || 'pending',
          superAgentName: latestReg.super_agent_name,
          tier: latestReg.tier,
          amount: latestReg.amount,
        });
        setLoading(false);
        return;
      }

      localStorage.setItem('fgg_current_user_id', userId);
      localStorage.setItem('fgg_current_phone', cleanPhone);

      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unexpected error during sign in.');
      setLoading(false);
    }
  };

  if (pendingInfo) {
    const isRejected = pendingInfo.status === 'rejected';

    return (
      <div className="min-h-screen bg-[#F5F7FA] text-[#0B1B36] font-mono flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-md bg-white p-8 rounded-3xl border border-[#AEB8C4]/40 shadow-xl text-center space-y-6">
          <div
            className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center ${
              isRejected ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
            }`}
          >
            {isRejected ? <AlertCircle size={28} /> : <Hourglass size={28} />}
          </div>

          <div className="space-y-2">
            <h2 className="text-lg font-extrabold text-[#0B1B36]">
              {isRejected ? 'Registration Rejected' : 'Awaiting Super Agent Approval'}
            </h2>
            <p className="text-xs text-[#536171] leading-relaxed">
              {isRejected
                ? 'Your node registration request was rejected. Contact your assigned Super Agent or submit a new registration.'
                : 'Your phone credentials are verified, but your node has not been approved by a Super Agent yet. Terminal access is locked until approved.'}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#F5F7FA] border border-[#AEB8C4]/30 text-left text-[11px] space-y-1 text-[#536171]">
            <div>
              <strong>Status:</strong>{' '}
              <span className="uppercase font-bold text-[#0B1B36]">{pendingInfo.status}</span>
            </div>
            <div>
              <strong>Phone Node:</strong> {normalizePhone(phoneNumber)}
            </div>
            {pendingInfo.superAgentName && (
              <div>
                <strong>Assigned Super Agent:</strong> {pendingInfo.superAgentName}
              </div>
            )}
            {pendingInfo.tier && (
              <div>
                <strong>Tier:</strong> {pendingInfo.tier}
              </div>
            )}
            {typeof pendingInfo.amount === 'number' && (
              <div>
                <strong>Buy-In Amount:</strong> ETB {pendingInfo.amount.toLocaleString()}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleSignOutPending}
            className="w-full py-3.5 rounded-xl bg-[#0B1B36] hover:bg-[#152d56] text-white font-extrabold uppercase tracking-wider text-xs transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut size={15} /> Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#0B1B36] font-mono flex flex-col justify-center items-center p-4 sm:p-8 selection:bg-[#0B1B36] selection:text-white">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-[#0B1B36] items-center justify-center text-white shadow-xl">
            <Globe size={24} />
          </div>
          <div className="text-xl font-extrabold tracking-wider">Future Gate Global</div>
          <div className="text-[10px] text-[#536171] uppercase tracking-widest">
            Phone-Primary Clearing Terminal
          </div>
        </div>

        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#AEB8C4]/40 shadow-xl space-y-6">
          <div>
            <h1 className="text-base font-extrabold text-[#0B1B36]">Operator Sign In</h1>
            <p className="text-[11px] text-[#536171] mt-1">
              Sign in with your registered phone number and password.
            </p>
          </div>

          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl p-3.5 text-xs flex items-start gap-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-600" />
              <div>
                <div className="font-bold">Login Failed</div>
                <div className="text-[11px] mt-0.5">{errorMsg}</div>
              </div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-[#536171] uppercase text-[10px] flex items-center gap-1.5">
                <Phone size={12} /> Phone Number
              </label>
              <input
                type="tel"
                placeholder="0911223344"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#F5F7FA] border border-[#AEB8C4]/50 focus:outline-none focus:border-[#0B1B36] font-bold text-xs"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-[#536171] uppercase text-[10px] flex items-center gap-1.5">
                <Lock size={12} /> Password
              </label>
              <input
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#F5F7FA] border border-[#AEB8C4]/50 focus:outline-none focus:border-[#0B1B36] font-bold text-xs"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-[#0B1B36] hover:bg-[#152d56] text-white font-extrabold uppercase tracking-wider text-xs transition shadow-md cursor-pointer flex items-center justify-center gap-2 mt-2"
            >
              {loading && <Loader2 size={15} className="animate-spin" />}
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          <div className="pt-3 border-t border-[#AEB8C4]/30 text-center text-[11px] text-[#536171]">
            Don&apos;t have an agent account?{' '}
            <Link href="/signup" className="font-extrabold text-[#0B1B36] underline">
              Register Node
            </Link>
          </div>
        </div>

        <div className="text-center text-[10px] text-[#536171] flex items-center justify-center gap-1.5">
          <ShieldCheck size={14} /> 256-Bit Encrypted Clearing Session Active
        </div>
      </div>
    </div>
  );
}