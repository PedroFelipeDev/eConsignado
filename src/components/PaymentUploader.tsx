import React, { useState, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { PagamentoConsignado } from '../types/pagamento';
import { FileUp, CheckCircle2, AlertCircle, Loader2, FileText } from 'lucide-react';
import { motion } from 'motion/react';
import { cn, normalizeContract, normalizeCPF } from '../lib/utils';
import * as pdfjsLib from 'pdfjs-dist';
import { GoogleGenAI, Type } from "@google/genai";

// Configure PDF.js worker using a reliable CDN
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

interface PaymentUploaderProps {
  user: User;
}

export function PaymentUploader({ user }: PaymentUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [overwrite, setOverwrite] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const extractImagesFromPDF = async (file: File): Promise<{data: string, mimeType: string}[]> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ 
        data: arrayBuffer,
        useWorkerFetch: true,
        isEvalSupported: true
      });
      const pdf = await loadingTask.promise;
      const images: {data: string, mimeType: string}[] = [];
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) continue;
        
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        await page.render({ canvasContext: context, viewport, canvas }).promise;
        const base64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
        images.push({ data: base64, mimeType: 'image/jpeg' });
      }
      return images;
    } catch (error) {
      console.error("Erro ao extrair imagens do PDF:", error);
      return [];
    }
  };

  const extractTextFromPDF = async (file: File): Promise<string> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ 
        data: arrayBuffer,
        useWorkerFetch: true,
        isEvalSupported: true
      });
      const pdf = await loadingTask.promise;
      let fullText = '';
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        // Group items by Y coordinate with a tolerance to handle tables
        const items = textContent.items as any[];
        const linesMap = new Map<number, any[]>();
        const tolerance = 15; // Increased tolerance for better row grouping

        items.forEach((item) => {
          const y = item.transform[5];
          let found = false;
          for (const [lineY, lineItems] of linesMap.entries()) {
            if (Math.abs(y - lineY) < tolerance) {
              lineItems.push(item);
              found = true;
              break;
            }
          }
          if (!found) {
            linesMap.set(y, [item]);
          }
        });

        // Sort Y coordinates from top to bottom (PDF Y is bottom-up)
        const sortedY = Array.from(linesMap.keys()).sort((a, b) => b - a);

        sortedY.forEach((y) => {
          const lineItems = linesMap.get(y)!;
          // Sort items in the line from left to right
          lineItems.sort((a, b) => a.transform[4] - b.transform[4]);
          // Use | as a separator to preserve boundaries between text objects
          const lineText = lineItems.map(item => item.str).join('|').trim();
          if (lineText) {
            fullText += lineText + '\n';
          }
        });
      }
      
      return fullText;
    } catch (error) {
      console.error("Erro detalhado na extração do PDF:", error);
      throw error;
    }
  };

  const parsePDFText = (text: string) => {
    const cleanText = text.replace(/\|/g, ' ');
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const normalizedText = cleanText.replace(/\s+/g, ' ').trim();
    
    console.log("DEBUG - PDF Text Preview:", normalizedText.substring(0, 500));
    
    // Header extraction
    const cnpjMatch = normalizedText.match(/Empregador:\s*([\d.]+)/i) || normalizedText.match(/(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/);
    const nomeEmpregadorMatch = normalizedText.match(/Nome\s+(?:do\s+)?Empregador:\s*(.+?)\s*(?:Qtd\.|Origem:|Vencimento|N[úu]mero|Comp\.|CNPJ)/i);
    const numeroGuiaMatch = normalizedText.match(/N[úu]mero\s+(?:da\s+)?Guia:\s*([\d-]+)/i) || normalizedText.match(/(\d{16}-\d)/);
    const dataEmissaoMatch = normalizedText.match(/Data\s+(?:de\s+)?Emiss[ãa]o:\s*([\d/:\s]+?)(?:\s*\(Brasília\)|\s*Emitida|\s*N[úu]mero|\s*Rela[çc][ãa]o|\s*Compet[êe]ncia)/i) || normalizedText.match(/(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}:\d{2})/);

    const cnpjEmpregador = cnpjMatch ? cnpjMatch[1] : '';
    const nomeEmpregador = nomeEmpregadorMatch ? nomeEmpregadorMatch[1].trim() : '';
    const numeroGuia = numeroGuiaMatch ? numeroGuiaMatch[1] : '';
    const dataEmissaoGuia = dataEmissaoMatch ? dataEmissaoMatch[1].trim() : '';

    const qtdMatch = normalizedText.match(/Qtd\.\s*Trabalhadores\s*Consignado:\s*(\d+)/i) || 
                     normalizedText.match(/Consignado\s+na\s+Guia\s+(\d+)/i) ||
                     normalizedText.match(/Total\s+de\s+Trabalhadores:\s*(\d+)/i);
    
    const expectedCount = qtdMatch ? parseInt(qtdMatch[1]) : 0;
    const headerTotalMatch = normalizedText.match(/Total\s+da\s+Guia\s+\(FGTS\s+\+\s+Consignado\):\s*([\d.]+,\d{2})/i) ||
                             normalizedText.match(/Total\s+Consignado\s+([\d.]+,\d{2})/i);
    const headerTotal = headerTotalMatch ? parseFloat(headerTotalMatch[1].replace(/\./g, '').replace(',', '.')) : 0;

    // More robust regex: allowing for different delimiters and making some fields more flexible
    const rowRegex = /(\d{2}\/\d{4})\s+(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+(\d+)\s+(\d{3}[\d.-]+\d{2})\s+(\d+)\s+(?:\d+\s+)?([\d.]+,\d{2})/i;
    
    const payments: any[] = [];
    const seenKeys = new Set<string>();

    const addPayment = (p: any) => {
      if (p.nomeTrabalhador.includes('TOTAL') || p.nomeTrabalhador.includes('GUIA') || p.nomeTrabalhador === 'NOME NÃO IDENTIFICADO') {
        if (p.nomeTrabalhador === 'NOME NÃO IDENTIFICADO' && !p.contrato) return;
      }

      if (headerTotal > 0 && Math.abs(p.valorPago - headerTotal) < 0.05) return;

      const normalizedContrato = normalizeContract(p.contrato);
      const normalizedCPF = normalizeCPF(p.cpf);
      const key = `${normalizedCPF}-${normalizedContrato}-${p.competencia}-${p.valorPago}`;
      
      if (!seenKeys.has(key) && p.valorPago > 0) {
        seenKeys.add(key);
        payments.push({
          ...p,
          contrato: normalizedContrato,
          cpf: normalizedCPF
        });
      }
    };

    console.log(`Iniciando análise de ${lines.length} linhas...`);

    // Strategy 1: Line-by-line matching
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const cleanLine = line.replace(/\|/g, ' ').replace(/\s+/g, ' ').trim();
      
      if (cleanLine.toUpperCase().includes('TOTAL') || cleanLine.toUpperCase().includes('GUIA (FGTS')) continue;

      const match = cleanLine.match(rowRegex);
      if (match) {
        console.log(`LINHA MATCH OK [${i}]:`, cleanLine);
        try {
          const valorPago = parseFloat(match[7].replace(/\./g, '').replace(',', '.'));
          if (!isNaN(valorPago)) {
            addPayment({
              competencia: match[1],
              vencimento: match[2],
              nomeTrabalhador: match[3].trim().toUpperCase(),
              matricula: match[4],
              cpf: match[5],
              contrato: match[6],
              instituicaoFinanceira: '', 
              valorPago,
              numeroGuia,
              dataEmissaoGuia,
              nomeEmpregador,
              cnpjEmpregador,
              usuarioId: user.id,
              importadoEm: new Date().toISOString()
            });
          }
        } catch (e) {
          console.warn("Erro ao processar linha do PDF:", e);
        }
      } else if (cleanLine.includes('/') && cleanLine.length > 50) {
        console.log(`LINHA NO MATCH [${i}]:`, cleanLine);
      }
    }

    const totalExtraido = payments.reduce((acc, curr) => acc + curr.valorPago, 0);
    console.log(`Processamento concluído. Encontrados: ${payments.length} pagamentos. Total Extraído: ${totalExtraido}`);
    
    if (payments.length > 0) {
      payments[0].expectedCount = expectedCount;
      payments[0].headerTotal = headerTotal;
    }

    return payments;
  };

  const parseWithGemini = async (text: string, images: {data: string, mimeType: string}[]): Promise<any[]> => {
    try {
      console.log(`Iniciando extração multimodal com Gemini (${images.length} páginas)...`);
      
      let allPagamentos: any[] = [];
      let headerInfo: any = { cnpjEmpregador: '', nomeEmpregador: '', numeroGuia: '', dataEmissaoGuia: '' };

      const headerTotalMatch = text.match(/Total\s+da\s+Guia.*?([\d.]+,\d{2})/i) || text.match(/Total\s+Consignado\s+([\d.]+,\d{2})/i);
      const headerTotal = headerTotalMatch ? parseFloat(headerTotalMatch[1].replace(/\./g, '').replace(',', '.')) : 0;

      for (let i = 0; i < images.length; i++) {
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: [
            { inlineData: images[i] },
            { 
              text: `Analise esta imagem (Página ${i + 1} de ${images.length}) do PDF "Detalhe da Guia Emitida" do FGTS Digital.
              
              MISSÃO:
              1. Localize a tabela entre "Relação de Trabalhadores" e "Total Consignado".
              2. Extraia TODOS os registros desta tabela.
              3. Para cada trabalhador, extraia: Competência (MM/AAAA), Vencimento, Nome Completo, Matrícula, CPF, Número do Contrato e Valor Consignado na Guia.
              4. IMPORTANTE: Se o mesmo CPF aparecer em múltiplas linhas com CONTRATOS diferentes, você DEVE criar um objeto para cada linha. Não unifique.
              5. SEGURANÇA: Ignore o valor "Total da Guia" (${headerTotal}) e o "Total Consignado". Eles NÃO são pagamentos individuais.
              
              Retorne um JSON:
              {
                "cnpjEmpregador": "...", "nomeEmpregador": "...", "numeroGuia": "...", "dataEmissaoGuia": "...",
                "pagamentos": [ { "competencia": "...", "nomeTrabalhador": "...", "cpf": "...", "contrato": "...", "valorPago": number, ... } ]
              }`
            }
          ],
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                cnpjEmpregador: { type: Type.STRING },
                nomeEmpregador: { type: Type.STRING },
                numeroGuia: { type: Type.STRING },
                dataEmissaoGuia: { type: Type.STRING },
                pagamentos: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      competencia: { type: Type.STRING },
                      vencimento: { type: Type.STRING },
                      nomeTrabalhador: { type: Type.STRING },
                      matricula: { type: Type.STRING },
                      cpf: { type: Type.STRING },
                      contrato: { type: Type.STRING },
                      instituicaoFinanceira: { type: Type.STRING },
                      valorPago: { type: Type.NUMBER }
                    },
                    required: ["competencia", "nomeTrabalhador", "cpf", "contrato", "valorPago"]
                  }
                }
              }
            }
          }
        });

        const result = JSON.parse(response.text);
        if (result.cnpjEmpregador) headerInfo = { ...headerInfo, ...result };
        if (result.pagamentos) allPagamentos = [...allPagamentos, ...result.pagamentos];
      }

      return allPagamentos
        .filter((p: any) => {
          const val = p.valorPago;
          if (headerTotal > 0 && Math.abs(val - headerTotal) < 0.05) return false;
          return val > 0 && val < (headerTotal || 999999);
        })
        .map((p: any) => ({
          ...p,
          nomeTrabalhador: p.nomeTrabalhador.toUpperCase(),
          numeroGuia: headerInfo.numeroGuia,
          dataEmissaoGuia: headerInfo.dataEmissaoGuia,
          nomeEmpregador: headerInfo.nomeEmpregador,
          cnpjEmpregador: headerInfo.cnpjEmpregador,
          usuarioId: user.id,
          importadoEm: new Date().toISOString()
        }));
    } catch (error) {
      console.error("Erro na extração multimodal com Gemini:", error);
      return [];
    }
  };

  const processFiles = useCallback(async (files: FileList) => {
    setUploading(true);
    setStatus(null);
    let successCount = 0;
    let errorCount = 0;
    let duplicateCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        errorCount++;
        continue;
      }

      try {
        const [text, images] = await Promise.all([
          extractTextFromPDF(file),
          extractImagesFromPDF(file)
        ]);
        
        let payments = parsePDFText(text);
        const qtdMatch = text.match(/Qtd\.\s*Trabalhadores\s*Consignado:\s*(\d+)/i) || text.match(/Consignado\s+na\s+Guia\s+(\d+)/i);
        const expectedCount = qtdMatch ? parseInt(qtdMatch[1]) : 0;
        const totalExtraido = payments.reduce((acc, curr) => acc + curr.valorPago, 0);
        const headerTotal = payments[0]?.headerTotal || 0;
        
        const uniqueCPFsInExtraction = new Set(payments.map(p => p.cpf));
        const hasMultiContractInExtraction = uniqueCPFsInExtraction.size < payments.length && payments.length > 0;

        const isSuspicious = (payments.length === 0) || (expectedCount > 0 && payments.length < expectedCount) || (headerTotal > 0 && Math.abs(totalExtraido - headerTotal) > 0.05) || hasMultiContractInExtraction;

        if (isSuspicious || overwrite) {
          const geminiPayments = await parseWithGemini(text, images);
          if (geminiPayments.length > 0) payments = geminiPayments;
        }

        if (payments.length === 0) {
          errorCount++;
          continue;
        }

        const guia = payments[0].numeroGuia;
        if (guia && !overwrite) {
          const { data: existing } = await supabase.from('pagamentos').select('id').eq('usuario_id', user.id).eq('numero_guia', guia).limit(1);
          if (existing && existing.length > 0) {
            duplicateCount++;
            continue;
          }
        } else if (guia && overwrite) {
          await supabase.from('pagamentos').delete().eq('usuario_id', user.id).eq('numero_guia', guia);
        }

        const batch = payments.map(p => ({
          usuario_id: user.id,
          contrato: p.contrato,
          cpf: p.cpf,
          competencia: p.competencia,
          vencimento: p.vencimento,
          valor_pago: p.valorPago,
          nome_trabalhador: p.nomeTrabalhador,
          matricula: p.matricula,
          instituicao_financeira: p.instituicaoFinanceira || '',
          numero_guia: p.numeroGuia,
          data_emissao_guia: p.dataEmissaoGuia,
          nome_empregador: p.nomeEmpregador,
          cnpj_empregador: p.cnpjEmpregador,
          importado_em: new Date().toISOString()
        }));

        const { error: insertError } = await supabase.from('pagamentos').insert(batch);
        if (insertError) throw insertError;
        successCount += batch.length;
      } catch (error) {
        console.error("Error processing PDF:", error);
        errorCount++;
      }
    }

    setUploading(false);
    if (successCount > 0) {
      setStatus({ type: 'success', message: `${successCount} pagamentos importados!` });
    } else if (duplicateCount > 0) {
      setStatus({ type: 'error', message: 'Guia já importada.' });
    } else {
      setStatus({ type: 'error', message: 'Erro ao processar.' });
    }
  }, [user, overwrite]);

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
        <h2 className="text-3xl font-display font-bold text-text-light dark:text-text-dark mb-1">Importar Pagamentos</h2>
        <p className="text-text-muted-light dark:text-text-muted-dark text-sm">Selecione o PDF "Detalhe da Guia Emitida" do FGTS Digital para importar os pagamentos.</p>
      </div>

      <div className="mb-6 flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 rounded-xl">
        <div className="flex-1">
          <h4 className="text-sm font-bold text-blue-700 dark:text-blue-400">Opções de Importação</h4>
          <p className="text-xs text-blue-600 dark:text-blue-400/80">Ative para substituir dados se a guia já existir.</p>
        </div>
        <button
          onClick={() => setOverwrite(!overwrite)}
          className={cn(
            "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none",
            overwrite ? "bg-primary" : "bg-slate-300 dark:bg-slate-700"
          )}
        >
          <span
            className={cn(
              "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
              overwrite ? "translate-x-6" : "translate-x-1"
            )}
          />
        </button>
        <span className="text-xs font-bold text-text-light dark:text-text-dark">Sobrescrever</span>
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
          accept=".pdf,application/pdf"
          onChange={onFileChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        
        <div className="flex flex-col items-center">
          <div className="w-20 h-20 bg-bg-light dark:bg-bg-dark rounded-2xl flex items-center justify-center mb-6 shadow-sm">
            {uploading ? (
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
            ) : (
              <FileText className="w-10 h-10 text-primary" />
            )}
          </div>
          <h3 className="text-xl font-bold text-text-light dark:text-text-dark mb-2">
            {uploading ? 'Processando PDF...' : 'Arraste o PDF da Guia aqui'}
          </h3>
          <p className="text-text-muted-light dark:text-text-muted-dark mb-6 text-sm">ou clique para selecionar no seu computador</p>
          <div className="flex gap-2">
            <span className="px-3 py-1 bg-bg-light dark:bg-bg-dark rounded-full text-[10px] font-bold text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider border border-border-light dark:border-border-dark">PDF</span>
            <span className="px-3 py-1 bg-bg-light dark:bg-bg-dark rounded-full text-[10px] font-bold text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider border border-border-light dark:border-border-dark">FGTS Digital</span>
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
          Como funciona a vinculação?
        </h4>
        <div className="space-y-4 text-sm text-text-muted-light dark:text-text-muted-dark">
          <p>
            O sistema utiliza o <strong>CPF</strong>, o <strong>Número do Contrato</strong> e a <strong>Competência</strong> para vincular automaticamente os pagamentos aos empréstimos cadastrados.
          </p>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <li className="flex gap-3 p-3 bg-bg-light dark:bg-bg-dark rounded-xl border border-border-light dark:border-border-dark">
              <span className="font-bold text-primary">01.</span>
              <span>Extração automática de dados do PDF da Guia FGTS Digital.</span>
            </li>
            <li className="flex gap-3 p-3 bg-bg-light dark:bg-bg-dark rounded-xl border border-border-light dark:border-border-dark">
              <span className="font-bold text-primary">02.</span>
              <span>Identificação de adimplência por competência.</span>
            </li>
            <li className="flex gap-3 p-3 bg-bg-light dark:bg-bg-dark rounded-xl border border-border-light dark:border-border-dark">
              <span className="font-bold text-primary">03.</span>
              <span>Visualização intuitiva no dashboard e na tabela de contratos.</span>
            </li>
            <li className="flex gap-3 p-3 bg-bg-light dark:bg-bg-dark rounded-xl border border-border-light dark:border-border-dark">
              <span className="font-bold text-primary">04.</span>
              <span>Histórico de guias pagas vinculado ao trabalhador.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
