import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Consignado } from '../types/consignado';
import { PagamentoConsignado } from '../types/pagamento';
import { formatCurrency, getYears, cn, normalizeContract, normalizeCPF, maskDate, maskCompetence } from '../lib/utils';

import { 
  TrendingUp, 
  Users, 
  CreditCard, 
  Wallet, 
  Search, 
  Filter, 
  Calendar, 
  Building2, 
  ChevronDown, 
  ChevronUp,
  Check,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

interface DashboardProps {
  data: Consignado[];
  payments: PagamentoConsignado[];
  darkMode: boolean;
}

export function Dashboard({ data, payments, darkMode }: DashboardProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [employerSearch, setEmployerSearch] = useState('');
  const [admissionDateSearch, setAdmissionDateSearch] = useState('');
  const [startDateSearch, setStartDateSearch] = useState('');
  const [endDateSearch, setEndDateSearch] = useState('');
  const [selectedCompetences, setSelectedCompetences] = useState<string[]>([]);

  const [yearFilter, setYearFilter] = useState('all');
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [isCompetenceDropdownOpen, setIsCompetenceDropdownOpen] = useState(false);
  const competenceDropdownRef = useRef<HTMLDivElement>(null);

  const competences = useMemo(() => {
    const all = Array.from(new Set(data.map(item => item.competencia)));
    const filtered = yearFilter === 'all' 
      ? all 
      : all.filter(c => c.endsWith(yearFilter));
    return filtered.sort();
  }, [data, yearFilter]);


  const years = useMemo(() => getYears(data), [data]);

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

  const filteredData = useMemo(() => {
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
    });
  }, [data, searchTerm, employerSearch, admissionDateSearch, startDateSearch, endDateSearch, selectedCompetences, yearFilter]);


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

  const totalContracts = filteredData.length;
  const totalValue = filteredData.reduce((acc, curr) => acc + curr.valorEmprestimo, 0);
  const totalReleased = filteredData.reduce((acc, curr) => acc + curr.valorLiberado, 0);
  const avgInstallment = totalContracts > 0 ? filteredData.reduce((acc, curr) => acc + curr.valorParcela, 0) / totalContracts : 0;

  // Data for charts
  const bankData = filteredData.reduce((acc: any[], curr) => {
    const bank = curr["ifConcessora.descricao"];
    const existing = acc.find(item => item.name === bank);
    if (existing) {
      existing.value += curr.valorEmprestimo;
      existing.count += 1;
    } else {
      acc.push({ name: bank, value: curr.valorEmprestimo, count: 1 });
    }
    return acc;
  }, []).sort((a, b) => b.value - a.value).slice(0, 5);

  const competenceData = filteredData.reduce((acc: any[], curr) => {
    const comp = curr.competencia;
    const existing = acc.find(item => item.name === comp);
    if (existing) {
      existing.value += curr.valorEmprestimo;
    } else {
      acc.push({ name: comp, value: curr.valorEmprestimo });
    }
    return acc;
  }, []).sort((a, b) => a.name.localeCompare(b.name));

  const COLORS = ['#0046AD', '#00C2FF', '#F59E0B', '#10B981', '#6366F1'];

  const adimplenciaStats = useMemo(() => {
    if (filteredData.length === 0) return { adimplentes: 0, inadimplentes: 0, percent: 0 };
    
    let adimplentes = 0;
    filteredData.forEach(contract => {
      const normalizedContract = normalizeContract(contract.contrato);
      const normalizedCPF = normalizeCPF(contract.cpf);
      
      const hasPayment = payments.some(p => 
        normalizeContract(p.contrato) === normalizedContract && 
        normalizeCPF(p.cpf) === normalizedCPF && 
        p.competencia === contract.competencia
      );
      if (hasPayment) adimplentes++;
    });

    const total = filteredData.length;
    const inadimplentes = total - adimplentes;
    const percent = (adimplentes / total) * 100;

    return { adimplentes, inadimplentes, percent };
  }, [filteredData, payments]);

  const stats = [
    { label: 'Total de Contratos', value: totalContracts, icon: Users, color: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' },
    { label: 'Valor Total Empréstimo', value: formatCurrency(totalValue), icon: TrendingUp, color: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400' },
    { label: 'Adimplência', value: `${adimplenciaStats.percent.toFixed(1)}%`, icon: CheckCircle, color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' },
    { label: 'Inadimplência', value: adimplenciaStats.inadimplentes, icon: AlertTriangle, color: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' },
  ];

  return (
    <div className="space-y-8">
      {/* Dynamic Filters */}
      <div className="bg-white dark:bg-card-dark rounded-2xl p-6 border border-border-light dark:border-border-dark shadow-sm transition-all duration-300">
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted-light dark:text-text-muted-dark" />
              <input
                type="text"
                placeholder="Pesquisar por nome ou CPF..."
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
                  className="flex items-center gap-2 bg-bg-light dark:bg-bg-dark px-4 py-3 rounded-xl text-text-light dark:text-text-dark font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-w-[160px] justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Filter className="w-5 h-5 text-text-muted-light dark:text-text-muted-dark" />
                    <span className="truncate max-w-[100px]">
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
                  "flex items-center gap-2 px-4 py-3 rounded-xl transition-all font-bold text-sm",
                  showAdvancedSearch 
                    ? "bg-primary text-white shadow-lg shadow-primary/20" 
                    : "bg-bg-light dark:bg-bg-dark text-text-muted-light dark:text-text-muted-dark hover:bg-slate-200 dark:hover:bg-slate-700"
                )}
              >
                {showAdvancedSearch ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                <span>Filtros Avançados</span>
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white dark:bg-card-dark rounded-2xl p-6 border border-border-light dark:border-border-dark shadow-sm transition-all duration-300 hover:shadow-md">
            <div className={`w-12 h-12 ${stat.color} rounded-xl flex items-center justify-center mb-4`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <p className="text-sm text-text-muted-light dark:text-text-muted-dark font-medium mb-1">{stat.label}</p>
            <h3 className="text-2xl font-bold text-text-light dark:text-text-dark">{stat.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Bank Distribution */}
        <div className="bg-white dark:bg-card-dark rounded-2xl p-8 border border-border-light dark:border-border-dark shadow-sm transition-all duration-300">
          <h3 className="text-xl font-bold text-text-light dark:text-text-dark mb-6">Distribuição por Instituição</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={bankData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {bankData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                    backgroundColor: darkMode ? '#0F172A' : '#fff',
                    color: darkMode ? '#fff' : '#1E293B'
                  }}
                  itemStyle={{ color: '#00C2FF', fontWeight: 'bold' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {bankData.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-sm group cursor-default">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full transition-transform group-hover:scale-125" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-text-muted-light dark:text-text-muted-dark truncate max-w-[200px] group-hover:text-primary transition-colors">{item.name}</span>
                </div>
                <span className="font-bold text-text-light dark:text-text-dark group-hover:text-primary transition-colors">{formatCurrency(item.value)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Competence Evolution */}
        <div className="bg-white dark:bg-card-dark rounded-2xl p-8 border border-border-light dark:border-border-dark shadow-sm transition-all duration-300">
          <h3 className="text-xl font-bold text-text-light dark:text-text-dark mb-6">Evolução por Competência</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={competenceData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? "#334155" : "#F1F5F9"} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: darkMode ? '#94A3B8' : '#64748B', fontSize: 12 }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: darkMode ? '#94A3B8' : '#64748B', fontSize: 12 }}
                  tickFormatter={(value) => `R$ ${value/1000}k`}
                />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  cursor={{ fill: darkMode ? '#1E293B' : '#F1F5F9', opacity: 0.4 }}
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                    backgroundColor: darkMode ? '#0F172A' : '#fff',
                    color: darkMode ? '#fff' : '#1E293B'
                  }}
                  itemStyle={{ color: '#00C2FF', fontWeight: 'bold' }}
                />
                <Bar 
                  dataKey="value" 
                  fill="#0046AD" 
                  radius={[4, 4, 0, 0]}
                  activeBar={{ fill: '#00C2FF' }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
