const { db } = require('./lib/firebaseService.js');

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
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { id, name, email, oldDate, oldTime, newDate, newTime } = JSON.parse(event.body);

    if (!id || !newDate || !newTime) {
      return { statusCode: 400, body: JSON.stringify({ success: false, message: 'ID, nueva fecha y nueva hora son requeridos.' }) };
    }

    // 1. Actualizar la reserva en Firestore
    const reservationRef = db.collection('reservations').doc(id);
    await reservationRef.update({
      date: newDate,
      time: newTime,
      updatedAt: new Date().toISOString(),
      status: 'RESCHEDULED' // Opcional: cambiar estado a reagendado
    });
    console.log(`Reserva ${id} reagendada a ${newDate} ${newTime}`);

    // 2. Enviar correo de confirmación de reagendamiento (a través de Google Apps Script)
    const emailPayload = {
      id,
      name,
      email,
      oldDate,
      oldTime,
      newDate,
      newTime,
      secretToken: process.env.APPS_SCRIPT_SECRET,
      type: 'reschedule' // Nuevo tipo de operación
    };

    const response = await fetch(process.env.APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(emailPayload)
    });

    const responseText = await response.text();
    const responseData = JSON.parse(responseText);

    if (!response.ok || responseData.status !== 'success') {
      console.error('Error al enviar email de reagendamiento a Apps Script:', responseData.message || response.statusText);
      // No lanzamos error aquí para no bloquear el reagendamiento en Firestore
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: 'Reserva reagendada exitosamente.' })
    };

  } catch (error) {
    console.error('Error en la función de reagendamiento:', error);
    return { statusCode: 500, body: JSON.stringify({ success: false, message: 'Error interno del servidor.' }) };
  }
};
