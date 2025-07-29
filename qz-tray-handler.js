/**
 * @file qz-tray-handler.js
 * @description Módulo para gestionar la comunicación y la impresión con QZ Tray.
 * @author JUNGLE ONE SAS 2025
 * @version 1.0.0
 * * @notes Este archivo depende de que la librería principal de QZ Tray (qz-tray.js)
 * ya esté cargada en la página.
 */

// Usamos un objeto para encapsular toda la lógica y evitar contaminar el scope global.
const QZTrayHandler = {

    /**
     * Establece y gestiona la conexión websocket con el cliente de QZ Tray.
     * Muestra mensajes de error al usuario si la conexión falla.
     * @returns {Promise<void>} Una promesa que se resuelve si la conexión es exitosa, o se rechaza si falla.
     */
    connect: function() {
        return new Promise((resolve, reject) => {
            if (qz.websocket.isActive()) {
                console.log("QZ Tray ya está conectado.");
                return resolve();
            }

            console.log("Intentando conectar con QZ Tray...");
            qz.websocket.connect().then(() => {
                console.log("¡Conexión con QZ Tray establecida exitosamente!");
                resolve();
            }).catch(err => {
                const errorMessage = "Error de conexión con QZ Tray: Asegúrese de que el programa esté en ejecución y no esté bloqueado por un firewall.";
                console.error(errorMessage, err);
                alert(errorMessage);
                reject(new Error(errorMessage));
            });
        });
    },

    /**
     * Busca todas las impresoras disponibles que QZ Tray puede detectar en el sistema.
     * @returns {Promise<string[]>} Una promesa que se resuelve con un array de nombres de impresoras.
     */
    findPrinters: function() {
        console.log("Buscando impresoras...");
        return new Promise((resolve, reject) => {
            qz.printers.find().then(printers => {
                console.log("Impresoras encontradas:", printers);
                resolve(printers);
            }).catch(err => {
                const errorMessage = "Error al buscar impresoras.";
                console.error(errorMessage, err);
                reject(new Error(errorMessage));
            });
        });
    },

    /**
     * Formatea un objeto de datos de recibo en un array de comandos crudos ESC/POS.
     * @param {object} receiptData - El objeto con la información del recibo.
     * @returns {Array<string>} Un array de comandos listos para ser enviados a la impresora.
     */
    formatReceiptForESCPOS: function(receiptData) {
        // Función auxiliar para formatear moneda dentro de este módulo
        const formatearMoneda = (valor) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(valor);

        // Comandos de inicialización y cabecera
        let commands = [
            '\x1B' + '\x40', // Resetear impresora
            '\x1B' + '\x61' + '\x31', // Centrar
            '\x1B' + '\x21' + '\x08', // Negrita
            receiptData.business.nombre + '\n',
            '\x1B' + '\x21' + '\x00', // Quitar negrita
            receiptData.business.direccion + '\n',
            receiptData.business.telefono + '\n\n',
            
            '\x1B' + '\x61' + '\x30', // Alinear a la izquierda
            `TICKET: ${receiptData.sale_id}\n`,
            `FECHA: ${receiptData.date}\n`,
            `ATENDIDO POR: ${receiptData.cashier_name}\n`,
            '--------------------------------\n'
        ];

        // Items de la venta
        receiptData.items.forEach(item => {
            const nombre = item.name.substring(0, 15); // Limitar longitud del nombre
            const totalItem = formatearMoneda(item.total);
            let linea = `${item.quantity}x ${nombre.padEnd(16)} ${totalItem}\n`;
            commands.push(linea);
        });

        // Totales y pie de página
        commands = commands.concat([
            '--------------------------------\n',
            '\x1B' + '\x21' + '\x08', // Negrita para el total
            'TOTAL: '.padEnd(20) + formatearMoneda(receiptData.total) + '\n',
            '\x1B' + '\x21' + '\x00', // Quitar negrita
            '\n',
            '\x1B' + '\x61' + '\x31', // Centrar
            '¿Necesita factura?\n',
            // El QR se puede generar como imagen o texto, aquí lo omitimos para mantenerlo simple.
            // Para imprimir un QR, se requiere un comando ESC/POS más complejo.
            '\n',
            '¡Gracias por su compra en Farmacia Lilu!\n',
            'Powered by Jungle One 2025\n\n\n',
            '\x1D' + '\x56' + '\x42' + '\x00' // Cortar papel
        ]);

        return commands;
    },

    /**
     * Envía los datos formateados a la impresora especificada.
     * @param {string} printerName - El nombre exacto de la impresora.
     * @param {Array<string>} data - El array de comandos ESC/POS a imprimir.
     * @returns {Promise<void>} Una promesa que se resuelve si la impresión es exitosa.
     */
    print: function(printerName, data) {
        console.log(`Enviando a imprimir en: ${printerName}`);
        
        // Configuración de la impresora. 'CP437' es una codificación común para caracteres latinos.
        const config = qz.configs.create(printerName, { encoding: 'CP437', rasterize: false });

        return new Promise((resolve, reject) => {
            qz.print(config, data).then(() => {
                console.log("¡Enviado a la impresora exitosamente!");
                resolve();
            }).catch(err => {
                const errorMessage = "Error al enviar a la impresora.";
                console.error(errorMessage, err);
                reject(new Error(errorMessage));
            });
        });
    }
};