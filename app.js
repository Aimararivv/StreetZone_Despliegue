const Store = window.StreetStore;

const estadoConexion = document.getElementById("estadoConexion");
const avisoOffline = document.getElementById("aviso-offline");

let productos = [];
let categorias = [];
let ofertas = [];
let carrito = [];
let categoriaActual = "todos";
let categoriaAdminActual = "todos";
let totalActual = 0;

document.addEventListener("DOMContentLoaded", () => {

    Store.init(window.STREETZONE_SEED);

    cargarVersion();

    cargarCarritoLocal();
    refrescarDatos();
    actualizarContador();
    actualizarEstadoSesion();
    configurarFormularios();
});

function refrescarDatos() {

    categorias = Store.listarCategorias();
    productos = Store.listarProductos();
    ofertas = Store.listarOfertasVigentes();

    mostrarProductos();
    mostrarOfertas();
}

async function cargarVersion() {

    const pie = document.getElementById("build-info");
    if (!pie || location.protocol === "file:") return;

    try {
        const resp = await fetch("version.json", { cache: "no-store" });
        if (!resp.ok) throw new Error("sin version.json");
        const v = await resp.json();

        const fecha = new Date(v.fecha).toLocaleString("es-MX", {
            dateStyle: "medium",
            timeStyle: "short"
        });

        pie.textContent =
            `v${v.version} · build #${v.build} · ${v.commit} · ${fecha}`;

    } catch (e) {
        pie.textContent = "versión de desarrollo";
    }
}

function actualizarConexion() {

    const enLinea = navigator.onLine;

    estadoConexion.textContent = enLinea ? "En línea" : "Sin conexión";
    estadoConexion.className = enLinea ? "online" : "offline";

    if (avisoOffline) {
        avisoOffline.classList.toggle("oculto", enLinea);
    }

    document.body.classList.toggle("con-aviso", !enLinea);
}

window.addEventListener("online", actualizarConexion);
window.addEventListener("offline", actualizarConexion);
actualizarConexion();

function configurarFormularios() {

    document.getElementById("inicioSesionForm")
        ?.addEventListener("submit", event => {
            event.preventDefault();
            iniciarSesion();
        });

    document.getElementById("contactoForm")
        ?.addEventListener("submit", event => {
            event.preventDefault();
            enviarMensajeContacto();
        });

    document.getElementById("formProductoAdmin")
        ?.addEventListener("submit", guardarProductoAdmin);

    document.getElementById("formOfertaAdmin")
        ?.addEventListener("submit", guardarOfertaAdmin);
}

function obtenerUsuario() {

    try {
        return JSON.parse(localStorage.getItem("usuario") || "null");
    } catch (e) {
        return null;
    }
}

function esAdmin() {
    return Boolean(localStorage.getItem("token")) &&
        obtenerUsuario()?.rol === "admin";
}

function buscarProducto(id) {
    return productos.find(p => Number(p.id) === Number(id));
}

