import React from 'react';
import { NavLink } from 'react-router-dom';
import { Shield, AlertCircle, Users, User } from 'lucide-react';

export const BottomNav: React.FC = () => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-lg pb-safe">
      <div className="max-w-lg mx-auto flex items-center justify-around h-16 px-2">
        <NavLink
          to="/app"
          end
          className={({ isActive }) =>
            `flex flex-col items-center justify-center w-16 py-1 text-[11px] font-medium transition-colors ${
              isActive ? 'text-pink-600 font-bold' : 'text-slate-400 hover:text-slate-600'
            }`
          }
        >
          <Shield className="w-5 h-5 mb-1" />
          <span>Safety</span>
        </NavLink>

        <NavLink
          to="/app/contacts"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center w-16 py-1 text-[11px] font-medium transition-colors ${
              isActive ? 'text-pink-600 font-bold' : 'text-slate-400 hover:text-slate-600'
            }`
          }
        >
          <Users className="w-5 h-5 mb-1" />
          <span>Contacts</span>
        </NavLink>

        {/* Central SOS Quick Nav Target — BOLD RED */}
        <NavLink
          to="/app/sos"
          className="flex flex-col items-center justify-center -mt-5"
          aria-label="Direct SOS Action"
        >
          <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-red-600 border-4 border-white shadow-xl shadow-red-500/40 flex items-center justify-center text-white active:scale-95 transition-transform">
            <AlertCircle className="w-7 h-7 animate-pulse" />
          </div>
          <span className="text-[10px] font-black text-red-600 mt-1 uppercase tracking-wider">
            SOS
          </span>
        </NavLink>

        <NavLink
          to="/app/profile"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center w-16 py-1 text-[11px] font-medium transition-colors ${
              isActive ? 'text-pink-600 font-bold' : 'text-slate-400 hover:text-slate-600'
            }`
          }
        >
          <User className="w-5 h-5 mb-1" />
          <span>Profile</span>
        </NavLink>
      </div>
    </nav>
  );
};
