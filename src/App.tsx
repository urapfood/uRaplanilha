import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart3, 
  Layers, 
  Percent, 
  Briefcase, 
  Calculator, 
  Check, 
  AlertCircle,
  FileText,
  BookOpen,
  Loader2,
  FileSpreadsheet,
  Receipt
} from 'lucide-react';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import ProductTab from './components/ProductTab';
import TaxTab from './components/TaxTab';
import FixedCostTab from './components/FixedCostTab';
import SimulatorTab from './components/SimulatorTab';
import ReportsTab from './components/ReportsTab';
import RecipesTab from './components/RecipesTab';
import IFoodImportTab from './components/IFoodImportTab';
import PDFExportModal from './components/PDFExportModal';
import PDVSection from './components/PDVSection';
import SupplierTab from './components/SupplierTab';
import { 
  Product, 
  Tax, 
  FixedCost, 
  VariableCost,
  OtherRevenue,
  Recipe,
  Sale,
  SupplierItem,
  INITIAL_TAXES, 
  INITIAL_PRODUCTS, 
  INITIAL_RECIPES
} from './types';
import { getActiveTaxPercentage, calculateProductMetrics } from './utils';
import {
  subscribeToProducts, saveProduct, deleteProduct,
  subscribeToTaxes, saveTax, deleteTax,
  subscribeToFixedCosts, saveFixedCost, deleteFixedCost,
  subscribeToVariableCosts, saveVariableCost, deleteVariableCost,
  subscribeToOtherRevenues, saveOtherRevenue, deleteOtherRevenue,
  subscribeToRecipes, saveRecipe, deleteRecipe,
  subscribeToSales, saveSale, deleteSale,
  subscribeToSuppliers, saveSupplier, deleteSupplier,
  auth
} from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import AuthScreen from './components/AuthScreen';

