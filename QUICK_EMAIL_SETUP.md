# Configuración Rápida de Emails

## 🚀 Pasos Rápidos para Activar Emails

### 1. Configurar Google Apps Script (5 minutos)

1. **Ve a [Google Apps Script](https://script.google.com)**
2. **Crea un nuevo proyecto**
3. **Copia y pega este código** (reemplaza el contenido existente):

```javascript
var SECRET_TOKEN = 'mi-token-super-secreto-2025'; // ⚠️ CAMBIA ESTO

var CONFIG = {
  EMAIL_SUBJECT: 'Confirmación de reserva',
  EMAIL_FROM: 'Tu Barbería <tu-email@gmail.com>', // ⚠️ CAMBIA ESTO
  EMAIL_NAME: 'Tu Barbería', // ⚠️ CAMBIA ESTO
  WEB_APP_BASE_URL: 'https://tu-sitio.netlify.app' // ⚠️ CAMBIA ESTO
};

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    
    if (payload.secretToken !== SECRET_TOKEN) {
      return createJsonResponse({ status: 'error', message: 'Acceso no autorizado.' });
    }
    
    if (payload.type === 'reservation') {
      return handleReservationEmail(payload);
    }
    
    return createJsonResponse({ status: 'error', message: 'Tipo no reconocido.' });
  } catch (error) {
    return createJsonResponse({ status: 'error', message: error.toString() });
  }
}

function handleReservationEmail(reservation) {
  const emailBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #333;">¡Reserva confirmada!</h2>
      <p>Hola <strong>${reservation.name}</strong>,</p>
      <p>Tu reserva ha sido confirmada exitosamente.</p>
      
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Detalles de la reserva:</h3>
        <p><strong>Fecha:</strong> ${reservation.date}</p>
        <p><strong>Hora:</strong> ${reservation.time}</p>
        <p><strong>ID:</strong> ${reservation.id}</p>
      </div>
      
      <p>Para cancelar tu reserva: <a href="${reservation.cancelUrl}">Hacer clic aquí</a></p>
      
      <p>Saludos,<br><strong>${CONFIG.EMAIL_NAME}</strong></p>
    </div>
  `;
  
  MailApp.sendEmail(
    reservation.email,
    CONFIG.EMAIL_SUBJECT + ' - ' + CONFIG.EMAIL_NAME,
    `Reserva confirmada para ${reservation.name} el ${reservation.date} a las ${reservation.time}`,
    {
      from: CONFIG.EMAIL_FROM,
      htmlBody: emailBody,
      name: CONFIG.EMAIL_NAME
    }
  );
  
  return createJsonResponse({ status: 'success', message: 'Email enviado.' });
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
```

4. **Guarda el proyecto** (Ctrl+S)
5. **Despliega como Web App**:
   - Haz clic en "Desplegar" > "Nueva implementación"
   - Tipo: "Aplicación web"
   - Ejecutar como: "Yo"
   - Acceso: "Cualquiera"
   - Copia la URL (algo como: `https://script.google.com/macros/s/ABC123.../exec`)

### 2. Configurar Variables en Netlify (2 minutos)

1. **Ve a tu proyecto en Netlify**
2. **Ve a "Site settings" > "Environment variables"**
3. **Agrega estas variables**:

```
APPS_SCRIPT_URL = https://script.google.com/macros/s/TU_SCRIPT_ID/exec
APPS_SCRIPT_SECRET = mi-token-super-secreto-2025
```

⚠️ **IMPORTANTE**: Usa el mismo token en ambos lados

### 3. Probar el Sistema (1 minuto)

1. **Haz una reserva de prueba** en tu sitio
2. **Revisa tu email** (incluyendo spam)
3. **Si no llega**, revisa los logs en Netlify Functions

### 4. Verificar Logs

1. **Netlify Dashboard** > **Functions** > **reserve**
2. **Busca errores** como:
   - "Variables de entorno faltantes"
   - "Acceso no autorizado"
   - "Error en Google Apps Script"

## 🔧 Solución de Problemas

### ❌ "Variables de entorno faltantes"
- Verifica que `APPS_SCRIPT_URL` y `APPS_SCRIPT_SECRET` estén configuradas en Netlify

### ❌ "Acceso no autorizado"
- Asegúrate de que el token sea el mismo en Google Apps Script y Netlify

### ❌ "No se puede enviar email"
- Verifica que el email en `EMAIL_FROM` sea válido
- Revisa que Gmail permita el envío desde Apps Script

### ❌ Emails van a spam
- Configura SPF/DKIM o usa un servicio de email profesional

## ✅ Verificación Final

Si todo está bien configurado, deberías ver en los logs:
```
✅ Email de confirmación enviado a usuario@email.com
```

¡Y el usuario debería recibir el email de confirmación!
