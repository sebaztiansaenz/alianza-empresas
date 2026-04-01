import { useState, useEffect } from "react";
import { getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import { useUser } from "../UserContext";
import "./Sidebar.css";

const BASE = "https://storage.googleapis.com/flutterflow-io-6f20.appspot.com/projects/alianza-b7y88v/assets/";

const menuItems = [
  {
    section: "GESTIÓN FINANCIERA",
    items: [
      {
        label: "Ahorro",
        icon: BASE + "fm18iq2qdd3q/Button_(3).png",
        submenu: ["Ahorro nomina", "Detalle de movimientos", "Historial de novedades"]
      },
    ],
  },
];

function Field({ icon, label, value }) {
  return (
    <div className="modal-field">
      <div className="modal-field-icon">{icon}</div>
      <div className="modal-field-text">
        <span className="modal-field-label">{label}</span>
        <span className="modal-field-value">{value || "Sin datos"}</span>
      </div>
    </div>
  );
}

function ProfileModal({ onClose, userData }) {
  const [empresa, setEmpresa] = useState(null);
  const [representante, setRepresentante] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEmpresa = async () => {
      try {
        if (!userData?.empresaRef) return;
        const empSnap = await getDoc(userData.empresaRef);
        if (empSnap.exists()) setEmpresa(empSnap.data());
        const repQuery = query(
          collection(db, "empresaRepresentative"),
          where("empresaRef", "==", userData.empresaRef)
        );
        const repSnap = await getDocs(repQuery);
        if (!repSnap.empty) setRepresentante(repSnap.docs[0].data());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchEmpresa();
  }, [userData]);

  const handleLogout = async () => {
    await signOut(auth);
    window.location.href = "/login";
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Perfil</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        {loading ? (
          <div className="modal-loading">
            <div className="loading-spinner" />
          </div>
        ) : (
          <>
            <div className="modal-section">
              <h3 className="modal-section-title">Datos de la empresa</h3>
              <div className="modal-divider" />
              <div className="modal-grid">
                <Field icon="🏢" label="Razón Social" value={empresa?.razonsocial} />
                <Field icon="🪪" label="NIT" value={empresa?.nit} />
                <Field icon="📞" label="Teléfono 1" value={empresa?.telefono1} />
                <Field icon="📞" label="Teléfono 2" value={empresa?.telefono2} />
                <Field icon="🌎" label="País" value={empresa?.pais} />
                <Field icon="🏙️" label="Ciudad" value={empresa?.ciudad} />
                <Field icon="⚙️" label="Actividad" value={empresa?.actividad} />
                <Field icon="👥" label="Empleados" value={empresa?.numeroEmpleados} />
                <Field icon="📍" label="Dirección" value={empresa?.direccion} />
                <Field icon="✉️" label="Email" value={empresa?.correo} />
                <Field icon="🌐" label="Sitio web" value={empresa?.web} />
              </div>
            </div>
            {representante && (
              <div className="modal-section">
                <h3 className="modal-section-title">Representante legal</h3>
                <div className="modal-divider" />
                <div className="modal-grid">
                  <Field icon="👤" label="Apellidos y Nombres" value={representante?.name} />
                  <Field icon="✉️" label="Correo electrónico" value={representante?.email} />
                  <Field icon="🪪" label="Tipo de documento" value={representante?.typoDeDocumento} />
                  <Field icon="🔢" label="Número de documento" value={representante?.numeroDeDocumento} />
                </div>
              </div>
            )}
            <div className="modal-logout">
              <button className="btn-logout" onClick={handleLogout}>
                🚪 Cerrar Sesión
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function Sidebar({ activeItem, onNavigate }) {
  const [openMenu, setOpenMenu] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const { userData } = useUser();

  const handleItemClick = (item) => {
    if (item.submenu && item.submenu.length > 0) {
      setOpenMenu(openMenu === item.label ? null : item.label);
      onNavigate && onNavigate(item.label);
    } else {
      onNavigate && onNavigate(item.label);
    }
  };

  const isParentActive = (item) => {
    if (!item.submenu) return false;
    return item.submenu.includes(activeItem);
  };

  const handleLogout = async () => {
    await signOut(auth);
    window.location.href = "/login";
  };

  const getInitials = () => {
    const name = userData?.display_name || userData?.CompayName || "E";
    return name.charAt(0).toUpperCase();
  };

  return (
    <>
      <div className="sidebar-wrapper">

        {/* Sidebar azul — solo menú */}
        <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>

          {/* Logo */}
          <div className="sidebar-logo">
            <div
              className="sidebar-logo-icon"
              onClick={() => collapsed && setCollapsed(false)}
            >
              <img src={BASE + "0wo1ennxf6wk/Button.png"} alt="Logo" />
            </div>
            <div className="sidebar-logo-text">
              <span className="sidebar-logo-bold">Alianza</span>
              <span className="sidebar-logo-light">Empresas</span>
            </div>
            {!collapsed && (
              <button
                className="sidebar-collapse-btn"
                onClick={() => setCollapsed(true)}
              >
                ‹
              </button>
            )}
          </div>

          {/* General */}
          <div
            className={`sidebar-item ${activeItem === "General" ? "sidebar-item-active" : ""}`}
            onClick={() => { onNavigate && onNavigate("General"); }}
          >
            <div className="sidebar-item-icon">
              <img src={BASE + "zja0fynvi1oj/Button_(1).png"} alt="General" />
            </div>
            <span className="sidebar-item-label">General</span>
          </div>

          {/* Secciones */}
          {menuItems.map((group) => (
            <div key={group.section} className="sidebar-group">
              <p className="sidebar-section-title">{group.section}</p>
              {group.items.map((item) => (
                <div key={item.label}>
                  <div
                    className={`sidebar-item ${activeItem === item.label || isParentActive(item) ? "sidebar-item-active" : ""}`}
                    onClick={() => handleItemClick(item)}
                  >
                    <div className="sidebar-item-icon">
                      <img src={item.icon} alt={item.label} />
                    </div>
                    <span className="sidebar-item-label">{item.label}</span>
                    {item.submenu.length > 0 && (
                      <span className={`sidebar-item-arrow ${openMenu === item.label || isParentActive(item) ? "open" : ""}`}>
                        ›
                      </span>
                    )}
                  </div>
                  {item.submenu.length > 0 && (openMenu === item.label || isParentActive(item)) && (
                    <div className="sidebar-submenu">
                      {item.submenu.map((sub) => (
                        <div
                          key={sub}
                          className={`sidebar-subitem ${activeItem === sub ? "sidebar-subitem-active" : ""}`}
                          onClick={() => onNavigate && onNavigate(sub)}
                        >
                          <span className="sidebar-subitem-dot">›</span>
                          <span>{sub}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}

        </aside>

        {/* Zona blanca — footer separado */}
        <div className={`sidebar-footer-zone ${collapsed ? "collapsed" : ""}`}>

          {/* Firmar convenio — AGREGADO onClick */}
          <div className="sfw-item" onClick={() => onNavigate && onNavigate("Firmar convenio")}>
            <span className="sfw-icon">📄</span>
            <span className="sfw-text">Firmar convenio</span>
            <span className="sfw-arrow">›</span>
          </div>

          {/* Soporte */}
          <div className="sfw-item">
            <span className="sfw-icon">🎧</span>
            <span className="sfw-text">Soporte</span>
            <span className="sfw-arrow">›</span>
          </div>

          <div className="sfw-divider" />

          {/* Perfil */}
          <div className="sfw-profile">
            <div className="sfw-avatar">
              {getInitials()}
            </div>
            <div className="sfw-profile-info">
              <p className="sfw-name">
                {userData?.display_name || userData?.CompayName || "Empresa"}
              </p>
              <p className="sfw-role">Usuario administrador</p>
            </div>
            <button
              type="button"
              className="sfw-settings"
              onClick={() => setShowProfile(true)}
            >
              ⚙️
            </button>
          </div>

          <div className="sfw-divider" />

          {/* Cerrar sesión */}
          <button
            type="button"
            className="sfw-logout"
            onClick={handleLogout}
          >
            <span className="sfw-logout-icon">↪</span>
            <span className="sfw-logout-text">Cerrar sesión</span>
          </button>

        </div>

      </div>

      {showProfile && (
        <ProfileModal
          onClose={() => setShowProfile(false)}
          userData={userData}
        />
      )}
    </>
  );
}