/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Public LinkedIn profile URL. Leave empty to show the launch-blocking placeholder. */
  readonly VITE_LINKEDIN_URL?: string
  /** Optional form endpoint (e.g. Formspree). If unset the contact form opens the visitor's mail client. */
  readonly VITE_FORM_ENDPOINT?: string
  readonly VITE_SITE_URL?: string
}
interface ImportMeta {
  readonly env: ImportMetaEnv
}
