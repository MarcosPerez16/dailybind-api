import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt";

// Extend Express Request type to include our user payload
declare global {
  namespace Express {
    interface Request {
      user?: { id: string; role: string };
    }
  }
}

// Runs on every protected route — checks the JWT cookie
export function authenticate(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies.token;

  // No cookie found — reject the request
  if (!token) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }

  try {
    // Verify the token and attach the user to the request
    const payload = verifyToken(token);
    req.user = payload;
    next(); // Token is valid — move on to the route handler
  } catch {
    // Token is invalid or expired
    res.status(401).json({ message: "Invalid or expired token" });
  }
}

// Checks if the authenticated user has the required role
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== "ADMIN") {
    res.status(403).json({ message: "Access denied" });
    return;
  }
  next();
}
