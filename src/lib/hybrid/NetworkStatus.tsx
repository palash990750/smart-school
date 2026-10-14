"use client";

import { useNetworkStatus } from "./useNetworkStatus";

export default function NetworkStatus() {
  const online = useNetworkStatus();

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        right: 12,
        bottom: 12,
        zIndex: 99999,
        padding: "7px 12px",
        borderRadius: 20,
        color: "#fff",
        background: online ? "#18794e" : "#b42318",
        fontSize: 12,
        boxShadow: "0 2px 8px #0002",
      }}
    >
      {online ? "Online" : "Offline"}
    </div>
  );
}
