"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface Pedido {
  id: string | number;
  solicitante: string;
  motivo: string;
  documento: string;
  anio: string;
  kardex: string;
  folio: string;
  instrumento: string;
  minuta_acta: string;
  incluye: string;
  fecha: string;
  autoriza: string;
  enviar_a: string; 
  observaciones: string;
  escaneado_por: string;
  duracion_segundos: number;
  paginas_pdf: number;
  estado: "Pendiente" | "En Proceso" | "Atendido" | "Listo para Recoger" | "Entregado";
  tiempo_inicio?: number | null;
  tomo_sugerido?: string;
  tomoSugerido?: string;
}

export default function PanelPedidos() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [usuarioActual, setUsuarioActual] = useState<{ nombre: string; rol: string } | null>(null);
  const [busqueda, setBusqueda] = useState("");
  
  const [pedidoCriticoActual, setPedidoCriticoActual] = useState<Pedido | null>(null);
  const [alarmaActiva, setAlarmaActiva] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const sesion = localStorage.getItem("usuarioLogueado");
    if (!sesion) {
      window.location.href = "/login";
    } else {
      const usuarioParsed = JSON.parse(sesion);
      setUsuarioActual(usuarioParsed);

      if (usuarioParsed.rol === "OPERATIVO" && typeof window !== "undefined" && "Notification" in window) {
        if (Notification.permission !== "granted") {
          Notification.requestPermission();
        }
      }
    }

    cargarPedidosNube();
  }, []);

  const cargarPedidosNube = async () => {
    try {
      const { data, error } = await supabase
        .from("pedidos")
        .select("*")
        .order("id", { ascending: true });

      if (error) {
        console.error("Error al cargar pedidos de Supabase:", error);
        return;
      }

      if (data) {
        await procesarYActualizarPedidos(data);
      }
    } catch (err) {
      console.error("Error de conexión al cargar:", err);
    }
  };

  const perteneceAlRango = (numBuscado: number, textoRango: string) => {
    if (!textoRango || !textoRango.includes('-')) return false;
    const partes = textoRango.split('-');
    const min = parseInt(partes[0].trim());
    const max = parseInt(partes[1].trim());
    return !isNaN(min) && !isNaN(max) && numBuscado >= min && numBuscado <= max;
  };
 // LÓGICA DE BÚSQUEDA CON DEPURACIÓN (CONSOLE.LOG)
  const calcularTomoNubeDinamico = async (documento: string, incluye: string, anioBuscado: string, instrumento: string, minutaActa: string, folioStr: string) => {
    const numFolio = parseInt((folioStr || "").replace(/[,.]/g, '')) || 0;
    const numInstrumento = parseInt((instrumento || "").replace(/[,.]/g, '')) || 0;
    const numMinuta = parseInt((minutaActa || "").replace(/[,.]/g, '')) || 0;
    
    // Rastreo para ver qué llega exactamente desde el pedido
    console.log("DEPURANDO PEDIDO:", { documento, incluye, anioBuscado, numFolio, numInstrumento, numMinuta });

    let resultados: string[] = [];
    const docLower = (documento || "").toLowerCase().trim();
    const incluyeLower = (incluye || "").toLowerCase().trim();

    // 1. CASO ESPECÍFICO: MINUTA DE ESCRITURA O MINUTA SOLA
    if (docLower.includes("minuta")) {
      if (docLower.includes("no contencioso") || docLower.includes("no contenciosos")) {
        const nRef = numMinuta > 0 ? numMinuta : (numFolio > 0 ? numFolio : numInstrumento);
        let queryMinNC = supabase.from("inv_minutario_no_contenciosos").select("*");
        if (anioBuscado) queryMinNC = queryMinNC.eq("AÑO", anioBuscado);
        const { data: dataMinNC } = await queryMinNC;

        let halladoMinNC = dataMinNC?.find((m: any) => perteneceAlRango(nRef, m["RANGO DE MINUTAS"] || m.rango));
        if (halladoMinNC) {
          resultados.push(`Tomo ${halladoMinNC.TOMO || halladoMinNC.tomo} (Minutario No Contenciosos)`);
        } else {
          resultados.push(`[Minutario No Contencioso Ref: ${nRef} no hallado]`);
        }
      } else {
        const nMinuta = numMinuta > 0 ? numMinuta : (numInstrumento > 0 ? numInstrumento : numFolio);
        if (nMinuta === 0) {
          resultados.push("[Minuta 0: Buscar manualmente]");
        } else {
          let queryMin = supabase.from("inv_minutas").select("*");
          if (anioBuscado) queryMin = queryMin.eq("AÑO", anioBuscado);
          const { data: dataMin } = await queryMin;

          let halladoMin = dataMin?.find((m: any) => perteneceAlRango(nMinuta, m["RANGO DE MINUTAS"] || m.rango));
          if (halladoMin) {
            resultados.push(`Tomo ${halladoMin.TOMO || halladoMin.tomo} (Minutas)`);
          } else {
            resultados.push(`[Minuta ${nMinuta} no hallada en Minutas]`);
          }
        }
      }
    } 
    // 2. CASO: ESCRITURA PÚBLICA (ESCRITURA)
    else if (docLower === "escritura" || docLower.includes("escritura pública") || docLower.includes("escritura")) {
      if (numFolio === 0) {
        resultados.push("[Folio 0: Buscar manualmente]");
      } else {
        let query = supabase.from("inv_escrituras").select("*");
        if (anioBuscado) query = query.eq("AÑO", anioBuscado);
        const { data } = await query;

        let hallado = data?.find((e: any) => perteneceAlRango(numFolio, e["RANGO DE FOLIOS"] || e.rango));
        if (hallado) {
          resultados.push(`Tomo ${hallado.TOMO || hallado.tomo} (Escrituras ${hallado.AÑO || hallado.anio || anioBuscado})`);
        } else {
          resultados.push(`[Folio ${numFolio} no hallado en Escrituras]`);
        }
      }

      if (incluyeLower.includes("incluye minuta") || incluyeLower === "incluye minuta") {
        const nMinuta = numMinuta > 0 ? numMinuta : numInstrumento;
        if (nMinuta > 0) {
          let queryMin = supabase.from("inv_minutas").select("*");
          if (anioBuscado) queryMin = queryMin.eq("AÑO", anioBuscado);
          const { data: dataMin } = await queryMin;

          let halladoMin = dataMin?.find((m: any) => perteneceAlRango(nMinuta, m["RANGO DE MINUTAS"] || m.rango));
          if (halladoMin) {
            resultados.push(`Tomo ${halladoMin.TOMO || halladoMin.tomo} (Minutas Anexas)`);
          } else {
            resultados.push(`[Minuta ${nMinuta} anexa no hallada]`);
          }
        }
      }
    } 
    // 3. CASO: ACTA DE TRANSFERENCIA VEHICULAR (SOLO ACTA, SIN TOMO VEHICULAR)
    else if (docLower.includes("acta de transferencia vehicular") || (docLower.includes("acta") && !docLower.includes("transferencia"))) {
      const nRefActa = numInstrumento > 0 ? numInstrumento : (numMinuta > 0 ? numMinuta : numFolio);
      
      let queryActa = supabase.from("inv_actas_vehiculares").select("*");
      if (anioBuscado) queryActa = queryActa.eq("AÑO", anioBuscado);
      const { data: dataActa } = await queryActa;

      let halladoActa = dataActa?.find((a: any) => perteneceAlRango(nRefActa, a["RANGO DE ACTAS"] || a.rango));
      if (halladoActa) {
        resultados.push(`ACTA ${halladoActa.TOMO || halladoActa.ACTA || halladoActa.archivador || '1'} (Actas Vehiculares)`);
      } else {
        resultados.push(`[Acta Ref: ${nRefActa} no hallada]`);
      }
    }
    // 4. CASO: TRANSFERENCIA VEHICULAR COMPLETA (PUEDE INCLUIR TOMO + ACTA ANEXA)
    else if (docLower.includes("vehicular") || docLower.includes("transferencia")) {
      // A) Tomo Vehicular principal por folio o instrumento
      const nRefVeh = numFolio > 0 ? numFolio : numInstrumento;
      let queryVeh = supabase.from("inv_vehiculares").select("*");
      if (anioBuscado) queryVeh = queryVeh.eq("AÑO", anioBuscado);
      const { data: dataVeh } = await queryVeh;

      let halladoVeh = dataVeh?.find((v: any) => perteneceAlRango(nRefVeh, v["RANGO DE FOLIOS"] || v.rango));
      if (halladoVeh) {
        resultados.push(`Tomo ${halladoVeh.TOMO || halladoVeh.tomo} (Transferencia Vehicular ${anioBuscado})`);
      } else {
        resultados.push(`[Vehicular Folio Ref: ${nRefVeh} no hallado]`);
      }

      // B) Si además incluye acta, se añade el acta anexa
      if (incluyeLower.includes("acta")) {
        const nRefActa = numInstrumento > 0 ? numInstrumento : numMinuta;
        let queryActa = supabase.from("inv_actas_vehiculares").select("*");
        if (anioBuscado) queryActa = queryActa.eq("AÑO", anioBuscado);
        const { data: dataActa } = await queryActa;

        let halladoActa = dataActa?.find((a: any) => perteneceAlRango(nRefActa, a["RANGO DE ACTAS"] || a.rango));
        if (halladoActa) {
          resultados.push(`ACTA ${halladoActa.TOMO || halladoActa.ACTA || halladoActa.archivador || '330'} (ACTA ANEXA)`);
        } else {
          resultados.push(`[Acta Instrumento Ref: ${nRefActa} no hallada]`);
        }
      }
    }
    // 7. CASO: EXPEDIENTE NO CONTENCIOSO COMPLETO (TOMO POR FOLIO + ANEXO SOLICITUD O MINUTA SI LO INCLUYE)
    else if (docLower.includes("no contencioso") || docLower.includes("no contenciosos")) {
      if (numFolio === 0) {
        resultados.push("[Folio No Contencioso 0: Buscar manualmente]");
      } else {
        let queryNC = supabase.from("inv_no_contenciosos").select("*");
        if (anioBuscado) queryNC = queryNC.eq("AÑO", anioBuscado);
        const { data: dataNC } = await queryNC;

        let halladoNC = dataNC?.find((nc: any) => perteneceAlRango(numFolio, nc["RANGO DE FOLIOS"] || nc.rango));
        if (halladoNC) {
          resultados.push(`Tomo ${halladoNC.TOMO || halladoNC.tomo} (No Contenciosos ${anioBuscado})`);
        } else {
          resultados.push(`[Folio No Contencioso ${numFolio} no hallado]`);
        }
      }

      const nRefAdicional = numMinuta > 0 ? numMinuta : (numInstrumento > 0 ? numInstrumento : numFolio);

      if (incluyeLower.includes("solicitud")) {
        let querySol = supabase.from("inv_solicitudes_no_contenciosos").select("*");
        if (anioBuscado) querySol = querySol.eq("AÑO", anioBuscado);
        const { data: dataSol } = await querySol;

        let halladoSol = dataSol?.find((s: any) => perteneceAlRango(nRefAdicional, s["RANGO DE SOLICITUD"] || s.rango));
        if (halladoSol) {
          resultados.push(`Solicitud Anexo ${halladoSol.ANEXO || halladoSol.anexo || '1'} (Solicitudes No Contenciosos)`);
        } else {
          resultados.push(`[Solicitud No Contenciosa Ref: ${nRefAdicional} no hallada]`);
        }
      } 
      else if (incluyeLower.includes("minuta") || incluyeLower.includes("minutario")) {
        let queryMinNC = supabase.from("inv_minutario_no_contenciosos").select("*");
        if (anioBuscado) queryMinNC = queryMinNC.eq("AÑO", anioBuscado);
        const { data: dataMinNC } = await queryMinNC;

        let halladoMinNC = dataMinNC?.find((m: any) => perteneceAlRango(nRefAdicional, m["RANGO DE MINUTAS"] || m.rango));
        if (halladoMinNC) {
          resultados.push(`Tomo ${halladoMinNC.TOMO || halladoMinNC.tomo} (Minutario No Contenciosos)`);
        } else {
          resultados.push(`[Minutario No Contencioso Ref: ${nRefAdicional} no hallado]`);
        }
      }
    }
    else {
      resultados.push(`Documento: ${documento}`);
    }

    return resultados.filter(Boolean).join(" + ");
  };
  const procesarYActualizarPedidos = async (listaCruda: any[]) => {
    const listaConTomosUnificados = await Promise.all(
      listaCruda.map(async (item: any) => {
        const tomoUnificado = await calcularTomoNubeDinamico(
          item.documento, item.incluye, item.anio, item.instrumento || "", item.minuta_acta || "", item.folio || ""
        );
        return { 
          ...item, 
          tomoSugerido: tomoUnificado, 
          tomo_sugerido: tomoUnificado 
        };
      })
    );

    setPedidos(listaConTomosUnificados);

    const sesion = localStorage.getItem("usuarioLogueado");
    const usuarioObj = sesion ? JSON.parse(sesion) : null;
    
    const esExterno = usuarioObj && (usuarioObj.rol === "EXTERNO" || usuarioObj.nombre.includes("Cinthia") || usuarioObj.nombre.includes("Enrique"));
    const esOperativo = usuarioObj && usuarioObj.rol === "OPERATIVO" && !esExterno;

    const primerPendiente = listaConTomosUnificados.find(p => p.estado === "Pendiente");
    
    if (primerPendiente && esOperativo) {
      setPedidoCriticoActual(primerPendiente);
      setAlarmaActiva(true);
      reproducirAlarmaConstante();

      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        new Notification("🚨 ¡ALERTA: NUEVO PEDIDO EN ARCHIVO!", {
          body: `Solicitante: ${primerPendiente.solicitante} - Documento: ${primerPendiente.documento}`,
          icon: "/favicon.ico"
        });
      }
    } else {
      setPedidoCriticoActual(null);
      setAlarmaActiva(false);
    }
  };

  useEffect(() => {
    if (!isMounted) return;
    
    const intervaloMonitoreo = setInterval(() => {
      cargarPedidosNube();
    }, 4000); 

    return () => clearInterval(intervaloMonitoreo);
  }, [isMounted]);

  const cerrarSesion = () => {
    localStorage.removeItem("usuarioLogueado");
    window.location.href = "/login";
  };

  const reproducirAlarmaConstante = () => {
    const sesion = localStorage.getItem("usuarioLogueado");
    const usuarioObj = sesion ? JSON.parse(sesion) : null;
    if (usuarioObj && (usuarioObj.rol === "EXTERNO" || usuarioObj.nombre.includes("Cinthia") || usuarioObj.nombre.includes("Enrique"))) {
      return;
    }

    try {
      const audio = new Audio("/timbre.mp3"); 
      audio.volume = 1.0; 
      audio.play().catch(e => console.log("Esperando interacción para reproducir audio:", e));
    } catch (e) {
      console.error("No se pudo reproducir el archivo de audio:", e);
    }
  };

  const cambiarEstado = async (id: string | number) => {
    if (usuarioActual?.rol !== "OPERATIVO") return;

    const ahora = Date.now();
    const nombreOperador = usuarioActual ? usuarioActual.nombre : "Personal de Archivo";

    const pedidoActual = pedidos.find(p => p.id === id);
    if (!pedidoActual) return;

    let nuevoEstado: "Pendiente" | "En Proceso" | "Atendido" | "Listo para Recoger" = "Pendiente";
    let nuevoEscaneadoPor = pedidoActual.escaneado_por;
    let nuevoTiempoInicio = pedidoActual.tiempo_inicio;
    let nuevaDuracion = pedidoActual.duracion_segundos;

    const esFisico = pedidoActual.motivo.includes("Salida") || pedidoActual.motivo.includes("Préstamo");

    if (pedidoActual.estado === "Pendiente") {
      nuevoEstado = "En Proceso";
      nuevoEscaneadoPor = nombreOperador;
      nuevoTiempoInicio = ahora;
      nuevaDuracion = 0;
    } else if (pedidoActual.estado === "En Proceso") {
      const inicio = pedidoActual.tiempo_inicio || ahora;
      nuevaDuracion = Math.max(1, Math.round((ahora - inicio) / 1000));
      nuevoEstado = esFisico ? "Listo para Recoger" : "Atendido";
    } else {
      nuevoEstado = "Pendiente";
      nuevoEscaneadoPor = "-";
      nuevaDuracion = 0;
      nuevoTiempoInicio = null;
    }

    try {
      const { error } = await supabase
        .from("pedidos")
        .update({
          estado: nuevoEstado,
          escaneado_por: nuevoEscaneadoPor,
          tiempo_inicio: nuevoTiempoInicio,
          duracion_segundos: nuevaDuracion
        })
        .eq("id", id);

      if (error) {
        console.error("Error al actualizar estado en Supabase:", error);
        alert("No se pudo actualizar el estado en la nube.");
        return;
      }

      setAlarmaActiva(false);
      setPedidoCriticoActual(null);
      cargarPedidosNube();
    } catch (err) {
      console.error("Error de conexión:", err);
    }
  };

  const enviarA_Salidas = async (pedido: Pedido) => {
    if (usuarioActual?.rol !== "OPERATIVO") return;

    const anioBuscado = pedido.anio || "2026";
    const operadorActual = usuarioActual ? usuarioActual.nombre : "Archivo";

    let registrosSalidaParaInsertar: any[] = [];

    registrosSalidaParaInsertar.push({
      id: `salida-${pedido.id}-${Date.now()}`,
      pedido_id: Number(pedido.id),
      tipo: "SALIDAS",
      tomo_exacto: pedido.tomoSugerido || pedido.tomo_sugerido || "Tomo Asignado",
      anio: anioBuscado,
      motivo: pedido.motivo || "Préstamo de Tomo Físico",
      abogado_solicita: pedido.autoriza || pedido.solicitante || "General",
      persona_responsable: "",
      atendido_por: operadorActual,
      fecha_operacion: "",
      hora_ingreso_persona: "",
      hora_salida_persona: "",
      tiempo_atencion_segundos: 0,
      tiempo_inicio_timestamp: null,
      observaciones: `Solicitante: ${pedido.solicitante}`,
      firma_digital: "",
      estado: "Pendiente de Entrega"
    });

    try {
      const { error } = await supabase
        .from("salidas")
        .insert(registrosSalidaParaInsertar);

      if (error) {
        console.error("Error al registrar salidas en Supabase:", error);
        alert("No se pudo transferir a salidas en la nube.");
        return;
      }

      window.location.href = "/salidas";
    } catch (e) {
      console.error("Error de conexión al transferir a salidas:", e);
      window.location.href = "/salidas";
    }
  };

  const exportarExcel = () => {
    let contenido = "ID\tSolicitante\tMotivo\tDocumento\tIncluye\tAño\tKardex\tFolio\tUbicación\tAtendido Por\tEstado\n";
    pedidosFiltrados.forEach(p => {
      contenido += `${p.id}\t${p.solicitante}\t${p.motivo}\t${p.documento}\t${p.incluye}\t${p.anio}\t${p.kardex}\t${p.folio}\t${p.tomoSugerido}\t${p.escaneado_por || "-"}\t${p.estado}\n`;
    });
    const blob = new Blob([contenido], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Reporte_Pedidos_${new Date().toISOString().split("T")[0]}.xls`;
    a.click();
  };

  const formatearTiempo = (segundos: number) => {
    if (!segundos || segundos === 0) return "-";
    const mins = Math.floor(segundos / 60);
    const segs = segundos % 60;
    if (mins === 0) return `${segs}s`;
    return `${mins}m ${segs}s`;
  };

  if (!isMounted) return null;

  const esOperativo = usuarioActual?.rol === "OPERATIVO";

  const pedidosFiltrados = pedidos.filter(p => {
    const texto = busqueda.toLowerCase();
    return (
      String(p.id).toLowerCase().includes(texto) ||
      String(p.solicitante).toLowerCase().includes(texto) ||
      String(p.kardex).toLowerCase().includes(texto) ||
      String(p.anio).toLowerCase().includes(texto) ||
      String(p.tomoSugerido).toLowerCase().includes(texto) ||
      String(p.autoriza).toLowerCase().includes(texto) ||
      String(p.documento).toLowerCase().includes(texto) ||
      String(p.escaneado_por || "").toLowerCase().includes(texto)
    );
  });

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 relative">
      
      {esOperativo && alarmaActiva && pedidoCriticoActual && (
        <div className="fixed inset-0 bg-red-950 bg-opacity-85 z-50 flex items-center justify-center p-4 animate-pulse">
          <div className="bg-white border-4 border-red-600 rounded-lg shadow-2xl w-full max-w-lg p-6 text-center">
            <div className="text-red-600 text-5xl mb-2">🚨</div>
            <h2 className="text-2xl font-black text-red-700 uppercase tracking-wide mb-1">
              ¡TENEMOS UN PEDIDO PENDIENTE!
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              Hay una solicitud urgente en el Archivo Central esperando atención inmediata.
            </p>

            <div className="bg-red-50 border border-red-200 rounded p-4 text-left text-xs mb-6 space-y-2">
              <p><strong>Solicitante:</strong> {pedidoCriticoActual.solicitante}</p>
              <p><strong>Motivo:</strong> {pedidoCriticoActual.motivo}</p>
              <p><strong>Documento:</strong> {pedidoCriticoActual.documento} - <span className="text-purple-700 font-bold">{pedidoCriticoActual.incluye}</span></p>
              <p><strong>Año / Referencia:</strong> {pedidoCriticoActual.anio} | Kardex: {pedidoCriticoActual.kardex || "S/N"}</p>
              <p className="font-bold text-indigo-900 bg-indigo-50 p-1 rounded">
                Ubicación Sugerida: {pedidoCriticoActual.tomoSugerido || pedidoCriticoActual.tomo_sugerido}
              </p>
            </div>

            <div className="flex gap-3 justify-center">
              <button
                onClick={() => cambiarEstado(pedidoCriticoActual.id)}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded text-sm shadow-lg transition-transform transform active:scale-95 cursor-pointer animate-bounce"
              >
                🛠️ Atender Pedido Ahora (Iniciar Atención)
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-4">
              Esta alerta sonora y visual se detendrá en cuanto el pedido comience a ser atendido.
            </p>
          </div>
        </div>
      )}

      <div className="w-full max-w-[95%] mx-auto bg-white shadow-md rounded-sm overflow-hidden p-6">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-6 mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#243c5a]">Panel de Control - Archivo Central y Pedidos (Nube)</h1>
            <p className="text-sm text-gray-500 mt-1">
              {esOperativo ? "Sincronización en tiempo real de solicitudes y cronómetro." : "Modo Consulta (Solicitante): Monitoreo de estado de solicitudes enviadas."}
            </p>
          </div>
          
          <div className="flex items-center gap-3 flex-wrap">
            <button onClick={exportarExcel} className="bg-green-700 hover:bg-green-800 text-white font-medium py-2 px-4 rounded text-xs transition-colors shadow-sm cursor-pointer">
              📥 Exportar a Excel
            </button>
            <a href="/inventarios" className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-4 rounded text-xs transition-colors shadow-sm">
              Consultar Inventarios 📊
            </a>
            {esOperativo && (
              <a href="/salidas" className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded text-xs transition-colors shadow-sm">
                Registro de Entrada/Salida
              </a>
            )}
            <a href="/" className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-4 rounded text-xs transition-colors">
              Ir al Formulario
            </a>

            {usuarioActual && (
              <span className="text-xs font-semibold text-gray-700 bg-gray-100 px-3 py-2 rounded border">
                👤 {usuarioActual.nombre} ({usuarioActual.rol})
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

        <div className="mb-4 flex items-center gap-2">
          <input 
            type="text" 
            placeholder="🔍 Buscar por Kardex, Tomo, Año, Solicitante, Abogado, Atendido Por o ID..." 
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full md:w-1/2 p-2 border border-gray-300 rounded text-xs outline-none focus:border-blue-600 text-gray-700 shadow-sm"
          />
          {busqueda && (
            <button onClick={() => setBusqueda("")} className="bg-gray-200 px-3 py-2 rounded text-xs text-gray-600 hover:bg-gray-300">
              Limpiar
            </button>
          )}
        </div>

        <div className="overflow-x-auto pb-4">
          <table className="w-full text-center border-collapse text-[11px] border border-gray-300">
            <thead className="bg-[#243c5a] text-white">
              <tr>
                <th className="border border-gray-300 p-2">ID</th>
                <th className="border border-gray-300 p-2">Solicitante</th>
                <th className="border border-gray-300 p-2">Motivo</th>
                <th className="border border-gray-300 p-2">Documento</th>
                <th className="border border-gray-300 p-2">Incluye</th>
                <th className="border border-gray-300 p-2">Año</th>
                <th className="border border-gray-300 p-2">N° Kardex</th>
                <th className="border border-gray-300 p-2">N° de Folio</th>
                <th className="border border-gray-300 p-2">Instrumento</th>
                <th className="border border-gray-300 p-2">N° de Minuta</th>
                <th className="border border-gray-300 p-2 bg-indigo-900">Ubicación (Tomos Sugeridos)</th>
                <th className="border border-gray-300 p-2">Atendido Por</th>
                <th className="border border-gray-300 p-2">Abogado</th>
                <th className="border border-gray-300 p-2">Destino</th>
                <th className="border border-gray-300 p-2 bg-blue-900">Duración</th>
                <th className="border border-gray-300 p-2 bg-blue-900">Estado</th>
                {esOperativo && <th className="border border-gray-300 p-2">Acción</th>}
              </tr>
            </thead>
            <tbody>
              {pedidosFiltrados.length === 0 && (
                <tr>
                  <td colSpan={esOperativo ? 17 : 16} className="p-8 text-gray-400 font-medium text-center">
                    No se encontraron registros coincidentes.
                  </td>
                </tr>
              )}
              {pedidosFiltrados.map((item) => {
                let rowStyle = "hover:bg-gray-50 transition-colors";
                if (item.estado === "Pendiente") rowStyle = "bg-red-50 animate-pulse transition-colors"; 
                else if (item.estado === "En Proceso") rowStyle = "bg-yellow-50 transition-colors"; 
                else if (item.estado === "Listo para Recoger") rowStyle = "bg-cyan-100 transition-colors"; 
                else if (item.estado === "Atendido" || item.estado === "Entregado") rowStyle = "bg-green-200 text-gray-900 font-medium transition-colors"; 

                return (
                  <tr key={item.id} className={rowStyle}>
                    <td className="border border-gray-300 p-2 font-bold">{item.id}</td>
                    <td className="border border-gray-300 p-2">{item.solicitante}</td>
                    <td className="border border-gray-300 p-2">{item.motivo}</td>
                    <td className="border border-gray-300 p-2">{item.documento}</td>
                    <td className="border border-gray-300 p-2 font-semibold text-purple-700">{item.incluye}</td>
                    <td className="border border-gray-300 p-2">{item.anio}</td>
                    <td className="border border-gray-300 p-2 font-semibold">{item.kardex}</td>
                    <td className="border border-gray-300 p-2">{item.folio}</td>
                    <td className="border border-gray-300 p-2">{item.instrumento}</td>
                    <td className="border border-gray-300 p-2">{item.minuta_acta}</td>
                    
                    <td className="border border-gray-300 p-2 font-bold text-indigo-900 bg-indigo-50">
                      {item.tomoSugerido || item.tomo_sugerido}
                    </td>

                    <td className="border border-gray-300 p-2 font-bold text-gray-700">
                      {item.escaneado_por || "-"}
                    </td>

                    <td className="border border-gray-300 p-2">{item.autoriza}</td>
                    <td className="border border-gray-300 p-2">{item.enviar_a}</td>
                    <td className="border border-gray-300 p-2 font-semibold text-blue-700">{formatearTiempo(item.duracion_segundos)}</td>
                    
                    <td className="border border-gray-300 p-2 text-center">
                      <span className={`inline-block px-2 py-1 rounded text-[10px] font-bold shadow-sm ${
                        item.estado === "Pendiente" ? "bg-red-600 text-white" :
                        item.estado === "En Proceso" ? "bg-yellow-400 text-yellow-900" :
                        item.estado === "Listo para Recoger" ? "bg-cyan-600 text-white" :
                        "bg-green-600 text-white"
                      }`}>
                        {item.estado.toUpperCase()}
                      </span>
                    </td>

                    {esOperativo && (
                      <td className="border border-gray-300 p-2 align-middle">
                        <div className="flex flex-col items-center justify-center gap-1 w-full">
                          <button
                            onClick={() => cambiarEstado(item.id)}
                            type="button"
                            className={`w-full py-1 px-3 rounded text-[10px] font-bold text-white transition-colors shadow-sm cursor-pointer ${
                              item.estado === "Pendiente" ? "bg-red-600 hover:bg-red-700" :
                              item.estado === "En Proceso" ? "bg-yellow-600 hover:bg-yellow-700" :
                              "bg-gray-500 hover:bg-gray-600"
                            }`}
                          >
                            {item.estado === "Pendiente" && "Iniciar Atención"}
                            {item.estado === "En Proceso" && "Finalizar Atención"}
                            {(item.estado === "Atendido" || item.estado === "Listo para Recoger" || item.estado === "Entregado") && "Reiniciar"}
                          </button>

                          {item.estado === "Listo para Recoger" && (
                            <button
                              onClick={() => enviarA_Salidas(item)}
                              type="button"
                              className="w-full bg-cyan-600 hover:bg-cyan-700 text-white py-1 px-2 rounded text-[10px] font-bold shadow-sm cursor-pointer"
                            >
                              Llevar a Entregar ✍️
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}