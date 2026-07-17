/**
 * Response entity types for the User domain.
 *
 * These are NOT TypeORM entities — the project uses Prisma.
 * These are TypeScript types that describe what the API returns,
 * useful for Swagger documentation and controller return type annotations.
 */

/** Public user profile (password excluded) */
export interface UserEntity {
  id:        string;
  email:     string;
  username:  string | null;
  role:      string;
  bio:       string | null;
  phone:     string | null;
  location:  string | null;
  avatar:    string | null;
  isOnline:  boolean;
  lastSeen:  Date;
  createdAt: Date;
  updatedAt: Date;
}

/** Minimal user shape returned in friend lists / suggestions */
export interface UserSummary {
  id:       string;
  email:    string;
  username: string | null;
  avatar:   string | null;
  bio:      string | null;
}

/** Friend entry (includes friendship metadata) */
export interface FriendEntity extends UserSummary {
  friendshipId: string;
  senderId:     string;
  receiverId:   string;
  updatedAt:    Date;
  location:     string | null;
  phone:        string | null;
}

/** Friend suggestion shape */
export interface FriendSuggestion {
  id:     string;
  name:   string;
  avatar: string | null;
  detail: string;
  added:  boolean;
}
