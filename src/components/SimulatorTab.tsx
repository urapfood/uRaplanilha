import React, { useMemo } from 'react';
import { 
  Calculator, 
  DollarSign, 
  TrendingUp, 
  Briefcase, 
  AlertCircle,
  HelpCircle,
  Info
} from 'lucide-react';
import { Product, Tax, FixedCost, VariableCost, OtherRevenue } from '../types';
import { 
  calculateProductMetrics, 
  formatCurrency, 
  getActiveTaxPercentage 
} from '../utils';

interface SimulatorTabProps {
  products: Product[];
  setProducts: (products: Product[]) => void;
  taxes: Tax[];
  fixedCosts: FixedCost[];
  variableCosts: VariableCost[];
  otherRevenues: OtherRevenue[];
}

export default function SimulatorTab({
  products,
  setProducts,
  taxes,
  fixedCosts,
  variableCosts,
  otherRevenues
}: SimulatorTabProps) {
  const activeTaxRate = useMemo(() => getActiveTaxPercentage(taxes), [taxes]);

  const totalFixedCosts = useMemo(() => {
    return fixedCosts.reduce((sum, fc) => sum + fc.monthlyValue, 0);
  }, [fixedCosts]);

  const totalVariableCosts = useMemo(() => {
    return variableCosts.reduce((sum, vc) => sum + vc.monthlyValue, 0);
  }, [variableCosts]);

  const totalOtherRevenues = useMemo(() => {
    return otherRevenues.reduce((sum, item) => sum + item.monthlyValue, 0);
  }, [otherRevenues]);

  const totalDespesas = totalFixedCosts + totalVariableCosts;

  // Calculations for simulated metrics
  const simulationMetrics = useMemo(() => {
    let totalRevenue = 0;
    let totalNetProfit = 0;
    let totalCost = 0;

    const rowDetails = products.map((product) => {
      const metrics = calculateProductMetrics(product, activeTaxRate);
      const qty = product.estimatedSales || 0;
      const revenue = product.sellingPrice * qty;
      const netProfit = metrics.netProfit * qty;
      const cost = metrics.cost * qty;

      totalRevenue += revenue;
      totalNetProfit += netProfit;
      totalCost += cost;

      return {
        id: product.id,
        name: product.name,
        category: product.category,
        sellingPrice: product.sellingPrice,
        unitNetProfit: metrics.netProfit,
        unitCost: metrics.cost,
        qty,
        revenue,
        netProfit,
      };
    });

    const netResult = totalNetProfit - totalDespesas + totalOtherRevenues;
    
    return {
      totalRevenue,
      totalNetProfit,
      totalCost,
      netResult,
      rows: rowDetails,
    };
  }, [products, activeTaxRate, totalDespesas, totalOtherRevenues]);

  const handleUpdateQty = (id: string, qtyValue: number) => {
    const qty = isNaN(qtyValue) || qtyValue < 0 ? 0 : Math.round(qtyValue);
    setProducts(
      products.map((p) => (p.id === id ? { ...p, estimatedSales: qty } : p))
    );
  };

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-zinc-200 dark:border-zinc-700 rounded-2xl">
        <AlertCircle className="w-10 h-10 text-zinc-300 mb-3" />
        <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-200">Nenhum produto cadastrado</h3>
        <p className="text-sm text-zinc-500 mt-1 max-w-sm">
          Adicione produtos na aba de <strong className="text-brand-tomato">Produtos</strong> antes de simular suas vendas.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* 1. Simulation Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Card 1: Faturamento total do simulador */}
        <div className="bg-white dark:bg-zinc-800 p-5 rounded-lg border border-zinc-200/60 dark:border-zinc-700 shadow-sm flex flex-col justify-between">
          <div className="flex items-center space-x-2.5 mb-3">
            <div className="p-1.5 bg-zinc-50 dark:bg-zinc-700 text-brand-orange rounded-md border border-zinc-100 dark:border-zinc-600">
              <DollarSign className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Faturamento Bruto
            </span>
          </div>
          <span className="text-xl sm:text-2xl font-bold tech-font-mono font-mono text-zinc-900 dark:text-white mt-1 break-words block">
            {formatCurrency(simulationMetrics.totalRevenue)}
          </span>
        </div>

        {/* Card 2: Lucro Líquido total dos produtos */}
        <div className="bg-white dark:bg-zinc-800 p-5 rounded-lg border border-zinc-200/60 dark:border-zinc-700 shadow-sm flex flex-col justify-between">
          <div className="flex items-center space-x-2.5 mb-3">
            <div className="p-1.5 bg-brand-tomato/5 dark:bg-brand-tomato/10 text-brand-tomato rounded-md border border-brand-tomato/10">
              <TrendingUp className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Lucro Líquido total
            </span>
          </div>
          <span className="text-xl sm:text-2xl font-bold tech-font-mono font-mono text-brand-tomato mt-1 break-words block">
            {formatCurrency(simulationMetrics.totalNetProfit)}
          </span>
        </div>

        {/* Card 3: Custos Fixos */}
        <div className="bg-white dark:bg-zinc-800 p-5 rounded-lg border border-zinc-200/60 dark:border-zinc-700 shadow-sm flex flex-col justify-between">
          <div className="flex items-center space-x-2.5 mb-3">
            <div className="p-1.5 bg-zinc-50 dark:bg-zinc-700 text-brand-terracota dark:text-brand-orange rounded-md border border-zinc-100 dark:border-zinc-600">
              <Briefcase className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Custos Mensais
            </span>
          </div>
          <span className="text-xl sm:text-2xl font-bold tech-font-mono font-mono text-zinc-800 dark:text-zinc-200 mt-1 break-words block">
            {formatCurrency(totalDespesas)}
          </span>
        </div>

        {/* Card Extra: Outras Receitas */}
        <div className="bg-white dark:bg-zinc-800 p-5 rounded-lg border border-zinc-200/60 dark:border-zinc-700 shadow-sm flex flex-col justify-between">
          <div className="flex items-center space-x-2.5 mb-3">
            <div className="p-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-md border border-emerald-100 dark:border-emerald-800/50">
              <DollarSign className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Receitas Extras
            </span>
          </div>
          <span className="text-xl sm:text-2xl font-bold tech-font-mono font-mono text-emerald-600 dark:text-emerald-400 mt-1 break-words block">
            {formatCurrency(totalOtherRevenues)}
          </span>
        </div>

        {/* Card 4: Resultado Final */}
        <div className={`p-5 rounded-lg border shadow-sm flex flex-col justify-between ${
          simulationMetrics.netResult >= 0 
            ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-150 dark:border-emerald-900/50' 
            : 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-150 dark:border-rose-900/50'
        }`}>
          <div className="flex items-center space-x-2.5 mb-3">
            <div className={`p-1.5 rounded-md border ${
              simulationMetrics.netResult >= 0 
                ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 border-emerald-200 dark:border-emerald-800' 
                : 'bg-rose-100 dark:bg-rose-900/50 text-rose-600 border-rose-200 dark:border-rose-800'
            }`}>
              <Calculator className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Sobra Líquida de Caixa
            </span>
          </div>
          <span className={`text-xl sm:text-2xl font-bold tech-font-mono font-mono mt-1 break-words block ${
            simulationMetrics.netResult >= 0 
              ? 'text-emerald-600 dark:text-emerald-400' 
              : 'text-rose-600 dark:text-rose-400'
          }`}>
            {formatCurrency(simulationMetrics.netResult)}
          </span>
        </div>

      </div>

      {/* 2. Simulation Instructions */}
      <div className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-xl border border-zinc-150 dark:border-zinc-700/60 flex items-start space-x-2.5">
        <Info className="w-4.5 h-4.5 text-brand-orange shrink-0 mt-0.5" />
        <p className="text-xs text-zinc-600 dark:text-zinc-300">
          Abaixo estão listados todos os seus produtos cadastrados. Altere a <strong>Quantidade Mensal Estimada</strong> de cada item para simular as vendas. Os faturamentos e lucros se atualizam automaticamente em tempo real, fornecendo previsões precisas baseadas na sua grade de impostos ativa.
        </p>
      </div>

      {/* 3. Products List / Table for Quantities */}
      <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200/60 dark:border-zinc-700 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
          <h4 className="text-base font-bold tech-font-serif-italic font-serif italic text-zinc-900 dark:text-white flex items-center space-x-2">
            <Calculator className="w-5 h-5 text-brand-tomato" />
            <span>Simulador de Volume de Vendas</span>
          </h4>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="tech-card-header border-b border-zinc-250 dark:border-zinc-700">
                <th className="p-4 text-[13px] tech-font-serif-italic font-serif italic text-zinc-600 dark:text-zinc-300 font-medium tracking-tight">Produto</th>
                <th className="p-4 text-[13px] tech-font-serif-italic font-serif italic text-zinc-600 dark:text-zinc-300 font-medium tracking-tight text-right">Preço</th>
                <th className="p-4 text-[13px] tech-font-serif-italic font-serif italic text-zinc-600 dark:text-zinc-300 font-medium tracking-tight text-right">Lucro Unit.</th>
                <th className="p-4 text-[13px] tech-font-serif-italic font-serif italic text-zinc-600 dark:text-zinc-300 font-medium tracking-tight text-center w-36">Qtd. Estimada / Mês</th>
                <th className="p-4 text-[13px] tech-font-serif-italic font-serif italic text-zinc-600 dark:text-zinc-300 font-medium tracking-tight text-right">Faturamento Est.</th>
                <th className="p-4 text-[13px] tech-font-serif-italic font-serif italic text-zinc-600 dark:text-zinc-300 font-medium tracking-tight text-right">Lucro Est.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
              {simulationMetrics.rows.map((row) => (
                <tr 
                  key={row.id} 
                  className="hover:bg-zinc-50/50 dark:hover:bg-zinc-850/50 transition-colors"
                >
                  <td className="p-4">
                    <p className="font-bold text-zinc-900 dark:text-white text-sm">{row.name}</p>
                    {row.category && (
                      <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-semibold bg-zinc-100 dark:bg-zinc-750 text-zinc-600 dark:text-zinc-400 rounded-md border border-zinc-200/40 dark:border-zinc-700/50">
                        {row.category}
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-right font-medium tech-font-mono font-mono text-zinc-900 dark:text-white text-sm">
                    {formatCurrency(row.sellingPrice)}
                  </td>
                  <td className="p-4 text-right font-bold tech-font-mono font-mono text-emerald-600 dark:text-emerald-400 text-sm">
                    {formatCurrency(row.unitNetProfit)}
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center space-x-1.5 max-w-[120px] mx-auto">
                      <button
                        onClick={() => handleUpdateQty(row.id, row.qty - 10)}
                        className="w-8 h-8 rounded bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-200 text-xs font-bold transition-colors cursor-pointer"
                        title="Reduzir 10 unidades"
                      >
                        -10
                      </button>
                      <input
                        type="number"
                        min="0"
                        value={row.qty || ''}
                        onChange={(e) => handleUpdateQty(row.id, Number(e.target.value))}
                        className="w-16 px-1 py-1.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md text-xs font-bold text-center text-zinc-950 dark:text-white focus:ring-1 focus:ring-brand-tomato tech-font-mono font-mono"
                      />
                      <button
                        onClick={() => handleUpdateQty(row.id, row.qty + 10)}
                        className="w-8 h-8 rounded bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-200 text-xs font-bold transition-colors cursor-pointer"
                        title="Adicionar 10 unidades"
                      >
                        +10
                      </button>
                    </div>
                  </td>
                  <td className="p-4 text-right font-medium tech-font-mono font-mono text-zinc-700 dark:text-zinc-300 text-sm">
                    {formatCurrency(row.revenue)}
                  </td>
                  <td className="p-4 text-right font-bold tech-font-mono font-mono text-emerald-600 dark:text-emerald-400 text-sm">
                    {formatCurrency(row.netProfit)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
