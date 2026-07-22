export const REGISTRATION_PASSWORD_MIN_LENGTH = 15;
export const REGISTRATION_PASSWORD_MAX_LENGTH = 72;

export function registrationPasswordLength(password: string) {
  return Array.from(password).length;
}

export function registrationPasswordFitsHashLimit(password: string) {
  return new TextEncoder().encode(password).length <= REGISTRATION_PASSWORD_MAX_LENGTH;
}

export function registrationPasswordIsValid(password: string) {
  const length = registrationPasswordLength(password);
  return (
    length >= REGISTRATION_PASSWORD_MIN_LENGTH &&
    length <= REGISTRATION_PASSWORD_MAX_LENGTH &&
    registrationPasswordFitsHashLimit(password)
  );
}
