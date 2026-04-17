import React from 'react';
import { X, Calendar, Building, Info, DollarSign, Fingerprint, MapPin, Tag, FileText, TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';
import { FGTSRecord } from '../types/fgts';
import { formatCompetencia } from '../lib/csvParser';
import { formatCurrency, normalizeCPF } from '../lib/utils';

interface FGTSDetailModalProps {
  onClose: () => void;
  cpf: string;
  competence: string;
  records: FGTSRecord[];
}

export function FGTSDetailModal({ onClose, cpf, competence, records }: FGTSDetailModalProps) {
  const normCpf = normalizeCPF(cpf);
  
  // Filter by both CPF and Competence
  const workerRecords = records.filter(r => 
    normalizeCPF(r.cpf) === normCpf && 
    r.tipo === 'pago' &&
    formatCompetencia(r.competencia_apuracao) === competence
  );
  
  const workerName = workerRecords[0]?.nome_trabalhador || 'Trabalhador';
  
  // The user requested that "Total Pago na Guia" should be the sum of the "Total" column
  // which includes FGTS Month + Juros + Multa + Atualização Monetária.
  const totalCompetence = workerRecords.reduce((acc, r) => acc + (r.total || 0), 0);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white dark:bg-card-dark rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl border border-border-light dark:border-border-dark flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-border-light dark:border-border-dark flex items-center justify-between bg-bg-light/50 dark:bg-bg-dark/50">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shadow-inner">
              <Building className="text-primary w-8 h-8" />
            </div>
            <div>
              <h3 className="text-2xl font-display font-bold text-text-light dark:text-text-dark">
                Detalhamento de FGTS
              </h3>
              <p className="text-sm text-text-muted-light dark:text-text-muted-dark font-medium flex items-center gap-2">
                <span className="font-bold text-primary">{workerName}</span>
                <span className="opacity-30">•</span>
                <span>CPF: {cpf}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 hover:bg-slate-200 dark:hover:bg-slate-700/50 rounded-full transition-all hover:rotate-90"
          >
            <X className="w-6 h-6 text-text-muted-light dark:text-text-muted-dark" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-8 overflow-y-auto bg-slate-50/30 dark:bg-bg-dark/30">
          {workerRecords.length > 0 ? (
            <div className="space-y-8">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-border-light dark:border-border-dark shadow-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    <span className="text-xs font-bold text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider">Competência</span>
                  </div>
                  <p className="text-2xl font-display font-bold text-text-light dark:text-text-dark">{competence}</p>
                </div>
                <div className="bg-primary/5 p-5 rounded-2xl border border-primary/10 shadow-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <DollarSign className="w-5 h-5 text-primary" />
                    <span className="text-xs font-bold text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider">Total Pago na Guia</span>
                  </div>
                  <p className="text-2xl font-display font-bold text-primary">{formatCurrency(totalCompetence)}</p>
                </div>
              </div>

              {/* Detail Items */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-text-muted-light dark:text-text-muted-dark uppercase tracking-widest px-1">Lançamentos Detalhados</h4>
                
                {workerRecords.map((r, idx) => (
                  <div key={idx} className="bg-white dark:bg-slate-800 rounded-2xl border border-border-light dark:border-border-dark shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300" style={{ animationDelay: `${idx * 50}ms` }}>
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/40 border-b border-border-light dark:border-border-dark flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <Tag className="w-4 h-4 text-primary" />
                        <div>
                          <span className="text-[10px] block font-bold text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider leading-none mb-1">Tipo Depósito</span>
                          <span className="font-bold text-text-light dark:text-text-dark">{r.tipo_deposito}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] block font-bold text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider leading-none mb-1">FGTS Mês</span>
                        <span className="font-mono font-bold text-lg text-primary">{formatCurrency(r.valor_fgts_na_guia)}</span>
                      </div>
                    </div>
                    
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-text-muted-light dark:text-text-muted-dark uppercase flex items-center gap-1.5">
                          <Fingerprint className="w-3 h-3" /> Matrícula
                        </span>
                        <p className="text-sm font-bold text-text-light dark:text-text-dark font-mono">{r.matricula || '-'}</p>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-text-muted-light dark:text-text-muted-dark uppercase flex items-center gap-1.5">
                          <MapPin className="w-3 h-3" /> Estabelecimento
                        </span>
                        <p className="text-sm font-bold text-text-light dark:text-text-dark truncate" title={r.estabelecimento}>{r.estabelecimento || '-'}</p>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-text-muted-light dark:text-text-muted-dark uppercase flex items-center gap-1.5">
                          <DollarSign className="w-3 h-3" /> Base Remuneração
                        </span>
                        <p className="text-sm font-bold text-text-light dark:text-text-dark font-mono">
                          {r.base_remuneracao_total ? formatCurrency(r.base_remuneracao_total) : '-'}
                        </p>
                      </div>

                      {r.juros !== undefined && r.juros > 0 && (
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-text-muted-light dark:text-text-muted-dark uppercase">Juros</span>
                          <p className="text-sm font-bold text-text-light dark:text-text-dark font-mono text-amber-600">{formatCurrency(r.juros)}</p>
                        </div>
                      )}

                      {r.atualizacao_monetaria !== undefined && r.atualizacao_monetaria > 0 && (
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-text-muted-light dark:text-text-muted-dark uppercase flex items-center gap-1.5">
                             <TrendingUp className="w-3 h-3" /> Atualização Mon.
                          </span>
                          <p className="text-sm font-bold text-text-light dark:text-text-dark font-mono text-amber-600">{formatCurrency(r.atualizacao_monetaria)}</p>
                        </div>
                      )}

                      {r.multa !== undefined && r.multa > 0 && (
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-text-muted-light dark:text-text-muted-dark uppercase">Multa</span>
                          <p className="text-sm font-bold text-text-light dark:text-text-dark font-mono text-amber-600">{formatCurrency(r.multa)}</p>
                        </div>
                      )}

                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-text-muted-light dark:text-text-muted-dark uppercase flex items-center gap-1.5">
                          <FileText className="w-3 h-3" /> Recibo eSocial
                        </span>
                        <p className="text-sm font-bold text-text-light dark:text-text-dark truncate" title={r.origem}>{r.origem || '-'}</p>
                      </div>

                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-24">
              <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                <Info className="w-10 h-10 text-text-muted-light" />
              </div>
              <h4 className="text-xl font-bold text-text-light dark:text-text-dark mb-2">Nenhum registro encontrado</h4>
              <p className="text-text-muted-light dark:text-text-muted-dark max-w-xs mx-auto">Não encontramos registros de pagamento para esta competência e trabalhador.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border-light dark:border-border-dark bg-white dark:bg-slate-900 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-8 py-3 bg-primary text-white rounded-2xl font-bold hover:bg-primary-hover transition-all shadow-lg shadow-primary/20 active:scale-95"
          >
            Fechar Detalhes
          </button>
        </div>
      </motion.div>
    </div>
  );
}
