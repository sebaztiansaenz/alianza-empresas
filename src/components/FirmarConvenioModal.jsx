import { useState } from "react";
import { addDoc, collection } from "firebase/firestore";
import { db } from "../firebase";
import { useUser } from "../UserContext";
import "./FirmarConvenioModal.css";

const TIPOS_DOC = [
  "Cédula ciudadanía",
  "Pasaporte",
  "Cédula extranjería",
  "Tarjeta identidad",
];

const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const DIAS = ["L","M","X","J","V","S","D"];

const FIRMAR_CONVENIO_URL = import.meta.env.VITE_FIRMAR_CONVENIO_URL || "https://firmar-convenio-1021628575366.europe-central2.run.app/firmarConvenio";

const LOGO_URL = import.meta.env.VITE_LOGO_URL || "https://firebasestorage.googleapis.com/v0/b/alianza-b7y88v.appspot.com/o/Alianza%20text%20logo.png?alt=media&token=924856ab-ed9b-4ae0-a653-7a6eb47143a1";
const LOGO_BW_URL = import.meta.env.VITE_LOGO_BW_URL || "https://firebasestorage.googleapis.com/v0/b/alianza-b7y88v.appspot.com/o/Alianza%20pdf%20logo%20design.png?alt=media&token=52460c6f-9061-42c0-8681-aa5dc3db4c7a";
const VERIFICATION_LOGO_URL = import.meta.env.VITE_VERIFICATION_LOGO_URL || "https://firebasestorage.googleapis.com/v0/b/alianza-b7y88v.appspot.com/o/validado_logo.png?alt=media&token=73edb90c-658a-4f6f-b2a7-33293a85542f";
const ORANGE_LOGO_URL = import.meta.env.VITE_ORANGE_LOGO_URL || "https://storage.googleapis.com/flutterflow-io-6f20.appspot.com/projects/alianza-b7y88v/assets/0wo1ennxf6wk/Button.png";

