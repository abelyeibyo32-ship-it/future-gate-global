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
  Send,
  CheckCircle2,
  MessageSquare,
  Clock,
  LifeBuoy
} from 'lucide-react';

export default function SupportPage() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [agent, setAgent] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  
  // Ticket Form State
  const [ticketSubject, setTicketSubject] = useState('Payment Verification Issue');
  const [ticketMessage, setTicketMessage] = useState('');
  const [ticketSubmitting, setTicketSubmitting] = useState(false);
  const [ticketSubmitted, setTicketSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
        console.error('Error loading support user data:', err);
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

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketMessage.trim()) {
      setErrorMessage('Please enter your inquiry details or transaction reference code.');
      return;
    }

    setTicketSubmitting(true);
    setErrorMessage(null);

    try {
      // Optional: If you want to save support tickets to Supabase, you can insert here. 
      // For now, we simulate secure transmission to the FGG admin verification queue.
      await new Promise(resolve => setTimeout(resolve, 1000));

      setTicketSubmitted(true);
      setTicketMessage('');
      setTimeout(() => setTicketSubmitted(false), 5000);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to transmit support ticket.');
    } finally {
      setTicketSubmitting(false);
    }
  };

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-[#0B1B36] text-[#AEB8C4] flex items-center justify-center font-mono text-xs">
        <div className="flex items-center gap-3">
          <Loader2 size={16} className="animate-spin text-white" />
          <span>Accessing FGG Support Terminal...</span>
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
            <button onClick={() => router.push('/about')} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[#536171]/30 text-[#AEB8C4] hover:text-white transition cursor-pointer">
              <Globe size={16} /> About Us
            </button>
            <button onClick={() => router.push('/support')} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-[#536171] text-white font-bold transition cursor-pointer">
              <HelpCircle size={16} /> Support Center
            </button>
            <button onClick={() => router.push('/terms')} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[#536171]/30 text-[#AEB8C4] hover:text-white transition cursor-pointer">
              <ShieldAlert size={16} /> Terms & Conditions
            </button>
          </nav>
        </div>

        <div className="p-5 m-4 bg-[#536171]/20 border border-[#536171]/40 rounded-2xl space-y-3 shrink-0">
          <div className="flex items-center gap-2 text-white font-bold text-xs uppercase tracking-wider">
            <LifeBuoy size={14} className="text-[#AEB8C4]" /> Assistance
          </div>
          <p className="text-[11px] text-[#AEB8C4] leading-relaxed">
            24/7 administrative verification and troubleshooting help.
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
                <button onClick={() => { setMobileMenuOpen(false); router.push('/about'); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[#536171]/30 text-[#AEB8C4] cursor-pointer">
                  <Globe size={16} /> About Us
                </button>
                <button onClick={() => { setMobileMenuOpen(false); router.push('/support'); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-[#536171] text-white font-bold cursor-pointer">
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
              Support Center • Help & Administrative Verification
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

        <div className="p-4 sm:p-8 space-y-6 sm:space-y-8 max-w-7xl mx-auto w-full font-mono text-xs">
          
          {/* HERO BANNER */}
          <div className="bg-[#0B1B36] rounded-3xl p-6 sm:p-8 text-white shadow-lg space-y-3 border border-[#536171]/20">
            <div className="flex items-center gap-2 text-[#AEB8C4] uppercase tracking-wider text-[11px]">
              <LifeBuoy size={16} className="text-white" /> FGG Support Helpdesk
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">How can we assist your operations today?</h2>
            <p className="text-xs text-[#AEB8C4] leading-relaxed max-w-3xl">
              Review our verified operational FAQs below regarding deposits, progressive tier upgrades, and daily task limits, or submit a direct inquiry to the administrative verification team.
            </p>
          </div>

          {ticketSubmitted && (
            <div className="p-4 rounded-2xl bg-[#536171]/20 border border-[#536171] text-[#0B1B36] text-xs flex items-center gap-2.5 shadow-xs">
              <CheckCircle2 size={18} className="text-emerald-700 shrink-0" /> 
              <span>Support ticket transmitted successfully! Our administrative team will review your inquiry and transaction reference shortly.</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs shadow-xs">
              {errorMessage}
            </div>
          )}

          {/* MAIN GRID: FAQ & TICKET SUBMISSION */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* FAQ SECTION */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#AEB8C4]/40 shadow-xs space-y-5">
              <div className="flex items-center gap-2 text-[#0B1B36] font-bold text-sm">
                <HelpCircle size={18} /> Frequently Asked Questions
              </div>

              <div className="space-y-3">
                <div className="p-4 bg-[#F5F7FA] rounded-2xl border border-[#AEB8C4]/30 space-y-1.5">
                  <strong className="text-[#0B1B36] block font-bold text-xs">How long do deposit & upgrade verifications take?</strong>
                  <p className="text-[#536171] leading-relaxed">
                    Transaction screenshots and reference codes submitted via Telebirr or Commercial Bank of Ethiopia (CBE) are reviewed and approved by administrators within 15 to 30 minutes.
                  </p>
                </div>

                <div className="p-4 bg-[#F5F7FA] rounded-2xl border border-[#AEB8C4]/30 space-y-1.5">
                  <strong className="text-[#0B1B36] block font-bold text-xs">How does progressive tier pricing work?</strong>
                  <p className="text-[#536171] leading-relaxed">
                    When upgrading from a lower category (e.g., Tier 1 Electronics at 10,500 ETB) to a higher tier (e.g., Tier 2 Furniture at 24,000 ETB), you only pay the exact price difference (13,500 ETB) rather than full price.
                  </p>
                </div>

                <div className="p-4 bg-[#F5F7FA] rounded-2xl border border-[#AEB8C4]/30 space-y-1.5">
                  <strong className="text-[#0B1B36] block font-bold text-xs">What is the daily task execution limit?</strong>
                  <p className="text-[#536171] leading-relaxed">
                    All registered agent tiers are standardized to exactly five (5) marketplace fulfillment tasks per 24-hour cycle. Quotas reset automatically at terminal clock reset.
                  </p>
                </div>

                <div className="p-4 bg-[#F5F7FA] rounded-2xl border border-[#AEB8C4]/30 space-y-1.5">
                  <strong className="text-[#0B1B36] block font-bold text-xs">Are activation fees refundable?</strong>
                  <p className="text-[#536171] leading-relaxed">
                    No. Category activation and tier upgrade fees are non-refundable operational access contributions that grant access to commercial marketplace inventory and task fulfillment yields.
                  </p>
                </div>
              </div>
            </div>

            {/* TICKET SUBMISSION FORM */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#AEB8C4]/40 shadow-xs space-y-5 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-[#0B1B36] font-bold text-sm">
                  <MessageSquare size={18} /> Submit Support Ticket
                </div>
                <p className="text-xs text-[#536171]">
                  Experiencing a delayed deposit verification or technical issue? Send a direct message to our administrative helpdesk.
                </p>

                <form onSubmit={handleSubmitTicket} className="space-y-4 pt-2">
                  <div className="space-y-1">
                    <label className="text-[#536171] uppercase font-bold text-[10px]">Registered Agent Email</label>
                    <input 
                      type="email" 
                      value={agent?.email || ''} 
                      disabled 
                      className="w-full px-4 py-3 rounded-xl bg-[#F5F7FA] border border-[#AEB8C4]/40 text-[#536171] opacity-75 font-bold" 
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[#536171] uppercase font-bold text-[10px]">Inquiry Category</label>
                    <select 
                      value={ticketSubject}
                      onChange={(e) => setTicketSubject(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-[#F5F7FA] border border-[#AEB8C4]/40 text-[#0B1B36] font-bold cursor-pointer"
                    >
                      <option value="Payment Verification Issue">Payment / Deposit Verification Delay</option>
                      <option value="Tier Upgrade Inquiry">Progressive Tier Upgrade Assistance</option>
                      <option value="Task Execution Error">Task Fulfillment / Execution Glitch</option>
                      <option value="General Account Inquiry">General Account / Referral Inquiry</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[#536171] uppercase font-bold text-[10px]">Details / Transaction Reference Code</label>
                    <textarea 
                      rows={5} 
                      placeholder="Provide your transaction reference code (e.g. FT263920...) or describe your issue in detail..." 
                      value={ticketMessage}
                      onChange={(e) => setTicketMessage(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-[#F5F7FA] border border-[#AEB8C4]/40 text-[#0B1B36] font-bold"
                      required
                    />
                  </div>

                  <button 
                    type="submit" 
                    disabled={ticketSubmitting}
                    className="w-full py-4 bg-[#0B1B36] hover:bg-[#536171] text-white font-extrabold rounded-2xl transition flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider disabled:opacity-50 shadow-md"
                  >
                    {ticketSubmitting ? (
                      <>
                        <Loader2 size={16} className="animate-spin text-white" /> Transmitting Ticket...
                      </>
                    ) : (
                      <>
                        <Send size={14} /> Send Support Ticket
                      </>
                    )}
                  </button>
                </form>
              </div>

              <div className="p-4 bg-[#F5F7FA] rounded-2xl border border-[#AEB8C4]/30 flex items-center gap-3 mt-4">
                <Clock size={18} className="text-[#536171] shrink-0" />
                <div className="text-[11px] text-[#536171]">
                  <strong>Helpdesk Hours:</strong> Active 24 hours a day, 7 days a week. Average ticket response time is under 30 minutes.
                </div>
              </div>
            </div>

          </div>

        </div>
      </main>
    </div>
  );
}