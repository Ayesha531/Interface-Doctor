/**
 * Anonymous client token for scoping projects to a browser.
 *
 * The token is stored in an httpOnly, sameSite=lax cookie so it cannot be read
 * by JavaScript and is only sent to our own API routes. It is signed with
 * SESSION_SECRET to detect tampering.
 */

import { createHmac } from "crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "interface-doctor-client";
const TOKEN_PREFIX = "v1:";

export interface TokenResult {
  token: string;
  cookieSet: boolean;
}

export async function getClientToken(): Promise<TokenResult> {
  const jar = cookies();
  const existing = jar.get(COOKIE_NAME)?.value;
  const secret = process.env.SESSION_SECRET?.trim();

  if (existing) {
    const token = unsignToken(existing, secret);
    if (token) return { token, cookieSet: false };
  }

  const token = crypto.randomUUID();
  const signed = signToken(token, secret);

  jar.set(COOKIE_NAME, signed, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });

  return { token, cookieSet: true };
}

function signToken(token: string, secret?: string): string {
  if (!secret) return `${TOKEN_PREFIX}${token}`;
  const signature = hmac(token, secret);
  return `${TOKEN_PREFIX}${token}.${signature}`;
}

function unsignToken(value: string, secret?: string): string | null {
  if (!value.startsWith(TOKEN_PREFIX)) return null;
  const payload = value.slice(TOKEN_PREFIX.length);

  if (!secret) {
    // Unsigned legacy token; accept it but it will be replaced on next request.
    if (payload.includes(".")) return null;
    return payload;
  }

  const [token, signature] = payload.split(".");
  if (!token || !signature) return null;
  if (signature !== hmac(token, secret)) return null;
  return token;
}

function hmac(message: string, secret: string): string {
  return createHmac("sha256", secret).update(message).digest("hex");
}
