// src/app/categories/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Store,
  Lock,
  Cpu,
  Armchair,
  Sun,
  Bike,
  Building2,
  Check,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  LucideIcon,
  Layers,
  Globe,
} from 'lucide-react';
import { useFGGSystem } from '@/lib/useFGGSystem';
import Navbar from '@/lib/components/Navbar';
import MobileBottomNav from '@/lib/components/MobileBottomNav';

interface CategoryConfig {
  fee: number;
  tierLevel: number;
  status: 'available' | 'coming_soon';
  icon: LucideIcon;
  tagline: string;
  items: string[];
}

const CATEGORY_DETAILS: Record<string, CategoryConfig> = {
  'Electronics': {
    fee: 10500,
    tierLevel: 1,
    status: 'available',
    icon: Cpu,
    tagline: 'Immediate Dispatch Access',
    items: ['OLED Smart TVs', 'Flagship Smartphones', 'High-Performance Laptops', 'Smart Home Hubs', 'Pro Audio Systems'],
  },
  'Furniture': {
    fee: 24000,
    tierLevel: 2,
    status: 'available',
    icon: Armchair,
    tagline: 'Intermediate Scale',
    items: ['Executive Ergonomic Chairs', 'Modular Conference Tables', 'Smart Standing Desks', 'Acoustic Lounge Suites', 'Storage Systems'],
  },
  'Solar Systems': {
    fee: 43000,
    tierLevel: 3,
    status: 'available',
    icon: Sun,
    tagline: 'High-Yield Green Energy Grid',
    items: ['550W Monocrystalline Panels', '10kW Hybrid Solar Inverters', 'LiFePO4 Battery Banks', 'Solar Street Lighting Kits', 'Off-Grid Controllers'],
  },
  'EV Bikes & Tuk-Tuks': {
    fee: 70000,
    tierLevel: 4,
    status: 'coming_soon',
    icon: Bike,
    tagline: 'Urban Transit Fleet',
    items: ['Commercial Electric Tuk-Tuks', 'Long-Range Commuter E-Bikes', 'Swap-Station Battery Packs', 'Fleet Telemetry Modules', 'Fast-Charge Hubs'],
  },
  'Real Estate': {
    fee: 110000,
    tierLevel: 5,
    status: 'coming_soon',
    icon: Building2,
    tagline: 'Institutional Commercial Assets',
    items: ['Commercial Retail Units', 'Mixed-Use Developments', 'Logistics Warehouses', 'Serviced Executive Suites', 'Industrial Parks'],
  },
};

const CONTRACT_DAYS = 300; // Exact 10-Month Fixed Contract (300 Operating Days)

