const { google } = require('googleapis');
const crypto = require('crypto');
const moment = require('moment');
const nodemailer = require('nodemailer');

exports.handler = async (event, context) => {
  // Configurar CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  // Manejar preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    console.log('=== INICIO DE RESERVE ===');
    console.log('Event body:', event.body);
    console.log('Event body type:', typeof event.body);
    console.log('Event body length:', event.body ? event.body.length : 'undefined');
    
    // Verificar que el body no esté vacío
    if (!event.body || event.body.trim() === '') {
      console.log('❌ Body está vacío');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          message: 'Datos de reserva no recibidos'
        })
      };
    }
    
    // Parsear el body
    let body;
    try {
      body = JSON.parse(event.body);
      console.log('✅ JSON parseado correctamente:', body);
    } catch (parseError) {
      console.log('❌ Error parseando JSON:', parseError.message);
      console.log('Body recibido:', event.body);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          message: 'Datos de reserva mal formateados'
        })
      };
    }
    
    const { name, email, date, time } = body;
    
    // Validar datos requeridos
    if (!name || !email || !date || !time) {
      console.log('❌ Datos faltantes:', { name: !!name, email: !!email, date: !!date, time: !!time });
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          message: 'Todos los campos son requeridos'
        })
      };
    }

    console.log('✅ Datos válidos recibidos');

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          message: 'Email inválido'
        })
      };
    }

    console.log('Configurando autenticación de Google...');
    
    // Configurar autenticación de Google
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS),
      scopes: ['https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/spreadsheets']
    });

    console.log('✅ Autenticación de Google configurada');
    console.log('Verificando reservas existentes...');
    
    // Verificar límites de reservas
    const existingReservations = await getReservationsByEmailAndDate(email, date, auth);
    const maxPerEmail = parseInt(process.env.MAX_RESERVAS_POR_EMAIL_POR_DIA) || 2;
    
    if (existingReservations.length >= maxPerEmail) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          message: `Ya tienes ${maxPerEmail} reservas para esta fecha`
        })
      };
    }

    console.log('Creando evento en calendario...');
    
    // Crear evento en calendario
    const eventId = await createCalendarEvent({ name, email, date, time }, auth);

    console.log('Guardando en Sheets...');
    
    // Guardar en Sheets
    const reservation = await createReservation({ name, email, date, time, eventId }, auth);

    console.log('Enviando email de confirmación...');
    
    // Enviar email de confirmación (temporalmente deshabilitado)
    try {
      // await sendConfirmationEmail(reservation);
      console.log('✅ Email temporalmente deshabilitado - reserva creada exitosamente');
      console.log(`📧 Email que se habría enviado a: ${reservation.email}`);
    } catch (emailError) {
      console.log('❌ Error enviando email:', emailError.message);
      // No fallamos la reserva por error de email
    }

    console.log('✅ Reserva creada exitosamente');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Reserva creada exitosamente',
        cancelUrl: reservation.cancelUrl
      })
    };

  } catch (error) {
    console.error('Error en reserve:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        message: 'Error creando reserva',
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
  
  // Crear fecha en zona horaria de Montevideo (UTC-3)
  const startDateTime = moment.tz(`${reservation.date} ${reservation.time}`, 'YYYY-MM-DD HH:mm', 'America/Montevideo');
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
    transparency: 'transparent'
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
    'CONFIRMADA', // Cambiado de 'PENDIENTE' a 'CONFIRMADA' para mayor claridad
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
    status: 'CONFIRMADA',
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
      if (row[2] === email && row[3] === date && row[5] === 'CONFIRMADA') {
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
    // Verificar que nodemailer esté disponible
    if (!nodemailer || typeof nodemailer.createTransport !== 'function') {
      console.log('❌ Nodemailer no está disponible correctamente');
      throw new Error('Nodemailer no está configurado correctamente');
    }
    
    const transporter = nodemailer.createTransport({
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
