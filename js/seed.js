(function (root, factory) {
    const seed = factory();
    if (typeof module === "object" && module.exports) {
        module.exports = seed;
    } else {
        root.STREETZONE_SEED = seed;
    }
})(typeof self !== "undefined" ? self : this, function () {

    const img = n => `assets/img/producto-${n}.svg`;

    return {

        schema: 1,

        categorias: [
            { id: 1, nombre: "Camisetas" },
            { id: 2, nombre: "Hoodies" },
            { id: 3, nombre: "Chaquetas" },
            { id: 4, nombre: "Jeans" },
            { id: 5, nombre: "Pantalones" },
            { id: 6, nombre: "Calzado" },
            { id: 7, nombre: "Accesorios" }
        ],

        productos: [
            { id: 1, categoria_id: 1, nombre: "Camiseta Oversize Zone", precio: 349, stock: 25, imagen: img(1), descripcion: "Algodón pesado, corte oversize y logo bordado." },
            { id: 2, categoria_id: 1, nombre: "Camiseta Graphic Tag", precio: 299, stock: 30, imagen: img(2), descripcion: "Estampado frontal estilo cartel callejero." },
            { id: 3, categoria_id: 2, nombre: "Hoodie Street Black", precio: 799, stock: 15, imagen: img(3), descripcion: "Hoodie negro con capucha doble y bolsillo canguro." },
            { id: 4, categoria_id: 2, nombre: "Hoodie Drop 26", precio: 849, stock: 12, imagen: img(4), descripcion: "Edición limitada del drop 2026." },
            { id: 5, categoria_id: 3, nombre: "Chaqueta Bomber Naranja", precio: 1299, stock: 8, imagen: img(5), descripcion: "Bomber ligera color naranja señal." },
            { id: 6, categoria_id: 3, nombre: "Chaqueta Denim Washed", precio: 1199, stock: 10, imagen: img(6), descripcion: "Mezclilla lavada con botones metálicos." },
            { id: 7, categoria_id: 4, nombre: "Jeans Baggy Indigo", precio: 899, stock: 18, imagen: img(7), descripcion: "Corte baggy, tiro medio, azul índigo." },
            { id: 8, categoria_id: 4, nombre: "Jeans Slim Negro", precio: 799, stock: 20, imagen: img(8), descripcion: "Slim fit elástico en negro." },
            { id: 9, categoria_id: 5, nombre: "Pantalón Cargo Olivo", precio: 749, stock: 14, imagen: img(9), descripcion: "Seis bolsillos y ajuste en tobillo." },
            { id: 10, categoria_id: 5, nombre: "Jogger Urban Gris", precio: 599, stock: 22, imagen: img(10), descripcion: "Jogger de felpa suave color gris." },
            { id: 11, categoria_id: 6, nombre: "Tenis Runner Zone", precio: 1499, stock: 9, imagen: img(11), descripcion: "Suela ligera y amortiguación para diario." },
            { id: 12, categoria_id: 6, nombre: "Botas Street Mid", precio: 1699, stock: 6, imagen: img(12), descripcion: "Botas de caña media con suela gruesa." },
            { id: 13, categoria_id: 7, nombre: "Gorra Snapback SZ", precio: 249, stock: 40, imagen: img(13), descripcion: "Gorra ajustable con parche SZ." },
            { id: 14, categoria_id: 7, nombre: "Lentes Retro Sun", precio: 329, stock: 0, imagen: img(14), descripcion: "Lentes de sol estilo retro (agotados)." }
        ],

        ofertas: [
            { id: 1, producto_id: 3, precio_oferta: 599, descuento: 25, fecha_inicio: "2026-01-01T00:00", fecha_fin: "2030-12-31T23:59", activo: true },
            { id: 2, producto_id: 11, precio_oferta: 1099, descuento: 27, fecha_inicio: "2026-01-01T00:00", fecha_fin: "2030-12-31T23:59", activo: true }
        ],

        usuarios: [
            { id: 1, nombre: "Administrador", email: "admin@streetzone.com", password: "admin123", rol: "admin" },
            { id: 2, nombre: "Cliente Demo", email: "cliente@streetzone.com", password: "cliente123", rol: "cliente" }
        ],

        pedidos: [],
        mensajes: []
    };
});
