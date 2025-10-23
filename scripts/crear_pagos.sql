-- Script para crear pagos basados en las reservas existentes
-- Cada reserva tendrá un pago con el monto igual al total de la reserva

-- Insertar pagos para reservas confirmadas (estado 'pagado')
INSERT INTO pago (reserva_id, monto, estado, metodo, fecha, tenant_id)
SELECT 
    r.reserva_id,
    r.total as monto,
    'pagado'::estado_pago_enum as estado,
    (CASE 
        WHEN RANDOM() < 0.5 THEN 'tarjeta'
        ELSE 'transferencia'
    END)::metodo_pago_enum as metodo,
    r.fecha_inicio as fecha,
    r.tenant_id
FROM reserva r
WHERE r.estado = 'confirmada' 
AND r.activo = TRUE
AND NOT EXISTS (
    SELECT 1 FROM pago p WHERE p.reserva_id = r.reserva_id
);

-- Insertar pagos para reservas pendientes (estado 'pendiente')
INSERT INTO pago (reserva_id, monto, estado, metodo, fecha, tenant_id)
SELECT 
    r.reserva_id,
    r.total as monto,
    'pendiente'::estado_pago_enum as estado,
    'efectivo'::metodo_pago_enum as metodo,
    r.fecha_inicio as fecha,
    r.tenant_id
FROM reserva r
WHERE r.estado = 'pendiente' 
AND r.activo = TRUE
AND NOT EXISTS (
    SELECT 1 FROM pago p WHERE p.reserva_id = r.reserva_id
);

-- Verificar los pagos creados
SELECT 
    'Total de pagos creados:' as descripcion,
    COUNT(*) as cantidad
FROM pago;

SELECT 
    'Pagos por estado:' as descripcion,
    estado,
    COUNT(*) as cantidad,
    SUM(monto) as total_monto
FROM pago
GROUP BY estado
ORDER BY estado;
