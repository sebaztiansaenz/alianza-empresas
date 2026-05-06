import { useEffect, useState } from "react";
import { collection, query, where, getDocs, doc, getDoc, writeBatch } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import * as XLSX from "xlsx";
import { db, functions } from "../firebase";
import { useUser } from "../UserContext";
import ExcepcionModal from "./ExcepcionModal";
import "./AhorroNomina.css";

const AVAL_LOGO = "https://storage.googleapis.com/flutterflow-io-6f20.appspot.com/projects/alianza-b7y88v/assets/4ncx38x6kqck/af61dcff031d70a712a7531dd696a6d4b09d8eed.png";
const ITEMS_PER_PAGE = 10;
const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const DIAS = ["L","M","X","J","V","S","D"];

function mismomes(timestamp) {
  if (!timestamp) return false;
  const fecha = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const hoy = new Date();
  return fecha.getMonth() === hoy.getMonth() && fecha.getFullYear() === hoy.getFullYear();
}

function formatMoney(val) {
  if (!val) return "$ 0";
  return `$ ${Number(val).toLocaleString("es-CO", { minimumFractionDigits: 0 })}`;
}

async function getIpAddress() {
  try {
    const res = await fetch("https://api.ipify.org?format=json");
    const data = await res.json();
    return data.ip;
  } catch { return "0.0.0.0"; }
}

