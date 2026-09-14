import React, { useState, useRef, useEffect } from 'react';
import { 
  Package, 
  Layers, 
  Boxes,
  LayoutGrid,
  ExternalLink
} from 'lucide-react';

const APPS = [
  {
    id: 'opakowania',
    name: 'Strona opakowaniowa',
    url: 'https://www.opakowania.grupaeltron.pl',
    icon: Package,
    color: 'from-blue-600 to-indigo-600',
    iconBg: 'bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400',
    isCurrent: true
  },
  {
    id: 'rury',
    name: 'Strona Rurowa',
    url: 'https://www.rury.grupaeltron.pl',
    icon: Layers,
    color: 'from-cyan-500 to-blue-600',
    iconBg: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-950 dark:text-cyan-400',
    isCurrent: false
  },
  {
    id: 'portal',
    name: 'Pulpit narzędzi',
    url: 'https://www.narzedzia.grupaeltron.pl',
    icon: Boxes,
    color: 'from-emerald-500 to-teal-600',
    iconBg: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400',
    isCurrent: false
  }
];

export const AppSwitcher = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        title="Przełącz aplikację"
        className={`p-2 rounded-xl border transition-all flex items-center justify-center cursor-pointer ${
          isOpen
            ? 'bg-blue-50 border-blue-300 text-blue-600 dark:bg-slate-800 dark:border-blue-500 dark:text-blue-400 shadow-sm'
            : 'text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
        }`}
      >
        <LayoutGrid className="w-5 h-5" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200/80 dark:border-slate-800 p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="space-y-1">
            {APPS.map((app) => {
              const Icon = app.icon;
              return (
                <a
                  key={app.id}
                  href={app.isCurrent ? '#/' : app.url}
                  onClick={() => {
                    if (app.isCurrent) setIsOpen(false);
                  }}
                  target={app.isCurrent ? '_self' : '_blank'}
                  rel="noopener noreferrer"
                  className={`w-full p-2.5 rounded-xl border transition-all flex items-center justify-between group ${
                    app.isCurrent
                      ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/60'
                      : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:border-slate-200/60 dark:hover:border-slate-700/60'
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${app.iconBg} group-hover:scale-105 transition-transform`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="font-semibold text-xs text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                      {app.name}
                    </span>
                  </div>

                  {app.isCurrent ? (
                    <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400 shrink-0" title="Aktywna" />
                  ) : (
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  )}
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default AppSwitcher;
