// Centralized API response messages
export const MESSAGES = {
  // Authentication
  auth: {
    loginSuccess:        'Login successful',
    signupSuccess:       'Account created successfully',
    invalidCredentials:  'Invalid email or password',
    emailExists:         'Email is already registered',
    tokenMissing:        'Access token is missing',
    tokenInvalid:        'Invalid or expired access token',
    wsTokenMissing:      'Unauthorized: Token missing',
    wsTokenInvalid:      'Unauthorized: Token invalid or expired',
  },

  // ─── User / Profile ───────────────────────────────────────────────────────
  user: {
    profileFetched:       'User profile fetched successfully',
    publicProfileFetched: 'Public profile fetched successfully',
    profileUpdated:       'User profile updated successfully',
    notFound:             'User not found',
    profileNotFound:      'User profile not found',
    usernameTaken:        'Username is already taken',
    cannotAddSelf:        'You cannot add yourself as a friend',
  },

  // ─── Friendship ───────────────────────────────────────────────────────────
  friendship: {
    requestSent:         'Friend request sent successfully',
    autoAccepted:        'Friend request automatically accepted',
    requestsFetched:     'Friend requests fetched successfully',
    listFetched:         'Friends list fetched successfully',
    removed:             'Friend removed successfully',
    suggestionsFetched:  'Friend suggestions fetched successfully',
    alreadyFriends:      'You are already friends with this user',
    pendingRequest:      'Friend request already sent',
    notFound:            'Friend request not found',
    notReceiver:         'You can only respond to requests sent to you',
    alreadyHandled:      'This request has already been handled',
    friendNotFound:      'Friend relationship not found',
    responded:           (status: string) => `Friend request ${status.toLowerCase()} successfully`,
  },

  // ─── Chat / Conversations / Groups ───────────────────────────────────────
  chat: {
    conversationCreated:   'Conversation created successfully',
    conversationsFetched:  'Conversations fetched successfully',
    conversationFetched:   'Conversation fetched successfully',
    conversationDeleted:   'Conversation deleted successfully',
    conversationArchived:  (archived: boolean) => archived ? 'Conversation archived' : 'Conversation unarchived',
    conversationMuted:     (muted: boolean)    => muted    ? 'Conversation muted'    : 'Conversation unmuted',
    conversationPinned:    (pinned: boolean)   => pinned   ? 'Conversation pinned'   : 'Conversation unpinned',
    groupCreated:          'Group created successfully',
    groupsFetched:         'Groups fetched successfully',
    groupFetched:          'Group fetched successfully',
    groupUpdated:          'Group updated successfully',
    groupDeleted:          'Group deleted successfully',
    membersAdded:          'Members added to group successfully',
    memberRemoved:         'Member removed from group successfully',
    leftGroup:             'Left group successfully',
    roleUpdated:           'Member role updated successfully',
    messageSent:           'Message sent successfully',
    messageEdited:         'Message updated successfully',
    messageDeleted:        'Message deleted successfully',
    messagesFetched:       'Messages fetched successfully',
    searchCompleted:       'Search completed successfully',
    unauthorized:          'You are not a member of this conversation',
    messageNotFound:       'Message not found',
    permissionDenied:      'Only the sender can perform this action',
    groupPermissionDenied: 'Only group admins can perform this action',
    notFound:              (type: string) => `${type} not found`,
  },

  // ─── File Uploads ─────────────────────────────────────────────────────────
  uploads: {
    success:     'File uploaded successfully',
    noFile:      'No file uploaded',
    invalidType: 'Only png, jpg, jpeg files are allowed',
    tooLarge:    'File size exceeds the allowed limit',
  },

  // ─── Calls ────────────────────────────────────────────────────────────────
  calls: {
    logCreated:     'Call log created successfully',
    historyFetched: 'Call history fetched successfully',
    historyCleared: 'Call history cleared successfully',
  },

  // ─── Posts / Social Feed ──────────────────────────────────────────────────
  posts: {
    created:      'Post created successfully',
    feedFetched:  'Feed fetched successfully',
    liked:        'Post liked successfully',
    unliked:      'Post unliked successfully',
    toggled:      (liked: boolean) => liked ? 'Post liked' : 'Post unliked',
    commentAdded: 'Comment added successfully',
    notFound:     'Post not found',
  },

  // ─── Admin ────────────────────────────────────────────────────────────────
  admin: {
    statsFetched:         'Dashboard statistics fetched successfully',
    usersFetched:         'Users list fetched successfully',
    userFetched:          'User details fetched successfully',
    userUpdated:          'User updated successfully',
    userNotFound:         'User not found',
    userActivated:        'User activated successfully',
    userDeactivated:      'User deactivated successfully',
    userRoleUpdated:      'User role updated successfully',
    trafficFetched:       'Traffic logs fetched successfully',
    suspiciousFetched:    'Suspicious traffic logs fetched successfully',
    trafficCleared:       'Traffic logs cleared successfully',
    unauthorized:         'Admin access required',
  },

  // ─── Common / Generic ─────────────────────────────────────────────────────
  common: {
    success:         'Operation completed successfully',
    notFound:        'Resource not found',
    unauthorized:    'You are not authorized to perform this action',
    serverError:     'Something went wrong. Please try again later.',
    validationFailed:'Validation failed',
    forbidden:       (roles: string[]) => `Access denied. Required roles: ${roles.join(', ')}`,
  },
} as const;

// ─── Re-export for backward compatibility (replaces legacy responseMssg.ts) ─
export { MESSAGES as MSG };
