const EmailService = require('./lib/EmailService');

exports.handler = async function(event, context) {
  console.log('Iniciando la función reserve.js');

  if (event.httpMethod !== 'POST') {
    console.log('Método HTTP no permitido:', event.httpMethod);
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    console.log('Payload recibido:', event.body);
    const reservation = JSON.parse(event.body);
    console.log('Payload parseado correctamente.', reservation);

    // Añadir una URL de cancelación de ejemplo
    reservation.cancelUrl = `https://demo-citas-barberias.netlify.app/cancel?id=${Math.random().toString(36).substring(2, 15)}`;
    console.log('URL de cancelación generada:', reservation.cancelUrl);

    console.log('Creando una nueva instancia de EmailService...');
    const emailService = new EmailService();
    console.log('Instancia de EmailService creada.');

    console.log('Enviando email de confirmación...');
    const result = await emailService.sendConfirmationEmail(reservation);
    console.log('Respuesta del servicio de email:', result);

    if (result.success) {
      console.log('El email se envió correctamente.');
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Reserva confirmada y correo enviado.' })
      };
    } else {
      console.error('El servicio de email reportó un fallo.', result.error);
      throw new Error(result.error);
    }

  } catch (error) {
    console.error('Error detallado en el bloque catch:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Hubo un error al procesar la reserva.' })
    };
  }
};
