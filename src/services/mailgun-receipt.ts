// Generate receipt HTML email
export const generateReceiptHtml = (params: {
  passengerName: string;
  pnr: string;
  receiptNumber: string;
  date: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  paymentMethod: string;
  transactionId?: string;
}): string => {
  const { passengerName, pnr, receiptNumber, date, items, subtotal, tax, total, currency, paymentMethod, transactionId } = params;
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 30px; }
    .header { text-align: center; border-bottom: 3px solid #d32f2f; padding-bottom: 20px; margin-bottom: 30px; }
    .title { color: #d32f2f; font-size: 28px; font-weight: bold; margin: 0; }
    .receipt-info { background-color: #f9f9f9; padding: 15px; margin: 20px 0; border-radius: 4px; }
    .info-row { display: flex; justify-content: space-between; margin: 8px 0; font-size: 14px; }
    .info-label { color: #666; font-weight: bold; }
    .info-value { color: #333; }
    .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .items-table th { background-color: #d32f2f; color: #ffffff; padding: 12px; text-align: left; font-size: 12px; font-weight: bold; }
    .items-table td { padding: 12px; border-bottom: 1px solid #e0e0e0; font-size: 14px; }
    .items-table tr:last-child td { border-bottom: 2px solid #d32f2f; }
    .text-right { text-align: right; }
    .totals { margin-top: 20px; }
    .total-row { display: flex; justify-content: space-between; padding: 10px 0; font-size: 14px; }
    .total-row.final { border-top: 2px solid #d32f2f; font-size: 18px; font-weight: bold; padding-top: 15px; margin-top: 10px; }
    .payment-info { background-color: #e8f5e9; padding: 15px; margin: 20px 0; border-left: 4px solid #4caf50; border-radius: 4px; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="title">Payment Receipt</h1>
      <div style="margin-top: 10px; font-size: 14px; color: #666;">Receipt No: ${receiptNumber}</div>
    </div>
    
    <div class="receipt-info">
      <div class="info-row">
        <span class="info-label">Passenger:</span>
        <span class="info-value">${passengerName}</span>
      </div>
      <div class="info-row">
        <span class="info-label">PNR:</span>
        <span class="info-value">${pnr}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Date:</span>
        <span class="info-value">${date}</span>
      </div>
      ${transactionId ? `
      <div class="info-row">
        <span class="info-label">Transaction ID:</span>
        <span class="info-value">${transactionId}</span>
      </div>
      ` : ''}
    </div>
    
    <table class="items-table">
      <thead>
        <tr>
          <th>Description</th>
          <th class="text-right">Qty</th>
          <th class="text-right">Unit Price</th>
          <th class="text-right">Total</th>
        </tr>
      </thead>
      <tbody>
        ${items.map(item => `
        <tr>
          <td>${item.description}</td>
          <td class="text-right">${item.quantity}</td>
          <td class="text-right">${currency} ${item.unitPrice.toFixed(2)}</td>
          <td class="text-right">${currency} ${item.total.toFixed(2)}</td>
        </tr>
        `).join('')}
      </tbody>
    </table>
    
    <div class="totals">
      <div class="total-row">
        <span>Subtotal:</span>
        <span>${currency} ${subtotal.toFixed(2)}</span>
      </div>
      <div class="total-row">
        <span>Tax:</span>
        <span>${currency} ${tax.toFixed(2)}</span>
      </div>
      <div class="total-row final">
        <span>Total:</span>
        <span>${currency} ${total.toFixed(2)}</span>
      </div>
    </div>
    
    <div class="payment-info">
      <strong>Payment Method:</strong> ${paymentMethod}<br>
      <strong>Status:</strong> <span style="color: #4caf50; font-weight: bold;">PAID</span>
    </div>
    
    <div class="footer">
      <strong>Thank you for your payment!</strong><br>
      This is an automated receipt. Please keep this for your records.<br><br>
      For any questions, please contact us at:<br>
      Phone: +371 67280422 | Email: reservations@airport.com
    </div>
  </div>
</body>
</html>
  `.trim();
};






