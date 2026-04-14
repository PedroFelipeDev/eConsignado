import React, { useState, useMemo, useEffect, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { 
  Trash2, 
  Download, 
  FileSpreadsheet, 
  Search, 
  Filter, 
  Calendar, 
  AlertCircle, 
  Loader2, 
  ChevronLeft, 
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  ChevronUp,
  Edit2,
  Check,
  X,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatCurrency, formatCPF, getYears, maskCompetence } from '../lib/utils';

import { PagamentoConsignado } from '../types/pagamento';
import { generatePaymentsPDF, generatePaymentsCSV } from '../lib/pdf-generator';

interface PaymentsManagerProps {
  user: User;
  payments: PagamentoConsignado[];
}

export function PaymentsManager({ user, payments }: PaymentsManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompetences, setSelectedCompetences] = useState<string[]>([]);
  const [yearFilter, setYearFilter] = useState('all');
  const [isCompetenceDropdownOpen, setIsCompetenceDropdownOpen] = useState(false);
  const competenceDropdownRef = useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteCompetence, setDeleteCompetence] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editCompetence, setEditCompetence] = useState('');

  const competences = useMemo(() => {
    const all = Array.from(new Set(payments.map(p => p.competencia)));
    const filtered = yearFilter === 'all' 
      ? all 
      : all.filter(c => c.endsWith(yearFilter));
    return filtered.sort((a, b) => b.localeCompare(a));
  }, [payments, yearFilter]);


  const years = useMemo(() => getYears(payments), [payments]);
  
  // Initialize/Sync selected competences when list changes (e.g. year filter changes)
  useEffect(() => {
    if (competences.length > 0) {
      setSelectedCompetences(competences);
    } else {
      setSelectedCompetences([]);
    }
  }, [competences]);



  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (competenceDropdownRef.current && !competenceDropdownRef.current.contains(event.target as Node)) {
        setIsCompetenceDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      const matchesSearch = 
        p.nomeTrabalhador.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.cpf.includes(searchTerm) ||
        p.contrato.includes(searchTerm);
      
      const matchesCompetence = selectedCompetences.length === 0 || selectedCompetences.includes(p.competencia);
      const matchesYear = yearFilter === 'all' || p.competencia.endsWith(yearFilter);
      
      return matchesSearch && matchesCompetence && matchesYear;
    }).sort((a, b) => a.nomeTrabalhador.localeCompare(b.nomeTrabalhador));
  }, [payments, searchTerm, selectedCompetences, yearFilter]);

  const totalExibido = useMemo(() => {
    return filteredPayments.reduce((acc, curr) => acc + curr.valorPago, 0);
  }, [filteredPayments]);

  const paginatedPayments = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredPayments.slice(start, start + itemsPerPage);
  }, [filteredPayments, currentPage]);

  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);

  const handleExportPayments = async (type: 'pdf' | 'csv') => {
    setIsExporting(true);
    try {
      if (filteredPayments.length === 0) {
        setStatus({ type: 'error', message: 'Nenhum pagamento encontrado para exportar.' });
        return;
      }

      if (type === 'pdf') {
        generatePaymentsPDF(filteredPayments);
      } else {
        generatePaymentsCSV(filteredPayments);
      }
    } catch (error) {
      console.error("Erro ao exportar pagamentos:", error);
      setStatus({ type: 'error', message: 'Erro ao exportar pagamentos.' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteByCompetence = async () => {
    if (!deleteCompetence) return;
    
    setIsDeleting(true);
    try {
      const { error, count } = await supabase
        .from('pagamentos')
        .delete({ count: 'exact' })
        .eq('usuario_id', user.id)
        .eq('competencia', deleteCompetence);
      
      if (error) throw error;
      
      if (count === 0) {
        setStatus({ type: 'error', message: `Nenhum pagamento encontrado para a competência ${deleteCompetence}.` });
        return;
      }

      setStatus({ 
        type: 'success', 
        message: `${count} pagamentos da competência ${deleteCompetence} foram excluídos.` 
      });
      setShowDeleteConfirm(false);
      setDeleteCompetence('');
    } catch (error) {
      console.error("Erro ao excluir pagamentos:", error);
      setStatus({ type: 'error', message: 'Erro ao excluir pagamentos. Tente novamente.' });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteSingle = async (id: string) => {
    try {
      const { error } = await supabase
        .from('pagamentos')
        .delete()
        .eq('id', id);
      
      if (error) throw error;

      setStatus({ type: 'success', message: 'Pagamento excluído com sucesso.' });
      setDeletingId(null);
    } catch (error) {
      console.error("Erro ao excluir pagamento:", error);
      setStatus({ type: 'error', message: 'Erro ao excluir pagamento.' });
    }
  };

  const startEditing = (p: PagamentoConsignado) => {
    setEditingId(p.id!);
    setEditValue(p.valorPago.toString());
    setEditCompetence(p.competencia);
  };

  const handleSaveEdit = async (id: string) => {
    try {
      const val = parseFloat(editValue.replace(',', '.'));
      if (isNaN(val)) {
        setStatus({ type: 'error', message: 'Valor inválido.' });
        return;
      }

      const { error } = await supabase
        .from('pagamentos')
        .update({
          valor_pago: val,
          competencia: editCompetence
        })
        .eq('id', id);

      if (error) throw error;

      setEditingId(null);
      setStatus({ type: 'success', message: 'Pagamento atualizado com sucesso.' });
    } catch (error) {
      console.error("Erro ao atualizar pagamento:", error);
      setStatus({ type: 'error', message: 'Erro ao atualizar pagamento.' });
    }
  };

  const toggleCompetence = (comp: string) => {
    setSelectedCompetences(prev => 
      prev.includes(comp) ? prev.filter(c => c !== comp) : [...prev, comp]
    );
  };

  const toggleSelectAllCompetences = () => {
    if (selectedCompetences.length === competences.length) {
      setSelectedCompetences([]);
    } else {
      setSelectedCompetences(competences);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-display font-bold text-text-light dark:text-text-dark mb-1">Gestão de Pagamentos</h2>
          <p className="text-text-muted-light dark:text-text-muted-dark text-sm">Visualize, altere e exclua os registros de pagamentos importados.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleExportPayments('csv')}
            disabled={isExporting}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-all border border-emerald-100 dark:border-emerald-800 shadow-sm"
          >
            <FileSpreadsheet className="w-5 h-5" />
            Exportar CSV
          </button>
          <button
            onClick={() => handleExportPayments('pdf')}
            disabled={isExporting}
            className="flex items-center gap-2 px-6 py-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl font-bold hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all border border-blue-100 dark:border-blue-800 shadow-sm"
          >
            <Download className="w-5 h-5" />
            Exportar PDF
          </button>
        </div>
      </div>

      {status && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "p-4 rounded-xl flex items-center gap-3 border",
            status.type === 'success' 
              ? "bg-emerald-50 border-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-900/30 dark:text-emerald-400" 
              : "bg-red-50 border-red-100 text-red-700 dark:bg-red-900/20 dark:border-red-900/30 dark:text-red-400"
          )}
        >
          {status.type === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <p className="text-sm font-medium">{status.message}</p>
          <button onClick={() => setStatus(null)} className="ml-auto">
            <X className="w-4 h-4 opacity-50 hover:opacity-100" />
          </button>
        </motion.div>
      )}

      {/* Bulk Delete Section */}
      <div className="bg-white dark:bg-card-dark rounded-2xl p-8 border border-border-light dark:border-border-dark shadow-sm">
        <h4 className="font-bold text-text-light dark:text-text-dark mb-6 flex items-center gap-2">
          <Trash2 className="w-5 h-5 text-red-500" />
          Exclusão em Lote
        </h4>
        
        <div className="flex flex-col md:flex-row items-end gap-4">
          <div className="flex-1 space-y-2">
            <label className="text-[10px] font-bold text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider">
              Competência para Excluir (MM/AAAA)
            </label>
            <input
              type="text"
              placeholder="Ex: 05/2025"
              value={deleteCompetence}
              onChange={(e) => setDeleteCompetence(maskCompetence(e.target.value))}
              className="w-full px-4 py-3 bg-bg-light dark:bg-bg-dark rounded-xl border border-border-light dark:border-border-dark focus:ring-2 focus:ring-red-500/20 text-text-light dark:text-text-dark placeholder-text-muted-light dark:placeholder-text-muted-dark"
            />

          </div>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            disabled={!deleteCompetence || isDeleting}
            className="px-6 py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-all shadow-lg shadow-red-500/20 disabled:opacity-50 disabled:shadow-none flex items-center gap-2"
          >
            {isDeleting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
            Excluir Lançamentos
          </button>
        </div>

        <AnimatePresence>
          {showDeleteConfirm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-6 p-6 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-2xl"
            >
              <div className="flex items-start gap-4">
                <AlertCircle className="w-6 h-6 text-red-500 shrink-0 mt-1" />
                <div className="flex-1">
                  <h5 className="font-bold text-red-700 dark:text-red-400 mb-1">Confirmar Exclusão Permanente</h5>
                  <p className="text-sm text-red-600 dark:text-red-400/80 mb-4">
                    Você está prestes a excluir todos os pagamentos importados da competência <strong>{deleteCompetence}</strong>. Esta ação não pode ser desfeita.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={handleDeleteByCompetence}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 transition-colors"
                    >
                      Sim, Excluir Agora
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-text-light dark:text-text-dark rounded-lg text-sm font-bold hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Payments Table */}
      <div className="bg-white dark:bg-card-dark rounded-2xl border border-border-light dark:border-border-dark shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border-light dark:border-border-dark flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted-light dark:text-text-muted-dark" />
            <input
              type="text"
              placeholder="Pesquisar por nome, CPF ou contrato..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-bg-light dark:bg-bg-dark rounded-xl border-none focus:ring-2 focus:ring-primary/20 text-text-light dark:text-text-dark placeholder-text-muted-light dark:placeholder-text-muted-dark"
            />
          </div>

          {/* Multi-select Competence Dropdown */}
          <div className="relative" ref={competenceDropdownRef}>
            <button
              onClick={() => setIsCompetenceDropdownOpen(!isCompetenceDropdownOpen)}
              className="flex items-center gap-2 bg-bg-light dark:bg-bg-dark px-4 py-3 rounded-xl text-text-light dark:text-text-dark font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-w-[200px] justify-between"
            >
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-text-muted-light dark:text-text-muted-dark" />
                <span className="truncate">
                  {selectedCompetences.length === competences.length 
                    ? 'Todas Competências' 
                    : selectedCompetences.length === 0 
                      ? 'Nenhuma' 
                      : `${selectedCompetences.length} Selecionadas`}
                </span>
              </div>
              <ChevronDown className={cn("w-4 h-4 transition-transform", isCompetenceDropdownOpen && "rotate-180")} />
            </button>

            {isCompetenceDropdownOpen && (
              <div className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-card-dark border border-border-light dark:border-border-dark rounded-xl shadow-xl z-20 py-2 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-2 pb-2 mb-2 border-b border-border-light dark:border-border-dark">
                  <button
                    onClick={toggleSelectAllCompetences}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-bg-light dark:hover:bg-bg-dark text-sm font-bold text-primary transition-colors"
                  >
                    <span>Selecionar Todas</span>
                    {selectedCompetences.length === competences.length && <Check className="w-4 h-4" />}
                  </button>
                </div>
                <div className="max-h-60 overflow-y-auto px-2">
                  {competences.map(comp => (
                    <button
                      key={comp}
                      onClick={() => toggleCompetence(comp)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-bg-light dark:hover:bg-bg-dark text-sm text-text-light dark:text-text-dark transition-colors"
                    >
                      <span>{comp}</span>
                      {selectedCompetences.includes(comp) && <Check className="w-4 h-4 text-primary" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 bg-bg-light dark:bg-bg-dark px-4 py-3 rounded-xl border border-transparent focus-within:border-primary/20 transition-all">
            <Calendar className="w-5 h-5 text-text-muted-light dark:text-text-muted-dark" />
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="bg-transparent border-none focus:ring-0 text-text-light dark:text-text-dark font-medium cursor-pointer appearance-none pr-8 relative"
              style={{ backgroundImage: 'none' }}
            >
              <option value="all" className="dark:bg-card-dark">Todos os Anos</option>
              {years.map(year => (
                <option key={year} value={year} className="dark:bg-card-dark">{year}</option>
              ))}
            </select>
            <div className="pointer-events-none -ml-6">
              <ChevronDown className="w-4 h-4 text-text-muted-light" />
            </div>
          </div>

        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-bg-light dark:bg-bg-dark border-y border-border-light dark:border-border-dark">
                <th className="px-6 py-4 text-xs font-bold text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider">Competência</th>
                <th className="px-6 py-4 text-xs font-bold text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider">Trabalhador</th>
                <th className="px-6 py-4 text-xs font-bold text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider">Contrato</th>
                <th className="px-6 py-4 text-xs font-bold text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider text-right">Valor Pago</th>
                <th className="px-6 py-4 text-xs font-bold text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light dark:divide-border-dark">
              {paginatedPayments.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                  <td className="px-6 py-4">
                    {editingId === p.id ? (
                      <input
                        type="text"
                        value={editCompetence}
                        onChange={(e) => setEditCompetence(e.target.value)}
                        className="w-20 px-2 py-1 bg-white dark:bg-slate-800 border border-primary rounded text-xs text-text-light dark:text-white font-bold"
                      />
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                        {p.competencia}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-bold text-text-light dark:text-text-dark">{p.nomeTrabalhador}</p>
                    <p className="text-[10px] text-text-muted-light dark:text-text-muted-dark font-mono">{formatCPF(p.cpf)}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-text-muted-light dark:text-text-muted-dark font-mono">{p.contrato}</td>
                  <td className="px-6 py-4 text-right">
                    {editingId === p.id ? (
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-24 px-2 py-1 bg-white dark:bg-slate-800 border border-primary rounded text-right text-sm font-bold text-text-light dark:text-white"
                      />
                    ) : (
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(p.valorPago)}</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      {editingId === p.id ? (
                        <>
                          <button
                            onClick={() => handleSaveEdit(p.id!)}
                            className="p-2 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
                            title="Salvar"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-text-light dark:text-text-dark hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                            title="Cancelar"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : deletingId === p.id ? (
                        <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 p-1 rounded-lg border border-red-100 dark:border-red-900/30">
                          <span className="text-[10px] font-bold text-red-600 dark:text-red-400 px-1">Excluir?</span>
                          <button
                            onClick={() => handleDeleteSingle(p.id!)}
                            className="p-1.5 rounded-md bg-red-500 text-white hover:bg-red-600 transition-colors"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => setDeletingId(null)}
                            className="p-1.5 rounded-md bg-slate-200 dark:bg-slate-700 text-text-light dark:text-text-dark hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => startEditing(p)}
                            className="p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500 transition-all"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeletingId(p.id!)}
                            className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-all"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedPayments.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-text-muted-light dark:text-text-muted-dark italic">
                    Nenhum pagamento encontrado.
                  </td>
                </tr>
              )}
            </tbody>
            {filteredPayments.length > 0 && (
              <tfoot>
                <tr className="bg-bg-light dark:bg-bg-dark border-t border-border-light dark:border-border-dark">
                  <td colSpan={3} className="px-6 py-4 text-sm font-bold text-text-muted-light dark:text-text-muted-dark text-right uppercase">Total Exibido:</td>
                  <td className="px-6 py-4 text-sm font-bold text-primary dark:text-secondary text-right">{formatCurrency(totalExibido)}</td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-6 border-t border-border-light dark:border-border-dark flex items-center justify-between">
            <p className="text-sm text-text-muted-light dark:text-text-muted-dark">
              Mostrando <span className="font-bold text-text-light dark:text-text-dark">{(currentPage - 1) * itemsPerPage + 1}</span> a <span className="font-bold text-text-light dark:text-text-dark">{Math.min(currentPage * itemsPerPage, filteredPayments.length)}</span> de <span className="font-bold text-text-light dark:text-text-dark">{filteredPayments.length}</span> resultados
            </p>
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(1)}
                className="p-2 rounded-xl border border-border-light dark:border-border-dark disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-text-light dark:text-text-dark"
                title="Primeira Página"
              >
                <ChevronsLeft className="w-5 h-5" />
              </button>
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
                className="p-2 rounded-xl border border-border-light dark:border-border-dark disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-text-light dark:text-text-dark"
                title="Página Anterior"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm font-bold text-text-light dark:text-text-dark px-4 whitespace-nowrap">Página {currentPage} de {totalPages}</span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
                className="p-2 rounded-xl border border-border-light dark:border-border-dark disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-text-light dark:text-text-dark"
                title="Próxima Página"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(totalPages)}
                className="p-2 rounded-xl border border-border-light dark:border-border-dark disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-text-light dark:text-text-dark"
                title="Última Página"
              >
                <ChevronsRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
