import React, { useState, useMemo } from 'react';
import { 
  Briefcase, 
  Plus, 
  Trash2, 
  AlertCircle, 
  DollarSign, 
  Info 
} from 'lucide-react';
import { FixedCost, VariableCost, OtherRevenue } from '../types';
import { formatCurrency } from '../utils';

interface FixedCostTabProps {
  fixedCosts: FixedCost[];
  setFixedCosts: (costs: FixedCost[]) => void;
  variableCosts: VariableCost[];
  setVariableCosts: (costs: VariableCost[]) => void;
  otherRevenues: OtherRevenue[];
  setOtherRevenues: (revenues: OtherRevenue[]) => void;
}

export default function FixedCostTab({ fixedCosts, setFixedCosts, variableCosts, setVariableCosts, otherRevenues, setOtherRevenues }: FixedCostTabProps) {
  const [newName, setNewName] = useState('');
  const [newValue, setNewValue] = useState<number | ''>('');
  const [entryType, setEntryType] = useState<'fixed' | 'variable' | 'revenue'>('fixed');
  const [error, setError] = useState('');

  const totalFixedCosts = useMemo(() => {
    return fixedCosts.reduce((sum, item) => sum + item.monthlyValue, 0);
  }, [fixedCosts]);

  const totalVariableCosts = useMemo(() => {
    return variableCosts.reduce((sum, item) => sum + item.monthlyValue, 0);
  }, [variableCosts]);

  const totalOtherRevenues = useMemo(() => {
    return otherRevenues.reduce((sum, item) => sum + item.monthlyValue, 0);
  }, [otherRevenues]);

  const handleAddCost = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!newName.trim()) {
      setError('O nome do item não pode ser vazio.');
      return;
    }

    if (newValue === '' || isNaN(newValue)) {
      setError('Informe um valor mensal válido.');
      return;
    }

    if (newValue < 0) {
      setError('O valor não pode ser negativo.');
      return;
    }

    if (entryType === 'fixed') {
      const newCost: FixedCost = {
        id: Date.now().toString(),
        name: newName.trim(),
        monthlyValue: Number(newValue),
      };
      setFixedCosts([...fixedCosts, newCost]);
    } else if (entryType === 'variable') {
      const newCost: VariableCost = {
        id: Date.now().toString(),
        name: newName.trim(),
        monthlyValue: Number(newValue),
      };
      setVariableCosts([...variableCosts, newCost]);
    } else {
      const newRevenue: OtherRevenue = {
        id: Date.now().toString(),
        name: newName.trim(),
        monthlyValue: Number(newValue),
      };
      setOtherRevenues([...otherRevenues, newRevenue]);
    }

    setNewName('');
    setNewValue('');
  };

  const handleUpdateValue = (id: string, value: number, type: 'fixed' | 'variable' | 'revenue') => {
    const validatedValue = Math.max(0, isNaN(value) ? 0 : value);
    if (type === 'variable') {
      setVariableCosts(
        variableCosts.map((cost) => (cost.id === id ? { ...cost, monthlyValue: validatedValue } : cost))
      );
    } else if (type === 'fixed') {
      setFixedCosts(
        fixedCosts.map((cost) => (cost.id === id ? { ...cost, monthlyValue: validatedValue } : cost))
      );
    } else {
      setOtherRevenues(
        otherRevenues.map((rev) => (rev.id === id ? { ...rev, monthlyValue: validatedValue } : rev))
      );
    }
  };

  const handleUpdateName = (id: string, name: string, type: 'fixed' | 'variable' | 'revenue') => {
    if (type === 'variable') {
      setVariableCosts(
        variableCosts.map((cost) => (cost.id === id ? { ...cost, name } : cost))
      );
    } else if (type === 'fixed') {
      setFixedCosts(
        fixedCosts.map((cost) => (cost.id === id ? { ...cost, name } : cost))
      );
    } else {
      setOtherRevenues(
        otherRevenues.map((rev) => (rev.id === id ? { ...rev, name } : rev))
      );
    }
  };

  const handleDeleteCost = (id: string, type: 'fixed' | 'variable' | 'revenue') => {
    if (type === 'variable') {
      setVariableCosts(variableCosts.filter((cost) => cost.id !== id));
    } else if (type === 'fixed') {
      setFixedCosts(fixedCosts.filter((cost) => cost.id !== id));
    } else {
      setOtherRevenues(otherRevenues.filter((rev) => rev.id !== id));
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* 1. Total Cost Highlight */}
      <div className="bg-white dark:bg-zinc-800 p-6 sm:p-8 rounded-lg border border-zinc-200/60 dark:border-zinc-700 shadow-sm relative overflow-hidden">
        {/* Decorative background element */}
        <div className="absolute right-0 bottom-0 transform translate-x-10 translate-y-10 w-48 h-48 bg-zinc-100/50 dark:bg-zinc-700/10 rounded-full pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-widest bg-brand-orange/10 text-brand-orange px-3 py-1 rounded-full">
              Balanço da Planilha (Receitas Extras - Custos)
            </span>
            <h3 className={`text-3xl sm:text-4xl font-extrabold tech-font-mono font-mono mt-3 tracking-tight ${totalOtherRevenues - (totalFixedCosts + totalVariableCosts) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {formatCurrency(totalOtherRevenues - (totalFixedCosts + totalVariableCosts))}
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2 max-w-md">
              Entradas e Saídas independentes do volume de vendas mensal no iFood.
            </p>
          </div>
          <div className="p-3 bg-zinc-50 dark:bg-zinc-750 rounded-xl text-zinc-400 dark:text-zinc-300 border border-zinc-100 dark:border-zinc-700">
            <Briefcase className="w-10 h-10 text-brand-orange" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 2. Add Cost Form */}
        <div className="bg-white dark:bg-zinc-800 p-5 rounded-lg border border-zinc-200/60 dark:border-zinc-700 shadow-sm h-fit">
          <h4 className="text-base font-bold tech-font-serif-italic font-serif italic text-zinc-900 dark:text-white mb-4 flex items-center space-x-2">
            <Plus className="w-5 h-5 text-brand-tomato" />
            <span>Adicionar Lançamento</span>
          </h4>

          <form onSubmit={handleAddCost} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                Tipo de Lançamento
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setEntryType('revenue')}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${entryType === 'revenue' ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-white' : 'bg-zinc-50 dark:bg-zinc-900/50 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                >
                  Entrada
                </button>
                <button
                  type="button"
                  onClick={() => setEntryType('fixed')}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${entryType === 'fixed' ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-white' : 'bg-zinc-50 dark:bg-zinc-900/50 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                >
                  Fixo
                </button>
                <button
                  type="button"
                  onClick={() => setEntryType('variable')}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${entryType === 'variable' ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-white' : 'bg-zinc-50 dark:bg-zinc-900/50 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                >
                  Variável
                </button>
              </div>
            </div>
            
            <div>
              <label htmlFor="cost-name" className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                Descrição do Item
              </label>
              <input
                type="text"
                id="cost-name"
                placeholder={entryType === 'revenue' ? 'Ex: Vendas balcão, Evento' : entryType === 'fixed' ? 'Ex: Aluguel da cozinha' : 'Ex: Conta de Luz / Água'}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-3 py-2.5 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-tomato dark:text-white transition-all"
              />
            </div>

            <div>
              <label htmlFor="cost-value" className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                Valor Mensal (R$)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 text-sm font-semibold pointer-events-none">
                  R$
                </span>
                <input
                  type="number"
                  id="cost-value"
                  placeholder="Ex: 1200"
                  min="0"
                  step="0.01"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full pl-9 pr-3 py-2.5 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-tomato dark:text-white transition-all"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center space-x-2 text-xs text-brand-tomato bg-brand-tomato/5 p-3 rounded-lg border border-brand-tomato/10">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-brand-tomato hover:bg-brand-tomato/90 text-white font-medium text-sm rounded-lg shadow-sm transition-all flex items-center justify-center space-x-2 cursor-pointer"
              id="btn-add-cost-submit"
            >
              <Plus className="w-4 h-4" />
              <span>Cadastrar Lançamento</span>
            </button>
          </form>
        </div>

        {/* 3. Costs List */}
        <div className="bg-white dark:bg-zinc-800 p-5 rounded-lg border border-zinc-200/60 dark:border-zinc-700 shadow-sm lg:col-span-2">
          
          <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-6 bg-zinc-50 dark:bg-zinc-900 p-3 rounded-lg border border-zinc-150 dark:border-zinc-800/80 flex items-start space-x-2">
            <Info className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
            <span>
              Estes lançamentos são amortizados diretamente no lucro operacional total do simulador mensal para encontrar a sobra líquida de caixa.
            </span>
          </div>

          {/* Receitas */}
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-base font-bold tech-font-serif-italic font-serif italic text-zinc-900 dark:text-white flex items-center space-x-2">
              <DollarSign className="w-5 h-5 text-emerald-500" />
              <span>Outras Receitas (Entradas)</span>
            </h4>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold tech-font-mono font-mono bg-zinc-50 dark:bg-zinc-900 px-2.5 py-1 rounded-md border border-zinc-200/50 dark:border-zinc-800">
              {otherRevenues.length} Itens
            </span>
          </div>

          {otherRevenues.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center border border-dashed border-zinc-200 dark:border-zinc-700 rounded-lg mb-8">
              <AlertCircle className="w-8 h-8 text-zinc-300 mb-2" />
              <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Nenhuma receita extra cadastrada</p>
            </div>
          ) : (
            <div className="space-y-3 mb-8">
              {otherRevenues.map((rev) => (
                <div 
                  key={rev.id}
                  className="p-4 bg-zinc-50/50 dark:bg-zinc-800/20 border border-zinc-200 dark:border-zinc-700 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all"
                >
                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      value={rev.name}
                      onChange={(e) => handleUpdateName(rev.id, e.target.value, 'revenue')}
                      className="bg-transparent text-sm font-bold text-zinc-800 dark:text-zinc-100 focus:outline-none focus:bg-white dark:focus:bg-zinc-900 border-b border-transparent focus:border-zinc-300 w-full px-1 py-0.5"
                    />
                  </div>
                  <div className="flex items-center justify-between sm:justify-end space-x-4 pl-1 sm:pl-0">
                    <div className="flex items-center space-x-1.5 bg-zinc-100 dark:bg-zinc-900 px-2 py-1 rounded-md border border-zinc-200/50 dark:border-zinc-800">
                      <span className="text-zinc-400 dark:text-zinc-500 text-xs font-semibold">R$</span>
                      <input
                        type="number"
                        step="10"
                        min="0"
                        value={rev.monthlyValue}
                        onChange={(e) => handleUpdateValue(rev.id, Number(e.target.value), 'revenue')}
                        className="bg-transparent text-sm font-bold tech-font-mono font-mono text-emerald-600 dark:text-emerald-400 focus:outline-none text-right w-20"
                      />
                    </div>
                    <button
                      onClick={() => handleDeleteCost(rev.id, 'revenue')}
                      className="p-1.5 text-zinc-400 hover:text-brand-tomato hover:bg-zinc-100 dark:hover:bg-zinc-700/50 rounded-lg transition-colors"
                      title="Excluir item"
                    >
                      <Trash2 className="w-4.5 h-4.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-between items-center mb-4">
            <h4 className="text-base font-bold tech-font-serif-italic font-serif italic text-zinc-900 dark:text-white flex items-center space-x-2">
              <DollarSign className="w-5 h-5 text-brand-orange" />
              <span>Custos Fixos</span>
            </h4>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold tech-font-mono font-mono bg-zinc-50 dark:bg-zinc-900 px-2.5 py-1 rounded-md border border-zinc-200/50 dark:border-zinc-800">
              {fixedCosts.length} Itens
            </span>
          </div>

          {fixedCosts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center border border-dashed border-zinc-200 dark:border-zinc-700 rounded-lg mb-8">
              <AlertCircle className="w-8 h-8 text-zinc-300 mb-2" />
              <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Nenhum custo fixo cadastrado</p>
              <p className="text-xs text-zinc-400 mt-1 max-w-xs">Use o painel lateral para listar aluguel, salários, etc.</p>
            </div>
          ) : (
            <div className="space-y-3 mb-8">
              {fixedCosts.map((cost) => (
                <div 
                  key={cost.id}
                  className="p-4 bg-zinc-50/50 dark:bg-zinc-800/20 border border-zinc-200 dark:border-zinc-700 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all"
                >
                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      value={cost.name}
                      onChange={(e) => handleUpdateName(cost.id, e.target.value, 'fixed')}
                      className="bg-transparent text-sm font-bold text-zinc-800 dark:text-zinc-100 focus:outline-none focus:bg-white dark:focus:bg-zinc-900 border-b border-transparent focus:border-zinc-300 w-full px-1 py-0.5"
                    />
                  </div>

                  <div className="flex items-center justify-between sm:justify-end space-x-4 pl-1 sm:pl-0">
                    <div className="flex items-center space-x-1.5 bg-zinc-100 dark:bg-zinc-900 px-2 py-1 rounded-md border border-zinc-200/50 dark:border-zinc-800">
                      <span className="text-zinc-400 dark:text-zinc-500 text-xs font-semibold">R$</span>
                      <input
                        type="number"
                        step="10"
                        min="0"
                        value={cost.monthlyValue}
                        onChange={(e) => handleUpdateValue(cost.id, Number(e.target.value), 'fixed')}
                        className="bg-transparent text-sm font-bold tech-font-mono font-mono text-zinc-900 dark:text-white focus:outline-none text-right w-20"
                      />
                    </div>

                    <button
                      onClick={() => handleDeleteCost(cost.id, 'fixed')}
                      className="p-1.5 text-zinc-400 hover:text-brand-tomato hover:bg-zinc-100 dark:hover:bg-zinc-700/50 rounded-lg transition-colors"
                      title="Excluir custo"
                      id={`btn-delete-fixedcost-${cost.id}`}
                    >
                      <Trash2 className="w-4.5 h-4.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Variáveis */}
          <div className="flex justify-between items-center mb-4 pt-4 border-t border-zinc-200/60 dark:border-zinc-700">
            <h4 className="text-base font-bold tech-font-serif-italic font-serif italic text-zinc-900 dark:text-white flex items-center space-x-2">
              <DollarSign className="w-5 h-5 text-brand-orange" />
              <span>Custos Variáveis do Mês</span>
            </h4>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold tech-font-mono font-mono bg-zinc-50 dark:bg-zinc-900 px-2.5 py-1 rounded-md border border-zinc-200/50 dark:border-zinc-800">
              {variableCosts.length} Itens
            </span>
          </div>

          {variableCosts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center border border-dashed border-zinc-200 dark:border-zinc-700 rounded-lg">
              <AlertCircle className="w-8 h-8 text-zinc-300 mb-2" />
              <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Nenhum custo variável cadastrado</p>
              <p className="text-xs text-zinc-400 mt-1 max-w-xs">Custos que variam, como energia, água, gás, etc.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {variableCosts.map((cost) => (
                <div 
                  key={cost.id}
                  className="p-4 bg-zinc-50/50 dark:bg-zinc-800/20 border border-zinc-200 dark:border-zinc-700 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all"
                >
                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      value={cost.name}
                      onChange={(e) => handleUpdateName(cost.id, e.target.value, 'variable')}
                      className="bg-transparent text-sm font-bold text-zinc-800 dark:text-zinc-100 focus:outline-none focus:bg-white dark:focus:bg-zinc-900 border-b border-transparent focus:border-zinc-300 w-full px-1 py-0.5"
                    />
                  </div>

                  <div className="flex items-center justify-between sm:justify-end space-x-4 pl-1 sm:pl-0">
                    <div className="flex items-center space-x-1.5 bg-zinc-100 dark:bg-zinc-900 px-2 py-1 rounded-md border border-zinc-200/50 dark:border-zinc-800">
                      <span className="text-zinc-400 dark:text-zinc-500 text-xs font-semibold">R$</span>
                      <input
                        type="number"
                        step="10"
                        min="0"
                        value={cost.monthlyValue}
                        onChange={(e) => handleUpdateValue(cost.id, Number(e.target.value), 'variable')}
                        className="bg-transparent text-sm font-bold tech-font-mono font-mono text-zinc-900 dark:text-white focus:outline-none text-right w-20"
                      />
                    </div>

                    <button
                      onClick={() => handleDeleteCost(cost.id, 'variable')}
                      className="p-1.5 text-zinc-400 hover:text-brand-tomato hover:bg-zinc-100 dark:hover:bg-zinc-700/50 rounded-lg transition-colors"
                      title="Excluir custo"
                      id={`btn-delete-varcost-${cost.id}`}
                    >
                      <Trash2 className="w-4.5 h-4.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
