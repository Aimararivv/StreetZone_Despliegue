const http = require("http");
const fs = require("fs");
const path = require("path");

const carpeta = path.resolve(process.argv[2] || path.join(__dirname, ".."));
const puerto = Number(process.argv[3] || process.env.PORT || 3000);

const tipos = {
    ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript",
    ".json": "application/json",
    ".svg": "image/svg+xml", ".png": "image/png"
};

http.createServer((req, res) => {
    let ruta = decodeURIComponent(req.url.split("?")[0]);
    if (ruta.endsWith("/")) ruta += "index.html";

    const archivo = path.join(carpeta, ruta);
    if (!archivo.startsWith(carpeta)) { res.writeHead(403); return res.end(); }

    fs.readFile(archivo, (err, datos) => {
        if (err) { res.writeHead(404); return res.end("No encontrado"); }
        res.writeHead(200, { "Content-Type": tipos[path.extname(archivo)] || "application/octet-stream", "Cache-Control": "no-cache" });
        res.end(datos);
    });
}).listen(puerto, () => console.log(`Sirviendo ${carpeta} en http://localhost:${puerto}`));
