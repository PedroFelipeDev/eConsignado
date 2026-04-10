export interface Consignado {
  id?: string;
  "ifConcessora.codigo": number;
  "ifConcessora.descricao": string;
  contrato: string;
  cpf: string;
  matricula: string;
  "inscricaoEmpregador.codigo": number;
  "inscricaoEmpregador.descricao": string;
  numeroInscricaoEmpregador: string;
  nomeTrabalhador: string;
  nomeEmpregador: string;
  dataInicioContrato: string;
  dataFimContrato: string;
  competenciaInicioDesconto: string;
  competenciaFimDesconto: string;
  totalParcelas: number;
  valorParcela: number;
  valorEmprestimo: number;
  valorLiberado: number;
  qtdPagamentos: number;
  qtdEscrituracoes: number;
  "categoriaTrabalhador.codigo": number;
  "categoriaTrabalhador.descricao": string;
  competencia: string;
  "inscricaoEstabelecimento.codigo": number;
  "inscricaoEstabelecimento.descricao": string;
  numeroInscricaoEstabelecimento: string;
  dataAdmissao: string;
  // Metadata fields
  importadoEm?: string;
  usuarioId?: string;
}

export type ConsignadoFirestore = Omit<Consignado, 'id'> & {
  importadoEm: string;
  usuarioId: string;
};
