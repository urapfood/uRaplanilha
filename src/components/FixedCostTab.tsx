import React, { useState, useMemo } from 'react';
import { 
  Briefcase, 
  Plus, 
  Trash2, 
  AlertCircle, 
  DollarSign, 
  Info 
} from 'lucide-react';
import { FixedCost } from '../types';
import { formatCurrency } from '../utils';

interface FixedCostTabProps {
  fixedCosts: FixedCost[];
  setFixedCosts: (costs: FixedCost[]) => void;
}

export default function FixedCostTab({ fixedCosts, setFixedCosts }: FixedCostTabProps) {
  const [newName, setNewName] = useState('');
  const [newValue, setNewValue] = useState<number | ''>('');
  const [error, setError] = useState('');

  const totalFixedCosts = useMemo(() => {
    return fixedCosts.reduce((sum, item) => sum + item.monthlyValue, 0);
  }, [fixedCosts]);

  const handleAddCost = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!newName.trim()) {
      setError('O nome do custo fixo não pode ser vazio.');
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

    const newCost: FixedCost = {
      id: Date.now().toString(),
      name: newName.trim(),
      monthlyValue: Number(newValue),
    };

    setFixedCosts([...fixedCosts, newCost]);
    setNewName('');
    setNewValue('');
  };

  const handleUpdateValue = (id: string, value: number) => {
    const validatedValue = Math.max(0, isNaN(value) ? 0 : value);
    setFixedCosts(
      fixedCosts.map((cost) => (cost.id === id ? { ...cost, monthlyValue: validatedValue } : cost))
    );
  };

  const handleUpdateName = (id: string, name: string) => {
    setFixedCosts(
      fixedCosts.map((cost) => (cost.id === id ? { ...cost, name } : cost))
    );
  };

  const handleDeleteCost = (id: string) => {
    setFixedCosts(fixedCosts.filter((cost) => cost.id !== id));
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
              Soma de Custos Fixos Mensais
            </span>
            <h3 className="text-3xl sm:text-4xl font-extrabold tech-font-mono font-mono text-zinc-900 dark:text-white mt-3 tracking-tight">
              {formatCurrency(totalFixedCosts)}
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2 max-w-md">
              Despesas necessárias para manter o delivery aberto, independentemente do volume de vendas.
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
            <span>Adicionar Custo Fixo</span>
          </h4>

          <form onSubmit={handleAddCost} className="space-y-4">
            <div>
              <label htmlFor="cost-name" className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                Descrição do Custo
              </label>
              <input
                type="text"
                id="cost-name"
                placeholder="Ex: Aluguel da cozinha"
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
              id="btn-add-fixedcost-submit"
            >
              <Plus className="w-4 h-4" />
              <span>Cadastrar Custo</span>
            </button>
          </form>
        </div>

        {/* 3. Costs List */}
        <div className="bg-white dark:bg-zinc-800 p-5 rounded-lg border border-zinc-200/60 dark:border-zinc-700 shadow-sm lg:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-base font-bold tech-font-serif-italic font-serif italic text-zinc-900 dark:text-white flex items-center space-x-2">
              <DollarSign className="w-5 h-5 text-brand-orange" />
              <span>Detalhamento das Despesas</span>
            </h4>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold tech-font-mono font-mono bg-zinc-50 dark:bg-zinc-900 px-2.5 py-1 rounded-md border border-zinc-200/50 dark:border-zinc-800">
              {fixedCosts.length} Itens
            </span>
          </div>

          <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-4 bg-zinc-50 dark:bg-zinc-900 p-3 rounded-lg border border-zinc-150 dark:border-zinc-800/80 flex items-start space-x-2">
            <Info className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
            <span>
              Estes custos são amortizados diretamente no lucro operacional total do simulador mensal para encontrar a sobra líquida de caixa.
            </span>
          </div>

          {fixedCosts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center border border-dashed border-zinc-200 dark:border-zinc-700 rounded-lg">
              <AlertCircle className="w-8 h-8 text-zinc-300 mb-2" />
              <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Nenhum custo cadastrado</p>
              <p className="text-xs text-zinc-400 mt-1 max-w-xs">Use o painel lateral para listar aluguel, luz, salários, etc.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {fixedCosts.map((cost) => (
                <div 
                  key={cost.id}
                  className="p-4 bg-zinc-50/50 dark:bg-zinc-800/20 border border-zinc-200 dark:border-zinc-700 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all"
                >
                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      value={cost.name}
                      onChange={(e) => handleUpdateName(cost.id, e.target.value)}
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
                        onChange={(e) => handleUpdateValue(cost.id, Number(e.target.value))}
                        className="bg-transparent text-sm font-bold tech-font-mono font-mono text-zinc-900 dark:text-white focus:outline-none text-right w-20"
                      />
                    </div>

                    <button
                      onClick={() => handleDeleteCost(cost.id)}
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
        </div>

      </div>

    </div>
  );
}
