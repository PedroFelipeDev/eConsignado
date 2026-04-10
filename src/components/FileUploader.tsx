import React, { useState, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { FileUp, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface FileUploaderProps {
  user: User;
}

export function FileUploader({ user }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const processFiles = useCallback(async (files: FileList) => {
    setUploading(true);
    setStatus(null);
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
        errorCount++;
        continue;
      }

      try {
        const text = await file.text();
        const jsonData = JSON.parse(text);
        const dataArray = Array.isArray(jsonData) ? jsonData : [jsonData];

        const batch = dataArray.map(item => ({
          usuario_id: user.id,
          contrato: item.contrato,
          cpf: item.cpf,
          nome_trabalhador: item.nomeTrabalhador,
          matricula: item.matricula,
          if_concessora_codigo: item["ifConcessora.codigo"],
          if_concessora_descricao: item["ifConcessora.descricao"],
          inscricao_empregador_codigo: item["inscricaoEmpregador.codigo"],
          inscricao_empregador_descricao: item["inscricaoEmpregador.descricao"],
          numero_inscricao_empregador: item.numeroInscricaoEmpregador,
          nome_empregador: item.nomeEmpregador,
          data_inicio_contrato: item.dataInicioContrato,
          data_fim_contrato: item.dataFimContrato,
          competencia_inicio_desconto: item.competenciaInicioDesconto,
          competencia_fim_desconto: item.competenciaFimDesconto,
          total_parcelas: item.totalParcelas,
          valor_parcela: item.valorParcela,
          valor_emprestimo: item.valorEmprestimo,
          valor_liberado: item.valorLiberado,
          qtd_pagamentos: item.qtdPagamentos,
          qtd_escrituracoes: item.qtdEscrituracoes,
          "categoria_trabalhador_codigo": item["categoriaTrabalhador.codigo"],
          "categoria_trabalhador_descricao": item["categoriaTrabalhador.descricao"],
          competencia: item.competencia,
          "inscricao_estabelecimento_codigo": item["inscricaoEstabelecimento.codigo"],
          "inscricao_estabelecimento_descricao": item["inscricaoEstabelecimento.descricao"],
          numero_inscricao_estabelecimento: item.numeroInscricaoEstabelecimento,
          data_admissao: item.dataAdmissao,
          importado_em: new Date().toISOString()
        }));

        const { error } = await supabase
          .from('consignados')
          .insert(batch);

        if (error) {
          console.error("Error inserting data:", error);
          errorCount += batch.length;
        } else {
          successCount += batch.length;
        }
      } catch (error) {
        console.error("Error processing file:", error);
        errorCount++;
      }
    }

    setUploading(false);
    if (successCount > 0) {
      setStatus({ 
        type: 'success', 
        message: `${successCount} registros importados com sucesso!${errorCount > 0 ? ` (${errorCount} registros com erro)` : ''}` 
      });
    } else if (errorCount > 0) {
      setStatus({ type: 'error', message: 'Erro ao processar os arquivos. Verifique o formato JSON.' });
    }
  }, [user]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-display font-bold text-text-light dark:text-text-dark mb-1">Importar Dados</h2>
        <p className="text-text-muted-light dark:text-text-muted-dark text-sm">Selecione um ou mais arquivos JSON para importar para o sistema.</p>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={cn(
          "relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300",
          isDragging ? "border-primary bg-primary/5" : "border-border-light dark:border-border-dark bg-white dark:bg-card-dark",
          uploading && "opacity-50 pointer-events-none"
        )}
      >
        <input
          type="file"
          multiple
          accept=".json,application/json"
          onChange={onFileChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        
        <div className="flex flex-col items-center">
          <div className="w-20 h-20 bg-bg-light dark:bg-bg-dark rounded-2xl flex items-center justify-center mb-6 shadow-sm">
            {uploading ? (
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
            ) : (
              <FileUp className="w-10 h-10 text-primary" />
            )}
          </div>
          <h3 className="text-xl font-bold text-text-light dark:text-text-dark mb-2">
            {uploading ? 'Importando...' : 'Arraste seus arquivos aqui'}
          </h3>
          <p className="text-text-muted-light dark:text-text-muted-dark mb-6 text-sm">ou clique para selecionar no seu computador</p>
          <div className="flex gap-2">
            <span className="px-3 py-1 bg-bg-light dark:bg-bg-dark rounded-full text-[10px] font-bold text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider border border-border-light dark:border-border-dark">JSON</span>
            <span className="px-3 py-1 bg-bg-light dark:bg-bg-dark rounded-full text-[10px] font-bold text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider border border-border-light dark:border-border-dark">Múltiplos Arquivos</span>
          </div>
        </div>
      </div>

      {status && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "mt-6 p-4 rounded-xl flex items-center gap-3 border shadow-sm",
            status.type === 'success' 
              ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-100 dark:border-green-900/30" 
              : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-100 dark:border-red-900/30"
          )}
        >
          {status.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <p className="font-semibold text-sm">{status.message}</p>
        </motion.div>
      )}

      <div className="mt-12 bg-white dark:bg-card-dark rounded-2xl p-8 border border-border-light dark:border-border-dark transition-all duration-300 shadow-sm">
        <h4 className="font-bold text-text-light dark:text-text-dark mb-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-primary" />
          Instruções de Importação
        </h4>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-text-muted-light dark:text-text-muted-dark">
          <li className="flex gap-3 p-3 bg-bg-light dark:bg-bg-dark rounded-xl border border-border-light dark:border-border-dark">
            <span className="font-bold text-primary">01.</span>
            <span>O arquivo deve estar no formato JSON conforme o leiaute especificado.</span>
          </li>
          <li className="flex gap-3 p-3 bg-bg-light dark:bg-bg-dark rounded-xl border border-border-light dark:border-border-dark">
            <span className="font-bold text-primary">02.</span>
            <span>Você pode selecionar vários arquivos de uma vez para processamento em lote.</span>
          </li>
          <li className="flex gap-3 p-3 bg-bg-light dark:bg-bg-dark rounded-xl border border-border-light dark:border-border-dark">
            <span className="font-bold text-primary">03.</span>
            <span>O sistema validará os dados antes de salvar no banco de dados.</span>
          </li>
          <li className="flex gap-3 p-3 bg-bg-light dark:bg-bg-dark rounded-xl border border-border-light dark:border-border-dark">
            <span className="font-bold text-primary">04.</span>
            <span>Certifique-se de que a estrutura do JSON corresponde aos campos do eConsignado.</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
