CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- SCHEMA multi-tenant (cada hotel tendrá su propio schema)
CREATE SCHEMA IF NOT EXISTS public;

-- Tablas base compartidas
CREATE TABLE tenant (
    tenant_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(80) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE usuario (
    usuario_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(200) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nombre VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE tenant_usuario (
    tenant_id UUID REFERENCES tenant(tenant_id),
    usuario_id UUID REFERENCES usuario(usuario_id),
    rol VARCHAR(20) CHECK (rol IN ('admin','recepcionista','huesped')),
    PRIMARY KEY (tenant_id, usuario_id)
);

CREATE TABLE hotel (
    hotel_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenant(tenant_id),
    nombre VARCHAR(80),
    direccion VARCHAR(140),
    telefono VARCHAR(12),
    email VARCHAR(200)
);

-- Nueva tabla sucursal
CREATE TABLE sucursal (
    sucursal_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenant(tenant_id),
    hotel_id UUID REFERENCES hotel(hotel_id),
    nombre VARCHAR(80),
    direccion VARCHAR(140),
    telefono VARCHAR(12),
    email VARCHAR(200)
);

CREATE TABLE habitacion (
    habitacion_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenant(tenant_id),
    hotel_id UUID REFERENCES hotel(hotel_id),
    numero INT,
    tipo VARCHAR(20) CHECK (tipo IN ('simple','doble','suite')),
    precio_noche INT,
    estado VARCHAR(20) CHECK (estado IN ('disponible','ocupada','limpieza'))
);

CREATE TABLE huesped (
    huesped_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenant(tenant_id),
    nombre_completo VARCHAR(255),
    email VARCHAR(200),
    telefono VARCHAR(12),
    documento TEXT
);

CREATE TABLE reserva (
    reserva_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenant(tenant_id),
    habitacion_id UUID REFERENCES habitacion(habitacion_id),
    huesped_id UUID REFERENCES huesped(huesped_id),
    fecha_inicio DATE,
    fecha_fin DATE,
    estado VARCHAR(20) CHECK (estado IN ('pendiente','confirmada','cancelada')),
    total INT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE pago (
    pago_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenant(tenant_id),
    reserva_id UUID REFERENCES reserva(reserva_id),
    monto INT,
    metodo VARCHAR(20) CHECK (metodo IN ('tarjeta','efectivo','transferencia')),
    fecha TIMESTAMP DEFAULT NOW(),
    estado VARCHAR(20) CHECK (estado IN ('pagado','pendiente'))
);

CREATE TABLE detalle_pago (
    detalle_pago_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pago_id UUID UNIQUE REFERENCES pago(pago_id),
    descripcion TEXT,
    fecha_pago TIMESTAMP,
    hora_confirmacion TIMESTAMP,
    referencia_transaccion VARCHAR(255),
    comprobante_url VARCHAR(255)
);