// Importamos Express para crear las rutas de usuarios.
const express = require("express");

// Importamos el módulo para trabajar con archivos.
const fs = require("fs");

// Importamos path para construir rutas de archivos.
const path = require("path");

// Importamos bcryptjs para proteger las contraseñas.
const bcrypt = require("bcryptjs");

// Importamos jsonwebtoken para generar tokens de autenticación.
const jwt = require("jsonwebtoken");

// Creamos el router de Express.
const router = express.Router();

// Definimos la ubicación del archivo donde guardaremos los usuarios.
const rutaUsuarios = path.join(__dirname, "..", "data", "usuarios.json");


// ==========================================
// FUNCIONES AUXILIARES
// ==========================================

// Función para leer los usuarios del archivo JSON.
function leerUsuarios() {

    // Comprobamos si el archivo existe.
    if (!fs.existsSync(rutaUsuarios)) {

        // Creamos el archivo con una lista vacía.
        fs.writeFileSync(rutaUsuarios, "[]", "utf8");
    }

    // Leemos el contenido del archivo como texto.
    const contenido = fs.readFileSync(rutaUsuarios, "utf8");

    // Convertimos el texto JSON en un array de JavaScript.
    return JSON.parse(contenido);
}


// Función para guardar los usuarios en el archivo JSON.
function guardarUsuarios(usuarios) {

    // Convertimos el array a JSON y lo guardamos de forma legible.
    fs.writeFileSync(
        rutaUsuarios,
        JSON.stringify(usuarios, null, 2),
        "utf8"
    );
}


// ==========================================
// 1. REGISTRO DE USUARIOS
// ==========================================

// POST /api/usuarios/registro
// Permite registrar una cuenta nueva.
router.post("/registro", async (req, res) => {

    try {

        // Obtenemos los datos enviados desde el formulario.
        const {
            nombre,
            apellido,
            fecha,
            usuario,
            email,
            password
        } = req.body;

        // Comprobamos que todos los campos estén completos.
        if (!nombre || !apellido || !fecha || !usuario || !email || !password) {
            return res.status(400).json({
                mensaje: "Todos los campos son obligatorios."
            });
        }

        // Comprobamos que los campos de texto sean cadenas.
        if (
            typeof nombre !== "string" ||
            typeof apellido !== "string" ||
            typeof usuario !== "string" ||
            typeof email !== "string" ||
            typeof password !== "string" ||
            typeof fecha !== "string"
        ) {
            return res.status(400).json({
                mensaje: "Los datos enviados no tienen un formato válido."
            });
        }

        // Quitamos espacios sobrantes y normalizamos los datos.
        const nombreLimpio = nombre.trim();
        const apellidoLimpio = apellido.trim();
        const usuarioLimpio = usuario.trim().toLowerCase();
        const emailLimpio = email.trim().toLowerCase();

        // Comprobamos que los campos no estén vacíos.
        if (!nombreLimpio || !apellidoLimpio || !usuarioLimpio || !emailLimpio) {
            return res.status(400).json({
                mensaje: "Los campos no pueden estar vacíos."
            });
        }

        // Validamos el formato básico del correo electrónico.
        const formatoEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!formatoEmail.test(emailLimpio)) {
            return res.status(400).json({
                mensaje: "El correo electrónico no tiene un formato válido."
            });
        }

        // Validamos el formato del nombre de usuario.
        if (!/^[a-zA-Z0-9_]{3,20}$/.test(usuarioLimpio)) {
            return res.status(400).json({
                mensaje: "El usuario debe tener entre 3 y 20 caracteres. Solo se permiten letras, números y guiones bajos."
            });
        }

        // Validamos que la fecha tenga el formato esperado.
        if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
            return res.status(400).json({
                mensaje: "La fecha de nacimiento no tiene un formato válido."
            });
        }

        // Comprobamos que la fecha exista realmente.
        const fechaNacimiento = new Date(`${fecha}T00:00:00`);

        if (
            Number.isNaN(fechaNacimiento.getTime()) ||
            fechaNacimiento.toISOString().slice(0, 10) !== fecha
        ) {
            return res.status(400).json({
                mensaje: "La fecha de nacimiento no es válida."
            });
        }

        // Comprobamos que la fecha no sea futura.
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        if (fechaNacimiento > hoy) {
            return res.status(400).json({
                mensaje: "La fecha de nacimiento no puede ser futura."
            });
        }

        // Exigimos una contraseña de al menos 8 caracteres.
        if (password.length < 8) {
            return res.status(400).json({
                mensaje: "La contraseña debe tener al menos 8 caracteres."
            });
        }

        // Leemos las cuentas que ya están registradas.
        const usuarios = leerUsuarios();

        // Comprobamos si el correo o el usuario ya existen.
        const usuarioExistente = usuarios.find((u) =>
            u.email.toLowerCase() === emailLimpio ||
            (u.usuario && u.usuario.toLowerCase() === usuarioLimpio)
        );

        // Si existe alguna coincidencia, rechazamos el registro.
        if (usuarioExistente) {
            return res.status(409).json({
                mensaje: "El correo electrónico o nombre de usuario ya están registrados."
            });
        }

        // Generamos un hash de la contraseña.
        const passwordHash = await bcrypt.hash(password, 10);

        // Creamos el objeto que representará al nuevo usuario.
        const nuevoUsuario = {
            id: Date.now().toString(),
            nombre: nombreLimpio,
            apellido: apellidoLimpio,
            fecha: fecha,
            usuario: usuarioLimpio,
            email: emailLimpio,
            passwordHash: passwordHash
        };

        // Agregamos la nueva cuenta a la lista.
        usuarios.push(nuevoUsuario);

        // Guardamos la lista actualizada en usuarios.json.
        guardarUsuarios(usuarios);

        // Respondemos sin exponer el hash de la contraseña.
        return res.status(201).json({
            mensaje: "Usuario registrado correctamente.",
            usuario: {
                id: nuevoUsuario.id,
                nombre: nuevoUsuario.nombre,
                apellido: nuevoUsuario.apellido,
                fecha: nuevoUsuario.fecha,
                usuario: nuevoUsuario.usuario,
                email: nuevoUsuario.email
            }
        });

    } catch (error) {

        // Mostramos el error en la terminal para investigarlo.
        console.error("Error al registrar usuario:", error);

        // Devolvemos un error interno al cliente.
        return res.status(500).json({
            mensaje: "Ocurrió un error al registrar el usuario."
        });
    }

});


