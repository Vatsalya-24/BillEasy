import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export function downloadInvoicePdf(invoice, party, lines) {
  const doc = new jsPDF()

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text('INVOICE', 14, 20)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Invoice No: ${invoice.invoiceNo}`, 14, 30)
  doc.text(`Date: ${invoice.date}`, 14, 36)
  doc.text(`Status: ${invoice.status.toUpperCase()}`, 14, 42)

  doc.text(`Bill To:`, 140, 30)
  doc.text(`${party?.name || 'Walk-in customer'}`, 140, 36)
  if (party?.phone) doc.text(`${party.phone}`, 140, 42)

  const rows = lines.map((l) => {
    const lineTotal = l.qty * l.price * (1 + l.taxRate / 100)
    return [l.name, l.qty, `₹${l.price.toFixed(2)}`, `${l.taxRate}%`, `₹${lineTotal.toFixed(2)}`]
  })

  autoTable(doc, {
    startY: 52,
    head: [['Item', 'Qty', 'Price', 'Tax', 'Amount']],
    body: rows,
    theme: 'grid',
    headStyles: { fillColor: [20, 33, 61] }
  })

  const finalY = doc.lastAutoTable.finalY || 60
  doc.setFont('helvetica', 'bold')
  doc.text(`Total: ₹${invoice.total.toFixed(2)}`, 150, finalY + 10)

  doc.save(`${invoice.invoiceNo}.pdf`)
}
