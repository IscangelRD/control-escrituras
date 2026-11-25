let paginaActual = 1;
let totalPaginas = 1;
let temporizadorBusqueda;
let consultaActual = 0;

// =====================================
// INICIALIZAR PANTALLA
// =====================================

document.addEventListener("DOMContentLoaded", async () => {

    const usuario = await verificarSesion();

    if (!usuario) {
        return;
    }

    const userName = document.getElementById("userName");
    const userRole = document.getElementById("userRole");

    if (userName) {
        userName.textContent = usuario.nombre;
    }

    if (userRole) {
        userRole.textContent = usuario.rol;
    }

    const buscador = document.getElementById("buscarEliminado");

    if (buscador) {
        buscador.addEventListener("input", () => {

            clearTimeout(temporizadorBusqueda);

            temporizadorBusqueda = setTimeout(() => {
                paginaActual = 1;
                cargarEliminados();
            }, 300);

        });
    }

    cargarEliminados();

});

// =====================================
// CARGAR EXPEDIENTES ELIMINADOS
// =====================================

async function cargarEliminados() {

    const consulta = ++consultaActual;

    const container = document.getElementById("eliminadosContainer");
    const message = document.getElementById("eliminadosMessage");

    const buscar = document
        .getElementById("buscarEliminado")
        ?.value.trim() || "";

    const params = new URLSearchParams();

    params.append("page", paginaActual);

    if (buscar !== "") {
        params.append("buscar", buscar);
    }

    container.innerHTML = "";
    message.textContent = "Cargando expedientes...";

    pintarPaginacion(0);

    try {

        const response = await fetch(
            "../api/expedientes/eliminados.php?" + params.toString(),
            {
                method: "GET",
                credentials: "include",
                cache: "no-store"
            }
        );

        const result = await response.json();

        if (consulta !== consultaActual) {
            return;
        }

        if (!response.ok || !result.success) {
            message.textContent =
                result.message || "Error al consultar expedientes.";
            return;
        }

        const expedientes = result.data.expedientes || [];
        const total = Number(result.data.total || 0);

        paginaActual = Number(result.data.pagina || 1);
        totalPaginas = Number(result.data.total_paginas || 1);

        message.textContent = total === 1
            ? "1 expediente eliminado"
            : `${total} expedientes eliminados`;

        if (expedientes.length === 0) {

            container.innerHTML = `
                <div class="archivo-vacio">
                    <h3>No hay expedientes encontrados</h3>
                    <p>No existen expedientes eliminados que coincidan con la búsqueda.</p>
                </div>
            `;

            pintarPaginacion(0);
            return;
        }

        container.innerHTML = expedientes
            .map(exp => crearTarjetaEliminado(exp))
            .join("");

        pintarPaginacion(total);

    } catch (error) {

        if (consulta !== consultaActual) {
            return;
        }

        console.error(error);

        message.textContent =
            "Error de conexión con el servidor.";

    }
}

// =====================================
// CREAR TARJETAS
// =====================================

function crearTarjetaEliminado(exp) {

    const id = Number(exp.id);

    if (!Number.isSafeInteger(id) || id <= 0) {
        return "";
    }

   const eliminadoPor = exp.eliminado_por_nombre
    || (exp.eliminado_por
        ? "Usuario #" + exp.eliminado_por
        : "No registrado");

    return `

        <article class="archivo-card">

            <div class="archivo-card-header">

                <h3>
                    ${escaparHTML(exp.numero_expediente || "---")}
                </h3>

                <span class="archivo-status">
                    ELIMINADO
                </span>

            </div>

            <div class="archivo-cliente">
                ${escaparHTML(exp.cliente_nombre || "---")}
            </div>

            <div class="archivo-tipo">
                ${escaparHTML(exp.tipo_acto || "---")}
            </div>

            <div class="archivo-datos">

                <div class="archivo-dato">

                    <span>Número de escritura</span>

                    <strong>
                        ${escaparHTML(exp.numero_escritura || "---")}
                    </strong>

                </div>

                <div class="archivo-dato">

                    <span>Municipio</span>

                    <strong>
                        ${escaparHTML(exp.municipio || "---")}
                    </strong>

                </div>

                <div class="archivo-dato">

                    <span>Último estado</span>

                    <strong>
                        ${escaparHTML(formatoEstado(exp.estado_actual))}
                    </strong>

                </div>

                <div class="archivo-dato">

                    <span>Responsable</span>

                    <strong>
                        ${escaparHTML(exp.responsable_actual || "---")}
                    </strong>

                </div>

                <div class="archivo-dato">

                    <span>Fecha de eliminación</span>

                    <strong>
                        ${escaparHTML(formatearFechaHora(exp.eliminado_en))}
                    </strong>

                </div>

                <div class="archivo-dato">

                    <span>Eliminado por</span>

                    <strong>
                        ${escaparHTML(eliminadoPor)}
                    </strong>

                </div>

            </div>

            <button
                type="button"
                class="btn-restaurar"
                onclick="restaurarExpediente(${id}, this)"
            >

                <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                >
                    <path d="M3 12a9 9 0 1 1 9 9"/>
                    <path d="M3 5v7h7"/>
                </svg>

                Restaurar expediente

            </button>

        </article>

    `;
}

