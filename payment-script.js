document.addEventListener('DOMContentLoaded', () => {
    // --- 1. LEER Y MOSTRAR DATOS DE LA ORDEN ---
    const datosOrdenGuardada = localStorage.getItem('ordenParaPago');
    
    if (datosOrdenGuardada) {
        const orden = JSON.parse(datosOrdenGuardada);
        console.log("Orden recibida para pago:", orden);

        // Mostrar el total en el elemento correspondiente
        const paymentTotalPriceEl = document.getElementById('payment-total-price');
        if (paymentTotalPriceEl) {
            paymentTotalPriceEl.textContent = formatearMoneda(orden.total);
        }

        // Adicional: Renderizar un resumen simple de la orden
        const compactSummaryEl = document.getElementById('compact-summary-items');
        if (compactSummaryEl) {
            compactSummaryEl.innerHTML = ''; // Limpiar contenido previo
            orden.items.forEach(item => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'd-flex justify-content-between small';
                itemDiv.innerHTML = `<span>${item.cantidad}x ${item.nombre}</span> <span>${formatearMoneda(item.precio * item.cantidad)}</span>`;
                compactSummaryEl.appendChild(itemDiv);
            });
        }

    } else {
        console.error("No se encontraron datos de la orden para el pago.");
        // Opcional: deshabilitar el botón de pago si no hay orden
        const btnConfirmarPago = document.getElementById('btn-confirmar-pago-final');
        if (btnConfirmarPago) btnConfirmarPago.disabled = true;
    }

    // --- 2. CONFIGURAR EL BOTÓN DE PAGO ---
    const btnConfirmarPago = document.getElementById('btn-confirmar-pago-final');
    if (btnConfirmarPago) {
        btnConfirmarPago.addEventListener('click', () => {
            const datosOriginales = localStorage.getItem('ordenParaPago');
            if (!datosOriginales) {
                alert("Error: No se puede proceder al pago sin una orden activa.");
                return;
            }

            // --- AJUSTE: Capturar método de pago y guardarlo ---
            const metodoActivo = document.querySelector('.payment-option-item.active');
            const metodoSeleccionado = metodoActivo ? metodoActivo.dataset.method : 'efectivo'; // Default a efectivo
            
            const ordenConPago = JSON.parse(datosOriginales);
            ordenConPago.metodoPago = metodoSeleccionado; // Añadir el método a la orden
            
            localStorage.setItem('ordenParaPago', JSON.stringify(ordenConPago));

            console.log("Pago confirmado. Redirigiendo a la pantalla de recibo...");
            window.location.href = 'receipt.html';
        });
    }

    // --- LÓGICA PARA SELECCIÓN VISUAL DEL MÉTODO DE PAGO ---
    const paymentOptions = document.querySelectorAll('.payment-option-item');
    paymentOptions.forEach(option => {
        option.addEventListener('click', (e) => {
            e.preventDefault();
            paymentOptions.forEach(opt => opt.classList.remove('active'));
            option.classList.add('active');
        });
    });

});

/**
 * Formatea un número como moneda colombiana (COP).
 * @param {number} valor El número a formatear.
 * @returns {string} El valor formateado como moneda.
 */
function formatearMoneda(valor) {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(valor);
}