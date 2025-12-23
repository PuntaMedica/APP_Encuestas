// pages/index.js

"use client";

import React, { useState, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/navigation";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function Home() {
  const router = useRouter();

  // --- Estados de autenticación ---
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");

  // --- Estados de encuesta ---
  const hoy = new Date().toLocaleDateString("es-MX");
  const [nombre, setNombre] = useState("");
  const [respuestas, setRespuestas] = useState({});
  const [comentario, setComentario] = useState("");

  const preguntas = [
    "El trato y amabilidad del personal lo considera:",
    "Cómo considera la atención recibida por el personal (especialistas, médicos y enfermeras) durante su hospitalización:",
    "Los servicios e información brindada durante su estancia considera que fue:",
    "Funcionalidad, comodidad y limpieza del mobiliario:",
    "Cómo calificaría el servicio de alimentos:",
    "En general cómo califica el servicio de admisión:",
    "Evalúe globalmente la experiencia de su estancia hospitalaria en general:"
  ];

  const caritas = ["😭","😢","😐","🙂","😊","😁","🤩"];

  // Al montar, comprobamos localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const flag = localStorage.getItem("isLoggedIn") === "true";
      setIsLoggedIn(flag);
    }
    setCheckingAuth(false);
  }, []);

  // --- Manejo de login ---
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user, password })
      });
      if (res.ok) {
        localStorage.setItem("isLoggedIn", "true");
        setIsLoggedIn(true);
      } else {
        const { mensaje } = await res.json();
        toast.error(mensaje || "Credenciales inválidas");
      }
    } catch (err) {
      toast.error("Error de conexión");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");
    setIsLoggedIn(false);
  };

  // --- Manejo de encuesta ---
  const handleClick = (pregunta, value) => {
    setRespuestas(prev => ({ ...prev, [pregunta]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) {
      toast.error("Debe ingresar el nombre del paciente");
      return;
    }
    for (let pregunta of preguntas) {
      if (respuestas[pregunta] === undefined) {
        toast.error("Debe responder todas las preguntas");
        return;
      }
    }
    const data = { nombre, fecha: hoy, respuestas, comentario };
    try {
      await fetch("/api/guardar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      toast.success("Encuesta enviada");
      setNombre("");
      setRespuestas({});
      setComentario("");
    } catch {
      toast.error("Error al enviar encuesta");
    }
  };

  // Mientras comprobamos auth, no renderizamos nada
  if (checkingAuth) return null;

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Encuesta Hospital Punta Médica</title>
      </Head>

      <ToastContainer position="top-right" autoClose={3000} />

      {!isLoggedIn ? (
        // --- FORMULARIO DE LOGIN ---
        <div className="login-container">
          <h2>Iniciar Sesión</h2>
          <form onSubmit={handleLogin}>
            <div className="inputGroup">
              <label>Usuario:</label>
              <input
                type="text"
                value={user}
                onChange={e => setUser(e.target.value)}
                required
              />
            </div>
            <div className="inputGroup">
              <label>Contraseña:</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="loginBtn">Entrar</button>
          </form>
        </div>
      ) : (
        // --- ENCUESTA SATISFACCIÓN ---
        <div className="container">
          <button className="logoutBtn" onClick={handleLogout}>
            Cerrar sesión
          </button>
          <div className="card">
            <div className="header">
              <img src="/Logo.png" alt="Logo" className="logo" />
            </div>
            <h1>ENCUESTA SATISFACCIÓN CLIENTES HOSPITAL PUNTA MÉDICA</h1>
            <h3>HOSPITALIZACIÓN</h3>
            <div className="inputGroup">
              <label>Nombre del paciente:</label>
              <input
                type="text"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                required
              />
              <span>{hoy}</span>
            </div>
            <form onSubmit={handleSubmit}>
              {preguntas.map((pregunta, idx) => (
                <div key={idx} className="pregunta">
                  <p>{pregunta}</p>
                  <div className="opciones">
                    <span className="indicador">Nada Satisfactorio</span>
                    {caritas.map((cara, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleClick(pregunta, i)}
                        className={`opcionBtn ${respuestas[pregunta] === i ? "selected" : ""}`}
                      >
                        {cara}
                      </button>
                    ))}
                    <span className="indicador">Muy Satisfactorio</span>
                  </div>
                </div>
              ))}
              <div className="comentario">
                <p>
                  Sistema de notificación y análisis para mejorar la seguridad del servicio.
                  Ayúdenos a mejorar la calidad del servicio, descripción de queja,
                  sugerencia o felicitación.
                </p>
                <textarea
                  rows="4"
                  placeholder="Escribe aquí tu comentario (opcional)"
                  value={comentario}
                  onChange={e => setComentario(e.target.value)}
                />
              </div>
              <button type="submit" className="enviarBtn">Enviar Encuesta</button>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        /* --- Estilos Login --- */
        .login-container {
          max-width: 400px;
          margin: 100px auto;
          padding: 20px;
          background: #fff;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        .login-container h2 {
          text-align: center;
          margin-bottom: 20px;
        }
        .inputGroup {
          margin-bottom: 12px;
        }
        label {
          display: block;
          margin-bottom: 4px;
          font-weight: bold;
          color: #333;
        }
        input {
          width: 100%;
          padding: 8px;
          border: 1px solid #ccc;
          border-radius: 4px;
        }
        .loginBtn {
          width: 100%;
          padding: 10px;
          background: #40e0d0;
          border: none;
          border-radius: 4px;
          color: #fff;
          cursor: pointer;
        }

        /* --- Estilos Encuesta --- */
        .logoutBtn {
          position: absolute;
          top: 20px;
          right: 20px;
          background: transparent;
          border: 1px solid #333;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
        }
        .container {
          min-height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          background: #E0FFFF;
          padding: 20px;
        }
        .card {
          background: #fff;
          border-radius: 8px;
          padding: 30px;
          max-width: 800px;
          width: 100%;
          margin: auto;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
          display: flex;
          justify-content: center;
          margin-bottom: 20px;
        }
        .logo {
          width: 200px;
          height: auto;
        }
        h1, h3 {
          text-align: center;
        }
        .pregunta {
          margin-bottom: 20px;
        }
        .pregunta p {
          margin-bottom: 10px;
          font-weight: bold;
          color: #444;
        }
        .opciones {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
        }
        .indicador {
          font-size: 0.9em;
          color: #444;
        }
        .opcionBtn {
          padding: 8px 12px;
          border: 1px solid #ccc;
          border-radius: 4px;
          background: #fff;
          cursor: pointer;
          transition: background 0.3s, border-color 0.3s;
          color: #333;
          font-size: 1.2em;
        }
        .opcionBtn.selected {
          background: #40E0D0;
          border-color: #40E0D0;
          color: #fff;
        }
        .comentario p {
          font-weight: bold;
          color: #444;
          margin-bottom: 8px;
        }
        .comentario textarea {
          width: 100%;
          padding: 8px;
          border: 1px solid #ccc;
          border-radius: 4px;
          color: #333;
        }
        .enviarBtn {
          display: block;
          margin: 30px auto 0;
          padding: 10px 20px;
          background: #40E0D0;
          color: #fff;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          transition: background 0.3s;
        }
        .enviarBtn:hover {
          background: #2ec0b0;
        }
        @media (max-width: 600px) {
          .card {
            padding: 20px;
          }
          .inputGroup {
            flex-direction: column;
            align-items: flex-start;
          }
          .inputGroup input {
            margin: 10px 0;
          }
        }
      `}</style>
    </>
  );
}
