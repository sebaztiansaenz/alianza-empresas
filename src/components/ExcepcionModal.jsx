import { useState, useEffect } from "react";
import { doc, updateDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { useUser } from "../UserContext";
import "./ExcepcionModal.css";

const API_URL = "https://apinovedad-1021628575366.southamerica-east1.run.app";

const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const DIAS = ["L","M","X","J","V","S","D"];

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000);
}

function formatMoney(val) {
  if (!val) return "$ 0";
  return `$ ${Number(val).toLocaleString("es-CO")}`;
}

function CalendarMini({ onSelect, onCancel, selected }) {
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

function OTPStep({ email, otp, onConfirm, onCancel }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer(t => {
        if (t <= 1) { clearInterval(interval); setCanResend(true); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleConfirm = async () => {
    if (code.length < 6) { setError("Ingresa el código completo."); return; }
    if (code !== otp.toString()) {
      setError("Código incorrecto. Intenta de nuevo.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await onConfirm();
    } catch (err) {
      console.error(err);
      setError("Error al procesar. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="otp-step">
      <p className="otp-title">Hemos enviado un código OTP al correo:</p>
      <p className="otp-email">{email}</p>
      <div className="otp-inputs">
        {[0,1,2,3,4,5].map(i => (
          <input
            key={i}
            id={`otp-${i}`}
            type="text"
            maxLength={1}
            className="otp-box"
            value={code[i] || ""}
            onChange={e => {
              const val = e.target.value.replace(/\D/g, "");
              const arr = code.split("");
              arr[i] = val;
              const newCode = arr.join("").slice(0, 6);
              setCode(newCode);
              setError("");
              if (val && i < 5) {
                document.getElementById(`otp-${i+1}`)?.focus();
              }
            }}
            onKeyDown={e => {
              if (e.key === "Backspace" && !code[i] && i > 0) {
                document.getElementById(`otp-${i-1}`)?.focus();
              }
            }}
          />
        ))}
      </div>

      {error && <p className="otp-error">{error}</p>}

      <div className="otp-resend">
        <span>¿No te llegó ningún código? </span>
        <span
          className={`otp-resend-btn ${canResend ? "active" : ""}`}
          onClick={() => {
            if (canResend) {
              setCode("");
              setError("");
              setTimer(60);
              setCanResend(false);
              onCancel();
            }
          }}
        >
          Reenviar código {!canResend && `( ${timer}s )`}
        </span>
      </div>

      <button
        type="button"
        className="btn-otp-confirm"
        onClick={handleConfirm}
        disabled={loading || code.length < 6}
      >
        {loading ? "Procesando..." : "Continuar"}
      </button>
    </div>
  );
}

export default function ExcepcionModal({ ahorro, onClose, onSuccess }) {
  const { userData } = useUser();
  const [tab, setTab] = useState("excepcion");

  const [motivoExcepcion, setMotivoExcepcion] = useState("");
  const [fechaExcepcion, setFechaExcepcion] = useState(null);
  const [showCalExcepcion, setShowCalExcepcion] = useState(false);

  const [motivoEliminar, setMotivoEliminar] = useState("");
  const [otroMotivo, setOtroMotivo] = useState("");
  const [fechaEliminar, setFechaEliminar] = useState(null);
  const [showCalEliminar, setShowCalEliminar] = useState(false);

  const [showOTP, setShowOTP] = useState(false);
  const [otp, setOtp] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const formatFecha = (d) => {
    if (!d) return "00/00/0000";
    return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;
  };

  const sendOTP = async () => {
    const fecha = tab === "excepcion" ? fechaExcepcion : fechaEliminar;
    const motivo = tab === "excepcion"
      ? motivoExcepcion
      : (motivoEliminar === "Otros" ? otroMotivo : motivoEliminar);

    if (!motivo) { setError("Ingresa el motivo."); return; }
    if (!fecha) { setError("Selecciona la fecha causal."); return; }

    setError("");
    setLoading(true);

    const newOtp = generateOTP();
    setOtp(newOtp);

    try {
      await fetch(`${API_URL}/send-otp-excepcion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: userData?.email,
          otpCode: newOtp,
          companyName: ahorro?.CompayName || "Empresa",
          employeeName: ahorro?.UserName || "Usuario",
          docType: "Cédula de ciudadanía",
          docNumber: ahorro?.userNIT || "N/A",
        }),
      });
      setShowOTP(true);
    } catch (err) {
      setError("Error al enviar el código. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmExcepcion = async () => {
    await updateDoc(doc(db, "ahorros", ahorro.id), {
      excepcionPagoMes: new Date(),
    });
    await addDoc(collection(db, "NovedadesAhorros"), {
      usuarioRef: ahorro.user,
      nombreusuario: ahorro.UserName,
      numeroDocumento: ahorro.userNIT,
      motivo: motivoExcepcion,
      fecha: serverTimestamp(),
      estado: "Excepción de pago",
      valorAhorrado: ahorro.Total_Savings_PreApproval,
      ahorroRef: doc(db, "ahorros", ahorro.id),
      correousuario: ahorro.UserEmail,
      empresaid: userData?.empresaRef,
      idnovedad: Math.floor(100000 + Math.random() * 900000),
    });

    // ✅ Email confirmación excepción
    await fetch(`${API_URL}/send-excepcion`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: ahorro?.UserEmail,
        collaboratorName: ahorro?.UserName,
        companyName: ahorro?.CompayName || "Empresa",
        collaboratorFullName: ahorro?.UserName,
        documentType: "Cédula de ciudadanía",
        documentNumber: ahorro?.userNIT || "N/A",
      }),
    });

    onSuccess?.("excepcion");
    onClose();
  };

  const handleConfirmEliminar = async () => {
    const motivo = motivoEliminar === "Otros" ? otroMotivo : motivoEliminar;

    await addDoc(collection(db, "NovedadesAhorros"), {
      usuarioRef: ahorro.user,
      nombreusuario: ahorro.UserName,
      numeroDocumento: ahorro.userNIT,
      motivo,
      fecha: serverTimestamp(),
      estado: "Retirado",
      valorAhorrado: ahorro.Total_Savings_PreApproval,
      ahorroRef: doc(db, "ahorros", ahorro.id),
      correousuario: ahorro.UserEmail,
      empresaid: userData?.empresaRef,
      idnovedad: Math.floor(100000 + Math.random() * 900000),
    });
    await updateDoc(doc(db, "ahorros", ahorro.id), {
      company: null,
    });

    // ✅ Email confirmación desvinculación
    await fetch(`${API_URL}/send-desvinculacion`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: ahorro?.UserEmail,
        collaboratorName: ahorro?.UserName,
        companyName: ahorro?.CompayName || "Empresa",
        collaboratorFullName: ahorro?.UserName,
        documentType: "Cédula de ciudadanía",
        documentNumber: ahorro?.userNIT || "N/A",
      }),
    });

    onSuccess?.("eliminar");
    onClose();
  };

  const MOTIVOS_ELIMINAR = ["Renuncia", "Finalización de contrato", "Despido", "Deserción", "Otros"];

  return (
    <div className="excepcion-overlay" onClick={onClose}>
      <div className="excepcion-modal" onClick={e => e.stopPropagation()}>

        <div className="excepcion-header">
          <h3>Administración de usuario</h3>
          <button type="button" className="excepcion-close" onClick={onClose}>✕</button>
        </div>

        <div className="excepcion-tabs">
          <button
            type="button"
            className={`excepcion-tab ${tab === "excepcion" ? "active" : ""}`}
            onClick={() => { setTab("excepcion"); setShowOTP(false); setError(""); }}
          >
            Excepción de pago
          </button>
          <button
            type="button"
            className={`excepcion-tab ${tab === "eliminar" ? "active" : ""}`}
            onClick={() => { setTab("eliminar"); setShowOTP(false); setError(""); }}
          >
            Eliminar usuario
          </button>
        </div>

        {!showOTP ? (
          <div className="excepcion-body">
            {tab === "excepcion" && (
              <div className="excepcion-form">
                <div className="exc-field-box">
                  <div className="exc-field-row">
                    <span className="exc-field-label">Motivo</span>
                    {motivoExcepcion && <span className="exc-check">✓</span>}
                  </div>
                  <textarea
                    className="exc-textarea"
                    placeholder="Ingrese el motivo"
                    value={motivoExcepcion}
                    onChange={e => setMotivoExcepcion(e.target.value)}
                    rows={3}
                  />
                  <div className="exc-field-row" style={{ marginTop: 16 }}>
                    <span className="exc-field-label">Fecha causal</span>
                    {fechaExcepcion && <span className="exc-check">✓</span>}
                  </div>
                  <button
                    type="button"
                    className="exc-date-btn"
                    onClick={() => setShowCalExcepcion(true)}
                  >
                    <span>{formatFecha(fechaExcepcion)}</span>
                    <span>▾</span>
                  </button>
                </div>
              </div>
            )}

            {tab === "eliminar" && (
              <div className="excepcion-form">
                <div className="exc-field-box">
                  {MOTIVOS_ELIMINAR.map(m => (
                    <div key={m} className="exc-radio-row" onClick={() => setMotivoEliminar(m)}>
                      <span className="exc-radio-label">{m}</span>
                      <div className={`exc-radio ${motivoEliminar === m ? "selected" : ""}`}>
                        {motivoEliminar === m && <span>✓</span>}
                      </div>
                    </div>
                  ))}
                  {motivoEliminar === "Otros" && (
                    <input
                      type="text"
                      className="exc-input"
                      placeholder="¿Cuál fue el motivo?"
                      value={otroMotivo}
                      onChange={e => setOtroMotivo(e.target.value)}
                    />
                  )}
                  <div className="exc-field-row" style={{ marginTop: 16 }}>
                    <span className="exc-field-label">Fecha causal</span>
                    {fechaEliminar && <span className="exc-check">✓</span>}
                  </div>
                  <button
                    type="button"
                    className="exc-date-btn"
                    onClick={() => setShowCalEliminar(true)}
                  >
                    <span>{formatFecha(fechaEliminar)}</span>
                    <span>▾</span>
                  </button>
                </div>
              </div>
            )}

            {error && <p className="exc-error">{error}</p>}

            <button
              type="button"
              className="btn-enviar-codigo"
              onClick={sendOTP}
              disabled={loading}
            >
              {loading ? "Enviando..." : "Enviar código"}
            </button>
          </div>
        ) : (
          <OTPStep
            email={userData?.email}
            otp={otp}
            onConfirm={tab === "excepcion" ? handleConfirmExcepcion : handleConfirmEliminar}
            onCancel={() => { setShowOTP(false); setOtp(null); }}
          />
        )}

        {showCalExcepcion && (
          <CalendarMini
            selected={fechaExcepcion}
            onSelect={d => { setFechaExcepcion(d); setShowCalExcepcion(false); }}
            onCancel={() => setShowCalExcepcion(false)}
          />
        )}
        {showCalEliminar && (
          <CalendarMini
            selected={fechaEliminar}
            onSelect={d => { setFechaEliminar(d); setShowCalEliminar(false); }}
            onCancel={() => setShowCalEliminar(false)}
          />
        )}

      </div>
    </div>
  );
}