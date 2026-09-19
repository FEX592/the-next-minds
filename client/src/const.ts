import { safeAdminReturnTo } from "@shared/const";
export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
export const startLogin = (returnTo = "/admin") => {
  window.location.href = `/auth?returnTo=${encodeURIComponent(safeAdminReturnTo(returnTo))}`;
};
