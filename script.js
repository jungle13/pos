document.addEventListener('DOMContentLoaded', () => {

    // --- ESTADO GLOBAL DE LA APLICACIÓN ---
    let carrito = [];
    let productos = [];
    let clientes = [];
    let itemSeleccionadoId = null;
    let clienteSeleccionadoId = null;
    let modoTeclado = 'cantidad';
    let bufferTeclado = '';

    // --- SELECTORES DE ELEMENTOS DEL DOM ---
    const productArea = document.getElementById('product-area');
    const cartArea = document.getElementById('cart-area');
    const totalPriceEl = document.getElementById('total-price');
    const keypadContainer = document.getElementById('keypad-container');
    const btnCantidad = document.getElementById('btn-cantidad');
    const btnPrecio = document.getElementById('btn-precio');
    const customerModal = new bootstrap.Modal(document.getElementById('customer-select-modal'));
    const modalClientList = document.getElementById('modal-client-list');
    const customerSelectorBtn = document.getElementById('customer-selector-btn');

    // --- LÓGICA DE CLIENTES ---
    function renderizarClientes() {
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
        if (clienteId === 'final') {
            customerSelectorBtn.innerHTML = `<span><i class="bi bi-person-circle me-2"></i>Cliente Final</span>`;
        } else {
            const cliente = clientes.find(c => c.id === clienteId);
            if (cliente) {
                customerSelectorBtn.innerHTML = `<span><i class="bi bi-person-fill me-2"></i>${cliente.nombre}</span>`;
            }
        }
        customerModal.hide();
        console.log(`Cliente seleccionado para la orden: ${clienteSeleccionadoId}`);
    }

    // --- OTRAS FUNCIONES ---
    function renderizarProductos(listaDeProductos) {
        productArea.innerHTML = '';
        if (!listaDeProductos) return; // Guarda de seguridad
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
    // ... (el resto de funciones no cambia)
    function agregarAlCarrito(productoId) { deseleccionarItemCarrito(); const itemEnCarrito = carrito.find(item => item.id === productoId); if (itemEnCarrito) { itemEnCarrito.cantidad++; } else { const productoAAgregar = productos.find(p => p.id === productoId); if (productoAAgregar) { carrito.push({ ...productoAAgregar, cantidad: 1 }); } } actualizarUICompleta(); }
    function seleccionarItemCarrito(productoId) { itemSeleccionadoId = productoId; bufferTeclado = ''; actualizarUICompleta(); }
    function deseleccionarItemCarrito() { itemSeleccionadoId = null; const itemActivo = cartArea.querySelector('.cart-item-selected'); if (itemActivo) { itemActivo.classList.remove('cart-item-selected'); } }
    function cambiarModoTeclado(nuevoModo) { modoTeclado = nuevoModo; bufferTeclado = ''; actualizarEstadoBotonesModo(); }
    function procesarEntradaTeclado(valor) { if (itemSeleccionadoId === null) return; if (valor === 'borrar') { bufferTeclado = bufferTeclado.slice(0, -1); } else { if (valor === '.' && bufferTeclado.includes('.')) return; bufferTeclado += valor; } aplicarValorDelTeclado(); }
    function aplicarValorDelTeclado() { const item = carrito.find(i => i.id === itemSeleccionadoId); if (!item) return; const valorNumerico = parseFloat(bufferTeclado); if (bufferTeclado === '') { if (modoTeclado === 'cantidad') item.cantidad = 1; else if (modoTeclado === 'precio') item.precio = 0; } else if (!isNaN(valorNumerico)) { if (modoTeclado === 'cantidad') { item.cantidad = valorNumerico > 0 ? valorNumerico : 1; } else if (modoTeclado === 'precio') { item.precio = valorNumerico >= 0 ? valorNumerico : 0; } } actualizarUICompleta(); }
    function actualizarUICompleta() { actualizarVistaCarrito(); actualizarContadoresProductos(); actualizarEstadoBotonesModo(); }
    function actualizarVistaCarrito() { cartArea.innerHTML = ''; let total = 0; if (carrito.length === 0) { cartArea.innerHTML = '<p class="text-muted text-center">El carrito está vacío.</p>'; totalPriceEl.textContent = formatearMoneda(0); return; } const listGroup = document.createElement('ul'); listGroup.className = 'list-group list-group-flush'; carrito.forEach(item => { const li = document.createElement('li'); li.className = 'list-group-item d-flex justify-content-between align-items-center'; if (item.id === itemSeleccionadoId) { li.classList.add('cart-item-selected'); } li.dataset.productoId = item.id; li.innerHTML = `<div class="w-50"><h6 class="my-0 text-truncate">${item.nombre}</h6><small class="text-muted">${formatearMoneda(item.precio)} c/u</small></div><div class="text-center">x ${item.cantidad}</div><span class="fw-bold text-end w-25">${formatearMoneda(item.precio * item.cantidad)}</span>`; li.addEventListener('click', (e) => { e.stopPropagation(); seleccionarItemCarrito(item.id); }); listGroup.appendChild(li); total += item.precio * item.cantidad; }); cartArea.appendChild(listGroup); totalPriceEl.textContent = formatearMoneda(total); }
    function actualizarContadoresProductos() { const todosLosContadores = document.querySelectorAll('#product-area .quantity-badge'); todosLosContadores.forEach(badge => { badge.textContent = '0'; badge.classList.remove('visible'); }); carrito.forEach(item => { const card = document.querySelector(`#product-area .card[data-producto-id='${item.id}']`); if (card) { const badge = card.querySelector('.quantity-badge'); badge.textContent = item.cantidad; badge.classList.add('visible'); } }); }
    function actualizarEstadoBotonesModo() { btnCantidad.classList.toggle('keypad-btn-active', modoTeclado === 'cantidad'); btnPrecio.classList.toggle('keypad-btn-active', modoTeclado === 'precio'); }
    function formatearMoneda(valor) { return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(valor); }
    
    // --- INICIALIZACIÓN Y ASIGNACIÓN DE EVENTOS ---
    function inicializar() {
        clientes = [ { id: 1, nombre: 'César Arango', tipo: 'Persona', correo: 'carango@jungleone.co', telefono: '310 123 4567' }, { id: 2, nombre: 'Carolina Garcés', tipo: 'Persona', correo: 'cgarces@example.co', telefono: '311 123 4567' }, { id: 3, nombre: 'TecnoQuímicas S.A.', tipo: 'Compañía', correo: 'compras@tq.com.co', telefono: '(602) 444 5566' } ];
        productos = [ { id: 1, nombre: 'Consultas Medicas', precio: 70.00 }, { id: 10, nombre: 'Retiro De Puntos', precio: 100.00 }, { id: 100, nombre: 'Dolo Neurobion', precio: 320.00 }, { id: 11, nombre: 'Lavado Nasal', precio: 70.00 }, { id: 12, nombre: 'Inyeccion', precio: 70.00 }, { id: 13, nombre: 'Toma De Muestra', precio: 70.00 }, { id: 14, nombre: 'Consulta Medica Virtual', precio: 70.00 }, { id: 15, nombre: 'Consulta Medica Presencial', precio: 70.00 }];
        
        // --- LA CORRECCIÓN ESTÁ AQUÍ ---
        renderizarProductos(productos);
        
        renderizarClientes();
        actualizarUICompleta();
    }

    // ... (el resto de los event listeners no cambia)
    const searchInput = document.getElementById('product-search-input');
    if (searchInput) { searchInput.addEventListener('input', (e) => { const terminoDeBusqueda = e.target.value.toLowerCase().trim(); const productosFiltrados = productos.filter(producto => producto.nombre.toLowerCase().includes(terminoDeBusqueda)); renderizarProductos(productosFiltrados); actualizarContadoresProductos(); }); }
    keypadContainer.addEventListener('click', (e) => { const target = e.target.closest('.keypad-btn'); if (!target) return; if (target.id === 'btn-cantidad') { cambiarModoTeclado('cantidad'); } else if (target.id === 'btn-precio') { cambiarModoTeclado('precio'); } else { let valor = target.textContent.trim(); if (target.querySelector('.bi-backspace-fill')) { valor = 'borrar'; } if(target.disabled) return; procesarEntradaTeclado(valor); } });
    document.addEventListener('click', (e) => { const rightColumn = document.getElementById('right-column'); if (rightColumn && !rightColumn.contains(e.target)) { deseleccionarItemCarrito(); }});

    inicializar();
});