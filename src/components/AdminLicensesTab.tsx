import React, { useState, useEffect } from 'react';
import { 
  Users, 
  CheckCircle, 
  Clock, 
  Search, 
  MessageSquare, 
  RefreshCw, 
  Sliders,
  DollarSign,
  ShieldAlert
} from 'lucide-react';

interface AdminLicensesTabProps {
  currentUser: any;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export default function AdminLicensesTab({ currentUser, showToast }: AdminLicensesTabProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [users, setUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const fetchAdminData = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch(`/api/admin/users?adminId=${currentUser.uid}`);
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Erro ao carregar dados de administração.');
      }
      const data = await response.json();
      setUsers(data.users || []);
    } catch (err: any) {
      console.error(err);
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [currentUser]);

  const handleToggleLicense = async (targetUserId: string, currentStatus: string) => {
    const action = currentStatus === 'active' ? 'deactivate' : 'activate';
    const confirmMsg = action === 'activate' 
      ? 'Deseja ativar manualmente a licença/premium deste usuário?' 
      : 'Deseja inativar/remover o acesso premium deste usuário?';

    if (!window.confirm(confirmMsg)) return;

    try {
      const response = await fetch('/api/admin/activate-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          adminId: currentUser.uid,
          targetUserId,
          action
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Erro ao modificar licença.');
      }

      showToast(`Licença ${action === 'activate' ? 'ativada' : 'removida'} com sucesso!`);
      // Reload lists
      fetchAdminData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const filteredUsers = users.filter(u => {
    const query = searchQuery.toLowerCase();
    return (
      (u.name || '').toLowerCase().includes(query) ||
      (u.email || '').toLowerCase().includes(query) ||
      (u.companyName || '').toLowerCase().includes(query) ||
      (u.phone || '').includes(query)
    );
  });

  // Calculate metrics
  const totalUsersCount = users.length;
  const activeLicensesCount = users.filter(u => u.premium === true || u.licenseStatus === 'active' || u.email === 'urapfood@gmail.com').length;
  const pendingLicensesCount = totalUsersCount - activeLicensesCount;
  const estimatedMonthlyRevenue = activeLicensesCount * 15.90;

  return (
    <div className="space-y-6">
      {/* Tab Title Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-xs">
        <div>
          <h2 className="text-xl font-extrabold text-zinc-950 dark:text-white tracking-tight flex items-center gap-2">
            <Sliders className="w-5 h-5 text-brand-tomato" />
            Painel do Proprietário • Licenças & Vendas
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Gerencie as contas cadastradas, ative assinaturas premium manualmente e acompanhe o crescimento do uRapFood.
          </p>
        </div>
        <button 
          onClick={fetchAdminData}
          disabled={isRefreshing}
          className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-300 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          Atualizar Dados
        </button>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Customers */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Total de Clientes</span>
            <p className="text-2xl font-black text-zinc-900 dark:text-white mt-1">{totalUsersCount}</p>
          </div>
          <div className="p-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Active Licenses */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Licenças Ativas</span>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{activeLicensesCount}</p>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>

        {/* Pending Licenses */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Aguardando Pagamento</span>
            <p className="text-2xl font-black text-amber-500 mt-1">{pendingLicensesCount}</p>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-950/20 text-amber-500 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Monthly Revenue Estimative */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Faturamento Estimado</span>
            <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
              {estimatedMonthlyRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 rounded-xl">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Clients Management Panel */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
            Controle de Clientes Cadastrados
          </h3>
          
          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filtrar por nome, email, WhatsApp..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-250 dark:border-zinc-800 focus:border-brand-tomato text-xs rounded-lg pl-9 pr-3 py-2 outline-hidden"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center text-zinc-400">Carregando banco de dados de usuários...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-20 text-center text-zinc-400 text-xs">Nenhum cliente encontrado.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-850 text-zinc-400 font-bold">
                  <th className="py-2.5 pb-3">Nome / Empresa</th>
                  <th className="py-2.5 pb-3">Contato / Email</th>
                  <th className="py-2.5 pb-3">Status da Licença</th>
                  <th className="py-2.5 pb-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-850 font-medium">
                {filteredUsers.map(u => {
                  const isSystemAdmin = u.email === 'urapfood@gmail.com';
                  const isActive = u.premium === true || u.licenseStatus === 'active' || isSystemAdmin;

                  return (
                    <tr key={u.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-850/30">
                      <td className="py-3.5">
                        <p className="font-extrabold text-zinc-950 dark:text-white text-xs">{u.name || 'Cliente Sem Nome'}</p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">{u.companyName || 'Empresa não informada'}</p>
                      </td>
                      <td className="py-3.5">
                        <p className="text-zinc-600 dark:text-zinc-300 font-mono text-[11px]">{u.email}</p>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-zinc-400">
                          <span>{u.phone || 'Sem telefone'}</span>
                          {u.phone && (
                            <a 
                              href={`https://wa.me/55${u.phone.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-0.5 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 rounded"
                              title="Enviar mensagem no WhatsApp"
                            >
                              <MessageSquare className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5">
                        {isSystemAdmin ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 dark:bg-purple-950/35 text-purple-700 dark:text-purple-400 rounded-md font-bold text-[10px] uppercase">
                            <ShieldAlert className="w-3 h-3" />
                            Dono / Admin
                          </span>
                        ) : isActive ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/35 text-emerald-700 dark:text-emerald-400 rounded-md font-bold text-[10px] uppercase">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              Premium Ativo
                            </span>
                            {u.licenseExpiresAt && (
                              <p className="text-[9px] text-zinc-400 block font-normal">
                                Expira em: {new Date(u.licenseExpiresAt).toLocaleDateString('pt-BR')}
                              </p>
                            )}
                          </div>
                        ) : u.status === 'trial' ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 rounded-md font-bold text-[10px] uppercase">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                              Período de Teste
                            </span>
                            {u.trialEndsAt && (
                              <p className="text-[9px] text-zinc-400 block font-normal">
                                Teste até: {new Date(u.trialEndsAt).toLocaleDateString('pt-BR')}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 rounded-md font-bold text-[10px] uppercase">
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400"></span>
                            Inativo / Pendente
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 text-right">
                        {!isSystemAdmin && (
                          <button
                            onClick={() => handleToggleLicense(u.id, isActive ? 'active' : 'pending')}
                            className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                              isActive 
                                ? 'bg-rose-50 dark:bg-rose-950/25 hover:bg-rose-100 text-rose-600 dark:text-rose-400' 
                                : 'bg-emerald-50 dark:bg-emerald-950/25 hover:bg-emerald-100 text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            {isActive ? 'Revogar Acesso' : 'Ativar Premium'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
