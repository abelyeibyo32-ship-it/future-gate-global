// src/lib/components/MobileBottomNav.tsx
'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Wallet, CheckSquare, User } from 'lucide-react';

function NavContent() {
  const pathname = usePathname();

  // Hide on admin, super-agent, and auth routes
  const hiddenRoutes = ['/admin', '/super-agent', '/login', '/register', '/auth'];
  const shouldHide = hiddenRoutes.some((route) => pathname?.startsWith(route));

  if (shouldHide) return null;

  return (
    <nav className="lg:hidden fixed bottom-4 left-6 right-6 z-40 bg-[#0B1B36]/95 backdrop-blur-xl border border-white/15 py-2.5 px-4 flex items-center justify-around shadow-2xl rounded-2xl">
      
      {/* Dashboard Nav Item */}
      <Link
        href="/dashboard"
        aria-label="Dashboard"
        className={`p-3 rounded-xl transition-all duration-300 flex items-center justify-center ${
          pathname === '/dashboard'
            ? 'bg-white text-[#0B1B36] shadow-md scale-110'
            : 'text-white/60 hover:text-white hover:bg-white/5'
        }`}
      >
        <LayoutDashboard size={20} />
      </Link>

      {/* Wallet Nav Item */}
      <Link
        href="/wallet"
        aria-label="Wallet"
        className={`p-3 rounded-xl transition-all duration-300 flex items-center justify-center ${
          pathname === '/wallet'
            ? 'bg-white text-[#0B1B36] shadow-md scale-110'
            : 'text-white/60 hover:text-white hover:bg-white/5'
        }`}
      >
        <Wallet size={20} />
      </Link>

      {/* Tasks Nav Item */}
      <Link
        href="/tasks"
        aria-label="Tasks"
        className={`p-3 rounded-xl transition-all duration-300 flex items-center justify-center ${
          pathname === '/tasks'
            ? 'bg-white text-[#0B1B36] shadow-md scale-110'
            : 'text-white/60 hover:text-white hover:bg-white/5'
        }`}
      >
        <CheckSquare size={20} />
      </Link>

      {/* Profile Nav Item */}
      <Link
        href="/profile"
        aria-label="Profile"
        className={`p-3 rounded-xl transition-all duration-300 flex items-center justify-center ${
          pathname === '/profile'
            ? 'bg-white text-[#0B1B36] shadow-md scale-110'
            : 'text-white/60 hover:text-white hover:bg-white/5'
        }`}
      >
        <User size={20} />
      </Link>

    </nav>
  );
}

export default function MobileBottomNav() {
  return (
    <Suspense fallback={null}>
      <NavContent />
    </Suspense>
  );
}