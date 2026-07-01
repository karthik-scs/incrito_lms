import type { AuthUser } from "./api";

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      /** Captured by the `verify` hook on `express.json()` — needed to check Zoom's webhook HMAC signature. */
      rawBody?: Buffer;
    }
  }
}

export {};
