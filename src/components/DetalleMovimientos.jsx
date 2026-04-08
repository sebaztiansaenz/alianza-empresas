import { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { useUser } from "../UserContext";
import TransaccionModal from "./TransaccionModal";
import BarChart from "./BarChart";
import "./DetalleMovimientos.css";

const ITEMS_PER_PAGE = 10;
const MESES_LABELS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

function formatMoney(val) {
  if (!val && val !== 0) return "$ 0";
  const ceiled = Math.round(Number(val)).toString();
  let result = "";
  let count = 0;
  for (let i = ceiled.length - 1; i >= 0; i--) {
    result = ceiled[i] + result;
    count++;
    if (count % 3 === 0 && i !== 0) {
      result = "." + result;
    }
  }
  return `$ ${result}`;
}

function formatFecha(timestamp) {
  if (!timestamp) return "- - -";
  const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`;
}

function getEstadoLabel(status) {
  if (status === "APPROVED") return "Completado";
  if (status === "PENDING") return "Pendiente";
  if (status === "REJECTED") return "Rechazado";
  return "Pendiente";
}

function getEstadoStyle(status) {
  if (status === "APPROVED") return { bg: "rgba(68,187,164,0.12)", color: "#44BBA4" };
  if (status === "PENDING") return { bg: "rgba(249,207,88,0.22)", color: "#d4a017" };
  if (status === "REJECTED") return { bg: "rgba(255,89,99,0.25)", color: "#FF5963" };
  return { bg: "rgba(249,207,88,0.22)", color: "#d4a017" };
}

export default function DetalleMovimientos() {
  const { userData } = useUser();
  const [transactions, setTransactions] = useState([]);
  const [ahorros, setAhorros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("ahorrado");
  const [filtro, setFiltro] = useState("Completado");
  const [page, setPage] = useState(1);
  const [modalTx, setModalTx] = useState(null);
  const [chartData, setChartData] = useState(Array(12).fill(0));
  const [year, setYear] = useState(new Date().getFullYear());
  const [totalBarras, setTotalBarras] = useState(0);

  useEffect(() => {
    if (!userData?.empresaRef) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const txQ = query(
          collection(db, "transactions"),
          where("transactionType", "==", "Depositado"),
          where("empresaId", "==", userData.empresaRef.id),
          where("processUrl", "!=", "")
        );
        const txSnap = await getDocs(txQ);
        const txList = txSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setTransactions(txList);

        const ahQ = query(
          collection(db, "ahorros"),
          where("company", "==", userData.empresaRef),
          where("AhorrosDocPdf1", "!=", "")
        );
        const ahSnap = await getDocs(ahQ);
        const ahList = ahSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setAhorros(ahList);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [userData]);

  useEffect(() => {
    if (tab === "ahorrado") buildChartAhorrado(transactions, year);
    else buildChartBeneficios(year);
  }, [transactions, ahorros, tab, year]);

  const buildChartAhorrado = (txList, yearFilter) => {
    const meses = Array(12).fill(0);
    txList.forEach(tx => {
      if (tx.status === "APPROVED") {
        let fecha = null;
        if (tx.date?.toDate) fecha = tx.date.toDate();
        else if (tx.date instanceof Date) fecha = tx.date;
        else if (typeof tx.date === "string") fecha = new Date(tx.date);
        if (fecha && fecha.getFullYear() === yearFilter) meses[fecha.getMonth()] += tx.amount || 0;
      }
    });
    const suma = meses.reduce((s, v) => s + v, 0);
    setTotalBarras(suma);
    setChartData(meses);
  };

  const buildChartBeneficios = (yearFilter) => {
    const meses = Array(12).fill(0);
    ahorros.forEach(a => {
      (a.transactions || []).forEach(t => {
        if (t.taxedBenefit && t.date) {
          const d = t.date.toDate ? t.date.toDate() : new Date(t.date);
          if (d && d.getFullYear() === yearFilter) meses[d.getMonth()] += t.taxedBenefit || 0;
        }
      });
    });
    const suma = meses.reduce((s, v) => s + v, 0);
    setTotalBarras(suma);
    setChartData(meses);
  };

  const handleTabChange = (newTab) => {
    setTab(newTab);
    if (newTab === "ahorrado") buildChartAhorrado(transactions, year);
    else buildChartBeneficios(year);
  };

  const filtrados = transactions.filter(tx => {
    if (filtro === "Completado") if (tx.status !== "APPROVED") return false;
    if (filtro === "Rechazado") if (tx.status !== "REJECTED") return false;
    if (filtro === "Pendiente") if (tx.status !== "PENDING") return false;

    let txYearMatch = false;
    const candidates = [tx.firebaseDate, tx.empresaAdminSetDate];
    for (const c of candidates) {
      if (!c) continue;
      const d = c.toDate ? c.toDate() : new Date(c);
      if (d && d.getFullYear() === year) { txYearMatch = true; break; }
    }
    if (!txYearMatch) {
      if (Array.isArray(tx.userAccounts)) {
        for (const ua of tx.userAccounts) {
          if (ua.date) {
            const d = ua.date.toDate ? ua.date.toDate() : new Date(ua.date);
            if (d && d.getFullYear() === year) { txYearMatch = true; break; }
          }
        }
      }
    }
    if (!txYearMatch) return false;

    return true;
  });

  const filtradosOrdenados = [...filtrados].sort((a, b) => {
    const fechaA = a.firebaseDate?.toDate?.() || new Date(a.date || 0);
    const fechaB = b.firebaseDate?.toDate?.() || new Date(b.date || 0);
    return fechaB - fechaA;
  });

  const totalPages = Math.ceil(filtradosOrdenados.length / ITEMS_PER_PAGE);
  const paginados = filtradosOrdenados.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  if (loading) return (
    <div className="dm-loading">
      <div className="loading-spinner" />
      <p>Cargando datos...</p>
    </div>
  );

  return (
    <div className="dm-wrapper">

      {modalTx && (
        <TransaccionModal
          transaction={modalTx}
          onClose={() => setModalTx(null)}
        />
      )}

      <h2 className="dm-title">Detalle de movimientos</h2>

      <div className="dm-card">
        <div className="dm-card-top">
          <div>
            <p className="dm-card-section">Movimientos</p>
            <div className="dm-card-total">
              <span className="dm-total-value">
                {formatMoney(totalBarras)}
              </span>
              <span className="dm-trend">↑ +9%</span>
            </div>
          </div>
          <div className="dm-card-controls">
            <select className="dm-select-year" value={year} onChange={e => setYear(parseInt(e.target.value, 10))}>
              {Array.from({ length: 6 }).map((_, i) => {
                const y = new Date().getFullYear() - i;
                return <option key={y} value={y}>{y}</option>;
              })}
            </select>
            <div className="dm-tabs">
              <button
                type="button"
                className={`dm-tab ${tab === "ahorrado" ? "active" : ""}`}
                onClick={() => handleTabChange("ahorrado")}
              >
                Total ahorrado
              </button>
              <button
                type="button"
                className={`dm-tab ${tab === "beneficios" ? "active" : ""}`}
                onClick={() => handleTabChange("beneficios")}
              >
                Beneficios acumulados
              </button>
            </div>
          </div>
        </div>

        <BarChart data={chartData} labels={MESES_LABELS} />
      </div>

      <div className="dm-card">
        <div className="dm-table-header">
          <h3 className="dm-table-title">Movimientos</h3>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <select
              className="dm-select-filtro"
              value={filtro}
              onChange={e => { setFiltro(e.target.value); setPage(1); }}
            >
              <option value="Todos">Todos</option>
              <option value="Completado">Completado</option>
              <option value="Pendiente">Pendiente</option>
              <option value="Rechazado">Rechazado</option>
            </select>
          </div>
        </div>

        <table className="dm-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Fecha de pago correspondiente</th>
              <th>Valor total</th>
              <th>Usuarios</th>
              <th>Documento</th>
              <th>Fecha de pago efectuado</th>
              <th>Entidad bancaria</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {paginados.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ padding: "40px 24px", textAlign: "center", color: "#94a3b8", fontSize: 14 }}>
                  No se encontraron transacciones.
                </td>
              </tr>
            ) : (
              paginados.map((tx) => {
                const estilo = getEstadoStyle(tx.status);
                const documento = (() => {
                  if (Array.isArray(tx.userAccounts) && tx.userAccounts.length > 0) {
                    const u = tx.userAccounts[0];
                    if (u.userNIT) return u.userNIT;
                    if (u.numeroDocumento) return u.numeroDocumento;
                    if (u.ahorrosID) {
                      const matched = (ahorros || []).find(a => a.id === u.ahorrosID || a.id === String(u.ahorrosID));
                      if (matched) return matched.userNIT || "-";
                    }
                  }
                  return tx.userDocument || tx.document || "-";
                })();

                return (
                  <tr key={tx.id}>
                    <td>#{tx.authorization || "- - -"}</td>
                    <td>{formatFecha(tx.empresaAdminSetDate)}</td>
                    <td>{formatMoney(tx.amount)}</td>
                    <td>{(tx.userAccounts || []).length}</td>
                    <td>{documento}</td>
                    <td>{formatFecha(tx.firebaseDate)}</td>
                    <td>{tx.bank || "- - -"}</td>
                    <td>
                      <span className="dm-badge" style={{ background: estilo.bg, color: estilo.color }}>
                        {getEstadoLabel(tx.status)}
                      </span>
                    </td>
                    <td>
                      <button type="button" className="dm-btn-accion" onClick={() => setModalTx(tx)}>
                        ⚙️
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="dm-pagination">
            <button type="button" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>‹</button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
              <button type="button" key={p} className={page === p ? "active" : ""} onClick={() => setPage(p)}>{p}</button>
            ))}
            {totalPages > 5 && <span style={{ padding: "0 4px" }}>...</span>}
            {totalPages > 5 && (
              <button type="button" className={page === totalPages ? "active" : ""} onClick={() => setPage(totalPages)}>{totalPages}</button>
            )}
            <button type="button" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>›</button>
          </div>
        )}
      </div>

    </div>
  );
}