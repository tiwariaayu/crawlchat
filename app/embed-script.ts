import fs from "fs/promises";

export async function loader() {
  const data = await fs.readFile("public/embed-source.js", "utf-8");

  return new Response(data, {
    headers: {
      "Content-Type": "text/javascript",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
