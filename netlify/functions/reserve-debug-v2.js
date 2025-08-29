const { google } = require('googleapis');
const crypto = require('crypto');
const moment = require('moment');
const nodemailer = require('nodemailer');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    console.log('=== INICIO DE RESERVE-DEBUG-V2 ===');
    console.log('Event body:', event.body);
    
    // Paso 1: Parsear JSON
    let body;
    try {
      body = JSON.parse(event.body);
      console.log('✅ Paso 1: JSON parseado correctamente:', body);
    } catch (error) {
      console.log('❌ Paso 1: Error parseando JSON:', error.message);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          message: 'Error parseando JSON',
          step: 1,
          error: error.message
        })
      };
    }
    
    const { name, email, date, time } = body;
    
    // Paso 2: Validar datos
    if (!name || !email || !date || !time) {
      console.log('❌ Paso 2: Datos faltantes:', { name: !!name, email: !!email, date: !!date, time: !!time });
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          message: 'Datos faltantes',
          step: 2,
          data: { name: !!name, email: !!email, date: !!date, time: !!time }
        })
      };
    }
    console.log('✅ Paso 2: Datos válidos');
    
    // Paso 3: Configurar autenticación
    let auth;
    try {
      auth = new google.auth.GoogleAuth({
        credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS),
        scopes: ['https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/spreadsheets']
      });
      console.log('✅ Paso 3: Autenticación configurada');
    } catch (error) {
      console.log('❌ Paso 3: Error configurando autenticación:', error.message);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          message: 'Error configurando autenticación',
          step: 3,
          error: error.message
        })
      };
    }
    
    // Paso 4: Verificar reservas existentes
    try {
      const existingReservations = await getReservationsByEmailAndDate(email, date, auth);
      console.log('✅ Paso 4: Reservas existentes verificadas:', existingReservations.length);
    } catch (error) {
      console.log('❌ Paso 4: Error verificando reservas existentes:', error.message);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          message: 'Error verificando reservas existentes',
          step: 4,
          error: error.message
        })
      };
    }
    
    // Paso 5: Crear evento en calendario
    let eventId;
    try {
      eventId = await createCalendarEvent({ name, email, date, time }, auth);
      console.log('✅ Paso 5: Evento creado en calendario:', eventId);
    } catch (error) {
      console.log('❌ Paso 5: Error creando evento en calendario:', error.message);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          message: 'Error creando evento en calendario',
          step: 5,
          error: error.message
        })
      };
    }
    
    // Paso 6: Guardar en Sheets
    let reservation;
    try {
      reservation = await createReservation({ name, email, date, time, eventId }, auth);
      console.log('✅ Paso 6: Reserva guardada en Sheets:', reservation.id);
    } catch (error) {
      console.log('❌ Paso 6: Error guardando en Sheets:', error.message);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          message: 'Error guardando en Sheets',
          step: 6,
          error: error.message
        })
      };
    }
    
    // Paso 7: Enviar email
    try {
      await sendConfirmationEmail(reservation);
      console.log('✅ Paso 7: Email enviado correctamente');
    } catch (error) {
      console.log('❌ Paso 7: Error enviando email:', error.message);
      // No retornamos error aquí porque la reserva ya se creó
    }
    
    console.log('✅ TODOS LOS PASOS COMPLETADOS EXITOSAMENTE');
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Reserva creada exitosamente',
        cancelUrl: reservation.cancelUrl,
        steps: 'Todos los pasos completados'
      })
    };
    
  } catch (error) {
    console.error('❌ Error general en reserve-debug-v2:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        message: 'Error general',
        error: error.message,
        stack: error.stack
      })
    };
  }
};

