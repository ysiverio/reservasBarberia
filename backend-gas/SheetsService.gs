/**
 * Servicio para manejar operaciones de Google Sheets
 * Guarda reservas, busca por token y registra cancelaciones
 */

/**
 * Clase para manejar operaciones de Google Sheets
 */
class SheetsService {
  constructor() {
    this.config = getConfig();
    this.spreadsheet = SpreadsheetApp.openById(this.config.sheetId);
    this.mainSheet = this.spreadsheet.getSheets()[0]; // Primera hoja para reservas
    this.cancelSheet = this.getOrCreateCancelSheet();
    this.initializeHeaders();
  }
  
  /**
   * Obtiene o crea la hoja de cancelaciones
   */
  getOrCreateCancelSheet() {
    let sheet = this.spreadsheet.getSheetByName(this.config.cancelSheetName);
    
    if (!sheet) {
      sheet = this.spreadsheet.insertSheet(this.config.cancelSheetName);
      this.initializeCancelHeaders(sheet);
    }
    
    return sheet;
  }
  
  /**
   * Inicializa los headers de la hoja principal
   */
  initializeHeaders() {
    const headers = [
      'ID',
      'Nombre',
      'Email', 
      'Fecha',
      'Hora',
      'Estado',
      'EventID',
      'CancelToken',
      'CancelURL',
      'FechaCreacion',
      'FechaActualizacion'
    ];
    
    this.setHeaders(this.mainSheet, headers);
  }
  
  /**
   * Inicializa los headers de la hoja de cancelaciones
   */
  initializeCancelHeaders(sheet) {
    const headers = [
      'ID',
      'ReservationID',
      'Nombre',
      'Email',
      'Fecha',
      'Hora',
      'Motivo',
      'FechaCancelacion'
    ];
    
    this.setHeaders(sheet, headers);
  }
  
  /**
   * Establece headers en una hoja
   */
  setHeaders(sheet, headers) {
    const lastRow = sheet.getLastRow();
    
    if (lastRow === 0) {
      // Hoja vacía, agregar headers
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    }
  }
  
  /**
   * Guarda una nueva reserva
   * @param {Object} reservation - Datos de la reserva
   * @returns {Object} Resultado de la operación
   */
  appendReservation(reservation) {
    try {
      // Validar datos
      if (!this.validateReservation(reservation)) {
        return { success: false, message: 'Datos de reserva inválidos' };
      }
      
      // Verificar límites
      const validationResult = this.validateReservationLimits(reservation);
      if (!validationResult.valid) {
        return { success: false, message: validationResult.message };
      }
      
      // Generar datos adicionales
      const id = this.generateId();
      const cancelToken = this.generateCancelToken();
      const cancelUrl = `${this.config.webAppBaseUrl}?action=cancel&token=${cancelToken}`;
      const now = new Date();
      
      // Preparar fila
      const row = [
        id,
        reservation.name,
        reservation.email,
        reservation.date,
        reservation.time,
        'PENDIENTE',
        reservation.eventId || '',
        cancelToken,
        cancelUrl,
        now,
        now
      ];
      
      // Agregar a la hoja
      this.mainSheet.appendRow(row);
      
      logInfo('Reserva guardada', { id, reservation });
      
      return {
        success: true,
        id: id,
        cancelToken: cancelToken,
        cancelUrl: cancelUrl
      };
      
    } catch (error) {
      logError('Error guardando reserva', error);
      return { success: false, message: 'Error interno del servidor' };
    }
  }
  
