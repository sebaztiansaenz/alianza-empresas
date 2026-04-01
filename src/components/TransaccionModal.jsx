import * as XLSX from "xlsx";
import "./TransaccionModal.css";

function formatMoney(val) {
  if (!val) return "$ 0";
  return `$ ${Number(val).toLocaleString("es-CO", { minimumFractionDigits: 0 })}`;
}

function formatFecha(timestamp) {
  if (!timestamp) return "- - -";
  const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`;
}

function getEstadoLabel(status) {
  if (status === "APPROVED") return "Completado";
  if (status === "PENDING") return "Pendiente";
  if (status === "REJECTED") return "Rechazado";
  return "Pendiente";
}

function getEstadoColor(status) {
  if (status === "APPROVED") return { bg: "rgba(68,187,164,0.12)", color: "#44BBA4" };
  if (status === "PENDING") return { bg: "rgba(249,207,88,0.22)", color: "#d4a017" };
  if (status === "REJECTED") return { bg: "rgba(255,89,99,0.25)", color: "#FF5963" };
  return { bg: "rgba(249,207,88,0.22)", color: "#d4a017" };
}

export default function TransaccionModal({ transaction, onClose }) {
  const userAccounts = transaction?.userAccounts || [];
  const estadoStyle = getEstadoColor(transaction?.status);

  const handleDownloadExcel = () => {
    const rows = userAccounts.map(u => ({
      "Empleado": u.userName || "-",
      "Tipo de producto": "Ahorro nomina",
      "Valor Aportado": u.amount || 0,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [{ wch: 30 }, { wch: 20 }, { wch: 20 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Transaccion");
    XLSX.writeFile(wb, `transaccion_${transaction?.referenceId || Date.now()}.xlsx`);
  };

  const handleDownloadPDF = () => {
    const win = window.open("", "_blank");
    const rows = userAccounts.map(u => `
      <tr>
        <td>${u.userName || "-"}</td>
        <td>Ahorro nomina</td>
        <td>${formatMoney(u.amount)}</td>
      </tr>
    `).join("");

    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Transacción ${transaction?.authorization || ""}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 32px; color: #262632; }
          h2 { font-size: 20px; font-weight: 600; margin-bottom: 24px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 32px; }
          th { background: #F2F4F8; padding: 12px 16px; text-align: left; font-size: 13px; color: rgba(38,38,50,0.7); }
          td { padding: 14px 16px; border-bottom: 1px solid #EAEAEA; font-size: 14px; }
          .badge { display: inline-block; padding: 4px 12px; border-radius: 100px; font-size: 13px; font-weight: 500; background: ${estadoStyle.bg}; color: ${estadoStyle.color}; }
        </style>
      </head>
      <body>
        <h2>Información general</h2>
        <table>
          <thead><tr><th>ID</th><th>Fecha pago correspondiente</th><th>Valor total</th><th>Usuarios</th><th>Tipo de productos</th><th>Fecha pago efectuado</th><th>Entidad bancaria</th><th>Estado</th></tr></thead>
          <tbody>
            <tr>
              <td>#${transaction?.authorization || "- - -"}</td>
              <td>${formatFecha(transaction?.empresaAdminSetDate)}</td>
              <td>${formatMoney(transaction?.amount)}</td>
              <td>${userAccounts.length}</td>
              <td>Ahorro nomina</td>
              <td>${formatFecha(transaction?.firebaseDate)}</td>
              <td>${transaction?.bank || "- - -"}</td>
              <td><span class="badge">${getEstadoLabel(transaction?.status)}</span></td>
            </tr>
          </tbody>
        </table>
        <table>
          <thead><tr><th>Empleados</th><th>Tipo de producto</th><th>Valor Aportado</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <script>window.print(); window.close();</script>
      </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <div className="tmodal-overlay" onClick={onClose}>
      <div className="tmodal-content" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="tmodal-header">
          <h3>Información general</h3>
          <button type="button" className="tmodal-close" onClick={onClose}>✕</button>
        </div>

        {/* Tabla resumen transacción */}
        <div className="tmodal-table-wrap">
          <table className="tmodal-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Fecha de pago correspondiente</th>
                <th>Valor total</th>
                <th>Usuarios</th>
                <th>Tipo de productos</th>
                <th>Fecha de pago efectuado</th>
                <th>Entidad bancaria</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>#{transaction?.authorization || "- - -"}</td>
                <td>{formatFecha(transaction?.empresaAdminSetDate)}</td>
                <td>{formatMoney(transaction?.amount)}</td>
                <td>{userAccounts.length}</td>
                <td>Ahorro nomina</td>
                <td>{formatFecha(transaction?.firebaseDate)}</td>
                <td>{transaction?.bank || "- - -"}</td>
                <td>
                  <span
                    className="tmodal-badge"
                    style={{ background: estadoStyle.bg, color: estadoStyle.color }}
                  >
                    {getEstadoLabel(transaction?.status)}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="tmodal-divider" />

        {/* Tabla userAccounts */}
        <div className="tmodal-table-wrap">
          <table className="tmodal-table">
            <thead>
              <tr>
                <th>Empleados</th>
                <th>Tipo de producto</th>
                <th>Valor Aportado</th>
              </tr>
            </thead>
            <tbody>
              {userAccounts.map((u, i) => (
                <tr key={i}>
                  <td>{u.userName || "-"}</td>
                  <td>Ahorro nomina</td>
                  <td>{formatMoney(u.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Botones */}
        <div className="tmodal-actions">
          <button type="button" className="btn-excel" onClick={handleDownloadExcel}>
            📊 Descargar en excel
          </button>
          <button type="button" className="btn-pdf" onClick={handleDownloadPDF}>
            📄 Descargar en pdf
          </button>
        </div>

      </div>
    </div>
  );
}