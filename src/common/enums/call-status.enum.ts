/**
 * TypeScript enum for CallLog status values.
 * Replaces the raw `String` type in Prisma schema and magic strings
 * "completed" | "missed" | "rejected" scattered across CallsService and CallsController.
 */
export enum CallStatus {
  Completed = 'completed',
  Missed    = 'missed',
  Rejected  = 'rejected',
}

/**
 * Call direction from the perspective of the requesting user.
 */
export enum CallDirection {
  Outgoing = 'outgoing',
  Incoming = 'incoming',
}
