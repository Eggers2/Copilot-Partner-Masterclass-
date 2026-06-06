"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface Partner {
  companyName: string | null;
  street: string | null;
  zip: string | null;
  city: string | null;
  website: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface SearchResult extends Partner {
  distance: number;
}

function createGreenIcon() {
  return L.divIcon({
    className: "",
    html: `<svg width="28" height="40" viewBox="0 0 28 40" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 26 14 26s14-15.5 14-26C28 6.268 21.732 0 14 0z" fill="#1A1A2E"/>
      <circle cx="14" cy="14" r="6" fill="white"/>
    </svg>`,
    iconSize: [28, 40],
    iconAnchor: [14, 40],
    popupAnchor: [0, -40],
  });
}

function partnerPopup(p: Partner): string {
  const lines: string[] = [];
  if (p.companyName) lines.push(`<strong style="color:#1A1A2E;font-size:14px;">${p.companyName}</strong>`);
  if (p.street) lines.push(`<span style="color:#6B6B8A;">${p.street}</span>`);
  if (p.zip || p.city) lines.push(`<span style="color:#6B6B8A;">${[p.zip, p.city].filter(Boolean).join(" ")}</span>`);
  if (p.website) {
    const url = p.website.startsWith("http") ? p.website : `https://${p.website}`;
    lines.push(`<a href="${url}" target="_blank" rel="noopener noreferrer" style="color:#00C896;text-decoration:none;">${p.website}</a>`);
  }
  return lines.join("<br/>");
}

