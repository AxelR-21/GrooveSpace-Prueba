
const express = require("express"); // Importamos Express para crear rutas.
const fs = require("fs"); // Permite leer y escribir archivos.
const path = require("path"); // Permite construir rutas de archivos.

// Importamos el middleware que verifica los tokens JWT.
const verificarToken = require("../middleware/autenticacion");

const router = express.Router(); // Creamos el enrutador de reservas.

// Indicamos dónde se encuentra el archivo que almacena las reservas.
const archivoReservas = path.join(__dirname, "..", "data", "reservas.json");

// Definimos los identificadores de las salas que acepta el sistema.
const salasValidas = ["standard", "premium", "bateria"];

// Establecemos una duración fija de 60 minutos por reserva.
const DURACION_RESERVA = 60;

// Leemos las reservas guardadas en el archivo JSON.
function leerReservas() {
    const contenido = fs.readFileSync(archivoReservas, "utf8");
    return JSON.parse(contenido); // Convertimos el texto en un arreglo.
}

// Guardamos las reservas actualizadas en el archivo JSON.
function guardarReservas(reservas) {
    fs.writeFileSync(
        archivoReservas,
        JSON.stringify(reservas, null, 2), // Formateamos el JSON.
        "utf8"
    );
}

// Convertimos un horario HH:MM a minutos desde la medianoche.
// Por ejemplo, 15:30 se convierte en 930.
function convertirAMinutos(horario) {
    const [horas, minutos] = horario.split(":").map(Number);
    return horas * 60 + minutos;
}

// GET /api/reservas/disponibilidad
// Permite consultar la disponibilidad sin iniciar sesión.
router.get("/disponibilidad", (req, res) => {
    try {
        // Obtenemos los parámetros enviados en la URL.
        const { sala, fecha, horario } = req.query;

        // Comprobamos que los parámetros sean textos no vacíos.
        if (
            typeof sala !== "string" ||
            typeof fecha !== "string" ||
            typeof horario !== "string" ||
            !sala.trim() ||
            !fecha.trim() ||
            !horario.trim()
        ) {
            return res.status(400).json({
                error: "Debés indicar sala, fecha y horario."
            });
        }

        // Verificamos que la sala exista.
        if (!salasValidas.includes(sala)) {
            return res.status(400).json({
                error: "La sala indicada no es válida."
            });
        }

        // Comprobamos el formato de la fecha: AAAA-MM-DD.
        if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
            return res.status(400).json({
                error: "La fecha debe tener el formato AAAA-MM-DD."
            });
        }

        // Verificamos que la fecha exista en el calendario.
        const fechaReal = new Date(`${fecha}T00:00:00Z`);

        if (
            Number.isNaN(fechaReal.getTime()) ||
            fechaReal.toISOString().slice(0, 10) !== fecha
        ) {
            return res.status(400).json({
                error: "La fecha indicada no existe."
            });
        }

        // Impedimos consultar fechas pasadas.
        const hoy = new Date();
        hoy.setUTCHours(0, 0, 0, 0);

        if (fechaReal < hoy) {
            return res.status(400).json({
                error: "No se puede consultar disponibilidad de fechas pasadas."
            });
        }

        // Comprobamos el formato del horario: HH:MM.
        if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(horario)) {
            return res.status(400).json({
                error: "El horario debe tener el formato HH:MM."
            });
        }

        // Calculamos el inicio y el final de la reserva solicitada.
        const inicioNuevo = convertirAMinutos(horario);
        const finNuevo = inicioNuevo + DURACION_RESERVA;

        // Impedimos que la reserva termine después de medianoche.
        if (finNuevo > 24 * 60) {
            return res.status(400).json({
                error: "La reserva debe terminar antes de la medianoche."
            });
        }

        // Leemos las reservas para comprobar los horarios existentes.
        const reservas = leerReservas();

        // Buscamos una reserva activa que se superponga con la solicitada.
        const haySuperposicion = reservas.some((reserva) => {
            // Ignoramos otras salas, fechas y reservas canceladas.
            if (
                reserva.sala !== sala ||
                reserva.fecha !== fecha ||
                reserva.estado !== "activa"
            ) {
                return false;
            }

            // Calculamos el intervalo horario de la reserva existente.
            const inicioExistente = convertirAMinutos(reserva.horario);
            const finExistente = inicioExistente + reserva.duracion;

            // Comprobamos si los intervalos horarios se superponen.
            return inicioNuevo < finExistente &&
                   finNuevo > inicioExistente;
        });

        // Devolvemos el resultado sin crear una reserva.
        return res.status(200).json({
            sala: sala,
            fecha: fecha,
            horario: horario,
            duracion: DURACION_RESERVA,
            disponible: !haySuperposicion
        });
    } catch (error) {
        // Registramos el error en la terminal del servidor.
        console.error("Error al consultar disponibilidad:", error);

        // Devolvemos un error interno.
        return res.status(500).json({
            error: "No se pudo consultar la disponibilidad."
        });
    }
});

