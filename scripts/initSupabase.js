// Simple local initializer for the payroll_data table using Supabase REST API
// Usage: node scripts/initSupabase.js
// Reads .env in project root for VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_SUPABASE_TABLE

import fs from "fs";
import path from "path";

function parseEnv(filePath) {
  const env = {};
  if (!fs.existsSync(filePath)) return env;
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim();
    env[key] = val;
  }
  return env;
}

const main = async () => {
  const envFile = path.resolve(process.cwd(), ".env");
  const env = parseEnv(envFile);
  const url = env.VITE_SUPABASE_URL;
  const key = env.VITE_SUPABASE_ANON_KEY;
  const table = env.VITE_SUPABASE_TABLE || "payroll_data";

  if (!url || !key) {
    console.error(
      "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env",
    );
    process.exit(2);
  }

  const payload = [
    {
      id: "app",
      data: {
        employees: [],
        company: {
          companyName: "Your Company Name",
          address: "123 Business Street",
          cityPincode: "",
          country: "India",
          email: "",
          phone: "",
          website: "",
          panNumber: "",
          tanNumber: "",
          logoDataUrl: null,
        },
      },
      updated_at: new Date().toISOString(),
    },
  ];

  try {
    const endpoint = `${url.replace(/\/$/, "")}/rest/v1/${table}?on_conflict=id`;
    console.log("POST", endpoint);

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    if (res.ok) {
      console.log("Success: seeded payroll_data (app)");
      console.log(text);
      process.exit(0);
    } else {
      console.error("Failed to seed. Status:", res.status);
      console.error(text);
      process.exit(3);
    }
  } catch (err) {
    console.error("FULL ERROR:");
    console.error(err);
    console.error("CAUSE:", err.cause);
    process.exit(4);
  }
};

main();
