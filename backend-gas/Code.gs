/**
 * Script para enviar email de confirmación automáticamente
 * cuando se agrega una nueva reserva a la hoja "Reservas"
 */

// Configuración
const CONFIG = {
  SHEET_ID: '1x_V2xdD_97XwpXz7J2gitw6JXyrRQBSrcG2NMuSBqnk',
  SHEET_NAME: 'Reservas',
  EMAIL_SUBJECT: 'Confirmación de reserva',
  SHEET_NAME_CANCEL: 'Cancelaciones',
  EMAIL_SUBJECT_CANCEL: 'Cancelación de reserva',
  EMAIL_FROM: 'Demo Reservas UY <demo.reservas.uy@gmail.com>',
  EMAIL_NAME: 'Demo Reservas UY',  
  TIMEZONE: 'America/Montevideo',     // para timestamp legible
  LOCAL_OFFSET: '-03:00',             // offset fijo; si algún día cambia, actualizalo
  CAL_TITLE: 'Corte de Cabello - Barberías Inteligentes',
  CAL_LOCATION: 'Barbería Demo',       // opcional
  WEB_APP_BASE_URL: 'https://demo-citas-barberias.netlify.app'
};

/**
 * Función que se ejecuta automáticamente cuando se modifica la hoja
 * Esta función es más simple y confiable
 */
function onEdit(e) {
  try {
    console.log('onEdit ejecutado');
    
    // Siempre ejecutar checkNewReservations para mayor confiabilidad
    checkNewReservations();
    // Siempre ejecutar checkNewCancellations para mayor confiabilidad
    checkNewCancellations();
    
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
    console.log('Iniciando verificación de nuevas reservas...');
    
    // Obtener la hoja de reservas
    const spreadsheet = SpreadsheetApp.openById(CONFIG.SHEET_ID); // Reemplazar con tu ID
    const sheet = spreadsheet.getSheetByName(CONFIG.SHEET_NAME);
    
    if (!sheet) {
      console.log(`Hoja "${CONFIG.SHEET_NAME}" no encontrada`);
      return;
    }
    
    // Obtener todas las filas
    const data = sheet.getDataRange().getValues();
    console.log(`Total de filas encontradas: ${data.length}`);
    
    // Procesar solo las filas con status CONFIRMADA
    let emailsEnviados = 0;
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
          
          // Verificar si ya se envió email (columna 10 - Email Enviado)
          const emailEnviado = row[10];
          if (!emailEnviado || emailEnviado !== 'SÍ') {
            try {
              // Enviar email de confirmación
              sendConfirmationEmail(reservation);
              
              // Marcar como enviado en la hoja
              sheet.getRange(i + 1, 11).setValue('SÍ');
              sheet.getRange(i + 1, 12).setValue(new Date().toISOString());
              
              console.log(`✅ Email de confirmación enviado a ${reservation.email} para reserva ${reservation.id}`);
              emailsEnviados++;            
            } catch (emailError) {
              console.error(`❌ Error enviando email para reserva ${reservation.id}:`, emailError);
            }
          } else {
            console.log(`⏭️ Email ya enviado para reserva ${reservation.id}`);
          }
        } else {
          console.log(`⚠️ Fila ${i + 1} incompleta, no se envía email`);
        }
      }
    }
    
    console.log(`📧 Total de emails enviados: ${emailsEnviados}`);
    
  } catch (error) {
    console.error('❌ Error en checkNewReservations:', error);
  }
}

/**
 * Envía email de confirmación de reserva
 */
