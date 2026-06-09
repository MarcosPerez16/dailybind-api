import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import prisma from "../utils/prisma";
import { signToken } from "../utils/jwt";
import { authenticate } from "../middleware/auth";

const router = Router();

// POST /auth/login — verify credentials and issue JWT cookie
router.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    // Find user by email
    const user = await prisma.user.findUnique({ where: { email } });

    // Generic error — don't reveal whether email exists or not
    if (!user) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    // Compare submitted password against stored hash
    const passwordMatch = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatch) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    // Generate JWT with user id and role
    const token = signToken({ id: user.id, role: user.role });

    // Store token in httpOnly cookie — inaccessible to JavaScript
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
    });

    // Return user info to frontend
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
  } catch {
    res.status(500).json({ message: "Something went wrong" });
  }
});

// POST /auth/logout — clear the cookie
router.post("/logout", (req: Request, res: Response) => {
  res.clearCookie("token");
  res.json({ message: "Logged out successfully" });
});

// GET /auth/me — return current logged in user
router.get("/me", authenticate, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      // Never send the password hash to the frontend
      select: { id: true, name: true, email: true, role: true },
    });
    res.json(user);
  } catch {
    res.status(500).json({ message: "Something went wrong" });
  }
});

export default router;
