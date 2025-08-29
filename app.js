// Configuración de la API
const API_BASE = 'https://script.google.com/macros/s/AKfycbzoIOgiiX1DZTxcFUXlrHXMXlDh080jiRN1mJsWMhQCpnVm-9TFabnR7WOvzr94WiwtGQ/exec'; // Reemplazar con la URL del Web App de GAS

// Variables globales
let selectedTimeSlot = null;
let currentReservation = null;

// Elementos del DOM
const reservationForm = document.getElementById('reservationForm');
const searchBtn = document.getElementById('searchBtn');
const availabilityContainer = document.getElementById('availabilityContainer');
const timeSlots = document.getElementById('timeSlots');
const confirmationModal = document.getElementById('confirmationModal');
const modalOverlay = document.getElementById('modalOverlay');
const closeModal = document.getElementById('closeModal');
const cancelReservation = document.getElementById('cancelReservation');
const confirmReservation = document.getElementById('confirmReservation');
const reservationDetails = document.getElementById('reservationDetails');
const linkCancelacion = document.getElementById('linkCancelacion');
const cancelUrl = document.getElementById('cancelUrl');
const ctaWhatsapp = document.getElementById('ctaWhatsapp');

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    setupDatePicker();
});

function initializeApp() {
    // Verificar si hay fecha en la URL (para reprogramar)
    const urlParams = new URLSearchParams(window.location.search);
    const dateParam = urlParams.get('date');
    
    if (dateParam) {
        document.getElementById('date').value = dateParam;
        // Auto-buscar disponibilidad si hay fecha
        setTimeout(() => {
            handleFormSubmit();
        }, 500);
    }
}

function setupEventListeners() {
    // Formulario de reserva
    reservationForm.addEventListener('submit', handleFormSubmit);
    
    // Modal
    closeModal.addEventListener('click', closeConfirmationModal);
    modalOverlay.addEventListener('click', closeConfirmationModal);
    cancelReservation.addEventListener('click', closeConfirmationModal);
    confirmReservation.addEventListener('click', handleConfirmReservation);
    
    // Escape key para cerrar modal
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && confirmationModal.style.display !== 'none') {
            closeConfirmationModal();
        }
    });
}

function setupDatePicker() {
    const dateInput = document.getElementById('date');
    
    // Establecer fecha mínima (hoy)
    const today = new Date().toISOString().split('T')[0];
    dateInput.min = today;
    
    // Bloquear domingos y feriados
    dateInput.addEventListener('change', function() {
        const selectedDate = new Date(this.value);
        const dayOfWeek = selectedDate.getDay();
        
        // Verificar si es domingo
        if (dayOfWeek === 0) {
            showMessage('Los domingos no se realizan reservas. Por favor selecciona otro día.', 'error');
            this.value = '';
            return;
        }
        
        // Verificar si es feriado (lista simplificada)
        const feriados = ['2025-01-01', '2025-04-18', '2025-05-01', '2025-06-19', '2025-07-18', '2025-08-25', '2025-12-25'];
        if (feriados.includes(this.value)) {
            showMessage('Esta fecha es un feriado. Por favor selecciona otro día.', 'error');
            this.value = '';
            return;
        }
    });
}

