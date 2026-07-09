var choferesData = [];

document.addEventListener('DOMContentLoaded', function() {
    verificarSesion(); cargarChoferes();
    document.getElementById('btnGuardarChofer').addEventListener('click', guardarChofer);
    document.getElementById('choferFoto').addEventListener('change', function(e) {
        var file = e.target.files[0];
        if (file) { var r = new FileReader(); r.onload = function(ev) { document.getElementById('previewFotoChofer').innerHTML = '<img src="' + ev.target.result + '" class="img-thumbnail rounded-circle" style="max-height:120px;">'; }; r.readAsDataURL(file); }
    });
});

async function cargarChoferes() {
    var result = await supabase.from('choferes').select('*').order('apellido');
    if (result.error) { mostrarAlerta('alertChofer', 'Error al cargar: ' + result.error.message, 'danger'); return; }
    choferesData = result.data || [];
    var tbody = document.getElementById('tbodyChoferes');
    var sd = document.getElementById('sinChoferes');
    tbody.innerHTML = '';
    if (choferesData.length === 0) { sd.classList.remove('d-none'); return; }
    sd.classList.add('d-none');
    choferesData.forEach(function(c) {
        var fh = c.foto_url ? '<img src="' + c.foto_url + '" class="rounded-circle" style="width:45px;height:45px;object-fit:cover;" alt="Foto">' : '<div class="bg-success rounded-circle d-flex align-items-center justify-content-center text-white" style="width:45px;height:45px;"><i class="bi bi-person"></i></div>';
        var tr = document.createElement('tr');
        tr.innerHTML = '<td>' + fh + '</td><td class="fw-bold">' + c.nombre + '</td><td>' + c.apellido + '</td><td>' + c.cedula + '</td><td>' + c.telefono + '</td><td><button class="btn btn-sm btn-outline-warning me-1" onclick="editarChofer(\'' + c.id + '\')"><i class="bi bi-pencil"></i></button><button class="btn btn-sm btn-outline-danger" onclick="eliminarChofer(\'' + c.id + '\')"><i class="bi bi-trash"></i></button></td>';
        tbody.appendChild(tr);
    });
}

async function guardarChofer() {
    var id = document.getElementById('choferId').value;
    var nombre = document.getElementById('choferNombre').value.trim();
    var apellido = document.getElementById('choferApellido').value.trim();
    var cedula = document.getElementById('choferCedula').value.trim();
    var telefono = document.getElementById('choferTelefono').value.trim();
    var fotoFile = document.getElementById('choferFoto').files[0];
    if (!nombre || !apellido || !cedula || !telefono) { mostrarAlerta('alertChofer', 'Todos los campos son obligatorios.', 'warning'); return; }
    var fotoUrl = null;
    if (fotoFile) {
        var ext = fotoFile.name.split('.').pop();
        var narch = 'chofer_' + cedula.replace(/[^a-zA-Z0-9]/g, '') + '_' + Date.now() + '.' + ext;
        var ur = await supabase.storage.from('fotos-choferes').upload(narch, fotoFile);
        if (ur.error) { mostrarAlerta('alertChofer', 'Error al subir foto: ' + ur.error.message, 'danger'); return; }
        fotoUrl = supabase.storage.from('fotos-choferes').getPublicUrl(narch).publicUrl;
    }
    var datos = { nombre: nombre, apellido: apellido, cedula: cedula, telefono: telefono };
    if (fotoUrl) datos.foto_url = fotoUrl;
    var result;
    if (id) { result = await supabase.from('choferes').update(datos).eq('id', id); } else { result = await supabase.from('choferes').insert(datos); }
    if (result.error) { mostrarAlerta('alertChofer', 'Error: ' + result.error.message, 'danger'); return; }
    mostrarAlerta('alertChofer', id ? 'Chofer actualizado.' : 'Chofer registrado.', 'success');
    bootstrap.Modal.getInstance(document.getElementById('modalChofer')).hide();
    limpiarFormChofer(); cargarChoferes();
}

async function editarChofer(id) {
    var c = choferesData.find(function(x) { return x.id === id; });
    if (!c) return;
    document.getElementById('choferId').value = c.id;
    document.getElementById('choferNombre').value = c.nombre;
    document.getElementById('choferApellido').value = c.apellido;
    document.getElementById('choferCedula').value = c.cedula;
    document.getElementById('choferTelefono').value = c.telefono;
    if (c.foto_url) document.getElementById('previewFotoChofer').innerHTML = '<img src="' + c.foto_url + '" class="img-thumbnail rounded-circle" style="max-height:120px;">';
    document.getElementById('tituloModalChofer').innerHTML = '<i class="bi bi-pencil me-2"></i>Editar Chofer';
    new bootstrap.Modal(document.getElementById('modalChofer')).show();
}

async function eliminarChofer(id) {
    if (!confirm('¿Está seguro de que desea eliminar este chofer?')) return;
    var r = await supabase.from('choferes').delete().eq('id', id);
    if (r.error) { mostrarAlerta('alertChofer', 'Error: ' + r.error.message, 'danger'); return; }
    mostrarAlerta('alertChofer', 'Chofer eliminado.', 'success'); cargarChoferes();
}

function limpiarFormChofer() {
    document.getElementById('formChofer').reset();
    document.getElementById('choferId').value = '';
    document.getElementById('previewFotoChofer').innerHTML = '';
    document.getElementById('tituloModalChofer').innerHTML = '<i class="bi bi-person-plus me-2"></i>Nuevo Chofer';
}
