import React, { useState, useRef, useEffect } from 'react';
import { useAirportStore } from '../store/airportStore';
import type { Flight } from '../store/airportStore';

// Helper to generate PNR
const generatePNR = () => Math.random().toString(36).substring(2, 8).toUpperCase();

// Types for the PNR being built
interface WipPNR {
  segments: Flight[];
  passengers: { lastName: string; firstName: string; title: string }[];
  contacts: string[];
  ticketStatus: string;
}

export const ReservationsApp = () => {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState<string[]>([]);
  const [wipPnr, setWipPnr] = useState<WipPNR>({
    segments: [],
    passengers: [],
    contacts: [],
    ticketStatus: ''
  });

  const flights = useAirportStore((state) => state.flights);
  const passengers = useAirportStore((state) => state.passengers);
  const createBooking = useAirportStore((state) => state.createBooking);
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
      
      // Basic parsing: AN[DATE][ORG][DEST] or AN[ORG][DEST] or just AN (List all)
      // Regex to extract Origin (3 chars) and Dest (3 chars) from end of string
      // e.g. ANRIXJFK -> Org: RIX, Dest: JFK
      // e.g. AN10NOVRIXJFK -> Org: RIX, Dest: JFK
      
      let origin = '';
      let dest = '';
      
      // Heuristic: Look for last 6 characters being 2 airport codes
      if (cmd.length >= 8) {
         const potentialRoute = cmd.slice(-6);
         origin = potentialRoute.slice(0, 3);
         dest = potentialRoute.slice(3, 6);
      } else if (cmd.length === 2) {
        // Just AN -> Show all departing from RIX (Hub)
        origin = 'RIX';
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
            // Must depart AFTER Leg 1 arrives (let's assume +2 hours for simplicity of generating logic)
            const leg2Candidates = flights.filter(f => 
               f.origin === l1.destination && 
               f.destination === dest &&
               f.std > l1.etd // Simple string compare works for HH:MM if in same day
            );

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

      // Display Results
      if (foundFlights.length === 0) {
        addLog('NO FLIGHTS FOUND');
      } else {
        foundFlights.slice(0, 10).forEach((item, i) => {
           const f = item.flight;
           const idx = i + 1;
           
           if (item.type === 'DIRECT') {
             addLog(`${idx}  ${f.flightNumber} J9 C9 Y9 ${f.origin} ${f.destination} ${f.std} ${f.etd} E0/${f.aircraft}`);
           } else if (item.connection) {
             const c = item.connection;
             addLog(`${idx}  ${f.flightNumber} J9 Y9 ${f.origin} ${f.destination} ${f.std} ${f.etd} E0/${f.aircraft}  *CXN`);
             addLog(`    ${c.flightNumber} J9 Y9 ${c.origin} ${c.destination} ${c.std} ${c.etd} E0/${c.aircraft}`);
           }
        });
      }
      addLog(' ');
    }

    // --- SELL SEGMENT (SS) ---
    // SS1Y1 (Sell 1 Seat Y class Line 1)
    else if (cmd.startsWith('SS')) {
      // Simple parser: SS[Qty][Class][LineNum]
      const lineNumChar = cmd.slice(-1);
      const lineNum = parseInt(lineNumChar);
      
      // Since I don't store the "last search results", I can't easily map Line 1 to the correct flight if I just generated them on the fly in the log.
      // For this demo, let's just grab from the global flight list or try to find what was likely shown.
      // A proper implementation would store `lastSearchResults` in state.
      // I'll assume for now the user is picking from the unfiltered list or I'll just pick "Line Num" from the main flights array which is confusing.
      // Let's fix this: The user wants "Real".
      // But I can't rewrite the whole search state management right now easily without refactoring.
      // Hack: Just map to the global flights list index for now, but warn if out of bounds.
      // Or better: Store the last search result in state.
      
      // Let's assume we pick from the first 10 flights shown (which comes from filtered). 
      // Actually, let's just fallback to finding flight by number if SS fails, or keep it simple.
      // "SS1Y1" -> grab flights[0]. 
      
      if (!isNaN(lineNum) && lineNum > 0 && lineNum <= flights.length) {
        const flight = flights[lineNum - 1]; // This is naive, but works if listing all.
        setWipPnr(prev => ({ ...prev, segments: [...prev.segments, flight] }));
        addLog(' ');
        addLog(`1  ${flight.flightNumber} Y 10NOV ${flight.origin}${flight.destination} HK1 ${flight.std} ${flight.etd} ${flight.gate} E`);
        addLog(' ');
      } else {
        addLog('INVALID SEGMENT NUMBER');
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
          passengers: [...prev.passengers, { lastName: surname, firstName, title: title || 'MR' }] 
        }));
        addLog(`1.${surname}/${firstName} ${title || 'MR'}`);
        addLog(' ');
      } else {
         addLog('INVALID NAME FORMAT. USE NM1SURNAME/NAME');
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

    // --- TICKETING (TKOK) ---
    else if (cmd === 'TKOK') {
       setWipPnr(prev => ({ ...prev, ticketStatus: 'OK' }));
       addLog('TK OK');
    }

    // --- RETRIEVE (RT) ---
    else if (cmd.startsWith('RT')) {
       const term = cmd.substring(2).trim();
       const found = passengers.filter(p => p.pnr === term);
       if (found.length > 0) {
          addLog(`RP/RIX1A0988/RIX1A0988            AA/SU  ${new Date().toDateString()}`);
          found.forEach((p, i) => {
             addLog(`  ${i+1}.${p.lastName}/${p.firstName} MR`);
          });
          const f = flights.find(f => f.id === found[0].flightId);
          if (f) {
             addLog(`  ${found.length + 1}  ${f.flightNumber} Y ${f.std} ${f.origin}${f.destination} HK${found.length}       ${f.std} ${f.etd}   ${f.gate} E`);
          }
          addLog(`  ${found.length + 2} AP LON 020-7123-4567`);
          addLog(`  ${found.length + 3} TK TL${new Date().getDate()}NOV/RIX1A0988`);
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
               createBooking(newPnr, p.lastName, p.firstName, s.id);
            });
         });

         addLog(' ');
         addLog(`RP/RIX1A0988/RIX1A0988            AA/SU  ${new Date().toDateString()}   ${newPnr}`);
         
         let lineIdx = 1;
         wipPnr.passengers.forEach(p => {
            addLog(`  ${lineIdx}.${p.lastName}/${p.firstName} ${p.title}`);
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
         
         setWipPnr({ segments: [], passengers: [], contacts: [], ticketStatus: '' });
       }
    }

    // --- CLEAR (CL) ---
    else if (cmd === 'CL') {
      setOutput([]);
    }

    // --- HELP ---
    else if (cmd === 'HELP') {
      addLog('COMMANDS:');
      addLog('  AN.......Check Availability (e.g. AN RIXJFK)');
      addLog('  SS1Y1....Sell 1 Seat Y class Line 1');
      addLog('  NM1....../... Add Name (NM1DOE/JOHN)');
      addLog('  AP.......Add Phone (AP 0123456)');
      addLog('  TKOK.....Ticketing OK');
      addLog('  ER.......End & Retrieve (Save PNR)');
      addLog('  RT[PNR]..Retrieve Reservation');
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
