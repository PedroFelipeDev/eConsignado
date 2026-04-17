-- Create tables for eConsignado

-- Consignados Table
CREATE TABLE IF NOT EXISTS consignados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contrato TEXT NOT NULL,
  cpf TEXT NOT NULL,
  nome_trabalhador TEXT NOT NULL,
  matricula TEXT,
  if_concessora_codigo INTEGER,
  if_concessora_descricao TEXT,
  inscricao_empregador_codigo INTEGER,
  inscricao_empregador_descricao TEXT,
  numero_inscricao_empregador TEXT,
  nome_empregador TEXT,
  data_inicio_contrato TEXT,
  data_fim_contrato TEXT,
  competencia_inicio_desconto TEXT,
  competencia_fim_desconto TEXT,
  total_parcelas INTEGER,
  valor_parcela NUMERIC,
  valor_emprestimo NUMERIC,
  valor_liberado NUMERIC,
  qtd_pagamentos INTEGER,
  qtd_escrituracoes INTEGER,
  categoria_trabalhador_codigo INTEGER,
  categoria_trabalhador_descricao TEXT,
  competencia TEXT,
  inscricao_estabelecimento_codigo INTEGER,
  inscricao_estabelecimento_descricao TEXT,
  numero_inscricao_estabelecimento TEXT,
  data_admissao TEXT,
  importado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Pagamentos Table
CREATE TABLE IF NOT EXISTS pagamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contrato TEXT NOT NULL,
  cpf TEXT NOT NULL,
  competencia TEXT NOT NULL,
  valor_pago NUMERIC NOT NULL,
  nome_trabalhador TEXT,
  matricula TEXT,
  instituicao_financeira TEXT,
  numero_guia TEXT,
  data_emissao_guia TEXT,
  nome_empregador TEXT,
  cnpj_empregador TEXT,
  importado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE consignados ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagamentos ENABLE ROW LEVEL SECURITY;

-- Policies for Consignados
CREATE POLICY "Users can view their own consignados" ON consignados
  FOR SELECT USING (auth.uid() = usuario_id);

CREATE POLICY "Users can insert their own consignados" ON consignados
  FOR INSERT WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Users can update their own consignados" ON consignados
  FOR UPDATE USING (auth.uid() = usuario_id);

CREATE POLICY "Users can delete their own consignados" ON consignados
  FOR DELETE USING (auth.uid() = usuario_id);

-- Policies for Pagamentos
CREATE POLICY "Users can view their own pagamentos" ON pagamentos
  FOR SELECT USING (auth.uid() = usuario_id);

CREATE POLICY "Users can insert their own pagamentos" ON pagamentos
  FOR INSERT WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Users can update their own pagamentos" ON pagamentos
  FOR UPDATE USING (auth.uid() = usuario_id);

CREATE POLICY "Users can delete their own pagamentos" ON pagamentos
  FOR DELETE USING (auth.uid() = usuario_id);

-- FGTS Trabalhador Table
CREATE TABLE IF NOT EXISTS fgts_trabalhador (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('devido', 'pago')),
  cpf TEXT NOT NULL,
  nome_trabalhador TEXT NOT NULL,
  matricula TEXT,
  categoria TEXT,
  data_admissao TEXT,
  estabelecimento TEXT,
  tomador TEXT,
  competencia_apuracao TEXT NOT NULL,
  competencia_referencia TEXT,
  vencimento_debitos TEXT,
  tipo_deposito TEXT NOT NULL,
  base_remuneracao_total NUMERIC,
  valor_fgts_na_guia NUMERIC,
  juros NUMERIC,
  atualizacao_monetaria NUMERIC,
  multa NUMERIC,
  total NUMERIC,
  origem TEXT,
  versao_ficha TEXT,
  parcelamento TEXT,
  importado_em TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT fgts_trabalhador_unique_key UNIQUE (usuario_id, tipo, cpf, competencia_apuracao, tipo_deposito)
);

-- Enable RLS
ALTER TABLE fgts_trabalhador ENABLE ROW LEVEL SECURITY;

-- Policies for FGTS Trabalhador
CREATE POLICY "Users can view their own fgts" ON fgts_trabalhador
  FOR SELECT USING (auth.uid() = usuario_id);

CREATE POLICY "Users can insert their own fgts" ON fgts_trabalhador
  FOR INSERT WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Users can update their own fgts" ON fgts_trabalhador
  FOR UPDATE USING (auth.uid() = usuario_id);

CREATE POLICY "Users can delete their own fgts" ON fgts_trabalhador
  FOR DELETE USING (auth.uid() = usuario_id);
