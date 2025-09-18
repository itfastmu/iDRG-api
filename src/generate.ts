import { readFileSync, writeFileSync } from "fs";

// 🚀 fungsi converter JSON → validator Elysia
function jsonToValidator(obj: any): string {
  if (typeof obj === "string") return "t.String()";
  if (typeof obj === "number") return "t.Number()";
  if (typeof obj === "boolean") return "t.Boolean()";
  if (Array.isArray(obj)) {
    return `t.Array(${obj.length > 0 ? jsonToValidator(obj[0]) : "t.Any()"})`;
  }
  if (typeof obj === "object" && obj !== null) {
    const shape = Object.entries(obj)
      .map(([k, v]) => `${JSON.stringify(k)}: ${jsonToValidator(v)}`)
      .join(", ");
    return `t.Object({ ${shape} })`;
  }
  return "t.Any()";
}

// 🚀 baca file Postman
const raw = readFileSync("src/E-KLAIM IDRG.postman_collection.json", "utf-8");
const collection = JSON.parse(raw);

const routes: string[] = [];

for (const item of collection.item) {
  const name = item.name.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase();
  const method = (item.request.method || "POST").toLowerCase();

  let bodyValidator = "t.Any()";
  try {
    if (item.request?.body?.raw) {
      const example = JSON.parse(item.request.body.raw);
      bodyValidator = jsonToValidator(example);
    }
  } catch (e) {
    bodyValidator = "t.Any()";
  }

  routes.push(`
  .${method}(
    "/${name}",
    ({ body }) => forward(body),
    { body: ${bodyValidator} }
  )`);
}

// 🚀 rangkai file Elysia
const result = `
import { Elysia, t } from "elysia";

const EKLAIM_URL = "http://192.168.1.45/E-Klaim/ws.php?mode=debug";

const forward = async (body: unknown) => {
  const res = await fetch(EKLAIM_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return await res.json();
};

const app = new Elysia()
${routes.join("\n")}
  .listen(3000);

console.log("🦊 Elysia API siap di http://192.168.1.45:3000");
`;

writeFileSync("elysia-api.ts", result);
console.log("✅ Generated elysia-api.ts dengan semua endpoint + validator");
