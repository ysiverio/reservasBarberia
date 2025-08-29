const { google } = require('googleapis');
const moment = require('moment');

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
    // Configurar autenticación de Google
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS),
      scopes: ['https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/spreadsheets']
    });

    if (event.httpMethod === 'GET') {
      // Mostrar página de cancelación
      const { token } = event.queryStringParameters || {};
      
      if (!token) {
        return {
          statusCode: 400,
          headers: { ...headers, 'Content-Type': 'text/html' },
          body: createErrorPage('Token de cancelación no válido')
        };
      }

      const reservation = await getReservationByToken(token, auth);
      
      if (!reservation) {
        return {
          statusCode: 404,
          headers: { ...headers, 'Content-Type': 'text/html' },
          body: createErrorPage('Reserva no encontrada o ya cancelada')
        };
      }

      return {
        statusCode: 200,
        headers: { ...headers, 'Content-Type': 'text/html' },
        body: createCancelPage(reservation)
      };

    } else if (event.httpMethod === 'POST') {
      // Procesar cancelación
      const body = JSON.parse(event.body);
      const { token, reason = '' } = body;

      if (!token) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            message: 'Token de cancelación requerido'
          })
        };
      }

      const reservation = await getReservationByToken(token, auth);
      
      if (!reservation) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({
            success: false,
            message: 'Reserva no encontrada o ya cancelada'
          })
        };
      }

      // Cancelar reserva
      await cancelReservation(reservation, reason, auth);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Reserva cancelada exitosamente'
        })
      };
    }

  } catch (error) {
    console.error('Error en cancel:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        message: 'Error procesando cancelación'
      })
    };
  }
};

async function getReservationByToken(token, auth) {
  const sheets = google.sheets({ version: 'v4', auth });
  const sheetId = process.env.GOOGLE_SHEET_ID;
  
  try {
    console.log('🔍 Buscando reserva con token:', token);
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'A:K'
    });
    
    const rows = response.data.values || [];
    console.log(`📊 Total de filas encontradas: ${rows.length}`);
    
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      console.log(`Fila ${i}: Token=${row[7]}, Status=${row[5]}`);
      
      if (row[7] === token && row[5] === 'CONFIRMADA') {
        console.log('✅ Reserva encontrada:', {
          id: row[0],
          name: row[1],
          email: row[2],
          date: row[3],
          time: row[4]
        });
        
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
          createdAt: row[9]
        };
      }
    }
    
    console.log('❌ No se encontró reserva con ese token');
    return null;
  } catch (error) {
    console.error('Error obteniendo reserva por token:', error);
    return null;
  }
}

async function cancelReservation(reservation, reason, auth) {
  const sheets = google.sheets({ version: 'v4', auth });
  const sheetId = process.env.GOOGLE_SHEET_ID;
  
  try {
    // Actualizar estado a CANCELADA
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'A:K'
    });
    
    const rows = response.data.values || [];
    let rowIndex = -1;
    
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === reservation.id) {
        rowIndex = i + 1; // Sheets usa índices basados en 1
        break;
      }
    }
    
    if (rowIndex > 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: `F${rowIndex}`,
        valueInputOption: 'RAW',
        resource: {
          values: [['CANCELADA']]
        }
      });
    }

    // Eliminar evento del calendario
    if (reservation.eventId) {
      const calendar = google.calendar({ version: 'v3', auth });
      const calendarId = process.env.GOOGLE_CALENDAR_ID;
      
      try {
        await calendar.events.delete({
          calendarId: calendarId,
          eventId: reservation.eventId
        });
        console.log(`Evento ${reservation.eventId} eliminado del calendario`);
      } catch (calendarError) {
        console.error('Error eliminando evento del calendario:', calendarError);
      }
    }

    // Registrar cancelación
    await logCancellation(reservation, reason, auth);

  } catch (error) {
    console.error('Error cancelando reserva:', error);
    throw error;
  }
}

