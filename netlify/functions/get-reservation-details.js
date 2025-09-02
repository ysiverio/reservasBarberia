const { db } = require('./lib/firebaseService.js');

exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  }

  try {
    const { id } = event.queryStringParameters;

    if (!id) {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, message: 'ID de reserva requerido.' }) };
    }

    const reservationRef = db.collection('reservations').doc(id);
    const doc = await reservationRef.get();

    if (!doc.exists) {
      return { statusCode: 404, headers, body: JSON.stringify({ success: false, message: 'Reserva no encontrada.' }) };
    }

    const reservationData = { id: doc.id, ...doc.data() };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, reservation: reservationData })
    };

  } catch (error) {
    console.error('Error en get-reservation-details:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, message: 'Error interno del servidor.' }) };
  }
};
