import { useState } from "react";
import { collection, doc, getDocs, query, setDoc, Timestamp, updateDoc, where } from "firebase/firestore";
import { db } from "../firebase";

function formatCOP(value) {
  if (!value && value !== 0) return "";
  const num = Math.round(Number(String(value).replace(/\./g, "")));
  if (isNaN(num)) return "";
  return num.toLocaleString("es-CO");
}

function parseCOP(str) {
  return Number(String(str).replace(/\./g, "").replace(/,/g, "")) || 0;
}

function MoneyInput({ placeholder = "$ 0", value, onChange }) {
  const handleChange = (e) => {
    const raw = e.target.value.replace(/\D/g, "");
    onChange(raw);
  };
  const display = value ? "$ " + formatCOP(value) : "";
  return (
    <input
      type="text"
      inputMode="numeric"
      placeholder={placeholder}
      value={display}
      onChange={handleChange}
      style={{ padding: "10px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, fontFamily: "inherit", outline: "none", color: "#1e293b", width: "100%", boxSizing: "border-box" }}
    />
  );
}

function SectionHeader({ number, title, total }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
      <div>
        <span style={{ fontWeight: 700, color: "#1e3a8a", borderBottom: "2px solid #f97316", display: "inline-block", paddingBottom: 4, fontSize: 14 }}>
          {number}. {title}
        </span>
      </div>
      {total > 0 && (
        <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 20, padding: "4px 14px", fontSize: 13, fontWeight: 600, color: "#16a34a" }}>
          $ {formatCOP(total)}
        </div>
      )}
    </div>
  );
}

function SuccessModal({ onClose }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.7)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 20, padding: "40px 48px", maxWidth: 420, width: "100%", textAlign: "center", boxShadow: "0 25px 50px rgba(0,0,0,0.25)" }}>
        <div style={{ width: 64, height: 64, background: "#f0fdf4", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 28 }}>
          ✅
        </div>
        <h2 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 700, color: "#1e293b" }}>
          Perfilamiento procesado
        </h2>
        <p style={{ margin: "0 0 28px", fontSize: 14, color: "#64748b", lineHeight: 1.6 }}>
          Los datos financieros y laborales del colaborador han sido enviados correctamente. El Core Bancario continuará con el proceso de estudio.
        </p>
        <button
          onClick={onClose}
          style={{ background: "#f97316", color: "white", border: "none", borderRadius: 10, padding: "12px 32px", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", width: "100%" }}
        >
          Aceptar
        </button>
      </div>
    </div>
  );
}

