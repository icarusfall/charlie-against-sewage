"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import Map from "@/components/Map";
import { STATUS_COLOR } from "@/lib/types";

const LEGEND: { key: keyof typeof STATUS_COLOR; label: string }[] = [
  { key: "excellent", label: "Excellent" },
  { key: "good", label: "Good" },
  { key: "sufficient", label: "Sufficient" },
  { key: "poor", label: "Poor" },
  { key: "unclassified", label: "Not classified" },
];

export default function Page() {
  const [client] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={client}>
      <main className="relative h-full w-full">
        <Map />
        <div className="pointer-events-none absolute top-4 left-4 z-10">
          <div className="pointer-events-auto rounded-xl bg-white/85 p-4 shadow-xl backdrop-blur-md">
            <h1 className="text-sm font-semibold tracking-tight">
              Sea Pollution Map
            </h1>
            <p className="text-xs text-gray-500">
              UK · France · Portugal · EEA data
            </p>
            <ul className="mt-3 space-y-1.5">
              {LEGEND.map(({ key, label }) => (
                <li key={key} className="flex items-center gap-2 text-xs">
                  <span
                    className="h-3 w-3 rounded-full shadow ring-1 ring-white/80"
                    style={{ background: STATUS_COLOR[key] }}
                  />
                  <span className="text-gray-700">{label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </main>
    </QueryClientProvider>
  );
}