async function logCancellation(reservation, reason, auth) {
  const sheets = google.sheets({ version: 'v4', auth });
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const cancelSheetName = process.env.CANCEL_SHEET_NAME || 'Cancelaciones';
  const now = moment().format('YYYY-MM-DD HH:mm:ss');
  
  const row = [
    reservation.id,
    reservation.name,
    reservation.email,
    reservation.date,
    reservation.time,
    now,
    reason || 'Sin motivo especificado'
  ];
  
  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: `${cancelSheetName}!A:G`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      resource: {
        values: [row]
      }
    });
  } catch (error) {
    console.error('Error registrando cancelación:', error);
  }
}

function createCancelPage(reservation) {
  const formattedDate = moment(reservation.date).format('dddd, D [de] MMMM [de] YYYY');
  
  return `
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
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        
        .container {
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            padding: 40px;
            max-width: 500px;
            width: 100%;
            text-align: center;
        }
        
        .logo-container {
            margin-bottom: 30px;
        }
        
        .logo-image {
            width: 80px;
            height: 80px;
            object-fit: cover;
            border-radius: 50%;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
        }
        
        .logo-text {
            margin-top: 15px;
            font-size: 24px;
            font-weight: 700;
            color: #333;
        }
        
        h1 {
            color: #333;
            margin-bottom: 20px;
            font-size: 28px;
        }
        
        .reservation-details {
            background: #f8f9fa;
            border-radius: 15px;
            padding: 25px;
            margin: 25px 0;
            text-align: left;
        }
        
        .detail-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            padding: 8px 0;
            border-bottom: 1px solid #e9ecef;
        }
        
        .detail-row:last-child {
            border-bottom: none;
            margin-bottom: 0;
        }
        
        .detail-label {
            font-weight: 600;
            color: #555;
        }
        
        .detail-value {
            color: #333;
        }
        
        .warning {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 10px;
            padding: 15px;
            margin: 20px 0;
            color: #856404;
        }
        
        .form-group {
            margin: 20px 0;
            text-align: left;
        }
        
        label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            color: #555;
        }
        
        textarea {
            width: 100%;
            padding: 12px;
            border: 2px solid #e9ecef;
            border-radius: 10px;
            font-family: inherit;
            font-size: 14px;
            resize: vertical;
            min-height: 80px;
        }
        
        textarea:focus {
            outline: none;
            border-color: #667eea;
        }
        
        .button-group {
            display: flex;
            gap: 15px;
            margin-top: 30px;
        }
        
        .btn {
            flex: 1;
            padding: 15px 25px;
            border: none;
            border-radius: 10px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            text-decoration: none;
            display: inline-block;
            text-align: center;
        }
        
        .btn-cancel {
            background: #dc3545;
            color: white;
        }
        
        .btn-cancel:hover {
            background: #c82333;
            transform: translateY(-2px);
        }
        
        .btn-reprogram {
            background: #28a745;
            color: white;
        }
        
        .btn-reprogram:hover {
            background: #218838;
            transform: translateY(-2px);
        }
        
        .btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
        }
        
        @media (max-width: 480px) {
            .container {
                padding: 30px 20px;
            }
            
            .button-group {
                flex-direction: column;
            }
            
            .logo-image {
                width: 60px;
                height: 60px;
            }
            
            .logo-text {
                font-size: 20px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo-container">
            <img src="/logo_negro.png" alt="Logo Barbería" class="logo-image">
            <div class="logo-text">Barbería</div>
        </div>
        
        <h1>Cancelar Reserva</h1>
        
        <div class="reservation-details">
            <div class="detail-row">
                <span class="detail-label">Cliente:</span>
                <span class="detail-value">${reservation.name}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Fecha:</span>
                <span class="detail-value">${formattedDate}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Hora:</span>
                <span class="detail-value">${reservation.time}</span>
            </div>
        </div>
        
        <div class="warning">
            ⚠️ <strong>Atención:</strong> Esta acción no se puede deshacer. La reserva será eliminada permanentemente.
        </div>
        
        <form id="cancelForm">
            <div class="form-group">
                <label for="reason">Motivo de cancelación (opcional):</label>
                <textarea id="reason" name="reason" placeholder="Cuéntanos por qué cancelas la reserva..."></textarea>
            </div>
            
            <div class="button-group">
                <button type="button" class="btn btn-reprogram" onclick="reprogramar()">
                    🔄 Reprogramar
                </button>
                <button type="submit" class="btn btn-cancel" id="cancelBtn">
                    ❌ Cancelar Reserva
                </button>
            </div>
        </form>
    </div>

    <script>
        const token = '${reservation.cancelToken}';
        
        document.getElementById('cancelForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const cancelBtn = document.getElementById('cancelBtn');
            const reason = document.getElementById('reason').value;
            
            cancelBtn.disabled = true;
            cancelBtn.textContent = 'Cancelando...';
            
            try {
                const response = await fetch('/.netlify/functions/cancel', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ token, reason })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    alert('✅ Reserva cancelada exitosamente');
                    window.location.href = '/';
                } else {
                    alert('❌ Error: ' + result.message);
                    cancelBtn.disabled = false;
                    cancelBtn.textContent = '❌ Cancelar Reserva';
                }
            } catch (error) {
                alert('❌ Error de conexión');
                cancelBtn.disabled = false;
                cancelBtn.textContent = '❌ Cancelar Reserva';
            }
        });
        
        async function reprogramar() {
            const cancelBtn = document.getElementById('cancelBtn');
            const reason = document.getElementById('reason').value || 'Reprogramación solicitada por el cliente';
            
            cancelBtn.disabled = true;
            cancelBtn.textContent = 'Cancelando...';
            
            try {
                const response = await fetch('/.netlify/functions/cancel', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ token, reason })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    const formattedDate = '${reservation.date}';
                    window.location.href = '/?date=' + formattedDate;
                } else {
                    alert('❌ Error: ' + result.message);
                    cancelBtn.disabled = false;
                    cancelBtn.textContent = '❌ Cancelar Reserva';
                }
            } catch (error) {
                alert('❌ Error de conexión');
                cancelBtn.disabled = false;
                cancelBtn.textContent = '❌ Cancelar Reserva';
            }
        }
    </script>
</body>
</html>
  `;
}

