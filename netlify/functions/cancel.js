const { google } = require('googleapis');
const crypto = require('crypto');
const moment = require('moment');
const nodemailer = require('nodemailer');

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
    if (event.httpMethod === 'GET') {
      // Mostrar página de cancelación
      const { token } = event.queryStringParameters || {};
      
      if (!token) {
        return {
          statusCode: 400,
          headers: { ...headers, 'Content-Type': 'text/html' },
          body: '<h1>Token de cancelación requerido</h1>'
        };
      }

      const reservation = await findReservationByToken(token);
      
      if (!reservation) {
        return {
          statusCode: 404,
          headers: { ...headers, 'Content-Type': 'text/html' },
          body: '<h1>Reserva no encontrada</h1>'
        };
      }

      if (reservation.status === 'CANCELADA') {
        return {
          statusCode: 400,
          headers: { ...headers, 'Content-Type': 'text/html' },
          body: '<h1>La reserva ya fue cancelada</h1>'
        };
      }

      // Renderizar página de cancelación
      const html = generateCancelPage(reservation);
      
      return {
        statusCode: 200,
        headers: { ...headers, 'Content-Type': 'text/html' },
        body: html
      };

    } else if (event.httpMethod === 'POST') {
      // Procesar cancelación
      const { token, reason } = JSON.parse(event.body);
      
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

      // Marcar reserva como cancelada
      const result = await cancelReservation(token, reason);
      
      if (!result.success) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify(result)
        };
      }

      // Eliminar evento del calendario si existe
      if (result.reservation.eventId) {
        await deleteCalendarEvent(result.reservation.eventId);
      }

      // Enviar email de cancelación
      await sendCancellationEmail(result.reservation, reason);

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

async function findReservationByToken(token) {
  const sheets = google.sheets({ version: 'v4', auth });
  const sheetId = process.env.GOOGLE_SHEET_ID;
  
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'A:K'
    });
    
    const rows = response.data.values || [];
    
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row[7] === token) {
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
    return null;
  }
}

async function cancelReservation(token, reason = '') {
  const sheets = google.sheets({ version: 'v4', auth });
  const sheetId = process.env.GOOGLE_SHEET_ID;
  
  try {
    const reservation = await findReservationByToken(token);
    
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
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'A:K'
    });
    
    const rows = response.data.values || [];
    let rowIndex = -1;
    
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][7] === token) {
        rowIndex = i + 1;
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
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `F${rowIndex}:K${rowIndex}`,
      valueInputOption: 'RAW',
      resource: {
        values: [['CANCELADA', '', '', '', '', moment().format('YYYY-MM-DD HH:mm:ss')]]
      }
    });
    
    // Registrar en hoja de cancelaciones
    await recordCancellation(reservation, reason);
    
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

async function recordCancellation(reservation, reason) {
  const sheets = google.sheets({ version: 'v4', auth });
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const cancelSheetName = 'Cancelaciones';
  
  try {
    const cancelId = crypto.randomBytes(16).toString('hex');
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
    
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: `${cancelSheetName}!A:H`,
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

async function deleteCalendarEvent(eventId) {
  const calendar = google.calendar({ version: 'v3', auth });
  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  
  try {
    await calendar.events.delete({
      calendarId: calendarId,
      eventId: eventId
    });
    
    console.log(`Evento ${eventId} eliminado del calendario`);
  } catch (error) {
    console.error('Error eliminando evento del calendario:', error);
  }
}

async function sendCancellationEmail(reservation, reason) {
  try {
    const transporter = nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_FROM,
        pass: process.env.EMAIL_PASSWORD
      }
    });
    
    const formattedDate = moment(reservation.date).format('dddd, D [de] MMMM [de] YYYY');
    
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: reservation.email,
      subject: 'Reserva cancelada - Barbería',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Reserva cancelada</h2>
          <p>Hola <strong>${reservation.name}</strong>,</p>
          <p>Tu reserva ha sido cancelada exitosamente.</p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Detalles de la reserva cancelada:</h3>
            <p><strong>Fecha:</strong> ${formattedDate}</p>
            <p><strong>Hora:</strong> ${reservation.time}</p>
            ${reason ? `<p><strong>Motivo:</strong> ${reason}</p>` : ''}
          </div>
          
          <p>Si cambias de opinión, puedes hacer una nueva reserva en cualquier momento.</p>
          
          <p>Saludos,<br>
          <strong>Barbería</strong></p>
        </div>
      `
    };
    
    await transporter.sendMail(mailOptions);
    console.log(`Email de cancelación enviado a ${reservation.email}`);
    
  } catch (error) {
    console.error('Error enviando email de cancelación:', error);
  }
}

function generateCancelPage(reservation) {
  const formattedDate = moment(reservation.date).format('dddd, D [de] MMMM [de] YYYY');
  const reprogramUrl = `${process.env.URL}?date=${reservation.date}`;
  
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
                <p><strong>Nombre:</strong> ${reservation.name}</p>
                <p><strong>Email:</strong> ${reservation.email}</p>
                <p><strong>Fecha:</strong> ${formattedDate}</p>
                <p><strong>Hora:</strong> ${reservation.time}</p>
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
            const token = '${reservation.cancelToken}';
            
            try {
                const response = await fetch('/.netlify/functions/cancel', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        token: token,
                        reason: reason
                    })
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
}
