import type { Endpoint } from 'payload'

/**
 * Lightweight docs hub so both generated and custom contracts are easy to find.
 */
export const docsIndexEndpoint: Endpoint = {
  path: '/docs-index',
  method: 'get',
  handler: async () => {
    const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>BS-Commerce API Docs</title>
    <style>
      body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; margin: 2rem; color: #0f172a; }
      h1 { margin-bottom: .5rem; }
      p { color: #475569; }
      ul { line-height: 1.9; }
      code { background: #f1f5f9; padding: .1rem .35rem; border-radius: .25rem; }
    </style>
  </head>
  <body>
    <h1>BS-Commerce API Documentation</h1>
    <p>Use the links below to explore both API surfaces.</p>
    <ul>
      <li><a href="/api/docs">Payload API docs (Swagger UI)</a> — <code>/api/openapi.json</code></li>
      <li><a href="/api/docs-custom">Custom endpoints docs (Swagger UI)</a> — <code>/api/openapi-custom.json</code></li>
    </ul>
  </body>
</html>`

    return new Response(html, {
      status: 200,
      headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
    })
  },
}

