const { google } = require('googleapis');
const moment = require('moment');

class CalendarService {
  constructor() {
    this.calendarId = process.env.GOOGLE_CALENDAR_ID;
    this.slotMinutes = parseInt(process.env.SLOT_MINUTES) || 30;
    this.workStart = process.env.WORK_START || '09:00';
    this.workEnd = process.env.WORK_END || '18:00';
    this.maxReservasPorDia = parseInt(process.env.MAX_RESERVAS_POR_DIA) || 12;
    
    // Configurar autenticación
    this.auth = new google.auth.GoogleAuth({
      keyFile: './credentials.json', // Archivo de credenciales de Google
      scopes: ['https://www.googleapis.com/auth/calendar']
    });
    
    this.calendar = google.calendar({ version: 'v3', auth: this.auth });
  }

  /**
   * Genera todos los slots posibles para un día
   */
  generateAllSlots(date) {
    const slots = [];
    const startTime = moment(date + ' ' + this.workStart, 'YYYY-MM-DD HH:mm');
    const endTime = moment(date + ' ' + this.workEnd, 'YYYY-MM-DD HH:mm');
    
    let currentTime = startTime.clone();
    
    while (currentTime.isBefore(endTime)) {
      slots.push(currentTime.format('HH:mm'));
      currentTime.add(this.slotMinutes, 'minutes');
    }
    
    return slots;
  }

  /**
   * Obtiene los slots ocupados para una fecha
   */
  async getOccupiedSlots(date) {
    try {
      const startOfDay = moment(date).startOf('day').toISOString();
      const endOfDay = moment(date).endOf('day').toISOString();
      
      const response = await this.calendar.events.list({
        calendarId: this.calendarId,
        timeMin: startOfDay,
        timeMax: endOfDay,
        singleEvents: true,
        orderBy: 'startTime'
      });
      
      const occupiedSlots = [];
      
      response.data.items.forEach(event => {
        const start = moment(event.start.dateTime || event.start.date);
        const end = moment(event.end.dateTime || event.end.date);
        
        // Convertir eventos a slots
        let current = start.clone();
        while (current.isBefore(end)) {
          occupiedSlots.push(current.format('HH:mm'));
          current.add(this.slotMinutes, 'minutes');
        }
      });
      
      return occupiedSlots;
      
    } catch (error) {
      console.error('Error obteniendo eventos del calendario:', error);
      throw new Error('Error accediendo al calendario');
    }
  }

  /**
   * Obtiene slots disponibles para una fecha
   */
  async getAvailableSlots(date) {
    try {
      const allSlots = this.generateAllSlots(date);
      const occupiedSlots = await this.getOccupiedSlots(date);
      
      // Filtrar slots ocupados
      const availableSlots = allSlots.filter(slot => !occupiedSlots.includes(slot));
      
      // Aplicar límite de reservas por día
      const existingReservations = await this.getReservationsForDate(date);
      const maxSlots = this.maxReservasPorDia - existingReservations.length;
      
      return availableSlots.slice(0, Math.max(0, maxSlots));
      
    } catch (error) {
      console.error('Error obteniendo slots disponibles:', error);
      throw error;
    }
  }

  /**
   * Crea un evento en el calendario
   */
  async createEvent(reservation) {
    try {
      const startDateTime = moment(`${reservation.date} ${reservation.time}`, 'YYYY-MM-DD HH:mm');
      const endDateTime = startDateTime.clone().add(this.slotMinutes, 'minutes');
      
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
        transparency: 'transparent', // Evento tentativo
        attendees: [
          { email: reservation.email }
        ]
      };
      
      const response = await this.calendar.events.insert({
        calendarId: this.calendarId,
        resource: event
      });
      
      return response.data.id;
      
    } catch (error) {
      console.error('Error creando evento en calendario:', error);
      throw new Error('Error creando evento en calendario');
    }
  }

  /**
   * Elimina un evento del calendario
   */
  async deleteEvent(eventId) {
    try {
      await this.calendar.events.delete({
        calendarId: this.calendarId,
        eventId: eventId
      });
      
      console.log(`Evento ${eventId} eliminado del calendario`);
      
    } catch (error) {
      console.error('Error eliminando evento del calendario:', error);
      // No lanzar error para no afectar el flujo principal
    }
  }

  /**
   * Obtiene reservas existentes para una fecha (desde Sheets)
   */
  async getReservationsForDate(date) {
    // Esta función se implementará en SheetsService
    // Por ahora retornamos un array vacío
    return [];
  }
}

module.exports = CalendarService;
