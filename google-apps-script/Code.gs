// Un token secreto para asegurar que solo nuestra Netlify Function pueda llamar a este script.
const SECRET_TOKEN = 'un-token-muy-secreto-y-dificil-de-adivinar';

// Configuración global para los emails y links
const CONFIG = {
  EMAIL_SUBJECT: 'Confirmación de reserva',
  EMAIL_SUBJECT_CANCEL: 'Cancelación de reserva',
  EMAIL_FROM: 'Demo Reservas UY <demo.reservas.uy@gmail.com>', // <-- Reemplaza con tu email de envío
  EMAIL_NAME: 'Demo Reservas UY',  // <-- Reemplaza con el nombre de tu negocio
  LOCAL_OFFSET: '-03:00',             // Offset de tu zona horaria (ej. -03:00 para Uruguay/Argentina)
  CAL_TITLE: 'Cita de Servicio - Tu Negocio', // <-- Reemplaza con el título de tu servicio
  CAL_LOCATION: 'Tu Ubicación',       // <-- Opcional: Reemplaza con la ubicación de tu negocio
  WEB_APP_BASE_URL: 'https://demo-citas-barberias.netlify.app' // <-- Reemplaza con la URL base de tu sitio
};

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
  const formattedDate = formatDate(reservation.date);

  // 1) Construir start/end ISO a partir de tu fecha/hora locales
  const startISO = buildLocalISO(reservation.date, reservation.time, CONFIG.LOCAL_OFFSET);
  // Duración 30 min (ajustá si usás otra)
  const endISO = new Date(new Date(startISO).getTime() + 30 * 60000).toISOString();

  // 2) Links/calendario
  const details = `Reserva en ${CONFIG.EMAIL_NAME}. ID: ${reservation.id}`;
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
      <h1 style="color: #111; font-size: 26px; margin: 0;">💈 ${CONFIG.EMAIL_NAME}</h1>
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
        Gracias por elegir <strong>💈 ${CONFIG.EMAIL_NAME}</strong><br>
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

  return createJsonResponse({ status: 'success', message: 'Correo de reserva enviado.' });
}

/**
 * Maneja el envío de correo para una cancelación.
 */
function handleCancellationEmail(cancellation) {
  const formattedDate = formatDate(cancellation.date);
  const formattedCancellationDate = formatDateTime(cancellation.cancelledAt); // Usar cancelledAt

  const emailBody = `
  <div style="font-family: Arial, sans-serif; max-width:640px; margin:0 auto; padding:24px; background:#ffffff; border:1px solid #e5e5e5; border-radius:12px;">
    <div style="text-align: center; margin-bottom: 28px;">
      <h1 style="color: #111; font-size: 26px; margin: 0;">💈 ${CONFIG.EMAIL_NAME}</h1>
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
      <p style="margin:6px 0; color:#222;"><strong>ID de reserva:</strong> ${cancellation.id}</p>
      <p style="margin:6px 0; color:#222;"><strong>Fecha de cancelación:</strong> ${formattedCancellationDate}</p>
    </div>

    ${cancellation.cancellationReason ? `
      <div style="background:#e8f4fd; padding:20px; border-radius:10px; margin-bottom:22px; border-left:5px solid #3b82f6;">
        <h4 style="color:#111; margin:0 0 12px;">Motivo de cancelación</h4>
        <p style="color:#444; margin:0; font-style:italic;">
          "${cancellation.cancellationReason}"
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
        Gracias por elegir <strong>💈 ${CONFIG.EMAIL_NAME}</strong><br>
        <span style="color:#999;">Este es un correo automático, no respondas directamente.</span>
      </p>
    </div>
  </div>
    `;

  const textFallback = buildCancellationText({
    name: cancellation.name,
    formattedDate,
    time: cancellation.time,
    reservationId: cancellation.id, // Usar cancellation.id
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

  return createJsonResponse({ status: 'success', message: 'Correo de cancelación enviado.' });
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
  const esc = s => (s || '').replace(/([,;])/g, '\$1');

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

/**
 * Función de utilidad para crear respuestas JSON.
 */
function createJsonResponse(data) {
  const output = JSON.stringify(data);
  return ContentService.createTextOutput(output)
    .setMimeType(ContentService.MimeType.JSON);
}