// GET /api/reservas/agenda
// Muestra los horarios ocupados de una sala en una fecha determinada.
router.get("/agenda", (req, res) => {
    try {
        // Obtenemos la sala y la fecha desde la URL.
        const { sala, fecha } = req.query;

        // Comprobamos que se hayan enviado ambos parámetros.
        if (
            typeof sala !== "string" ||
            typeof fecha !== "string" ||
            !sala.trim() ||
            !fecha.trim()
        ) {
            return res.status(400).json({
                error: "Debés indicar una sala y una fecha."
            });
        }

        // Verificamos que la sala exista.
        if (!salasValidas.includes(sala)) {
            return res.status(400).json({
                error: "La sala indicada no es válida."
            });
        }

        // Validamos el formato de la fecha.
        if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
            return res.status(400).json({
                error: "La fecha debe tener el formato AAAA-MM-DD."
            });
        }

        // Comprobamos que la fecha exista realmente.
        const fechaReal = new Date(`${fecha}T00:00:00Z`);

        if (
            Number.isNaN(fechaReal.getTime()) ||
            fechaReal.toISOString().slice(0, 10) !== fecha
        ) {
            return res.status(400).json({
                error: "La fecha indicada no existe."
            });
        }

        // Leemos las reservas guardadas.
        const reservas = leerReservas();

        // Buscamos las reservas activas de esa sala y fecha.
        const horariosOcupados = reservas
            .filter((reserva) =>
                reserva.sala === sala &&
                reserva.fecha === fecha &&
                reserva.estado === "activa"
            )
            .map((reserva) => ({
                horario: reserva.horario,
                duracion: reserva.duracion
            }))
            .sort((a, b) => a.horario.localeCompare(b.horario));

        // Devolvemos solamente los horarios ocupados.
        return res.status(200).json({
            sala: sala,
            fecha: fecha,
            horariosOcupados: horariosOcupados
        });

    } catch (error) {
        // Registramos el error en la terminal.
        console.error("Error al consultar la agenda:", error);

        return res.status(500).json({
            error: "No se pudo consultar la agenda."
        });
    }
});

// GET /api/reservas
// Devuelve solamente las reservas del usuario autenticado.
router.get("/", verificarToken, (req, res) => {
    try {
        // Leemos todas las reservas guardadas.
        const reservas = leerReservas();

        // Filtramos por el ID del usuario del token verificado.
        const reservasUsuario = reservas.filter(
            (reserva) => reserva.usuarioId === req.usuario.id
        );

        // Devolvemos únicamente las reservas personales.
        return res.status(200).json(reservasUsuario);
    } catch (error) {
        // Registramos el error para facilitar su diagnóstico.
        console.error("Error al consultar las reservas:", error);

        return res.status(500).json({
            mensaje: "No se pudieron consultar las reservas."
        });
    }
});