// =====================================
// RESTAURAR EXPEDIENTE
// =====================================

async function restaurarExpediente(id, boton) {

    const confirmar = confirm(
        "¿Deseas restaurar este expediente?\n\n" +
        "Volverá a aparecer en el listado principal " +
        "con su último estado registrado."
    );

    if (!confirmar) {
        return;
    }

    boton.disabled = true;
    boton.textContent = "Restaurando...";

    try {

        const response = await fetch(
            "../api/expedientes/restaurar.php",
            {
                method: "POST",
                credentials: "include",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    id: id
                })
            }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {

            alert(
                result.message ||
                "No se pudo restaurar el expediente."
            );

            return;
        }

        alert("Expediente restaurado correctamente.");

        await cargarEliminados();

    } catch (error) {

        console.error(error);

        alert("Error de conexión con el servidor.");

    } finally {

        boton.disabled = false;
        boton.textContent = "Restaurar expediente";

    }
}

// =====================================
// PAGINACIÓN RESPONSIVA
// =====================================

function pintarPaginacion(total) {

    const desktop = document.getElementById("paginationBox");
    const mobile = document.getElementById("paginationMobileTop");

    if (total === 0 || totalPaginas <= 1) {

        if (desktop) desktop.innerHTML = "";
        if (mobile) mobile.innerHTML = "";

        return;
    }

    const anterior = paginaActual <= 1
        ? "disabled"
        : "";

    const siguiente = paginaActual >= totalPaginas
        ? "disabled"
        : "";

    let botones = "";

    const inicio = Math.max(1, paginaActual - 2);
    const fin = Math.min(totalPaginas, paginaActual + 2);

    for (let i = inicio; i <= fin; i++) {

        botones += `

            <button
                type="button"
                class="pagination-btn ${i === paginaActual ? "active" : ""}"
                onclick="cambiarPagina(${i})"
                ${i === paginaActual ? 'aria-current="page"' : ""}
            >
                ${i}
            </button>

        `;
    }

    if (desktop) {

        desktop.innerHTML = `

            <div class="pagination-info">
                Página ${paginaActual} de ${totalPaginas}
            </div>

            <div class="pagination-actions">

                <button
                    type="button"
                    class="pagination-btn"
                    onclick="cambiarPagina(${paginaActual - 1})"
                    ${anterior}
                >
                    Anterior
                </button>

                ${botones}

                <button
                    type="button"
                    class="pagination-btn"
                    onclick="cambiarPagina(${paginaActual + 1})"
                    ${siguiente}
                >
                    Siguiente
                </button>

            </div>

        `;
    }

    if (mobile) {

        mobile.innerHTML = `

            <button
                type="button"
                class="pagination-mobile-btn"
                aria-label="Página anterior"
                onclick="cambiarPagina(${paginaActual - 1})"
                ${anterior}
            >
                ‹
            </button>

            <div class="pagination-mobile-info">
                Página ${paginaActual} de ${totalPaginas}
            </div>

            <button
                type="button"
                class="pagination-mobile-btn"
                aria-label="Página siguiente"
                onclick="cambiarPagina(${paginaActual + 1})"
                ${siguiente}
            >
                ›
            </button>

        `;
    }

}

function cambiarPagina(pagina) {

    if (pagina < 1 || pagina > totalPaginas) {
        return;
    }

    paginaActual = pagina;

    cargarEliminados();

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}

// =====================================
// FORMATO DE ESTADOS
// =====================================

function formatoEstado(estado) {

    const estados = {

        SALE_FOLIO_NOTARIA: "Sale folio notaría",
        FOLIO_FIRMA: "Folio firma",
        INGRESA_FOLIO_NOTARIA: "Ingresa folio para notaría",
        TRASLADO_ENTREGADO: "Traslado entregado",
        TRASLADO_RECIBIDO: "Traslado recibido",
        CIERRE_NOTARIA: "Cierre en notaría",
        CIERRE_GESTOR: "Cierre con gestor",
        ENTREGA_ESCRITURA: "Entrega de escritura",
        ENTREGA_EXPEDIENTE: "Entrega de expediente",
        CANCELACION: "Cancelación"

    };

    return estados[estado] || estado || "---";

}

// =====================================
// FORMATO DE FECHA Y HORA
// =====================================

function formatearFechaHora(fecha) {

    if (!fecha) {
        return "No registrada";
    }

    const partes = String(fecha).split(" ");

    const fechaPartes = partes[0].split("-");

    if (fechaPartes.length !== 3) {
        return fecha;
    }

    const hora = partes[1]
        ? partes[1].substring(0, 5)
        : "";

    return `${fechaPartes[2]}/${fechaPartes[1]}/${fechaPartes[0]} ${hora}`;

}

// =====================================
// PROTECCIÓN DE TEXTO HTML
// =====================================

function escaparHTML(texto) {

    return String(texto ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}