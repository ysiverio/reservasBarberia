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
    // Debug: Verificar variables de entorno
    const debugInfo = {
      hasCredentials: !!process.env.GOOGLE_CREDENTIALS,
      hasCalendarId: !!process.env.GOOGLE_CALENDAR_ID,
      hasSheetId: !!process.env.GOOGLE_SHEET_ID,
      hasEmailFrom: !!process.env.EMAIL_FROM,
      hasEmailPassword: !!process.env.EMAIL_PASSWORD,
      credentialsLength: process.env.GOOGLE_CREDENTIALS ? process.env.GOOGLE_CREDENTIALS.length : 0
    };

    // Si faltan variables críticas, retornar error con debug info
    if (!process.env.GOOGLE_CREDENTIALS || !process.env.GOOGLE_CALENDAR_ID || !process.env.GOOGLE_SHEET_ID) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          message: 'Variables de entorno faltantes',
          debug: debugInfo
        })
      };
    }

    // Intentar parsear las credenciales
    let auth;
    try {
      const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
      auth = new google.auth.GoogleAuth({
        credentials: credentials,
        scopes: ['https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/spreadsheets']
      });
    } catch (parseError) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          message: 'Error parseando credenciales de Google',
          error: parseError.message,
          debug: debugInfo
        })
      };
    }

    // Intentar crear el calendario
    let calendar;
    try {
      calendar = google.calendar({ version: 'v3', auth });
    } catch (calendarError) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          message: 'Error creando cliente de calendario',
          error: calendarError.message,
          debug: debugInfo
        })
      };
    }

    // Intentar crear sheets
    let sheets;
    try {
      sheets = google.sheets({ version: 'v4', auth });
    } catch (sheetsError) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          message: 'Error creando cliente de sheets',
          error: sheetsError.message,
          debug: debugInfo
        })
      };
    }

    // Si llegamos aquí, todo está bien configurado
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Configuración correcta - todas las dependencias funcionan',
        debug: debugInfo
      })
    };

  } catch (error) {
    console.error('Error en reserve-debug:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        message: 'Error inesperado',
        error: error.message,
        stack: error.stack
      })
    };
  }
};
