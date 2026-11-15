const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const raiz = path.join(__dirname, "..");
const dist = path.join(raiz, "dist");
const pkg = require("../package.json");

const build = process.env.CIRCLE_BUILD_NUM || process.env.BUILD_NUMBER || "local";

function commit() {
    const sha = process.env.CIRCLE_SHA1 || process.env.GIT_COMMIT;
    if (sha) return sha.slice(0, 7);
    try {
        return execSync("git rev-parse --short HEAD", { cwd: raiz, stdio: ["ignore", "pipe", "ignore"] })
            .toString().trim();
    } catch (e) {
        return "sin-git";
    }
}

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

["index.html", "style.css", "app.js", "js", "assets"]
    .forEach(f => fs.cpSync(path.join(raiz, f), path.join(dist, f), { recursive: true }));

const version = { version: pkg.version, build, commit: commit(), fecha: new Date().toISOString() };
fs.writeFileSync(path.join(dist, "version.json"), JSON.stringify(version, null, 2));

fs.writeFileSync(path.join(dist, "_headers"),
    "/version.json\n  Cache-Control: no-store\n");

console.log("✔ Build listo en dist/", version);
