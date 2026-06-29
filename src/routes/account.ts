import { Router } from "express";
import prisma from "../utils/prisma";
import { authenticate } from "../middleware/auth";
import bcrypt from "bcrypt";

const router = Router();

// PATCH /account/email: logged in user updates their own email
router.patch("/email", authenticate, async (req, res) => {
  const { email } = req.body;

  try {
    // find and update by the logged in user's id: no params needed
    const updated = await prisma.user.update({
      where: { id: req.user!.id },
      data: { email },
      select: { id: true, name: true, email: true, role: true }, // never return passwordHash
    });

    res.json(updated);
  } catch {
    res.status(500).json({ message: "Something went wrong" });
  }
});

// PATCH /account/password: logged in user changes their own password
router.patch("/password", authenticate, async (req, res) => {
  const { currentPassword, newPassword } = req.body; // field names must match the frontend form

  try {
    // fetch the current hash so we can verify the old password
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { passwordHash: true },
    });

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    // confirm the current password is correct before allowing the change
    const passwordMatch = await bcrypt.compare(
      currentPassword,
      user.passwordHash,
    );

    if (!passwordMatch) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    // hash the new password before storing: never store plain text
    const newHashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: req.user!.id },
      data: { passwordHash: newHashedPassword },
    });

    res.json({ message: "Password updated successfully" });
  } catch {
    res.status(500).json({ message: "Something went wrong" });
  }
});

export default router;
