<?php
declare(strict_types=1);

session_set_cookie_params(['httponly' => true, 'samesite' => 'Lax']);
session_start();
header('Content-Type: application/json; charset=utf-8');
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, ['http://localhost:8080', 'http://127.0.0.1:8080'], true)) {
    header("Access-Control-Allow-Origin: $origin");
}
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Headers: Content-Type, X-User-Id');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$dbDsn = getenv('DB_DSN');
$dbUser = getenv('DB_USER');
$dbPassword = getenv('DB_PASSWORD');
if ($dbDsn === false) {
    $dbDsn = 'mysql:host=localhost;port=3306;dbname=netservice_pro;charset=utf8mb4';
    $dbUser = 'root';
    $dbPassword = '';
}
$db = new PDO(
    $dbDsn,
    $dbUser,
    $dbPassword,
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]
);

function body(): array {
    $raw = file_get_contents('php://input');
    $raw = preg_replace('/^\xEF\xBB\xBF/', '', $raw);
    $decoded = json_decode($raw ?: '', true);
    return is_array($decoded) ? $decoded : [];
}

function requiredStrings(array $input, array $fields): void {
    foreach ($fields as $field) {
        if (!isset($input[$field]) || !is_string($input[$field]) || trim($input[$field]) === '') {
            respond(['error' => 'Faltan datos requeridos'], 422);
        }
    }
}

