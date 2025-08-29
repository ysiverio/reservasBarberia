/**
 * Servicio para manejar operaciones del calendario de Google
 * Genera slots disponibles y consulta eventos ocupados
 */

/**
 * Genera todos los slots de tiempo disponibles para una fecha específica
 * @param {string} date - Fecha en formato YYYY-MM-DD
 * @returns {Array} Array de slots disponibles en formato HH:MM
 */
function generateAvailableSlots(date) {
  const config = getConfig();
  
  try {
    // Validar que la fecha no sea feriado o no laborable
    if (isHoliday(date) || isNonWorkingDay(date)) {
      return [];
    }
    
    const slots = [];
    const startTime = parseTime(config.workStart);
    const endTime = parseTime(config.workEnd);
    const slotMinutes = config.slotMinutes;
    
    let currentTime = startTime;
    
    while (currentTime < endTime) {
      const timeString = formatTime(currentTime);
      slots.push(timeString);
      
      // Avanzar al siguiente slot
      currentTime = addMinutes(currentTime, slotMinutes);
    }
    
    return slots;
  } catch (error) {
    logError('Error generando slots disponibles', error);
    return [];
  }
}

/**
 * Obtiene los slots ocupados para una fecha específica
 * @param {string} date - Fecha en formato YYYY-MM-DD
 * @returns {Array} Array de slots ocupados en formato HH:MM
 */
function getOccupiedSlots(date) {
  const config = getConfig();
  
  try {
    const calendar = CalendarApp.getCalendarById(config.calendarId);
    if (!calendar) {
      throw new Error('No se pudo acceder al calendario');
    }
    
    const startDate = new Date(date + 'T00:00:00');
    const endDate = new Date(date + 'T23:59:59');
    
    const events = calendar.getEvents(startDate, endDate);
    const occupiedSlots = [];
    
    events.forEach(event => {
      const eventStart = event.getStartTime();
      const eventEnd = event.getEndTime();
      
      // Generar slots ocupados basados en la duración del evento
      let currentSlot = new Date(eventStart);
      
      while (currentSlot < eventEnd) {
        const timeString = formatTime(currentSlot);
        if (!occupiedSlots.includes(timeString)) {
          occupiedSlots.push(timeString);
        }
        currentSlot = addMinutes(currentSlot, config.slotMinutes);
      }
    });
    
    return occupiedSlots;
  } catch (error) {
    logError('Error obteniendo slots ocupados', error);
    return [];
  }
}

/**
 * Obtiene los slots disponibles para una fecha específica
 * @param {string} date - Fecha en formato YYYY-MM-DD
 * @returns {Array} Array de slots disponibles
 */
function getAvailableSlots(date) {
  try {
    const allSlots = generateAvailableSlots(date);
    const occupiedSlots = getOccupiedSlots(date);
    
    // Filtrar slots ocupados
    const availableSlots = allSlots.filter(slot => !occupiedSlots.includes(slot));
    
    // Verificar límite de reservas por día
    const currentReservations = getReservationsForDate(date);
    const maxReservations = getConfig().maxReservasPorDia;
    
    if (currentReservations.length >= maxReservations) {
      return [];
    }
    
    return availableSlots;
  } catch (error) {
    logError('Error obteniendo slots disponibles', error);
    return [];
  }
}

/**
 * Crea un evento tentativo en el calendario
 * @param {Object} reservation - Objeto con datos de la reserva
 * @returns {string} ID del evento creado
 */
function createTentativeEvent(reservation) {
  const config = getConfig();
  
  if (!config.createTentativeEvent) {
    return null;
  }
  
  try {
    const calendar = CalendarApp.getCalendarById(config.calendarId);
    if (!calendar) {
      throw new Error('No se pudo acceder al calendario');
    }
    
    const startTime = new Date(`${reservation.date}T${reservation.time}:00`);
    const endTime = addMinutes(startTime, config.slotMinutes);
    
    const eventTitle = `Reserva: ${reservation.name}`;
    const eventDescription = `
Cliente: ${reservation.name}
Email: ${reservation.email}
Estado: Pendiente de confirmación
Token: ${reservation.cancelToken}
    `.trim();
    
    const event = calendar.createEvent(
      eventTitle,
      startTime,
      endTime,
      {
        description: eventDescription,
        location: 'Barbería',
        guests: reservation.email
      }
    );
    
    // Marcar como tentativo
    event.setTransparency(CalendarApp.EventTransparency.TRANSPARENT);
    
    logInfo('Evento tentativo creado', { eventId: event.getId(), reservation });
    
    return event.getId();
  } catch (error) {
    logError('Error creando evento tentativo', error);
    return null;
  }
}

/**
 * Elimina un evento del calendario
 * @param {string} eventId - ID del evento a eliminar
 * @returns {boolean} true si se eliminó correctamente
 */
function deleteEvent(eventId) {
  if (!eventId) {
    return true;
  }
  
  try {
    const config = getConfig();
    const calendar = CalendarApp.getCalendarById(config.calendarId);
    
    if (!calendar) {
      throw new Error('No se pudo acceder al calendario');
    }
    
    const event = calendar.getEventById(eventId);
    if (event) {
      event.deleteEvent();
      logInfo('Evento eliminado', { eventId });
      return true;
    }
    
    return false;
  } catch (error) {
    logError('Error eliminando evento', error);
    return false;
  }
}

/**
 * Verifica si una fecha es feriado
 * @param {string} date - Fecha en formato YYYY-MM-DD
 * @returns {boolean} true si es feriado
 */
function isHoliday(date) {
  const config = getConfig();
  return config.feriados.includes(date);
}

/**
 * Verifica si una fecha es día no laborable
 * @param {string} date - Fecha en formato YYYY-MM-DD
 * @returns {boolean} true si es día no laborable
 */
function isNonWorkingDay(date) {
  const config = getConfig();
  const dayOfWeek = new Date(date).getDay();
  return config.noLaborables.includes(dayOfWeek);
}

/**
 * Parsea una hora en formato HH:MM a objeto Date
 * @param {string} time - Hora en formato HH:MM
 * @returns {Date} Objeto Date con la hora
 */
function parseTime(time) {
  const [hours, minutes] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
}

/**
 * Formatea un objeto Date a string HH:MM
 * @param {Date} date - Objeto Date
 * @returns {string} Hora en formato HH:MM
 */
function formatTime(date) {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Añade minutos a un objeto Date
 * @param {Date} date - Objeto Date
 * @param {number} minutes - Minutos a añadir
 * @returns {Date} Nuevo objeto Date
 */
function addMinutes(date, minutes) {
  const newDate = new Date(date);
  newDate.setMinutes(newDate.getMinutes() + minutes);
  return newDate;
}

/**
 * Obtiene las reservas para una fecha específica
 * @param {string} date - Fecha en formato YYYY-MM-DD
 * @returns {Array} Array de reservas
 */
function getReservationsForDate(date) {
  try {
    const sheetsService = new SheetsService();
    return sheetsService.getReservationsByDate(date);
  } catch (error) {
    logError('Error obteniendo reservas para fecha', error);
    return [];
  }
}
