// Structure of decoded JWT payload
export interface JwtPayload {
  userId: string; // Database ID (cuid)
  /** User's email address */
  email: string;
  /** User's role: "USER" | "ADMIN" */
  role: string;
  username?: string; // Optional username
  iat?: number;      // Standard JWT issued-at timestamp
  exp?: number;      // Standard JWT expiry timestamp
}

// req.user typing after AuthGuard attaches the payload
export type AuthenticatedUser = JwtPayload;

