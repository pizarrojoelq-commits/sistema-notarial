const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

// Configura tus credenciales de Supabase
const supabaseUrl = 'https://cfmoluhhmzblnzlnefqw.supabase.co';
const supabaseAnonKey ='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmbW9sdWhobXpibG56bG5lZnF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAzNTA2MzksImV4cCI6MjEwNTkyNjYzOX0.h24L0N_tzbouCl6NR3yw0ljvxr-vIF8GscpeLTl3fqc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function procesarYSubirExcel(filePath, tipoInventario) {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

  console.log(`Procesando ${tipoInventario} (${data.length} filas)...`);

  for (let row of data) {
    // Mapeo adaptado según la estructura de tus imágenes
    let item = {
      tipo: tipoInventario,
      tomo: row['TOMO'] || row['ANEXO'] || row['ARCHIVADOR'] || '1',
      anio: String(row['AÑO'] || ''),
      rango: String(row['RANGO DE FOLIOS'] || row['RANGO DE MINUTAS'] || row['RANGO DE SOLICITUD'] || row['RANGO DE ACTA'] || ''),
      estado: (row['ESTADO'] || 'DISPONIBLE').toUpperCase()
    };

    const { error } = await supabase.from('inventarios').insert([item]);
    if (error) {
      console.error(`Error al insertar en ${tipoInventario}:`, error.message);
    }
  }
  console.log(`✅ ${tipoInventario} subido y sincronizado con éxito.`);
}

// Ejecución de ejemplo para tus archivos
async function ejecutar() {
  await procesarYSubirExcel('./inventario_no_contenciosos.xlsx', 'No Contenciosos');
  await procesarYSubirExcel('./inventario_vehiculares.xlsx', 'Transferencias Vehiculares');
  await procesarYSubirExcel('./actas_vehiculares.xlsx', 'Actas de Transferencias Vehiculares'); // Incluye archivador
  await procesarYSubirExcel('./minutario_no_contenciosos.xlsx', 'Minutario No Contenciosos');
  await procesarYSubirExcel('./anexos_no_contenciosos.xlsx', 'Anexos Solicitudes No Contenciosos');
}

ejecutar();