async function fetchImageAsBase64(url) {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

function CalendarModal({ onSelect, onCancel, selected }) {
  const today = new Date();
  const [viewDate, setViewDate] = useState(selected || today);
  const [tempSelected, setTempSelected] = useState(selected || null);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const offset = firstDay === 0 ? 6 : firstDay - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const isSelected = (d) => tempSelected && d &&
    tempSelected.getDate() === d &&
    tempSelected.getMonth() === month &&
    tempSelected.getFullYear() === year;

  const isToday = (d) => d &&
    today.getDate() === d &&
    today.getMonth() === month &&
    today.getFullYear() === year;

  const getDayLabel = () => {
    const ref = tempSelected || today;
    const days = ["dom","lun","mar","mié","jue","vie","sáb"];
    return { day: days[ref.getDay()], d: ref.getDate(), m: MESES[ref.getMonth()].slice(0,3).toLowerCase() };
  };
  const h = getDayLabel();

  return (
    <div className="cal-overlay" onClick={onCancel}>
      <div className="cal-modal" onClick={e => e.stopPropagation()}>
        <div className="cal-header">
          <p className="cal-header-label">SELECCIONAR FECHA</p>
          <p className="cal-header-day">{h.day}, {h.d}</p>
          <p className="cal-header-month">{h.m}</p>
        </div>
        <div className="cal-body">
          <div className="cal-nav">
            <span className="cal-month-year">{MESES[month]} de {year} ▾</span>
            <div className="cal-arrows">
              <button type="button" onClick={() => setViewDate(new Date(year, month - 1, 1))}>‹</button>
              <button type="button" onClick={() => setViewDate(new Date(year, month + 1, 1))}>›</button>
            </div>
          </div>
          <div className="cal-days-header">{DIAS.map(d => <span key={d}>{d}</span>)}</div>
          <div className="cal-grid">
            {cells.map((d, i) => (
              <button key={i} type="button"
                className={`cal-day ${!d ? "empty" : ""} ${isSelected(d) ? "selected" : ""} ${isToday(d) && !isSelected(d) ? "today" : ""}`}
                onClick={() => d && setTempSelected(new Date(year, month, d))}
                disabled={!d}
              >{d || ""}</button>
            ))}
          </div>
          <div className="cal-actions">
            <button type="button" onClick={onCancel}>CANCELAR</button>
            <button type="button" onClick={() => tempSelected && onSelect(tempSelected)}>ACEPTAR</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatDate(date) {
  if (!date) return "";
  return `${String(date.getDate()).padStart(2,"0")}/${String(date.getMonth()+1).padStart(2,"0")}/${date.getFullYear()}`;
}

async function generarPDF(datos) {
  const { jsPDF } = await import("jspdf");

  const BLUE = [24, 52, 177];
  const LIGHT_BG = [233, 236, 247];
  const today = new Date().toLocaleDateString("es-CO", { day:"2-digit", month:"long", year:"numeric" }).toUpperCase();

  const [logoBase64, logoBWBase64, verificationBase64] = await Promise.all([
    fetchImageAsBase64(LOGO_URL),
    fetchImageAsBase64(LOGO_BW_URL),
    fetchImageAsBase64(VERIFICATION_LOGO_URL),
  ]);

  const logoOrangeBase64 = await fetchImageAsBase64(ORANGE_LOGO_URL).catch(() => null);

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  function addHeader(doc) {
    doc.addImage(logoBase64, "PNG", 14, 6, 48, 20);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("VINCULACION DE TERCEROS", 64, 11);
    doc.text("EMPRESAS", 64, 16);
    // orange vertical banner (bigger and slightly moved right to match FlutterFlow layout)
    if (logoOrangeBase64) {
      try {
        doc.addImage(logoOrangeBase64, "PNG", 176, 6, 26, 48);
      } catch (e) {
        doc.addImage(logoBWBase64, "PNG", 168, 6, 26, 20);
      }
    } else {
      doc.addImage(logoBWBase64, "PNG", 168, 6, 26, 20);
    }
  }

  function addFooter(doc) {
    const pageCount = doc.getNumberOfPages ? doc.getNumberOfPages() : "";
    const page = doc.internal.getCurrentPageInfo ? doc.internal.getCurrentPageInfo().pageNumber : doc.internal.getNumberOfPages ? doc.internal.getNumberOfPages() : "";
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    // draw right-aligned vigilado block (rectangle with centered 'VIGILADO' and small text to the right)
    const rectX = 150;
    const rectW = 44;
    const rectH = 9;
    const rectY = 277;
    doc.setLineWidth(0.6);
    doc.setDrawColor(0,0,0);
    doc.rect(rectX, rectY, rectW, rectH);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text("VIGILADO", rectX + rectW / 2, rectY + 6, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5);
    const txtX = rectX + rectW + 4;
    doc.text("SUPERINTENDENCIA DE LA", txtX, rectY + 3);
    doc.text("ECONOMIA SOLIDARIA", txtX, rectY + 8);
    // page number
    try {
      const p = doc.internal.getCurrentPageInfo().pageNumber;
      doc.setFontSize(7);
      doc.text(`Página ${p}`, 14, 286);
    } catch (e) {
      // ignore
    }
  }

  function drawRightStamp(doc) {
    try {
      // vertical stamp near right margin, slightly shifted down
      const rightX = 204; // near right edge
      const centerY = 160;
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      // Rotated 'VIGILADO' vertically
      doc.text("VIGILADO", rightX, centerY - 8, { angle: 90, align: "center" });
      // Small vertical separator line
      doc.setLineWidth(0.6);
      doc.line(rightX - 8, centerY - 28, rightX - 8, centerY + 28);
      doc.setFontSize(5);
      doc.setFont("helvetica", "normal");
      // Rotated small text (two lines)
      doc.text("SUPERINTENDENCIA DE LA", rightX + 8, centerY - 10, { angle: 90, align: "center" });
      doc.text("ECONOMIA SOLIDARIA", rightX + 8, centerY + 2, { angle: 90, align: "center" });
    } catch (e) {
      // ignore if rotation not supported
    }
  }

  function addSectionTitle(doc, text, y) {
    doc.setFillColor(...BLUE);
    doc.rect(14, y, 182, 7, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text(text, 20, y + 5);
    doc.setTextColor(0, 0, 0);
    return y + 10;
  }

  function addField(doc, label, value, x, y, w) {
    const text = String(value || "");
    const pad = 2;
    const labelHeight = 4;
    const availableW = w - pad * 2;
    const lines = text ? doc.splitTextToSize(text, availableW) : [];
    const fieldHeight = labelHeight + (lines.length ? lines.length * 4 : 8) + 4;
    doc.setFillColor(...LIGHT_BG);
    doc.rect(x, y, w, fieldHeight, "F");
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    doc.text(label, x + pad, y + 3);
    if (lines.length) {
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      let lineY = y + labelHeight + 3;
      for (const ln of lines) {
        doc.text(ln, x + pad, lineY);
        lineY += 4;
      }
    }
    return fieldHeight;
  }

  function addRichText(doc, parts, x, y, maxWidth) {
    let currentX = x;
    let currentY = y;
    for (const part of parts) {
      doc.setFont("helvetica", part.bold ? "bold" : "normal");
      const words = part.text.split(" ");
      for (const word of words) {
        const wordWidth = doc.getTextWidth(word + " ");
        if (currentX + wordWidth > x + maxWidth) {
          currentX = x;
          currentY += 4;
        }
        doc.text(word + " ", currentX, currentY);
        currentX += wordWidth;
      }
    }
    return currentY;
  }

  // ── PÁGINA 1 ──
  addHeader(pdf);

  pdf.setFontSize(12);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(0, 0, 0);
  pdf.text(today, 196, 16, { align: "right" });
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(100, 100, 100);
  pdf.text("Fecha de solicitud", 196, 21, { align: "right" });
  pdf.setTextColor(0, 0, 0);

  let y = 32;
  y = addSectionTitle(pdf, "INFORMACION DE LA EMPRESA", y);

  addField(pdf, "Razón social", datos.razonsocial, 14, y, 120);
  addField(pdf, "Nit", datos.nit, 136, y, 60);
  y += 14;

  addField(pdf, "Correo electrónico", datos.businessEmail, 14, y, 50);
  addField(pdf, "WhatsApp", datos.whatsApp, 66, y, 36);
  addField(pdf, "Teléfono", datos.telephone, 104, y, 36);
  addField(pdf, "Página web", datos.website, 142, y, 54);
  y += 14;

  addField(pdf, "Actividad comercial", datos.commercial, 14, y, 88);
  addField(pdf, "Numero de empleados", datos.employees, 104, y, 36);
  addField(pdf, "País", datos.pais, 142, y, 54);
  y += 14;

  addField(pdf, "Ciudad y departamento", datos.ciudad, 14, y, 80);
  addField(pdf, "Dirección", datos.direccion, 96, y, 100);
  y += 16;

  y = addSectionTitle(pdf, "REPRESENTANTE LEGAL", y);

  addField(pdf, "Nombre y apellidos", datos.nombres, 14, y, 182);
  y += 14;

  addField(pdf, "Tipo de documento", datos.tipoDocumento, 14, y, 44);
  addField(pdf, "No. de documento", datos.cc, 60, y, 44);
  addField(pdf, "Fecha de expedición", datos.fechaExpedicion, 106, y, 44);
  addField(pdf, "Correo electronico", datos.email, 152, y, 44);
  y += 16;

  // CLAUSULAS
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(0, 0, 0);
  pdf.text("CLAUSULAS", 14, y);
  y += 7;

  // [TERCERO VINCULADO]
  pdf.setFontSize(9);
  y = addRichText(pdf, [
    { text: "[TERCERO VINCULADO], ", bold: true },
    { text: "Fecha de expedición Correo electronico , con la rma de este documento se aceptan los siguientes términos:", bold: false },
  ], 14, y, 182);
  y += 6;

  // PRIMERO
  y = addRichText(pdf, [
    { text: "PRIMERO: ", bold: true },
    { text: "La información aquí suministrada es condencial y necesaria para la vinculación como tercero en ALIANZA CAPITAL DE AHORRO Y CREDITO FIMUTUAL, reconozco y acepto que en el evento que la información por mí suministrada en este Sitio Web o aplicación no sea de mi propiedad, induzca a una falsedad o sea violatoria del bien jurídico tutelado denominado ", bold: false },
    { text: "de la protección de la información y de los datos", bold: true },
    { text: " podré incurrir en tipos penales previstos por la legislación colombiana.", bold: false },
  ], 14, y, 182);
  y += 6;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  const textoAsimismo = "Así mismo, entiendo que autorizo a ALIANZA CAPITAL DE AHORRO Y CREDITO FIMUTUAL con relación a:";
  const linesAsimismo = pdf.splitTextToSize(textoAsimismo, 182);
  pdf.text(linesAsimismo, 14, y);
  y += linesAsimismo.length * 4 + 4;

  // I. Autorización Reporte
  const textoI = "I. Autorización Reporte y Consulta de Información ante los Operadores de Bancos de Datos de Información Financiera y/o Crediticia (Ley 1266 de 2008 y Ley 2157 de 2021). Autorizo de ALIANZA CAPITAL DE AHORRO Y CREDITO FIMUTUAL, como responsable del Tratamiento de datos; sus Encargados del Tratamiento; a quien él les haya transmitido o transferido la información, incluyendo la transferencia a terceros países, aliados, y/o a quien el futuro ostente sus derechos, para que obtenga toda la información relativa a mis datos personales nancieros, crediticios, comerciales y de servicios registrados ante cualquier banco de datos, mi comportamiento crediticio y comercial, el cumplimiento de mis obligaciones, en el sector nanciero y real, datos nancieros e información relacionada con mi situación laboral e ingresos salariales ante operadores de información crediticia, de seguridad social, administradoras de fondos y cesantías, centrales de riesgo, notarías, Registraduría Nacional del Estado Civil, Contraloría General de la República, Procuraduría General de la Nación, DIAN, O cinas de Registro, cajas de compensación, proveedores tecnológicos de Nómina y Facturación electrónica, Administradoras de Fondos de Pensiones y de Cesantías y Operadores de Información a través de las cuales se liquidan cesantías, aportes de seguridad social y para scales, tales como Aportes en Línea, SOI, SIMPLE, PILA, entre otras; así mismo para que soliciten o veri quen información sobre mis activos, bienes o derechos en entidades públicas o privadas, o información que se encuentre en buscadores públicos, listas restrictivas, listas vinculantes para Colombia, redes sociales o publicaciones físicas o electrónicas, bien fuere en Colombia o en el exterior. El resultado del análisis para acceder al producto me será informado a través de alguno de los medios de contacto que he suministrado. De igual manera, autorizo, para que, con nes estadísticos, de control, supervisión y de información, reporte a las Centrales de Información, mis datos de contacto, el desarrollo, novedades, extinción y cumplimiento de las obligaciones contraídas o que llegue a contraer con ALIANZA CAPITAL DE AHORRO Y CREDITO FIMUTUAL y/o a quien el futuro ostente sus derechos. Estas autorizaciones de reporte y consulta de información tendrán las mismas nalidades legítimas estipuladas para el tratamiento de información personal cuya autorización y detalle se señala a continuación.";
  const linesI = pdf.splitTextToSize(textoI, 182);
  pdf.text(linesI, 14, y);
  addFooter(pdf);
  drawRightStamp(pdf);

  // ── PÁGINA 2 ──
  pdf.addPage();
  addHeader(pdf);
  y = 32;

  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(0, 0, 0);

  const textoII = " II. Autorización para el Tratamiento de la Información Personal (Ley 1581 de 2012). Sin perjuicio del derecho que me asiste a escoger los canales de contacto y habiendo sido debidamente informado sobre los medios de comunicación que serán utilizados por ALIANZA CAPITAL DE AHORRO Y CREDITO FIMUTUAL para el ejercicio de la relación contractual y comercial, autorizo de manera libre, voluntaria, expresa e informada a ALIANZA CAPITAL DE AHORRO Y CREDITO FIMUTUAL en calidad de Responsable del Tratamiento de datos; a sus encargados del tratamiento o a quien la asociación les haya transmitido o transferido la información, incluyendo la transferencia a terceros países, y/o a quien en el futuro ostente sus derechos, a ser contactado utilizando la información suministrada en el presente Formulario para las nalidades previstas en este documento, a través de los siguientes canales: i) línea telefónica; ii) correo electrónico; iii) Servicio de Mensajes Cortos (SMS); iv) aplicaciones de mensajería instantánea o formal; y/o v) redes sociales. Declaro conocer y entender que, en caso de que requiera actualizar o modi car mis canales de contacto, puedo realizarlo a través de las Líneas autorizadas e informadas en la página WEB de la asociación. Autorizo a ALIANZA CAPITAL DE AHORRO Y CREDITO FIMUTUAL, en calidad de responsable del Tratamiento de datos; a sus Encargados del Tratamiento de datos o a quien haya transmitido o transferido la información, aliados y/o a quien el futuro ostente sus derechos, incluyendo la transferencia a terceros países, y/o a quien en el futuro ostente sus derechos, para que lleve a cabo el tratamiento de mis datos personales, incluyendo datos biométricos. En virtud de dicha autorización de tratamiento, ALIANZA CAPITAL DE AHORRO Y CREDITO FIMUTUAL podrá solicitar, consultar, compartir, recolectar, almacenar, informar, usar, circular, reportar, transferir, trasmitir, procesar, divulgar, recti car, modi car, aclarar, retirar, suprimir y/o actualizar mis datos e información personal, la cual, es suministrada por mí a través de todos los canales de contacto con ALIANZA CAPITAL DE AHORRO Y CREDITO FIMUTUAL, así como la página web. Así mismo, autorizo a ALIANZA CAPITAL DE AHORRO Y CREDITO FIMUTUAL, en calidad de responsable del Tratamiento; a sus Encargados del Tratamiento o a quien él les haya transmitido o transferido la información, aliados, incluyendo la transferencia a terceros países, y/o a quien el futuro ostente sus derechos, para que de forma directa o a través de una entidad certi cada como operador biométrico, realice la validación de mi identidad y mis características físicas (huellas dactilares y/o rostro), en caso de ser persona natural. Declaro que conozco y entiendo que no estoy obligado a suministrar y/o autorizar el tratamiento de los datos personales de menores de edad. De igual manera, declaro que conozco y entiendo que no estoy obligado a suministrar y/o autorizar el tratamiento de datos personales sensibles; no obstante, autorizo a ALIANZA CAPITAL DE AHORRO Y CREDITO FIMUTUAL el tratamiento de estos datos, de conformidad con lo establecido en el Artículo 5 y 6 de la Ley 1581 de 2023 y el Artículo 6 del Decreto 1377 de 2013, incluyendo de forma expresa mis datos biométricos y los datos asociados al origen racial o étnico, exclusivamente para las nalidades previstas en el presente documento; así mismo, conozco que la información biométrica consultada en las bases de datos respectivas no podrá ser almacenada, ni usada por ALIANZA CAPITAL DE AHORRO Y CREDITO FIMUTUAL, sus Encargados del Tratamiento o a quien él les haya transmitido o transferido la información, aliados, incluyendo la transferencia a terceros países y/o a quien el futuro ostente sus derechos, para complementar otras bases de datos, ni para nes distintos a los expresados en la presente autorización y en la Ley. Mis datos e información personal, debidamente autorizados a través del presente formulario, podrán ser sujetos de tratamiento por ALIANZA CAPITAL DE AHORRO Y CREDITO FIMUTUAL, sus Encargados del Tratamiento o a quien él les haya transmitido o transferido la información, aliados, incluyendo la transferencia a terceros países y/o a quien el futuro ostente sus derechos, en consecuencia, acepto ser contactado(a) mediante: i) línea telefónica; ii) correo electrónico; iii) Servicio de Mensajes Cortos (SMS); iv) v) aplicaciones de mensajería instantánea o formal; y/o vi) redes sociales.";
  const linesII = pdf.splitTextToSize(textoII, 182);
  pdf.text(linesII, 14, y);
  y += linesII.length * 4 + 6;

  const textoIII = "III. Autorización para Compartir Datos Personales con Entidades Pertenecientes al Grupo Económico, vinculados económicos, personas jurídicas o naturales, con base en las disposiciones de ALIANZA CAPITAL DE AHORRO Y CREDITO FIMUTUAL. Autorizo a ALIANZA CAPITAL DE AHORRO Y CREDITO FIMUTUAL y/o a cualquier otra Entidad o Unidad de Negocio interna que represente sus derechos, a compartir mi información personal, nanciera, crediticia y comercial como Cliente de ALIANZA CAPITAL DE AHORRO Y CREDITO FIMUTUAL con cualquiera otra persona o Entidad Vinculada al Grupo Económico al que pertenece y/o llegue a pertenecer ALIANZA CAPITAL DE AHORRO Y CREDITO FIMUTUAL o la Entidad que represente sus derechos, para realizar el mismo tratamiento y con las mismas nalidades mencionadas en el numeral anterior.";
  const linesIII = pdf.splitTextToSize(textoIII, 182);
  pdf.text(linesIII, 14, y);
  addFooter(pdf);
  drawRightStamp(pdf);

  // ── PÁGINA 3 ──
  pdf.addPage();
  addHeader(pdf);
  y = 32;

  pdf.setFontSize(8.5);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(0, 0, 0);

  const textoDeclaro = "Declaro haber leído el contenido de este documento, así como comprenderlo en su alcance e implicación, aceptando los Términos y Condiciones. El documento y mi aceptación tendrán validez marcando la casilla de aceptación en el formulario de solicitud de ALIANZA CAPITAL DE AHORRO Y CREDITO FIMUTUAL y/o de quien en el futuro represente u ostente sus derechos, así como, sus obligaciones.";
  const linesDeclaro = pdf.splitTextToSize(textoDeclaro, 182);
  pdf.text(linesDeclaro, 14, y);
  y += linesDeclaro.length * 4 + 4;

  const textoDefiniciones = " Las deniciones contenidas en la presente autorización que se encuentren en mayúscula tendrán el signi cado que así se haya determinado en la Política de Protección de Datos Personales de ALIANZA CAPITAL DE AHORRO Y CREDITO FIMUTUAL, la cual podrá ser consultada en la página web";
  const linesDefiniciones = pdf.splitTextToSize(textoDefiniciones, 182);
  pdf.text(linesDefiniciones, 14, y);
  y += linesDefiniciones.length * 4 + 4;

  // SEGUNDO
  y = addRichText(pdf, [
    { text: "SEGUNDO:", bold: true },
    { text: " Declaración de origen de Fondos- Declaro que: a.) los recursos que se giren por medio de las alianzas o autorizaciones tienen un origen lícito y provienen directamente del desarrollo de la actividad económica y ocupación señalada en la sección actividad económica inscrita en los documentos legales de la compañía. b.) Las cifras aquí reportadas, no provienen de ninguna actividad ilícita de las contempladas en el código penal colombiano o en cualquier otra norma concordante. c.) Admitiré con previa autorización que terceros efectúen depósitos a nombre propio o de las obligaciones incurridas con ALIANZA CAPITAL DE AHORRO Y CREDITO FIMUTUAL", bold: false },
  ], 14, y, 182);
  y += 6;

  // TERCERO
  y = addRichText(pdf, [
    { text: "TERCERO:", bold: true },
    { text: " Acepto el tratamiento de datos personales, el cual me fue informado durante el proceso realizado. Y que puedo encontrar en la página WEB de ALIANZA CAPITAL DE AHORRO Y CREDITO FIMUTUAL.", bold: false },
  ], 14, y, 182);
  y += 6;

  // CUARTO
  y = addRichText(pdf, [
    { text: "CUARTO:", bold: true },
    { text: " Acepto que las comunicaciones con ALIANZA CAPITAL DE AHORRO Y CREDITO FIMUTUAL sean enviadas al buzón de mi servicio a través de la APP o página WEB. De igual manera serán reportados con base en la información suministrada por el tercero.", bold: false },
  ], 14, y, 182);
  y += 6;

  // QUINTO
  y = addRichText(pdf, [
    { text: "QUINTO:", bold: true },
    { text: " Declaro que los representantes de la compañía no son personas expuestas políticamente en Colombia, ni en ningún país diferente a Colombia, ni su cónyuge, ni familiar hasta el segundo grado de consanguinidad o segundo de a nidad o primero civil de una persona expuesta políticamente. Igualmente declaro que no estoy cobijado por el articulo 30-A de la Ley 1908 de 2019, ni tengo residencia scal en ningún país diferente a Colombia.", bold: false },
  ], 14, y, 182);
  y += 6;

  // SEXTO
  y = addRichText(pdf, [
    { text: "SEXTO:", bold: true },
    { text: " En observancia del artículo 7 del Decreto 2364 de 2012, convengo con ALIANZA CAPITAL DE AHORRO Y CREDITO FIMUTUAL y acepto que el presente documento será rmado electrónicamente mediante el mecanismo OTP (One Time Password) digitado en un dispositivo móvil, ordenador u otra herramienta que autorice ALIANZA CAPITAL DE AHORRO Y CREDITO FIMUTUAL, reconociendo que dicha rma tiene los mismos efectos de mi rma manuscrita, cumpliendo con los atributos dispuestos en el parágrafo del artículo 28 de la Ley 527 de 1999 y el citado Decreto Reglamentario. Para estos efectos, mani esto que: I). Leí y veri qué el presente documento; II). Mantendré actualizados en todo momento los datos de noti cación como lo son el teléfono y el correo electrónico; III). Y reportaré de forma inmediata cualquier circunstancia que pueda poner en riesgo la seguridad de la OTP. Para todos los efectos, los documentos rmados electrónicamente serán custodiados por ALIANZA CAPITAL DE AHORRO Y CREDITO FIMUTUAL y/o la empresa que haga sus veces en este proceso.", bold: false },
  ], 14, y, 182);
  y += 6;

  // SEPTIMO
  y = addRichText(pdf, [
    { text: "SEPTIMO:", bold: true },
    { text: " Los pagos de terceros se realizarán con base en las indicaciones ALIANZA CAPITAL DE AHORRO Y CREDITO FIMUTUAL, de los siguientes conceptos:", bold: false },
  ], 14, y, 182);
  y += 6;

  // a)
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  const textoA = "a) Los pagos de origen de descuento de nómina, realizados a nombre de terceros, empleados a liados a ALIANZA CAPITAL DE AHORRO Y CREDITO FIMUTUAL en la modalidad de ahorro, serán depositados a mas tardar al tercer día calendario del pago de nomina del mes. Nota: Si este día, llegara a ser festivo, se realizará a más tardar al día hábil siguiente.";
  const linesA = pdf.splitTextToSize(textoA, 178);
  pdf.text(linesA, 16, y);
  y += linesA.length * 4 + 3;

  // b)
  const textoB = "b) Los pagos de origen de descuento de nómina, realizados a nombre de terceros, empleados a liados a ALIANZA CAPITAL DE AHORRO Y CREDITO FIMUTUAL en la modalidad de crédito, serán depositados a más tardar al primer día calendario del pago de nómina del mes. Nota: Si este día, llegara a ser festivo, se realizará a más tardar al día hábil siguiente.";
  const linesB = pdf.splitTextToSize(textoB, 178);
  pdf.text(linesB, 16, y);
  y += linesB.length * 4 + 3;

  // c)
  const textoC = "c) Todos los pagos anticipados de origen de liquidación de acreencias laborales, por retiro de los empleados, sin importar su naturaleza, deben ser veri cados con el departamento de créditos de ALIANZA CAPITAL DE AHORRO Y CREDITO FIMUTUAL, en aras de aplicar, la cláusula de pago anticipado de créditos del reglamento de créditos de ALIANZA CAPITAL DE AHORRO Y CREDITO FIMUTUAL.";
  const linesC = pdf.splitTextToSize(textoC, 178);
  pdf.text(linesC, 16, y);
  y += linesC.length * 4 + 16;

  // Firma
  pdf.setFontSize(13);
  pdf.setFont("helvetica", "bold");
  pdf.text(datos.nombres || "", 14, y);
  y += 6;

  pdf.setFontSize(13);
  pdf.setFont("helvetica", "normal");
  pdf.text("CC ", 14, y);
  pdf.setFont("helvetica", "bold");
  pdf.text(datos.cc || "", 14 + pdf.getTextWidth("CC "), y);
  y += 5;

  pdf.setFontSize(8.5);
  pdf.setFont("helvetica", "normal");
  pdf.text("Representante Legal", 14, y);
  y += 4;
  pdf.text("FIRMA ELECTRONICA", 14, y);

  // Logo verificación
  pdf.addImage(verificationBase64, "PNG", 160, y - 22, 35, 30);

  addFooter(pdf);
  drawRightStamp(pdf);

  return pdf;
}

export default function FirmarConvenioModal({ empresaData, onClose }) {
  const { userData } = useUser();

  const [nombres, setNombres] = useState("");
  const [tipoDoc, setTipoDoc] = useState("");
  const [numDoc, setNumDoc] = useState("");
  const [confirmarDoc, setConfirmarDoc] = useState("");
  const [email, setEmail] = useState("");
  const [fechaExpedicion, setFechaExpedicion] = useState(null);
  const [showCal, setShowCal] = useState(false);
  const [docNoCoincide, setDocNoCoincide] = useState(false);
  const [pdfBlob, setPdfBlob] = useState(null);
  const [pdfBase64, setPdfBase64] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [firmando, setFirmando] = useState(false);

  const isNumerico = tipoDoc === "Cédula ciudadanía" || tipoDoc === "Tarjeta identidad";

  const handleContinuar = async () => {
    setError("");
    setDocNoCoincide(false);
    if (!nombres.trim()) { setError("Ingresa nombres y apellidos."); return; }
    if (!tipoDoc) { setError("Selecciona el tipo de documento."); return; }
    if (!numDoc.trim()) { setError("Ingresa el número de documento."); return; }
    if (numDoc !== confirmarDoc) { setDocNoCoincide(true); setError("Los números de documento no coinciden."); return; }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("Ingresa un correo válido."); return; }
    if (!fechaExpedicion) { setError("Selecciona la fecha de expedición."); return; }

    setLoading(true);
    try {
      const datos = {
        nombres, tipoDocumento: tipoDoc, cc: numDoc, email,
        fechaExpedicion: formatDate(fechaExpedicion),
        razonsocial: empresaData?.razonsocial || "",
        nit: empresaData?.nit || "",
        businessEmail: empresaData?.correo || "",
        whatsApp: empresaData?.telefono1 || "",
        telephone: empresaData?.telefono1 || "",
        website: empresaData?.web || "",
        commercial: empresaData?.actividad || "",
        employees: String(empresaData?.numeroEmpleados || ""),
        pais: empresaData?.pais || "Colombia",
        ciudad: empresaData?.ciudad || "",
        direccion: empresaData?.direccion || "",
      };
      const pdf = await generarPDF(datos);
      const blob = pdf.output("blob");
      setPdfBlob(URL.createObjectURL(blob));
      setPdfBase64(pdf.output("datauristring").split(",")[1]);
    } catch (err) {
      console.error(err);
      setError("Error al generar el PDF. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const handleFirmar = async () => {
    setFirmando(true);
    setError("");
    try {
      await addDoc(collection(db, "empresaRepresentative"), {
        empresaRef: userData?.empresaRef || null,
        empresaNIT: empresaData?.nit || "",
        name: nombres,
        email,
        typoDeDocumento: tipoDoc,
        numeroDeDocumento: numDoc,
        fechaDeDocumento: fechaExpedicion || null,
        createdAt: new Date(),
      });

      const res = await fetch(FIRMAR_CONVENIO_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pdfBase64,
          nombres,
          email,
          telefono: empresaData?.telefono1 || "",
          empresaId: empresaData?.id,
          redirectURL: window.location.origin,
        }),
      });

      const data = await res.json();
      console.log("Respuesta:", data);

      const signURL = data?.signURL;
      if (signURL) {
        const link = document.createElement("a");
        link.href = signURL;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        onClose();
      } else {
        throw new Error(data?.error || "No se recibió el link de firma.");
      }

    } catch (err) {
      console.error("Error:", err);
      setError(err.message || "Error al procesar. Intenta de nuevo.");
    } finally {
      setFirmando(false);
    }
  };

  return (
    <>
      {showCal && (
        <CalendarModal
          selected={fechaExpedicion}
          onSelect={(d) => { setFechaExpedicion(d); setShowCal(false); }}
          onCancel={() => setShowCal(false)}
        />
      )}

      <div className="fc-overlay" onClick={onClose}>
        <div className="fc-modal" onClick={e => e.stopPropagation()}>
          <div className="fc-header">
            <h3>Representante legal</h3>
            <button type="button" className="fc-close" onClick={onClose}>✕</button>
          </div>

          <div className="fc-form">
            <div className="fc-row">
              <div className="fc-field">
                <label>Nombres y Apellidos</label>
                <input type="text" placeholder="Escribe tus nombres y apellidos" value={nombres} onChange={e => setNombres(e.target.value)} />
              </div>
              <div className="fc-field">
                <label>Número de documento</label>
                <input type="text" placeholder="Escribe tu documento" value={numDoc}
                  onChange={e => { const v = isNumerico ? e.target.value.replace(/\D/g,"") : e.target.value.replace(/[^a-zA-Z0-9]/g,""); setNumDoc(v); setDocNoCoincide(false); }}
                  maxLength={isNumerico ? 10 : 30} />
                {docNoCoincide && <p className="fc-error-inline">Número de documento no coincide.</p>}
              </div>
            </div>
            <div className="fc-row">
              <div className="fc-field">
                <label>Correo electrónico</label>
                <input type="email" placeholder="Escribe tu correo electrónico" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <div className="fc-field">
                <label>Confirma el número de documento</label>
                <input type="text" placeholder="Escribe tu documento" value={confirmarDoc}
                  onChange={e => { const v = isNumerico ? e.target.value.replace(/\D/g,"") : e.target.value.replace(/[^a-zA-Z0-9]/g,""); setConfirmarDoc(v); setDocNoCoincide(false); }}
                  maxLength={isNumerico ? 10 : 30} />
                {docNoCoincide && <p className="fc-error-inline">Número de documento no coincide.</p>}
              </div>
            </div>
            <div className="fc-row">
              <div className="fc-field">
                <label>Tipo de documento</label>
                <select value={tipoDoc} onChange={e => setTipoDoc(e.target.value)}>
                  <option value="">Selecciona tu tipo de documento</option>
                  {TIPOS_DOC.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="fc-field">
                <label>Fecha de expedición del documento</label>
                <button type="button" className="fc-date-btn" onClick={() => setShowCal(true)}>
                  <span>{fechaExpedicion ? formatDate(fechaExpedicion) : "Selecciona la fecha"}</span>
                  <span>▾</span>
                </button>
              </div>
            </div>
          </div>

          {pdfBlob && (
            <div className="fc-pdf-preview">
              <iframe src={pdfBlob} title="Vista previa del convenio" className="fc-iframe" />
            </div>
          )}

          {error && <p className="fc-error">{error}</p>}

          <div className="fc-actions">
            {!pdfBlob ? (
              <button type="button" className="fc-btn-primary" onClick={handleContinuar} disabled={loading}>
                {loading ? "Generando PDF..." : "Continuar"}
              </button>
            ) : (
              <button type="button" className="fc-btn-primary" onClick={handleFirmar} disabled={firmando}>
                {firmando ? "Enviando a ZapSign..." : "Firmar documento"}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}