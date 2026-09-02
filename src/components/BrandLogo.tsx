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
      className={`relative inline-flex items-center justify-center bg-gradient-to-br from-indigo-500 via-indigo-600 to-indigo-800 border border-indigo-400/40 shadow-md shadow-indigo-600/30 shrink-0 ${iconSizes[size]} ${className}`}
    >
      <svg
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-[72%] h-[72%]"
      >
        {/* Glow layer */}
        <circle cx="18" cy="18" r="14" fill="#FFFFFF" fillOpacity="0.25" />
        {/* Top dynamic loop */}
        <path
          d="M10 8H20C23.3137 8 26 10.4624 26 13.5C26 16.5376 23.3137 19 20 19H10V8Z"
          fill="#FFFFFF"
        />
        {/* Bottom extended loop */}
        <path
          d="M10 17H21.5C24.8137 17 27.5 19.4624 27.5 22.5C27.5 25.5376 24.8137 28 21.5 28H10V17Z"
          fill="#E0E7FF"
        />
        {/* Inner precision punch-holes */}
        <circle cx="15.5" cy="13.5" r="2" fill="#4F46E5" />
        <circle cx="16" cy="22.5" r="2" fill="#4F46E5" />
        {/* Accent slash */}
        <rect x="7.5" y="8" width="2.8" height="20" rx="1.4" fill="#A5B4FC" />
      </svg>
    </div>
  );
};

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  showTagline = false,
  className = '',
  variant = 'auto',
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

  // Determine text color based on variant
  const isDarkVariant = variant === 'dark';
  const textColorClass = isDarkVariant
    ? 'text-white drop-shadow-xs'
    : variant === 'light'
    ? 'text-slate-900'
    : 'text-slate-900 dark:text-white';

  const badgeClass = isDarkVariant
    ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
    : 'bg-indigo-50 text-indigo-700 border-indigo-200';

  const taglineClass = isDarkVariant
    ? 'text-slate-400 font-medium'
    : 'text-slate-500 font-medium';

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      <BillaAIIcon size={size} />

      {/* Brand Wordmark & Optional Tagline */}
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5">
          <span className={`font-black tracking-tight font-sans ${textColorClass} ${textSizes[size]}`}>
            Billa
          </span>
          {aiBadge && (
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border ${badgeClass}`}>
              {customBadgeText}
            </span>
          )}
        </div>
        {showTagline && (
          <span className={`text-[11px] tracking-wide mt-0.5 ${taglineClass}`}>
            Create. Track. Get Paid.
          </span>
        )}
      </div>
    </div>
  );
};


