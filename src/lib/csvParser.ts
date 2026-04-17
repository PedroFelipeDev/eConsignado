/**
 * Simple CSV Parser for the FGTS system
 */

export interface ParsedFGTS {
  cpf: string;
  nome_trabalhador: string;
  matricula: string;
  categoria: string;
  data_admissao: string;
  estabelecimento: string;
  tomador: string;
  competencia_apuracao: string;
  competencia_referencia: string;
  vencimento_debitos: string;
  tipo_deposito: string;
  base_remuneracao_total: number;
  valor_fgts_na_guia: number;
  juros: number;
  atualizacao_monetaria: number;
  multa: number;
  total: number;
  origem: string;
  versao_ficha: string;
  parcelamento: string;
}

export function parseFGTSCSV(text: string): ParsedFGTS[] {
  // Detect separator (comma or semicolon)
  const firstLine = text.split('\n')[0];
  const separator = firstLine.includes(';') ? ';' : ',';
  
  const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
  if (lines.length <= 1) return [];

  const results: ParsedFGTS[] = [];
  
  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    // Handle quotes in CSV
    const columns: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === separator && !inQuotes) {
        columns.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    columns.push(current);

    if (columns.length < 13) continue; // Basic validation

    const parseNumber = (val: string) => {
      if (!val) return 0;
      // Handle BR number format (1.234,56 or 1234,56)
      return parseFloat(val.replace(/\./g, '').replace(',', '.')) || 0;
    };

    results.push({
      cpf: columns[0]?.trim() || '',
      nome_trabalhador: columns[1]?.trim() || '',
      matricula: columns[2]?.trim() || '',
      categoria: columns[3]?.trim() || '',
      data_admissao: columns[4]?.trim() || '',
      estabelecimento: columns[5]?.trim() || '',
      tomador: columns[6]?.trim() || '',
      competencia_apuracao: columns[7]?.trim() || '',
      competencia_referencia: columns[8]?.trim() || '',
      vencimento_debitos: columns[9]?.trim() || '',
      tipo_deposito: columns[10]?.trim() || '',
      base_remuneracao_total: parseNumber(columns[11]),
      valor_fgts_na_guia: parseNumber(columns[12]),
      juros: parseNumber(columns[13]),
      atualizacao_monetaria: parseNumber(columns[14]),
      multa: parseNumber(columns[15]),
      total: parseNumber(columns[16]),
      origem: columns[17]?.trim() || '',
      versao_ficha: columns[18]?.trim() || '',
      parcelamento: columns[19]?.trim() || ''
    });
  }

  return results;
}

const monthMap: Record<string, string> = {
  'jan': '01', 'fev': '02', 'mar': '03', 'abr': '04', 'mai': '05', 'jun': '06',
  'jul': '07', 'ago': '08', 'set': '09', 'out': '10', 'nov': '11', 'dez': '12'
};

export function formatCompetencia(comp: string): string {
  if (!comp) return '';
  
  // Handle "13o/2024" -> "13/2024"
  if (comp.toLowerCase().includes('13o') || comp.toLowerCase().includes('13º') || comp.toLowerCase().startsWith('13')) {
    const yearMatch = comp.match(/\d{4}/) || comp.match(/\d{2}$/);
    if (yearMatch) {
      let year = yearMatch[0];
      if (year.length === 2) year = `20${year}`;
      return `13/${year}`;
    }
  }

  // Handle "dez/24" -> "12/2024"
  const parts = comp.split('/');
  if (parts.length === 2) {
    let monthPart = parts[0].toLowerCase().trim();
    let yearPart = parts[1].trim();
    
    // Convert abr, mai, etc to 04, 05
    const month = monthMap[monthPart] || monthPart.padStart(2, '0');
    let year = yearPart;
    if (year.length === 2) year = `20${year}`;
    
    return `${month}/${year}`;
  }

  return comp;
}
