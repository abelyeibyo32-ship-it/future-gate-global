// src/app/profile/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Users,
  ShieldCheck,
  User,
  Phone,
  Calendar,
  Lock,
  LogOut,
  Menu,
  X,
  CheckCircle2,
  Clock,
  Copy,
  TrendingUp,
  DollarSign,
  Loader2,
  KeyRound
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useFGGSystem } from '@/lib/useFGGSystem';
import Navbar from '@/lib/components/Navbar';
import MobileBottomNav from '@/lib/components/MobileBottomNav';

interface ReferralStat {
  totalReferrals: number;
  activeReferrals: number;
  totalCommission: number;
}

export default function ProfilePage() {
  const router = useRouter();
  const { state, timeUntilReset } = useFGGSystem();
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Agent State (Database-backed)
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [fullName, setFullName] = useState<string>('Loading...');
  const [phone, setPhone] = useState<string>('Loading...');
  const [registeredDate, setRegisteredDate] = useState<string>('Loading...');
  const [agentIdTag, setAgentIdTag] = useState<string>('FGG-AGT-----');

  // 10-Month Contract State (Client-safe initialization)
  const [contractStartDate, setContractStartDate] = useState<Date | null>(null);
  const [contractEndDate, setContractEndDate] = useState<Date | null>(null);
  const [daysRemaining, setDaysRemaining] = useState<number>(300);
  const [isContractActive, setIsContractActive] = useState<boolean>(true);

  // Tier & Capital Balances
  const [agentTier, setAgentTier] = useState<string>('Electronics');
  const [dbCapital, setDbCapital] = useState<number>(10500);

  // Edit Forms State
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Password Modal State
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Referral Engine State
  const [referralCode, setReferralCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState<ReferralStat>({
    totalReferrals: 0,
    activeReferrals: 0,
    totalCommission: 0,
  });

  useEffect(() => {
    setIsMounted(true);
    fetchUserProfileAndReferrals();
  }, []);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  const fetchUserProfileAndReferrals = async () => {
    setIsLoading(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) {
        setIsLoading(false);
        return;
      }
      const userId = authData.user.id;
      setCurrentUserId(userId);

      // 1. Fetch Ground-Truth Agent Profile Record from Database
      const { data: agentData } = await supabase
        .from('agents')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (agentData) {
        setFullName(agentData.full_name || agentData.username || 'Agent User');
        setPhone(agentData.phone || 'Not Set');
        if (agentData.tier) setAgentTier(agentData.tier);
        if (agentData.capital_balance) setDbCapital(Number(agentData.capital_balance));

        // 10-Month Contract Term Calculation
        const createdAt = agentData.created_at ? new Date(agentData.created_at) : new Date();
        setContractStartDate(createdAt);

        const expDate = new Date(createdAt);
        expDate.setMonth(expDate.getMonth() + 10);
        setContractEndDate(expDate);

        const now = new Date();
        const diffMs = expDate.getTime() - now.getTime();
        const daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
        setDaysRemaining(daysLeft);
        setIsContractActive(diffMs > 0);

        setRegisteredDate(createdAt.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }));
        setAgentIdTag(`FGG-AGT-${userId.substring(0, 6).toUpperCase()}`);
      }

      // 2. Fetch or Generate Referral Code
      let code = agentData?.referral_code;
      if (!code) {
        code = `FGG-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        await supabase.from('agents').update({ referral_code: code }).eq('id', userId);
      }
      setReferralCode(code);

      // 3. Compute Downline Commission (7%) using the agent's UUID (userId)
      let totalCount = 0;
      let totalComm = 0;

      const { data: referredAgents, error: refError } = await supabase
        .from('agents')
        .select('id, referred_by')
        .eq('referred_by', userId); // FIXED: Correctly query referred_by using the user's UUID

      if (!refError && referredAgents && referredAgents.length > 0) {
        totalCount = referredAgents.length;
        const referredIds = referredAgents.map((a) => a.id);

        const { data: txData, error: txError } = await supabase
          .from('transaction_requests')
          .select('amount, status')
          .in('agent_id', referredIds);

        if (!txError && txData) {
          totalComm = txData.reduce((acc, tx) => {
            if (tx.status === 'approved' || tx.status === 'pending') {
              return acc + Number(tx.amount || 0) * 0.07;
            }
            return acc;
          }, 0);
        }
      }

      setStats({
        totalReferrals: totalCount,
        activeReferrals: totalCount,
        totalCommission: totalComm,
      });

    } catch (err) {
      console.error('Error fetching profile data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const referralLink = typeof window !== 'undefined' && referralCode
    ? `${window.location.origin}/signup?ref=${referralCode}` 
    : `Loading referral link...`;

  const copyToClipboard = () => {
    if (!referralCode) return;
    navigator.clipboard.writeText(`${window.location.origin}/signup?ref=${referralCode}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
    showToast('Referral link copied to clipboard.');
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserId) return;
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('agents')
        .update({
          full_name: fullName.trim(),
          phone: phone.trim(),
        })
        .eq('id', currentUserId);

      if (error) throw error;

      setIsEditing(false);
      showToast('Profile name and phone updated in database.');
    } catch (err: any) {
      console.error('Error updating profile:', err);
      showToast(`Update failed: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast('Passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      showToast('Password must be at least 6 characters.');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      showToast('Password updated successfully.');
      setIsPasswordModalOpen(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error('Error updating password:', err);
      showToast(`Password update failed: ${err.message}`);
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  if (!isMounted) return <div className="min-h-screen bg-[#F5F7FA]" />;

  const activeCategory = state?.activeCategory ?? agentTier ?? 'Electronics';
  const capitalBalance = state?.capitalBalance ?? dbCapital ?? 10500;

  const initials = fullName !== 'Loading...' && fullName
    ? fullName
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((n) => n[0])
        .join('')
        .toUpperCase()
    : 'AG';

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#0B1B36] font-sans flex selection:bg-[#0B1B36] selection:text-white relative pb-28 lg:pb-0">
      
      {/* NOTIFICATION TOAST */}
      {notification && (
        <div className="fixed bottom-24 lg:bottom-6 right-6 z-50 bg-[#0B1B36] text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-white/20 text-xs font-mono flex items-center gap-3 animate-in fade-in">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
          <span>{notification}</span>
        </div>
      )}

      {/* PASSWORD CHANGE MODAL */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B1B36]/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-[#AEB8C4]/40 shadow-2xl font-mono space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#AEB8C4]/30 pb-3">
              <h3 className="text-base font-extrabold text-[#0B1B36] flex items-center gap-2">
                <KeyRound size={18} /> Update Password
              </h3>
              <button onClick={() => setIsPasswordModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-500">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handlePasswordUpdate} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-[#536171] uppercase tracking-wider text-[10px]">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 6 chars)"
                  className="w-full px-4 py-3 rounded-xl bg-[#F5F7FA] border border-[#AEB8C4]/50 font-bold text-[#0B1B36] focus:outline-none focus:border-[#0B1B36]"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-[#536171] uppercase tracking-wider text-[10px]">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full px-4 py-3 rounded-xl bg-[#F5F7FA] border border-[#AEB8C4]/50 font-bold text-[#0B1B36] focus:outline-none focus:border-[#0B1B36]"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-200 text-[#0B1B36] font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingPassword}
                  className="px-5 py-2.5 rounded-xl bg-[#0B1B36] text-white font-bold text-xs flex items-center gap-2"
                >
                  {isUpdatingPassword && <Loader2 size={14} className="animate-spin" />}
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Navbar 
        activeCategory={activeCategory} 
        isMobileOpen={isMobileMenuOpen} 
        onCloseMobile={() => setIsMobileMenuOpen(false)} 
      />

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col min-w-0">
        
        {/* TOP HEADER */}
        <header className="bg-white/95 backdrop-blur-md border-b border-[#AEB8C4]/40 px-4 sm:px-8 py-3.5 flex items-center justify-between sticky top-0 z-30 font-mono">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 text-[#0B1B36] hover:bg-[#F5F7FA] rounded-xl transition border border-[#AEB8C4]/30"
              aria-label="Open menu"
            >
              <Menu size={19} />
            </button>
            <div className="text-xs text-[#536171] hidden sm:flex items-center gap-2.5">
              <span className="font-extrabold text-[#0B1B36]">Agent Profile & Credentials</span>
              <span className="text-[#AEB8C4]">/</span>
              <span className="inline-flex items-center gap-1.5 text-[#0B1B36] bg-slate-100 border border-slate-300 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Calculated 10-Mo Contract Active
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#0B1B36] text-white text-[11px] font-mono shadow-xs">
              <Clock size={12} className="text-white" />
              <span className="text-[#AEB8C4]">Settlement Cycle:</span>
              <span className="font-bold text-white">{timeUntilReset || '23:59:59'}</span>
            </div>
            <Link
              href="/dashboard"
              className="px-3.5 py-1.5 rounded-xl bg-[#F5F7FA] hover:bg-[#0B1B36] hover:text-white border border-[#AEB8C4]/40 text-xs font-mono font-bold transition"
            >
              Workspace
            </Link>
          </div>
        </header>

        {/* WORKSPACE CONTAINER */}
        <div className="p-4 sm:p-8 space-y-6 max-w-5xl mx-auto w-full font-mono">
          
          {/* PROFILE BANNER CARD */}
          <div className="bg-gradient-to-br from-[#0B1B36] via-[#0B1B36] to-[#0E2447] text-white rounded-3xl p-6 sm:p-8 border border-white/10 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white text-[#0B1B36] flex items-center justify-center font-extrabold text-2xl sm:text-3xl shadow-lg border border-white/20 shrink-0">
                {initials}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-widest text-white/70 font-bold">Standard Agent</span>
                  <span className="px-2 py-0.5 rounded bg-white/15 text-white border border-white/25 text-[9px]">Verified ID</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">{fullName}</h1>
                <p className="text-xs text-[#AEB8C4]">
                  Agent ID: <strong className="text-white">{agentIdTag}</strong>
                </p>
              </div>
            </div>

            <div className="bg-white/10 border border-white/20 rounded-2xl p-4 text-xs space-y-1.5 shrink-0 w-full md:w-auto">
              <div className="text-[#AEB8C4] text-[10px] uppercase flex items-center justify-between gap-4">
                <span>Active Clearing Tier</span>
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                  isContractActive ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
                }`}>
                  10-Mo Term ({daysRemaining} days left)
                </span>
              </div>
              <div className="text-white font-extrabold text-sm flex items-center justify-between gap-4">
                <span>{activeCategory}</span>
                <span className="text-xs bg-white text-[#0B1B36] px-2 py-0.5 rounded font-bold">Fixed 10-Mo</span>
              </div>
              <div className="text-[10px] text-[#AEB8C4] pt-1 border-t border-white/10 flex justify-between gap-4">
                <span>Capital Balance:</span>
                <span className="font-bold text-white">ETB {capitalBalance.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* PROFILE DETAILS & SETTINGS GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* PERSONAL CREDENTIALS (7 COLS) */}
            <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-[#AEB8C4]/40 shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b border-[#AEB8C4]/30 pb-4">
                <div>
                  <h2 className="text-base font-extrabold text-[#0B1B36]">Account Credentials</h2>
                  <p className="text-[11px] text-[#536171]">Manage verified personal details & phone</p>
                </div>
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-3 py-1.5 rounded-xl bg-[#0B1B36] text-white text-xs font-bold hover:bg-[#152d56] transition cursor-pointer"
                  >
                    Edit Profile
                  </button>
                ) : (
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-3 py-1.5 rounded-xl bg-slate-200 text-[#0B1B36] text-xs font-bold hover:bg-slate-300 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
              </div>

              {!isEditing ? (
                <div className="space-y-4 text-xs">
                  <div className="p-4 rounded-2xl bg-[#F5F7FA] border border-[#AEB8C4]/30 flex items-center justify-between">
                    <span className="text-[#536171] flex items-center gap-2"><User size={15} className="text-[#0B1B36]" /> Full Legal Name</span>
                    <span className="font-bold text-[#0B1B36]">{fullName}</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#F5F7FA] border border-[#AEB8C4]/30 flex items-center justify-between">
                    <span className="text-[#536171] flex items-center gap-2"><Phone size={15} className="text-[#0B1B36]" /> Mobile / Telebirr Number</span>
                    <span className="font-bold text-[#0B1B36]">{phone}</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#F5F7FA] border border-[#AEB8C4]/30 flex items-center justify-between">
                    <span className="text-[#536171] flex items-center gap-2"><Calendar size={15} className="text-[#0B1B36]" /> 10-Month Contract Term</span>
                    <span className="font-bold text-[#0B1B36]">
                      {registeredDate} — {contractEndDate ? contractEndDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Loading...'}
                    </span>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
                  <div className="space-y-1.5">
                    <label className="font-bold text-[#536171] uppercase tracking-wider text-[10px]">Full Legal Name</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-[#F5F7FA] border border-[#AEB8C4]/50 font-bold text-[#0B1B36] focus:outline-none focus:border-[#0B1B36]"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-[#536171] uppercase tracking-wider text-[10px]">Mobile / Telebirr Number</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-[#F5F7FA] border border-[#AEB8C4]/50 font-bold text-[#0B1B36] focus:outline-none focus:border-[#0B1B36]"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSaving}
                    className="w-full py-3.5 rounded-xl bg-[#0B1B36] text-white font-bold uppercase tracking-wider hover:bg-[#152d56] transition cursor-pointer shadow-md flex items-center justify-center gap-2"
                  >
                    {isSaving && <Loader2 size={16} className="animate-spin" />}
                    Save Changes
                  </button>
                </form>
              )}
            </div>

            {/* SECURITY & SESSION (5 COLS) */}
            <div className="lg:col-span-5 bg-white rounded-3xl p-6 sm:p-8 border border-[#AEB8C4]/40 shadow-xs space-y-6 flex flex-col justify-between">
              <div className="space-y-5">
                <div className="border-b border-[#AEB8C4]/30 pb-4">
                  <h2 className="text-base font-extrabold text-[#0B1B36]">Security & Compliance</h2>
                  <p className="text-[11px] font-mono text-[#536171]">Authentication & security controls</p>
                </div>

                <div className="space-y-3 text-xs font-mono">
                  <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-3">
                    <CheckCircle2 size={18} className="text-emerald-700 shrink-0" />
                    <div>
                      <div className="font-bold">KYC Identity Verified</div>
                      <div className="text-[10px] text-emerald-700">Level 2 Standard Agent Clearance</div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#F5F7FA] border border-[#AEB8C4]/30 flex items-center justify-between">
                    <span className="text-[#536171] flex items-center gap-2"><Lock size={14} /> Password</span>
                    <button
                      onClick={() => setIsPasswordModalOpen(true)}
                      className="text-xs font-bold text-[#0B1B36] underline hover:text-blue-700 cursor-pointer"
                    >
                      Change Password
                    </button>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#F5F7FA] border border-[#AEB8C4]/30 flex items-center justify-between">
                    <span className="text-[#536171] flex items-center gap-2"><ShieldCheck size={14} /> 2FA Authentication</span>
                    <span className="font-bold text-emerald-700">Active</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-[#AEB8C4]/30">
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full py-3.5 rounded-2xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer font-mono"
                >
                  <LogOut size={15} /> Sign Out
                </button>
              </div>
            </div>

          </div>

          {/* FULLY INTEGRATED REFERRAL ENGINE SECTION */}
          <div className="bg-gradient-to-br from-[#0B1B36] via-[#0B1B36] to-[#0E2447] text-white rounded-3xl p-6 sm:p-8 border border-white/10 shadow-xl space-y-6">
            <div>
              <div className="text-[10px] text-white/70 uppercase tracking-widest font-bold">
                Global Affiliate & Agent Network
              </div>
              <h2 className="text-xl font-extrabold tracking-tight mt-1">
                Your Referral & Commission Node
              </h2>
              <p className="text-xs text-[#AEB8C4] mt-1 max-w-xl leading-relaxed">
                Invite new standard agents to FGG. Earn an automated 7% commission yield from their account tier fees directly into your balance.
              </p>
            </div>

            <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-2">
              <span className="text-[10px] text-[#AEB8C4] uppercase tracking-wider font-bold">Your Unique Referral Link</span>
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <input
                  type="text"
                  readOnly
                  value={referralLink}
                  className="w-full bg-[#0B1B36] border border-white/20 rounded-xl px-4 py-3 text-xs text-white select-all outline-none font-mono"
                />
                <button
                  onClick={copyToClipboard}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white text-[#0B1B36] hover:bg-[#AEB8C4] transition text-xs font-extrabold flex items-center justify-center gap-2 shrink-0 cursor-pointer font-mono"
                >
                  {copied ? <CheckCircle2 size={16} className="text-emerald-600" /> : <Copy size={16} />}
                  {copied ? 'Copied Link!' : 'Copy Link'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="bg-white/5 p-5 rounded-2xl border border-white/15 space-y-1">
                <div className="text-[10px] text-[#AEB8C4] uppercase tracking-wider font-bold flex items-center gap-2">
                  <Users size={14} className="text-white" /> Total Referrals
                </div>
                <div className="text-xl sm:text-2xl font-extrabold text-white">
                  {stats.totalReferrals} Agents
                </div>
              </div>

              <div className="bg-white/5 p-5 rounded-2xl border border-white/15 space-y-1">
                <div className="text-[10px] text-[#AEB8C4] uppercase tracking-wider font-bold flex items-center gap-2">
                  <TrendingUp size={14} className="text-emerald-400" /> Active Nodes
                </div>
                <div className="text-xl sm:text-2xl font-extrabold text-emerald-400">
                  {stats.activeReferrals} Active
                </div>
              </div>

              <div className="bg-white/5 p-5 rounded-2xl border border-white/15 space-y-1">
                <div className="text-[10px] text-[#AEB8C4] uppercase tracking-wider font-bold flex items-center gap-2">
                  <DollarSign size={14} className="text-blue-300" /> Referral Earnings (7%)
                </div>
                <div className="text-xl sm:text-2xl font-extrabold text-blue-300">
                  ETB {stats.totalCommission.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>

      <MobileBottomNav />

    </div>
  );
}