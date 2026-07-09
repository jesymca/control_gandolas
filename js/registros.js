var gandolasData = [];
var choferesData = [];
var gandolaSeleccionada = null;

document.addEventListener('DOMContentLoaded', async function() {
    var usuario = verificarSesion();
    if (!usuario) return;
    await cargarDatosComunes();
    var fi = document.getElementById('formIngreso');
    var fs = document.getElementById('formSalida');
    if (fi) { fi.addEventListener('submit', function(e) { e.preventDefault(); registrarMovimiento('entrada', usuario); }); document.getElementById('ingGandola').addEventListener('change', function() { seleccionarGandolaIngreso(this.value); }); cargarUltimosRegistros('entrada'); }
    if (fs) { fs.addEventListener('submit', function(e) { e.preventDefault(); registrarMovimiento('salida', usuario); }); document.getElementById('salGandola').addEventListener('change', function() { seleccionarGandolaSalida(this.value); }); cargarUltimosRegistros('salida'); }
});

async function cargarDatosComunes() {
    var rg = await supabase.from('gandolas').select('*').order('placa');
    var rc = await supabase.from('choferes').select('*').order('apellido');
    gandolasData = rg.data || [];
    choferesData = rc.data || [];
    var sg = document.getElementById('ingGandola'); var ss = document.getElementById('salGandola');
    gandolasData.forEach(function(g) { var o = '<option value="' + g.id + '">' + g.placa + ' - ' + g.modelo + ' (' + g.anio + ')</option>'; if (sg) sg.innerHTML += o; if (ss) ss.innerHTML += o; });
    var scg = document.getElementById('ingChofer'); var scs = document.getElementById('salChofer');
    choferesData.forEach(function(c) { var o = '<option value="' + c.id + '">' + c.nombre + ' ' + c.apellido + ' - ' + c.cedula + '</option>'; if (scg) scg.innerHTML += o; if (scs) scs.innerHTML += o; });
}

function seleccionarGandolaIngreso(id) {
    var g = gandolasData.find(function(x) { return x.id === id; });
    gandolaSeleccionada = g || null;
    var infoDiv = document.getElementById('infoGandola'); var seccion = document.getElementById('seccionActualizacion');
    if (!g) { infoDiv.classList.add('d-none'); seccion.classList.add('d-none'); document.getElementById('ingContenedorCauchos').innerHTML = ''; return; }
    infoDiv.classList.remove('d-none'); seccion.classList.remove('d-none');
    document.getElementById('infoGandolaFoto').innerHTML = g.foto_url ? '<img src="' + g.foto_url + '" class="rounded" style="max-height:80px;max-width:100%;object-fit:cover;" alt="Foto">' : '<i class="bi bi-truck text-warning" style="font-size:3rem;"></i>';
    document.getElementById('infoGandolaPlaca').textContent = g.placa;
    document.getElementById('infoGandolaModelo').textContent = g.modelo + ' - ' + g.anio;
    document.getElementById('infoGandolaUltimo').textContent = 'Último gasoil: ' + (g.fecha_ultimo_gasoil || 'N/A');
    document.getElementById('ingCantCauchos').value = g.cantidad_cauchos;
    document.getElementById('ingMarcaCauchos').value = g.marca_cauchos || '';
    document.getElementById('ingAceite').value = g.fecha_cambio_aceite || '';
    document.getElementById('ingFiltroAceite').value = g.fecha_filtro_aceite || '';
    document.getElementById('ingFiltroAire').value = g.fecha_filtro_aire || '';
    document.getElementById('ingGasoil').value = g.fecha_ultimo_gasoil || '';
    var cont = document.getElementById('ingContenedorCauchos'); cont.innerHTML = '';
    for (var i = 1; i <= g.cantidad_cauchos; i++) {
        var val = 5;
        if (g.cauchos_detalle && g.cauchos_detalle.length > 0) { var enc = g.cauchos_detalle.find(function(c) { return c.posicion === i; }); if (enc) val = enc.condicion; }
        var col = g.cantidad_cauchos === 6 ? 'col-4 col-md-2' : 'col-6 col-md-3';
        var ops = '';
        for (var j = 1; j <= 10; j++) ops += '<option value="' + j + '"' + (j === val ? ' selected' : '') + '>' + j + '</option>';
        cont.innerHTML += '<div class="' + col + '"><label class="form-label text-muted small">Caucho ' + i + '</label><select class="form-select form-select-sm ing-caucho" data-pos="' + i + '">' + ops + '</select></div>';
    }
}

function seleccionarGandolaSalida(id) {
    var g = gandolasData.find(function(x) { return x.id === id; });
    gandolaSeleccionada = g || null;
    var infoDiv = document.getElementById('infoGandolaSal');
    if (!g) { infoDiv.classList.add('d-none'); return; }
    infoDiv.classList.remove('d-none');
    document.getElementById('infoGandolaFotoSal').innerHTML = g.foto_url ? '<img src="' + g.foto_url + '" class="rounded" style="max-height:80px;max-width:100%;object-fit:cover;" alt="Foto">' : '<i class="bi bi-truck text-success" style="font-size:3rem;"></i>';
    document.getElementById('infoGandolaPlacaSal').textContent = g.placa;
    document.getElementById('infoGandolaModeloSal').textContent = g.modelo + ' - ' + g.anio;
    document.getElementById('infoGandolaUltimoSal').textContent = 'Último gasoil: ' + (g.fecha_ultimo_gasoil || 'N/A');
}

