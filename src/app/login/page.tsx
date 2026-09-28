"use client";

import { useState } from "react";

export default function LoginPage() {
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Convertimos estrictamente a MAYÚSCULAS el usuario ingresado
    const userClean = usuario.trim().toUpperCase();
    const passClean = password.trim();

    // Lista de usuarios permitidos y sus roles exactos
    const usuariosValidos: { [key: string]: { rol: "OPERATIVO" | "EXTERNO"; nombre: string } } = {
      "JOEL.PIZARRO": { rol: "OPERATIVO", nombre: "Joel Pizarro" },
      "SAORI.AQUINO": { rol: "OPERATIVO", nombre: "Saori Aquino" },
      "ISABEL.RIOS": { rol: "OPERATIVO", nombre: "Isabel Rios" },
      "ALONSO.CORTEZ": { rol: "OPERATIVO", nombre: "Alonso Cortez" },
      "RUTH.UGARTE": { rol: "OPERATIVO", nombre: "Ruth Ugarte" },
      "CINTHIA.SIRLOPU": { rol: "EXTERNO", nombre: "Cinthia Sirlopu" },
      "ENRIQUE.JARA": { rol: "EXTERNO", nombre: "Enrique Jara" },
    };

    const empleado = usuariosValidos[userClean];

    if (empleado && passClean === userClean) {
      // Guardamos la sesión activa en el navegador
      localStorage.setItem("usuarioLogueado", JSON.stringify(empleado));
      
      // Redirigimos según su rol
      if (empleado.rol === "OPERATIVO") {
        window.location.href = "/pedidos";
      } else {
        window.location.href = "/inventarios"; // Los externos ven inventarios / estados
      }
    } else {
      setError("❌ Usuario o contraseña incorrectos. Recuerda usar mayúsculas (Ej. SAORI.AQUINO).");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#243c5a] to-[#1a2b4c] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-8">
        
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[#243c5a]">Sistema Notarial - Tomos & Archivo</h1>
          <p className="text-xs text-gray-500 mt-2">Ingrese sus credenciales institucionales (Mayúsculas obligatorias)</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 text-xs rounded font-medium text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label className="block text-xs font-bold text-gray-700 mb-1">Usuario:</label>
            <input 
              type="text" 
              required
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              placeholder="Ej. SAORI.AQUINO"
              className="w-full border p-3 rounded text-sm uppercase outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-gray-800"
            />
          </div>

          <div className="mb-6">
            <label className="block text-xs font-bold text-gray-700 mb-1">Contraseña:</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full border p-3 rounded text-sm outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
            />
          </div>

          <button 
            type="submit" 
            className="w-full bg-[#243c5a] hover:bg-[#1a2b4c] text-white font-bold py-3 rounded text-sm transition-colors shadow-md"
          >
            Iniciar Sesión
          </button>
        </form>

        <div className="mt-6 text-center border-t pt-4">
          <p className="text-[11px] text-gray-400">Control de Acceso Seguro - Notaría Bertello</p>
        </div>

      </div>
    </div>
  );
}