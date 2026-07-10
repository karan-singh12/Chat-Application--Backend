export const ADMIN = {
    emailExists: "Email already exists.",
    phoneNumberExists: "Phone number already exists.",
    adminAdded: "Admin Added.",
    invalidLogin: "Invalid credentials.",
    profileUpdated: "Profile updated successfully.",
    loginSuccess: "Login Successfully.",
    emailNotExists: "Email doesn't exist.",
    accountNotExists: "Account doesn't exist.",
    emailSent: "Email sent successfully.",
    passwordNotSame: "Confirm password should be the same as new password.",
    resetLinkExpired: "Reset Password link has expired.",
    resetPasswordSuccess: "Password reset successfully.",
    passwordNotMatched: "Confirm password not matched.",
    passwordInvalid: "Old password is invalid.",
    passwordChanged: "Password changed successfully.",
    settingUpdated: "Setting updated successfully.",
    subadminAdded: "Subadmin added successfully.",
    subadminUpdated: "Subadmin updated successfully.",
    subadminActivated: "Subadmin activated successfully.",
    subadminDeactivated: "Subadmin deactivated successfully.",
    subadminDeleted: "Subadmin deleted successfully.",
    otpNotFound: "No OTP found. Please login again.",
    otpExpired: "OTP has expired. Please login again.",
    otpInvalid: "Invalid OTP code.",
    logoutSuccess: "Logged out successfully.",
};

export const USER = {
    emailAlreadyExists: "Email already exists.",
    alreadyVerified: "Email already verified.",
    emailRequired: "Email address is required.",
    otpRequired: "OTP is required.",
    otpNotFound: "No OTP found. Please request a new one.",
    passwordRequired: "Password is required.",
    phoneNumberExists: "Phone number already exists.",
    otpSent: "We've sent a new OTP to your registered contact.",
    verificationLinkSent: "Verification email sent successfully!",
    otpExpired: "OTP expired.",
    otpNotMatched: "Invalid OTP.",
    otpVerified: "OTP verified.",
    accountNotExists: "Your account does not exist.",
    accountDeactivated: "Your account has been deactivated. Please contact the admin for further assistance.",
    accountNotApproved: "Your account has not been approved yet.",
    invalidLogin: "The email or password is incorrect!",
    unregisteredEmail: `The email or password is incorrect!`,
    loginSuccess: "Login successful.",
    singUpSuccess: "Your account has been created successfully.",
    resetPassword: "Password reset successfully.",
    documentUploaded: "Your documents have been submitted successfully. You will be notified once it is approved.",
    userAdded: "User added successfully.",
    userUpdated: "User updated successfully.",
    userActivated: "User activated successfully.",
    userDeactivated: "User deactivated successfully.",
    userDeleted: "User deleted successfully.",
    accountNotVerified: "Please verify your account first.",
    accountNotCompleted: "Please complete your account first.",
    socialLoginTypeRequired: "Social login type is required.",
    contactUsSubmitted: "Your feedback has been submitted successfully.",
    profileUpdated: "Profile updated successfully.",
    passwordNotMatched: "The password you entered does not match!",
    oldPasswordInvalid: "The current password you entered is incorrect!",
    passwordChanged: "Password changed successfully.",
    guestUserCreated: "Guest user created successfully.",
    identityVerification: "Your account has been submitted for verification. You will be notified once it is approved.",
    usernameAlreadyExist: "Username already exists.",
    logoutSuccess: "Logged out successfully.",
    emailInvalid: "Please enter a valid email address.",
    missingCredentials: "Please enter email and password first!",
    passwordInvalid: "Password must be between 6 and 15 characters and can include letters, numbers, and standard special characters.",
    termsNotAccepted: "Please check the box to accept the terms first!",
    accountExists: "This account has been registered, please log in!",
    resetLinkSent: "Password reset link has been sent to your email!",
    resetMissingFields: "Please enter full information.",
    expiredVerificationLink: "The verification link has expired, please resend!",
    expiredResetLink: "The change password link has expired, please resend!",
    signupSuccess: "Congratulations on becoming our valued member! Please use your email and password to log in.",
    frozenMember: "This email address has already used the 7-Day Free Membership Trial. Your account is now classified as Frozen Member. Please pay the membership fee first to reactivate it.",
    duplicateLogin: "Duplicate login detected!",
    followsRetrievedSuccessfully: "User follows retrieved successfully.",
    followedSuccessfully: "Streamer followed successfully.",
    unfollowedSuccessfully: "Streamer unfollowed successfully.",
    notFollowing: "You are not following this streamer.",
    alreadyFollowed: "You are already following this streamer.",
    userMembershipCancelled: "User membership cancelled successfully.",
    idRequired: "User id required.",
    nicknameExists: "Nickname already exists."
};