function respond($data, int $status = 200): never {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function currentUser(PDO $db): ?array {
    if (empty($_SESSION['user_id'])) return null;
    $stmt = $db->prepare('SELECT id, nombre, email, rol FROM usuarios WHERE id = ?');
    $stmt->execute([(int) $_SESSION['user_id']]);
    return $stmt->fetch() ?: null;
}

function userId(PDO $db): ?int {
    $user = currentUser($db);
    return $user ? (int) $user['id'] : null;
}

function requireUser(PDO $db): array {
    $user = currentUser($db);
    if (!$user) respond(['error' => 'Sesión requerida'], 401);
    return $user;
}

function requireRole(PDO $db, array $roles): array {
    $user = requireUser($db);
    if (!in_array($user['rol'], $roles, true)) respond(['error' => 'No tienes permiso para esta acción'], 403);
    return $user;
}

function technicians(PDO $db): array {
    return array_map(fn($t) => ['n' => $t['nombre'], 'e' => $t['especialidad']], $db->query(
        'SELECT nombre, especialidad FROM tecnicos ORDER BY id'
    )->fetchAll());
}

function equipment(PDO $db): array {
    return $db->query(
        'SELECT id, nombre, tipo, marca, modelo, ubicacion, serie, estado FROM equipos ORDER BY id'
    )->fetchAll();
}

function appointments(PDO $db): array {
    $user = currentUser($db);
    if (!$user) respond(['error' => 'Sesión requerida'], 401);
    $where = $user['rol'] === 'cliente' ? ' WHERE c.cliente_id = ' . (int) $user['id'] : '';
    $horaSql = $db->getAttribute(PDO::ATTR_DRIVER_NAME) === 'pgsql'
        ? 'to_char(c.hora, \'HH24:MI\')'
        : 'TIME_FORMAT(c.hora, "%H:%i")';
    $sql = 'SELECT c.id, c.codigo, c.tipo, c.fecha, ' . $horaSql . ' hora,
                   c.estado, c.resuelto, c.descripcion descripcion_texto, c.cliente_id, c.creada_en,
                   cli.nombre cliente, e.nombre equipo, t.nombre tecnico,
                   emp.nombre empleado,
                   c.empleado_id, r.materiales, r.gasto, r.horas, r.detalle,
                   r.resuelto reporte_resuelto, r.fecha reporte_fecha,
                   emp.nombre reporte_empleado
            FROM citas c
            JOIN usuarios cli ON cli.id = c.cliente_id
            JOIN equipos e ON e.id = c.equipo_id
            LEFT JOIN tecnicos t ON t.id = c.tecnico_id
            LEFT JOIN usuarios emp ON emp.id = c.empleado_id
            LEFT JOIN reportes r ON r.cita_id = c.id' . $where . '
            ORDER BY c.fecha, c.hora, c.id';
    $rows = $db->query($sql)->fetchAll();
    return array_map(function ($c) use ($db) {
        $c['id'] = $c['codigo'];
        $c['desc'] = $c['descripcion_texto'];
        $c['creada'] = isset($c['creada_en']) ? substr($c['creada_en'], 0, 10) : null;
        $c['u'] = userId($db) !== null && (int) $c['cliente_id'] === userId($db);
        $c['resuelto'] = $c['resuelto'] === null ? null :
            (is_bool($c['resuelto']) ? $c['resuelto'] : in_array(strtolower((string) $c['resuelto']), ['1', 't', 'true', 'sí'], true));
        if ($c['reporte_fecha'] !== null) {
            $c['reporte'] = [
                'materiales' => $c['materiales'], 'gasto' => (float) $c['gasto'],
                'horas' => (float) $c['horas'], 'detalle' => $c['detalle'],
                'resuelto' => $c['reporte_resuelto'], 'empleado' => $c['reporte_empleado'],
                'fecha' => $c['reporte_fecha']
            ];
        }
        unset($c['codigo'], $c['cliente_id'], $c['empleado_id'], $c['descripcion_texto'], $c['creada_en'], $c['materiales'], $c['gasto'],
            $c['horas'], $c['detalle'], $c['reporte_resuelto'], $c['reporte_fecha'], $c['reporte_empleado']);
        return $c;
    }, $rows);
}

function currentProfile(PDO $db): array {
    $id = userId($db);
    if (!$id) respond(['error' => 'Sesión requerida'], 401);
    $stmt = $db->prepare('SELECT u.nombre, u.email, p.cargo, p.telefono tel, p.zona, p.biografia bio, p.foto
                          FROM usuarios u LEFT JOIN perfiles_empleado p ON p.usuario_id = u.id WHERE u.id = ?');
    $stmt->execute([$id]);
    $profile = $stmt->fetch();
    return $profile ?: [];
}

function findTechnician(PDO $db, ?string $name): ?int {
    if (!$name) return null;
    $stmt = $db->prepare('SELECT id FROM tecnicos WHERE nombre = ?');
    $stmt->execute([$name]);
    return ($id = $stmt->fetchColumn()) ? (int) $id : null;
}

function findEquipment(PDO $db, string $name): int {
    $stmt = $db->prepare('SELECT id FROM equipos WHERE nombre = ?');
    $stmt->execute([$name]);
    $id = $stmt->fetchColumn();
    if (!$id) respond(['error' => 'Equipo no encontrado'], 422);
    return (int) $id;
}

function findClient(PDO $db, string $name, int $fallback): int {
    $stmt = $db->prepare("SELECT id FROM usuarios WHERE nombre = ? AND rol = 'cliente' LIMIT 1");
    $stmt->execute([$name]);
    return (int) ($stmt->fetchColumn() ?: $fallback);
}

function appointmentCode(PDO $db): string {
    $year = date('Y');
    $stmt = $db->prepare('SELECT COUNT(*) + 1 FROM citas WHERE codigo LIKE ?');
    $stmt->execute(["MT-$year-%"]);
    return sprintf('MT-%s-%03d', $year, (int) $stmt->fetchColumn());
}

$input = body();
$action = $_GET['action'] ?? $input['action'] ?? '';

try {
    switch ($action) {
        case 'bootstrap':
            requireUser($db);
            respond(['tecnicos' => technicians($db), 'equipos' => equipment($db), 'citas' => appointments($db)]);
        case 'profile':
            if ($_SERVER['REQUEST_METHOD'] === 'GET') respond(currentProfile($db));
            $id = userId($db);
            if (!$id) respond(['error' => 'Sesión requerida'], 401);
            $profileSql = $db->getAttribute(PDO::ATTR_DRIVER_NAME) === 'pgsql'
                ? 'INSERT INTO perfiles_empleado (usuario_id,cargo,telefono,email,zona,biografia,foto)
                   VALUES (?,?,?,?,?,?,?) ON CONFLICT (usuario_id) DO UPDATE SET
                   cargo=EXCLUDED.cargo, telefono=EXCLUDED.telefono, email=EXCLUDED.email,
                   zona=EXCLUDED.zona, biografia=EXCLUDED.biografia, foto=EXCLUDED.foto'
                : 'INSERT INTO perfiles_empleado (usuario_id,cargo,telefono,email,zona,biografia,foto)
                   VALUES (?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE cargo=VALUES(cargo), telefono=VALUES(telefono),
                   email=VALUES(email), zona=VALUES(zona), biografia=VALUES(biografia), foto=VALUES(foto)';
            $stmt = $db->prepare($profileSql);
            $stmt->execute([$id, $input['cargo'] ?? '', $input['tel'] ?? '', $input['email'] ?? '',
                $input['zona'] ?? '', $input['bio'] ?? '', $input['foto'] ?? null]);
            respond(['ok' => true]);
        case 'equipment_create':
            requireRole($db, ['admin']);
            $equipmentInsert = $db->getAttribute(PDO::ATTR_DRIVER_NAME) === 'pgsql'
                ? 'INSERT INTO equipos (nombre,tipo,marca,modelo,ubicacion,serie,estado) VALUES (?,?,?,?,?,?,?) RETURNING id'
                : 'INSERT INTO equipos (nombre,tipo,marca,modelo,ubicacion,serie,estado) VALUES (?,?,?,?,?,?,?)';
            $stmt = $db->prepare($equipmentInsert);
            $stmt->execute([$input['nombre'], $input['tipo'], $input['marca'] ?? '', $input['modelo'] ?? '',
                $input['ubicacion'] ?? '', $input['serie'] ?? '', $input['estado']]);
            $newId = $db->getAttribute(PDO::ATTR_DRIVER_NAME) === 'pgsql'
                ? (int) $stmt->fetchColumn()
                : (int) $db->lastInsertId();
            respond(['ok' => true, 'id' => $newId]);
        case 'equipment_update':
            requireRole($db, ['admin']);
            $stmt = $db->prepare('UPDATE equipos SET nombre=?,tipo=?,marca=?,modelo=?,ubicacion=?,serie=?,estado=? WHERE id=?');
            $stmt->execute([$input['nombre'], $input['tipo'], $input['marca'] ?? '', $input['modelo'] ?? '',
                $input['ubicacion'] ?? '', $input['serie'] ?? '', $input['estado'], (int) $input['id']]);
            respond(['ok' => $stmt->rowCount() >= 0]);
        case 'equipment_delete':
            requireRole($db, ['admin']);
            $stmt = $db->prepare('DELETE FROM equipos WHERE id = ?');
            try {
                $stmt->execute([(int) $input['id']]);
            } catch (PDOException $e) {
                if ((int) $e->errorInfo[1] === 1451 || $e->getCode() === '23503') {
                    respond(['error' => 'No se puede eliminar un equipo con citas asociadas'], 409);
                }
                throw $e;
            }
            respond(['ok' => true]);
        case 'appointment_create':
            $user = requireRole($db, ['admin', 'cliente']);
            requiredStrings($input, ['equipo', 'tipo', 'fecha', 'hora']);
            $clientId = $user['rol'] === 'cliente'
                ? (int) $user['id']
                : findClient($db, $input['cliente'] ?? '', (int) $user['id']);
            $stmt = $db->prepare('INSERT INTO citas
                (codigo,cliente_id,equipo_id,tipo,fecha,hora,tecnico_id,estado,resuelto,descripcion)
                VALUES (?,?,?,?,?,?,?,?,?,?)');
            $stmt->execute([appointmentCode($db), $clientId, findEquipment($db, $input['equipo']),
                $input['tipo'], $input['fecha'], $input['hora'], findTechnician($db, $input['tecnico'] ?? null),
                'Pendiente', null, $input['desc'] ?? '']);
            respond(['ok' => true]);
        case 'appointment_update':
            requireRole($db, ['admin']);
            $fields = [];
            $values = [];
            foreach (['estado', 'resuelto'] as $field) {
                if (array_key_exists($field, $input)) {
                    $fields[] = "$field = ?";
                    $values[] = $input[$field];
                }
            }
            if (!$fields) respond(['error' => 'No hay cambios para guardar'], 422);
            $values[] = $input['id'];
            $stmt = $db->prepare('UPDATE citas SET ' . implode(', ', $fields) . ' WHERE codigo = ?');
            $stmt->execute($values);
            respond(['ok' => true]);
        case 'appointment_claim':
            $user = requireRole($db, ['empleado']);
            $stmt = $db->prepare("UPDATE citas SET empleado_id=?, tecnico_id=(SELECT id FROM tecnicos WHERE usuario_id=?), estado='En progreso'
                                  WHERE codigo=? AND empleado_id IS NULL AND estado IN ('Pendiente','Programada')");
            $stmt->execute([(int) $user['id'], (int) $user['id'], $input['id']]);
            if ($stmt->rowCount() !== 1) respond(['error' => 'La cita ya fue tomada o no está disponible'], 409);
            respond(['ok' => true]);
        case 'report_create':
            $user = requireRole($db, ['empleado']);
            $stmt = $db->prepare("SELECT id FROM citas WHERE codigo=? AND empleado_id=? AND estado='En progreso'");
            $stmt->execute([$input['id'], (int) $user['id']]);
            $appointmentId = $stmt->fetchColumn();
            if (!$appointmentId) respond(['error' => 'La cita no está asignada a este empleado'], 403);
            $reportSql = $db->getAttribute(PDO::ATTR_DRIVER_NAME) === 'pgsql'
                ? 'INSERT INTO reportes
                   (cita_id,empleado_id,materiales,gasto,horas,detalle,resuelto,fecha)
                   VALUES (?,?,?,?,?,?,?,?)
                   ON CONFLICT (cita_id) DO UPDATE SET
                   materiales=EXCLUDED.materiales, gasto=EXCLUDED.gasto, horas=EXCLUDED.horas,
                   detalle=EXCLUDED.detalle, resuelto=EXCLUDED.resuelto, fecha=EXCLUDED.fecha'
                : 'INSERT INTO reportes
                   (cita_id,empleado_id,materiales,gasto,horas,detalle,resuelto,fecha)
                   SELECT ?,?,?,?,?,?,?,? FROM DUAL
                   ON DUPLICATE KEY UPDATE materiales=VALUES(materiales),gasto=VALUES(gasto),
                   horas=VALUES(horas),detalle=VALUES(detalle),resuelto=VALUES(resuelto),fecha=VALUES(fecha)';
            $stmt = $db->prepare($reportSql);
            $stmt->execute([(int) $appointmentId, (int) $user['id'], $input['materiales'],
                (float) $input['gasto'], (float) $input['horas'], $input['detalle'],
                $input['resuelto'], date('Y-m-d')]);
            $stmt = $db->prepare('UPDATE citas SET estado="Completada", resuelto=? WHERE id=?');
            $stmt->execute([$input['resuelto'] === 'Sí' ? 1 : 0, (int) $appointmentId]);
            respond(['ok' => true]);
        case 'register':
            requiredStrings($input, ['nombre', 'email', 'pass', 'rol']);
            if ($input['rol'] !== 'cliente') respond(['error' => 'Solo se pueden registrar cuentas de cliente'], 403);
            $stmt = $db->prepare('INSERT INTO usuarios (nombre,email,password_hash,rol) VALUES (?,?,?,?)');
            try {
                $stmt->execute([$input['nombre'], $input['email'], password_hash($input['pass'], PASSWORD_DEFAULT), $input['rol']]);
            } catch (PDOException $e) {
                if ((int) $e->errorInfo[1] === 1062 || $e->getCode() === '23505') {
                    respond(['error' => 'Ese correo ya está registrado'], 409);
                }
                throw $e;
            }
            respond(['ok' => true]);
        case 'login':
            if (empty($input['email']) || empty($input['pass'])) respond(['error' => 'Correo y contraseña requeridos'], 422);
            $stmt = $db->prepare('SELECT id,nombre,email,rol,password_hash FROM usuarios WHERE email = ?');
            $stmt->execute([$input['email']]);
            $user = $stmt->fetch();
            if (!$user || !password_verify($input['pass'], $user['password_hash'])) respond(['error' => 'Correo o contraseña incorrectos'], 401);
            unset($user['password_hash']);
            session_regenerate_id(true);
            $_SESSION['user_id'] = (int) $user['id'];
            respond($user);
        case 'logout':
            $_SESSION = [];
            session_destroy();
            respond(['ok' => true]);
        case 'reset_request':
            $stmt = $db->prepare('SELECT id FROM usuarios WHERE email = ?');
            $stmt->execute([$input['email'] ?? '']);
            $id = $stmt->fetchColumn();
            $code = null;
            if ($id) {
                $_SESSION['reset_user_id'] = (int) $id;
                $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
                $_SESSION['reset_code'] = $code;
            }
            respond(['ok' => true, 'code' => $code]);
        case 'reset_verify':
            if (empty($_SESSION['reset_user_id']) || empty($_SESSION['reset_code']) ||
                !hash_equals($_SESSION['reset_code'], $input['code'] ?? '')) {
                respond(['error' => 'Código incorrecto'], 400);
            }
            $_SESSION['reset_verified'] = true;
            respond(['ok' => true]);
        case 'reset_complete':
            if (empty($_SESSION['reset_verified']) || empty($_SESSION['reset_user_id']) || empty($input['pass'])) {
                respond(['error' => 'Verificación requerida'], 403);
            }
            $stmt = $db->prepare('UPDATE usuarios SET password_hash=? WHERE id=?');
            $stmt->execute([password_hash($input['pass'], PASSWORD_DEFAULT), (int) $_SESSION['reset_user_id']]);
            unset($_SESSION['reset_user_id'], $_SESSION['reset_code'], $_SESSION['reset_verified']);
            respond(['ok' => true]);
        default:
            respond(['error' => 'Acción no válida'], 400);
    }
} catch (PDOException $e) {
    respond(['error' => 'Error de base de datos'], 500);
}
