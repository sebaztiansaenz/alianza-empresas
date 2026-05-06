import { useState, useEffect, useCallback } from "react";
import { collection, query, where, getDocs, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useUser } from "../UserContext";
import DiligenciarModal from "./DiligenciarModal";

const SearchIcon = () => (
  <svg
    style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", width: 15, height: 15, opacity: 0.4, pointerEvents: "none" }}
    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
  >
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" />
  </svg>
);

const tabStyle = (active) => ({
  padding: "8px 20px",
  borderRadius: 10,
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  border: "none",
  fontFamily: "inherit",
  transition: "0.2s",
  background: active ? "#1e3a8a" : "white",
  color: active ? "white" : "#64748b",
  boxShadow: active ? "none" : "inset 0 0 0 1px #e2e8f0",
});

function calcularAntiguedad(timestamp) {
  if (!timestamp) return "-";
  const fecha = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const ahora = new Date();
  let años = ahora.getFullYear() - fecha.getFullYear();
  let meses = ahora.getMonth() - fecha.getMonth();
  if (meses < 0) { años--; meses += 12; }
  if (años === 0) return `${meses} ${meses === 1 ? "mes" : "meses"}`;
  if (meses === 0) return `${años} ${años === 1 ? "año" : "años"}`;
  return `${años} ${años === 1 ? "año" : "años"}, ${meses} ${meses === 1 ? "mes" : "meses"}`;
}

function formatFecha(timestamp) {
  if (!timestamp) return "-";
  const fecha = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return fecha.toLocaleDateString("es-CO");
}

// 👈 nueva función tiempo transcurrido
function tiempoTranscurrido(timestamp) {
  if (!timestamp) return "-";
  const fecha = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const ahora = new Date();
  const diffMs = ahora - fecha;
  if (diffMs < 0) return "-";

  const minutos = Math.floor(diffMs / (1000 * 60));
  const horas   = Math.floor(diffMs / (1000 * 60 * 60));
  const dias    = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const meses   = Math.floor(dias / 30);

  if (meses > 0)  return `${meses}mes ${dias % 30}d`;
  if (dias > 0)   return `${dias}d ${horas % 24}h`;
  if (horas > 0)  return `${horas}h ${minutos % 60}m`;
  return `${minutos}m`;
}

const GRID = "0.5fr 1.5fr 1fr 1fr 1.2fr 1fr 1fr 1fr 0.8fr 0.8fr 1fr";

