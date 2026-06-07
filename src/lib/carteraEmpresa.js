import { collection, query, where, getDocs, getDoc } from "firebase/firestore";
import { db } from "../firebase";

const ESTADO_CARTERA_LABELS = {
  "al-dia": "Al día",
  vencido: "Vencido",
  "mora-temprana": "Mora temprana",
  "mora-tardia": "Mora tardía",
  castigo: "Castigo",
};

export function formatMoney(val) {
  if (val == null || val === "") return "$ 0";
  const n = Number(val);
  if (Number.isNaN(n)) return "$ 0";
  return `$ ${Math.round(n).toLocaleString("es-CO")}`;
}

export function formatFechaCuota(fecha) {
  if (!fecha) return "—";
  const d = new Date(fecha.includes("T") ? fecha : `${fecha}T12:00:00`);
  if (Number.isNaN(d.getTime())) return String(fecha);
  return d.toLocaleDateString("es-CO");
}

function mapCarteraDoc(docSnap) {
  const data = docSnap.data();
  const cuotas = Array.isArray(data.cuotas)
    ? [...data.cuotas]
        .map((c) => ({
          numero: Number(c.numero) || 0,
          fecha: c.fecha || "",
          cuotaTotal: Number(c.cuotaTotal) || 0,
          estado: c.estado === "pagado" ? "pagado" : "pendiente",
        }))
        .sort((a, b) => a.numero - b.numero)
    : [];

  const proximaPendiente = cuotas.find((c) => c.estado !== "pagado") || null;

  return {
    id: docSnap.id,
    idCredito: data.idCredito || docSnap.id,
    nombreCompleto: data.nombreCompleto || "—",
    numeroDocumento: data.numeroDocumento || "—",
    tipoCredito: data.tipoCreditoLabel || data.tipoCredito || "—",
    empresa: data.empresa || "—",
    montoCredito: Number(data.montoCredito) || 0,
    saldoPendiente: Number(data.saldoPendiente) || 0,
    cuotaMensual: Number(data.cuotaMensual) || 0,
    cuotaNormalTotal: Number(data.cuotaNormalTotal) || 0,
    cuotasPagadas: Number(data.cuotasPagadas) || 0,
    cuotasTotales: Number(data.cuotasTotales) || cuotas.length,
    estadoCartera: ESTADO_CARTERA_LABELS[data.estadoCartera] || data.estadoCartera || "—",
    proximaCuota: proximaPendiente,
    cuotas,
  };
}

/**
 * Créditos en cartera de empleados vinculados a la empresa (colección `cartera` del Core).
 */
export async function fetchCreditosEmpresa(empresaRef) {
  if (!empresaRef?.id) {
    return { empresaNombre: "", creditos: [] };
  }

  const empSnap = await getDoc(empresaRef);
  const empresaNombre = empSnap.exists() ? empSnap.data()?.razonsocial || "" : "";

  const usersSnap = await getDocs(
    query(collection(db, "user"), where("empresaref", "==", empresaRef))
  );

  const nitsEmpleados = new Set();
  const nombrePorNit = new Map();

  usersSnap.forEach((docSnap) => {
    const u = docSnap.data();
    const nit = String(u.nit || u.id || "").replace(/\s/g, "");
    if (!nit) return;
    nitsEmpleados.add(nit);
    nombrePorNit.set(nit, u.display_name || u.nombre || "—");
  });

  const creditosMap = new Map();

  const agregarDocs = (snap) => {
    snap.docs.forEach((docSnap) => {
      if (creditosMap.has(docSnap.id)) return;
      const item = mapCarteraDoc(docSnap);
      const nit = String(item.numeroDocumento).replace(/\s/g, "");
      const perteneceEmpresa =
        (empresaNombre && item.empresa === empresaNombre) ||
        (nit && nitsEmpleados.has(nit));

      if (!perteneceEmpresa) return;

      if (nombrePorNit.has(nit) && (!item.nombreCompleto || item.nombreCompleto === "—")) {
        item.nombreCompleto = nombrePorNit.get(nit);
      }

      creditosMap.set(docSnap.id, item);
    });
  };

  if (empresaNombre) {
    const porEmpresa = await getDocs(
      query(collection(db, "cartera"), where("empresa", "==", empresaNombre))
    );
    agregarDocs(porEmpresa);
  }

  const nits = [...nitsEmpleados];
  for (let i = 0; i < nits.length; i += 10) {
    const lote = nits.slice(i, i + 10);
    const porNit = await getDocs(
      query(collection(db, "cartera"), where("numeroDocumento", "in", lote))
    );
    agregarDocs(porNit);
  }

  const creditos = [...creditosMap.values()].sort((a, b) =>
    a.nombreCompleto.localeCompare(b.nombreCompleto, "es")
  );

  return { empresaNombre, creditos };
}
