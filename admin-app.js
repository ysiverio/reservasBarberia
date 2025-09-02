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
  
  const prevMonthBtn = document.getElementById('prev-month-btn');
  const nextMonthBtn = document.getElementById('next-month-btn');
  const currentMonthYearDisplay = document.getElementById('current-month-year');
  const calendarGrid = document.getElementById('calendar-grid');
  const selectedDateDisplay = document.getElementById('selected-date-display');
  const dailyReservationsList = document.getElementById('daily-reservations-list');

  // --- ESTADO DEL CALENDARIO ---
  let currentMonth = new Date().getMonth();
  let currentYear = new Date().getFullYear();
  let allReservations = {}; // Almacena todas las reservas del mes actual
  let selectedDate = null; // La fecha seleccionada en el calendario

  // --- LÓGICA DE AUTENTICACIÓN ---
  auth.onAuthStateChanged(user => {
    if (user) {
      loginView.style.display = 'none';
      adminView.style.display = 'block';
      renderCalendar(); // Renderiza el calendario al iniciar sesión
    } else {
      loginView.style.display = 'block';
      adminView.style.display = 'none';
    }
  });

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('admin-email').value;
    const password = document.getElementById('admin-password').value;
    loginError.textContent = '';

    try {
      await auth.signInWithEmailAndPassword(email, password);
    } catch (error) {
      console.error('Error de inicio de sesión:', error);
      loginError.textContent = 'Email o contraseña incorrectos.';
    }
  });

  logoutBtn.addEventListener('click', async () => {
    try {
      await auth.signOut();
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  });

  // --- LÓGICA DEL CALENDARIO ---

  prevMonthBtn.addEventListener('click', () => {
    currentMonth--;
    if (currentMonth < 0) {
      currentMonth = 11;
      currentYear--;
    }
    renderCalendar();
  });

  nextMonthBtn.addEventListener('click', () => {
    currentMonth++;
    if (currentMonth > 11) {
      currentMonth = 0;
      currentYear++;
    }
    renderCalendar();
  });

  async function renderCalendar() {
    currentMonthYearDisplay.textContent = new Date(currentYear, currentMonth).toLocaleString('es-ES', { month: 'long', year: 'numeric' });
    calendarGrid.innerHTML = '';

    const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    daysOfWeek.forEach(day => {
      const header = document.createElement('div');
      header.className = 'calendar-day-header';
      header.textContent = day;
      calendarGrid.appendChild(header);
    });

    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    const startDay = firstDayOfMonth.getDay(); // 0 for Sunday, 1 for Monday, etc.

    // Rellenar días del mes anterior
    for (let i = 0; i < startDay; i++) {
      const dayCell = document.createElement('div');
      dayCell.className = 'calendar-day other-month';
      calendarGrid.appendChild(dayCell);
    }

    // Obtener reservas para el mes
    await fetchReservationsForMonth(currentMonth + 1, currentYear); // currentMonth es 0-indexado

    // Rellenar días del mes actual
    for (let day = 1; day <= daysInMonth; day++) {
      const dayCell = document.createElement('div');
      dayCell.className = 'calendar-day current-month';
      dayCell.textContent = day;
      dayCell.dataset.date = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      const dateKey = dayCell.dataset.date;
      if (allReservations[dateKey] && allReservations[dateKey].length > 0) {
        dayCell.classList.add('has-reservations');
        const countSpan = document.createElement('span');
        countSpan.className = 'reservation-count';
        countSpan.textContent = `(${allReservations[dateKey].length})`;
        dayCell.appendChild(countSpan);
      }

      dayCell.addEventListener('click', () => selectDay(dayCell.dataset.date));
      calendarGrid.appendChild(dayCell);
    }

    // Seleccionar el día actual por defecto si es el mes actual
    const today = new Date();
    if (currentYear === today.getFullYear() && currentMonth === today.getMonth()) {
      const todayDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      selectDay(todayDate);
    }
  }

  async function fetchReservationsForMonth(month, year) {
    const user = auth.currentUser;
    if (!user) return; // No fetch if not logged in

    try {
      const idToken = await user.getIdToken();
      const response = await fetch('/.netlify/functions/get-reservations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ month, year })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Error al obtener las reservas del mes.');
      }

      // Organizar reservas por día
      allReservations = {};
      data.reservations.forEach(res => {
        if (!allReservations[res.date]) {
          allReservations[res.date] = [];
        }
        allReservations[res.date].push(res);
      });

    } catch (error) {
      console.error('Error fetching monthly reservations:', error);
      alert(`Error al cargar las reservas: ${error.message}`);
    }
  }

  function selectDay(date) {
    // Remover selección anterior
    if (selectedDate) {
      const prevSelectedCell = document.querySelector(`.calendar-day[data-date="${selectedDate}"]`);
      if (prevSelectedCell) prevSelectedCell.classList.remove('selected-day');
    }

    // Añadir nueva selección
    selectedDate = date;
    const currentSelectedCell = document.querySelector(`.calendar-day[data-date="${selectedDate}"]`);
    if (currentSelectedCell) currentSelectedCell.classList.add('selected-day');

    displayDailyReservations(date);
  }

  function displayDailyReservations(date) {
    selectedDateDisplay.textContent = new Date(date).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    dailyReservationsList.innerHTML = '';

    const reservationsForDay = allReservations[date] || [];

    if (reservationsForDay.length === 0) {
      dailyReservationsList.innerHTML = '<p>No hay reservas para este día.</p>';
      return;
    }

    reservationsForDay.sort((a, b) => a.time.localeCompare(b.time)); // Ordenar por hora

    reservationsForDay.forEach(res => {
      const item = document.createElement('div');
      item.className = 'reservation-item';
      const now = new Date();
      const appointmentTime = new Date(`${res.date}T${res.time}:00`);
      const hoursRemaining = (appointmentTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      const canCancel = hoursRemaining > 4 && res.status !== 'CANCELLED';

      item.innerHTML = `
        <p><strong>Hora:</strong> ${res.time}</p>
        <p><strong>Nombre:</strong> ${res.name}</p>
        <p><strong>Email:</strong> ${res.email}</p>
        <p><strong>Estado:</strong> ${res.status}</p>
        ${res.status === 'CANCELLED' && res.cancellationReason ? `<p><strong>Motivo Cancelación:</strong> ${res.cancellationReason}</p>` : ''}
        ${canCancel ? `<button class="btn btn-danger btn-sm cancel-admin-btn" data-id="${res.id}" data-name="${res.name}" data-email="${res.email}" data-date="${res.date}" data-time="${res.time}">Cancelar</button>` : ''}
      `;
      dailyReservationsList.appendChild(item);
    });

    // Añadir listeners a los botones de cancelar
    dailyReservationsList.querySelectorAll('.cancel-admin-btn').forEach(button => {
      button.addEventListener('click', handleAdminCancelClick);
    });
  }

  // --- LÓGICA DE CANCELACIÓN DESDE ADMIN ---
  async function handleAdminCancelClick(e) {
    const reservationId = e.target.dataset.id;
    const reservationName = e.target.dataset.name;
    const reservationEmail = e.target.dataset.email;
    const reservationDate = e.target.dataset.date;
    const reservationTime = e.target.dataset.time;

    const reason = prompt(`¿Por qué se cancela la reserva de ${reservationName} el ${reservationDate} a las ${reservationTime}?`);
    if (reason === null) return; // Si el usuario cancela el prompt

    if (!confirm(`¿Estás seguro de cancelar la reserva de ${reservationName} (${reservationId})?`)) {
      return;
    }

    try {
      const response = await fetch('/.netlify/functions/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: reservationId, reason: reason, email: reservationEmail, name: reservationName, date: reservationDate, time: reservationTime }) // Pasamos datos para el email
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Error al cancelar la reserva desde admin.');
      }

      alert('Reserva cancelada exitosamente.');
      renderCalendar(); // Volver a renderizar el calendario para actualizar el estado

    } catch (error) {
      console.error('Error al cancelar desde admin:', error);
      alert(`Error al cancelar: ${error.message}`);
    }
  }
});