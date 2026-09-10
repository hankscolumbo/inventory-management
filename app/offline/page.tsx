export default function OfflinePage() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
      <div className="w-16 h-16 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center text-3xl shadow-xl">
        📡
      </div>
      <h1 className="text-xl font-bold text-white">You're Offline</h1>
      <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
        Check your internet connection. Saved logs will remain queued locally until connection is restored.
      </p>
    </div>
  );
}