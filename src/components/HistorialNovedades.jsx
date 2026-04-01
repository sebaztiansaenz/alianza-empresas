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
  if (estado === "Retirado") return { bg: "rgba(68,187,126,0.12)", color: "#44BB7E" };
  return { bg: "rgba(240,127,22,0.1)", color: "#F07F16" };
}

export default function HistorialNovedades() {
  const { userData } = useUser();
  const [novedades, setNovedades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

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
        setNovedades(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [userData]);

  const totalPages = Math.ceil(novedades.length / itemsPerPage);
  const paginados = novedades.slice((page - 1) * itemsPerPage, page * itemsPerPage);

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
        <h3 className="hn-card-title">Lista de usuarios</h3>

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
                  No hay novedades registradas
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Paginación estilo Material */}
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
            {novedades.length === 0 ? "0-0 de 0" : `${(page - 1) * itemsPerPage + 1}-${Math.min(page * itemsPerPage, novedades.length)} de ${novedades.length}`}
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