// POST /api/reservas
// Crea una reserva asociada al usuario autenticado.
router.post("/", verificarToken, (req, res) => {
    try {
        // Extraemos los datos enviados por el cliente.
        const { sala, fecha, horario } = req.body;

        // Comprobamos que los campos sean textos no vacíos.
        if (
            typeof sala !== "string" ||
            typeof fecha !== "string" ||
            typeof horario !== "string" ||
            !sala.trim() ||
            !fecha.trim() ||
            !horario.trim()
        ) {
            return res.status(400).json({
                error: "Debés indicar la sala, la fecha y el horario."
            });
        }

        // Verificamos que la sala sea válida.
        if (!salasValidas.includes(sala)) {
            return res.status(400).json({
                error: "La sala indicada no es válida."
            });
        }

        // Validamos el formato de la fecha.
        if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
            return res.status(400).json({
                error: "La fecha debe tener el formato AAAA-MM-DD."
            });
        }

        // Comprobamos que la fecha exista realmente.
        const fechaReal = new Date(`${fecha}T00:00:00Z`);

        if (
            Number.isNaN(fechaReal.getTime()) ||
            fechaReal.toISOString().slice(0, 10) !== fecha
        ) {
            return res.status(400).json({
                error: "La fecha indicada no existe."
            });
        }

        // Impedimos crear reservas para fechas pasadas.
        const hoy = new Date();
        hoy.setUTCHours(0, 0, 0, 0);

        if (fechaReal < hoy) {
            return res.status(400).json({
                error: "No se pueden reservar fechas pasadas."
            });
        }

        // Validamos el formato del horario.
        if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(horario)) {
            return res.status(400).json({
                error: "El horario debe tener el formato HH:MM."
            });
        }

        // Calculamos el intervalo de la nueva reserva.
        const inicioNuevo = convertirAMinutos(horario);
        const finNuevo = inicioNuevo + DURACION_RESERVA;

        // No permitimos terminar después de medianoche.
        if (finNuevo > 24 * 60) {
            return res.status(400).json({
                error: "La reserva debe terminar antes de la medianoche."
            });
        }

        // Leemos las reservas existentes.
        const reservas = leerReservas();

        // Buscamos conflictos de horario en la misma sala y fecha.
        const haySuperposicion = reservas.some((reserva) => {
            // Solo consideramos reservas activas de esa sala y fecha.
            if (
                reserva.sala !== sala ||
                reserva.fecha !== fecha ||
                reserva.estado !== "activa"
            ) {
                return false;
            }

            // Calculamos el intervalo de la reserva existente.
            const inicioExistente = convertirAMinutos(reserva.horario);
            const finExistente = inicioExistente + reserva.duracion;

            // Verificamos si los intervalos se superponen.
            return inicioNuevo < finExistente &&
                   finNuevo > inicioExistente;
        });

        // Rechazamos la solicitud si la sala ya está ocupada.
        if (haySuperposicion) {
            return res.status(409).json({
                error: "La sala ya está reservada en ese horario."
            });
        }

        // Creamos la reserva vinculada al usuario autenticado.
        const nuevaReserva = {
            id: Date.now().toString(), // Identificador de la reserva.
            usuarioId: req.usuario.id, // Propietario obtenido del token.
            sala: sala, // Sala elegida.
            fecha: fecha, // Fecha de la reserva.
            horario: horario, // Hora de inicio.
            duracion: DURACION_RESERVA, // Duración fija en minutos.
            estado: "activa" // Estado inicial.
        };

        // Añadimos la reserva al arreglo.
        reservas.push(nuevaReserva);

        // Guardamos las reservas actualizadas en el archivo JSON.
        guardarReservas(reservas);

        // Respondemos con código 201 porque se creó una reserva.
        return res.status(201).json({
            mensaje: "Reserva creada correctamente.",
            reserva: nuevaReserva
        });
    } catch (error) {
        // Registramos el error para poder investigarlo.
        console.error("Error al crear la reserva:", error);

        return res.status(500).json({
            error: "No se pudo crear la reserva."
        });
    }
});

// PATCH /api/reservas/:id/cancelar
// Cancela una reserva solo si pertenece al usuario autenticado.
router.patch("/:id/cancelar", verificarToken, (req, res) => {
    try {
        // Leemos todas las reservas.
        const reservas = leerReservas();

        // Buscamos la reserva por su ID.
        const reserva = reservas.find(
            (reserva) => reserva.id === req.params.id
        );

        // Respondemos 404 si la reserva no existe.
        if (!reserva) {
            return res.status(404).json({
                mensaje: "No se encontró la reserva."
            });
        }

        // Impedimos cancelar reservas de otro usuario.
        if (reserva.usuarioId !== req.usuario.id) {
            return res.status(403).json({
                mensaje: "No tenés permiso para cancelar esta reserva."
            });
        }

        // No permitimos cancelar una reserva que no esté activa.
        if (reserva.estado !== "activa") {
            return res.status(409).json({
                mensaje: "La reserva ya está cancelada o no está activa."
            });
        }

        // Cambiamos el estado sin eliminar el registro del historial.
        reserva.estado = "cancelada";

        // Guardamos los cambios en el archivo JSON.
        guardarReservas(reservas);

        // Devolvemos la confirmación y la reserva actualizada.
        return res.status(200).json({
            mensaje: "Reserva cancelada correctamente.",
            reserva: reserva
        });
    } catch (error) {
        // Registramos el error en la terminal.
        console.error("Error al cancelar la reserva:", error);

        return res.status(500).json({
            mensaje: "Ocurrió un error al cancelar la reserva."
        });
    }
});

// GET /api/reservas/historial
// Devuelve el historial, incluidas las canceladas, del usuario autenticado.
router.get("/historial", verificarToken, (req, res) => {
    try {
        // Leemos todas las reservas.
        const reservas = leerReservas();

        // Filtramos por el usuario actual.
        const reservasUsuario = reservas.filter(
            (reserva) => reserva.usuarioId === req.usuario.id
        );

        // Ordenamos una copia de las reservas, de más recientes a más antiguas.
        const historial = [...reservasUsuario].sort((a, b) => {
            // Combinamos fecha y horario para comparar los registros.
            const fechaA = new Date(`${a.fecha}T${a.horario}:00`);
            const fechaB = new Date(`${b.fecha}T${b.horario}:00`);

            // Orden descendente por fecha y hora.
            return fechaB - fechaA;
        });

        // Devolvemos el total y el historial personal.
        return res.status(200).json({
            total: historial.length,
            historial: historial
        });
    } catch (error) {
        // Registramos el error para facilitar el diagnóstico.
        console.error("Error al consultar el historial:", error);

        return res.status(500).json({
            mensaje: "Ocurrió un error al consultar el historial."
        });
    }
});

// Exportamos el enrutador para utilizarlo desde server.js.
module.exports = router;
