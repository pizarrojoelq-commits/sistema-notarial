"use client";

import { useState } from "react";

export default function LoginPage() {
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

 const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    const userClean = usuario.trim().toUpperCase();
    const passClean = password.trim();

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
      localStorage.setItem("usuarioLogueado", JSON.stringify(empleado));
      
      // ALERTA DE PRUEBA: Esto te dirá exactamente qué rol detectó y a dónde va a saltar
      alert(`Usuario reconocido: ${empleado.nombre} | Rol: ${empleado.rol}. Redirigiendo...`);

      if (empleado.rol === "OPERATIVO") {
        window.location.href = "/pedidos";
      } else {
        window.location.href = "/solicitud"; // Aquí debería ir a la raíz (formulario)
      }
    } else {
      setError("❌ Usuario o contraseña incorrectos. Recuerda usar mayúsculas.");
    }
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#243c5a] to-[#1a2b4c] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[#243c5a]">Sistema Notarial - Tomos & Archivo</h1>
          <p className="text-xs text-gray-500 mt-2">Ingrese sus credenciales institucionales</p>
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
              placeholder="Ej. CINTHIA.SIRLOPU"
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
            className="w-full bg-[#243c5a] hover:bg-[#1a2b4c] text-white font-bold py-3 rounded text-sm transition-colors shadow-md cursor-pointer"
          >
            Iniciar Sesión
          </button>
        </form>
      </div>
    </div>
  );
}