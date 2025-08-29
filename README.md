# Sistema de Reservas de Barbería

Sistema completo de reservas para barbería con frontend estático y backend en Google Apps Script (GAS). Permite a los usuarios reservar turnos, consultar disponibilidad en tiempo real y cancelar reservas con un link único.

## 🚀 Características

- **Reservas en tiempo real**: Consulta disponibilidad en Google Calendar
- **Almacenamiento seguro**: Reservas guardadas en Google Sheets
- **Cancelaciones fáciles**: Link único para cancelar con motivo opcional
- **UI minimalista**: Diseño limpio y responsive
- **Reprogramación**: Botón para reprogramar tras cancelar
- **Notificaciones por email**: Confirmaciones automáticas
- **Anti-spam**: Protección contra bots
- **Validaciones**: Límites de reservas por día y por email

## 📁 Estructura del Proyecto

```
reservasBarberia/
├── index.html              # Frontend principal
├── styles.css              # Estilos CSS
├── app.js                  # Lógica del frontend
├── backend-gas/
│   ├── config.gs           # Configuración del sistema
│   ├── CalendarService.gs  # Servicio de calendario
│   ├── SheetsService.gs    # Servicio de hojas de cálculo
│   └── Code.gs             # Router principal
└── README.md               # Este archivo
```

## 🛠️ Configuración

### 1. Crear Google Sheet

1. Ve a [Google Sheets](https://sheets.google.com)
2. Crea una nueva hoja de cálculo
3. Renombra la primera hoja como "Reservas" (o déjala con el nombre por defecto)
4. Crea una segunda hoja llamada "Cancelaciones"
5. Copia el **ID de la hoja** de la URL:
   ```
   https://docs.google.com/spreadsheets/d/SHEET_ID_VA_AQUI/edit
   ```

### 2. Configurar Google Calendar

1. Ve a [Google Calendar](https://calendar.google.com)
2. Crea un nuevo calendario para la barbería o usa uno existente
3. En la configuración del calendario, copia el **ID del calendario**:
   ```
   ejemplo@group.calendar.google.com
   ```

### 3. Configurar Google Apps Script

1. Ve a [Google Apps Script](https://script.google.com)
2. Crea un nuevo proyecto
3. Renombra el proyecto como "Sistema de Reservas Barbería"
4. Crea 4 archivos con los nombres exactos:
   - `config.gs`
   - `CalendarService.gs`
   - `SheetsService.gs`
   - `Code.gs`
5. Copia el contenido de cada archivo desde la carpeta `backend-gas/`

### 4. Configurar Variables

En el archivo `config.gs`, reemplaza las siguientes variables:

```javascript
const CALENDAR_ID = 'tu-calendar-id@group.calendar.google.com';
const SHEET_ID = 'tu-sheet-id-aqui';
const WEB_APP_BASE_URL = 'URL_DEL_WEB_APP_DESPUES_DE_DEPLOY';
```

### 5. Desplegar como Web App

1. En Google Apps Script, haz clic en **Deploy** > **New deployment**
2. Selecciona **Web app**
3. Configura:
   - **Execute as**: Me (tu email)
   - **Who has access**: Anyone
4. Haz clic en **Deploy**
5. Copia la **URL del Web App** generada
6. Actualiza `WEB_APP_BASE_URL` en `config.gs` con esta URL

### 6. Configurar Frontend

En el archivo `app.js`, actualiza la URL de la API:

```javascript
const API_BASE = 'URL_DEL_WEB_APP_GAS';
```

## 🔧 Configuración Avanzada

### Horarios de Trabajo

En `config.gs`, puedes modificar:

```javascript
const WORK_START = '09:00';  // Hora de inicio
const WORK_END = '18:00';    // Hora de fin
const SLOT_MINUTES = 30;     // Duración de cada slot
```

### Feriados y Días No Laborables

```javascript
const FERIADOS = [
  '2025-01-01', // Año Nuevo
  '2025-04-18', // Viernes Santo
  // ... agregar más fechas
];

const NO_LABORABLES = [0]; // 0 = domingo
```

### Límites de Reservas

```javascript
const MAX_RESERVAS_POR_DIA = 12;           // Máximo por día
const MAX_RESERVAS_POR_EMAIL_POR_DIA = 2;  // Máximo por email por día
```

### WhatsApp

Actualiza el número de WhatsApp en `config.gs`:

```javascript
const WHATSAPP_NUMBER = '59899123456';
```

Y en `index.html`:

```html
<a href="https://wa.me/59899123456?text=Hola,%20tengo%20una%20consulta%20sobre%20mi%20reserva">
```

## 🚀 Uso

### Para el Cliente

1. **Reservar turno**:
   - Completa nombre, email y fecha
   - Selecciona horario disponible
   - Confirma la reserva
   - Recibe email con link de cancelación

2. **Cancelar reserva**:
   - Abre el link de cancelación del email
   - Verifica los detalles
   - Ingresa motivo (opcional)
   - Confirma cancelación
   - Opción de reprogramar

### Para el Administrador

1. **Ver reservas**: Consulta la hoja "Reservas" en Google Sheets
2. **Ver cancelaciones**: Consulta la hoja "Cancelaciones"
3. **Gestionar calendario**: Los eventos se crean automáticamente en Google Calendar

## 🔒 Seguridad

- **Tokens únicos**: Cada reserva tiene un token de cancelación único
- **Validaciones**: Límites de reservas y validación de datos
- **Anti-spam**: Campo honeypot oculto
- **CORS**: Configuración de orígenes permitidos

## 📧 Emails Automáticos

El sistema envía automáticamente:

- **Confirmación de reserva**: Con detalles y link de cancelación
- **Confirmación de cancelación**: Con motivo y opción de reprogramar

## 🐛 Troubleshooting

### Error: "No se pudo acceder al calendario"
- Verifica que el `CALENDAR_ID` sea correcto
- Asegúrate de que el calendario tenga permisos públicos

### Error: "No se pudo acceder a la hoja"
- Verifica que el `SHEET_ID` sea correcto
- Asegúrate de que la hoja tenga permisos de edición

### Error: "Configuración incompleta"
- Verifica que todas las variables en `config.gs` estén configuradas
- Ejecuta `validateConfig()` en la consola de Apps Script

### Las reservas no aparecen en el calendario
- Verifica que `CREATE_TENTATIVE_EVENT = true`
- Revisa los logs en la consola de Apps Script

## 📱 Personalización

### Cambiar Logo
En `index.html` y `styles.css`:

```html
<h1 class="logo">💈 Barbería</h1>
```

### Cambiar Colores
En `styles.css`, modifica las variables CSS:

```css
:root {
  --primary-color: #000000;
  --secondary-color: #666666;
  --background-color: #ffffff;
  /* ... */
}
```

### Agregar Más Validaciones
En `SheetsService.gs`, modifica `validateReservation()`:

```javascript
validateReservation(reservation) {
  // Agregar validaciones personalizadas
  if (reservation.name.length < 2) return false;
  // ... más validaciones
}
```

## 🔄 Actualizaciones

Para actualizar el sistema:

1. Modifica los archivos en Google Apps Script
2. Crea un nuevo deployment
3. Actualiza la URL en el frontend si es necesario

## 📞 Soporte

Si tienes problemas:

1. Revisa los logs en la consola de Google Apps Script
2. Verifica que todas las configuraciones estén correctas
3. Asegúrate de que los permisos estén configurados correctamente

## 📄 Licencia

Este proyecto es de código abierto y está disponible bajo la licencia MIT.

---

**¡Listo!** Tu sistema de reservas de barbería está configurado y funcionando. 🎉
