import React from 'react';
import { AlertCircle, CheckCircle2, Info, XCircle } from 'lucide-react';

interface AlertBannerProps {
  type?: 'warning' | 'info' | 'error' | 'success';
  title?: string;
  message: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({
  type = 'info',
  title,
  message,
  actionText,
  onAction,
  className = '',
}) => {
  const configs = {
    warning: {
      border: 'border-amber-200',
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      icon: <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />,
      btn: 'text-amber-700 hover:text-amber-800 font-bold',
    },
    error: {
      border: 'border-red-200',
      bg: 'bg-red-50',
      text: 'text-red-800',
      icon: <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />,
      btn: 'text-red-700 hover:text-red-800 font-bold',
    },
    info: {
      border: 'border-pink-200',
      bg: 'bg-pink-50/60',
      text: 'text-pink-900',
      icon: <Info className="w-4 h-4 text-pink-600 shrink-0 mt-0.5" />,
      btn: 'text-pink-700 hover:text-pink-800 font-bold',
    },
    success: {
      border: 'border-emerald-200',
      bg: 'bg-emerald-50',
      text: 'text-emerald-800',
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />,
      btn: 'text-emerald-700 hover:text-emerald-800 font-bold',
    },
  };

  const c = configs[type];

  return (
    <div className={`flex items-start gap-3 p-3.5 rounded-xl border ${c.bg} ${c.border} ${className}`}>
      {c.icon}
      <div className="flex-1 text-xs sm:text-sm text-left">
        {title && <h4 className={`font-semibold mb-0.5 ${c.text}`}>{title}</h4>}
        <p className="text-slate-700 leading-relaxed font-medium">{message}</p>
        {actionText && onAction && (
          <button
            onClick={onAction}
            className={`mt-2 font-semibold underline underline-offset-2 ${c.btn} focus:outline-none`}
          >
            {actionText}
          </button>
        )}
      </div>
    </div>
  );
};
