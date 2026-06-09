import jwt from "jsonwebtoken";
import { SignOptions } from "jsonwebtoken";

// Pull secrets from .env
const JWT_SECRET = process.env.JWT_SECRET as string;
const JWT_EXPIRES_IN: SignOptions["expiresIn"] = (process.env.JWT_EXPIRES_IN ||
  "24h") as SignOptions["expiresIn"];

// Generate a token when user logs in
export function signToken(payload: { id: string; role: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// Verify a token on every protected request
// Throws an error if token is invalid or expired
export function verifyToken(token: string): { id: string; role: string } {
  return jwt.verify(token, JWT_SECRET) as { id: string; role: string };
}