export default function DiligenciarModal({ solicitud, onClose, onSuccess }) {
  // Ingresos
  const [salarioBase, setSalarioBase]       = useState("");
  const [comisionesSal, setComisionesSal]   = useState("");
  const [bonosNoSal, setBonosNoSal]         = useState("");
  const [auxilios, setAuxilios]             = useState(false);
  const [valorAuxilio, setValorAuxilio]     = useState("");

  // Descuentos
  const [embargos, setEmbargos]             = useState(false);
  const [valorEmbargos, setValorEmbargos]   = useState("");
  const [cantEmbargos, setCantEmbargos]     = useState("");
  const [libranzas, setLibranzas]           = useState(false);
  const [valorLibranzas, setValorLibranzas] = useState("");
  const [cantLibranzas, setCantLibranzas]   = useState("");
  const [internos, setInternos]             = useState(false);
  const [valorInternos, setValorInternos]   = useState("");

  // Estabilidad
  const [fechaIngreso, setFechaIngreso]         = useState("");
  const [contrato, setContrato]                 = useState("indefinido");
  const [fechaVencimiento, setFechaVencimiento] = useState("");
  const [preaviso, setPreaviso]                 = useState("no");
  const [estadoCritico, setEstadoCritico]       = useState("no");
  const [diasVacaciones, setDiasVacaciones]     = useState("");
  const [valorPrima, setValorPrima]             = useState("");

  // Fechas de corte
  const [diasCorte, setDiasCorte] = useState("");

  // UI
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [procesando, setProcesando]       = useState(false);
  const [error, setError]                 = useState("");
  const [showSuccess, setShowSuccess]     = useState(false);

  const totalIngresos =
    parseCOP(salarioBase) +
    parseCOP(comisionesSal) +
    parseCOP(bonosNoSal) +
    (auxilios ? parseCOP(valorAuxilio) : 0);

  const totalDescuentos =
    (embargos ? parseCOP(valorEmbargos) : 0) +
    (libranzas ? parseCOP(valorLibranzas) : 0) +
    (internos ? parseCOP(valorInternos) : 0);

  const totalRespaldo = parseCOP(valorPrima);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!termsAccepted) {
      setError("Debes aceptar los términos y condiciones.");
      return;
    }
    setProcesando(true);
    setError("");
    try {

      // 👈 calcular tiempo transcurrido desde la solicitud
      const ahora = new Date();
      const fechaSol = solicitud.fechaSolicitudRaw?.toDate?.() || new Date(solicitud.fechaSolicitudRaw || 0);
      const diffMs = ahora - fechaSol;
      const minutos = Math.floor(diffMs / (1000 * 60));
      const horas   = Math.floor(diffMs / (1000 * 60 * 60));
      const dias    = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const meses   = Math.floor(dias / 30);

      let tiempoEspera = "-";
      if (meses > 0)       tiempoEspera = `${meses}mes ${dias % 30}d`;
      else if (dias > 0)   tiempoEspera = `${dias}d ${horas % 24}h`;
      else if (horas > 0)  tiempoEspera = `${horas}h ${minutos % 60}m`;
      else                 tiempoEspera = `${minutos}m`;

      const perfilamientoData = {
        estado: "En analisis",
        fechaPerfilamiento: Timestamp.now(),
        tiempoEspera,           // 👈 "2d 3h"
        tiempoEsperaMs: diffMs, // 👈 en ms por si se necesita después
        // Ingresos
        salarioBase: parseCOP(salarioBase),
        comisionesSalariales: parseCOP(comisionesSal),
        bonosNoSalariales: parseCOP(bonosNoSal),
        auxiliosFijos: auxilios,
        valorAuxilio: auxilios ? parseCOP(valorAuxilio) : 0,
        totalIngresos,
        // Descuentos
        embargos,
        cantidadEmbargos: embargos ? Number(cantEmbargos) : 0,
        valorEmbargos: embargos ? parseCOP(valorEmbargos) : 0,
        libranzas,
        cantidadLibranzas: libranzas ? Number(cantLibranzas) : 0,
        valorLibranzas: libranzas ? parseCOP(valorLibranzas) : 0,
        obligacionesInternas: internos,
        valorInternos: internos ? parseCOP(valorInternos) : 0,
        totalDescuentos,
        // Estabilidad
        fechaIngreso,
        tipoContrato: contrato,
        fechaVencimientoContrato: fechaVencimiento || null,
        preaviso,
        estadoCritico,
        diasVacaciones: Number(diasVacaciones) || 0,
        valorPrima: parseCOP(valorPrima),
        // Fechas de corte
        diasCierreNovedades: diasCorte,
        // Términos
        terminosAceptados: true,
      };

      const criticalSyncData = {
        estado: "En estudio",
        fechaPerfilamiento: Timestamp.now(),
        tipodecredito: solicitud.tipoCredito || solicitud.tipodecredito || null,
        tipoContrato: contrato,
        empresa: solicitud.empresa || null,
        empresaDocId: solicitud.empresaDocId || null,
      };

      await updateDoc(doc(db, "creditoSolicitadoEmpresa", solicitud.id), perfilamientoData);

      try {
        await updateDoc(doc(db, "HabilitarCredito", solicitud.id), criticalSyncData);
      } catch (syncErr) {
        const uidRef = solicitud.usuarioRef || solicitud.nombre || null;
        if (uidRef) {
          const q = query(collection(db, "HabilitarCredito"), where("uid", "==", uidRef));
          const snap = await getDocs(q);
          if (!snap.empty) {
            await updateDoc(doc(db, "HabilitarCredito", snap.docs[0].id), criticalSyncData);
          } else {
            await setDoc(doc(db, "HabilitarCredito", solicitud.id), {
              uid: uidRef,
              nombre: uidRef,
              id: solicitud.idNumerico || null,
              ...criticalSyncData,
            }, { merge: true });
          }
        } else {
          throw syncErr;
        }
      }

      setShowSuccess(true);
    } catch (err) {
      console.error(err);
      setError(`Ocurrió un error al procesar. ${err?.message || "Intenta de nuevo."}`);
    } finally {
      setProcesando(false);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccess(false);
    if (onSuccess) onSuccess();
  };

  const sectionCard    = { border: "1px solid #e2e8f0", borderRadius: 12, padding: "20px 24px", marginBottom: 16, background: "#fff" };
  const gridRow        = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 12 };
  const inputGroup     = { display: "flex", flexDirection: "column", gap: 6 };
  const labelStyle     = { fontSize: 12, fontWeight: 600, color: "#475569" };
  const selectStyle    = { padding: "10px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, fontFamily: "inherit", outline: "none", color: "#1e293b", background: "#fff", width: "100%" };
  const conditionalBox = { marginTop: 10, padding: 14, background: "#fff7ed", borderLeft: "3px solid #f97316", borderRadius: "0 8px 8px 0" };

  return (
    <>
      {showSuccess && <SuccessModal onClose={handleSuccessClose} />}

      <div
        style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
        onClick={onClose}
      >
        <div
          style={{ background: "#f8fafc", borderRadius: 20, width: "100%", maxWidth: 1100, maxHeight: "95vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 25px 50px rgba(0,0,0,0.25)" }}
          onClick={e => e.stopPropagation()}
        >

          {/* Header */}
          <div style={{ background: "linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%)", color: "white", padding: "22px 28px", flexShrink: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 19, fontWeight: 700, letterSpacing: "-0.3px" }}>Perfilamiento de Crédito</h2>
                <p style={{ margin: "4px 0 0", opacity: 0.75, fontSize: 13 }}>Complete los datos financieros y laborales para la evaluación.</p>
              </div>
              <button
                onClick={onClose}
                style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: "50%", width: 34, height: 34, color: "white", fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
              >✕</button>
            </div>
          </div>

          {/* Tarjeta colaborador */}
          <div style={{ background: "#1e40af", padding: "12px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0, flexWrap: "wrap", gap: 8 }}>
            <span style={{ fontWeight: 700, color: "#fff", fontSize: 15 }}>{solicitud.nombre}</span>
            <div style={{ display: "flex", gap: 20, fontSize: 13, flexWrap: "wrap" }}>
              <span style={{ color: "#bfdbfe" }}><strong style={{ color: "white" }}>Documento:</strong> {solicitud.documento}</span>
              <span style={{ color: "#bfdbfe" }}><strong style={{ color: "white" }}>Antigüedad:</strong> {solicitud.antiguedadUsuario}</span>
              <span style={{ color: "#bfdbfe" }}><strong style={{ color: "white" }}>Tipo:</strong> {solicitud.tipoCredito}</span>
            </div>
          </div>

          {/* Resumen rápido */}
          <div style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "12px 28px", display: "flex", gap: 24, flexShrink: 0, flexWrap: "wrap" }}>
            <div style={{ textAlign: "center" }}>
              <p style={{ margin: 0, fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>Total ingresos</p>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#16a34a" }}>$ {formatCOP(totalIngresos)}</p>
            </div>
            <div style={{ width: 1, background: "#e2e8f0" }} />
            <div style={{ textAlign: "center" }}>
              <p style={{ margin: 0, fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>Total descuentos</p>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#dc2626" }}>$ {formatCOP(totalDescuentos)}</p>
            </div>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit} style={{ overflowY: "auto", padding: "20px 28px", flex: 1 }}>

            {/* 1. Ingresos */}
            <div style={sectionCard}>
              <SectionHeader number="1" title="Ingresos Mensuales" total={totalIngresos} />
              <div style={gridRow}>
                <div style={inputGroup}>
                  <label style={labelStyle}>Salario Básico (Base salud/pensión)</label>
                  <MoneyInput value={salarioBase} onChange={setSalarioBase} />
                </div>
                <div style={inputGroup}>
                  <label style={labelStyle}>Comisiones / Horas extras (Prestacionales)</label>
                  <MoneyInput value={comisionesSal} onChange={setComisionesSal} />
                </div>
              </div>
              <div style={gridRow}>
                <div style={inputGroup}>
                  <label style={labelStyle}>Comisiones / Bonos (No salariales)</label>
                  <MoneyInput value={bonosNoSal} onChange={setBonosNoSal} />
                </div>
                <div style={inputGroup}>
                  <label style={labelStyle}>Auxilios Fijos</label>
                  <select style={selectStyle} onChange={e => setAuxilios(e.target.value === "si")}>
                    <option value="no">NO</option>
                    <option value="si">SÍ</option>
                  </select>
                  {auxilios && (
                    <div style={conditionalBox}>
                      <label style={labelStyle}>Valor del Auxilio</label>
                      <div style={{ marginTop: 6 }}>
                        <MoneyInput value={valorAuxilio} onChange={setValorAuxilio} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 2. Descuentos */}
            <div style={sectionCard}>
              <SectionHeader number="2" title="Descuentos y Obligaciones" total={totalDescuentos} />
              <div style={gridRow}>
                <div style={inputGroup}>
                  <label style={labelStyle}>¿Tiene embargos judiciales?</label>
                  <select style={selectStyle} onChange={e => setEmbargos(e.target.value === "si")}>
                    <option value="no">NO</option>
                    <option value="si">SÍ</option>
                  </select>
                  {embargos && (
                    <div style={conditionalBox}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <div style={inputGroup}>
                          <label style={labelStyle}>Cantidad</label>
                          <input type="number" placeholder="1, 2, 3..." value={cantEmbargos} onChange={e => setCantEmbargos(e.target.value)} style={{ ...selectStyle, marginTop: 0 }} />
                        </div>
                        <div style={inputGroup}>
                          <label style={labelStyle}>Valor Total</label>
                          <MoneyInput value={valorEmbargos} onChange={setValorEmbargos} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div style={gridRow}>
                <div style={inputGroup}>
                  <label style={labelStyle}>¿Otras libranzas o entidades financieras?</label>
                  <select style={selectStyle} onChange={e => setLibranzas(e.target.value === "si")}>
                    <option value="no">NO</option>
                    <option value="si">SÍ</option>
                  </select>
                  {libranzas && (
                    <div style={conditionalBox}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <div style={inputGroup}>
                          <label style={labelStyle}>Cantidad</label>
                          <input type="number" value={cantLibranzas} onChange={e => setCantLibranzas(e.target.value)} style={selectStyle} />
                        </div>
                        <div style={inputGroup}>
                          <label style={labelStyle}>Valor Total</label>
                          <MoneyInput value={valorLibranzas} onChange={setValorLibranzas} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div style={inputGroup}>
                  <label style={labelStyle}>¿Obligaciones internas (Fondo, anticipos)?</label>
                  <select style={selectStyle} onChange={e => setInternos(e.target.value === "si")}>
                    <option value="no">NO</option>
                    <option value="si">SÍ</option>
                  </select>
                  {internos && (
                    <div style={conditionalBox}>
                      <label style={labelStyle}>Valor Total</label>
                      <div style={{ marginTop: 6 }}>
                        <MoneyInput value={valorInternos} onChange={setValorInternos} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 3. Estabilidad */}
            <div style={sectionCard}>
              <SectionHeader number="3" title="Estabilidad Laboral y Respaldo" total={totalRespaldo} />
              <div style={gridRow}>
                <div style={inputGroup}>
                  <label style={labelStyle}>Fecha de Ingreso</label>
                  <input type="date" style={selectStyle} value={fechaIngreso} onChange={e => setFechaIngreso(e.target.value)} required />
                </div>
                <div style={inputGroup}>
                  <label style={labelStyle}>Tipo de Contrato</label>
                  <select style={selectStyle} value={contrato} onChange={e => setContrato(e.target.value)}>
                    <option value="fijo">Fijo</option>
                    <option value="indefinido">Indefinido</option>
                    <option value="prestacion">Prestación de servicios</option>
                    <option value="pasante">Pasante</option>
                    <option value="obra">Obra o labor</option>
                    <option value="ocasional">Ocasional de trabajo</option>
                  </select>
                </div>
              </div>
              {(contrato === "fijo" || contrato === "obra") && (
                <div style={{ ...conditionalBox, marginBottom: 12 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div style={inputGroup}>
                      <label style={labelStyle}>Fecha de Vencimiento</label>
                      <input type="date" style={selectStyle} value={fechaVencimiento} onChange={e => setFechaVencimiento(e.target.value)} />
                    </div>
                    <div style={inputGroup}>
                      <label style={labelStyle}>¿Existe preaviso de no prórroga?</label>
                      <select style={selectStyle} value={preaviso} onChange={e => setPreaviso(e.target.value)}>
                        <option value="no">NO</option>
                        <option value="si">SÍ</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
              <div style={gridRow}>
                <div style={inputGroup}>
                  <label style={labelStyle}>Estado Crítico (Prueba / Disciplinario)</label>
                  <select style={selectStyle} value={estadoCritico} onChange={e => setEstadoCritico(e.target.value)}>
                    <option value="no">NO</option>
                    <option value="si">SÍ</option>
                  </select>
                </div>
                <div style={inputGroup}>
                  <label style={labelStyle}>Días de Vacaciones Acumuladas</label>
                  <input type="number" placeholder="Ej: 15" value={diasVacaciones} onChange={e => setDiasVacaciones(e.target.value)} style={selectStyle} />
                </div>
                <div style={inputGroup}>
                  <label style={labelStyle}>Valor Prima Proyectada</label>
                  <MoneyInput value={valorPrima} onChange={setValorPrima} />
                </div>
              </div>
            </div>

            {/* 4. Fechas de corte */}
            <div style={sectionCard}>
              <SectionHeader number="4" title="Fechas de corte y/o novedad" total={0} />
              <div style={gridRow}>
                <div style={inputGroup}>
                  <label style={labelStyle}>Días de cierre de novedades (Corte)</label>
                  <input type="text" placeholder="Ej: Días 20 de cada mes" style={selectStyle} value={diasCorte} onChange={e => setDiasCorte(e.target.value)} />
                </div>
              </div>
            </div>

            {/* 5. Términos */}
            <div style={{ ...sectionCard, display: "flex", alignItems: "center", gap: 12 }}>
              <input type="checkbox" id="termsAccepted" checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)} />
              <label htmlFor="termsAccepted" style={{ margin: 0, fontSize: 13, color: "#475569", fontWeight: 600 }}>
                Confirmo que he leído y acepto los términos y condiciones
              </label>
            </div>

            {error && (
              <p style={{ color: "#dc2626", fontSize: 13, marginBottom: 8, textAlign: "center" }}>{error}</p>
            )}

            {/* Botones */}
            <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
              <button
                type="button"
                onClick={onClose}
                style={{ flex: 1, padding: "13px", border: "1px solid #e2e8f0", borderRadius: 10, background: "white", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", color: "#1e293b" }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={procesando}
                style={{ flex: 2, padding: "13px", border: "none", borderRadius: 10, background: procesando ? "#94a3b8" : "#f97316", color: "white", fontSize: 14, fontWeight: 700, cursor: procesando ? "not-allowed" : "pointer", fontFamily: "inherit" }}
              >
                {procesando ? "Procesando..." : "Procesar Perfilamiento"}
              </button>
            </div>

          </form>
        </div>
      </div>
    </>
  );
}