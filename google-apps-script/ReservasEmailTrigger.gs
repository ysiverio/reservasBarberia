/**
 * Script para enviar email de confirmación automáticamente
 * cuando se agrega una nueva reserva a la hoja "Reservas"
 */

// Configuración
const CONFIG = {
  SHEET_NAME: 'Reservas',
  EMAIL_SUBJECT: 'Confirmación de reserva - Barbería',
  EMAIL_FROM: 'Barbería <noreply@barberia.com>',
  WEB_APP_BASE_URL: 'https://demo-citas-barberias.netlify.app'
};

/**
 * Función que se ejecuta automáticamente cuando se modifica la hoja
 */
function onEdit(e) {
  try {
    // Verificar que el evento tenga las propiedades necesarias
    if (!e || !e.source) {
      console.log('Evento onEdit no válido, ejecutando verificación manual...');
      checkNewReservations();
      return;
    }
    
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
    const rowData = sheet.getRange(row, 1, 1, 11).getValues()[0];
    
    // Verificar que sea una reserva confirmada
    if (rowData[5] !== 'CONFIRMADA') {
      return;
    }
    
    // Verificar que tenga todos los datos necesarios
    if (!rowData[1] || !rowData[2] || !rowData[3] || !rowData[4]) {
      console.log('Fila incompleta, no se envía email');
      return;
    }
    
    // Extraer datos de la reserva
    const reservation = {
      id: rowData[0],
      name: rowData[1],
      email: rowData[2],
      date: rowData[3],
      time: rowData[4],
      status: rowData[5],
      eventId: rowData[6],
      cancelToken: rowData[7],
      cancelUrl: rowData[8],
      createdAt: rowData[9]
    };
    
    // Enviar email de confirmación
    sendConfirmationEmail(reservation);
    
    console.log(`Email de confirmación enviado a ${reservation.email} para reserva ${reservation.id}`);
    
  } catch (error) {
    console.error('Error en onEdit:', error);
  }
}

/**
 * Función alternativa para verificar nuevas reservas
 * Se puede ejecutar manualmente o desde un trigger
 */
function checkNewReservations() {
  try {
    // Obtener la hoja de reservas
    const spreadsheet = SpreadsheetApp.openById('TU_SPREADSHEET_ID'); // Reemplazar con tu ID
    const sheet = spreadsheet.getSheetByName(CONFIG.SHEET_NAME);
    
    if (!sheet) {
      console.log(`Hoja "${CONFIG.SHEET_NAME}" no encontrada`);
      return;
    }
    
    // Obtener todas las filas
    const data = sheet.getDataRange().getValues();
    
    // Procesar solo las filas con status CONFIRMADA
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      
      // Verificar que sea una reserva confirmada
      if (row[5] === 'CONFIRMADA') {
        // Verificar que tenga todos los datos necesarios
        if (row[1] && row[2] && row[3] && row[4]) {
          const reservation = {
            id: row[0],
            name: row[1],
            email: row[2],
            date: row[3],
            time: row[4],
            status: row[5],
            eventId: row[6],
            cancelToken: row[7],
            cancelUrl: row[8],
            createdAt: row[9]
          };
          
          // Enviar email de confirmación
          sendConfirmationEmail(reservation);
          console.log(`Email de confirmación enviado a ${reservation.email} para reserva ${reservation.id}`);
        }
      }
    }
    
  } catch (error) {
    console.error('Error en checkNewReservations:', error);
  }
}

/**
 * Envía email de confirmación de reserva
 */
function sendConfirmationEmail(reservation) {
  try {
    const formattedDate = formatDate(reservation.date);
    
    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #333; margin-bottom: 10px;">Barbería</h1>
          <h2 style="color: #667eea; margin: 0;">¡Reserva Confirmada!</h2>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 25px; border-radius: 10px; margin: 20px 0;">
          <h3 style="color: #333; margin-top: 0;">Hola ${reservation.name},</h3>
          <p style="color: #555; font-size: 16px; line-height: 1.6;">
            Tu reserva ha sido confirmada exitosamente. Te esperamos en la fecha y hora acordada.
          </p>
        </div>
        
        <div style="background-color: #e8f4fd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
          <h4 style="color: #333; margin-top: 0;">📅 Detalles de tu reserva:</h4>
          <p style="margin: 10px 0;"><strong>Fecha:</strong> ${formattedDate}</p>
          <p style="margin: 10px 0;"><strong>Hora:</strong> ${reservation.time}</p>
          <p style="margin: 10px 0;"><strong>ID de reserva:</strong> ${reservation.id}</p>
        </div>
        
        <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
          <h4 style="color: #856404; margin-top: 0;">⚠️ Importante:</h4>
          <p style="color: #856404; margin: 10px 0;">
            Si necesitas cancelar o reprogramar tu reserva, utiliza el siguiente enlace:
          </p>
          <p style="margin: 15px 0;">
            <a href="${reservation.cancelUrl}" style="color: #dc3545; text-decoration: none; font-weight: bold;">
              🔗 Cancelar o Reprogramar Reserva
            </a>
          </p>
        </div>
        
        <div style="margin: 30px 0; padding: 20px; background-color: #f8f9fa; border-radius: 8px;">
          <h4 style="color: #333; margin-top: 0;">📞 Contacto:</h4>
          <p style="color: #555; margin: 10px 0;">
            Si tienes alguna pregunta, no dudes en contactarnos:
          </p>
          <p style="color: #555; margin: 10px 0;">
            📧 Email: info@barberia.com<br>
            📱 WhatsApp: +598 99 123 456
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 14px;">
            Gracias por elegir nuestros servicios.<br>
            <strong>Barbería</strong>
          </p>
        </div>
      </div>
    `;
    
    // Enviar email
    GmailApp.sendEmail(
      reservation.email,
      CONFIG.EMAIL_SUBJECT,
      '', // Plain text version (vacío para usar solo HTML)
      {
        from: CONFIG.EMAIL_FROM,
        htmlBody: emailBody,
        name: 'Barbería'
      }
    );
    
  } catch (error) {
    console.error('Error enviando email de confirmación:', error);
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
 * Función para probar el envío de email manualmente
 */
function testEmail() {
  const testReservation = {
    id: 'test123',
    name: 'Usuario de Prueba',
    email: 'test@example.com', // Cambiar por tu email para probar
    date: '2025-09-15',
    time: '14:00',
    status: 'CONFIRMADA',
    eventId: 'test_event_id',
    cancelToken: 'test_token',
    cancelUrl: 'https://demo-citas-barberias.netlify.app/.netlify/functions/cancel?token=test_token',
    createdAt: new Date().toISOString()
  };
  
  sendConfirmationEmail(testReservation);
  console.log('Email de prueba enviado');
}
