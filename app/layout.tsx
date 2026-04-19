import type { Metadata } from "next";
import "./globals.css";
import "mapbox-gl/dist/mapbox-gl.css";

export const metadata: Metadata = {
  title: "Sea Pollution Map",
  description:
    "Bathing water quality across the UK, France, and Portugal — updated daily from the EEA Bathing Water Directive.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" style={{ height: "100%" }}>
      <body
        className="h-screen w-screen overflow-hidden"
        style={{ height: "100vh", width: "100vw", overflow: "hidden", margin: 0 }}
      >
        {children}
      </body>
    </html>
  );
}
