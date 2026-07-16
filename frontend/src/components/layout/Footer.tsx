import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="py-4 px-6 border-t theme-border text-center text-[10px] text-slate-500 font-bold tracking-wide uppercase select-none">
      © {new Date().getFullYear()} Project PowerShift. All Rights Reserved. Version 1.0.0
    </footer>
  );
};

export default Footer;
