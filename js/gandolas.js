var gandolasData = [];

document.addEventListener('DOMContentLoaded', function() {
    verificarSesion();
    generarCamposCauchos();
    cargarGandolas();
    document.getElementById('btnGuardarGandola').addEventListener('click', guardarGandola);
    document.getElementById('gandolaFoto').addEventListener('change', function(e) {
        var file = e.target.files[0];
        if (file) { var r = new FileReader(); r.onload = function(ev) { document.getElementById('previewFoto').innerHTML = '<img src="' + ev.target.result + '" class="img-thumbnail" style="max-height:150px;">'; }; r.readAsDataURL(file); }
    });
});

function generarCamposCauchos() {
    var cant = parseInt(document.getElementById('gandolaCantCauchos').value);
    var c = document.getElementById('contenedorCauchos'); c.innerHTML = '';
    for (var i = 1; i <= cant; i++) {
        var col = cant === 6 ? 'col-4 col-md-2' : 'col-6 col-md-3';
        var ops = '';
        for (var j = 1; j <= 10; j++) ops += '<option value="' + j + '">' + j + '</option>';
        c.innerHTML += '<div class="' + col + '"><label class="form-label text-muted small">Caucho ' + i + ' (1-10)</label><select class="form-select form-select-sm caucho-cond" data-pos="' + i + '">' + ops + '</select></div>';
    }
}

function obtenerCauchosDetalle() {
    var s = document.querySelectorAll('.caucho-cond'); var d = [];
    for (var i = 0; i < s.length; i++) d.push({ posicion: parseInt(s[i].getAttribute('data-pos')), condicion: parseInt(s[i].value) });
    return d;
}

function calcularPromedio(c) {
    if (!c || c.length === 0) return null; var s = 0; for (var i = 0; i < c.length; i++) s += c[i].condicion; return s / c.length;
}

async function cargarGandolas() {
    var buscar = document.getElementById('buscarPlaca').value.trim().toUpperCase();
    var fc = document.getElementById('filtroCaucho').value;
    var fcond = document.getElementById('filtroCondicion').value;
    var q = supabase.from('gandolas').select('*').order('placa');
    if (buscar) q = q.ilike('placa', '%' + buscar + '%');
    if (fc) q = q.eq('cantidad_cauchos', parseInt(fc));
    var result = await q;
    if (result.error) { mostrarAlerta('alertGandola', 'Error al cargar: ' + result.error.message, 'danger'); return; }
    gandolasData = result.data || [];
    var filtradas = gandolasData;
    if (fcond) filtradas = gandolasData.filter(function(g) { var p = calcularPromedio(g.cauchos_detalle); if (p === null) return false; if (fcond === 'bueno') return p >= 7; if (fcond === 'regular') return p >= 4 && p < 7; if (fcond === 'malo') return p < 4; return true; });
    var tbody = document.getElementById('tbodyGandolas');
    var sd = document.getElementById('sinGandolas');
    tbody.innerHTML = '';
    if (filtradas.length === 0) { sd.classList.remove('d-none'); return; }
    sd.classList.add('d-none');
    filtradas.forEach(function(g) {
        var p = calcularPromedio(g.cauchos_detalle); var ps = p !== null ? p.toFixed(1) : 'N/A';
        var cp = p === null ? 'secondary' : p >= 7 ? 'success' : p >= 4 ? 'warning text-dark' : 'danger';
        var fh = g.foto_url ? '<img src="' + g.foto_url + '" class="rounded" style="width:60px;height:45px;object-fit:cover;" alt="Foto">' : '<div class="bg-secondary rounded d-flex align-items-center justify-content-center text-white" style="width:60px;height:45px;"><i class="bi bi-image"></i></div>';
        var tr = document.createElement('tr');
        tr.innerHTML = '<td>' + fh + '</td><td class="fw-bold">' + g.placa + '</td><td>' + g.modelo + '</td><td>' + g.anio + '</td><td>' + g.cantidad_cauchos + ' - ' + (g.marca_cauchos || 'Sin marca') + '</td><td><span class="badge bg-' + cp + '">' + ps + '/10</span></td><td>' + (g.fecha_ultimo_gasoil || 'N/A') + '</td><td><button class="btn btn-sm btn-outline-info me-1" onclick="verDetalle(\'' + g.id + '\')"><i class="bi bi-eye"></i></button><button class="btn btn-sm btn-outline-warning me-1" onclick="editarGandola(\'' + g.id + '\')"><i class="bi bi-pencil"></i></button><button class="btn btn-sm btn-outline-danger" onclick="eliminarGandola(\'' + g.id + '\')"><i class="bi bi-trash"></i></button></td>';
        tbody.appendChild(tr);
    });
}

