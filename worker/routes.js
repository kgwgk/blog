const PROTECTED_PATHS = [
  { pattern: "/members/*", minRole: "friend" },
  { pattern: "/admin/*", minRole: "admin" },
];

const ROLE_HIERARCHY = {
  admin: 3,
  family: 2,
  friend: 1,
};

const ALWAYS_PUBLIC = [
  "/",
  "/css/*",
  "/images/*",
  "/fonts/*",
  "/favicon.ico",
  "/robots.txt",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/auth/*",
];

function matchPattern(pattern, pathname) {
  if (pattern === pathname) return true;
  if (pattern.endsWith("/*")) {
    const prefix = pattern.slice(0, -1); // "/members/"
    return pathname === prefix.slice(0, -1) || pathname.startsWith(prefix);
  }
  return false;
}

export function isAlwaysPublic(pathname) {
  return ALWAYS_PUBLIC.some((p) => matchPattern(p, pathname));
}

// Returns the minimum role string required for this path, or null if public.
export function getRequiredRole(pathname) {
  for (const { pattern, minRole } of PROTECTED_PATHS) {
    if (matchPattern(pattern, pathname)) return minRole;
  }
  return null;
}

export function hasRole(userRole, requiredRole) {
  const userLevel = ROLE_HIERARCHY[userRole] || 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRole] || 0;
  return userLevel >= requiredLevel;
}
