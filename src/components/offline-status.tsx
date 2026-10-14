
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getPendingAttendanceCount,
  syncOfflineQueue,
} from "@/lib/offline-store";

export default function OfflineStatus() {
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState("");
  const syncingRef = useRef(false);

  const refresh = useCallback(async () => {
    setOnline(navigator.onLine);

    try {
      setPending(await getPendingAttendanceCount());
    } catch {
      // Keep the interface usable if IndexedDB is unavailable.
    }
  }, []);

  const syncNow = useCallback(async () => {
    if (!navigator.onLine || syncingRef.current) return;

    syncingRef.current = true;
    setSyncing(true);

    try {
      const result = await syncOfflineQueue();

      setPending(result.remaining);

      if (result.remaining === 0) {
        setMessage(
          result.synced > 0
            ? `Synced ${result.synced} attendance item(s).`
            : "No pending attendance to sync."
        );
      } else {
        setMessage(
          `${result.synced} synced; ${result.remaining} still pending.`
        );
      }
    } catch {
      setMessage("Sync failed. Pending attendance has been kept.");
    } finally {
      syncingRef.current = false;
      setSyncing(false);
      await refresh();
    }
  }, [refresh]);

  useEffect(() => {
    let disposed = false;

    const updateStatus = () => {
      setOnline(navigator.onLine);
      void refresh();

      if (navigator.onLine) {
        void syncNow();
      }
    };

    void refresh().then(() => {
      if (!disposed && navigator.onLine) {
        void syncNow();
      }
    });

    window.addEventListener("online", updateStatus);
    window.addEventListener("offline", updateStatus);

    return () => {
      disposed = true;
      window.removeEventListener("online", updateStatus);
      window.removeEventListener("offline", updateStatus);
    };
  }, [refresh, syncNow]);

  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2 text-sm"
    >
      <span>
        <span aria-hidden="true">{online ? "●" : "●"}</span>{" "}
        {online ? "Online" : "Offline"} · {pending} pending attendance item(s)
      </span>

      {online && pending > 0 && (
        <button
          type="button"
          onClick={() => void syncNow()}
          disabled={syncing}
          className="rounded border px-3 py-1 disabled:opacity-50"
        >
          {syncing ? "Syncing…" : "Sync attendance"}
        </button>
      )}

      {message && <span>{message}</span>}
    </div>
  );
}
