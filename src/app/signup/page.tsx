// src/app/signup/page.tsx
'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Loader2,
  Globe,
  ShieldCheck,
  Upload,
  Smartphone,
  Building2,
  Layers,
  Lock,
  Copy,
  Check,
  AlertCircle,
} from 'lucide-react';

function normalizePhone(rawPhone: string): string {
  const digitsOnly = rawPhone.replace(/\D/g, '');
  if (digitsOnly.startsWith('251') && digitsOnly.length === 12) {
    return `0${digitsOnly.slice(3)}`;
  }
  return digitsOnly;
}

function phoneToAuthEmail(rawPhone: string): string {
  const normalized = normalizePhone(rawPhone);
  return `phone_${normalized}@fgg.local`;
}

const CATEGORY_TIERS = [
  {
    id: 'Electronics',
    name: 'Tier 1: Electronics',
    fee: 10500,
    commission: 'ETB 77.70 / task',
    duration: '10 Months',
    dailyYield: 'ETB 388.50',
    status: 'active',
  },
  {
    id: 'Furniture',
    name: 'Tier 2: Furniture',
    fee: 24000,
    commission: 'ETB 177.60 / task',
    duration: '10 Months',
    dailyYield: 'ETB 888.00',
    status: 'active',
  },
  {
    id: 'Solar Systems',
    name: 'Tier 3: Solar Systems',
    fee: 43000,
    commission: 'ETB 318.20 / task',
    duration: '10 Months',
    dailyYield: 'ETB 1,591.00',
    status: 'active',
  },
  {
    id: 'EV Bikes & Tuk-Tuks',
    name: 'Tier 4: EV Bikes & Tuk-Tuks',
    fee: 70000,
    commission: 'ETB 518.00 / task',
    duration: '10 Months',
    dailyYield: 'ETB 2,590.00',
    status: 'upcoming',
  },
  {
    id: 'Real Estate',
    name: 'Tier 5: Real Estate',
    fee: 110000,
    commission: 'ETB 814.00 / task',
    duration: '10 Months',
    dailyYield: 'ETB 4,070.00',
    status: 'upcoming',
  },
];

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

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function lookupReferrerUuid(rawRef: string): Promise<{
  id: string | null;
  label: string | null;
}> {
  const trimmed = rawRef.trim();
  if (!trimmed) return { id: null, label: null };

  const { data: byCode } = await supabase
    .from('agents')
    .select('id, username, referral_code')
    .ilike('referral_code', trimmed)
    .maybeSingle();

  if (byCode?.id) {
    return {
      id: byCode.id,
      label: byCode.referral_code || byCode.username || byCode.id,
    };
  }

  if (UUID_REGEX.test(trimmed)) {
    const { data: byId } = await supabase
      .from('agents')
      .select('id, username, referral_code')
      .eq('id', trimmed)
      .maybeSingle();

    if (byId?.id) {
      return {
        id: byId.id,
        label: byId.referral_code || byId.username || byId.id,
      };
    }
  }

  return { id: null, label: trimmed };
}

