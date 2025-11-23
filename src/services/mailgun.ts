// Mailgun Email Service
// NOTE: In production, API calls should go through a backend server
// to keep API keys secure. This is a frontend implementation for demo purposes.

interface MailgunConfig {
  apiKey: string;
  domain: string;
  baseUrl?: string;
}

interface SendEmailParams {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

// Mailgun configuration
// IMPORTANT: In production, use environment variables to store API keys securely
// Create a .env file with:
// VITE_MAILGUN_API_KEY=your-full-api-key-here
// VITE_MAILGUN_DOMAIN=your-domain-here
const MAILGUN_CONFIG: MailgunConfig = {
  apiKey: import.meta.env.VITE_MAILGUN_API_KEY || '',
  domain: import.meta.env.VITE_MAILGUN_DOMAIN || 'sandboxba9f61087fa24507b14ebc2831d1ee12.mailgun.org',
  baseUrl: import.meta.env.VITE_MAILGUN_BASE_URL || 'https://api.mailgun.net'
};

// Get Mailgun "from" address using the configured domain
export const getMailgunFromAddress = (senderName: string = 'Reservation Department'): string => {
  const { domain } = MAILGUN_CONFIG;
  if (!domain) return 'postmaster@mailgun.org';
  // Use Mailgun domain for "from" address (using postmaster@ as per Mailgun standard)
  return `${senderName} <postmaster@${domain}>`;
};

export const sendEmailViaMailgun = async (params: SendEmailParams): Promise<{ success: boolean; messageId?: string; error?: string }> => {
  const { to, subject, text, html } = params;
  const { apiKey, domain, baseUrl } = MAILGUN_CONFIG;

  // Validate required fields
  if (!apiKey || !domain) {
    return {
      success: false,
      error: 'Mailgun configuration missing. Please set VITE_MAILGUN_API_KEY and VITE_MAILGUN_DOMAIN environment variables.'
    };
  }

  // Use Mailgun domain for "from" address
  const fromAddress = getMailgunFromAddress();

  // Create form data for Mailgun API
  const formData = new FormData();
  formData.append('from', fromAddress);
  formData.append('to', to);
  formData.append('subject', subject);
  formData.append('text', text);
  if (html) {
    formData.append('html', html);
  }

  try {
    // Mailgun API endpoint: POST /v3/{domain}/messages
    const url = `${baseUrl}/v3/${domain}/messages`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`api:${apiKey}`)}`
      },
      body: formData
    });

    const data = await response.json();

    if (response.ok) {
      return {
        success: true,
        messageId: data.id || data.message || 'Email sent successfully'
      };
    } else {
      return {
        success: false,
        error: data.message || `Mailgun API error: ${response.status} ${response.statusText}`
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to send email via Mailgun'
    };
  }
};

// Helper to convert plain text to HTML
export const textToHtml = (text: string): string => {
  return text
    .split('\n')
    .map(line => {
      if (line.trim() === '') return '<br>';
      // Bold headers (lines ending with :)
      if (line.trim().endsWith(':')) {
        return `<strong>${line}</strong>`;
      }
      // Preserve spacing
      return line.replace(/  /g, '&nbsp;&nbsp;');
    })
    .join('<br>');
};

// Generate professional booking confirmation HTML email
export const generateBookingConfirmationHtml = (params: {
  pnr: string;
  ticketNumber: string;
  passengerName: string;
  flights: Array<{
    flightNumber: string;
    departureDate: string;
    departureTime: string;
    arrivalDate: string;
    arrivalTime: string;
    origin: string;
    originCity: string;
    destination: string;
    destinationCity: string;
    gate: string;
    bookingClass: string;
    baggage: string;
  }>;
  fare: {
    baseFare: number;
    tax: number;
    fees: number;
    total: number;
    currency: string;
  } | null;
  formOfPayment?: string;
  issuedBy: string;
  issueDate: string;
  issuePlace: string;
}): string => {
  const { pnr, ticketNumber, passengerName, flights, fare, formOfPayment, issuedBy, issueDate, issuePlace } = params;
  
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
  };

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
    .container { max-width: 800px; margin: 0 auto; background-color: #ffffff; padding: 0; }
    .header { background-color: #ffffff; padding: 30px 20px; text-align: right; border-bottom: 2px solid #e0e0e0; }
    .title { color: #d32f2f; font-size: 28px; font-weight: bold; margin: 0; }
    .confirmation-box { background-color: #616161; color: #ffffff; padding: 20px; margin: 20px; border-radius: 4px; }
    .confirmation-box label { color: #bdbdbd; font-size: 12px; display: block; margin-bottom: 5px; }
    .confirmation-box value { color: #ffffff; font-size: 14px; font-weight: bold; }
    .section-title { background-color: #d32f2f; color: #ffffff; padding: 12px 20px; font-size: 16px; font-weight: bold; margin: 20px 0 0 0; }
    .flight-table { width: 100%; border-collapse: collapse; margin: 0; }
    .flight-table thead { background-color: #d32f2f; color: #ffffff; }
    .flight-table th { padding: 12px; text-align: left; font-size: 12px; font-weight: bold; }
    .flight-table td { padding: 12px; border-bottom: 1px solid #e0e0e0; }
    .flight-table tr:last-child td { border-bottom: none; }
    .flight-notes { padding: 15px 20px; background-color: #f9f9f9; font-size: 12px; color: #616161; }
    .fare-section { padding: 20px; background-color: #ffffff; }
    .fare-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e0e0e0; }
    .fare-row:last-child { border-bottom: 2px solid #d32f2f; font-weight: bold; font-size: 16px; }
    .fare-label { color: #616161; }
    .fare-value { color: #000000; font-weight: bold; }
    .validating-data { padding: 20px; background-color: #f9f9f9; font-size: 11px; color: #616161; }
    .notice { padding: 20px; font-size: 11px; color: #616161; line-height: 1.6; }
    .footer { padding: 20px; background-color: #f9f9f9; font-size: 10px; color: #616161; text-align: center; border-top: 1px solid #e0e0e0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="title">Booking Confirmation</h1>
    </div>
    
    <div class="confirmation-box">
      <label>Travel dates for:</label>
      <value>${passengerName.toUpperCase()}</value>
      <br><br>
      <label>Reservation code:</label>
      <value>${pnr}</value>
      <br><br>
      <label>Electronic Ticket Number:</label>
      <value>${ticketNumber}</value>
    </div>
    
    <div class="section-title">FLIGHT DETAILS</div>
    <table class="flight-table">
      <thead>
        <tr>
          <th>FLIGHT</th>
          <th>DEPARTURE</th>
          <th>ARRIVAL</th>
          <th>FROM</th>
          <th>TO</th>
          <th>BOOKING CLASS</th>
          <th>BAGGAGE</th>
        </tr>
      </thead>
      <tbody>
        ${flights.map((f) => `
        <tr>
          <td><strong>${f.flightNumber}</strong></td>
          <td>${formatDate(f.departureDate)}, ${f.departureTime}</td>
          <td>${formatDate(f.arrivalDate)}, ${f.arrivalTime}</td>
          <td>${f.originCity || f.origin}<br><small>${f.origin}</small></td>
          <td>${f.destinationCity || f.destination}<br><small>${f.destination}</small></td>
          <td>Economy Class<br><small>Seat Available</small></td>
          <td>${f.baggage}</td>
        </tr>
        `).join('')}
      </tbody>
    </table>
    ${flights.map((f, idx) => `
    <div class="flight-notes">
      <strong>Flight ${f.flightNumber}:</strong><br>
      Operated by: ${f.flightNumber.substring(0, 2)} Airlines<br>
      Gate: ${f.gate || 'TBA'}<br>
      ${idx < flights.length - 1 ? 'Connection at ' + (f.destinationCity || f.destination) : ''}
    </div>
    `).join('')}
    
    ${fare ? `
    <div class="section-title">FARE DETAILS</div>
    <div class="fare-section">
      <div class="fare-row">
        <span class="fare-label">Fare:</span>
        <span class="fare-value">${fare.currency} ${fare.baseFare.toFixed(2)}</span>
      </div>
      <div class="fare-row">
        <span class="fare-label">Tax, Fee, Charge:</span>
        <span class="fare-value">${fare.currency} ${(fare.tax + fare.fees).toFixed(2)}</span>
      </div>
      ${formOfPayment ? `
      <div class="fare-row">
        <span class="fare-label">Form of Payment:</span>
        <span class="fare-value">${formOfPayment}</span>
      </div>
      ` : ''}
      <div class="fare-row">
        <span class="fare-label">Total:</span>
        <span class="fare-value">${fare.currency} ${fare.total.toFixed(2)}</span>
      </div>
    </div>
    ` : ''}
    
    <div class="validating-data">
      <strong>Validating Data:</strong><br>
      Issued by: ${issuedBy}<br>
      Date of issue: ${formatDate(issueDate)}<br>
      Place of issue: ${issuePlace}
    </div>
    
    <div class="notice">
      <strong>Notice:</strong><br>
      International conventions (Warsaw Convention or Montreal Convention) may apply to your journey and may limit the carrier's liability for death, injury, or baggage damage. EC-Regulation No 889/2002 may also apply. Please refer to the applicable conditions of carriage for further information.
    </div>
    
    <div class="footer">
      <strong>Reservation Department</strong><br>
      For any questions, please contact us at:<br>
      Phone: +371 67280422 | Email: reservations@airport.com<br><br>
      This is an automated confirmation. Please check-in online 24 hours before departure.
    </div>
  </div>
</body>
</html>
  `.trim();
};