// ==========================================
// 2. INICIO DE SESIÓN
// ==========================================

// POST /api/usuarios/login
// Permite iniciar sesión con usuario o correo electrónico.
router.post("/login", async (req, res) => {

    try {

        // Obtenemos el identificador y la contraseña enviados.
        const { identificador, email, password } = req.body;

        // Aceptamos identificador o email para mantener compatibilidad.
        const datoLogin = identificador || email;

        // Comprobamos que ambos campos estén presentes.
        if (
            typeof datoLogin !== "string" ||
            typeof password !== "string" ||
            !datoLogin.trim() ||
            !password
        ) {
            return res.status(400).json({
                mensaje: "El usuario o correo y la contraseña son obligatorios."
            });
        }

        // Normalizamos el dato ingresado.
        const identificadorLimpio = datoLogin.trim().toLowerCase();

        // Leemos los usuarios guardados en el archivo JSON.
        const usuarios = leerUsuarios();

        // Buscamos una cuenta por correo o nombre de usuario.
        const usuarioEncontrado = usuarios.find((u) =>
            u.email.toLowerCase() === identificadorLimpio ||
            (u.usuario && u.usuario.toLowerCase() === identificadorLimpio)
        );

        // Si no existe la cuenta, rechazamos el inicio de sesión.
        if (!usuarioEncontrado) {
            return res.status(401).json({
                mensaje: "Usuario, correo o contraseña incorrectos."
            });
        }

        // Comparamos la contraseña ingresada con el hash guardado.
        const contrasenaCorrecta = await bcrypt.compare(
            password,
            usuarioEncontrado.passwordHash
        );

        // Si la contraseña no coincide, rechazamos el inicio de sesión.
        if (!contrasenaCorrecta) {
            return res.status(401).json({
                mensaje: "Usuario, correo o contraseña incorrectos."
            });
        }

        // Comprobamos que exista una clave secreta para generar el token.
        if (!process.env.JWT_SECRET) {
            console.error("No se encontró JWT_SECRET en el archivo .env");

            return res.status(500).json({
                mensaje: "El servidor no tiene configurada la autenticación."
            });
        }

        // Generamos un token que identifica al usuario autenticado.
        const token = jwt.sign(
            {
                id: usuarioEncontrado.id,
                email: usuarioEncontrado.email
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "2h"
            }
        );

        // Respondemos con el token y los datos públicos de la cuenta.
        return res.status(200).json({
            mensaje: "Inicio de sesión correcto.",
            token: token,
            usuario: {
                id: usuarioEncontrado.id,
                nombre: usuarioEncontrado.nombre,
                apellido: usuarioEncontrado.apellido || "",
                fecha: usuarioEncontrado.fecha || "",
                usuario: usuarioEncontrado.usuario || null,
                email: usuarioEncontrado.email
            }
        });

    } catch (error) {

        // Registramos el error para poder diagnosticarlo.
        console.error("Error al iniciar sesión:", error);

        // Devolvemos una respuesta de error interno.
        return res.status(500).json({
            mensaje: "Ocurrió un error al iniciar sesión."
        });
    }

});


// ==========================================
// EXPORTACIÓN DEL ROUTER
// ==========================================

// Exportamos las rutas para utilizarlas desde server.js.
module.exports = router;