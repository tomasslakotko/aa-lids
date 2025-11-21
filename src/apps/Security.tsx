export const SecurityApp = () => {
  return (
    <div className="h-full w-full bg-slate-800 text-slate-200 p-4">
      <div className="border-b border-slate-600 pb-2 mb-4 flex justify-between">
        <h2 className="text-xl font-bold text-red-400">Security Screening Oversight</h2>
        <span className="text-red-500 animate-pulse font-mono">LIVE FEED</span>
      </div>
      <div className="grid grid-cols-2 gap-4 h-3/4">
        <div className="bg-black border border-slate-600 flex items-center justify-center relative group">
          <span className="text-slate-600">X-RAY SCANNER 1</span>
          <div className="absolute bottom-2 left-2 text-xs text-green-400">Active</div>
        </div>
        <div className="bg-black border border-slate-600 flex items-center justify-center relative">
          <span className="text-slate-600">X-RAY SCANNER 2</span>
          <div className="absolute bottom-2 left-2 text-xs text-green-400">Active</div>
        </div>
        <div className="bg-black border border-slate-600 flex items-center justify-center relative">
          <span className="text-slate-600">METAL DETECTOR 1</span>
          <div className="absolute bottom-2 left-2 text-xs text-green-400">Active</div>
        </div>
        <div className="bg-black border border-slate-600 flex items-center justify-center relative">
          <span className="text-slate-600">BODY SCANNER</span>
          <div className="absolute bottom-2 left-2 text-xs text-yellow-400">Calibrating</div>
        </div>
      </div>
    </div>
  );
};