function createErrorPage(message) {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Error - Barbería</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        
        .container {
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            padding: 40px;
            max-width: 500px;
            width: 100%;
            text-align: center;
        }
        
        .logo-container {
            margin-bottom: 30px;
        }
        
        .logo-image {
            width: 80px;
            height: 80px;
            object-fit: cover;
            border-radius: 50%;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
        }
        
        .logo-text {
            margin-top: 15px;
            font-size: 24px;
            font-weight: 700;
            color: #333;
        }
        
        h1 {
            color: #dc3545;
            margin-bottom: 20px;
            font-size: 28px;
        }
        
        .error-message {
            background: #f8d7da;
            border: 1px solid #f5c6cb;
            border-radius: 10px;
            padding: 20px;
            margin: 20px 0;
            color: #721c24;
        }
        
        .btn {
            display: inline-block;
            padding: 15px 30px;
            background: #667eea;
            color: white;
            text-decoration: none;
            border-radius: 10px;
            font-weight: 600;
            transition: all 0.3s ease;
        }
        
        .btn:hover {
            background: #5a6fd8;
            transform: translateY(-2px);
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo-container">
            <img src="/logo_negro.png" alt="Logo Barbería" class="logo-image">
            <div class="logo-text">Barbería</div>
        </div>
        
        <h1>❌ Error</h1>
        
        <div class="error-message">
            ${message}
        </div>
        
        <a href="/" class="btn">🏠 Volver al Inicio</a>
    </div>
</body>
</html>
  `;
}
