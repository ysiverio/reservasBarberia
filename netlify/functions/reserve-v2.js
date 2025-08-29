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
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    console.log('Iniciando proceso de reserva...');
    
    // Parsear el body
    const body = JSON.parse(event.body);
    console.log('Datos recibidos:', { name: body.name, email: body.email, date: body.date, time: body.time });
    
    const { name, email, date, time } = body;
    
    // Validar datos requeridos
    if (!name || !email || !date || !time) {
      console.log('Datos faltantes:', { name: !!name, email: !!email, date: !!date, time: !!time });
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          message: 'Todos los campos son requeridos'
        })
      };
    }

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
    
    // Enviar email de confirmación
    await sendConfirmationEmail(reservation);

    console.log('Reserva creada exitosamente');

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
    console.error('Stack trace:', error.stack);
    
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
  try {
    const calendar = google.calendar({ version: 'v3', auth });
    const calendarId = process.env.GOOGLE_CALENDAR_ID;
    const slotMinutes = parseInt(process.env.SLOT_MINUTES) || 30;
    
    console.log('Calendar ID:', calendarId);
    console.log('Slot minutes:', slotMinutes);
    
    const startDateTime = moment(`${reservation.date} ${reservation.time}`, 'YYYY-MM-DD HH:mm');
    const endDateTime = startDateTime.clone().add(slotMinutes, 'minutes');
    
    console.log('Start DateTime:', startDateTime.format());
    console.log('End DateTime:', endDateTime.format());
    
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
    
    console.log('Evento a crear:', JSON.stringify(event, null, 2));
    
    const response = await calendar.events.insert({
      calendarId: calendarId,
      resource: event
    });
    
    console.log('Evento creado con ID:', response.data.id);
    return response.data.id;
    
  } catch (error) {
    console.error('Error creando evento en calendario:', error);
    throw new Error(`Error creando evento en calendario: ${error.message}`);
  }
}

async function createReservation(data, auth) {
  try {
    const sheets = google.sheets({ version: 'v4', auth });
    const sheetId = process.env.GOOGLE_SHEET_ID;
    
    console.log('Sheet ID:', sheetId);
    
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
    
    console.log('Fila a insertar:', row);
    
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: 'A:K',
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      resource: {
        values: [row]
      }
    });
    
    console.log('Reserva guardada en Sheets');
    
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
    
  } catch (error) {
    console.error('Error guardando en Sheets:', error);
    throw new Error(`Error guardando en Sheets: ${error.message}`);
  }
}

async function getReservationsByEmailAndDate(email, date, auth) {
  try {
    const sheets = google.sheets({ version: 'v4', auth });
    const sheetId = process.env.GOOGLE_SHEET_ID;
    
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
    
    console.log(`Reservas encontradas para ${email} en ${date}:`, reservations.length);
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
    // No lanzamos error aquí para no fallar toda la reserva por un problema de email
  }
}
