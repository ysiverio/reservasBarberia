const { google } = require('googleapis');
const crypto = require('crypto');
const moment = require('moment');

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
    console.log('Event body type:', typeof event.body);
    console.log('Event body length:', event.body ? event.body.length : 'undefined');
    console.log('Event headers:', event.headers);
    console.log('Event httpMethod:', event.httpMethod);
    
    // Verificar que el body no esté vacío
    if (!event.body || event.body.trim() === '') {
      console.log('❌ Body está vacío');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          message: 'Body está vacío',
          step: 0,
          eventInfo: {
            body: event.body,
            bodyType: typeof event.body,
            bodyLength: event.body ? event.body.length : 'undefined',
            headers: event.headers,
            httpMethod: event.httpMethod
          }
        })
      };
    }
    
    // Paso 1: Parsear JSON
    let body;
    try {
      body = JSON.parse(event.body);
      console.log('✅ Paso 1: JSON parseado correctamente:', body);
    } catch (error) {
      console.log('❌ Paso 1: Error parseando JSON:', error.message);
      console.log('Body recibido:', event.body);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          message: 'Error parseando JSON',
          step: 1,
          error: error.message,
          bodyReceived: event.body,
          bodyType: typeof event.body,
          bodyLength: event.body ? event.body.length : 'undefined'
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
      
      // Obtener límite de reservas por email por día
      const maxPerEmail = parseInt(process.env.MAX_RESERVAS_POR_EMAIL_POR_DIA) || 1;
      console.log(`📊 Límite de reservas por email por día: ${maxPerEmail}`);
      
      // Verificar si ya se alcanzó el límite de reservas para este email en esta fecha
      if (existingReservations.length >= maxPerEmail) {
        console.log(`❌ Paso 4: Ya se alcanzó el límite de ${maxPerEmail} reserva(s) para este email en esta fecha`);
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            message: `Ya tienes ${existingReservations.length} reserva(s) para esta fecha. Solo se permite ${maxPerEmail} reserva por email por día.`,
            step: 4,
            existingReservations: existingReservations.length,
            maxAllowed: maxPerEmail
          })
        };
      }
      
      console.log(`✅ Paso 4: No se ha alcanzado el límite de reservas (${existingReservations.length}/${maxPerEmail})`);
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
    
         // Paso 7: Email (manejado por Google Apps Script)
     console.log('✅ Paso 7: Email será enviado automáticamente por Google Apps Script');
    
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
  
  // Crear fecha en zona horaria de Montevideo (GMT-3)
  // Cuando el usuario selecciona 11:00, queremos que aparezca como 11:00 en el calendario
  let startDateTime;
  try {
    // Intentar usar moment.tz si está disponible
    startDateTime = moment.tz(`${reservation.date} ${reservation.time}`, 'YYYY-MM-DD HH:mm', 'America/Montevideo');
  } catch (error) {
    // Fallback: crear en UTC y ajustar manualmente para GMT-3
    startDateTime = moment.utc(`${reservation.date} ${reservation.time}`, 'YYYY-MM-DD HH:mm');
    startDateTime.add(3, 'hours'); // Ajustar a GMT-3
  }
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
    'CONFIRMADA',
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


