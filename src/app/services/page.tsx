// src/app/services/page.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  Layers, 
  TrendingUp, 
  Wallet, 
  Users, 
  HelpCircle, 
  ChevronDown, 
  Globe,
  Menu,
  X,
  Loader2,
  ShieldAlert,
  LogOut,
  Cpu,
  Armchair,
  Sun,
  Car,
  Building,
  CheckCircle2,
  ArrowRight,
  Lock,
  Clock,
  Sparkles,
  ShieldCheck,
  Zap,
  FileText
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Navbar from '@/lib/components/Navbar';
import MobileBottomNav from '@/lib/components/MobileBottomNav';

const SERVICES_CATALOG = [
  {
    id: 'Electronics',
    title: 'Electronics & Smart Hardware',
    tierLevel: 1,
    tierLabel: 'Tier 1',
    icon: Cpu,
    fee: 10500,
    dailyReturn: 388.50,
    duration: '10 Months',
    maxTasks: 5,
    description: 'High-demand consumer electronics, computing hardware, and smart terminal equipment fulfillment tasks.',
    features: ['5 Daily Tasks Allocation', 'Automated Commission Crediting', 'Priority Verification'],
    status: 'available'
  },
  {
    id: 'Furniture',
    title: 'Luxury Furniture & Interiors',
    tierLevel: 2,
    tierLabel: 'Tier 2',
    icon: Armchair,
    fee: 24000,
    dailyReturn: 888.00,
    duration: '10 Months',
    maxTasks: 5,
    description: 'Commercial interior inventory processing and residential furnishing logistics fulfillment.',
    features: ['Enhanced Yield Multipliers', 'Progressive Upgrade Eligibility', 'Dedicated Support Queue'],
    status: 'available'
  },
  {
    id: 'Solar Systems',
    title: 'Renewable Solar Systems',
    tierLevel: 3,
    tierLabel: 'Tier 3',
    icon: Sun,
    fee: 43000,
    dailyReturn: 1591.00,
    duration: '10 Months',
    maxTasks: 5,
    description: 'Commercial photovoltaic installation components, energy storage units, and grid infrastructure.',
    features: ['Maximum Tier Returns', 'Advanced Network Commissioning', 'VIP Agent Status'],
    status: 'available'
  },
  {
    id: 'EV Bikes & Tuk-Tuks',
    title: 'Electric Mobility & Fleet',
    tierLevel: 4,
    tierLabel: 'Tier 4',
    icon: Car,
    fee: 70000,
    dailyReturn: 2590.00,
    duration: '10 Months',
    maxTasks: 5,
    description: 'Electric vehicle charging units, commercial fleet assets, and next-generation mobility distribution.',
    features: ['Elite Commission Slabs', 'Instant Withdrawal Privileges', 'Exclusive Executive Access'],
    status: 'upcoming'
  },
  {
    id: 'Real Estate',
    title: 'Real Estate & Infrastructure',
    tierLevel: 5,
    tierLabel: 'Tier 5',
    icon: Building,
    fee: 110000,
    dailyReturn: 4070.00,
    duration: '10 Months',
    maxTasks: 5,
    description: 'High-value commercial property assets, development land parcels, and architectural project tasks.',
    features: ['Maximum Yield Ceiling', 'Direct Administrative Directives', 'Global Affiliate Bonuses'],
    status: 'upcoming'
  }
];

