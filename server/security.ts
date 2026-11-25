import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

const SESSION_COOKIE_NAME = 'assignai_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

// Reads JWT_SECRET from environment or falls back to a cryptographically strong ephemeral runtime key
const JWT_SIGNING_SECRET =
  process.env.JWT_SECRET && process.env.JWT_SECRET.trim().length >= 16
    ? process.env.JWT_SECRET.trim()
    : crypto.randomBytes(32).toString('hex');

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${derivedKey}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') {
    return false;
  }
  const [, salt, originalHex] = parts;
  const candidate = crypto.scryptSync(password, salt, 64);
  const original = Buffer.from(originalHex, 'hex');
  if (candidate.length !== original.length) {
    return false;
  }
  return crypto.timingSafeEqual(candidate, original);
}

function base64UrlEncode(input: Buffer | string): string {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : input;
  return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function base64UrlDecode(input: string): string {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (padded.length % 4)) % 4;
  return Buffer.from(padded + '='.repeat(padLen), 'base64').toString('utf8');
}

export interface JwtPayload {
  sub: string;
  email: string;
  iat: number;
  exp: number;
}

export function signJwt(userId: string, email: string): string {
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const nowSec = Math.floor(Date.now() / 1000);
  const payload = base64UrlEncode(
    JSON.stringify({
      sub: userId,
      email,
      iat: nowSec,
      exp: nowSec + SESSION_TTL_SECONDS,
    } satisfies JwtPayload)
  );
  const signature = base64UrlEncode(
    crypto.createHmac('sha256', JWT_SIGNING_SECRET).update(`${header}.${payload}`).digest()
  );
  return `${header}.${payload}.${signature}`;
}

export function verifyJwt(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, payload, signature] = parts;
    const expectedSig = base64UrlEncode(
      crypto.createHmac('sha256', JWT_SIGNING_SECRET).update(`${header}.${payload}`).digest()
    );
    const sigBuf = Buffer.from(signature, 'utf8');
    const expectedBuf = Buffer.from(expectedSig, 'utf8');
    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      return null;
    }
    const decoded = JSON.parse(base64UrlDecode(payload)) as JwtPayload;
    if (!decoded.sub || typeof decoded.exp !== 'number') return null;
    if (decoded.exp < Math.floor(Date.now() / 1000)) return null;
    return decoded;
  } catch {
    return null;
  }
}

export function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (key) {
      try {
        cookies[key] = decodeURIComponent(val);
      } catch {
        cookies[key] = val;
      }
    }
  }
  return cookies;
}

export function setSessionCookie(res: Response, token: string): void {
  const cookieValue = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    'HttpOnly',
    'Secure',
    'SameSite=None',
    'Partitioned',
    'Path=/',
    `Max-Age=${SESSION_TTL_SECONDS}`,
  ].join('; ');
  res.setHeader('Set-Cookie', cookieValue);
}

export function clearSessionCookie(res: Response): void {
  const cookieValue = [
    `${SESSION_COOKIE_NAME}=`,
    'HttpOnly',
    'Secure',
    'SameSite=None',
    'Partitioned',
    'Path=/',
    'Max-Age=0',
  ].join('; ');
  res.setHeader('Set-Cookie', cookieValue);
}

export function extractAuthToken(req: Request): { token: string | null; source: 'bearer' | 'cookie' | null } {
  const authHeader = req.headers.authorization;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token) return { token, source: 'bearer' };
  }
  const cookies = parseCookies(req.headers.cookie);
  if (cookies[SESSION_COOKIE_NAME]) {
    return { token: cookies[SESSION_COOKIE_NAME], source: 'cookie' };
  }
  return { token: null, source: null };
}

export function verifyCookieMutationCsrf(req: Request): boolean {
  const method = req.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return true;
  }
  // Custom header required by XHR/fetch protects against cross-site form posts
  if (req.headers['x-requested-with'] === 'XMLHttpRequest') {
    return true;
  }
  const origin = req.headers.origin;
  const host = (req.headers['x-forwarded-host'] as string | undefined) || req.headers.host;
  if (origin && host) {
    try {
      const originUrl = new URL(origin);
      if (originUrl.host === host) return true;
    } catch {
      return false;
    }
  }
  return false;
}

export function createRateLimiter(options: { windowMs: number; max: number; message: string }) {
  const hits = new Map<string, { count: number; resetAt: number }>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `${ip}:${req.baseUrl}`;
    const entry = hits.get(key);

    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + options.windowMs });
      next();
      return;
    }

    if (entry.count >= options.max) {
      const retryAfterSec = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSec));
      res.status(429).json({ error: options.message });
      return;
    }

    entry.count += 1;
    next();
  };
}
