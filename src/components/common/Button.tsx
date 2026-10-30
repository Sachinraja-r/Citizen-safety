import React from 'react';
import { LoadingSpinner } from './LoadingSpinner';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'danger' | 'primary' | 'secondary' | 'outline' | 'ghost' | 'success';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  className = '',
  ...props
}) => {
  const baseClasses =
    'relative inline-flex items-center justify-center font-medium transition-all duration-200 select-none active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white';

  const sizeClasses = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2.5 gap-2 min-h-[44px]',
    lg: 'text-base px-5 py-3 gap-2.5 min-h-[48px]',
    xl: 'text-lg px-6 py-4 gap-3 min-h-[56px] font-semibold',
  };

  const variantClasses = {
    danger:
      'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/30 focus:ring-red-500 border border-red-500/40',
    primary:
      'bg-pink-600 hover:bg-pink-700 text-white shadow-md shadow-pink-500/25 focus:ring-pink-500 border border-pink-500/30',
    secondary:
      'bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 shadow-sm focus:ring-slate-400',
    outline:
      'bg-transparent hover:bg-slate-100 text-slate-700 border border-slate-300 focus:ring-slate-400',
    ghost:
      'bg-transparent hover:bg-slate-100 text-slate-600 hover:text-slate-900 focus:ring-slate-300',
    success:
      'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/25 focus:ring-emerald-500 border border-emerald-500/30',
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <LoadingSpinner size="sm" color={variant === 'outline' || variant === 'ghost' ? 'text-slate-400' : 'text-white'} />
      ) : (
        leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>
      )}
      <span>{children}</span>
      {!isLoading && rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
    </button>
  );
};
