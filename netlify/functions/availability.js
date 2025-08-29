const { google } = require('googleapis');
const moment = require('moment');

// Configurar autenticación de Google
const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS),
  scopes: ['https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/spreadsheets']
});

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
    const { date } = event.queryStringParameters || {};
    
    if (!date) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          message: 'Fecha requerida'
        })
      };
    }

    // Validar formato de fecha
    if (!moment(date, 'YYYY-MM-DD', true).isValid()) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          message: 'Formato de fecha inválido'
        })
      };
    }

    // Verificar si es día no laborable
    const dayOfWeek = moment(date).day();
    const noLaborables = process.env.NO_LABORABLES?.split(',').map(Number) || [0];
    
    console.log(`Día de la semana: ${dayOfWeek} (${moment(date).format('dddd')})`);
    console.log(`Días no laborables configurados: ${noLaborables.join(', ')}`);
    
    if (noLaborables.includes(dayOfWeek)) {
      console.log(`❌ ${moment(date).format('dddd')} (${dayOfWeek}) es un día no laborable`);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          date: date,
          availableSlots: [],
          message: 'Día no laborable'
        })
      };
    }
    
    console.log(`✅ ${moment(date).format('dddd')} (${dayOfWeek}) es un día laborable`);

    // Verificar si es feriado
    const feriados = process.env.FERIADOS?.split(',') || [];
    if (feriados.includes(date)) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          date: date,
          availableSlots: [],
          message: 'Día feriado'
        })
      };
    }

    // Obtener slots disponibles
    const availableSlots = await getAvailableSlots(date);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        date: date,
        availableSlots: availableSlots
      })
    };

  } catch (error) {
    console.error('Error en availability:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        message: 'Error obteniendo disponibilidad'
      })
    };
  }
};

async function getAvailableSlots(date) {
  const calendar = google.calendar({ version: 'v3', auth });
  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  const slotMinutes = parseInt(process.env.SLOT_MINUTES) || 30;
  const workStart = process.env.WORK_START || '09:00';
  const workEnd = process.env.WORK_END || '18:00';
  
  console.log(`Buscando disponibilidad para ${date}`);
  console.log(`Horario de trabajo: ${workStart} - ${workEnd}`);
  console.log(`Duración de slot: ${slotMinutes} minutos`);
  
  // Generar todos los slots posibles
  const allSlots = [];
  const startTime = moment(date + ' ' + workStart, 'YYYY-MM-DD HH:mm');
  const endTime = moment(date + ' ' + workEnd, 'YYYY-MM-DD HH:mm');
  
  let currentTime = startTime.clone();
  while (currentTime.isBefore(endTime)) {
    allSlots.push(currentTime.format('HH:mm'));
    currentTime.add(slotMinutes, 'minutes');
  }
  
  console.log(`Slots totales generados: ${allSlots.join(', ')}`);
  
  // Obtener eventos del calendario
  const startOfDay = moment(date).startOf('day').toISOString();
  const endOfDay = moment(date).endOf('day').toISOString();
  
  console.log(`Buscando eventos entre ${startOfDay} y ${endOfDay}`);
  
  const response = await calendar.events.list({
    calendarId: calendarId,
    timeMin: startOfDay,
    timeMax: endOfDay,
    singleEvents: true,
    orderBy: 'startTime'
  });
  
  console.log(`Eventos encontrados: ${response.data.items.length}`);
  
  // Obtener slots ocupados
  const occupiedSlots = [];
  response.data.items.forEach(event => {
    console.log(`Evento: ${event.summary} - ${event.start.dateTime} a ${event.end.dateTime}`);
    
    const start = moment(event.start.dateTime || event.start.date);
    const end = moment(event.end.dateTime || event.end.date);
    
    // Usar la hora tal como está en el calendario
    const localStart = start.clone();
    const localEnd = end.clone();
    
    console.log(`Evento local: ${localStart.format('HH:mm')} a ${localEnd.format('HH:mm')}`);
    
    // Generar todos los slots que este evento ocupa
    let current = localStart.clone();
    while (current.isBefore(localEnd)) {
      const slotTime = current.format('HH:mm');
      occupiedSlots.push(slotTime);
      console.log(`Slot ocupado: ${slotTime}`);
      current.add(slotMinutes, 'minutes');
    }
  });
  
  console.log(`Slots ocupados: ${occupiedSlots.join(', ')}`);
  
  // Filtrar slots disponibles
  const availableSlots = allSlots.filter(slot => !occupiedSlots.includes(slot));
  
  console.log(`Slots disponibles antes de límite: ${availableSlots.join(', ')}`);
  
  // Aplicar límite de reservas por día
  const maxReservasPorDia = parseInt(process.env.MAX_RESERVAS_POR_DIA) || 12;
  const existingReservations = await getReservationsForDate(date);
  const maxSlots = maxReservasPorDia - existingReservations.length;
  
  console.log(`Reservas existentes en Sheets: ${existingReservations.length}`);
  console.log(`Máximo slots disponibles: ${maxSlots}`);
  
  const finalSlots = availableSlots.slice(0, Math.max(0, maxSlots));
  
  console.log(`Slots finales disponibles: ${finalSlots.join(', ')}`);
  
  return finalSlots;
}

async function getReservationsForDate(date) {
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
      if (row[3] === date && row[5] === 'CONFIRMADA') {
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
    console.error('Error obteniendo reservas:', error);
    return [];
  }
}
