import pg from "pg";

export const pool = new pg.Pool({
  user: process.env.POSTGRES_USER || "postgres",
  host: "db",
  database: process.env.POSTGRES_DB || "hotel_manager",
  password: process.env.POSTGRES_PASSWORD || "postgres",
  port: 5432,
});