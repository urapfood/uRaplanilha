import React, { useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  Loader2, 
  CheckCircle,
  AlertCircle,
  Building,
  Phone,
  User
} from 'lucide-react';
import logoImg from '../assets/logo.png';

interface AuthScreenProps {
  onSuccess: (user: any) => void;
}

export default function AuthScreen({ onSuccess }: AuthScreenProps) {
  const [isLogin, setIsLogin] = useState<boolean>(true);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [companyName, setCompanyName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (!isLogin) {
      if (!name) {
        setError('Por favor, insira seu nome.');
        return;
      }
      if (!companyName) {
        setError('Por favor, insira o nome da empresa.');
        return;
      }
      if (!phone) {
        setError('Por favor, insira o telefone.');
        return;
      }
      if (password !== confirmPassword) {
        setError('As senhas não coincidem. Verifique se digitou corretamente.');
        return;
      }
    }

    setLoading(true);

    try {
      if (isLogin) {
        // Sign In
        const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
        onSuccess(userCredential.user);
      } else {
        // Sign Up
        const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        
        // Update Firebase Auth Profile with Name
        await updateProfile(userCredential.user, {
          displayName: name.trim()
        });

        // Save additional user info to Firestore
        try {
          const userDocRef = doc(db, 'users', userCredential.user.uid);
          await setDoc(userDocRef, {
            uid: userCredential.user.uid,
            name: name.trim(),
            companyName: companyName.trim(),
            phone: phone.trim(),
            email: email.trim(),
            createdAt: new Date().toISOString()
          });
        } catch (dbErr) {
          console.error('Failed to save additional user profile in Firestore:', dbErr);
          // Don't block sign-up if just firestore profile doc write failed (e.g. permission or index latency)
        }

        onSuccess(userCredential.user);
      }
    } catch (err: any) {
      console.error('Authentication Error:', err);
      // Friendly messages in Portuguese
      switch (err.code) {
        case 'auth/invalid-email':
          setError('O endereço de e-mail não é válido.');
          break;
        case 'auth/user-disabled':
          setError('Este usuário foi desativado.');
          break;
        case 'auth/user-not-found':
          setError('Nenhum usuário encontrado com este e-mail.');
          break;
        case 'auth/wrong-password':
          setError('Senha incorreta. Tente novamente.');
          break;
        case 'auth/email-already-in-use':
          setError('Este endereço de e-mail já está sendo utilizado.');
          break;
        case 'auth/weak-password':
          setError('A senha fornecida é muito fraca.');
          break;
        default:
          setError(err.message || 'Ocorreu um erro ao realizar a autenticação.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4 transition-colors duration-300">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 shadow-xl relative overflow-hidden">
        {/* Subtle decorative background gradient */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-brand-tomato to-orange-500"></div>

        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-3">
            <img 
              src={logoImg} 
              alt="Logo uRapFood" 
              className="w-16 h-16 object-contain rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white shadow-sm p-1"
              referrerPolicy="no-referrer"
            />
          </div>
          <h1 className="text-2xl font-extrabold text-zinc-950 dark:text-white tracking-tight">
            uRapFood Planilha
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Gestão inteligente de custos, receitas e PDV para seu negócio
          </p>
        </div>

        {/* Title and subtitle */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-zinc-800 dark:text-zinc-200">
            {isLogin ? 'Faça login na sua conta' : 'Crie sua conta grátis'}
          </h2>
          <p className="text-xs text-zinc-400">
            {isLogin 
              ? 'Insira suas credenciais para acessar seus dados separados e seguros.' 
              : 'Comece agora a gerenciar seu cardápio, custos e vendas.'}
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 flex items-start gap-3 animate-fade-in">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div className="text-xs font-medium text-red-700 dark:text-red-300">
              {error}
            </div>
          </div>
        )}

        {/* Authentication Form */}
        <form onSubmit={handleSubmit} className="space-y-4" id="auth-form">
          {!isLogin && (
            <>
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                  Seu Nome
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-zinc-400 dark:text-zinc-500" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Ex: João Silva"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-zinc-100/50 dark:bg-zinc-800/40 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 focus:border-brand-tomato dark:focus:border-brand-tomato text-zinc-800 dark:text-zinc-200 rounded-xl pl-10 pr-4 py-3 text-sm transition-all outline-hidden"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                  Nome da Empresa
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Building className="h-4 w-4 text-zinc-400 dark:text-zinc-500" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Pizzaria Bella Italia"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full bg-zinc-100/50 dark:bg-zinc-800/40 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 focus:border-brand-tomato dark:focus:border-brand-tomato text-zinc-800 dark:text-zinc-200 rounded-xl pl-10 pr-4 py-3 text-sm transition-all outline-hidden"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                  Telefone / WhatsApp
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Phone className="h-4 w-4 text-zinc-400 dark:text-zinc-500" />
                  </div>
                  <input
                    type="tel"
                    required
                    placeholder="Ex: (11) 99999-9999"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-zinc-100/50 dark:bg-zinc-800/40 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 focus:border-brand-tomato dark:focus:border-brand-tomato text-zinc-800 dark:text-zinc-200 rounded-xl pl-10 pr-4 py-3 text-sm transition-all outline-hidden"
                    disabled={loading}
                  />
                </div>
              </div>
            </>
          )}

          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              E-mail
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Mail className="h-4 w-4 text-zinc-400 dark:text-zinc-500" />
              </div>
              <input
                type="email"
                required
                placeholder="seu-email@provedor.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-zinc-100/50 dark:bg-zinc-800/40 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 focus:border-brand-tomato dark:focus:border-brand-tomato text-zinc-800 dark:text-zinc-200 rounded-xl pl-10 pr-4 py-3 text-sm transition-all outline-hidden"
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                {isLogin ? 'Senha' : 'Crie uma Senha'}
              </label>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Lock className="h-4 w-4 text-zinc-400 dark:text-zinc-500" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="******"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-zinc-100/50 dark:bg-zinc-800/40 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 focus:border-brand-tomato dark:focus:border-brand-tomato text-zinc-800 dark:text-zinc-200 rounded-xl pl-10 pr-10 py-3 text-sm transition-all outline-hidden"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                disabled={loading}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {!isLogin && (
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                Repetir a Senha
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-zinc-400 dark:text-zinc-500" />
                </div>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  placeholder="******"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-zinc-100/50 dark:bg-zinc-800/40 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 focus:border-brand-tomato dark:focus:border-brand-tomato text-zinc-800 dark:text-zinc-200 rounded-xl pl-10 pr-10 py-3 text-sm transition-all outline-hidden"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                  disabled={loading}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-tomato hover:bg-brand-tomato/90 text-white py-3 px-4 rounded-xl font-bold text-sm shadow-md shadow-brand-tomato/10 transition-all hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-55 disabled:pointer-events-none"
            id="auth-submit-btn"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processando...</span>
              </>
            ) : (
              <span>{isLogin ? 'Entrar' : 'Cadastrar Minha Conta'}</span>
            )}
          </button>
        </form>

        {/* Toggle Login/Signup */}
        <div className="mt-6 text-center border-t border-zinc-200 dark:border-zinc-800 pt-5">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {isLogin ? 'Não tem uma conta?' : 'Já possui uma conta?'}
          </p>
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError(null);
            }}
            className="mt-1 text-xs font-bold text-brand-tomato hover:underline cursor-pointer"
            disabled={loading}
          >
            {isLogin ? 'Crie uma conta agora' : 'Faça login aqui'}
          </button>
        </div>
      </div>
    </div>
  );
}
