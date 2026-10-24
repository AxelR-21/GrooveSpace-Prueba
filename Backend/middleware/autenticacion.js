
/* Importamos jsonwebtoken para verificar los tokens recibidos. */
const jwt = require("jsonwebtoken");

/* Creamos el middleware que protegerá nuestras rutas privadas. */
function verificarToken(req, res, next) {
    /* Leemos el encabezado Authorization de la petición. */
    const encabezado = req.headers.authorization;

    /* Comprobamos que exista y use el formato Bearer. */
    if (!encabezado || !encabezado.startsWith("Bearer ")) {
        return res.status(401).json({
            mensaje: "Debés iniciar sesión para acceder a este recurso."
        });
    }

    /* Extraemos el token, quitando la palabra Bearer. */
    const token = encabezado.split(" ")[1];

    try {
        /* Verificamos la firma y la fecha de expiración del token. */
        const datosUsuario = jwt.verify(token, process.env.JWT_SECRET);

        /* Guardamos los datos verificados para usarlos en la ruta. */
        req.usuario = datosUsuario;

        /* Permitimos que la petición continúe hacia la ruta solicitada. */
        next();
    } catch (error) {
        /* Si el token no es válido o expiró, rechazamos la petición. */
        return res.status(401).json({
            mensaje: "El token es inválido o expiró. Iniciá sesión nuevamente."
        });
    }
}

/* Exportamos el middleware para utilizarlo en otras partes del proyecto. */
module.exports = verificarToken;