export const STREAMER = {
    streamerAdded: "Streamer added successfully.",
    streamerUpdated: "Streamer updated successfully.",
    streamerActivated: "Streamer activated successfully.",
    streamerDeactivated: "Streamer deactivated successfully.",
    streamerDeleted: "Streamer deleted successfully.",
    emailExists: "Email address already exists in the system.",
    otpSent: "We've sent a new OTP to your registered contact.",
    verificationLinkSent: "We've sent a new link to your registered email.",
    otpExpired: "OTP expired.",
    otpNotMatched: "Invalid OTP.",
    otpVerified: "OTP verified.",
    accountNotExists: "Your account does not exist.",
    accountDeactivated: "Your account has been deactivated. Please contact the admin for further assistance.",
    accountNotApproved: "Your account has not been approved yet.",
    invalidLogin: "Invalid credentials.",
    passwordInvalid: "Invalid password.",
    loginSuccess: "Login successful.",
    singUpSuccess: "Your account has been created successfully.",
    resetPassword: "Password reset successfully.",
    documentUploaded: "Your documents have been submitted successfully. You will be notified once it is approved.",
    accountNotVerified: "Please verify your account first.",
    accountNotCompleted: "Please complete your account first.",
    socialLoginTypeRequired: "Social login type is required.",
    contactUsSubmitted: "Your feedback has been submitted successfully.",
    profileUpdated: "Streamer profile updated successfully.",
    passwordNotMatched: "Confirm password does not match.",
    oldPasswordInvalid: "Old password is invalid.",
    passwordChanged: "Password changed successfully!",
    guestUserCreated: "Guest user created successfully.",
    identityVerification: "Your account has been submitted for verification. You will be notified once it is approved.",
    resetLinkExpired: "Reset Password link has expired.",
    resetPasswordSuccess: "Password reset successfully.",
    logoutSuccess: "Logged out successfully.",
    emailRequired: "Email address required.",
    passwordRequired: "Password required.",
    profileExists: "Streamer profile already exists for this email address.",
    idRequired: "Streamer id required.",
    notFound: "Streamer not found.",
    passwordMismatch: "Password and confirm password do not match.",
    passwordUpdated: "Streamer password updated successfully"
};

export const EMAILTEMPLATE = {
    templateAdded: "Email template added successfully.",
    templateUpdated: "Email template updated successfully.",
    emailSent: "Email sent.",
    templateActived: "Email template activated successfully.",
    templateInactived: "Email template deactivated successfully.",
    templateDeleted: "Email template deleted successfully."
};

export const ERROR = {
    SomethingWrong: "Oops, something went wrong. Please try again later.",
    NoDataFound: "No data found.",
    Unauthorized: "You are not authorized to perform this action.",
    NotAuthorizedToStream: "You are not authorized to stream. Please contact support."
};

export const SUCCESS = {
    dataFound: "Data found.",
    StreamCreated: "Stream created successfully.",
    StreamStarted: "Stream started successfully.",
    StreamStopped: "Stream stopped successfully."
};

