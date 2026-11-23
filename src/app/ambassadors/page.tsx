// src/app/ambassador/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Award,
  LogOut,
  RefreshCw,
  Copy,
  Check,
  Phone,
  Lock,
  Wallet,
  KeyRound,
  Save,
  Share2,
  Users,
  UserPlus,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface AmbassadorProfile {
  id: string;
  username?: string;
  full_name?: string;
  custom_ref_code?: string;
  phone_number?: string;
  payout_bank_account?: string;
  total_bounty_earned?: number;
  total_referrals?: number;
  referred_agents_count?: number;
  status?: string;
}

const SESSION_KEY = 'ambassador_portal_session_v1';

export default function AmbassadorPortalPage() {
  const [sessionChecked, setSessionChecked] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  const [profile, setProfile] = useState<AmbassadorProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [activeEatWindow, setActiveEatWindow] = useState(true);

  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Self-service payout rail & password update state
  const [payoutRailInput, setPayoutRailInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const syncEatWindow = useCallback(() => {
    const eatDay = new Date(
      new Date().toLocaleString('en-US', { timeZone: 'Africa/Addis_Ababa' })
    ).getDay();
    setActiveEatWindow(eatDay >= 1 && eatDay <= 6); // Monday (1) through Saturday (6)
  }, []);

  const fetchReferredAgentsCount = useCallback(
    async (ambId: string, refCode?: string): Promise<number> => {
      try {
        const { data, error } = await supabase.rpc('get_ambassador_referred_agents_count', {
          p_ambassador_id: ambId,
          p_ref_code: refCode ?? '',
        });
        if (!error && typeof data === 'number') {
          return data;
        }
      } catch {
        // ignore RPC fallback error
      }
      return 0;
    },
    []
  );

  const refreshProfile = useCallback(
    async (currentProfile: AmbassadorProfile | null) => {
      syncEatWindow();
      if (!currentProfile?.id) return;
      setLoadingProfile(true);
      try {
        const { data: row, error } = await supabase
          .from('ambassadors')
          .select(
            'id, username, full_name, custom_ref_code, phone_number, payout_bank_account, total_bounty_earned, total_referrals, status'
          )
          .eq('id', currentProfile.id)
          .maybeSingle();

        const base = (!error && row ? (row as AmbassadorProfile) : currentProfile) as AmbassadorProfile;
        const agentsCount = await fetchReferredAgentsCount(base.id, base.custom_ref_code);
        const updated: AmbassadorProfile = {
          ...base,
          referred_agents_count: Math.max(
            Number(base.total_referrals ?? 0),
            agentsCount
          ),
        };

        setProfile(updated);
        setPayoutRailInput(updated.payout_bank_account ?? '');
        try {
          window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(updated));
        } catch {
          // ignore storage errors
        }
      } finally {
        setLoadingProfile(false);
      }
    },
    [syncEatWindow, fetchReferredAgentsCount]
  );

  useEffect(() => {
    syncEatWindow();
    let parsed: AmbassadorProfile | null = null;
    try {
      const saved = window.sessionStorage.getItem(SESSION_KEY);
      if (saved) {
        parsed = JSON.parse(saved) as AmbassadorProfile;
        if (parsed?.id) {
          setProfile(parsed);
          setPayoutRailInput(parsed.payout_bank_account ?? '');
        }
      }
    } catch {
      // ignore storage errors
    } finally {
      setSessionChecked(true);
    }

    if (parsed?.id) {
      refreshProfile(parsed);
    }
  }, [syncEatWindow, refreshProfile]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSigningIn(true);
    setAuthError(null);
    syncEatWindow();

    try {
      const { data, error } = await supabase.rpc('verify_ambassador_login', {
        p_phone: phoneInput.trim(),
        p_password: passwordInput,
      });

      if (error) {
        setAuthError(error.message);
        return;
      }

      const matched =
        Array.isArray(data) && data.length > 0 ? (data[0] as AmbassadorProfile) : null;
      if (!matched) {
        setAuthError('Invalid phone number or password.');
        return;
      }

      const agentsCount = await fetchReferredAgentsCount(matched.id, matched.custom_ref_code);
      const hydrated: AmbassadorProfile = {
        ...matched,
        referred_agents_count: Math.max(
          Number(matched.total_referrals ?? 0),
          agentsCount
        ),
      };

      setProfile(hydrated);
      setPayoutRailInput(hydrated.payout_bank_account ?? '');
      setPasswordInput('');
      try {
        window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(hydrated));
      } catch {
        // ignore storage errors
      }
      refreshProfile(hydrated);
    } catch (err: any) {
      setAuthError(err?.message || 'Unable to sign in.');
    } finally {
      setSigningIn(false);
    }
  };

  const handleSignOut = () => {
    setProfile(null);
    setPasswordInput('');
    setNewPasswordInput('');
    setSettingsMessage(null);
    try {
      window.sessionStorage.removeItem(SESSION_KEY);
    } catch {
      // ignore storage errors
    }
  };

  const handleCopyCode = () => {
    const code = profile?.custom_ref_code;
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 1800);
  };

  const handleCopyInviteText = () => {
    const code = profile?.custom_ref_code;
    if (!code) return;
    const shareText = `Join with Ambassador Referral Code: ${code}`;
    navigator.clipboard.writeText(shareText);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 1800);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id) return;

    setSavingSettings(true);
    setSettingsMessage(null);

    try {
      const updatePayload: Record<string, any> = {
        payout_bank_account: payoutRailInput.trim(),
      };

      if (newPasswordInput.trim() !== '') {
        updatePayload.password_hash = newPasswordInput;
      }

      const { error } = await supabase
        .from('ambassadors')
        .update(updatePayload)
        .eq('id', profile.id);

      if (error) {
        setSettingsMessage({ type: 'error', text: error.message });
        return;
      }

      const nextProfile: AmbassadorProfile = {
        ...profile,
        payout_bank_account: payoutRailInput.trim(),
      };
      setProfile(nextProfile);
      setNewPasswordInput('');
      try {
        window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(nextProfile));
      } catch {
        // ignore storage errors
      }
      setSettingsMessage({
        type: 'success',
        text: 'Payout details and login credentials updated.',
      });
    } catch (err: any) {
      setSettingsMessage({
        type: 'error',
        text: err?.message || 'Failed to save updates.',
      });
    } finally {
      setSavingSettings(false);
    }
  };

  if (!sessionChecked) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] font-mono flex items-center justify-center p-6 text-xs text-slate-500">
        Checking ambassador session...
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] font-mono flex items-center justify-center p-4">
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-sm space-y-6">
          <div>
            <div className="flex items-center gap-2 text-[#0B1B36]">
              <Award size={20} className="text-emerald-600" />
              <h1 className="text-xl font-black">Ambassador Sign In</h1>
            </div>
            <p className="text-xs text-slate-500 font-sans mt-1">
              Sign in with your phone number and password to view your referral code, total agents referred, 7% bounty earnings, and payout details.
            </p>
          </div>

          <form onSubmit={handleSignIn} className="space-y-4 font-sans text-xs">
            <div>
              <label className="block font-bold mb-1 font-mono">Phone Number</label>
              <div className="relative">
                <Phone size={15} className="absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="tel"
                  required
                  placeholder="+251911223344 or 0911223344"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  className="w-full pl-10 pr-3 py-3 rounded-xl border border-slate-300 font-mono font-bold focus:outline-none focus:border-[#0B1B36]"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold mb-1 font-mono">Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full pl-10 pr-3 py-3 rounded-xl border border-slate-300 font-bold focus:outline-none focus:border-[#0B1B36]"
                />
              </div>
            </div>

            {authError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 font-mono text-[11px]">
                {authError}
              </div>
            )}

            <button
              type="submit"
              disabled={signingIn}
              className="w-full py-3 bg-[#0B1B36] text-white rounded-xl font-mono font-bold hover:bg-[#152d56] transition-all cursor-pointer disabled:opacity-50"
            >
              {signingIn ? 'Signing In...' : 'Sign In with Phone & Password'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] font-mono p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* TOP BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-black text-[#0B1B36]">Ambassador Portal</h1>
            <span
              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                activeEatWindow
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {activeEatWindow ? 'Mon–Sat EAT Active Window' : 'Sunday Pause (EAT)'}
            </span>
            <span
              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full capitalize ${
                (profile.status ?? 'active') === 'active'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {profile.status || 'active'}
            </span>
          </div>
          <p className="text-xs text-slate-500 font-sans mt-1">
            {profile.full_name ? `${profile.full_name} · ` : ''}@{profile.username || 'ambassador'} ·{' '}
            {profile.phone_number}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => refreshProfile(profile)}
            className="p-3 bg-white border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 cursor-pointer"
            title="Refresh Profile"
          >
            <RefreshCw size={15} className={loadingProfile ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={handleSignOut}
            className="px-4 py-3 bg-white border border-slate-300 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-100 flex items-center gap-2 cursor-pointer"
          >
            <LogOut size={15} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Referral Code (7% Bounty)
            </span>
            <Award size={17} className="text-purple-600" />
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xl font-black text-[#0B1B36]">
              {profile.custom_ref_code || 'NOT ASSIGNED'}
            </span>
            {profile.custom_ref_code && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleCopyCode}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                  title="Copy Code"
                >
                  {copiedCode ? (
                    <Check size={13} className="text-emerald-600" />
                  ) : (
                    <Copy size={13} />
                  )}
                  <span>{copiedCode ? 'Copied' : 'Code'}</span>
                </button>
                <button
                  onClick={handleCopyInviteText}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                  title="Copy Referral Share Text"
                >
                  {copiedLink ? (
                    <Check size={13} className="text-emerald-600" />
                  ) : (
                    <Share2 size={13} />
                  )}
                  <span>{copiedLink ? 'Copied' : 'Share'}</span>
                </button>
              </div>
            )}
          </div>
          <div className="text-[11px] font-sans text-slate-500">
            Share code for 7% referral bounty attribution
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Total Agents Referred
            </span>
            <UserPlus size={17} className="text-indigo-600" />
          </div>
          <div className="text-xl font-black text-[#0B1B36]">
            {Number(profile.referred_agents_count ?? profile.total_referrals ?? 0).toLocaleString(
              'en-US'
            )}
          </div>
          <div className="text-[11px] font-sans text-slate-500">
            Total agents attributed to {profile.custom_ref_code || 'your code'}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Approved Referrals
            </span>
            <Users size={17} className="text-blue-600" />
          </div>
          <div className="text-xl font-black text-[#0B1B36]">
            {Number(profile.total_referrals ?? 0).toLocaleString('en-US')}
          </div>
          <div className="text-[11px] font-sans text-slate-500">
            Approved registrations earning 7% bounty
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Total Bounty Earned
            </span>
            <Wallet size={17} className="text-emerald-600" />
          </div>
          <div className="text-xl font-black text-emerald-600">
            ETB{' '}
            {Number(profile.total_bounty_earned ?? 0).toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
          <div className="text-[11px] font-sans text-slate-500">
            Cumulative 7% ambassador bounty balance
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Active Payout Rail
            </span>
            <Wallet size={17} className="text-purple-600" />
          </div>
          <div className="text-sm font-black text-[#0B1B36] break-words">
            {profile.payout_bank_account || 'Not configured'}
          </div>
          <div className="text-[11px] font-sans text-slate-500">
            Telebirr P2P or Commercial Bank of Ethiopia (CBE)
          </div>
        </div>
      </div>

      {/* SELF-SERVICE PAYOUT & PASSWORD SETTINGS */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
        <div>
          <h2 className="text-base font-black text-[#0B1B36]">Payout Rail &amp; Security</h2>
          <p className="text-xs text-slate-500 font-sans mt-0.5">
            Update your Telebirr P2P or CBE payout destination or set a new login password.
          </p>
        </div>

        <form onSubmit={handleSaveSettings} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
          <div>
            <label className="block font-bold mb-1.5 font-mono">
              Payout Rail (Telebirr P2P or CBE)
            </label>
            <input
              type="text"
              required
              placeholder="Telebirr P2P 0911223344 / CBE 1000..."
              value={payoutRailInput}
              onChange={(e) => setPayoutRailInput(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-300 font-bold focus:outline-none focus:border-[#0B1B36]"
            />
          </div>

          <div>
            <label className="block font-bold mb-1.5 font-mono flex items-center gap-1.5">
              <KeyRound size={13} className="text-blue-600" />
              <span>New Password (optional)</span>
            </label>
            <input
              type="password"
              placeholder="Leave blank to keep current password"
              value={newPasswordInput}
              onChange={(e) => setNewPasswordInput(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-300 font-bold focus:outline-none focus:border-[#0B1B36]"
            />
          </div>

          <div className="md:col-span-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            {settingsMessage ? (
              <div
                className={`px-3.5 py-2 rounded-xl font-mono text-[11px] ${
                  settingsMessage.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}
              >
                {settingsMessage.text}
              </div>
            ) : (
              <span className="text-[11px] text-slate-400">
                Password updates are automatically bcrypt-hashed on save.
              </span>
            )}

            <button
              type="submit"
              disabled={savingSettings}
              className="px-5 py-3 bg-[#0B1B36] text-white rounded-xl font-mono font-bold hover:bg-[#152d56] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save size={14} />
              <span>{savingSettings ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}