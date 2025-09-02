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

    // 2. Procesar la acción (create, read, update, delete)
    const { action, service, id } = JSON.parse(event.body);

    if (!action) {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, message: 'Acción requerida.' }) };
    }

    let result;
    switch (action) {
      case 'create':
        if (!service || !service.name || !service.durationMinutes) {
          return { statusCode: 400, headers, body: JSON.stringify({ success: false, message: 'Nombre y duración del servicio son requeridos.' }) };
        }
        result = await db.collection('services').add(service);
        return { statusCode: 200, headers, body: JSON.stringify({ success: true, message: 'Servicio creado.', id: result.id }) };

      case 'read': // Leer todos los servicios
        const snapshot = await db.collection('services').orderBy('name', 'asc').get();
        const services = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return { statusCode: 200, headers, body: JSON.stringify({ success: true, services }) };

      case 'update':
        if (!id || !service || !service.name || !service.durationMinutes) {
          return { statusCode: 400, headers, body: JSON.stringify({ success: false, message: 'ID, nombre y duración del servicio son requeridos para actualizar.' }) };
        }
        await db.collection('services').doc(id).update(service);
        return { statusCode: 200, headers, body: JSON.stringify({ success: true, message: 'Servicio actualizado.' }) };

      case 'delete':
        if (!id) {
          return { statusCode: 400, headers, body: JSON.stringify({ success: false, message: 'ID del servicio es requerido para eliminar.' }) };
        }
        await db.collection('services').doc(id).delete();
        return { statusCode: 200, headers, body: JSON.stringify({ success: true, message: 'Servicio eliminado.' }) };

      default:
        return { statusCode: 400, headers, body: JSON.stringify({ success: false, message: 'Acción no válida.' }) };
    }

  } catch (error) {
    console.error('Error en manage-services:', error);
    if (error.code === 'auth/id-token-expired' || error.code === 'auth/argument-error') {
      return { statusCode: 403, headers, body: JSON.stringify({ success: false, message: 'Token inválido o expirado.' }) };
    }
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, message: 'Error interno del servidor.' }) };
  }
};
