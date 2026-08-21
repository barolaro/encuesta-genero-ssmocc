import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE = "ssmocc_admin";
const sign = (value: string) => createHmac("sha256", process.env.SESSION_SECRET || "development-only").update(value).digest("hex");

export function validPassword(value: string) {
  const expected = Buffer.from(process.env.ADMIN_PASSWORD || "");
  const received = Buffer.from(value);
  return expected.length > 0 && expected.length === received.length && timingSafeEqual(expected, received);
}
export async function createAdminSession() {
  const expires = Date.now() + 8 * 60 * 60 * 1000;
  const value = `${expires}.${sign(String(expires))}`;
  (await cookies()).set(COOKIE, value, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", maxAge: 28800, path: "/" });
}
export async function clearAdminSession() { (await cookies()).delete(COOKIE); }
export async function isAdmin() {
  const value = (await cookies()).get(COOKIE)?.value;
  if (!value) return false;
  const [expires, signature] = value.split(".");
  return Number(expires) > Date.now() && signature === sign(expires);
}
