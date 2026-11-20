// src/app/super-agent/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Phone, MapPin, Loader2, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface SuperAgentItem {
  id: string;
  name: string;
  region?: string | null;
  phone?: string | null;
  status?: string | null;
}

export default function SuperAgentDirectoryPage() {
  const [agents, setAgents] = useState<SuperAgentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadAgents() {
      try {
        const { data, error } = await supabase
          .from('super_agents')
          .select('id, name, region, phone, status')
          .order('id', { ascending: true });

        if (!error && active && data) {
          setAgents(data as SuperAgentItem[]);
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    loadAgents();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#0B1B36] font-mono p-4 sm:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between bg-white p-5 rounded-3xl border border-[#AEB8C4]/40">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 rounded-xl bg-[#F5F7FA] hover:bg-[#0B1B36] hover:text-white transition"
            >
              <ArrowLeft size={16} />
            </Link>
            <h1 className="text-base sm:text-lg font-extrabold">Super Agent Nodes</h1>
          </div>
          <Link
            href="/admin"
            className="px-4 py-2 rounded-xl bg-[#0B1B36] text-white text-xs font-bold"
          >
            Admin
          </Link>
        </div>

        {loading ? (
          <div className="py-16 bg-white rounded-3xl border border-[#AEB8C4]/40 flex items-center justify-center gap-2 text-xs text-[#536171]">
            <Loader2 size={16} className="animate-spin" /> Loading Super Agents...
          </div>
        ) : agents.length === 0 ? (
          <div className="py-16 bg-white rounded-3xl border border-[#AEB8C4]/40 text-center text-xs text-[#536171]">
            No Super Agent nodes found.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            {agents.map((agent) => (
              <Link
                key={agent.id}
                href={`/super-agent/${agent.id}`}
                className="bg-white rounded-3xl p-5 border border-[#AEB8C4]/40 hover:border-[#0B1B36] transition space-y-2.5 block"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-extrabold text-sm text-[#0B1B36]">{agent.name}</span>
                  <ShieldCheck size={15} className="text-emerald-600 shrink-0" />
                </div>
                {agent.region && (
                  <div className="text-[#536171] flex items-center gap-1.5">
                    <MapPin size={12} /> {agent.region}
                  </div>
                )}
                {agent.phone && (
                  <div className="text-[#536171] flex items-center gap-1.5">
                    <Phone size={12} /> {agent.phone}
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}