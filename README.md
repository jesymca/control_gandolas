# GandolaControl

Sistema web para gestionar de forma centralizada el control de gandolas, choferes, ingresos y salidas de patio. Está pensado para operaciones de transporte y logística que necesitan un registro claro, rápido y ordenado de cada unidad y su estado operativo.

## ¿Qué ofrece?

- Registro completo de gandolas con foto, placa, modelo, año y estado de cauchos.
- Gestión de choferes con datos básicos de contacto.
- Control de ingresos y salidas del patio.
- Seguimiento de mantenimiento asociado: aceite, filtros, gasoil y observaciones.
- Interfaz sencilla y moderna construida con Bootstrap.

## Tecnologías utilizadas

- HTML, CSS y JavaScript
- Bootstrap 5 para la interfaz
- Bootstrap Icons para los elementos visuales
- Supabase para autenticación y almacenamiento de datos

## Estructura del proyecto

- index.html: página principal de presentación
- login.html: acceso al sistema
- menu.html, admin.html, ingreso.html, salida.html y registro-chofer.html: módulos del flujo operativo
- js/: lógica del frontend y conexión con Supabase

## Cómo usarlo localmente

1. Clona este repositorio.
2. Abre la carpeta en tu editor de código.
3. Inicia un servidor local, por ejemplo:
   ```bash
   python3 -m http.server 8000
   ```
4. Abre en tu navegador la dirección:
   ```text
   http://localhost:8000/
   ```

## Despliegue en GitHub Pages

El sitio está preparado para publicarse en GitHub Pages de forma sencilla.

- Cada push a la rama principal activa un workflow automático de despliegue.
- El contenido del repositorio se publica directamente como una web estática.
- Para activarlo en GitHub, asegúrate de tener habilitado Pages con la opción "GitHub Actions".

## Notas importantes

- El proyecto funciona como una aplicación web estática.
- Para que el sistema funcione correctamente, es necesario configurar las credenciales de Supabase en el archivo de configuración del proyecto.
- Si realizas cambios y quieres verlos publicados, solo debes hacer push a la rama principal.
