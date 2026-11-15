const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const raiz = path.join(__dirname, "..");
const leer = f => fs.readFileSync(path.join(raiz, f), "utf8");
const errores = [];
const fallo = m => errores.push(m);

["app.js", "js/seed.js", "js/store.js", "scripts/build.js", "scripts/serve.js", "scripts/smoke.js", "scripts/deploy.js"]
    .forEach(f => {
        const r = spawnSync(process.execPath, ["--check", path.join(raiz, f)], { encoding: "utf8" });
        if (r.status !== 0) fallo(`Error de sintaxis en ${f}:\n${r.stderr}`);
    });

const html = leer("index.html");
const app = leer("app.js");

for (const m of html.matchAll(/(?:src|href)="([^"#?]+)"/g)) {
    const ruta = m[1];
    if (/^(https?:|data:|mailto:)/.test(ruta)) continue;
    if (!fs.existsSync(path.join(raiz, ruta))) fallo(`index.html referencia un archivo que no existe: ${ruta}`);
}

const dinamicos = new Set(["loadingOverlay", "streetzone-notificacion"]);
const idsHTML = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]));
for (const m of app.matchAll(/getElementById\(\s*"([^"]+)"\s*\)/g)) {
    if (!idsHTML.has(m[1]) && !dinamicos.has(m[1])) fallo(`app.js usa el id "${m[1]}" que no existe en index.html`);
}

const nativas = new Set(["event", "return", "confirm", "alert"]);
for (const m of html.matchAll(/onclick="([^"]+)"/g)) {
    for (const f of m[1].matchAll(/\b([A-Za-z_]\w*)\s*\(/g)) {
        if (nativas.has(f[1])) continue;
        if (!new RegExp(`function\\s+${f[1]}\\b`).test(app)) fallo(`onclick usa ${f[1]}() y no está definida en app.js`);
    }
}

[/API_URL/, /onrender\.com/, /stripe/i, /\/api\//].forEach(re => {
    if (re.test(app)) fallo(`app.js todavía contiene una referencia al backend: ${re}`);
});
if (/fetch\(/.test(app) && !/fetch\("version\.json"/.test(app)) fallo("app.js hace fetch a algo distinto de version.json");

const seed = require("../js/seed.js");
seed.productos.forEach(p => {
    if (p.imagen && !fs.existsSync(path.join(raiz, p.imagen))) fallo(`Imagen no encontrada para "${p.nombre}": ${p.imagen}`);
});

const idsCat = new Set(seed.categorias.map(c => c.id));
seed.productos.forEach(p => { if (!idsCat.has(p.categoria_id)) fallo(`Producto ${p.id} con categoría inexistente`); });
const idsProd = new Set(seed.productos.map(p => p.id));
seed.ofertas.forEach(o => { if (!idsProd.has(o.producto_id)) fallo(`Oferta ${o.id} con producto inexistente`); });

if (errores.length) {
    console.error("✖ Validación fallida:\n - " + errores.join("\n - "));
    process.exit(1);
}
console.log("✔ Validación correcta");
