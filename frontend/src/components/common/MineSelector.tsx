import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, MapPin, Layers, Search } from 'lucide-react';
import type { Cluster } from '../../../../shared/types';

interface MineSelectorProps {
  clusters: Cluster[];
  value: string;
  onChange: (value: string) => void;
  allowAll?: boolean;
  disabled?: boolean;
  label?: string;
  className?: string;
}

export const MineSelector: React.FC<MineSelectorProps> = ({
  clusters,
  value,
  onChange,
  allowAll = false,
  disabled = false,
  label = 'Select Mine',
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
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

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
    }
  }, [isOpen]);

  const allMines = clusters.flatMap(c => c.mines);
  const selectedName = value === 'all' 
    ? 'All Mines' 
    : allMines.find(m => m.id === value)?.name || 'Select a mine...';

  const filteredClusters = clusters.map(cluster => {
    const matchedMines = cluster.mines.filter(mine => 
      mine.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return {
      ...cluster,
      mines: matchedMines
    };
  }).filter(cluster => cluster.mines.length > 0 || cluster.name.toLowerCase().includes(searchQuery.toLowerCase()));

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
          <MapPin className="w-4 h-4 text-emerald-500" />
          <span className="text-sm font-semibold theme-text-primary">{selectedName}</span>
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-2xl overflow-hidden py-1 max-h-80 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200 flex flex-col">
          <div className="p-2 border-b border-[var(--border-color)] relative">
            <Search className="w-3.5 h-3.5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 animate-in fade-in" />
            <input
              type="text"
              placeholder="Search mine site..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-[var(--bg-app)] border border-[var(--border-color)] rounded-lg text-xs theme-text-primary focus:outline-none focus:ring-1 focus:ring-[var(--accent-color)]"
            />
          </div>

          <div className="overflow-y-auto flex-1 max-h-60">
            {allowAll && searchQuery === '' && (
              <button
                onClick={() => { onChange('all'); setIsOpen(false); }}
                className={`
                  w-full flex items-center gap-2.5 px-4 py-3 text-sm text-left transition-colors
                  ${value === 'all' ? 'bg-[var(--bg-app)] text-[var(--accent-color)] font-bold' : 'theme-text-primary hover:bg-[var(--bg-app)]'}
                `}
              >
                <Layers className="w-4 h-4" />
                All Mines
              </button>
            )}

            {filteredClusters.length === 0 ? (
              <div className="px-4 py-3 text-xs theme-text-secondary text-center">
                No mine sites found
              </div>
            ) : (
              filteredClusters.map(cluster => (
                <div key={cluster.id} className="py-1 animate-in fade-in duration-100">
                  <div className="px-4 py-2 flex items-center gap-2 bg-[var(--bg-app)]/50">
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-color)]"></div>
                    <span className="text-[10px] font-black tracking-widest uppercase theme-text-secondary">
                      {cluster.name.toLowerCase().endsWith('cluster') ? cluster.name : `${cluster.name} Cluster`}
                    </span>
                  </div>
                  
                  <div className="flex flex-col">
                    {cluster.mines.map(mine => {
                      const isSelected = value === mine.id;
                      return (
                        <button
                          key={mine.id}
                          onClick={() => { onChange(mine.id); setIsOpen(false); }}
                          className={`
                            w-full flex items-center pl-10 pr-4 py-2.5 text-sm text-left transition-colors
                            ${isSelected ? 'bg-[var(--bg-app)] text-[var(--accent-color)] font-bold' : 'theme-text-primary hover:bg-[var(--bg-app)]'}
                          `}
                        >
                          {mine.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