export default function ServicesPage() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [agent, setAgent] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    let isMounted = true;

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    const loadUserData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        if (isMounted) router.replace('/login');
        return;
      }

      try {
        let { data: agentData } = await supabase
          .from('agents')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();

        if (isMounted) {
          setAgent(agentData || { 
            id: session.user.id,
            username: session.user.email?.split('@')[0] || 'Agent', 
            email: session.user.email,
            tier: 'Solar Systems'
          });
          setLoading(false);
        }
      } catch (err) {
        console.error('Error loading services page user data:', err);
        if (isMounted) setLoading(false);
      }
    };

    loadUserData();
    return () => {
      isMounted = false;
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [router]);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-[#0B1B36] text-[#AEB8C4] flex items-center justify-center font-mono text-xs">
        <div className="flex items-center gap-3">
          <Loader2 size={16} className="animate-spin text-white" />
          <span>Accessing FGG Services Ledger...</span>
        </div>
      </div>
    );
  }

  const currentTierId = agent?.tier || 'Solar Systems';

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#0B1B36] font-sans flex relative pb-28 lg:pb-0">
      
      {notification && (
        <div className="fixed bottom-20 lg:bottom-6 right-6 z-50 bg-[#0B1B36] text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-white/20 text-xs font-mono flex items-center gap-3 animate-in fade-in">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
          <span>{notification}</span>
        </div>
      )}

      {/* SHARED NAVIGATION DRAWER */}
      <Navbar 
        activeCategory={currentTierId} 
        isMobileOpen={mobileMenuOpen} 
        onCloseMobile={() => setMobileMenuOpen(false)} 
      />

      <main className="flex-1 flex flex-col min-w-0">
        
        {/* TOP HEADER BAR */}
        <header className="bg-white/95 backdrop-blur-md border-b border-[#0B1B36]/15 px-4 sm:px-8 py-3.5 flex items-center justify-between sticky top-0 z-30 font-mono">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileMenuOpen(true)} className="lg:hidden p-2 text-[#0B1B36] hover:bg-[#0B1B36]/5 rounded-xl border border-[#0B1B36]/15">
              <Menu size={19} />
            </button>
            <div className="text-xs text-[#0B1B36]/70 hidden sm:flex items-center gap-2.5">
              <span className="font-extrabold text-[#0B1B36]">Marketplace Services</span>
              <span className="text-[#0B1B36]/30">/</span>
              <span className="inline-flex items-center gap-1.5 text-[#0B1B36] bg-[#0B1B36]/5 border border-[#0B1B36]/15 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0B1B36] animate-pulse"></span>
                Commercial Tiers & Fulfillment
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2 pl-3 py-1.5 rounded-xl hover:bg-[#0B1B36]/5 transition cursor-pointer border border-[#0B1B36]/15 bg-white"
              >
                <div className="w-7 h-7 rounded-full bg-[#0B1B36] text-white flex items-center justify-center font-bold text-xs">
                  {agent?.username?.charAt(0).toUpperCase() || 'A'}
                </div>
                <div className="text-left hidden xs:block text-xs font-bold text-[#0B1B36]">
                  {agent?.username || 'Agent'}
                </div>
                <ChevronDown size={14} className="text-[#0B1B36]/60" />
              </button>

              {profileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-[#0B1B36]/15 rounded-2xl shadow-xl py-2 z-50 font-mono">
                  <button onClick={handleLogout} className="w-full px-4 py-2.5 text-left text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 transition cursor-pointer">
                    <LogOut size={14} /> Log Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* CONTENT CONTAINER */}
        <div className="p-4 sm:p-8 space-y-6 sm:space-y-8 max-w-7xl mx-auto w-full font-mono text-xs">
          
          {/* HERO BANNER */}
          <div className="bg-gradient-to-br from-[#0B1B36] via-[#0B1B36] to-[#122a52] text-white rounded-3xl p-6 sm:p-8 shadow-xl space-y-4 border border-white/10">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-[11px] font-extrabold shadow-inner">
                <Sparkles size={14} className="text-emerald-300" /> Transparent 3.7% Daily Yield Architecture
              </div>
              <span className="text-[10px] text-white/70 uppercase tracking-widest font-bold">
                10-Month Binding Contracts
              </span>
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">Commercial Services & Task Fulfillment Tiers</h1>
            <p className="text-xs text-white/75 leading-relaxed max-w-3xl">
              Future Gate Global provides structured marketplace categories and standardized daily task fulfillment quotas (5 tasks per 24 hours). Registered agents activate tiers to participate in inventory processing and earn verified daily returns.
            </p>
          </div>

          {/* SERVICES & TIERS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {SERVICES_CATALOG.map((srv) => {
              const IconComp = srv.icon;
              const isCurrent = srv.id === currentTierId;
              const isUpcoming = srv.status === 'upcoming';

              return (
                <div 
                  key={srv.id} 
                  className={`rounded-3xl p-6 border transition flex flex-col justify-between shadow-lg relative ${
                    isCurrent
                      ? 'bg-[#0B1B36] text-white border-[#0B1B36]'
                      : isUpcoming 
                      ? 'bg-white/80 border-[#0B1B36]/10 opacity-90 text-[#0B1B36]' 
                      : 'bg-white border-[#0B1B36]/15 hover:border-[#0B1B36] text-[#0B1B36]'
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold ${
                        isCurrent || !isUpcoming ? 'bg-[#0B1B36] text-white' : 'bg-slate-200 text-slate-500'
                      }`}>
                        <IconComp size={22} />
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] uppercase ${
                          isCurrent ? 'bg-white/20 text-white' : 'bg-[#0B1B36]/5 text-[#0B1B36]'
                        }`}>
                          {srv.tierLabel}
                        </span>
                        <span className={`px-3 py-1 rounded-xl font-extrabold text-[11px] ${
                          isCurrent ? 'bg-emerald-500 text-white' : isUpcoming ? 'bg-amber-100 text-amber-800' : 'bg-[#0B1B36] text-white'
                        }`}>
                          ETB {srv.fee.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <h3 className="text-base font-extrabold">{srv.title}</h3>
                        {isCurrent && <ShieldCheck size={16} className="text-emerald-400 shrink-0" />}
                        {isUpcoming && <Lock size={14} className="text-amber-700 shrink-0" />}
                      </div>
                      <p className={`text-[11px] leading-relaxed ${isCurrent ? 'text-white/75' : 'text-[#0B1B36]/70'}`}>
                        {srv.description}
                      </p>
                    </div>

                    {/* Yield breakdown box */}
                    <div className={`p-3 rounded-2xl border text-[11px] space-y-1 ${
                      isCurrent ? 'bg-white/10 border-white/15 text-white' : 'bg-[#F5F7FA] border-[#0B1B36]/10'
                    }`}>
                      <div className="flex justify-between items-center">
                        <span className="opacity-75">Daily Return (3.7%):</span>
                        <span className="font-extrabold text-emerald-400">ETB {srv.dailyReturn.toLocaleString()} / day</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="opacity-75">Task Quota:</span>
                        <span className="font-bold">5 Tasks / 24h</span>
                      </div>
                    </div>

                    <div className="space-y-2 pt-1">
                      {srv.features.map((feat, fIdx) => (
                        <div key={fIdx} className="flex items-center gap-2 text-[11px]">
                          {isUpcoming ? (
                            <Clock size={13} className="text-amber-700 shrink-0" />
                          ) : (
                            <CheckCircle2 size={13} className={isCurrent ? 'text-emerald-300' : 'text-emerald-600'} />
                          )}
                          <span className={isUpcoming ? 'text-slate-500' : ''}>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-6">
                    {isCurrent ? (
                      <div className="w-full py-3.5 bg-white/10 text-white font-bold rounded-2xl text-xs uppercase tracking-wider text-center border border-white/20 select-none flex items-center justify-center gap-2">
                        <CheckCircle2 size={14} className="text-emerald-400" /> Active Tier (Locked)
                      </div>
                    ) : isUpcoming ? (
                      <div className="w-full py-3.5 bg-slate-100 text-slate-500 font-bold rounded-2xl text-xs uppercase tracking-wider text-center border border-slate-300 select-none flex items-center justify-center gap-2">
                        <Lock size={14} /> Coming Soon (Locked)
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => router.push('/categories')}
                        className="w-full py-3.5 bg-[#0B1B36] hover:bg-[#152d56] text-white font-extrabold rounded-2xl transition text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-md"
                      >
                        Select & Upgrade <ArrowRight size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* PROGRESSIVE UPGRADE NOTICE */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#0B1B36]/15 shadow-xs flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-1.5 max-w-2xl">
              <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-emerald-700">
                <Zap size={14} /> Progressive Upgrade Model
              </div>
              <h3 className="text-base font-extrabold text-[#0B1B36]">Need to upgrade to a higher commercial tier?</h3>
              <p className="text-xs text-[#0B1B36]/70">
                When transitioning between tiers (e.g., from Electronics to Solar Systems), FGG calculates your upgrade price automatically as the difference between the new tier fee and your previously settled activation fee.
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push('/categories')}
              className="px-6 py-4 bg-[#0B1B36] hover:bg-[#152d56] text-white font-extrabold rounded-2xl transition text-xs uppercase tracking-wider shrink-0 cursor-pointer shadow-md"
            >
              Explore Marketplace Categories
            </button>
          </div>

        </div>
      </main>

      <MobileBottomNav />

    </div>
  );
}