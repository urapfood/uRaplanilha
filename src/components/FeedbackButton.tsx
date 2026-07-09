import React, { useState, useEffect } from 'react';
import { MessageSquarePlus, X, Plus, ChevronLeft, Ticket } from 'lucide-react';
import { auth, db } from '../firebase';
import { collection, addDoc, query, where, getDocs, orderBy } from 'firebase/firestore';

export default function FeedbackButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<'list' | 'new' | 'success'>('list');
  const [type, setType] = useState<'feedback' | 'question'>('question');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  
  const [tickets, setTickets] = useState<any[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [lastProtocol, setLastProtocol] = useState('');

  const fetchTickets = async () => {
    const user = auth.currentUser;
    if (!user) return;
    
    setLoadingTickets(true);
    try {
      const q = query(
        collection(db, 'feedbacks'),
        where('userId', '==', user.uid)
      );
      const snapshot = await getDocs(q);
      const list: any[] = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() });
      });
      // order by createdAt desc locally since we might not have a composite index
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setTickets(list);
    } catch (err) {
      console.error('Error fetching tickets:', err);
    } finally {
      setLoadingTickets(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setView('list');
      fetchTickets();
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    const user = auth.currentUser;
    if (!user) {
      alert('Você precisa estar logado para enviar mensagens.');
      return;
    }

    setSending(true);
    try {
      const protocol = `UP-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      
      await addDoc(collection(db, 'feedbacks'), {
        userId: user.uid,
        userEmail: user.email,
        userName: user.displayName || 'Usuário',
        message: message.trim(),
        type,
        status: 'new',
        protocol,
        createdAt: new Date().toISOString()
      });
      
      setLastProtocol(protocol);
      setView('success');
      setMessage('');
      
      // Auto close or back to list after some time
      setTimeout(() => {
        setView('list');
        fetchTickets();
      }, 4000);
    } catch (error) {
      console.error('Error sending feedback:', error);
      alert('Erro ao enviar mensagem. Tente novamente.');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 p-4 bg-brand-tomato hover:bg-brand-tomato/90 text-white rounded-full shadow-xl shadow-brand-tomato/20 hover:scale-105 transition-all cursor-pointer group flex items-center justify-center"
        title="Ajuda e Suporte"
      >
        <MessageSquarePlus className="w-6 h-6" />
        <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-xs group-hover:ml-3 transition-all duration-300 font-bold text-sm tracking-wide">
          Ajuda & Suporte
        </span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden relative flex flex-col max-h-[85vh]">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 p-2 z-10 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 shrink-0 pr-12">
              {view === 'new' && (
                <button 
                  onClick={() => setView('list')}
                  className="flex items-center gap-1 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 mb-3 text-sm font-bold transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" /> Voltar
                </button>
              )}
              <h2 className="text-xl font-black text-zinc-900 dark:text-white mb-1 flex items-center gap-2">
                {view === 'list' ? 'Meus Chamados' : view === 'success' ? 'Chamado Aberto!' : 'Novo Chamado'}
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {view === 'list' ? 'Acompanhe suas dúvidas e feedbacks.' : view === 'success' ? 'Recebemos sua mensagem com sucesso.' : 'Envie dúvidas, sugestões ou relate um problema.'}
              </p>
            </div>

            <div className="p-6 overflow-y-auto">
              {view === 'list' && (
                <div className="space-y-4">
                  <button 
                    onClick={() => setView('new')}
                    className="w-full flex items-center justify-center gap-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-750 text-zinc-800 dark:text-zinc-200 font-bold py-3 rounded-xl transition-all cursor-pointer border border-dashed border-zinc-300 dark:border-zinc-600 mb-6"
                  >
                    <Plus className="w-4 h-4" />
                    Abrir Novo Chamado
                  </button>
                  
                  {loadingTickets ? (
                    <div className="text-center py-8 text-zinc-400 text-sm font-medium">Carregando chamados...</div>
                  ) : tickets.length === 0 ? (
                    <div className="text-center py-10 flex flex-col items-center justify-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400">
                        <Ticket className="w-5 h-5" />
                      </div>
                      <p className="text-zinc-500 dark:text-zinc-400 text-sm">Você ainda não tem nenhum chamado aberto.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {tickets.map(t => (
                        <div key={t.id} className="p-4 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl relative">
                          <div className="flex justify-between items-start mb-2">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[10px] uppercase ${
                              t.type === 'question' 
                                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                                : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                            }`}>
                              {t.type === 'question' ? 'Dúvida' : 'Feedback'}
                            </span>
                            <span className="text-[10px] text-zinc-400 font-mono font-medium">
                              {t.protocol || t.id.substring(0, 8).toUpperCase()}
                            </span>
                          </div>
                          <p className="text-sm text-zinc-700 dark:text-zinc-300 line-clamp-2 mb-3">
                            {t.message}
                          </p>
                          
                          {t.status === 'resolved' && t.replyText && (
                            <div className="mb-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 p-3 rounded-lg">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mb-1">
                                Resposta do Suporte
                              </span>
                              <p className="text-xs text-emerald-800 dark:text-emerald-200 whitespace-pre-wrap">
                                {t.replyText}
                              </p>
                            </div>
                          )}

                          <div className="flex justify-between items-center text-[10px] font-medium border-t border-zinc-200 dark:border-zinc-700 pt-3 mt-1">
                            <span className="text-zinc-400">
                              {new Date(t.createdAt).toLocaleDateString('pt-BR')} às {new Date(t.createdAt).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full ${
                              t.status === 'resolved' 
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                : 'bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300'
                            }`}>
                              {t.status === 'resolved' ? 'Respondido' : 'Aguardando'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {view === 'new' && (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5 uppercase tracking-wider">
                      Tipo de Atendimento
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setType('question')}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-colors cursor-pointer ${
                          type === 'question'
                            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400'
                            : 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                        }`}
                      >
                        Dúvida / Ajuda
                      </button>
                      <button
                        type="button"
                        onClick={() => setType('feedback')}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-colors cursor-pointer ${
                          type === 'feedback'
                            ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400'
                            : 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                        }`}
                      >
                        Sugestão / Bug
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5 uppercase tracking-wider">
                      Sua Mensagem
                    </label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={5}
                      placeholder={type === 'question' ? 'Descreva sua dúvida detalhadamente para que possamos te ajudar da melhor forma...' : 'Descreva sua sugestão ou o problema que encontrou...'}
                      className="w-full bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white text-sm rounded-xl px-4 py-3 outline-none focus:border-brand-tomato focus:ring-2 focus:ring-brand-tomato/20 resize-none transition-all"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={sending || !message.trim()}
                    className="w-full bg-brand-tomato hover:bg-brand-tomato/90 disabled:opacity-50 text-white font-black py-3 rounded-xl shadow-md transition-all cursor-pointer mt-2"
                  >
                    {sending ? 'Enviando...' : 'Abrir Chamado'}
                  </button>
                </form>
              )}

              {view === 'success' && (
                <div className="py-8 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mb-4">
                    <Ticket className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-black text-zinc-900 dark:text-white mb-2">Chamado Criado!</h3>
                  <p className="text-zinc-600 dark:text-zinc-400 text-sm mb-6">
                    Acompanhe o retorno da nossa equipe pelo painel de chamados.
                  </p>
                  <div className="bg-zinc-100 dark:bg-zinc-800 px-6 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700">
                    <span className="text-xs text-zinc-500 uppercase font-bold tracking-wider block mb-1">Seu Protocolo</span>
                    <span className="text-lg font-mono font-black text-zinc-900 dark:text-white tracking-widest">{lastProtocol}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
