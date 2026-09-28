"use client";

import { useState, useEffect, useRef } from "react";

interface MovimientoTomo {
  id: string;
  pedidoId?: number;
  tipo: "SALIDAS" | "ENTRADAS";
  tomoExacto: string; 
  anio: string;
  motivo: string;
  abogadoSolicita: string; 
  personaResponsable: string;
  atendidoPor: string; 
  fechaOperacion: string;    
  horaIngresoPersona: string; 
  horaSalidaPersona: string;  
  tiempoAtencionSegundos: number; 
  tiempoInicioTimestamp?: number; 
  observaciones: string;
  firmaDigital: string; 
  estado: 
    | "Pendiente de Entrega" 
    | "Pendiente de Recepción"
    | "En Atención" 
    | "Entregado (Fuera)" 
    | "Devuelto a Archivo Principal (BERTELLO)";
}

export default function RegistroEntradasSalidas() {
  const [seccionActiva, setSeccionActiva] = useState<"SALIDAS" | "ENTRADAS">("SALIDAS");
  const [registros, setRegistros] = useState<MovimientoTomo[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [usuarioActual, setUsuarioActual] = useState<{ nombre: string; rol: string } | null>(null);
  const [, setTick] = useState(0);
  
  const [modalAbierto, setModalAbierto] = useState(false);
  const [registroActual, setRegistroActual] = useState<MovimientoTomo | null>(null);
  const [modalManualAbierto, setModalManualAbierto] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    try {
      const sesion = localStorage.getItem("usuarioLogueado");
      if (!sesion) {
        window.location.href = "/login";
        return;
      } else {
        setUsuarioActual(JSON.parse(sesion));
      }

      const guardados = localStorage.getItem("movimientosTomos");
      if (guardados) {
        setRegistros(JSON.parse(guardados));
      }
    } catch (e) {
      console.error("Error al inicializar almacenamiento:", e);
      setRegistros([]);
    }
  }, []);

  const cerrarSesion = () => {
    localStorage.removeItem("usuarioLogueado");
    window.location.href = "/login";
  };

  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const guardarRegistros = (nuevos: MovimientoTomo[]) => {
    setRegistros(nuevos);
    try {
      localStorage.setItem("movimientosTomos", JSON.stringify(nuevos));
    } catch (e) {
      console.error("Error al guardar registros:", e);
    }
  };

  const actualizarCampoLibre = (id: string, campo: keyof MovimientoTomo, valor: string) => {
    const actualizados = registros.map(r => r.id === id ? { ...r, [campo]: valor } : r);
    guardarRegistros(actualizados);
  };

  const iniciarAtencion = (id: string) => {
    const ahora = Date.now();
    const horaTexto = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const nombreOperador = usuarioActual ? usuarioActual.nombre : "Personal de Archivo";

    const actualizados = registros.map(r => {
      if (r.id === id) {
        return { 
          ...r, 
          estado: "En Atención" as const, 
          tiempoInicioTimestamp: ahora,
          horaIngresoPersona: horaTexto,
          atendidoPor: nombreOperador 
        };
      }
      return r;
    });
    guardarRegistros(actualizados);
  };

  const calcularTiempoAtencion = (r: MovimientoTomo) => {
    if (r.estado === "En Atención" && r.tiempoInicioTimestamp) {
      return Math.floor((Date.now() - r.tiempoInicioTimestamp) / 1000);
    }
    return r.tiempoAtencionSegundos || 0;
  };

  const formatearTiempo = (segundos: number) => {
    if (segundos <= 0) return "-";
    const mins = Math.floor(segundos / 60);
    const segs = segundos % 60;
    if (mins === 0) return `${segs}s`;
    return `${mins}m ${segs}s`;
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    draw(e);
  };
  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) canvas.getContext("2d")?.beginPath();
  };
  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if (e.type.includes("touch")) {
      clientX = (e as React.TouchEvent).touches[0].clientX;
      clientY = (e as React.TouchEvent).touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#000000";
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };
  const limpiarFirma = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.beginPath();
    }
  };

  const abrirModalProcesar = (reg: MovimientoTomo) => {
    setRegistroActual(reg);
    setModalAbierto(true);
    setTimeout(() => limpiarFirma(), 100); 
  };

  const confirmarProceso = (e: React.FormEvent) => {
    e.preventDefault();
    if (!registroActual) return;

    const canvas = canvasRef.current;
    const firmaDataUrl = canvas?.toDataURL("image/png") || "";
    const fechaActual = new Date().toISOString().split("T")[0];
    const horaTexto = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const duracion = calcularTiempoAtencion(registroActual);
    const personaNombre = (document.getElementById("persona") as HTMLInputElement).value;
    const obsTexto = (document.getElementById("obs") as HTMLInputElement).value;

    let copiaEntrada: MovimientoTomo | null = null;

    const actualizados = registros.map(r => {
      if (r.id === registroActual.id) {
        if (r.tipo === "SALIDAS") {
          copiaEntrada = {
            id: `entrada-${r.id}-${Date.now()}`,
            pedidoId: r.pedidoId,
            tipo: "ENTRADAS",
            tomoExacto: r.tomoExacto,
            anio: r.anio,
            motivo: r.motivo,
            abogadoSolicita: r.abogadoSolicita,
            personaResponsable: "", 
            atendidoPor: "",
            fechaOperacion: "",    
            horaIngresoPersona: "",
            horaSalidaPersona: "",
            tiempoAtencionSegundos: 0,
            observaciones: `Esperando retorno a BERTELLO (Salida previa atendida por ${r.atendidoPor || 'Archivo'})`,
            firmaDigital: "",
            estado: "Pendiente de Recepción"
          };

          return {
            ...r,
            personaResponsable: personaNombre,
            fechaOperacion: fechaActual,
            horaSalidaPersona: horaTexto,
            tiempoAtencionSegundos: duracion,
            observaciones: obsTexto,
            firmaDigital: firmaDataUrl,
            estado: "Entregado (Fuera)" as const
          };
        } else {
          return {
            ...r,
            personaResponsable: personaNombre,
            fechaOperacion: fechaActual,
            horaSalidaPersona: horaTexto,
            tiempoAtencionSegundos: duracion,
            observaciones: obsTexto,
            firmaDigital: firmaDataUrl,
            estado: "Devuelto a Archivo Principal (BERTELLO)" as const
          };
        }
      }
      return r;
    });

    const listaFinal = copiaEntrada ? [...actualizados, copiaEntrada] : actualizados;
    guardarRegistros(listaFinal);
    setModalAbierto(false);

    if (copiaEntrada) {
      alert("✅ Libro entregado con éxito. Se ha creado automáticamente la ficha de retorno en la Sección de Entradas para cuando vuelva a BERTELLO.");
    }
  };

  const agregarManual = (e: React.FormEvent) => {
    e.preventDefault();
    const tomo = (document.getElementById("manTomo") as HTMLInputElement).value;
    const anio = (document.getElementById("manAnio") as HTMLInputElement).value;
    const motivo = (document.getElementById("manMotivo") as HTMLInputElement).value;
    const abogado = (document.getElementById("manAbogado") as HTMLInputElement).value;
    const tipo = (document.getElementById("manTipo") as HTMLSelectElement).value as "SALIDAS" | "ENTRADAS";
    const nombreOperador = usuarioActual ? usuarioActual.nombre : "Personal de Archivo";

    const nuevo: MovimientoTomo = {
      id: `manual-${Date.now()}`,
      tipo: tipo,
      tomoExacto: tomo,
      anio: anio,
      motivo: motivo || "Ingreso manual",
      abogadoSolicita: abogado || "General",
      personaResponsable: "",
      atendidoPor: nombreOperador,
      fechaOperacion: "",
      horaIngresoPersona: "",
      horaSalidaPersona: "",
      tiempoAtencionSegundos: 0,
      observaciones: "Registrado manualmente",
      firmaDigital: "",
      estado: tipo === "SALIDAS" ? "Pendiente de Entrega" : "Pendiente de Recepción"
    };

    // Colocamos el nuevo registro al inicio con [nuevo, ...registros]
    guardarRegistros([nuevo, ...registros]);
    setModalManualAbierto(false);
  };

  if (!isMounted) return null;

  // Filtramos y aplicamos .slice().reverse() para que los últimos pedidos creados salgan ARRIBA
  const registrosFiltrados = registros.filter(r => r.tipo === seccionActiva).slice().reverse();

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="w-full max-w-[95%] mx-auto bg-white shadow-md rounded-sm overflow-hidden p-6">
        
        {/* Encabezado y Control de Sesión */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-6 mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#243c5a]">Control de Entrada y Salida de Tomos Físicos</h1>
            <p className="text-sm text-gray-500 mt-1">
              Despacho en mostrador, cronómetro de atención, copiado automático a BERTELLO y firma digital.
            </p>
          </div>
          
          <div className="flex items-center gap-3 flex-wrap">
            <a href="/inventarios" className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-4 rounded text-xs transition-colors shadow-sm">
              Consultar Inventarios 📊
            </a>
            <button onClick={() => setModalManualAbierto(true)} className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded text-xs transition-colors shadow-sm cursor-pointer">
              + Agregar Tomo Manual
            </button>
            <a href="/pedidos" className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded text-xs transition-colors">
              Ir al Panel de Pedidos
            </a>

            {usuarioActual && (
              <span className="text-xs font-semibold text-gray-700 bg-gray-100 px-3 py-2 rounded border">
                👤 {usuarioActual.nombre}
              </span>
            )}
            <button 
              onClick={cerrarSesion}
              className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-3 rounded text-xs transition-colors shadow-sm cursor-pointer"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>

        {/* Pestañas de Navegación: Salidas vs Entradas */}
        <div className="flex border-b mb-6">
          <button 
            onClick={() => setSeccionActiva("SALIDAS")}
            className={`py-2 px-6 font-bold text-sm border-b-2 transition-colors cursor-pointer ${seccionActiva === "SALIDAS" ? "border-blue-600 text-blue-600 bg-blue-50/50" : "border-transparent text-gray-500 hover:text-gray-700"}`}
          >
            📤 Sección de Salidas ({registros.filter(r => r.tipo === "SALIDAS").length})
          </button>
          <button 
            onClick={() => setSeccionActiva("ENTRADAS")}
            className={`py-2 px-6 font-bold text-sm border-b-2 transition-colors cursor-pointer ${seccionActiva === "ENTRADAS" ? "border-blue-600 text-blue-600 bg-blue-50/50" : "border-transparent text-gray-500 hover:text-gray-700"}`}
          >
            📥 Sección de Entradas - Retorno a BERTELLO ({registros.filter(r => r.tipo === "ENTRADAS").length})
          </button>
        </div>

        {/* TABLA DINÁMICA */}
        <div className="overflow-x-auto pb-4">
          <table className="w-full text-center border-collapse text-[11px] border border-gray-300">
            <thead className="bg-[#243c5a] text-white">
              <tr>
                <th className="border border-gray-300 p-2">Tomo Físico (Editable)</th>
                <th className="border border-gray-300 p-2">Año (Editable)</th>
                <th className="border border-gray-300 p-2">Motivo</th>
                <th className="border border-gray-300 p-2">Abogado Solicitante</th>
                
                <th className="border border-gray-300 p-2 bg-yellow-700">
                  {seccionActiva === "SALIDAS" ? "Persona que Recoge" : "Persona que Devuelve / Trae"}
                </th>

                <th className="border border-gray-300 p-2 bg-indigo-900">Atendido Por</th>
                
                <th className="border border-gray-300 p-2 bg-blue-800">
                  {seccionActiva === "SALIDAS" ? "Fecha Salida" : "Fecha Entrada (BERTELLO)"}
                </th>

                <th className="border border-gray-300 p-2 bg-indigo-800">Hora Ingreso</th>
                <th className="border border-gray-300 p-2 bg-indigo-800">Hora Salida</th>
                <th className="border border-gray-300 p-2 bg-indigo-900">T. Atención</th>

                <th className="border border-gray-300 p-2">Observaciones</th>
                <th className="border border-gray-300 p-2">Estado</th>
                <th className="border border-gray-300 p-2">Acción</th>
                <th className="border border-gray-300 p-2 bg-purple-900">Firma Digital</th>
              </tr>
            </thead>
            <tbody>
              {registrosFiltrados.length === 0 && (
                <tr><td colSpan={14} className="p-6 text-gray-400 font-medium">No hay registros en esta sección.</td></tr>
              )}
              {registrosFiltrados.map((item) => {
                let rowColor = "hover:bg-gray-50";
                if (item.estado === "Pendiente de Entrega") rowColor = "bg-cyan-100 text-cyan-950 font-medium"; 
                else if (item.estado === "Pendiente de Recepción") rowColor = "bg-slate-100 text-slate-800"; 
                else if (item.estado === "En Atención") rowColor = "bg-blue-100 text-blue-950 font-bold animate-pulse"; 
                else if (item.estado === "Entregado (Fuera)") rowColor = "bg-amber-100 text-amber-950 font-medium"; 
                else if (item.estado === "Devuelto a Archivo Principal (BERTELLO)") rowColor = "bg-green-100 text-green-950 opacity-90 font-medium"; 

                return (
                  <tr key={item.id} className={rowColor}>
                    <td className="border border-gray-300 p-1">
                      <input 
                        type="text" 
                        value={item.tomoExacto} 
                        onChange={(e) => actualizarCampoLibre(item.id, "tomoExacto", e.target.value)}
                        className="w-full text-center font-bold bg-transparent border-b border-dashed border-gray-400 outline-none"
                      />
                    </td>
                    <td className="border border-gray-300 p-1">
                      <input 
                        type="text" 
                        value={item.anio} 
                        onChange={(e) => actualizarCampoLibre(item.id, "anio", e.target.value)}
                        className="w-full text-center bg-transparent border-b border-dashed border-gray-400 outline-none"
                      />
                    </td>
                    <td className="border border-gray-300 p-2">{item.motivo}</td>
                    <td className="border border-gray-300 p-2 font-semibold">{item.abogadoSolicita}</td>
                    <td className="border border-gray-300 p-2 font-semibold text-gray-800">{item.personaResponsable || "-"}</td>
                    
                    <td className="border border-gray-300 p-2 font-bold text-indigo-900 bg-indigo-50/50">
                      {item.atendidoPor || "-"}
                    </td>

                    <td className="border border-gray-300 p-2 font-bold">{item.fechaOperacion || "-"}</td>
                    
                    <td className="border border-gray-300 p-2">{item.horaIngresoPersona || "-"}</td>
                    <td className="border border-gray-300 p-2">{item.horaSalidaPersona || "-"}</td>
                    <td className="border border-gray-300 p-2 font-bold text-indigo-800">
                      {formatearTiempo(calcularTiempoAtencion(item))}
                    </td>

                    <td className="border border-gray-300 p-2 text-gray-600">{item.observaciones || "-"}</td>
                    
                    <td className="border border-gray-300 p-2 font-bold">
                      <span className={`px-2 py-1 rounded text-[10px] text-white ${
                        item.estado === "Pendiente de Entrega" ? "bg-cyan-600" :
                        item.estado === "Pendiente de Recepción" ? "bg-slate-500" :
                        item.estado === "En Atención" ? "bg-blue-600 animate-pulse" :
                        item.estado === "Entregado (Fuera)" ? "bg-amber-600" : "bg-green-600"
                      }`}>
                        {item.estado}
                      </span>
                    </td>

                    <td className="border border-gray-300 p-2">
                      {item.tipo === "SALIDAS" && item.estado === "Pendiente de Entrega" && (
                        <button onClick={() => iniciarAtencion(item.id)} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded text-[10px] shadow-sm cursor-pointer">
                          Iniciar Atención
                        </button>
                      )}
                      {item.tipo === "SALIDAS" && item.estado === "En Atención" && (
                        <button onClick={() => abrirModalProcesar(item)} className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-1 px-2 rounded text-[10px] shadow-sm animate-pulse cursor-pointer">
                          Entregar y Firmar ✍️
                        </button>
                      )}
                      {item.tipo === "SALIDAS" && item.estado === "Entregado (Fuera)" && (
                        <span className="text-amber-800 font-bold text-[10px]">Fuera de Sede 📦</span>
                      )}

                      {item.tipo === "ENTRADAS" && item.estado === "Pendiente de Recepción" && (
                        <button onClick={() => iniciarAtencion(item.id)} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded text-[10px] shadow-sm cursor-pointer">
                          Iniciar Recepción
                        </button>
                      )}
                      {item.tipo === "ENTRADAS" && item.estado === "En Atención" && (
                        <button onClick={() => abrirModalProcesar(item)} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-1 px-2 rounded text-[10px] shadow-sm animate-pulse cursor-pointer">
                          Recibir a BERTELLO ✍️
                        </button>
                      )}
                      {item.tipo === "ENTRADAS" && item.estado === "Devuelto a Archivo Principal (BERTELLO)" && (
                        <span className="text-green-800 font-bold text-[10px]">Archivado ✓</span>
                      )}
                    </td>

                    <td className="border border-gray-300 p-1 bg-white">
                      {item.firmaDigital ? (
                        <img src={item.firmaDigital} alt="Firma" className="h-10 mx-auto object-contain border rounded bg-gray-50" />
                      ) : (
                        <span className="text-gray-400 text-[10px]">Sin firma</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* MODAL DE PROCESAMIENTO */}
        {modalAbierto && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-2">
                {registroActual?.tipo === "SALIDAS" ? "Despacho de Tomo: " : "Recepción a BERTELLO: "} 
                {registroActual?.tomoExacto}
              </h2>
              <p className="text-xs text-gray-500 mb-4">
                Tiempo de atención registrado: <span className="font-bold text-indigo-700">{formatearTiempo(calcularTiempoAtencion(registroActual!))}</span>
              </p>

              <form onSubmit={confirmarProceso}>
                <div className="mb-4">
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    {registroActual?.tipo === "SALIDAS" ? "Nombre de quien recoge:" : "Nombre de quien lo trae / devuelve:"}
                  </label>
                  <input id="persona" type="text" required className="w-full border p-2 rounded text-sm outline-none text-gray-800" placeholder="Ej. Juan Pérez" />
                </div>

                <div className="mb-4">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Firma Digital (Dibuja con el dedo/mouse):</label>
                  <div className="border-2 border-dashed border-gray-400 bg-gray-50 rounded touch-none" style={{ touchAction: 'none' }}>
                    <canvas 
                      ref={canvasRef}
                      width={380} 
                      height={140}
                      className="w-full cursor-crosshair bg-white"
                      onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseOut={stopDrawing}
                      onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing}
                    />
                  </div>
                  <button type="button" onClick={limpiarFirma} className="text-xs text-red-600 mt-1 hover:underline cursor-pointer">Limpiar firma</button>
                </div>

                <div className="mb-6">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Observaciones (Opcional):</label>
                  <input id="obs" type="text" className="w-full border p-2 rounded text-sm outline-none text-gray-800" placeholder="Ej. Estado del libro, folios, etc." />
                </div>

                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setModalAbierto(false)} className="bg-gray-300 px-4 py-2 rounded text-xs font-bold text-gray-700 cursor-pointer">Cancelar</button>
                  <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded text-xs font-bold cursor-pointer">
                    {registroActual?.tipo === "SALIDAS" ? "Confirmar Salida" : "Confirmar Ingreso a BERTELLO"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL PARA AGREGAR REGISTRO MANUAL */}
        {modalManualAbierto && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Agregar Tomo Manual</h2>
              <form onSubmit={agregarManual}>
                <div className="mb-3">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Sección Destino:</label>
                  <select id="manTipo" className="w-full border p-2 rounded text-sm outline-none text-gray-800">
                    <option value="SALIDAS">Sección de Salidas</option>
                    <option value="ENTRADAS">Sección de Entradas (BERTELLO)</option>
                  </select>
                </div>
                <div className="mb-3">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Identificador del Tomo (Ej. Tomo 45):</label>
                  <input id="manTomo" type="text" required className="w-full border p-2 rounded text-sm outline-none text-gray-800" placeholder="Ej. Tomo 45" />
                </div>
                <div className="mb-3">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Año:</label>
                  <input id="manAnio" type="text" required className="w-full border p-2 rounded text-sm outline-none text-gray-800" placeholder="Ej. 2015" />
                </div>
                <div className="mb-3">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Abogado Solicitante:</label>
                  <input id="manAbogado" type="text" className="w-full border p-2 rounded text-sm outline-none text-gray-800" placeholder="Ej. Dr. Ramirez" />
                </div>
                <div className="mb-4">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Motivo / Descripción:</label>
                  <input id="manMotivo" type="text" className="w-full border p-2 rounded text-sm outline-none text-gray-800" placeholder="Ej. Revisión presencial" />
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setModalManualAbierto(false)} className="bg-gray-300 px-4 py-2 rounded text-xs font-bold text-gray-700 cursor-pointer">Cancelar</button>
                  <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded text-xs font-bold cursor-pointer">Guardar Registro</button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}