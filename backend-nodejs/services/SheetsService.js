const { google } = require('googleapis');
const crypto = require('crypto');
const moment = require('moment');

class SheetsService {
  constructor() {
    this.sheetId = process.env.GOOGLE_SHEET_ID;
    this.cancelSheetName = 'Cancelaciones';
    
    // Configurar autenticación
    this.auth = new google.auth.GoogleAuth({
      keyFile: './credentials.json', // Archivo de credenciales de Google
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    
    this.sheets = google.sheets({ version: 'v4', auth: this.auth });
  }

  /**
   * Genera un ID único para la reserva
   */
  generateId() {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Genera un token de cancelación
   */
  generateCancelToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Crea una nueva reserva
   */
  async createReservation(data) {
    try {
      const id = this.generateId();
      const cancelToken = this.generateCancelToken();
      const cancelUrl = `${process.env.BACKEND_URL || 'http://localhost:3000'}/cancel?token=${cancelToken}`;
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
      
      // Agregar fila a la hoja principal
      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.sheetId,
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
      
    } catch (error) {
      console.error('Error creando reserva:', error);
      throw new Error('Error guardando reserva');
    }
  }

  /**
   * Busca una reserva por token de cancelación
   */
  async findReservationByToken(token) {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.sheetId,
        range: 'A:K'
      });
      
      const rows = response.data.values || [];
      
      // Buscar la fila que contenga el token
      for (let i = 1; i < rows.length; i++) { // Empezar desde 1 para saltar headers
        const row = rows[i];
        if (row[7] === token) { // Columna H (índice 7) es el cancelToken
          return {
            id: row[0],
            name: row[1],
            email: row[2],
            date: row[3],
            time: row[4],
            status: row[5],
            eventId: row[6],
            cancelToken: row[7],
            cancelUrl: row[8],
            createdAt: row[9],
            updatedAt: row[10]
          };
        }
      }
      
      return null;
      
    } catch (error) {
      console.error('Error buscando reserva por token:', error);
      throw new Error('Error buscando reserva');
    }
  }

  /**
   * Cancela una reserva
   */
  async cancelReservation(token, reason = '') {
    try {
      const reservation = await this.findReservationByToken(token);
      
      if (!reservation) {
        return {
          success: false,
          message: 'Reserva no encontrada'
        };
      }
      
      if (reservation.status === 'CANCELADA') {
        return {
          success: false,
          message: 'La reserva ya fue cancelada'
        };
      }
      
      // Actualizar estado en la hoja principal
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.sheetId,
        range: 'A:K'
      });
      
      const rows = response.data.values || [];
      let rowIndex = -1;
      
      // Encontrar la fila del token
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][7] === token) {
          rowIndex = i + 1; // +1 porque las filas empiezan en 1
          break;
        }
      }
      
      if (rowIndex === -1) {
        return {
          success: false,
          message: 'Reserva no encontrada'
        };
      }
      
      // Actualizar estado y fecha de actualización
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.sheetId,
        range: `F${rowIndex}:K${rowIndex}`,
        valueInputOption: 'RAW',
        resource: {
          values: [['CANCELADA', '', '', '', '', moment().format('YYYY-MM-DD HH:mm:ss')]]
        }
      });
      
      // Registrar en hoja de cancelaciones
      await this.recordCancellation(reservation, reason);
      
      return {
        success: true,
        reservation: {
          ...reservation,
          status: 'CANCELADA'
        }
      };
      
    } catch (error) {
      console.error('Error cancelando reserva:', error);
      return {
        success: false,
        message: 'Error cancelando reserva'
      };
    }
  }

  /**
   * Registra la cancelación en la hoja de cancelaciones
   */
  async recordCancellation(reservation, reason) {
    try {
      const cancelId = this.generateId();
      const now = moment().format('YYYY-MM-DD HH:mm:ss');
      
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
      
      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.sheetId,
        range: `${this.cancelSheetName}!A:H`,
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        resource: {
          values: [row]
        }
      });
      
    } catch (error) {
      console.error('Error registrando cancelación:', error);
      // No lanzar error para no afectar el flujo principal
    }
  }

  /**
   * Obtiene reservas por email y fecha
   */
  async getReservationsByEmailAndDate(email, date) {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.sheetId,
        range: 'A:K'
      });
      
      const rows = response.data.values || [];
      const reservations = [];
      
      for (let i = 1; i < rows.length; i++) { // Empezar desde 1 para saltar headers
        const row = rows[i];
        if (row[2] === email && row[3] === date && row[5] === 'PENDIENTE') {
          reservations.push({
            id: row[0],
            name: row[1],
            email: row[2],
            date: row[3],
            time: row[4],
            status: row[5],
            eventId: row[6],
            cancelToken: row[7],
            cancelUrl: row[8],
            createdAt: row[9],
            updatedAt: row[10]
          });
        }
      }
      
      return reservations;
      
    } catch (error) {
      console.error('Error obteniendo reservas por email y fecha:', error);
      return [];
    }
  }

  /**
   * Obtiene reservas para una fecha específica
   */
  async getReservationsForDate(date) {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.sheetId,
        range: 'A:K'
      });
      
      const rows = response.data.values || [];
      const reservations = [];
      
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row[3] === date && row[5] === 'PENDIENTE') {
          reservations.push({
            id: row[0],
            name: row[1],
            email: row[2],
            date: row[3],
            time: row[4],
            status: row[5],
            eventId: row[6],
            cancelToken: row[7],
            cancelUrl: row[8],
            createdAt: row[9],
            updatedAt: row[10]
          });
        }
      }
      
      return reservations;
      
    } catch (error) {
      console.error('Error obteniendo reservas para fecha:', error);
      return [];
    }
  }
}

module.exports = SheetsService;
