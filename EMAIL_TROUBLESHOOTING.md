# Solución para Emails de Confirmación

## Problema Identificado
El sistema no está enviando emails de confirmación porque hay problemas en la configuración de Google Apps Script.

## Diagnóstico del Sistema de Emails

### 1. Flujo Actual
1. Usuario hace reserva → `reserve.js` (Netlify Function)
2. `reserve.js` guarda en Firestore
3. `reserve.js` llama a Google Apps Script para enviar email
4. Google Apps Script envía el email usando Gmail

### 2. Variables de Entorno Requeridas
```
APPS_SCRIPT_URL=https://script.google.com/macros/s/TU_SCRIPT_ID/exec
APPS_SCRIPT_SECRET=un-token-muy-secreto-y-dificil-de-adivinar
```

## Soluciones

### Opción 1: Configurar Google Apps Script (Recomendado)

#### Paso 1: Crear/Configurar Google Apps Script
1. Ve a [Google Apps Script](https://script.google.com)
2. Crea un nuevo proyecto
3. Copia el contenido de `google-apps-script/Code.gs` al editor
4. **IMPORTANTE**: Actualiza la línea 1 con tu token secreto:
   ```javascript
   var SECRET_TOKEN = 'tu-token-super-secreto-aqui';
   ```
5. Actualiza la configuración en las líneas 4-14:
   ```javascript
   var CONFIG = {
     EMAIL_FROM: 'Tu Negocio <tu-email@gmail.com>',
     EMAIL_NAME: 'Tu Nombre de Negocio',
     WEB_APP_BASE_URL: 'https://tu-sitio.netlify.app'
   };
   ```

#### Paso 2: Desplegar como Web App
1. Haz clic en "Desplegar" > "Nueva implementación"
2. Tipo: "Aplicación web"
3. Ejecutar como: "Yo"
4. Quién tiene acceso: "Cualquiera"
5. Copia la URL de la aplicación web

#### Paso 3: Configurar Variables en Netlify
```
APPS_SCRIPT_URL=https://script.google.com/macros/s/TU_SCRIPT_ID/exec
APPS_SCRIPT_SECRET=tu-token-super-secreto-aqui
```

#### Paso 4: Probar el Email
1. Ejecuta la función `testEmail()` en Google Apps Script
2. Cambia el email de prueba en la línea 301
3. Verifica que llegue el email

### Opción 2: Usar Nodemailer (Alternativa)

Si prefieres no usar Google Apps Script, puedes configurar Nodemailer:

#### Paso 1: Configurar Variables de Entorno
```
EMAIL_FROM=tu-email@gmail.com
EMAIL_PASSWORD=tu-contraseña-de-aplicacion
```

#### Paso 2: Modificar reserve.js
Reemplaza la llamada a Google Apps Script con Nodemailer:

```javascript
// En lugar de llamar a Google Apps Script
const emailService = require('./lib/EmailService');
await emailService.sendConfirmationEmail(newReservation);
```

## Verificación

### 1. Revisar Logs de Netlify
1. Ve a tu dashboard de Netlify
2. Ve a "Functions" > "reserve"
3. Revisa los logs para ver errores de email

### 2. Probar Manualmente
1. Haz una reserva de prueba
2. Revisa los logs de la función
3. Verifica que no haya errores de `APPS_SCRIPT_URL` o `APPS_SCRIPT_SECRET`

### 3. Verificar en Gmail
1. Revisa la carpeta de spam
2. Verifica que el email de envío esté configurado correctamente
3. Asegúrate de que Gmail permita el envío desde Apps Script

## Problemas Comunes

### Error: "APPS_SCRIPT_URL/APPS_SCRIPT_SECRET faltantes"
- **Solución**: Configurar las variables de entorno en Netlify

### Error: "Acceso no autorizado"
- **Solución**: Verificar que `APPS_SCRIPT_SECRET` coincida en ambos lados

### Error: "No se puede enviar email"
- **Solución**: Verificar permisos de Gmail en Google Apps Script

### Emails van a spam
- **Solución**: Configurar SPF/DKIM o usar un servicio de email profesional

## Contacto
Si sigues teniendo problemas, revisa los logs detallados o contacta al desarrollador.
