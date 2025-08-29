/**
 * Script para enviar email de cancelación automáticamente
 * cuando se agrega una nueva fila a la hoja "Cancelaciones"
 */

// Configuración
const CONFIG = {
  SHEET_NAME: 'Cancelaciones',
  EMAIL_SUBJECT: 'Reserva cancelada - Barbería',
  EMAIL_FROM: 'Barbería <noreply@barberia.com>',
  WEB_APP_BASE_URL: 'https://demo-citas-barberias.netlify.app'
};

/**
 * Función que se ejecuta automáticamente cuando se modifica la hoja
 */
function onEdit(e) {
  try {
    const sheet = e.source.getActiveSheet();
    
    // Verificar que sea la hoja correcta
    if (sheet.getName() !== CONFIG.SHEET_NAME) {
      return;
    }
    
    const range = e.range;
    const row = range.getRow();
    
    // Solo procesar si es una nueva fila (fila > 1 para evitar el header)
    if (row <= 1) {
      return;
    }
    
    // Obtener los datos de la fila
    const rowData = sheet.getRange(row, 1, 1, 8).getValues()[0];
    
    // Verificar que tenga todos los datos necesarios
    if (!rowData[1] || !rowData[2] || !rowData[3] || !rowData[4] || !rowData[5]) {
      console.log('Fila incompleta, no se envía email');
      return;
    }
    
    // Extraer datos de la cancelación
    const cancellation = {
      cancelId: rowData[0],
      reservationId: rowData[1],
      name: rowData[2],
      email: rowData[3],
      date: rowData[4],
      time: rowData[5],
      reason: rowData[6],
      cancellationDate: rowData[7]
    };
    
    // Enviar email de cancelación
    sendCancellationEmail(cancellation);
    
    console.log(`Email de cancelación enviado a ${cancellation.email} para reserva ${cancellation.reservationId}`);
    
  } catch (error) {
    console.error('Error en onEdit:', error);
  }
}

/**
 * Envía email de confirmación de cancelación
 */
function sendCancellationEmail(cancellation) {
  try {
    const formattedDate = formatDate(cancellation.date);
    const formattedCancellationDate = formatDateTime(cancellation.cancellationDate);
    
    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #333; margin-bottom: 10px;">Barbería</h1>
          <h2 style="color: #dc3545; margin: 0;">Reserva Cancelada</h2>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 25px; border-radius: 10px; margin: 20px 0;">
          <h3 style="color: #333; margin-top: 0;">Hola ${cancellation.name},</h3>
          <p style="color: #555; font-size: 16px; line-height: 1.6;">
            Tu reserva ha sido cancelada exitosamente. Te confirmamos los detalles de la cancelación.
          </p>
        </div>
        
        <div style="background-color: #f8d7da; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc3545;">
          <h4 style="color: #721c24; margin-top: 0;">❌ Reserva cancelada:</h4>
          <p style="margin: 10px 0;"><strong>Fecha original:</strong> ${formattedDate}</p>
          <p style="margin: 10px 0;"><strong>Hora original:</strong> ${cancellation.time}</p>
          <p style="margin: 10px 0;"><strong>ID de reserva:</strong> ${cancellation.reservationId}</p>
          <p style="margin: 10px 0;"><strong>Fecha de cancelación:</strong> ${formattedCancellationDate}</p>
        </div>
        
        ${cancellation.reason ? `
        <div style="background-color: #e8f4fd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
          <h4 style="color: #333; margin-top: 0;">📝 Motivo de cancelación:</h4>
          <p style="color: #555; margin: 10px 0; font-style: italic;">
            "${cancellation.reason}"
          </p>
        </div>
        ` : ''}
        
        <div style="background-color: #d1ecf1; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #17a2b8;">
          <h4 style="color: #0c5460; margin-top: 0;">🔄 ¿Quieres reprogramar?</h4>
          <p style="color: #0c5460; margin: 10px 0;">
            Si deseas hacer una nueva reserva, puedes hacerlo fácilmente desde nuestro sitio web:
          </p>
          <p style="margin: 15px 0;">
            <a href="${CONFIG.WEB_APP_BASE_URL}" style="color: #667eea; text-decoration: none; font-weight: bold;">
              🔗 Hacer Nueva Reserva
            </a>
          </p>
        </div>
        
        <div style="margin: 30px 0; padding: 20px; background-color: #f8f9fa; border-radius: 8px;">
          <h4 style="color: #333; margin-top: 0;">📞 Contacto:</h4>
          <p style="color: #555; margin: 10px 0;">
            Si tienes alguna pregunta o necesitas ayuda, no dudes en contactarnos:
          </p>
          <p style="color: #555; margin: 10px 0;">
            📧 Email: info@barberia.com<br>
            📱 WhatsApp: +598 99 123 456
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 14px;">
            Gracias por tu comprensión.<br>
            <strong>Barbería</strong>
          </p>
        </div>
      </div>
    `;
    
    // Enviar email
    GmailApp.sendEmail(
      cancellation.email,
      CONFIG.EMAIL_SUBJECT,
      '', // Plain text version (vacío para usar solo HTML)
      {
        from: CONFIG.EMAIL_FROM,
        htmlBody: emailBody,
        name: 'Barbería'
      }
    );
    
  } catch (error) {
    console.error('Error enviando email de cancelación:', error);
    throw error;
  }
}

/**
 * Formatea la fecha para mostrar en español
 */
function formatDate(dateString) {
  const date = new Date(dateString);
  const options = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  };
  
  return date.toLocaleDateString('es-ES', options);
}

/**
 * Formatea la fecha y hora para mostrar en español
 */
function formatDateTime(dateTimeString) {
  const date = new Date(dateTimeString);
  const options = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  
  return date.toLocaleDateString('es-ES', options);
}

/**
 * Función para probar el envío de email manualmente
 */
function testCancellationEmail() {
  const testCancellation = {
    cancelId: 'test_cancel_123',
    reservationId: 'test_reservation_456',
    name: 'Usuario de Prueba',
    email: 'test@example.com', // Cambiar por tu email para probar
    date: '2025-09-15',
    time: '14:00',
    reason: 'Cambio de planes',
    cancellationDate: new Date().toISOString()
  };
  
  sendCancellationEmail(testCancellation);
  console.log('Email de cancelación de prueba enviado');
}
