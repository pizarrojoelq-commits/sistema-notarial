"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setCargando(true);

    const userClean = usuario.trim().toUpperCase();
    const passClean = password.trim();

    try {
      const { data, error: dbError } = await supabase
        .from("usuarios")
        .select("*")
        .eq("usuario", userClean)
        .single();

      if (dbError || !data) {
        setError("❌ Usuario no registrado en el sistema.");
        setCargando(false);
        return;
      }

      if (data.password === passClean) {
        const empleado = {
          nombre: data.nombre,
          rol: data.rol as "OPERATIVO" | "EXTERNO"
        };

        localStorage.setItem("usuarioLogueado", JSON.stringify(empleado));

        if (empleado.rol === "OPERATIVO") {
          window.location.href = "/pedidos";
        } else {
          window.location.href = "/";
        }
      } else {
        setError("❌ Contraseña incorrecta. Verifique sus datos.");
        setCargando(false);
      }
    } catch (err) {
      console.error("Error en el login:", err);
      setError("❌ Error de conexión con la base de datos.");
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-8 relative border border-slate-100">
        
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#243c5a] text-white rounded-full mb-3 shadow-md">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h2 className="text-xs font-bold tracking-widest text-blue-800 uppercase">Notaría Berrospi Polo</h2>
          <h1 className="text-xl font-black text-slate-800 mt-1">Archivo Central & Pedidos</h1>
          <p className="text-xs text-slate-500 mt-1">Ingrese sus credenciales institucionales</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs rounded font-medium shadow-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label className="block text-xs font-bold text-slate-700 mb-1">Usuario:</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
              </span>
              <input 
                type="text" 
                required
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                placeholder="EJ. JOEL.PIZARRO"
                className="w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg text-xs uppercase outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-semibold text-slate-800 bg-slate-50/50"
              />
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-xs font-bold text-slate-700 mb-1">Contraseña:</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
              </span>
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-slate-800 bg-slate-50/50"
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={cargando}
            className="w-full bg-[#243c5a] hover:bg-[#1a2b4c] text-white font-bold py-3 rounded-lg text-xs tracking-wider uppercase transition-colors shadow-md cursor-pointer disabled:bg-slate-400 flex items-center justify-center gap-2"
          >
            {cargando ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Verificando...
              </>
            ) : (
              "Iniciar Sesión"
            )}
          </button>
        </form>

        <div className="mt-6 text-center border-t pt-4">
          <p className="text-[10px] text-slate-400">
            Notaría Berrospi Polo • Módulo de Gestión Documental y Archivo
          </p>
        </div>

      </div>
    </div>
  );
}