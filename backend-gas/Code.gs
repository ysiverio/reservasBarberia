/**
 * Código principal del backend de Google Apps Script
 * Router para endpoints REST y manejo de solicitudes
 */

/**
 * Función principal para manejar solicitudes GET
 * @param {Object} e - Evento de la solicitud
 * @returns {Object} Respuesta HTTP
 */
function doGet(e) {
  try {
    // Validar configuración
    validateConfig();
    
    const action = e.parameter.action;
    
    switch (action) {
      case 'availability':
        return handleAvailability(e);
      case 'cancel':
        return handleCancelPage(e);
      default:
        return createErrorResponse('Acción no válida', 400);
    }
    
  } catch (error) {
    logError('Error en doGet', error);
    return createErrorResponse('Error interno del servidor', 500);
  }
}

/**
 * Función principal para manejar solicitudes POST
 * @param {Object} e - Evento de la solicitud
 * @returns {Object} Respuesta HTTP
 */
function doPost(e) {
  try {
    // Validar configuración
    validateConfig();
    
    const action = e.parameter.action;
    
    switch (action) {
      case 'reserve':
        return handleReserve(e);
      case 'cancel':
        return handleCancel(e);
      default:
        return createErrorResponse('Acción no válida', 400);
    }
    
  } catch (error) {
    logError('Error en doPost', error);
    return createErrorResponse('Error interno del servidor', 500);
  }
}

/**
 * Maneja la solicitud de disponibilidad
 * @param {Object} e - Evento de la solicitud
 * @returns {Object} Respuesta HTTP
 */
function handleAvailability(e) {
  try {
    const date = e.parameter.date;
    
    if (!date) {
      return createErrorResponse('Fecha requerida', 400);
    }
    
    // Validar formato de fecha
    if (!isValidDateFormat(date)) {
      return createErrorResponse('Formato de fecha inválido', 400);
    }
    
    // Obtener slots disponibles
    const availableSlots = getAvailableSlots(date);
    
    return createJSONResponse({
      success: true,
      date: date,
      availableSlots: availableSlots
    });
    
  } catch (error) {
    logError('Error en handleAvailability', error);
    return createErrorResponse('Error obteniendo disponibilidad', 500);
  }
}

/**
 * Maneja la solicitud de reserva
 * @param {Object} e - Evento de la solicitud
 * @returns {Object} Respuesta HTTP
 */
function handleReserve(e) {
  try {
    // Parsear datos JSON del body
    const postData = e.postData;
    if (!postData || !postData.contents) {
      return createErrorResponse('Datos de reserva requeridos', 400);
    }
    
    const reservation = JSON.parse(postData.contents);
    
    // Validar datos requeridos
    if (!reservation.name || !reservation.email || !reservation.date || !reservation.time) {
      return createErrorResponse('Todos los campos son requeridos', 400);
    }
    
    // Crear evento tentativo en calendario
    const eventId = createTentativeEvent(reservation);
    if (eventId) {
      reservation.eventId = eventId;
    }
    
    // Guardar reserva en Sheets
    const sheetsService = new SheetsService();
    const result = sheetsService.appendReservation(reservation);
    
    if (!result.success) {
      // Si falla, eliminar evento del calendario si se creó
      if (eventId) {
        deleteEvent(eventId);
      }
      return createErrorResponse(result.message, 400);
    }
    
    // Enviar email de confirmación
    sendConfirmationEmail(reservation, result.cancelUrl);
    
    return createJSONResponse({
      success: true,
      message: 'Reserva creada exitosamente',
      cancelUrl: result.cancelUrl
    });
    
  } catch (error) {
    logError('Error en handleReserve', error);
    return createErrorResponse('Error creando reserva', 500);
  }
}

/**
 * Maneja la página de cancelación (GET)
 * @param {Object} e - Evento de la solicitud
 * @returns {Object} Respuesta HTTP
 */
function handleCancelPage(e) {
  try {
    const token = e.parameter.token;
    
    if (!token) {
      return createErrorResponse('Token de cancelación requerido', 400);
    }
    
    // Buscar reserva por token
    const sheetsService = new SheetsService();
    const reservation = sheetsService.findReservationByToken(token);
    
    if (!reservation) {
      return createErrorResponse('Reserva no encontrada', 404);
    }
    
    if (reservation.status === 'CANCELADA') {
      return createErrorResponse('La reserva ya fue cancelada', 400);
    }
    
    // Renderizar página de cancelación
    return createCancelPage(reservation);
    
  } catch (error) {
    logError('Error en handleCancelPage', error);
    return createErrorResponse('Error cargando página de cancelación', 500);
  }
}

