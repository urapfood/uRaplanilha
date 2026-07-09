import React from 'react';
import { 
  LogOut, 
  Sparkles, 
  ShieldCheck,
  MessageSquare,
  Lock,
  Database
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';

interface PaywallScreenProps {
  currentUser: any;
  userProfile: any;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export default function PaywallScreen({ currentUser, userProfile, showToast }: PaywallScreenProps) {
  
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      showToast('Erro ao sair da conta.', 'error');
    }
  };

  const whatsAppText = "Olá! Meu teste gratuito terminou. Gostaria de ativar minha assinatura do uRapFood.";
  const whatsAppLink = `https://wa.me/55996507712?text=${encodeURIComponent(whatsAppText)}`;

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4 transition-colors duration-300">
      <div className="w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl relative overflow-hidden flex flex-col">
        
        {/* Colorful gradient indicator */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-brand-tomato to-orange-500"></div>

        {/* Top Header Row with Logout */}
        <div className="p-4 flex justify-between items-center border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-1.5 text-zinc-900 dark:text-white font-black text-sm tracking-tight">
            <img 
              src="https://i.imgur.com/MVE864o.png" 
              alt="Logo" 
              className="w-6 h-6 object-contain"
              referrerPolicy="no-referrer"
            />
            uRapFood Planilha
          </div>
          <button
            onClick={handleLogout}
            className="px-3 py-1.5 text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-white rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sair da Conta
          </button>
        </div>

        {/* Main Content */}
        <div className="p-8 text-center space-y-6 flex-1">
          
          {/* Main Visual/Badge */}
          <div className="space-y-3">
            <div className="inline-flex items-center justify-center p-3.5 bg-brand-tomato/10 text-brand-tomato rounded-full mb-1">
              <Lock className="w-8 h-8" />
            </div>
            <h1 className="text-xl font-extrabold text-zinc-950 dark:text-white tracking-tight leading-snug">
              Seu período de teste terminou!
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-300 max-w-md mx-auto leading-relaxed">
              Olá, <span className="font-bold text-zinc-900 dark:text-white">{userProfile?.name || currentUser.displayName || 'Parceiro(a)'}</span>! Seu teste gratuito de 7 dias do uRapFood Gestor chegou ao fim.
            </p>
          </div>

          {/* Secure Data Info Box */}
          <div className="bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/60 rounded-2xl p-4 flex items-start gap-3.5 text-left max-w-md mx-auto">
            <Database className="w-5 h-5 text-brand-tomato shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                Seus dados estão protegidos!
              </h4>
              <p className="text-[11px] text-zinc-650 dark:text-zinc-300 leading-relaxed font-medium">
                Não se preocupe: todos os seus custos cadastrados, receitas, fichas técnicas e lançamentos de PDV continuam salvos de forma 100% segura. Ao ativar a assinatura, você retoma tudo exatamente de onde parou.
              </p>
            </div>
          </div>

          {/* Call to Action and WhatsApp Button */}
          <div className="space-y-4 max-w-md mx-auto">
            <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-normal font-medium">
              Fale conosco para realizar o pagamento manual e liberar seu acesso ilimitado imediatamente:
            </p>

            <a
              href={whatsAppLink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-[#25D366] hover:bg-[#20ba5a] text-white font-extrabold text-xs uppercase tracking-wider py-4 px-6 rounded-xl shadow-lg shadow-[#25D366]/15 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2.5 cursor-pointer decoration-none"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Ativar Minha Assinatura via WhatsApp</span>
            </a>

            <div className="text-center space-y-1 pt-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block">Plano Mensal Ilimitado</span>
              <div className="flex items-center justify-center gap-1">
                <span className="text-xs font-extrabold text-zinc-450 dark:text-zinc-400">R$</span>
                <span className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">15,90</span>
                <span className="text-xs font-bold text-zinc-450 dark:text-zinc-400">/mês</span>
              </div>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500">Ativação manual rápida via Pix direto com o suporte.</p>
            </div>
          </div>

        </div>

        {/* Footer Guarantee */}
        <div className="p-4 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-center gap-1.5 text-zinc-400 dark:text-zinc-500 text-[10px] font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
          Liberação de acesso rápida sem complicação ou taxas ocultas
        </div>

      </div>
    </div>
  );
}
