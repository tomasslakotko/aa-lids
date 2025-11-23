import { useState, useEffect, useRef } from 'react';
import { useAirportStore } from '../store/airportStore';
import type { Flight } from '../store/airportStore';
import { Mic, Play, Square, Volume2, Bell, Radio, Users, Clock, AlertTriangle, ArrowRightLeft } from 'lucide-react';
import clsx from 'clsx';

const CITY_NAMES: Record<string, string> = {
  'RIX': 'Riga', 'OSL': 'Oslo', 'HEL': 'Helsinki', 'CDG': 'Paris', 
  'FNC': 'Funchal', 'MUC': 'Munich', 'BER': 'Berlin', 'PRG': 'Prague', 
  'ARN': 'Stockholm', 'CPH': 'Copenhagen', 'BLL': 'Billund', 'VIE': 'Vienna', 
  'TLL': 'Tallinn', 'VNO': 'Vilnius', 'FRA': 'Frankfurt', 'AMS': 'Amsterdam', 
  'LGW': 'London', 'JFK': 'New York', 'DXB': 'Dubai', 'DOH': 'Doha', 
  'LHR': 'London', 'EWR': 'Newark'
};

const getCity = (f: Flight) => f.destinationCity || CITY_NAMES[f.destination] || f.destination;

// Helper to make flight numbers sound natural (digit by digit)
const formatFlightForSpeech = (flightNum: string) => {
  const match = flightNum.match(/([A-Z]+)(\d+)/);
  if (!match) return flightNum.split('').join(' '); 

  const [_, code, number] = match;
  
  const airlineMap: Record<string, string> = {
    'BT': 'Air Baltic', 'LH': 'Lufthansa', 'BA': 'British Airways',
    'DL': 'Delta', 'AF': 'Air France', 'KL': 'KLM', 'SK': 'S A S',
    'AY': 'Finnair', 'LO': 'LOT', 'FR': 'Ryanair', 'W6': 'Wizz Air',
    'OS': 'Austrian', 'LX': 'Swiss', 'UA': 'United', 'AA': 'American',
    'EK': 'Emirates', 'QR': 'Qatar'
  };

  const airlineName = airlineMap[code] || code.split('').join(' '); 
  const spacedNumber = number.split('').join(' '); // "2 3 5"

  return `${airlineName} flight ${spacedNumber}`;
};

// Updated text for better TTS pronunciation ("Air Baltic") and punctuation
const TEMPLATES = [
  { 
    id: 'PRE_BOARDING', 
    label: 'Pre-Boarding', 
    icon: Users,
    text: (f: Flight) => `Good morning passengers, pre-boarding for ${formatFlightForSpeech(f.flightNumber)} to ${getCity(f)}, will begin shortly at gate ${f.gate}. We invite passengers travelling with small children, and those requiring special assistance, to come forward.` 
  },
  { 
    id: 'BOARDING_START', 
    label: 'General Boarding', 
    icon: Play,
    text: (f: Flight) => `Boarding is now starting, for ${formatFlightForSpeech(f.flightNumber)} to ${getCity(f)}, at gate ${f.gate}. Please have your boarding pass and identification ready.` 
  },
  { 
    id: 'GROUP_BOARDING', 
    label: 'Group Boarding', 
    icon: Users,
    text: (f: Flight, extra?: string) => `We are now boarding Group ${extra || '1'}, for ${formatFlightForSpeech(f.flightNumber)} to ${getCity(f)}. Please check the group number on your boarding pass.` 
  },
  { 
    id: 'LAST_CALL', 
    label: 'Final Call', 
    icon: Clock,
    text: (f: Flight) => `This is the final boarding call, for ${formatFlightForSpeech(f.flightNumber)} to ${getCity(f)}. All remaining passengers, please proceed immediately to gate ${f.gate}. The gate will close in 5 minutes.` 
  },
  { 
    id: 'DELAY', 
    label: 'Flight Delay', 
    icon: Clock,
    text: (f: Flight) => `Attention please. We regret to announce that ${formatFlightForSpeech(f.flightNumber)} to ${getCity(f)}, is delayed due to operational reasons. The new estimated departure time is ${f.etd}. We apologize for the inconvenience.` 
  },
  { 
    id: 'GATE_CHANGE', 
    label: 'Gate Change', 
    icon: ArrowRightLeft,
    text: (f: Flight, extra?: string) => `Attention passengers on ${formatFlightForSpeech(f.flightNumber)} to ${getCity(f)}. The departure gate has been changed. The flight will now depart from gate ${extra || f.gate}.` 
  },
  { 
    id: 'SECURITY', 
    label: 'Security Check', 
    icon: AlertTriangle,
    text: () => `Security announcement. Please do not leave your baggage unattended at any time. Unattended baggage will be removed and may be destroyed.` 
  }
];

