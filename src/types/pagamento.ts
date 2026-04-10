export interface PagamentoConsignado {
  id?: string;
  usuarioId: string;
  importadoEm: string;
  competencia: string; // Comp. Apuração (MM/AAAA)
  vencimento: string; // DD/MM/AAAA
  nomeTrabalhador: string;
  matricula: string;
  cpf: string;
  contrato: string;
  instituicaoFinanceira: string;
  valorPago: number; // Valor Consignado na Guia
  numeroGuia: string;
  dataEmissaoGuia: string;
  nomeEmpregador: string;
  cnpjEmpregador: string;
}

export type PagamentoFirestore = Omit<PagamentoConsignado, 'id'>;
