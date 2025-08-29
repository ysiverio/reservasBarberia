const { google } = require('googleapis');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    console.log('=== INICIO DE RESERVE-TEST ===');
    console.log('Event body:', event.body);
    
    // Verificar variables de entorno
    const envVars = {
      hasCredentials: !!process.env.GOOGLE_CREDENTIALS,
      hasCalendarId: !!process.env.GOOGLE_CALENDAR_ID,
      hasSheetId: !!process.env.GOOGLE_SHEET_ID,
      hasEmailFrom: !!process.env.EMAIL_FROM,
      hasEmailPassword: !!process.env.EMAIL_PASSWORD,
      credentialsLength: process.env.GOOGLE_CREDENTIALS ? process.env.GOOGLE_CREDENTIALS.length : 0
    };
    
    console.log('Variables de entorno:', envVars);
    
    // Intentar parsear credenciales
    let credentials;
    try {
      credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
      console.log('✅ Credenciales parseadas correctamente');
    } catch (error) {
      console.log('❌ Error parseando credenciales:', error.message);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          message: 'Error parseando credenciales',
          error: error.message
        })
      };
    }
    
    // Intentar crear cliente de autenticación
    let auth;
    try {
      auth = new google.auth.GoogleAuth({
        credentials: credentials,
        scopes: ['https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/spreadsheets']
      });
      console.log('✅ Cliente de autenticación creado');
    } catch (error) {
      console.log('❌ Error creando cliente de autenticación:', error.message);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          message: 'Error creando cliente de autenticación',
          error: error.message
        })
      };
    }
    
    // Intentar crear cliente de Calendar
    let calendar;
    try {
      calendar = google.calendar({ version: 'v3', auth });
      console.log('✅ Cliente de Calendar creado');
    } catch (error) {
      console.log('❌ Error creando cliente de Calendar:', error.message);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          message: 'Error creando cliente de Calendar',
          error: error.message
        })
      };
    }
    
    // Intentar crear cliente de Sheets
    let sheets;
    try {
      sheets = google.sheets({ version: 'v4', auth });
      console.log('✅ Cliente de Sheets creado');
    } catch (error) {
      console.log('❌ Error creando cliente de Sheets:', error.message);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          message: 'Error creando cliente de Sheets',
          error: error.message
        })
      };
    }
    
    // Intentar listar eventos del calendario
    try {
      const startOfDay = new Date().toISOString();
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      
      const response = await calendar.events.list({
        calendarId: process.env.GOOGLE_CALENDAR_ID,
        timeMin: startOfDay,
        timeMax: endOfDay.toISOString(),
        maxResults: 1
      });
      
      console.log('✅ Lista de eventos obtenida correctamente');
      console.log(`Eventos encontrados: ${response.data.items.length}`);
    } catch (error) {
      console.log('❌ Error listando eventos:', error.message);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          message: 'Error listando eventos del calendario',
          error: error.message
        })
      };
    }
    
    // Intentar leer datos de Sheets
    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: 'A1:A5'
      });
      
      console.log('✅ Datos de Sheets leídos correctamente');
      console.log(`Filas encontradas: ${response.data.values ? response.data.values.length : 0}`);
    } catch (error) {
      console.log('❌ Error leyendo Sheets:', error.message);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          message: 'Error leyendo datos de Sheets',
          error: error.message
        })
      };
    }
    
    console.log('✅ Todas las pruebas pasaron correctamente');
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Todas las pruebas pasaron - configuración correcta',
        envVars: envVars
      })
    };
    
  } catch (error) {
    console.error('❌ Error en reserve-test:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        message: 'Error en prueba',
        error: error.message,
        stack: error.stack
      })
    };
  }
};
