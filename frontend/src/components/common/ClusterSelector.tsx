import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Layers } from 'lucide-react';
import type { Cluster } from '../../../../shared/types'; // Using existing type

interface ClusterSelectorProps {
  clusters: Cluster[];
  value: string;
  onChange: (value: string) => void;
  allowAll?: boolean;
  disabled?: boolean;
  label?: string;
  className?: string;
}

export const ClusterSelector: React.FC<ClusterSelectorProps> = ({
  clusters,
  value,
  onChange,
  allowAll = false,
  disabled = false,
  label = 'Select Cluster',
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedName = value === 'all' 
    ? 'All Clusters' 
    : clusters.find(c => c.id === value)?.name || 'Select a cluster...';

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {label && <div className="text-[10px] font-bold theme-text-secondary uppercase tracking-wider mb-1.5">{label}</div>}
      
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-full flex items-center justify-between px-4 py-2.5 
          bg-[var(--bg-card)] border border-[var(--border-color)] 
          rounded-xl shadow-sm transition-all duration-200
          hover:opacity-95 hover:border-slate-400 dark:hover:border-slate-600
          focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${isOpen ? 'ring-2 ring-[var(--accent-color)] border-[var(--accent-color)]' : ''}
        `}
      >
        <div className="flex items-center gap-2.5">
          <Layers className="w-4 h-4 text-purple-500" />
          <span className="text-sm font-semibold theme-text-primary">{selectedName}</span>
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-2xl overflow-hidden py-1 max-h-80 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200 flex flex-col">
          {allowAll && (
            <button
              onClick={() => { onChange('all'); setIsOpen(false); }}
              className={`
                w-full flex items-center gap-2.5 px-4 py-3 text-sm text-left transition-colors
                ${value === 'all' ? 'bg-[var(--bg-app)] text-[var(--accent-color)] font-bold' : 'theme-text-primary hover:bg-[var(--bg-app)]'}
              `}
            >
              <Layers className="w-4 h-4 text-purple-500" />
              All Clusters
            </button>
          )}

          {clusters.map(cluster => {
            const isSelected = value === cluster.id;
            const displayName = cluster.name.toLowerCase().endsWith('cluster') ? cluster.name : `${cluster.name} Cluster`;
            return (
              <button
                key={cluster.id}
                onClick={() => { onChange(cluster.id); setIsOpen(false); }}
                className={`
                  w-full flex items-center px-4 py-3 text-sm text-left transition-colors
                  ${isSelected ? 'bg-[var(--bg-app)] text-[var(--accent-color)] font-bold' : 'theme-text-primary hover:bg-[var(--bg-app)]'}
                `}
              >
                {displayName}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
