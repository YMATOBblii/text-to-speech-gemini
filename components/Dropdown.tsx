import React, { useState, useRef, useEffect } from 'react';

interface GroupedOption<T> {
  label: string;
  options: T[];
}

interface DropdownProps<T extends string> {
  label: string;
  value: T;
  options?: T[];
  groupedOptions?: GroupedOption<T>[];
  onChange: (value: T) => void;
  icon?: React.ReactNode;
  extraLabelContent?: React.ReactNode;
}

function Dropdown<T extends string>({ 
  label, 
  value, 
  options, 
  groupedOptions, 
  onChange, 
  icon, 
  extraLabelContent 
}: DropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (option: T) => {
    onChange(option);
    setIsOpen(false);
  };

  return (
    <div className="flex flex-col gap-2 relative z-20" ref={dropdownRef}>
      {/* Custom Header Layout is handled by parent */}
      {(label || extraLabelContent) && (
        <div className="flex justify-between items-center px-1">
          {label && (
            <label className="text-[13px] font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
              {icon && <span className="text-indigo-600">{icon}</span>}
              {label}
            </label>
          )}
          {extraLabelContent}
        </div>
      )}
      
      <div className="relative">
        {/* Trigger Button - Higher Contrast */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full text-left bg-white text-slate-700 text-[15px] rounded-2xl 
            border border-slate-200 block h-12 px-4 transition-all duration-200 cursor-pointer shadow-sm
            ${isOpen 
              ? 'ring-2 ring-indigo-500/20 border-indigo-500' 
              : 'hover:border-indigo-300 hover:shadow-md'
            }
          `}
        >
          <div className="flex items-center justify-between h-full">
            <span className="block truncate font-semibold">{value}</span>
            <div className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-indigo-600' : ''}`}>
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
              </svg>
            </div>
          </div>
        </button>

        {/* Custom Dropdown Menu - Glass Popover */}
        {isOpen && (
          <div className="absolute mt-2 w-full max-h-60 overflow-y-auto rounded-2xl bg-white/90 backdrop-blur-2xl shadow-2xl border border-slate-100 ring-1 ring-black/5 z-50 custom-scrollbar animate-fade-scale origin-top">
            {groupedOptions ? (
              groupedOptions.map((group) => (
                <div key={group.label} className="py-2 border-b border-slate-100 last:border-0">
                  <div className="px-4 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider sticky top-0 bg-white/80 backdrop-blur-md z-10">
                    {group.label}
                  </div>
                  {group.options.map((opt) => (
                    <div
                      key={opt}
                      onClick={() => handleSelect(opt)}
                      className={`px-4 py-2.5 text-[15px] cursor-pointer transition-colors duration-100 flex items-center justify-between
                        ${value === opt 
                          ? 'bg-indigo-50 text-indigo-700 font-semibold' 
                          : 'text-slate-700 hover:bg-slate-50'
                        }
                      `}
                    >
                      {opt}
                      {value === opt && (
                        <span className="text-indigo-600">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ))
            ) : (
              <div className="py-2">
                {options?.map((opt) => (
                  <div
                    key={opt}
                    onClick={() => handleSelect(opt)}
                    className={`px-4 py-2.5 text-[15px] cursor-pointer transition-colors duration-100
                      ${value === opt 
                        ? 'bg-indigo-50 text-indigo-700 font-semibold' 
                        : 'text-slate-700 hover:bg-slate-50'
                      }
                    `}
                  >
                    {opt}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Dropdown;