function randomString(min, max) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const len = Math.floor(Math.random() * (max - min + 1)) + min;
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function CalendarModal({ onSelect, onCancel, selected }) {
  const today = new Date();
  const [viewDate, setViewDate] = useState(selected || today);
  const [tempSelected, setTempSelected] = useState(selected || null);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const offset = firstDay === 0 ? 6 : firstDay - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const isSelected = (d) => tempSelected && d &&
    tempSelected.getDate() === d &&
    tempSelected.getMonth() === month &&
    tempSelected.getFullYear() === year;

  const isToday = (d) => d &&
    today.getDate() === d &&
    today.getMonth() === month &&
    today.getFullYear() === year;

  const getDayLabel = () => {
    const ref = tempSelected || today;
    const days = ["dom","lun","mar","mié","jue","vie","sáb"];
    return { day: days[ref.getDay()], d: ref.getDate(), m: MESES[ref.getMonth()].slice(0,3).toLowerCase() };
  };
  const h = getDayLabel();

  return (
    <div className="cal-overlay" onClick={onCancel}>
      <div className="cal-modal" onClick={e => e.stopPropagation()}>
        <div className="cal-header">
          <p className="cal-header-label">SELECCIONAR FECHA</p>
          <p className="cal-header-day">{h.day}, {h.d}</p>
          <p className="cal-header-month">{h.m}</p>
        </div>
        <div className="cal-body">
          <div className="cal-nav">
            <span className="cal-month-year">{MESES[month]} de {year} ▾</span>
            <div className="cal-arrows">
              <button type="button" onClick={() => setViewDate(new Date(year, month - 1, 1))}>‹</button>
              <button type="button" onClick={() => setViewDate(new Date(year, month + 1, 1))}>›</button>
            </div>
          </div>
          <div className="cal-days-header">{DIAS.map(d => <span key={d}>{d}</span>)}</div>
          <div className="cal-grid">
            {cells.map((d, i) => (
              <button key={i} type="button"
                className={`cal-day ${!d ? "empty" : ""} ${isSelected(d) ? "selected" : ""} ${isToday(d) && !isSelected(d) ? "today" : ""}`}
                onClick={() => d && setTempSelected(new Date(year, month, d))}
                disabled={!d}
              >{d || ""}</button>
            ))}
          </div>
          <div className="cal-actions">
            <button type="button" onClick={onCancel}>CANCELAR</button>
            <button type="button" onClick={() => tempSelected && onSelect(tempSelected)}>ACEPTAR</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProgressModal({ progress, onClose }) {
  return (
    <div className="progress-overlay">
      <div className="progress-modal">
        <p className="progress-title">Generando reporte...</p>
        <div className="progress-bar-bg">
          <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
        </div>
        <p className="progress-percent">{progress}%</p>
        {progress === 100 && (
          <button type="button" className="btn-progress-close" onClick={onClose}>
            ✓ Listo
          </button>
        )}
      </div>
    </div>
  );
}

// ✅ NUEVO: Modal de confirmación de pago (SOLO PARA TEST)
function ConfirmarPagoModal({ onConfirm, onCancel, loading, excepcionesCount }) {
  return (
    <div className="progress-overlay">
      <div className="progress-modal">
        <div style={{ background: '#FEF3C7', padding: '12px 16px', borderRadius: 12, marginBottom: 16, border: '1px solid #FDE68A' }}>
          <p style={{ fontSize: 13, color: '#92400E', margin: 0, textAlign: 'center', fontWeight: 600 }}>
            ⚠️ BOTÓN DE TEST - No usar en producción
          </p>
        </div>
        <p className="progress-title">Simular Pago Exitoso</p>
        <p style={{ fontSize: 14, color: '#64748b', textAlign: 'center', margin: '8px 0' }}>
          Esto limpiará las excepciones del mes actual sin realizar un pago real.
        </p>
        {excepcionesCount > 0 ? (
          <div style={{ 
            background: '#FFF7ED', 
            padding: '12px 16px', 
            borderRadius: 12, 
            marginTop: 12,
            border: '1px solid #FFEDD5'
          }}>
            <p style={{ fontSize: 13, color: '#9A3412', margin: 0, textAlign: 'center' }}>
              <strong>{excepcionesCount}</strong> usuario{excepcionesCount > 1 ? 's' : ''} con excepción 
              {excepcionesCount > 1 ? ' volverán' : ' volverá'} a estado Activo
            </p>
          </div>
        ) : (
          <div style={{ 
            background: '#F1F5F9', 
            padding: '12px 16px', 
            borderRadius: 12, 
            marginTop: 12,
            border: '1px solid #E2E8F0'
          }}>
            <p style={{ fontSize: 13, color: '#475569', margin: 0, textAlign: 'center' }}>
              No hay excepciones del mes actual para limpiar
            </p>
          </div>
        )}
        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
          <button
            type="button"
            className="btn-progress-close"
            style={{ background: '#94a3b8', flex: 1 }}
            onClick={onCancel}
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn-progress-close"
            style={{ flex: 1 }}
            onClick={onConfirm}
            disabled={loading || excepcionesCount === 0}
          >
            {loading ? 'Procesando...' : 'Simular Pago'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AhorroNomina() {
  const { userData } = useUser();
  const [ahorros, setAhorros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recurrencia, setRecurrencia] = useState("");
  const [recurrenciaGuardada, setRecurrenciaGuardada] = useState(false);
  const [fecha, setFecha] = useState(null);
  const [showCal, setShowCal] = useState(false);
  const [fechaError, setFechaError] = useState(false);
  const [page, setPage] = useState(1);
  const [depositando, setDepositando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [modalAhorro, setModalAhorro] = useState(null);
  const [descargando, setDescargando] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [stateFilter, setStateFilter] = useState("all");
  
  // ✅ NUEVO: Estados para simulación de pago (TEST)
  const [showConfirmarPago, setShowConfirmarPago] = useState(false);
  const [procesandoPago, setProcesandoPago] = useState(false);

  const fetchData = async () => {
    if (!userData?.empresaRef) return;
    setLoading(true);
    try {
      const userDoc = await getDoc(doc(db, "user", userData.uid));
      if (userDoc.exists()) {
        const rec = userDoc.data().recurrencia || "";
        setRecurrencia(rec);
        setRecurrenciaGuardada(rec !== "");
      }
      const q = query(
        collection(db, "ahorros"),
        where("company", "==", userData.empresaRef),
        where("AhorrosDocPdf1", "!=", "")
      );
      const snap = await getDocs(q);
      const ahorrosData = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      try {
        const userIds = Array.from(new Set(
          ahorrosData.map(a => (a.user && a.user.id) || a.uid || a.UserID).filter(Boolean)
        ));
        if (userIds.length > 0) {
          const userDocs = await Promise.all(userIds.map(id => getDoc(doc(db, "user", id))));
          const usersMap = {};
          userDocs.forEach(u => { if (u.exists()) usersMap[u.id] = u.data(); });
          ahorrosData.forEach(a => {
            const uid = (a.user && a.user.id) || a.uid || a.UserID;
            const userDoc = uid ? usersMap[uid] : null;
            const resolved = userDoc && (userDoc.display_name || userDoc.displayName || userDoc.UserName || userDoc.name);
            if (resolved) a.UserName = resolved;
          });
        }
      } catch (err) {
        console.warn("No se pudieron resolver nombres de usuario:", err);
      }

      setAhorros(ahorrosData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [userData]);

  const activos = ahorros.filter(a => !mismomes(a.excepcionPagoMes));
  const excepcionesActuales = ahorros.filter(a => mismomes(a.excepcionPagoMes));

  const montoTotal = activos.reduce((sum, a) => {
    const base = a.Total_Savings_PreApproval || 0;
    return sum + (recurrencia === "Quincenal" ? base / 2 : base);
  }, 0);

  const filteredAhorros = ahorros.filter(a => {
    const q = searchTerm?.trim().toLowerCase() || "";
    const matchesSearch = !q ||
      (a.UserName || "").toLowerCase().includes(q) ||
      (a.userNIT || "").toLowerCase().includes(q) ||
      (a.numeroDocumento || "").toLowerCase().includes(q);
    if (!matchesSearch) return false;
    if (stateFilter === "all") return true;
    const isException = mismomes(a.excepcionPagoMes);
    if (stateFilter === "activo") return !isException;
    if (stateFilter === "excepcion") return isException;
    return true;
  });

  const totalPages = Math.ceil(filteredAhorros.length / ITEMS_PER_PAGE);
  const paginados = filteredAhorros.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const formatFecha = (d) => {
    if (!d) return "00/00/0000";
    return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;
  };

  const handleDescargar = async () => {
    setDescargando(true);
    setProgreso(0);
    try {
      const total = ahorros.length;
      if (total === 0) { setDescargando(false); return; }
      const rows = [];
      for (let i = 0; i < total; i++) {
        const a = ahorros[i];
        rows.push({
          "ID": a.userNIT || "-",
          "NOMBRE": a.UserName || "-",
          "TIPO DE PRODUCTO": "Ahorro de Nómina",
          "MONTO TOTAL AHORRADO": a.Total_Savings_PreApproval || 0,
          "ESTADO": mismomes(a.excepcionPagoMes) ? "Excepción única vez" : "Activo",
        });
        const pct = Math.round(((i + 1) / total) * 80);
        setProgreso(pct);
        if (i % 10 === 0) await new Promise(r => setTimeout(r, 10));
      }
      setProgreso(85);
      await new Promise(r => setTimeout(r, 50));
      const ws = XLSX.utils.json_to_sheet(rows);
      ws["!cols"] = [
        { wch: 15 },
        { wch: 30 },
        { wch: 20 },
        { wch: 25 },
        { wch: 20 },
      ];
      setProgreso(92);
      await new Promise(r => setTimeout(r, 50));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Reporte");
      setProgreso(97);
      await new Promise(r => setTimeout(r, 50));
      const timestamp = Date.now();
      XLSX.writeFile(wb, `reporte_empresa_${userData?.empresaId}_${timestamp}.xlsx`);
      setProgreso(100);
    } catch (err) {
      console.error(err);
      setDescargando(false);
    }
  };

  const handleDepositar = async () => {
    if (!fecha) { setFechaError(true); return; }
    if (!recurrencia) { setMensaje("Selecciona tu recurrencia primero."); return; }
    setFechaError(false);
    setDepositando(true);
    setMensaje("");
    try {
      const ip = await getIpAddress();
      const paymentReference = randomString(8, 15);
      const userAccounts = activos.map(a => ({
        ahorrosID: a.id,
        amount: recurrencia === "Quincenal"
          ? (a.Total_Savings_PreApproval || 0) / 2
          : (a.Total_Savings_PreApproval || 0),
        userName: a.UserName || "",
      }));
      const createPayment = httpsCallable(functions, "createPaymentSessionEmpresa");
      const result = await createPayment({
        amount: montoTotal,
        currency: "COP",
        paymentReference,
        description: "Depósito asociado",
        returnURL: window.location.origin + "/dashboard/ahorro/nomina",
        userAgent: navigator.userAgent,
        ipAddress: ip,
        userAccounts,
        buyer: {
          document: userData?.nit || "",
          documentType: "NIT",
          name: userData?.display_name || "",
          email: userData?.email || "",
        },
        userId: userData?.uid,
        ahorrosId: null,
        bank: "- - -",
        setDate: fecha.toISOString(),
        empresaId: userData?.empresaId,
      });
      if (result.data && typeof result.data === "string" && result.data.startsWith("http")) {
        window.location.href = result.data;
      } else {
        setMensaje("Error al crear la sesión de pago.");
      }
    } catch (err) {
      console.error(err);
      setMensaje("Ocurrió un error. Intenta de nuevo.");
    } finally {
      setDepositando(false);
    }
  };

  // ✅ NUEVO: Función para simular pago exitoso y limpiar excepciones (SOLO TEST)
  const handleSimularPago = async () => {
    if (excepcionesActuales.length === 0) {
      setShowConfirmarPago(false);
      setMensaje("No hay excepciones del mes actual para limpiar.");
      setTimeout(() => setMensaje(""), 3000);
      return;
    }

    setProcesandoPago(true);
    try {
      const batch = writeBatch(db);
      
      // Limpiar excepcionPagoMes de todos los ahorros con excepción del mes actual
      excepcionesActuales.forEach(a => {
        const ahorroRef = doc(db, "ahorros", a.id);
        batch.update(ahorroRef, {
          excepcionPagoMes: null
        });
      });

      await batch.commit();
      
      setShowConfirmarPago(false);
      setMensaje(`✓ TEST: ${excepcionesActuales.length} usuario${excepcionesActuales.length > 1 ? 's volvieron' : ' volvió'} a estado Activo.`);
      
      // Recargar datos
      await fetchData();
      
      // Limpiar mensaje después de 5 segundos
      setTimeout(() => setMensaje(""), 5000);
    } catch (err) {
      console.error(err);
      setMensaje("Error al procesar. Intenta de nuevo.");
      setTimeout(() => setMensaje(""), 3000);
    } finally {
      setProcesandoPago(false);
    }
  };

  if (loading) return (
    <div className="nomina-loading">
      <div className="loading-spinner" />
      <p>Cargando datos...</p>
    </div>
  );

  return (
    <div className="nomina-wrapper">

      {showCal && (
        <CalendarModal
          selected={fecha}
          onSelect={(d) => { setFecha(d); setShowCal(false); setFechaError(false); }}
          onCancel={() => setShowCal(false)}
        />
      )}

      {modalAhorro && (
        <ExcepcionModal
          ahorro={modalAhorro}
          onClose={() => setModalAhorro(null)}
          onSuccess={() => { setModalAhorro(null); fetchData(); }}
        />
      )}

      {descargando && (
        <ProgressModal
          progress={progreso}
          onClose={() => { setDescargando(false); setProgreso(0); }}
        />
      )}

      {/* ✅ NUEVO: Modal de simulación de pago (TEST) */}
      {showConfirmarPago && (
        <ConfirmarPagoModal
          onConfirm={handleSimularPago}
          onCancel={() => setShowConfirmarPago(false)}
          loading={procesandoPago}
          excepcionesCount={excepcionesActuales.length}
        />
      )}

      <div className="nomina-header">
        <h2 className="nomina-title">Ahorro nomina</h2>
        <div className="nomina-recurrencia">
          {recurrenciaGuardada ? (
            <button type="button" className="btn-recurrencia-set">{recurrencia}</button>
          ) : (
            <select
              className="select-recurrencia"
              value={recurrencia}
              onChange={e => setRecurrencia(e.target.value)}
            >
              <option value="">Selecciona tu recurrencia</option>
              <option value="Mensual">Mensual</option>
              <option value="Quincenal">Quincenal</option>
            </select>
          )}
        </div>
      </div>

      <div className="nomina-cards">
        <div className="nomina-card">
          <p className="nomina-card-label">Total usuarios</p>
          <p className="nomina-card-value">{ahorros.length}</p>
        </div>
        <div className="nomina-card">
          <p className="nomina-card-label">Activos</p>
          <p className="nomina-card-value">{activos.length}</p>
        </div>
      </div>

      <div className="nomina-table-card">
        <div className="nomina-table-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h3 className="nomina-table-title" style={{ margin: 0 }}>Lista de usuarios</h3>
            <input
              placeholder="Buscar por nombre o documento..."
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setPage(1); }}
              style={{ height: 40, padding: '0 12px', borderRadius: 8, border: '1px solid rgba(38,38,50,0.08)' }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <select
              value={stateFilter}
              onChange={e => { setStateFilter(e.target.value); setPage(1); }}
              style={{ height: 40, padding: '0 10px', borderRadius: 8, border: '1px solid rgba(38,38,50,0.08)', background: '#fff' }}
            >
              <option value="all">Todos</option>
              <option value="activo">Activo</option>
              <option value="excepcion">Excepción de pago</option>
            </select>
            {/* ✅ BOTÓN DE TEST - Eliminar en producción */}
            {excepcionesActuales.length > 0 && (
              <button
                type="button"
                className="btn-descargar"
                style={{ background: '#F59E0B', borderRadius: 8 }}
                onClick={() => setShowConfirmarPago(true)}
                title="Solo para testing - eliminar en producción"
              >
                🧪 TEST: Simular Pago
              </button>
            )}
            <button
              type="button"
              className="btn-descargar"
              onClick={handleDescargar}
              disabled={descargando}
            >
              {descargando ? "Generando..." : "Descargar"}
            </button>
          </div>
        </div>

        <table className="nomina-table">
          <thead>
            <tr>
              <th>Empleados</th>
              <th>Documento</th>
              <th>Tipo de producto</th>
              <th>Valor Ahorrado</th>
              <th>Estado</th>
              <th>Valor Aportado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {paginados.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: "40px 24px", textAlign: "center", color: "#94a3b8", fontSize: 14 }}>
                  {stateFilter === "excepcion"
                    ? "No hay excepciones de pago este mes."
                    : "No se encontraron resultados."}
                </td>
              </tr>
            ) : (
              paginados.map((a) => {
                const esExcepcion = mismomes(a.excepcionPagoMes);
                const base = a.Total_Savings_PreApproval || 0;
                const aportado = recurrencia === "Quincenal" ? base / 2 : base;
                return (
                  <tr key={a.id}>
                    <td>{a.UserName || "-"}</td>
                    <td>{a.userNIT || a.numeroDocumento || "-"}</td>
                    <td>{a.SavingsType || "Ahorro nomina"}</td>
                    <td>{formatMoney(base)}</td>
                    <td>
                      <span className={`badge ${esExcepcion ? "badge-excepcion" : "badge-activo"}`}>
                        {esExcepcion ? "Excepción única vez" : "Activo"}
                      </span>
                    </td>
                    <td>{formatMoney(aportado)}</td>
                    <td>
                      <button
                        type="button"
                        className="btn-accion"
                        onClick={() => setModalAhorro(a)}
                      >
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
          <div className="nomina-pagination">
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

      <div className="nomina-aval-card">
        <div className="nomina-aval-left">
          <img src={AVAL_LOGO} alt="AvalPay" className="aval-logo" />
          <div className="aval-divider" />
          <p className="aval-label">Total a Depositar</p>
          <p className="aval-total">{formatMoney(montoTotal)}</p>
          <div className="aval-divider" />
        </div>
        <div className="nomina-aval-right">
          <p className="aval-subtitle">Este deposito corresponde a:</p>
          <button
            type="button"
            className={`aval-date-btn ${fechaError ? "error" : ""}`}
            onClick={() => setShowCal(true)}
          >
            <span>{formatFecha(fecha)}</span>
            <span>▾</span>
          </button>
          {fechaError && <p className="aval-error">Datos obligatorios</p>}
          {mensaje && <p className="aval-error" style={{ color: mensaje.startsWith('✓') ? '#10b981' : '#FF4F4F' }}>{mensaje}</p>}
          <button type="button" className="btn-depositar" onClick={handleDepositar} disabled={depositando}>
            {depositando ? "Procesando..." : "Depositar"}
          </button>
          <p className="aval-disclaimer">
            Deposita desde otros bancos o billeteras, el costo de transacción es de $0.00.
          </p>
        </div>
      </div>

    </div>
  );
}