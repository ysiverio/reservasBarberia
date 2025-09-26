const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  }

  try {
    const { APPS_SCRIPT_URL, APPS_SCRIPT_SECRET } = process.env;

    if (!APPS_SCRIPT_URL || !APPS_SCRIPT_SECRET) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Variables de entorno faltantes',
          APPS_SCRIPT_URL: APPS_SCRIPT_URL ? 'Configurada' : 'FALTANTE',
          APPS_SCRIPT_SECRET: APPS_SCRIPT_SECRET ? 'Configurada' : 'FALTANTE'
        })
      };
    }

    // Datos de prueba
    const testPayload = {
      name: 'Usuario de Prueba',
      email: 'test@example.com', // Cambiar por tu email para probar
      date: '2025-09-15',
      time: '14:00',
      id: 'test-' + Date.now(),
      businessName: 'Demo Barberías Inteligentes',
      secretToken: APPS_SCRIPT_SECRET,
      type: 'reservation',
      cancelUrl: 'https://demo-citas-barberias.netlify.app/cancel.html?id=test123',
      rescheduleUrl: 'https://demo-citas-barberias.netlify.app/reschedule.html?id=test123'
    };

    console.log('Enviando email de prueba a:', testPayload.email);
    console.log('URL de Apps Script:', APPS_SCRIPT_URL);

    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPayload)
    });

    const responseText = await response.text();
    let responseData;

    try {
      responseData = responseText ? JSON.parse(responseText) : {};
    } catch (parseError) {
      console.error('Respuesta no JSON de Google Apps Script:', responseText);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Respuesta inválida de Google Apps Script',
          response: responseText
        })
      };
    }

    if (!response.ok) {
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({
          error: 'Error en la llamada a Google Apps Script',
          status: response.status,
          message: responseData.message || response.statusText
        })
      };
    }

    if (responseData.status !== 'success') {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Google Apps Script retornó un estado inválido',
          response: responseData
        })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Email de prueba enviado exitosamente',
        email: testPayload.email,
        response: responseData
      })
    };

  } catch (error) {
    console.error('Error en test-email:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Error interno del servidor',
        message: error.message
      })
    };
  }
};
