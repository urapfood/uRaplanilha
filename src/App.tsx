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
  Receipt,
  Calendar
} from 'lucide-react';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import ProductTab from './components/ProductTab';
import TaxTab from './components/TaxTab';
import FixedCostTab from './components/FixedCostTab';
import DailySalesTab from './components/DailySalesTab';
import ReportsTab from './components/ReportsTab';
import RecipesTab from './components/RecipesTab';
import PDFExportModal from './components/PDFExportModal';
import PDVSection from './components/PDVSection';
import SupplierTab from './components/SupplierTab';
import PricingCalculatorTab from './components/PricingCalculatorTab';
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
  auth, db
} from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot, setDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';
import AuthScreen from './components/AuthScreen';
import AdminLicensesTab from './components/AdminLicensesTab';
import PaywallScreen from './components/PaywallScreen';
import LandingSalesPage from './components/LandingSalesPage';
import FoodQuizScreen from './components/FoodQuizScreen';
import { Sliders, Sparkles, Clock, ShieldCheck, XCircle } from 'lucide-react';

export default function App() {
  // Local storage keys
  const STORAGE_KEY_THEME = 'uraplanilha_theme';

  // State: Dark Mode
  const [darkMode, setDarkMode] = useState<boolean>(true);

  // State: Authentication and Landing Page flow
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [showAuth, setShowAuth] = useState<boolean>(false);
  const [authInitialIsLogin, setAuthInitialIsLogin] = useState<boolean>(true);
  const [cancellingSubscription, setCancellingSubscription] = useState<boolean>(false);

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
  const [cleanedTodaySales, setCleanedTodaySales] = useState<boolean>(false);

  // State: Navigation Active Tab
  type TabType = 'dashboard' | 'produtos' | 'taxas' | 'custos' | 'simulador' | 'relatorios' | 'receitas' | 'pdv' | 'fornecedores' | 'precificacao' | 'admin-licenses';
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  // State: User profile and licensing state
  const [userProfile, setUserProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState<boolean>(true);

  // State: PDF Export Modal
  const [isPDFModalOpen, setIsPDFModalOpen] = useState<boolean>(false);
  const [productSearchTerm, setProductSearchTerm] = useState<string>('');
  const [productSelectedCategory, setProductSelectedCategory] = useState<string>('Todas');

  // State: Clear Data Confirm Modal
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);
  const [showSegmentConfirm, setShowSegmentConfirm] = useState<boolean>(false);
  const [isClearing, setIsClearing] = useState<boolean>(false);

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

  // Listen to user profile (licensing, custom field info) in real-time
  useEffect(() => {
    if (!currentUser) {
      setUserProfile(null);
      setProfileLoading(false);
      return;
    }

    setProfileLoading(true);
    const userDocRef = doc(db, 'users', currentUser.uid);
    const unsubscribe = onSnapshot(userDocRef, (snapshot) => {
      if (snapshot.exists()) {
        setUserProfile(snapshot.data());
      } else {
        setUserProfile({
          uid: currentUser.uid,
          email: currentUser.email,
          name: currentUser.displayName || 'Usuário uRapFood',
          licenseStatus: currentUser.email === 'urapfood@gmail.com' ? 'active' : 'pending'
        });
      }
      setProfileLoading(false);
    }, (error) => {
      console.error("Error subscribing to user profile document:", error);
      setProfileLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const isLicenseActive = useMemo(() => {
    if (!currentUser) return false;
    if (currentUser.email === 'urapfood@gmail.com') return true;
    
    // 1. Check if user is premium
    if (userProfile?.premium === true || userProfile?.licenseStatus === 'active') {
      return true;
    }

    // 2. Check if user is trial and trial has not expired
    if (userProfile?.status === 'trial' || userProfile?.licenseStatus === 'trial') {
      if (userProfile?.trialEndsAt) {
        const trialEndDate = new Date(userProfile.trialEndsAt);
        const now = new Date();
        return trialEndDate >= now;
      }
    }

    return false;
  }, [currentUser, userProfile]);

  // Programmatically remove any leftover or empty sales for today 2026-07-08 as requested by the user
  useEffect(() => {
    if (currentUser && sales.length > 0 && !cleanedTodaySales) {
      const todaySales = sales.filter(s => s.date.startsWith('2026-07-08'));
      if (todaySales.length > 0) {
        console.log(`Removing ${todaySales.length} sales for 2026-07-08 as requested.`);
        Promise.all(todaySales.map(sale => deleteSale(currentUser.uid, sale.id)))
          .then(() => {
            showToast('Dados de venda do dia 08/07/2026 limpos conforme solicitado.');
          })
          .catch(err => console.error("Error cleaning up 2026-07-08 sales:", err));
      }
      setCleanedTodaySales(true);
    }
  }, [currentUser, sales, cleanedTodaySales]);

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
  const handleCancelSubscription = () => {
    const whatsAppText = "Olá! Gostaria de alterar ou cancelar minha assinatura do uRapFood.";
    const whatsAppLink = `https://wa.me/55996507712?text=${encodeURIComponent(whatsAppText)}`;
    window.open(whatsAppLink, '_blank');
  };

  const handleChangeSegment = () => {
    setShowSegmentConfirm(true);
  };

  const confirmChangeSegment = async () => {
    try {
      if (!currentUser) return;
      const userRef = doc(db, 'users', currentUser.uid);
      await setDoc(userRef, { foodType: null, onboardingCompleted: false }, { merge: true });
      showToast("Selecione seu novo segmento de negócio.", "success");
      setShowSegmentConfirm(false);
    } catch (err) {
      console.error("Error resetting segment:", err);
      showToast("Erro ao redefinir segmento.", "error");
    }
  };

  const handleClearAllData = () => {
    setShowClearConfirm(true);
  };

  const confirmClearAllData = async () => {
    try {
      if (!currentUser) return;
      setIsClearing(true);
      
      const collectionsToClear = ['products', 'suppliers', 'recipes', 'fixedCosts', 'variableCosts', 'otherRevenues', 'sales'];
      for (const colName of collectionsToClear) {
        const colRef = collection(db, 'users', currentUser.uid, colName);
        const snapshot = await getDocs(colRef);
        for (const docSnap of snapshot.docs) {
          await deleteDoc(docSnap.ref);
        }
      }
      
      showToast("Sua planilha foi zerada e está 100% limpa!", "success");
      setShowClearConfirm(false);
    } catch (err) {
      console.error("Error clearing database:", err);
      showToast("Erro ao zerar banco de dados.", "error");
    } finally {
      setIsClearing(false);
    }
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
    if (!showAuth) {
      return (
        <LandingSalesPage 
          onStartTrial={() => {
            setAuthInitialIsLogin(false);
            setShowAuth(true);
          }} 
          onLogin={() => {
            setAuthInitialIsLogin(true);
            setShowAuth(true);
          }} 
        />
      );
    }
    return (
      <AuthScreen 
        onSuccess={(user) => setCurrentUser(user)} 
        onBack={() => setShowAuth(false)}
        initialIsLogin={authInitialIsLogin}
      />
    );
  }

  if (profileLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <Loader2 className="w-10 h-10 text-brand-tomato animate-spin mb-4" />
        <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Verificando Licença...</p>
        <p className="text-xs text-zinc-400 mt-1">Carregando dados de acesso uRapFood.</p>
      </div>
    );
  }

  if (!isLicenseActive) {
    return (
      <PaywallScreen 
        currentUser={currentUser} 
        userProfile={userProfile} 
        showToast={showToast} 
      />
    );
  }

  // Show food/snack selection quiz if onboarding is not completed
  if (!userProfile?.foodType && currentUser?.email !== 'urapfood@gmail.com') {
    return (
      <FoodQuizScreen
        currentUser={currentUser}
        userProfile={userProfile}
        showToast={showToast}
        onComplete={() => {
          // snap listener updates state automatically
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-bg-main dark:bg-zinc-950 text-zinc-800 dark:text-zinc-100 flex flex-col font-sans transition-colors duration-200">
      
      {/* 1. Sticky Header */}
      <Header 
        activeTaxRate={activeTaxRate}
        productCount={products.length}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        onExportPDF={() => setIsPDFModalOpen(true)}
        currentUser={currentUser}
        onLogout={() => signOut(auth)}
        userProfile={userProfile}
        onChangeSegment={handleChangeSegment}
        onClearAllData={handleClearAllData}
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

          {/* Precificação Tab */}
          <button
            onClick={() => setActiveTab('precificacao')}
            className={`flex items-center space-x-3 px-4 py-3 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer whitespace-nowrap lg:w-full ${
              activeTab === 'precificacao'
                ? 'bg-brand-tomato text-white border border-white/10 shadow-sm'
                : 'text-orange-100/90 dark:text-zinc-400 hover:text-white dark:hover:text-white hover:bg-white/10 dark:hover:bg-zinc-800'
            }`}
            id="tab-btn-precificacao"
          >
            <Calculator className="w-4 h-4" />
            <span>Precificação</span>
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

          {/* Daily Sales Tab */}
          <button
            onClick={() => setActiveTab('simulador')}
            className={`flex items-center space-x-3 px-4 py-3 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer whitespace-nowrap lg:w-full ${
              activeTab === 'simulador'
                ? 'bg-brand-tomato text-white border border-white/10 shadow-sm'
                : 'text-orange-100/90 dark:text-zinc-400 hover:text-white dark:hover:text-white hover:bg-white/10 dark:hover:bg-zinc-800'
            }`}
            id="tab-btn-simulador"
          >
            <Calendar className="w-4 h-4" />
            <span>Vendas do Dia</span>
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

          {/* Admin Licenças Tab */}
          {currentUser.email === 'urapfood@gmail.com' && (
            <button
              onClick={() => setActiveTab('admin-licenses')}
              className={`flex items-center space-x-3 px-4 py-3 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer whitespace-nowrap lg:w-full border ${
                activeTab === 'admin-licenses'
                  ? 'bg-purple-600 text-white border-purple-500 shadow-sm'
                  : 'text-purple-200 border-purple-500/20 hover:text-white dark:text-purple-300 hover:bg-purple-500/10'
              }`}
              id="tab-btn-admin-licenses"
            >
              <Sliders className="w-4 h-4 text-purple-300" />
              <span>Gerenciar Licenças</span>
            </button>
          )}

          {/* Subscription Status Widget */}
          {currentUser && currentUser.email !== 'urapfood@gmail.com' && (
            <div className="mt-auto pt-4 border-t border-white/10 dark:border-zinc-800 text-left text-white dark:text-zinc-300 space-y-2 hidden lg:block">
              <div className="p-3 bg-white/5 dark:bg-zinc-950/40 rounded-lg border border-white/5 dark:border-zinc-800 space-y-1.5">
                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-orange-200 dark:text-brand-tomato">
                  {userProfile?.premium === true || userProfile?.licenseStatus === 'active' ? (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Licença Ativa</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>Teste Grátis Ativo</span>
                    </>
                  )}
                </div>
                
                <div className="text-[11px] font-semibold text-white/90 dark:text-zinc-200">
                  {userProfile?.premium === true || userProfile?.licenseStatus === 'active'
                    ? 'Assinatura Ativa • R$ 15,90'
                    : 'Acesso para Teste Grátis'}
                </div>

                {userProfile?.trialEndsAt && !(userProfile?.premium === true || userProfile?.licenseStatus === 'active') && (
                  <div className="flex items-center gap-1 text-[10px] text-zinc-450 dark:text-zinc-500">
                    <Clock className="w-3 h-3 text-zinc-400" />
                    <span>Expira em {new Date(userProfile.trialEndsAt).toLocaleDateString('pt-BR')}</span>
                  </div>
                )}

                <button
                  onClick={handleCancelSubscription}
                  className="w-full mt-2 py-1.5 px-2.5 bg-red-600/20 hover:bg-red-600/30 text-rose-300 hover:text-white rounded-md text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1"
                >
                  <XCircle className="w-3 h-3" />
                  <span>Cancelar ou Alterar</span>
                </button>
              </div>
            </div>
          )}

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
                <Dashboard products={products} taxes={taxes} fixedCosts={fixedCosts} variableCosts={variableCosts} otherRevenues={otherRevenues} sales={sales} userProfile={userProfile} />
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
                <ProductTab 
                  products={products} 
                  setProducts={setProducts} 
                  taxes={taxes} 
                  suppliers={suppliers} 
                  searchTerm={productSearchTerm}
                  setSearchTerm={setProductSearchTerm}
                  selectedCategory={productSelectedCategory}
                  setSelectedCategory={setProductSelectedCategory}
                />
              )}
              {activeTab === 'precificacao' && (
                <PricingCalculatorTab products={products} taxes={taxes} suppliers={suppliers} />
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
                <DailySalesTab 
                  products={products} 
                  taxes={taxes} 
                  sales={sales}
                  showToast={showToast}
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
                  suppliers={suppliers}
                />
              )}
              {activeTab === 'receitas' && (
                <RecipesTab 
                  recipes={recipes} 
                  setRecipes={setRecipes} 
                  products={products} 
                />
              )}
              {activeTab === 'fornecedores' && (
                <SupplierTab 
                  suppliers={suppliers}
                  setSuppliers={setSuppliers}
                />
              )}
              {activeTab === 'admin-licenses' && currentUser.email === 'urapfood@gmail.com' && (
                <AdminLicensesTab 
                  currentUser={currentUser} 
                  showToast={showToast} 
                />
              )}
            </>
          )}
        </div>

      </main>

      {/* PDF Export Customizer Modal */}
      <PDFExportModal
        isOpen={isPDFModalOpen}
        onClose={() => setIsPDFModalOpen(false)}
        products={products}
        taxes={taxes}
        fixedCosts={fixedCosts}
        recipes={recipes}
        suppliers={suppliers}
        sales={sales}
        activeSearchTerm={productSearchTerm}
        activeCategory={productSelectedCategory}
      />

      {/* Clear Data Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-2xl overflow-hidden text-zinc-900 dark:text-zinc-100">
            <div className="flex items-center gap-3 text-red-500 mb-4">
              <AlertCircle className="w-8 h-8 shrink-0" />
              <div>
                <h3 className="text-lg font-black tracking-tight text-zinc-950 dark:text-white">ATENÇÃO: Limpar Tudo?</h3>
                <p className="text-xs text-red-500 font-semibold uppercase tracking-wider">Ação Irreversível</p>
              </div>
            </div>
            
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6 leading-relaxed">
              Você tem certeza de que deseja <span className="font-bold text-red-500">APAGAR ABSOLUTAMENTE TUDO</span> de sua conta? 
              Isso excluirá todos os produtos cadastrados, receitas de insumos, fornecedores salvos, custos fixos/variáveis e vendas registradas. 
              Sua planilha voltará ao estado 100% vazio (zerada) para você iniciar do zero.
            </p>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowClearConfirm(false)}
                disabled={isClearing}
                className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-bold hover:bg-zinc-100 dark:hover:bg-zinc-850 cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmClearAllData}
                disabled={isClearing}
                className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black tracking-wide flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-md shadow-red-600/10"
              >
                {isClearing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Limpando Tudo...</span>
                  </>
                ) : (
                  <span>Sim, Apagar Tudo</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Segment Change Confirmation Modal */}
      {showSegmentConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-2xl overflow-hidden text-zinc-900 dark:text-zinc-100">
            <div className="flex items-center gap-3 text-brand-tomato mb-4">
              <AlertCircle className="w-8 h-8 shrink-0 text-brand-tomato" />
              <div>
                <h3 className="text-lg font-black tracking-tight text-zinc-950 dark:text-white">Alterar Segmento?</h3>
                <p className="text-xs text-brand-tomato font-semibold uppercase tracking-wider">Ação Recomendada</p>
              </div>
            </div>
            
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6 leading-relaxed">
              Deseja realmente alterar seu segmento? Isso permitirá selecionar um novo tipo de negócio no Quiz/Onboarding (os dados já cadastrados de produtos, custos e vendas serão mantidos).
            </p>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowSegmentConfirm(false)}
                className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-bold hover:bg-zinc-100 dark:hover:bg-zinc-850 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={confirmChangeSegment}
                className="px-4 py-2.5 rounded-xl bg-brand-tomato hover:bg-brand-tomato/90 text-white text-xs font-black tracking-wide cursor-pointer shadow-md shadow-brand-tomato/15"
              >
                Sim, Mudar de Segmento
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
