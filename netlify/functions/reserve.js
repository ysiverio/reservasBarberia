const fetch = require('node-fetch');
const config = require('./lib/config.json');
const { db } = require('./lib/firebaseService.js'); // <-- Importamos nuestro servicio de Firebase

exports.handler = async function(event, context) {
  console.log('Iniciando la función reserve.js v5 (con Firestore)');

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { APPS_SCRIPT_URL, APPS_SCRIPT_SECRET } = process.env;

  if (!APPS_SCRIPT_URL || !APPS_SCRIPT_SECRET) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Error de configuración del servidor.' }) };
  }

  try {
    const reservationData = JSON.parse(event.body);
    console.log('Reserva recibida:', reservationData);

    // 1. Guardar la reserva en Firestore
    console.log('Guardando reserva en Firestore...');
    const newReservation = {
      ...reservationData,
      status: 'CONFIRMED',
      createdAt: new Date().toISOString()
    };
    const docRef = await db.collection('reservations').add(newReservation);
    console.log('Reserva guardada con ID:', docRef.id);

    // 2. Enviar el correo a través de Google Apps Script
    const emailPayload = {
      ...reservationData,
      businessName: config.businessName,
      secretToken: APPS_SCRIPT_SECRET,
      type: 'reservation' // <-- Añadimos el tipo de operación
    };

    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(emailPayload)
    });

    const responseText = await response.text();
    const responseData = JSON.parse(responseText);

    if (!response.ok || responseData.status !== 'success') {
      throw new Error(`Error en la llamada a Google Apps Script: ${responseData.message || response.statusText}`);
    }

    console.log('Proceso completado con éxito.');
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        message: 'Reserva procesada y correo solicitado.',
        reservationId: docRef.id
      })
    };

  } catch (error) {
    console.error('Error detallado en el bloque catch:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Hubo un error al procesar la reserva.' })
    };
  }
};
