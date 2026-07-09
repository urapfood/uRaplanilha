import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit, 
  AlertCircle, 
  X,
  Briefcase
} from 'lucide-react';
import { SupplierItem } from '../types';
import { formatCurrency } from '../utils';

interface SupplierTabProps {
  suppliers: SupplierItem[];
  setSuppliers: (suppliers: SupplierItem[]) => void;
}

export default function SupplierTab({ suppliers, setSuppliers }: SupplierTabProps) {
  // Search state
  const [searchTerm, setSearchTerm] = useState('');

  // Form Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form fields
  const [formName, setFormName] = useState('');
  const [formUnit, setFormUnit] = useState('');
  const [formPrice, setFormPrice] = useState<number | ''>('');
  const [formSupplierName, setFormSupplierName] = useState('');

  const [formError, setFormError] = useState('');

  // Filtered list
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            (s.supplierName && s.supplierName.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesSearch;
    });
  }, [suppliers, searchTerm]);

  // Open modal
  const handleOpenAddModal = () => {
    setEditingId(null);
    setFormName('');
    setFormUnit('');
    setFormPrice('');
    setFormSupplierName('');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (supplier: SupplierItem) => {
    setEditingId(supplier.id);
    setFormName(supplier.name);
    setFormUnit(supplier.unit);
    setFormPrice(supplier.price);
    setFormSupplierName(supplier.supplierName || '');
    setFormError('');
    setIsModalOpen(true);
  };

  // Delete
  const handleDelete = (id: string) => {
    if (confirm('Tem certeza de que deseja excluir este fornecedor/insumo?')) {
      setSuppliers(suppliers.filter((s) => s.id !== id));
    }
  };

  // Save
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formName.trim()) {
      setFormError('O nome do insumo é obrigatório.');
      return;
    }

    if (formPrice === '' || isNaN(formPrice) || formPrice < 0) {
      setFormError('Informe um preço válido.');
      return;
    }

    if (!formUnit.trim()) {
      setFormError('A unidade de medida é obrigatória (ex: kg, L, un).');
      return;
    }

    const savedSupplier: SupplierItem = {
      id: editingId || Date.now().toString(),
      name: formName.trim(),
      unit: formUnit.trim(),
      price: Number(formPrice),
      supplierName: formSupplierName.trim() || undefined,
    };

    if (editingId) {
      setSuppliers(suppliers.map((s) => (s.id === editingId ? savedSupplier : s)));
    } else {
      setSuppliers([...suppliers, savedSupplier]);
    }

    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Header & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold tech-font-serif-italic font-serif italic text-zinc-900 dark:text-white">Gerenciamento de Fornecedores</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Cadastre o custo dos insumos e os nomes dos seus fornecedores.
          </p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="px-4 py-2.5 bg-brand-tomato hover:bg-brand-tomato/95 text-white font-bold text-sm rounded-xl shadow-sm transition-all flex items-center justify-center space-x-2"
          id="btn-add-supplier"
        >
          <Plus className="w-4.5 h-4.5" />
          <span>Adicionar Insumo</span>
        </button>
      </div>

      {/* Search Box */}
      <div className="bg-white dark:bg-zinc-800 p-4 rounded-lg border border-zinc-200/60 dark:border-zinc-700 shadow-sm flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-zinc-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por insumo ou fornecedor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-tomato dark:text-white transition-all"
          />
        </div>
      </div>

      {/* List */}
      {filteredSuppliers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-sm">
          <Briefcase className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mb-4" />
          <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Nenhum insumo encontrado</p>
          <p className="text-xs text-zinc-500 mt-1 max-w-sm">
            Nenhum registro correspondente foi encontrado. Clique em "Adicionar Insumo" para cadastrar.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredSuppliers.map((supplier) => (
            <div key={supplier.id} className="group flex flex-col bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm overflow-hidden hover:shadow-md transition-shadow relative">
              
              <div className="p-4 flex flex-col h-full space-y-3">
                <div className="flex justify-between items-start">
                  <div className="space-y-1 pr-6">
                    <h4 className="font-bold text-zinc-900 dark:text-white line-clamp-2 leading-tight">
                      {supplier.name}
                    </h4>
                    {supplier.supplierName && (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
                        <span>{supplier.supplierName}</span>
                      </span>
                    )}
                  </div>
                  
                  <div className="absolute top-3 right-3 flex flex-col items-center space-y-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleOpenEditModal(supplier)}
                      className="p-1.5 text-zinc-400 hover:bg-brand-tomato hover:text-white rounded-md transition-colors"
                      title="Editar Insumo"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(supplier.id)}
                      className="p-1.5 text-zinc-400 hover:bg-red-500 hover:text-white rounded-md transition-colors"
                      title="Excluir Insumo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="mt-auto pt-4 border-t border-zinc-100 dark:border-zinc-750 flex items-end justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-0.5">Preço Base</span>
                    <div className="flex items-baseline space-x-1">
                      <span className="text-lg font-bold text-zinc-900 dark:text-white">
                        {formatCurrency(supplier.price)}
                      </span>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        / {supplier.unit}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Form */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs p-4 overflow-y-auto flex items-start justify-center" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="fixed inset-0 bg-zinc-950/40 dark:bg-zinc-950/70 backdrop-blur-xs transition-opacity" onClick={() => setIsModalOpen(false)} />
          
          <div className="relative z-10 bg-white dark:bg-zinc-900 rounded-2xl text-left shadow-xl transform transition-all w-full max-w-2xl my-4 sm:my-8 flex flex-col h-auto border border-zinc-200/80 dark:border-zinc-800">
            
            {/* Modal Header */}
            <div className="p-4 border-b border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between shrink-0 bg-zinc-50/50 dark:bg-zinc-950/20">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center space-x-2" id="modal-title">
                <span className="font-sans font-bold">{editingId ? 'Editar Insumo' : 'Novo Insumo e Fornecedor'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-400 hover:text-brand-tomato hover:bg-brand-tomato/10 p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              <div className="space-y-4">
                
                <div>
                  <label htmlFor="sup-name" className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                    Insumo (Nome) *
                  </label>
                  <input
                    type="text"
                    id="sup-name"
                    required
                    placeholder="Ex: Queijo Mussarela"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-brand-tomato dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="sup-price" className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                      Preço (R$) *
                    </label>
                    <input
                      type="number"
                      id="sup-price"
                      step="0.01"
                      min="0"
                      required
                      placeholder="Ex: 35.90"
                      value={formPrice}
                      onChange={(e) => setFormPrice(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-brand-tomato dark:text-white"
                    />
                  </div>
                  <div>
                    <label htmlFor="sup-unit" className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                      Unidade de Medida *
                    </label>
                    <input
                      type="text"
                      id="sup-unit"
                      required
                      placeholder="Ex: kg, unidade, L, cx"
                      value={formUnit}
                      onChange={(e) => setFormUnit(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-brand-tomato dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="sup-supplier" className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                    Nome do Fornecedor (Opcional)
                  </label>
                  <input
                    type="text"
                    id="sup-supplier"
                    placeholder="Ex: Atacadão, Frigorífico Silva..."
                    value={formSupplierName}
                    onChange={(e) => setFormSupplierName(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-brand-tomato dark:text-white"
                  />
                </div>

              </div>

              {formError && (
                <div className="flex items-center space-x-2 text-xs text-brand-tomato bg-brand-tomato/5 p-3 rounded-xl border border-brand-tomato/10 shrink-0">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-zinc-50/50 dark:bg-zinc-950/40 px-5 py-3.5 border-t border-zinc-100 dark:border-zinc-800 flex justify-end space-x-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-650 text-zinc-700 dark:text-zinc-200 font-semibold text-xs rounded-xl transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-5 py-2 bg-brand-tomato hover:bg-brand-tomato/90 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
              >
                Salvar
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
