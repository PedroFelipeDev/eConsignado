import React, { useState, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { FileUp, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { parseFGTSCSV } from '../lib/csvParser';

interface FGTSUploaderProps {
  user: User;
}

export function FGTSUploader({ user }: FGTSUploaderProps) {
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
      // Accept .csv
      if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
        errorCount++;
        continue;
      }

      try {
        const text = await file.text();
        const parsedData = parseFGTSCSV(text);

        if (parsedData.length === 0) {
          errorCount++;
          continue;
        }

        const batch = parsedData.map(item => ({
          usuario_id: user.id,
          tipo: 'pago',
          cpf: item.cpf,
          nome_trabalhador: item.nome_trabalhador,
          matricula: item.matricula,
          categoria: item.categoria,
          data_admissao: item.data_admissao,
          estabelecimento: item.estabelecimento,
          tomador: item.tomador,
          competencia_apuracao: item.competencia_apuracao,
          competencia_referencia: item.competencia_referencia,
          vencimento_debitos: item.vencimento_debitos,
          tipo_deposito: item.tipo_deposito,
          base_remuneracao_total: item.base_remuneracao_total,
          valor_fgts_na_guia: item.valor_fgts_na_guia,
          juros: item.juros,
          atualizacao_monetaria: item.atualizacao_monetaria,
          multa: item.multa,
          total: item.total,
          origem: item.origem,
          versao_ficha: item.versao_ficha,
          parcelamento: item.parcelamento,
          importado_em: new Date().toISOString()
        }));

        // Client-side deduplication to prevent "ON CONFLICT DO UPDATE command cannot affect row a second time"
        const uniqueBatchMap = new Map();
        batch.forEach(item => {
          // Normalize key components
          const normCpf = item.cpf.replace(/\D/g, '');
          const key = `${item.tipo}-${normCpf}-${item.competencia_apuracao}-${item.tipo_deposito}`;
          uniqueBatchMap.set(key, item);
        });

        const deduplicatedBatch = Array.from(uniqueBatchMap.values());

        // Process in chunks to prevent "statement timeout"
        const CHUNK_SIZE = 100;
        for (let j = 0; j < deduplicatedBatch.length; j += CHUNK_SIZE) {
          const chunk = deduplicatedBatch.slice(j, j + CHUNK_SIZE);
          
          const { error } = await supabase
            .from('fgts_trabalhador')
            .upsert(chunk, { 
              onConflict: 'usuario_id,tipo,cpf,competencia_apuracao,tipo_deposito' 
            });

          if (error) {
            console.error("Error inserting FGTS chunk:", error);
            setStatus({ type: 'error', message: `Erro ao salvar lote no banco: ${error.message}` });
            setUploading(false);
            return;
          }
          
          successCount += chunk.length;
        }
      } catch (error: any) {
        console.error("Error processing CSV file:", error);
        setStatus({ type: 'error', message: `Erro no processamento: ${error.message || 'Erro desconhecido'}` });
        setUploading(false);
        return;
      }
    }

    setUploading(false);
    if (successCount > 0) {
      setStatus({ 
        type: 'success', 
        message: `${successCount} registros de pagamentos de FGTS importados com sucesso!${errorCount > 0 ? ` (${errorCount} registros com erro)` : ''}` 
      });
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
        <h2 className="text-3xl font-display font-bold text-text-light dark:text-text-dark mb-1">
          Importar Pagamentos de FGTS
        </h2>
        <p className="text-text-muted-light dark:text-text-muted-dark text-sm">
          Selecione o arquivo CSV exportado do FGTS Digital para importar os dados de pagamentos realizados.
        </p>
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
          accept=".csv,text/csv"
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
            {uploading ? 'Importando CSV...' : 'Arraste seu CSV aqui'}
          </h3>
          <p className="text-text-muted-light dark:text-text-muted-dark mb-6 text-sm">ou clique para selecionar no seu computador</p>
          <div className="flex gap-2">
            <span className="px-3 py-1 bg-bg-light dark:bg-bg-dark rounded-full text-[10px] font-bold text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider border border-border-light dark:border-border-dark">CSV</span>
            <span className="px-3 py-1 bg-bg-light dark:bg-bg-dark rounded-full text-[10px] font-bold text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider border border-border-light dark:border-border-dark">20 Colunas</span>
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
          Instruções de Importação de FGTS
        </h4>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-text-muted-light dark:text-text-muted-dark">
          <li className="flex gap-3 p-3 bg-bg-light dark:bg-bg-dark rounded-xl border border-border-light dark:border-border-dark">
            <span className="font-bold text-primary">01.</span>
            <span>O arquivo deve conter as 20 colunas padrão do FGTS Digital.</span>
          </li>
          <li className="flex gap-3 p-3 bg-bg-light dark:bg-bg-dark rounded-xl border border-border-light dark:border-border-dark">
            <span className="font-bold text-primary">02.</span>
            <span>O sistema cruzará os dados por CPF e Competência.</span>
          </li>
          <li className="flex gap-3 p-3 bg-bg-light dark:bg-bg-dark rounded-xl border border-border-light dark:border-border-dark">
            <span className="font-bold text-primary">03.</span>
            <span>A competência será exibida no formato MM/AAAA.</span>
          </li>
          <li className="flex gap-3 p-3 bg-bg-light dark:bg-bg-dark rounded-xl border border-border-light dark:border-border-dark">
            <span className="font-bold text-primary">04.</span>
            <span>Valores de 13º salário serão identificados automaticamente.</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
