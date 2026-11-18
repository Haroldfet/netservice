CREATE TABLE IF NOT EXISTS public.usuarios (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  rol VARCHAR(20) NOT NULL CHECK (rol IN ('cliente', 'empleado', 'admin')),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tecnicos (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL,
  especialidad VARCHAR(120) NOT NULL,
  usuario_id BIGINT UNIQUE REFERENCES public.usuarios(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.equipos (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre VARCHAR(160) NOT NULL,
  tipo VARCHAR(60) NOT NULL,
  marca VARCHAR(80) NOT NULL DEFAULT '',
  modelo VARCHAR(100) NOT NULL DEFAULT '',
  ubicacion VARCHAR(160) NOT NULL DEFAULT '',
  serie VARCHAR(100) NOT NULL DEFAULT '',
  estado VARCHAR(30) NOT NULL CHECK (estado IN ('Operativo', 'En mantenimiento', 'Disponible', 'Dañado')),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.citas (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  codigo VARCHAR(30) NOT NULL UNIQUE,
  cliente_id BIGINT NOT NULL REFERENCES public.usuarios(id),
  equipo_id BIGINT NOT NULL REFERENCES public.equipos(id),
  tipo VARCHAR(60) NOT NULL,
  fecha DATE NOT NULL,
  hora TIME NOT NULL,
  tecnico_id BIGINT REFERENCES public.tecnicos(id) ON DELETE SET NULL,
  estado VARCHAR(30) NOT NULL CHECK (estado IN ('Pendiente', 'Programada', 'En progreso', 'Completada')),
  resuelto BOOLEAN,
  descripcion TEXT NOT NULL,
  empleado_id BIGINT REFERENCES public.usuarios(id) ON DELETE SET NULL,
  creada_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reportes (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cita_id BIGINT NOT NULL UNIQUE REFERENCES public.citas(id) ON DELETE CASCADE,
  empleado_id BIGINT NOT NULL REFERENCES public.usuarios(id),
  materiales TEXT NOT NULL,
  gasto NUMERIC(10, 2) NOT NULL DEFAULT 0,
  horas NUMERIC(5, 2) NOT NULL DEFAULT 0,
  detalle TEXT NOT NULL,
  resuelto VARCHAR(2) NOT NULL CHECK (resuelto IN ('Sí', 'No')),
  fecha DATE NOT NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.perfiles_empleado (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  usuario_id BIGINT NOT NULL UNIQUE REFERENCES public.usuarios(id) ON DELETE CASCADE,
  cargo VARCHAR(120) NOT NULL DEFAULT 'Técnico de campo',
  telefono VARCHAR(30) NOT NULL DEFAULT '',
  email VARCHAR(190) NOT NULL DEFAULT '',
  zona VARCHAR(120) NOT NULL DEFAULT '',
  biografia TEXT NOT NULL DEFAULT '',
  foto TEXT,
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.tecnicos (nombre, especialidad)
SELECT 'Andrés Morales', 'Fibra Óptica'
WHERE NOT EXISTS (SELECT 1 FROM public.tecnicos WHERE nombre = 'Andrés Morales');
INSERT INTO public.tecnicos (nombre, especialidad)
SELECT 'Diana Castillo', 'Redes LAN/WAN'
WHERE NOT EXISTS (SELECT 1 FROM public.tecnicos WHERE nombre = 'Diana Castillo');
INSERT INTO public.tecnicos (nombre, especialidad)
SELECT 'Sandra Vega', 'Seguridad de Redes'
WHERE NOT EXISTS (SELECT 1 FROM public.tecnicos WHERE nombre = 'Sandra Vega');
INSERT INTO public.tecnicos (nombre, especialidad)
SELECT 'Jorge Patiño', 'Cableado Estructurado'
WHERE NOT EXISTS (SELECT 1 FROM public.tecnicos WHERE nombre = 'Jorge Patiño');
INSERT INTO public.tecnicos (nombre, especialidad)
SELECT 'Felipe Ríos', 'Configuración de Routers'
WHERE NOT EXISTS (SELECT 1 FROM public.tecnicos WHERE nombre = 'Felipe Ríos');

INSERT INTO public.equipos (nombre, tipo, marca, modelo, ubicacion, serie, estado)
SELECT 'Router TP-Link AX3000', 'Router', 'TP-Link', 'Archer AX55', 'Rack Principal - Piso 1', 'TL-2024-001', 'Operativo'
WHERE NOT EXISTS (SELECT 1 FROM public.equipos WHERE serie = 'TL-2024-001');
INSERT INTO public.equipos (nombre, tipo, marca, modelo, ubicacion, serie, estado)
SELECT 'Modem Fibra ONT', 'Modem', 'Huawei', 'EG8145V5', 'Sala de Servidores', 'HW-2023-047', 'En mantenimiento'
WHERE NOT EXISTS (SELECT 1 FROM public.equipos WHERE serie = 'HW-2023-047');
INSERT INTO public.equipos (nombre, tipo, marca, modelo, ubicacion, serie, estado)
SELECT 'Switch Cisco 24 Puertos', 'Switch', 'Cisco', 'SG350-28', 'Rack Secundario - Piso 2', 'CS-2024-012', 'Operativo'
WHERE NOT EXISTS (SELECT 1 FROM public.equipos WHERE serie = 'CS-2024-012');
INSERT INTO public.equipos (nombre, tipo, marca, modelo, ubicacion, serie, estado)
SELECT 'Access Point Ubiquiti', 'Access Point', 'Ubiquiti', 'UniFi AP AC Pro', 'Oficina Central', 'UB-2024-008', 'Operativo'
WHERE NOT EXISTS (SELECT 1 FROM public.equipos WHERE serie = 'UB-2024-008');
INSERT INTO public.equipos (nombre, tipo, marca, modelo, ubicacion, serie, estado)
SELECT 'UPS APC 1500VA', 'UPS', 'APC', 'BR1500G', 'Sala de Servidores', 'AP-2022-031', 'Operativo'
WHERE NOT EXISTS (SELECT 1 FROM public.equipos WHERE serie = 'AP-2022-031');
INSERT INTO public.equipos (nombre, tipo, marca, modelo, ubicacion, serie, estado)
SELECT 'Cable FTP Cat6 - 100m', 'Cable de Red', 'Panduit', 'PUP6004BU-UY', 'Almacén', 'N/A', 'Disponible'
WHERE NOT EXISTS (SELECT 1 FROM public.equipos WHERE nombre = 'Cable FTP Cat6 - 100m');
INSERT INTO public.equipos (nombre, tipo, marca, modelo, ubicacion, serie, estado)
SELECT 'Router MikroTik RB4011', 'Router', 'MikroTik', 'RB4011iGS+', 'Rack Principal - Piso 1', 'MT-2021-019', 'Dañado'
WHERE NOT EXISTS (SELECT 1 FROM public.equipos WHERE serie = 'MT-2021-019');
INSERT INTO public.equipos (nombre, tipo, marca, modelo, ubicacion, serie, estado)
SELECT 'Switch HP ProCurve 48P', 'Switch', 'HP', '2530-48G', 'Rack Piso 3', 'HP-2023-055', 'Operativo'
WHERE NOT EXISTS (SELECT 1 FROM public.equipos WHERE serie = 'HP-2023-055');
