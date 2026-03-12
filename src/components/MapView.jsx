import React, { useRef, useEffect } from "react";

function MapView({ checkins }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    if (!mapRef.current) return;
    // Load Leaflet CSS
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
      document.head.appendChild(link);
    }
    // Load Leaflet JS
    const initMap = () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      const L = window.L;
      if (!L || !mapRef.current) return;
      const validCheckins = checkins.filter(c => c.lat && c.lng);
      if (!validCheckins.length) return;

      const map = L.map(mapRef.current, { zoomControl:true });
      mapInstanceRef.current = map;
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:"© OpenStreetMap contributors"
      }).addTo(map);
      const bounds = [];
      validCheckins.forEach(c => {
        const marker = L.circleMarker([c.lat, c.lng], {
          radius:9, fillColor:"#38bdf8", color:"#0ea5e9", weight:2,
          opacity:1, fillOpacity:0.85
        }).addTo(map);
        marker.bindPopup(`<b>${c.usuario}</b><br/>${c.nome_cliente||c.codigo_cliente||""}<br/>${c.loja||""}<br/><small>${new Date(c.timestamp).toLocaleString("pt-BR")}</small>`);
        bounds.push([c.lat, c.lng]);
      });
      if (bounds.length === 1) {
        map.setView(bounds[0], 15);
      } else {
        map.fitBounds(bounds, { padding:[30,30] });
      }
    };
    if (window.L) {
      initMap();
    } else {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
      script.onload = initMap;
      document.head.appendChild(script);
    }
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [checkins]);

  if (!checkins.filter(c=>c.lat&&c.lng).length) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100%", flexDirection:"column", gap:8 }}>
      <span style={{ fontSize:36 }}>📍</span>
      <p style={{ color:"#8a9ab5", fontSize:13 }}>Nenhum check-in para exibir</p>
    </div>
  );
  return (
    <div style={{ width:"100%", height:"100%", borderRadius:12, overflow:"hidden", position:"relative" }}>
      <div ref={mapRef} style={{ width:"100%", height:"100%" }}></div>
      <div style={{ position:"absolute", top:8, right:8, background:"rgba(10,16,30,.9)", backdropFilter:"blur(8px)", borderRadius:8, padding:"5px 12px", fontSize:12, border:"1px solid rgba(255,255,255,.08)", zIndex:1000 }}>
        {checkins.filter(c=>c.lat&&c.lng).length} ponto{checkins.filter(c=>c.lat&&c.lng).length!==1?"s":""}
      </div>
    </div>
  );
}

export default MapView;
