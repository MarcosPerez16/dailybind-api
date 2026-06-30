import { Router } from "express";
import prisma from "../utils/prisma";
import { authenticate, requireAdmin } from "../middleware/auth";
import bcrypt from "bcrypt";

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

//POST /users - route to create new hire accounts

router.post("/", authenticate, requireAdmin, async (req, res) => {
  const { name, email, password, role } = req.body;

  try {
    //hash the password before storing, never plain text
    const passwordHash = await bcrypt.hash(password, 10);

    //create the new user with hashed password
    const newUser = await prisma.user.create({
      data: { name, email, passwordHash, role },
      //never return the password hash to the frontend
      select: { id: true, name: true, email: true, role: true },
    });

    res.status(201).json(newUser);
  } catch {
    res.status(500).json({ message: "Something went wrong" });
  }
});

//PATCH /users/:id/password - ability to password reset

router.patch("/:id/password", authenticate, requireAdmin, async (req, res) => {
  const { newPassword } = req.body;
  const { id } = req.params as { id: string };

  try {
    //hash the password before storing, never plain text
    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: {
        id,
      },
      data: { passwordHash },
    });

    res.json({ message: "Password reset successfully" });
  } catch {
    res.status(500).json({ message: "Something went wrong" });
  }
});

//PATCH /users/:id - update a users name, email, or role

router.patch("/:id", authenticate, requireAdmin, async (req, res) => {
  const { name, email, role } = req.body;
  const { id } = req.params as { id: string };

  try {
    await prisma.user.update({
      where: { id },
      data: { name, email, role },
    });

    res.json({ message: "All fields updated successfully" });
  } catch {
    res.status(500).json({ message: "Something went wrong" });
  }
});

export default router;
