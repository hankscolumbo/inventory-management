// components/ReleaseNotesModal.tsx
'use client';

import { useState, useEffect } from 'react';

// 🔽 Update this version string whenever you publish major updates!
const CURRENT_RELEASE_VERSION = 'v1.3.0';

interface ReleaseNotesModalProps {
  /** Optional custom trigger button to open modal manually */
  triggerText?: string;
}

export default function ReleaseNotesModal({ triggerText = "What's New" }: ReleaseNotesModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Auto-open modal if user hasn't seen this specific release version yet
  useEffect(() => {
    const lastSeenVersion = localStorage.getItem('app_release_version');
    if (lastSeenVersion !== CURRENT_RELEASE_VERSION) {
      setIsOpen(true);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem('app_release_version', CURRENT_RELEASE_VERSION);
    setIsOpen(false);
  };

  return (
    <>
      {/* Trigger Button (Place in Header, Navbar, or Footer) */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-2.5 py-1 bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 border border-purple-500/30 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
      >
        <span>✨</span>
        <span>{triggerText}</span>
      </button>

      {/* Modal Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          {/* Modal Card */}
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-2">
                <span className="text-xl">🚀</span>
                <div>
                  <h2 className="text-base font-bold text-white leading-none">Release Notes</h2>
                  <span className="text-[10px] font-mono font-bold text-purple-400">
                    {CURRENT_RELEASE_VERSION}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="text-slate-400 hover:text-white text-lg font-bold p-1 rounded-lg hover:bg-slate-800 transition"
              >
                ✕
              </button>
            </div>

            {/* Updates List Content */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs text-slate-300">
              {/* Feature Section 1 */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-extrabold rounded uppercase">
                    New Feature
                  </span>
                  <h3 className="font-bold text-slate-100">Game Deals Badge</h3>
                </div>
                <p className="text-slate-400 pl-1 leading-relaxed">
                  Quickly check live store prices directly from home page and unowned games on your profile grid marked as <span className="text-purple-300 font-semibold">WANT TO PLAY</span>.
                </p>
              </div>

              {/* Feature Section 2 */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[9px] font-extrabold rounded uppercase">
                    New Section
                  </span>
                  <h3 className="font-bold text-slate-100">Browsing</h3>
                </div>
                <p className="text-slate-400 pl-1 leading-relaxed">
                  Use the new tab to<span className="text-slate-200 font-semibold">Browse</span> games and apply filters to find more games to Log or List.
                </p>
              </div>

              {/* Feature Section 3 */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[9px] font-extrabold rounded uppercase">
                    Beta Feature
                  </span>
                  <h3 className="font-bold text-slate-100">Import and Export Logs</h3>
                </div>
                <p className="text-slate-400 pl-1 leading-relaxed">
                  From your user profile you can import and export csv files of logs. Still in beta but feel free to try it out!
                </p>
              </div>

            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex justify-end">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-lg transition cursor-pointer"
              >
                Got It!
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

