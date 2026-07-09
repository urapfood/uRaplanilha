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
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface AdminLicensesTabProps {
  currentUser: any;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null, currentUser: any) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentUser?.uid,
      email: currentUser?.email,
      emailVerified: currentUser?.emailVerified,
      isAnonymous: currentUser?.isAnonymous,
      tenantId: currentUser?.tenantId,
      providerInfo: currentUser?.providerData?.map((provider: any) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export default function AdminLicensesTab({ currentUser, showToast }: AdminLicensesTabProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [users, setUsers] = useState<any[]>([]);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [activeAdminTab, setActiveAdminTab] = useState<'licenses' | 'feedbacks'>('licenses');

  const fetchAdminData = async () => {
    setIsRefreshing(true);
    try {
      const usersRef = collection(db, 'users');
      const snapshot = await getDocs(usersRef);
      const usersList: any[] = [];
      snapshot.forEach(doc => {
        usersList.push({ id: doc.id, ...doc.data() });
      });
      setUsers(usersList);

      const feedbacksRef = collection(db, 'feedbacks');
      const feedbacksSnapshot = await getDocs(feedbacksRef);
      const feedbacksList: any[] = [];
      feedbacksSnapshot.forEach(doc => {
        feedbacksList.push({ id: doc.id, ...doc.data() });
      });
      setFeedbacks(feedbacksList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (err: any) {
      if (err.message && err.message.includes('permission')) {
        try {
          handleFirestoreError(err, OperationType.LIST, 'users', currentUser);
        } catch (wrappedErr: any) {
           showToast('Acesso negado: você não tem permissão de administrador.', 'error');
           console.error(wrappedErr.message);
        }
      } else {
        console.error(err);
        showToast('Erro ao carregar dados de administração.', 'error');
      }
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

    try {
      const userRef = doc(db, 'users', targetUserId);
      
      if (action === 'activate') {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);
        await setDoc(userRef, {
          premium: true,
          status: 'active',
          licenseStatus: 'active',
          licenseExpiresAt: expiresAt.toISOString(),
          updatedAt: new Date().toISOString(),
          isBackendUpdate: true
        }, { merge: true });
      } else {
        await setDoc(userRef, {
          premium: false,
          status: 'pending',
          licenseStatus: 'pending',
          licenseExpiresAt: null,
          updatedAt: new Date().toISOString(),
          isBackendUpdate: true
        }, { merge: true });
      }

      showToast(`Licença ${action === 'activate' ? 'ativada' : 'removida'} com sucesso!`);
      // Reload lists
      fetchAdminData();
    } catch (err: any) {
      if (err.message && err.message.includes('permission')) {
        try {
          handleFirestoreError(err, OperationType.UPDATE, `users/${targetUserId}`, currentUser);
        } catch (wrappedErr: any) {
           showToast('Acesso negado: você não tem permissão para alterar licenças.', 'error');
        }
      } else {
        showToast('Erro ao modificar licença.', 'error');
      }
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

      <div className="flex border-b border-zinc-200 dark:border-zinc-800">
        <button
          onClick={() => setActiveAdminTab('licenses')}
          className={`pb-3 px-4 text-sm font-bold transition-all ${
            activeAdminTab === 'licenses'
              ? 'border-b-2 border-brand-tomato text-brand-tomato'
              : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
          }`}
        >
          Licenças e Vendas
        </button>
        <button
          onClick={() => setActiveAdminTab('feedbacks')}
          className={`pb-3 px-4 text-sm font-bold transition-all ${
            activeAdminTab === 'feedbacks'
              ? 'border-b-2 border-brand-tomato text-brand-tomato'
              : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
          }`}
        >
          Dúvidas e Feedbacks ({feedbacks.length})
        </button>
      </div>

      {activeAdminTab === 'licenses' && (
        <>
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
                            {u.asaasCustomerId && (
                              <span className="inline-flex items-center gap-1 ml-2 px-2 py-0.5 bg-blue-100 dark:bg-blue-950/35 text-blue-700 dark:text-blue-400 rounded-md font-bold text-[10px] uppercase">
                                💰 Pagante (Asaas)
                              </span>
                            )}
                            {u.updatedAt && (
                              <p className="text-[9px] text-zinc-400 block font-normal mt-1">
                                Ativado em: {new Date(u.updatedAt).toLocaleDateString('pt-BR')}
                              </p>
                            )}
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
                            {u.trialStartedAt && (
                              <p className="text-[9px] text-zinc-400 block font-normal mt-1">
                                Início: {new Date(u.trialStartedAt).toLocaleDateString('pt-BR')}
                              </p>
                            )}
                            {u.trialEndsAt && (
                              <p className="text-[9px] text-zinc-400 block font-normal">
                                Fim: {new Date(u.trialEndsAt).toLocaleDateString('pt-BR')}
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 rounded-md font-bold text-[10px] uppercase">
                              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400"></span>
                              Inativo / Pendente
                            </span>
                            {u.updatedAt && (
                              <p className="text-[9px] text-zinc-400 block font-normal mt-1">
                                Revogado em: {new Date(u.updatedAt).toLocaleDateString('pt-BR')}
                              </p>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 text-right space-y-2">
                        {!isSystemAdmin && (
                          <div className="flex flex-col items-end gap-2">
                            <button
                              onClick={() => handleToggleLicense(u.id, isActive ? 'active' : 'pending')}
                              className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer w-full max-w-[120px] text-center ${
                                isActive 
                                  ? 'bg-rose-50 dark:bg-rose-950/25 hover:bg-rose-100 text-rose-600 dark:text-rose-400' 
                                  : 'bg-emerald-50 dark:bg-emerald-950/25 hover:bg-emerald-100 text-emerald-600 dark:text-emerald-400'
                              }`}
                            >
                              {isActive ? 'Revogar Acesso' : 'Ativar Premium'}
                            </button>
                          </div>
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
        </>
      )}

      {activeAdminTab === 'feedbacks' && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
            Dúvidas e Feedbacks
          </h3>
          {feedbacks.length === 0 ? (
            <div className="py-20 text-center text-zinc-400 text-xs">Nenhum feedback recebido.</div>
          ) : (
            <div className="space-y-4">
              {feedbacks.map(f => (
                <div key={f.id} className="p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-100 dark:border-zinc-800 flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[10px] uppercase mb-1 ${
                        f.type === 'question' 
                          ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400'
                          : 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400'
                      }`}>
                        {f.type === 'question' ? 'Dúvida' : 'Feedback'}
                      </span>
                      <span className="ml-2 text-[10px] font-mono text-zinc-400 font-bold tracking-wider">
                        #{f.protocol || f.id.substring(0, 8).toUpperCase()}
                      </span>
                      <p className="font-extrabold text-zinc-950 dark:text-white text-sm mt-1">{f.userName}</p>
                      <p className="text-[10px] text-zinc-400">{f.userEmail}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[10px] text-zinc-400">
                        {new Date(f.createdAt).toLocaleString('pt-BR')}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase mt-1 ${
                        f.status === 'resolved' 
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : 'bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300'
                      }`}>
                        {f.status === 'resolved' ? 'Respondido' : 'Aguardando'}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300 mt-2 bg-white dark:bg-zinc-900 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 whitespace-pre-wrap">
                    {f.message}
                  </p>
                  
                  {f.status !== 'resolved' && (
                    <div className="mt-3 flex flex-col gap-2">
                      <textarea
                        value={replyTexts[f.id] || ''}
                        onChange={(e) => setReplyTexts(prev => ({ ...prev, [f.id]: e.target.value }))}
                        placeholder="Digite sua resposta aqui..."
                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white text-xs rounded-lg px-3 py-2 outline-none focus:border-brand-tomato focus:ring-1 focus:ring-brand-tomato/20 resize-none transition-all"
                        rows={2}
                      />
                      <div className="flex justify-end">
                        <button 
                          onClick={async () => {
                            try {
                              const replyText = replyTexts[f.id] || '';
                              await setDoc(doc(db, 'feedbacks', f.id), { status: 'resolved', replyText }, { merge: true });
                              showToast('Chamado marcado como respondido', 'success');
                              const protocol = f.protocol || f.id.substring(0, 8).toUpperCase();
                              
                              let bodyText = `Olá ${f.userName}, sobre o seu chamado #${protocol}:\n\n`;
                              if (replyText) {
                                bodyText += `${replyText}\n\n`;
                              }
                              const text = encodeURIComponent(bodyText);
                              window.open(`mailto:${f.userEmail}?subject=Resposta Chamado #${protocol} - U-Rap Planilha&body=${text}`, '_blank');
                              
                              // Update local state
                              const index = feedbacks.findIndex(item => item.id === f.id);
                              if (index > -1) {
                                const newList = [...feedbacks];
                                newList[index].status = 'resolved';
                                newList[index].replyText = replyText;
                                setFeedbacks(newList);
                              }
                            } catch (e) {
                              showToast('Erro ao atualizar chamado', 'error');
                            }
                          }}
                          className="px-3 py-1.5 bg-brand-tomato hover:bg-brand-tomato/90 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-sm"
                        >
                          Marcar como Respondido
                        </button>
                      </div>
                    </div>
                  )}
                  {f.status === 'resolved' && f.replyText && (
                    <div className="mt-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 p-3 rounded-lg">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mb-1">
                        Sua Resposta
                      </span>
                      <p className="text-xs text-emerald-800 dark:text-emerald-200 whitespace-pre-wrap">
                        {f.replyText}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
