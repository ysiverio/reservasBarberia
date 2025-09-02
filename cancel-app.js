document.addEventListener('DOMContentLoaded', () => {
  const confirmCancelBtn = document.getElementById('confirm-cancel-btn');
  const responseMessage = document.getElementById('response-message');
  const cancellationReasonInput = document.getElementById('cancellation-reason');

  // Obtener el ID de la reserva desde la URL
  const params = new URLSearchParams(window.location.search);
  const reservationId = params.get('id');

  if (!reservationId) {
    responseMessage.textContent = 'Error: No se ha proporcionado un ID de reserva.';
    responseMessage.className = 'text-danger';
    confirmCancelBtn.disabled = true;
    return;
  }

  confirmCancelBtn.addEventListener('click', async () => {
    confirmCancelBtn.disabled = true;
    responseMessage.textContent = 'Cancelando tu reserva...';
    responseMessage.className = 'text-info';

    const cancellationReason = cancellationReasonInput.value.trim();

    try {
      const response = await fetch('/.netlify/functions/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: reservationId, reason: cancellationReason })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Ocurrió un error al cancelar.');
      }

      responseMessage.textContent = '¡Tu reserva ha sido cancelada exitosamente! Redirigiendo a la página principal...';
      responseMessage.className = 'text-success';

      setTimeout(() => {
        window.location.href = '/'; // Redirige a la página de inicio
      }, 3000);

    } catch (error) {
      console.error('Error al cancelar:', error);
      responseMessage.textContent = `Error: ${error.message}`;
      responseMessage.className = 'text-danger';
      confirmCancelBtn.disabled = false; // Permitir reintentar si falla
    }
  });
});
