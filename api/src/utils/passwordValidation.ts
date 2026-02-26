const MIN_LENGTH = 8;
const HAS_UPPERCASE = /[A-Z]/;
const HAS_LOWERCASE = /[a-z]/;
const HAS_NUMBER = /\d/;
const HAS_SPECIAL = /[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/;

export type PasswordValidation = {
  isValid: boolean;
  minLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
};

export function validatePassword(password: string): PasswordValidation {
  return {
    minLength: password.length >= MIN_LENGTH,
    hasUppercase: HAS_UPPERCASE.test(password),
    hasLowercase: HAS_LOWERCASE.test(password),
    hasNumber: HAS_NUMBER.test(password),
    hasSpecial: HAS_SPECIAL.test(password),
    isValid:
      password.length >= MIN_LENGTH &&
      HAS_UPPERCASE.test(password) &&
      HAS_LOWERCASE.test(password) &&
      HAS_NUMBER.test(password) &&
      HAS_SPECIAL.test(password),
  };
}
