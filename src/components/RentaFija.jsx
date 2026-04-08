import { useState, useEffect } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";
import "./RentaFija.css";

function formatCOP(value) {
  if (!value && value !== 0) return "$0";
  return "$" + Math.round(value).toLocaleString("es-CO");
}

const PRODUCTO_18_MESES = {
  id: "18meses-local",
  EA: 14.7,
  MV: 14.7 / 12,
  ProductNumber: 3,
  TypesOfProductName: "18 Meses",
};

function SimCard({ producto, monto }) {
  const ea = producto?.EA || 0;
  const meses =
    producto?.ProductNumber === 1 ? 6
    : producto?.ProductNumber === 2 ? 12
    : 18;
  const label = producto?.TypesOfProductName || `${meses} Meses`;

  const rendimiento =
    meses === 6
      ? (monto / 100) * ((ea / 12) * 6)
      : meses === 12
      ? (monto / 100) * ea
      : (monto / 100) * ((ea / 12) * 18);

  const retefuente = rendimiento * 0.04;
  const ganancias = rendimiento - retefuente;

  const anticipoTrimestral =
    meses === 6 ? ganancias / 2
    : meses === 12 ? ganancias / 4
    : ganancias / 6;

  const esPopular = meses === 12;

  return (
    <div className={`rf-card ${esPopular ? "popular" : ""}`}>
      {esPopular && <span className="rf-pop-badge">MÁS POPULAR</span>}

      <div className="rf-card-top">
        <span className="rf-badge-orange">{label}</span>
        <span className="rf-badge-white">{ea}% E.A</span>
      </div>

      <span className="rf-inv-label">Inversión:</span>
      <span className="rf-inv-val">{formatCOP(monto)}</span>

      <div className="rf-row">
        <span>Rendimiento</span>
        <span className="rf-val-green">+ {formatCOP(rendimiento)}</span>
      </div>
      <div className="rf-row">
        <span>Retefuente (4%)</span>
        <span className="rf-val-white">- {formatCOP(retefuente)}</span>
      </div>

      <span className="rf-ganancias-lbl">Ganancias</span>
      <span className="rf-ganancias-val">{formatCOP(ganancias)}</span>

      <div className="rf-anticipo-box">
        <span className="rf-anticipo-lbl">ANTICIPO GANANCIA TRIMESTRAL</span>
        <span className="rf-anticipo-val">{formatCOP(anticipoTrimestral)}</span>
      </div>
    </div>
  );
}

export default function RentaFija() {
  const [productos, setProductos] = useState([]);
  const [montoRaw, setMontoRaw] = useState("");
  const [monto, setMonto] = useState(0);
  const [simulado, setSimulado] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProductos = async () => {
      try {
        const q = query(
          collection(db, "Services"),
          where("ServiceMainType", "==", "CDAT")
        );
        const snap = await getDocs(q);
        const data = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((p) => p.ProductNumber === 1 || p.ProductNumber === 2)
          .sort((a, b) => a.ProductNumber - b.ProductNumber);

        setProductos([...data, PRODUCTO_18_MESES]);
      } catch (err) {
        console.error(err);
        setError("No se pudieron cargar los productos.");
      } finally {
        setLoading(false);
      }
    };
    fetchProductos();
  }, []);

  const handleMontoChange = (e) => {
    const val = e.target.value.replace(/\D/g, "");
    setMontoRaw(val);
    // las tarjetas no desaparecen mientras se escribe
  };

  const handleSimular = () => {
    const num = parseInt(montoRaw, 10) || 0;
    if (num < 1000000) {
      alert("El monto mínimo de inversión es $1.000.000");
      return;
    }
    setMonto(num);
    setSimulado(true);
  };

  const montoDisplay = montoRaw
    ? "$" + parseInt(montoRaw).toLocaleString("es-CO")
    : "";

  return (
    <div className="rf-page">

      <div className="rf-header">
        <div className="rf-header-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="4" width="18" height="16" rx="2" stroke="#003bb8" strokeWidth="1.8"/>
            <line x1="3" y1="9" x2="21" y2="9" stroke="#003bb8" strokeWidth="1.8"/>
            <rect x="7" y="12" width="3" height="3" rx="0.5" fill="#003bb8"/>
            <rect x="11" y="12" width="3" height="3" rx="0.5" fill="#003bb8"/>
          </svg>
        </div>
        <h1 className="rf-main-title">Simula tu inversión</h1>
      </div>

      <div className="rf-wrapper">
        <h2 className="rf-hero-title">100% Digital</h2>

        <p className="rf-subtitle">
          ¿Quieres saber cuánto puedes{" "}
          <span className="rf-orange">ganar con un CDAT?</span>
        </p>

        <div className="rf-input-group">
          <label className="rf-label">
            ¿Cuánto quieres invertir? (Mayor a $1.000.000)
          </label>
          <input
            className="rf-input"
            type="text"
            inputMode="numeric"
            placeholder="$1.000.000"
            value={montoDisplay}
            onChange={handleMontoChange}
          />
          <button className="rf-btn" onClick={handleSimular}>
            Simula tu inversión
          </button>
        </div>

        {loading && (
          <div className="rf-loading">
            <div className="rf-spinner" />
          </div>
        )}

        {error && <p className="rf-error">{error}</p>}

        {!loading && productos.length > 0 && (
          <>
            <div className="rf-cards-grid">
              {productos.map((p) => (
                <SimCard key={p.id} producto={p} monto={monto} />
              ))}
            </div>

            <p className="rf-disclaimer">
              El resultado de la simulación del CDAT Alianza calcula: el valor de la
              inversión, el plazo, la forma de pago de tus intereses y la tasa vigente
              al momento en que realices dicha simulación; el resultado es netamente
              informativo y no constituye una oferta comercial. Algunas condiciones
              podrán variar sin previo aviso.
            </p>
          </>
        )}
      </div>
    </div>
  );
}