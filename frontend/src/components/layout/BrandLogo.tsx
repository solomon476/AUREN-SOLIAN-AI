import React from 'react';

interface BrandLogoProps {
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  showText = true,
  size = 'md',
  className = '',
}) => {
  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
  };

  const textSizes = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-2xl',
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Wolf Emblem Icon */}
      <div className={`relative flex items-center justify-center shrink-0 ${iconSizes[size]} rounded-lg p-0.5 bg-solian-surface border border-gold-500/30 shadow-glow-subtle`}>
        <img
          src="/favicon.svg"
          alt="Solian Wolves Emblem"
          className="w-full h-full object-contain"
        />
      </div>

      {showText && (
        <div className="flex flex-col">
          <div className={`font-extrabold tracking-wider leading-none text-slate-900 ${textSizes[size]}`}>
            AUREN <span className="text-amber-600">SOLIAN</span>
          </div>
          <span className="text-[9px] tracking-widest font-bold uppercase text-amber-800 mt-1">
            Organizational Intelligence
          </span>
        </div>
      )}
    </div>
  );
};