export const AUTH = {
    tokenRequired: "A token is required for authentication!",
    adminDeleted: "Admin Deleted.",
    adminDeactived: "Your account has been deactivated.",
    invalidToken: "Invalid Token, Not authorized to access.",
    tokenExpired: "Token Expired!",
    userDeleted: "Your account has been deleted by admin.",
    otpSent: "OTP sent to your email. Please verify to continue login.",
    refreshTokenRequired: "Refresh token is required.",
    invalidRefreshToken: "Invalid refresh token.",
    refreshTokenExpired: "Refresh token has expired.",
    refreshTokenRevoked: "Refresh token has been revoked.",
    tokenRefreshed: "Token refreshed successfully"
};

export const CONTENT = {
    contentAdded: "Content added successfully.",
    contentUpdated: "Content updated successfully.",
    privacyUpdated: "Privacy policy updated successfully.",
    termsUpdated: "Terms & conditions updated successfully.",
    aboutUpdated: "About Us updated successfully.",
    welcomeUpdated: "App welcome screen updated successfully.",
    communityGuidelinesUpdated: "Community guidelines updated successfully.",
    idRequired: "Content id required.",
    aboutUsIdRequired: "About us id required."
};

export const FAQ = {
    faqAdded: "FAQ added successfully.",
    faqUpdated: "FAQ updated successfully.",
    faqDeleted: "FAQ deleted successfully.",
    faqActivated: "FAQ activated successfully.",
    faqDeactivated: "FAQ deactivated successfully.",
    idRequired: "FAQ id is required."
};

export const BILLBOARD = {
    added: "Billboard added successfully.",
    updated: "Billboard updated successfully.",
    deleted: "Billboard deleted successfully.",
    activated: "Billboard activated successfully.",
    deactivated: "Billboard deactivated successfully.",
    imageRequired: "Image file is required.",
    displayOrderRequired: "Display order is required.",
    idRequired: "Billboard ID is required.",
    notFound: "Billboard not found."
};

export const MODEL = {
    notFound: "Streamer not Found",
    modelupdated: "Streamer updated successFully.",
    modelAdded: "Streamer added successfully.",
    found: "Streamer found successFully.",
    modelDeleted: "Streamer delete successFully."
};

export const MEMBERSHIP = {
    noActiveMembership: "No active membership found.",
    cancelledSuccessfully: "Membership cancelled successfully.",
    upgradeSuccessfully: "Membership upgraded successfully.",
    retrievedSuccessfully: "Membership retrieved successfully.",
    notFound: "Membership not found.",
    invalidPlan: "Invalid membership plan.",
    notIdentified: "User not identified.",
    expired: "Membership expired.",
    notActive: "Membership not active.",
    notRenewed: "Membership not renewed.",
    notAutoRenewed: "Membership not auto renewed.",
    upgradedSuccessfully: "Membership upgraded successfully.",
    planIdRequired: "Plan ID is required.",
    planNameRequired: "Plan name is required.",
    planTypeRequired: "Plan type is required.",
    priceRequired: "Price is required.",
    planNameExists: "A plan with this name already exists.",
    planTypeExists: "A plan with this type already exists.",
    planCreated: "Membership plan created successfully.",
    planUpdated: "Membership plan updated successfully.",
    planActivated: "Membership activated successfully.",
    planDeactivated: "Membership deactivated successfully.",
    planDeleted: "Membership plans deleted successfully.",
    planNameLength: "Plan name must be 50 characters or less.",
    planTypeLength: "Plan type must be 20 characters or less."
};

export const WALLET = {
    walletBalanceRetrievedSuccessfully: "Wallet balance retrieved successfully.",
    walletTransactionsRetrievedSuccessfully: "Wallet transactions retrieved successfully.",
    invalidAmount: "Invalid credit amount.",
};

export const SECURITY = {
    alertNotFound: "Alert not found",
    unauthorized: "Unauthorized",
    alertAcknowledged: "Alert acknowledged successfully",
    alertResolved: "Alert resolved successfully",
    alertFalsePositive: "Alert marked as false positive",
    thresholdsUpdated: "Thresholds updated successfully",
    ipRequired: "IP address is required",
    invalidIp: "Invalid IP address format",
    ipBlocked: "IP address blocked successfully",
    ipUnblocked: "IP address unblocked successfully"
};
