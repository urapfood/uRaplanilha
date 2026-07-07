import React, { useState, useMemo } from 'react';
import { 
  BookOpen, 
  Plus, 
  Trash2, 
  Edit2, 
  AlertCircle, 
  ChevronDown, 
  ChevronUp, 
  Clock, 
  Users, 
  Utensils, 
  FileText, 
  Check, 
  Search,
  Package,
  ListOrdered
} from 'lucide-react';
import { Recipe, Product } from '../types';

interface RecipesTabProps {
  recipes: Recipe[];
  setRecipes: (recipes: Recipe[]) => void;
  products: Product[];
}

export default function RecipesTab({ recipes, setRecipes, products }: RecipesTabProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form states
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [customProductName, setCustomProductName] = useState<string>('');
  const [portions, setPortions] = useState<number | ''>(1);
  const [ingredients, setIngredients] = useState<string>('');
  const [preparationMethod, setPreparationMethod] = useState<string>('');
  const [error, setError] = useState<string>('');
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedRecipeId, setExpandedRecipeId] = useState<string | null>(null);

  // Auto-fill productName based on selectedProductId or customProductName
  const currentProductName = useMemo(() => {
    if (selectedProductId) {
      const prod = products.find(p => p.id === selectedProductId);
      return prod ? prod.name : '';
    }
    return customProductName;
  }, [selectedProductId, customProductName, products]);

  // Handle product selection to auto-populate ingredients from the pricing structure!
  const handleProductChange = (productId: string) => {
    setSelectedProductId(productId);
    setError('');
    
    if (productId) {
      const prod = products.find(p => p.id === productId);
      if (prod) {
        setCustomProductName('');
        // If they have detailed ingredients, we can pre-format them nicely as a list!
        if (prod.costType === 'detailed' && prod.ingredients && prod.ingredients.length > 0) {
          const formatted = prod.ingredients.map(ing => `- [ ] ${ing.name}`).join('\n');
          setIngredients(formatted);
        } else {
          setIngredients('');
        }
      }
    }
  };

  // Submit Handler for Add / Edit Recipe
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedProductId && !customProductName.trim()) {
      setError('Selecione um produto existente ou informe um nome personalizado.');
      return;
    }

    if (!portions || isNaN(Number(portions)) || Number(portions) <= 0) {
      setError('Por favor, informe uma quantidade de porções válida maior que zero.');
      return;
    }

    if (!ingredients.trim()) {
      setError('Informe a lista de ingredientes da receita.');
      return;
    }

    if (!preparationMethod.trim()) {
      setError('Informe o modo de preparo detalhado.');
      return;
    }

    const finalProductName = selectedProductId 
      ? (products.find(p => p.id === selectedProductId)?.name || '')
      : customProductName.trim();

    if (editingId) {
      // Edit mode
      setRecipes(
        recipes.map(recipe => 
          recipe.id === editingId 
            ? {
                ...recipe,
                productId: selectedProductId || undefined,
                productName: finalProductName,
                portions: Number(portions),
                ingredients: ingredients.trim(),
                preparationMethod: preparationMethod.trim()
              }
            : recipe
        )
      );
      setEditingId(null);
    } else {
      // Add mode
      const newRecipe: Recipe = {
        id: 'r_' + Date.now().toString(),
        productId: selectedProductId || undefined,
        productName: finalProductName,
        portions: Number(portions),
        ingredients: ingredients.trim(),
        preparationMethod: preparationMethod.trim()
      };
      setRecipes([...recipes, newRecipe]);
    }

    // Reset Form
    setSelectedProductId('');
    setCustomProductName('');
    setPortions(1);
    setIngredients('');
    setPreparationMethod('');
    setError('');
  };

  // Start editing recipe
  const handleEditRecipe = (recipe: Recipe) => {
    setEditingId(recipe.id);
    setSelectedProductId(recipe.productId || '');
    setCustomProductName(recipe.productId ? '' : recipe.productName);
    setPortions(recipe.portions);
    setIngredients(recipe.ingredients);
    setPreparationMethod(recipe.preparationMethod);
    setError('');
    // Auto scroll to form on mobile
    window.scrollTo({ top: 350, behavior: 'smooth' });
  };

  // Delete recipe
  const handleDeleteRecipe = (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta receita?')) {
      setRecipes(recipes.filter(r => r.id !== id));
      if (editingId === id) {
        setEditingId(null);
        setSelectedProductId('');
        setCustomProductName('');
        setPortions(1);
        setIngredients('');
        setPreparationMethod('');
      }
      if (expandedRecipeId === id) {
        setExpandedRecipeId(null);
      }
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setSelectedProductId('');
    setCustomProductName('');
    setPortions(1);
    setIngredients('');
    setPreparationMethod('');
    setError('');
  };

  // Filter recipes based on search
  const filteredRecipes = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return recipes;
    return recipes.filter(r => 
      r.productName.toLowerCase().includes(q) || 
      r.ingredients.toLowerCase().includes(q) || 
      r.preparationMethod.toLowerCase().includes(q)
    );
  }, [recipes, searchQuery]);

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* 1. Header Hero Display */}
      <div className="bg-white dark:bg-zinc-800 p-6 sm:p-8 rounded-lg border border-zinc-200/60 dark:border-zinc-700 shadow-sm relative overflow-hidden">
        <div className="absolute right-0 bottom-0 transform translate-x-10 translate-y-10 w-48 h-48 bg-zinc-100/50 dark:bg-zinc-700/10 rounded-full pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-widest bg-brand-tomato/10 text-brand-tomato px-3 py-1 rounded-full">
              Livro de Receitas do Delivery
            </span>
            <h3 className="text-3xl font-extrabold text-zinc-900 dark:text-white mt-3 tracking-tight">
              Fichas Técnicas & Receitas
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2 max-w-xl">
              Organize os ingredientes, quantidades e modos de preparo de cada wrap, bebida ou combo do seu cardápio. Mantenha a padronização e o sabor constantes no seu delivery!
            </p>
          </div>
          <div className="p-3 bg-zinc-50 dark:bg-zinc-750 rounded-xl text-zinc-400 dark:text-zinc-300 border border-zinc-100 dark:border-zinc-700">
            <BookOpen className="w-10 h-10 text-brand-tomato" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* 2. Left Column: Recipe Entry Form (lg:col-span-5) */}
        <div className="bg-white dark:bg-zinc-800 p-5 rounded-lg border border-zinc-200/60 dark:border-zinc-700 shadow-sm h-fit lg:col-span-5">
          <h4 className="text-base font-bold tech-font-serif-italic font-serif italic text-zinc-900 dark:text-white mb-4 flex items-center space-x-2">
            <Utensils className="w-5 h-5 text-brand-tomato" />
            <span>{editingId ? 'Editar Ficha Técnica' : 'Cadastrar Nova Receita'}</span>
          </h4>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Associated Product Selection */}
            <div>
              <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                Associar a um Produto cadastrado
              </label>
              <select
                value={selectedProductId}
                onChange={(e) => handleProductChange(e.target.value)}
                className="w-full px-3 py-2.5 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-tomato dark:text-white transition-all cursor-pointer"
              >
                <option value="">-- Selecione ou digite um nome abaixo --</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.category ? `(${p.category})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Custom Name (Only active if no product is selected) */}
            {!selectedProductId && (
              <div>
                <label htmlFor="custom-product-name" className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                  Nome do Produto ou Prato
                </label>
                <input
                  type="text"
                  id="custom-product-name"
                  placeholder="Ex: Wrap Vegano Especial, Molho de Alho..."
                  value={customProductName}
                  onChange={(e) => setCustomProductName(e.target.value)}
                  className="w-full px-3 py-2.5 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-tomato dark:text-white transition-all"
                />
              </div>
            )}

            {/* Portions/Yield */}
            <div>
              <label htmlFor="portions-yield" className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                Rendimento / Porções
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 text-sm font-semibold pointer-events-none">
                  <Users className="w-4 h-4" />
                </span>
                <input
                  type="number"
                  id="portions-yield"
                  placeholder="Ex: 1 porção, 5 wraps..."
                  min="1"
                  value={portions}
                  onChange={(e) => setPortions(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full pl-9 pr-3 py-2.5 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-tomato dark:text-white transition-all"
                />
              </div>
              <p className="text-[10px] text-zinc-400 mt-1">
                Quantidade de wraps ou porções individuais produzidos com essa quantidade.
              </p>
            </div>

            {/* Ingredients block */}
            <div>
              <label htmlFor="recipe-ingredients" className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5 flex justify-between items-center">
                <span>Ingredientes e Quantidades</span>
                {selectedProductId && (
                  <span className="text-[10px] lowercase text-brand-orange">
                    Preenchido a partir da precificação!
                  </span>
                )}
              </label>
              <textarea
                id="recipe-ingredients"
                rows={5}
                placeholder={`Exemplo de formatação:
