const url = (process.argv[2] || "").replace(/\/$/, "");
const esperado = process.argv[3];

if (!url) { console.error("Uso: node scripts/smoke.js <url> [build]"); process.exit(2); }

async function intentar(fn, veces = 6, espera = 5000) {
    let ultimo;
    for (let i = 1; i <= veces; i++) {
        try { return await fn(); } catch (e) {
            ultimo = e;
            console.log(`  intento ${i}/${veces} falló: ${e.message}`);
            await new Promise(r => setTimeout(r, espera));
        }
    }
    throw ultimo;
}

(async () => {
    const home = await intentar(async () => {
        const r = await fetch(url + "/");
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.text();
    });
    if (!home.includes("StreetZone")) throw new Error("La página no contiene 'StreetZone'");
    console.log("✔ La página principal responde");

    const v = await intentar(async () => {
        const r = await fetch(url + "/version.json", { cache: "no-store" });
        if (!r.ok) throw new Error("HTTP " + r.status);
        const j = await r.json();
        if (esperado && String(j.build) !== String(esperado)) throw new Error(`build publicado ${j.build} ≠ esperado ${esperado}`);
        return j;
    });
    console.log("✔ Versión publicada:", v);
})().catch(e => { console.error("✖ Prueba de humo fallida:", e.message); process.exit(1); });
