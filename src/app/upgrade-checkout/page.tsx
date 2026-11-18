// src/app/upgrade-checkout/page.tsx
'use client';

import { useState, useEffect, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Upload, ArrowRight, AlertTriangle, Copy, Check, Smartphone, Building2, Store } from 'lucide-react';
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

      // Fetch all available Super Agent nodes ordered deterministically
      const { data: nodesData } = await supabase
        .from('super_agents')
        .select('*')
        .order('id', { ascending: true });

      let pool = [DEFAULT_FALLBACK_NODE];
      if (nodesData && nodesData.length > 0) {
        pool = nodesData as SuperAgentNode[];
      }

      // EQUAL ROUND-ROBIN ROTATION INDEX VIA SESSION STORAGE
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
    if (!isValidUpgrade) {
      setMessage({
        text: `You are already on ${currentTierName} (Tier ${currentConfig.tierLevel}). Select a higher tier to upgrade.`,
        type: 'error',
      });
      return;
    }
    if (!receiptFile) {
      setMessage({ text: 'Please attach your payment receipt screenshot.', type: 'error' });
      return;
    }
    if (!txRef.trim()) {
      setMessage({ text: 'Please enter the transaction reference / receipt code.', type: 'error' });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const fileExt = receiptFile.name.split('.').pop();
      const fileName = `upgrade_${agent.id}_${Date.now()}.${fileExt}`;
      const filePath = `receipts/${fileName}`;

      const { error: uploadErr } = await supabase.storage
        .from('transaction-receipts')
        .upload(filePath, receiptFile);

      let receiptUrl = null;
      if (!uploadErr) {
        const { data: publicUrlData } = supabase.storage
          .from('transaction-receipts')
          .getPublicUrl(filePath);
        receiptUrl = publicUrlData.publicUrl;
      }

      const { error: insertErr } = await supabase.from('deposits').insert([
        {
          agent_id: agent.id,
          super_agent_id: assignedSuperAgent.id,
          super_agent_name: assignedSuperAgent.name,
          amount: upgradeDifference,
          payment_method: paymentMethod,
          transaction_ref: `UPGRADE (${currentTierName} -> ${requestedTier}) - ${txRef.trim()}`,
          receipt_url: receiptUrl,
          status: 'pending',
          created_at: new Date().toISOString(),
        },
      ]);

      if (insertErr) throw insertErr;

      setMessage({
        text: `Upgrade request from ${currentTierName} to ${requestedTier} submitted successfully via node ${assignedSuperAgent.name}. Awaiting admin verification.`,
        type: 'success',
      });
      setTimeout(() => router.push('/dashboard'), 2500);
    } catch (err: any) {
      setMessage({ text: err.message || 'Upgrade submission failed.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#0B1B36] font-sans flex relative pb-24 lg:pb-0 selection:bg-[#0B1B36] selection:text-white">
      
      <Navbar
        activeCategory={currentTierName}
        isMobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <main className="flex-1 flex flex-col min-w-0 bg-[#F5F7FA]">
        <header className="bg-white/95 backdrop-blur-md border-b border-[#AEB8C4]/40 px-4 sm:px-8 py-3.5 flex items-center justify-between sticky top-0 z-30 shadow-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 text-[#0B1B36] hover:bg-[#F5F7FA] rounded-xl transition border border-[#AEB8C4]/30 cursor-pointer"
              aria-label="Open menu"
            >
              <Store size={19} />
            </button>
            <div className="text-xs font-mono text-[#536171] flex items-center gap-2.5">
              <span className="font-extrabold text-[#0B1B36]">Capital Upgrade Checkout</span>
              <span className="text-[#AEB8C4] hidden sm:inline">/</span>
              <span className="text-[#0B1B36] bg-[#0B1B36]/10 border border-[#0B1B36]/20 px-2.5 py-0.5 rounded-full text-[11px] font-bold hidden sm:inline-block">
                Tier {currentConfig.tierLevel} → Tier {targetConfig.tierLevel} ({requestedTier})
              </span>
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-8 space-y-6 max-w-4xl mx-auto w-full">
          
          <div className="bg-gradient-to-br from-[#0B1B36] via-[#0B1B36] to-[#071226] text-white rounded-3xl p-6 sm:p-8 border border-[#536171]/30 shadow-xl space-y-3">
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#AEB8C4] font-bold">
              Equal Round-Robin Rotation Pipeline (Balanced Node Assignment)
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Upgrade to {requestedTier}
            </h1>
            <p className="text-xs font-mono text-[#AEB8C4] max-w-2xl">
              Your existing <strong className="text-white">{currentTierName}</strong> capital (ETB {currentConfig.fee.toLocaleString()}) is credited toward this upgrade. Pay only the net difference below.
            </p>
          </div>

          {!isValidUpgrade && (
            <div className="p-4 rounded-2xl text-xs font-mono border bg-amber-50 text-amber-900 border-amber-200 flex items-center gap-3">
              <AlertTriangle size={18} className="text-amber-700 shrink-0" />
              <span>
                You are currently on <strong>{currentTierName} (Tier {currentConfig.tierLevel})</strong>. Please select a tier higher than Tier {currentConfig.tierLevel} from the Categories page.
              </span>
            </div>
          )}

          {message && (
            <div className={`p-4 rounded-2xl text-xs font-mono border ${message.type === 'success' ? 'bg-[#0B1B36]/10 text-[#0B1B36] border-[#0B1B36]/30' : 'bg-rose-50 text-rose-800 border-rose-200'}`}>
              {message.text}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* TIER DIFFERENCE BREAKDOWN */}
            <div className="bg-white rounded-3xl p-6 border border-[#AEB8C4]/40 shadow-md space-y-4 md:col-span-1">
              <h2 className="text-sm font-extrabold text-[#0B1B36] uppercase tracking-wider">Upgrade Calculation</h2>
              
              <div className="space-y-2.5 font-mono text-xs pt-2 border-t border-[#AEB8C4]/20">
                <div className="flex justify-between">
                  <span className="text-[#536171]">Current Tier:</span>
                  <span className="font-bold text-[#0B1B36]">{currentTierName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#536171]">Target Tier:</span>
                  <span className="font-bold text-[#0B1B36]">{requestedTier}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-dashed border-[#AEB8C4]/40">
                  <span className="text-[#536171]">Target Tier Fee:</span>
                  <span className="font-bold text-[#0B1B36]">ETB {targetConfig.fee.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#536171]">Current Credit:</span>
                  <span className="font-bold text-emerald-700">- ETB {currentConfig.fee.toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-[#AEB8C4]/40 text-sm">
                  <span className="font-extrabold text-[#0B1B36]">Amount Due:</span>
                  <span className="font-extrabold text-emerald-700">ETB {upgradeDifference.toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-1 text-[11px]">
                  <span className="text-[#536171]">New Daily Yield:</span>
                  <span className="font-bold text-[#0B1B36]">ETB {dailyReturn.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-[#AEB8C4]/20">
                <div className="text-[10px] font-mono uppercase text-[#536171] font-bold">Unlocked Inventory</div>
                <div className="flex flex-wrap gap-1.5">
                  {targetConfig.items.map((item) => (
                    <span key={item} className="text-[10px] font-mono px-2 py-1 bg-[#F5F7FA] border border-[#AEB8C4]/30 rounded-lg text-[#0B1B36]">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* PAYMENT & SUBMISSION FORM */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#AEB8C4]/40 shadow-md space-y-6 md:col-span-2">
              <h2 className="text-base font-extrabold text-[#0B1B36]">Super Agent Node Payment Gateway</h2>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('Telebirr')}
                    className={`py-3 px-4 rounded-xl border font-mono text-xs font-bold transition cursor-pointer flex items-center justify-center gap-2 ${
                      paymentMethod === 'Telebirr' ? 'bg-[#0B1B36] text-white border-[#0B1B36]' : 'bg-[#F5F7FA] text-[#0B1B36] border-[#AEB8C4]/40'
                    }`}
                  >
                    <Smartphone size={15} /> Telebirr
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('CBE')}
                    className={`py-3 px-4 rounded-xl border font-mono text-xs font-bold transition cursor-pointer ${
                      paymentMethod === 'CBE' ? 'bg-[#0B1B36] text-white border-[#0B1B36]' : 'bg-[#F5F7FA] text-[#0B1B36] border-[#AEB8C4]/40'
                    }`}
                  >
                    <Building2 size={15} /> CBE Bank
                  </button>
                </div>

                {/* DYNAMIC SUPER AGENT NODE WALLET CARD */}
                <div className="p-4 bg-[#F5F7FA] rounded-2xl font-mono text-xs space-y-2.5 border border-[#AEB8C4]/30">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-[10px] text-[#536171] uppercase font-bold block">Assigned Super Agent Node</span>
                      <strong className="text-[#0B1B36] text-sm">{assignedSuperAgent.name}</strong> ({assignedSuperAgent.region || 'Central'})
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyAccount(activePayNumber)}
                      className="px-3 py-1.5 rounded-xl bg-white border border-[#AEB8C4]/50 hover:bg-[#0B1B36] hover:text-white transition text-[10px] font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      {copiedAccount ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                      {copiedAccount ? 'Copied Account!' : 'Copy Account'}
                    </button>
                  </div>

                  <div className="space-y-1 pt-1 border-t border-[#AEB8C4]/20">
                    <span className="text-[10px] text-[#536171] uppercase font-bold">
                      {paymentMethod === 'Telebirr' ? 'Node Telebirr Number' : 'Node CBE Account Number'}
                    </span>
                    <div className="text-sm font-extrabold select-all bg-white p-3 rounded-xl border border-[#AEB8C4]/40 text-[#0B1B36] font-mono">
                      {activePayNumber}
                    </div>
                  </div>

                  <div className="text-[11px] text-emerald-700 font-bold pt-1">
                    Net Upgrade Difference Due: ETB {upgradeDifference.toLocaleString()}
                  </div>
                </div>
              </div>

              <form onSubmit={handleUpgradeSubmit} className="space-y-4 font-mono text-xs">
                <div className="space-y-1">
                  <label className="text-[#536171] uppercase font-bold text-[10px]">Transaction Reference / Receipt Code</label>
                  <input
                    type="text"
                    placeholder="e.g. FT263920..."
                    value={txRef}
                    onChange={(e) => setTxRef(e.target.value)}
                    disabled={!isValidUpgrade}
                    className="w-full px-4 py-3.5 rounded-xl bg-[#F5F7FA] border border-[#AEB8C4]/40 font-bold text-[#0B1B36] focus:outline-none focus:border-[#0B1B36] disabled:opacity-50"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[#536171] uppercase font-bold text-[10px]">Upload Payment Receipt Screenshot * Required</label>
                  <div className="relative border-2 border-dashed border-[#AEB8C4]/60 rounded-xl p-4 text-center bg-[#F5F7FA] hover:border-[#0B1B36] transition cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                      disabled={!isValidUpgrade}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full disabled:cursor-not-allowed"
                      required
                    />
                    <div className="flex flex-col items-center justify-center space-y-1">
                      <Upload size={18} className="text-[#536171]" />
                      <span className="text-[#0B1B36] font-bold truncate max-w-xs">
                        {receiptFile ? receiptFile.name : 'Click to attach payment receipt screenshot'}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting || !isValidUpgrade}
                  className="w-full py-4 bg-[#0B1B36] hover:bg-[#152d56] text-white font-extrabold rounded-2xl transition uppercase tracking-wider shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Submitting Upgrade Request...
                    </>
                  ) : (
                    <>
                      Submit Upgrade Request for ETB {upgradeDifference.toLocaleString()} <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>
            </div>

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