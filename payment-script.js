document.addEventListener('DOMContentLoaded', () => {
    const datosOrdenGuardada = localStorage.getItem('ordenParaPago');
    if (datosOrdenGuardada) {
        const orden = JSON.parse(datosOrdenGuardada);
        console.log("Orden recibida para pago:", orden); // Para depuración

        // Aquí puedes tomar orden.total y mostrarlo en #payment-total-price
        const paymentTotalPriceEl = document.getElementById('payment-total-price');
        if (paymentTotalPriceEl) {
            paymentTotalPriceEl.textContent = formatearMoneda(orden.total); // Necesitarías la función formatearMoneda aquí también
        }

        // También podrías renderizar el resumen de la orden.items en #payment-order-summary-area

        // No olvides limpiar el localStorage después de usar los datos si es necesario
        // localStorage.removeItem('ordenParaPago');
    } else {
        console.log("No se encontraron datos de la orden para el pago.");
        // Manejar el caso donde no hay datos, quizás redirigir de vuelta o mostrar un error.
    }
});

// Deberías copiar la función formatearMoneda de tu script.js original o tenerla en un archivo común
function formatearMoneda(valor) {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(valor);
}