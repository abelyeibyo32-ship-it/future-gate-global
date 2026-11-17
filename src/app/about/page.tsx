'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
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
  Building2,
  Award,
  Zap,
  CheckCircle2,
  Lock
} from 'lucide-react';

export default function AboutPage() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [agent, setAgent] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

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

        if (!agentData && session.user.email) {
          const { data: emailAgent } = await supabase
            .from('agents')
            .select('*')
            .eq('email', session.user.email)
            .maybeSingle();
          agentData = emailAgent;
        }

        if (isMounted) {
          setAgent(agentData || { 
            id: session.user.id,
            username: session.user.email?.split('@')[0] || 'Agent', 
            email: session.user.email 
          });
          setLoading(false);
        }
      } catch (err) {
        console.error('Error loading about page user data:', err);
        if (isMounted) setLoading(false);
      }
    };

    loadUserData();
    return () => {
      isMounted = false;
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-[#0B1B36] text-[#AEB8C4] flex items-center justify-center font-mono text-xs">
        <div className="flex items-center gap-3">
          <Loader2 size={16} className="animate-spin text-white" />
          <span>Accessing FGG Corporate Ledger...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#0B1B36] font-sans flex">
      
      {/* SIDEBAR */}
      <aside className="w-64 bg-[#0B1B36] text-[#AEB8C4] flex-col justify-between hidden md:flex sticky top-0 h-screen border-r border-[#536171]/20 shrink-0">
        <div className="p-6 space-y-8 overflow-y-auto">
          <div className="flex items-center gap-2.5">
            <Globe size={24} className="text-white shrink-0" />
            <div>
              <div className="font-extrabold text-white text-base tracking-wider leading-none">FGG</div>
              <div className="text-[9px] font-mono text-[#AEB8C4] uppercase tracking-widest mt-1">Future Gate Global</div>
            </div>
          </div>

          <nav className="space-y-1.5 font-medium text-xs">
            <button onClick={() => router.push('/dashboard')} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[#536171]/30 text-[#AEB8C4] hover:text-white transition cursor-pointer">
              <LayoutDashboard size={16} /> Dashboard
            </button>
            <button onClick={() => router.push('/categories')} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[#536171]/30 text-[#AEB8C4] hover:text-white transition cursor-pointer">
              <Layers size={16} /> Marketplace Categories
            </button>
            <button onClick={() => router.push('/wallet')} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[#536171]/30 text-[#AEB8C4] hover:text-white transition cursor-pointer">
              <TrendingUp size={16} /> My Earnings
            </button>
            <button onClick={() => router.push('/wallet')} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[#536171]/30 text-[#AEB8C4] hover:text-white transition cursor-pointer">
              <Wallet size={16} /> Wallet
            </button>
            <button onClick={() => router.push('/invitations')} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[#536171]/30 text-[#AEB8C4] hover:text-white transition cursor-pointer">
              <Users size={16} /> Referrals
            </button>

            <div className="pt-3 pb-1 border-t border-[#536171]/20 my-2">
              <span className="px-4 text-[9px] font-mono text-[#AEB8C4] uppercase tracking-wider block">Information</span>
            </div>

            <button onClick={() => router.push('/services')} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[#536171]/30 text-[#AEB8C4] hover:text-white transition cursor-pointer">
              <Layers size={16} /> Services
            </button>
            <button onClick={() => router.push('/about')} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-[#536171] text-white font-bold transition cursor-pointer">
              <Globe size={16} /> About Us
            </button>
            <button onClick={() => router.push('/support')} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[#536171]/30 text-[#AEB8C4] hover:text-white transition cursor-pointer">
              <HelpCircle size={16} /> Support Center
            </button>
            <button onClick={() => router.push('/terms')} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[#536171]/30 text-[#AEB8C4] hover:text-white transition cursor-pointer">
              <ShieldAlert size={16} /> Terms & Conditions
            </button>
          </nav>
        </div>

        <div className="p-5 m-4 bg-[#536171]/20 border border-[#536171]/40 rounded-2xl space-y-3 shrink-0">
          <div className="flex items-center gap-2 text-white font-bold text-xs uppercase tracking-wider">
            <Building2 size={14} className="text-[#AEB8C4]" /> Corporate Overview
          </div>
          <p className="text-[11px] text-[#AEB8C4] leading-relaxed">
            Pioneering digital marketplace architecture and global agent networks.
          </p>
        </div>
      </aside>

      {/* MOBILE DRAWER */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="fixed inset-0 bg-[#0B1B36]/80 transition-opacity" onClick={() => setMobileMenuOpen(false)} />
          <aside className="relative w-72 bg-[#0B1B36] text-[#AEB8C4] flex flex-col justify-between h-full shadow-2xl z-10 p-6 space-y-6 overflow-y-auto">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Globe size={22} className="text-white shrink-0" />
                  <div>
                    <div className="font-extrabold text-white text-sm tracking-wider leading-none">FGG</div>
                  </div>
                </div>
                <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-[#AEB8C4] hover:text-white cursor-pointer">
                  <X size={20} />
                </button>
              </div>

              <nav className="space-y-1.5 font-medium text-xs">
                <button onClick={() => { setMobileMenuOpen(false); router.push('/dashboard'); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[#536171]/30 text-[#AEB8C4] cursor-pointer">
                  <LayoutDashboard size={16} /> Dashboard
                </button>
                <button onClick={() => { setMobileMenuOpen(false); router.push('/categories'); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[#536171]/30 text-[#AEB8C4] cursor-pointer">
                  <Layers size={16} /> Marketplace Categories
                </button>

                <button onClick={() => { setMobileMenuOpen(false); router.push('/wallet'); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[#536171]/30 text-[#AEB8C4] cursor-pointer">
                  <Wallet size={16} /> Wallet
                </button>
                <button onClick={() => { setMobileMenuOpen(false); router.push('/invitations'); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[#536171]/30 text-[#AEB8C4] cursor-pointer">
                  <Users size={16} /> Referrals
                </button>

                <div className="pt-2 pb-1 border-t border-[#536171]/20 my-2">
                  <span className="px-4 text-[9px] font-mono text-[#AEB8C4] uppercase tracking-wider block">Information</span>
                </div>

                <button onClick={() => { setMobileMenuOpen(false); router.push('/services'); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[#536171]/30 text-[#AEB8C4] cursor-pointer">
                  <Layers size={16} /> Services
                </button>
                <button onClick={() => { setMobileMenuOpen(false); router.push('/about'); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-[#536171] text-white font-bold cursor-pointer">
                  <Globe size={16} /> About Us
                </button>
                <button onClick={() => { setMobileMenuOpen(false); router.push('/support'); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[#536171]/30 text-[#AEB8C4] cursor-pointer">
                  <HelpCircle size={16} /> Support Center
                </button>
                <button onClick={() => { setMobileMenuOpen(false); router.push('/terms'); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[#536171]/30 text-[#AEB8C4] cursor-pointer">
                  <ShieldAlert size={16} /> Terms & Conditions
                </button>
              </nav>
            </div>
          </aside>
        </div>
      )}

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-[#AEB8C4]/40 px-4 sm:px-8 py-4 flex items-center justify-between sticky top-0 z-20 shadow-xs">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileMenuOpen(true)} className="p-2 text-[#0B1B36] hover:bg-[#F5F7FA] rounded-xl md:hidden transition cursor-pointer">
              <Menu size={20} />
            </button>
            <div className="text-xs font-mono text-[#536171] hidden sm:block">
              Corporate Profile • Future Gate Global
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2 pl-3 py-1.5 rounded-xl hover:bg-[#F5F7FA] transition cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-[#F5F7FA] border border-[#AEB8C4] flex items-center justify-center">
                  <span className="font-bold text-xs text-[#0B1B36]">{agent?.username?.charAt(0).toUpperCase() || 'A'}</span>
                </div>
                <div className="text-left hidden xs:block">
                  <div className="text-xs font-bold text-[#0B1B36]">{agent?.username || 'Agent'}</div>
                </div>
                <ChevronDown size={14} className="text-[#536171]" />
              </button>

              {profileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-[#AEB8C4]/40 rounded-2xl shadow-xl py-2 z-50">
                  <button onClick={handleLogout} className="w-full px-4 py-2 text-left text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 transition cursor-pointer">
                    <LogOut size={14} /> Log Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-8 space-y-6 sm:space-y-8 max-w-5xl mx-auto w-full font-mono text-xs">
          
          {/* HERO BANNER */}
          <div className="bg-[#0B1B36] rounded-3xl p-6 sm:p-8 text-white shadow-lg space-y-3 border border-[#536171]/20">
            <div className="flex items-center gap-2 text-[#AEB8C4] uppercase tracking-wider text-[11px]">
              <Building2 size={16} className="text-white" /> Corporate Profile & Mission
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">About Future Gate Global (FGG)</h2>
            <p className="text-xs text-[#AEB8C4] leading-relaxed max-w-3xl">
              Future Gate Global is an advanced digital marketplace and task-fulfillment platform designed to empower registered Agents through structured tier operations, digital asset commerce, and secure financial ledgers.
            </p>
          </div>

          {/* CONTENT CARD */}
          <div className="bg-white rounded-3xl p-6 sm:p-10 border border-[#AEB8C4]/40 shadow-xs space-y-8 text-[#536171] leading-relaxed">
            
            {/* VISION & MISSION */}
            <div className="space-y-3">
              <h3 className="font-extrabold text-sm text-[#0B1B36] flex items-center gap-2">
                <Zap size={16} /> 1. Our Corporate Vision and Mission
              </h3>
              <p>
                Founded on principles of cryptographic transparency, operational efficiency, and digital economic empowerment, Future Gate Global (FGG) bridges independent agents with structured marketplace fulfillment tasks. Our mission is to establish a secure, reliable, and high-performance digital ecosystem where participants can scale their commercial activities, manage secure wallets, and expand passive commission yields through verified affiliate networks.
              </p>
              <p>
                By combining automated ledger reconciliation with rigorous administrative oversight, FGG ensures that every marketplace interaction—from daily task execution to progressive tier upgrades—operates with absolute integrity and speed.
              </p>
            </div>

            {/* SECURE INFRASTRUCTURE */}
            <div className="space-y-3 pt-6 border-t border-slate-100">
              <h3 className="font-extrabold text-sm text-[#0B1B36] flex items-center gap-2">
                <Lock size={16} /> 2. Secure Regional Gateways & Ledger Technology
              </h3>
              <p>
                FGG integrates seamlessly with trusted regional financial networks, including Telebirr and the Commercial Bank of Ethiopia (CBE), enabling secure fiat deposits, instant receipt verifications, and streamlined payouts. Our proprietary terminal infrastructure utilizes advanced Supabase PostgreSQL database architecture and Row Level Security (RLS) to guarantee that every Agent&apos;s wallet balance, transaction history, and network data remain fully encrypted and protected against unauthorized access.
              </p>
            </div>

            {/* CORE PILLARS */}
            <div className="space-y-4 pt-6 border-t border-slate-100">
              <h3 className="font-extrabold text-sm text-[#0B1B36] flex items-center gap-2">
                <Award size={16} /> 3. Core Operational Pillars
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="p-4 bg-[#F5F7FA] rounded-2xl border border-[#AEB8C4]/30 space-y-1.5">
                  <div className="font-bold text-[#0B1B36] flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-700" /> Multi-Category Marketplace
                  </div>
                  <p className="text-[11px] text-[#536171]">
                    Structured commercial inventories spanning Electronics, Furniture, Solar Systems, Electric Mobility, and Real Estate.
                  </p>
                </div>

                <div className="p-4 bg-[#F5F7FA] rounded-2xl border border-[#AEB8C4]/30 space-y-1.5">
                  <div className="font-bold text-[#0B1B36] flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-700" /> Progressive Tier Upgrades
                  </div>
                  <p className="text-[11px] text-[#536171]">
                    Fair and transparent upgrade pricing where agents pay solely the calculated financial difference between tier levels.
                  </p>
                </div>

                <div className="p-4 bg-[#F5F7FA] rounded-2xl border border-[#AEB8C4]/30 space-y-1.5">
                  <div className="font-bold text-[#0B1B36] flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-700" /> Global Affiliate Network
                  </div>
                  <p className="text-[11px] text-[#536171]">
                    Automated referral tracking and tiered commission bonuses for expanding the active agent ecosystem.
                  </p>
                </div>

                <div className="p-4 bg-[#F5F7FA] rounded-2xl border border-[#AEB8C4]/30 space-y-1.5">
                  <div className="font-bold text-[#0B1B36] flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-700" /> 24/7 Administrative Support
                  </div>
                  <p className="text-[11px] text-[#536171]">
                    Dedicated verification helpdesk ensuring rapid transaction confirmation and troubleshooting assistance.
                  </p>
                </div>
              </div>
            </div>

            {/* COMMITMENT */}
            <div className="space-y-3 pt-6 border-t border-slate-100">
              <h3 className="font-extrabold text-sm text-[#0B1B36] flex items-center gap-2">
                <Globe size={16} /> 4. Our Commitment to Excellence
              </h3>
              <p>
                As Future Gate Global continues to scale its global network, our unwavering commitment remains centered on empowering agents, maintaining robust technical infrastructure, and upholding the highest standards of digital commerce compliance. Thank you for being an integral part of the FGG network.
              </p>
            </div>

          </div>

        </div>
      </main>
    </div>
  );
}