// src/app/terms/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Wallet,
  CheckCircle2,
  TrendingUp,
  ShieldCheck,
  Clock,
  Layers,
  Menu,
  RefreshCw,
  Award,
  Sparkles,
  Activity,
  Lock,
  Zap,
  Cpu,
  PieChart,
  ShieldAlert,
  FileText
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useFGGSystem } from '@/lib/useFGGSystem';
import Navbar from '@/lib/components/Navbar';
import MobileBottomNav from '@/lib/components/MobileBottomNav';

interface AgentRecord {
  id: string;
  username?: string;
  tier: string;
  capital_balance: number;
  balance: number;
  referral_code: string;
}

export default function TermsPage() {
  const router = useRouter();
  const { timeUntilReset } = useFGGSystem();
  const [isMounted, setIsMounted] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const [agent, setAgent] = useState<AgentRecord | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    fetchAgentData();
  }, []);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const fetchAgentData = async (manual = false) => {
    if (manual) setIsRefreshing(true);

    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id || '00000000-0000-0000-0000-000000000001';

    const { data: agentData } = await supabase
      .from('agents')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (agentData) {
      setAgent(agentData as AgentRecord);
    } else {
      setAgent({
        id: userId,
        username: 'Operator Alpha',
        tier: 'Solar Systems',
        capital_balance: 43000,
        balance: 1591.00,
        referral_code: 'FGG-DEMO88',
      });
    }

    if (manual) {
      setIsRefreshing(false);
      showToast('Legal terminal synchronized.');
    }
  };

  if (!isMounted) return <div className="min-h-screen bg-[#F5F7FA]" />;

  const currentTierId = agent?.tier || 'Solar Systems';

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#0B1B36] font-sans flex selection:bg-[#0B1B36] selection:text-white relative pb-28 lg:pb-0">
      
      {notification && (
        <div className="fixed bottom-20 lg:bottom-6 right-6 z-50 bg-[#0B1B36] text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-white/20 text-xs font-mono flex items-center gap-3 animate-in fade-in">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse shrink-0"></span>
          <span>{notification}</span>
        </div>
      )}

      {/* SHARED NAVIGATION DRAWER */}
      <Navbar 
        activeCategory={currentTierId} 
        isMobileOpen={isMobileMenuOpen} 
        onCloseMobile={() => setIsMobileMenuOpen(false)} 
      />

      <main className="flex-1 flex flex-col min-w-0">
        {/* TOP HEADER BAR */}
        <header className="bg-white/95 backdrop-blur-md border-b border-[#0B1B36]/15 px-4 sm:px-8 py-3.5 flex items-center justify-between sticky top-0 z-30 font-mono">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden p-2 text-[#0B1B36] hover:bg-[#0B1B36]/5 rounded-xl border border-[#0B1B36]/15">
              <Menu size={19} />
            </button>
            <div className="text-xs text-[#0B1B36]/70 hidden sm:flex items-center gap-2.5">
              <span className="font-extrabold text-[#0B1B36]">Legal Documentation</span>
              <span className="text-[#0B1B36]/30">/</span>
              <span className="inline-flex items-center gap-1.5 text-[#0B1B36] bg-[#0B1B36]/5 border border-[#0B1B36]/15 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0B1B36] animate-pulse"></span>
                Binding Terms of Service
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => fetchAgentData(true)} disabled={isRefreshing} className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#0B1B36] hover:text-white border border-[#0B1B36]/20 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs">
              <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <Link href="/wallet" className="px-3.5 py-1.5 rounded-xl bg-[#0B1B36] text-white hover:bg-[#152d56] transition text-xs font-bold shadow-sm flex items-center gap-1.5">
              <Wallet size={14} /> Wallet
            </Link>
          </div>
        </header>

        {/* CONTENT CONTAINER */}
        <div className="p-4 sm:p-8 space-y-6 max-w-5xl mx-auto w-full font-mono">
          
          {/* HERO BANNER */}
          <div className="bg-gradient-to-br from-[#0B1B36] via-[#0B1B36] to-[#122a52] text-white rounded-3xl p-6 sm:p-8 border border-white/10 shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 border border-white/20 text-[11px] font-extrabold shadow-inner">
                <ShieldAlert size={14} className="text-white" /> Regulatory Framework & Legal Covenant
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
                Terms and Conditions of Future Gate Global
              </h1>
              <p className="text-xs text-white/75 max-w-xl leading-relaxed">
                Last Updated: November 2026. Please read this comprehensive legal agreement thoroughly before accessing, utilizing, or interacting with the Future Gate Global (FGG) technological platform and digital marketplace infrastructure.
              </p>
            </div>

            <div className="bg-white/10 p-5 rounded-2xl border border-white/15 backdrop-blur-sm min-w-[200px] space-y-2 shadow-lg shrink-0">
              <div className="text-[10px] text-white/70 uppercase tracking-widest font-bold flex items-center gap-1.5">
                <ShieldCheck size={13} /> Legal Status
              </div>
              <div className="text-sm font-extrabold text-emerald-300">
                Active & Binding
              </div>
              <div className="text-[10px] text-white/60">Fully Enforceable Agreement</div>
            </div>
          </div>

          {/* LEGAL SECTIONS CONTAINER */}
          <div className="bg-white rounded-3xl p-6 sm:p-10 border border-[#0B1B36]/15 shadow-xs space-y-8 text-[#0B1B36] leading-relaxed text-xs">
            
            {/* SECTION 1 */}
            <div className="space-y-3">
              <h3 className="font-extrabold text-sm text-[#0B1B36] flex items-center gap-2 border-b border-[#0B1B36]/10 pb-2">
                <FileText size={16} className="text-[#0B1B36]" /> 1. Acceptance of Binding Legal Agreement and Covenant
              </h3>
              <p className="text-[#0B1B36]/80 leading-relaxed">
                By accessing, browsing, registering an account with, or otherwise utilizing the digital platform, terminal interfaces, and associated services provided by Future Gate Global (hereinafter referred to as &quot;FGG&quot;, &quot;the Corporation&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;), you, the individual user or corporate entity acting as a registered &quot;Agent&quot; (hereinafter referred to as &quot;you&quot;, &quot;your&quot;, or &quot;Agent&quot;), explicitly acknowledge, covenant, and agree to be bound by the entirety of these Terms and Conditions. This legally binding accord encompasses all supplementary operational guidelines, fee schedules, tier upgrade protocols, privacy declarations, and regulatory addendums subsequently published by FGG.
              </p>
              <p className="text-[#0B1B36]/80 leading-relaxed">
                If you do not unequivocally assent to every covenant, restriction, financial condition, and operational obligation contained herein, you are strictly prohibited from maintaining an active profile, executing marketplace tasks, transferring fiat or digital currency, or utilizing the FGG technological infrastructure. Continued use of the platform following any modification or amendment to these terms constitutes your irrevocable acceptance of such changes.
              </p>
            </div>

            {/* SECTION 2 */}
            <div className="space-y-3 pt-6 border-t border-[#0B1B36]/10">
              <h3 className="font-extrabold text-sm text-[#0B1B36] flex items-center gap-2 border-b border-[#0B1B36]/10 pb-2">
                <FileText size={16} className="text-[#0B1B36]" /> 2. Agent Registration, Account Integrity, and Security Protocols
              </h3>
              <p className="text-[#0B1B36]/80 leading-relaxed">
                Registration as an Agent within the FGG terminal requires the provision of accurate, verifiable, and current biographical and contact information, including a valid email address and secure credentials. Each Agent is solely responsible for maintaining the absolute confidentiality of their account password, cryptographic session keys, and authentication tokens. FGG shall assume no liability whatsoever for unauthorized access resulting from user negligence, compromised credentials, or shared device environments. Furthermore, users acknowledge that FGG, its administrators, and technical partners bear no responsibility or liability for uncompleted task submissions, order execution failures, or delayed authentication attempts resulting from technical glitches, server interruptions, or device-side connectivity anomalies.
              </p>
              <p className="text-[#0B1B36]/80 leading-relaxed">
                Furthermore, every Agent is strictly limited to operating a single registered account per individual. The deliberate creation of multiple accounts, synthetic profiles, or automated bot networks designed to manipulate referral commissions, circumvent daily task limits, or exploit platform incentives is classified as a material breach of contract. FGG administration maintains the absolute right to suspend, freeze, or permanently terminate any account suspected of fraudulent registration, multi-accounting, or systemic protocol manipulation without prior notice or financial recourse.
              </p>
            </div>

            {/* SECTION 3 */}
            <div className="space-y-3 pt-6 border-t border-[#0B1B36]/10">
              <h3 className="font-extrabold text-sm text-[#0B1B36] flex items-center gap-2 border-b border-[#0B1B36]/10 pb-2">
                <FileText size={16} className="text-[#0B1B36]" /> 3. Category Tiers, Activation Fees, and Progressive Upgrade Framework
              </h3>
              <p className="text-[#0B1B36]/80 leading-relaxed">
                FGG operates a structured, multi-category commercial marketplace encompassing diverse industry sectors, including but not limited to Electronics, Furniture, Solar Systems, Electric Mobility, and Real Estate. Access to specific commercial categories requires the initial payment of non-refundable Tier activation fees through approved regional payment gateways such as Telebirr or Commercial Bank of Ethiopia (CBE).
              </p>
              <p className="text-[#0B1B36]/80 leading-relaxed">
                Activation fees serve as operational access contributions supporting platform infrastructure and are strictly non-refundable once credited and verified by administrative review. When an Agent elects to transition to a higher commercial tier, FGG implements a progressive upgrade pricing model whereby the Agent is required to pay solely the calculated financial difference between the new tier price and the previously settled tier fee. All upgrade transactions are subject to rigorous manual administrative verification, and fraudulent transaction receipts or fabricated reference codes will result in immediate legal prosecution and forfeiture of account balances. Please note that FGG is not liable for delayed deposit credits, payment gateway downtimes (including Telebirr/CBE outages), or temporary database synchronization discrepancies during upgrade processing.
              </p>
            </div>

            {/* SECTION 4 */}
            <div className="space-y-3 pt-6 border-t border-[#0B1B36]/10">
              <h3 className="font-extrabold text-sm text-[#0B1B36] flex items-center gap-2 border-b border-[#0B1B36]/10 pb-2">
                <FileText size={16} className="text-[#0B1B36]" /> 4. Daily Task Execution Limits and Commission Yield Structures
              </h3>
              <p className="text-[#0B1B36]/80 leading-relaxed">
                Registered Agents across all active tier classes are subject to a standardized operational limit of exactly five (5) marketplace fulfillment tasks per twenty-four (24) hour cycle. Task quotas reset systematically at designated terminal intervals. Agents are required to execute tasks manually or via approved platform logic; any attempt to utilize automated scraping scripts, macro recorders, or third-party bots to execute tasks shall result in immediate account penalization and zeroing of accumulated task yields.
              </p>
              <p className="text-[#0B1B36]/80 leading-relaxed">
                Commission yields and task rewards are calculated dynamically based on the Agent&apos;s active commercial tier configuration. FGG guarantees no fixed or compounding investment returns; all credited yields are directly tied to the successful completion and administrative verification of structured commercial marketplace operations and verified referral network participation. In the event of software bugs, technical interruptions, or system-wide server downtime affecting task completion quotas, FGG reserves the absolute right to adjust ledger records, audit balances, and rectify technical anomalies without assuming financial liability for unfulfilled tasks.
              </p>
            </div>

            {/* SECTION 5 */}
            <div className="space-y-3 pt-6 border-t border-[#0B1B36]/10">
              <h3 className="font-extrabold text-sm text-[#0B1B36] flex items-center gap-2 border-b border-[#0B1B36]/10 pb-2">
                <FileText size={16} className="text-[#0B1B36]" /> 5. Operational Disclaimers, Technical Limitations, and Force Majeure
              </h3>
              <p className="text-[#0B1B36]/80 leading-relaxed">
                Future Gate Global (FGG), its parent entities, administrators, software developers, technical partners, and corporate affiliates shall bear absolutely no financial, legal, or operational liability whatsoever for any direct, indirect, incidental, consequential, special, or exemplary damages arising from technical malfunctions, software bugs, server interruptions, database synchronization delays, third-party payment gateway failures, or temporary downtime of the FGG digital infrastructure. Users and registered Agents are solely responsible for ensuring the stability and security of their personal hardware devices and internet connections.
              </p>
              <p className="text-[#0B1B36]/80 leading-relaxed">
                Furthermore, FGG is completely excused from performance and operational obligations under these Terms and Conditions for any period wherein service delivery, task availability, or financial settlement processing is prevented, hindered, delayed, or disrupted by acts of God, natural catastrophes, widespread telecommunication grid failures, regional conflict, electrical power blackouts, severe cyber-attacks, ransomware incidents, or regulatory restrictions beyond reasonable administrative control. Under no circumstances shall FGG be held financially accountable for service interruptions or technical discrepancies originating from external force majeure events or unforeseen software anomalies.
              </p>
            </div>

            {/* SECTION 6 */}
            <div className="space-y-3 pt-6 border-t border-[#0B1B36]/10">
              <h3 className="font-extrabold text-sm text-[#0B1B36] flex items-center gap-2 border-b border-[#0B1B36]/10 pb-2">
                <FileText size={16} className="text-[#0B1B36]" /> 6. Governing Law, Amendments, and Dispute Resolution
              </h3>
              <p className="text-[#0B1B36]/80 leading-relaxed">
                These Terms and Conditions shall be interpreted, construed, and enforced in accordance with applicable commercial and digital governance standards. FGG administration reserves the right to modify, amend, append, or completely overhaul these terms at any time without direct individual notification to Agents. It remains the sole obligation of the Agent to periodically review this legal document for updates. Continued retention of an active FGG account signifies binding agreement to all current and antecedent provisions.
              </p>
            </div>

          </div>

        </div>
      </main>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <MobileBottomNav />

    </div>
  );
}