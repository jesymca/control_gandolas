// 1. Configuración de Supabase con clave service_role (Superusuario)
const supabaseUrlAdmin = "https://olagcugttxkflenqfxec.supabase.co";
const supabaseKeyAdmin = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9sYWdjdWd0dHhrZmxlbnFmeGVjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzYyMDM3MywiZXhwIjoyMDk5MTk2MzczfQ.z-uZPAN4pka9qTsp4JvenNjEhxKwvd6sbWTdzVyKxLk";

const supabaseAdminPanel = supabase.createClient(supabaseUrlAdmin, supabaseKeyAdmin);

let tablaInteractiva; 
let tablaResultadoSQL;
let tablaActual = 'gandolas';

// 2. Esquema de columnas mapeado directamente de tu base de datos
const configuracionColumnas = {
    gandolas: [
        {title: "ID", field: "id", width: 100, headerSort: false},
        {title: "Placa", field: "placa", editor: "input", headerFilter: "input"},
        {title: "Modelo", field: "modelo", editor: "input"},
        {title: "Año", field: "anio", editor: "number", width: 80},
        {title: "Cant. Cauchos", field: "cantidad_cauchos", editor: "number", width: 120},
        {title: "Marca Cauchos", field: "marca_cauchos", editor: "input"},
        {title: "Cambio Aceite", field: "fecha_cambio_aceite", editor: "date"},
        {title: "Último Gasoil", field: "fecha_ultimo_gasoil", editor: "date"}
    ],
    choferes: [
        {title: "ID", field: "id", width: 100, headerSort: false},
        {title: "Cédula", field: "cedula", editor: "input", headerFilter: "input"},
        {title: "Nombre", field: "nombre", editor: "input"},
        {title: "Apellido", field: "apellido", editor: "input"},
        {title: "Teléfono", field: "telefono", editor: "input"}
    ],
    usuarios: [
        {title: "ID", field: "id", width: 100, headerSort: false},
        {title: "Cédula", field: "cedula", editor: "input", headerFilter: "input"},
        {title: "Nombre Completo", field: "nombre_completo", editor: "input"},
        {title: "Correo", field: "correo", editor: "input"},
        {title: "Rol", field: "rol", editor: "list", editorParams: {values: ["admin", "operador"]}},
        {title: "Activo", field: "activo", editor: "tickCross", formatter: "tickCross", width: 90}
    ],
    registros: [
        {title: "ID", field: "id", width: 100, headerSort: false},
        {title: "Gandola ID", field: "gandola_id", width: 120},
        {title: "Tipo", field: "tipo", editor: "input", headerFilter: "input"},
        {title: "Fecha/Hora", field: "fecha_hora", width: 150},
        {title: "Observaciones", field: "observaciones", editor: "textarea"}
    ]
};

// 3. Función para alternar de pestaña y ver los datos en la tabla
async function cambiarTabla(nombreTabla, boton) {
    tablaActual = nombreTabla;

    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    if(boton) boton.classList.add('active');

    let { data, error } = await supabaseAdminPanel.from(nombreTabla).select('*');
    
    if (error) {
        console.error("Error cargando tabla:", error);
        alert("Error al conectar con la tabla: " + error.message);
        return;
    }

    if (tablaInteractiva) tablaInteractiva.destroy();

    tablaInteractiva = new Tabulator("#tabla-contenedor", {
        data: data,
        layout: "fitColumns",
        responsiveLayout: "hide",
        pagination: "local",
        paginationSize: 15,
        placeholder: "No hay registros en esta tabla",
        columns: configuracionColumnas[nombreTabla]
    });

    // Auto-guardado inmediato al editar celdas con doble clic
    tablaInteractiva.on("cellEdited", async function(cell) {
        let filaDatos = cell.getRow().getData();
        let columnaModificada = cell.getField();
        let nuevoValor = cell.getValue();

        const { error: updateError } = await supabaseAdminPanel
            .from(tablaActual)
            .update({ [columnaModificada]: nuevoValor })
            .eq('id', filaDatos.id);

        if (updateError) {
            console.error("Error al actualizar Supabase:", updateError);
            alert("No se pudo guardar el cambio.");
            cell.restoreOldValue(); 
        } else {
            console.log(`¡Modificado! [${tablaActual}] -> ID: ${filaDatos.id}`);
        }
    });
}

// 4. FUNCIÓN MAESTRA: Ejecuta CUALQUIER consulta SQL usando la función que creó tu compañero
async function ejecutarSQL() {
    const query = document.getElementById("sql-query").value.trim();
    const errorBox = document.getElementById("sql-error");
    const resultadoDiv = document.getElementById("tabla-sql-resultado");

    errorBox.style.display = "none";
    resultadoDiv.innerHTML = "<span style='color: #aaa;'>Ejecutando sentencia a nivel de núcleo de Postgres...</span>";

    if (!query) {
        alert("Por favor, escribe una consulta SQL primero.");
        resultadoDiv.innerHTML = "";
        return;
    }

    try {
        // Ejecutamos el RPC maestro pasándole la query en crudo
        const { data, error } = await supabaseAdminPanel
            .rpc('ejecutar_sql_maestro', { query_puro: query });

        if (error) throw error;

        resultadoDiv.innerHTML = "";

        // Validamos la respuesta capturada por la función de Postgres
        if (data.status === "error") {
            throw new Error(data.message);
        }

        // Si fue una consulta SELECT que devolvió filas (Postgres las agrupa como JSON)
        if (Array.isArray(data) || (typeof data === 'object' && !data.status)) {
            let datosTabular = Array.isArray(data) ? data : [data];

            if (datosTabular.length > 0) {
                // Mapear dinámicamente las columnas resultantes de tu SQL
                const columnasDinamicas = Object.keys(datosTabular[0]).map(key => {
                    return { title: key.toUpperCase(), field: key, headerSort: true };
                });

                if (tablaResultadoSQL) tablaResultadoSQL.destroy();

                tablaResultadoSQL = new Tabulator("#tabla-sql-resultado", {
                    data: datosTabular,
                    layout: "fitColumns",
                    pagination: "local",
                    paginationSize: 10,
                    columns: columnasDinamicas
                });
            } else {
                resultadoDiv.innerHTML = "<div style='color: #ffcc00; padding: 10px;'>Consulta SELECT ejecutada, pero no devolvió ninguna fila.</div>";
            }
        } else {
            // Mensaje de éxito para operaciones destructivas o de cambios estructurales (CREATE, ALTER, DROP, INSERT, etc.)
            resultadoDiv.innerHTML = `<div style="color: #00ff66; padding: 10px; background: #152515; border-radius:4px; font-size:14px; font-weight: bold;">
                ✓ ${data.message || "Operación procesada con éxito."}
            </div>`;

            // Refrescar la tabla actual por si modificaste datos de la vista en la que estás parado
            const botonActivo = document.querySelector('.tab-btn.active');
            if (botonActivo) cambiarTabla(tablaActual, botonActivo);
        }

    } catch (err) {
        resultadoDiv.innerHTML = "";
        errorBox.innerText = "Error Crítico de Postgres:\n" + err.message;
        errorBox.style.display = "block";
    }
}

// 5. Carga inicial
document.addEventListener("DOMContentLoaded", () => {
    const primerBoton = document.querySelector('.tab-btn');
    cambiarTabla('gandolas', primerBoton);
});