async function registrarMovimiento(tipo, usuario) {
    if (tipo === 'entrada') {
        if (!gandolaSeleccionada) { mostrarAlerta('alertIngreso', 'Seleccione una gandola.', 'warning'); return; }
        var choferId = document.getElementById('ingChofer').value || null;
        var mc = document.getElementById('ingMarcaCauchos').value.trim();
        var fa = document.getElementById('ingAceite').value || null;
        var ffo = document.getElementById('ingFiltroAceite').value || null;
        var ffi = document.getElementById('ingFiltroAire').value || null;
        var fg = document.getElementById('ingGasoil').value || null;
        var obs = document.getElementById('ingObservaciones').value.trim();
        var sels = document.querySelectorAll('.ing-caucho'); var cd = [];
        for (var i = 0; i < sels.length; i++) cd.push({ posicion: parseInt(sels[i].getAttribute('data-pos')), condicion: parseInt(sels[i].value) });
        var upd = { marca_cauchos: mc || gandolaSeleccionada.marca_cauchos, cauchos_detalle: cd, fecha_cambio_aceite: fa, fecha_filtro_aceite: ffo, fecha_filtro_aire: ffi, fecha_ultimo_gasoil: fg, actualizado_en: new Date().toISOString() };
        var ru = await supabase.from('gandolas').update(upd).eq('id', gandolaSeleccionada.id);
        if (ru.error) { mostrarAlerta('alertIngreso', 'Error al actualizar gandola: ' + ru.error.message, 'danger'); return; }
        var ri = await supabase.from('registros').insert({ gandola_id: gandolaSeleccionada.id, chofer_id: choferId, tipo: 'entrada', cauchos_detalle: cd, marca_cauchos: mc || gandolaSeleccionada.marca_cauchos, fecha_cambio_aceite: fa, fecha_filtro_aceite: ffo, fecha_filtro_aire: ffi, fecha_ultimo_gasoil: fg, observaciones: obs, usuario_id: usuario.id });
        if (ri.error) { mostrarAlerta('alertIngreso', 'Error al registrar entrada: ' + ri.error.message, 'danger'); return; }
        mostrarAlerta('alertIngreso', 'Ingreso de gandola ' + gandolaSeleccionada.placa + ' registrado exitosamente.', 'success');
        document.getElementById('formIngreso').reset(); document.getElementById('infoGandola').classList.add('d-none'); document.getElementById('seccionActualizacion').classList.add('d-none'); document.getElementById('ingContenedorCauchos').innerHTML = ''; gandolaSeleccionada = null;
        await cargarDatosComunes(); cargarUltimosRegistros('entrada');
    } else if (tipo === 'salida') {
        if (!gandolaSeleccionada) { mostrarAlerta('alertSalida', 'Seleccione una gandola.', 'warning'); return; }
        var choferIdS = document.getElementById('salChofer').value || null;
        var obsS = document.getElementById('salObservaciones').value.trim();
        var riS = await supabase.from('registros').insert({ gandola_id: gandolaSeleccionada.id, chofer_id: choferIdS, tipo: 'salida', observaciones: obsS, usuario_id: usuario.id });
        if (riS.error) { mostrarAlerta('alertSalida', 'Error: ' + riS.error.message, 'danger'); return; }
        mostrarAlerta('alertSalida', 'Salida de gandola ' + gandolaSeleccionada.placa + ' registrada exitosamente.', 'success');
        document.getElementById('formSalida').reset(); document.getElementById('infoGandolaSal').classList.add('d-none'); gandolaSeleccionada = null;
        cargarUltimosRegistros('salida');
    }
}

async function cargarUltimosRegistros(tipo) {
    var result = await supabase.from('registros').select('*, gandolas(placa, modelo), choferes(nombre, apellido)').eq('tipo', tipo).order('fecha_hora', { ascending: false }).limit(15);
    var tid = tipo === 'entrada' ? 'tbodyIngresos' : 'tbodySalidas';
    var tbody = document.getElementById(tid);
    if (!tbody) return;
    tbody.innerHTML = '';
    if (result.error) { tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger py-3">Error al cargar registros</td></tr>'; return; }
    var datos = result.data || [];
    if (datos.length === 0) { var cs = tipo === 'entrada' ? '5' : '4'; tbody.innerHTML = '<tr><td colspan="' + cs + '" class="text-center text-muted py-3">No hay registros de ' + tipo + '</td></tr>'; return; }
    datos.forEach(function(r) {
        var f = new Date(r.fecha_hora).toLocaleString('es-VE');
        var p = r.gandolas ? r.gandolas.placa : 'N/A';
        var ch = r.choferes ? r.choferes.nombre + ' ' + r.choferes.apellido : 'Sin asignar';
        var tr = document.createElement('tr');
        if (tipo === 'entrada') { tr.innerHTML = '<td>' + f + '</td><td class="fw-bold">' + p + '</td><td>' + ch + '</td><td>' + (r.fecha_ultimo_gasoil || 'N/A') + '</td><td>' + (r.observaciones || '-') + '</td>'; }
        else { tr.innerHTML = '<td>' + f + '</td><td class="fw-bold">' + p + '</td><td>' + ch + '</td><td>' + (r.observaciones || '-') + '</td>'; }
        tbody.appendChild(tr);
    });
}
