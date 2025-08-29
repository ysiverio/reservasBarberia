# Backend Node.js - Sistema de Reservas de Barbería

Este es el backend en Node.js que reemplaza Google Apps Script para el sistema de reservas de barbería.

## 🚀 Características

- **Express.js** - Servidor web rápido y flexible
- **Google Calendar API** - Integración directa con Google Calendar
- **Google Sheets API** - Almacenamiento de reservas en Google Sheets
- **Nodemailer** - Envío de emails de confirmación y cancelación
- **CORS configurado** - Sin problemas de CORS
- **Validación completa** - Validación de datos y límites
- **Logging** - Logs detallados para debugging

## 📋 Requisitos Previos

1. **Node.js** (versión 16 o superior)
2. **Cuenta de Google** con acceso a:
   - Google Calendar
   - Google Sheets
   - Google Cloud Console

## 🔧 Configuración

### 1. Instalar Dependencias

```bash
cd backend-nodejs
npm install
```

### 2. Configurar Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Habilita las APIs:
   - Google Calendar API
   - Google Sheets API
   - Gmail API (para emails)
4. Crea una cuenta de servicio:
   - Ve a "IAM & Admin" > "Service Accounts"
   - Crea una nueva cuenta de servicio
   - Descarga el archivo JSON de credenciales
   - Renombra el archivo a `credentials.json` y colócalo en la raíz del proyecto

### 3. Configurar Variables de Entorno

Copia el archivo `env.example` a `.env` y configura las variables:

```bash
cp env.example .env
```

Edita el archivo `.env` con tus datos:

```env
# Configuración del servidor
PORT=3000

# Google Calendar API
GOOGLE_CALENDAR_ID=tu-calendar-id@group.calendar.google.com

# Google Sheets API
GOOGLE_SHEET_ID=tu-sheet-id

# Configuración de horarios
SLOT_MINUTES=30
WORK_START=09:00
WORK_END=18:00

# Límites de reservas
MAX_RESERVAS_POR_DIA=12
MAX_RESERVAS_POR_EMAIL_POR_DIA=2

# Configuración de emails
EMAIL_FROM=tu-email@gmail.com
EMAIL_PASSWORD=tu-contraseña-de-aplicación
EMAIL_SUBJECT=Confirmación de reserva - Barbería

# Configuración de WhatsApp
WHATSAPP_NUMBER=59899123456

# Feriados 2025 (formato YYYY-MM-DD)
FERIADOS=2025-01-01,2025-04-18,2025-05-01,2025-06-19,2025-07-18,2025-08-25,2025-12-25

# Días no laborables (0=domingo, 1=lunes, etc.)
NO_LABORABLES=0

# Configuración de CORS
ALLOWED_ORIGINS=https://demo-citas-barberias.netlify.app,http://localhost:8000,http://localhost:3000

# URLs del sistema
BACKEND_URL=http://localhost:3000
FRONTEND_URL=https://demo-citas-barberias.netlify.app
```

### 4. Configurar Google Sheets

Crea una hoja de Google Sheets con las siguientes columnas:

**Hoja Principal:**
- A: ID
- B: Nombre
- C: Email
- D: Fecha
- E: Hora
- F: Estado
- G: EventID
- H: CancelToken
- I: CancelURL
- J: FechaCreacion
- K: FechaActualizacion

**Hoja "Cancelaciones":**
- A: CancelID
- B: ReservationID
- C: Nombre
- D: Email
- E: Fecha
- F: Hora
- G: Motivo
- H: FechaCancelacion

### 5. Configurar Google Calendar

1. Crea un calendario específico para las reservas
2. Copia el ID del calendario (está en la configuración del calendario)
3. Comparte el calendario con la cuenta de servicio

### 6. Configurar Email

Para usar Gmail:
1. Habilita la verificación en 2 pasos en tu cuenta de Google
2. Genera una contraseña de aplicación
3. Usa esa contraseña en `EMAIL_PASSWORD`

## 🚀 Ejecutar el Servidor

### Desarrollo
```bash
npm run dev
```

### Producción
```bash
npm start
```

El servidor estará disponible en `http://localhost:3000`

## 📡 Endpoints

### GET /health
Verifica el estado del servidor.

### GET /availability?date=YYYY-MM-DD
Obtiene los slots disponibles para una fecha.

**Respuesta:**
```json
{
  "success": true,
  "date": "2025-01-15",
  "availableSlots": ["09:00", "09:30", "10:00"]
}
```

### POST /reserve
Crea una nueva reserva.

**Body:**
```json
{
  "name": "Juan Pérez",
  "email": "juan@example.com",
  "date": "2025-01-15",
  "time": "09:00"
}
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Reserva creada exitosamente",
  "cancelUrl": "http://localhost:3000/cancel?token=abc123..."
}
```

### GET /cancel?token=TOKEN
Muestra la página de cancelación.

### POST /cancel
Procesa la cancelación de una reserva.

**Body:**
```json
{
  "token": "abc123...",
  "reason": "Cambio de planes"
}
```

## 🔒 Seguridad

- **Validación de datos** - Todos los inputs son validados
- **Límites de reservas** - Control de reservas por día y por email
- **Tokens seguros** - Tokens de cancelación criptográficamente seguros
- **CORS configurado** - Solo dominios permitidos pueden acceder

## 🐛 Troubleshooting

### Error de credenciales
- Verifica que el archivo `credentials.json` esté en la raíz del proyecto
- Asegúrate de que la cuenta de servicio tenga permisos en Calendar y Sheets

### Error de CORS
- Verifica que tu dominio esté en `ALLOWED_ORIGINS`
- Reinicia el servidor después de cambiar las variables de entorno

### Error de email
- Verifica que `EMAIL_FROM` y `EMAIL_PASSWORD` estén configurados
- Asegúrate de usar una contraseña de aplicación, no la contraseña normal

### Error de Calendar/Sheets
- Verifica que las APIs estén habilitadas en Google Cloud Console
- Asegúrate de que los IDs de Calendar y Sheets sean correctos

## 📝 Logs

El servidor genera logs detallados para debugging:
- Todas las requests HTTP
- Errores de Calendar y Sheets
- Confirmaciones de emails enviados
- Errores de validación

## 🚀 Despliegue

### Heroku
1. Crea una app en Heroku
2. Configura las variables de entorno
3. Sube el archivo `credentials.json`
4. Deploy con `git push heroku main`

### Vercel
1. Conecta tu repositorio a Vercel
2. Configura las variables de entorno
3. Sube el archivo `credentials.json`
4. Deploy automático

### DigitalOcean/Railway
Sigue las instrucciones específicas de cada plataforma.

## 📞 Soporte

Si tienes problemas:
1. Revisa los logs del servidor
2. Verifica la configuración de Google Cloud Console
3. Asegúrate de que todas las variables de entorno estén configuradas
4. Verifica que los archivos de credenciales estén en su lugar
