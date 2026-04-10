import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Consignado } from '../types/consignado';
import { PagamentoConsignado } from '../types/pagamento';
import { formatCurrency, formatCPF, cn, getYears, normalizeContract, normalizeCPF, maskDate, maskCompetence } from '../lib/utils';
import { 
  Search, 
  Eye, 
  FileText, 
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Calendar,
  Building2,
  ChevronDown,
  ChevronUp,
  Check,
  CheckCircle2,
  AlertCircle,
  Users
} from 'lucide-react';
import { ConsignadoDetail } from './ConsignadoDetail';
import { generatePDF } from '../lib/pdf-generator';

interface ConsignadoTableProps {
  data: Consignado[];
  payments: PagamentoConsignado[];
}

export function ConsignadoTable({ data, payments }: ConsignadoTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [employerSearch, setEmployerSearch] = useState('');
  const [admissionDateSearch, setAdmissionDateSearch] = useState('');
  const [startDateSearch, setStartDateSearch] = useState('');
  const [endDateSearch, setEndDateSearch] = useState('');

  const [statusFilter, setStatusFilter] = useState<string[]>(['all']);
  const [selectedCompetences, setSelectedCompetences] = useState<string[]>([]);
  const [yearFilter, setYearFilter] = useState('all');
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [isCompetenceDropdownOpen, setIsCompetenceDropdownOpen] = useState(false);
  const competenceDropdownRef = useRef<HTMLDivElement>(null);
  
  const [selectedItem, setSelectedItem] = useState<Consignado | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;


  const competences = useMemo(() => {
    const set = new Set(data.map(item => item.competencia));
    return Array.from(set).sort();
  }, [data]);

  const years = useMemo(() => getYears(data), [data]);

  // Initialize selected competences with all options
  useEffect(() => {
    if (competences.length > 0 && selectedCompetences.length === 0) {
      setSelectedCompetences(competences);
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

  const baseFilteredData = useMemo(() => {
    return data.filter(item => {
      const matchesSearch = 
        item.nomeTrabalhador.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.cpf.includes(searchTerm) ||
        item.contrato.includes(searchTerm) ||
        item["ifConcessora.descricao"].toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesEmployer = item.nomeEmpregador.toLowerCase().includes(employerSearch.toLowerCase());
      const matchesAdmission = item.dataAdmissao.includes(admissionDateSearch);
      const matchesStartDate = item.competenciaInicioDesconto.includes(startDateSearch);
      const matchesEndDate = item.competenciaFimDesconto.includes(endDateSearch);
      
      const matchesCompetence = selectedCompetences.length === 0 || selectedCompetences.includes(item.competencia);
      const matchesYear = yearFilter === 'all' || item.competencia.endsWith(yearFilter);
      
      return matchesSearch && matchesEmployer && matchesAdmission && matchesStartDate && matchesEndDate && matchesCompetence && matchesYear;

    }).sort((a, b) => a.nomeTrabalhador.localeCompare(b.nomeTrabalhador));
  }, [data, searchTerm, employerSearch, admissionDateSearch, startDateSearch, endDateSearch, selectedCompetences, yearFilter]);

  const finalFilteredData = useMemo(() => {
    return baseFilteredData.filter(item => {
      const normalizedItemContrato = normalizeContract(item.contrato);
      const normalizedItemCPF = normalizeCPF(item.cpf);
      
      const payment = payments.find(p => 
        normalizeContract(p.contrato) === normalizedItemContrato && 
        normalizeCPF(p.cpf) === normalizedItemCPF && 
        p.competencia === item.competencia
      );

      const isPaid = !!payment;
      const isDivergent = isPaid && Math.abs(payment.valorPago - item.valorParcela) > 0.01;
      
      if (!statusFilter.includes('all')) {
        if (statusFilter.includes('paid')) return isPaid && !isDivergent;
        if (statusFilter.includes('divergent')) return isDivergent;
        if (statusFilter.includes('pending')) return !isPaid;
      }
      return true;
    });
  }, [baseFilteredData, statusFilter, payments]);

  const totalParcelas = useMemo(() => {
    return finalFilteredData.reduce((acc, curr) => acc + curr.valorParcela, 0);
  }, [finalFilteredData]);

  const tableStats = useMemo(() => {
    const total = baseFilteredData.length;
    let adimplentes = 0;
    let divergentes = 0;
    let inadimplentes = 0;

    baseFilteredData.forEach(item => {
      const normalizedItemContrato = normalizeContract(item.contrato);
      const normalizedItemCPF = normalizeCPF(item.cpf);
      
      const payment = payments.find(p => 
        normalizeContract(p.contrato) === normalizedItemContrato && 
        normalizeCPF(p.cpf) === normalizedItemCPF && 
        p.competencia === item.competencia
      );

      if (!payment) {
        inadimplentes++;
      } else {
        const isDivergent = Math.abs(payment.valorPago - item.valorParcela) > 0.01;
        if (isDivergent) {
          divergentes++;
        } else {
          adimplentes++;
        }
      }
    });

    return { total, adimplentes, divergentes, inadimplentes };
  }, [baseFilteredData, payments]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return finalFilteredData.slice(start, start + itemsPerPage);
  }, [finalFilteredData, currentPage]);

  const totalPages = Math.ceil(finalFilteredData.length / itemsPerPage);

  const handleExportPDF = () => {
    const competenceLabel = selectedCompetences.length === competences.length ? 'Todas' : selectedCompetences.join(', ');
    generatePDF(finalFilteredData, payments, competenceLabel);
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
          <h2 className="text-3xl font-display font-bold text-text-light dark:text-text-dark mb-1">Contratos</h2>
          <p className="text-text-muted-light dark:text-text-muted-dark text-sm">Visualize e gerencie todos os contratos importados no sistema.</p>
        </div>
        <button
          onClick={handleExportPDF}
          className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl hover:bg-primary-hover transition-all shadow-lg shadow-primary/20 font-semibold"
        >
          <FileText className="w-5 h-5" />
          Gerar Relatório PDF
        </button>
      </div>

      {/* Table Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button 
          onClick={() => setStatusFilter(['all'])}
          className={cn(
            "p-4 rounded-2xl border transition-all duration-200 flex items-center justify-between shadow-sm text-left group",
            statusFilter.includes('all') 
              ? "bg-white dark:bg-card-dark border-primary ring-2 ring-primary/20 shadow-md" 
              : "bg-white/50 dark:bg-card-dark/50 border-border-light dark:border-border-dark hover:border-primary/50 hover:bg-white dark:hover:bg-card-dark"
          )}
        >
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
              statusFilter.includes('all') ? "bg-primary/10 dark:bg-primary/20" : "bg-blue-50 dark:bg-blue-900/20"
            )}>
              <Users className={cn("w-5 h-5", statusFilter.includes('all') ? "text-primary" : "text-blue-600 dark:text-blue-400")} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider">Total Contratos</p>
              <p className="text-xl font-bold text-text-light dark:text-text-dark">{tableStats.total}</p>
            </div>
          </div>
        </button>

        <button 
          onClick={() => setStatusFilter(['paid'])}
          className={cn(
            "p-4 rounded-2xl border transition-all duration-200 flex items-center justify-between shadow-sm text-left group",
            statusFilter.length === 1 && statusFilter.includes('paid')
              ? "bg-white dark:bg-card-dark border-emerald-500 ring-2 ring-emerald-500/20 shadow-md" 
              : "bg-white/50 dark:bg-card-dark/50 border-border-light dark:border-border-dark hover:border-emerald-500/50 hover:bg-white dark:hover:bg-card-dark"
          )}
        >
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
              statusFilter.includes('paid') ? "bg-emerald-100 dark:bg-emerald-900/40" : "bg-emerald-50 dark:bg-emerald-900/20"
            )}>
              <CheckCircle2 className={cn("w-5 h-5", statusFilter.includes('paid') ? "text-emerald-600 dark:text-emerald-400" : "text-emerald-600 dark:text-emerald-400")} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider">Adimplentes</p>
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{tableStats.adimplentes}</p>
            </div>
          </div>
        </button>

        <button 
          onClick={() => setStatusFilter(['divergent'])}
          className={cn(
            "p-4 rounded-2xl border transition-all duration-200 flex items-center justify-between shadow-sm text-left group",
            statusFilter.length === 1 && statusFilter.includes('divergent')
              ? "bg-white dark:bg-card-dark border-amber-500 ring-2 ring-amber-500/20 shadow-md" 
              : "bg-white/50 dark:bg-card-dark/50 border-border-light dark:border-border-dark hover:border-amber-500/50 hover:bg-white dark:hover:bg-card-dark"
          )}
        >
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
              statusFilter.includes('divergent') ? "bg-amber-100 dark:bg-amber-900/40" : "bg-amber-50 dark:bg-amber-900/20"
            )}>
              <AlertCircle className={cn("w-5 h-5", statusFilter.includes('divergent') ? "text-amber-600 dark:text-amber-400" : "text-amber-600 dark:text-amber-400")} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider">Divergentes</p>
              <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{tableStats.divergentes}</p>
            </div>
          </div>
        </button>

        <button 
          onClick={() => setStatusFilter(['pending'])}
          className={cn(
            "p-4 rounded-2xl border transition-all duration-200 flex items-center justify-between shadow-sm text-left group",
            statusFilter.length === 1 && statusFilter.includes('pending')
              ? "bg-white dark:bg-card-dark border-red-500 ring-2 ring-red-500/20 shadow-md" 
              : "bg-white/50 dark:bg-card-dark/50 border-border-light dark:border-border-dark hover:border-red-500/50 hover:bg-white dark:hover:bg-card-dark"
          )}
        >
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
              statusFilter.includes('pending') ? "bg-red-100 dark:bg-red-900/40" : "bg-red-50 dark:bg-red-900/20"
            )}>
              <AlertCircle className={cn("w-5 h-5", statusFilter.includes('pending') ? "text-red-600 dark:text-red-400" : "text-red-600 dark:text-red-400")} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider">Inadimplentes</p>
              <p className="text-xl font-bold text-red-600 dark:text-red-400">{tableStats.inadimplentes}</p>
            </div>
          </div>
        </button>
      </div>

      <div className="bg-white dark:bg-card-dark rounded-2xl border border-border-light dark:border-border-dark shadow-sm overflow-hidden transition-all duration-300">
        {/* Filters */}
        <div className="p-6 border-b border-border-light dark:border-border-dark space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted-light dark:text-text-muted-dark" />
              <input
                type="text"
                placeholder="Pesquisar por nome, CPF ou instituição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-bg-light dark:bg-bg-dark rounded-xl border-none focus:ring-2 focus:ring-primary/20 text-text-light dark:text-text-dark placeholder-text-muted-light dark:placeholder-text-muted-dark"
              />
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              {/* Multi-select Competence Dropdown */}
              <div className="relative" ref={competenceDropdownRef}>
                <button
                  onClick={() => setIsCompetenceDropdownOpen(!isCompetenceDropdownOpen)}
                  className="flex items-center gap-2 bg-bg-light dark:bg-bg-dark px-4 py-3 rounded-xl text-text-light dark:text-text-dark font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-w-[200px] justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Filter className="w-5 h-5 text-text-muted-light dark:text-text-muted-dark" />
                    <span className="truncate max-w-[140px]">
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
                  <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-card-dark border border-border-light dark:border-border-dark rounded-xl shadow-xl z-20 py-2 animate-in fade-in zoom-in-95 duration-100">
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

              <button
                onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 rounded-xl transition-all",
                  showAdvancedSearch 
                    ? "bg-primary text-white shadow-lg shadow-primary/20" 
                    : "bg-bg-light dark:bg-bg-dark text-text-muted-light dark:text-text-muted-dark hover:bg-slate-200 dark:hover:bg-slate-700"
                )}
              >
                {showAdvancedSearch ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                <span className="font-medium">Filtros Avançados</span>
              </button>
            </div>
          </div>
          {showAdvancedSearch && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-border-light dark:border-border-dark animate-in slide-in-from-top-2 duration-200">
              <div className="relative">
                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted-light dark:text-text-muted-dark" />
                <input
                  type="text"
                  placeholder="Empregador..."
                  value={employerSearch}
                  onChange={(e) => setEmployerSearch(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-bg-light dark:bg-bg-dark rounded-xl border-none focus:ring-2 focus:ring-primary/20 text-text-light dark:text-text-dark placeholder-text-muted-light dark:placeholder-text-muted-dark"
                />
              </div>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted-light dark:text-text-muted-dark" />
                <input
                  type="text"
                  placeholder="Admissão..."
                  value={admissionDateSearch}
                  onChange={(e) => setAdmissionDateSearch(maskDate(e.target.value))}
                  className="w-full pl-12 pr-4 py-3 bg-bg-light dark:bg-bg-dark rounded-xl border-none focus:ring-2 focus:ring-primary/20 text-text-light dark:text-text-dark placeholder-text-muted-light dark:placeholder-text-muted-dark"
                />
              </div>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted-light dark:text-text-muted-dark" />
                <input
                  type="text"
                  placeholder="Início Desconto..."
                  value={startDateSearch}
                  onChange={(e) => setStartDateSearch(maskCompetence(e.target.value))}
                  className="w-full pl-12 pr-4 py-3 bg-bg-light dark:bg-bg-dark rounded-xl border-none focus:ring-2 focus:ring-primary/20 text-text-light dark:text-text-dark placeholder-text-muted-light dark:placeholder-text-muted-dark"
                />
              </div>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted-light dark:text-text-muted-dark" />
                <input
                  type="text"
                  placeholder="Fim Desconto..."
                  value={endDateSearch}
                  onChange={(e) => setEndDateSearch(maskCompetence(e.target.value))}
                  className="w-full pl-12 pr-4 py-3 bg-bg-light dark:bg-bg-dark rounded-xl border-none focus:ring-2 focus:ring-primary/20 text-text-light dark:text-text-dark placeholder-text-muted-light dark:placeholder-text-muted-dark"
                />
              </div>

            </div>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-bg-light dark:bg-bg-dark border-y border-border-light dark:border-border-dark">
                <th className="px-6 py-4 text-xs font-bold text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider">Competência</th>
                <th className="px-6 py-4 text-xs font-bold text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider">Trabalhador</th>
                <th className="px-6 py-4 text-xs font-bold text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider">Contrato</th>
                <th className="px-6 py-4 text-xs font-bold text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider">Instituição</th>
                <th className="px-6 py-4 text-xs font-bold text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider text-right">Valor Parcela</th>
                <th className="px-6 py-4 text-xs font-bold text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider text-center">Situação</th>
                <th className="px-6 py-4 text-xs font-bold text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider text-center">Ações</th>

              </tr>
            </thead>
            <tbody className="divide-y divide-border-light dark:divide-border-dark">
              {paginatedData.map((item) => {
                const normalizedItemContrato = normalizeContract(item.contrato);
                const normalizedItemCPF = normalizeCPF(item.cpf);
                
                const payment = payments.find(p => 
                  normalizeContract(p.contrato) === normalizedItemContrato && 
                  normalizeCPF(p.cpf) === normalizedItemCPF && 
                  p.competencia === item.competencia
                );

                const isPaid = !!payment;
                const isDivergent = isPaid && Math.abs(payment.valorPago - item.valorParcela) > 0.01;

                return (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                        {item.competencia}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-text-light dark:text-text-dark">{item.nomeTrabalhador}</p>
                      <p className="text-[10px] text-text-muted-light dark:text-text-muted-dark font-mono">{formatCPF(item.cpf)}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-text-muted-light dark:text-text-muted-dark">
                        {item.contrato}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-text-muted-light dark:text-text-muted-dark">{item["ifConcessora.descricao"]}</td>
                    <td className="px-6 py-4 text-sm font-bold text-text-light dark:text-text-dark text-right">{formatCurrency(item.valorParcela)}</td>

                    <td className="px-6 py-4 text-center">
                      {isPaid ? (
                        <div className="flex flex-col items-center gap-1">
                          <span className={cn(
                            "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border",
                            isDivergent 
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800"
                              : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                          )}>
                            {isDivergent ? <AlertCircle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                            {isDivergent ? 'DIVERGENTE' : 'PAGO'}
                          </span>
                          {isDivergent && (
                            <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400">
                              Pago: {formatCurrency(payment.valorPago)}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800">
                          <AlertCircle className="w-3 h-3" />
                          PENDENTE
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => setSelectedItem(item)}
                        className="p-2 rounded-lg hover:bg-primary hover:text-white transition-all text-text-muted-light dark:text-text-muted-dark"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {paginatedData.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-text-muted-light dark:text-text-muted-dark italic">
                    Nenhum contrato encontrado com os filtros aplicados.
                  </td>
                </tr>
              )}
            </tbody>
            {finalFilteredData.length > 0 && (
              <tfoot>
                <tr className="bg-bg-light dark:bg-bg-dark border-t border-border-light dark:border-border-dark">
                  <td colSpan={5} className="px-6 py-4 text-sm font-bold text-text-muted-light dark:text-text-muted-dark text-right uppercase">Total Exibido:</td>
                  <td className="px-6 py-4 text-sm font-bold text-primary dark:text-secondary text-right">{formatCurrency(totalParcelas)}</td>
                  <td></td>
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
              Mostrando <span className="font-bold text-text-light dark:text-text-dark">{(currentPage - 1) * itemsPerPage + 1}</span> a <span className="font-bold text-text-light dark:text-text-dark">{Math.min(currentPage * itemsPerPage, finalFilteredData.length)}</span> de <span className="font-bold text-text-light dark:text-text-dark">{finalFilteredData.length}</span> resultados
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

      {selectedItem && (
        <ConsignadoDetail 
          item={selectedItem} 
          payments={payments}
          onClose={() => setSelectedItem(null)} 
        />
      )}
    </div>
  );
}
