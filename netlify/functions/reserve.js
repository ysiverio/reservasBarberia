const EmailService = require('./lib/EmailService');

exports.handler = async function(event, context) {
  // Solo permitir peticiones POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const reservation = JSON.parse(event.body);
    
    // Aquí iría la lógica para guardar la reserva en la base de datos.
    // Por ahora, solo enviamos el email.

    // Añadir una URL de cancelación de ejemplo
    reservation.cancelUrl = `https://tudominio.com/cancel?id=${Math.random().toString(36).substring(2, 15)}`;

    const emailService = new EmailService();
    const result = await emailService.sendConfirmationEmail(reservation);

    if (result.success) {
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Reserva confirmada y correo enviado.' })
      };
    } else {
      throw new Error(result.error);
    }

  } catch (error) {
    console.error('Error en la función reserve:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Hubo un error al procesar la reserva.' })
    };
  }
};