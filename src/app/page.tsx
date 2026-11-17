// src/app/page.tsx
'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Globe, 
  ShieldCheck, 
  TrendingUp, 
  Users, 
  CheckCircle2, 
  ArrowRight, 
  Layers, 
  Smartphone, 
  Building2, 
  Clock, 
  Award,
  Zap
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useFGGSystem } from '@/lib/useFGGSystem';

const CATEGORY_TIERS = [
  { 
    id: 'Electronics', 
    name: 'Tier 1: Electronics', 
    fee: 10500, 
    dailyYield: 'ETB 388.50',
    duration: '10 Months',
    status: 'active'
  },
  { 
    id: 'Furniture', 
    name: 'Tier 2: Furniture', 
    fee: 24000, 
    dailyYield: 'ETB 888.00',
    duration: '10 Months',
    status: 'active'
  },
  { 
    id: 'Solar Systems', 
    name: 'Tier 3: Solar Systems', 
    fee: 43000, 
    dailyYield: 'ETB 1,591.00',
    duration: '10 Months',
    status: 'active'
  },
  { 
    id: 'EV Bikes & Tuk-Tuks', 
    name: 'Tier 4: EV Bikes & Tuk-Tuks', 
    fee: 70000, 
    dailyYield: 'ETB 2,590.00',
    duration: '10 Months',
    status: 'upcoming'
  },
  { 
    id: 'Real Estate', 
    name: 'Tier 5: Real Estate', 
    fee: 110000, 
    dailyYield: 'ETB 4,070.00',
    duration: '10 Months',
    status: 'upcoming'
  },
];

function LandingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const refCode = searchParams.get('ref');
  
  const [verifiedReferrer, setVerifiedReferrer] = useState<string | null>(null);

  useEffect(() => {
    const handleReferralCapture = async () => {
      const activeRef = refCode || localStorage.getItem('fgg_ref_code');
      if (activeRef) {
        const cleanRef = activeRef.trim();
        localStorage.setItem('fgg_ref_code', cleanRef);

        // Verify if the referral code exists by strictly selecting username querying referral_code
        const { data: agent } = await supabase
          .from('agents')
          .select('username')
          .eq('referral_code', cleanRef)
          .maybeSingle();

        if (agent) {
          setVerifiedReferrer(agent.username || cleanRef);
        } else {
          setVerifiedReferrer(cleanRef);
        }
      }
    };

    handleReferralCapture();
  }, [refCode]);

  const handleJoinClick = () => {
    const storedRef = localStorage.getItem('fgg_ref_code');
    if (storedRef) {
      router.push(`/signup?ref=${storedRef}`);
    } else {
      router.push('/signup');
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#0B1B36] font-mono selection:bg-[#0B1B36] selection:text-white flex flex-col justify-between">
      
      {/* HEADER BAR */}
      <header className="bg-white/95 backdrop-blur-md border-b border-[#AEB8C4]/40 px-6 py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#0B1B36] flex items-center justify-center text-white shadow-md">
            <Globe size={18} />
          </div>
          <div>
            <div className="font-extrabold text-sm tracking-wider text-[#0B1B36]">Future Gate Global</div>
            <div className="text-[9px] text-[#536171] uppercase tracking-widest">Global Clearing Node</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="px-4 py-2 rounded-xl border border-[#0B1B36]/20 text-[#0B1B36] hover:bg-[#0B1B36] hover:text-white transition text-xs font-bold"
          >
            Sign In
          </Link>
          <button
            onClick={handleJoinClick}
            className="px-5 py-2 rounded-xl bg-[#0B1B36] text-white hover:bg-[#152d56] transition text-xs font-extrabold shadow-md cursor-pointer"
          >
            Join Network
          </button>
        </div>
      </header>

      {/* HERO SECTION */}
      <main className="max-w-5xl mx-auto px-4 py-12 sm:py-16 space-y-12 w-full flex-1">
        
        {verifiedReferrer && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-4 rounded-2xl flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3 text-xs">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold">✓</div>
              <div>
                <span className="font-extrabold">Valid Referral Node Connected:</span> Referred by clearing operator <strong className="underline">{verifiedReferrer}</strong>.
              </div>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 px-2.5 py-1 rounded-lg text-emerald-800">
              7% Yield Eligible
            </span>
          </div>
        )}

        <div className="text-center space-y-6 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0B1B36]/5 border border-[#0B1B36]/10 text-[#0B1B36] text-[11px] font-bold">
            <Zap size={13} className="text-amber-600" /> Automated 3.7% Daily Yield Clearing Protocol
          </div>
          
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#0B1B36] leading-tight">
            Scale Your Capital Through Global Clearing Nodes
          </h1>
          
          <p className="text-xs sm:text-sm text-[#536171] leading-relaxed">
            FGG connects standard agents into an automated daily clearing ecosystem. Execute 5 mandatory operational tasks daily and earn consistent multi-tier returns backed by escrow assets.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={handleJoinClick}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-[#0B1B36] text-white hover:bg-[#152d56] transition text-xs font-extrabold uppercase tracking-wider shadow-xl flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Initialize Agent Node</span>
              <ArrowRight size={16} />
            </button>
            <Link
              href="/login"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white text-[#0B1B36] border border-[#AEB8C4]/50 hover:bg-[#F5F7FA] transition text-xs font-extrabold uppercase tracking-wider text-center"
            >
              Access Terminal
            </Link>
          </div>
        </div>

        {/* METRICS / HIGHLIGHTS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-3xl border border-[#AEB8C4]/40 shadow-xs space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <TrendingUp size={20} />
            </div>
            <div className="text-2xl font-extrabold text-[#0B1B36]">3.7% Daily</div>
            <div className="text-[11px] text-[#536171]">Consistent automated yield generated upon completion of 5 daily tasks.</div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-[#AEB8C4]/40 shadow-xs space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Award size={20} />
            </div>
            <div className="text-2xl font-extrabold text-[#0B1B36]">7% Commission</div>
            <div className="text-[11px] text-[#536171]">Instant referral bounty credited when invited downline agents activate tiers.</div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-[#AEB8C4]/40 shadow-xs space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <ShieldCheck size={20} />
            </div>
            <div className="text-2xl font-extrabold text-[#0B1B36]">Escrow Backed</div>
            <div className="text-[11px] text-[#536171]">Secure peer-to-peer verification through Telebirr and Commercial Bank of Ethiopia.</div>
          </div>
        </div>

        {/* CLEARING TIERS MATRIX */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#AEB8C4]/40 shadow-xl space-y-6">
          <div className="text-center space-y-1">
            <div className="text-[10px] text-[#536171] uppercase tracking-widest font-bold">Global Asset Classes</div>
            <h2 className="text-lg font-extrabold text-[#0B1B36]">Active Clearing & Capital Tiers</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {CATEGORY_TIERS.map((tier) => (
              <div 
                key={tier.id}
                className={`p-5 rounded-2xl border flex flex-col justify-between space-y-4 ${
                  tier.status === 'upcoming' 
                    ? 'bg-slate-50 border-slate-200 opacity-70' 
                    : 'bg-[#F5F7FA] border-[#AEB8C4]/30'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-extrabold text-xs text-[#0B1B36]">{tier.name}</span>
                    {tier.status === 'upcoming' && (
                      <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-md uppercase">Upcoming</span>
                    )}
                  </div>
                  <div className="text-[10px] text-[#536171]">Duration: {tier.duration}</div>
                </div>

                <div className="space-y-1 pt-2 border-t border-[#AEB8C4]/20">
                  <div className="text-[10px] text-[#536171]">Buy-In Capital:</div>
                  <div className="text-sm font-extrabold text-[#0B1B36]">ETB {tier.fee.toLocaleString()}</div>
                  <div className="text-[11px] font-bold text-emerald-600 mt-1">Daily Yield: {tier.dailyYield}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center pt-2">
            <button
              onClick={handleJoinClick}
              className="px-6 py-3 rounded-xl bg-[#0B1B36] text-white hover:bg-[#152d56] transition text-xs font-extrabold uppercase tracking-wider cursor-pointer shadow-md"
            >
              Choose Tier & Register Now
            </button>
          </div>
        </div>

      </main>

      {/* FOOTER */}
      <footer className="bg-white border-t border-[#AEB8C4]/30 px-6 py-6 text-center text-[10px] text-[#536171] space-y-1">
        <div>Future Gate Global Clearing Terminal © 2026. All rights reserved.</div>
        <div>Secured by 256-bit cryptographic verification & distributed agent nodes.</div>
      </footer>

    </div>
  );
}

export default function VisitorLandingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F5F7FA] text-[#0B1B36] flex items-center justify-center font-mono text-xs">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded-full border-2 border-[#0B1B36] border-t-transparent animate-spin"></div>
          <span>Loading FGG Portal...</span>
        </div>
      </div>
    }>
      <LandingContent />
    </Suspense>
  );
}