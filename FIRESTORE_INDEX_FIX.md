# Solución para el Error de Índice de Firestore

## Problema
El sistema de reservas está fallando con el siguiente error:
```
Error: 9 FAILED_PRECONDITION: The query requires an index. You can create it here: https://console.firebase.google.com/v1/r/project/agendas-f4494/firestore/indexes?create_composite=...
```

## Solución

### Opción 1: Crear el índice automáticamente (Recomendado)
1. Ve al enlace que aparece en el error: https://console.firebase.google.com/v1/r/project/agendas-f4494/firestore/indexes?create_composite=ClJwcm9qZWN0cy9hZ2VuZGFzLWY0NDk0L2RhdGFiYXNlcy8oZGVmYXVsdCkvY29sbGVjdGlvbkdyb3Vwcy9yZXNlcnZhdGlvbnMvaW5kZXhlcy9fEAEaCAoEZGF0ZRABGggKBHRpbWUQARoMCghfX25hbWVfXxAB

2. Haz clic en "Create Index" para crear el índice automáticamente.

### Opción 2: Crear el índice manualmente
1. Ve a la consola de Firebase: https://console.firebase.google.com/
2. Selecciona tu proyecto: `agendas-f4494`
3. Ve a "Firestore Database" > "Indexes"
4. Haz clic en "Create Index"
5. Configura el índice con los siguientes parámetros:
   - **Collection ID**: `reservations`
   - **Fields**:
     - `date` (Ascending)
     - `time` (Ascending)
     - `__name__` (Ascending)

### Opción 3: Usar Firebase CLI
Si tienes Firebase CLI instalado, puedes crear el índice ejecutando:
```bash
firebase deploy --only firestore:indexes
```

## Verificación
Una vez creado el índice, el sistema de reservas debería funcionar correctamente. El índice puede tardar unos minutos en estar disponible.

## Nota
Este índice es necesario porque Firestore requiere índices compuestos para consultas que filtran por múltiples campos y ordenan por otros campos.
