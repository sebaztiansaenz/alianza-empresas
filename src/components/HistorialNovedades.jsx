import { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { useUser } from "../UserContext";
import "./HistorialNovedades.css";

function formatMoney(val) {
  if (!val) return "$ 0";
  return `$ ${Number(val).toLocaleString("es-CO", { minimumFractionDigits: 0 })}`;
}

function formatFecha(timestamp) {
  if (!timestamp) return "- - -";
  const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`;
}

function getNovedadStyle(estado) {
  if (estado === "Excepción de pago") return { bg: "rgba(240,127,22,0.1)", color: "#F07F16" };
  if (estado === "Retirado") return { bg: "rgba(100,116,139,0.12)", color: "#475569" };
  if (estado === "Activo") return { bg: "rgba(68,187,164,0.12)", color: "#44BBA4" };
  return { bg: "rgba(100,116,139,0.12)", color: "#475569" };
}

export default function HistorialNovedades() {
  const { userData } = useUser();
  const [novedades, setNovedades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!userData?.empresaRef) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, "NovedadesAhorros"),
          where("empresaid", "==", userData.empresaRef)
        );
        const snap = await getDocs(q);
        const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }));

        lista.sort((a, b) => {
          const fechaA = a.fecha?.toDate?.() || new Date(a.fecha || 0);
          const fechaB = b.fecha?.toDate?.() || new Date(b.fecha || 0);
          return fechaB - fechaA;
        });

        setNovedades(lista);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [userData]);

  const filtradas = novedades.filter(n => {
    if (!searchTerm.trim()) return true;
    return (n.nombreusuario || "").toLowerCase().includes(searchTerm.toLowerCase());
  });

  const totalPages = Math.ceil(filtradas.length / itemsPerPage);
  const paginados = filtradas.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  if (loading) return (
    <div className="hn-loading">
      <div className="loading-spinner" />
      <p>Cargando datos...</p>
    </div>
  );

  return (
    <div className="hn-wrapper">
      <h2 className="hn-title">Historial de novedades</h2>

      <div className="hn-card">

        {/* Header con título + input al lado */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
          <h3 className="hn-card-title" style={{ margin: 0 }}>Lista de usuarios</h3>
          <div style={{ position: "relative" }}>
            <svg
              style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, opacity: 0.4, pointerEvents: "none" }}
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Buscar por nombre..."
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setPage(1); }}
              style={{
                padding: "8px 12px 8px 30px",
                border: "1px solid rgba(38,38,50,0.08)",
                borderRadius: 8,
                fontSize: 13,
                fontFamily: "inherit",
                outline: "none",
                color: "#1e293b",
                width: 220,
                background: "#fff",
              }}
            />
          </div>
        </div>

        <table className="hn-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Cédula</th>
              <th>Tipo de producto</th>
              <th>Fecha causal</th>
              <th>Valor ahorrado</th>
              <th>Novedad</th>
            </tr>
          </thead>
          <tbody>
            {paginados.map((n) => {
              const estilo = getNovedadStyle(n.estado);
              return (
                <tr key={n.id}>
                  <td>#{n.idnovedad || "- -"}</td>
                  <td>{n.nombreusuario || "-"}</td>
                  <td>{n.numeroDocumento || "-"}</td>
                  <td>Ahorro nomina</td>
                  <td>{formatFecha(n.fecha)}</td>
                  <td>{formatMoney(n.valorAhorrado)}</td>
                  <td>
                    <span
                      className="hn-badge"
                      style={{ background: estilo.bg, color: estilo.color }}
                    >
                      {n.estado || "- -"}
                    </span>
                  </td>
                </tr>
              );
            })}
            {paginados.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "40px", color: "rgba(38,38,50,0.5)" }}>
                  {searchTerm ? "No se encontraron resultados." : "No hay novedades registradas"}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="hn-pagination-wrapper">
          <div className="hn-rows-per-page">
            <span>Filas por página:</span>
            <select
              className="hn-select-items"
              value={itemsPerPage}
              onChange={e => { setItemsPerPage(Number(e.target.value)); setPage(1); }}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
          <p className="hn-pagination-info">
            {filtradas.length === 0 ? "0-0 de 0" : `${(page - 1) * itemsPerPage + 1}-${Math.min(page * itemsPerPage, filtradas.length)} de ${filtradas.length}`}
          </p>
          <div className="hn-pagination">
            <button type="button" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>‹</button>
            <button type="button" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>›</button>
          </div>
        </div>

      </div>
    </div>
  );
}