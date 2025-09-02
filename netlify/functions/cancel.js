const { db } = require('./lib/firebaseService.js');

exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-control-allow-headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { id } = JSON.parse(event.body);

    if (!id) {
      return { statusCode: 400, body: JSON.stringify({ success: false, message: 'ID de reserva requerido.' }) };
    }

    console.log(`Intentando cancelar la reserva con ID: ${id}`);

    const reservationRef = db.collection('reservations').doc(id);
    const doc = await reservationRef.get();

    if (!doc.exists) {
      return { statusCode: 404, body: JSON.stringify({ success: false, message: 'La reserva no fue encontrada.' }) };
    }

    await reservationRef.delete();
    console.log(`Reserva ${id} eliminada exitosamente.`);

    // Aquí, en el futuro, podríamos llamar a la función de Google Apps Script para enviar un email de cancelación.

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, message: 'Reserva cancelada exitosamente.' })
    };

  } catch (error) {
    console.error('Error en la función de cancelación:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, message: 'Error interno del servidor.' })
    };
  }
};