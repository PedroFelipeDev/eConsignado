/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { User } from '@supabase/supabase-js';
import { Consignado } from './types/consignado';
import { PagamentoConsignado } from './types/pagamento';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { ConsignadoTable } from './components/ConsignadoTable';
import { FileUploader } from './components/FileUploader';
import { PaymentUploader } from './components/PaymentUploader';
import { PaymentsManager } from './components/PaymentsManager';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LogIn, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Consignado[]>([]);
  const [payments, setPayments] = useState<PagamentoConsignado[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'table' | 'import' | 'import-payment' | 'payments-manager'>('dashboard');
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('darkMode') === 'true';
    }
    return false;
  });

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    if (darkMode) {
      root.classList.add('dark');
      body.classList.add('dark');
    } else {
      root.classList.remove('dark');
      body.classList.remove('dark');
    }
    localStorage.setItem('darkMode', darkMode.toString());
  }, [darkMode]);

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setData([]);
      setPayments([]);
      return;
    }

    // Fetch Consignados
    const fetchConsignados = async () => {
      const { data: consignados, error } = await supabase
        .from('consignados')
        .select('*')
        .eq('usuario_id', user.id)
        .order('importado_em', { ascending: false });

      if (error) {
        console.error('Error fetching consignados:', error);
      } else {
        // Map snake_case to camelCase if needed, or update components
        // For now, mapping to maintain compatibility
        const mapped = (consignados || []).map(c => ({
          id: c.id,
          contrato: c.contrato,
          cpf: c.cpf,
          nomeTrabalhador: c.nome_trabalhador,
          matricula: c.matricula,
          "ifConcessora.codigo": c.if_concessora_codigo,
          "ifConcessora.descricao": c.if_concessora_descricao,
          "inscricaoEmpregador.codigo": c.inscricao_empregador_codigo,
          "inscricaoEmpregador.descricao": c.inscricao_empregador_descricao,
          numeroInscricaoEmpregador: c.numero_inscricao_empregador,
          nomeEmpregador: c.nome_empregador,
          dataInicioContrato: c.data_inicio_contrato,
          dataFimContrato: c.data_fim_contrato,
          competenciaInicioDesconto: c.competencia_inicio_desconto,
          competenciaFimDesconto: c.competencia_fim_desconto,
          totalParcelas: c.total_parcelas,
          valorParcela: c.valor_parcela,
          valorEmprestimo: c.valor_emprestimo,
          valorLiberado: c.valor_liberado,
          qtdPagamentos: c.qtd_pagamentos,
          qtdEscrituracoes: c.qtd_escrituracoes,
          "categoriaTrabalhador.codigo": c.categoria_trabalhador_codigo,
          "categoriaTrabalhador.descricao": c.categoria_trabalhador_descricao,
          competencia: c.competencia,
          "inscricaoEstabelecimento.codigo": c.inscricao_estabelecimento_codigo,
          "inscricaoEstabelecimento.descricao": c.inscricao_estabelecimento_descricao,
          numeroInscricaoEstabelecimento: c.numero_inscricao_estabelecimento,
          dataAdmissao: c.data_admissao,
          importadoEm: c.importado_em,
          usuarioId: c.usuario_id
        })) as Consignado[];
        setData(mapped);
      }
    };

    // Fetch Pagamentos
    const fetchPagamentos = async () => {
      const { data: pagamentos, error } = await supabase
        .from('pagamentos')
        .select('*')
        .eq('usuario_id', user.id)
        .order('importado_em', { ascending: false });

      if (error) {
        console.error('Error fetching pagamentos:', error);
      } else {
        const mapped = (pagamentos || []).map(p => ({
          id: p.id,
          usuarioId: p.usuario_id,
          importadoEm: p.importado_em,
          competencia: p.competencia,
          vencimento: p.vencimento,
          nomeTrabalhador: p.nome_trabalhador,
          matricula: p.matricula,
          cpf: p.cpf,
          contrato: p.contrato,
          instituicaoFinanceira: p.instituicao_financeira,
          valorPago: p.valor_pago,
          numeroGuia: p.numero_guia,
          dataEmissaoGuia: p.data_emissao_guia,
          nomeEmpregador: p.nome_empregador,
          cnpjEmpregador: p.cnpj_empregador
        })) as PagamentoConsignado[];
        setPayments(mapped);
      }
    };

    fetchConsignados();
    fetchPagamentos();

    // Set up real-time subscriptions
    const consignadosSubscription = supabase
      .channel('consignados_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'consignados'
      }, (payload) => {
        console.log('Realtime update (consignados):', payload);
        fetchConsignados();
      })
      .subscribe((status) => {
        console.log('Consignados subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to consignados realtime updates');
        }
      });

    const pagamentosSubscription = supabase
      .channel('pagamentos_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'pagamentos'
      }, (payload) => {
        console.log('Realtime update (pagamentos):', payload);
        fetchPagamentos();
      })
      .subscribe((status) => {
        console.log('Pagamentos subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to pagamentos realtime updates');
        }
      });

    return () => {
      supabase.removeChannel(consignadosSubscription);
      supabase.removeChannel(pagamentosSubscription);
    };
  }, [user]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsLoggingIn(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
    } catch (error: any) {
      console.error("Login error:", error);
      setAuthError(error.message || "Erro ao fazer login. Verifique suas credenciais.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => supabase.auth.signOut();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-light dark:bg-bg-dark transition-colors duration-300">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-light dark:bg-bg-dark p-4 transition-colors duration-300">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-card-light dark:bg-card-dark rounded-3xl shadow-xl p-8 text-center border border-border-light dark:border-border-dark transition-all duration-300"
        >
          <div className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary/20">
            <LogIn className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-display font-bold text-text-light dark:text-text-dark mb-2 tracking-tight">eConsignado</h1>
          <p className="text-text-muted-light dark:text-text-muted-dark mb-8 font-medium">Gestão inteligente de empréstimos consignados</p>
          
          <form onSubmit={handleLogin} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-bold text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider mb-1">E-mail</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-bg-light dark:bg-bg-dark rounded-xl border border-border-light dark:border-border-dark focus:ring-2 focus:ring-primary/20 text-text-light dark:text-text-dark placeholder-text-muted-light dark:placeholder-text-muted-dark"
                placeholder="seu@email.com"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider mb-1">Senha</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-bg-light dark:bg-bg-dark rounded-xl border border-border-light dark:border-border-dark focus:ring-2 focus:ring-primary/20 text-text-light dark:text-text-dark placeholder-text-muted-light dark:placeholder-text-muted-dark"
                placeholder="••••••••"
              />
            </div>

            {authError && (
              <p className="text-sm text-red-500 font-medium">{authError}</p>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-primary text-white py-4 rounded-xl font-bold hover:bg-primary-hover transition-all flex items-center justify-center gap-3 shadow-lg shadow-primary/10 disabled:opacity-50"
            >
              {isLoggingIn ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
              Entrar no Sistema
            </button>
          </form>
          
          <p className="mt-6 text-xs text-text-muted-light dark:text-text-muted-dark">
            As credenciais de acesso são fornecidas pelo administrador.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Layout 
        user={user as any} // Cast to any to avoid type mismatch with Firebase User if Layout expects it
        onLogout={handleLogout} 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
      >
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Dashboard data={data} payments={payments} darkMode={darkMode} />
            </motion.div>
          )}
          {activeTab === 'table' && (
            <motion.div
              key="table"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <ConsignadoTable data={data} payments={payments} />
            </motion.div>
          )}
          {activeTab === 'import' && (
            <motion.div
              key="import"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <FileUploader user={user as any} />
            </motion.div>
          )}
          {activeTab === 'import-payment' && (
            <motion.div
              key="import-payment"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <PaymentUploader user={user as any} />
            </motion.div>
          )}
          {activeTab === 'payments-manager' && (
            <motion.div
              key="payments-manager"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <PaymentsManager user={user as any} payments={payments} />
            </motion.div>
          )}
        </AnimatePresence>
      </Layout>
    </ErrorBoundary>
  );
}

