const admin = require('firebase-admin');

// Parseamos las credenciales desde la variable de entorno
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

// Inicializamos la app de Firebase solo si no ha sido inicializada antes
// Esto es importante en entornos serverless para evitar errores en ejecuciones "cálidas"
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

// Exportamos la instancia de Firestore para que otras funciones la puedan usar
const db = admin.firestore();

module.exports = { db };
