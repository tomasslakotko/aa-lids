import React, { useState, useMemo } from 'react';
import { useAirportStore } from '../store/airportStore';
import clsx from 'clsx';
import { 
  Box, CheckCircle,
  Scale, Clipboard, Scan, ArrowLeft, Truck
} from 'lucide-react';

export const BaggageLoadingApp = () => {
  const [selectedFlightId, setSelectedFlightId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'SCAN' | 'MANIF' | 'LOADSHEET'>('SCAN');
  const [scanInput, setScanInput] = useState('');
  const [lastAction, setLastAction] = useState<string>('');

  const flights = useAirportStore((state) => state.flights);
  const passengers = useAirportStore((state) => state.passengers);
  const loadBag = useAirportStore((state) => state.loadBag);
  const unloadBag = useAirportStore((state) => state.unloadBag);

  const selectedFlight = flights.find(f => f.id === selectedFlightId);

  // Filter Pax with Bags
  const flightPaxWithBags = useMemo(() => 
    passengers.filter(p => p.flightId === selectedFlightId && p.bagCount > 0),
  [passengers, selectedFlightId]);

  // Flatten into a list of individual bags
  const allBags = useMemo(() => {
    const bags: any[] = [];
    flightPaxWithBags.forEach(p => {
      for (let i = 0; i < p.bagCount; i++) {
        bags.push({
          id: `${p.pnr}-${i + 1}`,
          tag: `00BT${p.pnr}${i + 1}`,
          pnr: p.pnr,
          name: `${p.lastName}/${p.firstName}`,
          loaded: (p.bagsLoaded || 0) > i,
          weight: 23 // Default for now
        });
      }
    });
    return bags;
  }, [flightPaxWithBags]);

  const stats = useMemo(() => {
    const total = allBags.length;
    const loaded = allBags.filter(b => b.loaded).length;
    const weight = loaded * 23;
    return { total, loaded, weight, remaining: total - loaded };
  }, [allBags]);

  const handleScan = (e: React.FormEvent) => {
    e.preventDefault();
    const tag = scanInput.trim().toUpperCase();
    if (!tag) return;

    // Simple fuzzy finding by PNR or Tag
    const bag = allBags.find(b => b.tag.includes(tag) || b.pnr.includes(tag));
    
    if (bag) {
        if (bag.loaded) {
            setLastAction(`ALREADY LOADED: ${bag.tag}`);
        } else {
            loadBag(bag.pnr);
            setLastAction(`LOADED: ${bag.tag} (${bag.name})`);
            setScanInput('');
        }
    } else {
        setLastAction(`UNKNOWN TAG: ${tag}`);
    }
  };

  const toggleLoad = (bag: any) => {
      if (bag.loaded) {
          unloadBag(bag.pnr);
      } else {
          loadBag(bag.pnr);
      }
  };

  if (!selectedFlight) {
    return (
      <div className="h-full w-full bg-zinc-900 text-zinc-300 flex flex-col items-center justify-center font-mono">
        <div className="w-full max-w-md p-4">
            <h1 className="text-2xl font-bold text-yellow-500 mb-4 flex items-center gap-2">
                <Truck /> BRS LOGIN
            </h1>
            <div className="bg-zinc-800 rounded border border-zinc-700 overflow-hidden">
                {flights.map(f => (
                    <button 
                        key={f.id}
                        onClick={() => setSelectedFlightId(f.id)}
                        className="w-full text-left p-4 border-b border-zinc-700 hover:bg-zinc-700 flex justify-between items-center"
                    >
                        <div>
                            <div className="font-bold text-white">{f.flightNumber}</div>
                            <div className="text-xs">{f.destination} - {f.std}</div>
                        </div>
                        <div className="bg-zinc-900 px-2 py-1 text-xs rounded border border-zinc-600">
                            {f.aircraft}
                        </div>
                    </button>
                ))}
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-black text-green-500 font-mono flex flex-col select-none">
        {/* HEADER */}
        <div className="bg-zinc-900 border-b border-zinc-700 p-2 flex justify-between items-center">
            <div>
                <div className="text-xs text-zinc-400">FLIGHT</div>
                <div className="text-xl font-bold text-white">{selectedFlight.flightNumber} <span className="text-green-600">{selectedFlight.destination}</span></div>
            </div>
            <div className="text-right">
                <div className="text-xs text-zinc-400">LOAD PROGRESS</div>
                <div className="text-xl font-bold text-white">{stats.loaded}/{stats.total} <span className="text-sm text-zinc-500">BAGS</span></div>
            </div>
            <button onClick={() => setSelectedFlightId('')} className="bg-red-900/50 text-red-500 p-2 rounded border border-red-900 hover:bg-red-900">
                <ArrowLeft />
            </button>
        </div>

        {/* TABS */}
        <div className="flex border-b border-zinc-700 bg-zinc-900">
            <button 
                onClick={() => setActiveTab('SCAN')}
                className={clsx("flex-1 p-3 font-bold flex items-center justify-center gap-2", activeTab === 'SCAN' ? "bg-green-900/20 text-green-400 border-b-2 border-green-500" : "text-zinc-500 hover:text-zinc-300")}
            >
                <Scan size={18} /> SCAN
            </button>
            <button 
                onClick={() => setActiveTab('MANIF')}
                className={clsx("flex-1 p-3 font-bold flex items-center justify-center gap-2", activeTab === 'MANIF' ? "bg-green-900/20 text-green-400 border-b-2 border-green-500" : "text-zinc-500 hover:text-zinc-300")}
            >
                <Clipboard size={18} /> MANIFEST
            </button>
            <button 
                onClick={() => setActiveTab('LOADSHEET')}
                className={clsx("flex-1 p-3 font-bold flex items-center justify-center gap-2", activeTab === 'LOADSHEET' ? "bg-green-900/20 text-green-400 border-b-2 border-green-500" : "text-zinc-500 hover:text-zinc-300")}
            >
                <Scale size={18} /> LOAD
            </button>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-hidden bg-black p-2">
            
            {/* SCAN VIEW */}
            {activeTab === 'SCAN' && (
                <div className="h-full flex flex-col gap-4">
                    <form onSubmit={handleScan} className="bg-zinc-900 p-4 rounded border border-zinc-700">
                        <label className="block text-xs text-zinc-400 mb-1">SCAN BAG TAG / PNR</label>
                        <input 
                            autoFocus
                            className="w-full bg-black border border-zinc-600 p-3 text-2xl font-bold text-white outline-none focus:border-green-500"
                            placeholder="SCAN..."
                            value={scanInput}
                            onChange={(e) => setScanInput(e.target.value)}
                        />
                        {lastAction && (
                            <div className="mt-2 text-center p-2 bg-zinc-800 text-yellow-500 font-bold border border-zinc-700">
                                {lastAction}
                            </div>
                        )}
                    </form>

                    <div className="flex-1 overflow-y-auto bg-zinc-900 rounded border border-zinc-700 p-2">
                         <div className="grid grid-cols-1 gap-2">
                            {allBags.filter(b => b.loaded).reverse().map(bag => (
                                <div key={bag.id} className="flex justify-between items-center p-3 bg-green-900/20 border border-green-900/50 rounded">
                                    <div>
                                        <div className="font-bold text-white">{bag.tag}</div>
                                        <div className="text-xs text-green-400">{bag.name}</div>
                                    </div>
                                    <CheckCircle className="text-green-500" />
                                </div>
                            ))}
                            {allBags.filter(b => b.loaded).length === 0 && (
                                <div className="text-center text-zinc-600 mt-10">NO BAGS LOADED</div>
                            )}
                         </div>
                    </div>
                </div>
            )}

            {/* MANIFEST VIEW */}
            {activeTab === 'MANIF' && (
                <div className="h-full overflow-y-auto">
                    <div className="grid grid-cols-1 gap-1">
                        {allBags.map(bag => (
                            <div 
                                key={bag.id} 
                                onClick={() => toggleLoad(bag)}
                                className={clsx(
                                    "flex justify-between items-center p-3 border cursor-pointer select-none",
                                    bag.loaded 
                                        ? "bg-green-900/20 border-green-900/50" 
                                        : "bg-zinc-900 border-zinc-700 opacity-70"
                                )}
                            >
                                <div className="flex items-center gap-4">
                                    <Box className={bag.loaded ? "text-green-500" : "text-zinc-600"} />
                                    <div>
                                        <div className={clsx("font-bold", bag.loaded ? "text-white" : "text-zinc-400")}>{bag.tag}</div>
                                        <div className="text-xs text-zinc-500">{bag.name}</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-bold text-zinc-300">{bag.weight}KG</div>
                                    <div className="text-[10px] text-zinc-500">{bag.loaded ? 'CPT 1' : 'NOT LOADED'}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* LOADSHEET VIEW */}
            {activeTab === 'LOADSHEET' && (
                <div className="h-full flex flex-col justify-center items-center p-4">
                    <div className="w-full max-w-md bg-white text-black font-mono p-6 shadow-xl text-xs leading-relaxed relative">
                        {/* Paper Tear Effect */}
                        <div className="absolute top-0 left-0 right-0 h-2 bg-zinc-200" style={{ clipPath: 'polygon(0% 0%, 5% 100%, 10% 0%, 15% 100%, 20% 0%, 25% 100%, 30% 0%, 35% 100%, 40% 0%, 45% 100%, 50% 0%, 55% 100%, 60% 0%, 65% 100%, 70% 0%, 75% 100%, 80% 0%, 85% 100%, 90% 0%, 95% 100%, 100% 0%)'}}></div>

                        <div className="text-center border-b-2 border-black pb-4 mb-4 mt-2">
                            <h2 className="text-xl font-bold">LOADSHEET</h2>
                            <div className="font-bold">EDITION 1</div>
                            <div>{new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div>
                                <div className="font-bold">FLIGHT:</div>
                                <div>{selectedFlight.flightNumber}</div>
                            </div>
                            <div className="text-right">
                                <div className="font-bold">DEST:</div>
                                <div>{selectedFlight.destination}</div>
                            </div>
                            <div>
                                <div className="font-bold">A/C REG:</div>
                                <div>{selectedFlight.registration || 'YL-CSL'}</div>
                            </div>
                            <div className="text-right">
                                <div className="font-bold">CREW:</div>
                                <div>2 / 4</div>
                            </div>
                        </div>

                        <table className="w-full mb-6">
                            <thead className="border-b border-black">
                                <tr>
                                    <th className="text-left">ITEM</th>
                                    <th className="text-right">WEIGHT</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>DOW (Dry Operating)</td>
                                    <td className="text-right">42,500</td>
                                </tr>
                                <tr>
                                    <td>PAX ({flightPaxWithBags.length + 100})</td>
                                    <td className="text-right">{(flightPaxWithBags.length + 100) * 84}</td>
                                </tr>
                                <tr>
                                    <td>BAGS ({stats.loaded})</td>
                                    <td className="text-right">{stats.weight}</td>
                                </tr>
                                <tr className="font-bold border-t border-black">
                                    <td>ZFW (Zero Fuel)</td>
                                    <td className="text-right">{42500 + ((flightPaxWithBags.length + 100) * 84) + stats.weight}</td>
                                </tr>
                                <tr>
                                    <td>BLOCK FUEL</td>
                                    <td className="text-right">12,400</td>
                                </tr>
                                <tr className="font-bold text-lg border-t-2 border-black">
                                    <td>TOW (Take Off)</td>
                                    <td className="text-right">{42500 + ((flightPaxWithBags.length + 100) * 84) + stats.weight + 12400}</td>
                                </tr>
                            </tbody>
                        </table>

                        <div className="border-2 border-black p-2 mb-4">
                            <div className="font-bold mb-1">CAPTAIN SIGNATURE:</div>
                            <div className="font-handwriting text-xl text-blue-900 h-10">J. Smith</div>
                        </div>

                        <div className="text-center text-[10px] uppercase">
                            LOADED BY: TSCA RAMP TEAM 1<br/>
                            ALL WEIGHTS IN KG
                        </div>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};

