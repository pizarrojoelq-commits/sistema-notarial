"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function SolicitudTomos() {
  const [isMounted, setIsMounted] = useState(false);
  const [usuarioActual, setUsuarioActual] = useState<{ nombre: string; rol: string } | null>(null);

  const [solicitante, setSolicitante] = useState("");
  const [fecha, setFecha] = useState("");
  const [aQuienSeEnvia, setAQuienSeEnvia] = useState("Grupo Tomos Virtuales");
  const [autoriza, setAutoriza] = useState("");
  const [observaciones, setObservaciones] = useState("");
  
  const [documento, setDocumento] = useState("");
  const [incluye, setIncluye] = useState("No Incluye nada");

  const [motivoSolicitud, setMotivoSolicitud] = useState("");
  const [kardex, setKardex] = useState("");
  const [escritura, setEscritura] = useState("");
  const [minutaActaSol, setMinutaActaSol] = useState("");
  const [folio, setFolio] = useState("");

  useEffect(() => {
    setIsMounted(true);
    const sesion = localStorage.getItem("usuarioLogueado");
    if (!sesion) {
      window.location.href = "/login";
    } else {
      const user = JSON.parse(sesion);
      setUsuarioActual(user);
      
      // REGLA DE ORO: Si un operativo entra a la raíz, lo mandamos a su panel de pedidos
      if (user.rol === "OPERATIVO") {
        window.location.href = "/pedidos";
        return;
      }

      setSolicitante(user.nombre.split(" ")[0]);
    }
  }, []);

  const cerrarSesion = () => {
    localStorage.removeItem("usuarioLogueado");
    window.location.href = "/login";
  };

  const enviarSolicitud = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const nuevoPedido = {
      id: Date.now(),
      solicitante: solicitante || "No especificado",
      motivo: motivoSolicitud || "Sin motivo",
      documento: documento || "No especificado",
      anio: fecha ? fecha.split("-")[0] : "2026",
      kardex: kardex || "-",
      folio: folio || "-",
      instrumento: escritura || "-",
      minuta_acta: minutaActaSol || "-",
      incluye: incluye,
      fecha: fecha || new Date().toISOString().split("T")[0],
      autoriza: autoriza || "No especificado",
      enviar_a: aQuienSeEnvia,
      observaciones: observaciones || "Sin observaciones",
      escaneado_por: "-",
      duracion_segundos: 0,
      paginas_pdf: 0,
      estado: "Pendiente",
      tiempo_inicio: null,
      tomo_sugerido: ""
    };

    try {
      const res = await fetch('/api/pedidos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(nuevoPedido)
      });

      const resultado = await res.json();

      if (!res.ok) {
        throw new Error(resultado.error || "Error desconocido al guardar");
      }

      alert("¡Solicitud enviada con éxito al Archivo Central (Nube)!");
      // Limpiar formulario o recargar
      window.location.reload();

    } catch (err: any) {
      console.error("Error al guardar:", err);
      alert(`Error: ${err.message}`);
    }
  };

  if (!isMounted) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex justify-center py-10 px-4">
      <div className="w-full max-w-7xl bg-white shadow-md rounded-sm overflow-hidden">
        
        {/* Encabezado Azul y Barra de Sesión */}
        <div className="bg-[#243c5a] text-white p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-6">
            <div className="w-14 h-16 border-2 border-white flex items-center justify-center text-[10px] text-center font-bold">
              ESCUDO
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-wide">NOTARÍA BERROSPI POLO</h1>
              <p className="text-sm italic mt-1 text-gray-200">Pasión por la excelencia en el servicio notarial</p>
            </div>
          </div>

          {/* Control de Sesión superior */}
          <div className="flex items-center gap-3 bg-white/10 p-3 rounded backdrop-blur-sm">
            <div className="text-right">
              <p className="text-xs text-gray-200">Usuario conectado:</p>
              <p className="text-sm font-bold text-white">{usuarioActual?.nombre} ({usuarioActual?.rol})</p>
            </div>
            <div className="flex gap-2 ml-4">
              <a href="/inventarios" className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-1.5 px-3 rounded text-xs transition-colors">
                Consultar Inventarios 📊
              </a>
              <button 
                onClick={cerrarSesion}
                className="bg-red-600 hover:bg-red-700 text-white font-medium py-1.5 px-3 rounded text-xs transition-colors cursor-pointer"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>

        <div className="p-8 md:p-12">
          {/* Instrucciones */}
          <div className="mb-10 border-b pb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Solicitud de tomos</h2>
            <p className="text-sm text-gray-500 leading-relaxed text-justify">
              Estimados colaboradores el presente formulario se ha diseñado como herramienta para solicitar los tomos y kardex correspondientes, que hasta la fecha se venían solicitando de manera física y que de ahora en adelante se les enviará de manera virtual los documentos. Con este nuevo procedimiento se dispondrá de la información de manera inmediata evitando la espera física del tomo y el proceso podrá iniciarse asi mismo de manera inmediata. Por favor, indicar en las casillas la información del tomo solicitado. Los archivos solicitados serán enviados al grupo de WhatsApp "TOMOS VIRTUALES" o al destinatario seleccionado.
            </p>
          </div>

          {/* Formulario */}
          <form onSubmit={enviarSolicitud} className="space-y-10">
            
            {/* Fila: Nombre del solicitante */}
            <div className="flex flex-col md:flex-row gap-4 md:items-center">
              <label className="md:w-1/4 text-sm font-medium text-gray-700">Nombre del usuario o solicitante</label>
              <select 
                value={solicitante} 
                onChange={(e) => setSolicitante(e.target.value)} 
                className="md:w-1/3 p-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-600 outline-none"
              >
                <option value="">Please Select</option>
                <option value="Cinthia">Cinthia</option>
                <option value="Manuel">Manuel</option>
                <option value="Enrique">Enrique</option>
              </select>
            </div>

            {/* Fila: Tabla de Solicitud de Expediente */}
            <div className="flex flex-col lg:flex-row gap-4 items-start">
              <label className="lg:w-1/4 text-sm font-medium text-gray-700 pt-3 shrink-0">Solicitud de expediente</label>
              <div className="flex-1 w-full pb-4">
                <table className="w-full table-fixed text-center border-collapse text-xs border border-gray-300">
                  <thead className="bg-[#f1f5f9] text-gray-600">
                    <tr>
                      <th className="border border-gray-300 p-2 w-[11%] bg-white border-t-0 border-l-0"></th>
                      <th className="border border-gray-300 font-medium p-2 w-[18%]">Motivo de Solicitud</th>
                      <th className="border border-gray-300 font-medium p-2 w-[16%]">Documento</th>
                      <th className="border border-gray-300 font-medium p-2 w-[10%]">N° Kardex</th>
                      <th className="border border-gray-300 font-medium p-2 w-[10%]">N° Escritura</th>
                      <th className="border border-gray-300 font-medium p-2 w-[13%]">N° de Minuta/ Acta/ Solicitud</th>
                      <th className="border border-gray-300 font-medium p-2 w-[10%]">N° de folio</th>
                      <th className="border border-gray-300 font-medium p-2 w-[12%]">Incluye</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-gray-300 bg-[#e2e8f0] font-medium p-2 text-gray-700">Expediente</td>
                      <td className="border border-gray-300 p-0">
                        <select 
                          value={motivoSolicitud}
                          onChange={(e) => setMotivoSolicitud(e.target.value)}
                          className="w-full h-full p-2 border-0 bg-transparent text-xs text-gray-600 outline-none cursor-pointer"
                        >
                          <option></option>
                          <option value="Cotización de Testimonio Adicional">Cotización de Testimonio Adicional</option>
                          <option value="Elaboración de Testimonio Adicional">Elaboración de Testimonio Adicional</option>
                          <option value="Respuesta a Oficios de Fiscalia">Respuesta a Oficios de Fiscalia</option>
                          <option value="Solicitud de Notario para Revisión">Solicitud de Notario para Revisión</option>
                          <option value="Solicitud de Abogado para Revisión">Solicitud de Abogado para Revisión</option>
                          <option value="Elaboración de Parte Adicional">Elaboración de Parte Adicional</option>
                          <option value="Préstamo de Tomo Físico / Salida a Notaría">📌 Préstamo de Tomo Físico / Salida a Notaría</option>
                          <option value="Otros">Otros</option>
                        </select>
                      </td>
                      <td className="border border-gray-300 p-0">
                        <select 
                          value={documento}
                          onChange={(e) => {
                            setDocumento(e.target.value);
                            setIncluye("No Incluye nada"); 
                          }}
                          className="w-full h-full p-2 border-0 bg-transparent text-[11px] text-gray-600 outline-none cursor-pointer"
                        >
                          <option value=""></option>
                          <option value="Escritura">Escritura</option>
                          <option value="Minuta de Escritura">Minuta de Escritura</option>
                          <option value="Transferencia Vehicular">Transferencia Vehicular</option>
                          <option value="Acta de Transferencia Vehicular">Acta de Transferencia Vehicular</option>
                          <option value="No contencioso">No contencioso</option>
                          <option value="Minuta de No Contencioso">Minuta de No Contencioso</option>
                          <option value="Solicitud de No contencioso">Solicitud de No contencioso</option>
                        </select>
                      </td>
                      
                      {/* N° Kardex */}
                      <td className="border border-gray-300 p-0">
                        <input 
                          type="text" 
                          value={kardex}
                          onChange={(e) => setKardex(e.target.value)}
                          className="w-full p-2 border-0 text-center outline-none text-[11px] text-gray-600" 
                        />
                      </td>

                      {/* N° Escritura */}
                      <td className="border border-gray-300 p-0">
                        <input 
                          type="text" 
                          value={escritura}
                          onChange={(e) => setEscritura(e.target.value)}
                          className="w-full p-2 border-0 text-center outline-none text-[11px] text-gray-600" 
                        />
                      </td>

                      {/* N° de Minuta/Acta/Solicitud */}
                      <td className="border border-gray-300 p-0">
                        <input 
                          type="text" 
                          value={minutaActaSol}
                          onChange={(e) => setMinutaActaSol(e.target.value)}
                          className="w-full p-2 border-0 text-center outline-none text-[11px] text-gray-600" 
                        />
                      </td>

                      {/* N° de folio */}
                      <td className="border border-gray-300 p-0">
                        <input 
                          type="text" 
                          value={folio}
                          onChange={(e) => setFolio(e.target.value)}
                          className="w-full p-2 border-0 text-center outline-none text-[11px] text-gray-600" 
                        />
                      </td>

                      <td className="border border-gray-300 p-0">
                        <select 
                          value={incluye}
                          onChange={(e) => setIncluye(e.target.value)}
                          className="w-full h-full p-2 border-0 bg-transparent text-[11px] text-gray-600 outline-none cursor-pointer"
                        >
                          <option value="No Incluye nada">No Incluye nada</option>
                          {documento === "Escritura" && (
                            <option value="Incluye Minuta">Incluye Minuta</option>
                          )}
                          {documento === "Transferencia Vehicular" && (
                            <option value="Incluye Acta">Incluye Acta</option>
                          )}
                          {documento === "No contencioso" && (
                            <>
                              <option value="Incluye Minuta">Incluye Minuta</option>
                              <option value="Incluye Solicitud">Incluye Solicitud</option>
                            </>
                          )}
                        </select>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Fila: Fecha */}
            <div className="flex flex-col md:flex-row gap-4 md:items-center">
              <label className="md:w-1/4 text-sm font-medium text-gray-700">Fecha del expediente</label>
              <input 
                type="date" 
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="md:w-1/3 p-2 border border-gray-300 rounded text-sm text-gray-500 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none" 
              />
            </div>

            <hr className="border-gray-200 my-6" />

            {/* Nuevos Campos: Autorización, Envío y Observaciones */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Persona/Abogado que autoriza o solicita</label>
                  <select 
                    value={autoriza} 
                    onChange={(e) => setAutoriza(e.target.value)} 
                    className="w-full p-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-600 outline-none"
                  >
                    <option value="">Seleccione abogado...</option>
                    <option value="Nancy Barrientos">Nancy Barrientos</option>
                    <option value="Sandra Albino">Sandra Albino</option>
                    <option value="Carlos Rodriguez">Carlos Rodriguez</option>
                    <option value="Erick Contreras">Erick Contreras</option>
                    <option value="Freddy Quiroz">Freddy Quiroz</option>
                    <option value="Ethel Rojas">Ethel Rojas</option>
                    <option value="Eduardo Coronel">Eduardo Coronel</option>
                    <option value="NOTARIO">NOTARIO</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">A quién se envía (Opcional)</label>
                  <select 
                    value={aQuienSeEnvia} 
                    onChange={(e) => setAQuienSeEnvia(e.target.value)} 
                    className="w-full p-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-600 outline-none"
                  >
                    <option value="Grupo Tomos Virtuales">Grupo Tomos Virtuales (Por defecto)</option>
                    <option value="Nancy Barrientos">Nancy Barrientos</option>
                    <option value="Sandra Albino">Sandra Albino</option>
                    <option value="Carlos Rodriguez">Carlos Rodriguez</option>
                    <option value="Erick Contreras">Erick Contreras</option>
                    <option value="Freddy Quiroz">Freddy Quiroz</option>
                    <option value="Eduardo Coronel">Eduardo Coronel</option>
                    <option value="Ethel Rojas">Ethel Rojas</option>
                    <option value="Cinthia">Cinthia</option>
                    <option value="Manuel">Manuel</option>
                    <option value="Enrique">Enrique</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
                <textarea 
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  rows={4}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-600 outline-none resize-none"
                  placeholder="Ingrese cualquier detalle o indicación adicional aquí..."
                ></textarea>
              </div>

            </div>

            <hr className="border-gray-200 mt-8 mb-6" />

            {/* Botón */}
            <div>
              <button 
                type="submit" 
                className="bg-[#10b981] hover:bg-[#059669] text-white font-medium py-2 px-10 rounded transition-colors text-sm shadow-sm cursor-pointer"
              >
                Submit
              </button>
            </div>
            
          </form>
        </div>
      </div>
    </div>
  );
}