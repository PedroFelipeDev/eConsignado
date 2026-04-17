export interface EsocialConfig {
  id: string;
  cnpj_cpf: string;
  nome: string;
  ambiente: 'producao' | 'producao_restrita';
  created_at: string;
  updated_at?: string;
}

export interface EsocialConsulta {
  id: string;
  usuario_id: string;
  config_id: string;
  cpfs_consultados: string[];
  tipos_eventos: string[];
  data_inicio: string;
  data_fim: string;
  status: 'pendente' | 'processando' | 'concluido' | 'erro';
  total_eventos_encontrados: number;
  requisicoes_usadas: number;
  mensagem_erro?: string;
  created_at: string;
}

export interface EsocialEvento {
  id: string;
  cpf_trabalhador: string;
  nome_trabalhador?: string;
  tipo_evento: string;
  id_evento_esocial: string;
  numero_recibo: string;
  periodo_apuracao: string;
  dados_parseados: Record<string, any>;
  data_processamento: string;
}

export interface QuotaInfo {
  totalHoje: number;
  limiteMaximo: number;
  restante: number;
  bloqueadoPeriodo: boolean;
  mensagemBloqueio: string | null;
}

export const TIPOS_EVENTO = [
  { id: 'S-1200', label: 'Remuneração', desc: 'Remuneração do Trabalhador vinculado ao RGPS' },
  { id: 'S-5002', label: 'IRRF', desc: 'Imposto de Renda Retido na Fonte por Trabalhador' },
  { id: 'S-2200', label: 'Admissão', desc: 'Cadastramento Inicial / Admissão do Trabalhador' },
  { id: 'S-2299', label: 'Desligamento', desc: 'Desligamento do Trabalhador' },
  { id: 'S-2300', label: 'TSVE Início', desc: 'Trabalhador Sem Vínculo de Emprego - Início' },
  { id: 'S-2399', label: 'TSVE Término', desc: 'Trabalhador Sem Vínculo de Emprego - Término' },
] as const;

// Base URL do servidor backend local
export const ESOCIAL_API_URL = 'http://localhost:3001/api/esocial';
