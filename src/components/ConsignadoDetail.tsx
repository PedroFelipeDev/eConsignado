import { Consignado } from '../types/consignado';
import { PagamentoConsignado } from '../types/pagamento';
import { X, Calendar, User, Building2, CreditCard, Hash, Info, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { formatCurrency, formatCPF, cn, normalizeContract, normalizeCPF } from '../lib/utils';

interface ConsignadoDetailProps {
  item: Consignado;
  payments: PagamentoConsignado[];
  onClose: () => void;
}

export function ConsignadoDetail({ item, payments, onClose }: ConsignadoDetailProps) {
  const normalizedItemContrato = normalizeContract(item.contrato);
  const normalizedItemCPF = normalizeCPF(item.cpf);

  const contractPayments = payments.filter(p => 
    normalizeContract(p.contrato) === normalizedItemContrato && 
    normalizeCPF(p.cpf) === normalizedItemCPF
  ).sort((a, b) => b.competencia.localeCompare(a.competencia));

  const isPaidCurrent = contractPayments.some(p => p.competencia === item.competencia);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-card-light dark:bg-card-dark rounded-[2rem] w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col transition-all duration-300 border border-border-light dark:border-border-dark"
      >
        {/* Header */}
        <div className="p-8 border-b border-border-light dark:border-border-dark flex items-center justify-between bg-bg-light/50 dark:bg-bg-dark/50">
          <div className="flex items-center gap-4">
            <div>
              <h3 className="text-2xl font-display font-bold text-text-light dark:text-text-dark tracking-tight">Detalhamento do Contrato</h3>
              <p className="text-text-muted-light dark:text-text-muted-dark text-sm font-medium">Informações completas do empréstimo consignado</p>
            </div>
            {isPaidCurrent ? (
              <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs font-bold border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="w-4 h-4" />
                ADIMPLENTE
              </span>
            ) : (
              <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs font-bold border border-red-200 dark:border-red-800">
                <AlertCircle className="w-4 h-4" />
                INADIMPLENTE
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-bg-light dark:hover:bg-bg-dark rounded-full transition-colors text-text-muted-light dark:text-text-muted-dark"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-10">
          {/* Section: Empregador */}
          <section>
            <h4 className="text-[10px] font-bold text-primary dark:text-secondary uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Dados do Empregador
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <DetailItem label="Empregador" value={item.nomeEmpregador} />
              <DetailItem label="CNPJ Empregador" value={item.numeroInscricaoEmpregador} />
              <DetailItem label="Data de Admissão" value={item.dataAdmissao} />
              <DetailItem label="Matrícula" value={item.matricula} />
              <DetailItem label="CNPJ Estabelecimento" value={item.numeroInscricaoEstabelecimento} />
              <DetailItem label="Categoria" value={`${item["categoriaTrabalhador.codigo"]} - ${item["categoriaTrabalhador.descricao"]}`} className="md:col-span-3" />
            </div>
          </section>

          <div className="h-px bg-border-light dark:bg-border-dark" />

          {/* Section: Empregado */}
          <section>
            <h4 className="text-[10px] font-bold text-primary dark:text-secondary uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
              <User className="w-4 h-4" />
              Dados do Trabalhador
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <DetailItem label="Empregado" value={item.nomeTrabalhador} />
              <DetailItem label="CPF" value={formatCPF(item.cpf)} />
              <DetailItem label="Competência Consultada" value={item.competencia} />
            </div>
          </section>

          <div className="h-px bg-border-light dark:bg-border-dark" />

          {/* Section: Contrato */}
          <section>
            <h4 className="text-[10px] font-bold text-primary dark:text-secondary uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Dados do Contrato
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <DetailItem label="Instituição Financeira" value={item["ifConcessora.descricao"]} className="lg:col-span-2" />
              <DetailItem label="Número Contrato" value={item.contrato} className="lg:col-span-2" />
              
              <DetailItem label="Início Contrato" value={item.dataInicioContrato} />
              <DetailItem label="Fim Contrato" value={item.dataFimContrato} />
              <DetailItem label="Início Desconto" value={item.competenciaInicioDesconto} />
              <DetailItem label="Fim Desconto" value={item.competenciaFimDesconto} />

              <DetailItem label="Valor Liberado" value={formatCurrency(item.valorLiberado)} highlight />
              <DetailItem label="Valor Empréstimo" value={formatCurrency(item.valorEmprestimo)} highlight />
              <DetailItem label="Valor Parcela" value={formatCurrency(item.valorParcela)} highlight />
              <DetailItem label="Total Parcelas" value={item.totalParcelas.toString()} />
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="p-8 bg-bg-light/50 dark:bg-bg-dark/50 border-t border-border-light dark:border-border-dark flex justify-end">
          <button
            onClick={onClose}
            className="px-8 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary-hover transition-all shadow-lg shadow-primary/20"
          >
            Fechar Detalhes
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function DetailItem({ label, value, className, highlight }: { label: string, value: string, className?: string, highlight?: boolean }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <p className="text-[10px] font-bold text-text-muted-light dark:text-text-muted-dark uppercase tracking-widest">{label}</p>
      <p className={cn(
        "text-text-light dark:text-text-dark font-semibold leading-tight",
        highlight ? "text-xl font-bold text-primary dark:text-secondary" : "text-base"
      )}>
        {value || '-'}
      </p>
    </div>
  );
}
