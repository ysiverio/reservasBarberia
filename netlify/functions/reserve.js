const fetch = require('node-fetch');
const config = require('./lib/config.json');
const { db } = require('./lib/firebaseService.js');

exports.handler = async function(event, context) {
  console.log('Iniciando la funcion reserve.js v5 (con Firestore)');

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { APPS_SCRIPT_URL, APPS_SCRIPT_SECRET } = process.env;

  if (!APPS_SCRIPT_URL || !APPS_SCRIPT_SECRET) {
    console.error('Configuracion faltante: APPS_SCRIPT_URL/APPS_SCRIPT_SECRET');
    return { statusCode: 500, body: JSON.stringify({ error: 'Error de configuracion del servidor.' }) };
  }

  let docRef = null;

  try {
    const reservationData = JSON.parse(event.body);
    console.log('Reserva recibida:', reservationData);

    console.log('Guardando reserva en Firestore...');
    const newReservation = {
      ...reservationData,
      status: 'CONFIRMED',
      createdAt: new Date().toISOString()
    };

    docRef = await db.collection('reservations').add(newReservation);
    console.log('Reserva guardada con ID:', docRef.id);

    const emailPayload = {
      ...reservationData,
      id: docRef.id,
      businessName: config.businessName,
      secretToken: APPS_SCRIPT_SECRET,
      type: 'reservation'
    };

    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(emailPayload)
    });

    const responseText = await response.text();
    let responseData;

    try {
      responseData = responseText ? JSON.parse(responseText) : {};
    } catch (parseError) {
      console.error('Respuesta no JSON de Google Apps Script:', responseText);
      throw new Error('Respuesta invalida de Google Apps Script');
    }

    if (!response.ok) {
      throw new Error(responseData.message || response.statusText || 'Error en la llamada a Google Apps Script');
    }

    if (responseData.status !== 'success') {
      throw new Error(responseData.message || 'Google Apps Script retorno un estado invalido.');
    }

    console.log('Proceso completado con exito.');
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Reserva procesada y correo solicitado.',
        reservationId: docRef.id
      })
    };

  } catch (error) {
    console.error('Error detallado en el bloque catch:', error);

    if (docRef) {
      try {
        await docRef.delete();
        console.log(`Reserva ${docRef.id} eliminada tras fallo en el proceso.`);
      } catch (cleanupError) {
        console.error('No se pudo revertir la reserva creada:', cleanupError);
      }
    }

    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Hubo un error al procesar la reserva.' })
    };
  }
};