- 1 Massa de Tortilla
- 120g de Frango Desfiado
- 30g de Queijo Muçarela
- 2 colheres de sopa de molho especial`}
                value={ingredients}
                onChange={(e) => setIngredients(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-tomato dark:text-white transition-all font-mono text-xs leading-relaxed"
              />
              <p className="text-[10px] text-zinc-400 mt-1">
                Coloque um ingrediente por linha. Use marcadores (-) se desejar.
              </p>
            </div>

            {/* Preparation Method */}
            <div>
              <label htmlFor="recipe-prep" className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                Modo de Preparo (Passo a Passo)
              </label>
              <textarea
                id="recipe-prep"
                rows={6}
                placeholder="1. Grelhe o frango com tempero de ervas...
2. Aqueça a tortilla levemente por 20 segundos...
3. Monte o frango no centro e espalhe queijo...
4. Enrole firmemente fechando as pontas laterais."
                value={preparationMethod}
                onChange={(e) => setPreparationMethod(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-tomato dark:text-white transition-all text-xs leading-relaxed"
              />
            </div>

            {error && (
              <div className="flex items-center space-x-2 text-xs text-brand-tomato bg-brand-tomato/5 p-3 rounded-lg border border-brand-tomato/10">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-2 pt-2">
              {editingId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="flex-1 py-2.5 px-4 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-700 dark:hover:bg-zinc-650 text-zinc-700 dark:text-zinc-200 font-bold text-xs uppercase tracking-wider rounded-lg transition-all cursor-pointer text-center"
                >
                  Cancelar
                </button>
              )}
              <button
                type="submit"
                className="flex-2 py-2.5 px-4 bg-brand-tomato hover:bg-brand-tomato/90 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-sm transition-all flex items-center justify-center space-x-2 cursor-pointer"
                id="btn-recipe-submit"
              >
                {editingId ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Salvar Alterações</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Adicionar Receita</span>
                  </>
                )}
              </button>
            </div>

          </form>
        </div>

        {/* 3. Right Column: Recipes Search and List Display (lg:col-span-7) */}
        <div className="space-y-4 lg:col-span-7">
          
          {/* Quick Search and Counters Row */}
          <div className="bg-white dark:bg-zinc-800 p-4 rounded-lg border border-zinc-200/60 dark:border-zinc-700 shadow-sm flex flex-col sm:flex-row gap-3.5 justify-between items-center">
            
            <div className="relative w-full sm:w-72">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 pointer-events-none">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="Buscar receitas ou ingredientes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-brand-tomato dark:text-white transition-all"
              />
            </div>

            <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
              Exibindo <span className="font-bold text-brand-tomato">{filteredRecipes.length}</span> receitas cadastradas
            </div>

          </div>

          {/* Recipes Stack list */}
          {filteredRecipes.length === 0 ? (
            <div className="bg-white dark:bg-zinc-800 p-12 text-center rounded-lg border border-zinc-200/60 dark:border-zinc-700 shadow-sm">
              <BookOpen className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
              <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Nenhuma receita encontrada</p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                {recipes.length === 0 
                  ? 'Comece cadastrando sua primeira ficha técnica no painel ao lado!'
                  : 'Tente alterar os termos de busca.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRecipes.map((recipe) => {
                const isExpanded = expandedRecipeId === recipe.id;
                
                // Try to find if it corresponds to an existing product with Category
                const correspondingProduct = products.find(p => p.id === recipe.productId);
                const categoryLabel = correspondingProduct?.category || 'S/ categoria';

                return (
                  <div 
                    key={recipe.id}
                    className={`bg-white dark:bg-zinc-800 rounded-lg border shadow-sm overflow-hidden transition-all duration-200 ${
                      isExpanded 
                        ? 'border-brand-tomato/50 dark:border-brand-tomato/60 shadow-md ring-1 ring-brand-tomato/10' 
                        : 'border-zinc-200/60 dark:border-zinc-700/80 hover:border-zinc-300 dark:hover:border-zinc-600'
                    }`}
                  >
                    
                    {/* Recipe Summary Header */}
                    <div 
                      onClick={() => setExpandedRecipeId(isExpanded ? null : recipe.id)}
                      className="p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer select-none"
                    >
                      <div className="min-w-0 flex-1 flex items-start gap-3">
                        <div className="p-2 bg-brand-tomato/5 dark:bg-brand-tomato/10 rounded-lg text-brand-tomato shrink-0 mt-0.5">
                          <Utensils className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h5 className="font-bold text-sm sm:text-base text-zinc-900 dark:text-white truncate">
                              {recipe.productName}
                            </h5>
                            {categoryLabel && (
                              <span className="text-[9px] font-extrabold uppercase bg-zinc-100 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 px-1.5 py-0.5 rounded">
                                {categoryLabel}
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-4 text-xs text-zinc-400 dark:text-zinc-500 mt-1.5">
                            <span className="flex items-center gap-1">
                              <Users className="w-3.5 h-3.5 text-zinc-400" />
                              <span>Rendimento: <strong className="text-zinc-700 dark:text-zinc-300 font-semibold">{recipe.portions} porção(ões)</strong></span>
                            </span>
                            
                            {recipe.productId && (
                              <span className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-950/20 px-1.5 py-0.5 rounded">
                                <Package className="w-3 h-3" />
                                <span>Precificado</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Controls and Expand Arrow */}
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleEditRecipe(recipe)}
                          title="Editar receita"
                          className="p-1.5 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-750 dark:hover:bg-zinc-700 text-zinc-500 dark:text-zinc-400 rounded-md border border-zinc-200/50 dark:border-zinc-700/80 cursor-pointer transition-all"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteRecipe(recipe.id)}
                          title="Excluir receita"
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-md border border-rose-100 dark:border-rose-900/40 cursor-pointer transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setExpandedRecipeId(isExpanded ? null : recipe.id)}
                          className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-all cursor-pointer ml-1"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>

                    </div>

                    {/* Expanded details containing ingredients & preparation method */}
                    {isExpanded && (
                      <div className="border-t border-zinc-100 dark:border-zinc-750/80 bg-zinc-50/50 dark:bg-zinc-800/50 p-4 sm:p-6 space-y-6">
                        
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                          
                          {/* Ingredients Card */}
                          <div className="md:col-span-5 space-y-2.5">
                            <h6 className="text-xs font-bold uppercase tracking-wider text-brand-tomato flex items-center space-x-1.5">
                              <Package className="w-4 h-4" />
                              <span>Ingredientes e Medidas</span>
                            </h6>
                            <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200/50 dark:border-zinc-750 shadow-sm leading-relaxed text-xs text-zinc-700 dark:text-zinc-300 font-mono whitespace-pre-wrap">
                              {recipe.ingredients}
                            </div>
                          </div>

                          {/* Preparation steps Card */}
                          <div className="md:col-span-7 space-y-2.5">
                            <h6 className="text-xs font-bold uppercase tracking-wider text-brand-orange flex items-center space-x-1.5">
                              <ListOrdered className="w-4 h-4" />
                              <span>Modo de Preparo</span>
                            </h6>
                            <div className="bg-white dark:bg-zinc-900 p-4 sm:p-5 rounded-xl border border-zinc-200/50 dark:border-zinc-750 shadow-sm leading-relaxed text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap font-sans">
                              {recipe.preparationMethod}
                            </div>
                          </div>

                        </div>

                        {/* Interactive Portion multiplier tool! */}
                        <div className="bg-orange-50/50 dark:bg-zinc-900/40 p-4 rounded-lg border border-brand-orange/15 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                          <div className="space-y-0.5">
                            <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                              Calculadora de Rendimento Prático
                            </p>
                            <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                              Precisa de mais porções? Visualize o aumento proporcional de ingredientes.
                            </p>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-zinc-500 dark:text-zinc-400">Preparo para:</span>
                            <span className="font-bold text-xs text-brand-tomato">{recipe.portions} porção(ões) padrão</span>
                          </div>
                        </div>

                      </div>
                    )}

                  </div>
                );
              })}
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
