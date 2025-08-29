# 📧 Configuración de Emails Automáticos con Google Apps Script

Este directorio contiene los scripts de Google Apps Script para enviar emails automáticamente cuando se crean reservas o cancelaciones.

## 📋 Archivos

- **`ReservasEmailTrigger.gs`**: Envía email de confirmación cuando se agrega una nueva reserva
- **`CancelacionesEmailTrigger.gs`**: Envía email de cancelación cuando se registra una cancelación

## 🚀 Instalación y Configuración

### Paso 1: Abrir Google Apps Script

1. Ve a [script.google.com](https://script.google.com)
2. Inicia sesión con tu cuenta de Google
3. Haz clic en **"Nuevo proyecto"**

### Paso 2: Configurar el Script de Reservas

1. **Renombra el proyecto** a "Barbería - Email Reservas"
2. **Copia y pega** el contenido de `ReservasEmailTrigger.gs`
3. **Guarda** el proyecto (Ctrl+S)

### Paso 3: Configurar el Script de Cancelaciones

1. **Crea otro proyecto** nuevo
2. **Renómbralo** a "Barbería - Email Cancelaciones"
3. **Copia y pega** el contenido de `CancelacionesEmailTrigger.gs`
4. **Guarda** el proyecto

### Paso 4: Configurar Triggers (Disparadores)

#### Para el Script de Reservas:

1. En el proyecto "Barbería - Email Reservas"
2. Ve a **"Triggers"** (ícono de reloj en el menú izquierdo)
3. Haz clic en **"Add trigger"**
4. Configura:
   - **Choose which function to run**: `checkNewReservations`
   - **Choose which deployment should run**: `Head`
   - **Select event source**: `Time-driven`
   - **Select type of time based trigger**: `Minutes timer`
   - **Select minute interval**: `Every 5 minutes`
   - **Select failure notification settings**: `Notify me immediately`
5. Haz clic en **"Save"**

#### Para el Script de Cancelaciones:

1. En el proyecto "Barbería - Email Cancelaciones"
2. Ve a **"Triggers"**
3. Haz clic en **"Add trigger"**
4. Configura:
   - **Choose which function to run**: `checkNewCancellations`
   - **Choose which deployment should run**: `Head`
   - **Select event source**: `Time-driven`
   - **Select type of time based trigger**: `Minutes timer`
   - **Select minute interval**: `Every 5 minutes`
   - **Select failure notification settings**: `Notify me immediately`
5. Haz clic en **"Save"**

### Paso 5: Configurar Permisos

1. **Ejecuta manualmente** cada script una vez para autorizar:
   - En el script de reservas, ejecuta la función `testEmail()`
   - En el script de cancelaciones, ejecuta la función `testCancellationEmail()`
2. **Autoriza** todos los permisos que solicite Google

### Paso 6: Obtener el ID del Spreadsheet

1. **Abre tu Google Sheet** con las reservas
2. **Copia la URL** de la barra de direcciones
3. **Extrae el ID**: La URL tiene este formato:
   ```
   https://docs.google.com/spreadsheets/d/TU_ID_AQUI/edit#gid=0
   ```
4. **Copia el ID** (la parte entre `/d/` y `/edit`)

### Paso 7: Personalizar Configuración

En cada script, modifica estas secciones:

#### En `ReservasEmailTrigger.gs`:
```javascript
const CONFIG = {
  SHEET_NAME: 'Reservas',
  EMAIL_SUBJECT: 'Confirmación de reserva - Barbería',
  EMAIL_FROM: 'Barbería <tu-email@gmail.com>', // Cambiar por tu email
  WEB_APP_BASE_URL: 'https://demo-citas-barberias.netlify.app'
};

// En la función checkNewReservations(), reemplaza 'TU_SPREADSHEET_ID':
const spreadsheet = SpreadsheetApp.openById('TU_ID_REAL_AQUI');
```

#### En `CancelacionesEmailTrigger.gs`:
```javascript
const CONFIG = {
  SHEET_NAME: 'Cancelaciones',
  EMAIL_SUBJECT: 'Reserva cancelada - Barbería',
  EMAIL_FROM: 'Barbería <tu-email@gmail.com>', // Cambiar por tu email
  WEB_APP_BASE_URL: 'https://demo-citas-barberias.netlify.app'
};

// En la función checkNewCancellations(), reemplaza 'TU_SPREADSHEET_ID':
const spreadsheet = SpreadsheetApp.openById('TU_ID_REAL_AQUI');
```

## 🧪 Pruebas

### Probar Email de Confirmación:

1. En el script de reservas, ejecuta la función `testEmail()`
2. **Cambia el email** en la función por tu email real
3. Ejecuta y verifica que recibas el email

### Probar Email de Cancelación:

1. En el script de cancelaciones, ejecuta la función `testCancellationEmail()`
2. **Cambia el email** en la función por tu email real
3. Ejecuta y verifica que recibas el email

## 🔧 Funcionamiento

### Email de Confirmación:
- Se ejecuta automáticamente cada 5 minutos verificando la hoja "Reservas"
- Solo envía email si el status es "CONFIRMADA"
- Incluye detalles de la reserva y link de cancelación
- **Evita duplicados**: Marca automáticamente las filas como "Email Enviado"
- **Columnas agregadas automáticamente**:
  - Columna K (11): "Email Enviado" - Se marca como "SÍ" cuando se envía
  - Columna L (12): "Fecha Email" - Timestamp del envío

### Email de Cancelación:
- Se ejecuta automáticamente cada 5 minutos verificando la hoja "Cancelaciones"
- Incluye detalles de la cancelación y motivo
- Ofrece link para hacer nueva reserva
- **Evita duplicados**: Marca automáticamente las filas como "Email Enviado"
- **Columnas agregadas automáticamente**:
  - Columna I (9): "Email Enviado" - Se marca como "SÍ" cuando se envía
  - Columna J (10): "Fecha Email" - Timestamp del envío

## 📧 Personalización de Emails

Los emails están diseñados con HTML y CSS inline. Puedes personalizar:

- **Colores**: Cambia los códigos de color en el CSS
- **Logo**: Agrega una imagen de logo en el header
- **Información de contacto**: Actualiza emails y WhatsApp
- **Mensajes**: Modifica el texto según tus necesidades

## 🚨 Solución de Problemas

### Error: "GmailApp is not defined"
- Asegúrate de que el script tenga permisos de Gmail
- Ejecuta manualmente una vez para autorizar

### Error: "Spreadsheet is not found"
- Verifica que el script esté vinculado a la hoja correcta
- Asegúrate de que los nombres de las hojas coincidan

### Emails no se envían automáticamente
- Verifica que los triggers estén configurados correctamente
- Revisa los logs en Google Apps Script
- Asegúrate de que las filas tengan todos los datos necesarios

### Emails van a spam
- Configura SPF y DKIM en tu dominio
- Usa un email de dominio propio en lugar de Gmail
- Agrega el email a la lista de contactos

## 📞 Soporte

Si tienes problemas:
1. Revisa los logs en Google Apps Script
2. Verifica que todos los permisos estén autorizados
3. Prueba las funciones de test manualmente
4. Asegúrate de que las hojas tengan la estructura correcta

## 🔄 Actualización de Netlify Functions

Una vez configurados los scripts de Google Apps Script, puedes **eliminar** el código de envío de emails de las funciones de Netlify:

1. En `reserve-debug-v2.js`, comenta o elimina la llamada a `sendConfirmationEmail()`
2. En `cancel.js`, comenta o elimina la llamada a `sendCancellationEmail()`

Esto hará que el sistema sea más eficiente y confiable.
