'use client';

import { useState, useEffect } from 'react';
import { checkUserPriceAlerts, dismissPriceAlert } from '@/app/actions/managePriceAlerts';

interface TriggeredAlert {
  id: string;
  gameTitle: string;
  dealUrl: string;
  salePrice: number;
}

export default function PriceAlertBanner() {
  const [alerts, setAlerts] = useState<TriggeredAlert[]>([]);

  useEffect(() => {
    async function loadAlerts() {
      const res = await checkUserPriceAlerts();
      if (res.success && res.triggeredAlerts.length > 0) {
        setAlerts(res.triggeredAlerts);
      }
    }
    loadAlerts();
  }, []);

  const handleDismiss = async (alertId: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    await dismissPriceAlert(alertId);
  };

  if (alerts.length === 0) return null;

  return (
    <div className="bg-emerald-950/90 border border-emerald-500/50 p-4 rounded-2xl shadow-xl space-y-3 mb-6 backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-emerald-800/60 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-base">🎉</span>
          <h3 className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
            Price Drop Alerts Triggered!
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className="flex items-center justify-between bg-slate-950/80 border border-emerald-500/30 p-2.5 rounded-xl gap-2 hover:border-emerald-400 transition"
          >
            <a
              href={alert.dealUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-bold text-white hover:text-emerald-300 transition truncate flex-1"
            >
              {alert.gameTitle}
            </a>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-black text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/30 font-mono">
                ${alert.salePrice.toFixed(2)}
              </span>
              <button
                type="button"
                onClick={() => handleDismiss(alert.id)}
                className="text-slate-500 hover:text-slate-300 font-bold text-xs p-1"
                title="Dismiss Alert"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
