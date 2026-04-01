import { useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getApp } from "firebase/app";
import { db } from "../firebase";
import { useNavigate } from "react-router-dom";
import "./AuthForms.css";

const LOGO = "https://storage.googleapis.com/flutterflow-io-6f20.appspot.com/projects/alianza-b7y88v/assets/0wo1ennxf6wk/Button.png";
const API_OTP = "https://apinovedad-1021628575366.southamerica-east1.run.app";

export default function RecuperarContrasena() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [nit, setNit] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [otpGenerado, setOtpGenerado] = useState("");
  const [otpIngresado, setOtpIngresado] = useState("");
  const [nuevaPass, setNuevaPass] = useState("");
  const [confirmarPass, setConfirmarPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // PASO 0 — Buscar por NIT y enviar OTP
  const handleEnviarOTP = async () => {
    if (!nit.trim()) { setError("Por favor ingresa el NIT de la empresa."); return; }
    setLoading(true);
    setError("");
    try {
      const q = query(collection(db, "user"), where("nit", "==", nit.trim()));
      const snap = await getDocs(q);
      if (snap.empty) {
        setError("No se encontró ninguna cuenta con ese NIT.");
        return;
      }
      const data = snap.docs[0].data();
      const email = data.email;
      const nombre = data.display_name || "Usuario";

      const otp = String(Math.floor(1000 + Math.random() * 9000));
      setOtpGenerado(otp);
      setUserEmail(email);
      setUserName(nombre);

      await fetch(`${API_OTP}/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          otp,
          nombreUsuario: nombre,
          tipoOperacion: "Recuperar contraseña",
          valorTransaccion: "",
          idTransaccion: "",
          detallesTransaccion: "Código para restablecer tu contraseña",
        }),
      });

      setStep(1);
    } catch (err) {
      console.error(err);
      setError("Ocurrió un error. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  // PASO 1 — Verificar OTP
  const handleVerificarOTP = () => {
    if (!otpIngresado.trim()) { setError("Por favor ingresa el código."); return; }
    if (otpIngresado.trim() !== otpGenerado) {
      setError("El código ingresado es incorrecto.");
      return;
    }
    setError("");
    setStep(2);
  };

  // PASO 2 — Cambiar contraseña via Cloud Function
  const handleCambiarPassword = async () => {
    if (!nuevaPass) { setError("Por favor ingresa la nueva contraseña."); return; }
    if (nuevaPass.length < 6) { setError("La contraseña debe tener al menos 6 caracteres."); return; }
    if (nuevaPass !== confirmarPass) { setError("Las contraseñas no coinciden."); return; }
    setLoading(true);
    setError("");
    try {
      const functionsUS = getFunctions(getApp(), "us-central1");
      const resetFn = httpsCallable(functionsUS, "resetUserPassword");
      await resetFn({ email: userEmail, newPassword: nuevaPass });
      setStep(3);
    } catch (err) {
      console.error(err);
      setError("Error al cambiar la contraseña. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="af-bg">
      <div className="af-overlay" />
      <div className="af-card">

        <div className="af-logo">
          <img src={LOGO} alt="Logo" className="af-logo-img" />
          <div className="af-logo-text">
            <span className="af-logo-bold">Alianza</span>
            <span className="af-logo-light">Empresas</span>
          </div>
        </div>

        {step < 3 && (
          <button className="af-back" onClick={() => step === 0 ? navigate("/login") : setStep(s => s - 1)}>
            ← {step === 0 ? "Volver al login" : "Anterior"}
          </button>
        )}

        {step < 3 && (
          <div className="af-steps-dots" style={{ justifyContent: "center" }}>
            {[0, 1, 2].map(i => (
              <div key={i} className={`af-step-dot ${i === step ? "active" : i < step ? "done" : ""}`}>
                {i + 1}
              </div>
            ))}
          </div>
        )}

        {/* PASO 0 — NIT */}
        {step === 0 && (
          <>
            <h1 className="af-title">Recuperar contraseña</h1>
            <p className="af-subtitle">Ingresa el NIT de tu empresa para enviarte un código de verificación.</p>
            <div className="af-field">
              <label>NIT de la empresa</label>
              <input
                type="text"
                placeholder="Escribe el NIT"
                value={nit}
                onChange={e => setNit(e.target.value.replace(/\D/g, ""))}
                onKeyDown={e => e.key === "Enter" && handleEnviarOTP()}
                disabled={loading}
              />
            </div>
            {error && <p className="af-error">{error}</p>}
            <button className="af-btn-primary" onClick={handleEnviarOTP} disabled={loading}>
              {loading ? "Buscando..." : "Continuar"}
            </button>
            <p className="af-footer-text">
              ¿Recordaste tu contraseña?{" "}
              <span className="af-link" onClick={() => navigate("/login")}>Iniciar sesión</span>
            </p>
          </>
        )}

        {/* PASO 1 — OTP */}
        {step === 1 && (
          <>
            <h1 className="af-title">Código de verificación</h1>
            <p className="af-subtitle">
              Ingresa el código de 4 dígitos que enviamos a{" "}
              <strong style={{ color: "white" }}>{userEmail}</strong>.
            </p>
            <div className="af-field">
              <label>Código de verificación</label>
              <input
                type="text"
                placeholder="0000"
                maxLength={4}
                value={otpIngresado}
                onChange={e => setOtpIngresado(e.target.value.replace(/\D/g, ""))}
                onKeyDown={e => e.key === "Enter" && handleVerificarOTP()}
                style={{ letterSpacing: "8px", textAlign: "center", fontSize: "20px" }}
              />
            </div>
            {error && <p className="af-error">{error}</p>}
            <button className="af-btn-primary" onClick={handleVerificarOTP} disabled={loading}>
              Verificar código
            </button>
            <p className="af-footer-text" style={{ textAlign: "center" }}>
              ¿No recibiste el código?{" "}
              <span className="af-link" onClick={() => { setOtpIngresado(""); setError(""); setStep(0); }}>
                Reenviar
              </span>
            </p>
          </>
        )}

        {/* PASO 2 — Nueva contraseña */}
        {step === 2 && (
          <>
            <h1 className="af-title">Nueva contraseña</h1>
            <p className="af-subtitle">Crea una nueva contraseña para tu cuenta.</p>
            <div className="af-field">
              <label>Nueva contraseña</label>
              <div className="af-input-wrap">
                <input
                  type={showPass ? "text" : "password"}
                  placeholder="Escribe tu nueva contraseña"
                  value={nuevaPass}
                  onChange={e => setNuevaPass(e.target.value)}
                  disabled={loading}
                />
                <button type="button" className="af-toggle-pass" onClick={() => setShowPass(!showPass)}>
                  <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
                    <path d="M1 12S5 4 12 4s11 8 11 8-4 8-11 8S1 12 1 12z" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5"/>
                    <circle cx="12" cy="12" r="3" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5"/>
                  </svg>
                </button>
              </div>
            </div>
            <div className="af-field">
              <label>Confirmar contraseña</label>
              <div className="af-input-wrap">
                <input
                  type={showConfirm ? "text" : "password"}
                  placeholder="Repite tu nueva contraseña"
                  value={confirmarPass}
                  onChange={e => setConfirmarPass(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleCambiarPassword()}
                  disabled={loading}
                />
                <button type="button" className="af-toggle-pass" onClick={() => setShowConfirm(!showConfirm)}>
                  <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
                    <path d="M1 12S5 4 12 4s11 8 11 8-4 8-11 8S1 12 1 12z" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5"/>
                    <circle cx="12" cy="12" r="3" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5"/>
                  </svg>
                </button>
              </div>
            </div>
            {error && <p className="af-error">{error}</p>}
            <button className="af-btn-primary" onClick={handleCambiarPassword} disabled={loading}>
              {loading ? "Cambiando..." : "Cambiar contraseña"}
            </button>
          </>
        )}

        {/* PASO 3 — Éxito */}
        {step === 3 && (
          <div className="af-success">
            <div className="af-success-icon">✓</div>
            <h2 className="af-title" style={{ textAlign: "center" }}>¡Contraseña actualizada!</h2>
            <p className="af-subtitle" style={{ textAlign: "center" }}>
              Tu contraseña ha sido cambiada exitosamente. Ya puedes iniciar sesión con tu nueva contraseña.
            </p>
            <button className="af-btn-primary" onClick={() => navigate("/login")}>
              Finalizar
            </button>
          </div>
        )}

      </div>
    </div>
  );
}