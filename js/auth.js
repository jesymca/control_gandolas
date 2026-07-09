function mostrarAlerta(elementId, mensaje, tipo) {
    var el = document.getElementById(elementId);
    if (!el) return;
    el.className = 'alert alert-' + tipo;
    el.innerHTML = '<i class="bi bi-' + (tipo === 'success' ? 'check-circle' : tipo === 'danger' ? 'exclamation-triangle' : 'info-circle') + ' me-2"></i>' + mensaje;
    el.classList.remove('d-none');
    setTimeout(function() { el.classList.add('d-none'); }, 5000);
}

function verificarSesion() {
    var data = sessionStorage.getItem('usuario');
    if (!data) { window.location.href = 'login.html'; return null; }
    return JSON.parse(data);
}

function cerrarSesion() {
    sessionStorage.removeItem('usuario');
    window.location.href = 'login.html';
}

function ajustarMenuLink() {
    var data = sessionStorage.getItem('usuario');
    if (!data) return;
    var u = JSON.parse(data);
    var url = u.rol === 'admin' ? 'admin.html' : 'menu.html';
    var links = document.querySelectorAll('.nav-menu-link');
    for (var i = 0; i < links.length; i++) { links[i].href = url; }
}

document.addEventListener('DOMContentLoaded', function() {
    ajustarMenuLink();
    var formLogin = document.getElementById('formLogin');
    if (formLogin) {
        formLogin.addEventListener('submit', async function(e) {
            e.preventDefault();
            var correo = document.getElementById('correo').value.trim();
            var contrasena = document.getElementById('contrasena').value;
            var btn = document.getElementById('btnLogin');
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Verificando...';
            try {
                var result = await supabase.from('usuarios').select('*').eq('correo', correo).eq('activo', true).single();
                if (result.error || !result.data) {
                    mostrarAlerta('alertLogin', 'Usuario no encontrado o inactivo.', 'danger');
                    btn.disabled = false; btn.innerHTML = '<i class="bi bi-box-arrow-in-right me-2"></i>Ingresar'; return;
                }
                var claveDecodificada = atob(result.data.contrasena);
                if (claveDecodificada !== contrasena) {
                    mostrarAlerta('alertLogin', 'Contraseña incorrecta.', 'danger');
                    btn.disabled = false; btn.innerHTML = '<i class="bi bi-box-arrow-in-right me-2"></i>Ingresar'; return;
                }
                sessionStorage.setItem('usuario', JSON.stringify({ id: result.data.id, nombre: result.data.nombre_completo, correo: result.data.correo, cedula: result.data.cedula, rol: result.data.rol }));
                window.location.href = result.data.rol === 'admin' ? 'admin.html' : 'menu.html';
            } catch (err) {
                mostrarAlerta('alertLogin', 'Error de conexión. Verifique su red e intente de nuevo.', 'danger');
                btn.disabled = false; btn.innerHTML = '<i class="bi bi-box-arrow-in-right me-2"></i>Ingresar';
            }
        });
    }
});
