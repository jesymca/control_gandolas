// 1. Configuración de Supabase usando el cliente del navegador (sin clave de service_role)
const supabaseAdminPanel = supabase;

let tablaInteractiva; 
let tablaResultadoSQL;
let tablaActual = 'gandolas';
let cacheEstructuraTablas = {}; // Cache para estructura de tablas

function obtenerUsuarioActual() {
    try {
        const data = sessionStorage.getItem('usuario');
        if (!data) return null;
        return JSON.parse(data);
    } catch (error) {
        console.warn('No se pudo leer la sesión del usuario:', error);
        return null;
    }
}

function puedeEditarPanel() {
    const usuario = obtenerUsuarioActual();
    return !!usuario && usuario.rol === 'admin';
}

function prepararAccesoPanel() {
    const usuario = obtenerUsuarioActual();
    const banner = document.getElementById('acceso-admin');
    const elementosProtegidos = document.querySelectorAll('.tab-btn, .btn-execute, #sql-query');

    if (!usuario) {
        if (banner) {
            banner.textContent = 'Debes iniciar sesión como administrador para usar este panel.';
            banner.style.display = 'block';
        }
        window.location.href = '../login.html';
        return false;
    }

    if (usuario.rol !== 'admin') {
        if (banner) {
            banner.textContent = 'Solo el usuario administrador autenticado puede editar o ejecutar consultas en este panel.';
            banner.style.display = 'block';
        }
        elementosProtegidos.forEach(elemento => {
            elemento.disabled = true;
            elemento.setAttribute('aria-disabled', 'true');
        });
        return false;
    }

    if (banner) {
        banner.style.display = 'none';
    }

    elementosProtegidos.forEach(elemento => {
        elemento.disabled = false;
        elemento.removeAttribute('aria-disabled');
    });

    return true;
}

// 2. Función para obtener la estructura de una tabla dinámicamente
async function obtenerEstructuraTabla(nombreTabla) {
    // Si ya tenemos la estructura en caché, la devolvemos
    if (cacheEstructuraTablas[nombreTabla]) {
        return cacheEstructuraTablas[nombreTabla];
    }

    try {
        // Obtener una muestra de datos para inferir la estructura
        const { data, error } = await supabaseAdminPanel
            .from(nombreTabla)
            .select('*')
            .limit(1);

        if (error) throw error;

        if (!data || data.length === 0) {
            // Si no hay datos, intentamos obtener la estructura mediante una consulta de información
            const { data: columnInfo, error: infoError } = await supabaseAdminPanel
                .rpc('get_table_columns', { table_name: nombreTabla });

            if (infoError) {
                console.warn('No se pudo obtener información de columnas:', infoError);
                return generarColumnasBasicas(nombreTabla);
            }

            return columnInfo;
        }

        // Inferir columnas de los datos existentes
        const columnas = Object.keys(data[0]).map(nombreColumna => {
            const config = {
                title: formatearNombreColumna(nombreColumna),
                field: nombreColumna,
                headerSort: true
            };

            // Determinar el tipo de editor basado en el tipo de dato
            const valorMuestra = data[0][nombreColumna];
            config.editor = determinarEditor(valorMuestra);
            
            // Configurar filtros de header para ciertos tipos
            if (typeof valorMuestra === 'string' || valorMuestra === null) {
                config.headerFilter = 'input';
            }

            // Ancho sugerido basado en el tipo
            config.width = determinarAncho(nombreColumna, valorMuestra);

            return config;
        });

        // Cachear la estructura
        cacheEstructuraTablas[nombreTabla] = columnas;
        return columnas;

    } catch (error) {
        console.error('Error obteniendo estructura de tabla:', error);
        return generarColumnasBasicas(nombreTabla);
    }
}

// 3. Función para formatear nombres de columnas
function formatearNombreColumna(nombre) {
    return nombre
        .split('_')
        .map(palabra => palabra.charAt(0).toUpperCase() + palabra.slice(1))
        .join(' ');
}

// 4. Determinar el editor apropiado basado en el valor
function determinarEditor(valor) {
    if (valor === null || valor === undefined) return 'input';
    
    if (typeof valor === 'number') {
        return 'number';
    }
    
    if (typeof valor === 'boolean') {
        return 'tickCross';
    }
    
    if (valor instanceof Date || (typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}/.test(valor))) {
        return 'date';
    }
    
    if (typeof valor === 'string' && valor.length > 100) {
        return 'textarea';
    }
    
    return 'input';
}

// 5. Determinar ancho sugerido para columna
function determinarAncho(nombre, valor) {
    // Columnas que deberían ser más estrechas
    const columnasEstrechas = ['id', 'cedula', 'rol', 'activo'];
    if (columnasEstrechas.includes(nombre)) {
        return 100;
    }

    // Columnas de fecha
    if (nombre.includes('fecha')) {
        return 150;
    }

    // Columnas de texto largo
    if (nombre.includes('observaciones') || nombre.includes('descripcion')) {
        return 200;
    }

    return 150;
}

