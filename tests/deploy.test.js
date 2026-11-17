const test = require("node:test");
const assert = require("node:assert/strict");
const { extraerUrl, construirArgs } = require("../scripts/deploy.js");

test("extrae la URL de staging aunque haya texto antes del JSON", () => {
    const salida = 'Deploying to draft URL...\n{"deploy_url":"https://staging--sz.netlify.app","logs":"x"}\n';
    assert.equal(extraerUrl(salida, "staging"), "https://staging--sz.netlify.app");
});

test("extrae la URL de producción", () => {
    const salida = '{"url":"https://sz.netlify.app","deploy_url":"https://abc--sz.netlify.app"}';
    assert.equal(extraerUrl(salida, "prod"), "https://sz.netlify.app");
});

test("falla con mensaje claro si no hay JSON o URL", () => {
    assert.throws(() => extraerUrl("Error: not logged in", "prod"), /JSON/);
    assert.throws(() => extraerUrl('{"logs":"x"}', "prod"), /URL/);
});

test("producción exige la URL del sitio: si solo hay deploy_url no se publicó como producción", () => {
    assert.throws(() => extraerUrl('{"deploy_url":"https://abc--sz.netlify.app"}', "prod"), /producción/);
});

test("los argumentos conservan --prod y el mensaje completo aunque tenga # y paréntesis", () => {
    const args = construirArgs("prod", "CircleCI build #22 (180218b)");
    assert.ok(args.includes("--prod"));
    assert.ok(args.includes("--message=CircleCI build #22 (180218b)"));
    assert.ok(construirArgs("staging", "x").includes("--alias=staging"));
});