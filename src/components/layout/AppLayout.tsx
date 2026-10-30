import React from 'react';
import { Outlet } from 'react-router-dom';
import { TopNavbar } from './TopNavbar';
import { BottomNav } from './BottomNav';
import { usePWA } from '../../hooks/usePWA';
import { WifiOff } from 'lucide-react';

export const AppLayout: React.FC = () => {
  const { isOnline } = usePWA();

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 flex flex-col">
      {/* Offline Connectivity Warning Banner */}
      {!isOnline && (
        <div className="bg-amber-600 text-slate-950 font-bold text-xs py-1.5 px-4 text-center flex items-center justify-center gap-2 sticky top-0 z-50">
          <WifiOff className="w-4 h-4 shrink-0" />
          <span>Offline Mode — Direct Emergency telephony (112) is available</span>
        </div>
      )}

      <TopNavbar />

      <main className="flex-1 w-full max-w-lg mx-auto px-4 pt-4 pb-24 sm:pb-20">
        <Outlet />
      </main>

      <BottomNav />
    </div>
  );
};
