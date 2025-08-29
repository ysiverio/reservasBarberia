const { google } = require('googleapis');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    console.log('=== INICIO DE RESERVE-SIMPLE ===');
    console.log('Event body:', event.body);
    console.log('Event body type:', typeof event.body);
    console.log('Event body length:', event.body ? event.body.length : 'undefined');
    
    // Verificar que el body no esté vacío
    if (!event.body || event.body.trim() === '') {
      console.log('❌ Body está vacío');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          message: 'Datos de reserva no recibidos'
        })
      };
    }
    
    // Parsear el body
    let body;
    try {
      body = JSON.parse(event.body);
      console.log('✅ JSON parseado correctamente:', body);
    } catch (parseError) {
      console.log('❌ Error parseando JSON:', parseError.message);
      console.log('Body recibido:', event.body);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          message: 'Datos de reserva mal formateados'
        })
      };
    }
    
    const { name, email, date, time } = body;
    
    // Validar datos requeridos
    if (!name || !email || !date || !time) {
      console.log('❌ Datos faltantes:', { name: !!name, email: !!email, date: !!date, time: !!time });
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          message: 'Todos los campos son requeridos'
        })
      };
    }

    console.log('✅ Datos válidos recibidos');
    console.log('Configurando autenticación de Google...');
    
    // Configurar autenticación de Google
    let auth;
    try {
      auth = new google.auth.GoogleAuth({
        credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS),
        scopes: ['https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/spreadsheets']
      });
      console.log('✅ Autenticación de Google configurada');
    } catch (authError) {
      console.log('❌ Error configurando autenticación:', authError.message);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          message: 'Error configurando autenticación de Google',
          error: authError.message
        })
      };
    }

    console.log('✅ Reserva simple completada exitosamente');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Reserva simple completada - datos recibidos correctamente',
        data: { name, email, date, time },
        cancelUrl: 'https://demo-citas-barberias.netlify.app/.netlify/functions/cancel?token=test-token'
      })
    };

  } catch (error) {
    console.error('❌ Error en reserve-simple:', error);
    console.error('Stack trace:', error.stack);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        message: 'Error en reserva simple',
        error: error.message,
        stack: error.stack
      })
    };
  }
};
