import { useState, useEffect } from "react";
import { getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import { useUser } from "../UserContext";
import "./Sidebar.css";

const BASE = "https://storage.googleapis.com/flutterflow-io-6f20.appspot.com/projects/alianza-b7y88v/assets/";

const IconInicio = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <rect x="3" y="12" width="4" height="9" rx="1" fill="white"/>
    <rect x="10" y="7" width="4" height="14" rx="1" fill="white"/>
    <rect x="17" y="3" width="4" height="18" rx="1" fill="white"/>
  </svg>
);

const IconAhorro = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="9" stroke="white" strokeWidth="1.8"/>
    <text x="12" y="17" textAnchor="middle" fill="white" fontSize="12" fontWeight="700">$</text>
  </svg>
);

const IconCredito = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <rect x="2" y="5" width="20" height="14" rx="2" stroke="white" strokeWidth="1.8"/>
    <line x1="2" y1="9" x2="22" y2="9" stroke="white" strokeWidth="1.8"/>
  </svg>
);

const IconInversiones = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <rect x="3" y="12" width="4" height="9" rx="1" fill="white"/>
    <rect x="10" y="7" width="4" height="14" rx="1" fill="white"/>
    <rect x="17" y="3" width="4" height="18" rx="1" fill="white"/>
  </svg>
);

const profileIconProps = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "#1d4ed8",
  strokeWidth: "1.8",
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

const IconBuilding = () => (
  <svg {...profileIconProps}>
    <path d="M4 21h16" />
    <path d="M6 21V7l6-3 6 3v14" />
    <path d="M10 11h1M13 11h1M10 15h1M13 15h1" />
    <path d="M11 21v-4h2v4" />
  </svg>
);

const IconIdCard = () => (
  <svg {...profileIconProps}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <circle cx="9" cy="12" r="2" />
    <path d="M14 10h4M14 14h3" />
  </svg>
);

const IconPhone = () => (
  <svg {...profileIconProps}>
    <path d="M7 3h4l1.5 4-2.5 1.5a12 12 0 0 0 5.5 5.5L17.5 11.5 21.5 13v4a2 2 0 0 1-2 2A15 15 0 0 1 5 5a2 2 0 0 1 2-2z" />
  </svg>
);

const IconGlobe = () => (
  <svg {...profileIconProps}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
  </svg>
);

const IconCity = () => (
  <svg {...profileIconProps}>
    <path d="M4 21V10l5-3v14M9 21V7l6-3v17M15 21V11l5 2v8" />
    <path d="M6.5 13h1M6.5 16h1M11.5 11h1M11.5 14h1M17.5 15h1M17.5 18h1" />
  </svg>
);

const IconBriefcase = () => (
  <svg {...profileIconProps}>
    <rect x="3" y="8" width="18" height="12" rx="2" />
    <path d="M8 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18" />
  </svg>
);

const IconUsers = () => (
  <svg {...profileIconProps}>
    <circle cx="9" cy="8" r="3" />
    <path d="M3 20v-1a5 5 0 0 1 10 0v1" />
    <circle cx="17" cy="9" r="2.5" />
    <path d="M21 20v-1a4 4 0 0 0-3-3.87" />
  </svg>
);

const IconMapPin = () => (
  <svg {...profileIconProps}>
    <path d="M12 21s-7-5.5-7-11a7 7 0 1 1 14 0c0 5.5-7 11-7 11z" />
    <circle cx="12" cy="10" r="2.5" />
  </svg>
);

const IconMail = () => (
  <svg {...profileIconProps}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M3 7l9 7 9-7" />
  </svg>
);

const IconLink = () => (
  <svg {...profileIconProps}>
    <path d="M10 13a5 5 0 0 0 7.07 0l2.12-2.12a5 5 0 0 0-7.07-7.07L10.5 5.43" />
    <path d="M14 11a5 5 0 0 0-7.07 0L4.8 13.12a5 5 0 0 0 7.07 7.07L13.5 18.57" />
  </svg>
);

const IconPerson = () => (
  <svg {...profileIconProps}>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5 20v-1a7 7 0 0 1 14 0v1" />
  </svg>
);

const IconHash = () => (
  <svg {...profileIconProps}>
    <path d="M5 9h14M5 15h14M10 3l-2 18M16 3l-2 18" />
  </svg>
);

const IconLogout = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" />
    <path d="M16 8l4 4-4 4M20 12H10" />
  </svg>
);

