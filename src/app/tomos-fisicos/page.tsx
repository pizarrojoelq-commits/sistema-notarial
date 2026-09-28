"use client";

import { useState, useEffect } from "react";

interface MovimientoTomo {
  id: number;
  nroTomo: string;
  anio: string;
  motivoSalida: string; // Ej: Revisión presencial, Cotejo, Préstamo al despacho
  solicitadoPor: string; // Abogado o personal
  sedeOrigen: string; // Ej: Archivo Bertello
  fechaSalida: string;
  fechaRetornoEstimada: string;
  estado: "En Notaría / Préstamo Activo" | "Devuelto al Archivo";
}

export default function ControlTomosFisicos() {
  const [movimientos, setMovimientos] = useState<MovimientoTomo[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  // Estados para el formulario rápido de registro de salida
  const [nroTomo, setNroTomo] = useState("");
  const [anio, setAnio] = useState("");
  const [motivo, setMotivo] = useState("Revisión Presencial");
  const [solicitante, setSolicitante] = useState("");
  const [sede, setSede] = useState("Archivo Bertello");

  useEffect(() => {
    setIsMounted(true);
    const guardados = localStorage.getItem("movimientosTomos");
    if (guardados) {
      setMovimientos(JSON.parse(guardados));
    } else {
      setMovimientos([
        {
          id: 1,
          nroTomo: "Tomo 12-B",
          anio: "2024",
          motivoSalida: "Revisión Presencial del Notario",
          solicitadoPor: "NOTARIO",
          sedeOrigen: "Archivo Bertello",
          fechaSalida: "2026-09-24",
          fechaRetornoEstimada: "2026-09-25",
          estado: "En Notaría / Préstamo Activo",
        },
      ]);
    }
  }, []);

  if (!isMounted) return null;

  const registrarSalida = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nroTomo) return alert("Ingrese el número de tomo");

    const nuevoMovimiento: MovimientoTomo = {
      id: Date.now(),
      nroTomo,
      anio: anio || "2026",
      motivoSalida: motivo,
      solicitadoPor: solicitante || "Personal Notarial",
      sedeOrigen: sede,
      fechaSalida: new Date().toISOString().split("T")[0],
      fechaRetornoEstimada: "Pendiente",
      estado: "En Notaría / Préstamo Activo",
    };

    const actualizado = [nuevoMovimiento, ...movimientos];
    setMovimientos(actualizado);
    localStorage.setItem("movimientosTomos", JSON.stringify(actualizado));
    setNroTomo("");
    setAnio("");
    setSolicitante("");
    alert("¡Salida de tomo físico registrada con éxito!");
  };

  const cambiarEstadoDevolucion = (id: number) => {
    const actualizado = movimientos.map((m) => {
      if (m.id === id) {
        const nuevoEstado = m.estado === "En Notaría / Préstamo Activo" ? "Devuelto al Archivo" : "En Notaría / Préstamo Activo";
        return { ...m, estado: nuevoEstado as any };
      }
      return m;
    });
    setMovimientos(actualizado);
    localStorage.setItem("movimientosTomos", JSON.stringify(actualizado));
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="w-full max-w-[95%] mx-auto bg-white shadow-md rounded-sm overflow-hidden p-6">
        
        {/* Encabezado y Navegación entre módulos */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-6 mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#243c5a]">Control de Salidas y Entradas de Tomos Físicos</h1>
            <p className="text-sm text-gray-500 mt-1">
              Registro y seguimiento del traslado físico de libros y tomos desde Bertello hacia la Notaría.
            </p>
          </div>
          <div className="flex gap-2">
            <a href="/" className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-3 rounded text-xs transition-colors">
              Formulario Digital
            </a>
            <a href="/pedidos" className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-3 rounded text-xs transition-colors">
              Panel de Escaneo
            </a>
          </div>
        </div>

        {/* Formulario rápido de registro de salida física */}
        <form onSubmit={registrarSalida} className="bg-slate-50 p-4 border rounded-sm mb-8 grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">N° de Tomo / Libro</label>
            <input 
              type="text" 
              value={nroTomo} 
              onChange={(e) => setNroTomo(e.target.value)} 
              placeholder="Ej. Tomo 04" 
              className="w-full p-2 border text-xs rounded bg-white"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Año</label>
            <input 
              type="text" 
              value={anio} 
              onChange={(e) => setAnio(e.target.value)} 
              placeholder="2026" 
              className="w-full p-2 border text-xs rounded bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Motivo de Salida</label>
            <select 
              value={motivo} 
              onChange={(e) => setMotivo(e.target.value)}
              className="w-full p-2 border text-xs rounded bg-white"
            >
              <option value="Revisión Presencial">Revisión Presencial</option>
              <option value="Cotejo de Firmas">Cotejo de Firmas</option>
              <option value="Firma de Abogado/Notario">Firma de Abogado/Notario</option>
              <option value="Otros">Otros</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Solicitado por</label>
            <input 
              type="text" 
              value={solicitante} 
              onChange={(e) => setSolicitante(e.target.value)} 
              placeholder="Nombre de Abogado" 
              className="w-full p-2 border text-xs rounded bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Sede de Origen</label>
            <input 
              type="text" 
              value={sede} 
              onChange={(e) => setSede(e.target.value)} 
              className="w-full p-2 border text-xs rounded bg-white"
            />
          </div>
          <div>
            <button type="submit" className="w-full bg-[#10b981] hover:bg-[#059669] text-white font-medium py-2 px-4 rounded text-xs transition-colors">
              Registrar Salida Física
            </button>
          </div>
        </form>

        {/* Tabla de Seguimiento Físico */}
        <div className="overflow-x-auto pb-4">
          <table className="w-full text-center border-collapse text-[11px] border border-gray-300">
            <thead className="bg-[#243c5a] text-white">
              <tr>
                <th className="border border-gray-300 p-2">ID</th>
                <th className="border border-gray-300 p-2">N° Tomo</th>
                <th className="border border-gray-300 p-2">Año</th>
                <th className="border border-gray-300 p-2">Motivo de Salida</th>
                <th className="border border-gray-300 p-2">Solicitado Por</th>
                <th className="border border-gray-300 p-2">Sede Origen</th>
                <th className="border border-gray-300 p-2">Fecha de Salida</th>
                <th className="border border-gray-300 p-2">Estado Físico</th>
                <th className="border border-gray-300 p-2">Acción / Retorno</th>
              </tr>
            </thead>
            <tbody>
              {movimientos.map((item) => (
                <tr key={item.id} className={item.estado === "Devuelto al Archivo" ? "bg-green-100 text-gray-600" : "bg-amber-50"}>
                  <td className="border border-gray-300 p-2 font-bold">{item.id}</td>
                  <td className="border border-gray-300 p-2 font-semibold">{item.nroTomo}</td>
                  <td className="border border-gray-300 p-2">{item.anio}</td>
                  <td className="border border-gray-300 p-2">{item.motivoSalida}</td>
                  <td className="border border-gray-300 p-2">{item.solicitadoPor}</td>
                  <td className="border border-gray-300 p-2">{item.sedeOrigen}</td>
                  <td className="border border-gray-300 p-2">{item.fechaSalida}</td>
                  <td className="border border-gray-300 p-2 font-bold">
                    <span className={`px-2 py-1 rounded text-[10px] ${item.estado === "Devuelto al Archivo" ? "bg-green-600 text-white" : "bg-amber-500 text-white"}`}>
                      {item.estado}
                    </span>
                  </td>
                  <td className="border border-gray-300 p-2">
                    <button
                      onClick={() => cambiarEstadoDevolucion(item.id)}
                      className="bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded text-[10px] transition-colors"
                    >
                      {item.estado === "En Notaría / Préstamo Activo" ? "Marcar como Devuelto" : "Reabrir Préstamo"}
                    </button>
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