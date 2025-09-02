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

    console.log(`Intentando actualizar la reserva con ID: ${id} a CANCELADA con motivo: ${reason}`);

    const reservationRef = db.collection('reservations').doc(id);
    const doc = await reservationRef.get();

    if (!doc.exists) {
      return { statusCode: 404, body: JSON.stringify({ success: false, message: 'La reserva no fue encontrada.' }) };
    }

    await reservationRef.update({
      status: 'CANCELLED',
      cancellationReason: reason || 'Sin motivo especificado',
      cancelledAt: new Date().toISOString()
    });
    console.log(`Reserva ${id} marcada como CANCELADA.`);

    // 2. Enviar el correo de cancelación a través de Google Apps Script
    const emailPayload = {
      ...doc.data(), // Datos originales de la reserva
      cancellationReason: reason || 'Sin motivo especificado',
      secretToken: process.env.APPS_SCRIPT_SECRET,
      type: 'cancellation' // <-- Añadimos el tipo de operación
    };

    const response = await fetch(process.env.APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(emailPayload)
    });

    const responseText = await response.text();
    const responseData = JSON.parse(responseText);

    if (!response.ok || responseData.status !== 'success') {
      console.error('Error al enviar email de cancelación a Apps Script:', responseData.message || response.statusText);
      // No lanzamos error aquí para no bloquear la cancelación en Firestore
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, message: 'Reserva marcada como cancelada exitosamente.' })
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