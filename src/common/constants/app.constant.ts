// App config limits and settings
export const APP_CONSTANTS = {
  // Pagination
  pagination: {
    defaultLimit:   50,
    maxLimit:       200,
    adminLimit:     100,
  },

  // ─── Rate Limiting (mirrors ThrottlerModule config in app.module.ts) ─────
  rateLimit: {
    /** General API: requests per window */
    defaultLimit:   100,
    defaultTtlMs:   60_000,   // 1 minute

    /** Auth endpoints: requests per window */
    authLimit:      10,
    authTtlMs:      60_000,

    /** File uploads: requests per window */
    uploadLimit:    20,
    uploadTtlMs:    60_000,

    /** WebSocket messages: per user per window */
    wsMessageLimit: 20,
    wsMessageTtlMs: 10_000,   // 10 seconds
  },

  // ─── File Uploads ─────────────────────────────────────────────────────────
  uploads: {
    maxFileSizeBytes:   100 * 1024 * 1024,    // 100 MB
    allowedImageTypes:  ['png', 'jpg', 'jpeg'] as const,
    publicDir:          'public',
  },

  // ─── Friends / Suggestions ───────────────────────────────────────────────
  friends: {
    suggestionsLimit: 10,
  },

  // ─── JWT ─────────────────────────────────────────────────────────────────
  jwt: {
    defaultExpiry:   '10d',
    fallbackSecret:  'super-secret-key-12345', // ⚠ Override via JWT_SECRET env var
  },

  // ─── Redis ────────────────────────────────────────────────────────────────
  redis: {
    defaultHost: '127.0.0.1',
    defaultPort: 6379,
  },
} as const;
