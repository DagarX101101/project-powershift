import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  withText?: boolean;
  variant?: 'sidebar' | 'login' | 'pdf';
}

export const Logo: React.FC<LogoProps> = ({ className = '', size = 'md', withText = false, variant = 'sidebar' }) => {
  const sizeMap = {
    sm: 'w-6 h-6',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const svgSize = sizeMap[size];

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className={`relative flex items-center justify-center shrink-0 ${svgSize}`}>
        <svg 
          viewBox="0 0 100 100" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-md"
        >
          {/* Hexagon Outer Border (Planning & Grid framework) */}
          <path 
            d="M50 10 L85 30 V70 L50 90 L15 70 V30 Z" 
            stroke="url(#gradientGrid)" 
            strokeWidth="5" 
            strokeLinejoin="round" 
            strokeLinecap="round"
          />
          
          {/* Transmission line paths representing Power Transmission/Technology */}
          <path
            d="M15 30 L50 50 L85 30 M15 70 L50 50 L85 70 M50 10 V90"
            stroke="currentColor"
            className="text-slate-400/30 dark:text-slate-600/40"
            strokeWidth="2"
            strokeDasharray="4 4"
          />

          {/* Connected Grid Nodes (Technology & Precision nodes) */}
          <circle cx="50" cy="50" r="4" className="fill-slate-400 dark:fill-slate-500" />
          <circle cx="15" cy="30" r="3" className="fill-slate-400 dark:fill-slate-500" />
          <circle cx="85" cy="30" r="3" className="fill-slate-400 dark:fill-slate-500" />
          <circle cx="15" cy="70" r="3" className="fill-slate-400 dark:fill-slate-500" />
          <circle cx="85" cy="70" r="3" className="fill-slate-400 dark:fill-slate-500" />

          {/* Minimal Solid Electricity Bolt (Power, Energy, Charging) */}
          <path
            d="M53 22 L38 52 H52 L47 78 L62 48 H48 Z"
            fill="url(#gradientEnergy)"
            stroke="#ffffff"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />

          <defs>
            <linearGradient id="gradientGrid" x1="15" y1="10" x2="85" y2="90" gradientUnits="userSpaceOnUse">
              <stop stopColor="#3b82f6" /> {/* Tech Blue */}
              <stop offset="1" stopColor="#1d4ed8" /> {/* Indigo */}
            </linearGradient>
            <linearGradient id="gradientEnergy" x1="38" y1="22" x2="62" y2="78" gradientUnits="userSpaceOnUse">
              <stop stopColor="#f59e0b" /> {/* Amber */}
              <stop offset="1" stopColor="#ea580c" /> {/* Dark Orange */}
            </linearGradient>
          </defs>
        </svg>
      </div>
      
      {withText && variant === 'sidebar' && (
        <div className="flex flex-col justify-center">
          <h2 className="font-bold tracking-tight text-white leading-none text-lg">Project PowerShift</h2>
          <span className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">EV Planning Console</span>
        </div>
      )}

      {withText && variant === 'login' && (
        <div className="flex flex-col justify-center text-center mt-2">
          <h1 className="text-2xl font-bold tracking-tight text-white mb-1">Project PowerShift</h1>
          <p className="text-xs text-slate-400">EV Planning & Infrastructure Console</p>
        </div>
      )}
    </div>
  );
};