const menuItems = [
  {
    section: "PERSONAS",
    items: [
      {
        label: "Ahorro",
        icon: <IconAhorro />,
        submenu: ["Ahorro nomina", "Detalle de movimientos", "Historial de novedades"],
      },
      {
        label: "Crédito",
        icon: <IconCredito />,
        submenu: ["Solicitud de crédito", "Cartera"],
      },
    ],
  },
  {
    section: "EMPRESA",
    items: [
      {
        label: "Inversiones",
        icon: <IconInversiones />,
        submenu: ["Renta Fija"],
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
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
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
                <Field icon={<IconBuilding />} label="Razón Social" value={empresa?.razonsocial} />
                <Field icon={<IconIdCard />} label="NIT" value={empresa?.nit} />
                <Field icon={<IconPhone />} label="Teléfono 1" value={empresa?.telefono1} />
                <Field icon={<IconPhone />} label="Teléfono 2" value={empresa?.telefono2} />
                <Field icon={<IconGlobe />} label="País" value={empresa?.pais} />
                <Field icon={<IconCity />} label="Ciudad" value={empresa?.ciudad} />
                <Field icon={<IconBriefcase />} label="Actividad" value={empresa?.actividad} />
                <Field icon={<IconUsers />} label="Empleados" value={empresa?.numeroEmpleados} />
                <Field icon={<IconMapPin />} label="Dirección" value={empresa?.direccion} />
                <Field icon={<IconMail />} label="Email" value={empresa?.correo} />
                <Field icon={<IconLink />} label="Sitio web" value={empresa?.web} />
              </div>
            </div>
            {representante && (
              <div className="modal-section">
                <h3 className="modal-section-title">Representante legal</h3>
                <div className="modal-divider" />
                <div className="modal-grid">
                  <Field icon={<IconPerson />} label="Apellidos y Nombres" value={representante?.name} />
                  <Field icon={<IconMail />} label="Correo electrónico" value={representante?.email} />
                  <Field icon={<IconIdCard />} label="Tipo de documento" value={representante?.typoDeDocumento} />
                  <Field icon={<IconHash />} label="Número de documento" value={representante?.numeroDeDocumento} />
                </div>
              </div>
            )}
            <div className="modal-logout">
              <button className="btn-logout" onClick={handleLogout}>
                <IconLogout />
                Cerrar Sesión
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
      <div className={`sidebar-wrapper ${collapsed ? "collapsed" : ""}`}>

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
              <button className="sidebar-collapse-btn" onClick={() => setCollapsed(true)}>
                ‹
              </button>
            )}
          </div>

          {/* Inicio */}
          <div
            className={`sidebar-item ${activeItem === "General" ? "sidebar-item-active" : ""}`}
            onClick={() => onNavigate && onNavigate("General")}
          >
            <div className="sidebar-item-icon">
              <IconInicio />
            </div>
            <span className="sidebar-item-label">Inicio</span>
          </div>

          {/* Secciones */}
          {menuItems.map((group) => (
            <div key={group.section} className="sidebar-group">
              <p className="sidebar-section-title">{group.section}</p>

              {group.items.map((item) => {
                const isOpen = openMenu === item.label || isParentActive(item);
                const isActive = activeItem === item.label || isParentActive(item);

                return (
                  <div key={item.label}>
                    <div
                      className={`sidebar-item ${isActive ? "sidebar-item-active" : ""}`}
                      onClick={() => handleItemClick(item)}
                    >
                      <div className="sidebar-item-icon">
                        {item.icon}
                      </div>
                      <span className="sidebar-item-label">{item.label}</span>
                      {item.submenu.length > 0 && (
                        <span className={`sidebar-item-arrow ${isOpen ? "open" : ""}`}>
                          ›
                        </span>
                      )}
                    </div>

                    {item.submenu.length > 0 && isOpen && (
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
                );
              })}
            </div>
          ))}
        </aside>

        {/* Footer */}
        <div className={`sidebar-footer-zone ${collapsed ? "collapsed" : ""}`}>

          <div className="sfw-item" onClick={() => onNavigate && onNavigate("Firmar convenio")}>
            <span className="sfw-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <rect x="4" y="2" width="16" height="20" rx="2" stroke="#262632" strokeWidth="1.8"/>
                <line x1="8" y1="8" x2="16" y2="8" stroke="#262632" strokeWidth="1.5"/>
                <line x1="8" y1="12" x2="16" y2="12" stroke="#262632" strokeWidth="1.5"/>
                <line x1="8" y1="16" x2="12" y2="16" stroke="#262632" strokeWidth="1.5"/>
              </svg>
            </span>
            <span className="sfw-text">Firmar convenio</span>
            <span className="sfw-arrow">›</span>
          </div>

          <div className="sfw-item">
            <span className="sfw-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 3C7.03 3 3 7.03 3 12v4a2 2 0 002 2h1a2 2 0 002-2v-2a2 2 0 00-2-2H5v-1a7 7 0 0114 0v1h-1a2 2 0 00-2 2v2a2 2 0 002 2h1a2 2 0 002-2v-4c0-4.97-4.03-9-9-9z" stroke="#262632" strokeWidth="1.8" fill="none"/>
              </svg>
            </span>
            <span className="sfw-text">Soporte</span>
            <span className="sfw-arrow">›</span>
          </div>

          <div className="sfw-divider" />

          <div className="sfw-profile">
            <div className="sfw-avatar">{getInitials()}</div>
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

          <button type="button" className="sfw-logout" onClick={handleLogout}>
            <span className="sfw-logout-icon">↪</span>
            <span className="sfw-logout-text">Cerrar sesión</span>
          </button>

        </div>
      </div>

      {showProfile && (
        <ProfileModal onClose={() => setShowProfile(false)} userData={userData} />
      )}
    </>
  );
}