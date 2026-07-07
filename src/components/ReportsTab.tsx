import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  Briefcase, 
  Calculator, 
  Calendar, 
  Clock, 
  Info, 
  Percent, 
  TrendingDown, 
  Coffee, 
  Package, 
  BarChart3, 
  Award,
  ChevronRight,
  PieChart as PieIcon,
  HelpCircle
} from 'lucide-react';
import { Product, Tax, FixedCost, VariableCost, OtherRevenue, Sale } from '../types';
import { formatCurrency, formatPercent, getActiveTaxPercentage, calculateProductMetrics } from '../utils';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  Legend
} from 'recharts';

interface ReportsTabProps {
  products: Product[];
  taxes: Tax[];
  fixedCosts: FixedCost[];
  variableCosts: VariableCost[];
  otherRevenues: OtherRevenue[];
  sales?: Sale[];
}

export default function ReportsTab({ products, taxes, fixedCosts, variableCosts, otherRevenues, sales = [] }: ReportsTabProps) {
  // Sub-tabs: 'dia' | 'semana' | 'mes'
  const [reportSubTab, setReportSubTab] = useState<'dia' | 'semana' | 'mes'>('dia');
  
  // Customization state for Daily view: operational days per month
  const [operationalDays, setOperationalDays] = useState<number>(26); // Default 26 days (closed on Mondays, for example)

  // 1. Core calculations (Monthly level)
  const activeTaxPercentage = useMemo(() => getActiveTaxPercentage(taxes), [taxes]);

  const monthlyMetrics = useMemo(() => {
    let totalRevenue = 0;
    let totalIngredientsCost = 0;
    let totalTaxesPaid = 0;
    let totalNetProfit = 0;
    let totalQty = 0;

    const productRows = products.map((product) => {
      const metrics = calculateProductMetrics(product, activeTaxPercentage);
      const qty = product.estimatedSales || 0;
      const revenue = product.sellingPrice * qty;
      const ingredientsCost = metrics.cost * qty;
      const taxesPaid = metrics.taxValue * qty;
      const netProfit = metrics.netProfit * qty;

      totalRevenue += revenue;
      totalIngredientsCost += ingredientsCost;
      totalTaxesPaid += taxesPaid;
      totalNetProfit += netProfit;
      totalQty += qty;

      return {
        id: product.id,
        name: product.name,
        category: product.category || 'Outros',
        qty,
        revenue,
        ingredientsCost,
        taxesPaid,
        netProfit,
        unitNetProfit: metrics.netProfit,
        margin: metrics.margin
      };
    });

    const totalFixed = fixedCosts.reduce((sum, item) => sum + item.monthlyValue, 0);
    const totalVariableSpreadsheet = variableCosts.reduce((sum, item) => sum + item.monthlyValue, 0);
    const totalDespesas = totalFixed + totalVariableSpreadsheet;
    
    // Include real PDV sales in totals
    const pdvRevenue = sales.reduce((sum, s) => sum + s.totalAmount, 0);
    const pdvNetProfit = sales.reduce((sum, s) => sum + s.netProfit, 0);
    const pdvIngredientsCost = sales.reduce((sum, s) => sum + s.totalCost, 0);
    const pdvTaxes = sales.reduce((sum, s) => sum + s.taxesAmount, 0);
    const pdvQty = sales.reduce((sum, s) => sum + s.items.reduce((acc, item) => acc + item.quantity, 0), 0);

    const combinedRevenue = totalRevenue + pdvRevenue;
    const combinedNetProfit = totalNetProfit + pdvNetProfit;
    const combinedIngredientsCost = totalIngredientsCost + pdvIngredientsCost;
    const combinedTaxes = totalTaxesPaid + pdvTaxes;
    const combinedQty = totalQty + pdvQty;

    const totalOther = otherRevenues.reduce((sum, item) => sum + item.monthlyValue, 0);
    const finalResult = combinedNetProfit - totalDespesas + totalOther;

    return {
      productRows,
      totalRevenue: combinedRevenue,
      totalIngredientsCost: combinedIngredientsCost,
      totalTaxesPaid: combinedTaxes,
      totalNetProfit: combinedNetProfit, // Net profit from products (contribution margin in R$)
      totalFixed,
      totalVariableSpreadsheet,
      totalDespesas,
      totalOther,
      finalResult, // Bottom-line cash left
      totalQty: combinedQty,
      pdvRevenue,
      pdvNetProfit,
      simulatedRevenue: totalRevenue,
      simulatedNetProfit: totalNetProfit
    };
  }, [products, taxes, fixedCosts, variableCosts, otherRevenues, sales, activeTaxPercentage]);

  // 2. Calculations for "Por Dia" (Daily view)
  const dailyMetrics = useMemo(() => {
    const days = Math.max(1, Math.min(31, operationalDays));
    
    return {
      revenue: monthlyMetrics.totalRevenue / days,
      ingredientsCost: monthlyMetrics.totalIngredientsCost / days,
      taxes: monthlyMetrics.totalTaxesPaid / days,
      productNetProfit: monthlyMetrics.totalNetProfit / days,
      fixedCost: monthlyMetrics.totalFixed / days,
      otherRevenues: monthlyMetrics.totalOther / days,
      finalResult: monthlyMetrics.finalResult / days,
      qty: monthlyMetrics.totalQty / days
    };
  }, [monthlyMetrics, operationalDays]);

  // Projected typical week weightings (normalization factors)
  // Delivery business typical distribution: Friday & Saturday are peaks, Mon/Tue are quiet.
  const WEEKDAY_WEIGHTS = [
    { name: 'Segunda', weight: 0.5, label: 'Seg' },
    { name: 'Terça', weight: 0.6, label: 'Ter' },
    { name: 'Quarta', weight: 0.8, label: 'Qua' },
    { name: 'Quinta', weight: 0.9, label: 'Qui' },
    { name: 'Sexta', weight: 1.5, label: 'Sex' },
    { name: 'Sábado', weight: 1.7, label: 'Sáb' },
    { name: 'Domingo', weight: 1.3, label: 'Dom' }
  ];

  const weekdayData = useMemo(() => {
    const totalWeights = WEEKDAY_WEIGHTS.reduce((sum, day) => sum + day.weight, 0);
    
    // Monthly metrics divided by 4.33 to get average weekly metrics
    const weeklyRevenue = monthlyMetrics.totalRevenue / 4.33;
    const weeklyNetProfit = monthlyMetrics.totalNetProfit / 4.33;
    const weeklyFixedCost = monthlyMetrics.totalFixed / 4.33;

    return WEEKDAY_WEIGHTS.map(day => {
      const dayFactor = day.weight / totalWeights;
      const dayRevenue = weeklyRevenue * dayFactor * 7; // relative to their proportion of average day
      const dayNetProfit = weeklyNetProfit * dayFactor * 7;
      // Fixed costs are evenly distributed daily, they don't fluctuate with sales volume
      const dayFixedCost = weeklyFixedCost / 7;
      const daySobra = dayNetProfit - dayFixedCost;

      return {
        name: day.name,
        label: day.label,
        'Faturamento': Number(dayRevenue.toFixed(2)),
        'Lucro Líquido': Number(dayNetProfit.toFixed(2)),
        'Custos Fixos': Number(dayFixedCost.toFixed(2)),
        'Sobra Diária': Number(daySobra.toFixed(2))
      };
    });
  }, [monthlyMetrics]);

  // 3. Calculations for "Por Semana" (Weekly view)
  const weeklyMetrics = useMemo(() => {
    // 1 month = 4.33 weeks on average
    return {
      revenue: monthlyMetrics.totalRevenue / 4.33,
      ingredientsCost: monthlyMetrics.totalIngredientsCost / 4.33,
      taxes: monthlyMetrics.totalTaxesPaid / 4.33,
      productNetProfit: monthlyMetrics.totalNetProfit / 4.33,
      fixedCost: monthlyMetrics.totalFixed / 4.33,
      otherRevenues: monthlyMetrics.totalOther / 4.33,
      finalResult: monthlyMetrics.finalResult / 4.33,
      qty: monthlyMetrics.totalQty / 4.33
    };
  }, [monthlyMetrics]);

  // Projected 4 Weeks of the Month chart data
  const weeklyDistributionData = useMemo(() => {
    const baseRev = monthlyMetrics.totalRevenue / 4.33;
    const baseProfit = monthlyMetrics.totalNetProfit / 4.33;
    const baseFixed = (monthlyMetrics.totalFixed + monthlyMetrics.totalVariableSpreadsheet) / 4.33;

    // We can simulate slightly different performance across weeks (e.g. Week 1 is after payday, Week 3/4 are slightly calmer)
    const WEEKS_MULTIPLIERS = [1.15, 1.05, 0.90, 0.90]; // averages to ~1.0 per week over 4 weeks
    
    return [1, 2, 3, 4].map((wk, idx) => {
      const mult = WEEKS_MULTIPLIERS[idx];
      const rev = baseRev * mult;
      const profit = baseProfit * mult;
      const fixed = baseFixed; // Fixed costs don't vary
      const sobra = profit - fixed;

      return {
        name: `Semana ${wk}`,
        'Faturamento': Number(rev.toFixed(2)),
        'Lucro': Number(profit.toFixed(2)),
        'Sobra Líquida': Number(sobra.toFixed(2))
      };
    });
  }, [monthlyMetrics]);

  // 4. Category breakdown calculations
  const categoryMetrics = useMemo(() => {
    const categories: { [key: string]: { revenue: number; profit: number; qty: number } } = {};
    
    monthlyMetrics.productRows.forEach(row => {
      const cat = row.category;
      if (!categories[cat]) {
        categories[cat] = { revenue: 0, profit: 0, qty: 0 };
      }
      categories[cat].revenue += row.revenue;
      categories[cat].profit += row.netProfit;
      categories[cat].qty += row.qty;
    });

    return Object.keys(categories).map(name => {
      const data = categories[name];
      const revenueShare = monthlyMetrics.totalRevenue > 0 ? (data.revenue / monthlyMetrics.totalRevenue) * 100 : 0;
      const profitShare = monthlyMetrics.totalNetProfit > 0 ? (data.profit / monthlyMetrics.totalNetProfit) * 100 : 0;
      return {
        name,
        revenue: data.revenue,
        profit: data.profit,
        qty: data.qty,
        revenueShare,
        profitShare
      };
    }).sort((a, b) => b.profit - a.profit);
  }, [monthlyMetrics]);

  // 5. Breakeven calculations (Ponto de Equilíbrio)
  const breakevenMetrics = useMemo(() => {
    const totalRev = monthlyMetrics.totalRevenue;
    const totalProfit = monthlyMetrics.totalNetProfit;
    const fixedCostsValue = monthlyMetrics.totalFixed + monthlyMetrics.totalVariableSpreadsheet;

    // Contribution margin ratio
    const contributionMarginRatio = totalRev > 0 ? totalProfit / totalRev : 0;
    
    // Breakeven revenue = Fixed Costs / Contribution Margin Ratio
    const breakevenRevenue = contributionMarginRatio > 0 ? fixedCostsValue / contributionMarginRatio : 0;
    
    // Progress towards breakeven
    const progressPercent = breakevenRevenue > 0 ? Math.min(250, (totalRev / breakevenRevenue) * 100) : 0;

    // Average ticket size (Ticket Médio)
    const averageTicket = monthlyMetrics.totalQty > 0 ? totalRev / monthlyMetrics.totalQty : 0;
    
    // Items needed to be sold to break even
    const itemsNeeded = averageTicket > 0 ? breakevenRevenue / averageTicket : 0;

    return {
      contributionMarginRatio,
      breakevenRevenue,
      progressPercent,
      averageTicket,
      itemsNeeded
    };
  }, [monthlyMetrics]);

  // DRE Period-scaled spreadsheet calculation
  const dreData = useMemo(() => {
    let divisor = 1;
    if (reportSubTab === 'semana') {
      divisor = 4.33;
    } else if (reportSubTab === 'dia') {
      divisor = Math.max(1, operationalDays);
    }

    const productSales = monthlyMetrics.totalRevenue / divisor;
    const otherRevenuesVal = monthlyMetrics.totalOther / divisor;
    const totalEntradas = productSales + otherRevenuesVal;

    const ingredientsCost = monthlyMetrics.totalIngredientsCost / divisor;
    const taxesPaid = monthlyMetrics.totalTaxesPaid / divisor;
    const variableSpreadsheet = monthlyMetrics.totalVariableSpreadsheet / divisor;
    const totalVariaveis = ingredientsCost + taxesPaid + variableSpreadsheet;

    const margemContribuicao = totalEntradas - totalVariaveis;

    const fixedCostsVal = monthlyMetrics.totalFixed / divisor;
    const sobraLiquida = margemContribuicao - fixedCostsVal;

    return {
      productSales,
      otherRevenuesVal,
      totalEntradas,
      ingredientsCost,
      taxesPaid,
      variableSpreadsheet,
      totalVariaveis,
      margemContribuicao,
      fixedCostsVal,
      sobraLiquida
    };
  }, [reportSubTab, operationalDays, monthlyMetrics]);

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Tab Header with quick information */}
      <div className="bg-white dark:bg-zinc-800 p-6 rounded-lg border border-zinc-200/60 dark:border-zinc-700 shadow-sm relative overflow-hidden">
        <div className="absolute right-0 bottom-0 transform translate-x-10 translate-y-10 w-48 h-48 bg-zinc-100/50 dark:bg-zinc-700/10 rounded-full pointer-events-none" />
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-widest bg-brand-tomato/10 text-brand-tomato px-3 py-1 rounded-full">
              Relatórios e Projeções Financeiras
            </span>
            <h3 className="text-3xl font-extrabold text-zinc-900 dark:text-white mt-3 tracking-tight">
              Análise de Desempenho
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2 max-w-xl">
              Acompanhe a saúde do seu delivery em diferentes horizontes de tempo. Visualize lucros, custos e faturamento projetados por dia, por semana ou por mês completo.
            </p>
          </div>
          <div className="p-3 bg-zinc-50 dark:bg-zinc-750 rounded-xl text-zinc-400 dark:text-zinc-300 border border-zinc-100 dark:border-zinc-700">
            <BarChart3 className="w-10 h-10 text-brand-tomato" />
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs for Report Period */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-zinc-100/80 dark:bg-zinc-900/40 p-1.5 rounded-xl border border-zinc-200/40 dark:border-zinc-800/60">
        <div className="flex w-full sm:w-auto p-0.5 space-x-1">
          <button
            onClick={() => setReportSubTab('dia')}
            className={`flex-1 sm:flex-initial px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center justify-center space-x-2 ${
              reportSubTab === 'dia'
                ? 'bg-white dark:bg-zinc-800 text-brand-tomato shadow-sm border border-zinc-200/40 dark:border-zinc-700'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Por Dia</span>
          </button>
          <button
            onClick={() => setReportSubTab('semana')}
            className={`flex-1 sm:flex-initial px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center justify-center space-x-2 ${
              reportSubTab === 'semana'
                ? 'bg-white dark:bg-zinc-800 text-brand-tomato shadow-sm border border-zinc-200/40 dark:border-zinc-700'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Por Semana</span>
          </button>
          <button
            onClick={() => setReportSubTab('mes')}
            className={`flex-1 sm:flex-initial px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center justify-center space-x-2 ${
              reportSubTab === 'mes'
                ? 'bg-white dark:bg-zinc-800 text-brand-tomato shadow-sm border border-zinc-200/40 dark:border-zinc-700'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Por Mês</span>
          </button>
        </div>

        {reportSubTab === 'dia' && (
          <div className="flex items-center space-x-2.5 w-full sm:w-auto px-2 sm:px-0">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
              Dias operados no mês:
            </span>
            <input
              type="number"
              min="1"
              max="31"
              value={operationalDays}
              onChange={(e) => setOperationalDays(Math.max(1, Math.min(31, Number(e.target.value))))}
              className="w-14 px-2 py-1 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-md text-xs font-bold text-center text-zinc-950 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-tomato font-mono"
            />
          </div>
        )}
      </div>

      {/* ==================== 1. DAILY REPORT SECTION ==================== */}
      {reportSubTab === 'dia' && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Daily Metrics Row - Full values shown explicitly */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
            
            {/* Card 1: Faturamento Diário */}
            <div className="bg-white dark:bg-zinc-800 p-4 rounded-lg border border-zinc-200/60 dark:border-zinc-700 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-2.5 mb-3">
                  <div className="p-1.5 bg-zinc-50 dark:bg-zinc-700 text-brand-orange rounded-md border border-zinc-100 dark:border-zinc-600">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Faturamento / Dia
                  </p>
                </div>
                <h4 className="text-xl font-bold tech-font-mono font-mono text-zinc-900 dark:text-white break-words">
                  {formatCurrency(dailyMetrics.revenue)}
                </h4>
              </div>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-3 border-t border-zinc-100/40 dark:border-zinc-700/40 pt-2">
                Simulado ({operationalDays} dias)
              </p>
            </div>

            {/* Card 2: Lucro de Produtos Diário */}
            <div className="bg-white dark:bg-zinc-800 p-4 rounded-lg border border-zinc-200/60 dark:border-zinc-700 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-2.5 mb-3">
                  <div className="p-1.5 bg-brand-tomato/5 dark:bg-brand-tomato/10 text-brand-tomato rounded-md border border-brand-tomato/10">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Lucro Prod. / Dia
                  </p>
                </div>
                <h4 className="text-xl font-bold tech-font-mono font-mono text-brand-tomato break-words">
                  {formatCurrency(dailyMetrics.productNetProfit)}
                </h4>
              </div>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-3 border-t border-zinc-100/40 dark:border-zinc-700/40 pt-2">
                Vendas - CMV e Taxas
              </p>
            </div>

            {/* Card 3: Receitas Extras Diário */}
            <div className="bg-white dark:bg-zinc-800 p-4 rounded-lg border border-zinc-200/60 dark:border-zinc-700 shadow-sm flex flex-col justify-between border-b-2 border-b-emerald-500/30">
              <div>
                <div className="flex items-center space-x-2.5 mb-3">
                  <div className="p-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-md border border-emerald-100 dark:border-emerald-800/50">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Entradas Extra / Dia
                  </p>
                </div>
                <h4 className="text-xl font-bold tech-font-mono font-mono text-emerald-600 break-words">
                  {formatCurrency(dailyMetrics.otherRevenues)}
                </h4>
              </div>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-3 border-t border-zinc-100/40 dark:border-zinc-700/40 pt-2">
                Receitas da Planilha
              </p>
            </div>

            {/* Card 4: Custo Fixo Diário */}
            <div className="bg-white dark:bg-zinc-800 p-4 rounded-lg border border-zinc-200/60 dark:border-zinc-700 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-2.5 mb-3">
                  <div className="p-1.5 bg-zinc-50 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-200 rounded-md border border-zinc-100 dark:border-zinc-600">
                    <Briefcase className="w-4 h-4 text-brand-orange" />
                  </div>
                  <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Gastos Fixos / Dia
                  </p>
                </div>
                <h4 className="text-xl font-bold tech-font-mono font-mono text-zinc-800 dark:text-zinc-200 break-words">
                  {formatCurrency(dailyMetrics.fixedCost)}
                </h4>
              </div>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-3 border-t border-zinc-100/40 dark:border-zinc-700/40 pt-2">
                Aluguel, salários, etc.
              </p>
            </div>

            {/* Card 5: Gastos Variáveis Diário */}
            <div className="bg-white dark:bg-zinc-800 p-4 rounded-lg border border-zinc-200/60 dark:border-zinc-700 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-2.5 mb-3">
                  <div className="p-1.5 bg-zinc-50 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-200 rounded-md border border-zinc-100 dark:border-zinc-600">
                    <Calculator className="w-4 h-4 text-brand-orange" />
                  </div>
                  <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Gastos Variáveis / Dia
                  </p>
                </div>
                <h4 className="text-xl font-bold tech-font-mono font-mono text-zinc-800 dark:text-zinc-200 break-words">
                  {formatCurrency(monthlyMetrics.totalVariableSpreadsheet / (operationalDays || 1))}
                </h4>
              </div>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-3 border-t border-zinc-100/40 dark:border-zinc-700/40 pt-2">
                Energia, água, gás, etc.
              </p>
            </div>

            {/* Card 6: Sobra Diária Líquida */}
            <div className={`p-4 rounded-lg border shadow-sm flex flex-col justify-between ${
              dailyMetrics.finalResult >= 0 
                ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-150 dark:border-emerald-900/50' 
                : 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-150 dark:border-rose-900/50'
            }`}>
              <div>
                <div className="flex items-center space-x-2.5 mb-3">
                  <div className={`p-1.5 rounded-md border ${
                    dailyMetrics.finalResult >= 0 
                      ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' 
                      : 'bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                  }`}>
                    <Award className="w-4 h-4" />
                  </div>
                  <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Sobra Líquida / Dia
                  </p>
                </div>
                <h4 className={`text-xl font-bold tech-font-mono font-mono break-words ${
                  dailyMetrics.finalResult >= 0 
                    ? 'text-emerald-600 dark:text-emerald-400' 
                    : 'text-rose-600 dark:text-rose-400'
                }`}>
                  {formatCurrency(dailyMetrics.finalResult)}
                </h4>
              </div>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-3 border-t border-zinc-100/40 dark:border-zinc-700/40 pt-2">
                Resultado Final Livre
              </p>
            </div>

          </div>

          {/* Daily charts and detailed weekday projection */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Weekday weighted projection chart */}
            <div className="bg-white dark:bg-zinc-800 p-5 rounded-lg border border-zinc-200/60 dark:border-zinc-700 shadow-sm lg:col-span-2">
              <div className="mb-4">
                <h4 className="text-base font-bold tech-font-serif-italic font-serif italic text-zinc-900 dark:text-white flex items-center space-x-2">
                  <BarChart3 className="w-5 h-5 text-brand-orange" />
                  <span>Projeção de Faturamento e Lucro por Dia de Semana</span>
                </h4>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                  Baseado no peso típico de vendas de um delivery comercial (picos em finais de semana).
                </p>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weekdayData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" className="dark:stroke-zinc-700/50" />
                    <XAxis dataKey="label" stroke="#71717a" fontSize={11} tickLine={false} />
                    <YAxis stroke="#71717a" fontSize={10} tickLine={false} tickFormatter={(val) => `R$ ${val}`} />
                    <Tooltip 
                      formatter={(value) => [formatCurrency(Number(value)), '']}
                      contentStyle={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.96)', 
                        borderColor: '#e4e4e7',
                        borderRadius: '8px',
                        fontSize: '11px',
                        color: '#18181b'
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', marginTop: '10px' }} />
                    <Bar dataKey="Faturamento" fill="#e0533c" name="Faturamento" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Lucro Líquido" fill="#10b981" name="Lucro Prod." radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Sobra Diária" fill="#f59e0b" name="Sobra Líquida" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Daily Operational insights */}
            <div className="bg-white dark:bg-zinc-800 p-5 rounded-lg border border-zinc-200/60 dark:border-zinc-700 shadow-sm space-y-4">
              <h4 className="text-base font-bold tech-font-serif-italic font-serif italic text-zinc-900 dark:text-white flex items-center space-x-2">
                <Info className="w-5 h-5 text-brand-tomato" />
                <span>Métricas Operacionais/Dia</span>
              </h4>

              <div className="space-y-3.5 divide-y divide-zinc-100 dark:divide-zinc-700/50">
                
                <div className="pt-1.5 flex justify-between items-center text-sm">
                  <span className="text-zinc-500 dark:text-zinc-400 flex items-center space-x-1.5">
                    <Package className="w-4 h-4 text-zinc-400" />
                    <span>Média de Vendas</span>
                  </span>
                  <span className="font-bold tech-font-mono font-mono text-zinc-950 dark:text-white">
                    {dailyMetrics.qty.toFixed(1)} itens/dia
                  </span>
                </div>

                <div className="pt-3.5 flex justify-between items-center text-sm">
                  <span className="text-zinc-500 dark:text-zinc-400 flex items-center space-x-1.5">
                    <Percent className="w-4 h-4 text-zinc-400" />
                    <span>Despesa Tributária</span>
                  </span>
                  <span className="font-bold tech-font-mono font-mono text-rose-500">
                    -{formatCurrency(dailyMetrics.taxes)}/dia
                  </span>
                </div>

                <div className="pt-3.5 flex justify-between items-center text-sm">
                  <span className="text-zinc-500 dark:text-zinc-400 flex items-center space-x-1.5">
                    <Coffee className="w-4 h-4 text-zinc-400" />
                    <span>Custo de Insumos</span>
                  </span>
                  <span className="font-bold tech-font-mono font-mono text-orange-500">
                    -{formatCurrency(dailyMetrics.ingredientsCost)}/dia
                  </span>
                </div>

                <div className="pt-3.5 flex justify-between items-center text-sm">
                  <span className="text-zinc-500 dark:text-zinc-400 flex items-center space-x-1.5">
                    <Calculator className="w-4 h-4 text-zinc-400" />
                    <span>Markup Geral Médio</span>
                  </span>
                  <span className="font-bold tech-font-mono font-mono text-emerald-500">
                    {(monthlyMetrics.totalIngredientsCost > 0 
                      ? (monthlyMetrics.totalRevenue / monthlyMetrics.totalIngredientsCost) 
                      : 0).toFixed(2)}x
                  </span>
                </div>

              </div>

              {/* Informative block */}
              <div className="text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900 p-3.5 rounded-lg border border-zinc-150 dark:border-zinc-800/80 mt-4">
                <p className="font-semibold text-zinc-700 dark:text-zinc-300 flex items-center space-x-1 mb-1">
                  <span>Nota de Rateio</span>
                </p>
                As taxas tributárias e taxas de cartão são calculadas diretamente em cima da receita. Os custos fixos mensais foram divididos igualmente entre os {operationalDays} dias selecionados.
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ==================== 2. WEEKLY REPORT SECTION ==================== */}
      {reportSubTab === 'semana' && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Weekly Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
            
            {/* Card 1: Faturamento Semanal */}
            <div className="bg-white dark:bg-zinc-800 p-4 rounded-lg border border-zinc-200/60 dark:border-zinc-700 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-2.5 mb-3">
                  <div className="p-1.5 bg-zinc-50 dark:bg-zinc-700 text-brand-orange rounded-md border border-zinc-100 dark:border-zinc-600">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Faturamento / Sem
                  </p>
                </div>
                <h4 className="text-xl font-bold tech-font-mono font-mono text-zinc-900 dark:text-white break-words">
                  {formatCurrency(weeklyMetrics.revenue)}
                </h4>
              </div>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-3 border-t border-zinc-100/40 dark:border-zinc-700/40 pt-2">
                Simulado para 7 dias
              </p>
            </div>

            {/* Card 2: Lucro de Produtos Semanal */}
            <div className="bg-white dark:bg-zinc-800 p-4 rounded-lg border border-zinc-200/60 dark:border-zinc-700 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-2.5 mb-3">
                  <div className="p-1.5 bg-brand-tomato/5 dark:bg-brand-tomato/10 text-brand-tomato rounded-md border border-brand-tomato/10">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Lucro Prod. / Sem
                  </p>
                </div>
                <h4 className="text-xl font-bold tech-font-mono font-mono text-brand-tomato break-words">
                  {formatCurrency(weeklyMetrics.productNetProfit)}
                </h4>
              </div>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-3 border-t border-zinc-100/40 dark:border-zinc-700/40 pt-2">
                Faturamento - CMV e Taxas
              </p>
            </div>

            {/* Card 3: Receitas Extras Sem */}
            <div className="bg-white dark:bg-zinc-800 p-4 rounded-lg border border-zinc-200/60 dark:border-zinc-700 shadow-sm flex flex-col justify-between border-b-2 border-b-emerald-500/30">
              <div>
                <div className="flex items-center space-x-2.5 mb-3">
                  <div className="p-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-md border border-emerald-100 dark:border-emerald-800/50">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Entradas Extra / Sem
                  </p>
                </div>
                <h4 className="text-xl font-bold tech-font-mono font-mono text-emerald-600 break-words">
                  {formatCurrency(weeklyMetrics.otherRevenues)}
                </h4>
              </div>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-3 border-t border-zinc-100/40 dark:border-zinc-700/40 pt-2">
                Ganhos extras na planilha
              </p>
            </div>

            {/* Card 4: Custos Fixos Semanais */}
            <div className="bg-white dark:bg-zinc-800 p-4 rounded-lg border border-zinc-200/60 dark:border-zinc-700 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-2.5 mb-3">
                  <div className="p-1.5 bg-zinc-50 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-200 rounded-md border border-zinc-100 dark:border-zinc-600">
                    <Briefcase className="w-4 h-4 text-brand-orange" />
                  </div>
                  <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Gastos Fixos / Sem
                  </p>
                </div>
                <h4 className="text-xl font-bold tech-font-mono font-mono text-zinc-800 dark:text-zinc-200 break-words">
                  {formatCurrency(weeklyMetrics.fixedCost)}
                </h4>
              </div>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-3 border-t border-zinc-100/40 dark:border-zinc-700/40 pt-2">
                Fração das despesas fixas
              </p>
            </div>

            {/* Card 5: Custos Variáveis Semanais */}
            <div className="bg-white dark:bg-zinc-800 p-4 rounded-lg border border-zinc-200/60 dark:border-zinc-700 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-2.5 mb-3">
                  <div className="p-1.5 bg-zinc-50 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-200 rounded-md border border-zinc-100 dark:border-zinc-600">
                    <Calculator className="w-4 h-4 text-brand-orange" />
                  </div>
                  <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Gastos Variáveis / Sem
                  </p>
                </div>
                <h4 className="text-xl font-bold tech-font-mono font-mono text-zinc-800 dark:text-zinc-200 break-words">
                  {formatCurrency(monthlyMetrics.totalVariableSpreadsheet / 4.33)}
                </h4>
              </div>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-3 border-t border-zinc-100/40 dark:border-zinc-700/40 pt-2">
                Energia, água, gás, etc.
              </p>
            </div>

            {/* Card 6: Sobra Semanal */}
            <div className={`p-4 rounded-lg border shadow-sm flex flex-col justify-between ${
              weeklyMetrics.finalResult >= 0 
                ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-150 dark:border-emerald-900/50' 
                : 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-150 dark:border-rose-900/50'
            }`}>
              <div>
                <div className="flex items-center space-x-2.5 mb-3">
                  <div className={`p-1.5 rounded-md border ${
                    weeklyMetrics.finalResult >= 0 
                      ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' 
                      : 'bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                  }`}>
                    <Award className="w-4 h-4" />
                  </div>
                  <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Sobra Líquida / Sem
                  </p>
                </div>
                <h4 className={`text-xl font-bold tech-font-mono font-mono break-words ${
                  weeklyMetrics.finalResult >= 0 
                    ? 'text-emerald-600 dark:text-emerald-400' 
                    : 'text-rose-600 dark:text-rose-400'
                }`}>
                  {formatCurrency(weeklyMetrics.finalResult)}
                </h4>
              </div>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-3 border-t border-zinc-100/40 dark:border-zinc-700/40 pt-2">
                Resultado Final Livre
              </p>
            </div>

          </div>

          {/* Weekly Distribution Chart & table */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Weekly cycle chart */}
            <div className="bg-white dark:bg-zinc-800 p-5 rounded-lg border border-zinc-200/60 dark:border-zinc-700 shadow-sm lg:col-span-2">
              <div className="mb-4">
                <h4 className="text-base font-bold tech-font-serif-italic font-serif italic text-zinc-900 dark:text-white flex items-center space-x-2">
                  <Calendar className="w-5 h-5 text-brand-orange" />
                  <span>Projeção de Ciclos Semanais do Mês</span>
                </h4>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                  Diferenças projetadas por semana considerando o fluxo de salários (alta faturamento nas semanas 1 e 2).
                </p>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={weeklyDistributionData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#e0533c" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#e0533c" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorSobra" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" className="dark:stroke-zinc-700/50" />
                    <XAxis dataKey="name" stroke="#71717a" fontSize={11} tickLine={false} />
                    <YAxis stroke="#71717a" fontSize={10} tickLine={false} tickFormatter={(val) => `R$ ${val}`} />
                    <Tooltip 
                      formatter={(value) => [formatCurrency(Number(value)), '']}
                      contentStyle={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.96)', 
                        borderColor: '#e4e4e7',
                        borderRadius: '8px',
                        fontSize: '11px',
                        color: '#18181b'
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', marginTop: '10px' }} />
                    <Area type="monotone" dataKey="Faturamento" stroke="#e0533c" fillOpacity={1} fill="url(#colorRev)" strokeWidth={2.5} />
                    <Area type="monotone" dataKey="Sobra Líquida" stroke="#10b981" fillOpacity={1} fill="url(#colorSobra)" strokeWidth={2.5} name="Sobra Líquida" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Weekly Top Performance Contribution */}
            <div className="bg-white dark:bg-zinc-800 p-5 rounded-lg border border-zinc-200/60 dark:border-zinc-700 shadow-sm overflow-hidden flex flex-col justify-between">
              <div>
                <h4 className="text-base font-bold tech-font-serif-italic font-serif italic text-zinc-900 dark:text-white flex items-center space-x-2 mb-1">
                  <Award className="w-5 h-5 text-brand-tomato" />
                  <span>Participação de Produtos / Semana</span>
                </h4>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-4">
                  Distribuição estimada do lucro líquido na semana.
                </p>

                <div className="space-y-4">
                  {monthlyMetrics.productRows.map((row) => {
                    const weeklyRowProfit = row.netProfit / 4.33;
                    const totalWeeklyProfit = monthlyMetrics.totalNetProfit / 4.33;
                    const weeklyProfitShare = totalWeeklyProfit > 0 ? (weeklyRowProfit / totalWeeklyProfit) * 100 : 0;
                    
                    return (
                      <div key={row.id} className="space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-zinc-800 dark:text-zinc-200 truncate max-w-[150px]">
                            {row.name}
                          </span>
                          <span className="font-mono text-zinc-500 dark:text-zinc-400">
                            {formatCurrency(weeklyRowProfit)} ({weeklyProfitShare.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="w-full bg-zinc-100 dark:bg-zinc-900 h-2 rounded-full overflow-hidden border border-zinc-200/20">
                          <div 
                            className="bg-brand-tomato h-full rounded-full transition-all" 
                            style={{ width: `${weeklyProfitShare}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900 p-3.5 rounded-lg border border-zinc-150 dark:border-zinc-800/80 mt-6">
                <p className="font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Atenção ao Caixa</p>
                As semanas 1 e 2 costumam receber até 60% do movimento de delivery de alimentação devido aos pagamentos de salários dos clientes. Planeje suas compras e estoque de acordo.
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ==================== 3. MONTHLY REPORT SECTION ==================== */}
      {reportSubTab === 'mes' && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Monthly metrics dashboard */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
            
            <div className="bg-white dark:bg-zinc-800 p-4 rounded-lg border border-zinc-200/60 dark:border-zinc-700 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-2.5 mb-3">
                  <div className="p-1.5 bg-zinc-50 dark:bg-zinc-700 text-brand-orange rounded-md border border-zinc-100 dark:border-zinc-600">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Faturamento Mensal
                  </p>
                </div>
                <h4 className="text-xl font-bold tech-font-mono font-mono text-zinc-900 dark:text-white break-words">
                  {formatCurrency(monthlyMetrics.totalRevenue)}
                </h4>
              </div>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-3 border-t border-zinc-100/40 dark:border-zinc-700/40 pt-2">
                Total bruto mensal de vendas
              </p>
            </div>

            <div className="bg-white dark:bg-zinc-800 p-4 rounded-lg border border-zinc-200/60 dark:border-zinc-700 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-2.5 mb-3">
                  <div className="p-1.5 bg-brand-tomato/5 dark:bg-brand-tomato/10 text-brand-tomato rounded-md border border-brand-tomato/10">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Lucro de Produtos
                  </p>
                </div>
                <h4 className="text-xl font-bold tech-font-mono font-mono text-brand-tomato break-words">
                  {formatCurrency(monthlyMetrics.totalNetProfit)}
                </h4>
              </div>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-3 border-t border-zinc-100/40 dark:border-zinc-700/40 pt-2">
                Soma de todos os produtos
              </p>
            </div>

            <div className="bg-white dark:bg-zinc-800 p-4 rounded-lg border border-zinc-200/60 dark:border-zinc-700 shadow-sm flex flex-col justify-between border-b-2 border-b-emerald-500/30">
              <div>
                <div className="flex items-center space-x-2.5 mb-3">
                  <div className="p-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-md border border-emerald-100 dark:border-emerald-800/50">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Receitas Extras
                  </p>
                </div>
                <h4 className="text-xl font-bold tech-font-mono font-mono text-emerald-600 break-words">
                  {formatCurrency(monthlyMetrics.totalOther)}
                </h4>
              </div>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-3 border-t border-zinc-100/40 dark:border-zinc-700/40 pt-2">
                Ganhos extras na planilha
              </p>
            </div>

            <div className="bg-white dark:bg-zinc-800 p-4 rounded-lg border border-zinc-200/60 dark:border-zinc-700 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-2.5 mb-3">
                  <div className="p-1.5 bg-zinc-50 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-200 rounded-md border border-zinc-100 dark:border-zinc-600">
                    <Briefcase className="w-4 h-4 text-brand-orange" />
                  </div>
                  <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Gastos Fixos
                  </p>
                </div>
                <h4 className="text-xl font-bold tech-font-mono font-mono text-zinc-800 dark:text-zinc-200 break-words">
                  {formatCurrency(monthlyMetrics.totalFixed)}
                </h4>
              </div>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-3 border-t border-zinc-100/40 dark:border-zinc-700/40 pt-2">
                Aluguel, salários, etc.
              </p>
            </div>

            <div className="bg-white dark:bg-zinc-800 p-4 rounded-lg border border-zinc-200/60 dark:border-zinc-700 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-2.5 mb-3">
                  <div className="p-1.5 bg-zinc-50 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-200 rounded-md border border-zinc-100 dark:border-zinc-600">
                    <Calculator className="w-4 h-4 text-brand-orange" />
                  </div>
                  <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Gastos Variáveis
                  </p>
                </div>
                <h4 className="text-xl font-bold tech-font-mono font-mono text-zinc-800 dark:text-zinc-200 break-words">
                  {formatCurrency(monthlyMetrics.totalVariableSpreadsheet)}
                </h4>
              </div>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-3 border-t border-zinc-100/40 dark:border-zinc-700/40 pt-2">
                Energia, água, gás, etc.
              </p>
            </div>

            <div className={`p-4 rounded-lg border shadow-sm flex flex-col justify-between ${
              monthlyMetrics.finalResult >= 0 
                ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-150 dark:border-emerald-900/50' 
                : 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-150 dark:border-rose-900/50'
            }`}>
              <div>
                <div className="flex items-center space-x-2.5 mb-3">
                  <div className={`p-1.5 rounded-md border ${
                    monthlyMetrics.finalResult >= 0 
                      ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' 
                      : 'bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                  }`}>
                    <Award className="w-4 h-4" />
                  </div>
                  <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Sobra Líquida / Mês
                  </p>
                </div>
                <h4 className={`text-xl font-bold tech-font-mono font-mono break-words ${
                  monthlyMetrics.finalResult >= 0 
                    ? 'text-emerald-600 dark:text-emerald-400' 
                    : 'text-rose-600 dark:text-rose-400'
                }`}>
                  {formatCurrency(monthlyMetrics.finalResult)}
                </h4>
              </div>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-3 border-t border-zinc-100/40 dark:border-zinc-700/40 pt-2">
                Resultado Final Livre
              </p>
            </div>

          </div>

          {/* Breakeven Point and Category Contribution */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Ponto de Equilíbrio (Breakeven Point analysis) */}
            <div className="bg-white dark:bg-zinc-800 p-5 rounded-lg border border-zinc-200/60 dark:border-zinc-700 shadow-sm lg:col-span-2">
              <div className="mb-4">
                <h4 className="text-base font-bold tech-font-serif-italic font-serif italic text-zinc-900 dark:text-white flex items-center space-x-2">
                  <Calculator className="w-5 h-5 text-brand-orange" />
                  <span>Análise de Ponto de Equilíbrio (Break-Even)</span>
                </h4>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                  Métrica financeira fundamental: o mínimo necessário para vender sem ter prejuízo operacional.
                </p>
              </div>

              {/* visual break even comparison slider */}
              <div className="space-y-6 pt-2">
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-zinc-500 dark:text-zinc-400 uppercase">
                      Progresso de Vendas até o Ponto de Equilíbrio
                    </span>
                    <span className={`font-mono font-bold ${
                      monthlyMetrics.totalRevenue >= breakevenMetrics.breakevenRevenue
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-500'
                    }`}>
                      {breakevenMetrics.progressPercent.toFixed(1)}%
                    </span>
                  </div>

                  <div className="w-full bg-zinc-100 dark:bg-zinc-900 h-4 rounded-full overflow-hidden border border-zinc-200 dark:border-zinc-800/80 p-0.5 relative">
                    <div 
                      className={`h-full rounded-full transition-all ${
                        monthlyMetrics.totalRevenue >= breakevenMetrics.breakevenRevenue
                          ? 'bg-emerald-500'
                          : 'bg-brand-tomato'
                      }`}
                      style={{ width: `${Math.min(100, breakevenMetrics.progressPercent)}%` }}
                    />
                    {/* Centered text indicator inside progress bar */}
                    <div className="absolute inset-0 flex items-center justify-center text-[9px] font-extrabold text-zinc-700 dark:text-zinc-300">
                      {monthlyMetrics.totalRevenue >= breakevenMetrics.breakevenRevenue 
                        ? 'META ALCANÇADA! ESTAMOS NO LUCRO' 
                        : `FALTAM ${formatCurrency(Math.max(0, breakevenMetrics.breakevenRevenue - monthlyMetrics.totalRevenue))} PARA O EQUILÍBRIO`}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  <div className="bg-zinc-50 dark:bg-zinc-900 p-4 rounded-lg border border-zinc-150 dark:border-zinc-800/60 flex items-start space-x-3">
                    <div className="p-2 bg-brand-orange/10 rounded-md text-brand-orange">
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">
                        Faturamento de Equilíbrio
                      </p>
                      <p className="text-base font-bold tech-font-mono font-mono text-zinc-950 dark:text-white mt-1">
                        {formatCurrency(breakevenMetrics.breakevenRevenue)}
                      </p>
                      <p className="text-[10px] text-zinc-400 mt-1">
                        Média de Margem de Contribuição: {formatPercent(breakevenMetrics.contributionMarginRatio * 100)}
                      </p>
                    </div>
                  </div>

                  <div className="bg-zinc-50 dark:bg-zinc-900 p-4 rounded-lg border border-zinc-150 dark:border-zinc-800/60 flex items-start space-x-3">
                    <div className="p-2 bg-brand-tomato/10 rounded-md text-brand-tomato">
                      <Package className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">
                        Volume Mínimo de Itens
                      </p>
                      <p className="text-base font-bold tech-font-mono font-mono text-zinc-950 dark:text-white mt-1">
                        {Math.ceil(breakevenMetrics.itemsNeeded)} wraps/bebidas
                      </p>
                      <p className="text-[10px] text-zinc-400 mt-1">
                        Considerando ticket médio de {formatCurrency(breakevenMetrics.averageTicket)}
                      </p>
                    </div>
                  </div>

                </div>

              </div>
            </div>

            {/* Category breakdown progress bars */}
            <div className="bg-white dark:bg-zinc-800 p-5 rounded-lg border border-zinc-200/60 dark:border-zinc-700 shadow-sm flex flex-col justify-between">
              <div>
                <h4 className="text-base font-bold tech-font-serif-italic font-serif italic text-zinc-900 dark:text-white flex items-center space-x-2 mb-1">
                  <PieIcon className="w-5 h-5 text-brand-tomato" />
                  <span>Desempenho por Categoria</span>
                </h4>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-4">
                  Contribuição financeira agregada por categoria de cardápio.
                </p>

                {categoryMetrics.length === 0 ? (
                  <div className="text-center py-8 text-xs text-zinc-400">
                    Cadastre categorias nos produtos para analisar.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {categoryMetrics.map((cat) => (
                      <div key={cat.name} className="space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider text-[10px]">
                            {cat.name}
                          </span>
                          <span className="font-mono text-zinc-500 dark:text-zinc-400">
                            {formatCurrency(cat.profit)} ({cat.profitShare.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="w-full bg-zinc-100 dark:bg-zinc-900 h-2 rounded-full overflow-hidden border border-zinc-200/20">
                          <div 
                            className="bg-brand-orange h-full rounded-full transition-all" 
                            style={{ width: `${cat.profitShare}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-zinc-400 dark:text-zinc-500 text-right">
                          Fat: {formatCurrency(cat.revenue)} • {cat.qty} unidades
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900 p-3.5 rounded-lg border border-zinc-150 dark:border-zinc-800/80 mt-6">
                <p className="font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Otimização de Cardápio</p>
                Identifique categorias com margens excelentes (como Bebidas ou Sobremesas) para fazer promoções casadas no iFood (Combos) e acelerar o alcance do lucro operacional líquido.
              </div>
            </div>

          </div>

          {/* Consolidado list table for the products performance */}
          <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200/60 dark:border-zinc-700 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
              <h4 className="text-base font-bold tech-font-serif-italic font-serif italic text-zinc-900 dark:text-white flex items-center space-x-2">
                <Calculator className="w-5 h-5 text-brand-tomato" />
                <span>Desempenho Geral de Contribuição dos Produtos (Mês)</span>
              </h4>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold font-mono bg-zinc-50 dark:bg-zinc-900 px-2.5 py-1 rounded-md border border-zinc-200/50 dark:border-zinc-800">
                {products.length} Cadastrados
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="tech-card-header border-b border-zinc-250 dark:border-zinc-700">
                    <th className="p-4 text-[13px] tech-font-serif-italic font-serif italic text-zinc-600 dark:text-zinc-300 font-medium tracking-tight">Produto</th>
                    <th className="p-4 text-[13px] tech-font-serif-italic font-serif italic text-zinc-600 dark:text-zinc-300 font-medium tracking-tight text-right">Preço</th>
                    <th className="p-4 text-[13px] tech-font-serif-italic font-serif italic text-zinc-600 dark:text-zinc-300 font-medium tracking-tight text-right">Lucro Unitário</th>
                    <th className="p-4 text-[13px] tech-font-serif-italic font-serif italic text-zinc-600 dark:text-zinc-300 font-medium tracking-tight text-center">Unidades Vendidas</th>
                    <th className="p-4 text-[13px] tech-font-serif-italic font-serif italic text-zinc-600 dark:text-zinc-300 font-medium tracking-tight text-right">Faturamento Total</th>
                    <th className="p-4 text-[13px] tech-font-serif-italic font-serif italic text-zinc-600 dark:text-zinc-300 font-medium tracking-tight text-right">Lucro Líquido Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                  {monthlyMetrics.productRows.map((row) => (
                    <tr key={row.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40 transition-all">
                      <td className="p-4">
                        <p className="font-bold text-zinc-900 dark:text-white text-sm">{row.name}</p>
                        <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-semibold bg-zinc-100 dark:bg-zinc-750 text-zinc-600 dark:text-zinc-400 rounded-md border border-zinc-200/40 dark:border-zinc-700/50">
                          {row.category}
                        </span>
                      </td>
                      <td className="p-4 text-right font-medium font-mono text-zinc-900 dark:text-white text-sm">
                        {formatCurrency(row.sellingPrice)}
                      </td>
                      <td className="p-4 text-right font-bold font-mono text-emerald-600 dark:text-emerald-400 text-sm">
                        {formatCurrency(row.unitNetProfit)} <span className="text-[10px] text-zinc-400 font-normal">({row.margin.toFixed(1)}%)</span>
                      </td>
                      <td className="p-4 text-center font-bold font-mono text-zinc-900 dark:text-white text-sm">
                        {row.qty} un
                      </td>
                      <td className="p-4 text-right font-medium font-mono text-zinc-700 dark:text-zinc-300 text-sm">
                        {formatCurrency(row.revenue)}
                      </td>
                      <td className="p-4 text-right font-bold font-mono text-emerald-600 dark:text-emerald-400 text-sm">
                        {formatCurrency(row.netProfit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ==================== PLANILHA FINANCEIRA COMPLETA (DRE) ==================== */}
      <div className="bg-white dark:bg-zinc-800 p-6 rounded-lg border border-zinc-200/60 dark:border-zinc-700 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-zinc-150 dark:border-zinc-700/80 pb-4">
          <div>
            <h4 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center space-x-2">
              <Calculator className="w-5 h-5 text-brand-tomato" />
              <span>Planilha Financeira Detalhada (DRE {reportSubTab === 'dia' ? 'Diário' : reportSubTab === 'semana' ? 'Semanal' : 'Mensal'})</span>
            </h4>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
              Demonstrativo de Resultado consolidando faturamento, custos de produtos, taxas e despesas da planilha para o período de 1 <strong>{reportSubTab === 'dia' ? 'dia útil' : reportSubTab === 'semana' ? 'semana' : 'mês'}</strong>.
            </p>
          </div>
          <span className="text-xs font-bold font-mono px-3 py-1 bg-brand-tomato/10 text-brand-tomato rounded-md border border-brand-tomato/20">
            Escala: {reportSubTab === 'dia' ? '1 Dia' : reportSubTab === 'semana' ? '1 Semana' : '1 Mês'}
          </span>
        </div>

        {/* The Spreadsheet / DRE Table */}
        <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-700 rounded-lg">
          <table className="w-full text-left border-collapse font-mono text-xs">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400">
                <th className="p-3 font-semibold">Estrutura do Demonstrativo (DRE)</th>
                <th className="p-3 text-right font-semibold w-40">Valor ({reportSubTab === 'dia' ? 'R$/Dia' : reportSubTab === 'semana' ? 'R$/Semana' : 'R$/Mês'})</th>
                <th className="p-3 text-right font-semibold w-28">Part. %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              
              {/* SECTION 1: ENTRADAS */}
              <tr className="bg-zinc-50/40 dark:bg-zinc-800/20 font-bold">
                <td className="p-3 text-zinc-900 dark:text-zinc-100">1. ENTRADAS (FATURAMENTO)</td>
                <td className="p-3 text-right text-zinc-900 dark:text-zinc-100">{formatCurrency(dreData.totalEntradas)}</td>
                <td className="p-3 text-right text-zinc-500">100.0%</td>
              </tr>
              <tr>
                <td className="p-3 pl-8 text-zinc-600 dark:text-zinc-400">Vendas de Wraps/Produtos (iFood / PDV)</td>
                <td className="p-3 text-right text-zinc-800 dark:text-zinc-200">{formatCurrency(dreData.productSales)}</td>
                <td className="p-3 text-right text-zinc-400">{(dreData.totalEntradas > 0 ? (dreData.productSales / dreData.totalEntradas) * 100 : 0).toFixed(1)}%</td>
              </tr>
              <tr>
                <td className="p-3 pl-8 text-zinc-600 dark:text-zinc-400">Outras Receitas e Entradas Extras</td>
                <td className="p-3 text-right text-zinc-800 dark:text-zinc-200">{formatCurrency(dreData.otherRevenuesVal)}</td>
                <td className="p-3 text-right text-zinc-400">{(dreData.totalEntradas > 0 ? (dreData.otherRevenuesVal / dreData.totalEntradas) * 100 : 0).toFixed(1)}%</td>
              </tr>

              {/* SECTION 2: GASTOS VARIAVEIS */}
              <tr className="bg-zinc-50/40 dark:bg-zinc-800/20 font-bold">
                <td className="p-3 text-zinc-900 dark:text-zinc-100">2. (-) GASTOS VARIÁVEIS</td>
                <td className="p-3 text-right text-rose-500">{formatCurrency(dreData.totalVariaveis)}</td>
                <td className="p-3 text-right text-zinc-500">{(dreData.totalEntradas > 0 ? (dreData.totalVariaveis / dreData.totalEntradas) * 100 : 0).toFixed(1)}%</td>
              </tr>
              <tr>
                <td className="p-3 pl-8 text-zinc-600 dark:text-zinc-400">Custo de Insumos e Ingredientes (Wraps/Bebidas)</td>
                <td className="p-3 text-right text-zinc-700 dark:text-zinc-300">{formatCurrency(dreData.ingredientsCost)}</td>
                <td className="p-3 text-right text-zinc-400">{(dreData.totalEntradas > 0 ? (dreData.ingredientsCost / dreData.totalEntradas) * 100 : 0).toFixed(1)}%</td>
              </tr>
              <tr>
                <td className="p-3 pl-8 text-zinc-600 dark:text-zinc-400">Despesas Tributárias e de Cartões (Comissão)</td>
                <td className="p-3 text-right text-zinc-700 dark:text-zinc-300">{formatCurrency(dreData.taxesPaid)}</td>
                <td className="p-3 text-right text-zinc-400">{(dreData.totalEntradas > 0 ? (dreData.taxesPaid / dreData.totalEntradas) * 100 : 0).toFixed(1)}%</td>
              </tr>
              <tr>
                <td className="p-3 pl-8 text-zinc-600 dark:text-zinc-400">Custos Variáveis da Planilha (Embalagens/Outros)</td>
                <td className="p-3 text-right text-zinc-700 dark:text-zinc-300">{formatCurrency(dreData.variableSpreadsheet)}</td>
                <td className="p-3 text-right text-zinc-400">{(dreData.totalEntradas > 0 ? (dreData.variableSpreadsheet / dreData.totalEntradas) * 100 : 0).toFixed(1)}%</td>
              </tr>

              {/* MARGEM DE CONTRIBUICAO */}
              <tr className="bg-zinc-100/40 dark:bg-zinc-900/40 font-extrabold text-sm border-y border-zinc-200 dark:border-zinc-700 text-brand-orange">
                <td className="p-3">3. (=) MARGEM DE CONTRIBUIÇÃO LÍQUIDA</td>
                <td className="p-3 text-right">{formatCurrency(dreData.margemContribuicao)}</td>
                <td className="p-3 text-right">{(dreData.totalEntradas > 0 ? (dreData.margemContribuicao / dreData.totalEntradas) * 100 : 0).toFixed(1)}%</td>
              </tr>

              {/* SECTION 3: GASTOS FIXOS */}
              <tr className="bg-zinc-50/40 dark:bg-zinc-800/20 font-bold">
                <td className="p-3 text-zinc-900 dark:text-zinc-100">4. (-) GASTOS FIXOS</td>
                <td className="p-3 text-right text-orange-500">{formatCurrency(dreData.fixedCostsVal)}</td>
                <td className="p-3 text-right text-zinc-500">{(dreData.totalEntradas > 0 ? (dreData.fixedCostsVal / dreData.totalEntradas) * 100 : 0).toFixed(1)}%</td>
              </tr>
              <tr>
                <td className="p-3 pl-8 text-zinc-600 dark:text-zinc-400">Despesas Fixas Cadastradas (Aluguel, salários, sistemas)</td>
                <td className="p-3 text-right text-zinc-700 dark:text-zinc-300">{formatCurrency(dreData.fixedCostsVal)}</td>
                <td className="p-3 text-right text-zinc-400">{(dreData.totalEntradas > 0 ? (dreData.fixedCostsVal / dreData.totalEntradas) * 100 : 0).toFixed(1)}%</td>
              </tr>

              {/* SOBRA LIQUIDA */}
              <tr className={`font-extrabold text-sm border-t-2 border-zinc-300 dark:border-zinc-600 ${dreData.sobraLiquida >= 0 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>
                <td className="p-3">5. (=) RESULTADO LÍQUIDO DO PERÍODO (SOBRA)</td>
                <td className="p-3 text-right font-mono text-base">{formatCurrency(dreData.sobraLiquida)}</td>
                <td className="p-3 text-right font-mono text-base">{(dreData.totalEntradas > 0 ? (dreData.sobraLiquida / dreData.totalEntradas) * 100 : 0).toFixed(1)}%</td>
              </tr>

            </tbody>
          </table>
        </div>

        {/* Explanation text */}
        <div className="flex items-start space-x-2 p-3 bg-zinc-50 dark:bg-zinc-900/60 rounded-lg border border-zinc-150 dark:border-zinc-700 text-[11px] text-zinc-500 dark:text-zinc-400">
          <Info className="w-4 h-4 text-brand-tomato shrink-0 mt-0.5" />
          <p>
            Esta planilha é calculada dividindo os custos mensais pelos dias úteis/operacionais ({operationalDays} dias) no caso da visualização Diária, ou por 4.33 no caso da Semanal. Os custos de wraps e tributos variam de acordo com as quantidades cadastradas nas estimativas de vendas de cada produto.
          </p>
        </div>
      </div>

    </div>
  );
}
