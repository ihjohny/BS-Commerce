/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the Payload backend, e.g. https://api.example.com. Empty = same-origin (dev proxy). */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
