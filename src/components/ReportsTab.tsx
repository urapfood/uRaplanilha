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
import { Product, Tax, FixedCost, VariableCost, OtherRevenue } from '../types';
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
}

export default function ReportsTab({ products, taxes, fixedCosts, variableCosts, otherRevenues }: ReportsTabProps) {
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
    const totalVariable = variableCosts.reduce((sum, item) => sum + item.monthlyValue, 0);
    const totalDespesas = totalFixed + totalVariable;
    
    const totalOther = otherRevenues.reduce((sum, item) => sum + item.monthlyValue, 0);
    const finalResult = totalNetProfit - totalDespesas + totalOther;

    return {
      productRows,
      totalRevenue,
      totalIngredientsCost,
      totalTaxesPaid,
      totalNetProfit, // Net profit from products (contribution margin in R$)
      totalFixed: totalDespesas,
      totalOther,
      finalResult, // Bottom-line cash left
      totalQty
    };
  }, [products, taxes, fixedCosts, variableCosts, otherRevenues, activeTaxPercentage]);

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
    const baseFixed = monthlyMetrics.totalFixed / 4.33;

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
    const fixedCostsValue = monthlyMetrics.totalFixed;

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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            
            {/* Card 1: Faturamento Diário */}
            <div className="bg-white dark:bg-zinc-800 p-5 rounded-lg border border-zinc-200/60 dark:border-zinc-700 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-2.5 mb-3">
                  <div className="p-1.5 bg-zinc-50 dark:bg-zinc-700 text-brand-orange rounded-md border border-zinc-100 dark:border-zinc-600">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Faturamento Diário Médio
                  </p>
                </div>
                <h4 className="text-xl sm:text-2xl font-bold tech-font-mono font-mono text-zinc-900 dark:text-white break-words">
                  {formatCurrency(dailyMetrics.revenue)}
                </h4>
              </div>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-3 border-t border-zinc-100/40 dark:border-zinc-700/40 pt-2">
                Simulado para {operationalDays} dias operacionais
              </p>
            </div>

            {/* Card 2: Lucro de Produtos Diário */}
            <div className="bg-white dark:bg-zinc-800 p-5 rounded-lg border border-zinc-200/60 dark:border-zinc-700 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-2.5 mb-3">
                  <div className="p-1.5 bg-brand-tomato/5 dark:bg-brand-tomato/10 text-brand-tomato rounded-md border border-brand-tomato/10">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Lucro Prod. Diário Médio
                  </p>
                </div>
                <h4 className="text-xl sm:text-2xl font-bold tech-font-mono font-mono text-brand-tomato break-words">
                  {formatCurrency(dailyMetrics.productNetProfit)}
                </h4>
              </div>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-3 border-t border-zinc-100/40 dark:border-zinc-700/40 pt-2">
                Antes de amortizar os custos fixos
              </p>
            </div>

            {/* Card 3: Custo Fixo Diário */}
            <div className="bg-white dark:bg-zinc-800 p-5 rounded-lg border border-zinc-200/60 dark:border-zinc-700 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-2.5 mb-3">
                  <div className="p-1.5 bg-zinc-50 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-200 rounded-md border border-zinc-100 dark:border-zinc-600">
                    <Briefcase className="w-4 h-4 text-brand-terracota dark:text-brand-orange" />
                  </div>
                  <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Fração de Custo Fixo/Dia
                  </p>
                </div>
                <h4 className="text-xl sm:text-2xl font-bold tech-font-mono font-mono text-zinc-800 dark:text-zinc-200 break-words">
                  {formatCurrency(dailyMetrics.fixedCost)}
                </h4>
              </div>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-3 border-t border-zinc-100/40 dark:border-zinc-700/40 pt-2">
                Divisão linear das despesas fixas
              </p>
            </div>

            {/* Card Extra: Receitas Extras Diário */}
            <div className="bg-white dark:bg-zinc-800 p-5 rounded-lg border border-zinc-200/60 dark:border-zinc-700 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-2.5 mb-3">
                  <div className="p-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-md border border-emerald-100 dark:border-emerald-800/50">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Receitas Extras / Dia
                  </p>
                </div>
                <h4 className="text-xl sm:text-2xl font-bold tech-font-mono font-mono text-emerald-600 break-words">
                  {formatCurrency(dailyMetrics.otherRevenues)}
                </h4>
              </div>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-3 border-t border-zinc-100/40 dark:border-zinc-700/40 pt-2">
                Fração das receitas fora do iFood
              </p>
            </div>

            {/* Card 4: Sobra Diária Líquida */}
            <div className={`p-5 rounded-lg border shadow-sm flex flex-col justify-between ${
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
                  <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Sobra Líquida Diária
                  </p>
                </div>
                <h4 className={`text-xl sm:text-2xl font-bold tech-font-mono font-mono break-words ${
                  dailyMetrics.finalResult >= 0 
                    ? 'text-emerald-600 dark:text-emerald-400' 
                    : 'text-rose-600 dark:text-rose-400'
                }`}>
                  {formatCurrency(dailyMetrics.finalResult)}
                </h4>
              </div>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-3 border-t border-zinc-100/40 dark:border-zinc-700/40 pt-2">
                Sobra real líquida por dia útil
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            
            {/* Card 1: Faturamento Semanal */}
            <div className="bg-white dark:bg-zinc-800 p-5 rounded-lg border border-zinc-200/60 dark:border-zinc-700 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-2.5 mb-3">
                  <div className="p-1.5 bg-zinc-50 dark:bg-zinc-700 text-brand-orange rounded-md border border-zinc-100 dark:border-zinc-600">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Faturamento Semanal Médio
                  </p>
                </div>
                <h4 className="text-xl sm:text-2xl font-bold tech-font-mono font-mono text-zinc-900 dark:text-white break-words">
                  {formatCurrency(weeklyMetrics.revenue)}
                </h4>
              </div>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-3 border-t border-zinc-100/40 dark:border-zinc-700/40 pt-2">
                Faturamento esperado a cada 7 dias
              </p>
            </div>

            {/* Card 2: Lucro de Produtos Semanal */}
            <div className="bg-white dark:bg-zinc-800 p-5 rounded-lg border border-zinc-200/60 dark:border-zinc-700 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-2.5 mb-3">
                  <div className="p-1.5 bg-brand-tomato/5 dark:bg-brand-tomato/10 text-brand-tomato rounded-md border border-brand-tomato/10">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Lucro Prod. Semanal Médio
                  </p>
                </div>
                <h4 className="text-xl sm:text-2xl font-bold tech-font-mono font-mono text-brand-tomato break-words">
                  {formatCurrency(weeklyMetrics.productNetProfit)}
                </h4>
              </div>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-3 border-t border-zinc-100/40 dark:border-zinc-700/40 pt-2">
                Faturamento líquido menos custos variáveis
              </p>
            </div>

            {/* Card 3: Custos Fixos Semanais */}
            <div className="bg-white dark:bg-zinc-800 p-5 rounded-lg border border-zinc-200/60 dark:border-zinc-700 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-2.5 mb-3">
                  <div className="p-1.5 bg-zinc-50 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-200 rounded-md border border-zinc-100 dark:border-zinc-600">
                    <Briefcase className="w-4 h-4 text-brand-terracota dark:text-brand-orange" />
                  </div>
                  <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Custos Fixos Semanais
                  </p>
                </div>
                <h4 className="text-xl sm:text-2xl font-bold tech-font-mono font-mono text-zinc-800 dark:text-zinc-200 break-words">
                  {formatCurrency(weeklyMetrics.fixedCost)}
                </h4>
              </div>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-3 border-t border-zinc-100/40 dark:border-zinc-700/40 pt-2">
                Fração das despesas operacionais fixas
              </p>
            </div>

            {/* Card 4: Sobra Semanal */}
            <div className={`p-5 rounded-lg border shadow-sm flex flex-col justify-between ${
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
                  <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Sobra Semanal Líquida
                  </p>
                </div>
                <h4 className={`text-xl sm:text-2xl font-bold tech-font-mono font-mono break-words ${
                  weeklyMetrics.finalResult >= 0 
                    ? 'text-emerald-600 dark:text-emerald-400' 
                    : 'text-rose-600 dark:text-rose-400'
                }`}>
            <div className="bg-white dark:bg-zinc-800 p-5 rounded-lg border border-zinc-200/60 dark:border-zinc-700 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-2.5 mb-3">
                  <div className="p-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-md border border-emerald-100 dark:border-emerald-800/50">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Receitas Extras / Sem
                  </p>
                </div>
                <h4 className="text-xl sm:text-2xl font-bold tech-font-mono font-mono text-emerald-600 break-words">
                  {formatCurrency(weeklyMetrics.otherRevenues)}
                </h4>
              </div>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-3 border-t border-zinc-100/40 dark:border-zinc-700/40 pt-2">
                Fração das receitas fora do iFood
              </p>
            </div>
                  {formatCurrency(weeklyMetrics.finalResult)}
                </h4>
              </div>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-3 border-t border-zinc-100/40 dark:border-zinc-700/40 pt-2">
                Sobra real de caixa acumulada na semana
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            
            <div className="bg-white dark:bg-zinc-800 p-5 rounded-lg border border-zinc-200/60 dark:border-zinc-700 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-2.5 mb-3">
                  <div className="p-1.5 bg-zinc-50 dark:bg-zinc-700 text-brand-orange rounded-md border border-zinc-100 dark:border-zinc-600">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Faturamento Mensal
                  </p>
                </div>
                <h4 className="text-xl sm:text-2xl font-bold tech-font-mono font-mono text-zinc-900 dark:text-white break-words">
                  {formatCurrency(monthlyMetrics.totalRevenue)}
                </h4>
              </div>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-3 border-t border-zinc-100/40 dark:border-zinc-700/40 pt-2">
                Total bruto acumulado no mês
              </p>
            </div>

            <div className="bg-white dark:bg-zinc-800 p-5 rounded-lg border border-zinc-200/60 dark:border-zinc-700 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-2.5 mb-3">
                  <div className="p-1.5 bg-brand-tomato/5 dark:bg-brand-tomato/10 text-brand-tomato rounded-md border border-brand-tomato/10">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Lucro de Produtos Mensal
                  </p>
                </div>
                <h4 className="text-xl sm:text-2xl font-bold tech-font-mono font-mono text-brand-tomato break-words">
                  {formatCurrency(monthlyMetrics.totalNetProfit)}
                </h4>
              </div>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-3 border-t border-zinc-100/40 dark:border-zinc-700/40 pt-2">
                Soma de todos os wraps e bebidas vendidos
              </p>
            </div>

            <div className="bg-white dark:bg-zinc-800 p-5 rounded-lg border border-zinc-200/60 dark:border-zinc-700 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-2.5 mb-3">
                  <div className="p-1.5 bg-zinc-50 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-200 rounded-md border border-zinc-100 dark:border-zinc-600">
                    <Briefcase className="w-4 h-4 text-brand-terracota dark:text-brand-orange" />
                  </div>
                  <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Despesas Fixas Mensais
                  </p>
                </div>
                <h4 className="text-xl sm:text-2xl font-bold tech-font-mono font-mono text-zinc-800 dark:text-zinc-200 break-words">
                  {formatCurrency(monthlyMetrics.totalFixed)}
                </h4>
              </div>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-3 border-t border-zinc-100/40 dark:border-zinc-700/40 pt-2">
                Aluguel, salários, sistemas, energia
              </p>
            </div>

            <div className={`p-5 rounded-lg border shadow-sm flex flex-col justify-between ${
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
                  <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Sobra Líquida Mensal
                  </p>
                </div>
                <h4 className={`text-xl sm:text-2xl font-bold tech-font-mono font-mono break-words ${
                  monthlyMetrics.finalResult >= 0 
                    ? 'text-emerald-600 dark:text-emerald-400' 
                    : 'text-rose-600 dark:text-rose-400'
                }`}>
                  {formatCurrency(monthlyMetrics.finalResult)}
                </h4>
              </div>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-3 border-t border-zinc-100/40 dark:border-zinc-700/40 pt-2">
                Lucro real acumulado do seu negócio
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

    </div>
  );
}
