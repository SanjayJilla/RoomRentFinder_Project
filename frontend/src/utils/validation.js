/**
 * Validates password strength according to security best practices:
 * - 8 to 64 characters
 * - At least one uppercase letter (A-Z)
 * - At least one lowercase letter (a-z)
 * - At least one digit (0-9)
 * - At least one special symbol
 *
 * @param {string} password
 * @returns {string|null} Error message or null if valid
 */
export const validatePassword = (password) => {
  if (!password || password.length < 8) {
    return "Password must contain at least 8 characters.";
  }
  if (password.length > 64) {
    return "Password cannot exceed 64 characters.";
  }
  if (!/[A-Z]/.test(password)) {
    return "Password must include at least one uppercase letter (A-Z).";
  }
  if (!/[a-z]/.test(password)) {
    return "Password must include at least one lowercase letter (a-z).";
  }
  if (!/\d/.test(password)) {
    return "Password must include at least one number (0-9).";
  }
  if (!/[@$!%*?&_\-#^~+=<>,.:;]/.test(password)) {
    return "Password must include at least one special character (@$!%*?&_- etc.).";
  }
  return null;
};

