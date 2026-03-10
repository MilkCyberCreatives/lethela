import { cookies as nextCookies } from "next/headers";

export async function getCookie(name: string) {
  const c = await nextCookies();
  return c.get(name)?.value;
}
