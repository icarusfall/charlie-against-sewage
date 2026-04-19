"use client";

import mapboxgl from "mapbox-gl";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { STATUS_COLOR } from "@/lib/types";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

type BeachProps = {
  id: string;
  name: string;
  country: string;
  status: keyof typeof STATUS_COLOR;
  year: number | null;
  sourceUrl: string | null;
};

type BeachCollection = GeoJSON.FeatureCollection<GeoJSON.Point, BeachProps>;

const EMPTY_FC: BeachCollection = { type: "FeatureCollection", features: [] };

function debounce<T extends (...args: never[]) => void>(fn: T, wait: number) {
  let t: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

export default function Map() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [bbox, setBbox] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/standard",
      center: [-2.5, 46],
      zoom: 4.4,
      pitch: 20,
      attributionControl: false,
    });

    map.addControl(
      new mapboxgl.AttributionControl({ compact: true }),
      "bottom-right",
    );

    map.on("style.load", () => {
      try {
        map.setConfigProperty("basemap", "lightPreset", "dusk");
        map.setConfigProperty("basemap", "showPointOfInterestLabels", false);
      } catch {
        // older style versions just ignore
      }
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-right");

    const updateBbox = () => {
      const b = map.getBounds();
      if (!b) return;
      setBbox(
        `${b.getWest().toFixed(4)},${b.getSouth().toFixed(4)},${b.getEast().toFixed(4)},${b.getNorth().toFixed(4)}`,
      );
    };

    const debounced = debounce(updateBbox, 250);
    map.on("moveend", debounced);
    map.once("load", updateBbox);

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  const { data } = useQuery<BeachCollection>({
    queryKey: ["beaches", bbox],
    queryFn: async () => {
      const res = await fetch(`/api/beaches?bbox=${bbox}`);
      if (!res.ok) throw new Error("fetch failed");
      return res.json();
    },
    enabled: !!bbox,
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const fc = data ?? EMPTY_FC;

    const apply = () => {
      const existing = map.getSource("beaches") as
        | mapboxgl.GeoJSONSource
        | undefined;
      if (existing) {
        existing.setData(fc);
        return;
      }
      map.addSource("beaches", { type: "geojson", data: fc });
      map.addLayer({
        id: "beaches-circles",
        type: "circle",
        source: "beaches",
        paint: {
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            4,
            2.5,
            10,
            6,
            14,
            10,
          ],
          "circle-color": [
            "match",
            ["get", "status"],
            "excellent",
            STATUS_COLOR.excellent,
            "good",
            STATUS_COLOR.good,
            "sufficient",
            STATUS_COLOR.sufficient,
            "poor",
            STATUS_COLOR.poor,
            STATUS_COLOR.unclassified,
          ],
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 1,
          "circle-opacity": 0.92,
        },
      });

      map.on("click", "beaches-circles", (e) => {
        const f = e.features?.[0];
        if (!f || f.geometry.type !== "Point") return;
        const [lng, lat] = f.geometry.coordinates;
        const p = f.properties as BeachProps;
        new mapboxgl.Popup({ offset: 12, closeButton: true })
          .setLngLat([lng, lat])
          .setHTML(
            `
            <div style="font: 13px/1.45 system-ui, -apple-system, sans-serif; min-width: 180px">
              <div style="font-weight:600">${escapeHtml(p.name ?? "Unnamed")}</div>
              <div style="color:#6b7280; font-size:11px; margin-top:2px">
                ${escapeHtml(p.country ?? "")}${p.year ? ` · ${p.year}` : ""}
              </div>
              <div style="display:flex; align-items:center; gap:6px; margin-top:8px">
                <span style="display:inline-block; width:10px; height:10px; border-radius:999px; background:${
                  STATUS_COLOR[p.status] ?? STATUS_COLOR.unclassified
                }"></span>
                <span style="text-transform:capitalize">${escapeHtml(p.status ?? "unclassified")}</span>
              </div>
              ${
                p.sourceUrl
                  ? `<div style="margin-top:8px"><a href="${escapeHtml(p.sourceUrl)}" target="_blank" rel="noreferrer" style="color:#2563eb">Official record →</a></div>`
                  : ""
              }
            </div>
          `,
          )
          .addTo(map);
      });

      map.on("mouseenter", "beaches-circles", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "beaches-circles", () => {
        map.getCanvas().style.cursor = "";
      });
    };

    if (map.isStyleLoaded()) apply();
    else map.once("style.load", apply);
  }, [data]);

  return <div ref={containerRef} className="absolute inset-0" />;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
