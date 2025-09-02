const fetch = require('node-fetch');
const config = require('./lib/config.json');

exports.handler = async function(event, context) {
  console.log('Iniciando la función reserve.js v3 (logueando respuesta cruda)');

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { APPS_SCRIPT_URL, APPS_SCRIPT_SECRET } = process.env;

  if (!APPS_SCRIPT_URL || !APPS_SCRIPT_SECRET) {
    console.error('Error: Faltan las variables de entorno APPS_SCRIPT_URL o APPS_SCRIPT_SECRET.');
    return { statusCode: 500, body: JSON.stringify({ error: 'Error de configuración del servidor.' }) };
  }

  try {
    const reservation = JSON.parse(event.body);
    const payload = { ...reservation, businessName: config.businessName };

    console.log(`Llamando a la URL: ${APPS_SCRIPT_URL}`);

    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-secret-token': APPS_SCRIPT_SECRET
      },
      body: JSON.stringify(payload)
    });

    // Capturar la respuesta como texto para poder inspeccionarla
    const responseText = await response.text();
    console.log('Respuesta cruda de Google Apps Script (en texto):', responseText);

    // Ahora, intentar parsear el texto como JSON
    const responseData = JSON.parse(responseText);

    if (!response.ok || responseData.status !== 'success') {
      throw new Error(`Error en la llamada a Google Apps Script: ${responseData.message || response.statusText}`);
    }

    console.log('Proceso completado con éxito.');
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
