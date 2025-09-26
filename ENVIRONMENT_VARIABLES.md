# Variables de Entorno Necesarias

## Variables Requeridas en Netlify

Para que el sistema de reservas funcione correctamente, necesitas configurar las siguientes variables de entorno en tu proyecto de Netlify:

### 1. Firebase Configuration
```
FIREBASE_SERVICE_ACCOUNT
```
- **Descripción**: Credenciales de Firebase en formato JSON
- **Formato**: JSON completo del service account de Firebase
- **Ejemplo**: `{"type":"service_account","project_id":"agendas-f4494",...}`

### 2. Google Apps Script Configuration
```
APPS_SCRIPT_URL
```
- **Descripción**: URL del Google Apps Script para envío de emails
- **Formato**: URL completa del script
- **Ejemplo**: `https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec`

```
APPS_SCRIPT_SECRET
```
- **Descripción**: Token secreto para autenticar las llamadas al Apps Script
- **Formato**: String alfanumérico
- **Ejemplo**: `your_secret_token_here`

### 3. Site Configuration (Opcional)
Estas variables se detectan automáticamente, pero puedes configurarlas manualmente:
```
SITE_BASE_URL
PUBLIC_SITE_URL
DEPLOY_PRIME_URL
URL
```
- **Descripción**: URL base del sitio web
- **Ejemplo**: `https://your-site.netlify.app`

## Cómo Configurar en Netlify

1. Ve a tu proyecto en Netlify
2. Ve a "Site settings" > "Environment variables"
3. Agrega cada variable con su valor correspondiente
4. Haz clic en "Save"
5. Redespliega tu sitio

## Verificación

Para verificar que las variables están configuradas correctamente:
1. Ve a "Functions" en tu dashboard de Netlify
2. Revisa los logs de las funciones para ver si hay errores de configuración
3. Prueba crear una reserva para verificar que todo funciona
