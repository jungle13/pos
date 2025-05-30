document.addEventListener('DOMContentLoaded', () => {

    // --- ESTADO GLOBAL DE LA APLICACIÓN ---
    let carrito = [];
    let productos = [];
    let clientes = [];
    let itemSeleccionadoId = null;
    let clienteSeleccionadoId = 'final'; // Cliente final por defecto
    let modoTeclado = 'cantidad'; // Modos: 'cantidad', 'precio', 'pago-efectivo', 'pago-tarjeta', 'pago-transferencia'
    let bufferTeclado = '';
    let scanningActive = false;
    let currentOrderTotal = 0; // Almacena el total de la orden actual que se está pagando

    // --- SELECTORES DE ELEMENTOS DEL DOM (PRINCIPALES) ---
    const productArea = document.getElementById('product-area');
    const cartArea = document.getElementById('cart-area');
    const totalPriceEl = document.getElementById('total-price');
    const keypadContainer = document.getElementById('keypad-container');
    const btnCantidad = document.getElementById('btn-cantidad');
    const btnPrecio = document.getElementById('btn-precio');
    
    const customerSelectModalElement = document.getElementById('customer-select-modal');
    let customerModal = customerSelectModalElement ? new bootstrap.Modal(customerSelectModalElement) : null;
    
    const modalClientList = document.getElementById('modal-client-list');
    const customerSelectorBtn = document.getElementById('customer-selector-btn');
    const scanToggleButton = document.getElementById('btn-toggle-scan');
    const scanToggleButtonText = scanToggleButton ? scanToggleButton.querySelector('.button-text') : null;
    const btnFinalizarPagoOriginal = document.getElementById('btn-finalizar-pago');

    // --- SELECTORES PARA EL MODAL DE PAGO ---
    const paymentProcessModalEl = document.getElementById('paymentProcessModal');
    let paymentModalInstance = paymentProcessModalEl ? new bootstrap.Modal(paymentProcessModalEl) : null;
    
    const modalOrderTotalEl = document.getElementById('modal-payment-total-price'); // Total de la orden en el modal
    const modalOrderSummaryItemsEl = document.getElementById('modal-order-summary-items');
    const modalPaymentSubtotalEl = document.getElementById('modal-payment-subtotal');
    const modalPaymentIvaEl = document.getElementById('modal-payment-iva');
    const modalPaymentGrandTotalEl = document.getElementById('modal-payment-grand-total'); // Total en el resumen
    const btnModalConfirmarPago = document.getElementById('btn-modal-confirmar-pago');

    // Selectores para los campos de monto de los métodos de pago
    const paymentCashAmountInput = document.getElementById('payment-cash-amount');
    const paymentCardAmountInput = document.getElementById('payment-card-amount');
    const paymentTransferAmountInput = document.getElementById('payment-transfer-amount');
    const paymentCashChangeEl = document.getElementById('payment-cash-change');
    const paymentCoveredAmountEl = document.getElementById('payment-covered-amount');
    const paymentRemainingAmountEl = document.getElementById('payment-remaining-amount');
    const paymentRemainingLabelEl = document.getElementById('payment-remaining-label');

    // --- FUNCIONES AUXILIARES ---
    function formatearMoneda(valor) {
        return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(valor);
    }

    // --- LÓGICA DE PAGOS EN MODAL ---
    function actualizarCalculosDePago() {
        if (!paymentCashAmountInput || !paymentCardAmountInput || !paymentTransferAmountInput || 
            !paymentCashChangeEl || !modalOrderTotalEl || !paymentCoveredAmountEl || 
            !paymentRemainingAmountEl || !paymentRemainingLabelEl) {
            console.warn("Faltan elementos del DOM para actualizar cálculos de pago.");
            return;
        }

        const cashAmount = parseFloat(paymentCashAmountInput.value) || 0;
        const cardAmount = parseFloat(paymentCardAmountInput.value) || 0;
        const transferAmount = parseFloat(paymentTransferAmountInput.value) || 0;

        const totalPaid = cashAmount + cardAmount + transferAmount;
        let remainingOrChange = currentOrderTotal - totalPaid;

        paymentCoveredAmountEl.textContent = formatearMoneda(totalPaid);

        if (remainingOrChange > 0.01) { // Se usa un pequeño umbral para problemas de flotantes
            paymentRemainingAmountEl.textContent = formatearMoneda(remainingOrChange);
            paymentRemainingAmountEl.classList.remove('text-success');
            paymentRemainingAmountEl.classList.add('text-danger');
            paymentRemainingLabelEl.textContent = "Faltante por Pagar:";
        } else if (remainingOrChange < -0.01) {
            paymentRemainingAmountEl.textContent = formatearMoneda(Math.abs(remainingOrChange));
            paymentRemainingAmountEl.classList.remove('text-danger');
            paymentRemainingAmountEl.classList.add('text-success');
            paymentRemainingLabelEl.textContent = "Cambio a Entregar:";
        } else {
            paymentRemainingAmountEl.textContent = formatearMoneda(0);
            paymentRemainingAmountEl.classList.remove('text-danger', 'text-success');
            paymentRemainingLabelEl.textContent = "Saldo:";
        }
        
        // Cambio específico para efectivo
        const cashChange = cashAmount - (currentOrderTotal - cardAmount - transferAmount);
        paymentCashChangeEl.textContent = formatearMoneda(cashChange > 0 ? cashChange : 0);
    }


    function cargarDatosOrdenEnModal() {
        console.log("Ejecutando cargarDatosOrdenEnModal..."); 

        if (!modalOrderSummaryItemsEl || !modalOrderTotalEl || !modalPaymentSubtotalEl || !modalPaymentIvaEl || !modalPaymentGrandTotalEl) {
            console.error("Error: Elementos del DOM del modal de pago no encontrados. Verifica los IDs en tu HTML.");
            if(modalOrderTotalEl) modalOrderTotalEl.textContent = formatearMoneda(0);
            if(modalOrderSummaryItemsEl) modalOrderSummaryItemsEl.innerHTML = '<p class="text-muted small p-3">Error al cargar resumen.</p>';
            if(modalPaymentSubtotalEl) modalPaymentSubtotalEl.textContent = formatearMoneda(0);
            if(modalPaymentIvaEl) modalPaymentIvaEl.textContent = formatearMoneda(0);
            if(modalPaymentGrandTotalEl) modalPaymentGrandTotalEl.textContent = formatearMoneda(0);
            return;
        }

        const datosOrdenGuardada = localStorage.getItem('ordenParaPago');

        if (datosOrdenGuardada) {
            const orden = JSON.parse(datosOrdenGuardada);
            console.log("Orden recuperada de localStorage para el modal:", orden);

            let subtotalCalculado = orden.total || 0; // El total guardado es el subtotal
            modalOrderSummaryItemsEl.innerHTML = ''; 

            if (orden.items && orden.items.length > 0) {
                const ul = document.createElement('ul');
                ul.className = 'list-group list-group-flush';
                orden.items.forEach(item => {
                    // ... (código para crear y añadir 'li' al 'ul' como lo tenías)
                    const li = document.createElement('li');
                    li.className = 'list-group-item d-flex justify-content-between align-items-center';
                    const itemDetailsDiv = document.createElement('div');
                    const itemName = document.createElement('div');
                    itemName.className = 'fw-bold';
                    itemName.textContent = `${item.nombre || 'Producto Desconocido'} (${item.presentacion || 'Und'})`;
                    const itemPriceQuant = document.createElement('small');
                    itemPriceQuant.className = 'text-muted';
                    itemPriceQuant.textContent = `${item.cantidad || 0} x ${formatearMoneda(item.precio || 0)}`;
                    itemDetailsDiv.appendChild(itemName);
                    itemDetailsDiv.appendChild(itemPriceQuant);
                    const itemTotalSpan = document.createElement('span');
                    itemTotalSpan.className = 'fw-medium';
                    itemTotalSpan.textContent = formatearMoneda((item.cantidad || 0) * (item.precio || 0));
                    li.appendChild(itemDetailsDiv);
                    li.appendChild(itemTotalSpan);
                    ul.appendChild(li);
                });
                modalOrderSummaryItemsEl.appendChild(ul);
            } else {
                modalOrderSummaryItemsEl.innerHTML = '<p class="text-muted small p-3">No hay ítems en esta orden.</p>';
            }

            modalPaymentSubtotalEl.textContent = formatearMoneda(subtotalCalculado);
            const ivaEstimado = subtotalCalculado * 0.19; 
            modalPaymentIvaEl.textContent = formatearMoneda(ivaEstimado);
            const granTotalConIVA = subtotalCalculado + ivaEstimado;
            modalPaymentGrandTotalEl.textContent = formatearMoneda(granTotalConIVA);
            
            currentOrderTotal = granTotalConIVA; // Guardar el total CON IVA para cálculos de pago
            modalOrderTotalEl.textContent = formatearMoneda(currentOrderTotal); // Total grande de la orden
            
            if(paymentCashAmountInput) paymentCashAmountInput.value = currentOrderTotal.toFixed(0);
            if(paymentCardAmountInput) paymentCardAmountInput.value = '';
            if(paymentTransferAmountInput) paymentTransferAmountInput.value = '';
            
            actualizarCalculosDePago();
        } else {
            console.warn("No se encontraron datos de 'ordenParaPago' en localStorage.");
            currentOrderTotal = 0;
            if(modalOrderTotalEl) modalOrderTotalEl.textContent = formatearMoneda(0);
            if(modalOrderSummaryItemsEl) modalOrderSummaryItemsEl.innerHTML = '<p class="text-muted small p-3">No hay datos de orden para mostrar.</p>';
            if(modalPaymentSubtotalEl) modalPaymentSubtotalEl.textContent = formatearMoneda(0);
            if(modalPaymentIvaEl) modalPaymentIvaEl.textContent = formatearMoneda(0);
            if(modalPaymentGrandTotalEl) modalPaymentGrandTotalEl.textContent = formatearMoneda(0);
            actualizarCalculosDePago(); // Asegura que los campos de pago reflejen $0
        }
    }

    // --- LÓGICA DE CLIENTES, PRODUCTOS, CARRITO, TECLADO (sin cambios mayores aquí, solo verificaciones) ---
    function renderizarClientes() {
        if (!modalClientList) { console.warn("Elemento modalClientList no encontrado"); return; }
        modalClientList.innerHTML = '';
        const listGroup = document.createElement('ul');
        listGroup.className = 'list-group list-group-flush';
        const defaultOption = document.createElement('li');
        defaultOption.className = 'list-group-item list-group-item-action';
        defaultOption.innerHTML = `<div class="client-name">Cliente Final</div>`;
        defaultOption.addEventListener('click', () => seleccionarCliente('final'));
        listGroup.appendChild(defaultOption);
        clientes.forEach(cliente => {
            const li = document.createElement('li');
            li.className = 'list-group-item list-group-item-action';
            li.dataset.clienteId = cliente.id;
            li.innerHTML = `
                <div class="client-name">${cliente.nombre} <span class="badge bg-primary-subtle text-primary-emphasis rounded-pill">${cliente.tipo}</span></div>
                <div class="client-details">
                    <i class="bi bi-envelope-fill"></i> ${cliente.correo} | <i class="bi bi-telephone-fill"></i> ${cliente.telefono}
                </div>
            `;
            li.addEventListener('click', () => seleccionarCliente(cliente.id));
            listGroup.appendChild(li);
        });
        modalClientList.appendChild(listGroup);
    }

    function seleccionarCliente(clienteId) {
        clienteSeleccionadoId = clienteId;
        if (!customerSelectorBtn) { console.warn("Elemento customerSelectorBtn no encontrado"); return; }
        if (clienteId === 'final') {
            customerSelectorBtn.innerHTML = `<span><i class="bi bi-person-circle me-2"></i>Cliente Final</span>`;
        } else {
            const cliente = clientes.find(c => c.id === clienteId);
            if (cliente) {
                customerSelectorBtn.innerHTML = `<span><i class="bi bi-person-fill me-2"></i>${cliente.nombre}</span>`;
            }
        }
        if (customerModal) {
            customerModal.hide();
        }
        console.log(`Cliente seleccionado para la orden: ${clienteSeleccionadoId}`);
    }

    function renderizarProductos(listaDeProductos) {
        if (!productArea) {
            console.error("El elemento #product-area no fue encontrado en el DOM.");
            return;
        }
        productArea.innerHTML = '';
        if (!listaDeProductos || listaDeProductos.length === 0) {
            if (!scanningActive) {
                // productArea.innerHTML = '<p class="text-muted text-center p-5">No hay productos para mostrar.</p>';
            }
            return;
        }
        listaDeProductos.forEach(producto => {
            const card = document.createElement('div');
            card.classList.add('card');
            card.dataset.productoId = producto.id;
            card.innerHTML = `
                <div class="quantity-badge">0</div>
                <div class="product-icon-placeholder"><i class="bi bi-image"></i></div>
                <div class="card-body">
                    <h5 class="card-title">${producto.nombre}</h5>
                    <p class="card-text">${formatearMoneda(producto.precio)}</p>
                </div>
            `;
            card.addEventListener('click', () => agregarAlCarrito(producto.id));
            productArea.appendChild(card);
        });
    }
    
    function agregarAlCarrito(productoId) { 
        deseleccionarItemCarrito(); 
        const itemEnCarrito = carrito.find(item => item.id === productoId); 
        if (itemEnCarrito) { 
            itemEnCarrito.cantidad++; 
        } else { 
            const productoAAgregar = productos.find(p => p.id === productoId); 
            if (productoAAgregar) { 
                carrito.push({ ...productoAAgregar, cantidad: 1, presentacion: productoAAgregar.presentacion || 'Und' }); 
            } 
        } 
        actualizarUICompleta(); 
    }

    function seleccionarItemCarrito(productoId) { 
        itemSeleccionadoId = productoId; 
        bufferTeclado = ''; 
        actualizarUICompleta(); 
        // Al seleccionar un item del carrito, el modo teclado debe ser para cantidad o precio de ESE item.
        // No directamente para los campos de pago del modal.
        // Si el modal está abierto y se selecciona un item del carrito, quizás deberíamos cerrar el modo 'pago'.
        if (modoTeclado.startsWith('pago-')) {
             // Opcional: cambiarModoTeclado('cantidad'); // para evitar confusión
        }
    }

    function deseleccionarItemCarrito() { 
        itemSeleccionadoId = null; 
        if(cartArea){
            const itemActivo = cartArea.querySelector('.cart-item-selected'); 
            if (itemActivo) { 
                itemActivo.classList.remove('cart-item-selected'); 
            }
        }
    }

    function cambiarModoTeclado(nuevoModo) { 
        modoTeclado = nuevoModo; 
        bufferTeclado = ''; 
        actualizarEstadoBotonesModo(); 
        // Si entramos a modo 'pago-efectivo', el itemSeleccionadoId no es relevante para el keypad
        if (nuevoModo.startsWith('pago-')) {
            itemSeleccionadoId = null; // Deseleccionar item del carrito si estamos en modo pago
        }
    }

    function procesarEntradaTeclado(valor) {
        // Si estamos en un modo de pago, el itemSeleccionadoId no es relevante para el buffer.
        // La lógica se manejará directamente en el input de pago.
        if (modoTeclado.startsWith('pago-')) {
            let targetInput;
            if (modoTeclado === 'pago-efectivo' && paymentCashAmountInput) targetInput = paymentCashAmountInput;
            else if (modoTeclado === 'pago-tarjeta' && paymentCardAmountInput) targetInput = paymentCardAmountInput;
            else if (modoTeclado === 'pago-transferencia' && paymentTransferAmountInput) targetInput = paymentTransferAmountInput;
            else return;

            if (valor === 'borrar') {
                targetInput.value = targetInput.value.slice(0, -1);
            } else {
                if (valor === '.' && targetInput.value.includes('.')) return; // Evitar múltiples puntos
                targetInput.value += valor;
            }
            actualizarCalculosDePago(); // Actualizar siempre que cambie un input de pago
            return;
        }
        
        // Lógica original para cantidad/precio de items del carrito
        if (itemSeleccionadoId === null) return; 
        if (valor === 'borrar') { 
            bufferTeclado = bufferTeclado.slice(0, -1); 
        } else { 
            if (valor === '.' && bufferTeclado.includes('.')) return; 
            bufferTeclado += valor; 
        } 
        aplicarValorDelTeclado(); 
    }

    function aplicarValorDelTeclado() { 
        const item = carrito.find(i => i.id === itemSeleccionadoId); 
        if (!item) return; 
        const valorNumerico = parseFloat(bufferTeclado); 
        if (bufferTeclado === '') { 
            if (modoTeclado === 'cantidad') item.cantidad = 1; 
            else if (modoTeclado === 'precio') item.precio = productos.find(p => p.id === item.id)?.precio || 0;
        } else if (!isNaN(valorNumerico)) { 
            if (modoTeclado === 'cantidad') { 
                item.cantidad = valorNumerico > 0 ? valorNumerico : 1; 
            } else if (modoTeclado === 'precio') { 
                item.precio = valorNumerico >= 0 ? valorNumerico : 0; 
            } 
        } 
        actualizarUICompleta(); 
    }

    function actualizarUICompleta() { 
        actualizarVistaCarrito(); 
        actualizarContadoresProductos(); 
        actualizarEstadoBotonesModo(); 
    }

    function actualizarVistaCarrito() { 
        if (!cartArea || !totalPriceEl) { console.warn("cartArea o totalPriceEl no encontrados"); return; }
        cartArea.innerHTML = ''; 
        let totalCarrito = 0; 
        if (carrito.length === 0) { 
            cartArea.innerHTML = '<p class="text-muted text-center">El carrito está vacío.</p>'; 
            totalPriceEl.textContent = formatearMoneda(0); 
            return; 
        } 
        const listGroup = document.createElement('ul'); 
        listGroup.className = 'list-group list-group-flush'; 
        carrito.forEach(item => { 
            const li = document.createElement('li'); 
            li.className = 'list-group-item d-flex justify-content-between align-items-center'; 
            if (item.id === itemSeleccionadoId) { 
                li.classList.add('cart-item-selected'); 
            } 
            li.dataset.productoId = item.id; 
            li.innerHTML = `<div class="w-50"><h6 class="my-0 text-truncate">${item.nombre}</h6><small class="text-muted">${formatearMoneda(item.precio)} c/u</small></div><div class="text-center">x ${item.cantidad}</div><span class="fw-bold text-end w-25">${formatearMoneda(item.precio * item.cantidad)}</span>`; 
            li.addEventListener('click', (e) => { e.stopPropagation(); seleccionarItemCarrito(item.id); }); 
            listGroup.appendChild(li); 
            totalCarrito += item.precio * item.cantidad; 
        }); 
        cartArea.appendChild(listGroup); 
        totalPriceEl.textContent = formatearMoneda(totalCarrito); 
    }

    function actualizarContadoresProductos() { 
        if (!productArea) { console.warn("productArea no encontrado para actualizar contadores"); return; }
        const todosLosContadores = productArea.querySelectorAll('.quantity-badge'); 
        todosLosContadores.forEach(badge => { badge.textContent = '0'; badge.classList.remove('visible'); }); 
        carrito.forEach(item => { 
            const card = productArea.querySelector(`.card[data-producto-id='${item.id}']`); 
            if (card) { 
                const badge = card.querySelector('.quantity-badge'); 
                if(badge) {
                    badge.textContent = item.cantidad; 
                    badge.classList.add('visible'); 
                }
            } 
        }); 
    }

    function actualizarEstadoBotonesModo() { 
        if (!btnCantidad || !btnPrecio) { console.warn("Botones de cantidad/precio no encontrados"); return; }
        // Desactivar todos los botones de modo primero
        btnCantidad.classList.remove('keypad-btn-active');
        btnPrecio.classList.remove('keypad-btn-active');
        // Activar el que corresponda (si no es un modo de pago)
        if (modoTeclado === 'cantidad') {
            btnCantidad.classList.add('keypad-btn-active');
        } else if (modoTeclado === 'precio') {
            btnPrecio.classList.add('keypad-btn-active');
        }
        // Si es un modo de pago, ningún botón de cantidad/precio debe estar activo
    }
    
    // --- INICIALIZACIÓN ---
    function inicializar() {
        console.log("Inicializando aplicación POS...");
        clientes = [ 
            { id: 1, nombre: 'César Arango', tipo: 'Persona', correo: 'carango@jungleone.co', telefono: '310 123 4567' },
            { id: 2, nombre: 'Carolina Garcés', tipo: 'Persona', correo: 'cgarces@example.co', telefono: '311 123 4567' },
            { id: 3, nombre: 'TecnoQuímicas S.A.', tipo: 'Compañía', correo: 'compras@tq.com.co', telefono: '(602) 444 5566' } 
        ];
        productos = [ 
            { id: 1, nombre: 'Consultas Medicas', precio: 70000, presentacion: 'Servicio' }, 
            { id: 10, nombre: 'Retiro De Puntos', precio: 100000, presentacion: 'Servicio' }, 
            { id: 100, nombre: 'Dolo Neurobion', precio: 32000, presentacion: 'Caja' },
            { id: 11, nombre: 'Lavado Nasal', precio: 70000, presentacion: 'Servicio' },
            { id: 12, nombre: 'Inyeccion', precio: 70000, presentacion: 'Servicio' },
            { id: 13, nombre: 'Toma De Muestra', precio: 70000, presentacion: 'Servicio' },
            { id: 14, nombre: 'Consulta Medica Virtual', precio: 70000, presentacion: 'Servicio' },
            { id: 15, nombre: 'Consulta Medica Presencial', precio: 70000, presentacion: 'Servicio' }
        ];
        
        if (productArea) {
            renderizarProductos(productos);
        } else {
            console.error("CRÍTICO: #product-area no existe en el DOM al momento de inicializar.");
        }

        if (modalClientList && customerSelectorBtn) {
            renderizarClientes();
        } else {
            console.warn("Elementos para renderizar clientes no encontrados.");
        }
        actualizarUICompleta();
        // Por defecto, el teclado numérico manejará la cantidad de ítems del carrito
        cambiarModoTeclado('cantidad'); 
    }

    // --- ASIGNACIÓN DE EVENT LISTENERS ---

    // Botón Pagar (abre el modal)
    if (btnFinalizarPagoOriginal) {
        btnFinalizarPagoOriginal.addEventListener('click', () => {
            if (carrito.length === 0) {
                alert("El carrito está vacío. Agrega productos antes de pagar.");
                return;
            }
            const subtotalOrden = carrito.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);
            const datosOrden = {
                items: carrito.map(item => ({ 
                    nombre: item.nombre,
                    cantidad: item.cantidad,
                    precio: item.precio,
                    presentacion: item.presentacion || 'Und'
                })),
                total: subtotalOrden, // Este es el subtotal
                clienteId: clienteSeleccionadoId 
            };
            localStorage.setItem('ordenParaPago', JSON.stringify(datosOrden));
            
            cargarDatosOrdenEnModal(); 
    
            if (paymentModalInstance) {
                paymentModalInstance.show();
                // Al abrir el modal, enfocar el input de efectivo y activar modo teclado para efectivo
                if(paymentCashAmountInput) {
                    paymentCashAmountInput.focus();
                    paymentCashAmountInput.select(); // Seleccionar el contenido para fácil reemplazo
                }
                cambiarModoTeclado('pago-efectivo'); // Cambiar modo teclado para efectivo
                bufferTeclado = paymentCashAmountInput.value || ''; // Sincronizar buffer con el valor actual
            } else {
                console.error("La instancia del modal de pago no se pudo crear.");
            }
        });
    } else {
        console.warn("Botón #btn-finalizar-pago (original) no encontrado.");
    }

    // Botón Confirmar Pago DENTRO DEL MODAL
    if (btnModalConfirmarPago) {
        btnModalConfirmarPago.addEventListener('click', () => {
            const cashAmount = parseFloat(paymentCashAmountInput.value) || 0;
            const cardAmount = parseFloat(paymentCardAmountInput.value) || 0;
            const transferAmount = parseFloat(paymentTransferAmountInput.value) || 0;
            const totalPagado = cashAmount + cardAmount + transferAmount;

            // Redondear currentOrderTotal y totalPagado a 2 decimales para evitar problemas de precisión con flotantes
            const roundedCurrentOrderTotal = parseFloat(currentOrderTotal.toFixed(2));
            const roundedTotalPagado = parseFloat(totalPaid.toFixed(2));

            if (roundedTotalPagado < roundedCurrentOrderTotal) {
                alert("El monto pagado es inferior al total de la orden. Por favor, verifique los montos.");
                return;
            }
            
            console.log("Procesando pago final...");
            console.log("Total Orden:", formatearMoneda(currentOrderTotal));
            console.log("Pagado con Efectivo:", formatearMoneda(cashAmount));
            console.log("Pagado con Tarjeta:", formatearMoneda(cardAmount));
            console.log("Pagado con Transferencia:", formatearMoneda(transferAmount));
            console.log("Cambio:", paymentCashChangeEl ? paymentCashChangeEl.textContent : 'N/A');
            
            alert("¡Pago confirmado y registrado! (Simulación)");
            
            // Limpiar estado y UI para una nueva orden
            carrito = [];
            clienteSeleccionadoId = 'final'; 
            itemSeleccionadoId = null;
            bufferTeclado = '';
            localStorage.removeItem('ordenParaPago');
            actualizarUICompleta(); 
            if (customerSelectorBtn) customerSelectorBtn.innerHTML = `<span><i class="bi bi-person-circle me-2"></i>Cliente Final</span>`;
            if (paymentModalInstance) paymentModalInstance.hide();
            cambiarModoTeclado('cantidad'); // Volver al modo teclado por defecto
        });
    } else {
        console.warn("Botón #btn-modal-confirmar-pago no encontrado.");
    }

    // Listeners para los inputs de métodos de pago en el modal
    [paymentCashAmountInput, paymentCardAmountInput, paymentTransferAmountInput].forEach(input => {
        if (input) {
            input.addEventListener('input', actualizarCalculosDePago); // Actualiza cálculos al escribir directamente
            input.addEventListener('focus', function() {
                // Cambiar modo de teclado al método correspondiente
                modoTeclado = `pago-${this.dataset.method}`;
                bufferTeclado = this.value; // Sincronizar buffer con el valor actual del input
                actualizarEstadoBotonesModo(); // Para deseleccionar botones Cantidad/Precio

                // Lógica de autocompletar si es tarjeta o transferencia y efectivo no cubre
                if (this.id !== 'payment-cash-amount' && (this.value === '' || parseFloat(this.value) === 0)) {
                    const cashVal = parseFloat(paymentCashAmountInput.value) || 0;
                    const cardVal = parseFloat(paymentCardAmountInput.value) || 0;
                    const transferVal = parseFloat(paymentTransferAmountInput.value) || 0;
                    
                    let otrosPagos = 0;
                    if (this.id === 'payment-card-amount') {
                        otrosPagos = transferVal;
                    } else if (this.id === 'payment-transfer-amount') {
                        otrosPagos = cardVal;
                    }

                    const faltante = currentOrderTotal - cashVal - otrosPagos;
                    if (faltante > 0) {
                        this.value = faltante.toFixed(0);
                        bufferTeclado = this.value;
                        actualizarCalculosDePago();
                    }
                }
            });
        }
    });
    
    // Keypad
    if (keypadContainer) {
        keypadContainer.addEventListener('click', (e) => {
            const target = e.target.closest('.keypad-btn');
            if (!target || target.disabled) return;

            const valorKeypad = target.textContent.trim();

            if (target.id === 'btn-cantidad') {
                cambiarModoTeclado('cantidad');
            } else if (target.id === 'btn-precio') {
                cambiarModoTeclado('precio');
            } else { // Es un número o borrar
                let valorParaProcesar = valorKeypad;
                if (target.querySelector('.bi-backspace-fill')) {
                    valorParaProcesar = 'borrar';
                }
                procesarEntradaTeclado(valorParaProcesar);
            }
        });
    } else {
        console.warn("Contenedor de keypad #keypad-container no encontrado.")
    }

    // Scan Toggle
    if (scanToggleButton && scanToggleButtonText) {
        scanToggleButton.addEventListener('click', () => {
            scanningActive = !scanningActive;
            if (scanningActive) {
                scanToggleButtonText.textContent = 'Parar';
                scanToggleButton.classList.remove('btn-outline-success');
                scanToggleButton.classList.add('btn-danger');
                if(productArea) renderizarProductos([]); 
                console.log('Modo escaneo: ACTIVADO - Área de productos limpia.');
            } else {
                scanToggleButtonText.textContent = 'Iniciar';
                scanToggleButton.classList.remove('btn-danger');
                scanToggleButton.classList.add('btn-outline-success');
                if(productArea) renderizarProductos(productos); 
                actualizarContadoresProductos(); 
                console.log('Modo escaneo: DESACTIVADO - Área de productos restaurada.');
            }
        });
    } else {
        console.warn("Botón de escaneo #btn-toggle-scan o su texto no encontrado.");
    }

    // Product Search
    const searchInput = document.getElementById('product-search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const terminoDeBusqueda = e.target.value.toLowerCase().trim();
            const productosFiltrados = productos.filter(producto => 
                producto.nombre.toLowerCase().includes(terminoDeBusqueda) || 
                (producto.id && producto.id.toString().toLowerCase().includes(terminoDeBusqueda))
            );
            renderizarProductos(productosFiltrados);
            actualizarContadoresProductos();
        });
    } else {
        console.warn("Input de búsqueda #product-search-input no encontrado.");
    }

    // Deseleccionar item del carrito al hacer clic fuera de la columna derecha o el keypad
    document.addEventListener('click', (e) => {
        const rightColumn = document.getElementById('right-column');
        const isClickInsideRightColumn = rightColumn ? rightColumn.contains(e.target) : false;
        const isClickInsideKeypad = keypadContainer ? keypadContainer.contains(e.target) : false;
        const isClickInsideModal = paymentProcessModalEl ? paymentProcessModalEl.contains(e.target) : false;


        if (!isClickInsideRightColumn && !isClickInsideKeypad && !isClickInsideModal) {
            deseleccionarItemCarrito();
        }
    });
    
    // Inicializar la aplicación
    inicializar();

}); // Fin del DOMContentLoaded