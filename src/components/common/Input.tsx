import React, { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, leftIcon, rightIcon, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full text-left">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3.5 flex items-center pointer-events-none text-slate-400">
              {leftIcon}
            </div>
          )}

          <input
            id={inputId}
            ref={ref}
            className={`w-full bg-white text-slate-900 placeholder:text-slate-400 text-sm rounded-xl px-3.5 py-3 border transition-colors shadow-sm focus:outline-none focus:ring-2 ${
              leftIcon ? 'pl-10' : ''
            } ${rightIcon ? 'pr-10' : ''} ${
              error
                ? 'border-red-500/70 focus:border-red-500 focus:ring-red-500/20'
                : 'border-slate-200 focus:border-pink-500 focus:ring-pink-500/20'
            } ${className}`}
            {...props}
          />

          {rightIcon && (
            <div className="absolute right-3.5 flex items-center pointer-events-none text-slate-400">
              {rightIcon}
            </div>
          )}
        </div>

        {error && <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1">⚠️ {error}</p>}
        {!error && helperText && <p className="text-xs text-slate-500 mt-1.5">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
