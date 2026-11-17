const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const CLI = "netlify-cli@17.38.1";

function extraerUrl(salida, entorno) {
    const i = salida.indexOf("{");
    if (i === -1) throw new Error("La CLI no devolvió JSON:\n" + salida);

    const datos = JSON.parse(salida.slice(i, salida.lastIndexOf("}") + 1));
    const url = entorno === "prod"
        ? datos.url
        : datos.deploy_url || datos.url;

    if (!url && entorno === "prod" && datos.deploy_url) {
        throw new Error("Netlify no devolvió la URL de producción (URL del sitio): el despliegue no se publicó como producción:\n" + salida);
    }
    if (!url) throw new Error("La respuesta de Netlify no incluye URL:\n" + salida);
    return url;
}

function construirArgs(entorno, mensaje) {
    const args = ["--yes", CLI, "deploy", "--dir=dist", "--json", `--message=${mensaje}`];
    args.push(entorno === "prod" ? "--prod" : "--alias=staging");
    return args;
}

function ejecutarNpx(args) {
    const opciones = { encoding: "utf8", env: process.env, maxBuffer: 20 * 1024 * 1024 };

    if (process.platform === "win32") {
        const citados = args.map(a => `"${a.replace(/"/g, "")}"`);
        return spawnSync("npx", citados, { ...opciones, shell: true });
    }
    return spawnSync("npx", args, { ...opciones, shell: false });
}

function desplegarNetlify(entorno, mensaje) {
    ["NETLIFY_AUTH_TOKEN", "NETLIFY_SITE_ID"].forEach(v => {
        if (!process.env[v]) throw new Error(`Falta la variable de entorno ${v}`);
    });

    const r = ejecutarNpx(construirArgs(entorno, mensaje));

    if (r.status !== 0) throw new Error(`netlify deploy falló (código ${r.status}):\n${r.stdout}\n${r.stderr}`);
    return extraerUrl(r.stdout, entorno);
}

function desplegarLocal(entorno) {
    const base = process.env.LOCAL_DEPLOY_DIR;
    if (!base) throw new Error("Falta la variable de entorno LOCAL_DEPLOY_DIR");

    const destino = path.resolve(base, entorno);
    fs.rmSync(destino, { recursive: true, force: true });
    fs.mkdirSync(destino, { recursive: true });
    fs.cpSync("dist", destino, { recursive: true });
    return destino;
}

function main() {
    const entorno = process.argv[2];
    const target = (process.argv.find(a => a.startsWith("--target=")) || "--target=netlify").split("=")[1];

    if (!["staging", "prod"].includes(entorno)) {
        console.error("Uso: node scripts/deploy.js staging|prod [--target=netlify|local]");
        process.exit(2);
    }
    if (!fs.existsSync("dist/index.html")) {
        console.error("No existe dist/. Ejecuta primero: npm run build");
        process.exit(2);
    }

    const version = JSON.parse(fs.readFileSync("dist/version.json", "utf8"));
    const mensaje = `CircleCI build #${version.build} (${version.commit})`;

    console.log(`→ Desplegando ${mensaje} a ${entorno} [${target}]`);

    const url = target === "local" ? desplegarLocal(entorno) : desplegarNetlify(entorno, mensaje);

    fs.writeFileSync(`deploy-${entorno}.url`, url);
    console.log(`✔ Publicado en: ${url}`);
}

if (require.main === module) {
    try { main(); } catch (e) { console.error("✖ " + e.message); process.exit(1); }
}

module.exports = { extraerUrl, construirArgs };