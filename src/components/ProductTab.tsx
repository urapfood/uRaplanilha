import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Trash2, 
  Edit, 
  Copy, 
  Percent, 
  Calculator, 
  BookOpen, 
  AlertCircle, 
  X, 
  Info,
  DollarSign,
  Layers,
  ArrowRight
} from 'lucide-react';
import { Product, Tax, Ingredient } from '../types';
import { 
  calculateProductMetrics, 
  formatCurrency, 
  formatPercent, 
  getActiveTaxPercentage 
} from '../utils';

interface ProductTabProps {
  products: Product[];
  setProducts: (products: Product[]) => void;
  taxes: Tax[];
}

export default function ProductTab({ products, setProducts, taxes }: ProductTabProps) {
  const activeTaxRate = useMemo(() => getActiveTaxPercentage(taxes), [taxes]);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');

  // Form Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  
  // Form fields
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formSellingPrice, setFormSellingPrice] = useState<number | ''>('');
  const [formCostType, setFormCostType] = useState<'single' | 'detailed'>('single');
  const [formSingleCost, setFormSingleCost] = useState<number | ''>('');
  const [formIngredients, setFormIngredients] = useState<Ingredient[]>([]);
  const [formEstimatedSales, setFormEstimatedSales] = useState<number | ''>('');
  const [formNotes, setFormNotes] = useState('');

  // New Ingredient fields (inside modal)
  const [newIngName, setNewIngName] = useState('');
  const [newIngCost, setNewIngCost] = useState<number | ''>('');

  // Local Form Error
  const [formError, setFormError] = useState('');

  // Get list of unique categories for filters
  const categories = useMemo(() => {
    const list = new Set<string>();
    products.forEach((p) => {
      if (p.category) list.add(p.category);
    });
    return ['Todas', ...Array.from(list)];
  }, [products]);

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            (p.notes && p.notes.toLowerCase().includes(searchTerm.toLowerCase())) ||
                            (p.category && p.category.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory = selectedCategory === 'Todas' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  // Open modal for creating new product
  const handleOpenAddModal = () => {
    setEditingProductId(null);
    setFormName('');
    setFormCategory('');
    setFormSellingPrice('');
    setFormCostType('single');
    setFormSingleCost('');
    setFormIngredients([]);
    setFormEstimatedSales('');
    setFormNotes('');
    setNewIngName('');
    setNewIngCost('');
    setFormError('');
    setIsModalOpen(true);
  };

  // Open modal for editing existing product
  const handleOpenEditModal = (product: Product) => {
    setEditingProductId(product.id);
    setFormName(product.name);
    setFormCategory(product.category || '');
    setFormSellingPrice(product.sellingPrice);
    setFormCostType(product.costType);
    setFormSingleCost(product.singleCost);
    setFormIngredients(product.ingredients || []);
    setFormEstimatedSales(product.estimatedSales || '');
    setFormNotes(product.notes || '');
    setNewIngName('');
    setNewIngCost('');
    setFormError('');
    setIsModalOpen(true);
  };

  // Duplicate product
  const handleDuplicateProduct = (product: Product) => {
    const duplicated: Product = {
      ...product,
      id: Date.now().toString(),
      name: `${product.name} (Cópia)`,
      ingredients: product.ingredients.map((ing) => ({ ...ing, id: Math.random().toString() })),
    };
    setProducts([...products, duplicated]);
  };

  // Delete product
  const handleDeleteProduct = (id: string) => {
    if (confirm('Tem certeza de que deseja excluir este produto?')) {
      setProducts(products.filter((p) => p.id !== id));
    }
  };

  // Ingredient list management (within modal)
  const handleAddIngredient = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!newIngName.trim()) return;
    if (newIngCost === '' || isNaN(newIngCost) || newIngCost < 0) return;

    const newIng: Ingredient = {
      id: Date.now().toString(),
      name: newIngName.trim(),
      cost: Number(newIngCost),
    };

    setFormIngredients([...formIngredients, newIng]);
    setNewIngName('');
    setNewIngCost('');
  };

  const handleRemoveIngredient = (id: string) => {
    setFormIngredients(formIngredients.filter((ing) => ing.id !== id));
  };

  const formIngredientsTotalCost = useMemo(() => {
    return formIngredients.reduce((sum, ing) => sum + ing.cost, 0);
  }, [formIngredients]);

  // Save product (Add or Edit)
  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formName.trim()) {
      setFormError('O nome do produto é obrigatório.');
      return;
    }

    if (formSellingPrice === '' || isNaN(formSellingPrice) || formSellingPrice < 0) {
      setFormError('Informe um preço de venda válido (não-negativo).');
      return;
    }

    let calculatedCost = 0;
    if (formCostType === 'single') {
      if (formSingleCost === '' || isNaN(formSingleCost) || formSingleCost < 0) {
        setFormError('Informe um custo de ingredientes válido.');
        return;
      }
      calculatedCost = Number(formSingleCost);
    } else {
      calculatedCost = formIngredientsTotalCost;
      if (formIngredients.length === 0) {
        setFormError('Adicione pelo menos 1 ingrediente ou mude para Custo Único.');
        return;
      }
    }

    const savedProduct: Product = {
      id: editingProductId || Date.now().toString(),
      name: formName.trim(),
      category: formCategory.trim() || undefined,
      sellingPrice: Number(formSellingPrice),
      costType: formCostType,
      singleCost: formCostType === 'single' ? Number(formSingleCost) : 0,
      ingredients: formCostType === 'detailed' ? formIngredients : [],
      estimatedSales: formEstimatedSales === '' ? 0 : Number(formEstimatedSales),
      notes: formNotes.trim() || undefined,
    };

    if (editingProductId) {
      // Edit
      setProducts(products.map((p) => (p.id === editingProductId ? savedProduct : p)));
    } else {
      // Add
      setProducts([...products, savedProduct]);
    }

    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* 1. Header & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold tech-font-serif-italic font-serif italic text-zinc-900 dark:text-white">Gerenciamento de Produtos</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Cadastre os itens do seu cardápio, detalhe receitas e visualize lucros em tempo real.
          </p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="px-4 py-2.5 bg-brand-tomato hover:bg-brand-tomato/95 text-white font-bold text-sm rounded-xl shadow-sm transition-all flex items-center justify-center space-x-2"
          id="btn-add-product"
        >
          <Plus className="w-4.5 h-4.5" />
          <span>Adicionar Produto</span>
        </button>
      </div>

      {/* 2. Filters & Search Box */}
      <div className="bg-white dark:bg-zinc-800 p-4 rounded-lg border border-zinc-200/60 dark:border-zinc-700 shadow-sm flex flex-col md:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-zinc-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por nome, categoria ou observação..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-tomato dark:text-white transition-all"
            id="search-products-input"
          />
        </div>
        
        {/* Category Pill Filters */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <div className="text-zinc-400 dark:text-zinc-500 text-xs font-semibold mr-1 shrink-0 flex items-center space-x-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Categoria:</span>
          </div>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-full border transition-all shrink-0 cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-brand-tomato border-brand-tomato text-white shadow-sm'
                  : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
              id={`filter-category-${cat.toLowerCase().replace(/\s+/g, '-')}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Products Table */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white dark:bg-zinc-800 p-12 rounded-2xl border border-zinc-100 dark:border-zinc-700 shadow-sm text-center">
          <AlertCircle className="w-10 h-10 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
          <p className="text-base font-bold text-zinc-800 dark:text-zinc-200">Nenhum produto encontrado</p>
          <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
            Não encontramos itens correspondentes à busca. Crie um novo produto ou limpe os filtros.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-100 dark:border-zinc-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[850px]">
              <thead>
                <tr className="tech-card-header border-b border-zinc-250 dark:border-zinc-700">
                  <th className="p-4 text-[13px] tech-font-serif-italic font-serif italic text-zinc-600 dark:text-zinc-300 font-medium tracking-tight">Identificação</th>
                  <th className="p-4 text-[13px] tech-font-serif-italic font-serif italic text-zinc-600 dark:text-zinc-300 font-medium tracking-tight text-right">Preço de Venda</th>
                  <th className="p-4 text-[13px] tech-font-serif-italic font-serif italic text-zinc-600 dark:text-zinc-300 font-medium tracking-tight text-right">Custo Insumos</th>
                  <th className="p-4 text-[13px] tech-font-serif-italic font-serif italic text-zinc-600 dark:text-zinc-300 font-medium tracking-tight text-right">Taxas ({formatPercent(activeTaxRate)})</th>
                  <th className="p-4 text-[13px] tech-font-serif-italic font-serif italic text-zinc-600 dark:text-zinc-300 font-medium tracking-tight text-right">Lucro Bruto</th>
                  <th className="p-4 text-[13px] tech-font-serif-italic font-serif italic text-zinc-600 dark:text-zinc-300 font-medium tracking-tight text-right">Lucro Líquido</th>
                  <th className="p-4 text-[13px] tech-font-serif-italic font-serif italic text-zinc-600 dark:text-zinc-300 font-medium tracking-tight text-right">Margem Líq.</th>
                  <th className="p-4 text-[13px] tech-font-serif-italic font-serif italic text-zinc-600 dark:text-zinc-300 font-medium tracking-tight text-center w-28">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-150 dark:divide-zinc-750">
                {filteredProducts.map((p) => {
                  const m = calculateProductMetrics(p, activeTaxRate);
                  
                  return (
                    <tr 
                      key={p.id}
                      className="hover:bg-zinc-50/50 dark:hover:bg-zinc-850/50 transition-colors group"
                    >
                      {/* Name & details */}
                      <td className="p-4">
                        <div>
                          <p className="font-bold text-zinc-900 dark:text-white text-sm leading-tight">{p.name}</p>
                          <div className="flex items-center space-x-2 mt-1 flex-wrap gap-y-1">
                            {p.category && (
                              <span className="px-2 py-0.5 text-[10px] font-semibold bg-zinc-100 dark:bg-zinc-750 text-zinc-500 dark:text-zinc-400 rounded-md border border-zinc-200/50 dark:border-zinc-700/50">
                                {p.category}
                              </span>
                            )}
                            <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-zinc-50 dark:bg-zinc-900 text-zinc-400 dark:text-zinc-500 rounded border border-zinc-150 dark:border-zinc-800">
                              {p.costType === 'detailed' ? `${p.ingredients.length} ing.` : 'Custo fixado'}
                            </span>
                          </div>
                          {p.notes && (
                            <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1 max-w-xs italic line-clamp-1 group-hover:line-clamp-none transition-all">
                              Obs: {p.notes}
                            </p>
                          )}
                        </div>
                      </td>
                      
                      {/* Price */}
                      <td className="p-4 text-right font-medium tech-font-mono font-mono text-zinc-900 dark:text-white text-sm">
                        {formatCurrency(p.sellingPrice)}
                      </td>

                      {/* Cost */}
                      <td className="p-4 text-right text-zinc-600 dark:text-zinc-300 text-sm">
                        <span className="font-medium tech-font-mono font-mono">{formatCurrency(m.cost)}</span>
                        {p.costType === 'detailed' && (
                          <span className="block text-[10px] text-zinc-400">Soma da receita</span>
                        )}
                      </td>

                      {/* Tax value */}
                      <td className="p-4 text-right text-zinc-500 dark:text-zinc-400 text-sm">
                        <span className="font-medium tech-font-mono font-mono">{formatCurrency(m.taxValue)}</span>
                      </td>

                      {/* Gross Profit */}
                      <td className="p-4 text-right text-zinc-600 dark:text-zinc-300 text-sm">
                        <span className="font-medium tech-font-mono font-mono">{formatCurrency(m.grossProfit)}</span>
                      </td>

                      {/* Net Profit */}
                      <td className="p-4 text-right text-sm">
                        <span className={`font-bold tech-font-mono font-mono ${m.netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                          {formatCurrency(m.netProfit)}
                        </span>
                      </td>

                      {/* Margin */}
                      <td className="p-4 text-right text-sm">
                        <span className={`font-bold tech-font-mono font-mono px-2 py-0.5 rounded text-xs ${
                          m.margin >= 30 
                            ? 'bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400' 
                            : m.margin >= 15 
                              ? 'bg-amber-50/50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400' 
                              : 'bg-rose-50/50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400'
                        }`}>
                          {m.margin.toFixed(1)}%
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="p-4">
                        <div className="flex items-center justify-center space-x-1.5">
                          <button
                            onClick={() => handleOpenEditModal(p)}
                            className="p-1.5 text-zinc-400 hover:text-brand-tomato hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                            title="Editar produto"
                            id={`btn-edit-product-${p.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDuplicateProduct(p)}
                            className="p-1.5 text-zinc-400 hover:text-brand-orange hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                            title="Duplicar (criar variação)"
                            id={`btn-duplicate-product-${p.id}`}
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(p.id)}
                            className="p-1.5 text-zinc-400 hover:text-brand-tomato hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                            title="Excluir produto"
                            id={`btn-delete-product-${p.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. Product Add/Edit Dialog/Modal Backdrop */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          
          <div className="bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-zinc-100 dark:border-zinc-700 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900/20">
              <h4 className="text-base font-bold text-zinc-900 dark:text-white flex items-center space-x-2">
                <Calculator className="w-5 h-5 text-brand-tomato" />
                <span>{editingProductId ? 'Editar Produto' : 'Adicionar Novo Produto'}</span>
              </h4>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSaveProduct} className="p-6 space-y-6 flex-1">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Product Name */}
                <div className="sm:col-span-2">
                  <label htmlFor="prod-name" className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                    Nome do Produto *
                  </label>
                  <input
                    type="text"
                    id="prod-name"
                    required
                    placeholder="Ex: Wrap de Frango Cream Cheese"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-tomato/20 focus:border-brand-tomato dark:text-white"
                  />
                </div>

                {/* Category */}
                <div>
                  <label htmlFor="prod-category" className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                    Categoria (Opcional)
                  </label>
                  <input
                    type="text"
                    id="prod-category"
                    placeholder="Ex: Wraps, Bebidas, Sobremesas"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-tomato/20 focus:border-brand-tomato dark:text-white"
                  />
                </div>

                {/* Selling Price */}
                <div>
                  <label htmlFor="prod-price" className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                    Preço de Venda (R$) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-xs font-semibold pointer-events-none">R$</span>
                    <input
                      type="number"
                      id="prod-price"
                      required
                      step="0.01"
                      min="0"
                      placeholder="Ex: 28.90"
                      value={formSellingPrice}
                      onChange={(e) => setFormSellingPrice(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full pl-8 pr-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-tomato/20 focus:border-brand-tomato dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Cost Source Toggle */}
              <div>
                <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                  Método de Custo de Ingredientes
                </label>
                <div className="grid grid-cols-2 gap-2 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl border border-zinc-200/50 dark:border-zinc-850">
                  <button
                    type="button"
                    onClick={() => setFormCostType('single')}
                    className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      formCostType === 'single'
                        ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
                        : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                    }`}
                  >
                    Valor Único Estimado
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormCostType('detailed')}
                    className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      formCostType === 'detailed'
                        ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
                        : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                    }`}
                  >
                    Detalhamento de Ingredientes
                  </button>
                </div>
              </div>

              {/* Single Cost Input */}
              {formCostType === 'single' ? (
                <div className="bg-zinc-50 dark:bg-zinc-900/40 p-4 rounded-xl border border-zinc-150 dark:border-zinc-750">
                  <label htmlFor="prod-single-cost" className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                    Custo de Insumos / Ingredientes Unitário (R$)
                  </label>
                  <div className="relative max-w-xs">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-xs font-semibold pointer-events-none">R$</span>
                    <input
                      type="number"
                      id="prod-single-cost"
                      step="0.01"
                      min="0"
                      placeholder="Ex: 8.50"
                      value={formSingleCost}
                      onChange={(e) => setFormSingleCost(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full pl-8 pr-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-brand-tomato dark:text-white"
                    />
                  </div>
                  <p className="text-[10px] text-zinc-400 mt-1.5">
                    Informe o custo direto somado de todos os ingredientes e embalagens envolvidos na fabricação desse produto.
                  </p>
                </div>
              ) : (
                /* Detailed Recipe Costing */
                <div className="bg-zinc-50 dark:bg-zinc-900/40 p-4 rounded-xl border border-zinc-150 dark:border-zinc-750 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                      Receita do Produto (Ingredientes & Embalagens)
                    </span>
                    <span className="text-xs font-bold text-brand-tomato bg-brand-tomato/5 px-2.5 py-1 rounded-full border border-brand-tomato/10">
                      Custo Somado: {formatCurrency(formIngredientsTotalCost)}
                    </span>
                  </div>

                  {/* Add Ingredient form */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end pt-2 border-t border-dashed border-zinc-200 dark:border-zinc-700">
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-semibold text-zinc-500 uppercase mb-1">Nome do Item</label>
                      <input
                        type="text"
                        placeholder="Ex: Tortilla, 120g Frango, Box"
                        value={newIngName}
                        onChange={(e) => setNewIngName(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs dark:text-white"
                      />
                    </div>
                    <div className="flex space-x-1.5 items-center">
                      <div className="flex-1">
                        <label className="block text-[10px] font-semibold text-zinc-500 uppercase mb-1">Custo (R$)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={newIngCost}
                          onChange={(e) => setNewIngCost(e.target.value === '' ? '' : Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs dark:text-white"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleAddIngredient}
                        className="p-2 bg-zinc-800 dark:bg-zinc-700 text-white rounded-lg hover:bg-zinc-700 transition-colors shrink-0 mt-4.5"
                        title="Adicionar item à receita"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Ingredients List */}
                  {formIngredients.length === 0 ? (
                    <p className="text-center text-xs text-zinc-400 py-3">
                      Nenhum ingrediente cadastrado. Use o formulário acima para somar os custos.
                    </p>
                  ) : (
                    <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                      {formIngredients.map((ing) => (
                        <div key={ing.id} className="flex justify-between items-center text-xs bg-white dark:bg-zinc-800 px-3 py-1.5 rounded-lg border border-zinc-150 dark:border-zinc-700/80">
                          <span className="font-medium text-zinc-800 dark:text-zinc-200">{ing.name}</span>
                          <div className="flex items-center space-x-3">
                            <span className="font-bold text-zinc-900 dark:text-white">{formatCurrency(ing.cost)}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveIngredient(ing.id)}
                              className="text-zinc-400 hover:text-brand-tomato p-0.5 rounded transition-colors"
                              title="Remover"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Estimated Sales */}
                <div>
                  <label htmlFor="prod-sales" className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                    Qtd. Vendida / Mês (Est.)
                  </label>
                  <input
                    type="number"
                    id="prod-sales"
                    min="0"
                    placeholder="Ex: 150"
                    value={formEstimatedSales}
                    onChange={(e) => setFormEstimatedSales(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-tomato/20 focus:border-brand-tomato dark:text-white"
                  />
                </div>

                {/* Observation / Notes */}
                <div className="sm:col-span-2">
                  <label htmlFor="prod-notes" className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                    Observação / Detalhe
                  </label>
                  <input
                    type="text"
                    id="prod-notes"
                    placeholder="Ex: Coca-cola comprada em fardo, ou custo do queijo estimado"
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-tomato/20 focus:border-brand-tomato dark:text-white"
                  />
                </div>
              </div>

              {formError && (
                <div className="flex items-center space-x-2 text-xs text-brand-tomato bg-brand-tomato/5 p-3 rounded-xl border border-brand-tomato/10">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Modal Actions */}
              <div className="pt-4 border-t border-zinc-100 dark:border-zinc-700 flex justify-end space-x-2 bg-zinc-50/20">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-650 text-zinc-700 dark:text-zinc-200 font-semibold text-xs rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-brand-tomato hover:bg-brand-tomato/90 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
                  id="btn-save-product-modal-submit"
                >
                  Salvar Produto
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
