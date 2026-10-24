
// Cargamos las variables de entorno del archivo .env
require("dotenv").config();

// Importamos Express y CORS
const express = require("express");
const cors = require("cors");

// Importamos las rutas del proyecto
const salasRouter = require("./routes/salas");
const reservasRouter = require("./routes/reservas");
const usuariosRouter = require("./routes/usuarios");

// Creamos la aplicación de Express
const app = express();

// Definimos el puerto del servidor.
// Render proporciona su propio puerto mediante process.env.PORT.
// Si trabajamos localmente, utilizamos el puerto 3000.
const PORT = process.env.PORT || 3000;

// Configuramos el servidor para recibir datos en formato JSON
app.use(express.json());

// Permitimos las solicitudes HTTP desde el frontend
app.use(cors());

// Ruta principal para comprobar que la API funciona
app.get("/", (req, res) => {
    res.json({
        mensaje: "GrooveSpace API funcionando correctamente."
    });
});

// Registramos las rutas de la API
app.use("/api/salas", salasRouter);
app.use("/api/reservas", reservasRouter);
app.use("/api/usuarios", usuariosRouter);

// Iniciamos el servidor
app.listen(PORT, () => {
    console.log(`GrooveSpace API funcionando en el puerto ${PORT}`);
});
