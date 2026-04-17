export interface FGTSRecord {
  id: string;
  usuario_id: string;
  tipo: 'devido' | 'pago';
  cpf: string;
  nome_trabalhador: string;
  matricula?: string;
  categoria?: string;
  data_admissao?: string;
  estabelecimento?: string;
  tomador?: string;
  competencia_apuracao: string;
  competencia_referencia?: string;
  vencimento_debitos?: string;
  tipo_deposito: string;
  base_remuneracao_total?: number;
  valor_fgts_na_guia: number;
  juros?: number;
  atualizacao_monetaria?: number;
  multa?: number;
  total?: number;
  origem?: string;
  versao_ficha?: string;
  parcelamento?: string;
  importado_em: string;
}
