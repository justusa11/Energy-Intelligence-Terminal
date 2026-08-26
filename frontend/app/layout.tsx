import "../styles/globals.css";
import "maplibre-gl/dist/maplibre-gl.css";

export const metadata = {
  title: "ETrade AI",
  description: "AI Energy Intelligence Terminal",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
