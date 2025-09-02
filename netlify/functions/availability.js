const moment = require('moment');
const config = require('./lib/config.json');
const { db } = require('./lib/firebaseService.js'); // <-- Usamos nuestro servicio de Firebase

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-control-allow-headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { date } = event.queryStringParameters || {};
    
    if (!date || !moment(date, 'YYYY-MM-DD', true).isValid()) {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, message: 'Fecha inválida o requerida.' }) };
    }

    const dayOfWeek = moment(date).day();
    const { workDays, holidays } = config.availability;

    if (!workDays.includes(dayOfWeek) || holidays.includes(date)) {
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, date, availableSlots: [], message: 'Día no laborable o feriado' }) };
    }

    const availableSlots = await getAvailableSlots(date);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, date, availableSlots })
    };

  } catch (error) {
    console.error('Error en availability:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, message: 'Error obteniendo disponibilidad' }) };
  }
};

async function getAvailableSlots(date) {
  // Leemos la configuración del horario desde el config.json
  const { slotDurationMinutes, workHours, maxReservationsPerDay } = config.availability;
  
  // 1. Obtener las citas ya existentes de Firestore para esa fecha
  console.log(`Buscando reservaciones en Firestore para la fecha: ${date}`);
  const reservationsSnapshot = await db.collection('reservations').where('date', '==', date).get();
  
  const occupiedSlots = new Set();
  reservationsSnapshot.forEach(doc => {
    occupiedSlots.add(doc.data().time);
  });
  console.log(`Slots ocupados encontrados (${occupiedSlots.size}):`, Array.from(occupiedSlots));

  // 2. Si ya se alcanzó el máximo de reservas, no devolver más horarios
  if (occupiedSlots.size >= maxReservationsPerDay) {
    console.log('Se alcanzó el máximo de reservas para el día.');
    return [];
  }

  // 3. Generar todos los slots posibles del día
  const allSlots = [];
  const startTime = moment(`${date} ${workHours.start}`, 'YYYY-MM-DD HH:mm');
  const endTime = moment(`${date} ${workHours.end}`, 'YYYY-MM-DD HH:mm');
  
  let currentTime = startTime.clone();
  while (currentTime.isBefore(endTime)) {
    allSlots.push(currentTime.format('HH:mm'));
    currentTime.add(slotDurationMinutes, 'minutes');
  }
  console.log(`Todos los slots posibles del día: ${allSlots.length}`);

  // 4. Filtrar para obtener solo los disponibles
  const availableSlots = allSlots.filter(slot => !occupiedSlots.has(slot));
  console.log(`Slots disponibles encontrados: ${availableSlots.length}`);
  
  return availableSlots;
}
