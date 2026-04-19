import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Consignado } from '../types/consignado';
import { PagamentoConsignado } from '../types/pagamento';
import { formatCurrency, formatCPF, normalizeContract, normalizeCPF } from './utils';

export function generatePDF(data: Consignado[], payments: PagamentoConsignado[], competence?: string) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(0, 70, 173); // #0046AD
  doc.rect(0, 0, pageWidth, 25, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('eConsignado', 15, 17);
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Relatório Detalhado de Contratos', 15, 22);

  // Info
  doc.setTextColor(0, 70, 173);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`Competência: ${competence || 'Todas'}`, 15, 40);
  doc.text(`Data de Emissão: ${new Date().toLocaleDateString('pt-BR')}`, 15, 45);
  doc.text(`Total de Registros: ${data.length}`, 15, 50);

  // Table
  const tableData = data.map(item => {
    const normalizedItemContrato = normalizeContract(item.contrato);
    const normalizedItemCPF = normalizeCPF(item.cpf);
    
    const payment = payments.find(p => 
      normalizeContract(p.contrato) === normalizedItemContrato && 
      normalizeCPF(p.cpf) === normalizedItemCPF && 
      p.competencia === item.competencia
    );

    let situacao = 'PENDENTE';
    if (payment) {
      const isDivergent = Math.abs(payment.valorPago - item.valorParcela) > 0.01;
      situacao = isDivergent ? `DIVERGENTE (${formatCurrency(payment.valorPago)})` : 'PAGO';
    }

    return [
      item.competencia,
      item.nomeTrabalhador,
      formatCPF(item.cpf),
      item["ifConcessora.descricao"],
      item.competenciaInicioDesconto,
      item.competenciaFimDesconto,
      formatCurrency(item.valorParcela),
      situacao
    ];
  });

  const totalValue = data.reduce((acc, curr) => acc + curr.valorParcela, 0);

  autoTable(doc, {
    startY: 60,
    head: [['Comp.', 'Trabalhador', 'CPF', 'Instituição', 'Início', 'Fim', 'Parcela', 'Situação']],
    body: tableData,
    foot: [['', '', '', '', '', 'TOTAL:', formatCurrency(totalValue), '']],
    headStyles: {
      fillColor: [0, 70, 173],
      textColor: [255, 255, 255],
      fontSize: 7,
      fontStyle: 'bold'
    },
    bodyStyles: {
      fontSize: 6,
      textColor: [30, 41, 59] // Slate 800
    },
    footStyles: {
      fillColor: [248, 250, 252], // Slate 50
      textColor: [0, 70, 173],
      fontSize: 7,
      fontStyle: 'bold'
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    margin: { top: 20 },
    didDrawPage: (data: any) => {
      // Footer
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Página ${data.pageNumber}`,
        pageWidth - 25,
        doc.internal.pageSize.getHeight() - 10
      );
    }
  });

  doc.save(`relatorio-consignado-${competence || 'geral'}-${new Date().getTime()}.pdf`);
}

export function generatePaymentsPDF(payments: any[]) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(16, 185, 129); // emerald-500
  doc.rect(0, 0, pageWidth, 25, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('eConsignado', 15, 17);
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Relatório de Pagamentos (Consignado e FGTS)', 15, 22);

  // Info
  doc.setTextColor(16, 185, 129);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`Data de Emissão: ${new Date().toLocaleDateString('pt-BR')}`, 15, 40);
  doc.text(`Total de registros: ${payments.length}`, 15, 45);

  // Table
  const tableData = payments.map(p => {
    const valorConsignado = p.valorConsignado ?? p.valorPago ?? 0;
    const valorFGTS = p.valorFGTS ?? 0;
    
    return [
      p.competencia || '-',
      p.nomeTrabalhador || '-',
      formatCPF(p.cpf || ''),
      p.contrato || '-',
      formatCurrency(valorConsignado),
      formatCurrency(valorFGTS)
    ];
  });

  const totalConsignado = payments.reduce((acc, curr) => acc + (curr.valorConsignado ?? curr.valorPago ?? 0), 0);
  const totalFGTS = payments.reduce((acc, curr) => acc + (curr.valorFGTS ?? 0), 0);

  autoTable(doc, {
    startY: 55,
    head: [['Comp.', 'Trabalhador', 'CPF', 'Contrato', 'Pago (Consignado)', 'Pago (FGTS)']],
    body: tableData,
    foot: [['', '', '', 'TOTAIS:', formatCurrency(totalConsignado), formatCurrency(totalFGTS)]],
    headStyles: {
      fillColor: [16, 185, 129],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold'
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [30, 41, 59]
    },
    footStyles: {
      fillColor: [248, 250, 252],
      textColor: [16, 185, 129],
      fontSize: 8,
      fontStyle: 'bold'
    },
    margin: { top: 20 },
  });

  doc.save(`gestao-pagamentos-${new Date().getTime()}.pdf`);
}

export function generateFGTSReconciliationPDF(data: any[], year: number) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(37, 99, 235); // blue-600
  doc.rect(0, 0, pageWidth, 25, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('eConsignado', 15, 17);
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Conciliação de FGTS Devido vs Pago', 15, 22);

  // Info
  doc.setTextColor(37, 99, 235);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`Ano de Referência: ${year}`, 15, 40);
  doc.text(`Data de Emissão: ${new Date().toLocaleDateString('pt-BR')}`, 15, 45);

  // Table
  const tableData = data.map(item => [
    item.competencia,
    formatCurrency(item.valor_devido),
    formatCurrency(item.valor_pago),
    formatCurrency(item.saldo)
  ]);

  const totalDevido = data.reduce((acc, curr) => acc + curr.valor_devido, 0);
  const totalPago = data.reduce((acc, curr) => acc + curr.valor_pago, 0);
  const totalSaldo = data.reduce((acc, curr) => acc + curr.saldo, 0);

  autoTable(doc, {
    startY: 55,
    head: [['Competência', 'Devido (Manual)', 'Pago (Importado)', 'Saldo']],
    body: tableData,
    foot: [['TOTAL:', formatCurrency(totalDevido), formatCurrency(totalPago), formatCurrency(totalSaldo)]],
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: 'bold'
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59]
    },
    footStyles: {
      fillColor: [248, 250, 252],
      textColor: [37, 99, 235],
      fontSize: 9,
      fontStyle: 'bold'
    },
    margin: { top: 20 },
  });

  doc.save(`conciliacao-fgts-${year}-${new Date().getTime()}.pdf`);
}

export function generateFGTSReconciliationCSV(data: any[]) {
  const headers = ['Competencia', 'Devido (Manual)', 'Pago (Importado)', 'Saldo'];
  const rows = data.map(item => [
    item.competencia,
    item.valor_devido.toString().replace('.', ','),
    item.valor_pago.toString().replace('.', ','),
    item.saldo.toString().replace('.', ',')
  ]);

  const csvContent = [
    headers.join(';'),
    ...rows.map(row => row.join(';'))
  ].join('\n');

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `conciliacao-fgts-${new Date().getTime()}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function generatePaymentsCSV(payments: any[]) {
  const headers = ['Competencia', 'Trabalhador', 'CPF', 'Contrato', 'Pago Consignado', 'Pago FGTS'];
  const rows = payments.map(p => [
    p.competencia || '-',
    p.nomeTrabalhador || '-',
    p.cpf || '-',
    p.contrato || '-',
    (p.valorConsignado ?? p.valorPago ?? 0).toString().replace('.', ','),
    (p.valorFGTS ?? 0).toString().replace('.', ',')
  ]);

  const csvContent = [
    headers.join(';'),
    ...rows.map(row => row.join(';'))
  ].join('\n');

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `gestao-pagamentos-${new Date().getTime()}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