export default function App() {
  // Local storage keys
  const STORAGE_KEY_THEME = 'uraplanilha_theme';

  // State: Dark Mode
  const [darkMode, setDarkMode] = useState<boolean>(true);

  // State: Authentication
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  // State: Data arrays from Firestore
  const [products, setProductsState] = useState<Product[]>([]);
  const [taxes, setTaxesState] = useState<Tax[]>([]);
  const [fixedCosts, setFixedCostsState] = useState<FixedCost[]>([]);
  const [variableCosts, setVariableCostsState] = useState<VariableCost[]>([]);
  const [otherRevenues, setOtherRevenuesState] = useState<OtherRevenue[]>([]);
  const [recipes, setRecipesState] = useState<Recipe[]>([]);
  const [sales, setSalesState] = useState<Sale[]>([]);
  const [suppliers, setSuppliersState] = useState<SupplierItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // State: Navigation Active Tab
  type TabType = 'dashboard' | 'produtos' | 'taxas' | 'custos' | 'simulador' | 'relatorios' | 'receitas' | 'ifood' | 'pdv' | 'fornecedores';
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  // State: PDF Export Modal
  const [isPDFModalOpen, setIsPDFModalOpen] = useState<boolean>(false);

  // State: Toast / Alert messages
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Sync authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Sync state with Firestore in real-time when authenticated
  useEffect(() => {
    if (!currentUser) {
      setProductsState([]);
      setTaxesState([]);
      setFixedCostsState([]);
      setVariableCostsState([]);
      setOtherRevenuesState([]);
      setRecipesState([]);
      setSalesState([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    let loadedCount = 0;
    const checkLoading = () => {
      loadedCount++;
      if (loadedCount >= 7) {
        setLoading(false);
      }
    };

    const userId = currentUser.uid;

    const unsubProducts = subscribeToProducts(userId, (data) => {
      setProductsState(data);
      checkLoading();
    });
    const unsubTaxes = subscribeToTaxes(userId, (data) => {
      setTaxesState(data);
      checkLoading();
    });
    const unsubFixed = subscribeToFixedCosts(userId, (data) => {
      setFixedCostsState(data);
      checkLoading();
    });
    const unsubVarCosts = subscribeToVariableCosts(userId, (data) => {
      setVariableCostsState(data);
      checkLoading();
    });
    const unsubRevenues = subscribeToOtherRevenues(userId, (data) => {
      setOtherRevenuesState(data);
      checkLoading();
    });
    const unsubRecipes = subscribeToRecipes(userId, (data) => {
      setRecipesState(data);
      checkLoading();
    });
    const unsubSales = subscribeToSales(userId, (data) => {
      setSalesState(data);
      checkLoading();
    });
    const unsubSuppliers = subscribeToSuppliers(userId, (data) => {
      setSuppliersState(data);
      checkLoading();
    });

    // Fallback: stop loading after 3 seconds anyway to avoid infinite spinner if Firestore is empty
    const timer = setTimeout(() => {
      setLoading(false);
    }, 3000);

    return () => {
      unsubProducts();
      unsubTaxes();
      unsubFixed();
      unsubVarCosts();
      unsubRevenues();
      unsubRecipes();
      unsubSales();
      unsubSuppliers();
      clearTimeout(timer);
    };
  }, [currentUser]);

  // Generic helper to diff and sync changes to Firestore
  const syncCollection = async <T extends { id: string }>(
    value: React.SetStateAction<T[]>,
    currentList: T[],
    saveFn: (userId: string, item: T) => Promise<void>,
    deleteFn: (userId: string, id: string) => Promise<void>
  ) => {
    if (!currentUser) return;
    const userId = currentUser.uid;

    let nextList: T[];
    if (typeof value === 'function') {
      nextList = (value as Function)(currentList);
    } else {
      nextList = value;
    }

    const nextIds = new Set(nextList.map(item => item.id));

    // 1. Delete items no longer in list
    for (const item of currentList) {
      if (!nextIds.has(item.id)) {
        try {
          await deleteFn(userId, item.id);
        } catch (err) {
          console.error("Error syncing deletion to Firestore:", err);
        }
      }
    }

    // 2. Save items that are new or modified compared to currentList
    for (const item of nextList) {
      const existing = currentList.find(c => c.id === item.id);
      if (!existing || JSON.stringify(existing) !== JSON.stringify(item)) {
        try {
          await saveFn(userId, item);
        } catch (err) {
          console.error("Error syncing save to Firestore:", err);
        }
      }
    }
  };

  const setProducts = (value: React.SetStateAction<Product[]>) => {
    syncCollection(value, products, saveProduct, deleteProduct);
  };

  const setTaxes = (value: React.SetStateAction<Tax[]>) => {
    syncCollection(value, taxes, saveTax, deleteTax);
  };

  const setFixedCosts = (value: React.SetStateAction<FixedCost[]>) => {
    syncCollection(value, fixedCosts, saveFixedCost, deleteFixedCost);
  };

  const setVariableCosts = (value: React.SetStateAction<VariableCost[]>) => {
    syncCollection(value, variableCosts, saveVariableCost, deleteVariableCost);
  };

  const setOtherRevenues = (value: React.SetStateAction<OtherRevenue[]>) => {
    syncCollection(value, otherRevenues, saveOtherRevenue, deleteOtherRevenue);
  };

  const setRecipes = (value: React.SetStateAction<Recipe[]>) => {
    syncCollection(value, recipes, saveRecipe, deleteRecipe);
  };

  const setSuppliers = (value: React.SetStateAction<SupplierItem[]>) => {
    syncCollection(value, suppliers, saveSupplier, deleteSupplier);
  };

  // Dark Mode Sync
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_THEME, String(darkMode));
    } catch {}

    const root = window.document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [darkMode]);

  // Show auto-dismissing notification
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4000);
  };

  // Calculations for Header quick-info
  const activeTaxRate = useMemo(() => getActiveTaxPercentage(taxes), [taxes]);

  // JSON Export (Full backup)
  const handleExportJSON = () => {
    try {
      const backupData = {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        products,
        taxes,
        fixedCosts,
        variableCosts,
        otherRevenues,
        recipes,
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `uraplanilha-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      showToast('Backup JSON exportado com sucesso!');
    } catch (err) {
      showToast('Erro ao exportar backup JSON.', 'error');
    }
  };

  // CSV Export (Excel friendly)
  const handleExportCSV = () => {
    try {
      // CSV Headers
      let csvContent = '\uFEFF'; // UTF-8 BOM for Excel Portuguese encoding compatibility
      csvContent += 'Nome;Categoria;Preço de Venda (R$);Custo de Ingredientes (R$);Taxas Aplicadas (%);Valor Taxas (R$);Lucro Líquido Unitário (R$);Margem Líquida (%);Vendas Estimadas;Faturamento Estimado (R$);Lucro Estimado (R$);Observações\n';

      products.forEach((p) => {
        const metrics = calculateProductMetrics(p, activeTaxRate);
        const qty = p.estimatedSales || 0;
        const revenue = p.sellingPrice * qty;
        const simulatedNetProfit = metrics.netProfit * qty;

        const row = [
          p.name.replace(/;/g, ','),
          (p.category || 'N/A').replace(/;/g, ','),
          p.sellingPrice.toFixed(2).replace('.', ','),
          metrics.cost.toFixed(2).replace('.', ','),
          activeTaxRate.toFixed(2).replace('.', ','),
          metrics.taxValue.toFixed(2).replace('.', ','),
          metrics.netProfit.toFixed(2).replace('.', ','),
          metrics.margin.toFixed(2).replace('.', ','),
          qty,
          revenue.toFixed(2).replace('.', ','),
          simulatedNetProfit.toFixed(2).replace('.', ','),
          (p.notes || '').replace(/;/g, ',').replace(/\n/g, ' ')
        ];

        csvContent += row.join(';') + '\n';
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `uraplanilha-produtos-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast('Planilha de produtos (CSV) exportada com sucesso!');
    } catch (err) {
      showToast('Erro ao exportar planilha CSV.', 'error');
    }
  };

  // JSON Import (Restore backup)
  const handleImportJSON = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        
        // Simple safety checks
        if (!parsed.products || !Array.isArray(parsed.products)) {
          throw new Error('Formato inválido: lista de produtos ausente.');
        }

        setProducts(parsed.products);
        if (parsed.taxes && Array.isArray(parsed.taxes)) setTaxes(parsed.taxes);
        if (parsed.fixedCosts && Array.isArray(parsed.fixedCosts)) setFixedCosts(parsed.fixedCosts);
        if (parsed.variableCosts && Array.isArray(parsed.variableCosts)) setVariableCosts(parsed.variableCosts);
        if (parsed.otherRevenues && Array.isArray(parsed.otherRevenues)) setOtherRevenues(parsed.otherRevenues);
        if (parsed.recipes && Array.isArray(parsed.recipes)) {
          setRecipes(parsed.recipes);
        } else {
          setRecipes([]);
        }

        showToast('Backup importado e restaurado com sucesso!');
        // Reset file input value
        event.target.value = '';
      } catch (err) {
        showToast('Falha na importação: Arquivo JSON de backup inválido.', 'error');
        event.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <Loader2 className="w-10 h-10 text-brand-tomato animate-spin mb-4" />
        <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Autenticando...</p>
      </div>
    );
  }

  if (!currentUser) {
    return <AuthScreen onSuccess={(user) => setCurrentUser(user)} />;
  }

  return (
    <div className="min-h-screen bg-bg-main dark:bg-zinc-950 text-zinc-800 dark:text-zinc-100 flex flex-col font-sans transition-colors duration-200">
      
      {/* 1. Sticky Header */}
      <Header 
        activeTaxRate={activeTaxRate}
        productCount={products.length}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        onExportJSON={handleExportJSON}
        onExportCSV={handleExportCSV}
        onImportJSON={handleImportJSON}
        onExportPDF={() => setIsPDFModalOpen(true)}
        currentUser={currentUser}
        onLogout={() => signOut(auth)}
      />

      {/* 2. Success/Error Toast notification */}
      {toast && (
        <div className="fixed top-20 right-4 z-50 flex items-center space-x-3.5 bg-white dark:bg-zinc-900 px-5 py-3.5 rounded-lg border shadow-lg animate-fade-in border-l-4 border-l-brand-tomato">
          {toast.type === 'success' ? (
            <div className="p-1 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 rounded-full">
              <Check className="w-4 h-4" />
            </div>
          ) : (
            <div className="p-1 bg-rose-100 dark:bg-rose-950/40 text-rose-600 rounded-full">
              <AlertCircle className="w-4 h-4" />
            </div>
          )}
          <div>
            <p className="text-xs font-bold text-zinc-950 dark:text-white">Notificação</p>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">{toast.message}</p>
          </div>
        </div>
      )}

      {/* 3. Main content area with horizontal sidebar navigation layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10 flex flex-col lg:flex-row gap-6">
        
        {/* Navigation Sidebar/Top Bar */}
        <nav className="w-full lg:w-64 shrink-0 bg-brand-terracota dark:bg-zinc-900 p-3.5 rounded-xl border border-brand-terracota dark:border-zinc-800 shadow-md flex flex-row lg:flex-col overflow-x-auto lg:overflow-x-visible gap-1.5 scrollbar-none self-start h-auto lg:sticky lg:top-24">
          
          {/* Dashboard Tab */}
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center space-x-3 px-4 py-3 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer whitespace-nowrap lg:w-full ${
              activeTab === 'dashboard'
                ? 'bg-brand-tomato text-white border border-white/10 shadow-sm'
                : 'text-orange-100/90 dark:text-zinc-400 hover:text-white dark:hover:text-white hover:bg-white/10 dark:hover:bg-zinc-800'
            }`}
            id="tab-btn-dashboard"
          >
            <BarChart3 className="w-4 h-4" />
            <span>Resumo Geral</span>
          </button>

          {/* PDV Tab */}
          <button
            onClick={() => setActiveTab('pdv')}
            className={`flex items-center space-x-3 px-4 py-3 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer whitespace-nowrap lg:w-full ${
              activeTab === 'pdv'
                ? 'bg-brand-tomato text-white border border-white/10 shadow-sm'
                : 'text-orange-100/90 dark:text-zinc-400 hover:text-white dark:hover:text-white hover:bg-white/10 dark:hover:bg-zinc-800'
            }`}
            id="tab-btn-pdv"
          >
            <Receipt className="w-4 h-4" />
            <span>PDV (Caixa)</span>
          </button>

          {/* Products Tab */}
          <button
            onClick={() => setActiveTab('produtos')}
            className={`flex items-center space-x-3 px-4 py-3 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer whitespace-nowrap lg:w-full ${
              activeTab === 'produtos'
                ? 'bg-brand-tomato text-white border border-white/10 shadow-sm'
                : 'text-orange-100/90 dark:text-zinc-400 hover:text-white dark:hover:text-white hover:bg-white/10 dark:hover:bg-zinc-800'
            }`}
            id="tab-btn-produtos"
          >
            <Layers className="w-4 h-4" />
            <span>Produtos</span>
          </button>

          {/* Taxes Tab */}
          <button
            onClick={() => setActiveTab('taxas')}
            className={`flex items-center space-x-3 px-4 py-3 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer whitespace-nowrap lg:w-full ${
              activeTab === 'taxas'
                ? 'bg-brand-tomato text-white border border-white/10 shadow-sm'
                : 'text-orange-100/90 dark:text-zinc-400 hover:text-white dark:hover:text-white hover:bg-white/10 dark:hover:bg-zinc-800'
            }`}
            id="tab-btn-taxas"
          >
            <Percent className="w-4 h-4" />
            <span>Taxas e Impostos</span>
          </button>

          {/* Fixed Costs Tab */}
          <button
            onClick={() => setActiveTab('custos')}
            className={`flex items-center space-x-3 px-4 py-3 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer whitespace-nowrap lg:w-full ${
              activeTab === 'custos'
                ? 'bg-brand-tomato text-white border border-white/10 shadow-sm'
                : 'text-orange-100/90 dark:text-zinc-400 hover:text-white dark:hover:text-white hover:bg-white/10 dark:hover:bg-zinc-800'
            }`}
            id="tab-btn-custos"
          >
            <Briefcase className="w-4 h-4" />
            <span>Planilha Completa</span>
          </button>

          {/* Simulator Tab */}
          <button
            onClick={() => setActiveTab('simulador')}
            className={`flex items-center space-x-3 px-4 py-3 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer whitespace-nowrap lg:w-full ${
              activeTab === 'simulador'
                ? 'bg-brand-tomato text-white border border-white/10 shadow-sm'
                : 'text-orange-100/90 dark:text-zinc-400 hover:text-white dark:hover:text-white hover:bg-white/10 dark:hover:bg-zinc-800'
            }`}
            id="tab-btn-simulador"
          >
            <Calculator className="w-4 h-4" />
            <span>Simulador Mensal</span>
          </button>

          {/* Reports Tab */}
          <button
            onClick={() => setActiveTab('relatorios')}
            className={`flex items-center space-x-3 px-4 py-3 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer whitespace-nowrap lg:w-full ${
              activeTab === 'relatorios'
                ? 'bg-brand-tomato text-white border border-white/10 shadow-sm'
                : 'text-orange-100/90 dark:text-zinc-400 hover:text-white dark:hover:text-white hover:bg-white/10 dark:hover:bg-zinc-800'
            }`}
            id="tab-btn-relatorios"
          >
            <FileText className="w-4 h-4" />
            <span>Relatórios</span>
          </button>

          {/* Recipes Tab */}
          <button
            onClick={() => setActiveTab('receitas')}
            className={`flex items-center space-x-3 px-4 py-3 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer whitespace-nowrap lg:w-full ${
              activeTab === 'receitas'
                ? 'bg-brand-tomato text-white border border-white/10 shadow-sm'
                : 'text-orange-100/90 dark:text-zinc-400 hover:text-white dark:hover:text-white hover:bg-white/10 dark:hover:bg-zinc-800'
            }`}
            id="tab-btn-receitas"
          >
            <BookOpen className="w-4 h-4" />
            <span>Receitas</span>
          </button>

          {/* iFood Import Tab */}
          <button
            onClick={() => setActiveTab('ifood')}
            className={`flex items-center space-x-3 px-4 py-3 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer whitespace-nowrap lg:w-full ${
              activeTab === 'ifood'
                ? 'bg-brand-tomato text-white border border-white/10 shadow-sm'
                : 'text-orange-100/90 dark:text-zinc-400 hover:text-white dark:hover:text-white hover:bg-white/10 dark:hover:bg-zinc-800'
            }`}
            id="tab-btn-ifood"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Importar iFood</span>
          </button>

          {/* Fornecedores Tab */}
          <button
            onClick={() => setActiveTab('fornecedores')}
            className={`flex items-center space-x-3 px-4 py-3 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer whitespace-nowrap lg:w-full ${
              activeTab === 'fornecedores'
                ? 'bg-brand-tomato text-white border border-white/10 shadow-sm'
                : 'text-orange-100/90 dark:text-zinc-400 hover:text-white dark:hover:text-white hover:bg-white/10 dark:hover:bg-zinc-800'
            }`}
            id="tab-btn-fornecedores"
          >
            <Briefcase className="w-4 h-4" />
            <span>Fornecedores</span>
          </button>

        </nav>

        {/* Dynamic content rendering with responsive animations */}
        <div className="flex-1 min-w-0 bg-transparent">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 text-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm">
              <Loader2 className="w-10 h-10 text-brand-tomato animate-spin mb-4" />
              <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Conectando ao banco de dados...</p>
              <p className="text-xs text-zinc-400 mt-1">Carregando suas informações em tempo real.</p>
            </div>
          ) : (
            <>
              {activeTab === 'dashboard' && (
                <Dashboard products={products} taxes={taxes} fixedCosts={fixedCosts} variableCosts={variableCosts} otherRevenues={otherRevenues} sales={sales} />
              )}
              {activeTab === 'pdv' && (
                <div className="space-y-6">
                  <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs">
                    <h2 className="text-xl font-extrabold text-zinc-950 dark:text-white tracking-tight">PDV (Frente de Caixa)</h2>
                    <p className="text-xs text-zinc-400 mt-1">Registre suas vendas presenciais, de balcão ou WhatsApp diretamente no banco de dados e controle o lucro líquido real em tempo real.</p>
                  </div>
                  <PDVSection products={products} taxes={taxes} sales={sales} />
                </div>
              )}
              {activeTab === 'produtos' && (
                <ProductTab products={products} setProducts={setProducts} taxes={taxes} />
              )}
              {activeTab === 'taxas' && (
                <TaxTab taxes={taxes} setTaxes={setTaxes} />
              )}
              {activeTab === 'custos' && (
                <FixedCostTab 
                  fixedCosts={fixedCosts} 
                  setFixedCosts={setFixedCosts} 
                  variableCosts={variableCosts}
                  setVariableCosts={setVariableCosts}
                  otherRevenues={otherRevenues}
                  setOtherRevenues={setOtherRevenues}
                />
              )}
              {activeTab === 'simulador' && (
                <SimulatorTab 
                  products={products} 
                  setProducts={setProducts} 
                  taxes={taxes} 
                  fixedCosts={fixedCosts} 
                  variableCosts={variableCosts}
                  otherRevenues={otherRevenues}
                />
              )}
              {activeTab === 'relatorios' && (
                <ReportsTab 
                  products={products} 
                  taxes={taxes} 
                  fixedCosts={fixedCosts} 
                  variableCosts={variableCosts}
                  otherRevenues={otherRevenues}
                  sales={sales}
                />
              )}
              {activeTab === 'receitas' && (
                <RecipesTab 
                  recipes={recipes} 
                  setRecipes={setRecipes} 
                  products={products} 
                />
              )}
              {activeTab === 'ifood' && (
                <IFoodImportTab 
                  products={products}
                  setProducts={setProducts}
                  showToast={showToast}
                />
              )}
              {activeTab === 'fornecedores' && (
                <SupplierTab 
                  suppliers={suppliers}
                  setSuppliers={setSuppliers}
                />
              )}
            </>
          )}
        </div>

      </main>

      {/* 4. Footer */}
      <footer className="py-6 border-t border-zinc-200 dark:border-zinc-850 text-center text-xs text-zinc-400 dark:text-zinc-500 bg-white dark:bg-zinc-900/60 mt-auto transition-colors">
        <div className="max-w-7xl mx-auto px-4">
          <p>© {new Date().getFullYear()} uRaplanilha • Painel de Inteligência Financeira • uRapFood</p>
          <p className="mt-1 font-medium text-brand-tomato/70 dark:text-brand-orange/60">
            Simplificando a precificação do delivery e iFood
          </p>
        </div>
      </footer>

      {/* PDF Export Customizer Modal */}
      <PDFExportModal
        isOpen={isPDFModalOpen}
        onClose={() => setIsPDFModalOpen(false)}
        products={products}
        taxes={taxes}
        fixedCosts={fixedCosts}
        recipes={recipes}
      />

    </div>
  );
}
