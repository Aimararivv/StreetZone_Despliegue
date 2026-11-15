const test = require("node:test");
const assert = require("node:assert/strict");

const Store = require("../js/store.js");
const SEED = require("../js/seed.js");

function nuevo() {
    const datos = {};
    Store.init(SEED, {
        almacen: {
            getItem: k => (k in datos ? datos[k] : null),
            setItem: (k, v) => { datos[k] = String(v); },
            removeItem: k => { delete datos[k]; }
        }
    });
}

test("carga categorías y productos iniciales", () => {
    nuevo();
    assert.equal(Store.listarCategorias().length, 7);
    assert.ok(Store.listarProductos().length >= 10);
});

test("login correcto e incorrecto", () => {
    nuevo();
    const { usuario, token } = Store.login("ADMIN@streetzone.com", "admin123");
    assert.equal(usuario.rol, "admin");
    assert.equal(usuario.password, undefined, "no debe devolver la contraseña");
    assert.ok(token);
    assert.throws(() => Store.login("admin@streetzone.com", "mala"), /incorrectos/);
});

test("CRUD de productos", () => {
    nuevo();
    const p = Store.crearProducto({ nombre: "Gorro", precio: 100, stock: 5, categoria_id: 7 });
    assert.equal(Store.obtenerProducto(p.id).nombre, "Gorro");

    Store.actualizarProducto(p.id, { nombre: "Gorro Pro", precio: 120, stock: 3, categoria_id: 7 });
    assert.equal(Store.obtenerProducto(p.id).precio, 120);

    Store.eliminarProducto(p.id);
    assert.equal(Store.obtenerProducto(p.id), null);
});

test("valida datos de producto", () => {
    nuevo();
    assert.throws(() => Store.crearProducto({ nombre: "", precio: 1, stock: 1, categoria_id: 1 }), /nombre/);
    assert.throws(() => Store.crearProducto({ nombre: "A", precio: -1, stock: 1, categoria_id: 1 }), /precio/);
    assert.throws(() => Store.crearProducto({ nombre: "A", precio: 1, stock: 1.5, categoria_id: 1 }), /stock/);
    assert.throws(() => Store.crearProducto({ nombre: "A", precio: 1, stock: 1, categoria_id: 99 }), /categoría/);
});

test("ofertas: validaciones y descuento calculado", () => {
    nuevo();
    const base = { producto_id: 1, fecha_inicio: "2026-01-01T00:00", fecha_fin: "2030-01-01T00:00" };

    assert.throws(() => Store.crearOferta({ ...base, precio_oferta: 349 }), /menor/);
    assert.throws(() => Store.crearOferta({ ...base, precio_oferta: 200, fecha_fin: "2025-01-01T00:00" }), /posterior/);

    const o = Store.crearOferta({ ...base, precio_oferta: 174.5 });
    assert.equal(o.descuento, 50);
});

test("ofertas: solo se muestran las vigentes", () => {
    nuevo();
    const ahora = new Date("2027-06-01T12:00:00");
    const vigentes = Store.listarOfertasVigentes(ahora).map(o => o.id);
    assert.ok(vigentes.includes(1));

    Store.crearOferta({ producto_id: 1, precio_oferta: 100, fecha_inicio: "2020-01-01T00:00", fecha_fin: "2020-02-01T00:00" });
    Store.crearOferta({ producto_id: 2, precio_oferta: 100, fecha_inicio: "2026-01-01T00:00", fecha_fin: "2030-01-01T00:00", activo: false });
    const ids = Store.listarOfertasVigentes(ahora);
    assert.ok(!ids.some(o => o.producto_id === 1), "vencida no debe aparecer");
    assert.ok(!ids.some(o => o.producto_id === 2), "inactiva no debe aparecer");
});

test("eliminar un producto borra sus ofertas", () => {
    nuevo();
    Store.eliminarProducto(3);
    assert.ok(!Store.listarOfertas().some(o => o.producto_id === 3));
});

test("pedido: descuenta stock y usa el precio de oferta", () => {
    nuevo();
    const ahora = new Date("2027-06-01T12:00:00");
    const antes = Store.obtenerProducto(3).stock;

    const pedido = Store.crearPedido(2, [
        { producto_id: 3, cantidad: 2 },
        { producto_id: 1, cantidad: 1 }
    ], ahora);

    assert.equal(pedido.total, 599 * 2 + 349);
    assert.equal(pedido.estado_pago, "pagado");
    assert.equal(Store.obtenerProducto(3).stock, antes - 2);
    assert.equal(Store.listarPedidos(2).length, 1);
    assert.equal(Store.listarPedidos(1).length, 0, "no mezcla pedidos de otros usuarios");
});

test("pedido: rechaza stock insuficiente sin modificar nada", () => {
    nuevo();
    const stock1 = Store.obtenerProducto(1).stock;
    assert.throws(() => Store.crearPedido(2, [
        { producto_id: 1, cantidad: 1 },
        { producto_id: 14, cantidad: 1 }
    ]), /Stock insuficiente/);
    assert.equal(Store.obtenerProducto(1).stock, stock1, "no debe descontar si falla");
    assert.equal(Store.listarPedidos(2).length, 0);
});

test("pedido: carrito vacío o cantidad inválida", () => {
    nuevo();
    assert.throws(() => Store.crearPedido(2, []), /vacío/);
    assert.throws(() => Store.crearPedido(2, [{ producto_id: 1, cantidad: 0 }]), /inválida/);
});

test("mensajes de contacto", () => {
    nuevo();
    Store.guardarMensaje({ nombre: "Ana", email: "ana@correo.com", mensaje: "Hola" });
    assert.equal(Store.listarMensajes().length, 1);
    assert.throws(() => Store.guardarMensaje({ nombre: "Ana", email: "mal", mensaje: "Hola" }), /correo/);
});

test("los datos persisten entre cargas (mismo almacenamiento)", () => {
    const datos = {};
    const almacen = {
        getItem: k => (k in datos ? datos[k] : null),
        setItem: (k, v) => { datos[k] = String(v); },
        removeItem: k => { delete datos[k]; }
    };
    Store.init(SEED, { almacen });
    Store.crearProducto({ nombre: "Persistente", precio: 10, stock: 1, categoria_id: 1 });

    Store.init(SEED, { almacen });
    assert.ok(Store.listarProductos().some(p => p.nombre === "Persistente"));
});
