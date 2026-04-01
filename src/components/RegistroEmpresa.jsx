import { useState, useEffect, useRef } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { collection, doc, setDoc, addDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { useNavigate } from "react-router-dom";
import "./AuthForms.css";

const LOGO = "https://storage.googleapis.com/flutterflow-io-6f20.appspot.com/projects/alianza-b7y88v/assets/0wo1ennxf6wk/Button.png";
const CITIES_URL = "https://opensheet.elk.sh/1VMxcLvCSOE0czms4r-mcd4HYsFneFx0lN6GZ2__hqoU/CIUDADES";
const STEPS = ["Datos empresa", "Ubicación", "Acceso"];

export default function RegistroEmpresa() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [razonsocial, setRazonsocial] = useState("");
  const [nit, setNit] = useState("");
  const [telefono, setTelefono] = useState("");
  const [actividad, setActividad] = useState("");
  const [empleados, setEmpleados] = useState("");

  const [pais] = useState("Colombia");
  const [ciudad, setCiudad] = useState("");
  const [ciudadQuery, setCiudadQuery] = useState("");
  const [ciudadSuggestions, setCiudadSuggestions] = useState([]);
  const [allCiudades, setAllCiudades] = useState([]);
  const [loadingCiudades, setLoadingCiudades] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const ciudadRef = useRef(null);
  const [direccion, setDireccion] = useState("");
  const [web, setWeb] = useState("");

  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    const fetchCiudades = async () => {
      setLoadingCiudades(true);
      try {
        const res = await fetch(CITIES_URL);
        const data = await res.json();
        const lista = data
          .map(row => row.ciudad || row.CIUDAD || Object.values(row)[0])
          .filter(Boolean);
        setAllCiudades(lista);
      } catch (e) {
        console.error("Error cargando ciudades:", e);
      } finally {
        setLoadingCiudades(false);
      }
    };
    fetchCiudades();
  }, []);

  useEffect(() => {
    if (!ciudadQuery.trim() || ciudadQuery.trim().length < 2) {
      setCiudadSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const q = ciudadQuery.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const filtered = allCiudades
      .filter(c => c.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(q))
      .slice(0, 6);
    setCiudadSuggestions(filtered);
    setShowSuggestions(filtered.length > 0);
  }, [ciudadQuery, allCiudades]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ciudadRef.current && !ciudadRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectCiudad = (opcion) => {
    setCiudad(opcion);
    setCiudadQuery(opcion);
    setShowSuggestions(false);
  };

  const validateStep1 = () => {
    if (!razonsocial.trim()) return "La razón social es requerida.";
    if (!nit.trim()) return "El NIT es requerido.";
    if (!telefono.trim()) return "El teléfono es requerido.";
    if (!actividad.trim()) return "La actividad comercial es requerida.";
    if (!empleados.trim()) return "El número de empleados es requerido.";
    return "";
  };

  const validateStep2 = () => {
    if (!ciudad.trim()) return "Selecciona una ciudad de la lista.";
    if (!direccion.trim()) return "La dirección es requerida.";
    if (!web.trim()) return "La página web es requerida.";
    return "";
  };

  const validateStep3 = () => {
    if (!correo.trim()) return "El correo es requerido.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) return "Ingresa un correo válido.";
    if (!contrasena) return "La contraseña es requerida.";
    if (contrasena.length < 6) return "La contraseña debe tener al menos 6 caracteres.";
    if (contrasena !== confirmar) return "Las contraseñas no coinciden.";
    return "";
  };

  const handleNext = () => {
    setError("");
    if (step === 0) { const err = validateStep1(); if (err) { setError(err); return; } }
    if (step === 1) { const err = validateStep2(); if (err) { setError(err); return; } }
    setStep(s => s + 1);
  };

  const handleCrearCuenta = async () => {
    const err = validateStep3();
    if (err) { setError(err); return; }
    setLoading(true);
    setError("");
    try {
      // 1. Crear documento en colección "empresa"
      const empresaRef = await addDoc(collection(db, "empresa"), {
        razonsocial,
        nit,
        correo,
        telefono1: telefono,
        actividad,
        numeroEmpleados: parseInt(empleados) || 0,
        pais,
        ciudad,
        departamento: ciudad,
        direccion,
        web,
        signedDocument: "", // string vacío para compatibilidad con Flutter
      });

      // 2. Crear usuario en Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, correo, contrasena);
      const user = userCredential.user;

      // 3. Crear documento en colección "user" con todos los campos requeridos
      await setDoc(doc(db, "user", user.uid), {
        uid: user.uid,
        id: nit,
        email: correo,
        display_name: razonsocial,
        nit,
        userType: "CompanyAdmin",
        telefono1: telefono,
        phone_number: telefono,
        ciudad,
        departamento: ciudad,
        pais,
        direccion,
        empresaref: empresaRef,
        recurrencia: "Mensual",
        tipoDocumento: "",
        ciudadExpedicion: "",
        ciudad_nacimiento: "",
        created_time: new Date(),
        lastLogin: new Date(),
      });

      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      if (err.code === "auth/email-already-in-use") setError("Este correo ya está registrado.");
      else if (err.code === "auth/weak-password") setError("La contraseña es muy débil.");
      else setError("Ocurrió un error al crear la cuenta. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const EyeIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
      <path d="M1 12S5 4 12 4s11 8 11 8-4 8-11 8S1 12 1 12z" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5"/>
      <circle cx="12" cy="12" r="3" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5"/>
    </svg>
  );

  return (
    <div className="af-bg">
      <div className="af-overlay" />
      <div className="af-card af-card-registro">

        <div className="af-logo">
          <img src={LOGO} alt="Logo" className="af-logo-img" />
          <div className="af-logo-text">
            <span className="af-logo-bold">Alianza</span>
            <span className="af-logo-light">Empresas</span>
          </div>
        </div>

        <button className="af-back" onClick={() => step === 0 ? navigate("/login") : setStep(s => s - 1)}>
          ← {step === 0 ? "Volver" : "Anterior"}
        </button>

        <div className="af-steps-header">
          <div>
            <h1 className="af-title">Crear cuenta!</h1>
            <p className="af-subtitle">Completa tus datos para crear tu cuenta.</p>
          </div>
          <div className="af-steps-dots">
            {STEPS.map((_, i) => (
              <div key={i} className={`af-step-dot ${i === step ? "active" : i < step ? "done" : ""}`}>
                {i + 1}
              </div>
            ))}
          </div>
        </div>

        {/* PASO 0 */}
        {step === 0 && (
          <div className="af-step-content">
            <div className="af-field">
              <label>Razón social</label>
              <input type="text" placeholder="Escribe la razón social" value={razonsocial} onChange={e => setRazonsocial(e.target.value)} />
            </div>
            <div className="af-field">
              <label>NIT</label>
              <input type="text" placeholder="Escribe el NIT" value={nit} onChange={e => setNit(e.target.value.replace(/\D/g, ""))} />
            </div>
            <div className="af-field">
              <label>Teléfono</label>
              <input type="text" placeholder="Escribe tu teléfono" value={telefono} onChange={e => setTelefono(e.target.value.replace(/\D/g, ""))} />
            </div>
            <div className="af-row">
              <div className="af-field">
                <label>Actividad comercial</label>
                <input type="text" placeholder="Escribe la actividad" value={actividad} onChange={e => setActividad(e.target.value)} />
              </div>
              <div className="af-field">
                <label>Número de empleados</label>
                <input type="text" placeholder="Número" value={empleados} onChange={e => setEmpleados(e.target.value.replace(/\D/g, ""))} />
              </div>
            </div>
            {error && <p className="af-error">{error}</p>}
            <button className="af-btn-primary" onClick={handleNext}>Continuar</button>
          </div>
        )}

        {/* PASO 1 */}
        {step === 1 && (
          <div className="af-step-content">
            <div className="af-field">
              <label>País</label>
              <input type="text" value={pais} disabled style={{ opacity: 0.7, cursor: "not-allowed" }} />
            </div>

            <div className="af-field" ref={ciudadRef} style={{ position: "relative" }}>
              <label>Departamento / Ciudad</label>
              <div className="af-input-wrap">
                <input
                  type="text"
                  placeholder={loadingCiudades ? "Cargando ciudades..." : "Escribe para buscar..."}
                  value={ciudadQuery}
                  disabled={loadingCiudades}
                  onChange={e => { setCiudadQuery(e.target.value); setCiudad(""); }}
                  onFocus={() => ciudadSuggestions.length > 0 && setShowSuggestions(true)}
                  autoComplete="off"
                />
                <span className="af-input-icon">
                  <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
                    <circle cx="11" cy="11" r="7" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5"/>
                    <path d="M16.5 16.5L21 21" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </span>
              </div>
              {showSuggestions && (
                <ul className="af-autocomplete-list">
                  {ciudadSuggestions.map((op, i) => (
                    <li key={i} className="af-autocomplete-item" onMouseDown={() => handleSelectCiudad(op)}>
                      {op}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="af-field">
              <label>Dirección</label>
              <input type="text" placeholder="Escribe tu dirección" value={direccion} onChange={e => setDireccion(e.target.value)} />
            </div>
            <div className="af-field">
              <label>Página web</label>
              <input type="text" placeholder="Inserta el link de tu página web" value={web} onChange={e => setWeb(e.target.value)} />
            </div>
            {error && <p className="af-error">{error}</p>}
            <button className="af-btn-primary" onClick={handleNext}>Continuar</button>
          </div>
        )}

        {/* PASO 2 */}
        {step === 2 && (
          <div className="af-step-content">
            <div className="af-field">
              <label>Correo electrónico</label>
              <input type="email" placeholder="Escribe tu correo electrónico" value={correo} onChange={e => setCorreo(e.target.value)} />
            </div>
            <div className="af-field">
              <label>Contraseña</label>
              <div className="af-input-wrap">
                <input type={showPass ? "text" : "password"} placeholder="Escribe tu contraseña" value={contrasena} onChange={e => setContrasena(e.target.value)} />
                <button type="button" className="af-toggle-pass" onClick={() => setShowPass(!showPass)}><EyeIcon /></button>
              </div>
            </div>
            <div className="af-field">
              <label>Confirma tu contraseña</label>
              <div className="af-input-wrap">
                <input type={showConfirm ? "text" : "password"} placeholder="Repite tu contraseña" value={confirmar} onChange={e => setConfirmar(e.target.value)} onKeyDown={e => e.key === "Enter" && handleCrearCuenta()} />
                <button type="button" className="af-toggle-pass" onClick={() => setShowConfirm(!showConfirm)}><EyeIcon /></button>
              </div>
            </div>
            {error && <p className="af-error">{error}</p>}
            <button className="af-btn-primary" onClick={handleCrearCuenta} disabled={loading}>
              {loading ? "Creando cuenta..." : "Crear cuenta"}
            </button>
          </div>
        )}

        <p className="af-footer-text">
          ¿Ya tienes una cuenta?{" "}
          <span className="af-link" onClick={() => navigate("/login")}>Iniciar sesión</span>
        </p>
      </div>
    </div>
  );
}