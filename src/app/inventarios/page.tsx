"use client";

import { useState, useEffect } from "react";
// Importamos nuestras bases de datos reales generadas
import escriturasDB from "../../data/escrituras_db.json";
import minutasDB from "../../data/minutas_db.json";

export default function ConsultaInventarios() {
  const [subTab, setSubTab] = useState<"ESCRITURAS" | "MINUTAS">("ESCRITURAS");
  const [busqueda, setBusqueda] = useState("");
  const [isMounted, setIsMounted] = useState(false);
  const [usuarioActual, setUsuarioActual] = useState<{ nombre: string; rol: string } | null>(null);

  // Estados dinámicos para los tomos que están prestados o fuera
  const [tomosOcupados, setTomosOcupados] = useState<string[]>([]);

  useEffect(() => {
    setIsMounted(true);

    // Validación de sesión de usuario
    const sesion = localStorage.getItem("usuarioLogueado");
    if (!sesion) {
      window.location.href = "/login"; // Si no hay sesión, redirige al login
    } else {
      setUsuarioActual(JSON.parse(sesion));
    }

    // Leemos los movimientos guardados para el inventario
    const movimientos = JSON.parse(localStorage.getItem("movimientosTomos") || "[]");
    
    const estadoTomos: { [key: string]: boolean } = {}; 

    movimientos.forEach((m: any) => {
      const clave = m.tomoExacto.toLowerCase().trim();
      
      if (m.tipo === "SALIDAS" && m.estado === "Entregado (Fuera)") {
        estadoTomos[clave] = true; 
      } 
      else if (m.tipo === "ENTRADAS" && m.estado === "Devuelto a Archivo Principal (BERTELLO)") {
        estadoTomos[clave] = false; 
      }
    });

    const ocupados = Object.keys(estadoTomos).filter(tomo => estadoTomos[tomo] === true);
    setTomosOcupados(ocupados);
  }, []);

  const cerrarSesion = () => {
    localStorage.removeItem("usuarioLogueado");
    window.location.href = "/login";
  };

  if (!isMounted) return null;

  // Filtrado dinámico de escrituras
  const escriturasFiltradas = escriturasDB.filter((e: any) => {
    const texto = `${e.tomo} ${e.anio} ${e.rangoFolios}`.toLowerCase();
    return texto.includes(busqueda.toLowerCase());
  });

  // Filtrado dinámico de minutas
  const minutasFiltradas = minutasDB.filter((m: any) => {
    const texto = `${m.tomo} ${m.anio} ${m.rangoMinutas}`.toLowerCase();
    return texto.includes(busqueda.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="w-full max-w-[95%] mx-auto bg-white shadow-md rounded-sm overflow-hidden p-6">
        
        {/* Encabezado con Control de Sesión */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-6 mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#243c5a]">Consulta General de Inventarios</h1>
            <p className="text-sm text-gray-500 mt-1">
              Visualización en tiempo real del estado físico de Tomos de Escrituras y Minutas (BERTELLO).
            </p>
          </div>
          
          <div className="flex items-center gap-3 flex-wrap">
            <a href="/pedidos" className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded text-xs transition-colors">
              Panel de Pedidos
            </a>
            <a href="/salidas" className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded text-xs transition-colors">
              Entradas y Salidas
            </a>

            {usuarioActual && (
              <span className="text-xs font-semibold text-gray-700 bg-gray-100 px-3 py-2 rounded border">
                👤 {usuarioActual.nombre}
              </span>
            )}
            <button 
              onClick={cerrarSesion}
              className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-3 rounded text-xs transition-colors shadow-sm"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>

        {/* Sub-pestañas de Inventarios */}
        <div className="flex justify-between items-center mb-6 flex-wrap gap-4 border-b pb-4">
          <div className="flex gap-2">
            <button 
              onClick={() => { setSubTab("ESCRITURAS"); setBusqueda(""); }}
              className={`py-2 px-6 font-bold text-sm border-b-2 transition-colors ${subTab === "ESCRITURAS" ? "border-blue-600 text-blue-600 bg-blue-50/50" : "border-transparent text-gray-500 hover:text-gray-700"}`}
            >
              📖 Inventario de Escrituras ({escriturasDB.length})
            </button>
            <button 
              onClick={() => { setSubTab("MINUTAS"); setBusqueda(""); }}
              className={`py-2 px-6 font-bold text-sm border-b-2 transition-colors ${subTab === "MINUTAS" ? "border-blue-600 text-blue-600 bg-blue-50/50" : "border-transparent text-gray-500 hover:text-gray-700"}`}
            >
              📑 Inventario de Minutas ({minutasDB.length})
            </button>
          </div>

          {/* Barra de Búsqueda Rápida */}
          <div>
            <input 
              type="text"
              placeholder="Buscar por Tomo o Año..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="border p-2 rounded text-xs w-64 outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* TABLA DE ESCRITURAS */}
        {subTab === "ESCRITURAS" && (
          <div className="overflow-x-auto pb-4">
            <table className="w-full text-center border-collapse text-[11px] border border-gray-300">
              <thead className="bg-[#243c5a] text-white">
                <tr>
                  <th className="border border-gray-300 p-2">Tomo</th>
                  <th className="border border-gray-300 p-2">Año</th>
                  <th className="border border-gray-300 p-2">Rango de Folios</th>
                  <th className="border border-gray-300 p-2">Folio Inicial</th>
                  <th className="border border-gray-300 p-2">Folio Final</th>
                  <th className="border border-gray-300 p-2">Estado Físico Actual</th>
                </tr>
              </thead>
              <tbody>
                {escriturasFiltradas.length === 0 && (
                  <tr><td colSpan={6} className="p-6 text-gray-400 font-medium">No se encontraron resultados.</td></tr>
                )}
                {escriturasFiltradas.map((item: any, idx: number) => {
                  const nombreTomoStr = `tomo ${item.tomo}`.toLowerCase();
                  const estaFuera = tomosOcupados.some(t => t.includes(nombreTomoStr) && t.includes("escritura"));
                  
                  return (
                    <tr key={idx} className={estaFuera ? "bg-amber-50 font-medium" : "hover:bg-gray-50"}>
                      <td className="border border-gray-300 p-2 font-bold text-indigo-900">Tomo {item.tomo}</td>
                      <td className="border border-gray-300 p-2">{item.anio}</td>
                      <td className="border border-gray-300 p-2">{item.rangoFolios}</td>
                      <td className="border border-gray-300 p-2">{item.folioInicial}</td>
                      <td className="border border-gray-300 p-2">{item.folioFinal}</td>
                      <td className="border border-gray-300 p-2 font-bold">
                        {estaFuera ? (
                          <span className="bg-amber-600 text-white px-2 py-1 rounded text-[10px] shadow-sm animate-pulse">
                            ⚠️ NO DISPONIBLE (Prestado / Fuera)
                          </span>
                        ) : (
                          <span className="bg-green-600 text-white px-2 py-1 rounded text-[10px] shadow-sm">
                            ✓ DISPONIBLE (En Archivo)
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* TABLA DE MINUTAS */}
        {subTab === "MINUTAS" && (
          <div className="overflow-x-auto pb-4">
            <table className="w-full text-center border-collapse text-[11px] border border-gray-300">
              <thead className="bg-[#243c5a] text-white">
                <tr>
                  <th className="border border-gray-300 p-2">Tomo</th>
                  <th className="border border-gray-300 p-2">Año</th>
                  <th className="border border-gray-300 p-2">Rango de Minutas</th>
                  <th className="border border-gray-300 p-2">Minuta Inicial</th>
                  <th className="border border-gray-300 p-2">Minuta Final</th>
                  <th className="border border-gray-300 p-2">Estado Físico Actual</th>
                </tr>
              </thead>
              <tbody>
                {minutasFiltradas.length === 0 && (
                  <tr><td colSpan={6} className="p-6 text-gray-400 font-medium">No se encontraron resultados.</td></tr>
                )}
                {minutasFiltradas.map((item: any, idx: number) => {
                  const nombreTomoStr = `tomo ${item.tomo}`.toLowerCase();
                  const estaFuera = tomosOcupados.some(t => t.includes(nombreTomoStr) && t.includes("minuta"));

                  return (
                    <tr key={idx} className={estaFuera ? "bg-amber-50 font-medium" : "hover:bg-gray-50"}>
                      <td className="border border-gray-300 p-2 font-bold text-indigo-900">Tomo {item.tomo}</td>
                      <td className="border border-gray-300 p-2">{item.anio}</td>
                      <td className="border border-gray-300 p-2">{item.rangoMinutas}</td>
                      <td className="border border-gray-300 p-2">{item.minutaInicial || "-"}</td>
                      <td className="border border-gray-300 p-2">{item.minutaFinal || "-"}</td>
                      <td className="border border-gray-300 p-2 font-bold">
                        {estaFuera ? (
                          <span className="bg-amber-600 text-white px-2 py-1 rounded text-[10px] shadow-sm animate-pulse">
                            ⚠️ NO DISPONIBLE (Prestado / Fuera)
                          </span>
                        ) : (
                          <span className="bg-green-600 text-white px-2 py-1 rounded text-[10px] shadow-sm">
                            ✓ DISPONIBLE (En Archivo)
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
}