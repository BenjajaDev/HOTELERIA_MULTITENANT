#!/bin/bash

# Variables
CONTAINER_NAME="hotel_db"   # Nombre de tu contenedor
DB_USER="postgres"
DB_NAME="hotel_manager"
OUTPUT_FILE="resultados_consultas_postgreSQL.csv"

# Ejecutar SQL y guardar salida como CSV
docker exec -i $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME -v ON_ERROR_STOP=1 --csv <<'EOF' > $OUTPUT_FILE

-- 1) Columnas por tabla (tipo, nullability, default)
\echo 'section,table_schema,table_name,column_name,data_type,is_nullable,column_default'
select
  'Columnas' as section,
  c.table_schema,
  c.table_name,
  c.column_name,
  c.data_type,
  c.is_nullable,
  coalesce(c.column_default, '') as column_default
from information_schema.columns c
where c.table_schema = 'public'
order by c.table_name, c.ordinal_position;

-- 2) Primary Keys
\echo 'section,table_name,column_name'
select
  'PrimaryKey' as section,
  tc.table_name,
  kcu.column_name
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  using (constraint_name, table_schema)
where tc.table_schema = 'public'
  and tc.constraint_type = 'PRIMARY KEY'
order by tc.table_name, kcu.ordinal_position;

-- 3) Foreign Keys
\echo 'section,table_name,column_name,foreign_table,foreign_column'
select
  'ForeignKey' as section,
  tc.table_name,
  kcu.column_name,
  ccu.table_name as foreign_table,
  ccu.column_name as foreign_column
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  using (constraint_name, table_schema)
join information_schema.constraint_column_usage ccu
  using (constraint_name, table_schema)
where tc.table_schema = 'public'
  and tc.constraint_type = 'FOREIGN KEY'
order by tc.table_name, kcu.column_name;

-- 4) Indexes
\echo 'section,table_schema,tablename,indexname,indexdef'
select
  'Index' as section,
  schemaname as table_schema,
  tablename,
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
order by tablename, indexname;

-- 5) RLS policies
\echo 'section,policyname,tablename,permissive,roles,cmd,qual,with_check'
select
  'RLS' as section,
  policyname,
  tablename,
  permissive,
  roles,
  cmd,
  coalesce(qual, '') as qual,
  coalesce(with_check, '') as with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

-- 6) Enums
\echo 'section,schema,enum_name,value'
select
  'Enum' as section,
  n.nspname as schema,
  t.typname as enum_name,
  e.enumlabel as value
from pg_type t
join pg_enum e on t.oid = e.enumtypid
join pg_namespace n on n.oid = t.typnamespace
where n.nspname = 'public'
order by enum_name, e.enumsortorder;

-- 7) Funciones/RPC
\echo 'section,function_name,definition'
select
  'Function' as section,
  p.proname as function_name,
  regexp_replace(pg_get_functiondef(p.oid), E'[\\n\\r]+', ' ', 'g') as definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
order by p.proname;

EOF

echo "✅ Exportación completa en formato CSV: $OUTPUT_FILE"