async function guardarGandola() {
    var id = document.getElementById('gandolaId').value;
    var placa = document.getElementById('gandolaPlaca').value.trim().toUpperCase();
    var modelo = document.getElementById('gandolaModelo').value.trim();
    var anio = parseInt(document.getElementById('gandolaAnio').value);
    var cantCauchos = parseInt(document.getElementById('gandolaCantCauchos').value);
    var marcaCauchos = document.getElementById('gandolaMarcaCauchos').value.trim();
    var cauchosDetalle = obtenerCauchosDetalle();
    var fa = document.getElementById('gandolaAceite').value || null;
    var ffao = document.getElementById('gandolaFiltroAceite').value || null;
    var ffai = document.getElementById('gandolaFiltroAire').value || null;
    var fg = document.getElementById('gandolaGasoil').value || null;
    var fotoFile = document.getElementById('gandolaFoto').files[0];
    if (!placa || !modelo || !anio) { mostrarAlerta('alertGandola', 'Placa, Modelo y Año son obligatorios.', 'warning'); return; }
    var fotoUrl = null;
    if (fotoFile) {
        var ext = fotoFile.name.split('.').pop();
        var narch = placa.replace(/[^a-zA-Z0-9]/g, '') + '_' + Date.now() + '.' + ext;
        var ur = await supabase.storage.from('fotos-gandolas').upload(narch, fotoFile);
        if (ur.error) { mostrarAlerta('alertGandola', 'Error al subir foto: ' + ur.error.message, 'danger'); return; }
        fotoUrl = supabase.storage.from('fotos-gandolas').getPublicUrl(narch).publicUrl;
    }
    var datos = { placa: placa, modelo: modelo, anio: anio, cantidad_cauchos: cantCauchos, marca_cauchos: marcaCauchos, cauchos_detalle: cauchosDetalle, fecha_cambio_aceite: fa, fecha_filtro_aceite: ffao, fecha_filtro_aire: ffai, fecha_ultimo_gasoil: fg, actualizado_en: new Date().toISOString() };
    if (fotoUrl) datos.foto_url = fotoUrl;
    var result;
    if (id) { result = await supabase.from('gandolas').update(datos).eq('id', id); } else { result = await supabase.from('gandolas').insert(datos); }
    if (result.error) { mostrarAlerta('alertGandola', 'Error: ' + result.error.message, 'danger'); return; }
    mostrarAlerta('alertGandola', id ? 'Gandola actualizada correctamente.' : 'Gandola registrada correctamente.', 'success');
    bootstrap.Modal.getInstance(document.getElementById('modalGandola')).hide();
    limpiarFormGandola(); cargarGandolas();
}

async function editarGandola(id) {
    var g = gandolasData.find(function(x) { return x.id === id; });
    if (!g) return;
    document.getElementById('gandolaId').value = g.id;
    document.getElementById('gandolaPlaca').value = g.placa;
    document.getElementById('gandolaModelo').value = g.modelo;
    document.getElementById('gandolaAnio').value = g.anio;
    document.getElementById('gandolaCantCauchos').value = g.cantidad_cauchos;
    document.getElementById('gandolaMarcaCauchos').value = g.marca_cauchos || '';
    document.getElementById('gandolaAceite').value = g.fecha_cambio_aceite || '';
    document.getElementById('gandolaFiltroAceite').value = g.fecha_filtro_aceite || '';
    document.getElementById('gandolaFiltroAire').value = g.fecha_filtro_aire || '';
    document.getElementById('gandolaGasoil').value = g.fecha_ultimo_gasoil || '';
    if (g.foto_url) document.getElementById('previewFoto').innerHTML = '<img src="' + g.foto_url + '" class="img-thumbnail" style="max-height:150px;">';
    generarCamposCauchos();
    if (g.cauchos_detalle && g.cauchos_detalle.length > 0) g.cauchos_detalle.forEach(function(c) { var sel = document.querySelector('.caucho-cond[data-pos="' + c.posicion + '"]'); if (sel) sel.value = c.condicion; });
    document.getElementById('tituloModalGandola').innerHTML = '<i class="bi bi-pencil me-2"></i>Editar Gandola';
    new bootstrap.Modal(document.getElementById('modalGandola')).show();
}

