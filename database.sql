CREATE DATABASE IF NOT EXISTS netservice_pro
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE netservice_pro;

CREATE TABLE IF NOT EXISTS usuarios (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  rol ENUM('cliente', 'empleado', 'admin') NOT NULL DEFAULT 'cliente',
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS tecnicos (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL,
  especialidad VARCHAR(120) NOT NULL,
  usuario_id INT UNSIGNED NULL UNIQUE,
  CONSTRAINT fk_tecnicos_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS equipos (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(160) NOT NULL,
  tipo VARCHAR(60) NOT NULL,
  marca VARCHAR(80) NOT NULL DEFAULT '',
  modelo VARCHAR(100) NOT NULL DEFAULT '',
  ubicacion VARCHAR(160) NOT NULL DEFAULT '',
  serie VARCHAR(100) NOT NULL DEFAULT '',
  estado ENUM('Operativo', 'En mantenimiento', 'Disponible', 'Dañado')
    NOT NULL DEFAULT 'Disponible',
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS citas (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(30) NOT NULL UNIQUE,
  cliente_id INT UNSIGNED NOT NULL,
  equipo_id INT UNSIGNED NOT NULL,
  tipo VARCHAR(60) NOT NULL,
  fecha DATE NOT NULL,
  hora TIME NOT NULL,
  tecnico_id INT UNSIGNED NULL,
  estado ENUM('Pendiente', 'Programada', 'En progreso', 'Completada')
    NOT NULL DEFAULT 'Pendiente',
  resuelto TINYINT(1) NULL DEFAULT NULL,
  descripcion TEXT NOT NULL,
  empleado_id INT UNSIGNED NULL,
  creada_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_citas_cliente
    FOREIGN KEY (cliente_id) REFERENCES usuarios(id),
  CONSTRAINT fk_citas_equipo
    FOREIGN KEY (equipo_id) REFERENCES equipos(id),
  CONSTRAINT fk_citas_tecnico
    FOREIGN KEY (tecnico_id) REFERENCES tecnicos(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_citas_empleado
    FOREIGN KEY (empleado_id) REFERENCES usuarios(id)
    ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS reportes (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  cita_id INT UNSIGNED NOT NULL UNIQUE,
  empleado_id INT UNSIGNED NOT NULL,
  materiales TEXT NOT NULL,
  gasto DECIMAL(10, 2) NOT NULL DEFAULT 0,
  horas DECIMAL(5, 2) NOT NULL DEFAULT 0,
  detalle TEXT NOT NULL,
  resuelto ENUM('Sí', 'No') NOT NULL,
  fecha DATE NOT NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_reportes_cita
    FOREIGN KEY (cita_id) REFERENCES citas(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_reportes_empleado
    FOREIGN KEY (empleado_id) REFERENCES usuarios(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS perfiles_empleado (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT UNSIGNED NOT NULL UNIQUE,
  cargo VARCHAR(120) NOT NULL DEFAULT 'Técnico de campo',
  telefono VARCHAR(30) NOT NULL DEFAULT '',
  email VARCHAR(190) NOT NULL DEFAULT '',
  zona VARCHAR(120) NOT NULL DEFAULT '',
  biografia TEXT NOT NULL,
  foto LONGTEXT NULL,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_perfiles_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

INSERT INTO tecnicos (nombre, especialidad)
SELECT 'Andrés Morales', 'Fibra Óptica'
WHERE NOT EXISTS (SELECT 1 FROM tecnicos WHERE nombre = 'Andrés Morales');
INSERT INTO tecnicos (nombre, especialidad)
SELECT 'Diana Castillo', 'Redes LAN/WAN'
WHERE NOT EXISTS (SELECT 1 FROM tecnicos WHERE nombre = 'Diana Castillo');
INSERT INTO tecnicos (nombre, especialidad)
SELECT 'Sandra Vega', 'Seguridad de Redes'
WHERE NOT EXISTS (SELECT 1 FROM tecnicos WHERE nombre = 'Sandra Vega');
INSERT INTO tecnicos (nombre, especialidad)
SELECT 'Jorge Patiño', 'Cableado Estructurado'
WHERE NOT EXISTS (SELECT 1 FROM tecnicos WHERE nombre = 'Jorge Patiño');
INSERT INTO tecnicos (nombre, especialidad)
SELECT 'Felipe Ríos', 'Configuración de Routers'
WHERE NOT EXISTS (SELECT 1 FROM tecnicos WHERE nombre = 'Felipe Ríos');

INSERT INTO equipos
  (nombre, tipo, marca, modelo, ubicacion, serie, estado)
SELECT 'Router TP-Link AX3000', 'Router', 'TP-Link', 'Archer AX55',
       'Rack Principal - Piso 1', 'TL-2024-001', 'Operativo'
WHERE NOT EXISTS (SELECT 1 FROM equipos WHERE serie = 'TL-2024-001');
INSERT INTO equipos
  (nombre, tipo, marca, modelo, ubicacion, serie, estado)
SELECT 'Modem Fibra ONT', 'Modem', 'Huawei', 'EG8145V5',
       'Sala de Servidores', 'HW-2023-047', 'En mantenimiento'
WHERE NOT EXISTS (SELECT 1 FROM equipos WHERE serie = 'HW-2023-047');
INSERT INTO equipos
  (nombre, tipo, marca, modelo, ubicacion, serie, estado)
SELECT 'Switch Cisco 24 Puertos', 'Switch', 'Cisco', 'SG350-28',
       'Rack Secundario - Piso 2', 'CS-2024-012', 'Operativo'
WHERE NOT EXISTS (SELECT 1 FROM equipos WHERE serie = 'CS-2024-012');
INSERT INTO equipos
  (nombre, tipo, marca, modelo, ubicacion, serie, estado)
SELECT 'Access Point Ubiquiti', 'Access Point', 'Ubiquiti', 'UniFi AP AC Pro',
       'Oficina Central', 'UB-2024-008', 'Operativo'
WHERE NOT EXISTS (SELECT 1 FROM equipos WHERE serie = 'UB-2024-008');
INSERT INTO equipos
  (nombre, tipo, marca, modelo, ubicacion, serie, estado)
SELECT 'UPS APC 1500VA', 'UPS', 'APC', 'BR1500G',
       'Sala de Servidores', 'AP-2022-031', 'Operativo'
WHERE NOT EXISTS (SELECT 1 FROM equipos WHERE serie = 'AP-2022-031');
INSERT INTO equipos
  (nombre, tipo, marca, modelo, ubicacion, serie, estado)
SELECT 'Cable FTP Cat6 - 100m', 'Cable de Red', 'Panduit', 'PUP6004BU-UY',
       'Almacén', 'N/A', 'Disponible'
WHERE NOT EXISTS (SELECT 1 FROM equipos WHERE nombre = 'Cable FTP Cat6 - 100m');
INSERT INTO equipos
  (nombre, tipo, marca, modelo, ubicacion, serie, estado)
SELECT 'Router MikroTik RB4011', 'Router', 'MikroTik', 'RB4011iGS+',
       'Rack Principal - Piso 1', 'MT-2021-019', 'Dañado'
WHERE NOT EXISTS (SELECT 1 FROM equipos WHERE serie = 'MT-2021-019');
INSERT INTO equipos
  (nombre, tipo, marca, modelo, ubicacion, serie, estado)
SELECT 'Switch HP ProCurve 48P', 'Switch', 'HP', '2530-48G',
       'Rack Piso 3', 'HP-2023-055', 'Operativo'
WHERE NOT EXISTS (SELECT 1 FROM equipos WHERE serie = 'HP-2023-055');
