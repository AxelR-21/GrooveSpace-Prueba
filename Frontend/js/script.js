
// Esperamos a que el HTML esté cargado antes de ejecutar el código.
document.addEventListener("DOMContentLoaded", () => {

    // Dirección del backend.
    const API_URL = "http://localhost:3000/api";

    // Datos de las salas. El ID es el valor que recibe el backend.
    const SALAS = [
        {
            id: "standard",
            nombre: "Sala 1",
            icono: "🎸",
            detalle: "Solistas y dúos",
            precio: "$4.500",
            equipo: ["Micrófono", "Amplificador de guitarra", "Hasta 3 personas"]
        },
        {
            id: "premium",
            nombre: "Sala 2",
            icono: "🥁",
            detalle: "Banda completa con batería",
            precio: "$7.000",
            equipo: ["Batería", "Amplis de guitarra y bajo", "Hasta 6 personas"]
        },
        {
            id: "bateria",
            nombre: "Sala 3",
            icono: "🎤",
            detalle: "Sala grande para grabar",
            precio: "$9.500",
            equipo: ["Equipo de grabación", "Batería y amplis", "Hasta 8 personas"]
        }
    ];

    // Datos del usuario guardados al iniciar sesión.
    const usuario = localStorage.getItem("usuario");
    const nombre = localStorage.getItem("nombre") || usuario;
    const token = localStorage.getItem("token");

    // Comprobamos si hay una sesión iniciada.
    const estaLogueado = Boolean(usuario && token);

    // Busca el nombre de una sala usando su ID.
    const nombreSala = id => {
        const sala = SALAS.find(s => s.id === id);
        return sala ? sala.nombre : id;
    };

    // El backend utiliza "horario", pero antes usábamos "hora".
    const obtenerHorario = reserva => reserva.horario || reserva.hora;

    // Convertimos la fecha de una reserva para poder compararla.
    const aFecha = reserva => {
        return new Date(`${reserva.fecha}T${obtenerHorario(reserva)}`);
    };

    // Comprobamos si una reserva todavía no pasó.
    const esFutura = reserva => aFecha(reserva) >= new Date();

    // Ordenamos las reservas por fecha y horario.
    const porFechaHora = (a, b) => aFecha(a) - aFecha(b);

    // Mostramos las fechas en un formato más cómodo.
    const formatoDia = fecha => {
        return new Date(`${fecha}T00:00`).toLocaleDateString("es-AR", {
            weekday: "short",
            day: "2-digit",
            month: "2-digit"
        });
    };

    // Convertimos un horario HH:MM a minutos desde la medianoche.
    const convertirAMinutos = horario => {
        const [horas, minutos] = horario.split(":").map(Number);
        return horas * 60 + minutos;
    };

    // Calculamos cuándo termina una reserva de una hora.
    const sumarHora = horario => {
        const [hh, mm] = horario.split(":").map(Number);
        const total = hh * 60 + mm + 60;

        return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
    };

    // Obtenemos la fecha actual en formato AAAA-MM-DD.
    const obtenerFechaActual = () => {
        const hoy = new Date();
        const anio = hoy.getFullYear();
        const mes = String(hoy.getMonth() + 1).padStart(2, "0");
        const dia = String(hoy.getDate()).padStart(2, "0");

        return `${anio}-${mes}-${dia}`;
    };

    // Esta función nos permite hacer peticiones al backend.
    // Si la ruta necesita iniciar sesión, también enviamos el token.
    const pedirAPI = async (ruta, opciones = {}, requiereToken = false) => {

        const headers = {
            "Content-Type": "application/json",
            ...opciones.headers
        };

        if (requiereToken) {
            if (!token) {
                throw new Error("Tenés que iniciar sesión nuevamente.");
            }

            headers.Authorization = `Bearer ${token}`;
        }

        const respuesta = await fetch(`${API_URL}${ruta}`, {
            ...opciones,
            headers
        });

        // Intentamos obtener la respuesta del servidor.
        const datos = await respuesta.json().catch(() => ({}));

        // Si el servidor devuelve un error, lo mostramos.
        if (!respuesta.ok) {
            throw new Error(datos.mensaje || datos.error || "Ocurrió un error en el servidor.");
        }

        return datos;
    };

    // Pedimos las reservas del usuario al backend.
    const obtenerReservas = async () => {
        return await pedirAPI("/reservas", {}, true);
    };

    // Consultamos los horarios ocupados de una sala y fecha.
    const consultarAgenda = async (sala, fecha) => {
        const parametros = new URLSearchParams({
            sala,
            fecha
        });

        return await pedirAPI(`/reservas/agenda?${parametros}`);
    };

    // Mantenemos el modo oscuro al recargar la página.
    const toggleDark = document.getElementById("toggle-dark");
    const body = document.body;

    if (localStorage.getItem("dark-mode") === "enabled") {
        body.classList.add("dark-mode");
    }

    // Actualizamos el texto de las preferencias de la cuenta.
    const actualizarEstadoOscuro = () => {
        const estado = document.getElementById("cfg-oscuro-estado");

        if (estado) {
            estado.textContent = body.classList.contains("dark-mode")
                ? "Activado"
                : "Desactivado";
        }
    };

    // Cambiamos el modo oscuro cuando se presiona el botón.
    if (toggleDark) {
        toggleDark.addEventListener("click", () => {
            body.classList.toggle("dark-mode");

            const activado = body.classList.contains("dark-mode");

            localStorage.setItem(
                "dark-mode",
                activado ? "enabled" : "disabled"
            );

            actualizarEstadoOscuro();
        });
    }

    // Mostramos un mensaje temporal en pantalla.
    const mostrarBanner = texto => {
        const banner = document.createElement("div");

        banner.textContent = texto;
        banner.style.position = "fixed";
        banner.style.top = "20px";
        banner.style.left = "50%";
        banner.style.transform = "translateX(-50%)";
        banner.style.backgroundColor = "#6a0dad";
        banner.style.color = "white";
        banner.style.padding = "12px 24px";
        banner.style.borderRadius = "30px";
        banner.style.zIndex = "2000";
        banner.style.boxShadow = "0 4px 15px rgba(0,0,0,0.2)";

        document.body.appendChild(banner);

        setTimeout(() => banner.remove(), 2200);
    };

    // Cerramos la sesión y eliminamos los datos del usuario.
    const cerrarSesion = () => {
        ["usuario", "nombre", "apellido", "email", "token"].forEach(clave => {
            localStorage.removeItem(clave);
        });

        window.location.href = window.location.pathname.includes("/pages/")
            ? "login.html"
            : "pages/login.html";
    };

    // Botones para mostrar u ocultar las contraseñas.
    document.querySelectorAll(".ojo").forEach(btn => {
        btn.addEventListener("click", () => {
            const input = btn.previousElementSibling;

            if (!input) return;

            const estabaOculta = input.type === "password";

            input.type = estabaOculta ? "text" : "password";
            btn.textContent = estabaOculta ? "Ocultar" : "Mostrar";
        });
    });

    // Si hay un usuario conectado, actualizamos el menú.
    if (estaLogueado) {

        const navLinks = document.querySelectorAll("nav ul li a");

        navLinks.forEach(link => {
            if (link.textContent.trim() === "Login") {

                const span = document.createElement("span");

                span.textContent = `${nombre} (${usuario})`;
                span.style.fontWeight = "bold";
                span.style.color = "#6a0dad";
                span.style.padding = "8px 12px";

                link.replaceWith(span);

                // Agregamos el botón para cerrar sesión.
                const logoutBtn = document.createElement("button");

                logoutBtn.textContent = "Cerrar sesión";
                logoutBtn.classList.add("btn-morado");
                logoutBtn.style.marginLeft = "10px";
                logoutBtn.style.padding = "6px 14px";
                logoutBtn.style.fontSize = "0.85em";

                logoutBtn.addEventListener("click", cerrarSesion);

                span.after(logoutBtn);
            }
        });

        // Si ya inició sesión, el acceso de usuario lleva a su cuenta.
        const urlCuenta = window.location.pathname.includes("/pages/")
            ? "cuenta.html"
            : "pages/cuenta.html";

        const navLogin = document.getElementById("nav-login");

        if (navLogin) {
            navLogin.title = `${nombre} (${usuario})`;
            navLogin.href = urlCuenta;
        }

        const accesoCuenta = document.getElementById("acceso-cuenta");

        if (accesoCuenta) {
            accesoCuenta.href = urlCuenta;
        }
    }

    // Saludo para la versión móvil.
    const saludo = document.getElementById("m-saludo");

    if (saludo && estaLogueado) {
        saludo.textContent = `Hola ${nombre} 👋`;
    }

    // Creamos las filas que muestran los datos de cada reserva.
    const crearFila = reserva => {
        const fila = document.createElement("tr");

        const estado = reserva.estado || "activa";
        const horario = obtenerHorario(reserva);

        // Convertimos el estado para mostrarlo con la primera letra en mayúscula.
        const estadoVisual = estado.charAt(0).toUpperCase() + estado.slice(1);

        fila.innerHTML = `
            <td>${nombreSala(reserva.sala)}</td>
            <td>${reserva.fecha}</td>
            <td>${horario}</td>
            <td>
                <span class="estado estado-${estado.toLowerCase()}">
                    ${estadoVisual}
                </span>
            </td>
        `;

        return fila;
    };

    // Cargamos las reservas del usuario desde el backend.
    const reservasTable = document.getElementById("lista-reservas");
    const bienvenidaReservas = document.getElementById("bienvenida");

    if (reservasTable) {

        if (!estaLogueado) {

            if (bienvenidaReservas) {
                bienvenidaReservas.textContent =
                    "Tenés que iniciar sesión para ver tus reservas.";
            }

        } else {

            if (bienvenidaReservas) {
                bienvenidaReservas.textContent =
                    `Bienvenido, ${nombre} (${usuario}). Aquí están tus reservas:`;
            }

            obtenerReservas()
                .then(reservas => {

                    // Mostramos solamente las reservas que todavía no pasaron.
                    const proximas = reservas
                        .filter(r => r.estado === "activa" && esFutura(r))
                        .sort(porFechaHora);

                    if (proximas.length === 0) {
                        reservasTable.innerHTML = `
                            <tr>
                                <td colspan="4">No tenés reservas próximas</td>
                            </tr>
                        `;
                        return;
                    }

                    // Agregamos las reservas a la tabla.
                    proximas.forEach(reserva => {
                        reservasTable.appendChild(crearFila(reserva));
                    });

                })
                .catch(error => {
                    console.error("Error al obtener reservas:", error);

                    reservasTable.innerHTML = `
                        <tr>
                            <td colspan="4">No se pudieron cargar tus reservas.</td>
                        </tr>
                    `;
                });
        }
    }

    // Preparamos el formulario para crear reservas.
    const formReservar = document.getElementById("formReservar");
    const bienvenidaReservar = document.getElementById("bienvenida");

    if (formReservar) {

        const selectSala = document.getElementById("sala");
        const inputFecha = document.getElementById("fecha");
        const inputHora = document.getElementById("hora");

        // Si llegamos desde la página de salas, seleccionamos la sala indicada.
        const salaURL = new URLSearchParams(window.location.search).get("sala");

        if (salaURL && selectSala) {
            selectSala.value = salaURL;
        }

        // Dibujamos las tarjetas de salas para la versión móvil.
        const contSalas = document.getElementById("m-salas");

        if (contSalas && selectSala) {

            const dibujarSalas = () => {
                contSalas.innerHTML = "";

                SALAS.forEach((sala, i) => {

                    const btn = document.createElement("button");

                    btn.type = "button";
                    btn.classList.add("m-sala-op");

                    // Marcamos la tarjeta de la sala seleccionada.
                    if (selectSala.value === sala.id) {
                        btn.classList.add("activo");
                    }

                    btn.innerHTML = `
                        <span class="ico m-img-${i + 1}">${sala.icono}</span>
                        <span class="txt">
                            <b>${sala.nombre}</b>
                            <small>${sala.detalle}</small>
                        </span>
                        <span class="precio">
                            ${sala.precio}<small>/h</small>
                        </span>
                    `;

                    // Al tocar una tarjeta, actualizamos el select.
                    btn.addEventListener("click", () => {
                        selectSala.value = sala.id;
                        selectSala.dispatchEvent(new Event("change"));
                        dibujarSalas();
                    });

                    contSalas.appendChild(btn);
                });
            };

            dibujarSalas();
        }

        // Consultamos al backend para saber qué horarios están ocupados.
        const slots = document.getElementById("m-slots");

        if (slots && selectSala && inputFecha && inputHora) {

            const horas = [
                "10:00", "11:00", "12:00", "13:00",
                "14:00", "15:00", "16:00", "17:00",
                "18:00", "19:00", "20:00", "21:00"
            ];

            // Consultamos la disponibilidad de un horario específico.
            const consultarDisponibilidad = async (sala, fecha, horario) => {

                const parametros = new URLSearchParams({
                    sala,
                    fecha,
                    horario
                });

                return await pedirAPI(`/reservas/disponibilidad?${parametros}`);
            };

            // Dibujamos los botones de horarios según la respuesta del backend.
            const dibujarSlots = async () => {

                slots.innerHTML = "";

                if (!selectSala.value || !inputFecha.value) {
                    slots.textContent = "Seleccioná una sala y una fecha.";
                    return;
                }

                const salaSeleccionada = selectSala.value;
                const fechaSeleccionada = inputFecha.value;

                slots.textContent = "Consultando disponibilidad...";

                try {

                    // Consultamos todos los horarios disponibles.
                    const resultados = await Promise.all(
                        horas.map(async horario => {

                            try {
                                const datos = await consultarDisponibilidad(
                                    salaSeleccionada,
                                    fechaSeleccionada,
                                    horario
                                );

                                return {
                                    horario,
                                    disponible: datos.disponible
                                };

                            } catch (error) {
                                console.error(`Error consultando ${horario}:`, error);

                                return {
                                    horario,
                                    disponible: false
                                };
                            }
                        })
                    );

                    // Evitamos mostrar resultados de una selección anterior.
                    if (
                        selectSala.value !== salaSeleccionada ||
                        inputFecha.value !== fechaSeleccionada
                    ) {
                        return;
                    }

                    slots.innerHTML = "";

                    resultados.forEach(resultado => {

                        const btn = document.createElement("button");

                        btn.type = "button";
                        btn.textContent = resultado.horario;
                        btn.classList.add("m-slot");

                        // Deshabilitamos los horarios que ya están ocupados.
                        btn.disabled = !resultado.disponible;

                        if (!resultado.disponible) {
                            btn.classList.add("ocupado");
                        }

                        if (inputHora.value === resultado.horario) {
                            btn.classList.add("activo");
                        }

                        // Guardamos el horario seleccionado en el input.
                        btn.addEventListener("click", () => {
                            inputHora.value = resultado.horario;
                            dibujarSlots();
                        });

                        slots.appendChild(btn);
                    });

                } catch (error) {
                    console.error("Error al consultar horarios:", error);

                    slots.textContent =
                        "No se pudo consultar la disponibilidad. Intentá nuevamente.";
                }
            };

            // Si cambia la sala o la fecha, limpiamos el horario anterior.
            [selectSala, inputFecha].forEach(elemento => {
                elemento.addEventListener("change", () => {
                    inputHora.value = "";
                    dibujarSlots();
                });
            });

            dibujarSlots();
        }

        if (!estaLogueado) {

            // Si no hay sesión, mostramos un mensaje y bloqueamos el formulario.
            if (bienvenidaReservar) {
                bienvenidaReservar.innerHTML = `
                    Tenés que
                    <a href="login.html" style="color:#6a0dad; font-weight:bold;">
                        iniciar sesión
                    </a>
                    para poder reservar.
                `;
            }

            formReservar.querySelectorAll("input, select, button").forEach(elemento => {
                elemento.disabled = true;
            });

        } else {

            if (bienvenidaReservar) {
                bienvenidaReservar.textContent =
                    `Bienvenido, ${nombre} (${usuario}). Completá tu reserva:`;
            }

            // Enviamos los datos al backend cuando se confirma la reserva.
            formReservar.addEventListener("submit", async evento => {

                evento.preventDefault();

                const sala = selectSala.value;
                const fecha = inputFecha.value;
                const horario = inputHora.value;

                // Comprobamos que se hayan completado todos los campos.
                if (!sala || !fecha || !horario) {
                    mostrarBanner("Completá todos los campos.");
                    return;
                }

                // Deshabilitamos el botón para evitar enviar varias veces.
                const botonEnviar = formReservar.querySelector(
                    'button[type="submit"], input[type="submit"]'
                );

                if (botonEnviar) {
                    botonEnviar.disabled = true;
                }

                try {

                    // Enviamos la reserva al endpoint POST /api/reservas.
                    const datos = await pedirAPI(
                        "/reservas",
                        {
                            method: "POST",
                            body: JSON.stringify({
                                sala,
                                fecha,
                                horario
                            })
                        },
                        true
                    );

                    console.log("Reserva creada:", datos);

                    mostrarBanner("Reserva creada con éxito.");

                    // Después de crearla, vamos a Mis reservas.
                    setTimeout(() => {
                        window.location.href = "mis_reservas.html";
                    }, 1500);

                } catch (error) {

                    console.error("Error al crear la reserva:", error);

                    mostrarBanner(error.message);

                    // Si hubo un error, permitimos volver a intentar.
                    if (botonEnviar) {
                        botonEnviar.disabled = false;
                    }
                }
            });
        }
    }

    // Mostramos la información de las salas y sus agendas.
    const listaSalas = document.getElementById("lista-salas");

    if (listaSalas) {

        // Horarios que se muestran en la agenda.
        const horasAgenda = [
            "10:00", "11:00", "12:00", "13:00",
            "14:00", "15:00", "16:00", "17:00",
            "18:00", "19:00", "20:00", "21:00"
        ];

        SALAS.forEach((sala, i) => {

            const seccion = document.createElement("section");

            seccion.classList.add("sala-detalle");

            seccion.innerHTML = `
                <div class="sd-cabecera m-img-${i + 1}">
                    <span class="sd-icono">${sala.icono}</span>

                    <div>
                        <h3>${sala.nombre}</h3>
                        <p>${sala.detalle}</p>
                    </div>

                    <span class="precio">
                        ${sala.precio}<small>/h</small>
                    </span>
                </div>

                <div class="sd-cuerpo">
                    <ul class="sd-equipo">
                        ${sala.equipo.map(elemento => `<li>${elemento}</li>`).join("")}
                    </ul>

                    <h4>Agenda de disponibilidad</h4>

                    <label for="fecha-${sala.id}">Seleccioná una fecha:</label>

                    <input
                        type="date"
                        id="fecha-${sala.id}"
                        class="sd-fecha"
                        min="${obtenerFechaActual()}"
                        value="${obtenerFechaActual()}"
                    >

                    <div class="sd-referencias">
                        <span class="sd-referencia libre">Libre</span>
                        <span class="sd-referencia ocupado">Ocupado</span>
                    </div>

                    <div id="agenda-${sala.id}" class="sd-agenda">
                        Consultando disponibilidad...
                    </div>

                    <p class="sd-privacidad">
                        Por privacidad no mostramos quién reservó.
                    </p>

                    <a
                        href="reservar.html?sala=${encodeURIComponent(sala.id)}"
                        class="btn-morado sd-reservar"
                    >
                        Reservar esta sala
                    </a>
                </div>
            `;

            listaSalas.appendChild(seccion);

            // Obtenemos los elementos de la agenda de esta sala.
            const selectorFecha = seccion.querySelector(`#fecha-${sala.id}`);
            const contenedorAgenda = seccion.querySelector(`#agenda-${sala.id}`);

            // Consultamos y mostramos los horarios de la fecha seleccionada.
            const cargarAgenda = async () => {

                const fecha = selectorFecha.value;

                if (!fecha) {
                    contenedorAgenda.textContent = "Seleccioná una fecha.";
                    return;
                }

                contenedorAgenda.textContent = "Consultando disponibilidad...";

                try {

                    // Pedimos al backend las reservas activas de esa sala.
                    const datos = await consultarAgenda(sala.id, fecha);

                    // Evitamos mostrar resultados de una fecha anterior.
                    if (selectorFecha.value !== fecha) {
                        return;
                    }

                    contenedorAgenda.innerHTML = "";

                    // Guardamos los horarios ocupados para compararlos.
                    const ocupados = datos.horariosOcupados || [];

                    horasAgenda.forEach(horario => {

                        const inicio = convertirAMinutos(horario);

                        // Comprobamos si el horario se superpone con una reserva.
                        const estaOcupado = ocupados.some(reserva => {
                            const inicioReserva = convertirAMinutos(reserva.horario);
                            const finReserva = inicioReserva + reserva.duracion;

                            return inicio < finReserva && inicio + 60 > inicioReserva;
                        });

                        const elemento = document.createElement("div");

                        elemento.classList.add("sd-horario");
                        elemento.classList.add(estaOcupado ? "ocupado" : "libre");

                        elemento.textContent = estaOcupado
                            ? `${horario} - Ocupado`
                            : `${horario} - Libre`;

                        contenedorAgenda.appendChild(elemento);
                    });

                } catch (error) {

                    console.error(`Error al consultar la agenda de ${sala.nombre}:`, error);

                    contenedorAgenda.textContent =
                        "No se pudo cargar la agenda. Intentá nuevamente.";
                }
            };

            // Actualizamos la agenda cuando se selecciona otra fecha.
            selectorFecha.addEventListener("change", cargarAgenda);

            // Cargamos la agenda al mostrar la tarjeta.
            cargarAgenda();
        });
    }

    // Cargamos los datos de la cuenta.
    const perfilNombre = document.getElementById("perfil-nombre");

    if (perfilNombre) {

        if (!estaLogueado) {

            // Si no hay sesión, volvemos al login.
            window.location.href = "login.html";

        } else {

            const apellido = localStorage.getItem("apellido") || "";
            const email = localStorage.getItem("email") || "";

            // Actualizamos los datos que aparecen en el perfil.
            const pintarPerfil = () => {

                const n = localStorage.getItem("nombre") || usuario;
                const a = localStorage.getItem("apellido") || "";

                const avatar = document.getElementById("avatar");
                const emailPerfil = document.getElementById("perfil-email");
                const usuarioPerfil = document.getElementById("perfil-usuario");

                if (avatar) {
                    avatar.textContent =
                        ((n || usuario)[0] + (a[0] || "")).toUpperCase();
                }

                perfilNombre.textContent = `${n} ${a}`.trim() || usuario;

                if (emailPerfil) {
                    emailPerfil.textContent = localStorage.getItem("email") || "";
                }

                if (usuarioPerfil) {
                    usuarioPerfil.textContent = `@${usuario}`;
                }
            };

            pintarPerfil();

            // Cargamos los datos personales en el formulario.
            const cfgNombre = document.getElementById("cfg-nombre");
            const cfgApellido = document.getElementById("cfg-apellido");
            const cfgEmail = document.getElementById("cfg-email");

            if (cfgNombre) cfgNombre.value = nombre || "";
            if (cfgApellido) cfgApellido.value = apellido;
            if (cfgEmail) cfgEmail.value = email;

            const formDatos = document.getElementById("formDatos");

            if (formDatos) {

                formDatos.addEventListener("submit", evento => {

                    evento.preventDefault();

                    // Por ahora los datos personales siguen guardándose localmente.
                    // Todavía no tenemos una ruta en el backend para modificarlos.
                    localStorage.setItem("nombre", cfgNombre.value);
                    localStorage.setItem("apellido", cfgApellido.value);
                    localStorage.setItem("email", cfgEmail.value);

                    pintarPerfil();

                    mostrarBanner("Cambios guardados.");
                });
            }

            // Si el usuario prefiere reducir los movimientos, pausamos el video.
            const videoNota = document.querySelector(".nota-video");

            if (
                videoNota &&
                window.matchMedia("(prefers-reduced-motion: reduce)").matches
            ) {
                videoNota.pause();
            }

            // El cambio de contraseña todavía no está conectado al backend.
            const formPass = document.getElementById("formPass");

            if (formPass) {

                formPass.addEventListener("submit", evento => {

                    evento.preventDefault();
                    evento.target.reset();

                    mostrarBanner(
                        "El cambio de contraseña todavía no está disponible."
                    );
                });
            }

            // Actualizamos las preferencias del modo oscuro.
            actualizarEstadoOscuro();

            const btnOscuro = document.getElementById("cfg-oscuro");

            if (btnOscuro && toggleDark) {
                btnOscuro.addEventListener("click", () => {
                    toggleDark.click();
                });
            }

            // Consultamos las reservas para actualizar las estadísticas y el historial.
            const tbodyHistorial = document.getElementById("lista-historial");

            obtenerReservas()
                .then(reservas => {

                    const proximas = reservas.filter(
                        r => r.estado === "activa" && esFutura(r)
                    );

                    const pasadas = reservas
                        .filter(r => !esFutura(r))
                        .sort(porFechaHora)
                        .reverse();

                    // Actualizamos la cantidad de reservas en el perfil.
                    const statProximas = document.getElementById("stat-proximas");
                    const statPasadas = document.getElementById("stat-pasadas");

                    if (statProximas) {
                        statProximas.textContent = proximas.length;
                    }

                    if (statPasadas) {
                        statPasadas.textContent = pasadas.length;
                    }

                    // Mostramos las reservas anteriores en el historial.
                    if (tbodyHistorial) {

                        tbodyHistorial.innerHTML = "";

                        if (pasadas.length === 0) {

                            tbodyHistorial.innerHTML = `
                                <tr>
                                    <td colspan="4">
                                        Todavía no tenés reservas pasadas.
                                    </td>
                                </tr>
                            `;

                        } else {

                            pasadas.forEach(reserva => {
                                tbodyHistorial.appendChild(crearFila(reserva));
                            });
                        }
                    }

                })
                .catch(error => {

                    console.error("Error al cargar el historial:", error);

                    if (tbodyHistorial) {
                        tbodyHistorial.innerHTML = `
                            <tr>
                                <td colspan="4">
                                    No se pudo cargar el historial.
                                </td>
                            </tr>
                        `;
                    }
                });

            // Botón para cerrar sesión desde la cuenta.
            const btnSalir = document.getElementById("cuenta-salir");

            if (btnSalir) {
                btnSalir.addEventListener("click", cerrarSesion);
            }
        }
    }

});
