const XLSX = require("xlsx");
const fs = require("fs");

console.log("⏳ Iniciando conversión de Excels a JSON...");

// Crear la carpeta data si no existe
const dataDir = "./src/data";
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

try {
    // ---------------------------------------------------------
    // 1. Procesar INVENTARIO DE ESCRITURAS
    // ---------------------------------------------------------
    const wbEscrituras = XLSX.readFile("Registro Produccion (1).xlsx");
    const sheetEscrituras = wbEscrituras.Sheets["INVENTARIO DE ESCRITURAS"];
    // Leemos el excel como un arreglo de arreglos (filas y columnas)
    const dataEscrituras = XLSX.utils.sheet_to_json(sheetEscrituras, { header: 1 });

    const escriturasJson = [];
    
    // Iteramos desde la fila 2 (índice 2) para saltar los títulos principales
    for (let i = 2; i < dataEscrituras.length; i++) {
        const row = dataEscrituras[i];
        
        // Ajustamos los índices según las columnas de tu imagen:
        // row[1] = TOMO, row[2] = AÑO, row[3] = RANGO DE FOLIOS, row[10] = ESTADO
        if (row && row[1]) { 
            const rangoStr = String(row[3] || "");
            const limites = rangoStr.split("-");
            const folioIni = limites[0] ? parseInt(limites[0].trim()) : 0;
            const folioFin = limites[1] ? parseInt(limites[1].trim()) : 0;

            escriturasJson.push({
                tomo: String(row[1]),
                anio: String(row[2] || ""),
                rangoFolios: rangoStr,
                folioInicial: folioIni,
                folioFinal: folioFin,
                estado: String(row[10] || "DISPONIBLE")
            });
        }
    }
    fs.writeFileSync(`${dataDir}/escrituras_db.json`, JSON.stringify(escriturasJson, null, 2));
    console.log(`✅ ${escriturasJson.length} tomos de ESCRITURAS convertidos a JSON.`);

    // ---------------------------------------------------------
    // 2. Procesar INVENTARIO DE MINUTAS
    // ---------------------------------------------------------
    const wbMinutas = XLSX.readFile("INVENTARIO DE MINUTAS - copia.xlsx");
    const sheetMinutas = wbMinutas.Sheets["INVENTARIO"];
    const dataMinutas = XLSX.utils.sheet_to_json(sheetMinutas, { header: 1 });

    const minutasJson = [];
    
    for (let i = 2; i < dataMinutas.length; i++) {
        const row = dataMinutas[i];
        
        // Ajustamos los índices según tu imagen de minutas:
        // row[1] = TOMO, row[2] = AÑO, row[3] = RANGO DE MINUTAS, row[9] = ESTADO
        if (row && row[1]) {
            const rangoStr = String(row[3] || "");
            const limites = rangoStr.split("-");
            const minIni = limites[0] ? parseInt(limites[0].trim()) : 0;
            const minFin = limites[1] ? parseInt(limites[1].trim()) : 0;

            minutasJson.push({
                tomo: String(row[1]),
                anio: String(row[2] || ""),
                rangoMinutas: rangoStr,
                minutaInicial: minIni,
                minutaFinal: minFin,
                estado: String(row[9] || "DISPONIBLE")
            });
        }
    }
    fs.writeFileSync(`${dataDir}/minutas_db.json`, JSON.stringify(minutasJson, null, 2));
    console.log(`✅ ${minutasJson.length} tomos de MINUTAS convertidos a JSON.`);

    console.log("🎉 ¡Conversión terminada exitosamente!");

} catch (error) {
    console.error("❌ Error durante la conversión. Asegúrate de que los archivos Excel estén cerrados y tengan los nombres exactos.");
    console.error(error.message);
}