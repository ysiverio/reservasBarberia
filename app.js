document.addEventListener('DOMContentLoaded', () => {
  // --- ELEMENTOS DEL DOM ---
  const reservationForm = document.getElementById('reservationForm');
  const dateInput = document.getElementById('date');
  const availabilityContainer = document.getElementById('availabilityContainer');
  const timeSlotsContainer = document.getElementById('timeSlots');
  const confirmationModal = document.getElementById('confirmationModal');
  const modalOverlay = document.getElementById('modalOverlay');
  const reservationDetails = document.getElementById('reservationDetails');
  const confirmReservationBtn = document.getElementById('confirmReservation');
  const cancelReservationBtn = document.getElementById('cancelReservation');
  const closeModalBtn = document.getElementById('closeModal');
  const finalConfirmationContainer = document.getElementById('linkCancelacion'); // Usamos este contenedor para el mensaje final

  let currentReservation = {};

  // --- LÓGICA PRINCIPAL ---

  // 1. Buscar disponibilidad al enviar el formulario inicial
  reservationForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const date = dateInput.value;

    if (!date) {
      alert('Por favor, selecciona una fecha.');
      return;
    }

    showLoading();
    
    try {
      const response = await fetch(`/.netlify/functions/availability?date=${date}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'No se pudo obtener la disponibilidad.');
      }

      displayTimeSlots(data.availableSlots);

    } catch (error) {
      console.error('Error fetching availability:', error);
      displayError('No se pudo cargar la disponibilidad. Inténtalo de nuevo.');
    }
  });

  // 2. Mostrar los horarios disponibles
  function displayTimeSlots(slots) {
    timeSlotsContainer.innerHTML = ''; // Limpiar contenedor
    if (slots.length === 0) {
      timeSlotsContainer.innerHTML = '<p>No hay horarios disponibles para este día.</p>';
    } else {
      slots.forEach(slot => {
        const slotButton = document.createElement('button');
        slotButton.type = 'button';
        slotButton.className = 'btn btn-time-slot';
        slotButton.textContent = slot;
        slotButton.dataset.time = slot;
        slotButton.addEventListener('click', handleTimeSlotClick);
        timeSlotsContainer.appendChild(slotButton);
      });
    }
    availabilityContainer.style.display = 'block';
  }

  // 3. Manejar clic en un horario
  function handleTimeSlotClick(e) {
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;

    if (!name || !email) {
      alert('Por favor, completa tu nombre y email antes de elegir un horario.');
      return;
    }

    currentReservation = {
      name,
      email,
      date: dateInput.value,
      time: e.target.dataset.time
    };

    reservationDetails.innerHTML = `
      <p><strong>Nombre:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Fecha:</strong> ${dateInput.value}</p>
      <p><strong>Hora:</strong> ${e.target.dataset.time}</p>
    `;
    showModal();
  }

  // 4. Confirmar la reserva final
  confirmReservationBtn.addEventListener('click', async () => {
    hideModal();
    showLoading('Confirmando tu reserva...');

    try {
      const response = await fetch('/.netlify/functions/reserve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentReservation)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al confirmar la reserva.');
      }

      // Pasamos el ID de la reserva a la función de confirmación
      displayFinalConfirmation(data.reservationId);

    } catch (error) {
      console.error('Error confirming reservation:', error);
      displayError('Hubo un error al confirmar tu reserva. Por favor, intenta de nuevo.');
    }
  });

  // --- FUNCIONES DE UI ---
  function showLoading(message = 'Buscando horarios...') {
    availabilityContainer.style.display = 'block';
    timeSlotsContainer.innerHTML = `<p>${message}</p>`;
  }

  function displayError(message) {
    timeSlotsContainer.innerHTML = `<p class="text-danger">${message}</p>`;
  }

  function displayFinalConfirmation(reservationId) {
    const finalConfirmationContainer = document.getElementById('linkCancelacion');
    const cancelUrlLink = document.getElementById('cancelUrl');
    const ctaWhatsappContainer = document.getElementById('ctaWhatsapp');

    const cancelLink = `${window.location.origin}/cancel.html?id=${reservationId}`;
    
    cancelUrlLink.href = cancelLink;
    cancelUrlLink.textContent = cancelLink;

    reservationForm.style.display = 'none';
    availabilityContainer.style.display = 'none';
    finalConfirmationContainer.style.display = 'block';
    ctaWhatsappContainer.style.display = 'block'; // Mostramos el CTA de WhatsApp
  }

  function showModal() {
    confirmationModal.style.display = 'block';
    modalOverlay.style.display = 'block';
  }

  function hideModal() {
    confirmationModal.style.display = 'none';
    modalOverlay.style.display = 'none';
  }

  // Listeners para cerrar el modal
  cancelReservationBtn.addEventListener('click', hideModal);
  closeModalBtn.addEventListener('click', hideModal);
  modalOverlay.addEventListener('click', hideModal);
});