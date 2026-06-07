import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useUser } from '../UserContext'
import Sidebar from "./Sidebar";
import Carousel from "./Carousel";
import AhorroNomina from "./AhorroNomina";
import DetalleMovimientos from "./DetalleMovimientos";
import HistorialNovedades from "./HistorialNovedades";
import BarChart from "./BarChart";
import FirmarConvenioModal from "./FirmarConvenioModal";
import SolicitudCredito from "./SolicitudCredito";
import CarteraCredito from "./CarteraCredito";
import RentaFija from "./RentaFija";
import "./Dashboard.css";

const mesesCortos = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

function formatMoney(val) {
  if (!val && val !== 0) return "$ 0";
  const ceiled = Math.round(Number(val)).toString();
  let result = "";
  let count = 0;
  for (let i = ceiled.length - 1; i >= 0; i--) {
    result = ceiled[i] + result;
    count++;
    if (count % 3 === 0 && i !== 0) result = "." + result;
  }
  return `$ ${result}`;
}

function calcYAxisIntervals(maxValue) {
  if (maxValue <= 0) return [0, 1, 2, 3, 4];
  const numberOfLines = 5;
  const roughInterval = maxValue / (numberOfLines - 1);
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughInterval)));
  const fraction = roughInterval / magnitude;
  let niceInterval;
  if (fraction < 1.5) niceInterval = magnitude;
  else if (fraction < 3) niceInterval = magnitude * 2;
  else if (fraction < 7) niceInterval = magnitude * 5;
  else niceInterval = magnitude * 10;
  let niceMax = niceInterval * (numberOfLines - 1);
  if (maxValue > niceMax) niceMax += niceInterval;
  return Array.from({ length: numberOfLines }, (_, i) =>
    (niceMax / (numberOfLines - 1)) * i
  );
}

function formatYLabel(value) {
  const v = Math.round(value);
  if (v >= 1000000) return `${Math.round(v / 1000000)}M`;
  if (v >= 1000) return `${Math.round(v / 1000)}k`;
  return `${v}`;
}

