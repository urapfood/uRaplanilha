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
  LogOut,
  Trash2
} from 'lucide-react';
import { formatPercent } from '../utils';

interface HeaderProps {
  activeTaxRate: number;
  productCount: number;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  onExportPDF: () => void;
  currentUser: any;
  onLogout: () => void;
  userProfile?: any;
  onChangeSegment?: () => void;
  onClearAllData?: () => void;
}

export default function Header({
  activeTaxRate,
  productCount,
  darkMode,
  setDarkMode,
  onExportPDF,
  currentUser,
  onLogout,
  userProfile,
  onChangeSegment,
  onClearAllData,
}: HeaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const getSegmentLabel = (type: string) => {
    switch (type) {
      case 'hamburgueria': return 'Hambúrgueres 🍔';
      case 'pizzaria': return 'Pizza 🍕';
      case 'sushi': return 'Sushi 🍣';
      case 'pastelaria': return 'Pastel 🥟';
      case 'acai': return 'Açaí 🍧';
      case 'hotdog': return 'Hot Dog 🌭';
      case 'geral': return 'Alimentação 🍽️';
      default: return '';
    }
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
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="text-xs text-zinc-500 dark:text-zinc-400 hidden sm:block">
                  Precificação & Controle Financeiro
                </p>
                {userProfile?.foodType && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={onChangeSegment}
                      className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider bg-brand-tomato/10 text-brand-tomato border border-brand-tomato/20 hover:bg-brand-tomato hover:text-white rounded-md transition-all cursor-pointer flex items-center gap-1"
                      title="Alterar seu tipo de negócio / segmento de comida"
                    >
                      <span>{getSegmentLabel(userProfile.foodType)}</span>
                      <span className="text-[7px]">▼</span>
                    </button>
                    {onClearAllData && (
                      <button
                        onClick={onClearAllData}
                        className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider bg-red-600/10 text-red-500 border border-red-500/20 hover:bg-red-600 hover:text-white rounded-md transition-all cursor-pointer flex items-center gap-1"
                        title="Zerar Planilha (Limpar tudo do banco de dados)"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Zerar Planilha</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
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
            
            {/* PDF Export Only */}
            <div className="flex items-center space-x-1 border-r border-zinc-200 dark:border-zinc-800 pr-2">
              <button
                onClick={onExportPDF}
                className="flex items-center space-x-2 px-3 py-1.5 bg-brand-tomato/10 text-brand-tomato hover:bg-brand-tomato hover:text-white rounded-lg transition-colors border border-brand-tomato/20 font-bold text-xs cursor-pointer shadow-xs"
                title="Exportar PDF Personalizado"
                id="btn-export-pdf"
              >
                <FileText className="w-4 h-4" />
                <span>Exportar PDF</span>
              </button>
            </div>

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
