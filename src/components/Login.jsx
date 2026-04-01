import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { useUser } from "../UserContext";
import "./Login.css";

const VIDEO_URL = "https://firebasestorage.googleapis.com/v0/b/alianza-b7y88v.appspot.com/o/video_corporativo%20(1).mp4?alt=media&token=8c70952e-aa43-42f9-a74a-2d93ecad83d7";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorType, setErrorType] = useState("");
  const { setUserData } = useUser();
  const navigate = useNavigate();

  const isValidEmail = (e) => /^\S+@\S+\.\S+$/.test(e);

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Por favor completa todos los campos.");
      setErrorType("warning");
      return;
    }
    if (!isValidEmail(email)) {
      setError("Ingresa un correo electrónico válido.");
      setErrorType("warning");
      return;
    }
    setError("");
    setErrorType("");
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const userDoc = await getDoc(doc(db, "user", user.uid));

      if (!userDoc.exists()) {
        setError("Usuario no encontrado en el sistema.");
        setErrorType("error");
        await auth.signOut();
        return;
      }

      const userData = userDoc.data();

      if (userData.userType !== "CompanyAdmin") {
        setError("No tienes permiso para acceder a este panel.");
        setErrorType("error");
        await auth.signOut();
        return;
      }

      setUserData({
        ...userData,
        uid: user.uid,
        empresaId: userData.empresaref?.id,
        empresaRef: userData.empresaref,
      });

      onLogin();

    } catch (err) {
      console.error(err);
      const code = err?.code;
      if (code === "auth/user-not-found" || code === "auth/wrong-password" || code === "auth/invalid-credential") {
        setError("Correo o contraseña incorrectos.");
        setErrorType("error");
      } else if (code === "auth/invalid-email") {
        setError("El formato del correo es inválido.");
        setErrorType("warning");
      } else if (code === "auth/user-disabled") {
        setError("Esta cuenta ha sido deshabilitada.");
        setErrorType("error");
      } else if (code === "auth/too-many-requests") {
        setError("Demasiados intentos. Intenta más tarde.");
        setErrorType("warning");
      } else if (code === "auth/network-request-failed") {
        setError("Error de red. Revisa tu conexión.");
        setErrorType("warning");
      } else {
        setError("Ocurrió un error. Intenta de nuevo.");
        setErrorType("error");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Precarga el video en segundo plano */}
      <video
        src={VIDEO_URL}
        muted
        preload="auto"
        style={{ display: "none" }}
      />

      <div className="login-bg">
        <div className="login-overlay" />
        <div className="login-card">

          <div className="login-logo">
            <div className="login-logo-icon">
              <img
                src="https://storage.googleapis.com/flutterflow-io-6f20.appspot.com/projects/alianza-b7y88v/assets/0wo1ennxf6wk/Button.png"
                alt="Alianza logo"
                style={{ width: '52px', height: '52px', borderRadius: '16px', objectFit: 'contain' }}
              />
            </div>
            <div className="login-logo-text">
              <span className="logo-bold">Alianza</span>
              <span className="logo-light">Empresas</span>
            </div>
          </div>

          <div className="login-header">
            <h1>Bienvenido!</h1>
            <p>Completa tus datos para Iniciar Sesión.</p>
          </div>

          <div className="login-form">

            <div className="form-group">
              <label>Correo electrónico</label>
              <div className="input-wrapper">
                <input
                  type="email"
                  placeholder="Escribe tu correo electrónico"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  disabled={loading}
                />
                <svg className="input-icon" viewBox="0 0 24 24" fill="none">
                  <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M2 8l10 6 10-6" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
              </div>
            </div>

            <div className="form-group">
              <label>Contraseña</label>
              <div className="input-wrapper">
                <input
                  type={showPass ? "text" : "password"}
                  placeholder="Escribe tu contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  disabled={loading}
                />
                <button
                  type="button"
                  className="toggle-pass"
                  onClick={() => setShowPass(!showPass)}
                >
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M1 12S5 4 12 4s11 8 11 8-4 8-11 8S1 12 1 12z" stroke="currentColor" strokeWidth="1.5"/>
                    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5"/>
                  </svg>
                </button>
              </div>
              <div className="forgot-row">
                <span>¿Has olvidado tu contraseña?</span>
                <span
                  className="forgot-link"
                  onClick={() => navigate("/recuperar-contrasena")}
                >
                  Recuperar contraseña
                </span>
              </div>
            </div>

            {error && (
              <p className={`login-error ${errorType || 'error'}`}>{error}</p>
            )}

            <button
              className="btn-submit"
              onClick={handleLogin}
              disabled={loading}
              aria-busy={loading}
            >
              {loading ? "Verificando..." : "Iniciar Sesión"}
            </button>

            <p className="register-row">
              ¿No tienes una cuenta?{" "}
              <span
                className="register-link"
                onClick={() => navigate("/registro")}
              >
                Regístrate aquí
              </span>
            </p>

          </div>
        </div>
      </div>
    </>
  );
}