import { useState } from "react";
import { formatFechaCuota, formatMoney } from "../lib/carteraEmpresa";

const GRID_RESUMEN =
  "0.6fr 1.4fr 1fr 1.1fr 1fr 1fr 1fr 0.9fr 0.9fr 0.7fr";
const GRID_CUOTAS = "0.4fr 1fr 1fr 0.8fr";

const thStyle = {
  padding: "14px 16px",
  fontSize: 13,
  fontWeight: 500,
  color: "#64748b",
};

const tdStyle = {
  padding: "14px 16px",
  fontSize: 13,
  color: "#1e293b",
};

function EstadoBadge({ label, tipo = "neutral" }) {
  const styles =
    tipo === "pagado"
      ? { bg: "#dcfce7", color: "#15803d" }
      : tipo === "pendiente"
        ? { bg: "#f1f5f9", color: "#475569" }
        : tipo === "cartera"
          ? { bg: "#dbeafe", color: "#1d4ed8" }
          : { bg: "#fef3c7", color: "#b45309" };

  return (
    <span
      style={{
        background: styles.bg,
        color: styles.color,
        padding: "4px 10px",
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

export default function CreditosEmpresaDetalle({
  empresaNombre,
  creditos,
  loading,
  standalone = false,
}) {
  const [expandidoId, setExpandidoId] = useState(null);

  if (loading) {
    return (
      <div style={{ marginTop: standalone ? 0 : 36 }}>
        {!standalone && (
          <>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1e293b", marginBottom: 4 }}>
              Cartera
            </h2>
            <p style={{ fontSize: 14, color: "#64748b", margin: "0 0 16px" }}>
              Cargando créditos desembolsados de la empresa…
            </p>
          </>
        )}
        <div
          style={{
            background: "#fff",
            borderRadius: 16,
            border: "1px solid #e2e8f0",
            padding: 40,
            textAlign: "center",
            color: "#94a3b8",
            fontSize: 14,
          }}
        >
          Consultando cartera…
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginTop: standalone ? 0 : 36 }}>
      {!standalone && (
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1e293b", marginBottom: 4 }}>
            Cartera
          </h2>
          <p style={{ fontSize: 14, color: "#64748b", margin: 0 }}>
            {empresaNombre
              ? `Empleados con crédito desembolsado en ${empresaNombre}. Toca una fila para ver el plan de cuotas.`
              : "Detalle de cuotas para empleados con crédito en cartera."}
          </p>
        </div>
      )}

      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          border: "1px solid #e2e8f0",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: GRID_RESUMEN,
            background: "#fff",
            borderBottom: "1px solid #e2e8f0",
          }}
        >
          {[
            "ID",
            "Nombre",
            "Documento",
            "Tipo",
            "Monto crédito",
            "Cuota mensual",
            "Próxima cuota",
            "Saldo",
            "Estado",
            "Detalle",
          ].map((col) => (
            <div key={col} style={thStyle}>
              {col}
            </div>
          ))}
        </div>

        {creditos.length === 0 ? (
          <div
            style={{
              padding: "40px 24px",
              textAlign: "center",
              color: "#94a3b8",
              fontSize: 14,
            }}
          >
            No hay créditos desembolsados para empleados de esta empresa.
          </div>
        ) : (
          creditos.map((c, i) => {
            const expandido = expandidoId === c.id;
            const proxima = c.proximaCuota;

            return (
              <div key={c.id}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setExpandidoId(expandido ? null : c.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setExpandidoId(expandido ? null : c.id);
                    }
                  }}
                  style={{
                    display: "grid",
                    gridTemplateColumns: GRID_RESUMEN,
                    borderBottom:
                      i < creditos.length - 1 || expandido
                        ? "1px solid #e2e8f0"
                        : "none",
                    alignItems: "center",
                    cursor: "pointer",
                    background: expandido ? "#f8fafc" : "transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (!expandido) e.currentTarget.style.background = "#fafafa";
                  }}
                  onMouseLeave={(e) => {
                    if (!expandido) e.currentTarget.style.background = "transparent";
                  }}
                >
                  <div style={{ ...tdStyle, fontWeight: 600 }}>{c.idCredito}</div>
                  <div style={tdStyle}>{c.nombreCompleto}</div>
                  <div style={{ ...tdStyle, color: "#64748b" }}>{c.numeroDocumento}</div>
                  <div style={tdStyle}>{c.tipoCredito}</div>
                  <div style={{ ...tdStyle, fontWeight: 600 }}>{formatMoney(c.montoCredito)}</div>
                  <div style={{ ...tdStyle, fontWeight: 600, color: "#ea580c" }}>
                    {formatMoney(c.cuotaMensual || c.cuotaNormalTotal)}
                  </div>
                  <div style={tdStyle}>
                    {proxima ? (
                      <div>
                        <div style={{ fontWeight: 600 }}>{formatMoney(proxima.cuotaTotal)}</div>
                        <div style={{ fontSize: 11, color: "#64748b" }}>
                          {formatFechaCuota(proxima.fecha)}
                        </div>
                      </div>
                    ) : (
                      "—"
                    )}
                  </div>
                  <div style={tdStyle}>{formatMoney(c.saldoPendiente)}</div>
                  <div style={tdStyle}>
                    <EstadoBadge label={c.estadoCartera} tipo="cartera" />
                  </div>
                  <div style={{ ...tdStyle, color: "#64748b", fontSize: 12 }}>
                    {expandido ? "▲ Ocultar" : "▼ Ver cuotas"}
                  </div>
                </div>

                {expandido && (
                  <div
                    style={{
                      padding: "16px 20px 20px",
                      background: "#f8fafc",
                      borderBottom: i < creditos.length - 1 ? "1px solid #e2e8f0" : "none",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 12,
                        flexWrap: "wrap",
                        gap: 8,
                      }}
                    >
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#334155" }}>
                        Plan de pagos — {c.nombreCompleto}
                      </p>
                      <span style={{ fontSize: 12, color: "#64748b" }}>
                        {c.cuotasPagadas} / {c.cuotasTotales} cuotas pagadas
                      </span>
                    </div>

                    <div
                      style={{
                        background: "#fff",
                        borderRadius: 12,
                        border: "1px solid #e2e8f0",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: GRID_CUOTAS,
                          borderBottom: "1px solid #e2e8f0",
                        }}
                      >
                        {["#", "Fecha", "Cuota total", "Estado"].map((col) => (
                          <div key={col} style={{ ...thStyle, background: "#fff" }}>
                            {col}
                          </div>
                        ))}
                      </div>

                      {c.cuotas.length === 0 ? (
                        <div style={{ padding: 20, textAlign: "center", color: "#94a3b8" }}>
                          Sin cuotas registradas.
                        </div>
                      ) : (
                        c.cuotas.map((cuota, idx) => (
                          <div
                            key={cuota.numero}
                            style={{
                              display: "grid",
                              gridTemplateColumns: GRID_CUOTAS,
                              borderBottom:
                                idx < c.cuotas.length - 1 ? "1px solid #f1f5f9" : "none",
                              alignItems: "center",
                            }}
                          >
                            <div style={tdStyle}>
                              {cuota.numero}/{c.cuotasTotales}
                            </div>
                            <div style={tdStyle}>{formatFechaCuota(cuota.fecha)}</div>
                            <div style={{ ...tdStyle, fontWeight: 600, color: "#ea580c" }}>
                              {formatMoney(cuota.cuotaTotal)}
                            </div>
                            <div style={tdStyle}>
                              <EstadoBadge
                                label={cuota.estado === "pagado" ? "Pagado" : "Pendiente"}
                                tipo={cuota.estado === "pagado" ? "pagado" : "pendiente"}
                              />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
