import { useState, useEffect, useCallback } from "react";
import { useUser } from "../UserContext";
import CreditosEmpresaDetalle from "./CreditosEmpresaDetalle";
import { fetchCreditosEmpresa } from "../lib/carteraEmpresa";

export default function CarteraCredito() {
  const { userData } = useUser();
  const [creditos, setCreditos] = useState([]);
  const [empresaNombre, setEmpresaNombre] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchCreditos = useCallback(async () => {
    if (!userData?.empresaRef) {
      setCreditos([]);
      setEmpresaNombre("");
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { empresaNombre: nombre, creditos: lista } = await fetchCreditosEmpresa(
        userData.empresaRef
      );
      setEmpresaNombre(nombre);
      setCreditos(lista);
    } catch (err) {
      console.error("Error cargando cartera:", err);
      setCreditos([]);
    } finally {
      setLoading(false);
    }
  }, [userData]);

  useEffect(() => {
    fetchCreditos();
  }, [fetchCreditos]);

  if (!userData?.empresaRef) {
    return (
      <div style={{ padding: "32px 36px", flex: 1 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1e293b", marginBottom: 8 }}>
          Cartera
        </h1>
        <p style={{ fontSize: 14, color: "#64748b", margin: 0 }}>
          Tu usuario no está vinculado a una empresa.
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: "32px 36px", flex: 1, overflowY: "auto" }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1e293b", marginBottom: 4 }}>
          Cartera
        </h1>
        <p style={{ fontSize: 14, color: "#64748b", margin: 0 }}>
          {empresaNombre
            ? `Créditos desembolsados de empleados en ${empresaNombre}. Toca una fila para ver el plan de cuotas.`
            : "Créditos desembolsados de empleados de tu empresa. Toca una fila para ver el plan de cuotas."}
        </p>
      </div>

      <CreditosEmpresaDetalle
        empresaNombre={empresaNombre}
        creditos={creditos}
        loading={loading}
        standalone
      />
    </div>
  );
}
