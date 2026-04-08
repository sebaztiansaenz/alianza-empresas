import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from './firebase'
import { useUser } from './UserContext'
import Login from './components/Login'
import Dashboard from './components/Dashboard'
import RecuperarContrasena from './components/RecuperarContrasena'
import RegistroEmpresa from './components/RegistroEmpresa'

const VIDEO_URL = import.meta.env.VITE_VIDEO_URL || "https://firebasestorage.googleapis.com/v0/b/alianza-b7y88v.appspot.com/o/video_corporativo%20(1).mp4?alt=media&token=8c70952e-aa43-42f9-a74a-2d93ecad83d7";

function SplashScreen({ onFinish }) {
  const [progreso, setProgreso] = useState(0);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    let p = 0;
    const intervalo = setInterval(() => {
      p += 1;
      if (p >= 100) { p = 100; clearInterval(intervalo); }
      setProgreso(p);
    }, 70);

    const timer = setTimeout(() => {
      setFading(true);
      setTimeout(() => onFinish(), 1000);
    }, 7000);

    return () => { clearInterval(intervalo); clearTimeout(timer); };
  }, []);

  return (
    <>
      <style>{`@keyframes textReveal { to { opacity: 1; transform: translateY(0); } }`}</style>
      <div style={{
        position: "fixed", top: 0, left: 0,
        width: "100vw", height: "100vh",
        zIndex: 9999, display: "flex",
        flexDirection: "column",
        justifyContent: "center", alignItems: "center",
        opacity: fading ? 0 : 1,
        transition: "opacity 1s ease-in-out",
        fontFamily: "'Inter', sans-serif",
      }}>
        <video autoPlay loop muted playsInline style={{
          position: "absolute", top: 0, left: 0,
          width: "100%", height: "100%",
          objectFit: "cover", zIndex: -2,
        }}>
          <source src={VIDEO_URL} type="video/mp4" />
        </video>

        <div style={{
          position: "absolute", top: 0, left: 0,
          width: "100%", height: "100%",
          background: "rgba(15, 23, 42, 0.75)", zIndex: -1,
        }} />

        <div style={{
          textAlign: "center", maxWidth: "800px",
          padding: "0 20px", marginBottom: "60px",
        }}>
          <p style={{
            display: "block", fontSize: "32px", fontWeight: 300,
            color: "#ffffff", marginBottom: "12px",
            animation: "textReveal 1s cubic-bezier(0.2,0.8,0.2,1) forwards 0.5s",
            opacity: 0, transform: "translateY(20px)",
          }}>
            Pensando en una alternativa para tus colaboradores...
          </p>
          <p style={{
            display: "block", fontSize: "42px", fontWeight: 600,
            color: "#f97316",
            animation: "textReveal 1s cubic-bezier(0.2,0.8,0.2,1) forwards 2s",
            opacity: 0, transform: "translateY(20px)",
          }}>
            Rápida, ágil,{" "}
            <span style={{ color: "#ffffff", fontWeight: 300 }}>100% digital</span>
            {" "}y a un clic.
          </p>
        </div>

        <div style={{
          position: "absolute", bottom: "60px",
          width: "100%", maxWidth: "350px",
        }}>
          <div style={{
            display: "flex", justifyContent: "space-between",
            color: "#cbd5e1", fontSize: "12px",
            marginBottom: "8px", textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}>
            <span>Cargando Core empresarial...</span>
            <span style={{ fontWeight: 600, color: "#f97316" }}>{progreso}%</span>
          </div>
          <div style={{
            width: "100%", height: "3px",
            background: "rgba(255,255,255,0.15)",
            borderRadius: "2px", overflow: "hidden",
          }}>
            <div style={{
              height: "100%", width: `${progreso}%`,
              background: "#f97316", borderRadius: "2px",
              transition: "width 0.07s linear",
            }} />
          </div>
        </div>
      </div>
    </>
  );
}

function App() {
  const [loggedIn, setLoggedIn] = useState(false)
  const [checking, setChecking] = useState(true)
  const [showSplash, setShowSplash] = useState(false)
  const { setUserData } = useUser()

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "user", user.uid))
          if (userDoc.exists()) {
            const userData = userDoc.data()
            if (userData.userType === "CompanyAdmin") {
              setUserData({
                ...userData,
                uid: user.uid,
                empresaId: userData.empresaref?.id,
                empresaRef: userData.empresaref,
              })
              setLoggedIn(true)
            } else {
              await auth.signOut()
              setLoggedIn(false)
            }
          } else {
            await auth.signOut()
            setLoggedIn(false)
          }
        } catch (err) {
          console.error(err)
          setLoggedIn(false)
        }
      } else {
        setLoggedIn(false)
      }
      setChecking(false)
    })

    return () => unsub()
  }, [])

  const handleLoginSuccess = () => {
    setShowSplash(true)
  }

  const handleSplashFinish = () => {
    setShowSplash(false)
    setLoggedIn(true)
  }

  if (checking) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'center', height: '100vh',
        background: '#F2F4F8', flexDirection: 'column',
        gap: '16px', fontFamily: 'Satoshi, sans-serif'
      }}>
        <div style={{
          width: '48px', height: '48px',
          border: '4px solid #F2F4F8',
          borderTop: '4px solid #006AD8',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ color: '#262632', margin: 0 }}>Cargando...</p>
      </div>
    )
  }

  if (showSplash) {
    return <SplashScreen onFinish={handleSplashFinish} />
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          loggedIn
            ? <Navigate to="/dashboard" replace />
            : <Login onLogin={handleLoginSuccess} />
        }
      />
      <Route
        path="/dashboard/*"
        element={
          loggedIn
            ? <Dashboard />
            : <Navigate to="/login" replace />
        }
      />
      <Route path="/recuperar-contrasena" element={<RecuperarContrasena />} />
      <Route path="/registro" element={<RegistroEmpresa />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default App