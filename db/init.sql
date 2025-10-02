CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- SCHEMA
CREATE SCHEMA IF NOT EXISTS public;


-- ENUMS (creación segura)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rol_enum') THEN
    CREATE TYPE rol_enum AS ENUM ('admin','recepcionista','huesped');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'rol_enum' AND e.enumlabel = 'gerente'
  ) THEN
    ALTER TYPE rol_enum ADD VALUE IF NOT EXISTS 'gerente';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_habitacion_enum') THEN
    CREATE TYPE tipo_habitacion_enum AS ENUM ('simple','doble','suite');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_habitacion_enum') THEN
    CREATE TYPE estado_habitacion_enum AS ENUM ('disponible','ocupada','limpieza');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_reserva_enum') THEN
    CREATE TYPE estado_reserva_enum AS ENUM ('pendiente','confirmada','cancelada');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'metodo_pago_enum') THEN
    CREATE TYPE metodo_pago_enum AS ENUM ('tarjeta','efectivo','transferencia');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_pago_enum') THEN
    CREATE TYPE estado_pago_enum AS ENUM ('pagado','pendiente');
  END IF;
END$$;


-- -------------------------
-- TABLAS PRINCIPALES
-- -------------------------
CREATE TABLE IF NOT EXISTS tenant (
  tenant_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre VARCHAR(80) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS usuario (
  usuario_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(200) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  nombre VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tenant_usuario (
  tenant_id UUID REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES usuario(usuario_id) ON DELETE CASCADE,
  rol rol_enum NOT NULL,
  PRIMARY KEY (tenant_id, usuario_id)
);

CREATE TABLE IF NOT EXISTS hotel (
  hotel_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  nombre VARCHAR(80),
  direccion VARCHAR(140),
  telefono VARCHAR(12),
  email VARCHAR(200),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sucursal (
  sucursal_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  hotel_id UUID REFERENCES hotel(hotel_id) ON DELETE CASCADE,
  nombre VARCHAR(80),
  direccion VARCHAR(140),
  telefono VARCHAR(12),
  email VARCHAR(200),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recepcionista_sucursal (
  recepcionista_sucursal_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  hotel_id UUID REFERENCES hotel(hotel_id) ON DELETE CASCADE,
  sucursal_id UUID REFERENCES sucursal(sucursal_id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES usuario(usuario_id) ON DELETE CASCADE,
  telefono VARCHAR(20),
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS habitacion (
  habitacion_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  hotel_id UUID REFERENCES hotel(hotel_id) ON DELETE CASCADE,
  numero INT,
  tipo tipo_habitacion_enum,
  precio_noche INT,
  estado estado_habitacion_enum DEFAULT 'disponible'
);

CREATE TABLE IF NOT EXISTS huesped (
  huesped_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  nombre_completo VARCHAR(255),
  email VARCHAR(200),
  telefono VARCHAR(12),
  documento TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reserva (
  reserva_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  habitacion_id UUID REFERENCES habitacion(habitacion_id) ON DELETE CASCADE,
  huesped_id UUID REFERENCES huesped(huesped_id) ON DELETE CASCADE,
  fecha_inicio DATE,
  fecha_fin DATE,
  estado estado_reserva_enum DEFAULT 'pendiente',
  total INT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pago (
  pago_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  reserva_id UUID REFERENCES reserva(reserva_id) ON DELETE CASCADE,
  monto INT,
  metodo metodo_pago_enum,
  fecha TIMESTAMP DEFAULT NOW(),
  estado estado_pago_enum DEFAULT 'pendiente'
);

CREATE TABLE IF NOT EXISTS detalle_pago (
  detalle_pago_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pago_id UUID UNIQUE REFERENCES pago(pago_id) ON DELETE CASCADE,
  descripcion TEXT,
  fecha_pago TIMESTAMP,
  hora_confirmacion TIMESTAMP,
  referencia_transaccion VARCHAR(255),
  comprobante_url VARCHAR(255)
);


-- -------------------------
-- ÍNDICES (consultas frecuentes / FKs)
-- -------------------------
CREATE INDEX IF NOT EXISTS idx_usuario_email ON usuario(email);
CREATE INDEX IF NOT EXISTS idx_tenant_usuario_tenant ON tenant_usuario(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_usuario_usuario ON tenant_usuario(usuario_id);

CREATE INDEX IF NOT EXISTS idx_hotel_tenant ON hotel(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hotel_nombre ON hotel(nombre);

CREATE INDEX IF NOT EXISTS idx_sucursal_tenant ON sucursal(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sucursal_hotel ON sucursal(hotel_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_recepcionista_sucursal_unique
  ON recepcionista_sucursal(sucursal_id, usuario_id);
CREATE INDEX IF NOT EXISTS idx_recepcionista_sucursal_usuario
  ON recepcionista_sucursal(usuario_id);
CREATE INDEX IF NOT EXISTS idx_recepcionista_sucursal_tenant
  ON recepcionista_sucursal(tenant_id);

CREATE INDEX IF NOT EXISTS idx_habitacion_tenant ON habitacion(tenant_id);
CREATE INDEX IF NOT EXISTS idx_habitacion_hotel ON habitacion(hotel_id);
CREATE INDEX IF NOT EXISTS idx_habitacion_numero ON habitacion(numero);

CREATE INDEX IF NOT EXISTS idx_huesped_tenant ON huesped(tenant_id);
CREATE INDEX IF NOT EXISTS idx_huesped_email ON huesped(email);

CREATE INDEX IF NOT EXISTS idx_reserva_tenant ON reserva(tenant_id);
CREATE INDEX IF NOT EXISTS idx_reserva_habitacion ON reserva(habitacion_id);
CREATE INDEX IF NOT EXISTS idx_reserva_huesped ON reserva(huesped_id);

CREATE INDEX IF NOT EXISTS idx_pago_tenant ON pago(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pago_reserva ON pago(reserva_id);


-- Hotel
ALTER TABLE hotel ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='hotel' AND policyname='tenant_isolation_hotel'
  ) THEN
    CREATE POLICY tenant_isolation_hotel
      ON hotel
      USING (tenant_id = current_setting('app.current_tenant')::uuid);
  END IF;
END$$;

-- Sucursal
ALTER TABLE sucursal ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='sucursal' AND policyname='tenant_isolation_sucursal'
  ) THEN
    CREATE POLICY tenant_isolation_sucursal
      ON sucursal
      USING (tenant_id = current_setting('app.current_tenant')::uuid);
  END IF;
END$$;

-- Recepcionista por sucursal
ALTER TABLE recepcionista_sucursal ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='recepcionista_sucursal' AND policyname='tenant_isolation_recepcionista_sucursal'
  ) THEN
    CREATE POLICY tenant_isolation_recepcionista_sucursal
      ON recepcionista_sucursal
      USING (tenant_id = current_setting('app.current_tenant')::uuid);
  END IF;
END$$;

-- Habitacion
ALTER TABLE habitacion ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='habitacion' AND policyname='tenant_isolation_habitacion'
  ) THEN
    CREATE POLICY tenant_isolation_habitacion
      ON habitacion
      USING (tenant_id = current_setting('app.current_tenant')::uuid);
  END IF;
END$$;

-- Huesped
ALTER TABLE huesped ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='huesped' AND policyname='tenant_isolation_huesped'
  ) THEN
    CREATE POLICY tenant_isolation_huesped
      ON huesped
      USING (tenant_id = current_setting('app.current_tenant')::uuid);
  END IF;
END$$;

-- Reserva
ALTER TABLE reserva ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='reserva' AND policyname='tenant_isolation_reserva'
  ) THEN
    CREATE POLICY tenant_isolation_reserva
      ON reserva
      USING (tenant_id = current_setting('app.current_tenant')::uuid);
  END IF;
END$$;

-- Pago
ALTER TABLE pago ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='pago' AND policyname='tenant_isolation_pago'
  ) THEN
    CREATE POLICY tenant_isolation_pago
      ON pago
      USING (tenant_id = current_setting('app.current_tenant')::uuid);
  END IF;
END$$;

-- Detalle_pago (aislamiento por relación con pago)
ALTER TABLE detalle_pago ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='detalle_pago' AND policyname='tenant_isolation_detalle_pago'
  ) THEN
    CREATE POLICY tenant_isolation_detalle_pago
      ON detalle_pago
      USING (
        pago_id IN (
          SELECT pago_id FROM pago WHERE tenant_id = current_setting('app.current_tenant')::uuid
        )
      );
  END IF;
END$$;


-- -------------------------
-- AUDITORÍA: tabla + funciones + triggers
-- -------------------------
CREATE TABLE IF NOT EXISTS audit_log (
  audit_id BIGSERIAL PRIMARY KEY,
  table_name TEXT,
  action TEXT,
  record_id UUID,
  changed_at TIMESTAMP DEFAULT now(),
  changed_by TEXT DEFAULT current_user,
  extra JSONB
);

-- Función para log reserva
CREATE OR REPLACE FUNCTION log_reserva_changes()
RETURNS TRIGGER AS $$
DECLARE
  rec_id uuid;
  payload jsonb;
BEGIN
  IF TG_OP = 'DELETE' THEN
    rec_id := OLD.reserva_id;
    payload := to_jsonb(OLD);
  ELSE
    rec_id := NEW.reserva_id;
    payload := to_jsonb(NEW);
  END IF;

  INSERT INTO audit_log(table_name, action, record_id, extra)
  VALUES ('reserva', TG_OP, rec_id, payload);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función para log pago
CREATE OR REPLACE FUNCTION log_pago_changes()
RETURNS TRIGGER AS $$
DECLARE
  rec_id uuid;
  payload jsonb;
BEGIN
  IF TG_OP = 'DELETE' THEN
    rec_id := OLD.pago_id;
    payload := to_jsonb(OLD);
  ELSE
    rec_id := NEW.pago_id;
    payload := to_jsonb(NEW);
  END IF;

  INSERT INTO audit_log(table_name, action, record_id, extra)
  VALUES ('pago', TG_OP, rec_id, payload);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear triggers
DROP TRIGGER IF EXISTS reserva_audit ON reserva;
CREATE TRIGGER reserva_audit
AFTER INSERT OR UPDATE OR DELETE ON reserva
FOR EACH ROW EXECUTE FUNCTION log_reserva_changes();

DROP TRIGGER IF EXISTS pago_audit ON pago;
CREATE TRIGGER pago_audit
AFTER INSERT OR UPDATE OR DELETE ON pago
FOR EACH ROW EXECUTE FUNCTION log_pago_changes();
