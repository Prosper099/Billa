import React from 'react';

interface BrandLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
  className?: string;
  variant?: 'light' | 'dark' | 'auto';
  iconOnly?: boolean;
  aiBadge?: boolean;
  customBadgeText?: string;
}

export const BillaAIIcon: React.FC<{ size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'; className?: string }> = ({
  size = 'md',
  className = '',
}) => {
  const iconSizes = {
    xs: 'w-5 h-5 rounded-md',
    sm: 'w-7 h-7 rounded-lg',
    md: 'w-9 h-9 rounded-xl',
    lg: 'w-11 h-11 rounded-xl',
    xl: 'w-14 h-14 rounded-2xl',
  };

  return (
    <div
      className={`relative inline-flex items-center justify-center bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 border border-indigo-800/50 shadow-xs shadow-indigo-950/15 shrink-0 ${iconSizes[size]} ${className}`}
    >
      <svg
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-[72%] h-[72%]"
      >
        {/* Glow layer */}
        <circle cx="18" cy="18" r="14" fill="#6366F1" fillOpacity="0.22" />
        {/* Top dynamic loop */}
        <path
          d="M10 8H20C23.3137 8 26 10.4624 26 13.5C26 16.5376 23.3137 19 20 19H10V8Z"
          fill="#6366F1"
        />
        {/* Bottom extended loop */}
        <path
          d="M10 17H21.5C24.8137 17 27.5 19.4624 27.5 22.5C27.5 25.5376 24.8137 28 21.5 28H10V17Z"
          fill="#4F46E5"
        />
        {/* Inner precision punch-holes */}
        <circle cx="15.5" cy="13.5" r="2" fill="#0F172A" />
        <circle cx="16" cy="22.5" r="2" fill="#0F172A" />
        {/* Accent slash */}
        <rect x="7.5" y="8" width="2.8" height="20" rx="1.4" fill="#818CF8" />
      </svg>
    </div>
  );
};

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  showTagline = false,
  className = '',
  iconOnly = false,
  aiBadge = true,
  customBadgeText = 'AI',
}) => {
  const textSizes = {
    xs: 'text-sm',
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl',
  };

  if (iconOnly) {
    return <BillaAIIcon size={size} className={className} />;
  }

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      <BillaAIIcon size={size} />

      {/* Brand Wordmark & Optional Tagline */}
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5">
          <span className={`font-extrabold tracking-tight text-[#1A1C1E] font-sans ${textSizes[size]}`}>
            Billa
          </span>
          {aiBadge && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              {customBadgeText}
            </span>
          )}
        </div>
        {showTagline && (
          <span className="text-[11px] font-medium tracking-wide text-slate-500 mt-0.5">
            Create. Track. Get Paid.
          </span>
        )}
      </div>
    </div>
  );
};