export default function CategoriesPage() {
  const { state, timeUntilReset } = useFGGSystem();
  const [isMounted, setIsMounted] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const activeCategory = state.activeCategory;

  if (!isMounted) {
    return <div className="min-h-screen bg-[#F5F7FA]" />;
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#0B1B36] font-mono flex selection:bg-[#0B1B36] selection:text-white relative pb-24 lg:pb-0">
      
      {/* UNIFIED NAVBAR / SIDEBAR */}
      <Navbar
        activeCategory={activeCategory}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#F5F7FA]">
        
        {/* TOP HEADER */}
        <header className="bg-white/95 backdrop-blur-md border-b border-[#AEB8C4]/40 px-4 sm:px-8 py-3.5 flex items-center justify-between sticky top-0 z-30 shadow-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 text-[#0B1B36] hover:bg-[#F5F7FA] rounded-xl transition border border-[#AEB8C4]/30 cursor-pointer"
              aria-label="Open menu"
            >
              <Store size={19} />
            </button>
            <div className="text-xs font-mono text-[#536171] flex items-center gap-2.5">
              <span className="font-extrabold text-[#0B1B36]">Marketplace Nodes</span>
              <span className="text-[#AEB8C4]">/</span>
              <span className="text-[#0B1B36] bg-[#0B1B36]/10 border border-[#0B1B36]/20 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                Active Tier: {activeCategory}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#0B1B36] text-white text-[11px] font-mono shadow-xs">
              <Clock size={12} className="text-[#AEB8C4]" />
              <span className="text-[#AEB8C4]">Daily Settlement:</span>
              <span className="font-bold text-white tabular-nums">{timeUntilReset || '23:59:59'}</span>
            </div>
            <Link
              href="/dashboard"
              className="px-3.5 py-1.5 rounded-xl bg-[#0B1B36] text-white hover:bg-[#152d56] text-xs font-mono font-bold transition shadow-md"
            >
              Workspace
            </Link>
          </div>
        </header>

        {/* CATEGORIES GRID */}
        <div className="p-4 sm:p-8 space-y-6 max-w-7xl mx-auto w-full">
          
          {/* HEADER BANNER */}
          <div className="bg-[#0B1B36] text-white rounded-3xl p-6 sm:p-8 border border-[#AEB8C4]/20 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-white/10 text-emerald-400 text-[10px] font-mono uppercase tracking-widest font-bold">
                <Globe size={13} /> FGG Clearing Infrastructure
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Super Agent & Node Tiers
              </h1>
              <p className="text-xs font-mono text-[#AEB8C4] max-w-2xl leading-relaxed">
                Fixed 10-month (300-day) wholesale clearing contract nodes with 24-hour automated payouts. Upgrade your partition tier to unlock higher daily dispatch yields.
              </p>
            </div>
            <div className="bg-white/10 border border-white/20 rounded-2xl p-4 font-mono text-xs space-y-1 shrink-0 w-full md:w-auto">
              <div className="text-[#AEB8C4] text-[10px] uppercase">Active Partition Node</div>
              <div className="text-white font-extrabold text-sm flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                {activeCategory}
              </div>
            </div>
          </div>

          {/* NODES GRID (STYLIZED LIKE SUPER AGENT CARDS) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(CATEGORY_DETAILS).map(([catName, details]) => {
              const CategoryIcon = details.icon;
              const isComingSoon = details.status === 'coming_soon';
              const isCurrentActive = activeCategory === catName;
              const dailyReturn = details.fee * 0.037;
              const perTaskReturn = dailyReturn / 5;
              const monthlyReturn = dailyReturn * 30;
              const tenMonthTotal = dailyReturn * CONTRACT_DAYS;

              return (
                <div
                  key={catName}
                  className={`p-6 sm:p-7 rounded-3xl border flex flex-col justify-between space-y-6 transition-all duration-300 relative overflow-hidden shadow-xl ${
                    isComingSoon
                      ? 'bg-slate-900 border-slate-800 text-white opacity-85'
                      : isCurrentActive
                        ? 'bg-white border-[#0B1B36] ring-2 ring-[#0B1B36]/20 text-[#0B1B36]'
                        : 'bg-white border-[#AEB8C4]/40 text-[#0B1B36] hover:border-[#0B1B36]'
                  }`}
                >
                  {/* STATUS BADGE RIBBON */}
                  {isComingSoon ? (
                    <div className="absolute top-0 right-0 bg-slate-800 text-white font-mono font-extrabold text-[9px] uppercase tracking-wider px-4 py-1.5 rounded-bl-2xl flex items-center gap-1 border-b border-l border-slate-700 shadow-sm">
                      <Lock size={10} /> Upcoming Node
                    </div>
                  ) : (
                    <div
                      className={`absolute top-0 right-0 font-mono font-extrabold text-[9px] uppercase tracking-wider px-4 py-1.5 rounded-bl-2xl flex items-center gap-1 shadow-sm ${
                        isCurrentActive 
                          ? 'bg-[#0B1B36] text-white' 
                          : 'bg-[#F5F7FA] text-[#0B1B36] border-b border-l border-[#AEB8C4]/40'
                      }`}
                    >
                      <Check size={10} className="stroke-[3]" /> {isCurrentActive ? 'Active Partition' : 'Node Available'}
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="flex items-center gap-3.5">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-inner ${
                        isComingSoon 
                          ? 'bg-white/10 text-white border-white/20' 
                          : isCurrentActive 
                            ? 'bg-[#0B1B36] text-white border-[#0B1B36]' 
                            : 'bg-[#F5F7FA] text-[#0B1B36] border-[#AEB8C4]/40'
                      }`}>
                        <CategoryIcon size={22} />
                      </div>
                      <div>
                        <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded-lg font-bold border inline-block ${
                          isComingSoon ? 'bg-white/10 text-white border-white/20' : 'bg-[#F5F7FA] text-[#536171] border-[#AEB8C4]/40'
                        }`}>
                          Tier {details.tierLevel} Node
                        </span>
                        <h2 className={`text-base font-extrabold mt-1 ${isComingSoon ? 'text-white' : 'text-[#0B1B36]'}`}>{catName}</h2>
                      </div>
                    </div>

                    <p className={`text-xs font-mono leading-relaxed ${isComingSoon ? 'text-[#AEB8C4]' : 'text-[#536171]'}`}>
                      {details.tagline}
                    </p>

                    {/* METRICS BOX */}
                    <div className={`p-4 rounded-2xl space-y-2 text-xs font-mono border ${
                      isComingSoon ? 'bg-white/5 border-white/10 text-[#AEB8C4]' : 'bg-[#F5F7FA] border-[#AEB8C4]/30 text-[#536171]'
                    }`}>
                      <div className="flex justify-between items-center">
                        <span>Contract Duration:</span>
                        <span className={`font-extrabold ${isComingSoon ? 'text-white' : 'text-[#0B1B36]'}`}>Fixed 10 Months</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Entry Capital:</span>
                        <span className={`font-extrabold ${isComingSoon ? 'text-white' : 'text-[#0B1B36]'}`}>
                          ETB {details.fee.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Daily Yield (5 Tasks):</span>
                        <span className={`font-extrabold ${isComingSoon ? 'text-emerald-400' : 'text-emerald-700'}`}>
                          ETB {dailyReturn.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-[11px] opacity-80">
                        <span>Per Task Commission:</span>
                        <span>ETB {perTaskReturn.toFixed(2)}</span>
                      </div>
                      <div className={`flex justify-between items-center pt-2 border-t border-dashed ${isComingSoon ? 'border-white/10' : 'border-[#AEB8C4]/40'}`}>
                        <span>30-Day Estimate:</span>
                        <span className={`font-extrabold ${isComingSoon ? 'text-white' : 'text-[#0B1B36]'}`}>
                          ETB {monthlyReturn.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-[11px]">
                        <span>300-Day Contract Total:</span>
                        <span className={`font-bold ${isComingSoon ? 'text-white' : 'text-[#0B1B36]'}`}>
                          ETB {tenMonthTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    {/* INVENTORY TAGS */}
                    <div className="space-y-1.5">
                      <div className={`text-[10px] font-mono uppercase tracking-wider font-bold flex items-center gap-1 ${isComingSoon ? 'text-[#AEB8C4]/70' : 'text-[#536171]'}`}>
                        <Layers size={12} /> Clearing Inventory Assets
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {details.items.map((item) => (
                          <span
                            key={item}
                            className={`text-[10px] font-mono px-2.5 py-1 rounded-lg border ${
                              isComingSoon
                                ? 'bg-white/5 border-white/10 text-white/90'
                                : 'bg-[#F5F7FA] border-[#AEB8C4]/40 text-[#0B1B36]'
                            }`}
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* ACTION BUTTON */}
                  <div className="pt-2">
                    {isComingSoon ? (
                      <button
                        disabled
                        className="w-full py-3.5 rounded-2xl bg-white/5 text-[#AEB8C4]/50 font-mono font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-not-allowed border border-white/10"
                      >
                        <Lock size={14} /> Upcoming Partition Node
                      </button>
                    ) : isCurrentActive ? (
                      <Link
                        href="/dashboard"
                        className="w-full py-3.5 rounded-2xl bg-[#0B1B36] hover:bg-[#152d56] text-white font-mono font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
                      >
                        <CheckCircle2 size={15} /> Active Workspace Node
                      </Link>
                    ) : (
                      <Link
                        href={`/upgrade-checkout?tier=${encodeURIComponent(catName)}`}
                        className="w-full py-3.5 rounded-2xl bg-[#0B1B36] hover:bg-[#152d56] text-white font-mono font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition shadow-md cursor-pointer"
                      >
                        Initialize Node • ETB {details.fee.toLocaleString()} <ArrowUpRight size={14} />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* FLOATING MOBILE BOTTOM NAV */}
      <MobileBottomNav />
    </div>
  );
}