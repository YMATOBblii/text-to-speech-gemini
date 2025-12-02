import React from 'react';
import { VoiceSpeed } from '../types';

interface SpeedToggleProps {
  value: VoiceSpeed;
  onChange: (value: VoiceSpeed) => void;
}

const SpeedToggle: React.FC<SpeedToggleProps> = ({ value, onChange }) => {
  const options = Object.values(VoiceSpeed) as VoiceSpeed[];

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-semibold text-slate-600 flex items-center gap-2 px-1">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-500"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        Скорость
      </label>
      <div className="flex bg-slate-100 border border-slate-200 rounded-xl p-1 shadow-inner">
        {options.map((option) => (
          <button
            key={option}
            onClick={() => onChange(option)}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all duration-200 relative overflow-hidden ${
              value === option
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <span className="relative z-10">{option}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default SpeedToggle;