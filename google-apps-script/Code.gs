// Un token secreto para asegurar que solo nuestra Netlify Function pueda llamar a este script.
const SECRET_TOKEN = 'un-token-muy-secreto-y-dificil-de-adivinar';

/**
 * Esta es la función principal de la Web App.
 */
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);

    // 1. Verificar el token secreto
    if (payload.secretToken !== SECRET_TOKEN) {
      return createJsonResponse({ status: 'error', message: 'Acceso no autorizado.' });
    }

    // 2. Distinguir entre reserva y cancelación
    if (payload.type === 'reservation') {
      return handleReservationEmail(payload);
    } else if (payload.type === 'cancellation') {
      return handleCancellationEmail(payload);
    } else {
      return createJsonResponse({ status: 'error', message: 'Tipo de operación no reconocido.' });
    }

  } catch (error) {
    Logger.log(error.toString());
    return createJsonResponse({ status: 'error', message: 'Error interno del servidor: ' + error.toString() });
  }
}

/**
 * Maneja el envío de correo para una nueva reserva.
 */
function handleReservationEmail(reservation) {
  const recipient = reservation.email;
  const subject = `¡Reserva Confirmada! - ${reservation.businessName}`;
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">¡Reserva confirmada!</h2>
      <p>Hola <strong>${reservation.name}</strong>,</p>
      <p>Tu reserva ha sido confirmada exitosamente.</p>
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0;">Detalles de la reserva:</h3>
        <p><strong>Fecha:</strong> ${reservation.date}</p>
        <p><strong>Hora:</strong> ${reservation.time}</p>
      </div>
      <p>Saludos,<br>
      <strong>${reservation.businessName}</strong></p>
    </div>
  `;

  GmailApp.sendEmail(recipient, subject, "", { htmlBody: htmlBody });
  return createJsonResponse({ status: 'success', message: 'Correo de reserva enviado.' });
}

/**
 * Maneja el envío de correo para una cancelación.
 */
function handleCancellationEmail(cancellation) {
  const recipient = cancellation.email;
  const subject = `Reserva Cancelada - ${cancellation.businessName}`;
  const reasonText = cancellation.cancellationReason ? `<p><strong>Motivo:</strong> ${cancellation.cancellationReason}</p>` : '';
  
  // Link para reagendar (asumiendo que la página principal es la de reservas)
  const rescheduleLink = `https://demo-citas-barberias.netlify.app/`; // <-- Reemplaza con tu URL base

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Reserva Cancelada</h2>
      <p>Hola <strong>${cancellation.name}</strong>,</p>
      <p>Tu reserva para el ${cancellation.date} a las ${cancellation.time} ha sido cancelada.</p>
      ${reasonText}
      <p>Si deseas reagendar, puedes hacerlo aquí:</p>
      <p><a href="${rescheduleLink}" style="color: #007bff; text-decoration: none;">Reagendar mi cita</a></p>
      <p>Saludos,<br>
      <strong>${cancellation.businessName}</strong></p>
    </div>
  `;

  GmailApp.sendEmail(recipient, subject, "", { htmlBody: htmlBody });
  return createJsonResponse({ status: 'success', message: 'Correo de cancelación enviado.' });
}


/**
 * Función de utilidad para crear respuestas JSON.
 */
function createJsonResponse(data) {
  const output = JSON.stringify(data);
  return ContentService.createTextOutput(output)
    .setMimeType(ContentService.MimeType.JSON);
}
