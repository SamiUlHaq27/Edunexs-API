export const OtpStatuses = {
  PENDING: 'pending',
  VERIFIED: 'verified',
  EXPIRED: 'expired',
} as const;

export const OtpTypes = {
  SIGNUP: 'signup',
  PASSWORD_RESET: 'password_reset',
  EMAIL_VERIFICATION: 'email_verification',
} as const;