function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlRefCode = searchParams.get('ref');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  const [selectedCategory, setSelectedCategory] = useState(CATEGORY_TIERS[0].id);
  const [paymentMethod, setPaymentMethod] = useState<'telebirr' | 'cbe'>('telebirr');
  const [accountNumber, setAccountNumber] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const [loading, setLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const [assignedAgent, setAssignedAgent] = useState<SuperAgentNode>(DEFAULT_FALLBACK_NODE);
  const [resolvedReferrerId, setResolvedReferrerId] = useState<string | null>(null);
  const [activeRefLabel, setActiveRefLabel] = useState<string | null>(null);
  const [copiedAccount, setCopiedAccount] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchSuperAgentsAndResolve = async () => {
      const explicitRef = urlRefCode?.trim() || null;
      if (explicitRef) {
        localStorage.setItem('fgg_ref_code', explicitRef);
      }

      const candidateRef =
        explicitRef ||
        localStorage.getItem('fgg_ref_code')?.trim() ||
        localStorage.getItem('fgg_referred_by')?.trim() ||
        null;

      if (candidateRef) {
        const { id: matchedReferrerId, label } = await lookupReferrerUuid(candidateRef);
        if (isMounted) {
          setResolvedReferrerId(matchedReferrerId);
          setActiveRefLabel(label);
        }
      } else if (isMounted) {
        setResolvedReferrerId(null);
        setActiveRefLabel(null);
      }

      const { data: nodesData } = await supabase
        .from('super_agents')
        .select('*')
        .order('id', { ascending: true });

      let pool = [DEFAULT_FALLBACK_NODE];
      if (nodesData && nodesData.length > 0) {
        pool = nodesData as SuperAgentNode[];
      }

      if (isMounted) {
        const storageKey = 'fgg_strict_rotation_seq';
        const lastSeq = sessionStorage.getItem(storageKey);
        const nextSeq = lastSeq !== null ? parseInt(lastSeq, 10) + 1 : 0;

        sessionStorage.setItem(storageKey, nextSeq.toString());
        const alternatingIndex = nextSeq % pool.length;

        setAssignedAgent(pool[alternatingIndex]);
      }
    };

    fetchSuperAgentsAndResolve();

    return () => {
      isMounted = false;
    };
  }, [urlRefCode]);

  const handleCopyAccount = (textToCopy: string) => {
    navigator.clipboard.writeText(textToCopy);
    setCopiedAccount(true);
    setTimeout(() => setCopiedAccount(false), 2500);
  };

  const handleFileUpload = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `receipts/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(filePath, file);

      if (uploadError) return null;

      const { data } = supabase.storage.from('receipts').getPublicUrl(filePath);
      return data.publicUrl;
    } catch {
      return null;
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      alert('Password mismatch: Please ensure both passwords match.');
      return;
    }

    if (!receiptFile) {
      alert(
        'Payment screenshot proof is mandatory! Please upload your transaction receipt before submitting your registration.'
      );
      return;
    }

    if (!agreedToTerms) {
      alert('You must agree to the Terms and Conditions to initialize your agent node.');
      return;
    }

    const cleanPhone = normalizePhone(phoneNumber);
    if (!username.trim() || cleanPhone.length < 9) {
      alert('Please enter a valid username and phone number (e.g. 0911223344).');
      return;
    }

    setLoading(true);

    const { data: existingPhoneUser } = await supabase
      .from('agents')
      .select('id')
      .eq('phone', cleanPhone)
      .maybeSingle();

    if (existingPhoneUser) {
      alert(
        'This phone number is already registered to an existing account. Please sign in or use a different phone number.'
      );
      setLoading(false);
      return;
    }

    let finalReferrerId: string | null = resolvedReferrerId;
    const fallbackRef =
      urlRefCode?.trim() ||
      localStorage.getItem('fgg_ref_code')?.trim() ||
      localStorage.getItem('fgg_referred_by')?.trim() ||
      '';

    if (fallbackRef) {
      const { id } = await lookupReferrerUuid(fallbackRef);
      finalReferrerId = id;
    }

    const receiptUrl = await handleFileUpload(receiptFile);
    if (!receiptUrl) {
      alert(
        'Failed to upload payment receipt. Please check your storage bucket permissions and try again.'
      );
      setLoading(false);
      return;
    }

    const cleanUsername = username.trim();
    const internalAuthKey = phoneToAuthEmail(cleanPhone);

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: internalAuthKey,
      password,
      options: {
        data: {
          username: cleanUsername,
          phone: cleanPhone,
          tier: selectedCategory,
          referred_by: finalReferrerId,
        },
      },
    });

    if (authError || !authData.user) {
      alert(`Signup Error: ${authError?.message}`);
      setLoading(false);
      return;
    }

    const userId = authData.user.id;
    const selectedTierObj = CATEGORY_TIERS.find((t) => t.id === selectedCategory);
    const normalizedTier = selectedTierObj?.id || selectedCategory;
    const newReferralCode = `FGG-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const { error: agentError } = await supabase.from('agents').upsert(
      [
        {
          id: userId,
          username: cleanUsername,
          phone: cleanPhone,
          referral_code: newReferralCode,
          referred_by: finalReferrerId,
          tier: normalizedTier,
          capital_balance: 0,
          balance: 0,
          total_earnings: 0,
        },
      ],
      { onConflict: 'id' }
    );

    if (agentError) {
      console.error('Agent Profile Upsert Error:', agentError);
      alert(`Agent Profile Error: ${agentError.message}`);
      setLoading(false);
      return;
    }

    localStorage.setItem('fgg_current_user_id', userId);
    localStorage.setItem('fgg_current_phone', cleanPhone);

    const { error: reqError } = await supabase.from('transaction_requests').insert([
      {
        tier: normalizedTier,
        transaction_ref: `REF-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
        type: 'registration',
        method: paymentMethod,
        amount: selectedTierObj?.fee || 0,
        sender_or_receiver_number: accountNumber.trim(),
        agent_id: userId,
        super_agent_id: assignedAgent.id,
        super_agent_name: assignedAgent.name,
        receipt_url: receiptUrl,
        status: 'pending',
      },
    ]);

    if (reqError) {
      alert(`Transaction Request Error: ${reqError.message}`);
      setLoading(false);
      return;
    }

    localStorage.removeItem('fgg_ref_code');
    localStorage.removeItem('fgg_referred_by');

    setLoading(false);
    setIsSubmitted(true);
  };

  const currentTierData = CATEGORY_TIERS.find((t) => t.id === selectedCategory);
  const activePayNumber =
    paymentMethod === 'telebirr'
      ? assignedAgent.telebirr_account || assignedAgent.phone || '0911223344'
      : assignedAgent.cbe_account || '1000293848592';

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] text-[#0B1B36] font-mono flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-md bg-white p-8 rounded-3xl border border-[#AEB8C4]/40 shadow-xl text-center space-y-6">
          <div className="w-16 h-16 bg-amber-100 text-amber-700 rounded-2xl mx-auto flex items-center justify-center font-extrabold text-2xl shadow-inner">
            ⏳
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-extrabold text-[#0B1B36]">Node Registration Submitted</h2>
            <p className="text-xs text-[#536171] leading-relaxed">
              Your tier buy-in and payment proof have been successfully routed to{' '}
              <strong className="text-[#0B1B36]">{assignedAgent.name}</strong> for verification. You
              will gain full terminal access once approved.
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-[#F5F7FA] border border-[#AEB8C4]/30 text-left text-[11px] space-y-1 text-[#536171]">
            <div>
              <strong>Status:</strong> Pending Approval
            </div>
            <div>
              <strong>Phone Node:</strong> {normalizePhone(phoneNumber)}
            </div>
            <div>
              <strong>Assigned Node:</strong> {assignedAgent.name}
            </div>
            <div>
              <strong>Selected Tier:</strong> {currentTierData?.name}
            </div>
            <div>
              <strong>Buy-In Amount:</strong> ETB {currentTierData?.fee.toLocaleString()}
            </div>
            <div>
              <strong>Contract Duration:</strong> {currentTierData?.duration}
            </div>
            <div>
              <strong>Daily Yield Target:</strong> {currentTierData?.dailyYield}
            </div>
          </div>
          <button
            onClick={() => router.push('/login')}
            className="w-full py-3.5 rounded-xl bg-[#0B1B36] text-white font-bold uppercase tracking-wider text-xs hover:bg-[#152d56] transition cursor-pointer"
          >
            Proceed to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#0B1B36] font-mono flex flex-col justify-center items-center p-4 sm:p-8 selection:bg-[#0B1B36] selection:text-white">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-[#0B1B36] items-center justify-center text-white shadow-xl">
            <Globe size={24} />
          </div>
          <div className="text-xl font-extrabold tracking-wider">Future Gate Global</div>
          <div className="text-[10px] text-[#536171] uppercase tracking-widest">
            Global Clearing &amp; Escrow Terminal
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 text-blue-900 p-4 rounded-2xl space-y-1 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-extrabold">
            <Layers size={16} className="text-blue-600" /> Standard Public Node Registration
          </div>
          <p className="text-[11px] text-blue-700 leading-relaxed">
            Assigned to alternating node:{' '}
            <strong className="text-blue-900 font-bold">{assignedAgent.name}</strong> (
            {assignedAgent.region || 'Central'}).{' '}
            {resolvedReferrerId && (
              <span className="block text-emerald-700 font-bold mt-0.5">
                ✓ Valid referral link detected ({activeRefLabel || 'Linked'}).
              </span>
            )}
          </p>
        </div>

        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#AEB8C4]/40 shadow-xl space-y-6">
          <div>
            <h2 className="text-base font-extrabold text-[#0B1B36]">
              Agent Onboarding &amp; Tier Activation
            </h2>
            <p className="text-[11px] text-[#536171] mt-1">
              Register using your phone number and submit tier buy-in payment proof for review.
            </p>
          </div>

          <form onSubmit={handleSignup} className="space-y-5 text-xs">
            <div className="space-y-4">
              <div className="text-[10px] font-bold text-[#0B1B36] uppercase tracking-wider border-b border-[#AEB8C4]/30 pb-1.5">
                1. Operator Credentials (Phone Primary)
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-[#536171] uppercase text-[10px]">
                    Username / Full Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-[#F5F7FA] border border-[#AEB8C4]/50 focus:outline-none focus:border-[#0B1B36] font-bold text-xs"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-[#536171] uppercase text-[10px]">
                    Phone Number (Primary Login ID)
                  </label>
                  <input
                    type="tel"
                    placeholder="0911223344"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-[#F5F7FA] border border-[#AEB8C4]/50 focus:outline-none focus:border-[#0B1B36] font-bold text-xs"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-[#536171] uppercase text-[10px]">Password</label>
                  <input
                    type="password"
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-[#F5F7FA] border border-[#AEB8C4]/50 focus:outline-none focus:border-[#0B1B36] font-bold text-xs"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-[#536171] uppercase text-[10px]">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-[#F5F7FA] border border-[#AEB8C4]/50 focus:outline-none focus:border-[#0B1B36] font-bold text-xs"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="text-[10px] font-bold text-[#0B1B36] uppercase tracking-wider border-b border-[#AEB8C4]/30 pb-1.5 flex items-center gap-1.5">
                <Layers size={13} /> 2. Select Clearing Tier &amp; Capital Entry
              </div>

              <div className="grid grid-cols-1 gap-3">
                {CATEGORY_TIERS.map((tier) => {
                  const isUpcoming = tier.status === 'upcoming';
                  return (
                    <div
                      key={tier.id}
                      onClick={() => !isUpcoming && setSelectedCategory(tier.id)}
                      className={`p-4 rounded-2xl border transition flex flex-col sm:flex-row justify-between sm:items-center gap-3 ${
                        isUpcoming
                          ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-75'
                          : selectedCategory === tier.id
                          ? 'bg-[#0B1B36] text-white border-[#0B1B36] shadow-md cursor-pointer'
                          : 'bg-[#F5F7FA] text-[#0B1B36] border-[#AEB8C4]/40 hover:bg-[#AEB8C4]/10 cursor-pointer'
                      }`}
                    >
                      <div>
                        <div className="font-extrabold text-sm flex items-center gap-2">
                          {tier.name}
                          {isUpcoming && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[9px] uppercase font-bold">
                              <Lock size={10} /> Upcoming Tier
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] opacity-80 mt-0.5">
                          Duration: {tier.duration} | Daily Yield: {tier.dailyYield}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs font-extrabold">ETB {tier.fee.toLocaleString()}</div>
                        <div className="text-[10px] opacity-90">{tier.commission}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="text-[10px] font-bold text-[#0B1B36] uppercase tracking-wider border-b border-[#AEB8C4]/30 pb-1.5">
                3. Tier Buy-In Payment Proof ({currentTierData?.name} — ETB{' '}
                {currentTierData?.fee.toLocaleString()})
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('telebirr')}
                  className={`p-3 rounded-xl border font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                    paymentMethod === 'telebirr'
                      ? 'bg-[#0B1B36] text-white border-[#0B1B36]'
                      : 'bg-[#F5F7FA] text-[#0B1B36] border-[#AEB8C4]/40'
                  }`}
                >
                  <Smartphone size={15} /> Telebirr
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cbe')}
                  className={`p-3 rounded-xl border font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                    paymentMethod === 'cbe'
                      ? 'bg-[#0B1B36] text-white border-[#0B1B36]'
                      : 'bg-[#F5F7FA] text-[#0B1B36] border-[#AEB8C4]/40'
                  }`}
                >
                  <Building2 size={15} /> CBE Bank
                </button>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#F5F7FA] border border-[#AEB8C4]/30 text-[11px] text-[#536171] space-y-2">
                <div className="flex justify-between items-center">
                  <div className="font-bold text-[#0B1B36]">
                    {paymentMethod === 'telebirr'
                      ? `Telebirr Node Account (${assignedAgent.name}):`
                      : `CBE Escrow Account (${assignedAgent.name}):`}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyAccount(activePayNumber)}
                    className="px-2.5 py-1 rounded-lg bg-white border border-[#AEB8C4]/50 hover:bg-[#0B1B36] hover:text-white transition text-[10px] font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    {copiedAccount ? (
                      <Check size={12} className="text-emerald-600" />
                    ) : (
                      <Copy size={12} />
                    )}
                    {copiedAccount ? 'Copied!' : 'Copy Account'}
                  </button>
                </div>
                <div className="font-mono text-xs font-bold text-[#0B1B36]">{activePayNumber}</div>
                <div className="text-[10px] text-amber-700 font-bold pt-1 border-t border-[#AEB8C4]/20">
                  ⚠️ Send exact entry capital (ETB {currentTierData?.fee.toLocaleString()}) to this
                  live node account before uploading your payment receipt.
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-[#536171] uppercase text-[10px]">
                  Your {paymentMethod === 'telebirr' ? 'Telebirr Phone Number' : 'CBE Account Number'}
                </label>
                <input
                  type="text"
                  placeholder={paymentMethod === 'telebirr' ? '09xxxxxxxx' : '1000xxxxxxxx'}
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-[#F5F7FA] border border-[#AEB8C4]/50 focus:outline-none focus:border-[#0B1B36] font-bold text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between items-center">
                  <label className="font-extrabold text-[#0B1B36] uppercase text-[10px] flex items-center gap-1">
                    <AlertCircle size={13} className="text-rose-600" /> Payment Screenshot Proof{' '}
                    <span className="text-rose-600 font-extrabold">* Required</span>
                  </label>
                  {receiptFile && (
                    <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                      <Check size={12} /> Attached Successfully
                    </span>
                  )}
                </div>

                <label
                  className={`flex flex-col items-center justify-center gap-2 px-4 py-4 rounded-2xl border-2 border-dashed transition cursor-pointer font-bold text-xs ${
                    receiptFile
                      ? 'bg-emerald-50/50 border-emerald-400 text-emerald-900 shadow-xs'
                      : 'bg-rose-50/30 border-rose-300 hover:border-[#0B1B36] text-[#536171]'
                  }`}
                >
                  <Upload
                    size={20}
                    className={receiptFile ? 'text-emerald-600' : 'text-rose-600 animate-pulse'}
                  />
                  <span className="text-center font-bold">
                    {receiptFile
                      ? `Selected: ${receiptFile.name}`
                      : 'Click here to upload payment transaction screenshot'}
                  </span>
                  <span className="text-[10px] font-normal opacity-75">
                    {receiptFile
                      ? 'Click to change file'
                      : 'PNG, JPG, or JPEG accepted (Mandatory for activation)'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => e.target.files && setReceiptFile(e.target.files[0])}
                    className="hidden"
                    required
                  />
                </label>
              </div>
            </div>

            <div className="flex items-start gap-3 pt-2">
              <input
                type="checkbox"
                id="terms"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-[#AEB8C4] text-[#0B1B36] focus:ring-[#0B1B36] cursor-pointer"
                required
              />
              <label
                htmlFor="terms"
                className="text-[11px] text-[#536171] cursor-pointer leading-relaxed"
              >
                I agree to the{' '}
                <span className="font-bold text-[#0B1B36] underline">
                  Future Gate Global Terms &amp; Conditions
                </span>
                , clearing contract obligations, and escrow compliance policies.
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-xl bg-[#0B1B36] hover:bg-[#152d56] text-white font-bold uppercase tracking-wider transition shadow-md cursor-pointer flex items-center justify-center gap-2 mt-4"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading
                ? 'Submitting Request...'
                : `Submit Tier Buy-In & Route to ${assignedAgent.name}`}
            </button>
          </form>
        </div>

        <div className="text-center text-[10px] text-[#536171] flex items-center justify-center gap-1.5">
          <ShieldCheck size={14} /> 256-Bit Encrypted Clearing Session Active
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F5F7FA] text-[#0B1B36] flex items-center justify-center font-mono text-xs">
          <div className="flex items-center gap-3">
            <Loader2 size={16} className="animate-spin text-[#0B1B36]" />
            <span>Initializing FGG Registration Portal...</span>
          </div>
        </div>
      }
    >
      <SignupContent />
    </Suspense>
  );
}