export default function SolicitudCredito() {
  const { userData } = useUser();
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [modalSolicitud, setModalSolicitud] = useState(null);
  const [activeTab, setActiveTab] = useState("Pendiente");

  const fetchSolicitudes = useCallback(async () => {
    if (!userData?.empresaRef) return;
    setLoading(true);
    try {
      const empresaDocId = userData.empresaRef.id;
      const q = query(
        collection(db, "creditoSolicitadoEmpresa"),
        where("empresaDocId", "==", empresaDocId)
      );
      const snap = await getDocs(q);
      const resultados = [];

      await Promise.all(
        snap.docs.map(async (docSnap) => {
          const data = docSnap.data();
          let nombre = "-";
          let documento = "-";
          if (data.nombre) {
            try {
              const userSnap = await getDoc(data.nombre);
              if (userSnap.exists()) {
                const u = userSnap.data();
                nombre = u.display_name || "-";
                documento = u.nit ? u.nit : "-";
              }
            } catch { /* sin datos */ }
          }

          const estadoMapeado = data.estado === "inicio de solicitud"
            ? "Pendiente"
            : "En Análisis";

          resultados.push({
            id: docSnap.id,
            idNumerico: data.id || "-",
            nombre,
            documento,
            tipoCredito: data.tipodecredito || "-",
            fechaSolicitud: formatFecha(data.fechaSolicitud),
            fechaSolicitudRaw: data.fechaSolicitud, // 👈 para calcular tiempo
            empresa: data.empresa || "-",
            antiguedadEmpresa: data.antiguedadEmpresa || "-",
            antiguedadUsuario: calcularAntiguedad(data.createdTimeUsuario),
            estado: estadoMapeado,
            creditoDocId: docSnap.id,
            usuarioRef: data.nombre,
          });
        })
      );

      setSolicitudes(resultados);
    } catch (err) {
      console.error("Error cargando solicitudes:", err);
    } finally {
      setLoading(false);
    }
  }, [userData]);

  useEffect(() => {
    fetchSolicitudes();
  }, [fetchSolicitudes]);

  const handleModalSuccess = () => {
    setModalSolicitud(null);
    fetchSolicitudes();
  };

  const filtradas = solicitudes.filter(s => {
    const matchTab = s.estado === activeTab;
    const matchBusqueda =
      s.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      s.documento.toLowerCase().includes(busqueda.toLowerCase());
    return matchTab && matchBusqueda;
  });

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1, flexDirection: "column", gap: 12, color: "#64748b", height: "100%" }}>
      <div style={{ width: 36, height: 36, border: "3px solid #e2e8f0", borderTop: "3px solid #006AD8", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <p style={{ margin: 0, fontSize: 14 }}>Cargando solicitudes...</p>
    </div>
  );

  return (
    <div style={{ padding: "32px 36px", flex: 1, overflowY: "auto" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1e293b", marginBottom: 4 }}>
            Solicitud de crédito
          </h1>
          <p style={{ fontSize: 14, color: "#64748b", margin: 0 }}>
            Gestión y perfilamiento.
          </p>
        </div>
        <div style={{ position: "relative" }}>
          <SearchIcon />
          <input
            type="text"
            placeholder="Buscar por nombre o documento..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            style={{
              padding: "9px 14px 9px 34px",
              border: "1px solid #e2e8f0",
              borderRadius: 10,
              fontSize: 13,
              width: 280,
              outline: "none",
              fontFamily: "inherit",
              color: "#1e293b",
              background: "#fff",
            }}
          />
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 8, background: "#f8fafc", padding: 6, borderRadius: 14, border: "1px solid #e2e8f0" }}>
          {["Pendiente", "En Análisis"].map(tab => (
            <button
              key={tab}
              type="button"
              style={tabStyle(activeTab === tab)}
              onClick={() => { setActiveTab(tab); setBusqueda(""); }}
            >
              {tab} ({solicitudes.filter(s => s.estado === tab).length})
            </button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", overflow: "hidden" }}>

        {/* Header tabla */}
        <div style={{ display: "grid", gridTemplateColumns: GRID, background: "#fff", borderBottom: "1px solid #e2e8f0" }}>
          {["ID", "Nombres y Apellidos", "Número de documento", "Fecha de solicitud", "Tipo de crédito", "Empresa", "Antigüedad empresa", "Antigüedad usuario", "Tiempo en espera", "Estado", "Acción"].map(col => (
            <div key={col} style={{ padding: "14px 16px", fontSize: 13, fontWeight: 500, color: "#64748b" }}>
              {col}
            </div>
          ))}
        </div>

        {/* Filas */}
        {filtradas.length === 0 ? (
          <div style={{ padding: "40px 24px", textAlign: "center", color: "#94a3b8", fontSize: 14 }}>
            {busqueda ? "No se encontraron resultados." : `No hay solicitudes en estado "${activeTab}".`}
          </div>
        ) : (
          filtradas.map((s, i) => (
            <div
              key={s.id}
              style={{
                display: "grid",
                gridTemplateColumns: GRID,
                borderBottom: i < filtradas.length - 1 ? "1px solid #e2e8f0" : "none",
                alignItems: "center",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <div style={{ padding: "14px 16px", fontSize: 13, fontWeight: 500, color: "#1e293b" }}>#{s.idNumerico}</div>
              <div style={{ padding: "14px 16px", fontSize: 13, color: "#1e293b" }}>{s.nombre}</div>
              <div style={{ padding: "14px 16px", fontSize: 13, color: "#64748b" }}>{s.documento}</div>
              <div style={{ padding: "14px 16px", fontSize: 13, color: "#1e293b" }}>{s.fechaSolicitud}</div>
              <div style={{ padding: "14px 16px", fontSize: 13, color: "#1e293b" }}>{s.tipoCredito}</div>
              <div style={{ padding: "14px 16px", fontSize: 13, color: "#1e293b" }}>{s.empresa}</div>
              <div style={{ padding: "14px 16px", fontSize: 13, color: "#64748b" }}>{s.antiguedadEmpresa}</div>
              <div style={{ padding: "14px 16px", fontSize: 13, color: "#64748b" }}>{s.antiguedadUsuario}</div>

              {/* 👈 Tiempo en espera */}
              <div style={{ padding: "14px 16px" }}>
                <span style={{
                  background: "rgba(233,179,2,0.15)",
                  color: "#b45309",
                  padding: "4px 10px",
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                }}>
                  {tiempoTranscurrido(s.fechaSolicitudRaw)}
                </span>
              </div>

              {/* Estado */}
              <div style={{ padding: "14px 16px" }}>
                <span style={{
                  background: s.estado === "Pendiente" ? "#fef3c7" : "#e0e7ff",
                  color: s.estado === "Pendiente" ? "#b45309" : "#3730a3",
                  padding: "5px 10px",
                  borderRadius: 20,
                  fontSize: 11,
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                }}>
                  {s.estado}
                </span>
              </div>

              {/* Acción */}
              <div style={{ padding: "14px 16px" }}>
                {activeTab === "Pendiente" ? (
                  <button
                    onClick={() => setModalSolicitud(s)}
                    style={{
                      background: "#f97316", color: "white",
                      padding: "7px 14px", border: "none",
                      borderRadius: 8, fontSize: 12, fontWeight: 600,
                      cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "#ea580c"}
                    onMouseLeave={e => e.currentTarget.style.background = "#f97316"}
                  >
                    Diligenciar información
                  </button>
                ) : (
                  <span style={{ fontSize: 13, color: "#94a3b8" }}>—</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {modalSolicitud && (
        <DiligenciarModal
          solicitud={modalSolicitud}
          onClose={() => setModalSolicitud(null)}
          onSuccess={handleModalSuccess}
        />
      )}

    </div>
  );
}