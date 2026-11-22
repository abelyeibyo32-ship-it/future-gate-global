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
  Smartphone, 
  Building2, 
  Clock, 
  Award,
  Zap,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

// Category Clearing Tiers Configuration
const CATEGORY_TIERS = [
  { 
    id: 'Electronics', 
    name: 'Tier 1: Electronics', 
    fee: 10500, 
    dailyYield: 388.50,
    duration: '10 Months',
    status: 'active',
    popular: false,
    tasksPerDay: 5,
  },
  { 
    id: 'Furniture', 
    name: 'Tier 2: Home & Office', 
    fee: 24000, 
    dailyYield: 888.00,
    duration: '10 Months',
    status: 'active',
    popular: true,
    tasksPerDay: 5,
  },
  { 
    id: 'Solar Systems', 
    name: 'Tier 3: Renewable Solar', 
    fee: 43000, 
    dailyYield: 1591.00,
    duration: '10 Months',
    status: 'active',
    popular: false,
    tasksPerDay: 5,
  },
  { 
    id: 'EV Bikes & Tuk-Tuks', 
    name: 'Tier 4: EV Mobility', 
    fee: 70000, 
    dailyYield: 2590.00,
    duration: '10 Months',
    status: 'upcoming',
    popular: false,
    tasksPerDay: 5,
  },
  { 
    id: 'Real Estate', 
    name: 'Tier 5: Commercial Assets', 
    fee: 110000, 
    dailyYield: 4070.00,
    duration: '10 Months',
    status: 'upcoming',
    popular: false,
    tasksPerDay: 5,
  },
];

const PLATFORM_HIGHLIGHTS = [
  {
    icon: TrendingUp,
    title: "3.7% Daily Yield",
    desc: "Consistent automated daily yield unlocked by completing 5 mandatory verification tasks.",
    color: "bg-blue-500/10 text-blue-600 border-blue-200"
  },
  {
    icon: Award,
    title: "7% Direct Bounty",
    desc: "Instant referral rewards credited directly when team agents activate any clearing tier.",
    color: "bg-emerald-500/10 text-emerald-600 border-emerald-200"
  },
  {
    icon: Clock,
    title: "Mon–Sat Window",
    desc: "Structured daily tasks & rapid payout processing operating Monday through Saturday (EAT).",
    color: "bg-amber-500/10 text-amber-600 border-amber-200"
  },
  {
    icon: ShieldCheck,
    title: "Escrow Backed",
    desc: "Direct P2P settlement verified via Telebirr and Commercial Bank of Ethiopia (CBE) channels.",
    color: "bg-purple-500/10 text-purple-600 border-purple-200"
  }
];

function LandingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const refCode = searchParams.get('ref');
  
  const [verifiedReferrer, setVerifiedReferrer] = useState<string | null>(null);
  const [selectedTierId, setSelectedTierId] = useState<string>('Furniture');

  useEffect(() => {
    const handleReferralCapture = async () => {
      const activeRef = refCode || localStorage.getItem('fgg_ref_code');
      if (activeRef) {
        const cleanRef = activeRef.trim();
        localStorage.setItem('fgg_ref_code', cleanRef);

        try {
          const { data: agent } = await supabase
            .from('agents')
            .select('username')
            .eq('referral_code', cleanRef)
            .maybeSingle();

          if (agent && agent.username) {
            setVerifiedReferrer(agent.username);
          } else {
            setVerifiedReferrer(cleanRef);
          }
        } catch {
          setVerifiedReferrer(cleanRef);
        }
      }
    };

    handleReferralCapture();
  }, [refCode]);

  const handleJoinClick = (tierId?: string) => {
    const storedRef = localStorage.getItem('fgg_ref_code');
    const query = new URLSearchParams();
    
    if (storedRef) query.set('ref', storedRef);
    if (tierId) query.set('tier', tierId);

    const queryString = query.toString();
    router.push(queryString ? `/signup?${queryString}` : '/signup');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] font-mono selection:bg-[#0B1B36] selection:text-white flex flex-col justify-between">
      
      {/* TOP ANNOUNCEMENT BAR */}
      <div className="bg-[#0B1B36] text-white text-[11px] py-2 px-4 text-center font-sans tracking-wide flex items-center justify-center gap-2">
        <Sparkles size={14} className="text-amber-400 animate-pulse" />
        <span>Future Gate Global Protocol 2026 Live: Monday–Saturday Operational Schedule Active.</span>
      </div>

      {/* HEADER BAR */}
      <header className="bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-8 py-4 flex items-center justify-between sticky top-0 z-40 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0B1B36] flex items-center justify-center text-white shadow-md">
            <Globe size={20} />
          </div>
          <div>
            <div className="font-extrabold text-sm tracking-wider text-[#0B1B36]">Future Gate Global</div>
            <div className="text-[9px] text-slate-500 uppercase tracking-widest font-semibold">Global Clearing Network</div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/login"
            className="px-4 py-2 rounded-xl border border-slate-300 text-[#0B1B36] hover:bg-[#0B1B36] hover:text-white transition-all text-xs font-bold"
          >
            Sign In
          </Link>
          <button
            onClick={() => handleJoinClick()}
            className="px-4 sm:px-5 py-2 rounded-xl bg-[#0B1B36] text-white hover:bg-[#152d56] transition-all text-xs font-extrabold shadow-md cursor-pointer flex items-center gap-1.5"
          >
            <span>Activate Node</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-6xl mx-auto px-4 py-8 sm:py-14 space-y-16 w-full flex-1">
        
        {/* REFERRAL CONNECTED BANNER */}
        {verifiedReferrer && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-950 p-4 rounded-2xl flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3 text-xs">
              <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">✓</div>
              <div>
                <span className="font-extrabold">Referral Channel Verified:</span> Node linked to clearing operator <strong className="underline text-emerald-900">{verifiedReferrer}</strong>.
              </div>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-200/80 px-3 py-1 rounded-lg text-emerald-900 shrink-0">
              7% Bounty Eligible
            </span>
          </div>
        )}

        {/* HERO SECTION */}
        <section className="text-center space-y-6 max-w-3xl mx-auto pt-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-[#0B1B36] text-[11px] font-bold shadow-2xs">
            <Zap size={14} className="text-amber-500 fill-amber-500" /> Automated 3.7% Daily Clearing Protocol
          </div>
          
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-[#0B1B36] leading-tight">
            Scale Capital Through Distributed Clearing Nodes
          </h1>
          
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-2xl mx-auto font-sans">
            FGG connects standard agents to automated commercial clearing tiers. Complete 5 mandatory verification tasks daily and collect structured returns backed by verified banking escrow assets.
          </p>

          {/* HERO CTA BUTTONS */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
            <button
              onClick={() => handleJoinClick()}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-[#0B1B36] text-white hover:bg-[#152d56] transition-all text-xs font-extrabold uppercase tracking-wider shadow-xl flex items-center justify-center gap-2 cursor-pointer group"
            >
              <span>Initialize Agent Node</span>
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <Link
              href="/login"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white text-[#0B1B36] border border-slate-300 hover:bg-slate-100 transition-all text-xs font-extrabold uppercase tracking-wider text-center shadow-xs"
            >
              Access Terminal
            </Link>
          </div>

          {/* ACCEPTED PAYMENT RAILS */}
          <div className="pt-6 border-t border-slate-200/60 max-w-lg mx-auto">
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-3">
              Supported Regional Escrow & Settlement Rails
            </div>
            <div className="flex items-center justify-center gap-8 text-xs font-bold text-slate-600">
              <span className="flex items-center gap-2"><Building2 size={16} className="text-blue-600" /> Commercial Bank of Ethiopia (CBE)</span>
              <span className="flex items-center gap-2"><Smartphone size={16} className="text-emerald-600" /> Telebirr P2P</span>
            </div>
          </div>
        </section>

        {/* METRICS & FEATURES GRID */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLATFORM_HIGHLIGHTS.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx} className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-3 hover:shadow-md transition-shadow">
                <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center font-bold ${item.color}`}>
                  <Icon size={22} />
                </div>
                <div className="text-lg font-extrabold text-[#0B1B36]">{item.title}</div>
                <div className="text-[11px] text-slate-500 leading-relaxed font-sans">{item.desc}</div>
              </div>
            );
          })}
        </section>

        {/* INTERACTIVE CLEARING TIERS MATRIX */}
        <section className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/80 shadow-xl space-y-8">
          <div className="text-center space-y-2 max-w-xl mx-auto">
            <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Commercial Asset Allocations</div>
            <h2 className="text-2xl font-extrabold text-[#0B1B36]">Active Clearing & Yield Tiers</h2>
            <p className="text-xs text-slate-500 font-sans">
              Select an asset class to view daily task yield projections and lock-in period details.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {CATEGORY_TIERS.map((tier) => {
              const isSelected = selectedTierId === tier.id;
              return (
                <div 
                  key={tier.id}
                  onClick={() => setSelectedTierId(tier.id)}
                  className={`p-6 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-5 relative ${
                    tier.status === 'upcoming' 
                      ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed' 
                      : isSelected
                      ? 'bg-blue-50/40 border-[#0B1B36] shadow-md ring-1 ring-[#0B1B36]'
                      : 'bg-white border-slate-200/80 hover:border-slate-400'
                  }`}
                >
                  {tier.popular && (
                    <div className="absolute -top-3 right-4 bg-[#0B1B36] text-white text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded-full shadow-xs">
                      Most Active
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <span className="font-extrabold text-sm text-[#0B1B36]">{tier.name}</span>
                      {tier.status === 'upcoming' ? (
                        <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-md uppercase">Upcoming</span>
                      ) : (
                        <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">Active</span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 font-sans">
                      Mandatory Tasks: <strong className="text-slate-800">{tier.tasksPerDay} per day</strong> (Mon–Sat)
                    </div>
                  </div>

                  <div className="space-y-2 pt-3 border-t border-slate-100">
                    <div className="flex justify-between items-baseline">
                      <span className="text-[11px] text-slate-500">Buy-In Capital:</span>
                      <span className="text-base font-black text-[#0B1B36]">ETB {tier.fee.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className="text-[11px] text-slate-500">Estimated Daily:</span>
                      <span className="text-sm font-extrabold text-emerald-600">ETB {tier.dailyYield.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1">
                      <span>Lock-in Duration</span>
                      <span className="font-semibold text-slate-600">{tier.duration}</span>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (tier.status !== 'upcoming') handleJoinClick(tier.id);
                    }}
                    disabled={tier.status === 'upcoming'}
                    className={`w-full py-2.5 rounded-xl font-extrabold text-xs transition-all uppercase tracking-wider flex items-center justify-center gap-1.5 ${
                      tier.status === 'upcoming'
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        : isSelected
                        ? 'bg-[#0B1B36] text-white hover:bg-[#152d56] shadow-xs'
                        : 'bg-slate-100 text-[#0B1B36] hover:bg-slate-200'
                    }`}
                  >
                    <span>{tier.status === 'upcoming' ? 'Locked' : 'Select & Activate'}</span>
                    {tier.status !== 'upcoming' && <ChevronRight size={14} />}
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* HOW IT WORKS - 3 STEP WORKFLOW */}
        <section className="space-y-8">
          <div className="text-center space-y-1">
            <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Operational Workflow</div>
            <h2 className="text-2xl font-extrabold text-[#0B1B36]">How Node Clearing Works</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 space-y-3 relative">
              <div className="w-8 h-8 rounded-xl bg-[#0B1B36] text-white flex items-center justify-center font-extrabold text-sm">1</div>
              <h3 className="font-extrabold text-sm text-[#0B1B36]">Register & Fund Tier</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-sans">
                Create an agent account and verify your node via direct escrow bank transfer (Telebirr or CBE).
              </p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 space-y-3 relative">
              <div className="w-8 h-8 rounded-xl bg-[#0B1B36] text-white flex items-center justify-center font-extrabold text-sm">2</div>
              <h3 className="font-extrabold text-sm text-[#0B1B36]">Execute 5 Daily Tasks</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-sans">
                Complete mandatory merchant verification tasks Monday through Saturday to release daily yields.
              </p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 space-y-3 relative">
              <div className="w-8 h-8 rounded-xl bg-[#0B1B36] text-white flex items-center justify-center font-extrabold text-sm">3</div>
              <h3 className="font-extrabold text-sm text-[#0B1B36]">Request Weekly Payouts</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-sans">
                Withdraw cleared earnings directly to your verified bank account with fast automated node processing.
              </p>
            </div>
          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="bg-white border-t border-slate-200/80 px-6 py-8 text-center text-[10px] text-slate-500 space-y-2">
        <div className="font-extrabold text-xs text-[#0B1B36] tracking-wider">Future Gate Global Clearing Terminal</div>
        <div>© 2026 Future Gate Global Network. All rights reserved.</div>
        <div className="text-slate-400 font-sans">
          Secured by 256-bit cryptographic verification & distributed agent nodes across East Africa.
        </div>
      </footer>

    </div>
  );
}

export default function VisitorLandingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F8FAFC] text-[#0B1B36] flex items-center justify-center font-mono text-xs">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded-full border-2 border-[#0B1B36] border-t-transparent animate-spin"></div>
          <span>Loading FGG Terminal...</span>
        </div>
      </div>
    }>
      <LandingContent />
    </Suspense>
  );
}