/**
 * Maneja la solicitud de cancelación (POST)
 * @param {Object} e - Evento de la solicitud
 * @returns {Object} Respuesta HTTP
 */
function handleCancel(e) {
  try {
    const token = e.parameter.token;
    const reason = e.parameter.reason || '';
    
    if (!token) {
      return createErrorResponse('Token de cancelación requerido', 400);
    }
    
    // Marcar reserva como cancelada
    const sheetsService = new SheetsService();
    const result = sheetsService.markReservationCancelled(token, reason);
    
    if (!result.success) {
      return createErrorResponse(result.message, 400);
    }
    
    // Eliminar evento del calendario si existe
    if (result.reservation.eventid) {
      deleteEvent(result.reservation.eventid);
    }
    
    // Enviar email de cancelación
    sendCancellationEmail(result.reservation, reason);
    
    return createJSONResponse({
      success: true,
      message: 'Reserva cancelada exitosamente',
      reservation: result.reservation
    });
    
  } catch (error) {
    logError('Error en handleCancel', error);
    return createErrorResponse('Error cancelando reserva', 500);
  }
}

/**
 * Crea la página HTML de cancelación
 * @param {Object} reservation - Datos de la reserva
 * @returns {Object} Respuesta HTTP con HTML
 */
function createCancelPage(reservation) {
  const config = getConfig();
  const formattedDate = formatDateForDisplay(reservation.fecha);
  const reprogramUrl = `${config.webAppBaseUrl}?date=${reservation.fecha}`;
  
  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cancelar Reserva - Barbería</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: #f5f5f5;
            color: #333;
            line-height: 1.6;
        }
        
        .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            min-height: 100vh;
        }
        
        .header {
            text-align: center;
            margin-bottom: 40px;
            padding: 20px 0;
        }
        
        .logo-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            margin-bottom: 10px;
        }
        
        .logo-image {
            width: 80px;
            height: 80px;
            object-fit: cover;
            border-radius: 50%;
            margin-bottom: 10px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        
        .logo-text {
            font-size: 2rem;
            font-weight: 700;
            margin: 0;
        }
        
        .card {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            margin-bottom: 20px;
        }
        
        .reservation-details {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        
        .reservation-details p {
            margin-bottom: 10px;
        }
        
        .form-group {
            margin-bottom: 20px;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 500;
        }
        
        .form-group textarea {
            width: 100%;
            padding: 12px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            font-size: 16px;
            resize: vertical;
            min-height: 100px;
        }
        
        .btn {
            display: inline-block;
            padding: 12px 24px;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 500;
            text-decoration: none;
            cursor: pointer;
            transition: all 0.3s ease;
            text-align: center;
        }
        
        .btn-danger {
            background-color: #dc3545;
            color: white;
        }
        
        .btn-danger:hover {
            background-color: #c82333;
        }
        
        .btn-secondary {
            background-color: #6c757d;
            color: white;
            margin-left: 10px;
        }
        
        .btn-secondary:hover {
            background-color: #5a6268;
        }
        
        .success-message {
            background-color: #d4edda;
            color: #155724;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            text-align: center;
        }
        
        .hidden {
            display: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <header class="header">
            <div class="logo-container">
                <img src="logo_negro.png" alt="Barbería Logo" class="logo-image">
                <h1 class="logo-text">Barbería</h1>
            </div>
            <p>Cancelar reserva</p>
        </header>
        
        <div class="card">
            <h3>Detalles de tu reserva</h3>
            <div class="reservation-details">
                <p><strong>Nombre:</strong> ${reservation.nombre}</p>
                <p><strong>Email:</strong> ${reservation.email}</p>
                <p><strong>Fecha:</strong> ${formattedDate}</p>
                <p><strong>Hora:</strong> ${reservation.hora}</p>
            </div>
            
            <div id="cancelForm">
                <div class="form-group">
                    <label for="reason">Motivo de cancelación (opcional):</label>
                    <textarea id="reason" name="reason" placeholder="Cuéntanos por qué cancelas..."></textarea>
                </div>
                
                <button class="btn btn-danger" onclick="cancelReservation()">
                    Cancelar reserva
                </button>
                <a href="${reprogramUrl}" class="btn btn-secondary">
                    Reprogramar
                </a>
            </div>
            
            <div id="successMessage" class="success-message hidden">
                <h4>¡Reserva cancelada exitosamente!</h4>
                <p>Tu reserva ha sido cancelada. Si cambias de opinión, puedes hacer una nueva reserva.</p>
                <a href="${reprogramUrl}" class="btn btn-secondary" style="margin-top: 15px;">
                    Hacer nueva reserva
                </a>
            </div>
        </div>
    </div>
    
    <script>
        async function cancelReservation() {
            const reason = document.getElementById('reason').value;
            const token = '${reservation.canceltoken}';
            
            try {
                const response = await fetch('${config.webAppBaseUrl}?action=cancel', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: 'token=' + encodeURIComponent(token) + '&reason=' + encodeURIComponent(reason)
                });
                
                const result = await response.json();
                
                if (result.success) {
                    document.getElementById('cancelForm').classList.add('hidden');
                    document.getElementById('successMessage').classList.remove('hidden');
                } else {
                    alert('Error: ' + result.message);
                }
            } catch (error) {
                alert('Error de conexión. Por favor intenta nuevamente.');
            }
        }
    </script>
</body>
</html>
  `;
  
  return HtmlService.createHtmlOutput(html);
}

/**
 * Envía email de confirmación de reserva
 * @param {Object} reservation - Datos de la reserva
 * @param {string} cancelUrl - URL de cancelación
 */
function sendConfirmationEmail(reservation, cancelUrl) {
  try {
    const config = getConfig();
    const formattedDate = formatDateForDisplay(reservation.date);
    
    const subject = config.emailSubject;
    const body = `
Hola ${reservation.name},

Tu reserva ha sido confirmada exitosamente.

Detalles de la reserva:
- Fecha: ${formattedDate}
- Hora: ${reservation.time}

Para cancelar tu reserva, utiliza este link:
${cancelUrl}

Si tienes alguna pregunta, no dudes en contactarnos.

Saludos,
${config.emailFromName}
    `.trim();
    
    GmailApp.sendEmail(reservation.email, subject, body);
    
    logInfo('Email de confirmación enviado', { email: reservation.email });
    
  } catch (error) {
    logError('Error enviando email de confirmación', error);
  }
}

/**
 * Envía email de cancelación
 * @param {Object} reservation - Datos de la reserva
 * @param {string} reason - Motivo de cancelación
 */
function sendCancellationEmail(reservation, reason) {
  try {
    const config = getConfig();
    const formattedDate = formatDateForDisplay(reservation.fecha);
    
    const subject = 'Reserva cancelada - Barbería';
    const body = `
Hola ${reservation.nombre},

Tu reserva ha sido cancelada exitosamente.

Detalles de la reserva cancelada:
- Fecha: ${formattedDate}
- Hora: ${reservation.hora}
${reason ? '- Motivo: ' + reason : ''}

Si cambias de opinión, puedes hacer una nueva reserva en cualquier momento.

Saludos,
${config.emailFromName}
    `.trim();
    
    GmailApp.sendEmail(reservation.email, subject, body);
    
    logInfo('Email de cancelación enviado', { email: reservation.email });
    
  } catch (error) {
    logError('Error enviando email de cancelación', error);
  }
}

/**
 * Configura headers CORS
 */
function setCORSHeaders() {
  const config = getConfig();
  
  // Permitir todos los orígenes para desarrollo
  // En producción, deberías especificar solo los dominios permitidos
  return ContentService.createTextOutput()
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader('Access-Control-Allow-Origin', '*')
    .setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

/**
 * Crea respuesta JSON
 * @param {Object} data - Datos a enviar
 * @returns {Object} Respuesta HTTP
 */
function createJSONResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader('Access-Control-Allow-Origin', '*')
    .setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

/**
 * Crea respuesta de error
 * @param {string} message - Mensaje de error
 * @param {number} statusCode - Código de estado HTTP
 * @returns {Object} Respuesta HTTP
 */
function createErrorResponse(message, statusCode = 400) {
  const response = {
    success: false,
    message: message
  };
  
  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON)
    .setStatusCode(statusCode)
    .setHeader('Access-Control-Allow-Origin', '*')
    .setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

/**
 * Valida formato de fecha
 * @param {string} date - Fecha a validar
 * @returns {boolean} true si es válida
 */
function isValidDateFormat(date) {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) return false;
  
  const dateObj = new Date(date);
  return !isNaN(dateObj.getTime());
}

/**
 * Formatea fecha para mostrar
 * @param {string} dateString - Fecha en formato YYYY-MM-DD
 * @returns {string} Fecha formateada
 */
function formatDateForDisplay(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Función de logging para información
 * @param {string} message - Mensaje
 * @param {Object} data - Datos adicionales
 */
function logInfo(message, data = {}) {
  const config = getConfig();
  if (config.enableLogging) {
    console.log(`[INFO] ${message}`, data);
  }
}

/**
 * Función de logging para errores
 * @param {string} message - Mensaje
 * @param {Object} error - Error
 */
function logError(message, error) {
  const config = getConfig();
  if (config.enableLogging) {
    console.error(`[ERROR] ${message}`, error);
  }
}
