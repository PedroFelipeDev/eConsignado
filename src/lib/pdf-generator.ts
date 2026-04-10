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

export function generatePaymentsPDF(payments: PagamentoConsignado[]) {
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
  doc.text('Relatório de Pagamentos Importados', 15, 22);

  // Info
  doc.setTextColor(16, 185, 129);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`Data de Emissão: ${new Date().toLocaleDateString('pt-BR')}`, 15, 40);
  doc.text(`Total de Pagamentos: ${payments.length}`, 15, 45);

  // Table
  const tableData = payments.map(p => [
    p.competencia,
    p.nomeTrabalhador,
    formatCPF(p.cpf),
    p.contrato,
    formatCurrency(p.valorPago),
    p.dataEmissaoGuia.split(' ')[0]
  ]);

  const totalPaid = payments.reduce((acc, curr) => acc + curr.valorPago, 0);

  autoTable(doc, {
    startY: 55,
    head: [['Comp.', 'Trabalhador', 'CPF', 'Contrato', 'Valor Pago', 'Data Guia']],
    body: tableData,
    foot: [['', '', '', 'TOTAL:', formatCurrency(totalPaid), '']],
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

  doc.save(`pagamentos-importados-${new Date().getTime()}.pdf`);
}

export function generatePaymentsCSV(payments: PagamentoConsignado[]) {
  const headers = ['Competencia', 'Trabalhador', 'CPF', 'Contrato', 'Matricula', 'Valor Pago', 'Data Emissao Guia', 'Numero Guia', 'Empregador'];
  const rows = payments.map(p => [
    p.competencia,
    p.nomeTrabalhador,
    p.cpf,
    p.contrato,
    p.matricula,
    p.valorPago.toString().replace('.', ','),
    p.dataEmissaoGuia,
    p.numeroGuia,
    p.nomeEmpregador
  ]);

  const csvContent = [
    headers.join(';'),
    ...rows.map(row => row.join(';'))
  ].join('\n');

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `pagamentos-importados-${new Date().getTime()}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