// 6. Columnas básicas por si falla la detección automática
function generarColumnasBasicas(nombreTabla) {
    // Columnas genéricas basadas en nombres comunes
    const columnasBase = [
        {title: "ID", field: "id", width: 100, headerSort: false, editor: false},
        {title: "Creado en", field: "created_at", width: 150, editor: false},
        {title: "Actualizado en", field: "updated_at", width: 150, editor: false}
    ];

    // Añadir algunas columnas comunes según el nombre de la tabla
    const columnasComunes = {
        gandolas: ['placa', 'modelo', 'anio'],
        choferes: ['cedula', 'nombre', 'apellido'],
        usuarios: ['cedula', 'nombre_completo', 'correo', 'rol'],
        registros: ['gandola_id', 'tipo', 'fecha_hora']
    };

    const columnasExtra = (columnasComunes[nombreTabla] || []).map(col => ({
        title: formatearNombreColumna(col),
        field: col,
        editor: 'input',
        headerFilter: 'input',
        width: 150
    }));

    return [...columnasBase, ...columnasExtra];
}

// 7. Función mejorada para cambiar de pestaña y renderizar tablas
async function cambiarTabla(nombreTabla, boton) {
    if (!puedeEditarPanel()) {
        alert('Solo el administrador autenticado puede ver y editar este panel.');
        return;
    }

    tablaActual = nombreTabla;

    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    if(boton) boton.classList.add('active');

    try {
        // Obtener datos de la tabla
        const { data, error } = await supabaseAdminPanel.from(nombreTabla).select('*');
        
        if (error) {
            console.error("Error cargando tabla:", error);
            alert("Error al conectar con la tabla: " + error.message);
            return;
        }

        // Obtener estructura dinámica de la tabla
        const columnas = await obtenerEstructuraTabla(nombreTabla);

        if (tablaInteractiva) tablaInteractiva.destroy();

        tablaInteractiva = new Tabulator("#tabla-contenedor", {
            data: data || [],
            layout: "fitColumns",
            responsiveLayout: "hide",
            pagination: "local",
            paginationSize: 15,
            placeholder: "No hay registros en esta tabla",
            columns: columnas,
            // Añadir menú contextual para operaciones adicionales
            rowContextMenu: [
                {
                    label: "Eliminar fila",
                    action: function(e, row) {
                        if (confirm(`¿Estás seguro de eliminar el registro ID: ${row.getData().id}?`)) {
                            eliminarRegistro(row);
                        }
                    }
                },
                {
                    label: "Duplicar fila",
                    action: function(e, row) {
                        duplicarRegistro(row);
                    }
                }
            ]
        });

        // Evento de auto-guardado en base de datos al editar
        tablaInteractiva.on("cellEdited", async function(cell) {
            if (!puedeEditarPanel()) {
                alert('No tienes permisos para editar este panel.');
                cell.restoreOldValue();
                return;
            }

            let filaDatos = cell.getRow().getData();
            let columnaModificada = cell.getField();
            let nuevoValor = cell.getValue();

            // Validar que el ID existe
            if (!filaDatos.id) {
                alert("Error: El registro no tiene ID válido");
                cell.restoreOldValue();
                return;
            }

            const { error: updateError } = await supabaseAdminPanel
                .from(tablaActual)
                .update({ [columnaModificada]: nuevoValor })
                .eq('id', filaDatos.id);

            if (updateError) {
                console.error("Error al actualizar Supabase:", updateError);
                alert("No se pudo guardar el cambio en el servidor: " + updateError.message);
                cell.restoreOldValue(); 
            } else {
                console.log(`✅ Modificado con éxito! [${tablaActual}] -> ID: ${filaDatos.id}`);
                // Mostrar indicador visual de éxito
                cell.getElement().style.backgroundColor = '#2d5a2d';
                setTimeout(() => {
                    cell.getElement().style.backgroundColor = '';
                }, 1000);
            }
        });

    } catch (error) {
        console.error('Error en cambiarTabla:', error);
        alert('Error al cargar la tabla: ' + error.message);
    }
}

// 8. Función para eliminar registro
async function eliminarRegistro(row) {
    if (!puedeEditarPanel()) {
        alert('No tienes permisos para eliminar registros.');
        return;
    }

    try {
        const data = row.getData();
        const { error } = await supabaseAdminPanel
            .from(tablaActual)
            .delete()
            .eq('id', data.id);

        if (error) throw error;

        row.delete();
        console.log(`🗑️ Registro ID ${data.id} eliminado de ${tablaActual}`);
    } catch (error) {
        alert('Error al eliminar: ' + error.message);
    }
}

