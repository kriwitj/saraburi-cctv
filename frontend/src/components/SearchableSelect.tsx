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
        className={`w-full flex items-center justify-between gap-2 bg-black/30 border rounded-lg p-2.5 text-xs text-left transition ${
          required && !value ? 'border-red-500/40' : 'border-white/10'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-white/20'} ${className}`}
      >
        <span className={selected ? 'text-white truncate' : 'text-slate-500 truncate'}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-500 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && !disabled && (
        <div className="absolute z-[3000] mt-1 w-full bg-[#0b0f19] border border-white/10 rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-72">
          <div className="flex items-center gap-2 p-2 border-b border-white/10 bg-black/20">
            <Search className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="พิมพ์เพื่อค้นหา..."
              className="w-full bg-transparent text-xs text-white placeholder:text-slate-500 focus:outline-none"
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} className="cursor-pointer">
                <X className="w-3.5 h-3.5 text-slate-500 hover:text-white" />
              </button>
            )}
          </div>
          <div className="overflow-y-auto">
            {!required && (
              <div
                onClick={() => { onChange(''); setOpen(false); setQuery(''); }}
                className="px-3 py-2 text-xs text-slate-500 hover:bg-white/5 cursor-pointer"
              >
                {emptyLabel}
              </div>
            )}
            {filtered.length === 0 && (
              <div className="px-3 py-3 text-xs text-slate-500 text-center">ไม่พบข้อมูลที่ค้นหา</div>
            )}
            {filtered.map(opt => (
              <div
                key={opt.value}
                onClick={() => { onChange(opt.value); setOpen(false); setQuery(''); }}
                className={`px-3 py-2 text-xs cursor-pointer hover:bg-[#005BAC]/20 ${
                  opt.value === value ? 'bg-[#005BAC]/30 text-[#00AEEF] font-semibold' : 'text-white'
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
