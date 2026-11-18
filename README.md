# NetService Pro

Sistema web para gestionar equipos de red, citas de mantenimiento, técnicos y
reportes de visitas.

## Requisitos

- PHP 8.2 o superior con PDO MySQL habilitado.
- MySQL o MariaDB.
- Un servidor web local.

## Instalación

1. Crear la base de datos ejecutando [`database.sql`](database.sql) en MySQL.
2. Verificar la conexión en [`api.php`](api.php):

   ```php
   mysql:host=localhost;port=3306;dbname=netservice_pro
   ```

   La configuración predeterminada usa el usuario `root` sin contraseña.
3. Servir la carpeta del proyecto desde el servidor local.

   Con PHP:

   ```powershell
   php -S localhost:8000
   ```

4. Abrir `http://localhost:8000/index.html`.

## Usuarios y contraseñas

Cuando un usuario se registra, la API guarda sus datos en MySQL:

- Base de datos: `netservice_pro`
- Tabla: `usuarios`
- Datos: nombre, correo, rol y contraseña cifrada

La contraseña nunca se guarda como texto plano. `api.php` utiliza
`password_hash()` para almacenarla y `password_verify()` para comprobarla al
iniciar sesión.

Los usuarios nuevos solo pueden registrarse con el rol `cliente`. Las cuentas
de administrador y empleado deben crearse previamente en la base de datos.

Después del inicio de sesión, el navegador conserva temporalmente los datos
básicos del usuario en `sessionStorage` para mostrar la interfaz correspondiente.
La sesión de autenticación se mantiene mediante una cookie de PHP.

## Funcionalidades

- Registro, inicio de sesión y recuperación de contraseña.
- Gestión de equipos de red.
- Creación y seguimiento de citas.
- Asignación de citas a empleados.
- Reportes de visitas técnicas.
- Paneles separados para clientes, empleados y administradores.

## Archivos importantes

- `api.php`: API, autenticación y operaciones de base de datos.
- `database.sql`: esquema y datos iniciales de MySQL.
- `js/app.js`: lógica de las páginas principales.
- `js/auth.js`: registro e inicio de recuperación de contraseña.
- `css/`: estilos de la aplicación.
- `img/`: imágenes de la página principal.

Los entornos virtuales y logs locales están excluidos mediante `.gitignore`.

## Conectar a Supabase

Supabase usa PostgreSQL. Para crear las tablas y los datos iniciales:

1. Abrir el SQL Editor del proyecto de Supabase.
2. Pegar y ejecutar el contenido de [`supabase_schema.sql`](supabase_schema.sql).
3. Ir a `Project Settings -> Database -> Connection string`.
4. Usar el modo PHP/PDO con una cadena PostgreSQL similar a:

   ```text
   pgsql:host=TU-HOST.supabase.com;port=5432;dbname=postgres;sslmode=require
   ```

5. Configurar las variables de entorno sin guardar secretos en el repositorio:

   ```powershell
   $env:DB_DSN = "pgsql:host=TU-HOST.supabase.com;port=5432;dbname=postgres;sslmode=require"
   $env:DB_USER = "postgres"
   $env:DB_PASSWORD = "TU-CONTRASEÑA"
   php -S localhost:8000
   ```

6. Reiniciar el servidor PHP después de cambiar las variables.

No publiques la contraseña de la base de datos ni las claves `service_role` o
`secret`. Para el despliegue en hosting, configura esas variables en el panel
del proveedor.