export default function MapClient() {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);
  const [queryInput, setQueryInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Initialize map
  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) return;

    // Hard DACH bounds: cuts off France/UK/Poland/etc. on left+right
    const dachBounds = L.latLngBounds(
      [46.2, 5.9],   // SW corner (south Switzerland, west border)
      [55.1, 17.2],  // NE corner (north Germany, east Austria)
    );

    const map = L.map(mapContainerRef.current, {
      center: [50.5, 10.3],
      zoom: 6,
      scrollWheelZoom: true,
      maxBounds: dachBounds,
      maxBoundsViscosity: 1.0,
      minZoom: 6,
      maxZoom: 18,
    });

    map.fitBounds(dachBounds);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(map);

    markersRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    const handleResize = () => {
      map.invalidateSize();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Fetch partners
  useEffect(() => {
    fetch("/api/partners", { cache: "no-store" })
      .then((r) => r.json())
      .then((data: Partner[]) => {
        if (Array.isArray(data)) {
          setPartners(data);
        }
      })
      .catch(console.error);
  }, []);

  // Render markers + auto-fit to partner bounds (only while no search is active)
  useEffect(() => {
    if (!markersRef.current || !mapRef.current) return;
    markersRef.current.clearLayers();
    const icon = createGreenIcon();

    const coords: [number, number][] = [];
    partners.forEach((p) => {
      if (p.latitude == null || p.longitude == null) return;
      coords.push([p.latitude, p.longitude]);
      L.marker([p.latitude, p.longitude], { icon })
        .bindPopup(partnerPopup(p))
        .addTo(markersRef.current!);
    });

    if (!searchResults && coords.length > 0) {
      mapRef.current.fitBounds(coords, { padding: [40, 40] });
    }
  }, [partners, searchResults]);

  const runSearch = useCallback(async (queryString: string) => {
    setLoading(true);
    setError("");
    setSearchResults(null);

    try {
      const res = await fetch(`/api/partners/search?${queryString}&limit=10`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Fehler bei der Suche");
        return;
      }
      setSearchResults(data.partners);
      if (mapRef.current && data.zipCoords) {
        const points: [number, number][] = [
          [data.zipCoords.latitude, data.zipCoords.longitude],
          ...(data.partners as SearchResult[])
            .filter((p) => p.latitude != null && p.longitude != null)
            .map((p) => [p.latitude as number, p.longitude as number] as [number, number]),
        ];
        if (points.length > 1) {
          mapRef.current.fitBounds(points, { padding: [60, 60], maxZoom: 11 });
        } else {
          mapRef.current.setView(points[0], 9);
        }
      }
    } catch {
      setError("Fehler bei der Suche. Bitte versuchen Sie es erneut.");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = useCallback(() => {
    const query = queryInput.trim();
    if (!query) return;
    runSearch(`q=${encodeURIComponent(query)}`);
  }, [queryInput, runSearch]);

  const handleGeolocate = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Standortermittlung wird von Ihrem Browser nicht unterstützt.");
      return;
    }
    setLoading(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => runSearch(`lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`),
      () => {
        setError("Standort konnte nicht ermittelt werden. Bitte erlauben Sie den Zugriff oder suchen Sie per PLZ/Ort.");
        setLoading(false);
      },
      { timeout: 10000 }
    );
  }, [runSearch]);

  return (
    <div style={{ minHeight: "100vh", background: "#FFFFFF" }}>
      {/* Header */}
      <section style={{ background: "#1A1A2E", padding: "60px 24px 48px", textAlign: "center" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <h1
            style={{
              fontFamily: "'Bricolage Grotesque', system-ui, sans-serif",
              fontWeight: 700,
              fontSize: "clamp(28px, 4vw, 44px)",
              color: "#FFFFFF",
              marginBottom: 16,
              lineHeight: 1.15,
              letterSpacing: "-0.025em",
            }}
          >
            Copilot-Berater in Ihrer Nähe
          </h1>
          <p style={{ color: "#A8E5D2", fontSize: "1.1rem", lineHeight: 1.7 }}>
            Finden Sie zertifizierte Microsoft Copilot Partner in Deutschland, Österreich und der Schweiz
          </p>
        </div>
      </section>

      {/* Search Bar */}
      <section style={{ background: "#FFFFFF", padding: "32px 24px 0", maxWidth: 600, margin: "0 auto" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          <input
            type="text"
            placeholder="PLZ oder Ort eingeben..."
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            style={{
              flex: "1 1 200px",
              padding: "14px 20px",
              borderRadius: 10,
              border: "2px solid #E8E8F0",
              fontSize: "1rem",
              fontFamily: "'Figtree', system-ui, sans-serif",
              color: "#1A1A2E",
              outline: "none",
              transition: "border-color .2s",
            }}
            onFocus={(e) => (e.target.style.borderColor = "#00C896")}
            onBlur={(e) => (e.target.style.borderColor = "#E8E8F0")}
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            style={{
              flex: "0 0 auto",
              background: "#00C896",
              color: "#1A1A2E",
              fontWeight: 600,
              padding: "14px 28px",
              borderRadius: 10,
              border: "none",
              cursor: loading ? "not-allowed" : "pointer",
              fontSize: "1rem",
              fontFamily: "'Figtree', system-ui, sans-serif",
              display: "flex",
              alignItems: "center",
              gap: 8,
              transition: "all .2s",
              opacity: loading ? 0.6 : 1,
            }}
          >
            🔍 Suchen
          </button>
        </div>
        <button
          onClick={handleGeolocate}
          disabled={loading}
          style={{
            marginTop: 12,
            background: "#23233D",
            color: "#A8E5D2",
            fontWeight: 600,
            padding: "12px 20px",
            borderRadius: 10,
            border: "1px solid #2E2E4D",
            cursor: loading ? "not-allowed" : "pointer",
            fontSize: "0.95rem",
            fontFamily: "'Figtree', system-ui, sans-serif",
            display: "flex",
            alignItems: "center",
            gap: 8,
            transition: "all .2s",
            opacity: loading ? 0.6 : 1,
          }}
        >
          📍 Berater in meiner Nähe finden
        </button>
        {error && (
          <p style={{ color: "#e74c3c", marginTop: 12, fontSize: "0.9rem" }}>{error}</p>
        )}
      </section>

      {/* Loading state while a search is running */}
      {loading && !searchResults && (
        <section style={{ padding: "24px 24px 0", maxWidth: 1160, margin: "0 auto", textAlign: "center" }}>
          <p style={{ color: "#6B6B8A", fontSize: "0.95rem" }}>Suche läuft …</p>
        </section>
      )}

      {/* Search Results (above the map after a successful search) */}
      {searchResults && searchResults.length > 0 && (
        <section style={{ padding: "24px 24px 0", maxWidth: 1160, margin: "0 auto" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 20,
            }}
          >
            {searchResults.map((p, i) => (
              <div
                key={i}
                style={{
                  background: "#EAF9F4",
                  border: "1px solid #E8E8F0",
                  borderRadius: 12,
                  padding: 24,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                  <h3 style={{ color: "#1A1A2E", fontWeight: 700, fontSize: "1.1rem", margin: 0 }}>
                    {p.companyName || "Unbekannt"}
                  </h3>
                  <span
                    style={{
                      flex: "0 0 auto",
                      background: "#00C896",
                      color: "#1A1A2E",
                      fontWeight: 600,
                      fontSize: "0.8rem",
                      padding: "4px 12px",
                      borderRadius: 20,
                      whiteSpace: "nowrap",
                    }}
                  >
                    ~{p.distance} km
                  </span>
                </div>
                <p style={{ color: "#6B6B8A", margin: 0, fontSize: "0.95rem", lineHeight: 1.5 }}>
                  {p.street && <>{p.street}<br /></>}
                  {[p.zip, p.city].filter(Boolean).join(" ")}
                </p>
                {p.website && (
                  <a
                    href={p.website.startsWith("http") ? p.website : `https://${p.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      marginTop: "auto",
                      alignSelf: "flex-start",
                      background: "#00C896",
                      color: "#1A1A2E",
                      textDecoration: "none",
                      fontWeight: 600,
                      fontSize: "0.95rem",
                      padding: "10px 18px",
                      borderRadius: 8,
                    }}
                  >
                    Beratung anfragen →
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {searchResults && searchResults.length === 0 && (
        <section style={{ padding: "24px 24px 0", maxWidth: 1160, margin: "0 auto", textAlign: "center" }}>
          <p style={{ color: "#1A1A2E", fontWeight: 600, margin: "0 0 6px" }}>
            Keine Berater in der Nähe gefunden.
          </p>
          <p style={{ color: "#6B6B8A", margin: 0, fontSize: "0.95rem" }}>
            Versuchen Sie eine andere PLZ oder einen größeren Ort in Ihrer Region.
          </p>
        </section>
      )}

      {/* Map */}
      <section style={{ padding: "32px 24px 60px", maxWidth: 1300, margin: "0 auto" }}>
        <div
          ref={mapContainerRef}
          style={{
            width: "100%",
            height: "clamp(560px, 82vh, 980px)",
            maxWidth: 1240,
            margin: "0 auto",
            borderRadius: 12,
            overflow: "hidden",
            border: "1px solid #E8E8F0",
          }}
        />
      </section>

      {/* Footer */}
      <footer style={{ background: "#1A1A2E", padding: "40px 24px", textAlign: "center" }}>
        <nav
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: 24,
            marginBottom: 16,
          }}
        >
          {[
            { href: "/impressum", label: "Impressum" },
            { href: "/datenschutz", label: "Datenschutz" },
            { href: "/agb", label: "AGB" },
          ].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              style={{
                color: "#A8E5D2",
                textDecoration: "none",
                fontSize: "0.95rem",
                fontFamily: "'Figtree', system-ui, sans-serif",
              }}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <p style={{ color: "#6B6B8A", fontSize: "0.85rem", margin: 0, fontFamily: "'Figtree', system-ui, sans-serif" }}>
          © {new Date().getFullYear()} NextSkills GmbH · copilotberater.de
        </p>
      </footer>
    </div>
  );
}
