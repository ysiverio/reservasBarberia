document.addEventListener('DOMContentLoaded', () => {
  // --- CONFIGURACIÓN DE FIREBASE (CLIENTE) ---
  // IMPORTANTE: Reemplaza esto con la configuración de tu proyecto de Firebase.
  const firebaseConfig = {   
  apiKey: "AIzaSyBe-74tJkrXFE_1ZCYHzyHs21ebc14NF-8",
  authDomain: "agendas-f4494.firebaseapp.com",
  projectId: "agendas-f4494",
  storageBucket: "agendas-f4494.firebasestorage.app",
  messagingSenderId: "1077527875604",
  appId: "1:1077527875604:web:f9c6618f2da684244d9701",
  measurementId: "G-K7092NNLYG"
};

  // Inicializar Firebase
  firebase.initializeApp(firebaseConfig);
  const auth = firebase.auth();

  // --- ELEMENTOS DEL DOM ---
  const loginView = document.getElementById('login-view');
  const adminView = document.getElementById('admin-view');
  const loginForm = document.getElementById('login-form');
  const loginError = document.getElementById('login-error');
  const logoutBtn = document.getElementById('logout-btn');
  const adminDateInput = document.getElementById('admin-date');
  const reservationsContainer = document.getElementById('reservations-container');

  // --- LÓGICA DE AUTENTICACIÓN ---

  // Escuchar cambios en el estado de autenticación
  auth.onAuthStateChanged(user => {
    if (user) {
      // Usuario ha iniciado sesión
      loginView.style.display = 'none';
      adminView.style.display = 'block';
      // Poner la fecha de hoy por defecto
      adminDateInput.value = new Date().toISOString().split('T')[0];
      // Cargar las reservas para la fecha de hoy
      fetchReservations(adminDateInput.value);
    } else {
      // Usuario no ha iniciado sesión
      loginView.style.display = 'block';
      adminView.style.display = 'none';
    }
  });

  // Manejar inicio de sesión
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('admin-email').value;
    const password = document.getElementById('admin-password').value;
    loginError.textContent = '';

    try {
      await auth.signInWithEmailAndPassword(email, password);
      // onAuthStateChanged se encargará de mostrar la vista de admin
    } catch (error) {
      console.error('Error de inicio de sesión:', error);
      loginError.textContent = 'Email o contraseña incorrectos.';
    }
  });

  // Manejar cierre de sesión
  logoutBtn.addEventListener('click', async () => {
    try {
      await auth.signOut();
      // onAuthStateChanged se encargará de mostrar la vista de login
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  });

  // --- LÓGICA DE RESERVAS ---

  // Escuchar cambios en la fecha
  adminDateInput.addEventListener('change', () => {
    const date = adminDateInput.value;
    if (date) {
      fetchReservations(date);
    }
  });

  // Buscar y mostrar las reservas
  async function fetchReservations(date) {
    reservationsContainer.innerHTML = '<p>Cargando reservas...</p>';
    const user = auth.currentUser;

    if (!user) {
      reservationsContainer.innerHTML = '<p class="text-danger">No has iniciado sesión.</p>';
      return;
    }

    try {
      const idToken = await user.getIdToken();
      const response = await fetch('/.netlify/functions/get-reservations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ date })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Error al obtener las reservas.');
      }

      renderReservations(data.reservations);

    } catch (error) {
      console.error('Error fetching reservations:', error);
      reservationsContainer.innerHTML = `<p class="text-danger">${error.message}</p>`;
    }
  }

  // Renderizar la tabla de reservas
  function renderReservations(reservations) {
    if (reservations.length === 0) {
      reservationsContainer.innerHTML = '<p>No hay reservas para este día.</p>';
      return;
    }

    let tableHTML = '<table class="table"><thead><tr><th>Hora</th><th>Nombre</th><th>Email</th><th>Estado</th></tr></thead><tbody>';
    reservations.forEach(res => {
      tableHTML += `
        <tr>
          <td>${res.time}</td>
          <td>${res.name}</td>
          <td>${res.email}</td>
          <td><span class="badge badge-success">${res.status}</span></td>
        </tr>
      `;
    });
    tableHTML += '</tbody></table>';

    reservationsContainer.innerHTML = tableHTML;
  }
});
