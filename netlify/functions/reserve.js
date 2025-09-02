const fetch = require('node-fetch');
const config = require('./lib/config.json');

exports.handler = async function(event, context) {
  console.log('Iniciando la función reserve.js v2 (con llamada a Google Apps Script)');

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
    console.log('Reserva recibida:', reservation);

    // Añadimos el nombre del negocio a los datos que enviaremos a Google
    const payload = {
      ...reservation,
      businessName: config.businessName
    };

    console.log('Enviando datos a Google Apps Script...');

    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-secret-token': APPS_SCRIPT_SECRET
      },
      body: JSON.stringify(payload)
    });

    const responseData = await response.json();
    console.log('Respuesta de Google Apps Script:', responseData);

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