import { execFileSync } from "node:child_process";

export default function setup() {
  const uri =
    process.env.MONGODB_TEST_URI ?? "mongodb://127.0.0.1:27017/orbt_test";
  if (new URL(uri).pathname !== "/orbt_test")
    throw new Error("Os testes exigem o banco orbt_test.");
  execFileSync(
    process.execPath,
    ["--conditions=react-server", "scripts/seed.ts"],
    {
      env: { ...process.env, MONGODB_URI: uri },
      stdio: "inherit",
    },
  );
}
