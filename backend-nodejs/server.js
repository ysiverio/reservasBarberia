const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const moment = require('moment');
const crypto = require('crypto');

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración CORS
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Importar servicios
const CalendarService = require('./services/CalendarService');
const SheetsService = require('./services/SheetsService');
const EmailService = require('./services/EmailService');

// Inicializar servicios
const calendarService = new CalendarService();
const sheetsService = new SheetsService();
const emailService = new EmailService();

// Middleware de logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Ruta de prueba
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    message: 'Backend de reservas funcionando correctamente'
  });
});

// GET /availability - Obtener slots disponibles
app.get('/availability', async (req, res) => {
  try {
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Fecha requerida'
      });
    }

    // Validar formato de fecha
    if (!moment(date, 'YYYY-MM-DD', true).isValid()) {
      return res.status(400).json({
        success: false,
        message: 'Formato de fecha inválido'
      });
    }

    // Verificar si es día no laborable
    const dayOfWeek = moment(date).day();
    const noLaborables = process.env.NO_LABORABLES?.split(',').map(Number) || [0];
    
    if (noLaborables.includes(dayOfWeek)) {
      return res.json({
        success: true,
        date: date,
        availableSlots: [],
        message: 'Día no laborable'
      });
    }

    // Verificar si es feriado
    const feriados = process.env.FERIADOS?.split(',') || [];
    if (feriados.includes(date)) {
      return res.json({
        success: true,
        date: date,
        availableSlots: [],
        message: 'Día feriado'
      });
    }

    // Obtener slots disponibles
    const availableSlots = await calendarService.getAvailableSlots(date);
    
    res.json({
      success: true,
      date: date,
      availableSlots: availableSlots
    });

  } catch (error) {
    console.error('Error en /availability:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo disponibilidad'
    });
  }
});

// POST /reserve - Crear reserva
app.post('/reserve', async (req, res) => {
  try {
    const { name, email, date, time } = req.body;
    
    // Validar datos requeridos
    if (!name || !email || !date || !time) {
      return res.status(400).json({
        success: false,
        message: 'Todos los campos son requeridos'
      });
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Email inválido'
      });
    }

    // Verificar límites de reservas
    const existingReservations = await sheetsService.getReservationsByEmailAndDate(email, date);
    const maxPerEmail = parseInt(process.env.MAX_RESERVAS_POR_EMAIL_POR_DIA) || 2;
    
    if (existingReservations.length >= maxPerEmail) {
      return res.status(400).json({
        success: false,
        message: `Ya tienes ${maxPerEmail} reservas para esta fecha`
      });
    }

    // Crear evento en calendario
    const eventId = await calendarService.createEvent({
      name,
      email,
      date,
      time
    });

    // Guardar en Sheets
    const reservation = await sheetsService.createReservation({
      name,
      email,
      date,
      time,
      eventId
    });

    // Enviar email de confirmación
    await emailService.sendConfirmationEmail(reservation);

    res.json({
      success: true,
      message: 'Reserva creada exitosamente',
      cancelUrl: reservation.cancelUrl
    });

  } catch (error) {
    console.error('Error en /reserve:', error);
    res.status(500).json({
      success: false,
      message: 'Error creando reserva'
    });
  }
});

// GET /cancel - Página de cancelación
app.get('/cancel', async (req, res) => {
  try {
    const { token } = req.query;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token de cancelación requerido'
      });
    }

    // Buscar reserva por token
    const reservation = await sheetsService.findReservationByToken(token);
    
    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reserva no encontrada'
      });
    }

    if (reservation.status === 'CANCELADA') {
      return res.status(400).json({
        success: false,
        message: 'La reserva ya fue cancelada'
      });
    }

    // Renderizar página de cancelación
    const html = generateCancelPage(reservation);
    
    res.setHeader('Content-Type', 'text/html');
    res.send(html);

  } catch (error) {
    console.error('Error en /cancel GET:', error);
    res.status(500).json({
      success: false,
      message: 'Error cargando página de cancelación'
    });
  }
});

// POST /cancel - Procesar cancelación
app.post('/cancel', async (req, res) => {
  try {
    const { token, reason } = req.body;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token de cancelación requerido'
      });
    }

    // Marcar reserva como cancelada
    const result = await sheetsService.cancelReservation(token, reason);
    
    if (!result.success) {
      return res.status(400).json(result);
    }

    // Eliminar evento del calendario si existe
    if (result.reservation.eventId) {
      await calendarService.deleteEvent(result.reservation.eventId);
    }

    // Enviar email de cancelación
    await emailService.sendCancellationEmail(result.reservation, reason);

    res.json({
      success: true,
      message: 'Reserva cancelada exitosamente'
    });

  } catch (error) {
    console.error('Error en /cancel POST:', error);
    res.status(500).json({
      success: false,
      message: 'Error cancelando reserva'
    });
  }
});

// Función para generar página de cancelación
function generateCancelPage(reservation) {
  const formattedDate = moment(reservation.date).format('dddd, D [de] MMMM [de] YYYY');
  const reprogramUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}?date=${reservation.date}`;
  
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
                const response = await fetch('/cancel', {
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

// Manejo de errores
app.use((err, req, res, next) => {
  console.error('Error no manejado:', err);
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor'
  });
});

// Ruta 404
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada'
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📅 Health check: http://localhost:${PORT}/health`);
});
