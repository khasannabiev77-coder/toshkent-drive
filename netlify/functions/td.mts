// Toshkent Drive API: /api/hit (usage event), /api/lb (leaderboard read/submit), /stats (usage page).
import { getStore } from "@netlify/blobs"
import type { Config, Context } from "@netlify/functions"
import { hit, stats, statsPage, submit, top } from "../td-core.mjs"

export default async (req: Request, context: Context) => {
  const url = new URL(req.url)
  try {
    if (url.pathname === "/stats") {
      const rows = await stats(getStore("td-stats"))
      return new Response(statsPage(rows), { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } })
    }
    if (url.pathname === "/api/hit" && req.method === "POST") return await hit(getStore("td-stats"), await req.json().catch(() => null))
    if (url.pathname === "/api/lb") {
      const store = getStore({ name: "td-lb", consistency: "strong" })
      if (req.method === "POST") return await submit(store, await req.json().catch(() => null))
      return await top(store, url.searchParams.get("b") || "")
    }
    return new Response("Not found", { status: 404 })
  } catch (err) {
    console.error(err)
    return Response.json({ ok: false }, { status: 500 })
  }
}

export const config: Config = {
  path: ["/api/hit", "/api/lb", "/stats"],
  method: ["GET", "POST"],
  rateLimit: { windowLimit: 60, windowSize: 60, aggregateBy: ["ip", "domain"] },
}
