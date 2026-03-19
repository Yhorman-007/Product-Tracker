import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCOP } from './formatters';

export const generateReceiptPDF = (sale) => {
    const doc = new jsPDF({
        unit: 'mm',
        format: [80, 150] // Receipt printer format
    });

    const centerX = 40;

    // Get business data from localStorage
    const businessData = JSON.parse(localStorage.getItem('businessConfig') || JSON.stringify({
        businessName: 'PRODUCT TRACKER',
        nit: '123.456.789-0',
        address: 'MEDELLÍN, COLOMBIA'
    }));

    doc.setFontSize(14);
    doc.text(businessData.businessName.toUpperCase(), centerX, 10, { align: "center" });

    doc.setFontSize(8);
    doc.text(`Nit: ${businessData.nit}`, centerX, 15, { align: "center" });
    doc.text(businessData.address.toUpperCase(), centerX, 19, { align: "center" });

    doc.setFontSize(7);
    doc.text(`Fecha: ${new Date(sale.created_at).toLocaleString('es-CO')}`, centerX, 24, { align: "center" });
    doc.setFontSize(9);
    doc.text(`VENTA # ${sale.id}`, centerX, 30, { align: "center" });

    doc.setLineWidth(0.2);
    doc.line(5, 33, 75, 33);

    const tableData = sale.items.map(item => [
        item.product_name || `Ref: ${item.product_id}`,
        item.quantity,
        formatCOP(item.unit_price)
    ]);

    autoTable(doc, {
        startY: 35,
        head: [['Cant', 'Desc', 'Precio']],
        body: tableData.map(row => [row[1], row[0], row[2]]),
        theme: 'plain',
        styles: { fontSize: 7, cellPadding: 1, fontStyle: 'normal' },
        headStyles: { fontStyle: 'bold', borderBottom: 0.1 },
        columnStyles: {
            0: { cellWidth: 10 },
            1: { cellWidth: 40 },
            2: { cellWidth: 20, halign: 'right' }
        },
        margin: { left: 5, right: 5 }
    });

    const finalY = doc.lastAutoTable.finalY + 5;
    doc.line(5, finalY, 75, finalY);

    doc.setFontSize(8);
    const rightAlignX = 75;

    // Use tax data from sale object
    const taxRate = sale.tax_rate !== undefined ? sale.tax_rate : 0;
    const taxAmount = sale.tax_amount !== undefined ? sale.tax_amount : 0;

    // Subtotal here is items total before discount
    const itemsTotal = sale.items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);

    doc.text("SUBTOTAL:", 45, finalY + 5);
    doc.text(formatCOP(itemsTotal), rightAlignX, finalY + 5, { align: "right" });

    if (sale.discount > 0) {
        doc.text(`DESCUENTO:`, 45, finalY + 10);
        doc.text(`-${formatCOP(sale.discount)}`, rightAlignX, finalY + 10, { align: "right" });
    }

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(`TOTAL: ${formatCOP(sale.total)}`, rightAlignX, finalY + 18, { align: "right" });

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");

    // Show IVA breakdown if rate > 0
    if (taxRate > 0) {
        doc.text(`IVA INCLUIDO (${taxRate}%):`, 45, finalY + 24);
        doc.text(formatCOP(taxAmount), rightAlignX, finalY + 24, { align: "right" });
    }

    doc.setFontSize(8);
    doc.text("¡Gracias por su compra!", centerX, finalY + 35, { align: "center" });
    doc.setFontSize(6);
    doc.text(`Régimen Común - ${taxRate > 0 ? "IVA Incluido" : "Sin IVA"}`, centerX, finalY + 39, { align: "center" });

    doc.save(`Recibo_Venta_${sale.id}.pdf`);
};
