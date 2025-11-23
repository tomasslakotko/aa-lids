import React, { useState, useRef, useEffect } from 'react';
import { useAirportStore } from '../store/airportStore';
import type { Flight } from '../store/airportStore';
import { getMailgunFromAddress, generateBookingConfirmationHtml } from '../services/mailgun';

// Helper to generate PNR
const generatePNR = () => Math.random().toString(36).substring(2, 8).toUpperCase();

// Types for the PNR being built
interface WipPNR {
  segments: Flight[];
  passengers: { lastName: string; firstName: string; title: string; type?: 'REVENUE' | 'STAFF_DUTY' | 'STAFF_SBY'; staffId?: string; bagCount?: number }[];
  contacts: string[];
  ticketStatus: string;
  tstStored: boolean; // Whether FXP has been run (TST stored)
  pricing: {
    baseFare: number;
    tax: number;
    fees: number;
    total: number;
  } | null;
  ssrs: Array<{ code: string; description: string; price: number; passenger?: number; segment?: number }>; // Special Service Requests
  formOfPayment: string; // Current FOP
  ancillaryPriced: boolean; // Whether FXG has been run
}

export const ReservationsApp = () => {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState<string[]>([]);
  const [lastSearchResults, setLastSearchResults] = useState<Array<{ flight: Flight; type: 'DIRECT' | 'CONNECTING'; connection?: Flight }>>([]);
  const [wipPnr, setWipPnr] = useState<WipPNR>({
    segments: [],
    passengers: [],
    contacts: [],
    ticketStatus: '',
    tstStored: false,
    pricing: null,
    ssrs: [],
    formOfPayment: '',
    ancillaryPriced: false
  });

  const flights = useAirportStore((state) => state.flights);
  const passengers = useAirportStore((state) => state.passengers);
  const emails = useAirportStore((state) => state.emails);
  const createBooking = useAirportStore((state) => state.createBooking);
  const updatePassengerDetails = useAirportStore((state) => state.updatePassengerDetails);
  const sendEmailConfirmation = useAirportStore((state) => state.sendEmailConfirmation);
  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  const addLog = (line: string) => setOutput(prev => [...prev, line]);

  const handleCommand = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = input.trim().toUpperCase();
    addLog(`> ${cmd}`);
    
    // --- AVAILABILITY (AN) ---
    if (cmd.startsWith('AN')) {
      addLog('** AMADEUS AVAILABILITY - AN **');
      addLog(`RP/RIX1A0988/RIX1A0988   ${new Date().toDateString()}`);
      
      // Basic parsing: AN[DATE][ORG][DEST] or AN[ORG][DEST] or AN[ORG] or just AN (List all)
      // Regex to extract Origin (3 chars) and Dest (3 chars) from end of string
      // e.g. ANRIXJFK -> Org: RIX, Dest: JFK
      // e.g. AN10NOVRIXJFK -> Org: RIX, Dest: JFK
      // e.g. ANRIX -> Org: RIX (all departures from RIX)
      // e.g. AN -> Show all flights for today
      
      let origin = '';
      let dest = '';
      
      // Parse command
      if (cmd.length >= 8) {
         // Look for route pattern (last 6 chars = 2 airport codes)
         const potentialRoute = cmd.slice(-6);
         origin = potentialRoute.slice(0, 3);
         dest = potentialRoute.slice(3, 6);
      } else if (cmd.length > 2 && cmd.length <= 5) {
         // ANRIX or ANRIX -> Origin only
         origin = cmd.substring(2).toUpperCase();
      } else if (cmd.length === 2) {
        // Just AN -> Show all flights for today (no filter)
        // origin and dest remain empty
      }

      // Filter Direct Flights
      let foundFlights: { flight: Flight; type: 'DIRECT' | 'CONNECTING'; connection?: Flight }[] = [];

      if (origin && dest) {
         // Search Direct
         const direct = flights.filter(f => f.origin === origin && f.destination === dest);
         direct.forEach(f => foundFlights.push({ flight: f, type: 'DIRECT' }));

         // Search Connections (A -> B -> C)
         // Find flights from Origin to ANYWHERE (Leg 1)
         const leg1Candidates = flights.filter(f => f.origin === origin);
         
         leg1Candidates.forEach(l1 => {
            // Find flights from l1.destination to Final Dest (Leg 2)
            // Must depart AFTER Leg 1 arrives with minimum connection time (1.5 hours)
            const leg2Candidates = flights.filter(f => {
               if (f.origin !== l1.destination || f.destination !== dest) return false;
               
               // Calculate connection time
               const [l1Hour, l1Min] = l1.etd.split(':').map(Number);
               const [l2Hour, l2Min] = f.std.split(':').map(Number);
               
               // Assume flight duration of ~2 hours for leg 1 (can be adjusted)
               const l1ArrivalHour = l1Hour + 2;
               const l1ArrivalMin = l1Min;
               
               // Calculate time difference in minutes
               const l1ArrivalMinutes = l1ArrivalHour * 60 + l1ArrivalMin;
               const l2DepartMinutes = l2Hour * 60 + l2Min;
               
               // Minimum connection time: 90 minutes (1.5 hours)
               const connectionTime = l2DepartMinutes - l1ArrivalMinutes;
               
               // Allow connections within same day (positive time) with at least 90 min
               return connectionTime >= 90 && connectionTime <= 480; // Max 8 hours connection
            });

            leg2Candidates.forEach(l2 => {
               foundFlights.push({ flight: l1, type: 'CONNECTING', connection: l2 });
            });
         });

      } else if (origin) {
         // Just show departures from origin
         const departures = flights.filter(f => f.origin === origin);
         departures.forEach(f => foundFlights.push({ flight: f, type: 'DIRECT' }));
      } else {
         // Show everything (fallback)
         flights.forEach(f => foundFlights.push({ flight: f, type: 'DIRECT' }));
      }

      // Store search results for SS command
      setLastSearchResults(foundFlights);

      // Display Results
      if (foundFlights.length === 0) {
        addLog('NO FLIGHTS FOUND');
      } else {
        // Show header if displaying all flights
        if (!origin && !dest) {
          addLog(`TOTAL FLIGHTS FOUND: ${foundFlights.length}`);
          addLog('FLT  CLS  ORG  DST  STD  ETD  GATE  A/C');
          addLog('---  ---  ---  ---  ---  ---  ----  ---');
        }
        
        // Limit display to 50 flights when showing all
        const displayLimit = (!origin && !dest) ? 50 : 10;
        foundFlights.slice(0, displayLimit).forEach((item, i) => {
           const f = item.flight;
           const idx = i + 1;
           
           if (item.type === 'DIRECT') {
             addLog(`${idx.toString().padStart(3)}  ${f.flightNumber.padEnd(6)} J9 C9 Y9 ${f.origin} ${f.destination} ${f.std} ${f.etd} ${f.gate.padEnd(4)} ${f.aircraft}`);
           } else if (item.connection) {
             const c = item.connection;
             addLog(`${idx.toString().padStart(3)}  ${f.flightNumber.padEnd(6)} J9 Y9 ${f.origin} ${f.destination} ${f.std} ${f.etd} ${f.gate.padEnd(4)} ${f.aircraft}  *CXN`);
             addLog(`     ${c.flightNumber.padEnd(6)} J9 Y9 ${c.origin} ${c.destination} ${c.std} ${c.etd} ${c.gate.padEnd(4)} ${c.aircraft}`);
           }
        });
        
        if (foundFlights.length > displayLimit) {
          addLog(`... (${foundFlights.length - displayLimit} more flights - refine search)`);
        }
      }
      addLog(' ');
    }

    // --- SELL SEGMENT (SS) ---
    // SS1Y1 (Sell 1 Seat Y class Line 1)
    else if (cmd.startsWith('SS')) {
      // Parse: SS[Qty][Class][LineNum]
      // e.g. SS1Y1 = 1 seat, Y class, Line 1
      const match = cmd.match(/SS(\d+)([A-Z])(\d+)/);
      
      if (!match) {
        addLog('INVALID SS FORMAT. USE: SS1Y1 (Qty, Class, Line Number)');
        setInput('');
        return;
      }

      const classCode = match[2];
      const lineNum = parseInt(match[3]);

      if (lastSearchResults.length === 0) {
        addLog('NO SEARCH RESULTS. RUN AN COMMAND FIRST');
      } else if (lineNum < 1 || lineNum > lastSearchResults.length) {
        addLog(`INVALID LINE NUMBER. AVAILABLE: 1-${lastSearchResults.length}`);
      } else {
        const selected = lastSearchResults[lineNum - 1];
        
        // For connections, sell the first leg (main flight)
        const flightToSell = selected.flight;
        
        // Add main flight
        const newSegments = [...wipPnr.segments, flightToSell];
        
        // Add connecting flight if it exists
        if (selected.type === 'CONNECTING' && selected.connection) {
           newSegments.push(selected.connection);
        }
        
        setWipPnr(prev => ({ ...prev, segments: newSegments }));
        
        addLog(' ');
        addLog(`1  ${flightToSell.flightNumber} ${classCode} 10NOV ${flightToSell.origin}${flightToSell.destination} HK1 ${flightToSell.std} ${flightToSell.etd} ${flightToSell.gate} E`);
        
        // If it's a connection, mention the connecting flight
        if (selected.type === 'CONNECTING' && selected.connection) {
          addLog(`2  ${selected.connection.flightNumber} ${classCode} 10NOV ${selected.connection.origin}${selected.connection.destination} HK1 ${selected.connection.std} ${selected.connection.etd} ${selected.connection.gate} E`);
        }
        
        addLog(' ');
      }
    }

    // --- NAME (NM) ---
    else if (cmd.startsWith('NM')) {
      const rawName = cmd.substring(3); 
      const [surname, rest] = rawName.split('/');
      const [firstName, title] = (rest || '').split(' ');
      
      if (surname && firstName) {
        setWipPnr(prev => ({ 
          ...prev, 
          passengers: [...prev.passengers, { lastName: surname, firstName, title: title || 'MR', type: 'REVENUE' }] 
        }));
        addLog(`1.${surname}/${firstName} ${title || 'MR'}`);
        addLog(' ');
      } else {
         addLog('INVALID NAME FORMAT. USE NM1SURNAME/NAME');
      }
    }

    // --- STAFF DUTY (SD) ---
    // SD1SMITH/JOHN MR/EMP12345
    else if (cmd.startsWith('SD')) {
      // Format: SD1[SURNAME]/[NAME] [TITLE]/[EMPLOYEE_ID]
      const rawData = cmd.substring(3);
      const [namePart, staffId] = rawData.split('/').slice(0, -1).join('/').split('/').length > 2 
        ? [rawData.split('/').slice(0, -1).join('/'), rawData.split('/').slice(-1)[0]]
        : [rawData, ''];
      
      const [surname, rest] = namePart.split('/');
      const [firstName, title] = (rest || '').split(' ');
      
      if (surname && firstName) {
        setWipPnr(prev => ({ 
          ...prev, 
          passengers: [...prev.passengers, { 
            lastName: surname, 
            firstName, 
            title: title || 'MR', 
            type: 'STAFF_DUTY',
            staffId: staffId || `EMP${Math.floor(Math.random() * 100000)}`
          }] 
        }));
        addLog(`1.${surname}/${firstName} ${title || 'MR'} [STAFF DUTY]`);
        if (staffId) addLog(`   EMPLOYEE ID: ${staffId}`);
        addLog(' ');
      } else {
         addLog('INVALID FORMAT. USE SD1SURNAME/NAME MR/EMP12345');
      }
    }

    // --- STAFF STANDBY (SSBY) ---
    // SSBY1SMITH/JOHN MR/EMP12345
    else if (cmd.startsWith('SSBY')) {
      const rawData = cmd.substring(5);
      const parts = rawData.split('/');
      const surname = parts[0];
      const firstName = parts[1]?.split(' ')[0] || '';
      const title = parts[1]?.split(' ')[1] || 'MR';
      const staffId = parts[2] || `EMP${Math.floor(Math.random() * 100000)}`;
      
      if (surname && firstName) {
        setWipPnr(prev => ({ 
          ...prev, 
          passengers: [...prev.passengers, { 
            lastName: surname, 
            firstName, 
            title, 
            type: 'STAFF_SBY',
            staffId
          }] 
        }));
        addLog(`1.${surname}/${firstName} ${title} [STAFF STANDBY]`);
        addLog(`   EMPLOYEE ID: ${staffId}`);
        addLog(`   SEAT: SBY (Space Available)`);
        addLog(' ');
      } else {
         addLog('INVALID FORMAT. USE SSBY1SURNAME/NAME MR/EMP12345');
      }
    }

    // --- CONTACT (AP) ---
    else if (cmd.startsWith('AP')) {
       const contact = cmd.substring(2).trim();
       setWipPnr(prev => ({ ...prev, contacts: [...prev.contacts, contact] }));
       addLog(`* CONTACT ADDED: ${contact}`);
    }

    // --- EMAIL (APE) ---
    else if (cmd.startsWith('APE-')) {
       const email = cmd.substring(4).trim();
       setWipPnr(prev => ({ ...prev, contacts: [...prev.contacts, email] }));
       addLog(`* EMAIL ADDED: ${email}`);
    }

    // --- PRICING: FXP (Store TST) ---
    else if (cmd === 'FXP' || cmd.startsWith('FXP/')) {
       if (wipPnr.segments.length === 0 || wipPnr.passengers.length === 0) {
         addLog('UNABLE TO PRICE: MISSING NAMES OR SEGMENTS');
       } else {
         // Calculate mock pricing
         const baseFare = 21.29;
         const tax = 13.00;
         const fees = 11.11;
         const total = baseFare + tax + fees;
         
         setWipPnr(prev => ({ 
           ...prev, 
           tstStored: true,
           pricing: { baseFare, tax, fees, total }
         }));
         
         const pax = wipPnr.passengers[0];
         const seg = wipPnr.segments[0];
         
         addLog('FXP');
         addLog(`01 ${pax.lastName}/${pax.firstName}${pax.title}`);
         addLog('---');
         addLog('AL FLGT BK T DATE TIME FARE BASIS NVB NVA BG');
         addLog(`LON ${seg.destination} ${seg.flightNumber} Y ${seg.std} Y`);
         addLog(`${seg.std}13LON U2 ${seg.destination}${baseFare.toFixed(2)}GBP${baseFare.toFixed(2)}END`);
         addLog(`GBP ${baseFare.toFixed(2)}`);
         addLog(`GBP ${tax.toFixed(2)}SA`);
         addLog(`GBP ${(baseFare + tax).toFixed(2)}`);
         addLog(`GBP ${fees.toFixed(2)} AIRLINE FEES`);
         addLog(`GBP ${total.toFixed(2)} TOTAL`);
         addLog('AGENT & PAX AGREE TO EASYJET TERMS & CONDITIONS- SEE GGAIR');
         addLog('PRICED VC U2');
         addLog(' ');
       }
    }

    // --- PRICING: FXX (Informative - No Store) ---
    else if (cmd === 'FXX' || cmd.startsWith('FXX/')) {
       if (wipPnr.segments.length === 0 || wipPnr.passengers.length === 0) {
         addLog('UNABLE TO PRICE: MISSING NAMES OR SEGMENTS');
       } else {
         const baseFare = 21.29;
         const tax = 13.00;
         const fees = 11.11;
         const total = baseFare + tax + fees;
         
         const pax = wipPnr.passengers[0];
         const seg = wipPnr.segments[0];
         
         addLog('FXX');
         addLog(`01 ${pax.lastName}/${pax.firstName}${pax.title}`);
         addLog('---');
         addLog('AL FLGT BK T DATE TIME FARE BASIS NVB NVA BG');
         addLog(`LON ${seg.destination} ${seg.flightNumber} Y ${seg.std} Y`);
         addLog(`${seg.std}13LON U2 ${seg.destination}${baseFare.toFixed(2)}GBP${baseFare.toFixed(2)}END`);
         addLog(`GBP ${baseFare.toFixed(2)}`);
         addLog(`GBP ${tax.toFixed(2)}SA`);
         addLog(`GBP ${(baseFare + tax).toFixed(2)}`);
         addLog(`GBP ${fees.toFixed(2)} AIRLINE FEES`);
         addLog(`GBP ${total.toFixed(2)} TOTAL`);
         addLog('AGENT & PAX AGREE TO EASYJET TERMS & CONDITIONS- SEE GGAIR');
         addLog('PRICED VC U2');
         addLog(' ');
       }
    }

    // --- DISPLAY TST (TQT) ---
    else if (cmd === 'TQT' || cmd.startsWith('TQT/')) {
       if (!wipPnr.tstStored) {
         addLog('NO TST STORED - USE FXP TO PRICE FIRST');
       } else {
         addLog('--- TST TSM ---');
         addLog('RP/RIX1A0988/RIX1A0988');
         wipPnr.passengers.forEach((p, i) => {
            addLog(`  ${i+1}.${p.lastName}/${p.firstName}${p.title}`);
         });
         wipPnr.segments.forEach((s, i) => {
            const segNum = wipPnr.passengers.length + i + 1;
            addLog(`  ${segNum}  ${s.flightNumber} Y 10NOV ${s.origin}${s.destination} HK${wipPnr.passengers.length}       ${s.std} ${s.etd}   ${s.gate} E`);
         });
         if (wipPnr.pricing) {
            addLog(`  ${wipPnr.segments.length + wipPnr.passengers.length + 1} FA PAX 888-2401002232/LTU2/GBP${wipPnr.pricing.total.toFixed(2)}/10NOV13/RIX1A0988/000472 61/S3`);
         }
         addLog(' ');
       }
    }

    // --- TMI: Insert/Modify Form of Payment for Ancillaries ---
    else if (cmd.startsWith('TMI/')) {
       // TMI/M12-13/FP-CCCAXXXXXXXXXXXX/1215*CV123
       // TMI/M12-13/FP-O/CCCA (if no charge, use old FOP)
       
       if (!wipPnr.ancillaryPriced) {
         addLog('ANCILLARY SERVICES MUST BE PRICED FIRST - USE FXG');
       } else {
         const parts = cmd.split('/');
         const mRef = parts[1]; // M12-13
         const fpPart = parts[2]; // FP-CCCA... or FP-O/CCCA
         
         if (fpPart.startsWith('FP-O/')) {
            // Use old FOP (no charge)
            addLog('TMI/' + mRef + '/FP-O/CCCA');
            addLog('USING EXISTING FORM OF PAYMENT');
            addLog(' ');
         } else if (fpPart.startsWith('FP-')) {
            // New FOP
            const cardInfo = fpPart.substring(3); // Remove FP-
            setWipPnr(prev => ({ ...prev, formOfPayment: cardInfo }));
            addLog('TMI/' + mRef + '/FP-' + cardInfo);
            addLog('NEW FORM OF PAYMENT ADDED FOR ANCILLARY SERVICES');
            addLog(' ');
         } else {
            addLog('INVALID TMI FORMAT. USE: TMI/M12-13/FP-CCCA... OR TMI/M12-13/FP-O/CCCA');
         }
       }
    }

    // --- TTM: Ticket Transaction Miscellaneous (Reissue) ---
    else if (cmd.startsWith('TTM/')) {
       // TTM/M12-13/RT
       if (!wipPnr.ancillaryPriced) {
         addLog('ANCILLARY SERVICES MUST BE PRICED FIRST - USE FXG');
       } else {
         const parts = cmd.split('/');
         const mRef = parts[1]; // M12-13
         
         addLog('TTM/' + mRef + '/RT');
         addLog('REISSUING TICKETS FOR ANCILLARY SERVICES');
         addLog(' ');
         addLog('--- TST TSM RLR TC-PER RLP ---');
         addLog('RP/RIX1A0988/RIX1A0988');
         
         let lineIdx = 1;
         wipPnr.passengers.forEach(p => {
            const typeLabel = p.type === 'STAFF_DUTY' ? ' [STAFF DUTY]' : p.type === 'STAFF_SBY' ? ' [STAFF SBY]' : '';
            addLog(`  ${lineIdx}.${p.lastName}/${p.firstName}${p.title}${typeLabel}`);
            if (p.staffId) addLog(`     EMP ID: ${p.staffId}`);
            lineIdx++;
         });
         
         wipPnr.segments.forEach((s) => {
            addLog(`  ${lineIdx}  ${s.flightNumber} Y 10NOV ${s.origin}${s.destination} HK${wipPnr.passengers.length}       ${s.std} ${s.etd}   ${s.gate} E`);
            lineIdx++;
         });
         
         wipPnr.ssrs.forEach((ssr) => {
            const seg = wipPnr.segments[ssr.segment || 0];
            const paxNum = (ssr.passenger || 0) + 1;
            addLog(`  ${lineIdx} /SSR ${ssr.code} U2 HK1${seg ? ` ${seg.origin}${seg.destination}` : ''}/P${paxNum}/S${(ssr.segment || 0) + 1} SEE RTSTR`);
            lineIdx++;
         });
         
         // Show FA (Fare Amount) lines for ancillaries
         const chargeableSSRs = wipPnr.ssrs.filter(s => s.price > 0);
         chargeableSSRs.forEach((ssr, i) => {
            const segNum = wipPnr.passengers.length + wipPnr.segments.length + i + 1;
            addLog(`  ${lineIdx} FA PAX 888-${Math.floor(Math.random() * 1000000000)}/LTU2/GBP${ssr.price.toFixed(2)}/10NOV13/RIX1A0988/00000000/S${segNum}`);
            lineIdx++;
         });
         
         if (wipPnr.formOfPayment) {
            addLog(`  ${lineIdx} FP ${wipPnr.formOfPayment}`);
         }
         
         addLog(' ');
         addLog('M P R NAME                    TOTAL FOP ELEMENTS T');
         if (wipPnr.pricing) {
            const pax = wipPnr.passengers[0];
            addLog(`3 .1 T D/I ${(pax.lastName + '/' + pax.firstName).padEnd(20)} GBP ${wipPnr.pricing.total.toFixed(2)} CCCAXXXXXXXXXX+ 2 P`);
         }
         chargeableSSRs.forEach((ssr, i) => {
            const pax = wipPnr.passengers[ssr.passenger || 0];
            const elemStart = wipPnr.passengers.length + wipPnr.segments.length + 1;
            addLog(`${7 + i} .1 T A/C ${(pax.lastName + '/' + pax.firstName).padEnd(20)} GBP ${ssr.price.toFixed(2)} O/CCCA ${elemStart + i} P`);
         });
         addLog(' ');
         addLog('DELETED TSM RECORDS MAY EXIST - PLEASE USE TMH');
         addLog(' ');
       }
    }

    // --- DISPLAY TSM (TQM) ---
    else if (cmd === 'TQM' || cmd.startsWith('TQM/')) {
       if (!wipPnr.tstStored) {
         addLog('NO TSM AVAILABLE - PRICE PNR FIRST');
       } else {
         addLog('--- TST TSM ---');
         addLog('RP/RIX1A0988/RIX1A0988');
         
         // Show full PNR first
         let lineIdx = 1;
         wipPnr.passengers.forEach(p => {
            const typeLabel = p.type === 'STAFF_DUTY' ? ' [STAFF DUTY]' : p.type === 'STAFF_SBY' ? ' [STAFF SBY]' : '';
            addLog(`  ${lineIdx}.${p.lastName}/${p.firstName}${p.title}${typeLabel}`);
            if (p.staffId) addLog(`     EMP ID: ${p.staffId}`);
            lineIdx++;
         });
         
         wipPnr.segments.forEach((s) => {
            addLog(`  ${lineIdx}  ${s.flightNumber} Y 10NOV ${s.origin}${s.destination} HK${wipPnr.passengers.length}       ${s.std} ${s.etd}   ${s.gate} E`);
            lineIdx++;
         });
         
         wipPnr.contacts.forEach(c => {
            addLog(`  ${lineIdx} AP ${c}`);
            lineIdx++;
         });
         
         if (wipPnr.ticketStatus) {
            addLog(`  ${lineIdx} TK ${wipPnr.ticketStatus}`);
            lineIdx++;
         }
         
         // Show SSRs
         wipPnr.ssrs.forEach((ssr) => {
            const seg = wipPnr.segments[ssr.segment || 0];
            const paxNum = (ssr.passenger || 0) + 1;
            addLog(`  ${lineIdx} /SSR ${ssr.code} U2 HK1 ${seg.origin}${seg.destination}/P${paxNum}/S${(ssr.segment || 0) + 1} SEE RTSTR`);
            lineIdx++;
         });
         
         if (wipPnr.pricing) {
            addLog(`  ${lineIdx} FP CCVI4444333322221111/1015*CV`);
            lineIdx++;
            addLog(`  ${lineIdx} FV PAX U2/S3-4`);
         }
         
         addLog(' ');
         addLog('M P R NAME                    TOTAL FOP ELEMENTS T');
         
         if (wipPnr.pricing) {
            const pax = wipPnr.passengers[0];
            addLog(`4 .1 D/I ${(pax.lastName + '/' + pax.firstName).padEnd(20)} GBP ${wipPnr.pricing.total.toFixed(2)} 2 P`);
         }
         
         // Show chargeable SSRs in TSM
         const chargeableSSRs = wipPnr.ssrs.filter(s => s.price > 0);
         chargeableSSRs.forEach((ssr, i) => {
            const pax = wipPnr.passengers[ssr.passenger || 0];
            const elemStart = wipPnr.passengers.length + wipPnr.segments.length + wipPnr.contacts.length + 2;
            addLog(`${5 + i} .1 A/C ${(pax.lastName + '/' + pax.firstName).padEnd(20)} GBP ${ssr.price.toFixed(2)} ${elemStart + i}-${elemStart + i} P`);
         });
         
         addLog(' ');
         addLog('DELETED TSM RECORDS MAY EXIST - PLEASE USE TMH');
         addLog(' ');
       }
    }

    // --- ANCILLARY PRICING: FXG (Price & Store) ---
    else if (cmd === 'FXG' || cmd.startsWith('FXG/')) {
       if (!wipPnr.tstStored) {
         addLog('PNR MUST BE PRICED BY FXP FIRST');
       } else if (wipPnr.ssrs.length === 0) {
         addLog('NO ANCILLARY SERVICES TO PRICE');
       } else {
         setWipPnr(prev => ({ ...prev, ancillaryPriced: true }));
         
         addLog('FXG');
         addLog('PASSENGER PTC OC SRV NP PR FLGT DATE (GBP) FARE TAX TOTAL');
         
         const chargeableSSRs = wipPnr.ssrs.filter(s => s.price > 0);
         if (chargeableSSRs.length === 0) {
            addLog('NO CHARGEABLE SERVICES - ALL FREE');
         } else {
            chargeableSSRs.forEach((ssr) => {
               const pax = wipPnr.passengers[ssr.passenger || 0];
               const seg = wipPnr.segments[ssr.segment || 0];
               const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase().replace(' ', '');
               
               addLog(`01 ${pax.lastName}/${pax.firstName}${pax.title} ADT`);
               addLog(`988 CCCH 1 U2 ${dateStr} GBP${ssr.price.toFixed(2)}`);
               addLog(`0B5 RQST 1 ${seg.flightNumber} ${dateStr} GBP${ssr.price.toFixed(2)}`);
               addLog(`TOTAL GBP${ssr.price.toFixed(2)}`);
            });
         }
         addLog(' ');
       }
    }

    // --- ANCILLARY PRICING: FXH (Informative) ---
    else if (cmd === 'FXH' || cmd.startsWith('FXH/')) {
       if (!wipPnr.tstStored) {
         addLog('PNR MUST BE PRICED BY FXP FIRST');
       } else if (wipPnr.ssrs.length === 0) {
         addLog('NO ANCILLARY SERVICES TO PRICE');
       } else {
         addLog('FXH');
         addLog('PASSENGER PTC OC SRV NP PR FLGT DATE (GBP) FARE TAX TOTAL');
         
         wipPnr.ssrs.forEach((ssr) => {
            if (ssr.price > 0) {
               const pax = wipPnr.passengers[ssr.passenger || 0];
               const seg = wipPnr.segments[ssr.segment || 0];
               const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase().replace(' ', '');
               
               addLog(`01 ${pax.lastName}/${pax.firstName}${pax.title} ADT`);
               addLog(`988 CCCH 1 U2 ${dateStr} GBP${ssr.price.toFixed(2)}`);
               addLog(`0B5 RQST 1 ${seg.flightNumber} ${dateStr} GBP${ssr.price.toFixed(2)}`);
               addLog(`TOTAL GBP${ssr.price.toFixed(2)}`);
            }
         });
         addLog(' ');
       }
    }

    // --- ANCILLARY CATALOGUE (FXK) ---
    else if (cmd === 'FXK' || cmd.startsWith('FXK/')) {
       if (!wipPnr.tstStored) {
         addLog('PNR MUST BE PRICED FIRST - USE FXP');
       } else {
         addLog('FXK');
         addLog('PASSENGER PR FROM-TO C SC SRV PTC BKM (GBP) TOTAL AV');
         addLog('FLIGHT RELATED');
         
         if (wipPnr.ssrs.length === 0) {
            addLog('NO ANCILLARY SERVICES IN PNR');
         } else {
            wipPnr.ssrs.forEach((ssr, i) => {
               const seg = wipPnr.segments[ssr.segment || 0];
               const paxNum = (ssr.passenger || 0) + 1;
               addLog(`${String(i + 1).padStart(3, '0')} P${paxNum} ${seg.origin}-${seg.destination} F ${ssr.code} ADT SSR GBP${ssr.price.toFixed(0)}`);
               addLog(`    ${ssr.description}`);
            });
         }
         addLog(' ');
       }
    }

    // --- SPECIAL SERVICE REQUEST (SR) ---
    else if (cmd.startsWith('SR')) {
       const srCode = cmd.substring(2).trim().split(' ')[0].toUpperCase();
       const rest = cmd.substring(2).trim().substring(srCode.length).trim();
       
       // Parse passenger/segment if provided (e.g., /P1/S1)
       let paxNum = 0;
       let segNum = 0;
       const paxMatch = rest.match(/\/P(\d+)/);
       const segMatch = rest.match(/\/S(\d+)/);
       if (paxMatch) paxNum = parseInt(paxMatch[1]) - 1;
       if (segMatch) segNum = parseInt(segMatch[1]) - 1;

       // Define SSR codes and their details
       const ssrCatalog: Record<string, { desc: string; price: number }> = {
          'XBAG': { desc: 'EXTRA BAGGAGE', price: 0 }, // Free for Flexi/Inclusive
          'XWGT-KG03': { desc: 'EXCESS WEIGHT 3KG', price: 15 },
          'XWGT-KG06': { desc: 'EXCESS WEIGHT 6KG', price: 25 },
          'XWGT-KG09': { desc: 'EXCESS WEIGHT 9KG', price: 35 },
          'XWGT-KG12': { desc: 'EXCESS WEIGHT 12KG', price: 45 },
          'XWGT-KG15': { desc: 'EXCESS WEIGHT 15KG', price: 55 },
          'WCHC': { desc: 'WHEELCHAIR CABIN SEAT', price: 0 },
          'WCHS': { desc: 'WHEELCHAIR STEPS', price: 0 },
          'WCHR': { desc: 'WHEELCHAIR RAMP', price: 0 },
          'DEAF': { desc: 'DEAF PASSENGER', price: 0 },
          'BLND': { desc: 'BLIND PASSENGER', price: 0 },
          'MAAS': { desc: 'MEET AND ASSIST', price: 0 },
          'DPNA': { desc: 'DISABLED ASSISTANCE', price: 0 },
          'OEC': { desc: 'BICYCLE', price: 35 },
          'ODC': { desc: 'GOLF EQUIPMENT', price: 30 },
          '0F8': { desc: 'DIVE EQUIPMENT', price: 30 },
          'OHW': { desc: 'SPORTING FIREARMS', price: 30 },
          'OEF': { desc: 'HANG GLIDER', price: 35 },
       };

       // Check if it's an XWGT with weight
       let matchedCode = srCode;
       let matchedDesc = '';
       let matchedPrice = 0;

       if (srCode.startsWith('XWGT-KG')) {
          const weight = srCode.replace('XWGT-KG', '');
          matchedCode = srCode;
          matchedDesc = `EXCESS WEIGHT ${weight}KG`;
          matchedPrice = parseInt(weight) * 3; // Rough pricing
       } else if (ssrCatalog[srCode]) {
          matchedDesc = ssrCatalog[srCode].desc;
          matchedPrice = ssrCatalog[srCode].price;
       } else {
          addLog(`UNKNOWN SSR CODE: ${srCode}`);
          setInput('');
          return;
       }

       // Add SSR to PNR
       setWipPnr(prev => ({
          ...prev,
          ssrs: [...prev.ssrs, {
             code: matchedCode,
             description: matchedDesc,
             price: matchedPrice,
             passenger: paxNum,
             segment: segNum
          }]
       }));

       addLog(`SSR ${matchedCode} ADDED - ${matchedDesc}${matchedPrice > 0 ? ` (GBP${matchedPrice})` : ' (NO CHARGE)'}`);
       addLog(' ');
    }

    // --- DISPLAY PNR (RP) ---
    else if (cmd === 'RP' || cmd.startsWith('RP/')) {
       if (wipPnr.segments.length === 0 && wipPnr.passengers.length === 0) {
         addLog('NO PNR IN WORK');
       } else {
         addLog('RP/RIX1A0988/RIX1A0988            AA/SU  ' + new Date().toDateString());
         let lineIdx = 1;
         wipPnr.passengers.forEach(p => {
            const typeLabel = p.type === 'STAFF_DUTY' ? ' [STAFF DUTY]' : p.type === 'STAFF_SBY' ? ' [STAFF SBY]' : '';
            addLog(`  ${lineIdx}.${p.lastName}/${p.firstName} ${p.title}${typeLabel}`);
            if (p.staffId) addLog(`     EMP ID: ${p.staffId}`);
            lineIdx++;
         });
         wipPnr.segments.forEach(s => {
            addLog(`  ${lineIdx}  ${s.flightNumber} Y 10NOV ${s.origin}${s.destination} HK${wipPnr.passengers.length}       ${s.std} ${s.etd}   ${s.gate} E`);
            lineIdx++;
         });
         wipPnr.contacts.forEach(c => {
           addLog(`  ${lineIdx} AP ${c}`);
           lineIdx++;
         });
         wipPnr.ssrs.forEach(ssr => {
            const seg = wipPnr.segments[ssr.segment || 0];
            const paxNum = (ssr.passenger || 0) + 1;
            addLog(`  ${lineIdx} /SSR ${ssr.code} U2 HK1${seg ? ` ${seg.origin}${seg.destination}` : ''}/P${paxNum}${ssr.segment !== undefined ? `/S${(ssr.segment || 0) + 1}` : ''} SEE RTSTR`);
            lineIdx++;
         });
         if (wipPnr.ticketStatus) {
            addLog(`  ${lineIdx} TK ${wipPnr.ticketStatus}`);
         }
         addLog(' ');
       }
    }

    // --- TICKETING (TKOK) ---
    else if (cmd === 'TKOK') {
       setWipPnr(prev => ({ ...prev, ticketStatus: 'OK' }));
       addLog('TK OK');
    }

    // --- RETRIEVE (RT) ---
    else if (cmd.startsWith('RT')) {
       const term = cmd.substring(2).trim();
       const foundEntries = passengers.filter(p => p.pnr === term);
       
       if (foundEntries.length > 0) {
          // Get Unique Passengers
          const uniquePassengers = Array.from(new Set(foundEntries.map(p => p.firstName + '|' + p.lastName)))
            .map(key => {
               const [first, last] = key.split('|');
               return foundEntries.find(p => p.firstName === first && p.lastName === last)!;
            });

          // Get Unique Flights (Segments)
          const uniqueFlightIds = Array.from(new Set(foundEntries.map(p => p.flightId)));
          const uniqueFlights = uniqueFlightIds
            .map(fid => flights.find(f => f.id === fid))
            .filter(f => f !== undefined) as Flight[];
            
          // Sort flights by departure time
          uniqueFlights.sort((a, b) => a.std.localeCompare(b.std));
          
          // Debug: Log how many segments found (can be removed later)
          if (uniqueFlights.length !== foundEntries.length / uniquePassengers.length) {
            console.log(`RT Debug: Found ${foundEntries.length} passenger entries, ${uniquePassengers.length} unique passengers, ${uniqueFlights.length} unique flights`);
          }

          addLog(`RP/RIX1A0988/RIX1A0988            AA/SU  ${new Date().toDateString()}   ${term}`);
          
          let lineIdx = 1;
          
          // 1. Passenger List
          uniquePassengers.forEach((p) => {
             const typeLabel = p.passengerType === 'STAFF_DUTY' ? ' [STAFF DUTY]' : p.passengerType === 'STAFF_SBY' ? ' [STAFF SBY]' : '';
             addLog(`  ${lineIdx}.${p.lastName}/${p.firstName} MR${typeLabel}`);
             if (p.staffId) addLog(`     EMP ID: ${p.staffId}`);
             lineIdx++;
          });
          
          // 2. Segment List
          uniqueFlights.forEach((f) => {
             // Calculate HK count based on unique passengers on this flight with this PNR
             const paxCountOnFlight = uniquePassengers.length; 
             // Note: simplified logic assuming all pax are on all segments for this PNR, 
             // which matches the createBooking logic.
             
             // Format date as "10NOV" (day + month)
             const today = new Date();
             const day = today.getDate().toString().padStart(2, '0');
             const month = today.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase();
             const dateStr = `${day}${month}`;
             
             const seatCode = foundEntries[0].passengerType === 'STAFF_SBY' ? 'SBY' : 'Y';
             addLog(`  ${lineIdx}  ${f.flightNumber} ${seatCode} ${dateStr} ${f.origin}${f.destination} HK${paxCountOnFlight}       ${f.std} ${f.etd}   ${f.gate} E`);
             lineIdx++;
          });
          
          addLog(`  ${lineIdx} AP LON 020-7123-4567`);
          lineIdx++;
          addLog(`  ${lineIdx} TK TL${new Date().getDate()}NOV/RIX1A0988`);
       } else {
          addLog('NO PNR FOUND');
       }
    }

    // --- SAVE / END TRANSACTION (ER / ET) ---
    else if (cmd === 'ER' || cmd === 'ET') {
       if (wipPnr.segments.length === 0 || wipPnr.passengers.length === 0) {
         addLog('UNABLE TO SAVE: MISSING NAMES OR SEGMENTS');
       } else {
         const newPnr = generatePNR();
         
        // Commit to Store
        wipPnr.passengers.forEach(p => {
           wipPnr.segments.forEach(s => {
              createBooking(newPnr, p.lastName, p.firstName, s.id, p.type || 'REVENUE', p.staffId);
           });
        });
        
        // Update baggage after a short delay to ensure passengers are created
        setTimeout(() => {
          wipPnr.passengers.forEach(p => {
            if (p.bagCount && p.bagCount > 0) {
              // Update all passengers with this PNR and name
              // updatePassengerDetails updates all passengers with matching PNR
              updatePassengerDetails(newPnr, { 
                bagCount: p.bagCount, 
                hasBags: true 
              });
            }
          });
        }, 100);

         addLog(' ');
         addLog(`RP/RIX1A0988/RIX1A0988            AA/SU  ${new Date().toDateString()}   ${newPnr}`);
         
         let lineIdx = 1;
         wipPnr.passengers.forEach(p => {
            const typeLabel = p.type === 'STAFF_DUTY' ? ' [STAFF DUTY]' : p.type === 'STAFF_SBY' ? ' [STAFF SBY]' : '';
            addLog(`  ${lineIdx}.${p.lastName}/${p.firstName} ${p.title}${typeLabel}`);
            if (p.staffId) addLog(`     EMP ID: ${p.staffId}`);
            lineIdx++;
         });
         wipPnr.segments.forEach(s => {
            addLog(`  ${lineIdx}  ${s.flightNumber} Y 10NOV ${s.origin}${s.destination} HK${wipPnr.passengers.length}       ${s.std} ${s.etd}   ${s.gate} E`);
            lineIdx++;
         });
         wipPnr.contacts.forEach(c => {
           addLog(`  ${lineIdx} AP ${c}`);
           lineIdx++;
         });
         addLog(`  ${lineIdx} TK OK`);
         addLog(' ');
         
         // Generate and send email confirmation if email address exists
         const emailAddresses = wipPnr.contacts.filter(c => c.includes('@'));
         if (emailAddresses.length > 0) {
           emailAddresses.forEach(email => {
             // Generate ticket number
             const ticketNumber = `257-${Math.floor(Math.random() * 10000000000)}`;
             
             // Prepare flight data for HTML template
             const flightData = wipPnr.segments.map((s) => {
               const flight = flights.find(f => f.id === s.id);
               if (!flight) return null;
               
               // Calculate arrival time (assume 2 hours for short flights, 3-4 for longer)
               const [depHour, depMin] = flight.std.split(':').map(Number);
               const flightDuration = flight.destination === 'JFK' || flight.destination === 'LAX' || flight.destination === 'BKK' || flight.destination === 'DOH' ? 8 : 2;
               const arrHour = (depHour + flightDuration) % 24;
               const arrMin = depMin;
               const arrivalTime = `${arrHour.toString().padStart(2, '0')}:${arrMin.toString().padStart(2, '0')}`;
               
               // Use today's date for departure, same or next day for arrival
               const today = new Date();
               const departureDate = today.toISOString().split('T')[0];
               const arrivalDate = depHour + flightDuration >= 24 
                 ? new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                 : departureDate;
               
               return {
                 flightNumber: s.flightNumber,
                 departureDate,
                 departureTime: flight.std,
                 arrivalDate,
                 arrivalTime,
                 origin: flight.origin,
                 originCity: flight.originCity || flight.origin,
                 destination: flight.destination,
                 destinationCity: flight.destinationCity || flight.destination,
                 gate: flight.gate || 'TBA',
                 bookingClass: 'Economy Class',
                 baggage: '1 PC'
               };
             }).filter(f => f !== null) as Array<{
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
             
             // Generate HTML email
             const htmlContent = generateBookingConfirmationHtml({
               pnr: newPnr,
               ticketNumber,
               passengerName: `${wipPnr.passengers[0].lastName} / ${wipPnr.passengers[0].firstName} ${wipPnr.passengers[0].title}`,
               flights: flightData,
               fare: wipPnr.pricing ? {
                 baseFare: wipPnr.pricing.baseFare,
                 tax: wipPnr.pricing.tax,
                 fees: wipPnr.pricing.fees,
                 total: wipPnr.pricing.total,
                 currency: 'EUR'
               } : null,
               formOfPayment: wipPnr.formOfPayment ? `CA${wipPnr.formOfPayment.substring(wipPnr.formOfPayment.length - 4).padStart(16, 'X')}` : undefined,
               issuedBy: 'Reservation Department',
               issueDate: new Date().toISOString().split('T')[0],
               issuePlace: 'RIX1A0988'
             });
             
             // Plain text version (fallback)
             let textContent = `Dear ${wipPnr.passengers[0].firstName} ${wipPnr.passengers[0].lastName},\n\n`;
             textContent += 'Thank you for your booking.\n\n';
             textContent += `BOOKING REFERENCE: ${newPnr}\n`;
             textContent += `ELECTRONIC TICKET NUMBER: ${ticketNumber}\n\n`;
             textContent += 'FLIGHT DETAILS:\n';
             flightData.forEach((f) => {
               textContent += `  ${f.flightNumber}: ${f.originCity} (${f.origin}) → ${f.destinationCity} (${f.destination})\n`;
               textContent += `  Departure: ${f.departureDate} ${f.departureTime} | Arrival: ${f.arrivalDate} ${f.arrivalTime}\n`;
               textContent += `  Gate: ${f.gate} | Class: ${f.bookingClass} | Baggage: ${f.baggage}\n\n`;
             });
             if (wipPnr.pricing) {
               textContent += 'FARE DETAILS:\n';
               textContent += `  Fare: EUR ${wipPnr.pricing.baseFare.toFixed(2)}\n`;
               textContent += `  Tax, Fee, Charge: EUR ${(wipPnr.pricing.tax + wipPnr.pricing.fees).toFixed(2)}\n`;
               textContent += `  Total: EUR ${wipPnr.pricing.total.toFixed(2)}\n\n`;
             }
             textContent += 'For any questions, please contact Reservation Department.\n';
             textContent += 'Phone: +371 67280422 | Email: reservations@airport.com\n';
             
             // Get Mailgun from address for display
             const mailgunFromAddress = getMailgunFromAddress();
             
             // Send email via store (uses Mailgun domain for "from" address)
             addLog(' ');
             addLog('*** EMAIL CONFIRMATION QUEUED ***');
             addLog(`TO: ${email}`);
             addLog(`FROM: ${mailgunFromAddress}`);
             addLog(`SUBJECT: Flight Booking Confirmation - PNR ${newPnr}`);
             addLog(`STATUS: SENDING...`);
             addLog(' ');
             
             // Send email asynchronously via Mailgun with HTML content
             sendEmailConfirmation(
               newPnr,
               email,
               `Flight Booking Confirmation - PNR ${newPnr}`,
               textContent,
               htmlContent
             ).then((emailId) => {
               // Update terminal with result
               addLog(`EMAIL ID: ${emailId}`);
               addLog(`STATUS: SENT`);
               addLog(`SENT AT: ${new Date().toLocaleString()}`);
               addLog('Email has been sent via Mailgun.');
               addLog('Customer should receive confirmation within 1-2 minutes.');
               addLog(' ');
             }).catch((error: any) => {
               addLog(`ERROR: ${error.message || 'Failed to send email'}`);
               addLog('Email sending failed. Please check Mailgun configuration.');
               addLog(' ');
             });
           });
         } else {
           addLog('NOTE: No email address provided. Email confirmation not sent.');
           addLog('      Use APE-EMAIL@DOMAIN.COM to add email for confirmation.');
         }
         
         setWipPnr({ segments: [], passengers: [], contacts: [], ticketStatus: '', tstStored: false, pricing: null, ssrs: [], formOfPayment: '', ancillaryPriced: false });
       }
    }

    // --- TEST EMAIL (TESTEMAIL) ---
    else if (cmd.startsWith('TESTEMAIL')) {
      const parts = cmd.split(' ');
      const testEmail = parts.length > 1 ? parts[1] : 'test@example.com';
      
      // Validate email format
      if (!testEmail.includes('@')) {
        addLog('INVALID EMAIL ADDRESS');
        addLog('Usage: TESTEMAIL user@example.com');
      } else {
        const testPnr = 'TEST' + Math.random().toString(36).substring(2, 6).toUpperCase();
        const mailgunFromAddress = getMailgunFromAddress();
        
        // Build test email content
        let testEmailContent = 'Hello,\n\n';
        testEmailContent += 'This is a test email from the Air Baltic Airport Operating System.\n\n';
        testEmailContent += 'TEST DETAILS:\n';
        testEmailContent += `  Test PNR: ${testPnr}\n`;
        testEmailContent += `  Sent at: ${new Date().toLocaleString()}\n`;
        testEmailContent += `  From: ${mailgunFromAddress}\n\n`;
        testEmailContent += 'If you received this email, your Mailgun integration is working correctly!\n\n';
        testEmailContent += 'Best regards,\n';
        testEmailContent += 'Reservation Department';
        
        addLog(' ');
        addLog('*** SENDING TEST EMAIL ***');
        addLog(`TO: ${testEmail}`);
        addLog(`FROM: ${mailgunFromAddress}`);
        addLog(`SUBJECT: Test Email - Mailgun Integration`);
        addLog(`STATUS: SENDING...`);
        addLog(' ');
        
        // Send test email via Mailgun
        sendEmailConfirmation(
          testPnr,
          testEmail,
          'Test Email - Mailgun Integration',
          testEmailContent
        ).then((emailId) => {
          addLog(`EMAIL ID: ${emailId}`);
          addLog(`STATUS: SENT`);
          addLog(`SENT AT: ${new Date().toLocaleString()}`);
          addLog('Test email has been sent via Mailgun.');
          addLog('Please check your inbox (and spam folder).');
          addLog(' ');
        }).catch((error: any) => {
          addLog(`ERROR: ${error.message || 'Failed to send test email'}`);
          addLog('Email sending failed. Please check Mailgun configuration.');
          addLog('Verify VITE_MAILGUN_API_KEY and VITE_MAILGUN_DOMAIN in .env file.');
          addLog(' ');
        });
      }
    }

    // --- RESEND EMAIL (RESEND) ---
    else if (cmd.startsWith('RESEND')) {
      const parts = cmd.split(' ');
      const pnrToResend = parts.length > 1 ? parts[1].toUpperCase() : '';
      
      if (!pnrToResend) {
        addLog('INVALID COMMAND');
        addLog('Usage: RESEND [PNR]');
        addLog('Example: RESEND ABC123');
      } else {
        // Find passengers with this PNR
        const pnrPassengers = passengers.filter(p => p.pnr === pnrToResend);
        
        if (pnrPassengers.length === 0) {
          addLog(`NO BOOKING FOUND FOR PNR: ${pnrToResend}`);
        } else {
          // Find original email
          const originalEmail = emails.find(e => e.pnr === pnrToResend && e.status === 'SENT');
          
          if (!originalEmail) {
            addLog(`NO EMAIL RECORD FOUND FOR PNR: ${pnrToResend}`);
            addLog('Email may not have been sent originally.');
          } else {
            // Get unique flights for this PNR
            const uniqueFlightIds = [...new Set(pnrPassengers.map(p => p.flightId))];
            const pnrFlights = uniqueFlightIds.map(id => flights.find(f => f.id === id)).filter(f => f !== undefined) as Flight[];
            
            if (pnrFlights.length === 0) {
              addLog('NO FLIGHT DATA FOUND FOR THIS BOOKING');
            } else {
              // Generate ticket number (use same format)
              const ticketNumber = `257-${Math.floor(Math.random() * 10000000000)}`;
              
              // Prepare flight data for HTML template
              const flightData = pnrFlights.map((flight) => {
                // Calculate arrival time
                const [depHour, depMin] = flight.std.split(':').map(Number);
                const flightDuration = flight.destination === 'JFK' || flight.destination === 'LAX' || flight.destination === 'BKK' || flight.destination === 'DOH' ? 8 : 2;
                const arrHour = (depHour + flightDuration) % 24;
                const arrMin = depMin;
                const arrivalTime = `${arrHour.toString().padStart(2, '0')}:${arrMin.toString().padStart(2, '0')}`;
                
                const today = new Date();
                const departureDate = today.toISOString().split('T')[0];
                const arrivalDate = depHour + flightDuration >= 24 
                  ? new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                  : departureDate;
                
                return {
                  flightNumber: flight.flightNumber,
                  departureDate,
                  departureTime: flight.std,
                  arrivalDate,
                  arrivalTime,
                  origin: flight.origin,
                  originCity: flight.originCity || flight.origin,
                  destination: flight.destination,
                  destinationCity: flight.destinationCity || flight.destination,
                  gate: flight.gate || 'TBA',
                  bookingClass: 'Economy Class',
                  baggage: '1 PC'
                };
              });
              
              // Get first passenger for name
              const firstPassenger = pnrPassengers[0];
              const passengerName = `${firstPassenger.lastName} / ${firstPassenger.firstName} ${firstPassenger.title || 'MR'}`;
              
              // Generate HTML email
              const htmlContent = generateBookingConfirmationHtml({
                pnr: pnrToResend,
                ticketNumber,
                passengerName,
                flights: flightData,
                fare: null, // Pricing not stored, so we can't resend it
                issuedBy: 'Reservation Department',
                issueDate: new Date().toISOString().split('T')[0],
                issuePlace: 'RIX1A0988'
              });
              
              // Plain text version
              let textContent = `Dear ${firstPassenger.firstName} ${firstPassenger.lastName},\n\n`;
              textContent += 'This is a resend of your booking confirmation.\n\n';
              textContent += `BOOKING REFERENCE: ${pnrToResend}\n`;
              textContent += `ELECTRONIC TICKET NUMBER: ${ticketNumber}\n\n`;
              textContent += 'FLIGHT DETAILS:\n';
              flightData.forEach((f) => {
                textContent += `  ${f.flightNumber}: ${f.originCity} (${f.origin}) → ${f.destinationCity} (${f.destination})\n`;
                textContent += `  Departure: ${f.departureDate} ${f.departureTime} | Arrival: ${f.arrivalDate} ${f.arrivalTime}\n`;
                textContent += `  Gate: ${f.gate} | Class: ${f.bookingClass} | Baggage: ${f.baggage}\n\n`;
              });
              textContent += 'For any questions, please contact Reservation Department.\n';
              textContent += 'Phone: +371 67280422 | Email: reservations@airport.com\n';
              
              const mailgunFromAddress = getMailgunFromAddress();
              
              addLog(' ');
              addLog('*** RESENDING EMAIL CONFIRMATION ***');
              addLog(`PNR: ${pnrToResend}`);
              addLog(`TO: ${originalEmail.to}`);
              addLog(`FROM: ${mailgunFromAddress}`);
              addLog(`SUBJECT: Flight Booking Confirmation - PNR ${pnrToResend} (Resent)`);
              addLog(`STATUS: SENDING...`);
              addLog(' ');
              
              // Resend email
              sendEmailConfirmation(
                pnrToResend,
                originalEmail.to,
                `Flight Booking Confirmation - PNR ${pnrToResend} (Resent)`,
                textContent,
                htmlContent
              ).then((emailId) => {
                addLog(`EMAIL ID: ${emailId}`);
                addLog(`STATUS: SENT`);
                addLog(`SENT AT: ${new Date().toLocaleString()}`);
                addLog('Email has been resent via Mailgun.');
                addLog(' ');
              }).catch((error: any) => {
                addLog(`ERROR: ${error.message || 'Failed to resend email'}`);
                addLog('Email resending failed. Please check Mailgun configuration.');
                addLog(' ');
              });
            }
          }
        }
      }
    }

    // --- CLEAR (CL) ---
    else if (cmd === 'CL') {
      setOutput([]);
    }

    // --- HELP ---
    else if (cmd === 'HELP') {
      addLog('COMMANDS:');
      addLog('  AN.......Check Availability - Show all flights for today');
      addLog('  ANRIX....Show all flights departing from RIX');
      addLog('  ANRIXJFK.Show flights from RIX to JFK');
      addLog('  SS1Y1....Sell 1 Seat Y class Line 1');
      addLog('  NM1....../... Add Name (NM1DOE/JOHN)');
      addLog('  SD1....../... Staff Duty (SD1DOE/JOHN MR/EMP12345)');
      addLog('  SSBY1.../... Staff Standby (SSBY1DOE/JOHN MR/EMP12345)');
      addLog('  AP.......Add Phone (AP 0123456)');
      addLog('  APE-.....Add Email (APE-EMAIL@DOMAIN.COM)');
      addLog('  FXP......Price & Store TST (Transitional Stored Ticket)');
      addLog('  FXX......Informative Pricing (View without storing)');
      addLog('  FXG......Price & Store Ancillary Services');
      addLog('  FXH......Informative Ancillary Pricing (View only)');
      addLog('  FXK......Display Ancillary Services Catalogue');
      addLog('  TQT......Display TST Index');
      addLog('  TQM......Display TSM (Transitional Stored Miscellaneous)');
      addLog('  TMI......Insert/Modify FOP for Ancillaries');
      addLog('    TMI/M12-13/FP-CCCA.../1215*CV123 (New FOP)');
      addLog('    TMI/M12-13/FP-O/CCCA (Use existing FOP)');
      addLog('  TTM......Reissue Tickets for Ancillaries');
      addLog('    TTM/M12-13/RT');
      addLog('  RP.......Display Current PNR');
      addLog('  SR.......Add Special Service Request');
      addLog('    Examples:');
      addLog('      SR XBAG/P1/S1 - Extra Baggage');
      addLog('      SR XWGT-KG15/P1/S1 - Excess Weight 15KG');
      addLog('      SR WCHC/P1 - Wheelchair Cabin');
      addLog('      SR DEAF/P1 - Deaf Passenger');
      addLog('      SR OEC/P1/S1 - Bicycle');
      addLog('  TKOK.....Ticketing OK');
      addLog('  ER.......End & Retrieve (Save PNR)');
      addLog('  RT[PNR]..Retrieve Reservation (e.g. RTAN24NO)');
      addLog('  RESEND...Resend Email Confirmation (RESEND [PNR])');
      addLog('  TESTEMAIL.Send Test Email (TESTEMAIL user@example.com)');
      addLog('  CL.......Clear Screen');
    } 
    
    else {
      addLog('CHECK ENTRY - TYPE HELP FOR COMMANDS');
    }

    setInput('');
  };

  return (
    <div className="h-full w-full bg-[#e4e9f2] text-[#000080] font-mono text-sm flex flex-col p-1 overflow-hidden select-text">
      {/* Toolbar */}
      <div className="bg-[#d0d7e5] border-b border-gray-400 p-1 flex gap-1 text-xs mb-1 select-none">
         <button className="px-2 py-0.5 bg-[#c0c7d5] border border-gray-500 shadow-sm active:translate-y-px">MUFQP</button>
         <button className="px-2 py-0.5 bg-[#c0c7d5] border border-gray-500 shadow-sm active:translate-y-px">ACR</button>
         <button className="px-2 py-0.5 bg-[#c0c7d5] border border-gray-500 shadow-sm active:translate-y-px">AN</button>
         <button className="px-2 py-0.5 bg-[#c0c7d5] border border-gray-500 shadow-sm active:translate-y-px">DO</button>
         <div className="flex-1"></div>
      </div>

      {/* Terminal Area */}
      <div 
        ref={outputRef}
        className="flex-1 overflow-y-auto bg-[#e4e9f2] p-2"
        style={{ fontFamily: '"Courier New", Courier, monospace' }}
      >
        <div className="mb-4">
          <div className="text-blue-800 font-bold">AMADEUS TRANSIT SYSTEM</div>
          <div>Welcome to 1A (RIX HUB). Type HELP for commands.</div>
          <br/>
        </div>
        {output.map((line, i) => (
          <div key={i} className="whitespace-pre-wrap leading-tight min-h-[1.2em]">
            {/* Basic highlighting */}
            {line.startsWith('>') ? <span className="text-black font-bold">{line}</span> :
             line.includes('HK1') ? <span className="text-green-700 font-bold">{line}</span> :
             line.includes('*CXN') ? <span className="text-purple-600 font-bold italic">{line}</span> :
             line.startsWith('INVALID') ? <span className="text-red-600 font-bold">{line}</span> :
             line}
          </div>
        ))}
      </div>

      {/* Input Line */}
      <form onSubmit={handleCommand} className="mt-2 flex items-center bg-white border border-gray-400 p-1">
        <span className="mr-1 font-bold">{'>'}</span>
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 bg-transparent outline-none uppercase"
          autoFocus
          placeholder="Type command..."
        />
      </form>
      <div className="text-xs text-gray-500 mt-1 flex justify-between px-1 select-none">
         <span>Ln: {output.length + 1} Col: 01</span>
         <span>AMADEUS RIX</span>
      </div>
    </div>
  );
};