async function eliminarGandola(id) {
    if (!confirm('¿Está seguro de que desea eliminar esta gandola?')) return;
    var r = await supabase.from('gandolas').delete().eq('id', id);
    if (r.error) { mostrarAlerta('alertGandola', 'Error: ' + r.error.message, 'danger'); return; }
    mostrarAlerta('alertGandola', 'Gandola eliminada.', 'success'); cargarGandolas();
}

function verDetalle(id) {
    var g = gandolasData.find(function(x) { return x.id === id; });
    if (!g) return;
    var ch = '';
    if (g.cauchos_detalle && g.cauchos_detalle.length > 0) {
        g.cauchos_detalle.forEach(function(c) { var cl = c.condicion >= 7 ? 'success' : c.condicion >= 4 ? 'warning text-dark' : 'danger'; ch += '<span class="badge bg-' + cl + ' me-1 mb-1 fs-6 p-2">C' + c.posicion + ': ' + c.condicion + '/10</span> '; });
        var pr = calcularPromedio(g.cauchos_detalle); var pc = pr >= 7 ? 'success' : pr >= 4 ? 'warning' : 'danger';
        ch += '<div class="mt-2"><span class="badge bg-' + pc + ' fs-6 p-2">Promedio: ' + pr.toFixed(1) + '/10</span></div>';
    } else { ch = '<span class="text-muted">Sin datos de cauchos</span>'; }
    var fh = g.foto_url ? '<img src="' + g.foto_url + '" class="img-fluid rounded border" alt="Foto">' : '<div class="bg-secondary rounded d-flex align-items-center justify-content-center text-white" style="height:200px;"><i class="bi bi-image fs-1"></i></div>';
    document.getElementById('contenidoDetalle').innerHTML = '<div class="row"><div class="col-md-4 text-center mb-3">' + fh + '</div><div class="col-md-8"><table class="table table-borderless"><tr><th class="text-warning" style="width:40%;">Placa</th><td class="fw-bold fs-5">' + g.placa + '</td></tr><tr><th class="text-warning">Modelo</th><td>' + g.modelo + '</td></tr><tr><th class="text-warning">Año</th><td>' + g.anio + '</td></tr><tr><th class="text-warning">Cauchos</th><td>' + g.cantidad_cauchos + ' unidades - ' + (g.marca_cauchos || 'Sin marca') + '</td></tr><tr><th class="text-warning">Condición Cauchos</th><td>' + ch + '</td></tr><tr><th class="text-success">Cambio de Aceite</th><td>' + (g.fecha_cambio_aceite || 'N/A') + '</td></tr><tr><th class="text-success">Filtro de Aceite</th><td>' + (g.fecha_filtro_aceite || 'N/A') + '</td></tr><tr><th class="text-success">Filtro de Aire</th><td>' + (g.fecha_filtro_aire || 'N/A') + '</td></tr><tr><th class="text-success">Último Gasoil</th><td>' + (g.fecha_ultimo_gasoil || 'N/A') + '</td></tr></table></div></div>';
    new bootstrap.Modal(document.getElementById('modalDetalle')).show();
}

function limpiarFormGandola() {
    document.getElementById('formGandola').reset();
    document.getElementById('gandolaId').value = '';
    document.getElementById('previewFoto').innerHTML = '';
    document.getElementById('tituloModalGandola').innerHTML = '<i class="bi bi-truck me-2"></i>Nueva Gandola';
    generarCamposCauchos();
}