export const AnnouncementsApp = () => {
  const flights = useAirportStore((state) => state.flights);
  const [selectedFlightId, setSelectedFlightId] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [customText, setCustomText] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [extraInput, setExtraInput] = useState('');
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const synth = useRef<SpeechSynthesis>(window.speechSynthesis);
  const audioContext = useRef<AudioContext | null>(null);

  const selectedFlight = flights.find(f => f.id === selectedFlightId);

  const getPreferredVoice = (available: SpeechSynthesisVoice[]) => {
    const priorities = [
      'Google UK English Female',
      'Google US English', 
      'Arthur', // macOS Natural
      'Martha', // macOS Natural
      'Samantha',
      'Microsoft Zira',
      'Daniel',
      'Google UK English Male'
    ];

    for (const name of priorities) {
      const found = available.find(v => v.name.includes(name));
      if (found) return found;
    }
    // Fallback to any English voice
    return available.find(v => v.lang.startsWith('en')) || available[0];
  };

  useEffect(() => {
    const loadVoices = () => {
      const available = synth.current.getVoices().sort((a, b) => {
        // Sort English to top
        const aEn = a.lang.startsWith('en');
        const bEn = b.lang.startsWith('en');
        if (aEn && !bEn) return -1;
        if (!aEn && bEn) return 1;
        return a.name.localeCompare(b.name);
      });
      
      setVoices(available);
      setSelectedVoice(getPreferredVoice(available));
    };

    loadVoices();
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // --- Realistic Airport Chime Generator (Web Audio API) ---
  const playChime = async () => {
    if (!audioContext.current) {
      audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioContext.current;
    
    // iOS/iPad requires AudioContext to be resumed after user interaction
    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch (e) {
        console.warn('Could not resume AudioContext:', e);
      }
    }
    
    const t = ctx.currentTime;

    // Oscillator 1: "Ding" (High-Low harmonic)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    osc1.frequency.setValueAtTime(523.25, t); // C5
    gain1.gain.setValueAtTime(0.1, t);
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
    osc1.start(t);
    osc1.stop(t + 1.5);

    // Oscillator 2: "Dong" (Lower)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc2.frequency.setValueAtTime(392.00, t + 0.6); // G4
    gain2.gain.setValueAtTime(0, t);
    gain2.gain.setValueAtTime(0.1, t + 0.6);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 2.5);
    osc2.start(t);
    osc2.stop(t + 2.5);

    return new Promise(resolve => setTimeout(resolve, 2000));
  };

  const handlePlay = async () => {
    // iOS/iPad: Ensure AudioContext is resumed (required for audio playback)
    if (audioContext.current && audioContext.current.state === 'suspended') {
      try {
        await audioContext.current.resume();
      } catch (e) {
        console.warn('Could not resume AudioContext:', e);
      }
    }

    if (synth.current.speaking) {
      synth.current.cancel();
    }

    let textToSpeak = customText;
    
    if (selectedTemplate && selectedFlight) {
        const tmpl = TEMPLATES.find(t => t.id === selectedTemplate);
        if (tmpl) {
            textToSpeak = tmpl.text(selectedFlight, extraInput);
        }
    } else if (selectedTemplate === 'SECURITY') {
        const tmpl = TEMPLATES.find(t => t.id === 'SECURITY');
        if (tmpl) {
            // @ts-ignore
            textToSpeak = tmpl.text(null); 
        }
    }

    if (!textToSpeak) return;

    setIsPlaying(true);
    
    try {
      // 1. Play Realistic Chime first
      await playChime();
      
      // 2. Play Voice Announcement
      // iOS/iPad: SpeechSynthesis might need a small delay
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      if (selectedVoice) {
          utterance.voice = selectedVoice;
          utterance.lang = selectedVoice.lang; // Set language explicitly for better accent
      }
      
      utterance.rate = 0.9; // Slightly faster (0.9) for a more fluid natural flow
      utterance.volume = 1.0;

      utterance.onend = () => setIsPlaying(false);
      utterance.onerror = (e) => {
        console.error('Speech synthesis error:', e);
        setIsPlaying(false);
      };
      
      // iOS/iPad: Check if speechSynthesis is available
      if (!window.speechSynthesis) {
        alert('Speech synthesis is not available on this device. Please use a device with text-to-speech support.');
        setIsPlaying(false);
        return;
      }
      
      synth.current.speak(utterance);
    } catch (error) {
      console.error('Error playing announcement:', error);
      setIsPlaying(false);
      alert('Error playing announcement. Please try again.');
    }
  };

  const handleStop = () => {
    synth.current.cancel();
    setIsPlaying(false);
  };

  // Auto-select first flight
  useEffect(() => {
      if (!selectedFlightId && flights.length > 0) {
          setSelectedFlightId(flights[0].id);
      }
  }, [flights]);

  return (
    <div className="h-full w-full bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* Header */}
      <div className="bg-slate-800 p-4 border-b border-slate-700 flex justify-between items-center shadow-md">
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center shadow-lg shadow-red-900/50">
                <Mic className="text-white" size={20} />
            </div>
            <div>
                <h1 className="text-xl font-bold tracking-wide">Public Address System</h1>
                <div className="text-xs text-slate-400 uppercase tracking-wider">Zone: Terminal 1 (All Gates)</div>
            </div>
        </div>
        <div className="flex items-center gap-4 bg-slate-900 p-2 rounded-lg border border-slate-700">
            <div className={`w-3 h-3 rounded-full ${isPlaying ? 'bg-green-500 animate-pulse' : 'bg-slate-600'}`} />
            <span className={`text-xs font-bold ${isPlaying ? 'text-green-400' : 'text-slate-500'}`}>
                {isPlaying ? 'BROADCASTING LIVE' : 'SYSTEM READY'}
            </span>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Flight List Sidebar */}
        <div className="w-64 bg-slate-850 border-r border-slate-700 overflow-y-auto">
            <div className="p-3 text-xs font-bold text-slate-500 uppercase sticky top-0 bg-slate-850 z-10">Active Flights</div>
            {flights.map(f => (
                <button
                    key={f.id}
                    onClick={() => setSelectedFlightId(f.id)}
                    className={clsx(
                        "w-full text-left p-4 border-b border-slate-800 transition-colors hover:bg-slate-800",
                        selectedFlightId === f.id ? "bg-slate-800 border-l-4 border-l-red-500" : "border-l-4 border-l-transparent"
                    )}
                >
                    <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-lg text-white">{f.flightNumber}</span>
                        <span className="text-xs bg-slate-700 px-2 py-0.5 rounded text-slate-300">{f.status}</span>
                    </div>
                    <div className="flex justify-between text-sm text-slate-400">
                        <span>{f.destinationCity || f.destination}</span>
                        <span>{f.std}</span>
                    </div>
                </button>
            ))}
        </div>

        {/* Main Control Area */}
        <div className="flex-1 flex flex-col p-6 overflow-y-auto bg-slate-900">
            
            {/* Templates Grid */}
            <div className="grid grid-cols-4 gap-4 mb-8">
                {TEMPLATES.map(t => (
                    <button
                        key={t.id}
                        onClick={() => {
                            setSelectedTemplate(t.id);
                            setCustomText(''); // Clear custom text when selecting template
                        }}
                        className={clsx(
                            "p-4 rounded-xl border transition-all flex flex-col items-center gap-3 text-center group",
                            selectedTemplate === t.id 
                                ? "bg-red-600 border-red-500 text-white shadow-lg shadow-red-900/20" 
                                : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750 hover:border-slate-600"
                        )}
                    >
                        <t.icon size={24} className={selectedTemplate === t.id ? "text-white" : "text-slate-400 group-hover:text-white"} />
                        <span className="font-bold text-sm">{t.label}</span>
                    </button>
                ))}
            </div>

            {/* Dynamic Controls based on Template */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 mb-6 shadow-lg">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-slate-200 flex items-center gap-2">
                        <Radio size={18} className="text-red-400" />
                        Announcement Preview
                    </h3>
                    
                    {/* Extra Inputs for specific templates */}
                    {selectedTemplate === 'GROUP_BOARDING' && (
                        <div className="flex items-center gap-2">
                            <label className="text-sm text-slate-400">Group Number:</label>
                            <input 
                                type="text" 
                                value={extraInput}
                                onChange={e => setExtraInput(e.target.value)}
                                placeholder="1"
                                className="bg-slate-900 border border-slate-600 rounded px-3 py-1 w-16 text-center text-white focus:border-red-500 outline-none"
                            />
                        </div>
                    )}
                    {selectedTemplate === 'GATE_CHANGE' && (
                        <div className="flex items-center gap-2">
                            <label className="text-sm text-slate-400">New Gate:</label>
                            <input 
                                type="text" 
                                value={extraInput}
                                onChange={e => setExtraInput(e.target.value)}
                                placeholder="A1"
                                className="bg-slate-900 border border-slate-600 rounded px-3 py-1 w-16 text-center text-white focus:border-red-500 outline-none"
                            />
                        </div>
                    )}
                </div>

                <div className="bg-slate-900 rounded-lg p-4 border border-slate-700 font-mono text-slate-300 min-h-[100px] text-lg leading-relaxed">
                    {selectedTemplate && selectedFlight 
                        ? TEMPLATES.find(t => t.id === selectedTemplate)?.text(selectedFlight, extraInput)
                        : selectedTemplate === 'SECURITY' 
                            // @ts-ignore
                            ? TEMPLATES.find(t => t.id === 'SECURITY')?.text(null)
                            : customText || "Select a template or flight to preview announcement..."
                    }
                </div>
                
                {!selectedTemplate && (
                    <textarea
                        value={customText}
                        onChange={e => setCustomText(e.target.value)}
                        placeholder="Or type a custom announcement here..."
                        className="w-full mt-4 bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:border-red-500 outline-none min-h-[80px]"
                    />
                )}
            </div>

            {/* Control Bar */}
            <div className="mt-auto bg-slate-800 rounded-xl p-4 border border-slate-700 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                        <label className="text-[10px] uppercase font-bold text-slate-500 mb-1">Voice Engine</label>
                        <select 
                            className="bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-white outline-none focus:border-red-500 w-64"
                            onChange={e => setSelectedVoice(voices.find(v => v.name === e.target.value) || null)}
                            value={selectedVoice?.name || ''}
                            onMouseDown={(e) => e.stopPropagation()}
                        >
                            {voices.map((v, i) => (
                                <option key={`${v.name}-${v.lang}-${i}`} value={v.name}>{v.name} ({v.lang})</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex flex-col">
                        <label className="text-[10px] uppercase font-bold text-slate-500 mb-1">Chime</label>
                        <div className="flex items-center gap-2 text-sm text-slate-300 bg-slate-900 px-3 py-2 rounded border border-slate-600">
                            <Bell size={14} /> Standard 2-Tone
                        </div>
                    </div>
                </div>

                <div className="flex gap-4">
                    {isPlaying ? (
                        <button 
                            onClick={handleStop}
                            className="bg-slate-700 hover:bg-slate-600 text-white px-8 py-4 rounded-xl font-bold flex items-center gap-3 transition-all"
                        >
                            <Square size={20} fill="currentColor" /> STOP
                        </button>
                    ) : (
                        <button 
                            onClick={handlePlay}
                            disabled={!selectedTemplate && !customText}
                            className="bg-red-600 hover:bg-red-500 disabled:bg-slate-700 disabled:text-slate-500 text-white px-8 py-4 rounded-xl font-bold flex items-center gap-3 shadow-lg shadow-red-900/30 transition-all active:scale-95"
                        >
                            <Volume2 size={24} /> BROADCAST
                        </button>
                    )}
                </div>
            </div>

        </div>
      </div>
    </div>
  );
};
