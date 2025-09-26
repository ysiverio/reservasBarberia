# Guía de Prueba del Sistema de Reservas

## Pasos para Probar el Sistema

### 1. Verificar Configuración
Antes de probar, asegúrate de que:
- [ ] El índice de Firestore esté creado (ver `FIRESTORE_INDEX_FIX.md`)
- [ ] Las variables de entorno estén configuradas (ver `ENVIRONMENT_VARIABLES.md`)
- [ ] El sitio esté desplegado en Netlify

### 2. Probar Disponibilidad
1. Abre tu sitio web
2. Selecciona una fecha futura (lunes a viernes)
3. Haz clic en "Buscar disponibilidad"
4. **Resultado esperado**: Deberías ver horarios disponibles de 09:00 a 18:00 cada 30 minutos

### 3. Probar Reserva
1. Completa el formulario con:
   - Nombre: "Juan Pérez"
   - Email: "juan@ejemplo.com"
   - Fecha: Una fecha futura
2. Haz clic en "Buscar disponibilidad"
3. Selecciona un horario disponible
4. Confirma la reserva en el modal
5. **Resultado esperado**: Deberías ver un mensaje de confirmación con el link de cancelación

### 4. Verificar en Firebase
1. Ve a la consola de Firebase
2. Ve a "Firestore Database"
3. Busca la colección "reservations"
4. **Resultado esperado**: Deberías ver la nueva reserva con todos los datos

### 5. Verificar Email (si está configurado)
1. Revisa el email del usuario
2. **Resultado esperado**: Debería recibir un email de confirmación

## Problemas Comunes y Soluciones

### Error: "No se pudo obtener la disponibilidad"
- **Causa**: Problema con el índice de Firestore
- **Solución**: Crear el índice siguiendo `FIRESTORE_INDEX_FIX.md`

### Error: "Error de configuración del servidor"
- **Causa**: Variables de entorno faltantes
- **Solución**: Configurar las variables siguiendo `ENVIRONMENT_VARIABLES.md`

### Error: "Hubo un error al procesar la reserva"
- **Causa**: Problema con Firebase o Apps Script
- **Solución**: Revisar los logs de Netlify Functions

### No aparecen horarios disponibles
- **Causa**: Configuración incorrecta en `config.json`
- **Solución**: Verificar que `workDays` incluya el día seleccionado

## Logs Útiles
Para depurar problemas, revisa:
1. Logs de Netlify Functions en el dashboard
2. Logs de Firebase en la consola
3. Logs del navegador (F12 > Console)

## Contacto
Si sigues teniendo problemas, revisa los archivos de documentación creados o contacta al desarrollador.
