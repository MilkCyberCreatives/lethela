// Pages that need the whole phone screen for one task (paying, signing in, signing up),
// so the bottom navigation stays out of the way there.
const MOBILE_NAV_HIDDEN_ROUTES = [
  "/checkout",
  "/signin",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/owner-access",
  "/vendors/signin",
  "/vendors/register",
  "/rider",
];

export function mobileBottomNavHidden(pathname: string) {
  return MOBILE_NAV_HIDDEN_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}
