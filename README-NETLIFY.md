# 🚀 Sistema de Reservas de Barbería - Netlify

Este es el sistema de reservas optimizado para **Netlify** usando **Netlify Functions** (serverless).

## ✨ Características

- **Netlify Functions** - Backend serverless sin problemas de CORS
- **Google Calendar API** - Integración directa con Google Calendar
- **Google Sheets API** - Almacenamiento de reservas en Google Sheets
- **Nodemailer** - Emails de confirmación y cancelación
- **Sin problemas de CORS** - Todo funciona en el mismo dominio
- **Despliegue automático** - Conecta tu repositorio y listo

## 🎯 Ventajas de Netlify Functions

- ✅ **Sin problemas de CORS** - Todo en el mismo dominio
- ✅ **Serverless** - No necesitas mantener servidores
- ✅ **Escalable** - Se adapta automáticamente al tráfico
- ✅ **Gratis** - 125,000 requests/mes gratis
- ✅ **Fácil despliegue** - Conecta tu repositorio y listo
- ✅ **CDN global** - Tu sitio es súper rápido

## 📋 Requisitos Previos

1. **Cuenta de Netlify** (gratis)
2. **Cuenta de Google** con acceso a:
   - Google Calendar
   - Google Sheets
   - Google Cloud Console

## 🔧 Configuración

### 1. Configurar Google Cloud Console

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

### 2. Configurar Netlify

1. **Conecta tu repositorio:**
   - Ve a [Netlify](https://netlify.com)
   - Crea una nueva cuenta o inicia sesión
   - Haz clic en "New site from Git"
   - Conecta tu repositorio de GitHub

2. **Configura las variables de entorno:**
   - Ve a "Site settings" > "Environment variables"
   - Agrega las siguientes variables:

```env
# Google Calendar API
GOOGLE_CALENDAR_ID=tu-calendar-id@group.calendar.google.com

# Google Sheets API
GOOGLE_SHEET_ID=tu-sheet-id

# Google Credentials (JSON completo como string)
GOOGLE_CREDENTIALS={"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}

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

# Feriados 2025 (formato YYYY-MM-DD)
FERIADOS=2025-01-01,2025-04-18,2025-05-01,2025-06-19,2025-07-18,2025-08-25,2025-12-25

# Días no laborables (0=domingo, 1=lunes, etc.)
NO_LABORABLES=0
```

### 3. Configurar Google Sheets

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

### 4. Configurar Google Calendar

1. Crea un calendario específico para las reservas
2. Copia el ID del calendario (está en la configuración del calendario)
3. Comparte el calendario con la cuenta de servicio

### 5. Configurar Email

Para usar Gmail:
1. Habilita la verificación en 2 pasos en tu cuenta de Google
2. Genera una contraseña de aplicación
3. Usa esa contraseña en `EMAIL_PASSWORD`

## 🚀 Despliegue

### Opción 1: Despliegue Automático (Recomendado)

1. **Conecta tu repositorio a Netlify:**
   - Ve a [Netlify](https://netlify.com)
   - "New site from Git"
   - Selecciona tu repositorio
   - Configura las variables de entorno
   - ¡Listo! Se despliega automáticamente

2. **Configuración del build:**
   - Build command: `npm run build` (o déjalo vacío)
   - Publish directory: `.` (raíz del proyecto)

### Opción 2: Despliegue Manual

```bash
# Instalar Netlify CLI
npm install -g netlify-cli

# Iniciar sesión
netlify login

# Inicializar proyecto
netlify init

# Desplegar
netlify deploy --prod
```

## 📡 Endpoints Disponibles

### GET /.netlify/functions/availability?date=YYYY-MM-DD
Obtiene los slots disponibles para una fecha.

### POST /.netlify/functions/reserve
Crea una nueva reserva.

### GET /.netlify/functions/cancel?token=TOKEN
Muestra la página de cancelación.

### POST /.netlify/functions/cancel
Procesa la cancelación de una reserva.

## 🔒 Seguridad

- **Validación de datos** - Todos los inputs son validados
- **Límites de reservas** - Control de reservas por día y por email
- **Tokens seguros** - Tokens de cancelación criptográficamente seguros
- **Sin CORS** - Todo funciona en el mismo dominio

## 🐛 Troubleshooting

### Error de credenciales
- Verifica que `GOOGLE_CREDENTIALS` contenga el JSON completo
- Asegúrate de que la cuenta de servicio tenga permisos

### Error de CORS
- Con Netlify Functions no deberías tener problemas de CORS
- Verifica que las URLs usen rutas relativas

### Error de email
- Verifica que `EMAIL_FROM` y `EMAIL_PASSWORD` estén configurados
- Asegúrate de usar una contraseña de aplicación

### Error de Calendar/Sheets
- Verifica que las APIs estén habilitadas en Google Cloud Console
- Asegúrate de que los IDs de Calendar y Sheets sean correctos

## 💰 Costos

- **Netlify Functions:** 125,000 requests/mes gratis
- **Netlify Hosting:** Ilimitado gratis
- **Google APIs:** Gratis con límites generosos

## 📝 Logs

Los logs de las functions están disponibles en:
- Netlify Dashboard > Functions > Logs
- O usando `netlify functions:logs`

## 🚀 Desarrollo Local

```bash
# Instalar dependencias
npm install

# Ejecutar en desarrollo
npm run dev

# Esto ejecutará netlify dev que simula el entorno de producción
```

## 📞 Soporte

Si tienes problemas:
1. Revisa los logs en Netlify Dashboard
2. Verifica la configuración de Google Cloud Console
3. Asegúrate de que todas las variables de entorno estén configuradas
4. Verifica que las credenciales de Google estén correctas

## 🎉 ¡Listo!

Una vez configurado, tu sistema estará disponible en:
`https://tu-sitio.netlify.app`

Y las functions en:
- `https://tu-sitio.netlify.app/.netlify/functions/availability`
- `https://tu-sitio.netlify.app/.netlify/functions/reserve`
- `https://tu-sitio.netlify.app/.netlify/functions/cancel`
