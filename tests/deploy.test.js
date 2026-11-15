const test = require("node:test");
const assert = require("node:assert/strict");
const { extraerUrl } = require("../scripts/deploy.js");

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
