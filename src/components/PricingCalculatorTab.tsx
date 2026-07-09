import React, { useState, useMemo } from 'react';
import { 
  Calculator, 
  HelpCircle, 
  TrendingUp, 
  DollarSign, 
  Percent, 
  Layers, 
  ArrowRight, 
  Info,
  ShieldCheck,
  Building,
  Sparkles
} from 'lucide-react';
import { Product, Tax, SupplierItem } from '../types';
import { getProductCost, calculateProductMetrics, formatCurrency, getActiveTaxPercentage } from '../utils';

interface PricingCalculatorTabProps {
  products: Product[];
  taxes: Tax[];
  suppliers?: SupplierItem[];
}

export default function PricingCalculatorTab({
  products,
  taxes,
  suppliers = []
}: PricingCalculatorTabProps) {
  // Modes: 'margin' (calculate selling price based on target margin) or 'price' (calculate margin based on proposed price)
  const [calcMode, setCalcMode] = useState<'margin' | 'price'>('margin');
  
  // Simulation input states
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [ingredientCost, setIngredientCost] = useState<number | ''>('');
  const [packagingCost, setPackagingCost] = useState<number | ''>('');
  const [activeTax, setActiveTax] = useState<number>(() => getActiveTaxPercentage(taxes));
  const [targetMargin, setTargetMargin] = useState<number>(30); // in %
  const [proposedPrice, setProposedPrice] = useState<number | ''>('');
  
  // Custom platform configurations for delivery markup calculations
  const [deliveryAppFee, setDeliveryAppFee] = useState<number>(18); // e.g. iFood classic is 18% or 23%
  const [deliveryFixedFee, setDeliveryFixedFee] = useState<number>(0); // e.g. R$ 0.00 or R$ 1.00 per order

  // Handle loading data from an existing product
  const handleLoadProduct = (productId: string) => {
    setSelectedProductId(productId);
    if (!productId) {
      setIngredientCost('');
      setPackagingCost('');
      setProposedPrice('');
      return;
    }
    const product = products.find(p => p.id === productId);
    if (product) {
      // Calculate dynamic costs
      const cost = getProductCost(product, suppliers);
      const pkgCost = product.packagingSupplierItemId && suppliers.length > 0
        ? (suppliers.find(s => s.id === product.packagingSupplierItemId)?.price || 0) * (product.packagingQuantityUsed || 1)
        : (product.packagingCost || 0);

      setIngredientCost(Number(cost.toFixed(2)));
      setPackagingCost(Number(pkgCost.toFixed(2)));
      setProposedPrice(product.sellingPrice);
      
      const metrics = calculateProductMetrics(product, activeTax, suppliers);
      setTargetMargin(Math.max(0, Math.round(metrics.margin)));
    }
  };

  // Convert inputs
  const ingCostNum = Number(ingredientCost) || 0;
  const pkgCostNum = Number(packagingCost) || 0;
  const totalDirectCost = ingCostNum + pkgCostNum;

  // Calculate outputs
  const results = useMemo(() => {
    // Mode A: Calculate selling price to hit target margin
    // Formula: Price = Total Cost / (1 - (Taxes% + TargetMargin%)/100)
    // Constraint: (Taxes% + TargetMargin%) must be less than 100%, otherwise price is infinite.
    const combinedRate = activeTax + targetMargin;
    const denominator = 1 - (combinedRate / 100);
    
    let computedSellingPrice = 0;
    if (denominator > 0.01) {
      computedSellingPrice = totalDirectCost / denominator;
    } else {
      computedSellingPrice = totalDirectCost / 0.01; // Avoid divide by zero
    }

    // Mode B: Calculate metrics based on proposed selling price
    const activeSellingPrice = calcMode === 'margin' ? computedSellingPrice : (Number(proposedPrice) || 0);
    const taxValue = (activeSellingPrice * activeTax) / 100;
    const grossProfit = activeSellingPrice - totalDirectCost;
    const netProfit = activeSellingPrice - totalDirectCost - taxValue;
    const margin = activeSellingPrice > 0 ? (netProfit / activeSellingPrice) * 100 : 0;
    const markup = totalDirectCost > 0 ? ((activeSellingPrice - totalDirectCost) / totalDirectCost) * 100 : 0;

    // Delivery markup simulation
    // PriceDelivery = (TotalDirectCost + DeliveryFixedFee + NetProfitToPreserve) / (1 - (Taxes% + DeliveryAppFee%)/100)
    // Net profit we want to preserve is the actual net profit of the regular sale
    const preservedNetProfit = Math.max(0, netProfit);
    const deliveryRate = activeTax + deliveryAppFee;
    const deliveryDenominator = 1 - (deliveryRate / 100);
    
    let suggestedDeliveryPrice = 0;
    if (deliveryDenominator > 0.01) {
      suggestedDeliveryPrice = (totalDirectCost + deliveryFixedFee + preservedNetProfit) / deliveryDenominator;
    } else {
      suggestedDeliveryPrice = (totalDirectCost + deliveryFixedFee + preservedNetProfit) / 0.01;
    }

    return {
      sellingPrice: activeSellingPrice,
      taxValue,
      grossProfit,
      netProfit,
      margin,
      markup,
      suggestedDeliveryPrice,
      deliveryCommissionPaid: (suggestedDeliveryPrice * deliveryAppFee) / 100 + deliveryFixedFee,
      deliveryTaxesPaid: (suggestedDeliveryPrice * activeTax) / 100,
    };
  }, [calcMode, totalDirectCost, activeTax, targetMargin, proposedPrice, deliveryAppFee, deliveryFixedFee]);

  // Percentage distribution of each real-time dollar earned
  const distribution = useMemo(() => {
    const price = results.sellingPrice || 1;
    return {
      ingPercent: (ingCostNum / price) * 100,
      pkgPercent: (pkgCostNum / price) * 100,
      taxPercent: activeTax,
      profitPercent: results.margin
    };
  }, [results.sellingPrice, ingCostNum, pkgCostNum, activeTax, results.margin]);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      
      {/* Header Banner */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 md:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="p-2 bg-brand-tomato/10 text-brand-tomato rounded-xl">
              <Calculator className="w-5 h-5" />
            </span>
            <h2 className="text-lg md:text-xl font-extrabold text-zinc-950 dark:text-white tracking-tight">
              Simulador Inteligente de Precificação
            </h2>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-2xl leading-relaxed">
            Faça simulações rápidas de preços de venda, margem de lucro líquido e markups ideais. Descubra de forma precisa quanto cobrar para cobrir seus insumos e impostos reais.
          </p>
        </div>
        
        <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl self-start md:self-center shrink-0 border border-zinc-200/50 dark:border-zinc-700/50">
          <button
            onClick={() => setCalcMode('margin')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              calcMode === 'margin'
                ? 'bg-white dark:bg-zinc-700 text-zinc-950 dark:text-white shadow-xs'
                : 'text-zinc-500 hover:text-zinc-950 dark:hover:text-white'
            }`}
          >
            Margem Alvo
          </button>
          <button
            onClick={() => setCalcMode('price')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              calcMode === 'price'
                ? 'bg-white dark:bg-zinc-700 text-zinc-950 dark:text-white shadow-xs'
                : 'text-zinc-500 hover:text-zinc-950 dark:hover:text-white'
            }`}
          >
            Preço Proposto
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left column: Inputs form */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center space-x-2 pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <Layers className="w-4 h-4 text-brand-tomato" />
              <span>Parâmetros de Custo e Produto</span>
            </h3>

            {/* Load from product dropdown */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                Carregar Custos de um Produto Existente
              </label>
              <select
                value={selectedProductId}
                onChange={(e) => handleLoadProduct(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-tomato cursor-pointer"
              >
                <option value="" className="text-zinc-900 dark:text-white bg-white dark:bg-zinc-800">
                  -- Inserir valores manualmente --
                </option>
                {products.map(p => (
                  <option 
                    key={p.id} 
                    value={p.id} 
                    className="text-zinc-900 dark:text-white bg-white dark:bg-zinc-800"
                  >
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Ingredient Cost Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Custo de Ingredientes (R$)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-xs font-bold pointer-events-none">R$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={ingredientCost}
                  onChange={(e) => {
                    setSelectedProductId('');
                    setIngredientCost(e.target.value === '' ? '' : Number(e.target.value));
                  }}
                  className="w-full pl-8 pr-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-brand-tomato dark:text-white"
                  placeholder="Ex: 8.50"
                />
              </div>
            </div>

            {/* Packaging Cost Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Custo de Embalagem (R$)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-xs font-bold pointer-events-none">R$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={packagingCost}
                  onChange={(e) => {
                    setSelectedProductId('');
                    setPackagingCost(e.target.value === '' ? '' : Number(e.target.value));
                  }}
                  className="w-full pl-8 pr-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-brand-tomato dark:text-white"
                  placeholder="Ex: 1.20"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              {/* Active Tax percentage */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Impostos (%)
                </label>
                <div className="relative">
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 text-xs font-bold pointer-events-none">%</span>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="99"
                    value={activeTax}
                    onChange={(e) => setActiveTax(Number(e.target.value))}
                    className="w-full pl-3 pr-8 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-brand-tomato dark:text-white"
                  />
                </div>
              </div>

              {/* Dynamic target margin OR proposed price depending on calcMode */}
              {calcMode === 'margin' ? (
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Margem Desejada (%)
                  </label>
                  <div className="relative">
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 text-xs font-bold pointer-events-none">%</span>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      max="95"
                      value={targetMargin}
                      onChange={(e) => setTargetMargin(Number(e.target.value))}
                      className="w-full pl-3 pr-8 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-brand-tomato dark:text-white"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Preço Proposto (R$)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-xs font-bold pointer-events-none">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={proposedPrice}
                      onChange={(e) => setProposedPrice(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full pl-8 pr-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-brand-tomato dark:text-white"
                      placeholder="Ex: 29.90"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Delivery Configuration Sub-Card */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center space-x-2 pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <Building className="w-4 h-4 text-brand-orange" />
              <span>Simulação de Markup de Delivery (iFood)</span>
            </h3>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Configure as taxas da plataforma para ver quanto você deve cobrar no aplicativo de delivery para garantir o mesmo faturamento de lucro líquido real.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Comissão App (%)
                </label>
                <div className="relative">
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 text-xs font-bold pointer-events-none">%</span>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="50"
                    value={deliveryAppFee}
                    onChange={(e) => setDeliveryAppFee(Number(e.target.value))}
                    className="w-full pl-3 pr-8 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-brand-orange dark:text-white"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Taxa Fixa (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-xs font-bold pointer-events-none">R$</span>
                  <input
                    type="number"
                    step="0.10"
                    min="0"
                    value={deliveryFixedFee}
                    onChange={(e) => setDeliveryFixedFee(Number(e.target.value))}
                    className="w-full pl-8 pr-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-brand-orange dark:text-white"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Beautiful Results Layout */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Main Pricing Output Card */}
          <div className="bg-zinc-950 dark:bg-black text-white rounded-3xl p-6 shadow-lg border border-zinc-800 relative overflow-hidden flex flex-col justify-between min-h-[300px]">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Calculator className="w-48 h-48" />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] tracking-widest uppercase font-extrabold text-zinc-400 bg-zinc-900 px-3 py-1.5 rounded-full border border-zinc-800">
                  {calcMode === 'margin' ? 'Preço Recomendado' : 'Resultado do Preço Proposto'}
                </span>
                <span className="text-zinc-400 text-xs font-semibold">
                  Custo Total Direto: {formatCurrency(totalDirectCost)}
                </span>
              </div>

              <div className="space-y-1 pt-2">
                <p className="text-xs text-zinc-400 font-medium">Preço de Venda Praticado</p>
                <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight">
                  {formatCurrency(results.sellingPrice)}
                </h2>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t border-zinc-900 mt-6">
              <div className="space-y-0.5">
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase font-bold">Margem Líquida</span>
                <p className={`text-base font-black ${results.margin >= 30 ? 'text-emerald-400' : results.margin >= 15 ? 'text-amber-400' : 'text-rose-400'}`}>
                  {results.margin.toFixed(1)}%
                </p>
              </div>

              <div className="space-y-0.5">
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase font-bold">Lucro Líquido</span>
                <p className={`text-base font-black ${results.netProfit > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {formatCurrency(results.netProfit)}
                </p>
              </div>

              <div className="space-y-0.5">
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase font-bold">Markup Real</span>
                <p className="text-base font-black text-brand-orange">
                  {results.markup.toFixed(1)}%
                </p>
              </div>

              <div className="space-y-0.5">
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase font-bold">Imposto Pago</span>
                <p className="text-base font-black text-zinc-400">
                  {formatCurrency(results.taxValue)}
                </p>
              </div>
            </div>

            {/* Graphical representation of the dollar distribution */}
            {results.sellingPrice > 0 && (
              <div className="space-y-2 pt-6">
                <p className="text-[10px] text-zinc-400 uppercase font-bold">Divisão do Faturamento (Cada R$ 1,00 gasto pelo cliente)</p>
                <div className="h-2.5 w-full rounded-full bg-zinc-900 overflow-hidden flex">
                  {distribution.ingPercent > 0 && (
                    <div 
                      className="h-full bg-brand-tomato" 
                      style={{ width: `${distribution.ingPercent}%` }}
                      title={`Ingredientes: ${distribution.ingPercent.toFixed(1)}%`}
                    />
                  )}
                  {distribution.pkgPercent > 0 && (
                    <div 
                      className="h-full bg-brand-orange" 
                      style={{ width: `${distribution.pkgPercent}%` }}
                      title={`Embalagem: ${distribution.pkgPercent.toFixed(1)}%`}
                    />
                  )}
                  {distribution.taxPercent > 0 && (
                    <div 
                      className="h-full bg-zinc-600" 
                      style={{ width: `${distribution.taxPercent}%` }}
                      title={`Impostos: ${distribution.taxPercent.toFixed(1)}%`}
                    />
                  )}
                  {distribution.profitPercent > 0 && (
                    <div 
                      className="h-full bg-emerald-500" 
                      style={{ width: `${distribution.profitPercent}%` }}
                      title={`Lucro Líquido: ${distribution.profitPercent.toFixed(1)}%`}
                    />
                  )}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-zinc-400 font-medium">
                  <div className="flex items-center space-x-1">
                    <span className="w-2 h-2 rounded-full bg-brand-tomato" />
                    <span>Insumos ({distribution.ingPercent.toFixed(0)}%)</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="w-2 h-2 rounded-full bg-brand-orange" />
                    <span>Embalagem ({distribution.pkgPercent.toFixed(0)}%)</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="w-2 h-2 rounded-full bg-zinc-600" />
                    <span>Impostos ({distribution.taxPercent.toFixed(0)}%)</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Lucro Líq. ({Math.max(0, distribution.profitPercent).toFixed(0)}%)</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Delivery Recommended Markup result Card */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="p-1.5 bg-brand-orange/10 text-brand-orange rounded-lg">
                  <Sparkles className="w-4 h-4" />
                </span>
                <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Preço Sugerido para Delivery (Ex: iFood)
                </h4>
              </div>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full font-bold">
                Mesmo Lucro Preservado
              </span>
            </div>

            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Devido à comissão de <b>{deliveryAppFee}%</b> da plataforma de delivery, para que você ganhe exatamente o mesmo valor líquido de <b>{formatCurrency(results.netProfit)}</b>, você precisa cobrar:
            </p>

            <div className="flex flex-col md:flex-row md:items-center justify-between bg-zinc-50 dark:bg-zinc-800 p-4 rounded-2xl border border-zinc-150 dark:border-zinc-800 gap-4">
              <div className="space-y-0.5">
                <span className="text-[10px] text-zinc-400 uppercase font-bold">Preço de Cardápio iFood</span>
                <h3 className="text-2xl font-black text-brand-orange">
                  {formatCurrency(results.suggestedDeliveryPrice)}
                </h3>
              </div>

              <div className="flex flex-col justify-center text-xs text-zinc-500 dark:text-zinc-400 font-medium space-y-1">
                <div className="flex justify-between md:justify-end space-x-4">
                  <span>Taxa Aplicada do App:</span>
                  <span className="font-bold text-zinc-700 dark:text-zinc-300">-{formatCurrency(results.deliveryCommissionPaid)}</span>
                </div>
                <div className="flex justify-between md:justify-end space-x-4">
                  <span>Imposto do Delivery:</span>
                  <span className="font-bold text-zinc-700 dark:text-zinc-300">-{formatCurrency(results.deliveryTaxesPaid)}</span>
                </div>
                <div className="flex justify-between md:justify-end space-x-4 border-t border-zinc-200 dark:border-zinc-750 pt-1">
                  <span>Sobra Líquida Real:</span>
                  <span className="font-bold text-emerald-500">{formatCurrency(results.netProfit)}</span>
                </div>
              </div>
            </div>

            {/* Explanatory helper box */}
            <div className="flex items-start space-x-2 bg-blue-500/5 p-3 rounded-xl border border-blue-500/10 text-[11px] text-blue-600 dark:text-blue-400 leading-relaxed">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                <b>Por que o preço sobe tanto?</b> Os aplicativos cobram comissão sobre o valor total da venda (incluindo sobre a própria comissão deles e sobre o imposto). A nossa fórmula faz o cálculo de "Backoff" para que você não pague a comissão do iFood do seu próprio bolso!
              </span>
            </div>
          </div>
          
        </div>

      </div>

    </div>
  );
}
