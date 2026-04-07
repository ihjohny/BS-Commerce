# REST API Documentation

This backend now exposes live API documentation routes:

- Docs hub (both links): `/api/docs-index`
- Swagger UI (merged, recommended): `/api/docs`
- Swagger UI (custom routes): `/api/docs-custom`
- OpenAPI JSON (Payload-managed endpoints): `/api/openapi.json`
- OpenAPI JSON (merged, recommended): `/api/openapi-all.json`
- OpenAPI JSON (supplemental endpoints not emitted by payload-oapi): `/api/openapi-custom.json`

## Notes

- `payload-oapi` keeps Payload collection/global/auth/preferences routes in sync automatically.
- Some routes (notably custom + selected auth/verification endpoints) are not emitted by `payload-oapi`.
  `/api/openapi-custom.json` is the supplemental contract, and `/api/openapi-all.json` merges it with generated output.

