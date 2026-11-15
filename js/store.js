(function (root, factory) {
    const api = factory();
    if (typeof module === "object" && module.exports) {
        module.exports = api;
    } else {
        root.StreetStore = api;
    }
})(typeof self !== "undefined" ? self : this, function () {

    const CLAVE = "streetzone_db";

    let almacen = null;
    let db = null;

    function almacenEnMemoria() {
        const datos = {};
        return {
            getItem: k => (k in datos ? datos[k] : null),
            setItem: (k, v) => { datos[k] = String(v); },
            removeItem: k => { delete datos[k]; }
        };
    }

    function almacenPorDefecto() {
        try {
            if (typeof localStorage !== "undefined") {
                localStorage.setItem("__sz_test", "1");
                localStorage.removeItem("__sz_test");
                return localStorage;
            }
        } catch (e) {  }
        return almacenEnMemoria();
    }

    const clonar = x => JSON.parse(JSON.stringify(x));

    function guardar() {
        almacen.setItem(CLAVE, JSON.stringify(db));
    }

    function siguienteId(lista) {
        return lista.reduce((m, x) => Math.max(m, Number(x.id)), 0) + 1;
    }

    function error(mensaje) {
        return new Error(mensaje);
    }

    function init(seed, opciones = {}) {
        almacen = opciones.almacen || almacenPorDefecto();

        let guardado = null;
        try {
            guardado = JSON.parse(almacen.getItem(CLAVE) || "null");
        } catch (e) {
            guardado = null;
        }

        if (!guardado || guardado.schema !== seed.schema) {
            db = clonar(seed);
            guardar();
        } else {
            db = guardado;
        }
        return db;
    }

    function reiniciar(seed) {
        db = clonar(seed);
        guardar();
    }

    function listarCategorias() {
        return clonar(db.categorias);
    }

    function listarProductos() {
        return clonar(db.productos);
    }

    function obtenerProducto(id) {
        const p = db.productos.find(x => Number(x.id) === Number(id));
        return p ? clonar(p) : null;
    }

    function validarProducto(datos) {
        const nombre = String(datos.nombre || "").trim();
        const precio = Number(datos.precio);
        const stock = Number(datos.stock);
        const categoria_id = Number(datos.categoria_id);

        if (!nombre) throw error("Ingresa el nombre del producto");
        if (!Number.isFinite(precio) || precio < 0) throw error("Ingresa un precio válido");
        if (!Number.isInteger(stock) || stock < 0) throw error("Ingresa un stock válido (entero)");
        if (!db.categorias.some(c => c.id === categoria_id)) throw error("Selecciona una categoría válida");

        return {
            nombre,
            precio,
            stock,
            categoria_id,
            imagen: String(datos.imagen || "").trim(),
            descripcion: String(datos.descripcion || "").trim()
        };
    }

    function crearProducto(datos) {
        const producto = { id: siguienteId(db.productos), ...validarProducto(datos) };
        db.productos.push(producto);
        guardar();
        return clonar(producto);
    }

    function actualizarProducto(id, datos) {
        const i = db.productos.findIndex(x => Number(x.id) === Number(id));
        if (i === -1) throw error("Producto no encontrado");
        db.productos[i] = { id: db.productos[i].id, ...validarProducto(datos) };
        guardar();
        return clonar(db.productos[i]);
    }

    function eliminarProducto(id) {
        const i = db.productos.findIndex(x => Number(x.id) === Number(id));
        if (i === -1) throw error("Producto no encontrado");
        db.productos.splice(i, 1);
        db.ofertas = db.ofertas.filter(o => Number(o.producto_id) !== Number(id));
        guardar();
    }

    function calcularDescuento(original, oferta) {
        if (original <= 0 || oferta <= 0 || oferta >= original) return 0;
        return Math.round((1 - oferta / original) * 100);
    }

    function estaVigente(oferta, ahora = new Date()) {
        if (!oferta.activo) return false;
        if (oferta.fecha_inicio && new Date(oferta.fecha_inicio) > ahora) return false;
        if (oferta.fecha_fin && new Date(oferta.fecha_fin) < ahora) return false;
        return true;
    }

    function listarOfertas() {
        return clonar(db.ofertas);
    }

    function listarOfertasVigentes(ahora = new Date()) {
        return clonar(db.ofertas.filter(o => estaVigente(o, ahora)));
    }

    function ofertaVigente(productoId, ahora = new Date()) {
        const lista = db.ofertas
            .filter(o => Number(o.producto_id) === Number(productoId) && estaVigente(o, ahora))
            .sort((a, b) => a.precio_oferta - b.precio_oferta);
        return lista.length ? clonar(lista[0]) : null;
    }

    function crearOferta(datos) {
        const producto = db.productos.find(p => Number(p.id) === Number(datos.producto_id));
        if (!producto) throw error("Selecciona un producto");

        const precio_oferta = Number(datos.precio_oferta);
        if (!Number.isFinite(precio_oferta) || precio_oferta <= 0) throw error("Ingresa un precio de oferta válido");
        if (precio_oferta >= producto.precio) throw error(`El precio de oferta debe ser menor al precio original ($${producto.precio.toFixed(2)})`);

        if (!datos.fecha_inicio) throw error("Selecciona la fecha de inicio");
        if (!datos.fecha_fin) throw error("Selecciona la fecha de finalización");
        if (new Date(datos.fecha_fin) <= new Date(datos.fecha_inicio)) throw error("La fecha final debe ser posterior a la inicial");

        const oferta = {
            id: siguienteId(db.ofertas),
            producto_id: producto.id,
            precio_oferta,
            descuento: calcularDescuento(producto.precio, precio_oferta),
            fecha_inicio: datos.fecha_inicio,
            fecha_fin: datos.fecha_fin,
            activo: datos.activo !== false
        };
        db.ofertas.push(oferta);
        guardar();
        return clonar(oferta);
    }

    function eliminarOferta(id) {
        const i = db.ofertas.findIndex(o => Number(o.id) === Number(id));
        if (i === -1) throw error("Oferta no encontrada");
        db.ofertas.splice(i, 1);
        guardar();
    }

    function login(email, password) {
        const correo = String(email || "").trim().toLowerCase();
        const u = db.usuarios.find(x => x.email.toLowerCase() === correo && x.password === password);
        if (!u) throw error("Correo o contraseña incorrectos");

        const { password: _omitida, ...usuario } = u;
        const token = "local-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
        return { token, usuario };
    }

    function precioFinal(producto, ahora = new Date()) {
        const oferta = ofertaVigente(producto.id, ahora);
        return oferta ? oferta.precio_oferta : producto.precio;
    }

    function crearPedido(usuarioId, items, ahora = new Date()) {
        if (!Array.isArray(items) || items.length === 0) throw error("El carrito está vacío");

        const detalles = items.map(item => {
            const producto = db.productos.find(p => Number(p.id) === Number(item.producto_id));
            const cantidad = Number(item.cantidad);

            if (!producto) throw error("Un producto del carrito ya no existe");
            if (!Number.isInteger(cantidad) || cantidad <= 0) throw error(`Cantidad inválida para ${producto.nombre}`);
            if (producto.stock < cantidad) throw error(`Stock insuficiente para ${producto.nombre} (quedan ${producto.stock})`);

            const precio_unitario = precioFinal(producto, ahora);
            return {
                producto_id: producto.id,
                cantidad,
                precio_unitario,
                subtotal: Math.round(precio_unitario * cantidad * 100) / 100,
                producto: { nombre: producto.nombre, imagen: producto.imagen }
            };
        });

        detalles.forEach(d => {
            db.productos.find(p => p.id === d.producto_id).stock -= d.cantidad;
        });

        const pedido = {
            id: siguienteId(db.pedidos),
            usuario_id: Number(usuarioId),
            fecha_pedido: ahora.toISOString(),
            total: Math.round(detalles.reduce((t, d) => t + d.subtotal, 0) * 100) / 100,
            estado: "confirmado",
            estado_pago: "pagado",
            detalles
        };
        db.pedidos.push(pedido);
        guardar();
        return clonar(pedido);
    }

    function listarPedidos(usuarioId) {
        return clonar(
            db.pedidos
                .filter(p => Number(p.usuario_id) === Number(usuarioId))
                .sort((a, b) => b.id - a.id)
        );
    }

    function guardarMensaje({ nombre, email, mensaje }) {
        const n = String(nombre || "").trim();
        const e = String(email || "").trim();
        const m = String(mensaje || "").trim();

        if (!n) throw error("Ingresa tu nombre");
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) throw error("Ingresa un correo válido");
        if (!m) throw error("Ingresa tu mensaje");

        const registro = { id: siguienteId(db.mensajes), nombre: n, email: e, mensaje: m, fecha: new Date().toISOString() };
        db.mensajes.push(registro);
        guardar();
        return clonar(registro);
    }

    function listarMensajes() {
        return clonar(db.mensajes);
    }

    return {
        init, reiniciar,
        listarCategorias,
        listarProductos, obtenerProducto, crearProducto, actualizarProducto, eliminarProducto,
        listarOfertas, listarOfertasVigentes, ofertaVigente, crearOferta, eliminarOferta, calcularDescuento,
        login,
        crearPedido, listarPedidos,
        guardarMensaje, listarMensajes
    };
});
