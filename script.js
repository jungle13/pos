document.addEventListener('DOMContentLoaded', () => {

    // --- ESTADO GLOBAL DE LA APLICACIÓN ---
    let carrito = [];
    let productos = [];
    let clientes = [];
    let itemSeleccionadoId = null;
    let clienteSeleccionadoId = 'final'; // Cliente final por defecto
    let modoTeclado = 'cantidad';
    let bufferTeclado = '';
    let scanningActive = false;

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
    const btnFinalizarPagoOriginal = document.getElementById('btn-finalizar-pago'); // Botón Pagar en index.html

    // --- SELECTORES PARA EL MODAL DE PAGO ---
    const paymentProcessModalEl = document.getElementById('paymentProcessModal');
    let paymentModalInstance = paymentProcessModalEl ? new bootstrap.Modal(paymentProcessModalEl) : null;
    const modalTotalPriceEl = document.getElementById('modal-payment-total-price');
    const modalOrderSummaryItemsEl = document.getElementById('modal-order-summary-items');
    const modalPaymentSubtotalEl = document.getElementById('modal-payment-subtotal');
    const modalPaymentIvaEl = document.getElementById('modal-payment-iva');
    const modalPaymentGrandTotalEl = document.getElementById('modal-payment-grand-total');
    const btnModalConfirmarPago = document.getElementById('btn-modal-confirmar-pago');
    const modalPaymentMethodRadios = document.querySelectorAll('input[name="modalPaymentMethod"]');
    const modalPaymentDetailsArea = document.getElementById('modal-payment-details-area');


    // --- FUNCIONES AUXILIARES ---
    function formatearMoneda(valor) {
        return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(valor);
    }

    // --- FUNCIÓN CLAVE: CARGAR DATOS EN EL MODAL DE PAGO ---
    function cargarDatosOrdenEnModal() {
        console.log("Ejecutando cargarDatosOrdenEnModal..."); // Para depurar

        if (!modalOrderSummaryItemsEl || !modalTotalPriceEl || !modalPaymentSubtotalEl || !modalPaymentIvaEl || !modalPaymentGrandTotalEl) {
            console.error("Error: Elementos del DOM del modal de pago no encontrados. Verifica los IDs en tu HTML.");
            // Mostrar $0 en todos los campos relevantes del modal si los elementos no se encuentran
            if(modalTotalPriceEl) modalTotalPriceEl.textContent = formatearMoneda(0);
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

            let subtotalCalculado = 0;
            modalOrderSummaryItemsEl.innerHTML = ''; // Limpiar el área de resumen de ítems

            if (orden.items && orden.items.length > 0) {
                const ul = document.createElement('ul');
                ul.className = 'list-group list-group-flush';

                orden.items.forEach(item => {
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
                    const itemTotal = (item.cantidad || 0) * (item.precio || 0);
                    itemTotalSpan.textContent = formatearMoneda(itemTotal);
                    subtotalCalculado += itemTotal;

                    li.appendChild(itemDetailsDiv);
                    li.appendChild(itemTotalSpan);
                    ul.appendChild(li);
                });
                modalOrderSummaryItemsEl.appendChild(ul);
            } else {
                modalOrderSummaryItemsEl.innerHTML = '<p class="text-muted small p-3">No hay ítems en esta orden.</p>';
            }

            modalPaymentSubtotalEl.textContent = formatearMoneda(subtotalCalculado);
            const ivaEstimado = subtotalCalculado * 0.19; // Asumiendo 19% IVA, ajustar si es necesario para FAMATISA
            modalPaymentIvaEl.textContent = formatearMoneda(ivaEstimado);
            const granTotal = subtotalCalculado + ivaEstimado;
            modalPaymentGrandTotalEl.textContent = formatearMoneda(granTotal);
            modalTotalPriceEl.textContent = formatearMoneda(granTotal);

        } else {
            console.warn("No se encontraron datos de 'ordenParaPago' en localStorage.");
            modalTotalPriceEl.textContent = formatearMoneda(0);
            modalOrderSummaryItemsEl.innerHTML = '<p class="text-muted small p-3">No hay datos de orden para mostrar.</p>';
            modalPaymentSubtotalEl.textContent = formatearMoneda(0);
            modalPaymentIvaEl.textContent = formatearMoneda(0);
            modalPaymentGrandTotalEl.textContent = formatearMoneda(0);
        }
    }

    // --- LÓGICA DE CLIENTES ---
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

    // --- OTRAS FUNCIONES (renderizarProductos, agregarAlCarrito, etc.) ---
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
    }

    function deseleccionarItemCarrito() { 
        itemSeleccionadoId = null; 
        if(cartArea){ // Asegurarse que cartArea existe
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
    }

    function procesarEntradaTeclado(valor) { 
        if (itemSeleccionadoId === null && modoTeclado !== 'pago') return;
        if (valor === 'borrar') { 
            bufferTeclado = bufferTeclado.slice(0, -1); 
        } else { 
            if (valor === '.' && bufferTeclado.includes('.')) return; 
            bufferTeclado += valor; 
        } 
        
        if (modoTeclado === 'pago') {
            const cashReceivedInput = document.getElementById('modal-cash-received');
            if (cashReceivedInput) {
                cashReceivedInput.value = bufferTeclado;
                // Actualizar cambio
                const recibido = parseFloat(bufferTeclado) || 0;
                const datosOrdenGuardada = localStorage.getItem('ordenParaPago');
                if(datosOrdenGuardada){
                    const orden = JSON.parse(datosOrdenGuardada);
                    let totalOrdenConIVA = orden.total; // Asumimos que orden.total ya tiene el IVA si aplica o es el subtotal
                    // Si el total en localStorage es subtotal, calcular IVA aquí:
                    // totalOrdenConIVA = orden.total * 1.19; // O tu lógica de IVA
                    const cambio = recibido - totalOrdenConIVA;
                    const cashChangeSpan = document.getElementById('modal-cash-change');
                    if(cashChangeSpan) cashChangeSpan.textContent = formatearMoneda(cambio > 0 ? cambio : 0);
                }
            }
        } else {
            aplicarValorDelTeclado(); 
        }
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
        let total = 0; 
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
            total += item.precio * item.cantidad; 
        }); 
        cartArea.appendChild(listGroup); 
        totalPriceEl.textContent = formatearMoneda(total); 
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
        btnCantidad.classList.toggle('keypad-btn-active', modoTeclado === 'cantidad'); 
        btnPrecio.classList.toggle('keypad-btn-active', modoTeclado === 'precio'); 
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
    }

    // --- ASIGNACIÓN DE EVENT LISTENERS ---

    // Botón Pagar (abre el modal)
    if (btnFinalizarPagoOriginal) {
        btnFinalizarPagoOriginal.addEventListener('click', () => {
            if (carrito.length === 0) {
                alert("El carrito está vacío. Agrega productos antes de pagar.");
                return;
            }
            // Calcular el total basado en el estado actual del carrito (subtotal sin IVA)
            const subtotalOrden = carrito.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);
    
            const datosOrden = {
                items: carrito.map(item => ({ 
                    nombre: item.nombre,
                    cantidad: item.cantidad,
                    precio: item.precio,
                    presentacion: item.presentacion || 'Und'
                })),
                // Guardamos el subtotal. El IVA y total final se calcularán en el modal.
                total: subtotalOrden, 
                clienteId: clienteSeleccionadoId 
            };
            localStorage.setItem('ordenParaPago', JSON.stringify(datosOrden));
    
            cargarDatosOrdenEnModal(); // Llama a la función para poblar el modal ANTES de mostrarlo
    
            if (paymentModalInstance) {
                paymentModalInstance.show();
            } else {
                console.error("La instancia del modal de pago no se pudo crear. Revisa el ID 'paymentProcessModal' en tu HTML.");
            }
        });
    } else {
        console.warn("Botón #btn-finalizar-pago (original) no encontrado.");
    }

    // Botón Confirmar Pago DENTRO DEL MODAL
    if (btnModalConfirmarPago) {
        btnModalConfirmarPago.addEventListener('click', () => {
            console.log("Procesando pago final...");
            alert("¡Pago confirmado! (Simulación)");
            // Lógica futura:
            // 1. Obtener método de pago seleccionado
            // 2. Obtener monto (si es efectivo, cuánto se pagó para calcular cambio)
            // 3. Enviar datos de la orden y pago a un backend
            // 4. Al confirmar el backend, limpiar carrito, localStorage
            // 5. Cerrar modal y/o mostrar mensaje de éxito/imprimir recibo
            // Ejemplo de limpieza:
            // carrito = [];
            // clienteSeleccionadoId = 'final'; 
            // localStorage.removeItem('ordenParaPago');
            // actualizarUICompleta(); 
            // if (customerSelectorBtn) customerSelectorBtn.innerHTML = `<span><i class="bi bi-person-circle me-2"></i>Cliente Final</span>`;
            // if (paymentModalInstance) paymentModalInstance.hide();
        });
    } else {
        console.warn("Botón #btn-modal-confirmar-pago no encontrado.");
    }

    // Selección de Método de Pago en el Modal
    if (modalPaymentMethodRadios.length > 0 && modalPaymentDetailsArea) {
        modalPaymentMethodRadios.forEach(radio => {
            radio.addEventListener('change', function() {
                if (this.checked) {
                    console.log("Método de pago seleccionado en modal:", this.id);
                    if (this.id === 'modal-pay-cash') {
                        modoTeclado = 'pago'; 
                        bufferTeclado = ''; 
                        modalPaymentDetailsArea.innerHTML = `
                            <div class="mb-3">
                                <label for="modal-cash-received" class="form-label">Efectivo Recibido:</label>
                                <input type="text" class="form-control form-control-lg" id="modal-cash-received" placeholder="0" readonly>
                            </div>
                            <div class="mb-3 fs-5">
                                Cambio: <span id="modal-cash-change" class="fw-bold">${formatearMoneda(0)}</span>
                            </div>
                        `;
                         // Para que el teclado numérico del POS actualice el campo "Efectivo Recibido"
                        const cashReceivedInput = document.getElementById('modal-cash-received');
                        if(cashReceivedInput) {
                            // No necesita un event listener 'input' si el keypad actualiza el buffer
                            // y el buffer actualiza este campo.
                        }

                    } else if (this.id === 'modal-pay-card') {
                        modoTeclado = 'cantidad'; // Revertir modo teclado a default
                        modalPaymentDetailsArea.innerHTML = '<p class="text-info">Procesamiento de tarjeta no implementado en este prototipo.</p>';
                    } else if (this.id === 'modal-pay-transfer') {
                        modoTeclado = 'cantidad'; // Revertir modo teclado
                        modalPaymentDetailsArea.innerHTML = '<p class="text-info">Mostrar información para transferencia (Nequi, Daviplata, etc.).</p>';
                    } else {
                        modoTeclado = 'cantidad'; // Revertir modo teclado
                        modalPaymentDetailsArea.innerHTML = '<p class="text-muted"><em>Seleccione un método de pago.</em></p>';
                    }
                }
            });
        });
        // Activar el método por defecto visualmente y la lógica del formulario
        const defaultPaymentMethod = document.querySelector('input[name="modalPaymentMethod"]:checked');
        if (defaultPaymentMethod) {
            defaultPaymentMethod.dispatchEvent(new Event('change'));
        }
    } else {
        console.warn("Radios de método de pago o área de detalles del modal no encontrados.");
    }
    
    // Keypad
    if (keypadContainer) {
        keypadContainer.addEventListener('click', (e) => {
            const target = e.target.closest('.keypad-btn');
            if (!target || target.disabled) return;

            if (target.id === 'btn-cantidad') {
                cambiarModoTeclado('cantidad');
            } else if (target.id === 'btn-precio') {
                cambiarModoTeclado('precio');
            } else {
                let valor = target.textContent.trim();
                if (target.querySelector('.bi-backspace-fill')) {
                    valor = 'borrar';
                }
                procesarEntradaTeclado(valor);
            }
        });
    } else {
        console.warn("Contenedor de keypad #keypad-container no encontrado.");
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

    // Deseleccionar item del carrito al hacer clic fuera
    document.addEventListener('click', (e) => {
        const rightColumn = document.getElementById('right-column');
        if (rightColumn && !rightColumn.contains(e.target) && keypadContainer && !keypadContainer.contains(e.target)) {
            if (!e.target.closest(`.${styles['cart-item-selected']}`) && !e.target.closest('#cart-area li')) { // Verificamos que no sea un clic en un item del carrito
                deseleccionarItemCarrito();
            }
        }
    });
    
    // Inicializar la aplicación
    inicializar();

}); // Fin del DOMContentLoaded