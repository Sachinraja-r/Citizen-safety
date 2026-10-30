import React from 'react';
import { IncidentType } from '../../types';
import { Shield, HeartPulse, UserX, AlertCircle } from 'lucide-react';

interface CategoryOption {
  type: IncidentType;
  label: string;
  icon: React.ReactNode;
  color: string;
}

const CATEGORIES: CategoryOption[] = [
  {
    type: 'SOS_EMERGENCY',
    label: 'Critical Danger',
    icon: <AlertCircle className="w-5 h-5 text-red-400" />,
    color: 'hover:border-red-500/50 hover:bg-red-950/20',
  },
  {
    type: 'PHYSICAL_HARASSMENT_STALKING',
    label: 'Stalking / Harassment',
    icon: <UserX className="w-5 h-5 text-purple-400" />,
    color: 'hover:border-purple-500/50 hover:bg-purple-950/20',
  },
  {
    type: 'MEDICAL_EMERGENCY',
    label: 'Medical Emergency',
    icon: <HeartPulse className="w-5 h-5 text-emerald-400" />,
    color: 'hover:border-emerald-500/50 hover:bg-emerald-950/20',
  },
  {
    type: 'SAFE_JOURNEY_ALERT',
    label: 'Safe Journey Check',
    icon: <Shield className="w-5 h-5 text-blue-400" />,
    color: 'hover:border-blue-500/50 hover:bg-blue-950/20',
  },
];

interface EmergencyCategoriesProps {
  onSelectCategory: (type: IncidentType) => void;
}

export const EmergencyCategories: React.FC<EmergencyCategoriesProps> = ({ onSelectCategory }) => {
  return (
    <div className="w-full text-left my-5">
      <div className="flex items-center justify-between mb-2.5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Emergency Category Shortcuts
        </h3>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.type}
            onClick={() => onSelectCategory(cat.type)}
            className={`flex items-center gap-2.5 p-3 rounded-xl bg-[#111827] border border-slate-800 text-left transition-all ${cat.color} active:scale-95`}
          >
            <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 shrink-0">
              {cat.icon}
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-semibold text-slate-200 truncate">{cat.label}</p>
              <p className="text-[10px] text-slate-500 truncate">Immediate dispatch</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
