const express = require("express"); // Importamos Express para crear las rutas de la API.
const router = express.Router(); // Creamos un enrutador para organizar las rutas de las salas.

// Definimos las salas que existen actualmente en GrooveSpace.
const salas = [
    {
        id: "standard", // Identificador que usará el sistema.
        nombre: "Sala Standard" // Nombre visible de la sala.
    },
    {
        id: "premium",
        nombre: "Sala Premium"
    },
    {
        id: "bateria",
        nombre: "Sala de Batería"
    }
];

// Definimos una ruta GET para consultar todas las salas.
router.get("/", (req, res) => {
    // Devolvemos la lista de salas en formato JSON.
    res.json(salas);
});

// Exportamos el enrutador para poder utilizarlo en server.js.
module.exports = router;