function normalizarTexto(texto) {
    return String(texto || "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "");
}

function validarCorreo(email) {
    return Boolean(email) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function escaparHTML(texto) {
    return String(texto ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function escaparAtributo(texto) {
    return escaparHTML(texto).replace(/`/g, "&#96;");
}

function dinero(n) {
    return "$" + Number(n || 0).toFixed(2);
}

function vacio(icono, titulo, texto, boton = "") {
    return `
        <div class="sin-pedidos">
            <i class="fas ${icono}"></i>
            <h3>${titulo}</h3>
            <p>${texto}</p>
            ${boton}
        </div>`;
}

window.mostrarNotificacion = function (mensaje, tipo = "success") {

    document.getElementById("streetzone-notificacion")?.remove();

    const n = document.createElement("div");
    n.id = "streetzone-notificacion";
    n.textContent = mensaje;

    Object.assign(n.style, {
        position: "fixed",
        top: "20px",
        right: "20px",
        zIndex: "99999",
        padding: "15px 20px",
        borderRadius: "10px",
        color: "#fff",
        fontWeight: "600",
        maxWidth: "350px",
        boxShadow: "0 5px 20px rgba(0,0,0,0.25)",
        background: tipo === "error" ? "#e74c3c" : "#27ae60"
    });

    document.body.appendChild(n);
    setTimeout(() => n.remove(), 3000);
};

function coincideCategoria(producto, categoria) {

    const cat = categorias.find(
        c => Number(c.id) === Number(producto.categoria_id)
    );

    if (!cat) return false;

    if (!isNaN(Number(categoria)) &&
        Number(categoria) === Number(producto.categoria_id)) {
        return true;
    }

    return normalizarTexto(cat.nombre) === normalizarTexto(categoria);
}

function obtenerNombreCategoria(id) {

    const cat = categorias.find(c => Number(c.id) === Number(id));
    return cat ? cat.nombre : "Producto";
}

function mostrarProductos() {

    const grid = document.getElementById("productos-grid");
    if (!grid) return;

    const lista = categoriaActual === "todos"
        ? productos
        : productos.filter(p => coincideCategoria(p, categoriaActual));

    if (lista.length === 0) {
        grid.innerHTML = `
            <div style="text-align:center;padding:3rem;grid-column:1/-1;">
                <i class="fas fa-search" style="font-size:3rem;color:#ccc;"></i>
                <p style="margin-top:1rem;">No hay productos disponibles</p>
            </div>`;
        return;
    }

    grid.innerHTML = lista.map(p => {

        const stock = Number(p.stock || 0);
        const oferta = Store.ofertaVigente(p.id);

        const precioHTML = oferta
            ? `<span class="precio-original">${dinero(p.precio)}</span> ${dinero(oferta.precio_oferta)}`
            : dinero(p.precio);

        return `
            <div class="producto-card" onclick="verProducto(${p.id})">

                <div class="producto-imagen"
                     style="background-image:url('${escaparAtributo(p.imagen)}');">
                    <div class="producto-overlay">
                        <button class="ver-detalle"
                                onclick="event.stopPropagation(); verProducto(${p.id});">
                            Ver detalles
                        </button>
                    </div>
                </div>

                <div class="producto-info">
                    <div class="producto-categoria">
                        ${escaparHTML(obtenerNombreCategoria(p.categoria_id))}
                    </div>

                    <h3>${escaparHTML(p.nombre)}</h3>

                    <p class="precio">${precioHTML}</p>
                    <p>Stock: ${stock}</p>

                    <button class="btn-carrito"
                            onclick="event.stopPropagation(); agregarAlCarrito(${p.id});"
                            ${stock <= 0 ? "disabled" : ""}>
                        <i class="fas fa-cart-plus"></i>
                        ${stock <= 0 ? "Agotado" : "Agregar al carrito"}
                    </button>
                </div>
            </div>`;
    }).join("");
}

function filtrarPorCategoria(categoria, boton = null) {

    categoriaActual = categoria;
    mostrarProductos();

    document.querySelectorAll(".filtro-btn").forEach(btn => {

        const activo = boton
            ? btn === boton
            : normalizarTexto(btn.textContent) === normalizarTexto(categoria);

        btn.classList.toggle("active", activo);
    });

    const sec = document.querySelector(".productos");
    if (sec) {
        sec.style.display = "block";
        sec.scrollIntoView({ behavior: "smooth" });
    }
}

function verProducto(id) {

    const p = Store.obtenerProducto(id);

    if (!p) {
        mostrarNotificacion("❌ No se pudo obtener el producto", "error");
        return;
    }

    const oferta = Store.ofertaVigente(p.id);
    const precio = oferta ? oferta.precio_oferta : p.precio;

    mostrarNotificacion(`${p.nombre} - ${dinero(precio)}`);
}

function mostrarOfertas() {

    const grid = document.getElementById("ofertas-grid");
    if (!grid) return;

    if (ofertas.length === 0) {
        grid.innerHTML = `
            <div style="text-align:center;padding:3rem;grid-column:1/-1;">
                <i class="fas fa-tags" style="font-size:3rem;color:#ccc;"></i>
                <p style="margin-top:1rem;">No hay ofertas disponibles</p>
            </div>`;
        return;
    }

    grid.innerHTML = ofertas.map(oferta => {

        const p = buscarProducto(oferta.producto_id) || {};
        const original = Number(p.precio || 0);
        const precioOferta = Number(oferta.precio_oferta || 0);
        const descuento = oferta.descuento || Store.calcularDescuento(original, precioOferta);
        const agotado = Number(p.stock || 0) <= 0;

        return `
            <div class="oferta-card">

                <div class="oferta-badge">-${Number(descuento).toFixed(0)}%</div>

                <div class="oferta-imagen"
                     style="background-image:url('${escaparAtributo(p.imagen || "")}');"></div>

                <div class="oferta-info">
                    <h3>${escaparHTML(p.nombre || "Producto")}</h3>

                    <p>
                        <span class="precio-original">${dinero(original)}</span>
                        <span class="precio-oferta">${dinero(precioOferta)}</span>
                    </p>

                    <button class="btn-carrito"
                            onclick="agregarAlCarrito(${p.id})"
                            ${agotado ? "disabled" : ""}>
                        <i class="fas fa-cart-plus"></i>
                        ${agotado ? "Agotado" : "Agregar al carrito"}
                    </button>
                </div>
            </div>`;
    }).join("");
}

function cargarCarritoLocal() {

    try {
        const guardado = JSON.parse(localStorage.getItem("carrito") || "[]");
        carrito = Array.isArray(guardado) ? guardado : [];
    } catch (e) {
        carrito = [];
    }
}

function guardarCarrito() {
    try {
        localStorage.setItem("carrito", JSON.stringify(carrito));
    } catch (e) {  }
}

function agregarAlCarrito(id) {

    const p = buscarProducto(id);

    if (!p) {
        mostrarNotificacion("❌ Producto no encontrado", "error");
        return;
    }

    const stock = Number(p.stock || 0);

    if (stock <= 0) {
        mostrarNotificacion("❌ Producto agotado", "error");
        return;
    }

    const oferta = Store.ofertaVigente(p.id);
    const existe = carrito.find(i => Number(i.id) === Number(id));

    if (existe) {

        if (Number(existe.cantidad) >= stock) {
            mostrarNotificacion("⚠️ No hay más unidades disponibles", "error");
            return;
        }

        existe.cantidad++;

    } else {

        carrito.push({
            id: Number(p.id),
            nombre: p.nombre,
            precio: Number(p.precio),
            imagen: p.imagen,
            cantidad: 1
        });
    }

    const item = carrito.find(i => Number(i.id) === Number(id));
    item.enOferta = Boolean(oferta);
    item.precioOferta = oferta ? Number(oferta.precio_oferta) : undefined;

    guardarCarrito();
    actualizarContador();
    mostrarNotificacion(`${p.nombre} agregado al carrito ✓`);
}

function actualizarContador() {

    const contador = document.getElementById("contador-carrito");
    if (!contador) return;

    contador.innerText = carrito.reduce(
        (suma, item) => suma + Number(item.cantidad || 0), 0
    );
}

function obtenerPrecioCarrito(item) {

    if (item.enOferta && item.precioOferta != null) {
        return Number(item.precioOferta);
    }
    return Number(item.precio || 0);
}

function calcularTotalCarrito() {

    return carrito.reduce(
        (total, item) => total + obtenerPrecioCarrito(item) * Number(item.cantidad || 0),
        0
    );
}

function abrirCarrito() {

    const modal = document.getElementById("carrito-modal");
    const items = document.getElementById("carrito-items");
    const totalDiv = document.getElementById("carrito-total");

    if (!modal) return;

    if (carrito.length === 0) {

        items.innerHTML = `<p style="text-align:center;padding:2rem;">🛒 El carrito está vacío</p>`;
        totalDiv.textContent = "Total: $0.00";

    } else {

        items.innerHTML = carrito.map(item => {

            const precio = obtenerPrecioCarrito(item);

            return `
                <div class="carrito-item">
                    <div>
                        <strong>${escaparHTML(item.nombre)}</strong><br>
                        <small>
                            ${item.enOferta ? "🔥 Oferta - " : ""}
                            ${dinero(precio)} x ${item.cantidad}
                        </small>
                    </div>
                    <div>
                        <strong>${dinero(precio * Number(item.cantidad))}</strong>
                        <button onclick="eliminarDelCarrito(${item.id})"
                                aria-label="Quitar una unidad"
                                style="background:none;border:none;color:#e74c3c;margin-left:10px;cursor:pointer;">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>`;
        }).join("");

        totalDiv.textContent = `Total: ${dinero(calcularTotalCarrito())}`;
    }

    modal.style.display = "flex";
}

function eliminarDelCarrito(id) {

    const i = carrito.findIndex(item => Number(item.id) === Number(id));
    if (i === -1) return;

    if (Number(carrito[i].cantidad) > 1) {
        carrito[i].cantidad--;
    } else {
        carrito.splice(i, 1);
    }

    guardarCarrito();
    actualizarContador();
    abrirCarrito();
}

function cerrarCarrito() {

    const modal = document.getElementById("carrito-modal");
    if (modal) modal.style.display = "none";
}

function ocultarTodasSecciones() {

    [
        document.getElementById("inicio"),
        document.getElementById("coleccion"),
        document.querySelector(".productos"),
        document.getElementById("ofertas"),
        document.getElementById("contacto"),
        document.getElementById("mis-pedidos"),
        document.getElementById("panel-admin")
    ].forEach(sec => {
        if (sec) sec.style.display = "none";
    });
}

function irSiAdmin() {

    if (!esAdmin()) return false;

    irPanelAdmin();
    return true;
}

function irInicio() {

    if (irSiAdmin()) return;

    ocultarTodasSecciones();

    document.getElementById("inicio").style.display = "flex";
    document.getElementById("coleccion").style.display = "block";
    document.querySelector(".productos").style.display = "block";

    document.getElementById("inicio").scrollIntoView({ behavior: "smooth" });
    cerrarMenu();
}

function irColeccion() {

    if (irSiAdmin()) return;

    ocultarTodasSecciones();

    document.getElementById("coleccion").style.display = "block";
    document.querySelector(".productos").style.display = "block";

    document.getElementById("coleccion").scrollIntoView({ behavior: "smooth" });
    cerrarMenu();
}

function verColeccion() {
    irColeccion();
}

function irOfertas() {

    if (irSiAdmin()) return;

    ocultarTodasSecciones();

    ofertas = Store.listarOfertasVigentes();
    mostrarOfertas();

    const sec = document.getElementById("ofertas");
    sec.style.display = "block";
    sec.scrollIntoView({ behavior: "smooth" });
    cerrarMenu();
}

function irContacto() {

    if (irSiAdmin()) return;

    ocultarTodasSecciones();

    const sec = document.getElementById("contacto");
    sec.style.display = "block";
    sec.scrollIntoView({ behavior: "smooth" });
    cerrarMenu();
}

function toggleMenu() {
    document.getElementById("nav-links")?.classList.toggle("show");
}

function cerrarMenu() {
    document.getElementById("nav-links")?.classList.remove("show");
}

function abrirLoginModal() {

    const modal = document.getElementById("login-modal");
    if (modal) modal.style.display = "flex";
    cerrarMenu();
}

function cerrarLoginModal() {

    const modal = document.getElementById("login-modal");
    if (modal) modal.style.display = "none";
}

function iniciarSesion() {

    const email = document.getElementById("emailSesion")?.value.trim();
    const password = document.getElementById("passwordSesion")?.value;

    if (!validarCorreo(email)) {
        mostrarNotificacion("⚠️ Ingresa un correo electrónico válido", "error");
        return;
    }

    if (!password) {
        mostrarNotificacion("⚠️ Ingresa tu contraseña", "error");
        return;
    }

    try {

        const { token, usuario } = Store.login(email, password);

        localStorage.setItem("token", token);
        localStorage.setItem("usuario", JSON.stringify(usuario));

        document.getElementById("inicioSesionForm")?.reset();
        cerrarLoginModal();
        actualizarEstadoSesion();

        mostrarNotificacion(`✅ Bienvenido ${usuario.nombre || "a StreetZone"}`);

        setTimeout(usuario.rol === "admin" ? irPanelAdmin : irInicio, 400);

    } catch (error) {
        mostrarNotificacion(error.message, "error");
    }
}

function cerrarSesion() {

    localStorage.removeItem("token");
    localStorage.removeItem("usuario");

    const panel = document.getElementById("panel-admin");
    if (panel) panel.style.display = "none";

    actualizarEstadoSesion();
    irInicio();

    mostrarNotificacion("👋 Sesión cerrada correctamente");
}

function mostrar(id, visible) {

    const el = document.getElementById(id);
    if (el) el.style.display = visible ? "list-item" : "none";
}

function actualizarEstadoSesion() {

    const logueado = Boolean(localStorage.getItem("token")) && obtenerUsuario();
    const admin = esAdmin();

    mostrar("menu-inicio", !admin);
    mostrar("menu-coleccion", !admin);
    mostrar("menu-ofertas", !admin);
    mostrar("menu-contacto", !admin);
    mostrar("menu-carrito", !admin);
    mostrar("menu-mis-pedidos", Boolean(logueado) && !admin);
    mostrar("menu-admin", admin);

    const btnLogin = document.getElementById("btn-login");
    const btnLogout = document.getElementById("btn-logout");

    if (btnLogin) btnLogin.style.display = logueado ? "none" : "list-item";
    if (btnLogout) btnLogout.style.display = logueado ? "list-item" : "none";

    if (admin) {
        ocultarInterfazCliente();
        cargarProductosAdmin();
        cargarOfertasAdmin();
    } else {
        mostrarInterfazCliente();
    }
}

function ocultarInterfazCliente() {

    ocultarTodasSecciones();
    cerrarCarrito();

    const panel = document.getElementById("panel-admin");
    if (panel) panel.style.display = "block";
}

function mostrarInterfazCliente() {

    const panel = document.getElementById("panel-admin");
    if (panel) panel.style.display = "none";

    const hayAlgunaVisible = [
        "ofertas", "contacto", "mis-pedidos"
    ].some(id => document.getElementById(id)?.style.display === "block");

    if (hayAlgunaVisible) return;

    document.getElementById("inicio").style.display = "flex";
    document.getElementById("coleccion").style.display = "block";
    document.querySelector(".productos").style.display = "block";
}

function irPanelAdmin() {

    if (!esAdmin()) {
        mostrarNotificacion(
            "❌ Acceso denegado. Solo los administradores pueden acceder al panel.",
            "error"
        );
        return;
    }

    ocultarTodasSecciones();

    const panel = document.getElementById("panel-admin");
    panel.style.display = "block";

    cargarProductosAdmin();
    cargarOfertasAdmin();

    panel.scrollIntoView({ behavior: "smooth" });
    cerrarMenu();
}

function cargarProductosAdmin() {

    if (!esAdmin()) return;

    productos = Store.listarProductos();
    filtrarProductosAdmin(categoriaAdminActual);
}

function filtrarProductosAdmin(categoria, boton = null) {

    categoriaAdminActual = categoria;

    document.querySelectorAll(".admin-filtro-btn").forEach(btn => {
        btn.classList.toggle(
            "active",
            boton
                ? btn === boton
                : normalizarTexto(btn.textContent) === normalizarTexto(categoria)
        );
    });

    const lista = categoria === "todos"
        ? productos
        : productos.filter(p => coincideCategoria(p, categoria));

    mostrarProductosAdmin(lista);
}

function mostrarProductosAdmin(lista) {

    const cont = document.getElementById("admin-productos-lista");
    if (!cont) return;

    if (!lista || lista.length === 0) {
        cont.innerHTML = vacio(
            "fa-box-open",
            "No hay productos",
            "No existen productos en esta categoría."
        );
        return;
    }

    cont.innerHTML = lista.map(p => {

        const categoria = obtenerNombreCategoria(p.categoria_id);
        const stock = Number(p.stock || 0);

        return `
            <div class="pedido-card admin-producto-card">

                <div class="pedido-header">
                    <div>
                        <h3>${escaparHTML(p.nombre)}</h3>
                        <p><i class="fas fa-tag"></i> ${escaparHTML(categoria)}</p>
                    </div>
                    <div class="pedido-total">${dinero(p.precio)}</div>
                </div>

                <div class="pedido-productos">
                    <div class="pedido-producto">
                        <div class="pedido-producto-imagen">
                            <img src="${escaparAtributo(p.imagen)}" alt="${escaparAtributo(p.nombre)}">
                        </div>

                        <div class="pedido-producto-info">
                            <strong>${escaparHTML(p.nombre)}</strong>
                            <span><i class="fas fa-box"></i> Stock: ${stock}</span>
                            <span><i class="fas fa-layer-group"></i> Categoría: ${escaparHTML(categoria)}</span>
                            <span><i class="fas fa-circle"></i> ${stock > 0 ? "Disponible" : "Agotado"}</span>
                        </div>

                        <div class="pedido-producto-subtotal">${dinero(p.precio)}</div>
                    </div>
                </div>

                <div class="pedido-footer">
                    <div>
                        <span>Descripción</span>
                        <p style="margin:5px 0 0;max-width:600px;">
                            ${escaparHTML(p.descripcion || "Sin descripción")}
                        </p>
                    </div>
                </div>

                <div class="admin-producto-acciones">
                    <button class="btn-admin-editar" onclick="editarProductoAdmin(${p.id})">
                        <i class="fas fa-pen"></i> Editar
                    </button>
                    <button class="btn-admin-eliminar" onclick="eliminarProductoAdmin(${p.id})">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </div>
            </div>`;
    }).join("");
}

function abrirFormularioProducto() {

    const form = document.getElementById("formProductoAdmin");
    const contenedor = document.getElementById("form-producto-admin");
    if (!form || !contenedor) return;

    form.reset();
    document.getElementById("admin-producto-id").value = "";
    document.getElementById("titulo-form-producto").textContent = "Nuevo producto";

    contenedor.style.display = "block";
    contenedor.scrollIntoView({ behavior: "smooth", block: "center" });
}

function cerrarFormularioProducto() {

    document.getElementById("formProductoAdmin")?.reset();
    document.getElementById("admin-producto-id").value = "";

    const contenedor = document.getElementById("form-producto-admin");
    if (contenedor) contenedor.style.display = "none";
}

function guardarProductoAdmin(event) {

    event.preventDefault();

    if (!esAdmin()) {
        mostrarNotificacion("❌ No tienes permisos de administrador", "error");
        return;
    }

    const id = document.getElementById("admin-producto-id")?.value;

    const datos = {
        nombre: document.getElementById("admin-nombre").value,
        precio: document.getElementById("admin-precio").value,
        stock: document.getElementById("admin-stock").value,
        categoria_id: document.getElementById("admin-categoria").value,
        imagen: document.getElementById("admin-imagen").value,
        descripcion: document.getElementById("admin-descripcion").value
    };

    try {

        if (id) {
            Store.actualizarProducto(id, datos);
        } else {
            Store.crearProducto(datos);
        }

        mostrarNotificacion(id
            ? "✅ Producto actualizado correctamente"
            : "✅ Producto creado correctamente");

        cerrarFormularioProducto();
        refrescarDatos();
        cargarProductosAdmin();
        cargarOfertasAdmin();

    } catch (error) {
        mostrarNotificacion(`⚠️ ${error.message}`, "error");
    }
}

function editarProductoAdmin(id) {

    const p = Store.obtenerProducto(id);

    if (!p) {
        mostrarNotificacion("❌ Producto no encontrado", "error");
        return;
    }

    document.getElementById("admin-producto-id").value = p.id;
    document.getElementById("admin-nombre").value = p.nombre || "";
    document.getElementById("admin-precio").value = p.precio || 0;
    document.getElementById("admin-stock").value = p.stock || 0;
    document.getElementById("admin-categoria").value = p.categoria_id || "";
    document.getElementById("admin-imagen").value = p.imagen || "";
    document.getElementById("admin-descripcion").value = p.descripcion || "";
    document.getElementById("titulo-form-producto").textContent = "Editar producto";

    const contenedor = document.getElementById("form-producto-admin");
    contenedor.style.display = "block";
    contenedor.scrollIntoView({ behavior: "smooth", block: "center" });
}

function eliminarProductoAdmin(id) {

    if (!esAdmin()) {
        mostrarNotificacion("❌ No tienes permisos de administrador", "error");
        return;
    }

    const nombre = Store.obtenerProducto(id)?.nombre || `#${id}`;

    if (!confirm(`¿Seguro que deseas eliminar el producto "${nombre}"?`)) return;

    try {
        Store.eliminarProducto(id);

        carrito = carrito.filter(i => Number(i.id) !== Number(id));
        guardarCarrito();
        actualizarContador();

        mostrarNotificacion("✅ Producto eliminado correctamente");

        refrescarDatos();
        cargarProductosAdmin();
        cargarOfertasAdmin();

    } catch (error) {
        mostrarNotificacion(error.message, "error");
    }
}

function cargarOfertasAdmin() {

    if (!esAdmin()) return;

    const lista = Store.listarOfertas();
    const cont = document.getElementById("admin-ofertas-lista");
    if (!cont) return;

    if (lista.length === 0) {
        cont.innerHTML = vacio("fa-tags", "No hay ofertas", "Todavía no hay ofertas registradas.");
        return;
    }

    cont.innerHTML = lista.map(oferta => {

        const p = Store.obtenerProducto(oferta.producto_id) || {};
        const original = Number(p.precio || 0);
        const precioOferta = Number(oferta.precio_oferta || 0);
        const vigente = Store.listarOfertasVigentes().some(o => o.id === oferta.id);

        return `
            <div class="pedido-card admin-oferta-card">

                <div class="pedido-header">
                    <div>
                        <h3>${escaparHTML(p.nombre || "Producto")}</h3>
                        <p><i class="fas fa-tag"></i> Descuento: ${Number(oferta.descuento || 0).toFixed(0)}%</p>
                    </div>
                    <div class="pedido-total">${dinero(precioOferta)}</div>
                </div>

                <div class="pedido-productos">
                    <div class="pedido-producto">
                        <div class="pedido-producto-imagen">
                            <img src="${escaparAtributo(p.imagen || "")}" alt="${escaparAtributo(p.nombre || "Producto")}">
                        </div>

                        <div class="pedido-producto-info">
                            <strong>${escaparHTML(p.nombre || "Producto")}</strong>
                            <span>Precio normal: ${dinero(original)}</span>
                            <span>Precio oferta: ${dinero(precioOferta)}</span>
                            <span>Vigencia: ${escaparHTML(String(oferta.fecha_inicio).replace("T", " "))}
                                → ${escaparHTML(String(oferta.fecha_fin).replace("T", " "))}</span>
                            <span>Estado: ${vigente ? "Vigente" : "No vigente"}</span>
                        </div>
                    </div>
                </div>

                <div class="admin-producto-acciones">
                    <button class="btn-admin-eliminar" onclick="eliminarOfertaAdmin(${oferta.id})">
                        <i class="fas fa-trash"></i> Eliminar oferta
                    </button>
                </div>
            </div>`;
    }).join("");
}

function cargarProductosSelectOferta() {

    const select = document.getElementById("admin-oferta-producto");
    if (!select) return;

    select.innerHTML = `<option value="">Selecciona un producto</option>` +
        Store.listarProductos().map(p => `
            <option value="${p.id}" data-precio="${p.precio}">
                ${escaparHTML(p.nombre)} — ${dinero(p.precio)}
            </option>`).join("");
}

function abrirFormularioOferta() {

    const contenedor = document.getElementById("form-oferta-admin");
    const form = document.getElementById("formOfertaAdmin");
    if (!contenedor || !form) return;

    form.reset();
    document.getElementById("admin-oferta-id").value = "";

    cargarProductosSelectOferta();

    contenedor.style.display = "block";
    contenedor.scrollIntoView({ behavior: "smooth", block: "center" });
}

function cerrarFormularioOferta() {

    document.getElementById("formOfertaAdmin")?.reset();

    const contenedor = document.getElementById("form-oferta-admin");
    if (contenedor) contenedor.style.display = "none";
}

function guardarOfertaAdmin(event) {

    event.preventDefault();

    if (!esAdmin()) {
        mostrarNotificacion("❌ No tienes permisos de administrador", "error");
        return;
    }

    try {

        Store.crearOferta({
            producto_id: document.getElementById("admin-oferta-producto").value,
            precio_oferta: document.getElementById("admin-precio-oferta").value,
            fecha_inicio: document.getElementById("admin-fecha-inicio").value,
            fecha_fin: document.getElementById("admin-fecha-fin").value,
            activo: document.getElementById("admin-oferta-activo").value === "true"
        });

        mostrarNotificacion("🔥 Oferta creada correctamente");

        cerrarFormularioOferta();
        refrescarDatos();
        cargarOfertasAdmin();

    } catch (error) {
        mostrarNotificacion(`⚠️ ${error.message}`, "error");
    }
}

function eliminarOfertaAdmin(id) {

    if (!esAdmin()) {
        mostrarNotificacion("❌ No tienes permisos de administrador", "error");
        return;
    }

    if (!confirm("¿Seguro que deseas eliminar esta oferta?")) return;

    try {
        Store.eliminarOferta(id);
        mostrarNotificacion("✅ Oferta eliminada correctamente");

        refrescarDatos();
        cargarOfertasAdmin();

    } catch (error) {
        mostrarNotificacion(error.message, "error");
    }
}

function enviarMensajeContacto() {

    try {

        Store.guardarMensaje({
            nombre: document.getElementById("nombreContacto")?.value,
            email: document.getElementById("emailContacto")?.value,
            mensaje: document.getElementById("mensajeContacto")?.value
        });

        mostrarNotificacion("📨 ¡Mensaje enviado correctamente!");
        document.getElementById("contactoForm")?.reset();

    } catch (error) {
        mostrarNotificacion(`⚠️ ${error.message}`, "error");
    }
}

function finalizarCompra() {

    if (carrito.length === 0) {
        mostrarNotificacion("🛒 Tu carrito está vacío", "error");
        return;
    }

    if (!localStorage.getItem("token")) {
        mostrarNotificacion("⚠️ Debes iniciar sesión para comprar", "error");
        cerrarCarrito();
        abrirLoginModal();
        return;
    }

    cerrarCarrito();
    abrirPagoModal();
}

function abrirPagoModal() {

    const modal = document.getElementById("pago-modal");
    const resumen = document.getElementById("resumen-compra");
    if (!modal) return;

    totalActual = calcularTotalCarrito();

    resumen.innerHTML = `
        <h4>Resumen del pedido</h4>

        ${carrito.map(item => `
            <div class="resumen-item">
                <span>${escaparHTML(item.nombre)} x ${item.cantidad}</span>
                <span>${dinero(obtenerPrecioCarrito(item) * Number(item.cantidad))}</span>
            </div>`).join("")}

        <div class="resumen-total">
            <span>Total</span>
            <span>${dinero(totalActual)}</span>
        </div>`;

    const btn = document.getElementById("btn-pagar");
    btn.innerHTML = `<i class="fas fa-check"></i> Confirmar pedido ${dinero(totalActual)}`;
    btn.onclick = procesarPago;

    document.getElementById("form-tarjeta").style.display = "none";
    document.getElementById("tarjeta-status").textContent = "";
    document.querySelectorAll(".metodo-pago").forEach(m => m.classList.remove("seleccionado"));

    modal.style.display = "flex";
}

function seleccionarMetodo(metodo, elemento) {

    document.querySelectorAll(".metodo-pago").forEach(m => m.classList.remove("seleccionado"));
    elemento?.classList.add("seleccionado");

    document.getElementById("form-tarjeta").style.display =
        metodo === "tarjeta" ? "block" : "none";
}

function cerrarPagoModal() {

    const modal = document.getElementById("pago-modal");
    if (modal) modal.style.display = "none";
}

function validarTarjeta() {

    const nombre = document.getElementById("nombre-tarjeta").value.trim();
    const numero = document.getElementById("numero-tarjeta").value.replace(/\s/g, "");
    const fecha = document.getElementById("fecha-expiracion").value.trim();
    const cvv = document.getElementById("cvv").value.trim();

    if (!nombre) return "Ingresa el nombre del titular";
    if (!/^\d{16}$/.test(numero)) return "El número de tarjeta debe tener 16 dígitos";

    const m = fecha.match(/^(\d{2})\/(\d{2})$/);
    if (!m || Number(m[1]) < 1 || Number(m[1]) > 12) return "La fecha debe tener formato MM/AA";

    const vence = new Date(2000 + Number(m[2]), Number(m[1]), 1);
    if (vence <= new Date()) return "La tarjeta está vencida";

    if (!/^\d{3,4}$/.test(cvv)) return "El CVV debe tener 3 o 4 dígitos";

    return null;
}

function procesarPago() {

    if (carrito.length === 0) {
        mostrarNotificacion("🛒 Tu carrito está vacío", "error");
        return;
    }

    const usuario = obtenerUsuario();

    if (!usuario || !localStorage.getItem("token")) {
        cerrarPagoModal();
        abrirLoginModal();
        return;
    }

    const estado = document.getElementById("tarjeta-status");

    if (!document.querySelector(".metodo-pago.seleccionado")) {
        mostrarNotificacion("⚠️ Selecciona un método de pago", "error");
        return;
    }

    const problema = validarTarjeta();

    if (problema) {
        estado.className = "payment-status error";
        estado.textContent = problema;
        return;
    }

    mostrarLoading();

    setTimeout(() => {

        try {

            const pedido = Store.crearPedido(
                usuario.id,
                carrito.map(i => ({ producto_id: i.id, cantidad: i.cantidad }))
            );

            carrito = [];
            guardarCarrito();
            actualizarContador();

            ["nombre-tarjeta", "numero-tarjeta", "fecha-expiracion", "cvv"]
                .forEach(id => { document.getElementById(id).value = ""; });

            ocultarLoading();
            cerrarPagoModal();
            refrescarDatos();
            mostrarConfirmacionPedido(pedido);

        } catch (error) {

            ocultarLoading();
            mostrarNotificacion(`❌ ${error.message}`, "error");

            refrescarDatos();
        }

    }, 900);
}

function irMisPedidos() {

    const usuario = obtenerUsuario();

    if (!usuario || !localStorage.getItem("token")) {
        mostrarNotificacion("⚠️ Debes iniciar sesión primero", "error");
        abrirLoginModal();
        return;
    }

    ocultarTodasSecciones();

    const sec = document.getElementById("mis-pedidos");
    sec.style.display = "block";

    mostrarMisPedidos(Store.listarPedidos(usuario.id));

    sec.scrollIntoView({ behavior: "smooth" });
    cerrarMenu();
}

function mostrarMisPedidos(pedidos) {

    const cont = document.getElementById("pedidos-container");
    if (!cont) return;

    if (!pedidos.length) {
        cont.innerHTML = vacio(
            "fa-shopping-bag",
            "Todavía no tienes pedidos",
            "Cuando realices una compra, aparecerá aquí.",
            `<button class="btn-primary" onclick="irColeccion()">Ver colección</button>`
        );
        return;
    }

    cont.innerHTML = pedidos.map(pedido => {

        const fecha = new Date(pedido.fecha_pedido).toLocaleString("es-MX", {
            dateStyle: "medium",
            timeStyle: "short"
        });

        const estado = pedido.estado || "pendiente";
        const pago = pedido.estado_pago || "pendiente";

        return `
            <div class="pedido-card">

                <div class="pedido-header">
                    <div>
                        <h3>Pedido #${pedido.id}</h3>
                        <p><i class="far fa-calendar"></i> ${fecha}</p>
                    </div>
                    <div class="pedido-total">${dinero(pedido.total)}</div>
                </div>

                <div class="pedido-estados">
                    <span class="pedido-estado estado-${escaparAtributo(estado)}">
                        <i class="fas fa-box"></i> ${formatearEstado(estado)}
                    </span>
                    <span class="pedido-estado pago-${escaparAtributo(pago)}">
                        <i class="fas fa-credit-card"></i> ${formatearEstadoPago(pago)}
                    </span>
                </div>

                <div class="pedido-productos">
                    <h4>Productos</h4>

                    ${pedido.detalles.map(d => `
                        <div class="pedido-producto">
                            <div class="pedido-producto-imagen">
                                <img src="${escaparAtributo(d.producto?.imagen || "")}"
                                     alt="${escaparAtributo(d.producto?.nombre || "Producto")}">
                            </div>
                            <div class="pedido-producto-info">
                                <strong>${escaparHTML(d.producto?.nombre || "Producto")}</strong>
                                <span>Cantidad: ${d.cantidad}</span>
                                <span>Precio: ${dinero(d.precio_unitario)}</span>
                            </div>
                            <div class="pedido-producto-subtotal">${dinero(d.subtotal)}</div>
                        </div>`).join("")}
                </div>

                <div class="pedido-footer">
                    <span>Total del pedido</span>
                    <strong>${dinero(pedido.total)}</strong>
                </div>
            </div>`;
    }).join("");
}

function capitalizar(t) {
    t = String(t);
    return t.charAt(0).toUpperCase() + t.slice(1);
}

function formatearEstado(estado) {

    return {
        pendiente: "Pendiente",
        confirmado: "Confirmado",
        preparado: "Preparando",
        enviado: "Enviado",
        entregado: "Entregado",
        cancelado: "Cancelado"
    }[estado] || capitalizar(estado);
}

function formatearEstadoPago(estado) {

    return {
        pendiente: "Pago pendiente",
        pagado: "Pagado",
        fallido: "Pago fallido",
        reembolsado: "Reembolsado"
    }[estado] || capitalizar(estado);
}

function mostrarConfirmacionPedido(pedido) {

    const modal = document.getElementById("confirmacion-modal");
    if (!modal) return;

    const nombre = obtenerUsuario()?.nombre || "cliente";

    document.getElementById("mensaje-confirmacion").textContent =
        `¡Gracias por tu pedido, ${nombre}!`;

    document.getElementById("detalle-confirmacion").innerHTML = `
        <p><strong>🧾 Número de pedido:</strong> #${pedido.id}</p>
        <p><strong>📦 Total:</strong> ${dinero(pedido.total)}</p>
        <p><strong>📋 Estado:</strong> ${escaparHTML(formatearEstado(pedido.estado))}</p>
        <p><strong>💳 Estado del pago:</strong> ${escaparHTML(formatearEstadoPago(pedido.estado_pago))}</p>`;

    modal.style.display = "flex";
}

function cerrarConfirmacion() {

    const modal = document.getElementById("confirmacion-modal");
    if (modal) modal.style.display = "none";
}

function mostrarLoading() {

    ocultarLoading();

    const loading = document.createElement("div");
    loading.id = "loadingOverlay";
    loading.className = "loading-overlay";
    loading.innerHTML = `
        <div class="loading-spinner"></div>
        <p>Registrando pedido...</p>
        <p style="font-size:0.8rem;">No cierres esta ventana</p>`;

    document.body.appendChild(loading);
}

function ocultarLoading() {
    document.getElementById("loadingOverlay")?.remove();
}

window.addEventListener("click", event => {

    const cierres = {
        "carrito-modal": cerrarCarrito,
        "pago-modal": cerrarPagoModal,
        "confirmacion-modal": cerrarConfirmacion,
        "login-modal": cerrarLoginModal
    };

    const cerrar = cierres[event.target?.id];
    if (cerrar) cerrar();
});