// 9. Función para duplicar registro
async function duplicarRegistro(row) {
    if (!puedeEditarPanel()) {
        alert('No tienes permisos para duplicar registros.');
        return;
    }

    try {
        const data = row.getData();
        // Eliminar el ID para crear uno nuevo
        delete data.id;
        // Eliminar timestamps si existen
        delete data.created_at;
        delete data.updated_at;

        const { data: newData, error } = await supabaseAdminPanel
            .from(tablaActual)
            .insert([data])
            .select();

        if (error) throw error;

        if (newData && newData[0]) {
            // Actualizar tabla con nuevo registro
            tablaInteractiva.addRow(newData[0]);
            console.log(`📋 Registro duplicado en ${tablaActual}`);
        }
    } catch (error) {
        alert('Error al duplicar: ' + error.message);
    }
}

// 10. Función mejorada de ejecución SQL
async function ejecutarSQL() {
    const query = document.getElementById("sql-query").value.trim();
    const errorBox = document.getElementById("sql-error");
    const resultadoDiv = document.getElementById("tabla-sql-resultado");

    errorBox.style.display = "none";
    resultadoDiv.innerHTML = "<span style='color: #aaa;'>⏳ Ejecutando sentencia segura...</span>";

    if (!puedeEditarPanel()) {
        alert('Solo el administrador autenticado puede ejecutar consultas en este panel.');
        return;
    }

    if (!query) {
        alert("Por favor, escribe una consulta SQL.");
        resultadoDiv.innerHTML = "";
        return;
    }

    if (!/^\s*select\b/i.test(query)) {
        resultadoDiv.innerHTML = "";
        errorBox.innerText = "⚠️ Este panel solo permite consultas SELECT de lectura. Para modificar datos, usa las celdas editables del administrador.";
        errorBox.style.display = "block";
        return;
    }

    try {
        const queryLower = query.toLowerCase();
        const match = queryLower.match(/from\s+([a-zA-Z0-9_]+)/);

        if (!match) {
            throw new Error('No se pudo detectar la tabla objetivo en la consulta.');
        }

        const tabla = match[1];
        const { data, error } = await supabaseAdminPanel
            .from(tabla)
            .select('*');

        if (error) throw error;

        mostrarResultadoSQL(data || []);
    } catch (err) {
        resultadoDiv.innerHTML = "";
        errorBox.innerText = "❌ Error de consulta: \n" + err.message;
        errorBox.style.display = "block";
    }
}

async function ejecutarSQLViaRPC(query) {
    throw new Error('La consola SQL solo permite consultas SELECT seguras desde el navegador.');
}

async function ejecutarSQLDirecto(query) {
    throw new Error('La consola SQL solo permite consultas SELECT seguras desde el navegador.');
}

// 13. Función para mostrar resultados SQL en tabla
function mostrarResultadoSQL(data) {
    const resultadoDiv = document.getElementById("tabla-sql-resultado");
    
    if (!data || data.length === 0) {
        resultadoDiv.innerHTML = `
            <div style="color: #ffcc00; padding: 10px; background: #332200; border-radius:4px; font-size:14px;">
                ⚠️ La consulta se ejecutó pero no hay datos para mostrar.
            </div>
        `;
        return;
    }

    // Generar columnas dinámicamente desde los datos
    const columnasDinamicas = Object.keys(data[0]).map(key => ({
        title: formatearNombreColumna(key),
        field: key,
        headerSort: true,
        width: Math.min(200, Math.max(80, key.length * 12))
    }));

    if (tablaResultadoSQL) tablaResultadoSQL.destroy();

    tablaResultadoSQL = new Tabulator("#tabla-sql-resultado", {
        data: data,
        layout: "fitColumns",
        pagination: "local",
        paginationSize: 10,
        placeholder: "No hay datos para mostrar",
        columns: columnasDinamicas
    });
}

// 14. Carga inicial del DOM
document.addEventListener("DOMContentLoaded", () => {
    if (!prepararAccesoPanel()) {
        return;
    }

    const primerBoton = document.querySelector('.tab-btn');
    if (primerBoton) {
        cambiarTabla('gandolas', primerBoton);
    }
});

// 15. Función para recargar tabla actual (útil después de operaciones)
async function recargarTablaActual() {
    if (tablaActual) {
        const botonActivo = document.querySelector(`.tab-btn[data-tab="${tablaActual}"]`);
        await cambiarTabla(tablaActual, botonActivo || document.querySelector('.tab-btn'));
    }
}

// Exponer funciones globalmente
window.cambiarTabla = cambiarTabla;
window.ejecutarSQL = ejecutarSQL;
window.recargarTablaActual = recargarTablaActual;