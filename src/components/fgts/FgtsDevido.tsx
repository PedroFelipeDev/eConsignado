import React, { useState, useEffect, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Save, 
  X, 
  AlertCircle, 
  TrendingDown, 
  TrendingUp,
  DollarSign,
  Calendar,
  Filter,
  Loader2,
  FileSpreadsheet,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { formatCurrency, maskCompetence, getYearFromCompetence } from '../../lib/utils';
import { formatCompetencia } from '../../lib/csvParser';
import { FGTSRecord } from '../../types/fgts';
import { generateFGTSReconciliationPDF, generateFGTSReconciliationCSV } from '../../lib/pdf-generator';

interface FgtsDevidoProps {
  user: User;
  fgtsRecords: FGTSRecord[];
}

interface FgtsDevidoRecord {
  id: string;
  competencia: string;
  valor_devido: number;
}

interface FgtsPagoResumo {
  competencia: string;
  total_pago: number;
}

interface FgtsCombinedRecord {
  competencia: string;
  valor_devido: number;
  valor_pago: number;
  saldo: number;
  manual_id: string | null;
}

export function FgtsDevido({ user, fgtsRecords }: FgtsDevidoProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [records, setRecords] = useState<FgtsDevidoRecord[]>([]);
  const [paidResumo, setPaidResumo] = useState<FgtsPagoResumo[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  
  // Form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formCompetencia, setFormCompetencia] = useState('');
  const [formValor, setFormValor] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch manual due values
      const { data: manualData, error: manualError } = await supabase
        .from('fgts_devido')
        .select('*')
        .eq('usuario_id', user.id)
        .order('competencia', { ascending: false });

      if (manualError) throw manualError;

      // 2. Use fgtsRecords from props instead of fetching
      const paidMap = new Map<string, number>();
      fgtsRecords
        .filter(r => r.tipo === 'pago')
        .forEach(item => {
          const comp = formatCompetencia(item.competencia_apuracao);
          const valor = Number(item.valor_fgts_na_guia) || 0;
          paidMap.set(comp, (paidMap.get(comp) || 0) + valor);
        });

      const processedPaid: FgtsPagoResumo[] = Array.from(paidMap.entries()).map(([comp, total]) => ({
        competencia: comp,
        total_pago: total
      }));

      setRecords(manualData || []);
      setPaidResumo(processedPaid);
    } catch (err: any) {
      console.error("Error processing FGTS records:", err);
      setError("Erro ao processar registros de FGTS.");
    } finally {
      setLoading(false);
    }
  }, [user.id, fgtsRecords]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCompetencia || !formValor) return;

    setSaving(true);
    setError(null);

    const normalizedComp = formatCompetencia(formCompetencia);
    const valorNumeric = Number(formValor.replace(/\./g, '').replace(',', '.'));
    
    try {
      if (editingId) {
        const { error: saveError } = await supabase
          .from('fgts_devido')
          .update({
            competencia: normalizedComp,
            valor_devido: valorNumeric
          })
          .eq('id', editingId);
        
        if (saveError) throw saveError;
      } else {
        const { error: saveError } = await supabase
          .from('fgts_devido')
          .upsert({
            usuario_id: user.id,
            competencia: normalizedComp,
            valor_devido: valorNumeric
          }, { onConflict: 'usuario_id, competencia' });

        if (saveError) throw saveError;
      }

      setFormCompetencia('');
      setFormValor('');
      setEditingId(null);
      fetchData();
    } catch (err: any) {
      console.error("Error saving record:", err);
      setError(err.message.includes('unique') ? "Já existe um lançamento para esta competência." : "Erro ao salvar registro.");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (record: FgtsDevidoRecord) => {
    setEditingId(record.id);
    setFormCompetencia(record.competencia);
    setFormValor(record.valor_devido.toFixed(2).replace('.', ','));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente excluir este lançamento?")) return;

    try {
      const { error: delError } = await supabase
        .from('fgts_devido')
        .delete()
        .eq('id', id);

      if (delError) throw delError;
      fetchData();
    } catch (err: any) {
      console.error("Error deleting record:", err);
      setError("Erro ao excluir registro.");
    }
  };

  // Combine data for display
  const combinedData: FgtsCombinedRecord[] = [];
  const allComps = new Set([
    ...records.map(r => r.competencia),
    ...paidResumo.map(p => p.competencia)
  ]);

  allComps.forEach(comp => {
    const manual = records.find(r => r.competencia === comp);
    const paid = paidResumo.find(p => p.competencia === comp);
    const vDevido = manual?.valor_devido || 0;
    const vPago = paid?.total_pago || 0;
    
    combinedData.push({
      competencia: comp,
      valor_devido: vDevido,
      valor_pago: vPago,
      saldo: vDevido - vPago,
      manual_id: manual?.id || null
    });
  });

  const filteredData = combinedData
    .filter(item => getYearFromCompetence(item.competencia) === selectedYear)
    .sort((a, b) => {
      const partsA = a.competencia.split('/');
      const partsB = b.competencia.split('/');
      const dateA = new Date(Number(partsA[1]), Number(partsA[0]) - 1);
      const dateB = new Date(Number(partsB[1]), Number(partsB[0]) - 1);
      return dateB.getTime() - dateA.getTime();
    });
    
  const totals = filteredData.reduce((acc, item) => ({
    devido: acc.devido + item.valor_devido,
    pago: acc.pago + item.valor_pago,
    saldo: acc.saldo + item.saldo
  }), { devido: 0, pago: 0, saldo: 0 });

  const availableYears = Array.from(new Set(
    combinedData.map(item => getYearFromCompetence(item.competencia))
  )).filter(Boolean).sort().reverse();

  const handleExport = (type: 'pdf' | 'csv') => {
    setIsExporting(true);
    try {
      if (filteredData.length === 0) {
        setError("Nenhum dado filtrado para exportar.");
        return;
      }

      if (type === 'pdf') {
        generateFGTSReconciliationPDF(filteredData, Number(selectedYear));
      } else {
        generateFGTSReconciliationCSV(filteredData);
      }
    } catch (err) {
      console.error("Export error:", err);
      setError("Erro ao exportar relatório.");
    } finally {
      setIsExporting(false);
    }
  };

  if (loading && records.length === 0) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <div>
        <h2 className="text-3xl font-display font-bold text-text-light dark:text-text-dark mb-1 flex items-center gap-3">
          <DollarSign className="w-8 h-8 text-primary" />
          FGTS Devido (Manual)
        </h2>
        <p className="text-text-muted-light dark:text-text-muted-dark text-sm">
          Informe o valor de FGTS devido no mês para conciliar com os pagamentos importados.
        </p>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-card-dark rounded-3xl p-8 border border-border-light dark:border-border-dark shadow-sm"
      >
        <form onSubmit={handleSave} className="flex flex-col md:flex-row items-end gap-6">
          <div className="flex-1 space-y-2 w-full">
            <label className="text-xs font-bold text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Competência
            </label>
            <input
              type="text"
              placeholder="MM/AAAA"
              required
              value={formCompetencia}
              onChange={(e) => setFormCompetencia(maskCompetence(e.target.value))}
              className="w-full px-4 py-3 bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark rounded-xl focus:ring-2 focus:ring-primary/20 text-text-light dark:text-text-dark"
            />
          </div>

          <div className="flex-1 space-y-2 w-full">
            <label className="text-xs font-bold text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Valor Total Devido (R$)
            </label>
            <input
              type="text"
              placeholder="0,00"
              required
              value={formValor}
              onChange={(e) => setFormValor(e.target.value.replace(/[^\d,]/g, ''))}
              className="w-full px-4 py-3 bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark rounded-xl focus:ring-2 focus:ring-primary/20 text-text-light dark:text-text-dark font-mono"
            />
          </div>

          <div className="flex gap-2 w-full md:w-auto">
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setFormCompetencia('');
                  setFormValor('');
                }}
                className="px-6 py-3 bg-slate-100 dark:bg-slate-800 text-text-muted-light dark:text-text-muted-dark rounded-xl font-bold hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            )}
            <button
              type="submit"
              disabled={saving}
              className="px-8 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary-hover shadow-lg shadow-primary/20 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : editingId ? <Save className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              {editingId ? 'Salvar' : 'Adicionar'}
            </button>
          </div>
        </form>

        {error && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl flex items-center gap-2 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}
      </motion.div>

      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="text-xl font-display font-bold text-text-light dark:text-text-dark flex items-center gap-2">
            Histórico de Conciliação
          </h3>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleExport('csv')}
              disabled={isExporting}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-all border border-emerald-100 dark:border-emerald-800 shadow-sm"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Exportar CSV
            </button>
            <button
              onClick={() => handleExport('pdf')}
              disabled={isExporting}
              className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-bold hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all border border-blue-100 dark:border-blue-800 shadow-sm"
            >
              <Download className="w-4 h-4" />
              Exportar PDF
            </button>

            <div className="flex items-center gap-2 bg-bg-light dark:bg-bg-dark px-3 py-2 rounded-xl border border-border-light dark:border-border-dark min-w-[100px]">
              <Filter className="w-4 h-4 text-text-muted-light dark:text-text-muted-dark" />
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="bg-transparent border-none focus:ring-0 text-sm font-bold text-text-light dark:text-text-dark cursor-pointer appearance-none pr-4"
              >
                {availableYears.length > 0 ? (
                  availableYears.map(year => (
                    <option key={year} value={year} className="dark:bg-card-dark">{year}</option>
                  ))
                ) : (
                  <option value={new Date().getFullYear().toString()} className="dark:bg-card-dark">{new Date().getFullYear()}</option>
                )}
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-card-dark rounded-3xl border border-border-light dark:border-border-dark overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-border-light dark:border-border-dark transition-colors">
                  <th className="px-6 py-4 text-[10px] font-bold text-text-muted-light uppercase tracking-widest">Competência</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-text-muted-light uppercase tracking-widest text-right">Devido (Manual)</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-text-muted-light uppercase tracking-widest text-right">Pago (Importado)</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-text-muted-light uppercase tracking-widest text-right">Saldo</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-text-muted-light uppercase tracking-widest text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light dark:divide-border-dark transition-colors">
                <AnimatePresence mode="popLayout">
                  {filteredData.length > 0 ? (
                    filteredData.map((item) => (
                      <motion.tr 
                        key={item.competencia}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group"
                      >
                        <td className="px-6 py-4 font-bold text-text-light dark:text-text-dark">{item.competencia}</td>
                        <td className="px-6 py-4 text-right font-mono text-text-light dark:text-text-dark">{formatCurrency(item.valor_devido)}</td>
                        <td className="px-6 py-4 text-right font-mono text-text-muted-light">{formatCurrency(item.valor_pago)}</td>
                        <td className="px-6 py-4 text-right">
                          <div className={cn(
                            "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-mono",
                            item.saldo === 0 
                              ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                              : item.saldo < 0 
                                ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400" 
                                : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
                          )}>
                            {item.saldo < 0 ? <TrendingUp className="w-3 h-3" /> : item.saldo > 0 ? <TrendingDown className="w-3 h-3" /> : null}
                            {formatCurrency(item.saldo)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => {
                                if (item.manual_id) {
                                  handleEdit(records.find(r => r.id === item.manual_id)!);
                                } else {
                                  setFormComp(item.competencia);
                                  setFormValor('');
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                }
                              }}
                              className="p-2 text-text-muted-light hover:text-primary transition-all"
                              title={item.manual_id ? "Editar Lançamento" : "Lançar Valor Devido"}
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            
                            {item.manual_id && (
                              <button
                                onClick={() => handleDelete(item.manual_id!)}
                                className="p-2 text-text-muted-light hover:text-red-500 transition-all"
                                title="Excluir Lançamento"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-text-muted-light italic">
                        Nenhum registro encontrado para {selectedYear}.
                      </td>
                    </tr>
                  )}
                </AnimatePresence>
              </tbody>
              {filteredData.length > 0 && (
                <tfoot className="bg-bg-light dark:bg-bg-dark border-t border-border-light dark:border-border-dark font-bold">
                  <tr>
                    <td className="px-6 py-4 text-sm font-bold text-text-muted-light dark:text-text-muted-dark text-right uppercase">Total:</td>
                    <td className="px-6 py-4 text-sm font-bold text-emerald-600 dark:text-emerald-400 text-right">{formatCurrency(totals.devido)}</td>
                    <td className="px-6 py-4 text-sm font-bold text-blue-600 dark:text-blue-400 text-right">{formatCurrency(totals.pago)}</td>
                    <td className={cn(
                      "px-6 py-4 text-sm font-bold text-right",
                      totals.saldo < 0 ? "text-emerald-600 dark:text-emerald-400" : totals.saldo > 0 ? "text-red-600 dark:text-red-400" : "text-text-muted-light"
                    )}>
                      {formatCurrency(totals.saldo)}
                    </td>
                    <td className="px-6 py-4"></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>

      <div className="bg-slate-50 dark:bg-slate-900/20 rounded-2xl p-6 border border-border-light dark:border-border-dark flex gap-4">
        <AlertCircle className="w-6 h-6 text-primary flex-shrink-0" />
        <div className="space-y-1">
          <h4 className="font-bold text-text-light dark:text-text-dark text-sm">Como funciona o cálculo?</h4>
          <p className="text-sm text-text-muted-light dark:text-text-muted-dark">
            O <strong>Saldo</strong> considera o Valor Devido manual e abate o que consta na coluna <code className="px-1 py-0.5 bg-slate-200 dark:bg-slate-800 rounded font-mono">Valor FGTS na Guia</code> dos arquivos importados.
          </p>
        </div>
      </div>
    </div>
  );
}
