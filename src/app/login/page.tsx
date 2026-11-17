// src/app/login/page.tsx
'use client';

import { useState, useEffect, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import { Globe, Loader2, ArrowRight, UserPlus, LogIn, ShieldCheck, Smartphone } from 'lucide-react';

function AuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const refCode = searchParams.get('ref');

  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (refCode) {
      router.replace(`/signup?ref=${encodeURIComponent(refCode)}`);
    }
  }, [refCode, router]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const cleanPhone = phoneNumber.trim();

    try {
      // 1. Look up the exact email registered for this phone number
      const { data: agentRecord, error: lookupError } = await supabase
        .from('agents')
        .select('email, username')
        .eq('phone', cleanPhone)
        .maybeSingle();

      if (lookupError || !agentRecord) {
        throw new Error('No agent account found registered with this phone number.');
      }

      // Fallback to constructed pattern if email column was empty
      const cleanSlug = agentRecord.username ? agentRecord.username.trim().toLowerCase().replace(/[^a-z0-9]/g, '') : 'operator';
      const targetEmail = agentRecord.email || `${cleanSlug}@futuregate.local`;

      // 2. Authenticate with Supabase Auth
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email: targetEmail,
        password
      });

      if (signInError) throw signInError;

      // 3. Cache the User ID immediately to prevent 0-metric resets on hard refreshes
      if (authData?.user) {
        localStorage.setItem('fgg_current_user_id', authData.user.id);
      }

      setMessage({ text: 'Authentication verified. Entering FGG terminal...', type: 'success' });
      setTimeout(() => router.replace('/dashboard'), 1000);
    } catch (err: any) {
      setMessage({ text: err?.message || 'Authentication failed. Please check your phone number and password.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#0B1B36] flex flex-col justify-center items-center p-4 font-mono text-xs selection:bg-[#0B1B36] selection:text-white">
      <div className="w-full max-w-md space-y-6">
        
        {/* BRANDING HEADER */}
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-[#0B1B36] border border-[#0B1B36]/30 flex items-center justify-center mx-auto text-white shadow-xl">
            <Globe size={26} />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-extrabold text-[#0B1B36] tracking-wider">Future Gate Global</h1>
            <p className="text-[10px] text-[#536171] uppercase tracking-widest font-bold">Commercial Marketplace & Agent Terminal</p>
          </div>
        </div>

        {/* AUTH CARD */}
        <div className="bg-white text-[#0B1B36] rounded-3xl p-6 sm:p-8 shadow-xl border border-[#AEB8C4]/40 space-y-6">
          
          <div className="flex bg-[#F5F7FA] p-1 rounded-2xl border border-[#AEB8C4]/30">
            <button
              type="button"
              className="flex-1 py-3 rounded-xl font-bold bg-[#0B1B36] text-white shadow-xs flex items-center justify-center gap-2 text-xs cursor-pointer"
            >
              <LogIn size={14} /> Sign In
            </button>
            <button
              type="button"
              onClick={() => router.push(refCode ? `/signup?ref=${encodeURIComponent(refCode)}` : '/signup')}
              className="flex-1 py-3 rounded-xl font-bold text-[#536171] hover:text-[#0B1B36] transition cursor-pointer flex items-center justify-center gap-2 text-xs"
            >
              <UserPlus size={14} /> Register
            </button>
          </div>

          {message && (
            <div className={`p-3.5 rounded-2xl border ${message.type === 'success' ? 'bg-[#0B1B36]/10 text-[#0B1B36] border-[#0B1B36]/30' : 'bg-rose-50 text-rose-800 border-rose-200'}`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[#536171] uppercase font-bold text-[10px] flex items-center gap-1.5">
                <Smartphone size={13} /> Phone Number
              </label>
              <input
                type="text"
                placeholder="0911223344"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl bg-[#F5F7FA] border border-[#AEB8C4]/40 text-[#0B1B36] font-bold focus:outline-none focus:border-[#0B1B36]"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[#536171] uppercase font-bold text-[10px]">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl bg-[#F5F7FA] border border-[#AEB8C4]/40 text-[#0B1B36] font-bold focus:outline-none focus:border-[#0B1B36]"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-[#0B1B36] hover:bg-[#152d56] text-white font-extrabold rounded-2xl transition cursor-pointer disabled:opacity-50 uppercase tracking-wider shadow-md flex items-center justify-center gap-2 mt-3"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin text-white" /> Processing Session...
                </>
              ) : (
                <>
                  Access Terminal <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

        </div>

        <div className="text-center text-[10px] text-[#536171] space-y-1 font-bold">
          <div className="flex items-center justify-center gap-1.5">
            <ShieldCheck size={13} className="text-[#0B1B36]" /> Future Gate Global Security Gateway
          </div>
          <div className="text-[#536171]/70 font-mono">Encrypted Terminal Session • v2.4</div>
        </div>

      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F5F7FA] text-[#0B1B36] flex items-center justify-center font-mono text-xs">
        <div className="flex items-center gap-3">
          <Loader2 size={16} className="animate-spin text-[#0B1B36]" />
          <span>Initializing FGG Security Gateway...</span>
        </div>
      </div>
    }>
      <AuthContent />
    </Suspense>
  );
}