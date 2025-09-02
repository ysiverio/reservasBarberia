document.addEventListener('DOMContentLoaded', async () => {
  const reservationId = new URLSearchParams(window.location.search).get('id');
  const originalDetailsContainer = document.getElementById('original-reservation-details');
  const rescheduleForm = document.getElementById('rescheduleForm');
  const rescheduleDateInput = document.getElementById('reschedule-date');
  const rescheduleTimeSlotsContainer = document.getElementById('reschedule-time-slots-container');
  const confirmRescheduleBtn = document.getElementById('confirmRescheduleBtn');
  const statusMessageDiv = document.getElementById('reschedule-status-message');

  let originalReservation = null;

  if (!reservationId) {
    statusMessageDiv.textContent = 'Error: ID de reserva no proporcionado.';
    statusMessageDiv.className = 'text-danger';
    rescheduleForm.style.display = 'none';
    return;
  }

  // --- Cargar detalles de la reserva original ---
  try {
    const response = await fetch(`/.netlify/functions/get-reservation-details?id=${reservationId}`);
    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'No se pudo cargar la reserva original.');
    }

    originalReservation = data.reservation;
    document.getElementById('original-name').textContent = originalReservation.name;
    document.getElementById('original-email').textContent = originalReservation.email;
    document.getElementById('original-date').textContent = originalReservation.date;
    document.getElementById('original-time').textContent = originalReservation.time;

    // Guardar datos para el envío
    document.getElementById('reservation-id').value = originalReservation.id;
    document.getElementById('reschedule-name').value = originalReservation.name;
    document.getElementById('reschedule-email').value = originalReservation.email;

  } catch (error) {
    console.error('Error cargando reserva original:', error);
    statusMessageDiv.textContent = `Error: ${error.message}`;
    statusMessageDiv.className = 'text-danger';
    rescheduleForm.style.display = 'none';
    return;
  }

  // --- Lógica de selección de nueva fecha y hora ---
  rescheduleDateInput.addEventListener('change', async () => {
    const date = rescheduleDateInput.value;
    if (!date) {
      rescheduleTimeSlotsContainer.innerHTML = '';
      return;
    }

    statusMessageDiv.textContent = 'Buscando horarios...';
    statusMessageDiv.className = 'text-info';
    rescheduleTimeSlotsContainer.innerHTML = '';

    try {
      const response = await fetch(`/.netlify/functions/availability?date=${date}`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'No se pudo obtener la disponibilidad.');
      }

      displayTimeSlots(data.availableSlots);
      statusMessageDiv.textContent = ''; // Limpiar mensaje de carga

    } catch (error) {
      console.error('Error fetching availability:', error);
      statusMessageDiv.textContent = 'Error al cargar la disponibilidad. Inténtalo de nuevo.';
      statusMessageDiv.className = 'text-danger';
    }
  });

  function displayTimeSlots(slots) {
    rescheduleTimeSlotsContainer.innerHTML = '';
    if (slots.length === 0) {
      rescheduleTimeSlotsContainer.innerHTML = '<p>No hay horarios disponibles para este día.</p>';
    } else {
      slots.forEach(slot => {
        const slotButton = document.createElement('button');
        slotButton.type = 'button';
        slotButton.className = 'btn btn-time-slot';
        slotButton.textContent = slot;
        slotButton.dataset.time = slot;
        slotButton.addEventListener('click', () => {
          // Deseleccionar todos los demás botones
          rescheduleTimeSlotsContainer.querySelectorAll('.btn-time-slot').forEach(btn => btn.classList.remove('selected'));
          // Seleccionar este botón
          slotButton.classList.add('selected');
        });
        rescheduleTimeSlotsContainer.appendChild(slotButton);
      });
    }
  }

  // --- Lógica de envío de reagendamiento ---
  rescheduleForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const newDate = rescheduleDateInput.value;
    const selectedTimeButton = rescheduleTimeSlotsContainer.querySelector('.btn-time-slot.selected');
    const newTime = selectedTimeButton ? selectedTimeButton.dataset.time : null;

    if (!newDate || !newTime) {
      statusMessageDiv.textContent = 'Por favor, selecciona una nueva fecha y hora.';
      statusMessageDiv.className = 'text-danger';
      return;
    }

    statusMessageDiv.textContent = 'Confirmando reagendamiento...';
    statusMessageDiv.className = 'text-info';
    confirmRescheduleBtn.disabled = true;

    try {
      const response = await fetch('/.netlify/functions/reschedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: originalReservation.id,
          name: originalReservation.name,
          email: originalReservation.email,
          oldDate: originalReservation.date,
          oldTime: originalReservation.time,
          newDate: newDate,
          newTime: newTime
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Error al reagendar la reserva.');
      }

      statusMessageDiv.textContent = '¡Reserva reagendada exitosamente! Redirigiendo...';
      statusMessageDiv.className = 'text-success';
      setTimeout(() => { window.location.href = '/'; }, 3000);

    } catch (error) {
      console.error('Error al reagendar:', error);
      statusMessageDiv.textContent = `Error: ${error.message}`;
      statusMessageDiv.className = 'text-danger';
      confirmRescheduleBtn.disabled = false;
    }
  });
});
