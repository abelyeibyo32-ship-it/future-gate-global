// src/app/upgrade-checkout/page.tsx
'use client';

import { useState, useEffect, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Upload, ArrowRight, AlertTriangle, Copy, Check, Smartphone, Building2, Store, AlertCircle, Wrench, ArrowLeft } from 'lucide-react';
import { useFGGSystem } from '@/lib/useFGGSystem';
import Navbar from '@/lib/components/Navbar';
import MobileBottomNav from '@/lib/components/MobileBottomNav';

const TIER_DETAILS: Record<string, { fee: number; tierLevel: number; tagline: string; items: string[] }> = {
  'Electronics': {
    fee: 10500,
    tierLevel: 1,
    tagline: 'Immediate Dispatch Access',
    items: ['OLED Smart TVs', 'Flagship Smartphones', 'High-Performance Laptops', 'Smart Home Hubs', 'Pro Audio Systems'],
  },
  'Furniture': {
    fee: 24000,
    tierLevel: 2,
    tagline: 'Intermediate Scale',
    items: ['Executive Ergonomic Chairs', 'Modular Conference Tables', 'Smart Standing Desks', 'Acoustic Lounge Suites', 'Storage Systems'],
  },
  'Solar Systems': {
    fee: 43000,
    tierLevel: 3,
    tagline: 'High-Yield Green Energy Grid',
    items: ['550W Monocrystalline Panels', '10kW Hybrid Solar Inverters', 'LiFePO4 Battery Banks', 'Solar Street Lighting Kits', 'Off-Grid Controllers'],
  },
  'EV Bikes & Tuk-Tuks': {
    fee: 70000,
    tierLevel: 4,
    tagline: 'Urban Transit Fleet',
    items: ['Commercial Electric Tuk-Tuks', 'Long-Range Commuter E-Bikes', 'Swap-Station Battery Packs', 'Fleet Telemetry Modules', 'Fast-Charge Hubs'],
  },
  'Real Estate': {
    fee: 110000,
    tierLevel: 5,
    tagline: 'Institutional Commercial Assets',
    items: ['Commercial Retail Units', 'Mixed-Use Developments', 'Logistics Warehouses', 'Serviced Executive Suites', 'Industrial Parks'],
  },
};

const VIP_TO_CATEGORY: Record<string, string> = {
  'VIP 1': 'Electronics',
  'VIP 2': 'Furniture',
  'VIP 3': 'Solar Systems',
  'VIP 4': 'EV Bikes & Tuk-Tuks',
  'VIP 5': 'Real Estate',
};

interface SuperAgentNode {
  id: string;
  name: string;
  tier: string;
  region: string;
  phone?: string;
  telebirr_account?: string;
  cbe_account?: string;
}

const DEFAULT_FALLBACK_NODE: SuperAgentNode = {
  id: 'sa-default',
  name: 'Central Escrow Node',
  tier: 'Solar Systems',
  region: 'Addis Ababa',
  phone: '0911223344',
  telebirr_account: '0911223344',
  cbe_account: '1000293848592',
};

function UpgradeCheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { state } = useFGGSystem();
  const requestedTier = searchParams.get('tier') || 'Furniture';

  const targetConfig = TIER_DETAILS[requestedTier] || TIER_DETAILS['Furniture'];

  const [agent, setAgent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'Telebirr' | 'CBE'>('Telebirr');
  const [txRef, setTxRef] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const [assignedSuperAgent, setAssignedSuperAgent] = useState<SuperAgentNode>(DEFAULT_FALLBACK_NODE);
  const [copiedAccount, setCopiedAccount] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadCheckoutData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.replace('/login');
        return;
      }

      const { data: agentData } = await supabase
        .from('agents')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      const { data: nodesData } = await supabase
        .from('super_agents')
        .select('*')
        .order('id', { ascending: true });

      let pool = [DEFAULT_FALLBACK_NODE];
      if (nodesData && nodesData.length > 0) {
        pool = nodesData as SuperAgentNode[];
      }

      const storageKey = 'fgg_equal_rotation_seq';
      const lastSeq = sessionStorage.getItem(storageKey);
      const nextSeq = lastSeq !== null ? parseInt(lastSeq, 10) + 1 : 0;
      sessionStorage.setItem(storageKey, nextSeq.toString());

      const equalRotatedIndex = nextSeq % pool.length;
      const assignedNode = pool[equalRotatedIndex];

      if (isMounted) {
        setAgent(agentData);
        setAssignedSuperAgent(assignedNode);
        setLoading(false);
      }
    };
    loadCheckoutData();
    return () => {
      isMounted = false;
    };
  }, [router]);

  const handleCopyAccount = (textToCopy: string) => {
    navigator.clipboard.writeText(textToCopy);
    setCopiedAccount(true);
    setTimeout(() => setCopiedAccount(false), 2500);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] text-[#0B1B36] flex items-center justify-center font-mono text-xs">
        <div className="flex items-center gap-3">
          <Loader2 size={16} className="animate-spin text-[#0B1B36]" />
          <span>Loading Checkout Portal & Balancing Node...</span>
        </div>
      </div>
    );
  }

  const rawCurrentTier =
    agent?.active_category ||
    (agent?.vip_tier ? VIP_TO_CATEGORY[agent.vip_tier] : null) ||
    state?.activeCategory ||
    'Electronics';

  const currentTierName = TIER_DETAILS[rawCurrentTier] ? rawCurrentTier : 'Electronics';
  const currentConfig = TIER_DETAILS[currentTierName];

  const upgradeDifference = Math.max(0, targetConfig.fee - currentConfig.fee);
  const isValidUpgrade = targetConfig.tierLevel > currentConfig.tierLevel && upgradeDifference > 0;
  const dailyReturn = targetConfig.fee * 0.037;

  const activePayNumber =
    paymentMethod === 'Telebirr'
      ? assignedSuperAgent.telebirr_account || assignedSuperAgent.phone || '0911223344'
      : assignedSuperAgent.cbe_account || '1000293848592';

  const handleUpgradeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#0B1B36] font-sans flex relative pb-24 lg:pb-0 selection:bg-[#0B1B36] selection:text-white overflow-hidden">
      
      {/* UNDER CONSTRUCTION MODAL OVERLAY */}
      <div className="fixed inset-0 z-50 bg-[#0B1B36]/80 backdrop-blur-md flex items-center justify-center p-4 font-mono">
        <div className="bg-white rounded-3xl p-8 sm:p-10 max-w-md w-full border border-[#0B1B36]/20 shadow-2xl text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
          <div className="w-16 h-16 bg-[#0B1B36]/5 text-[#0B1B36] rounded-2xl flex items-center justify-center mx-auto border border-[#0B1B36]/15 shadow-inner">
            <Wrench size={32} className="animate-pulse" />
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full bg-[#0B1B36]/10 text-[#0B1B36] text-[10px] font-extrabold uppercase tracking-widest">
              System Upgrade Gateway
            </span>
            <h2 className="text-2xl font-extrabold text-[#0B1B36] tracking-tight">Under Construction</h2>
            <p className="text-xs text-[#0B1B36]/70 leading-relaxed">
              The automated differential upgrade checkout pipeline is currently undergoing maintenance and infrastructure optimization. Please check back soon.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full py-4 rounded-xl bg-[#0B1B36] hover:bg-[#152d56] text-white font-bold text-xs uppercase tracking-wider transition shadow-lg cursor-pointer flex items-center justify-center gap-2"
            >
              <ArrowLeft size={16} /> Return to Operations Dashboard
            </button>
          </div>
        </div>
      </div>

      {/* BACKGROUND CONTENT (BLURRED & LOCKED BEHIND MODAL) */}
      <Navbar
        activeCategory={currentTierName}
        isMobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <main className="flex-1 flex flex-col min-w-0 bg-[#F5F7FA] filter blur-sm pointer-events-none select-none">
        <header className="bg-white/95 backdrop-blur-md border-b border-[#AEB8C4]/40 px-4 sm:px-8 py-3.5 flex items-center justify-between sticky top-0 z-30 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="text-xs font-mono text-[#536171] flex items-center gap-2.5">
              <span className="font-extrabold text-[#0B1B36]">Capital Upgrade Checkout</span>
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-8 space-y-6 max-w-4xl mx-auto w-full">
          <div className="bg-[#0B1B36] text-white rounded-3xl p-6 sm:p-8 shadow-xl space-y-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold">Upgrade to {requestedTier}</h1>
          </div>
        </div>
      </main>

      <MobileBottomNav />
    </div>
  );
}

export default function UpgradeCheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F5F7FA] text-[#0B1B36] flex items-center justify-center font-mono text-xs">
        <div className="flex items-center gap-3">
          <Loader2 size={16} className="animate-spin text-[#0B1B36]" />
          <span>Loading Checkout Terminal...</span>
        </div>
      </div>
    }>
      <UpgradeCheckoutContent />
    </Suspense>
  );
}