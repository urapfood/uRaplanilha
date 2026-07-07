import React, { useMemo } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  Percent, 
  Briefcase, 
  Award, 
  PieChart, 
  AlertCircle 
} from 'lucide-react';
import { Product, Tax, FixedCost, VariableCost, Sale, OtherRevenue } from '../types';
import { 
  calculateProductMetrics, 
  formatCurrency, 
  formatPercent, 
  getActiveTaxPercentage 
} from '../utils';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import PDVSection from './PDVSection';

interface DashboardProps {
  products: Product[];
  taxes: Tax[];
  fixedCosts: FixedCost[];
  variableCosts: VariableCost[];
  otherRevenues: OtherRevenue[];
  sales?: Sale[];
}

export default function Dashboard({ products, taxes, fixedCosts, variableCosts, otherRevenues, sales = [] }: DashboardProps) {
  const activeTaxRate = useMemo(() => getActiveTaxPercentage(taxes), [taxes]);

  // Compute stats
  const stats = useMemo(() => {
    if (products.length === 0) {
      return {
        highestProfitProduct: null,
        highestMarginProduct: null,
        monthlyRevenue: 0,
        monthlyNetProfit: 0,
        totalFixedCosts: 0,
        finalMonthlyResult: 0,
      };
    }

    const calculatedProducts = products.map((product) => {
      const metrics = calculateProductMetrics(product, activeTaxRate);
      const monthlyProductRevenue = product.sellingPrice * (product.estimatedSales || 0);
      const monthlyProductNetProfit = metrics.netProfit * (product.estimatedSales || 0);

      return {
        product,
        metrics,
        monthlyProductRevenue,
        monthlyProductNetProfit,
      };
    });

    // 1. Product with highest unit net profit
    const highestProfit = [...calculatedProducts].sort(
      (a, b) => b.metrics.netProfit - a.metrics.netProfit
    )[0];

    // 2. Product with highest margin %
    const highestMargin = [...calculatedProducts].sort(
      (a, b) => b.metrics.margin - a.metrics.margin
    )[0];

    // 3. Simulated monthly metrics (iFood)
    const monthlyRevenue = calculatedProducts.reduce(
      (sum, p) => sum + p.monthlyProductRevenue,
      0
    );
    const monthlyNetProfit = calculatedProducts.reduce(
      (sum, p) => sum + p.monthlyProductNetProfit,
      0
    );

    // 4. PDV Sales metrics (Real sales outside iFood)
    const pdvRevenue = sales.reduce((sum, s) => sum + s.totalAmount, 0);
    const pdvNetProfit = sales.reduce((sum, s) => sum + s.netProfit, 0);

    // 5. Fixed Costs
    const totalFixedCosts = fixedCosts.reduce((sum, fc) => sum + fc.monthlyValue, 0);
    const totalVariableCosts = variableCosts.reduce((sum, vc) => sum + vc.monthlyValue, 0);
    const totalDespesas = totalFixedCosts + totalVariableCosts;
    const totalOtherRevenues = otherRevenues.reduce((sum, or) => sum + or.monthlyValue, 0);
    const finalMonthlyResult = (monthlyNetProfit + pdvNetProfit) - totalDespesas + totalOtherRevenues;

    return {
      highestProfitProduct: highestProfit ? {
        name: highestProfit.product.name,
        value: highestProfit.metrics.netProfit,
        margin: highestProfit.metrics.margin,
      } : null,
      highestMarginProduct: highestMargin ? {
        name: highestMargin.product.name,
        margin: highestMargin.metrics.margin,
        value: highestMargin.metrics.netProfit,
      } : null,
      monthlyRevenue,
      monthlyNetProfit,
      pdvRevenue,
      pdvNetProfit,
      totalFixedCosts: totalDespesas,
      totalOtherRevenues,
      finalMonthlyResult,
    };
  }, [products, taxes, fixedCosts, variableCosts, otherRevenues, activeTaxRate, sales]);

  // Chart data preparation
  const chartData = useMemo(() => {
    return products.map((product) => {
      const metrics = calculateProductMetrics(product, activeTaxRate);
      return {
        name: product.name.length > 18 ? product.name.substring(0, 15) + '...' : product.name,
        'Lucro Líquido Unitário': Number(metrics.netProfit.toFixed(2)),
        'Custo Unitário': Number(metrics.cost.toFixed(2)),
        'Preço de Venda': Number(product.sellingPrice.toFixed(2)),
        margin: metrics.margin,
      };
    });
  }, [products, activeTaxRate]);

  // Theme helper for chart text
  const isDark = document.documentElement.classList.contains('dark');

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="p-4 bg-brand-tomato/10 text-brand-tomato rounded-full mb-4">
          <AlertCircle className="w-10 h-10" />
        </div>
        <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Sem dados para exibir no Dashboard</h3>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400 max-w-md">
          Cadastre produtos na aba <strong className="text-brand-tomato">Produtos</strong> para visualizar o resumo financeiro, os mais lucrativos e os gráficos de comparação de margens.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* 4 Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Card 1: Faturamento do Mês */}
        <div className="bg-white dark:bg-zinc-800 p-5 rounded-lg border border-zinc-200/60 dark:border-zinc-700 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2.5 mb-3">
              <div className="p-1.5 bg-zinc-50 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-200 rounded-md border border-zinc-100 dark:border-zinc-600">
                <DollarSign className="w-4 h-4 text-brand-orange" />
              </div>
              <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Faturamento Consolidado
              </p>
            </div>
            <h4 className="text-xl sm:text-2xl font-bold tech-font-mono font-mono text-zinc-900 dark:text-white mt-1 break-words">
              {formatCurrency(stats.monthlyRevenue + stats.pdvRevenue)}
            </h4>
          </div>
          <div className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-3 border-t border-zinc-100/40 dark:border-zinc-700/40 pt-2 flex justify-between gap-1.5">
            <span>iFood: {formatCurrency(stats.monthlyRevenue)}</span>
            <span>PDV: {formatCurrency(stats.pdvRevenue)}</span>
          </div>
        </div>

        {/* Card 2: Lucro Líquido do Mês */}
        <div className="bg-white dark:bg-zinc-800 p-5 rounded-lg border border-zinc-200/60 dark:border-zinc-700 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2.5 mb-3">
              <div className="p-1.5 bg-brand-tomato/5 dark:bg-brand-tomato/10 text-brand-tomato rounded-md border border-brand-tomato/10">
                <TrendingUp className="w-4 h-4" />
              </div>
              <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Lucro Operacional Total
              </p>
            </div>
            <h4 className="text-xl sm:text-2xl font-bold tech-font-mono font-mono text-brand-tomato mt-1 break-words">
              {formatCurrency(stats.monthlyNetProfit + stats.pdvNetProfit)}
            </h4>
          </div>
          <div className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-3 border-t border-zinc-100/40 dark:border-zinc-700/40 pt-2 flex justify-between gap-1.5">
            <span>iFood: {formatCurrency(stats.monthlyNetProfit)}</span>
            <span>PDV: {formatCurrency(stats.pdvNetProfit)}</span>
          </div>
        </div>

        {/* Card 3: Custos Fixos */}
        <div className="bg-white dark:bg-zinc-800 p-5 rounded-lg border border-zinc-200/60 dark:border-zinc-700 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2.5 mb-3">
              <div className="p-1.5 bg-zinc-50 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-200 rounded-md border border-zinc-100 dark:border-zinc-600">
                <Briefcase className="w-4 h-4 text-brand-terracota dark:text-brand-orange" />
              </div>
              <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Custos (Fixos + Var)
              </p>
            </div>
            <h4 className="text-xl sm:text-2xl font-bold tech-font-mono font-mono text-zinc-800 dark:text-zinc-200 mt-1 break-words">
              {formatCurrency(stats.totalFixedCosts)}
            </h4>
          </div>
          <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-3 border-t border-zinc-100/40 dark:border-zinc-700/40 pt-2">
            Soma das despesas operacionais
          </p>
        </div>

        {/* Card Extra: Receitas Extras */}
        <div className="bg-white dark:bg-zinc-800 p-5 rounded-lg border border-zinc-200/60 dark:border-zinc-700 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2.5 mb-3">
              <div className="p-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-md border border-emerald-100 dark:border-emerald-800/50">
                <DollarSign className="w-4 h-4" />
              </div>
              <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Receitas Extras Mensal
              </p>
            </div>
            <h4 className="text-xl sm:text-2xl font-bold tech-font-mono font-mono text-emerald-600 dark:text-emerald-400 mt-1 break-words">
              {formatCurrency(stats.totalOtherRevenues || 0)}
            </h4>
          </div>
          <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-3 border-t border-zinc-100/40 dark:border-zinc-700/40 pt-2">
            Entradas além das vendas diretas
          </p>
        </div>

        {/* Card 4: Resultado Líquido Final */}
        <div className={`p-5 rounded-lg border shadow-sm flex flex-col justify-between ${
          stats.finalMonthlyResult >= 0 
            ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-150 dark:border-emerald-900/50' 
            : 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-150 dark:border-rose-900/50'
        }`}>
          <div>
            <div className="flex items-center space-x-2.5 mb-3">
              <div className={`p-1.5 rounded-md border ${
                stats.finalMonthlyResult >= 0 
                  ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' 
                  : 'bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-300 border-rose-200 dark:border-rose-800'
              }`}>
                <Award className="w-4 h-4" />
              </div>
              <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Resultado Final (Sobra)
              </p>
            </div>
            <h4 className={`text-xl sm:text-2xl font-bold tech-font-mono font-mono mt-1 break-words ${
              stats.finalMonthlyResult >= 0 
                ? 'text-emerald-600 dark:text-emerald-400' 
                : 'text-rose-600 dark:text-rose-400'
            }`}>
              {formatCurrency(stats.finalMonthlyResult)}
            </h4>
          </div>
          <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-3 border-t border-zinc-100/40 dark:border-zinc-700/40 pt-2">
            Lucro Operacional Total − Custos Fixos
          </p>
        </div>

      </div>

      {/* Best performers row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Unit Profit Leader */}
        {stats.highestProfitProduct && (
          <div className="bg-white dark:bg-zinc-800 p-5 rounded-lg border border-zinc-200/60 dark:border-zinc-700 shadow-sm flex items-center justify-between">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 text-amber-500 dark:text-amber-400 rounded-lg">
                <Award className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Maior Lucro Unitário
                </span>
                <h5 className="font-bold tech-font-serif-italic font-serif italic text-zinc-900 dark:text-white mt-1 truncate">
                  {stats.highestProfitProduct.name}
                </h5>
              </div>
            </div>
            <div className="text-right pl-4">
              <p className="text-lg font-bold tech-font-mono font-mono text-emerald-600 dark:text-emerald-400">
                {formatCurrency(stats.highestProfitProduct.value)}
              </p>
              <p className="text-xs tech-font-mono font-mono text-zinc-400 dark:text-zinc-500">
                Margem: {stats.highestProfitProduct.margin.toFixed(1)}%
              </p>
            </div>
          </div>
        )}

        {/* Unit Margin % Leader */}
        {stats.highestMarginProduct && (
          <div className="bg-white dark:bg-zinc-800 p-5 rounded-lg border border-zinc-200/60 dark:border-zinc-700 shadow-sm flex items-center justify-between">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 text-blue-500 dark:text-blue-400 rounded-lg">
                <Percent className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Maior Margem Líquida
                </span>
                <h5 className="font-bold tech-font-serif-italic font-serif italic text-zinc-900 dark:text-white mt-1 truncate">
                  {stats.highestMarginProduct.name}
                </h5>
              </div>
            </div>
            <div className="text-right pl-4">
              <p className="text-lg font-bold tech-font-mono font-mono text-blue-600 dark:text-blue-400">
                {stats.highestMarginProduct.margin.toFixed(1)}%
              </p>
              <p className="text-xs tech-font-mono font-mono text-zinc-400 dark:text-zinc-500">
                Lucro: {formatCurrency(stats.highestMarginProduct.value)}
              </p>
            </div>
          </div>
        )}

      </div>

      {/* Recharts Bar Chart Card */}
      <div className="bg-white dark:bg-zinc-800 p-6 rounded-lg border border-zinc-200/60 dark:border-zinc-700 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div>
            <h4 className="text-lg font-bold tech-font-serif-italic font-serif italic text-zinc-900 dark:text-white">
              Comparativo Financeiro por Produto (Unitário)
            </h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Veja a relação entre Preço de Venda, Custo Insumos e Lucro Líquido de cada produto.
            </p>
          </div>
          <div className="flex items-center space-x-4 text-xs font-semibold uppercase tracking-wider">
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 bg-[#E24B4A] rounded-sm"></span>
              <span className="text-zinc-600 dark:text-zinc-400">Preço de Venda</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 bg-[#F2A93B] rounded-sm"></span>
              <span className="text-zinc-600 dark:text-zinc-400">Custo</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 bg-emerald-500 rounded-sm"></span>
              <span className="text-zinc-600 dark:text-zinc-400">Lucro Líquido</span>
            </div>
          </div>
        </div>

        <div className="h-80 w-full" id="dashboard-chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#3f3f46' : '#e4e4e7'} />
              <XAxis 
                dataKey="name" 
                tick={{ fill: isDark ? '#a1a1aa' : '#71717a', fontSize: 11 }}
                axisLine={{ stroke: isDark ? '#52525b' : '#d4d4d8' }}
                tickLine={false}
              />
              <YAxis 
                tick={{ fill: isDark ? '#a1a1aa' : '#71717a', fontSize: 11 }}
                axisLine={{ stroke: isDark ? '#52525b' : '#d4d4d8' }}
                tickLine={false}
                tickFormatter={(val) => `R$${val}`}
              />
              <Tooltip
                formatter={(value: any, name: any) => [formatCurrency(Number(value)), name]}
                contentStyle={{ 
                  backgroundColor: isDark ? '#18181b' : '#ffffff', 
                  borderColor: isDark ? '#3f3f46' : '#e4e4e7',
                  borderRadius: '12px',
                  color: isDark ? '#f4f4f5' : '#18181b'
                }}
              />
              <Bar dataKey="Preço de Venda" fill="#E24B4A" radius={[4, 4, 0, 0]} maxBarSize={32} />
              <Bar dataKey="Custo Unitário" fill="#F2A93B" radius={[4, 4, 0, 0]} maxBarSize={32} />
              <Bar dataKey="Lucro Líquido Unitário" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}
