import React, { useState, useRef, useEffect } from 'react';
import { 
  Package, 
  Layers, 
  ExternalLink, 
  Boxes,
  LayoutGrid
} from 'lucide-react';

const DEFAULT_APPS = [
  {
    id: 'opakowania',
    name: 'System Opakowań',
    description: 'Zwroty bębnów, rozliczenia kaucji',
    url: 'https://opakowania.grupaeltron.pl',
    color: 'from-blue-600 to-indigo-600',
    isCurrent: true
  },
  {
    id: 'rury',
    name: 'System Rur & RFQ',
    description: 'Katalog rur, paletyzacja, awizacje',
    url: 'https://rury.grupaeltron.pl',
    color: 'from-cyan-500 to-blue-600',
    isCurrent: false
  },
  {
    id: 'portal',
    name: 'Pulpit Narzędzi',
    description: 'Strona główna ekosystemu Eltron',
    url: 'https://narzedzia.grupaeltron.pl',
    color: 'from-emerald-500 to-teal-600',
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
        title="Przełącz aplikację (Ekosystem Eltron)"
        className={`p-2 rounded-xl border transition-all flex items-center justify-center cursor-pointer ${
          isOpen
            ? 'bg-blue-50 border-blue-300 text-blue-600 dark:bg-slate-800 dark:border-blue-500 dark:text-blue-400'
            : 'text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
        }`}
      >
        <LayoutGrid className="w-5 h-5" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          
          <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Ekosystem Eltron
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Przełączaj się bez ponownego logowania</p>
            </div>
            <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
              SSO Active
            </span>
          </div>

          <div className="grid grid-cols-1 gap-1.5 pt-2">
            {DEFAULT_APPS.map((app) => (
              <a
                key={app.id}
                href={app.isCurrent ? '#/' : app.url}
                onClick={() => {
                  if (app.isCurrent) setIsOpen(false);
                }}
                target={app.isCurrent ? '_self' : '_blank'}
                rel="noopener noreferrer"
                className={`p-2.5 rounded-xl border transition-all flex items-center justify-between group ${
                  app.isCurrent
                    ? 'bg-slate-50 dark:bg-slate-800/60 border-blue-500/30'
                    : 'border-transparent hover:border-slate-200 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${app.color} flex items-center justify-center text-white shadow-sm shrink-0`}>
                    {app.id === 'opakowania' && <Package className="w-5 h-5" />}
                    {app.id === 'rury' && <Layers className="w-5 h-5" />}
                    {app.id === 'portal' && <Boxes className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <span className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                        {app.name}
                      </span>
                      {app.isCurrent && (
                        <span className="text-[9px] bg-blue-100 text-blue-700 font-semibold px-1.5 py-0.2 rounded">
                          Aktywny
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate max-w-[180px]">
                      {app.description}
                    </span>
                  </div>
                </div>

                {!app.isCurrent && (
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 shrink-0" />
                )}
              </a>
            ))}
          </div>

          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
            <a
              href="https://narzedzia.grupaeltron.pl"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-blue-600 hover:underline font-medium inline-flex items-center space-x-1"
            >
              <span>Wszystkie narzędzia (narzedzia.grupaeltron.pl)</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

        </div>
      )}
    </div>
  );
};

export default AppSwitcher;