async function createCalendarEvent(reservation, auth) {
  const calendar = google.calendar({ version: 'v3', auth });
  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  const slotMinutes = parseInt(process.env.SLOT_MINUTES) || 30;
  
  const startDateTime = moment(`${reservation.date} ${reservation.time}`, 'YYYY-MM-DD HH:mm');
  const endDateTime = startDateTime.clone().add(slotMinutes, 'minutes');
  
  const event = {
    summary: `Reserva - ${reservation.name}`,
    description: `Cliente: ${reservation.name}\nEmail: ${reservation.email}`,
    start: {
      dateTime: startDateTime.toISOString(),
      timeZone: 'America/Montevideo'
    },
    end: {
      dateTime: endDateTime.toISOString(),
      timeZone: 'America/Montevideo'
    },
    transparency: 'transparent',
    attendees: [
      { email: reservation.email }
    ]
  };
  
  const response = await calendar.events.insert({
    calendarId: calendarId,
    resource: event
  });
  
  return response.data.id;
}

async function createReservation(data, auth) {
  const sheets = google.sheets({ version: 'v4', auth });
  const sheetId = process.env.GOOGLE_SHEET_ID;
  
  const id = crypto.randomBytes(16).toString('hex');
  const cancelToken = crypto.randomBytes(32).toString('hex');
  const cancelUrl = `${process.env.URL || 'https://demo-citas-barberias.netlify.app'}/.netlify/functions/cancel?token=${cancelToken}`;
  const now = moment().format('YYYY-MM-DD HH:mm:ss');
  
  const row = [
    id,
    data.name,
    data.email,
    data.date,
    data.time,
    'PENDIENTE',
    data.eventId || '',
    cancelToken,
    cancelUrl,
    now,
    now
  ];
  
  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: 'A:K',
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    resource: {
      values: [row]
    }
  });
  
  return {
    id,
    name: data.name,
    email: data.email,
    date: data.date,
    time: data.time,
    status: 'PENDIENTE',
    eventId: data.eventId,
    cancelToken,
    cancelUrl,
    createdAt: now
  };
}

async function getReservationsByEmailAndDate(email, date, auth) {
  const sheets = google.sheets({ version: 'v4', auth });
  const sheetId = process.env.GOOGLE_SHEET_ID;
  
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'A:K'
    });
    
    const rows = response.data.values || [];
    const reservations = [];
    
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row[2] === email && row[3] === date && row[5] === 'PENDIENTE') {
        reservations.push({
          id: row[0],
          name: row[1],
          email: row[2],
          date: row[3],
          time: row[4],
          status: row[5]
        });
      }
    }
    
    return reservations;
  } catch (error) {
    console.error('Error obteniendo reservas por email y fecha:', error);
    return [];
  }
}

async function sendConfirmationEmail(reservation) {
  try {
    const transporter = nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_FROM,
        pass: process.env.EMAIL_PASSWORD
      }
    });
    
    const formattedDate = moment(reservation.date).format('dddd, D [de] MMMM [de] YYYY');
    
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: reservation.email,
      subject: process.env.EMAIL_SUBJECT || 'Confirmación de reserva - Barbería',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">¡Reserva confirmada!</h2>
          <p>Hola <strong>${reservation.name}</strong>,</p>
          <p>Tu reserva ha sido confirmada exitosamente.</p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Detalles de la reserva:</h3>
            <p><strong>Fecha:</strong> ${formattedDate}</p>
            <p><strong>Hora:</strong> ${reservation.time}</p>
          </div>
          
          <p>Para cancelar tu reserva, utiliza este link:</p>
          <p><a href="${reservation.cancelUrl}" style="color: #dc3545; text-decoration: none;">Cancelar reserva</a></p>
          
          <p>Si tienes alguna pregunta, no dudes en contactarnos.</p>
          
          <p>Saludos,<br>
          <strong>Barbería</strong></p>
        </div>
      `
    };
    
    await transporter.sendMail(mailOptions);
    console.log(`Email de confirmación enviado a ${reservation.email}`);
    
  } catch (error) {
    console.error('Error enviando email de confirmación:', error);
  }
}
