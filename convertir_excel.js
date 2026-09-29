const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

// Credenciales de tu proyecto de Supabase
const supabaseUrl = 'https://cfmoluhhmzblnzlefqw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmbW9sdWhobXpibG56bG5lZnF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAzNTA2MzksImV4cCI6MjEwNTkyNjYzOX0.h24L0N_tzbouCl6NR3yw0ljvxr-vIF8GscpeLTl3fqc';
const supabase = createClient(supabaseUrl, supabaseKey);

async function procesarExcel(filePath, categoria) {
  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    console.log(`Subiendo ${categoria} (${data.length} registros)...`);

    for (let row of data) {
      let item = {
        categoria: categoria,
        tomo: String(row['TOMO'] || row['ANEXO'] || row['ARCHIVADOR'] || '-'),
        archivador: String(row['ARCHIVADOR'] || row['N° ARCHIVADOR'] || '1'),
        anio: String(row['AÑO'] || row['AÑO DE REGISTRO'] || ''),
        rango: String(row['RANGO DE FOLIOS'] || row['RANGO DE MINUTAS'] || row['RANGO DE SOLICITUD'] || row['RANGO DE ACTA'] || ''),
        estado: (row['ESTADO'] || 'DISPONIBLE').toUpperCase()
      };

      const { error } = await supabase.from('inventarios').insert([item]);
      if (error) {
        console.error(`Error al insertar en ${categoria}:`, error.message);
      }
    }
    console.log(`✅ ${categoria} procesado con éxito.`);
  } catch (err) {
    console.error(`No se pudo leer el archivo para [${categoria}]:`, err.message);
  }
}

async function ejecutar() {
  // Asegúrate de que estos archivos estén en la misma carpeta raíz o en una carpeta data-excel
  // Aquí apuntan directamente a la raíz con los nombres exactos de tu captura:
  await procesarExcel('./inventario_escrituras.xlsx', 'Escrituras');
  await procesarExcel('./INVENTARIO DE MINUTAS.xlsx', 'Minutas');
  await procesarExcel('./INVENTARIO DE TRANFERENCIAS VEHICULARES.xlsx', 'Transferencias Vehiculares');
  await procesarExcel('./Inventario DE ACTAS DE Trasferencias vehiculares.xlsx', 'Actas Transferencias Vehiculares');
  await procesarExcel('./INVENTARIO DE NO CONTENCIOSOS.xlsx', 'Asuntos No Contenciosos');
  await procesarExcel('./MINUTARIO DE ASUNTOS NO CONTENCIOSO.xlsx', 'Minutario No Contenciosos');
  await procesarExcel('./SOLICITUDES DE ASUNTOS NO CONTENCIOSOS.xlsx', 'Solicitudes No Contenciosos');
  
  console.log('🎉 ¡Carga masiva de inventarios finalizada!');
}

ejecutar();