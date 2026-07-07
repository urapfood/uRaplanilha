import React, { useRef } from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  Upload, 
  Sun, 
  Moon, 
  TrendingUp, 
  Percent, 
  ShoppingBag,
  FileText,
  LogOut
} from 'lucide-react';
import { formatPercent } from '../utils';

interface HeaderProps {
  activeTaxRate: number;
  productCount: number;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  onExportJSON: () => void;
  onExportCSV: () => void;
  onImportJSON: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onExportPDF: () => void;
  currentUser: any;
  onLogout: () => void;
}

export default function Header({
  activeTaxRate,
  productCount,
  darkMode,
  setDarkMode,
  onExportJSON,
  onExportCSV,
  onImportJSON,
  onExportPDF,
  currentUser,
  onLogout,
}: HeaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center bg-zinc-900/10 dark:bg-zinc-100/5 p-1.5 rounded-xl">
              <img 
                src="https://i.imgur.com/MVE864o.png" 
                alt="Logo uRapFood" 
                className="w-10 h-10 object-contain" 
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center">
                  u<span className="text-brand-tomato">Rap</span>lanilha
                </span>
                <span className="px-2 py-0.5 text-[10px] font-medium bg-brand-orange/10 dark:bg-brand-orange/20 text-brand-orange rounded-full border border-brand-orange/20">
                  uRapFood iFood
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 hidden sm:block">
                Precificação & Controle Financeiro
              </p>
            </div>
          </div>

          {/* Quick Metrics (Desktop only) */}
          <div className="hidden md:flex items-center space-x-6 text-sm">
            <div className="flex items-center space-x-2 px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-100 dark:border-zinc-850">
              <ShoppingBag className="w-4 h-4 text-brand-terracota dark:text-brand-orange" />
              <span className="text-zinc-500 dark:text-zinc-400">Produtos:</span>
              <span className="font-semibold tech-font-mono font-mono text-zinc-900 dark:text-zinc-100">{productCount}</span>
            </div>
            
            <div className="flex items-center space-x-2 px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-100 dark:border-zinc-850">
              <Percent className="w-4 h-4 text-brand-tomato" />
              <span className="text-zinc-500 dark:text-zinc-400">Impostos Ativos:</span>
              <span className="font-semibold tech-font-mono font-mono text-brand-tomato">{formatPercent(activeTaxRate)}</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-2">
            
            {/* Import / Export dropdown or separate icon buttons */}
            <div className="flex items-center space-x-1 border-r border-zinc-200 dark:border-zinc-800 pr-2">
              {/* Export JSON */}
              <button
                onClick={onExportJSON}
                className="p-2 text-zinc-600 dark:text-zinc-300 hover:text-brand-tomato hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                title="Exportar Backup (JSON)"
                id="btn-export-json"
              >
                <Download className="w-4 h-4" />
              </button>

              {/* Export CSV */}
              <button
                onClick={onExportCSV}
                className="p-2 text-zinc-600 dark:text-zinc-300 hover:text-brand-tomato hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors hidden sm:inline-flex"
                title="Exportar Planilha (CSV)"
                id="btn-export-csv"
              >
                <FileSpreadsheet className="w-4 h-4" />
              </button>

              {/* Export PDF (Personalizado) */}
              <button
                onClick={onExportPDF}
                className="p-2 text-zinc-600 dark:text-zinc-300 hover:text-brand-tomato hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                title="Exportar PDF Personalizado"
                id="btn-export-pdf"
              >
                <FileText className="w-4 h-4" />
              </button>

              {/* Import JSON */}
              <button
                onClick={triggerFileInput}
                className="p-2 text-zinc-600 dark:text-zinc-300 hover:text-brand-tomato hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                title="Importar Backup"
                id="btn-import-trigger"
              >
                <Upload className="w-4 h-4" />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={onImportJSON}
                accept=".json"
                className="hidden"
                id="import-file-input"
              >
              </input>
            </div>

            {/* Dark Mode Toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              title={darkMode ? 'Modo Claro' : 'Modo Escuro'}
              id="btn-toggle-theme"
            >
              {darkMode ? <Sun className="w-5 h-5 text-brand-orange" /> : <Moon className="w-5 h-5 text-zinc-600" />}
            </button>

            {/* User Profile and LogOut */}
            {currentUser && (
              <div className="flex items-center space-x-2 pl-2 border-l border-zinc-200 dark:border-zinc-800">
                <div className="hidden lg:flex flex-col text-right">
                  <span className="text-xs font-bold text-zinc-950 dark:text-zinc-100 max-w-[120px] truncate">
                    {currentUser.displayName || currentUser.email?.split('@')[0]}
                  </span>
                  <span className="text-[10px] text-zinc-400 font-medium">Conta Ativa</span>
                </div>
                <button
                  onClick={onLogout}
                  className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-all cursor-pointer"
                  title="Sair da Conta"
                  id="btn-logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
}
