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

const COMMON_DOMAIN_TYPOS = {
  "gmai.com": "gmail.com",
  "gmaill.com": "gmail.com",
  "gmial.com": "gmail.com",
  "gamil.com": "gmail.com",
  "gmaik.com": "gmail.com",
  "gmal.com": "gmail.com",
  "gmai.in": "gmail.com",
  "yaho.com": "yahoo.com",
  "yahooo.com": "yahoo.com",
  "yhaoo.com": "yahoo.com",
  "hotmial.com": "hotmail.com",
  "hotmaill.com": "hotmail.com",
  "outlok.com": "outlook.com",
  "outloo.com": "outlook.com",
  "iclud.com": "icloud.com",
};

/**
 * Detects common typos in email domains and suggests a fix.
 * @param {string} email
 * @returns {string|null} Corrected email or null if no typo detected
 */
export const suggestEmailCorrection = (email) => {
  if (!email || typeof email !== "string" || !email.includes("@")) return null;
  const parts = email.trim().split("@");
  if (parts.length !== 2) return null;
  const [user, domain] = parts;
  const correctedDomain = COMMON_DOMAIN_TYPOS[domain.toLowerCase()];
  if (correctedDomain) {
    return `${user}@${correctedDomain}`;
  }
  return null;
};


