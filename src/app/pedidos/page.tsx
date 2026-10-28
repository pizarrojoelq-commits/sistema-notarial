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
  tomoSeleccionado1?: string; 
  tomoSeleccionado2?: string; 
}

export default function PanelPedidos() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [usuarioActual, setUsuarioActual] = useState<{ nombre: string; rol: string } | null>(null);
  const [busqueda, setBusqueda] = useState("");
  
  // LAS 7 TABLAS DE INVENTARIO BASADAS EN TU BASE DE DATOS SUPABASE
  const [listaEscrituras, setListaEscrituras] = useState<any[]>([]);
  const [listaMinutas, setListaMinutas] = useState<any[]>([]);
  const [listaNoContenciosos, setListaNoContenciosos] = useState<any[]>([]);
  const [listaVehiculares, setListaVehiculares] = useState<any[]>([]);
  const [listaActasVehiculares, setListaActasVehiculares] = useState<any[]>([]);
  const [listaMinutarioNC, setListaMinutarioNC] = useState<any[]>([]);
  const [listaSolicitudesNC, setListaSolicitudesNC] = useState<any[]>([]);

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

    cargarCatalogosInventario();
    cargarPedidosNube();
  }, []);

  const cargarCatalogosInventario = async () => {
    try {
      const { data: esc } = await supabase.from("inv_escrituras").select("TOMO, AÑO");
      const { data: min } = await supabase.from("inv_minutas").select("TOMO, AÑO");
      const { data: nc } = await supabase.from("inv_no_contenciosos").select("TOMO, AÑO");
      const { data: veh } = await supabase.from("inv_vehiculares").select("TOMO, AÑO");
      const { data: actVeh } = await supabase.from("inv_actas_vehiculares").select("TOMO, ACTA, AÑO");
      const { data: minNC } = await supabase.from("inv_minutario_no_contenciosos").select("TOMO, AÑO");
      const { data: solNC } = await supabase.from("inv_solicitudes_no_contenciosos").select("TOMO, ANEXO, AÑO");

      // ORDENAMIENTO MATEMÁTICO PERFECTO EXTRAIYENDO SOLO NÚMEROS
      const ordenarNumericamente = (a: any, b: any) => {
        const valA = String(a.TOMO ?? a.ACTA ?? a.ANEXO ?? "0");
        const valB = String(b.TOMO ?? b.ACTA ?? b.ANEXO ?? "0");
        const matchA = valA.match(/\d+/);
        const matchB = valB.match(/\d+/);
        const numA = matchA ? parseInt(matchA[0], 10) : 0;
        const numB = matchB ? parseInt(matchB[0], 10) : 0;
        return numA - numB;
      };

      if (esc) setListaEscrituras(esc.sort(ordenarNumericamente));
      if (min) setListaMinutas(min.sort(ordenarNumericamente));
      if (nc) setListaNoContenciosos(nc.sort(ordenarNumericamente));
      if (veh) setListaVehiculares(veh.sort(ordenarNumericamente));
      if (actVeh) setListaActasVehiculares(actVeh.sort(ordenarNumericamente));
      if (minNC) setListaMinutarioNC(minNC.sort(ordenarNumericamente));
      if (solNC) setListaSolicitudesNC(solNC.sort(ordenarNumericamente));
    } catch (e) {
      console.error("Error al cargar catálogos:", e);
    }
  };

  const cargarPedidosNube = async () => {
    try {
      const { data, error } = await supabase
        .from("pedidos")
        .select("*")
        .order("id", { ascending: true });

      if (error) {
        console.error("Error al cargar pedidos:", error);
        return;
      }

      if (data) {
        await procesarYActualizarPedidos(data);
      }
    } catch (err) {
      console.error("Error de conexión:", err);
    }
  };

  const perteneceAlRango = (numBuscado: number, textoRango: string) => {
    if (!textoRango) return false;
    const limpio = String(textoRango).trim();
    if (!limpio.includes('-') && !limpio.includes('–')) {
      return parseInt(limpio, 10) === numBuscado;
    }
    const partes = limpio.split(/[-–]/);
    const min = parseInt(partes[0].trim(), 10);
    const max = parseInt(partes[1].trim(), 10);
    return !isNaN(min) && !isNaN(max) && numBuscado >= min && numBuscado <= max;
  };

  const calcularTomoNubeDinamico = async (documento: string, incluye: string, anioBuscado: string, instrumento: string, minutaActa: string, folioStr: string) => {
    const numFolio = parseInt((folioStr || "").replace(/[,.]/g, '')) || 0;
    const numInstrumento = parseInt((instrumento || "").replace(/[,.]/g, '')) || 0;
    const numMinuta = parseInt((minutaActa || "").replace(/[,.]/g, '')) || 0;
    
    const nRefIndicador = numMinuta > 0 ? numMinuta : (numInstrumento > 0 ? numInstrumento : 0);

    let resultados: string[] = [];
    const docLower = (documento || "").toLowerCase().trim();
    const incluyeLower = (incluye || "").toLowerCase().trim();

    if ((docLower.includes("solicitud") || docLower.includes("solicitudes")) && (docLower.includes("no contencioso") || docLower.includes("no contenciosos"))) {
      if (nRefIndicador === 0) {
        resultados.push("[Solicitud de No Contencioso sin N°]");
      } else {
        const { data: dataSol } = await supabase.from("inv_solicitudes_no_contenciosos").select("*");
        let halladoSol = dataSol?.find((s: any) => {
          const coincideRef = perteneceAlRango(nRefIndicador, s["RANGO DE SOLICITUD"] || s.rango);
          const anioFila = String(s["AÑO"] || s.anio || "").replace(/\s+/g, '');
          const anioBuscadoClean = String(anioBuscado || "").trim();
          return coincideRef && (!anioBuscadoClean || anioFila.includes(anioBuscadoClean));
        });

        if (halladoSol) {
          const valorTomoAnexo = halladoSol.TOMO || halladoSol.tomo || halladoSol.ANEXO || halladoSol.anexo || nRefIndicador;
          resultados.push(`Tomo ${valorTomoAnexo} (Solicitudes No Contenciosos)`);
        } else {
          resultados.push(`[Solicitud No Contenciosa Ref: ${nRefIndicador} no hallada]`);
        }
      }
    }
    else if (docLower.includes("minuta") && (docLower.includes("no contencioso") || docLower.includes("no contenciosos"))) {
      if (nRefIndicador === 0) {
        resultados.push("[Minuta de No Contencioso sin N°]");
      } else {
        const { data: dataMinNC } = await supabase.from("inv_minutario_no_contenciosos").select("*");
        let halladoMinNC = dataMinNC?.find((m: any) => {
          const coincideRef = perteneceAlRango(nRefIndicador, m["RANGO DE MINUTAS"] || m.rango);
          const anioFila = String(m["AÑO"] || m.anio || "");
          return coincideRef && (!anioBuscado || anioFila.includes(anioBuscado));
        });

        if (halladoMinNC) {
          resultados.push(`Tomo ${halladoMinNC.TOMO || halladoMinNC.tomo} (Minutario No Contenciosos)`);
        } else {
          resultados.push(`[Minutario No Contencioso Ref: ${nRefIndicador} no hallado]`);
        }
      }
    } 
    else if (docLower.includes("minuta")) {
      const nRefMinuta = nRefIndicador > 0 ? nRefIndicador : numFolio;
      if (nRefMinuta === 0) {
        resultados.push("[Minuta 0]");
      } else {
        const { data: dataMin } = await supabase.from("inv_minutas").select("*");
        let halladoMin = dataMin?.find((m: any) => {
          const coincideRef = perteneceAlRango(nRefMinuta, m["RANGO DE MINUTAS"] || m.rango);
          const anioFila = String(m["AÑO"] || m.anio || "");
          return coincideRef && (!anioBuscado || anioFila.includes(anioBuscado));
        });

        if (halladoMin) {
          resultados.push(`Tomo ${halladoMin.TOMO || halladoMin.tomo} (Minutas)`);
        } else {
          resultados.push(`[Minuta ${nRefMinuta} no hallada]`);
        }
      }
    } 
    else if (docLower === "escritura" || docLower.includes("escritura pública") || docLower.includes("escritura")) {
      if (numFolio === 0) {
        resultados.push("[Folio 0]");
      } else {
        const { data } = await supabase.from("inv_escrituras").select("*");
        let hallado = data?.find((e: any) => {
          const coincideRef = perteneceAlRango(numFolio, e["RANGO DE FOLIOS"] || e.rango);
          const anioFila = String(e["AÑO"] || e.anio || "");
          return coincideRef && (!anioBuscado || anioFila.includes(anioBuscado));
        });

        if (hallado) {
          resultados.push(`Tomo ${hallado.TOMO || hallado.tomo} (Escrituras ${hallado.AÑO || hallado.anio || anioBuscado})`);
        } else {
          resultados.push(`[Folio ${numFolio} no hallado en Escrituras]`);
        }
      }

      if (incluyeLower.includes("incluye minuta") || incluyeLower === "incluye minuta" || incluyeLower.includes("minuta")) {
        const nMinutaReal = numMinuta;
        if (nMinutaReal > 0) {
          const { data: dataMin } = await supabase.from("inv_minutas").select("*");
          let halladoMin = dataMin?.find((m: any) => {
            const rangoTexto = m["RANGO DE MINUTAS"] || m.rango || "";
            const coincideRef = perteneceAlRango(nMinutaReal, rangoTexto);
            const anioFila = String(m["AÑO"] || m.anio || "").replace(/\s+/g, '');
            const anioPedido = String(anioBuscado || "").replace(/\s+/g, '');
            
            let coincideAnio = false;
            if (!anioPedido) {
              coincideAnio = true;
            } else if (anioFila.includes(anioPedido) || anioPedido.includes(anioFila)) {
              coincideAnio = true;
            } else if (anioFila.includes('-') || anioFila.includes('–')) {
              const partesAnio = anioFila.split(/[-–]/);
              const inicioAnio = parseInt(partesAnio[0], 10);
              const finAnio = parseInt(partesAnio[1], 10);
              const pedidoNum = parseInt(anioPedido, 10);
              if (!isNaN(inicioAnio) && !isNaN(finAnio) && !isNaN(pedidoNum)) {
                coincideAnio = pedidoNum >= inicioAnio && pedidoNum <= finAnio;
              }
            }
            return coincideRef && coincideAnio;
          });

          if (halladoMin) {
            resultados.push(`Tomo ${halladoMin.TOMO || halladoMin.tomo} (Minutas Anexas)`);
          } else {
            resultados.push(`[Minuta ${nMinutaReal} anexa no hallada]`);
          }
        }
      }
    }
    else if (docLower.includes("acta de transferencia vehicular") || (docLower.includes("acta") && !docLower.includes("transferencia"))) {
      const nRefActa = nRefIndicador > 0 ? nRefIndicador : numFolio;
      const { data: dataActa } = await supabase.from("inv_actas_vehiculares").select("*");
      let halladoActa = dataActa?.find((a: any) => {
        const coincideRef = perteneceAlRango(nRefActa, a["RANGO DE ACTAS"] || a.rango);
        const anioFila = String(a["AÑO"] || a.anio || "");
        return coincideRef && (!anioBuscado || anioFila.includes(anioBuscado));
      });

      if (halladoActa) {
        resultados.push(`ACTA ${halladoActa.TOMO || halladoActa.ACTA || halladoActa.archivador || '1'} (Actas Vehiculares)`);
      } else {
        resultados.push(`[Acta Ref: ${nRefActa} no hallada]`);
      }
    }
    else if (docLower.includes("vehicular") || docLower.includes("transferencia")) {
      const nRefVeh = numFolio > 0 ? numFolio : numInstrumento;
      const { data: dataVeh } = await supabase.from("inv_vehiculares").select("*");
      let halladoVeh = dataVeh?.find((v: any) => {
        const coincideRef = perteneceAlRango(nRefVeh, v["RANGO DE FOLIOS"] || v.rango);
        const anioFila = String(v["AÑO"] || v.anio || "");
        return coincideRef && (!anioBuscado || anioFila.includes(anioBuscado));
      });

      if (halladoVeh) {
        resultados.push(`Tomo ${halladoVeh.TOMO || halladoVeh.tomo} (Transferencia Vehicular)`);
      } else {
        resultados.push(`[Vehicular ${nRefVeh} no hallado]`);
      }
    }
    else if (docLower.includes("no contencioso") || docLower.includes("no contenciosos")) {
      if (numFolio === 0) {
        resultados.push("[Folio No Contencioso 0]");
      } else {
        const { data: dataNC } = await supabase.from("inv_no_contenciosos").select("*");
        let halladoNC = dataNC?.find((nc: any) => {
          const coincideRef = perteneceAlRango(numFolio, nc["RANGO DE FOLIOS"] || nc.rango);
          const anioFila = String(nc["AÑO"] || nc.anio || "");
          return coincideRef && (!anioBuscado || anioFila.includes(anioBuscado));
        });

        if (halladoNC) {
          resultados.push(`Tomo ${halladoNC.TOMO || halladoNC.tomo} (No Contenciosos)`);
        } else {
          resultados.push(`[Folio No Contencioso ${numFolio} no hallado]`);
        }
      }

      const nRefAdicional = nRefIndicador > 0 ? nRefIndicador : numFolio;
      if (incluyeLower.includes("solicitud")) {
        const { data: dataSol } = await supabase.from("inv_solicitudes_no_contenciosos").select("*");
        let halladoSol = dataSol?.find((s: any) => {
          const coincideRef = perteneceAlRango(nRefAdicional, s["RANGO DE SOLICITUD"] || s.rango);
          const anioFila = String(s["AÑO"] || s.anio || "");
          return coincideRef && (!anioBuscado || anioFila.includes(anioBuscado));
        });

        if (halladoSol) {
          const valorTomoAnexo = halladoSol.TOMO || halladoSol.tomo || halladoSol.ANEXO || halladoSol.anexo || nRefAdicional;
          resultados.push(`Tomo ${valorTomoAnexo} (Solicitudes No Contenciosos)`);
        } else {
          resultados.push(`[Solicitud No Contenciosa Ref: ${nRefAdicional} no hallada]`);
        }
      } 
      else if (incluyeLower.includes("minuta") || incluyeLower.includes("minutario")) {
        const { data: dataMinNC } = await supabase.from("inv_minutario_no_contenciosos").select("*");
        let halladoMinNC = dataMinNC?.find((m: any) => {
          const coincideRef = perteneceAlRango(nRefAdicional, m["RANGO DE MINUTAS"] || m.rango);
          const anioFila = String(m["AÑO"] || m.anio || "");
          return coincideRef && (!anioBuscado || anioFila.includes(anioBuscado));
        });

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
        const tomoCalculado = await calcularTomoNubeDinamico(
          item.documento, item.incluye, item.anio, item.instrumento || "", item.minuta_acta || "", item.folio || ""
        );
        const sugeridoFinal = item.tomoSugerido || item.tomo_sugerido || tomoCalculado;
        const partes = sugeridoFinal.split("+").map((s: string) => s.trim());

        return { 
          ...item, 
          tomoSugerido: sugeridoFinal, 
          tomo_sugerido: sugeridoFinal,
          tomoSeleccionado1: item.tomoSeleccionado1 || partes[0] || "",
          tomoSeleccionado2: item.tomoSeleccionado2 || partes[1] || ""
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
    } else {
      setPedidoCriticoActual(null);
      setAlarmaActiva(false);
    }
  };

  useEffect(() => {
    if (!isMounted) return;
    const intervaloMonitoreo = setInterval(() => {
      cargarPedidosNube();
    }, 5000); 
    return () => clearInterval(intervaloMonitoreo);
  }, [isMounted]);

  const cerrarSesion = () => {
    localStorage.removeItem("usuarioLogueado");
    window.location.href = "/login";
  };

  const reproducirAlarmaConstante = () => {
    const sesion = localStorage.getItem("usuarioLogueado");
    const usuarioObj = sesion ? JSON.parse(sesion) : null;
    if (usuarioObj && (usuarioObj.rol === "EXTERNO" || usuarioObj.nombre.includes("Cinthia") || usuarioObj.nombre.includes("Enrique"))) return;

    try {
      const audio = new Audio("/timbre.mp3"); 
      audio.volume = 1.0; 
      audio.play().catch(e => console.log("Audio esperando interacción:", e));
    } catch (e) {
      console.error("Error de audio:", e);
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
      const combinado = [pedidoActual.tomoSeleccionado1, pedidoActual.tomoSeleccionado2].filter(Boolean).join(" + ");
      await supabase
        .from("pedidos")
        .update({
          estado: nuevoEstado,
          escaneado_por: nuevoEscaneadoPor,
          tiempo_inicio: nuevoTiempoInicio,
          duracion_segundos: nuevaDuracion,
          tomo_sugerido: combinado
        })
        .eq("id", id);

      cargarPedidosNube();
    } catch (err) {
      console.error("Error al cambiar estado:", err);
    }
  };

  const enviarA_Salidas = async (pedido: Pedido) => {
    if (usuarioActual?.rol !== "OPERATIVO") return;

    const anioBuscado = pedido.anio || "2026";
    const operadorActual = usuarioActual ? usuarioActual.nombre : "Archivo";
    
    const tomosElegidos = [pedido.tomoSeleccionado1, pedido.tomoSeleccionado2].filter((t): t is string => Boolean(t && t.trim() !== ""));
    if (tomosElegidos.length === 0) {
      alert("⚠️ Debe seleccionar al menos un tomo válido antes de enviar a salidas.");
      return;
    }

    let registrosSalidaParaInsertar: any[] = [];
    let tomosActualizadosTexto: string[] = [];

    for (let index = 0; index < tomosElegidos.length; index++) {
      const tomoTexto: string = tomosElegidos[index];

      registrosSalidaParaInsertar.push({
        id: `salida-${pedido.id}-${index}-${Date.now()}`,
        pedido_id: Number(pedido.id),
        tipo: "SALIDAS",
        tomo_exacto: tomoTexto,
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
        observaciones: `Solicitante: ${pedido.solicitante} - Doc: ${pedido.documento} (${pedido.incluye})`,
        firma_digital: "",
        estado: "Pendiente de Entrega"
      });

      const matchNum = tomoTexto.match(/(\d+)/);
      const numeroTomo = matchNum ? matchNum[1] : null;

      if (numeroTomo) {
        try {
          const textoLower = tomoTexto.toLowerCase();
          let tablaActualizada = "";

          if (textoLower.includes("escritura") || (!textoLower.includes("minuta") && !textoLower.includes("acta") && !textoLower.includes("no contencioso") && !textoLower.includes("vehicular"))) {
            await supabase.from("inv_escrituras").update({ ESTADO: "NO DISPONIBLE" }).eq("TOMO", numeroTomo);
            tablaActualizada = "Escrituras";
          } 
          else if (textoLower.includes("minuta")) {
            await supabase.from("inv_minutas").update({ ESTADO: "NO DISPONIBLE" }).eq("TOMO", numeroTomo);
            tablaActualizada = "Minutas";
          } 
          else if (textoLower.includes("no contencioso")) {
            // Verifica si es minutario o solicitud
            if (textoLower.includes("minutario")) {
              await supabase.from("inv_minutario_no_contenciosos").update({ ESTADO: "NO DISPONIBLE" }).eq("TOMO", numeroTomo);
              tablaActualizada = "Minutario No Contenciosos";
            } else if (textoLower.includes("solicitud")) {
              await supabase.from("inv_solicitudes_no_contenciosos").update({ ESTADO: "NO DISPONIBLE" }).eq("TOMO", numeroTomo);
              tablaActualizada = "Solicitudes No Contenciosos";
            } else {
              await supabase.from("inv_no_contenciosos").update({ ESTADO: "NO DISPONIBLE" }).eq("TOMO", numeroTomo);
              tablaActualizada = "No Contenciosos";
            }
          } 
          else if (textoLower.includes("vehicular") || textoLower.includes("acta")) {
            await supabase.from("inv_actas_vehiculares").update({ ESTADO: "NO DISPONIBLE" }).eq("TOMO", numeroTomo);
            tablaActualizada = "Vehiculares/Actas";
          }

          tomosActualizadosTexto.push(`${tomoTexto} (Actualizado a NO DISPONIBLE en ${tablaActualizada})`);
        } catch (err) {
          console.error("Error al actualizar inventario:", err);
        }
      }
    }

    try {
      const { error } = await supabase.from("salidas").insert(registrosSalidaParaInsertar);

      if (error) {
        console.error("Error al registrar salidas:", error);
        alert("No se pudo transferir a salidas en la nube.");
        return;
      }

      alert(`✅ ¡Salida registrada con éxito!\n\nSe actualizó la base de datos y ahora figuran como NO DISPONIBLE:\n- ${tomosActualizadosTexto.join("\n- ")}`);
      window.location.href = "/salidas";
    } catch (e) {
      console.error("Error:", e);
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

  // FUNCIONES AUXILIARES PARA DETERMINAR QUÉ LISTA MOSTRAR EN LOS DESPLEGABLES SEGÚN EL DOCUMENTO
  const obtenerOpcionesPrincipal = (doc: string) => {
    const d = (doc || "").toLowerCase();
    if ((d.includes("solicitud") || d.includes("solicitudes")) && d.includes("no contencioso")) return { lista: listaSolicitudesNC, lbl: "Solicitudes NC" };
    if (d.includes("minuta") && d.includes("no contencioso")) return { lista: listaMinutarioNC, lbl: "Minutario NC" };
    if (d.includes("minuta")) return { lista: listaMinutas, lbl: "Minutas" };
    if (d.includes("acta") || d.includes("acta de transferencia vehicular")) return { lista: listaActasVehiculares, lbl: "Actas Vehiculares" };
    if (d.includes("vehicular") || d.includes("transferencia")) return { lista: listaVehiculares, lbl: "Transferencia Vehicular" };
    if (d.includes("no contencioso")) return { lista: listaNoContenciosos, lbl: "No Contenciosos" };
    return { lista: listaEscrituras, lbl: "Escrituras" };
  };

  const obtenerOpcionesAnexo = (doc: string, inc: string) => {
    const d = (doc || "").toLowerCase();
    const i = (inc || "").toLowerCase();
    if (!i) return null;
    if (d.includes("no contencioso")) {
      if (i.includes("solicitud")) return { lista: listaSolicitudesNC, lbl: "Solicitudes Anexas" };
      if (i.includes("minuta")) return { lista: listaMinutarioNC, lbl: "Minutario Anexo" };
    }
    if (d.includes("vehicular") || d.includes("transferencia")) {
      if (i.includes("acta")) return { lista: listaActasVehiculares, lbl: "Actas Anexas" };
    }
    if (d.includes("escritura")) {
      if (i.includes("minuta")) return { lista: listaMinutas, lbl: "Minutas Anexas" };
    }
    return null;
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
      String(p.tomoSugerido || "").toLowerCase().includes(texto) ||
      String(p.autoriza).toLowerCase().includes(texto) ||
      String(p.documento).toLowerCase().includes(texto)
    );
  });

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 relative">
      <div className="w-full max-w-[95%] mx-auto bg-white shadow-md rounded-sm overflow-hidden p-6">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-6 mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#243c5a]">Panel de Control - Archivo Central y Pedidos (Nube)</h1>
            <p className="text-sm text-gray-500 mt-1">
              {esOperativo ? "Gestión de pedidos con búsqueda automática y selección desplegable." : "Modo Consulta."}
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
            <button onClick={cerrarSesion} className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-3 rounded text-xs transition-colors shadow-sm cursor-pointer">
              Cerrar Sesión
            </button>
          </div>
        </div>

        <div className="mb-4 flex items-center gap-2">
          <input 
            type="text" 
            placeholder="🔍 Buscar por Kardex, Tomo, Año, Solicitante..." 
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
                <th className="border border-gray-300 p-2">N° Folio / Minuta</th>
                <th className="border border-gray-300 p-2 bg-indigo-900">Ubicación (Búsqueda Automática + Desplegables)</th>
                <th className="border border-gray-300 p-2">Atendido Por</th>
                <th className="border border-gray-300 p-2">Abogado</th>
                <th className="border border-gray-300 p-2 bg-blue-900">Duración</th>
                <th className="border border-gray-300 p-2 bg-blue-900">Estado</th>
                {esOperativo && <th className="border border-gray-300 p-2">Acción</th>}
              </tr>
            </thead>
            <tbody>
              {pedidosFiltrados.length === 0 && (
                <tr>
                  <td colSpan={14} className="p-8 text-gray-400 font-medium text-center">
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

                // Resolvemos qué listas mostrar basándonos en el documento
                const configPrincipal = obtenerOpcionesPrincipal(item.documento);
                const configAnexo = obtenerOpcionesAnexo(item.documento, item.incluye);

                return (
                  <tr key={item.id} className={rowStyle}>
                    <td className="border border-gray-300 p-2 font-bold">{item.id}</td>
                    <td className="border border-gray-300 p-2">{item.solicitante}</td>
                    <td className="border border-gray-300 p-2">{item.motivo}</td>
                    <td className="border border-gray-300 p-2">{item.documento}</td>
                    <td className="border border-gray-300 p-2 font-semibold text-purple-700">{item.incluye}</td>
                    <td className="border border-gray-300 p-2">{item.anio}</td>
                    <td className="border border-gray-300 p-2 font-semibold">{item.kardex}</td>
                    <td className="border border-gray-300 p-2">{item.folio || item.minuta_acta || "-"}</td>
                    
                    {/* DESPLEGABLES CON AUTO-SELECCIÓN Y OPCIÓN DE CAMBIO DESDE SUPABASE */}
                    <td className="border border-gray-300 p-2 bg-indigo-50 space-y-1">
                      <select 
                        value={item.tomoSeleccionado1 || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPedidos(prev => prev.map(p => p.id === item.id ? { ...p, tomoSeleccionado1: val } : p));
                        }}
                        className="w-full bg-white border border-indigo-300 rounded p-1 text-[10px] font-bold text-indigo-950 outline-none"
                      >
                        <option value="">-- Seleccionar Principal --</option>
                        {configPrincipal.lista.map((x, idx) => {
                          const valorTomo = x.TOMO || x.ACTA || x.ANEXO;
                          const esActa = String(valorTomo).toLowerCase().includes("acta");
                          return (
                            <option key={`prin-${idx}`} value={`${esActa ? '' : 'Tomo '}${valorTomo} (${configPrincipal.lbl})`}>
                              {esActa ? '' : 'Tomo '} {valorTomo} (Año {x.AÑO || 'S/A'})
                            </option>
                          );
                        })}
                        <option value={item.tomoSeleccionado1}>{item.tomoSeleccionado1 || "Actual (Automático)"}</option>
                      </select>

                      {configAnexo && (
                        <select 
                          value={item.tomoSeleccionado2 || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPedidos(prev => prev.map(p => p.id === item.id ? { ...p, tomoSeleccionado2: val } : p));
                          }}
                          className="w-full bg-purple-50 border border-purple-300 rounded p-1 text-[10px] font-bold text-purple-950 outline-none"
                        >
                          <option value="">-- Seleccionar Anexo --</option>
                          {configAnexo.lista.map((x, idx) => {
                            const valorTomo = x.TOMO || x.ACTA || x.ANEXO;
                            const esActa = String(valorTomo).toLowerCase().includes("acta");
                            return (
                              <option key={`anx-${idx}`} value={`${esActa ? '' : 'Tomo '}${valorTomo} (${configAnexo.lbl})`}>
                                {esActa ? '' : 'Tomo '} {valorTomo} (Año {x.AÑO || 'S/A'})
                              </option>
                            );
                          })}
                          <option value={item.tomoSeleccionado2}>{item.tomoSeleccionado2 || "Anexo (Automático)"}</option>
                        </select>
                      )}
                    </td>

                    <td className="border border-gray-300 p-2 font-bold text-gray-700">{item.escaneado_por || "-"}</td>
                    <td className="border border-gray-300 p-2">{item.autoriza}</td>
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