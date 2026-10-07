import React from 'react';

export const Logo: React.FC = () => {
  return (
    <div className="flex items-center gap-2 h-8 text-slate-900 dark:text-white">
      <svg
        width="32"
        height="32"
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        <defs>
          <linearGradient id="toothGradient" x1="24" y1="8" x2="24" y2="40" gradientUnits="userSpaceOnUse">
            <stop stopColor="#38bdf8" />
            <stop offset="1" stopColor="#0ea5e9" />
          </linearGradient>
        </defs>
        <path
          d="M39.6,18.4c0.1-1.4-0.4-2.8-1.4-3.8c-1-1-2.4-1.6-3.8-1.5L34,13.1c-2.4-3.7-6.2-6.1-10.4-6.1c-4.2,0-8,2.4-10.4,6.1l-0.4,0.1c-1.4,0.1-2.8,0.6-3.8,1.5c-1,1-1.6,2.4-1.5,3.8l0.1,0.4c1.1,5.3,4,11.3,11.5,15.6l2.5,1.4c1.2,0.7,2.8,0.7,4,0l2.5-1.4c7.5-4.2,10.4-10.3,11.5-15.6L39.6,18.4z"
          fill="url(#toothGradient)"
        />
        <path
          d="M17.1,16.2L24,20l6.9-3.8 M24,20v9.7 M17.1,26.9L24,29.7l6.9-2.8 M17.1,16.2L12,18.4 M17.1,26.9L12,25.3 M12,18.4v6.9 M30.9,16.2L36,18.4 M30.9,26.9L36,25.3 M36,18.4v6.9 M17.1,16.2l-1.7-5 M30.9,16.2l1.7-5 M24,29.7l-2.6,4.5 M24,29.7l2.6,4.5 M17.1,26.9l-4.3,2.5 M30.9,26.9l4.3,2.5"
          stroke="#FBBF24"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="17.1" cy="16.2" r="1.5" fill="#FBBF24" />
        <circle cx="24" cy="20" r="1.5" fill="#FBBF24" />
        <circle cx="30.9" cy="16.2" r="1.5" fill="#FBBF24" />
        <circle cx="17.1" cy="26.9" r="1.5" fill="#FBBF24" />
        <circle cx="24" cy="29.7" r="1.5" fill="#FBBF24" />
        <circle cx="30.9" cy="26.9" r="1.5" fill="#FBBF24" />
        <circle cx="12" cy="18.4" r="1.5" fill="#FBBF24" />
        <circle cx="12" cy="25.3" r="1.5" fill="#FBBF24" />
        <circle cx="36" cy="18.4" r="1.5" fill="#FBBF24" />
        <circle cx="36" cy="25.3" r="1.5" fill="#FBBF24" />
        <circle cx="15.4" cy="11.2" r="1.5" fill="#FBBF24" />
        <circle cx="32.6" cy="11.2" r="1.5" fill="#FBBF24" />
        <circle cx="21.4" cy="34.2" r="1.5" fill="#FBBF24" />
        <circle cx="26.6" cy="34.2" r="1.5" fill="#FBBF24" />
        <circle cx="12.8" cy="29.4" r="1.5" fill="#FBBF24" />
        <circle cx="35.2" cy="29.4" r="1.5" fill="#FBBF24" />
        <circle cx="9" cy="15" r="1.5" fill="#FBBF24" stroke="currentColor" strokeWidth="1" />
        <circle cx="39" cy="15" r="1.5" fill="#FBBF24" stroke="currentColor" strokeWidth="1" />
        <circle cx="9" cy="21" r="1.5" fill="#FBBF24" stroke="currentColor" strokeWidth="1" />
        <circle cx="39" cy="21" r="1.5" fill="#FBBF24" stroke="currentColor" strokeWidth="1" />
        <circle cx="9" cy="27" r="1.5" fill="#FBBF24" stroke="currentColor" strokeWidth="1" />
        <circle cx="39" cy="27" r="1.5" fill="#FBBF24" stroke="currentColor" strokeWidth="1" />
        <circle cx="18" cy="38" r="1.5" fill="#FBBF24" stroke="currentColor" strokeWidth="1" />
        <circle cx="30" cy="38" r="1.5" fill="#FBBF24" stroke="currentColor" strokeWidth="1" />
        <circle cx="24" cy="9" r="1.5" fill="#FBBF24" stroke="currentColor" strokeWidth="1" />
      </svg>
      <span
        className="font-bold text-xl tracking-tight"
      >
        MiConsul<span className="text-amber-500">App</span>
      </span>
    </div>
  );
};