function General() {
  const { userData } = useUser();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    usuariosActivos: 0,
    usuariosRetirados: 0,
    proximoAhorro: 0,
    beneficios: 0,
    barData: new Array(12).fill(0),
  });
  const [year, setYear] = useState(new Date().getFullYear());
  const [transList, setTransList] = useState([]);
  const [ahorrosList, setAhorrosList] = useState([]);
  const [tab, setTab] = useState("ahorrado");
  const [totalBarras, setTotalBarras] = useState(0);

  useEffect(() => {
    if (!userData?.empresaRef) return;

    const fetchData = async () => {
      try {
        const ahorrosQuery = query(
          collection(db, "ahorros"),
          where("company", "==", userData.empresaRef),
          where("AhorrosDocPdf1", "!=", "")
        );
        const retiradosQuery = query(
          collection(db, "NovedadesAhorros"),
          where("empresaid", "==", userData.empresaRef),
          where("estado", "==", "Retirado")
        );
        const transQuery = query(
          collection(db, "transactions"),
          where("transactionType", "==", "Depositado"),
          where("empresaId", "==", userData.empresaRef.id),
          where("processUrl", "!=", "")
        );

        const [ahorrosSnap, retiradosSnap, transSnap] = await Promise.all([
          getDocs(ahorrosQuery),
          getDocs(retiradosQuery),
          getDocs(transQuery),
        ]);

        const ahorrosListLocal = ahorrosSnap.docs.map(d => d.data());
        const retiradosUIDs = new Set(
          retiradosSnap.docs.map(d => d.data().usuarioRef?.id).filter(Boolean)
        );
        const totalRetirados = retiradosSnap.size;
        const ahorrosActivos = ahorrosListLocal.filter(a => !retiradosUIDs.has(a.UserID));
        const proximoAhorro = ahorrosActivos.reduce((sum, a) =>
          sum + (a.Total_Savings_PreApproval || 0), 0
        );
        let beneficios = 0;
        ahorrosActivos.forEach(a => {
          if (Array.isArray(a.transactions)) {
            a.transactions.forEach(t => { beneficios += t.taxedBenefit || 0; });
          }
        });

        const txList = transSnap.docs.map(d => d.data());
        setTransList(txList);
        setAhorrosList(ahorrosActivos);
        setStats({
          usuariosActivos: ahorrosActivos.length,
          usuariosRetirados: totalRetirados,
          proximoAhorro,
          beneficios,
          barData: new Array(12).fill(0),
        });
      } catch (err) {
        console.error("Error cargando datos:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userData]);

  useEffect(() => {
    const buildAhorrado = () => {
      const meses = Array(12).fill(0);
      transList.forEach(t => {
        if (t.status !== "APPROVED") return;
        let fecha = null;
        if (t.date?.toDate) fecha = t.date.toDate();
        else if (t.date instanceof Date) fecha = t.date;
        else if (typeof t.date === "string") fecha = new Date(t.date);
        if (!fecha) return;
        if (fecha.getFullYear() !== year) return;
        const mes = fecha.getMonth();
        const amount = typeof t.amount === "number" ? t.amount :
                       typeof t.amount === "string" ? parseFloat(t.amount) || 0 : 0;
        meses[mes] += amount;
      });
      return meses;
    };

    const buildBeneficios = () => {
      const meses = Array(12).fill(0);
      ahorrosList.forEach(a => {
        (a.transactions || []).forEach(t => {
          if (t.taxedBenefit && t.date) {
            const d = t.date.toDate ? t.date.toDate() : new Date(t.date);
            if (d && d.getFullYear() === year) meses[d.getMonth()] += t.taxedBenefit || 0;
          }
        });
      });
      return meses;
    };

    const barData = tab === "ahorrado" ? buildAhorrado() : buildBeneficios();
    const sumaBarras = barData.reduce((sum, v) => sum + v, 0);
    setTotalBarras(sumaBarras);
    setStats(prev => ({ ...prev, barData }));
  }, [transList, ahorrosList, year, tab]);

  if (loading) return (
    <div className="dashboard-loading">
      <div className="loading-spinner" />
      <p>Cargando datos...</p>
    </div>
  );

  return (
    <>
      <Carousel />
      <section className="dashboard-section">
        <h2 className="section-title">General</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <p className="stat-label">Usuarios activos</p>
            <p className="stat-value">{stats.usuariosActivos}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Usuarios retirados</p>
            <p className="stat-value">{stats.usuariosRetirados}</p>
          </div>
        </div>
      </section>

      <section className="dashboard-section">
        <h2 className="section-title">Ahorros</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <p className="stat-label">Próximo ahorro</p>
            <p className="stat-value">{formatMoney(stats.proximoAhorro)}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Beneficios acumulados en ahorros</p>
            <p className="stat-value">{formatMoney(stats.beneficios)}</p>
          </div>
        </div>
        <div className="chart-card">
          <div className="dm-card-top">
            <div>
              <p className="chart-title">
                {tab === "ahorrado" ? "Próxima Deposito" : `Beneficios acumulados ${year}`}
              </p>
              <div className="chart-value">
                <span>{formatMoney(tab === "ahorrado" ? stats.proximoAhorro : totalBarras)}</span>
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
                <button type="button" className={`dm-tab ${tab === "ahorrado" ? "active" : ""}`} onClick={() => setTab("ahorrado")}>
                  Total ahorrado
                </button>
                <button type="button" className={`dm-tab ${tab === "beneficios" ? "active" : ""}`} onClick={() => setTab("beneficios")}>
                  Beneficios acumulados
                </button>
              </div>
            </div>
          </div>
          <BarChart data={stats.barData} labels={mesesCortos} />
        </div>
      </section>

      <section className="dashboard-section">
        <h2 className="section-title">Créditos</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <p className="stat-label">Créditos activos</p>
            <p className="stat-value">0</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Próximo pago</p>
            <p className="stat-value">$ 0</p>
          </div>
        </div>
      </section>
    </>
  );
}

function ComingSoon({ name }) {
  return (
    <div className="coming-soon">
      <h2>🚧 {name}</h2>
      <p>Esta sección está en construcción</p>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { userData } = useUser();

  const [showFirmar, setShowFirmar] = useState(false);
  const [empresaData, setEmpresaData] = useState(null);

  useEffect(() => {
    if (!userData?.empresaRef) return;
    getDoc(userData.empresaRef).then(snap => {
      if (snap.exists()) setEmpresaData({ id: snap.id, ...snap.data() });
    });
  }, [userData]);

  const handleNavigate = (item) => {
    if (item === "Firmar convenio") {
      setShowFirmar(true);
      return;
    }
    const routes = {
      "General":                    "/dashboard",
      "Usuarios":                   "/dashboard/usuarios",
      "Ahorro":                     "/dashboard/ahorro",
      "Ahorro nomina":              "/dashboard/ahorro/nomina",
      "Detalle de movimientos":     "/dashboard/ahorro/movimientos",
      "Historial de novedades":     "/dashboard/ahorro/novedades",
      "Crédito":                    "/dashboard/solicitud-credito",
      "Solicitud de crédito":       "/dashboard/solicitud-credito",
      "Cartera":                    "/dashboard/cartera",
      "Créditos":                   "/dashboard/creditos",
      "Crédito empresarial":        "/dashboard/credito-empresarial",
      "Factoring":                  "/dashboard/factoring",
      "Confirming":                 "/dashboard/confirming",
      "Inversiones":                "/dashboard/inversiones/renta-fija",
      "Renta Fija":                 "/dashboard/inversiones/renta-fija",
    };
    if (routes[item]) navigate(routes[item]);
  };

  const getActiveItem = () => {
    const path = location.pathname;
    if (path.includes("/inversiones/renta-fija"))  return "Renta Fija";
    if (path.includes("/ahorro/nomina"))            return "Ahorro nomina";
    if (path.includes("/ahorro/movimientos"))       return "Detalle de movimientos";
    if (path.includes("/ahorro/novedades"))         return "Historial de novedades";
    if (path.includes("/ahorro"))                   return "Ahorro";
    if (path.includes("/usuarios"))                 return "Usuarios";
    if (path.includes("/solicitud-credito"))        return "Solicitud de crédito";
    if (path.includes("/cartera"))                   return "Cartera";
    if (path.includes("/creditos"))                 return "Créditos";
    if (path.includes("/credito-empresarial"))      return "Crédito empresarial";
    if (path.includes("/factoring"))                return "Factoring";
    if (path.includes("/confirming"))               return "Confirming";
    return "General";
  };

  return (
    <div className="dashboard-layout">
      <Sidebar activeItem={getActiveItem()} onNavigate={handleNavigate} />
      <main className="dashboard-main">
        <Routes>
          <Route path="/" element={<General />} />
          <Route path="/ahorro/nomina" element={<AhorroNomina />} />
          <Route path="/ahorro/movimientos" element={<DetalleMovimientos />} />
          <Route path="/ahorro/novedades" element={<HistorialNovedades />} />
          <Route path="/usuarios" element={<ComingSoon name="Usuarios" />} />
          <Route path="/creditos" element={<ComingSoon name="Créditos" />} />
          <Route path="/credito-empresarial" element={<ComingSoon name="Crédito empresarial" />} />
          <Route path="/factoring" element={<ComingSoon name="Factoring" />} />
          <Route path="/confirming" element={<ComingSoon name="Confirming" />} />
          <Route path="/solicitud-credito" element={<SolicitudCredito />} />
          <Route path="/cartera" element={<CarteraCredito />} />
          <Route path="/inversiones/renta-fija" element={<RentaFija />} />
          <Route path="*" element={<General />} />
        </Routes>
      </main>

      {showFirmar && (
        <FirmarConvenioModal
          empresaData={empresaData}
          onClose={() => setShowFirmar(false)}
        />
      )}
    </div>
  );
}