'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // 1. Capture 'ref' from URL on mount and save to localStorage
  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const refCode = queryParams.get('ref');
    if (refCode) {
      localStorage.setItem('fgg_referred_by', refCode);
    }
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 2. Sign up user with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError || !authData.user) {
        throw new Error(authError?.message || 'Failed to authenticate user.');
      }

      const userId = authData.user.id;
      
      // 3. Retrieve stored referral code (if any)
      const referredByCode = localStorage.getItem('fgg_referred_by') || null;
      
      // 4. Generate unique referral code for the new user
      const newReferralCode = `FGG-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      // 5. Insert agent profile into your database with the bound referral link
      const { error: profileError } = await supabase.from('agents').insert([
        {
          id: userId,
          capital_balance: 0,
          total_earnings: 0,
          referred_by: referredByCode,
          referral_code: newReferralCode,
        },
      ]);

      if (profileError) {
        throw new Error(profileError.message);
      }

      // Clear stored ref code after successful registration and route to dashboard
      localStorage.removeItem('fgg_referred_by');
      router.push('/dashboard');
    } catch (err: any) {
      alert(`Registration Error: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F7FA]">
      <form onSubmit={handleRegister} className="bg-white p-8 rounded-3xl border border-[#AEB8C4]/40 shadow-xl space-y-4 w-96 font-mono text-xs">
        <h2 className="text-lg font-extrabold text-[#0B1B36]">Agent Registration</h2>
        <div className="space-y-1">
          <label className="font-bold text-[#536171]">Email Address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-[#F5F7FA] border border-[#AEB8C4]/50 text-[#0B1B36] font-bold"
            required
          />
        </div>
        <div className="space-y-1">
          <label className="font-bold text-[#536171]">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-[#F5F7FA] border border-[#AEB8C4]/50 text-[#0B1B36] font-bold"
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 rounded-xl bg-[#0B1B36] text-white font-bold uppercase tracking-wider hover:bg-[#152d56] transition cursor-pointer disabled:opacity-50"
        >
          {loading ? 'Creating Node...' : 'Register Agent Node'}
        </button>
      </form>
    </div>
  );
}