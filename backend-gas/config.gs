/**
 * Configuración del sistema de reservas de barbería
 * 
 * IMPORTANTE: Reemplazar los valores con los datos reales de tu proyecto
 */

// Configuración de zona horaria
const TIMEZONE = 'America/Montevideo';

// ID del calendario de Google (del estudio/barbería)
const CALENDAR_ID = 'REEMPLAZAR@tu-dominio.com';

// ID de la hoja de Google Sheets donde se guardan las reservas
const SHEET_ID = 'REEMPLAZAR_SHEET_ID';

// Configuración de horarios
const SLOT_MINUTES = 30; // Duración de cada slot en minutos
const WORK_START = '09:00'; // Hora de inicio de trabajo
const WORK_END = '18:00'; // Hora de fin de trabajo

// Configuración de eventos
const CREATE_TENTATIVE_EVENT = true; // Crear eventos tentativos en el calendario

// URL base del Web App desplegado
const WEB_APP_BASE_URL = 'URL_DEL_DEPLOY_WEB_APP';

// Nombre de la hoja para cancelaciones
const CANCEL_SHEET_NAME = 'Cancelaciones';

// Feriados 2025 (formato YYYY-MM-DD)
const FERIADOS = [
  '2025-01-01', // Año Nuevo
  '2025-04-18', // Viernes Santo
  '2025-05-01', // Día del Trabajador
  '2025-06-19', // Natalicio de Artigas
  '2025-07-18', // Jura de la Constitución
  '2025-08-25', // Declaratoria de la Independencia
  '2025-12-25'  // Navidad
];

// Días no laborables (0 = domingo, 1 = lunes, etc.)
const NO_LABORABLES = [0]; // Solo domingos

// Límites de reservas
const MAX_RESERVAS_POR_DIA = 12; // Máximo de reservas por día
const MAX_RESERVAS_POR_EMAIL_POR_DIA = 2; // Máximo de reservas por email por día

// Configuración de tokens de cancelación
const TOKEN_LENGTH = 32; // Longitud del token de cancelación
const TOKEN_EXPIRY_DAYS = 30; // Días de validez del token

// Configuración de emails
const EMAIL_SUBJECT = 'Confirmación de reserva - Barbería';
const EMAIL_FROM_NAME = 'Barbería';

// Configuración de WhatsApp
const WHATSAPP_NUMBER = '59899123456'; // Número de WhatsApp para consultas

// Configuración de CORS
const ALLOWED_ORIGINS = [
  'https://tu-dominio.com',
  'https://www.tu-dominio.com',
  'http://localhost:3000', // Para desarrollo local
  'http://localhost:8080'  // Para desarrollo local
];

// Configuración de validación
const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 100;
const MAX_REASON_LENGTH = 500; // Longitud máxima del motivo de cancelación

// Configuración de logs
const ENABLE_LOGGING = true; // Habilitar logging para debugging

/**
 * Función para obtener la configuración completa
 */
function getConfig() {
  return {
    timezone: TIMEZONE,
    calendarId: CALENDAR_ID,
    sheetId: SHEET_ID,
    slotMinutes: SLOT_MINUTES,
    workStart: WORK_START,
    workEnd: WORK_END,
    createTentativeEvent: CREATE_TENTATIVE_EVENT,
    webAppBaseUrl: WEB_APP_BASE_URL,
    cancelSheetName: CANCEL_SHEET_NAME,
    feriados: FERIADOS,
    noLaborables: NO_LABORABLES,
    maxReservasPorDia: MAX_RESERVAS_POR_DIA,
    maxReservasPorEmailPorDia: MAX_RESERVAS_POR_EMAIL_POR_DIA,
    tokenLength: TOKEN_LENGTH,
    tokenExpiryDays: TOKEN_EXPIRY_DAYS,
    emailSubject: EMAIL_SUBJECT,
    emailFromName: EMAIL_FROM_NAME,
    whatsappNumber: WHATSAPP_NUMBER,
    allowedOrigins: ALLOWED_ORIGINS,
    minNameLength: MIN_NAME_LENGTH,
    maxNameLength: MAX_NAME_LENGTH,
    maxReasonLength: MAX_REASON_LENGTH,
    enableLogging: ENABLE_LOGGING
  };
}

/**
 * Función para validar que la configuración esté completa
 */
function validateConfig() {
  const config = getConfig();
  const errors = [];
  
  if (config.calendarId === 'REEMPLAZAR@tu-dominio.com') {
    errors.push('CALENDAR_ID no ha sido configurado');
  }
  
  if (config.sheetId === 'REEMPLAZAR_SHEET_ID') {
    errors.push('SHEET_ID no ha sido configurado');
  }
  
  if (config.webAppBaseUrl === 'URL_DEL_DEPLOY_WEB_APP') {
    errors.push('WEB_APP_BASE_URL no ha sido configurado');
  }
  
  if (errors.length > 0) {
    throw new Error('Configuración incompleta: ' + errors.join(', '));
  }
  
  return true;
}
