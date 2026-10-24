// Dirección pública del backend desplegado en Render
const API_URL = "https://groovespace-prueba.onrender.com/api/usuarios";


// ==========================================
// 1. REGISTRO DE USUARIOS
// ==========================================

// Buscamos el formulario de registro.
const registroForm = document.getElementById("registroForm");

// Comprobamos si estamos en la página de registro.
if (registroForm) {

    // Escuchamos cuando se envía el formulario.
    registroForm.addEventListener("submit", async (e) => {

        // Evitamos que el formulario recargue la página.
        e.preventDefault();

        // Obtenemos los datos ingresados.
        const nombre = document.getElementById("nombre").value.trim();
        const apellido = document.getElementById("apellido").value.trim();
        const fecha = document.getElementById("fecha").value;
        const usuario = document.getElementById("usuario").value.trim();
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;

        // Comprobamos que todos los campos estén completos.
        if (!nombre || !apellido || !fecha || !usuario || !email || !password) {
            alert("Completá todos los campos para registrarte.");
            return;
        }

        // Comprobamos que la contraseña tenga al menos 8 caracteres.
        if (password.length < 8) {
            alert("La contraseña debe tener al menos 8 caracteres.");
            return;
        }

        try {

            // Enviamos los datos al backend.
            const respuesta = await fetch(`${API_URL}/registro`, {
                method: "POST",

                // Indicamos que enviaremos información JSON.
                headers: {
                    "Content-Type": "application/json"
                },

                // Convertimos los datos del formulario a JSON.
                body: JSON.stringify({
                    nombre,
                    apellido,
                    fecha,
                    usuario,
                    email,
                    password
                })
            });

            // Convertimos la respuesta del servidor a JSON.
            const datos = await respuesta.json();

            // Comprobamos si ocurrió algún error.
            if (!respuesta.ok) {
                alert(datos.mensaje || "No se pudo completar el registro.");
                return;
            }

            // Informamos que el registro fue exitoso.
            alert("¡Cuenta creada correctamente! Ahora podés iniciar sesión.");

            // Redirigimos al usuario al login.
            window.location.href = "login.html";

        } catch (error) {

            // Mostramos el error en la consola.
            console.error("Error al registrar usuario:", error);

            // Informamos que no se pudo conectar con el servidor.
            alert("No se pudo conectar con el servidor. Intentá nuevamente.");
        }
    });
}


// ==========================================
// 2. INICIO DE SESIÓN
// ==========================================

// Buscamos el formulario de login.
const loginForm = document.getElementById("loginForm");

// Comprobamos si estamos en la página de login.
if (loginForm) {

    // Escuchamos cuando se envía el formulario.
    loginForm.addEventListener("submit", async (e) => {

        // Evitamos que el formulario recargue la página.
        e.preventDefault();

        // Obtenemos el usuario o correo y la contraseña.
        const identificador = document.getElementById("usuario").value.trim();
        const password = document.getElementById("password").value;

        // Comprobamos que ambos campos estén completos.
        if (!identificador || !password) {
            alert("Ingresá tu usuario o correo y tu contraseña.");
            return;
        }

        try {

            // Enviamos las credenciales al backend.
            const respuesta = await fetch(`${API_URL}/login`, {
                method: "POST",

                // Indicamos que enviaremos información JSON.
                headers: {
                    "Content-Type": "application/json"
                },

                // Enviamos el identificador y la contraseña.
                body: JSON.stringify({
                    identificador,
                    password
                })
            });

            // Convertimos la respuesta del servidor a JSON.
            const datos = await respuesta.json();

            // Comprobamos si las credenciales son incorrectas.
            if (!respuesta.ok) {
                alert(datos.mensaje || "No se pudo iniciar sesión.");
                return;
            }

            // Guardamos el token JWT para identificar la sesión.
            localStorage.setItem("token", datos.token);

            // Guardamos el usuario o correo electrónico.
            localStorage.setItem(
                "usuario",
                datos.usuario.usuario || datos.usuario.email
            );

            // Guardamos los datos públicos del usuario.
            localStorage.setItem("nombre", datos.usuario.nombre);
            localStorage.setItem("apellido", datos.usuario.apellido || "");
            localStorage.setItem("email", datos.usuario.email);

            // Informamos que el inicio de sesión fue exitoso.
            alert("¡Bienvenido a GrooveSpace!");

            // Redirigimos al usuario a la página principal.
            window.location.href = "../index.html";

        } catch (error) {

            // Mostramos el error en la consola.
            console.error("Error al iniciar sesión:", error);

            // Informamos que no se pudo conectar con el servidor.
            alert("No se pudo conectar con el servidor. Intentá nuevamente.");
        }
    });
}