  /**
   * Busca una reserva por token de cancelación
   * @param {string} token - Token de cancelación
   * @returns {Object|null} Reserva encontrada o null
   */
  findReservationByToken(token) {
    try {
      const data = this.mainSheet.getDataRange().getValues();
      const headers = data[0];
      const tokenColumnIndex = headers.indexOf('CancelToken');
      
      if (tokenColumnIndex === -1) {
        return null;
      }
      
      // Buscar en las filas de datos (excluyendo header)
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (row[tokenColumnIndex] === token) {
          return this.rowToReservation(row, headers);
        }
      }
      
      return null;
      
    } catch (error) {
      logError('Error buscando reserva por token', error);
      return null;
    }
  }
  
  /**
   * Marca una reserva como cancelada
   * @param {string} token - Token de cancelación
   * @param {string} reason - Motivo de cancelación
   * @returns {Object} Resultado de la operación
   */
  markReservationCancelled(token, reason = '') {
    try {
      const reservation = this.findReservationByToken(token);
      
      if (!reservation) {
        return { success: false, message: 'Reserva no encontrada' };
      }
      
      if (reservation.status === 'CANCELADA') {
        return { success: false, message: 'La reserva ya fue cancelada' };
      }
      
      // Actualizar estado en hoja principal
      const data = this.mainSheet.getDataRange().getValues();
      const headers = data[0];
      const tokenColumnIndex = headers.indexOf('CancelToken');
      const statusColumnIndex = headers.indexOf('Estado');
      const updateColumnIndex = headers.indexOf('FechaActualizacion');
      
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (row[tokenColumnIndex] === token) {
          // Actualizar estado
          this.mainSheet.getRange(i + 1, statusColumnIndex + 1).setValue('CANCELADA');
          this.mainSheet.getRange(i + 1, updateColumnIndex + 1).setValue(new Date());
          break;
        }
      }
      
      // Registrar en hoja de cancelaciones
      this.recordCancellation(reservation, reason);
      
      logInfo('Reserva cancelada', { token, reason });
      
      return {
        success: true,
        reservation: reservation
      };
      
    } catch (error) {
      logError('Error cancelando reserva', error);
      return { success: false, message: 'Error interno del servidor' };
    }
  }
  
  /**
   * Registra una cancelación en la hoja de cancelaciones
   * @param {Object} reservation - Datos de la reserva
   * @param {string} reason - Motivo de cancelación
   */
  recordCancellation(reservation, reason) {
    try {
      const cancelId = this.generateId();
      const now = new Date();
      
      const row = [
        cancelId,
        reservation.id,
        reservation.name,
        reservation.email,
        reservation.date,
        reservation.time,
        reason,
        now
      ];
      
      this.cancelSheet.appendRow(row);
      
    } catch (error) {
      logError('Error registrando cancelación', error);
    }
  }
  
  /**
   * Obtiene reservas por fecha
   * @param {string} date - Fecha en formato YYYY-MM-DD
   * @returns {Array} Array de reservas
   */
  getReservationsByDate(date) {
    try {
      const data = this.mainSheet.getDataRange().getValues();
      const headers = data[0];
      const dateColumnIndex = headers.indexOf('Fecha');
      const statusColumnIndex = headers.indexOf('Estado');
      
      const reservations = [];
      
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (row[dateColumnIndex] === date && row[statusColumnIndex] === 'PENDIENTE') {
          reservations.push(this.rowToReservation(row, headers));
        }
      }
      
      return reservations;
      
    } catch (error) {
      logError('Error obteniendo reservas por fecha', error);
      return [];
    }
  }
  
  /**
   * Obtiene reservas por email y fecha
   * @param {string} email - Email del cliente
   * @param {string} date - Fecha en formato YYYY-MM-DD
   * @returns {Array} Array de reservas
   */
  getReservationsByEmailAndDate(email, date) {
    try {
      const data = this.mainSheet.getDataRange().getValues();
      const headers = data[0];
      const emailColumnIndex = headers.indexOf('Email');
      const dateColumnIndex = headers.indexOf('Fecha');
      const statusColumnIndex = headers.indexOf('Estado');
      
      const reservations = [];
      
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (row[emailColumnIndex] === email && 
            row[dateColumnIndex] === date && 
            row[statusColumnIndex] === 'PENDIENTE') {
          reservations.push(this.rowToReservation(row, headers));
        }
      }
      
      return reservations;
      
    } catch (error) {
      logError('Error obteniendo reservas por email y fecha', error);
      return [];
    }
  }
  
  /**
   * Convierte una fila de datos a objeto reserva
   * @param {Array} row - Fila de datos
   * @param {Array} headers - Headers de la hoja
   * @returns {Object} Objeto reserva
   */
  rowToReservation(row, headers) {
    const reservation = {};
    
    headers.forEach((header, index) => {
      reservation[header.toLowerCase()] = row[index];
    });
    
    return reservation;
  }
  
  /**
   * Valida los datos de una reserva
   * @param {Object} reservation - Datos de la reserva
   * @returns {boolean} true si es válida
   */
  validateReservation(reservation) {
    const config = this.config;
    
    if (!reservation.name || 
        reservation.name.length < config.minNameLength ||
        reservation.name.length > config.maxNameLength) {
      return false;
    }
    
    if (!reservation.email || !this.isValidEmail(reservation.email)) {
      return false;
    }
    
    if (!reservation.date || !this.isValidDate(reservation.date)) {
      return false;
    }
    
    if (!reservation.time || !this.isValidTime(reservation.time)) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Valida los límites de reservas
   * @param {Object} reservation - Datos de la reserva
   * @returns {Object} Resultado de validación
   */
  validateReservationLimits(reservation) {
    const config = this.config;
    
    // Verificar límite por día
    const dailyReservations = this.getReservationsByDate(reservation.date);
    if (dailyReservations.length >= config.maxReservasPorDia) {
      return {
        valid: false,
        message: 'Se ha alcanzado el límite de reservas para este día'
      };
    }
    
    // Verificar límite por email por día
    const emailReservations = this.getReservationsByEmailAndDate(reservation.email, reservation.date);
    if (emailReservations.length >= config.maxReservasPorEmailPorDia) {
      return {
        valid: false,
        message: `Ya tienes ${config.maxReservasPorEmailPorDia} reservas para este día`
      };
    }
    
    return { valid: true };
  }
  
  /**
   * Genera un ID único
   * @returns {string} ID único
   */
  generateId() {
    return Utilities.getUuid();
  }
  
  /**
   * Genera un token de cancelación
   * @returns {string} Token de cancelación
   */
  generateCancelToken() {
    const config = this.config;
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    
    for (let i = 0; i < config.tokenLength; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return token;
  }
  
  /**
   * Valida formato de email
   * @param {string} email - Email a validar
   * @returns {boolean} true si es válido
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  
  /**
   * Valida formato de fecha
   * @param {string} date - Fecha a validar
   * @returns {boolean} true si es válida
   */
  isValidDate(date) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) return false;
    
    const dateObj = new Date(date);
    return !isNaN(dateObj.getTime());
  }
  
  /**
   * Valida formato de hora
   * @param {string} time - Hora a validar
   * @returns {boolean} true si es válida
   */
  isValidTime(time) {
    const timeRegex = /^\d{2}:\d{2}$/;
    if (!timeRegex.test(time)) return false;
    
    const [hours, minutes] = time.split(':').map(Number);
    return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
  }
}
