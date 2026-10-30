import React from 'react';

interface RakshaLogoProps {
  variant?: 'full' | 'icon' | 'image';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showTagline?: boolean;
}

export const RakshaLogo: React.FC<RakshaLogoProps> = ({
  variant = 'full',
  size = 'md',
  className = '',
  showTagline = true,
}) => {
  // If variant is image, render the actual uploaded brand asset
  if (variant === 'image') {
    const heightMap = {
      sm: 'h-7',
      md: 'h-9',
      lg: 'h-12',
      xl: 'h-16',
    };

    return (
      <div className={`inline-flex items-center select-none ${className}`}>
        <img
          src="/raksha-logo.png"
          alt="Raksha — Safe. Always."
          className={`${heightMap[size]} w-auto object-contain`}
          loading="eager"
        />
      </div>
    );
  }

  // Size mapping for SVG vector
  const iconSizeMap = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  const titleSizeMap = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl',
  };

  const taglineSizeMap = {
    sm: 'text-[10px]',
    md: 'text-xs',
    lg: 'text-sm',
    xl: 'text-base',
  };

  // Squircle icon with Shield & Location Marker
  const IconSquircle = (
    <svg
      viewBox="0 0 100 100"
      className={`${iconSizeMap[size]} shrink-0 transition-transform`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Pink Squircle Background */}
      <rect width="100" height="100" rx="26" fill="#E91E63" />
      
      {/* White Shield Outline */}
      <path
        d="M 50 18 C 65 18, 77 22, 77 34 C 77 56, 52 76, 50 78 C 48 76, 23 56, 23 34 C 23 22, 35 18, 50 18 Z"
        stroke="#FFFFFF"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Solid White Map Pin */}
      <path
        d="M 50 33 C 44.5 33, 40 37.5, 40 43 C 40 50.5, 50 62, 50 62 C 50 62, 60 50.5, 60 43 C 60 37.5, 55.5 33, 50 33 Z"
        fill="#FFFFFF"
      />

      {/* Pink Cutout Dot Inside Map Pin */}
      <circle cx="50" cy="43" r="3.8" fill="#E91E63" />
    </svg>
  );

  if (variant === 'icon') {
    return <div className={`inline-flex items-center ${className}`}>{IconSquircle}</div>;
  }

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {IconSquircle}
      <div className="flex flex-col justify-center leading-none">
        <span
          className={`font-bold tracking-tight text-[#2D1B24] ${titleSizeMap[size]}`}
          style={{ letterSpacing: '-0.02em' }}
        >
          Raksha
        </span>
        {showTagline && (
          <span className={`font-normal text-[#7A6570] tracking-normal mt-0.5 ${taglineSizeMap[size]}`}>
            Safe. Always.
          </span>
        )}
      </div>
    </div>
  );
};
