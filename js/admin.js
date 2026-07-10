document.addEventListener('DOMContentLoaded', async function() {
    var usuario = verificarSesion();
    if (!usuario || usuario.rol !== 'admin') { window.location.href = 'login.html'; return; }
    document.getElementById('nombreAdmin').textContent = usuario.nombre;
    var linkAdminDb = document.getElementById('linkAdminDb');
    if (linkAdminDb) { linkAdminDb.classList.remove('d-none'); }
    await cargarUsuarios();
    document.getElementById('btnGuardarUsuario').addEventListener('click', crearUsuario);
    document.getElementById('formClave').addEventListener('submit', cambiarClave);
});

async function cargarUsuarios() {
    var result = await supabase.from('usuarios').select('*').order('creado_en', { ascending: false });
    if (result.error) { mostrarAlerta('alertAdmin', 'Error al cargar usuarios: ' + result.error.message, 'danger'); return; }
    var tbody = document.getElementById('tbodyUsuarios');
    tbody.innerHTML = '';
    (result.data || []).forEach(function(u) {
        var tr = document.createElement('tr');
        tr.innerHTML = '<td class="fw-bold">' + u.nombre_completo + '</td><td>' + u.correo + '</td><td>' + u.cedula + '</td><td><span class="badge ' + (u.rol === 'admin' ? 'bg-warning text-dark' : 'bg-success') + '">' + u.rol + '</span></td><td><span class="badge ' + (u.activo ? 'bg-success' : 'bg-secondary') + '">' + (u.activo ? 'Activo' : 'Inactivo') + '</span></td><td><button class="btn btn-sm btn-outline-' + (u.activo ? 'danger' : 'success') + ' me-1" onclick="toggleUsuario(\'' + u.id + '\',' + !u.activo + ')" title="' + (u.activo ? 'Desactivar' : 'Activar') + '"><i class="bi bi-' + (u.activo ? 'x-circle' : 'check-circle') + '"></i></button><button class="btn btn-sm btn-outline-warning" onclick="resetClave(\'' + u.id + '\')" title="Cambiar contraseña"><i class="bi bi-key"></i></button></td>';
        tbody.appendChild(tr);
    });
}

async function crearUsuario() {
    var nombre = document.getElementById('nuNombre').value.trim();
    var correo = document.getElementById('nuCorreo').value.trim();
    var cedula = document.getElementById('nuCedula').value.trim();
    var clave = document.getElementById('nuClave').value;
    var rol = document.getElementById('nuRol').value;
    if (!nombre || !correo || !cedula || !clave) { mostrarAlerta('alertAdmin', 'Todos los campos son obligatorios.', 'warning'); return; }
    if (clave.length < 3) { mostrarAlerta('alertAdmin', 'La contraseña debe tener al menos 3 caracteres.', 'warning'); return; }
    var result = await supabase.from('usuarios').insert({ nombre_completo: nombre, correo: correo, cedula: cedula, contrasena: btoa(clave), rol: rol, activo: true });
    if (result.error) { mostrarAlerta('alertAdmin', 'Error al crear: ' + result.error.message, 'danger'); return; }
    mostrarAlerta('alertAdmin', 'Usuario "' + nombre + '" creado exitosamente.', 'success');
    document.getElementById('formUsuario').reset();
    bootstrap.Modal.getInstance(document.getElementById('modalUsuario')).hide();
    await cargarUsuarios();
}

async function toggleUsuario(id, activo) {
    var r = await supabase.from('usuarios').update({ activo: activo }).eq('id', id);
    if (r.error) { mostrarAlerta('alertAdmin', 'Error: ' + r.error.message, 'danger'); return; }
    await cargarUsuarios();
}

async function resetClave(id) {
    var nueva = prompt('Ingrese la NUEVA contraseña para este usuario:');
    if (!nueva || nueva.length < 3) { if (nueva !== null) alert('La contraseña debe tener al menos 3 caracteres.'); return; }
    var r = await supabase.from('usuarios').update({ contrasena: btoa(nueva) }).eq('id', id);
    if (r.error) { mostrarAlerta('alertAdmin', 'Error: ' + r.error.message, 'danger'); return; }
    mostrarAlerta('alertAdmin', 'Contraseña actualizada correctamente.', 'success');
}

async function cambiarClave(e) {
    e.preventDefault();
    var usuario = JSON.parse(sessionStorage.getItem('usuario'));
    var actual = document.getElementById('claveActual').value;
    var nueva = document.getElementById('claveNueva').value;
    var confirmar = document.getElementById('claveConfirmar').value;
    if (nueva !== confirmar) { mostrarAlerta('alertClave', 'Las contraseñas nuevas no coinciden.', 'danger'); return; }
    if (nueva.length < 3) { mostrarAlerta('alertClave', 'La nueva contraseña debe tener al menos 3 caracteres.', 'warning'); return; }
    var res = await supabase.from('usuarios').select('contrasena').eq('id', usuario.id).single();
    if (res.error || atob(res.data.contrasena) !== actual) { mostrarAlerta('alertClave', 'La contraseña actual es incorrecta.', 'danger'); return; }
    var upd = await supabase.from('usuarios').update({ contrasena: btoa(nueva) }).eq('id', usuario.id);
    if (upd.error) { mostrarAlerta('alertClave', 'Error: ' + upd.error.message, 'danger'); return; }
    mostrarAlerta('alertClave', 'Contraseña cambiada exitosamente.', 'success');
    document.getElementById('formClave').reset();
}
