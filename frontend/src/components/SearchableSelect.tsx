import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

export interface SearchableSelectOption {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  emptyLabel?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
}

export default function SearchableSelect({
  value, onChange, options, placeholder = 'เลือก...', emptyLabel = '— ไม่ระบุ —', className = '', disabled = false, required = false
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 0);
  }, [open]);

  const selected = options.find(o => o.value === value);

  const filtered = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.trim().toLowerCase();
    return options.filter(o => o.label.toLowerCase().includes(q));
  }, [options, query]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(prev => !prev)}
        className={`w-full flex items-center justify-between gap-2 bg-white dark:bg-black/30 border rounded-lg p-2.5 text-xs text-left transition ${
          required && !value ? 'border-red-500/50' : 'border-slate-300 dark:border-white/10'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-[#00AEEF]'} ${className}`}
      >
        <span className={selected ? 'text-slate-900 dark:text-white truncate font-medium' : 'text-slate-400 dark:text-slate-500 truncate'}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && !disabled && (
        <div className="absolute z-[3000] mt-1 w-full bg-white dark:bg-[#0b0f19] border border-slate-200 dark:border-white/10 rounded-lg shadow-xl dark:shadow-2xl overflow-hidden flex flex-col max-h-72">
          <div className="flex items-center gap-2 p-2 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/20">
            <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="พิมพ์เพื่อค้นหา..."
              className="w-full bg-transparent text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none"
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} className="cursor-pointer">
                <X className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-white" />
              </button>
            )}
          </div>
          <div className="overflow-y-auto">
            {!required && (
              <div
                onClick={() => { onChange(''); setOpen(false); setQuery(''); }}
                className="px-3 py-2 text-xs text-slate-400 hover:bg-slate-100 dark:text-slate-500 dark:hover:bg-white/5 cursor-pointer"
              >
                {emptyLabel}
              </div>
            )}
            {filtered.length === 0 && (
              <div className="px-3 py-3 text-xs text-slate-400 dark:text-slate-500 text-center">ไม่พบข้อมูลที่ค้นหา</div>
            )}
            {filtered.map(opt => (
              <div
                key={opt.value}
                onClick={() => { onChange(opt.value); setOpen(false); setQuery(''); }}
                className={`px-3 py-2 text-xs cursor-pointer transition ${
                  opt.value === value 
                    ? 'bg-sky-100 dark:bg-[#005BAC]/30 text-[#005BAC] dark:text-[#00AEEF] font-bold' 
                    : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-[#005BAC]/20'
                }`}
              >
                {opt.label}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
