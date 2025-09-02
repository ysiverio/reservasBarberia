const { db, auth } = require('./lib/firebaseService.js');

exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  }

  try {
    // 1. Verificar el token de autenticación de Firebase
    if (!event.headers.authorization || !event.headers.authorization.startsWith('Bearer ')) {
      return { statusCode: 401, headers, body: JSON.stringify({ success: false, message: 'Token de autorización no encontrado.' }) };
    }

    const idToken = event.headers.authorization.split('Bearer ')[1];
    await auth.verifyIdToken(idToken);
    console.log('Token verificado exitosamente.');

    // 2. Si el token es válido, obtener las reservas
    const { date } = JSON.parse(event.body);
    if (!date) {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, message: 'Fecha requerida.' }) };
    }

    console.log(`Buscando reservaciones en Firestore para la fecha: ${date}`);
    const reservationsSnapshot = await db.collection('reservations').where('date', '==', date).orderBy('time', 'asc').get();

    if (reservationsSnapshot.empty) {
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, reservations: [] }) };
    }

    const reservations = reservationsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, reservations })
    };

  } catch (error) {
    console.error('Error en get-reservations:', error);
    if (error.code === 'auth/id-token-expired' || error.code === 'auth/argument-error') {
      return { statusCode: 403, headers, body: JSON.stringify({ success: false, message: 'Token inválido o expirado.' }) };
    }
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, message: 'Error interno del servidor.' }) };
  }
};
