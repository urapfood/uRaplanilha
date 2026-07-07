import React, { useState, useMemo } from 'react';
import { 
  ShoppingBag, 
  Plus, 
  Minus, 
  Trash2, 
  DollarSign, 
  Percent, 
  CheckCircle, 
  FileText, 
  User, 
  CreditCard, 
  QrCode, 
  Wallet,
  Coins,
  Receipt,
  TrendingUp,
  TrendingDown,
  Calendar,
  Sparkles,
  Info
} from 'lucide-react';
import { Product, Tax, Sale, SaleItem } from '../types';
import { getProductCost, calculateProductMetrics, formatCurrency } from '../utils';
import { saveSale, deleteSale, auth } from '../firebase';

interface PDVSectionProps {
  products: Product[];
  taxes: Tax[];
  sales: Sale[];
}

export default function PDVSection({ products, taxes, sales }: PDVSectionProps) {
  // Current Cart State
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedQuantity, setSelectedQuantity] = useState<number>(1);
  const [discount, setDiscount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'money' | 'card' | 'pix' | 'other'>('pix');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Active tax percentage
  const activeTaxPercentage = useMemo(() => {
    return taxes.filter(t => t.active).reduce((sum, t) => sum + t.percentage, 0);
  }, [taxes]);

  // Handle adding product to cart
  const handleAddToCart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) return;

    const product = products.find(p => p.id === selectedProductId);
    if (!product) return;

    const existingIndex = cart.findIndex(item => item.product.id === product.id);
    if (existingIndex !== -1) {
      const updatedCart = [...cart];
      updatedCart[existingIndex].quantity += selectedQuantity;
      setCart(updatedCart);
    } else {
      setCart([...cart, { product, quantity: selectedQuantity }]);
    }

    // Reset selectors
    setSelectedProductId('');
    setSelectedQuantity(1);
    triggerFeedback('Produto adicionado ao carrinho!', 'success');
  };

  const updateQuantity = (productId: string, delta: number) => {
    const updated = cart.map(item => {
      if (item.product.id === productId) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : null;
      }
      return item;
    }).filter(Boolean) as { product: Product; quantity: number }[];
    
    setCart(updated);
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };

  const triggerFeedback = (text: string, type: 'success' | 'error') => {
    setFeedbackMessage({ text, type });
    setTimeout(() => {
      setFeedbackMessage(null);
    }, 4000);
  };

  // Calculations for current cart
  const cartSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.product.sellingPrice * item.quantity), 0);
  }, [cart]);

  const discountValue = useMemo(() => {
    const parsed = parseFloat(discount);
    return isNaN(parsed) || parsed < 0 ? 0 : parsed;
  }, [discount]);

  const cartTotal = useMemo(() => {
    return Math.max(0, cartSubtotal - discountValue);
  }, [cartSubtotal, discountValue]);

  const cartTotalCost = useMemo(() => {
    return cart.reduce((sum, item) => {
      const cost = getProductCost(item.product);
      return sum + (cost * item.quantity);
    }, 0);
  }, [cart]);

  const cartTaxesAmount = useMemo(() => {
    // Taxes are calculated based on the net total price (after discount) or standard selling price
    return (cartTotal * activeTaxPercentage) / 100;
  }, [cartTotal, activeTaxPercentage]);

  const cartNetProfit = useMemo(() => {
    return cartTotal - cartTotalCost - cartTaxesAmount;
  }, [cartTotal, cartTotalCost, cartTaxesAmount]);

  const cartMargin = useMemo(() => {
    return cartTotal > 0 ? (cartNetProfit / cartTotal) * 100 : 0;
  }, [cartTotal, cartNetProfit]);

  // POS / PDV Sales metrics
  const pdvMetrics = useMemo(() => {
    const totalSalesValue = sales.reduce((sum, s) => sum + s.totalAmount, 0);
    const totalProfitValue = sales.reduce((sum, s) => sum + s.netProfit, 0);
    return {
      totalSalesValue,
      totalProfitValue,
      salesCount: sales.length
    };
  }, [sales]);

  // Submit sale to database
  const handleRegisterSale = async () => {
    if (cart.length === 0) {
      triggerFeedback('Adicione pelo menos um produto ao carrinho!', 'error');
      return;
    }

    setIsSubmitting(true);
    
    const saleItems: SaleItem[] = cart.map(item => ({
      productId: item.product.id,
      productName: item.product.name,
      quantity: item.quantity,
      unitPrice: item.product.sellingPrice,
      totalPrice: item.product.sellingPrice * item.quantity,
      unitCost: getProductCost(item.product)
    }));

    const newSale: Sale = {
      id: `sale_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      date: new Date().toISOString(),
      items: saleItems,
      discount: discountValue,
      paymentMethod,
      totalAmount: cartTotal,
      totalCost: cartTotalCost,
      taxesAmount: cartTaxesAmount,
      netProfit: cartNetProfit
    };

    const userId = auth.currentUser?.uid;
    if (!userId) {
      triggerFeedback('Erro: Usuário não autenticado.', 'error');
      setIsSubmitting(false);
      return;
    }

    try {
      await saveSale(userId, newSale);
      setCart([]);
      setDiscount('');
      setPaymentMethod('pix');
      triggerFeedback('Venda registrada com sucesso no banco de dados!', 'success');
    } catch (err) {
      console.error(err);
      triggerFeedback('Ocorreu um erro ao salvar a venda.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete previous sale
  const handleDeleteSale = async (id: string) => {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      triggerFeedback('Erro: Usuário não autenticado.', 'error');
      return;
    }

    if (window.confirm('Tem certeza que deseja estornar/excluir esta venda?')) {
      try {
        await deleteSale(userId, id);
        triggerFeedback('Venda estornada com sucesso!', 'success');
      } catch (err) {
        console.error(err);
        triggerFeedback('Falha ao estornar venda.', 'error');
      }
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'pix': return 'PIX';
      case 'money': return 'Dinheiro';
      case 'card': return 'Cartão';
      default: return 'Outro';
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'pix': return <QrCode className="w-3.5 h-3.5" />;
      case 'money': return <Coins className="w-3.5 h-3.5" />;
      case 'card': return <CreditCard className="w-3.5 h-3.5" />;
      default: return <Wallet className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200/60 dark:border-zinc-800 rounded-xl p-6 mt-8 space-y-6">
      
      {/* Header section with branding and tagline */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-200/80 dark:border-zinc-800 pb-5 gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-brand-tomato/10 text-brand-tomato rounded-xl shadow-xs">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
              <span>PDV uRaplanilha</span>
              <span className="text-[10px] font-bold uppercase bg-brand-tomato/10 text-brand-tomato px-2 py-0.5 rounded-md tracking-wider">
                Fora do iFood
              </span>
            </h3>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
              Frente de Caixa (PDV) integrado para vendas balcão, WhatsApp, telefone e salão.
            </p>
          </div>
        </div>

        {/* Local Mini Toast Notification */}
        {feedbackMessage && (
          <div className={`px-4 py-2.5 rounded-lg text-xs font-bold shadow-xs animate-fade-in flex items-center gap-2 ${
            feedbackMessage.type === 'success' 
              ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50'
              : 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50'
          }`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-ping" />
            <span>{feedbackMessage.text}</span>
          </div>
        )}
      </div>

      {/* POS Quick Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* Metric 1 */}
        <div className="bg-white dark:bg-zinc-800/80 border border-zinc-200/60 dark:border-zinc-800 p-4 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Vendas no Balcão
            </p>
            <h4 className="text-lg font-extrabold text-zinc-950 dark:text-white mt-1 font-mono">
              {pdvMetrics.salesCount} ped.
            </h4>
          </div>
          <div className="p-2 bg-zinc-50 dark:bg-zinc-700/50 text-zinc-600 dark:text-zinc-400 rounded-lg">
            <ShoppingBag className="w-4 h-4" />
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white dark:bg-zinc-800/80 border border-zinc-200/60 dark:border-zinc-800 p-4 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Faturamento PDV
            </p>
            <h4 className="text-lg font-extrabold text-brand-tomato mt-1 font-mono">
              {formatCurrency(pdvMetrics.totalSalesValue)}
            </h4>
          </div>
          <div className="p-2 bg-brand-tomato/5 text-brand-tomato rounded-lg">
            <DollarSign className="w-4 h-4" />
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white dark:bg-zinc-800/80 border border-zinc-200/60 dark:border-zinc-800 p-4 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Lucro Real PDV
            </p>
            <h4 className={`text-lg font-extrabold mt-1 font-mono ${
              pdvMetrics.totalProfitValue >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}>
              {formatCurrency(pdvMetrics.totalProfitValue)}
            </h4>
          </div>
          <div className={`p-2 rounded-lg ${
            pdvMetrics.totalProfitValue >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500' : 'bg-rose-50 dark:bg-rose-950/40 text-rose-500'
          }`}>
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>

      </div>

      {/* POS Interactive Grid Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Input form & Cart register (7 cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-800 rounded-xl p-5 shadow-xs flex flex-col justify-between space-y-5">
          
          <div className="space-y-4">
            <h4 className="text-sm font-extrabold text-zinc-800 dark:text-zinc-200 tracking-tight flex items-center gap-1.5 border-b border-zinc-100 dark:border-zinc-700 pb-2">
              <Plus className="w-4 h-4 text-brand-tomato" />
              <span>Adicionar Itens ao Pedido</span>
            </h4>

            {/* Dropdown Form */}
            <form onSubmit={handleAddToCart} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              
              {/* Product selector */}
              <div className="sm:col-span-7 space-y-1">
                <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                  Selecionar Produto
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg py-2 px-2.5 text-xs focus:ring-brand-tomato focus:border-brand-tomato text-zinc-700 dark:text-zinc-300 font-medium"
                >
                  <option value="">-- Escolha um Produto --</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({formatCurrency(p.sellingPrice)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity input */}
              <div className="sm:col-span-3 space-y-1">
                <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                  Quantidade
                </label>
                <input
                  type="number"
                  min="1"
                  value={selectedQuantity}
                  onChange={(e) => setSelectedQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg py-2 px-2.5 text-xs text-center focus:ring-brand-tomato focus:border-brand-tomato font-bold text-zinc-700 dark:text-zinc-300"
                />
              </div>

              {/* Add Button */}
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={!selectedProductId}
                  className="w-full py-2 bg-brand-tomato hover:bg-brand-tomato/95 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-sm flex items-center justify-center gap-1 cursor-pointer transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>

            </form>
          </div>

          {/* Cart items list */}
          <div className="flex-1 min-h-[180px] max-h-[300px] overflow-y-auto border border-zinc-150 dark:border-zinc-700/60 rounded-xl p-3.5 bg-zinc-50/50 dark:bg-zinc-950/20 space-y-2.5">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center py-10 text-center text-zinc-400 dark:text-zinc-500">
                <ShoppingBag className="w-8 h-8 opacity-40 stroke-1.5" />
                <p className="text-xs font-semibold mt-2">O carrinho está vazio</p>
                <p className="text-[10px] mt-0.5">Selecione produtos acima para montar a comanda.</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-200/80 dark:divide-zinc-800/80">
                {cart.map((item) => (
                  <div key={item.product.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                    
                    {/* Item title / metadata */}
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-zinc-800 dark:text-zinc-200 truncate">
                        {item.product.name}
                      </p>
                      <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
                        Preço Unitário: {formatCurrency(item.product.sellingPrice)}
                      </p>
                    </div>

                    {/* Quantity controls */}
                    <div className="flex items-center space-x-1.5 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 rounded-lg px-1.5 py-0.5 shrink-0">
                      <button 
                        type="button"
                        onClick={() => updateQuantity(item.product.id, -1)}
                        className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 p-0.5"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-extrabold px-1 font-mono text-zinc-800 dark:text-zinc-200 text-xs min-w-4 text-center">
                        {item.quantity}
                      </span>
                      <button 
                        type="button"
                        onClick={() => updateQuantity(item.product.id, 1)}
                        className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 p-0.5"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Subtotal & Action */}
                    <div className="flex items-center space-x-3 shrink-0">
                      <span className="font-bold text-zinc-900 dark:text-zinc-150 font-mono text-xs">
                        {formatCurrency(item.product.sellingPrice * item.quantity)}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.product.id)}
                        className="p-1 text-zinc-400 hover:text-rose-500 rounded transition-colors"
                        title="Remover Item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Form options below cart */}
          <div className="grid grid-cols-2 gap-4 border-t border-zinc-100 dark:border-zinc-700 pt-3">
            
            {/* Discount Field */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                <Percent className="w-3 h-3 text-brand-tomato" />
                <span>Desconto (R$)</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0,00"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg py-1.5 px-2.5 text-xs font-semibold focus:ring-brand-tomato focus:border-brand-tomato text-zinc-700 dark:text-zinc-300"
              />
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                <CreditCard className="w-3 h-3 text-brand-orange" />
                <span>Forma de Pagamento</span>
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg py-1.5 px-2.5 text-xs focus:ring-brand-tomato focus:border-brand-tomato text-zinc-700 dark:text-zinc-300 font-semibold"
              >
                <option value="pix">PIX</option>
                <option value="money">Dinheiro</option>
                <option value="card">Cartão de Crédito/Débito</option>
                <option value="other">Outros</option>
              </select>
            </div>

          </div>

        </div>

        {/* RIGHT COLUMN: Ticket Summary / Receipt (5 cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-800 rounded-xl p-5 shadow-xs flex flex-col justify-between space-y-4">
          
          {/* Header */}
          <div>
            <h4 className="text-sm font-extrabold text-zinc-800 dark:text-zinc-200 tracking-tight flex items-center gap-1.5 border-b border-zinc-100 dark:border-zinc-700 pb-2">
              <Receipt className="w-4 h-4 text-brand-orange" />
              <span>Resumo do Cupom de Venda</span>
            </h4>
          </div>

          {/* Receipt mockup */}
          <div className="bg-zinc-50 dark:bg-zinc-950/50 rounded-xl p-4 border border-dashed border-zinc-200 dark:border-zinc-800 font-mono text-[11px] text-zinc-600 dark:text-zinc-400 space-y-3.5">
            <div className="text-center border-b border-zinc-200 dark:border-zinc-800 pb-2.5">
              <p className="font-extrabold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">uRaplanilha PDV</p>
              <p className="text-[9px] text-zinc-400 mt-0.5">Operação de Caixa Direto</p>
              <p className="text-[9px] text-zinc-400">{new Date().toLocaleDateString('pt-BR')} {new Date().toLocaleTimeString('pt-BR')}</p>
            </div>

            {/* Simulated item breakdown */}
            <div className="space-y-1 max-h-[100px] overflow-y-auto pr-1">
              {cart.map(item => (
                <div key={item.product.id} className="flex justify-between">
                  <span className="truncate max-w-[120px]">{item.product.name}</span>
                  <span>{item.quantity}x {formatCurrency(item.product.sellingPrice)}</span>
                </div>
              ))}
              {cart.length === 0 && (
                <p className="text-center italic text-zinc-400 py-3">-- Nenhum item selecionado --</p>
              )}
            </div>

            {/* Calculations math */}
            <div className="border-t border-zinc-200 dark:border-zinc-800 pt-2.5 space-y-1 text-zinc-500 dark:text-zinc-400">
              <div className="flex justify-between">
                <span>Subtotal Itens:</span>
                <span className="text-zinc-700 dark:text-zinc-300 font-bold">{formatCurrency(cartSubtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>(-) Desconto Balcão:</span>
                <span className="text-zinc-700 dark:text-zinc-300 font-bold">-{formatCurrency(discountValue)}</span>
              </div>
              <div className="flex justify-between">
                <span>(+) Imposto Estimado ({activeTaxPercentage.toFixed(1)}%):</span>
                <span className="text-zinc-700 dark:text-zinc-300 font-bold">+{formatCurrency(cartTaxesAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span>Custo de Insumos (Ficha Técnica):</span>
                <span className="text-zinc-700 dark:text-zinc-300 font-bold">-{formatCurrency(cartTotalCost)}</span>
              </div>
            </div>

            {/* Grand Total display */}
            <div className="border-t border-zinc-200 dark:border-zinc-800 pt-3 flex items-center justify-between text-zinc-950 dark:text-white font-extrabold">
              <span className="text-xs uppercase">Total do Pedido:</span>
              <span className="text-lg font-bold text-brand-tomato font-mono">{formatCurrency(cartTotal)}</span>
            </div>
          </div>

          {/* Simulated Margins indicator (Extremely valuable feature!) */}
          <div className={`p-3 rounded-xl border flex items-center justify-between ${
            cart.length === 0 
              ? 'bg-zinc-50 dark:bg-zinc-800/20 border-zinc-200 dark:border-zinc-800'
              : cartNetProfit >= 0 
                ? 'bg-emerald-50/60 dark:bg-emerald-950/10 border-emerald-150 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-300'
                : 'bg-rose-50/60 dark:bg-rose-950/10 border-rose-150 dark:border-rose-900/40 text-rose-800 dark:text-rose-300'
          }`}>
            <div className="flex items-center space-x-2.5">
              <div className={`p-1.5 rounded-lg shrink-0 ${
                cart.length === 0 
                  ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'
                  : cartNetProfit >= 0 
                    ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400' 
                    : 'bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400'
              }`}>
                {cart.length === 0 ? <Info className="w-3.5 h-3.5" /> : cartNetProfit >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              </div>
              <div className="text-xs min-w-0">
                <p className="font-bold uppercase tracking-wider text-[9px] text-zinc-400 dark:text-zinc-500">
                  Previsão Lucro Líquido
                </p>
                <p className="font-extrabold font-mono mt-0.5 truncate text-xs">
                  {cart.length === 0 ? 'R$ 0,00' : `${formatCurrency(cartNetProfit)} (${cartMargin.toFixed(1)}%)`}
                </p>
              </div>
            </div>
            
            {/* Small info tag */}
            <span className="text-[9px] font-medium bg-white/60 dark:bg-zinc-900/60 px-2 py-0.5 rounded-full border border-zinc-200/50 dark:border-zinc-800/40 select-none">
              Margem Líquida
            </span>
          </div>

          {/* Confirm Button */}
          <button
            onClick={handleRegisterSale}
            disabled={isSubmitting || cart.length === 0}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold uppercase tracking-widest rounded-xl shadow-md cursor-pointer transition-all flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            <span>{isSubmitting ? 'Registrando Venda...' : 'Registrar Venda (Caixa)'}</span>
          </button>

        </div>

      </div>

      {/* RECENT SALES TABLE SECTION */}
      <div className="bg-white dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-800 rounded-xl p-5 shadow-xs">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-100 dark:border-zinc-700 pb-3 gap-2 mb-4">
          <h4 className="text-sm font-extrabold text-zinc-800 dark:text-zinc-200 tracking-tight flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-brand-tomato" />
            <span>Vendas Recentes do PDV (Off-iFood)</span>
          </h4>
          <span className="text-[10px] font-bold uppercase bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 px-2 py-0.5 rounded-md font-mono">
            {sales.length} vendas registradas
          </span>
        </div>

        {sales.length === 0 ? (
          <div className="text-center py-12 text-zinc-400 dark:text-zinc-500">
            <FileText className="w-10 h-10 mx-auto opacity-45 stroke-1" />
            <p className="text-xs font-bold mt-2">Nenhuma venda externa registrada ainda</p>
            <p className="text-[10px] mt-0.5">Use o painel acima para registrar vendas realizadas fora do iFood.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              
              <thead>
                <tr className="border-b border-zinc-100 dark:border-zinc-700/80 text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                  <th className="py-2.5 px-3">Data/Hora</th>
                  <th className="py-2.5 px-3">Itens Comprados</th>
                  <th className="py-2.5 px-3">Forma Pagto</th>
                  <th className="py-2.5 px-3 text-right">Total (R$)</th>
                  <th className="py-2.5 px-3 text-right">Margem Líquida</th>
                  <th className="py-2.5 px-3 text-center">Ações</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                {sales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-700/20 transition-colors">
                    
                    {/* Date */}
                    <td className="py-3 px-3 whitespace-nowrap text-zinc-500 dark:text-zinc-400 font-mono text-[10px]">
                      {new Date(sale.date).toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>

                    {/* Items detail list */}
                    <td className="py-3 px-3 max-w-xs md:max-w-sm">
                      <p className="text-zinc-800 dark:text-zinc-200 font-semibold truncate" title={sale.items.map(i => `${i.quantity}x ${i.productName}`).join(', ')}>
                        {sale.items.map(i => `${i.quantity}x ${i.productName}`).join(', ')}
                      </p>
                      {sale.discount > 0 && (
                        <p className="text-[10px] text-brand-orange font-bold">
                          Desconto: -{formatCurrency(sale.discount)}
                        </p>
                      )}
                    </td>

                    {/* Payment Method */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-[10px] font-bold">
                        {getPaymentMethodIcon(sale.paymentMethod)}
                        <span>{getPaymentMethodLabel(sale.paymentMethod)}</span>
                      </span>
                    </td>

                    {/* Total Amount */}
                    <td className="py-3 px-3 text-right whitespace-nowrap font-bold text-zinc-900 dark:text-white font-mono">
                      {formatCurrency(sale.totalAmount)}
                    </td>

                    {/* Profit Margin */}
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 font-bold font-mono text-[11px] ${
                        sale.netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}>
                        {sale.netProfit >= 0 ? '+' : ''}{formatCurrency(sale.netProfit)}
                        <span className="text-[9px] text-zinc-400 font-normal">
                          ({sale.totalAmount > 0 ? ((sale.netProfit / sale.totalAmount) * 100).toFixed(0) : '0'}%)
                        </span>
                      </span>
                    </td>

                    {/* Refund Actions */}
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <button
                        onClick={() => handleDeleteSale(sale.id)}
                        className="p-1.5 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                        title="Estornar Venda"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>

                  </tr>
                ))}
              </tbody>

            </table>
          </div>
        )}

      </div>

    </div>
  );
}
