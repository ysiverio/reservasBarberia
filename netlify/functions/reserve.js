const fetch = require('node-fetch');
const config = require('./lib/config.json');

exports.handler = async function(event, context) {
  console.log('Iniciando la función reserve.js v4 (token en el body)');

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { APPS_SCRIPT_URL, APPS_SCRIPT_SECRET } = process.env;

  if (!APPS_SCRIPT_URL || !APPS_SCRIPT_SECRET) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Error de configuración del servidor.' }) };
  }

  try {
    const reservation = JSON.parse(event.body);

    // Añadimos el nombre del negocio y el token secreto al payload
    const payload = {
      ...reservation,
      businessName: config.businessName,
      secretToken: APPS_SCRIPT_SECRET // <-- Token añadido aquí
    };

    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
        // Ya no necesitamos el header x-secret-token
      },
      body: JSON.stringify(payload)
    });

    const responseText = await response.text();
    console.log('Respuesta de Google Apps Script:', responseText);
    const responseData = JSON.parse(responseText);

    if (!response.ok || responseData.status !== 'success') {
      throw new Error(`Error en la llamada a Google Apps Script: ${responseData.message || response.statusText}`);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Reserva procesada y correo solicitado.' })
    };

  } catch (error) {
    console.error('Error detallado en el bloque catch:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Hubo un error al procesar la reserva.' })
    };
  }
};