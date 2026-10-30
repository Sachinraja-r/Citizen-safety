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
      border: 'border-amber-500/30',
      bg: 'bg-amber-500/10',
      text: 'text-amber-200',
      icon: <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />,
      btn: 'text-amber-400 hover:text-amber-300',
    },
    error: {
      border: 'border-red-500/30',
      bg: 'bg-red-500/10',
      text: 'text-red-200',
      icon: <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />,
      btn: 'text-red-400 hover:text-red-300',
    },
    info: {
      border: 'border-blue-500/30',
      bg: 'bg-blue-500/10',
      text: 'text-blue-200',
      icon: <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />,
      btn: 'text-blue-400 hover:text-blue-300',
    },
    success: {
      border: 'border-emerald-500/30',
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-200',
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />,
      btn: 'text-emerald-400 hover:text-emerald-300',
    },
  };

  const c = configs[type];

  return (
    <div className={`flex items-start gap-3 p-3.5 rounded-xl border ${c.bg} ${c.border} ${className}`}>
      {c.icon}
      <div className="flex-1 text-xs sm:text-sm text-left">
        {title && <h4 className={`font-semibold mb-0.5 ${c.text}`}>{title}</h4>}
        <p className="text-slate-300 leading-relaxed">{message}</p>
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