async function handleFormSubmit(e) {
    if (e) e.preventDefault();
    
    // Validar honeypot
    const companyField = document.getElementById('company');
    if (companyField.value.trim() !== '') {
        console.log('Spam detectado');
        return;
    }
    
    // Validar campos
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const date = document.getElementById('date').value;
    
    if (!name || !email || !date) {
        showMessage('Por favor completa todos los campos requeridos.', 'error');
        return;
    }
    
    if (!isValidEmail(email)) {
        showMessage('Por favor ingresa un email válido.', 'error');
        return;
    }
    
    if (!isValidDate(date)) {
        showMessage('Por favor selecciona una fecha válida.', 'error');
        return;
    }
    
    // Buscar disponibilidad
    await fetchAvailability(date);
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function isValidDate(date) {
    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return selectedDate >= today;
}

async function fetchAvailability(date) {
    try {
        searchBtn.disabled = true;
        searchBtn.textContent = 'Buscando...';
        
        const response = await fetch(`${API_BASE}?action=availability&date=${date}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            renderTimeSlots(data.availableSlots, date);
        } else {
            showMessage(data.message || 'Error al buscar disponibilidad.', 'error');
        }
    } catch (error) {
        console.error('Error fetching availability:', error);
        showMessage('Error de conexión. Por favor intenta nuevamente.', 'error');
    } finally {
        searchBtn.disabled = false;
        searchBtn.textContent = 'Buscar disponibilidad';
    }
}

function renderTimeSlots(slots, date) {
    if (!slots || slots.length === 0) {
        showMessage('No hay horarios disponibles para esta fecha.', 'error');
        availabilityContainer.style.display = 'none';
        return;
    }
    
    timeSlots.innerHTML = '';
    
    slots.forEach(slot => {
        const slotElement = document.createElement('div');
        slotElement.className = 'time-slot';
        slotElement.textContent = slot;
        slotElement.addEventListener('click', () => selectTimeSlot(slot, date));
        timeSlots.appendChild(slotElement);
    });
    
    availabilityContainer.style.display = 'block';
    
    // Scroll suave al contenedor
    availabilityContainer.scrollIntoView({ behavior: 'smooth' });
}

function selectTimeSlot(time, date) {
    // Remover selección previa
    document.querySelectorAll('.time-slot').forEach(slot => {
        slot.classList.remove('selected');
    });
    
    // Seleccionar nuevo slot
    event.target.classList.add('selected');
    selectedTimeSlot = { time, date };
    
    // Mostrar modal de confirmación
    showConfirmationModal();
}

function showConfirmationModal() {
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    
    const reservationInfo = {
        name,
        email,
        date: selectedTimeSlot.date,
        time: selectedTimeSlot.time
    };
    
    currentReservation = reservationInfo;
    
    // Renderizar detalles en el modal
    reservationDetails.innerHTML = `
        <div style="text-align: center; margin-bottom: 20px;">
            <h4>Detalles de la reserva</h4>
        </div>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <p><strong>Nombre:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Fecha:</strong> ${formatDate(selectedTimeSlot.date)}</p>
            <p><strong>Hora:</strong> ${selectedTimeSlot.time}</p>
        </div>
        <p style="color: #666; font-size: 14px;">
            Al confirmar, se creará tu reserva y recibirás un link de cancelación.
        </p>
    `;
    
    confirmationModal.style.display = 'block';
    modalOverlay.style.display = 'block';
}

function closeConfirmationModal() {
    confirmationModal.style.display = 'none';
    modalOverlay.style.display = 'none';
    selectedTimeSlot = null;
    currentReservation = null;
}

async function handleConfirmReservation() {
    if (!currentReservation) return;
    
    try {
        confirmReservation.disabled = true;
        confirmReservation.textContent = 'Reservando...';
        
        const response = await fetch(`${API_BASE}?action=reserve`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(currentReservation)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            closeConfirmationModal();
            showSuccessReservation(data.cancelUrl);
        } else {
            showMessage(data.message || 'Error al crear la reserva.', 'error');
        }
    } catch (error) {
        console.error('Error creating reservation:', error);
        showMessage('Error de conexión. Por favor intenta nuevamente.', 'error');
    } finally {
        confirmReservation.disabled = false;
        confirmReservation.textContent = 'Confirmar reserva';
    }
}

function showSuccessReservation(cancelUrl) {
    // Limpiar formulario
    reservationForm.reset();
    availabilityContainer.style.display = 'none';
    
    // Mostrar mensaje de éxito
    showMessage('¡Reserva creada exitosamente! Revisa tu email para confirmar.', 'success');
    
    // Mostrar link de cancelación
    cancelUrl.href = cancelUrl;
    cancelUrl.textContent = cancelUrl;
    linkCancelacion.style.display = 'block';
    
    // Mostrar CTA WhatsApp
    ctaWhatsapp.style.display = 'block';
    
    // Scroll al link de cancelación
    linkCancelacion.scrollIntoView({ behavior: 'smooth' });
}

function showMessage(message, type = 'info') {
    // Remover mensajes previos
    const existingMessages = document.querySelectorAll('.message');
    existingMessages.forEach(msg => msg.remove());
    
    // Crear nuevo mensaje
    const messageElement = document.createElement('div');
    messageElement.className = `message ${type}`;
    messageElement.textContent = message;
    
    // Insertar después del header
    const header = document.querySelector('.header');
    header.parentNode.insertBefore(messageElement, header.nextSibling);
    
    // Auto-remover después de 5 segundos
    setTimeout(() => {
        if (messageElement.parentNode) {
            messageElement.remove();
        }
    }, 5000);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Función para manejar errores de red
function handleNetworkError() {
    showMessage('Error de conexión. Verifica tu conexión a internet e intenta nuevamente.', 'error');
}

// Interceptor global para errores de red
window.addEventListener('online', () => {
    console.log('Conexión restaurada');
});

window.addEventListener('offline', () => {
    handleNetworkError();
});
