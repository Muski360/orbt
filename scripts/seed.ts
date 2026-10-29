import { seedDatabase } from "../src/lib/seed.ts";
import { closeDatabase } from "../src/lib/db.ts";

try {
  await seedDatabase();
  console.log("Índices e conta inicial preparados. Dados existentes preservados.");
} catch {
  console.error("Não foi possível inicializar o banco. Verifique MONGODB_URI e se o MongoDB está em execução.");
  process.exitCode = 1;
} finally {
  await closeDatabase();
}
