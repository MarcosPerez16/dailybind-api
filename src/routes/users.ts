import { Router } from "express";
import prisma from "../utils/prisma";
import { authenticate } from "../middleware/auth";

const router = Router();

//GET all users route

router.get("/", authenticate, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true },
    });

    res.json(users);
  } catch {
    res.status(500).json({ message: "Something went wrong" });
  }
});

export default router;
