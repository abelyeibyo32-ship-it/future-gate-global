// src/app/super-agent/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Users, Cpu, Lock, RefreshCw, PhoneCall, Smartphone, Building2, Globe, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface SuperAgentNode {
  id: string;
  name: string;
  tier: string;
  region: string;
  phone?: string;
  telebirr_account?: string;
  cbe_account?: string;
}

export default function SuperAgentsDirectoryPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [superAgents, setSuperAgents] = useState<SuperAgentNode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setIsMounted(true);
    fetchSuperAgents();

    const interval = setInterval(fetchSuperAgents, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchSuperAgents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('super_agents')
        .select('*')
        .order('id', { ascending: true });

      if (error) throw error;
      if (data) setSuperAgents(data);
    } catch (err) {
      console.error('Failed to fetch super agents:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isMounted) return <div className="min-h-screen bg-[#F5F7FA]" />;

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#0B1B36] font-mono flex flex-col selection:bg-[#0B1B36] selection:text-white">
      
      {/* Top Header Bar */}
      <header className="bg-white/95 backdrop-blur-md border-b border-[#AEB8C4]/40 px-6 sm:px-12 py-4 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#0B1B36] flex items-center justify-center shadow-sm">
            <Globe size={16} className="text-white" />
          </div>
          <div className="text-xs flex items-center gap-2.5">
            <span className="font-extrabold text-[#0B1B36]">Financial Network</span>
            <span className="text-[#AEB8C4]">/</span>
            <span className="text-slate-600 font-bold">Super Agent Directory</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchSuperAgents}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-[#0B1B36] hover:text-white border border-[#AEB8C4]/40 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Refresh Nodes</span>
          </button>
          <Link href="/dashboard" className="px-4 py-2 rounded-xl bg-[#0B1B36] text-white text-xs font-bold transition shadow-sm hover:bg-[#152d56]">
            Dashboard
          </Link>
        </div>
      </header>

      {/* Main Full-Width Content */}
      <main className="flex-1 p-6 sm:p-12 max-w-7xl mx-auto w-full space-y-8">
        
        {/* Header Banner */}
        <div className="bg-gradient-to-br from-[#0B1B36] via-[#0B1B36] to-[#0E2447] text-white rounded-3xl p-6 sm:p-10 border border-white/10 shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-extrabold text-emerald-300">
              <ShieldCheck size={16} /> FGG Clearing & Escrow Network
            </div>
            <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight">Active Super Agent Nodes</h1>
            <p className="text-xs text-[#AEB8C4] max-w-xl leading-relaxed">
              Select a verified node and enter your password to access secure transaction management and approvals.
            </p>
          </div>
          <div className="bg-white/10 border border-white/10 px-5 py-4 rounded-2xl text-center shrink-0">
            <div className="text-[10px] text-[#AEB8C4] uppercase font-bold tracking-wider">Online Nodes</div>
            <div className="text-2xl font-extrabold text-emerald-400">{superAgents.length} Active</div>
          </div>
        </div>

        {/* Nodes Grid */}
        {loading && superAgents.length === 0 ? (
          <div className="py-20 text-center text-xs text-[#536171] bg-white rounded-3xl border border-[#AEB8C4]/40 shadow-xs">
            Synchronizing with Super Agent network...
          </div>
        ) : superAgents.length === 0 ? (
          <div className="py-20 text-center text-xs text-[#536171] bg-white rounded-3xl border border-[#AEB8C4]/40 shadow-xs">
            No active Super Agent nodes found. Please provision nodes from the Master Admin Console.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {superAgents.map((node) => (
              <div key={node.id} className="bg-white p-6 rounded-3xl border border-[#AEB8C4]/40 shadow-sm hover:shadow-md transition space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-[#0B1B36]/10 text-[#0B1B36] uppercase flex items-center gap-1">
                      <Cpu size={12} /> {node.tier}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Online
                    </span>
                  </div>
                  <h3 className="text-base font-extrabold text-[#0B1B36]">{node.name}</h3>
                  <div className="text-[11px] text-[#536171]">Region: <strong className="text-[#0B1B36]">{node.region || 'Central'}</strong></div>
                </div>

                <div className="p-3.5 bg-[#F5F7FA] rounded-2xl border border-[#AEB8C4]/30 space-y-2 text-xs">
                  {node.phone && (
                    <div className="flex justify-between items-center text-[#536171]">
                      <span className="flex items-center gap-1"><PhoneCall size={12} /> Phone:</span>
                      <strong className="text-[#0B1B36]">{node.phone}</strong>
                    </div>
                  )}
                  {node.telebirr_account && (
                    <div className="flex justify-between items-center text-[#536171]">
                      <span className="flex items-center gap-1"><Smartphone size={12} /> Telebirr:</span>
                      <strong className="text-[#0B1B36]">{node.telebirr_account}</strong>
                    </div>
                  )}
                  {node.cbe_account && (
                    <div className="flex justify-between items-center text-[#536171]">
                      <span className="flex items-center gap-1"><Building2 size={12} /> CBE:</span>
                      <strong className="text-[#0B1B36]">{node.cbe_account}</strong>
                    </div>
                  )}
                </div>

                <Link
                  href={`/super-agent/${node.id}`}
                  className="w-full py-3 rounded-2xl bg-[#0B1B36] hover:bg-[#152d56] text-white font-extrabold text-xs uppercase tracking-wider transition text-center flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                >
                  <Lock size={13} /> Open Node Portal
                </Link>
              </div>
            ))}
          </div>
        )}

      </main>
    </div>
  );
}