function sendConfirmationEmail(reservation) {
  try {
    const formattedDate = formatDate(reservation.date);

    // 1) Construir start/end ISO a partir de tu fecha/hora locales
    const startISO = buildLocalISO(reservation.date, reservation.time, CONFIG.LOCAL_OFFSET);
    // Duración 30 min (ajustá si usás otra)
    const endISO = new Date(new Date(startISO).getTime() + 30 * 60000).toISOString();

    // 2) Links/calendario
    const details = `Reserva en Barberías Inteligentes. ID: ${reservation.id}`;
    const googleCalendarUrl = buildGoogleCalendarUrl({
      title: CONFIG.CAL_TITLE,
      startISO: startISO,
      endISO: endISO,
      details: details,
      location: CONFIG.CAL_LOCATION
    });
    const icsContent = buildICS({
      uid: reservation.id,
      title: CONFIG.CAL_TITLE,
      startISO: startISO,
      endISO: endISO,
      details: details,
      location: CONFIG.CAL_LOCATION
    });
    const icsBlob = Utilities.newBlob(icsContent, 'text/calendar', `Reserva_${reservation.id}.ics`);

    // 3) HTML del correo (incluye Add-to-Calendar)
    const emailBody = `
  <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 24px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e5e5e5;">
    <div style="text-align: center; margin-bottom: 28px;">
      <h1 style="color: #111; font-size: 26px; margin: 0;">💈 Demo Barberías Inteligentes</h1>
      <h2 style="color: #3b82f6; font-size: 20px; font-weight: 600; margin: 6px 0 0;">Tu reserva está confirmada ✂️</h2>
    </div>

    <div style="background-color: #f9fafb; padding: 24px; border-radius: 10px; margin-bottom: 24px;">
      <h3 style="color: #111; margin: 0 0 12px;">Hola ${reservation.name},</h3>
      <p style="color: #444; font-size: 16px; line-height: 1.5; margin: 0;">
        Nos alegra informarte que tu cita fue registrada con éxito.
      </p>
    </div>

    <div style="background-color: #e8f4fd; padding: 20px; border-radius: 10px; margin-bottom: 24px; border-left: 5px solid #3b82f6;">
      <h4 style="color: #111; margin: 0 0 12px;">🗓️ Detalles de tu reserva</h4>
      <p style="margin: 6px 0; color:#222;"><strong>Fecha:</strong> ${formattedDate}</p>
      <p style="margin: 6px 0; color:#222;"><strong>Hora:</strong> ${reservation.time}</p>
      <p style="margin: 6px 0; color:#222;"><strong>ID de reserva:</strong> ${reservation.id}</p>

      <div style="margin-top:18px;">
        <a href="${googleCalendarUrl}" 
           style="display:inline-block; background:#3b82f6; color:#fff; text-decoration:none; font-weight:600; padding:10px 18px; border-radius:6px; margin-right:12px;">
           Agregar a Google Calendar
        </a>
        <br>
        <span style="color:#999; font-weight:600;">El archivo .ICS para Outlook/Apple va adjunto</span>        
      </div>
    </div>

    <div style="background-color: #fff3cd; padding: 20px; border-radius: 10px; margin-bottom: 24px; border-left: 5px solid #f59e0b;">
      <h4 style="color: #92400e; margin: 0 0 12px;">¿No podés asistir?</h4>
      <p style="color: #92400e; font-size: 15px; margin: 0 0 16px;">
        Cancelá o reprogramá tu cita desde este enlace:
      </p>
      <a href="${reservation.cancelUrl}" 
         style="display:inline-block; background-color:#dc2626; color:#fff; font-weight:600; text-decoration:none; padding:10px 18px; border-radius:6px;">
        Cancelar / Reprogramar
      </a>
    </div>

    <div style="background-color: #f9fafb; padding: 20px; border-radius: 10px; margin-bottom: 24px;">
      <h4 style="color: #111; margin: 0 0 12px;">📞 Contacto</h4>
      <p style="color: #444; margin: 4px 0;">
        ✉️ <a href="mailto:demo.reservas.uy@gmail.com" style="color:#3b82f6; text-decoration:none;">demo.reservas.uy@gmail.com</a><br>
        💬 <a href="https://wa.me/+59898847599" style="color:#3b82f6; text-decoration:none;">+598 98 847 599</a>
      </p>
    </div>

    <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
      <p style="color: #666; font-size: 14px; margin: 0;">
        Gracias por elegir <strong>💈 Demo Barberías Inteligentes</strong><br>
        <span style="color:#999;">Este es un correo automático, no respondas directamente.</span>
      </p>
    </div>
  </div>
    `;

    const textFallback = buildConfirmationText({
      name: reservation.name,
      formattedDate,
      time: reservation.time,
      id: reservation.id,
      cancelUrl: reservation.cancelUrl
    });

    MailApp.sendEmail(
      reservation.email,
      CONFIG.EMAIL_SUBJECT + ' - ' + CONFIG.EMAIL_NAME,
      textFallback, // texto plano
      {
        from: CONFIG.EMAIL_FROM,
        htmlBody: emailBody,
        name: CONFIG.EMAIL_NAME,
        attachments: [icsBlob]  // <- adjuntamos el .ics
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
 * Función alternativa para verificar nuevas cancelaciones
 * Se puede ejecutar manualmente o desde un trigger
 */
function checkNewCancellations() {
  try {
    console.log('Iniciando verificación de nuevas cancelaciones...');
    
    // Obtener la hoja de cancelaciones
    const spreadsheet = SpreadsheetApp.openById(CONFIG.SHEET_ID); // Reemplazar con tu ID
    const sheet = spreadsheet.getSheetByName(CONFIG.SHEET_NAME_CANCEL);
    
    if (!sheet) {
      console.log(`Hoja "${CONFIG.SHEET_NAME_CANCEL}" no encontrada`);
      return;
    }
    
    // Obtener todas las filas
    const data = sheet.getDataRange().getValues();
    console.log(`Total de filas encontradas: ${data.length}`);
    
    // Procesar solo las filas con datos completos
    let emailsEnviados = 0;
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      
      // Verificar que tenga todos los datos necesarios
      if (row[1] && row[2] && row[3] && row[4] && row[5]) {
        const cancellation = {
          cancelId: row[0],
          reservationId: row[1],
          name: row[2],
          email: row[3],
          date: row[4],
          time: row[5],
          reason: row[6],
          cancellationDate: row[7]
        };
        
        // Verificar si ya se envió email (columna 8 - Email Enviado)
        const emailEnviado = row[8];
        if (!emailEnviado || emailEnviado !== 'SÍ') {
          try {
            // Enviar email de cancelación
            sendCancellationEmail(cancellation);
            
            // Marcar como enviado en la hoja
            sheet.getRange(i + 1, 9).setValue('SÍ');
            sheet.getRange(i + 1, 10).setValue(new Date().toISOString());
            
            console.log(`✅ Email de cancelación enviado a ${cancellation.email} para reserva ${cancellation.reservationId}`);
            emailsEnviados++;
          } catch (emailError) {
            console.error(`❌ Error enviando email de cancelación para ${cancellation.reservationId}:`, emailError);
          }
        } else {
          console.log(`⏭️ Email de cancelación ya enviado para reserva ${cancellation.reservationId}`);
        }
      } else {
        console.log(`⚠️ Fila ${i + 1} incompleta, no se envía email`);
      }
    }
    
    console.log(`📧 Total de emails de cancelación enviados: ${emailsEnviados}`);
    
  } catch (error) {
    console.error('❌ Error en checkNewCancellations:', error);
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
  <div style="font-family: Arial, sans-serif; max-width:640px; margin:0 auto; padding:24px; background:#ffffff; border:1px solid #e5e5e5; border-radius:12px;">
    <div style="text-align: center; margin-bottom: 28px;">
      <h1 style="color: #111; font-size: 26px; margin: 0;">💈 Demo Barberías Inteligentes</h1>
      <h2 style="color: #dc2626; font-size: 20px; font-weight: 600; margin: 6px 0 0;">Reserva cancelada</h2>
    </div>

    <div style="background:#f9fafb; padding:22px; border-radius:10px; margin-bottom:22px;">
      <h3 style="color:#111; margin:0 0 12px;">Hola ${cancellation.name},</h3>
      <p style="color:#444; font-size:16px; line-height:1.55; margin:0;">
        Te confirmamos que tu cita fue <strong>cancelada exitosamente</strong>.  
        Aquí tenés el detalle:
      </p>
    </div>

    <div style="background:#f8d7da; padding:20px; border-radius:10px; margin-bottom:22px; border-left:5px solid #dc2626;">
      <h4 style="color:#721c24; margin:0 0 12px;">🗓️ Detalles de la reserva cancelada</h4>
      <p style="margin:6px 0; color:#222;"><strong>Fecha original:</strong> ${formattedDate}</p>
      <p style="margin:6px 0; color:#222;"><strong>Hora original:</strong> ${cancellation.time}</p>
      <p style="margin:6px 0; color:#222;"><strong>ID de reserva:</strong> ${cancellation.reservationId}</p>
      <p style="margin:6px 0; color:#222;"><strong>Fecha de cancelación:</strong> ${formattedCancellationDate}</p>
    </div>

    ${cancellation.reason ? `
      <div style="background:#e8f4fd; padding:20px; border-radius:10px; margin-bottom:22px; border-left:5px solid #3b82f6;">
        <h4 style="color:#111; margin:0 0 12px;">Motivo de cancelación</h4>
        <p style="color:#444; margin:0; font-style:italic;">
          "${cancellation.reason}"
        </p>
      </div>
    ` : ''}

    <div style="background:#d1ecf1; padding:20px; border-radius:10px; margin-bottom:22px; border-left:5px solid #0ea5e9;">
      <h4 style="color:#0c5460; margin:0 0 12px;">¿Querés reprogramar?</h4>
      <p style="color:#0c5460; margin:0 0 16px;">
        Podés hacer una nueva reserva fácilmente desde nuestro sitio:
      </p>
      <a href="${CONFIG.WEB_APP_BASE_URL}" 
         style="display:inline-block; background:#3b82f6; color:#fff; font-weight:600; text-decoration:none; padding:10px 18px; border-radius:6px;">
        Hacer nueva reserva
      </a>
    </div>

    <div style="background:#f9fafb; padding:20px; border-radius:10px; margin-bottom:22px;">
      <h4 style="color:#111; margin:0 0 12px;">📞 Contacto</h4>
      <p style="color:#444; margin:4px 0;">
        ✉️ <a href="mailto:demo.reservas.uy@gmail.com" style="color:#3b82f6; text-decoration:none;">demo.reservas.uy@gmail.com</a><br>
        💬 <a href="https://wa.me/+59898847599" style="color:#3b82f6; text-decoration:none;">+598 98 847 599</a>
      </p>
    </div>

    <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
      <p style="color: #666; font-size: 14px; margin: 0;">
        Gracias por elegir <strong>💈 Demo Barberías Inteligentes</strong><br>
        <span style="color:#999;">Este es un correo automático, no respondas directamente.</span>
      </p>
    </div>
  </div>
    `;

    const textFallback = buildCancellationText({
      name: cancellation.name,
      formattedDate,
      time: cancellation.time,
      reservationId: cancellation.reservationId,
      formattedCancellationDate,
      rebookUrl: CONFIG.WEB_APP_BASE_URL
    });

    MailApp.sendEmail(
      cancellation.email,
      CONFIG.EMAIL_SUBJECT_CANCEL + ' - ' + CONFIG.EMAIL_NAME,
      textFallback, // texto plano
      {
        from: CONFIG.EMAIL_FROM,
        htmlBody: emailBody,
        name: CONFIG.EMAIL_NAME
      }
    );

  } catch (error) {
    console.error('Error enviando email de cancelación:', error);
    throw error;
  }
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

/** Convierte "YYYY-MM-DD" + "HH:mm" a ISO con offset local (e.g. -03:00) */
function buildLocalISO(dateStr, timeStr, offset) {
  // dateStr: '2025-09-03', timeStr: '09:30', offset: '-03:00'
  // Resultado: '2025-09-03T09:30:00-03:00'
  return dateStr + 'T' + timeStr + ':00' + (offset || '-03:00');
}

/** ISO → sello UTC para Google/ICS: YYYYMMDDTHHMMSSZ */
function isoToUTCStamp(isoStr) {
  const d = new Date(isoStr);
  const p = n => String(n).padStart(2, '0');
  return (
    d.getUTCFullYear() + p(d.getUTCMonth() + 1) + p(d.getUTCDate()) + 'T' +
    p(d.getUTCHours()) + p(d.getUTCMinutes()) + p(d.getUTCSeconds()) + 'Z'
  );
}

/** Link de Google Calendar */
function buildGoogleCalendarUrl({ title, startISO, endISO, details, location }) {
  const params = {
    action: 'TEMPLATE',
    text: title || '',
    dates: isoToUTCStamp(startISO) + '/' + isoToUTCStamp(endISO),
    details: details || '',
    location: location || '',
    sf: 'true',
    output: 'xml'
  };
  const qs = Object.keys(params)
    .map(k => `${k}=${encodeURIComponent(params[k])}`)
    .join('&');
  return 'https://calendar.google.com/calendar/render?' + qs;
}

/** Contenido ICS universal (adjunto) */
function buildICS({ uid, title, startISO, endISO, details, location }) {
  const nowUTC = isoToUTCStamp(new Date().toISOString());
  const dtStart = isoToUTCStamp(startISO);
  const dtEnd   = isoToUTCStamp(endISO);
  const esc = s => (s || '').replace(/([,;])/g, '\\$1');

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//YM2Capital//Barberias Inteligentes//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${nowUTC}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${esc(title)}`,
    `DESCRIPTION:${esc(details || '')}`,
    `LOCATION:${esc(location || '')}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');
}

/** Texto plano fallback para confirmación */
function buildConfirmationText({ name, formattedDate, time, id, cancelUrl }) {
  return (
`Barberías Inteligentes
Tu reserva está confirmada

Hola ${name},
Tu cita fue registrada con éxito.

DETALLES
- Fecha: ${formattedDate}
- Hora: ${time}
- ID: ${id}

CANCELACIÓN / REPROGRAMACIÓN
${cancelUrl}

Contacto
demo.reservas.uy@gmail.com
+598 98 847 599`
  );
}

/** Texto plano fallback para cancelación */
function buildCancellationText({ name, formattedDate, time, reservationId, formattedCancellationDate, rebookUrl }) {
  return (
`Barberías Inteligentes
Reserva cancelada

Hola ${name},
Tu cita fue cancelada.

DETALLES
- Fecha original: ${formattedDate}
- Hora original: ${time}
- ID: ${reservationId}
- Fecha de cancelación: ${formattedCancellationDate}

¿Querés reprogramar?
${rebookUrl}

Contacto
demo.reservas.uy@gmail.com
+598 98 847 599`
  );
}

