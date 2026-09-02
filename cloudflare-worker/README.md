# Kantine Dish-Images Worker

Cloudflare Worker, der die Google-Bildersuche **serverseitig** abfragt und
sauberes JSON mit Thumbnail-URLs zurückliefert. Damit entfällt das Bookmarklet-
Risiko „öffentlicher CORS-Proxy ist gerade tot" — der Worker läuft auf deiner
eigenen Cloudflare-Infrastruktur (Free-Tier: 100.000 Requests/Tag, für den
Kantine-Anwendungsfall mehr als ausreichend).

**Endpoint:** `GET https://<worker-name>.<dein-subdomain>.workers.dev/?q=<gericht>&hl=de`

```json
{ "query": "Wiener Schnitzel", "hl": "de", "count": 5, "images": [{ "url": "https://encrypted-tbn0.gstatic.com/images?q=tbn:..." }] }
```

---

## Setup — Option A: Cloudflare Dashboard (empfohlen, ~5 Minuten, kein Git)

1. **https://dash.cloudflare.com** öffnen und anmelden.
2. Linkes Menü: **Workers & Pages** → Button **Create** → **Create Worker**.
3. Namen vergeben, z. B. `kantine-dish-images` → **Deploy** klicken (der
   Hello-World-Standard reicht).
4. Nach dem Deploy: **Edit code** klicken.
5. Den kompletten Inhalt dieser Datei (`worker.js`) einfügen (Standard-Code
   vollständig ersetzen) → rechts oben **Deploy**.
6. Die URL notieren, die Cloudflare anzeigt — Format:
   `https://kantine-dish-images.<dein-subdomain>.workers.dev`
7. **Testen:** die URL + `?q=Wiener%20Schnitzel` im Browser öffnen → es muss
   JSON mit `images: [...]` erscheinen.
8. Die workers.dev-URL an den Agenten/das Repo zurückgeben — sie wird als
   CI-Secret (`DISH_IMAGE_WORKER_URL`) hinterlegt und per Build in das
   Bundle injiziert (kein Secret im Git-Repo).

## Setup — Option B: GitHub-Anbindung (Auto-Deploy bei jedem Push)

Wenn sich Änderungen am Worker künftig automatisch deployen sollen:

1. Cloudflare Dashboard → **Workers & Pages** → **Create** → **Workers** →
   **Import a repository** (Workers Builds).
2. **Connect GitHub** (OAuth-Freigabe erteilen) → Repository
   `TauNeutrino/kantine-overview` auswählen.
3. Build-Konfiguration:
   - **Project name:** `kantine-dish-images`
   - **Root directory:** `cloudflare-worker` ← wichtig!
   - **Build command:** leer lassen
   - **Deploy command:** `npx wrangler deploy`
4. **Create and Deploy** — Cloudflare klont das Repo, baut den Worker und
   deployt ihn. Jeder Push auf `main`, der `cloudflare-worker/` ändert,
   deployet den Worker automatisch neu.
5. URL testen (wie Option A, Schritt 7) und zurückgeben.

---

## Härtung (optional, falls missbraucht)

Der Worker ist bewusst offen (kein Key nötig, `Access-Control-Allow-Origin: *`).
Bei unerwünschter Fremdnutzung kann in `fetch()` ein Origin-Check ergänzt
werden:

```js
const origin = request.headers.get('Origin')
if (origin && origin !== 'https://web.bessa.app') return jsonResponse({ error: 'forbidden' }, 403)
```

Bei Quota-Problemen: Free-Tier-Limit (100k/Tag) im Cloudflare-Dashboard unter
Workers → Metrics beobachtbar.
