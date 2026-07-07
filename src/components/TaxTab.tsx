import React, { useState, useMemo } from 'react';
import { 
  Percent, 
  Plus, 
  Trash2, 
  AlertCircle, 
  CheckCircle2, 
  Info 
} from 'lucide-react';
import { Tax } from '../types';
import { formatPercent, getActiveTaxPercentage } from '../utils';

interface TaxTabProps {
  taxes: Tax[];
  setTaxes: (taxes: Tax[]) => void;
}

export default function TaxTab({ taxes, setTaxes }: TaxTabProps) {
  // Local state for the "Add Tax" form
  const [newTaxName, setNewTaxName] = useState('');
  const [newTaxPercentage, setNewTaxPercentage] = useState<number | ''>('');
  const [error, setError] = useState('');

  // Calculate sum of active taxes
  const activeTaxTotal = useMemo(() => getActiveTaxPercentage(taxes), [taxes]);

  const handleAddTax = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!newTaxName.trim()) {
      setError('O nome da taxa não pode estar vazio.');
      return;
    }

    if (newTaxPercentage === '' || isNaN(newTaxPercentage)) {
      setError('Informe um percentual de taxa válido.');
      return;
    }

    if (newTaxPercentage < 0 || newTaxPercentage > 100) {
      setError('O percentual deve estar entre 0% e 100%.');
      return;
    }

    const newTax: Tax = {
      id: Date.now().toString(),
      name: newTaxName.trim(),
      percentage: Number(newTaxPercentage),
      active: true,
    };

    setTaxes([...taxes, newTax]);
    setNewTaxName('');
    setNewTaxPercentage('');
  };

  const handleToggleTax = (id: string) => {
    setTaxes(
      taxes.map((tax) => (tax.id === id ? { ...tax, active: !tax.active } : tax))
    );
  };

  const handleUpdatePercentage = (id: string, value: number) => {
    const validatedValue = Math.min(100, Math.max(0, isNaN(value) ? 0 : value));
    setTaxes(
      taxes.map((tax) => (tax.id === id ? { ...tax, percentage: validatedValue } : tax))
    );
  };

  const handleUpdateName = (id: string, name: string) => {
    setTaxes(
      taxes.map((tax) => (tax.id === id ? { ...tax, name } : tax))
    );
  };

  const handleDeleteTax = (id: string) => {
    setTaxes(taxes.filter((tax) => tax.id !== id));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* 1. Cumulative Taxes Highlight */}
      <div className="bg-white dark:bg-zinc-800 p-6 sm:p-8 rounded-lg border border-zinc-200/60 dark:border-zinc-700 shadow-sm relative overflow-hidden">
        {/* Decorative background circle */}
        <div className="absolute right-0 bottom-0 transform translate-x-10 translate-y-10 w-48 h-48 bg-zinc-100/50 dark:bg-zinc-700/10 rounded-full pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-widest bg-brand-tomato/10 text-brand-tomato px-3 py-1 rounded-full">
              Taxa Geral Acumulada
            </span>
            <h3 className="text-3xl sm:text-4xl font-extrabold tech-font-mono font-mono text-zinc-900 dark:text-white mt-3 tracking-tight">
              {formatPercent(activeTaxTotal)}
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2 max-w-md">
              Soma total de todos os tributos, comissões de marketplace e taxas de intermediação ativas abaixo.
            </p>
          </div>
          <div className="p-3 bg-zinc-50 dark:bg-zinc-700/50 rounded-xl text-zinc-400 dark:text-zinc-350 border border-zinc-100 dark:border-zinc-600">
            <Percent className="w-10 h-10 text-brand-tomato" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 2. Add Tax Form */}
        <div className="bg-white dark:bg-zinc-800 p-5 rounded-lg border border-zinc-200/60 dark:border-zinc-700 shadow-sm h-fit">
          <h4 className="text-base font-bold tech-font-serif-italic font-serif italic text-zinc-900 dark:text-white mb-4 flex items-center space-x-2">
            <Plus className="w-5 h-5 text-brand-tomato" />
            <span>Adicionar Nova Taxa</span>
          </h4>

          <form onSubmit={handleAddTax} className="space-y-4">
            <div>
              <label htmlFor="tax-name" className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                Nome da Taxa / Canal
              </label>
              <input
                type="text"
                id="tax-name"
                placeholder="Ex: Comissão iFood"
                value={newTaxName}
                onChange={(e) => setNewTaxName(e.target.value)}
                className="w-full px-3 py-2.5 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-tomato dark:text-white transition-all"
              />
            </div>

            <div>
              <label htmlFor="tax-percent" className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                Taxa (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  id="tax-percent"
                  placeholder="Ex: 12.0"
                  step="0.01"
                  min="0"
                  max="100"
                  value={newTaxPercentage}
                  onChange={(e) => setNewTaxPercentage(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full pl-3 pr-8 py-2.5 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-tomato dark:text-white transition-all"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 text-sm font-semibold pointer-events-none">
                  %
                </span>
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
              id="btn-add-tax-submit"
            >
              <Plus className="w-4 h-4" />
              <span>Cadastrar Taxa</span>
            </button>
          </form>
        </div>

        {/* 3. Taxes List */}
        <div className="bg-white dark:bg-zinc-800 p-5 rounded-lg border border-zinc-200/60 dark:border-zinc-700 shadow-sm lg:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-base font-bold tech-font-serif-italic font-serif italic text-zinc-900 dark:text-white flex items-center space-x-2">
              <Percent className="w-5 h-5 text-brand-orange" />
              <span>Taxas Ativas e Inativas</span>
            </h4>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold tech-font-mono font-mono bg-zinc-50 dark:bg-zinc-900 px-2.5 py-1 rounded-md border border-zinc-200/50 dark:border-zinc-800">
              {taxes.length} Cadastradas
            </span>
          </div>

          <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-4 bg-amber-500/5 dark:bg-amber-500/10 p-3 rounded-lg border border-amber-500/15 flex items-start space-x-2">
            <Info className="w-4 h-4 text-brand-orange shrink-0 mt-0.5" />
            <span>
              Ao desmarcar uma taxa, ela continuará cadastrada, mas seu valor será <strong>ignorado temporariamente</strong> no cálculo de lucro líquido e margem de todos os produtos.
            </span>
          </div>

          {taxes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center border border-dashed border-zinc-200 dark:border-zinc-700 rounded-lg">
              <AlertCircle className="w-8 h-8 text-zinc-300 mb-2" />
              <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Nenhuma taxa cadastrada</p>
              <p className="text-xs text-zinc-400 mt-1 max-w-xs">Use o painel lateral para registrar impostos ou taxas do iFood.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {taxes.map((tax) => (
                <div 
                  key={tax.id}
                  className={`p-4 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                    tax.active 
                      ? 'bg-zinc-50/50 dark:bg-zinc-800/20 border-zinc-200 dark:border-zinc-700' 
                      : 'bg-zinc-100/30 dark:bg-zinc-900/10 border-zinc-100 dark:border-zinc-800 opacity-60'
                  }`}
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    {/* Toggle Checkbox */}
                    <input
                      type="checkbox"
                      checked={tax.active}
                      onChange={() => handleToggleTax(tax.id)}
                      className="w-5 h-5 accent-brand-tomato border-zinc-300 dark:border-zinc-600 rounded cursor-pointer"
                      title={tax.active ? 'Taxa Ativa' : 'Taxa Inativa'}
                      id={`tax-toggle-${tax.id}`}
                    />
                    <div className="flex-1 min-w-0">
                      <input
                        type="text"
                        value={tax.name}
                        onChange={(e) => handleUpdateName(tax.id, e.target.value)}
                        className="bg-transparent text-sm font-bold text-zinc-800 dark:text-zinc-100 focus:outline-none focus:bg-white dark:focus:bg-zinc-900 border-b border-transparent focus:border-zinc-300 w-full px-1 py-0.5"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end space-x-4 pl-8 sm:pl-0">
                    <div className="flex items-center space-x-1.5 bg-zinc-100 dark:bg-zinc-900 px-2 py-1 rounded-md border border-zinc-200/50 dark:border-zinc-800">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={tax.percentage}
                        onChange={(e) => handleUpdatePercentage(tax.id, Number(e.target.value))}
                        className="bg-transparent text-sm font-bold tech-font-mono font-mono text-zinc-900 dark:text-white focus:outline-none text-right w-12"
                      />
                      <span className="text-zinc-400 dark:text-zinc-500 text-xs font-semibold">%</span>
                    </div>

                    <button
                      onClick={() => handleDeleteTax(tax.id)}
                      className="p-1.5 text-zinc-400 hover:text-brand-tomato hover:bg-zinc-100 dark:hover:bg-zinc-700/50 rounded-lg transition-colors"
                      title="Excluir taxa"
                      id={`btn-delete-tax-${tax.id}`}
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
