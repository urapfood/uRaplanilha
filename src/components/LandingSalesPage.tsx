import React from 'react';
import { 
  Sparkles, 
  Check, 
  ArrowRight, 
  Percent, 
  TrendingUp, 
  Calculator, 
  FileText, 
  ShoppingCart, 
  Layers, 
  ShieldCheck, 
  Smartphone, 
  Zap, 
  HelpCircle,
  MessageSquare,
  AlertCircle
} from 'lucide-react';

interface LandingSalesPageProps {
  onStartTrial: () => void;
  onLogin: () => void;
}

export default function LandingSalesPage({ onStartTrial, onLogin }: LandingSalesPageProps) {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-100 flex flex-col font-sans transition-colors duration-300 antialiased">
      
      {/* Dynamic Header */}
      <header className="sticky top-0 z-50 bg-white/85 dark:bg-zinc-900/85 backdrop-blur-md border-b border-zinc-200/80 dark:border-zinc-800/80 px-6 py-4 transition-all">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img 
              src="https://i.imgur.com/MVE864o.png" 
              alt="uRapFood Logo" 
              className="w-8 h-8 object-contain"
              referrerPolicy="no-referrer"
            />
            <span className="text-lg font-black tracking-tight text-zinc-900 dark:text-white">
              uRapFood <span className="text-brand-tomato font-extrabold text-sm px-1.5 py-0.5 bg-brand-tomato/10 rounded-md">Gestor</span>
            </span>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={onLogin}
              className="text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:text-brand-tomato dark:hover:text-white transition-all cursor-pointer"
            >
              Já sou cliente
            </button>
            <button 
              onClick={onStartTrial}
              className="px-4 py-2 bg-brand-tomato hover:bg-brand-tomato/90 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-brand-tomato/10 cursor-pointer"
            >
              Testar Grátis
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="px-6 py-16 md:py-24 text-center max-w-4xl mx-auto space-y-8 animate-fade-in">
        
        {/* Trial Badge */}
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-brand-tomato/10 text-brand-tomato rounded-full text-xs font-extrabold uppercase tracking-wider animate-bounce">
          <Sparkles className="w-3.5 h-3.5" />
          7 Dias Grátis • Cancele quando quiser
        </div>

        {/* Catchy Headline */}
        <h1 className="text-3xl md:text-5xl font-black text-zinc-950 dark:text-white tracking-tight leading-[1.1] md:max-w-3xl mx-auto">
          Pare de perder dinheiro no <span className="text-brand-tomato underline decoration-wavy decoration-3 underline-offset-4">iFood</span> por falta de precificação!
        </h1>

        {/* Captivating Subheadline */}
        <p className="text-sm md:text-base text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto leading-relaxed font-medium">
          Diga adeus às planilhas complexas. O uRapFood foi desenhado sob medida para donos de restaurantes e lojas no iFood descobrirem a <span className="font-bold text-zinc-800 dark:text-zinc-200">margem real de lucro</span> de cada produto, considerando taxas abusivas, custos fixos e variáveis de forma automática.
        </p>

        {/* Pricing Notice */}
        <div className="text-center space-y-1">
          <p className="text-xs font-extrabold text-zinc-400 uppercase tracking-widest">Acesso total e imediato por apenas</p>
          <div className="flex items-center justify-center gap-1">
            <span className="text-sm font-bold text-zinc-400">R$</span>
            <span className="text-4xl font-black text-zinc-900 dark:text-white tracking-tighter">15,90</span>
            <span className="text-sm font-bold text-zinc-400">/mês</span>
          </div>
          <p className="text-[11px] text-zinc-400">Sem contrato, sem fidelidade. Cancele com um clique.</p>
        </div>

        {/* Call to Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto pt-4">
          <button
            onClick={onStartTrial}
            className="flex-1 bg-brand-tomato hover:bg-brand-tomato/95 text-white font-black text-xs uppercase tracking-wider py-4 px-6 rounded-xl shadow-lg shadow-brand-tomato/15 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Começar teste gratuito</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Safety Badges */}
        <div className="flex items-center justify-center gap-6 text-[11px] font-bold text-zinc-400 pt-2">
          <div className="flex items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Sem Taxa de Cancelamento</span>
          </div>
          <div className="flex items-center gap-1">
            <Zap className="w-4 h-4 text-amber-500" />
            <span>Ativação Instantânea</span>
          </div>
        </div>
      </section>

      {/* Pain Points Section */}
      <section className="bg-zinc-100 dark:bg-zinc-900 border-y border-zinc-200/80 dark:border-zinc-800/80 py-16 px-6">
        <div className="max-w-5xl mx-auto space-y-12">
          
          <div className="text-center space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-brand-tomato">O Cenário Real</span>
            <h2 className="text-2xl font-black text-zinc-950 dark:text-white tracking-tight">
              Você sabe para onde está indo o dinheiro da sua loja no iFood?
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xl mx-auto">
              Vender muito não significa ter lucro. Se você comete algum desses erros, sua operação está em risco:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Pain 1 */}
            <div className="bg-white dark:bg-zinc-850 p-6 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 space-y-4">
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/20 text-rose-500 flex items-center justify-center font-black">
                %
              </div>
              <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white">Taxas e Promoções Invisíveis</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">
                O iFood cobra comissão sobre a venda, taxa de transação e ainda "sugere" cupons de desconto. Se você não embutir isso no preço de forma científica, você estará pagando para trabalhar.
              </p>
            </div>

            {/* Pain 2 */}
            <div className="bg-white dark:bg-zinc-850 p-6 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 space-y-4">
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/20 text-rose-500 flex items-center justify-center font-black">
                <Calculator className="w-5 h-5" />
              </div>
              <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white">Ficha Técnica "No Olhômetro"</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">
                Você sabe quanto custa cada grama de queijo, hambúrguer, embalagem e gás que vão no seu prato? Sem uma ficha técnica que atualize automaticamente, o aumento dos insumos engole o seu lucro.
              </p>
            </div>

            {/* Pain 3 */}
            <div className="bg-white dark:bg-zinc-850 p-6 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 space-y-4">
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/20 text-rose-500 flex items-center justify-center font-black">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white">DRE e Custos Misturados</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">
                Aluguel, luz, salários, embalagens extras e impostos devem ser diluídos de forma exata na sua margem. Misturar as contas pessoais com as da empresa é a principal causa de falência de deliveries.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* Solutions / Features Section */}
      <section className="py-20 px-6 max-w-5xl mx-auto space-y-16">
        
        <div className="text-center space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">Como uRapFood te ajuda</span>
          <h2 className="text-2xl font-black text-zinc-950 dark:text-white tracking-tight">
            Ferramentas fáceis que transformam faturamento em lucro real
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xl mx-auto">
            Não precisa ser expert em finanças. Nosso painel calcula tudo para você focar no que faz de melhor: comida boa.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Feature 1 */}
          <div className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs space-y-3.5">
            <div className="p-2.5 bg-brand-tomato/10 text-brand-tomato w-fit rounded-xl">
              <Calculator className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white">Simulador de Margem Real</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">
              Insira o custo de produção do seu prato, marque se vende pelo iFood (comissão/taxas) e veja na hora o markup necessário para obter a margem desejada.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs space-y-3.5">
            <div className="p-2.5 bg-brand-tomato/10 text-brand-tomato w-fit rounded-xl">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white">Ficha Técnica Precisa</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">
              Cadastre insumos (peso/medida) e agrupe-os em receitas. Se o preço do tomate subir, o custo de todas as suas pizzas é atualizado instantaneamente!
            </p>
          </div>

          {/* Feature 3 */}
          <div className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs space-y-3.5">
            <div className="p-2.5 bg-brand-tomato/10 text-brand-tomato w-fit rounded-xl">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white">Importador Automático iFood</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">
              Importe o relatório de vendas do seu portal de parceiro iFood. O sistema lê as taxas aplicadas, cupons, reembolsos e calcula a receita líquida sem esforço.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs space-y-3.5">
            <div className="p-2.5 bg-brand-tomato/10 text-brand-tomato w-fit rounded-xl">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white">PDV e Histórico de Caixa</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">
              Registre pedidos presenciais, de balcão ou whatsapp de forma rápida. O sistema abate o estoque de ingredientes das fichas técnicas e soma no faturamento do dia.
            </p>
          </div>

          {/* Feature 5 */}
          <div className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs space-y-3.5">
            <div className="p-2.5 bg-brand-tomato/10 text-brand-tomato w-fit rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white">DRE e Relatórios Visuais</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">
              Visualize gráficos de vendas diárias, mensais e distribuição de despesas. Saiba exatamente qual é o seu Lucro Líquido final no final de cada mês.
            </p>
          </div>

          {/* Feature 6 */}
          <div className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs space-y-3.5">
            <div className="p-2.5 bg-brand-tomato/10 text-brand-tomato w-fit rounded-xl">
              <Smartphone className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white">Suporte ao Dono de Delivery</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">
              Focado 100% na simplicidade. Desenvolvido para funcionar em computadores e celulares de forma veloz e descomplicada.
            </p>
          </div>

        </div>
      </section>

      {/* Visual Mockup Preview Area */}
      <section className="bg-zinc-100 dark:bg-zinc-900 py-16 px-6 text-center border-y border-zinc-200/80 dark:border-zinc-800/80">
        <div className="max-w-4xl mx-auto space-y-6">
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 block">Preview do Sistema</span>
          <h2 className="text-2xl font-black text-zinc-950 dark:text-white tracking-tight">Uma interface moderna, rápida e intuitiva</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
            Organizado em abas simples para você alternar entre PDV, Simulador de Preço, iFood e Ficha Técnica com apenas um toque.
          </p>
          <div className="pt-4 max-w-3xl mx-auto">
            <img 
              src="https://i.imgur.com/vHqB5K3.jpg" 
              alt="uRapFood Preview Mockup" 
              className="rounded-2xl shadow-2xl border border-zinc-250 dark:border-zinc-800 mx-auto object-cover max-h-[360px] w-full"
              referrerPolicy="no-referrer"
              onError={(e) => {
                // Fail-safe image replacement
                e.currentTarget.src = "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80";
              }}
            />
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-6 max-w-3xl mx-auto space-y-12">
        <div className="text-center space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-brand-tomato">Dúvidas Frequentes</span>
          <h2 className="text-2xl font-black text-zinc-950 dark:text-white tracking-tight">Perguntas Comuns</h2>
        </div>

        <div className="space-y-6">
          
          <div className="space-y-1.5">
            <h4 className="text-xs font-black text-zinc-900 dark:text-white flex items-center gap-1.5 uppercase">
              <HelpCircle className="w-4 h-4 text-brand-tomato shrink-0" />
              Como funcionam os 7 dias grátis?
            </h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium pl-5 leading-relaxed">
              Você cria sua conta, ativa sua licença de teste de forma simples e tem acesso TOTAL a todas as ferramentas por 7 dias. Não cobramos nada hoje. Se você decidir que o sistema não é para você, basta clicar em "Cancelar" a qualquer momento no seu painel de usuário sem qualquer cobrança.
            </p>
          </div>

          <div className="space-y-1.5">
            <h4 className="text-xs font-black text-zinc-900 dark:text-white flex items-center gap-1.5 uppercase">
              <HelpCircle className="w-4 h-4 text-brand-tomato shrink-0" />
              Preciso cadastrar cartão de crédito para testar?
            </h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium pl-5 leading-relaxed">
              Não! O cadastro é simples e rápido, sem necessidade de dados de cobrança para iniciar o seu teste gratuito.
            </p>
          </div>

          <div className="space-y-1.5">
            <h4 className="text-xs font-black text-zinc-900 dark:text-white flex items-center gap-1.5 uppercase">
              <HelpCircle className="w-4 h-4 text-brand-tomato shrink-0" />
              A importação do iFood é segura?
            </h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium pl-5 leading-relaxed">
              Totalmente. Você apenas exporta a planilha padrão de vendas do seu portal do iFood Parceiro e faz o upload direto no uRapFood. Nós não solicitamos sua senha do iFood e nenhum dado sensível da sua conta bancária é acessado.
            </p>
          </div>

          <div className="space-y-1.5">
            <h4 className="text-xs font-black text-zinc-900 dark:text-white flex items-center gap-1.5 uppercase">
              <HelpCircle className="w-4 h-4 text-brand-tomato shrink-0" />
              Posso usar no celular?
            </h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium pl-5 leading-relaxed">
              Sim! O sistema foi planejado com tecnologia responsiva para rodar lindamente tanto na tela do seu computador quanto no seu smartphone, facilitando o uso no dia a dia da cozinha do restaurante.
            </p>
          </div>

        </div>
      </section>

      {/* Bottom CTA Block */}
      <section className="bg-gradient-to-br from-brand-tomato to-rose-600 py-16 px-6 text-white text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="max-w-xl mx-auto space-y-6 relative z-10">
          <h2 className="text-2xl md:text-3xl font-black tracking-tight leading-snug">
            Comece a valorizar seu trabalho e multiplique seu lucro hoje mesmo!
          </h2>
          <p className="text-xs text-rose-100 max-w-sm mx-auto leading-relaxed font-medium">
            Leve apenas 2 minutos para se cadastrar e iniciar seu teste gratuito. Descubra quais pratos dão lucro e quais dão prejuízo de forma imediata.
          </p>
          
          <div className="pt-2">
            <button
              onClick={onStartTrial}
              className="bg-white hover:bg-zinc-50 text-brand-tomato font-black text-xs uppercase tracking-wider py-4 px-8 rounded-xl shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all inline-flex items-center gap-2 cursor-pointer"
            >
              <span>Começar teste gratuito</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[10px] text-rose-200">Apenas R$ 15,90/mês após o teste de 7 dias grátis</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-zinc-900 text-zinc-500 py-12 px-6 border-t border-zinc-850 text-xs">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <img 
              src="https://i.imgur.com/MVE864o.png" 
              alt="Logo" 
              className="w-6 h-6 object-contain brightness-90"
              referrerPolicy="no-referrer"
            />
            <span className="font-extrabold text-zinc-300">uRapFood</span>
          </div>
          <p className="text-[11px] text-zinc-500">
            &copy; 2026 uRapFood Gestor • Todos os direitos reservados. Feito para ajudar os donos de delivery a lucrarem de verdade.
          </p>
        </div>
      </footer>

    </div>
  );
}
