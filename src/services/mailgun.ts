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

// Convenience wrapper function
export const sendEmail = async (params: SendEmailParams): Promise<void> => {
  const result = await sendEmailViaMailgun(params);
  if (!result.success) {
    throw new Error(result.error || 'Failed to send email');
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

// Generate check-in confirmation HTML email (similar to TAP style)
export const generateCheckInConfirmationHtml = (params: {
  passengerName: string;
  pnr: string;
  flightNumber: string;
  origin: string;
  originCity: string;
  destination: string;
  destinationCity: string;
  departureDate: string;
  departureTime: string;
  arrivalDate: string;
  arrivalTime: string;
  gate: string;
  seat: string;
  boardingTime: string;
  bagCount: number;
}): string => {
  const { passengerName, pnr, flightNumber, origin, originCity, destination, destinationCity, 
          departureDate, departureTime, arrivalDate, arrivalTime, seat, boardingTime, bagCount } = params;
  
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatTime = (timeStr: string) => {
    // If it's already in HH:mm format, return it
    if (timeStr.match(/^\d{2}:\d{2}$/)) return timeStr;
    // Otherwise try to parse it
    const date = new Date(timeStr);
    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
    .container { max-width: 700px; margin: 20px auto; background-color: #ffffff; }
    .header { padding: 30px 20px; background-color: #ffffff; border-bottom: 2px solid #e0e0e0; }
    .greeting { font-size: 16px; color: #333; margin-bottom: 20px; }
    .confirmation-text { font-size: 14px; color: #333; line-height: 1.6; margin-bottom: 15px; }
    .boarding-pass-link { margin: 20px 0; }
    .boarding-pass-link a { color: #0066cc; text-decoration: none; font-weight: bold; }
    .disclaimer { font-size: 12px; color: #666; font-style: italic; margin: 15px 0; }
    .section-divider { border-top: 1px solid #e0e0e0; margin: 30px 0; }
    .section-title { font-size: 18px; font-weight: bold; color: #333; margin: 20px 0 15px 0; }
    .booking-info { background-color: #f9f9f9; padding: 15px; margin: 15px 0; border-left: 4px solid #0066cc; }
    .info-row { margin: 8px 0; font-size: 14px; }
    .info-label { font-weight: bold; color: #333; display: inline-block; width: 150px; }
    .info-value { color: #666; }
    .flight-details { margin: 20px 0; }
    .flight-row { display: flex; align-items: center; margin: 15px 0; padding: 15px; background-color: #f9f9f9; border-radius: 4px; }
    .flight-icon { font-size: 24px; margin: 0 15px; }
    .flight-info { flex: 1; }
    .flight-label { font-size: 12px; color: #666; text-transform: uppercase; margin-bottom: 5px; }
    .flight-value { font-size: 16px; font-weight: bold; color: #333; }
    .flight-time { font-size: 14px; color: #666; margin-top: 5px; }
    .boarding-gate { background-color: #fff3cd; padding: 15px; margin: 20px 0; border-left: 4px solid #ffc107; }
    .boarding-gate strong { color: #856404; }
    .baggage-section { margin: 20px 0; }
    .baggage-box { background-color: #e7f3ff; padding: 15px; margin: 15px 0; border-left: 4px solid #0066cc; }
    .tips-section { margin: 20px 0; }
    .tips-box { background-color: #fff9e6; padding: 15px; margin: 15px 0; border-left: 4px solid #ffc107; }
    .important-section { margin: 20px 0; }
    .important-box { background-color: #ffe6e6; padding: 15px; margin: 15px 0; border-left: 4px solid #dc3545; }
    .important-box strong { color: #721c24; }
    .footer { padding: 20px; background-color: #f9f9f9; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #e0e0e0; }
    .link { color: #0066cc; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="greeting">Dear ${passengerName},</div>
      <div class="confirmation-text">
        We confirm that you have been checked-in successfully. ${seat === 'SBY' || seat === 'STANDBY' ? '<strong>Please note you are on Standby for one or more Flight.</strong>' : ''}
      </div>
      <div class="confirmation-text">
        Please find your boarding pass details below. You will be required to present your boarding pass at different security checkpoints at the airport.
      </div>
      <div class="disclaimer">
        Apart from the attached boarding pass, this email content has no regulatory value. It is not required to print this email.
      </div>
      <div class="boarding-pass-link">
        <a href="#" class="link">📋 Get your Boarding Pass here!</a>
      </div>
    </div>
    
    <div class="section-divider"></div>
    
    <div class="section-title">Booking Details</div>
    <div class="booking-info">
      <div class="info-row">
        <span class="info-label">Passenger:</span>
        <span class="info-value">${passengerName.toUpperCase()}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Booking Reference:</span>
        <span class="info-value">${pnr}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Flight:</span>
        <span class="info-value">${flightNumber}</span>
      </div>
    </div>
    
    <div class="flight-details">
      <div class="flight-row">
        <div class="flight-icon">✈️</div>
        <div class="flight-info">
          <div class="flight-label">From</div>
          <div class="flight-value">${originCity || origin}</div>
          <div class="flight-time">${formatDate(departureDate)} - ${formatTime(departureTime)}</div>
        </div>
      </div>
      
      <div class="flight-row">
        <div class="flight-icon">✈️</div>
        <div class="flight-info">
          <div class="flight-label">To</div>
          <div class="flight-value">${destinationCity || destination}</div>
          <div class="flight-time">${formatDate(arrivalDate)} - ${formatTime(arrivalTime)}</div>
        </div>
      </div>
    </div>
    
    <div class="boarding-gate">
      <strong>Boarding Gate Report Time:</strong> Please report at the boarding gate at the latest by: ${formatTime(boardingTime)}
    </div>
    
    ${bagCount > 0 ? `
    <div class="section-title">Baggage Information</div>
    <div class="baggage-box">
      <strong>For checked-in luggage:</strong><br>
      You have ${bagCount} checked bag${bagCount > 1 ? 's' : ''}.<br>
      Please make sure that your baggage complies with the maximum weight and size restrictions on your flight (refer to your boarding pass for more details).<br>
      Go to the airport baggage drop-off desk before the check-in deadline for your flight, indicated on your boarding pass.
    </div>
    ` : `
    <div class="section-title">Baggage Information</div>
    <div class="baggage-box">
      <strong>If not travelling with checked baggage:</strong><br>
      Go directly to the boarding gate before the time limit (last call) indicated on your boarding pass.
    </div>
    `}
    
    <div class="tips-section">
      <div class="section-title">Few tips for your journey</div>
      <div class="tips-box">
        Please arrive early at the airport to pass the security formalities and respect the time limit for boarding (last call). If you are not present before this deadline, you are not guaranteed to get on board of your flight.
      </div>
    </div>
    
    <div class="important-section">
      <div class="section-title">IMPORTANT:</div>
      <div class="important-box">
        <strong>Please make sure that you are in possession of the regulatory documents required for your journey and have read the list of prohibited items in the cabin and in the hold.</strong><br><br>
        Make sure that nobody has been able to interfere with your luggage without your knowledge.<br><br>
        <strong>Warning:</strong> the transport of liquids (gel, cream, ...) is restricted in the cabin.
      </div>
    </div>
    
    <div class="footer">
      Thank you for choosing our airline, we wish you a pleasant journey.
    </div>
  </div>
</body>
</html>
  `.trim();
};

// Generate lost baggage report HTML email
export const generateLostBaggageReportHtml = (params: {
  passengerName: string;
  pnr: string;
  fileReferenceNumber: string;
  bags: Array<{
    bagNumber: string;
    status: string;
    type?: string;
    color?: string;
    material?: string;
    external?: string;
  }>;
  flightNumber?: string;
  route?: string;
  phoneNumber?: string;
  address?: string;
}): string => {
  const { passengerName, pnr, fileReferenceNumber, bags, flightNumber, route, phoneNumber, address } = params;
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
    .container { max-width: 700px; margin: 20px auto; background-color: #ffffff; }
    .header { padding: 30px 20px; background-color: #dc3545; color: #ffffff; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 30px 20px; }
    .greeting { font-size: 16px; color: #333; margin-bottom: 20px; }
    .important-notice { background-color: #fff3cd; padding: 15px; margin: 20px 0; border-left: 4px solid #ffc107; border-radius: 4px; }
    .important-notice strong { color: #856404; }
    .section-title { font-size: 18px; font-weight: bold; color: #333; margin: 25px 0 15px 0; border-bottom: 2px solid #e0e0e0; padding-bottom: 10px; }
    .info-box { background-color: #f9f9f9; padding: 15px; margin: 15px 0; border-left: 4px solid #0066cc; border-radius: 4px; }
    .info-row { margin: 8px 0; font-size: 14px; }
    .info-label { font-weight: bold; color: #333; display: inline-block; width: 180px; }
    .info-value { color: #666; }
    .bag-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .bag-table th { background-color: #e0e0e0; padding: 12px; text-align: left; font-weight: bold; color: #333; border: 1px solid #ccc; }
    .bag-table td { padding: 12px; border: 1px solid #ccc; color: #333; }
    .bag-table tr:nth-child(even) { background-color: #f9f9f9; }
    .reference-box { background-color: #e7f3ff; padding: 15px; margin: 20px 0; border-left: 4px solid #0066cc; border-radius: 4px; }
    .reference-box strong { color: #0066cc; font-size: 16px; }
    .contact-info { background-color: #f0f0f0; padding: 15px; margin: 20px 0; border-radius: 4px; }
    .footer { padding: 20px; background-color: #f9f9f9; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #e0e0e0; }
    .status-badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 12px; }
    .status-lost { background-color: #f8d7da; color: #721c24; }
    .status-damaged { background-color: #fff3cd; color: #856404; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚠️ Lost Baggage Report</h1>
    </div>
    
    <div class="content">
      <div class="greeting">Dear ${passengerName},</div>
      
      <div class="important-notice">
        <strong>IMPORTANT:</strong> We have received your lost baggage report. Our team is working to locate your items. Please keep this reference number for all future communications.
      </div>
      
      <div class="reference-box">
        <strong>File Reference Number (FRN):</strong> ${fileReferenceNumber}<br>
        <strong>PNR:</strong> ${pnr}
      </div>
      
      <div class="section-title">Reported Baggage Details</div>
      <table class="bag-table">
        <thead>
          <tr>
            <th>Bag Number</th>
            <th>Status</th>
            <th>Type</th>
            <th>Color</th>
            <th>Material</th>
            <th>External Features</th>
          </tr>
        </thead>
        <tbody>
          ${bags.map(bag => `
            <tr>
              <td><strong>${bag.bagNumber}</strong></td>
              <td><span class="status-badge ${bag.status === 'LOST' ? 'status-lost' : 'status-damaged'}">${bag.status}</span></td>
              <td>${bag.type || 'N/A'}</td>
              <td>${bag.color || 'N/A'}</td>
              <td>${bag.material || 'N/A'}</td>
              <td>${bag.external || 'N/A'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      ${flightNumber ? `
      <div class="section-title">Flight Information</div>
      <div class="info-box">
        <div class="info-row">
          <span class="info-label">Flight Number:</span>
          <span class="info-value">${flightNumber}</span>
        </div>
        ${route ? `
        <div class="info-row">
          <span class="info-label">Route:</span>
          <span class="info-value">${route}</span>
        </div>
        ` : ''}
      </div>
      ` : ''}
      
      <div class="section-title">Contact Information</div>
      <div class="contact-info">
        ${phoneNumber ? `
        <div class="info-row">
          <span class="info-label">Phone Number:</span>
          <span class="info-value">${phoneNumber}</span>
        </div>
        ` : ''}
        ${address ? `
        <div class="info-row">
          <span class="info-label">Address:</span>
          <span class="info-value">${address}</span>
        </div>
        ` : ''}
      </div>
      
      <div class="section-title">What Happens Next?</div>
      <div class="info-box">
        <ul style="margin: 10px 0; padding-left: 20px; color: #333;">
          <li>Our baggage services team will search for your items</li>
          <li>You will be contacted via phone or email with updates</li>
          <li>If your baggage is found, we will arrange for delivery</li>
          <li>Please keep your File Reference Number (FRN) for tracking</li>
        </ul>
      </div>
      
      <div class="important-notice">
        <strong>Need to update your report?</strong><br>
        Please contact our Lost & Found department with your File Reference Number: <strong>${fileReferenceNumber}</strong>
      </div>
    </div>
    
    <div class="footer">
      <p>This is an automated confirmation email. Please do not reply to this message.</p>
      <p>For assistance, please contact our Lost & Found department.</p>
      <p>Phone: +371 67280422 | Email: lostandfound@airport.com</p>
    </div>
  </div>
</body>
</html>
  `.trim();
};

// Generate baggage status update HTML email
export const generateBaggageStatusUpdateHtml = (params: {
  passengerName: string;
  pnr: string;
  fileReferenceNumber: string;
  bagNumber: string;
  statusType: 'FOUND' | 'DELIVERY_PLANNED' | 'DELIVERING' | 'DELIVERED' | 'NOT_FOUND' | 'READY_PICKUP';
  deliveryDate?: string;
  contactInfo?: string;
}): string => {
  const { passengerName, pnr, fileReferenceNumber, bagNumber, statusType, deliveryDate, contactInfo } = params;
  
  const getStatusContent = () => {
    switch (statusType) {
      case 'FOUND':
        return {
          title: '✅ Bag Found',
          headerColor: '#28a745',
          message: 'We are pleased to inform you that we have located your baggage.',
          action: 'Please contact us to arrange for delivery or pickup.',
          details: 'Our team will contact you shortly to coordinate the next steps.'
        };
      case 'DELIVERY_PLANNED':
        return {
          title: '📅 Delivery Planned',
          headerColor: '#17a2b8',
          message: 'Delivery of your baggage has been scheduled.',
          action: deliveryDate ? `Your baggage will be delivered on ${deliveryDate}.` : 'Delivery date will be confirmed shortly.',
          details: 'Please ensure someone is available to receive the delivery.'
        };
      case 'DELIVERING':
        return {
          title: '🚚 Bag in Transit',
          headerColor: '#ffc107',
          message: 'Your baggage is currently being delivered.',
          action: 'Please be available to receive your baggage.',
          details: 'The delivery team is on the way to your address.'
        };
      case 'DELIVERED':
        return {
          title: '✅ Bag Delivered',
          headerColor: '#28a745',
          message: 'Your baggage has been successfully delivered.',
          action: 'Please check your baggage and confirm receipt.',
          details: 'If you have any concerns, please contact us immediately.'
        };
      case 'NOT_FOUND':
        return {
          title: '🔍 Still Searching',
          headerColor: '#ffc107',
          message: 'We are continuing our search for your baggage.',
          action: 'Our team is actively searching for your item.',
          details: 'We will update you as soon as we have any information.'
        };
      case 'READY_PICKUP':
        return {
          title: '📦 Ready for Pickup',
          headerColor: '#17a2b8',
          message: 'Your baggage is ready for pickup.',
          action: 'Please visit our Lost & Found office to collect your baggage.',
          details: contactInfo || 'Please bring a valid ID and your File Reference Number.'
        };
      default:
        return {
          title: 'Baggage Update',
          headerColor: '#6c757d',
          message: 'Update regarding your baggage.',
          action: 'Please contact us for more information.',
          details: ''
        };
    }
  };
  
  const statusContent = getStatusContent();
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
    .container { max-width: 700px; margin: 20px auto; background-color: #ffffff; }
    .header { padding: 30px 20px; background-color: ${statusContent.headerColor}; color: #ffffff; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 30px 20px; }
    .greeting { font-size: 16px; color: #333; margin-bottom: 20px; }
    .status-box { background-color: #f0f8ff; padding: 20px; margin: 20px 0; border-left: 4px solid ${statusContent.headerColor}; border-radius: 4px; }
    .status-box strong { color: ${statusContent.headerColor}; font-size: 18px; }
    .info-box { background-color: #f9f9f9; padding: 15px; margin: 15px 0; border-left: 4px solid #0066cc; border-radius: 4px; }
    .info-row { margin: 8px 0; font-size: 14px; }
    .info-label { font-weight: bold; color: #333; display: inline-block; width: 180px; }
    .info-value { color: #666; }
    .action-box { background-color: #fff3cd; padding: 15px; margin: 20px 0; border-left: 4px solid #ffc107; border-radius: 4px; }
    .action-box strong { color: #856404; }
    .contact-box { background-color: #e7f3ff; padding: 15px; margin: 20px 0; border-left: 4px solid #0066cc; border-radius: 4px; }
    .footer { padding: 20px; background-color: #f9f9f9; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #e0e0e0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${statusContent.title}</h1>
    </div>
    
    <div class="content">
      <div class="greeting">Dear ${passengerName},</div>
      
      <div class="status-box">
        <strong>${statusContent.message}</strong>
      </div>
      
      <div class="info-box">
        <div class="info-row">
          <span class="info-label">File Reference Number (FRN):</span>
          <span class="info-value">${fileReferenceNumber}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Bag Number:</span>
          <span class="info-value">${bagNumber}</span>
        </div>
        <div class="info-row">
          <span class="info-label">PNR:</span>
          <span class="info-value">${pnr}</span>
        </div>
        ${deliveryDate ? `
        <div class="info-row">
          <span class="info-label">Delivery Date:</span>
          <span class="info-value">${deliveryDate}</span>
        </div>
        ` : ''}
      </div>
      
      <div class="action-box">
        <strong>Action Required:</strong><br>
        ${statusContent.action}
      </div>
      
      ${statusContent.details ? `
      <div class="info-box">
        <p style="margin: 0; color: #333;">${statusContent.details}</p>
      </div>
      ` : ''}
      
      ${statusType === 'FOUND' || statusType === 'READY_PICKUP' ? `
      <div class="contact-box">
        <strong>Contact Information:</strong><br>
        Phone: +371 67280422<br>
        Email: lostandfound@airport.com<br>
        ${contactInfo ? `Additional Info: ${contactInfo}` : ''}
      </div>
      ` : ''}
    </div>
    
    <div class="footer">
      <p>This is an automated status update email. Please do not reply to this message.</p>
      <p>For assistance, please contact our Lost & Found department.</p>
      <p>Phone: +371 67280422 | Email: lostandfound@airport.com</p>
    </div>
  </div>
</body>
</html>
  `.trim();
};

