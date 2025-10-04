import { Sequelize } from 'sequelize';

// Configuración de Sequelize
const sequelize = new Sequelize(
  process.env.POSTGRES_DB || 'hotel_manager',
  process.env.POSTGRES_USER || 'postgres',
  process.env.POSTGRES_PASSWORD || 'postgres',
  {
    host: process.env.POSTGRES_HOST || 'db',
    dialect: 'postgres',
    logging: false, // Cambiar a console.log para debug
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    define: {
      timestamps: false, // Usaremos created_at manualmente
      underscored: true, // Convertir camelCase a snake_case
      freezeTableName: true // No pluralizar nombres de tablas
    }
  }
);

// Test de conexión
sequelize.authenticate()
  .then(() => console.log('✅ Sequelize conectado a PostgreSQL'))
  .catch(err => console.error('❌ Error conectando Sequelize:', err));

export default sequelize;
