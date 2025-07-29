document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENTOS DEL DOM ---
    const successfulPaymentTotalEl = document.getElementById('successful-payment-total');
    const receiptPreviewEl = document.getElementById('receipt-preview');
    const printBtn = document.getElementById('print-receipt-btn');

    // --- DATOS Y RENDERIZADO ---
    const ordenGuardada = localStorage.getItem('ordenParaPago');

    if (!ordenGuardada) {
        receiptPreviewEl.innerHTML = '<p class="text-danger">Error: No se encontró la información de la orden.</p>';
        return;
    }

    const orden = JSON.parse(ordenGuardada);
    renderizarRecibo(orden);

    function renderizarRecibo(orden) {
        const subtotal = orden.total / 1.19;
        const iva = orden.total - subtotal;
        successfulPaymentTotalEl.textContent = formatearMoneda(orden.total);

        const itemsHtml = orden.items.map(item => `
            <li>
                <span>${item.cantidad}x ${item.nombre}</span>
                <span>${formatearMoneda(item.precio * item.cantidad)}</span>
            </li>
        `).join('');
        
        const metodoPago = orden.metodoPago || 'efectivo';
        let desglosePagoHtml = '';
        if (metodoPago === 'efectivo') {
            desglosePagoHtml = `<li><span>Efectivo:</span><span>${formatearMoneda(orden.total)}</span></li>`;
        } // ... (otras opciones de pago)

        // ===== AJUSTES REALIZADOS EN ESTE BLOQUE =====
        receiptPreviewEl.innerHTML = `
            <div class="text-center mb-4">
                <h5 class="fw-bold mb-1">FARMACIA LILU</h5>
                <p class="mb-0">DIRECCION LAGO PEYPUS 123 COL. ANAHUAC</p>
                <p class="mb-0">(55)5513343994</p>
            </div>
            
            <p>TICKET: SALE-001-${Math.floor(Date.now() / 1000)}</p>
            <p>FECHA: ${new Date().toLocaleString('es-CO')}</p>
            <p>ATENDIDO POR: Cajero Principal</p>
            
            <ul class="item-list">${itemsHtml}</ul>
            
            <ul class="totals-list">
                <li><span>Subtotal</span><span>${formatearMoneda(subtotal)}</span></li>
                <li><span>IVA 19%</span><span>${formatearMoneda(iva)}</span></li>
                <li><strong>Total</strong><strong>${formatearMoneda(orden.total)}</strong></li>
            </ul>

            <ul class="totals-list">${desglosePagoHtml}</ul>

            <div class="text-center mt-4">
                <p class="small mb-1">¿Necesita factura?</p>
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=https://jungle-one.sistoo.com/ticket" alt="QR Code" class="qr-code" style="margin: 0 auto 15px auto;">
            </div>

            <p class="text-center small">¡Gracias por su compra en Farmacia Lilu!</p>
            <p class="text-center small" style="font-size: 0.7rem; color: #6c757d;">Powered by Jungle One 2025</p>
        `;
    }

    if (printBtn) {
        printBtn.addEventListener('click', () => {
            window.print();
        });
    }

    function formatearMoneda(valor) {
        return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(valor);
    }
});