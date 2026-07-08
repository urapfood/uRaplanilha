import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Minus, 
  RotateCcw, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Percent, 
  Info, 
  AlertCircle, 
  CheckCircle, 
  CalendarRange, 
  ListChecks, 
  Sparkles,
  ShoppingBag
} from 'lucide-react';
import { Product, Tax, Sale, SaleItem } from '../types';
import { getProductCost, calculateProductMetrics, formatCurrency, getActiveTaxPercentage } from '../utils';
import { saveSale, deleteSale, auth } from '../firebase';

interface DailySalesTabProps {
  products: Product[];
  taxes: Tax[];
  sales: Sale[];
  showToast: (message: string, type: 'success' | 'error') => void;
}

interface UndoAction {
  date: string;
  previousItems: SaleItem[];
}

export default function DailySalesTab({
  products,
  taxes,
  sales,
  showToast
}: DailySalesTabProps) {
  // Current active sub-tab: 'diario' or 'mensal'
  const [subTab, setSubTab] = useState<'diario' | 'mensal'>('diario');

  // Selected date state (defaults to today in local time YYYY-MM-DD)
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  // Undo stack state
  const [undoStack, setUndoStack] = useState<UndoAction[]>([]);

  // Active tax rate
  const activeTaxRate = useMemo(() => getActiveTaxPercentage(taxes), [taxes]);

  // Navigate dates
  const handlePrevDay = () => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() - 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setSelectedDate(`${year}-${month}-${day}`);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() + 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setSelectedDate(`${year}-${month}-${day}`);
  };

  const handleSetToday = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setSelectedDate(`${year}-${month}-${day}`);
  };

  // Find the single quick-sale document for the selected date
  const currentDailySale = useMemo(() => {
    const targetId = `daily_sale_${selectedDate}`;
    return sales.find(s => s.id === targetId) || null;
  }, [sales, selectedDate]);

  // Compile map of quantities for the selected day from our daily_sale document
  const dailyQuantities = useMemo(() => {
    const quantities: { [productId: string]: number } = {};
    if (currentDailySale) {
      currentDailySale.items.forEach(item => {
        quantities[item.productId] = item.quantity;
      });
    }
    return quantities;
  }, [currentDailySale]);

  // Compute stats in real-time for the selected date (combining all sales on that date)
  const dailyStats = useMemo(() => {
    // Filter all sales for this day (both quick sales and individual PDV sales if any exist)
    const daySales = sales.filter(s => s.date.startsWith(selectedDate));
    
    const revenue = daySales.reduce((sum, s) => sum + s.totalAmount, 0);
    const cost = daySales.reduce((sum, s) => sum + s.totalCost, 0);
    const taxesVal = daySales.reduce((sum, s) => sum + s.taxesAmount, 0);
    const grossProfit = revenue - cost;
    const netProfit = revenue - cost - taxesVal;
    const margin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

    return {
      revenue,
      cost,
      taxes: taxesVal,
      grossProfit,
      netProfit,
      margin
    };
  }, [sales, selectedDate]);

  // Update sale quantity for a product on the selected date
  const handleUpdateQuantity = async (product: Product, newQty: number) => {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      showToast('Erro: Usuário não autenticado.', 'error');
      return;
    }

    const currentItems = currentDailySale ? [...currentDailySale.items] : [];
    
    // Save current items state to undo stack before modifying
    setUndoStack(prev => [...prev, {
      date: selectedDate,
      previousItems: JSON.parse(JSON.stringify(currentItems))
    }]);

    let updatedItems = [...currentItems];
    const existingIndex = updatedItems.findIndex(item => item.productId === product.id);

    if (newQty <= 0) {
      // Remove item
      if (existingIndex !== -1) {
        updatedItems.splice(existingIndex, 1);
      }
    } else {
      const itemCost = getProductCost(product);
      const updatedItem: SaleItem = {
        productId: product.id,
        productName: product.name,
        quantity: newQty,
        unitPrice: product.sellingPrice,
        totalPrice: product.sellingPrice * newQty,
        unitCost: itemCost
      };

      if (existingIndex !== -1) {
        updatedItems[existingIndex] = updatedItem;
      } else {
        updatedItems.push(updatedItem);
      }
    }

    try {
      if (updatedItems.length === 0) {
        // If no items left, delete the document
        await deleteSale(userId, `daily_sale_${selectedDate}`);
      } else {
        // Recalculate totals
        const totalAmount = updatedItems.reduce((sum, item) => sum + item.totalPrice, 0);
        const totalCost = updatedItems.reduce((sum, item) => sum + (item.unitCost * item.quantity), 0);
        const taxesAmount = (totalAmount * activeTaxRate) / 100;
        const netProfit = totalAmount - totalCost - taxesAmount;

        const updatedSale: Sale = {
          id: `daily_sale_${selectedDate}`,
          date: `${selectedDate}T12:00:00.000Z`,
          items: updatedItems,
          discount: 0,
          paymentMethod: 'pix',
          totalAmount,
          totalCost,
          taxesAmount,
          netProfit
        };

        await saveSale(userId, updatedSale);
      }
    } catch (err) {
      console.error(err);
      showToast('Erro ao atualizar venda.', 'error');
    }
  };

  // Undo last action
  const handleUndo = async () => {
    if (undoStack.length === 0) return;
    const lastAction = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));

    const userId = auth.currentUser?.uid;
    if (!userId) return;

    try {
      if (lastAction.previousItems.length === 0) {
        await deleteSale(userId, `daily_sale_${lastAction.date}`);
      } else {
        const items = lastAction.previousItems;
        const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);
        const totalCost = items.reduce((sum, item) => sum + (item.unitCost * item.quantity), 0);
        const taxesAmount = (totalAmount * activeTaxRate) / 100;
        const netProfit = totalAmount - totalCost - taxesAmount;

        const updatedSale: Sale = {
          id: `daily_sale_${lastAction.date}`,
          date: `${lastAction.date}T12:00:00.000Z`,
          items,
          discount: 0,
          paymentMethod: 'pix',
          totalAmount,
          totalCost,
          taxesAmount,
          netProfit
        };
        await saveSale(userId, updatedSale);
      }
      showToast('Último lançamento desfeito com sucesso!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Erro ao desfazer ação.', 'error');
    }
  };

  // Get days in current month that have entries
  const currentMonthYear = useMemo(() => {
    return selectedDate.substring(0, 7); // 'YYYY-MM'
  }, [selectedDate]);

  const activeDaysInMonth = useMemo(() => {
    const dates = new Set<string>();
    sales.forEach(s => {
      if (s.date.startsWith(currentMonthYear)) {
        dates.add(s.date.substring(0, 10));
      }
    });
    return Array.from(dates).sort();
  }, [sales, currentMonthYear]);

  // Aggregate monthly metrics based on real daily sales
  const monthlyAggregates = useMemo(() => {
    const monthlySales = sales.filter(s => s.date.startsWith(currentMonthYear));
    
    let totalRevenue = 0;
    let totalCost = 0;
    let totalTaxes = 0;
    let totalQty = 0;

    const productTotals: { [id: string]: { qty: number; revenue: number; cost: number; profit: number } } = {};
    products.forEach(p => {
      productTotals[p.id] = { qty: 0, revenue: 0, cost: 0, profit: 0 };
    });

    monthlySales.forEach(sale => {
      totalRevenue += sale.totalAmount;
      totalCost += sale.totalCost;
      totalTaxes += sale.taxesAmount;

      sale.items.forEach(item => {
        totalQty += item.quantity;
        if (!productTotals[item.productId]) {
          productTotals[item.productId] = { qty: 0, revenue: 0, cost: 0, profit: 0 };
        }
        productTotals[item.productId].qty += item.quantity;
        productTotals[item.productId].revenue += item.totalPrice;
        productTotals[item.productId].cost += item.unitCost * item.quantity;
      });
    });

    const netProfit = totalRevenue - totalCost - totalTaxes;
    const grossProfit = totalRevenue - totalCost;

    // Map back to products
    const productRows = products.map(p => {
      const totals = productTotals[p.id] || { qty: 0, revenue: 0, cost: 0 };
      const metrics = calculateProductMetrics(p, activeTaxRate);
      const prodNetProfit = totals.revenue - totals.cost - ((totals.revenue * activeTaxRate) / 100);
      
      return {
        product: p,
        qty: totals.qty,
        revenue: totals.revenue,
        cost: totals.cost,
        netProfit: prodNetProfit,
        margin: totals.revenue > 0 ? (prodNetProfit / totals.revenue) * 100 : metrics.margin
      };
    }).filter(row => row.qty > 0); // Only show products with actual sales in that month

    return {
      totalRevenue,
      totalCost,
      totalTaxes,
      grossProfit,
      netProfit,
      totalQty,
      productRows
    };
  }, [sales, currentMonthYear, products, activeTaxRate]);

  // Parse Brazilian Month Names
  const formatMonthName = (yearMonthStr: string) => {
    const [year, month] = yearMonthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    const monthName = date.toLocaleDateString('pt-BR', { month: 'long' });
    return monthName.charAt(0).toUpperCase() + monthName.slice(1) + ' / ' + year;
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      
      {/* Tab Segmented Control */}
      <div className="flex justify-center sm:justify-start border-b border-zinc-200 dark:border-zinc-800 pb-px gap-6">
        <button
          onClick={() => setSubTab('diario')}
          className={`pb-3 text-sm font-bold uppercase tracking-wider transition-colors relative cursor-pointer ${
            subTab === 'diario'
              ? 'text-brand-tomato border-b-2 border-brand-tomato font-extrabold'
              : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            <span>Lançamento do Dia</span>
          </div>
        </button>
        <button
          onClick={() => setSubTab('mensal')}
          className={`pb-3 text-sm font-bold uppercase tracking-wider transition-colors relative cursor-pointer ${
            subTab === 'mensal'
              ? 'text-brand-tomato border-b-2 border-brand-tomato font-extrabold'
              : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <CalendarRange className="w-4 h-4" />
            <span>Resumo do Mês</span>
          </div>
        </button>
      </div>

      {subTab === 'diario' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Main Launch Area (Left 8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Header controls with Date Selector & Undo Button */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              
              {/* Date Navigation */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={handlePrevDay}
                  className="p-2 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-600 dark:text-zinc-400 cursor-pointer transition-colors"
                  title="Dia Anterior"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                
                {/* Date Input Box */}
                <div className="relative">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg py-2 px-3 text-sm font-bold text-zinc-800 dark:text-zinc-200 focus:ring-2 focus:ring-brand-tomato focus:border-brand-tomato"
                  />
                </div>

                <button
                  onClick={handleNextDay}
                  className="p-2 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-600 dark:text-zinc-400 cursor-pointer transition-colors"
                  title="Próximo Dia"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>

                <button
                  onClick={handleSetToday}
                  className="px-3 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-bold rounded-lg cursor-pointer transition-all"
                >
                  Hoje
                </button>
              </div>

              {/* Undo action button */}
              <div>
                <button
                  onClick={handleUndo}
                  disabled={undoStack.length === 0}
                  className="w-full sm:w-auto px-4 py-2.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-40 disabled:hover:bg-zinc-100 disabled:dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs border border-zinc-200/50 dark:border-zinc-700/50"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Desfazer última ação</span>
                  {undoStack.length > 0 && (
                    <span className="bg-brand-tomato text-white text-[10px] px-1.5 py-0.5 rounded-full">
                      {undoStack.length}
                    </span>
                  )}
                </button>
              </div>

            </div>

            {/* Live Day Totals Card */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3 mb-4">
                <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                  Resultados do Dia: {new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                </span>
                {dailyStats.revenue > 0 && (
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                    dailyStats.netProfit >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
                  }`}>
                    {dailyStats.margin.toFixed(1)}% Margem Líquida
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                
                {/* Revenue */}
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Faturamento</p>
                  <p className="text-lg font-bold text-zinc-950 dark:text-white font-mono">{formatCurrency(dailyStats.revenue)}</p>
                </div>

                {/* Cost */}
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Custos Insumos</p>
                  <p className="text-lg font-bold text-zinc-700 dark:text-zinc-400 font-mono">-{formatCurrency(dailyStats.cost)}</p>
                </div>

                {/* Taxes */}
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Taxas e Imp.</p>
                  <p className="text-lg font-bold text-zinc-500 dark:text-zinc-400 font-mono">-{formatCurrency(dailyStats.taxes)}</p>
                </div>

                {/* Gross Profit */}
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Lucro Bruto</p>
                  <p className="text-lg font-bold text-zinc-950 dark:text-zinc-200 font-mono">{formatCurrency(dailyStats.grossProfit)}</p>
                </div>

                {/* Net Profit */}
                <div className="space-y-1 col-span-2 sm:col-span-1">
                  <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Lucro Líquido</p>
                  <p className={`text-lg font-extrabold font-mono ${
                    dailyStats.netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                  }`}>{formatCurrency(dailyStats.netProfit)}</p>
                </div>

              </div>
            </div>

            {/* Product Quick Launcher List */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm space-y-4">
              <div className="border-b border-zinc-100 dark:border-zinc-800 pb-3">
                <h3 className="text-base font-bold text-zinc-950 dark:text-white flex items-center gap-1.5">
                  <ShoppingBag className="w-5 h-5 text-brand-tomato" />
                  <span>Produtos e Lançamento Rápido</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-1">Clique nos botões de +1 e -1 ou altere diretamente o campo numérico de cada produto vendido.</p>
              </div>

              {products.length === 0 ? (
                <div className="text-center py-12 text-zinc-400 dark:text-zinc-500">
                  <AlertCircle className="w-10 h-10 mx-auto opacity-40 mb-2" />
                  <p className="text-xs font-bold">Nenhum produto cadastrado no uRaplanilha.</p>
                  <p className="text-[10px] mt-0.5">Cadastre seus produtos na aba "Produtos" primeiro.</p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                  {products.map((product) => {
                    const metrics = calculateProductMetrics(product, activeTaxRate);
                    const qty = dailyQuantities[product.id] || 0;
                    
                    return (
                      <div key={product.id} className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        
                        {/* Product info details */}
                        <div className="space-y-0.5 min-w-0 flex-1">
                          <p className="text-sm font-bold text-zinc-900 dark:text-white truncate">{product.name}</p>
                          <div className="flex items-center gap-2 text-xs text-zinc-400 dark:text-zinc-500">
                            <span>Preço: <strong className="text-zinc-700 dark:text-zinc-300">{formatCurrency(product.sellingPrice)}</strong></span>
                            <span>•</span>
                            <span>Lucro Lq. Unit: <strong className="text-emerald-600 dark:text-emerald-400">{formatCurrency(metrics.netProfit)}</strong></span>
                            <span>•</span>
                            <span className="px-1.5 py-0.2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-md text-[10px] font-bold">
                              {metrics.margin.toFixed(0)}% mrg
                            </span>
                          </div>
                        </div>

                        {/* Interactive Counter Controls */}
                        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                          
                          {/* Live Product Total */}
                          {qty > 0 && (
                            <div className="text-right hidden sm:block">
                              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Subtotal</p>
                              <p className="text-xs font-bold text-zinc-950 dark:text-zinc-200 font-mono">{formatCurrency(product.sellingPrice * qty)}</p>
                            </div>
                          )}

                          {/* -1 Button */}
                          <div className="flex items-center space-x-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-1">
                            <button
                              type="button"
                              onClick={() => handleUpdateQuantity(product, qty - 1)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 cursor-pointer transition-colors"
                            >
                              <Minus className="w-4 h-4" />
                            </button>

                            {/* Direct numeric input */}
                            <input
                              type="number"
                              min="0"
                              value={qty || ''}
                              placeholder="0"
                              onChange={(e) => {
                                const val = parseInt(e.target.value);
                                handleUpdateQuantity(product, isNaN(val) ? 0 : Math.max(0, val));
                              }}
                              className="w-12 h-8 text-center bg-transparent border-none text-sm font-bold font-mono text-zinc-950 dark:text-white focus:outline-none"
                            />

                            {/* +1 Button */}
                            <button
                              type="button"
                              onClick={() => handleUpdateQuantity(product, qty + 1)}
                              className="w-8 h-8 rounded-lg bg-brand-tomato text-white flex items-center justify-center hover:bg-brand-tomato/90 cursor-pointer transition-colors shadow-xs"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>

                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

          {/* Activity Tracker Sidebar (Right 4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Days with entries list */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
              <div className="border-b border-zinc-100 dark:border-zinc-800 pb-3">
                <h4 className="text-sm font-bold text-zinc-950 dark:text-white flex items-center gap-1.5">
                  <ListChecks className="w-4.5 h-4.5 text-brand-orange" />
                  <span>Calendário do Mês</span>
                </h4>
                <p className="text-[11px] text-zinc-400 mt-1">Veja quais dias de <strong className="text-zinc-700 dark:text-zinc-300">{formatMonthName(currentMonthYear)}</strong> já têm vendas lançadas.</p>
              </div>

              {/* Day tracker grid list */}
              <div className="grid grid-cols-7 gap-2 text-center text-[11px] font-bold">
                {/* Headers */}
                {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((h, i) => (
                  <span key={i} className="text-zinc-400 dark:text-zinc-500 uppercase">{h}</span>
                ))}
                
                {/* Compile days of month */}
                {(() => {
                  const [yr, mt] = currentMonthYear.split('-');
                  const yearNum = parseInt(yr);
                  const monthNum = parseInt(mt);
                  
                  const firstDayIndex = new Date(yearNum, monthNum - 1, 1).getDay();
                  const totalDays = new Date(yearNum, monthNum, 0).getDate();

                  const cells = [];
                  // Empty space before first day
                  for (let i = 0; i < firstDayIndex; i++) {
                    cells.push(<div key={`empty-${i}`} />);
                  }

                  // Day numbers
                  for (let d = 1; d <= totalDays; d++) {
                    const dayStr = String(d).padStart(2, '0');
                    const formattedCellDate = `${currentMonthYear}-${dayStr}`;
                    const isSelected = selectedDate === formattedCellDate;
                    const hasEntries = activeDaysInMonth.includes(formattedCellDate);

                    cells.push(
                      <button
                        key={d}
                        onClick={() => setSelectedDate(formattedCellDate)}
                        className={`w-full py-2.5 rounded-lg text-xs font-bold transition-all relative cursor-pointer ${
                          isSelected
                            ? 'bg-brand-tomato text-white shadow-sm ring-2 ring-brand-tomato/20 scale-105'
                            : hasEntries
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'
                              : 'bg-zinc-50 dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                        }`}
                      >
                        <span>{d}</span>
                        {hasEntries && !isSelected && (
                          <span className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-500" />
                        )}
                      </button>
                    );
                  }

                  return cells;
                })()}
              </div>

              {/* Legend details */}
              <div className="flex items-center gap-4 text-[10px] text-zinc-400 border-t border-zinc-100 dark:border-zinc-800 pt-3">
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded bg-emerald-100 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-800 inline-block" />
                  <span>Com vendas</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded bg-zinc-100 dark:bg-zinc-800 inline-block" />
                  <span>Sem vendas</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded bg-brand-tomato inline-block" />
                  <span>Selecionado</span>
                </div>
              </div>

            </div>

          </div>

        </div>
      ) : (
        /* Monthly Aggregates View 'mensal' */
        <div className="space-y-6">
          
          {/* Month selector header */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-brand-tomato/10 text-brand-tomato rounded-xl">
                <CalendarRange className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-zinc-950 dark:text-white tracking-tight">
                  Soma dos Lançamentos Diários Reais
                </h4>
                <p className="text-xs text-zinc-400 mt-0.5">Visão consolidada calculada a partir de todos os dias lançados em {formatMonthName(currentMonthYear)}.</p>
              </div>
            </div>

            {/* Simple month selection dropdown */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Mês:</label>
              <input
                type="month"
                value={currentMonthYear}
                onChange={(e) => {
                  if (e.target.value) {
                    setSelectedDate(`${e.target.value}-01`);
                  }
                }}
                className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg py-2 px-3 text-sm font-bold text-zinc-800 dark:text-zinc-200 focus:ring-2 focus:ring-brand-tomato focus:border-brand-tomato"
              />
            </div>
          </div>

          {/* Monthly stats cards */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
            
            <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200/60 dark:border-zinc-800 shadow-sm">
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Faturamento do Mês</p>
              <h4 className="text-xl font-bold text-zinc-950 dark:text-white mt-1 font-mono">{formatCurrency(monthlyAggregates.totalRevenue)}</h4>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200/60 dark:border-zinc-800 shadow-sm">
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Custos de Insumos</p>
              <h4 className="text-xl font-bold text-zinc-500 font-mono mt-1">-{formatCurrency(monthlyAggregates.totalCost)}</h4>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200/60 dark:border-zinc-800 shadow-sm">
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Impostos Pagos</p>
              <h4 className="text-xl font-bold text-zinc-500 font-mono mt-1">-{formatCurrency(monthlyAggregates.totalTaxes)}</h4>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200/60 dark:border-zinc-800 shadow-sm">
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Lucro Bruto do Mês</p>
              <h4 className="text-xl font-bold text-zinc-900 dark:text-zinc-200 font-mono mt-1">{formatCurrency(monthlyAggregates.grossProfit)}</h4>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200/60 dark:border-zinc-800 shadow-sm">
              <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Lucro Líquido Real</p>
              <h4 className={`text-xl font-extrabold font-mono mt-1 ${
                monthlyAggregates.netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}>{formatCurrency(monthlyAggregates.netProfit)}</h4>
            </div>

          </div>

          {/* Monthly product sales breakdown table */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
            <div className="border-b border-zinc-100 dark:border-zinc-800 pb-3 mb-4">
              <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-brand-orange" />
                <span>Desempenho dos Produtos no Mês</span>
              </h3>
            </div>

            {monthlyAggregates.productRows.length === 0 ? (
              <div className="text-center py-16 text-zinc-400 dark:text-zinc-500">
                <AlertCircle className="w-10 h-10 mx-auto opacity-45 stroke-1.5 mb-2" />
                <p className="text-xs font-bold">Nenhuma venda lançada neste mês.</p>
                <p className="text-[10px] mt-0.5">Troque para a sub-aba "Lançamento do Dia" e adicione suas vendas.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-zinc-100 dark:border-zinc-800 text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                      <th className="py-3 px-3">Produto</th>
                      <th className="py-3 px-3 text-right">Qtd Vendida</th>
                      <th className="py-3 px-3 text-right">Preço de Venda</th>
                      <th className="py-3 px-3 text-right">Faturamento</th>
                      <th className="py-3 px-3 text-right">Custo Total</th>
                      <th className="py-3 px-3 text-right">Lucro Líquido</th>
                      <th className="py-3 px-3 text-center">Margem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                    {monthlyAggregates.productRows.map(({ product, qty, revenue, cost, netProfit, margin }) => (
                      <tr key={product.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 transition-colors">
                        <td className="py-3.5 px-3 font-bold text-zinc-900 dark:text-white">{product.name}</td>
                        <td className="py-3.5 px-3 text-right font-mono font-bold text-zinc-800 dark:text-zinc-200">{qty} unid.</td>
                        <td className="py-3.5 px-3 text-right font-mono text-zinc-500">{formatCurrency(product.sellingPrice)}</td>
                        <td className="py-3.5 px-3 text-right font-mono font-bold text-zinc-900 dark:text-white">{formatCurrency(revenue)}</td>
                        <td className="py-3.5 px-3 text-right font-mono text-zinc-500">-{formatCurrency(cost)}</td>
                        <td className={`py-3.5 px-3 text-right font-mono font-bold ${
                          netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        }`}>{formatCurrency(netProfit)}</td>
                        <td className="py-3.5 px-3 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            margin >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
                          }`}>
                            {margin.toFixed(0)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

          </div>

        </div>
      )}

    </div>
  );
}
