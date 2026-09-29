"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface ItemInventario {
  id: string | number;
  categoria: string;
  tomo: string;
  archivador: string;
  anio: string;
  rango: string;
  estado: "DISPONIBLE" | "NO DISPONIBLE";
}

export default function ControlInventarioTomos() {
  const [inventario, setInventario] = useState<ItemInventario[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("TODAS");
  const [filtroEstado, setFiltroEstado] = useState("TODOS");

  useEffect(() => {
    setIsMounted(true);
    cargarInventarioNube();
  }, []);

  const cargarInventarioNube = async () => {
    try {
      const { data, error } = await supabase
        .from("inventarios")
        .select("*")
        .order("id", { ascending: true });

      if (error) {
        console.error("Error al cargar inventario:", error);
        return;
      }

      if (data) {
        setInventario(data);
      }
    } catch (e) {
      console.error("Error de conexión:", e);
    }
  };

  if (!isMounted) return null;

  // Estadísticas y Reportes en tiempo real
  const totalTomos = inventario.length;
  const tomosDisponibles = inventario.filter(i => i.estado === "DISPONIBLE").length;
  const tomosNoDisponibles = inventario.filter(i => i.estado === "NO DISPONIBLE").length;

  // Filtrado avanzado por texto, categoría y estado
  const inventarioFiltrado = inventario.filter(item => {
    const texto = busqueda.toLowerCase();
    const coincideTexto = 
      String(item.tomo).toLowerCase().includes(texto) ||
      String(item.archivador).toLowerCase().includes(texto) ||
      String(item.anio).toLowerCase().includes(texto) ||
      String(item.rango).toLowerCase().includes(texto);

    const coincideCat = filtroCategoria === "TODAS" || item.categoria === filtroCategoria;
    const coincideEst = filtroEstado === "TODOS" || item.estado === filtroEstado;

    return coincideTexto && coincideCat && coincideEst;
  });

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="w-full max-w-[95%] mx-auto bg-white shadow-md rounded-sm overflow-hidden p-6">
        
        {/* Encabezado */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-6 mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#243c5a]">Inventario General y Disponibilidad de Tomos Físicos</h1>
            <p className="text-sm text-gray-500 mt-1">
              Monitoreo en tiempo real de libros, archivadores, escrituras, minutas, actas y no contenciosos.
            </p>
          </div>
          <div className="flex gap-2">
            <a href="/salidas" className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-3 rounded text-xs transition-colors">
              Ir a Salidas y Entradas
            </a>
            <a href="/pedidos" className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-3 rounded text-xs transition-colors">
              Panel de Pedidos
            </a>
          </div>
        </div>

        {/* TARJETAS DE REPORTE Y ESTADÍSTICAS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 border border-blue-200 p-4 rounded shadow-sm text-center">
            <p className="text-xs text-blue-800 font-bold uppercase">Total Registrados</p>
            <p className="text-2xl font-black text-blue-900 mt-1">{totalTomos}</p>
          </div>
          <div className="bg-green-50 border border-green-200 p-4 rounded shadow-sm text-center">
            <p className="text-xs text-green-800 font-bold uppercase">Disponibles en Archivo</p>
            <p className="text-2xl font-black text-green-700 mt-1">{tomosDisponibles}</p>
          </div>
          <div className="bg-red-50 border border-red-200 p-4 rounded shadow-sm text-center">
            <p className="text-xs text-red-800 font-bold uppercase">No Disponibles (Fuera / Préstamo)</p>
            <p className="text-2xl font-black text-red-700 mt-1">{tomosNoDisponibles}</p>
          </div>
        </div>

        {/* CONTROLES DE FILTRADO Y BÚSQUEDA */}
        <div className="bg-slate-50 p-4 border rounded mb-6 flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <input 
              type="text" 
              placeholder="🔍 Buscar Tomo, Archivador, Año o Rango..." 
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="p-2 border rounded text-xs w-full md:w-72 bg-white text-gray-700 outline-none focus:border-blue-600"
            />
            
            <select 
              value={filtroCategoria} 
              onChange={(e) => setFiltroCategoria(e.target.value)}
              className="p-2 border rounded text-xs bg-white text-gray-700"
            >
              <option value="TODAS">Todas las Categorías</option>
              <option value="Escrituras">Escrituras</option>
              <option value="Minutas">Minutas</option>
              <option value="Transferencias Vehiculares">Transferencias Vehiculares</option>
              <option value="Actas Transferencias Vehiculares">Actas Transferencias Vehiculares</option>
              <option value="Asuntos No Contenciosos">Asuntos No Contenciosos</option>
            </select>

            <select 
              value={filtroEstado} 
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="p-2 border rounded text-xs bg-white text-gray-700"
            >
              <option value="TODOS">Todos los Estados</option>
              <option value="DISPONIBLE">DISPONIBLE</option>
              <option value="NO DISPONIBLE">NO DISPONIBLE</option>
            </select>
          </div>

          {busqueda || filtroCategoria !== "TODAS" || filtroEstado !== "TODOS" ? (
            <button 
              onClick={() => { setBusqueda(""); setFiltroCategoria("TODAS"); setFiltroEstado("TODOS"); }}
              className="text-xs text-red-600 hover:underline font-semibold"
            >
              Limpiar filtros
            </button>
          ) : null}
        </div>

        {/* TABLA DE INVENTARIO */}
        <div className="overflow-x-auto pb-4">
          <table className="w-full text-center border-collapse text-[11px] border border-gray-300">
            <thead className="bg-[#243c5a] text-white">
              <tr>
                <th className="border border-gray-300 p-2">ID</th>
                <th className="border border-gray-300 p-2">Categoría</th>
                <th className="border border-gray-300 p-2">N° Tomo / Anexo</th>
                <th className="border border-gray-300 p-2">Archivador</th>
                <th className="border border-gray-300 p-2">Año</th>
                <th className="border border-gray-300 p-2">Rango (Folios / Minutas / Actas)</th>
                <th className="border border-gray-300 p-2">Estado Actual</th>
              </tr>
            </thead>
            <tbody>
              {inventarioFiltrado.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-gray-400 font-medium text-center">
                    No se encontraron registros en el inventario.
                  </td>
                </tr>
              )}
              {inventarioFiltrado.map((item) => (
                <tr key={item.id} className={item.estado === "DISPONIBLE" ? "hover:bg-gray-50" : "bg-red-50 text-red-950 font-semibold"}>
                  <td className="border border-gray-300 p-2 font-bold">{item.id}</td>
                  <td className="border border-gray-300 p-2">{item.categoria}</td>
                  <td className="border border-gray-300 p-2 font-bold">{item.tomo}</td>
                  <td className="border border-gray-300 p-2">{item.archivador}</td>
                  <td className="border border-gray-300 p-2">{item.anio}</td>
                  <td className="border border-gray-300 p-2">{item.rango}</td>
                  <td className="border border-gray-300 p-2 font-bold">
                    <span className={`px-2 py-1 rounded text-[10px] text-white ${item.estado === "DISPONIBLE" ? "bg-green-600" : "bg-red-600 animate-pulse"}`}>
                      {item.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}