import { Router } from "express";
import prisma from "../utils/prisma";
import { authenticate } from "../middleware/auth";

const router = Router();

// POST /sales — create a new sale entry for any agent
router.post("/", authenticate, async (req, res) => {
  const {
    agentId,
    date,
    clientName,
    policyNumber,
    policyType,
    biLimit,
    premiumAmount,
    isBundled,
    bundledWith,
    isPaidInFull,
    notes,
  } = req.body;

  try {
    const sale = await prisma.sale.create({
      data: {
        agentId,
        enteredById: req.user!.id, // logged in user — tracks courtesy binds
        date: date ? new Date(date) : new Date(), // default to today
        clientName,
        policyNumber,
        policyType,
        biLimit,
        premiumAmount,
        isBundled,
        bundledWith,
        isPaidInFull,
        notes,
      },
    });

    res.status(201).json(sale);
  } catch {
    res.status(500).json({ message: "Something went wrong" });
  }
});

//GET /sales - fetch all non voided sales

router.get("/", authenticate, async (req, res) => {
  const { month, year } = req.query;
  const now = new Date();
  const targetYear = year ? parseInt(year as string) : now.getFullYear();
  const targetMonth = month ? parseInt(month as string) - 1 : now.getMonth();

  try {
    const sales = await prisma.sale.findMany({
      where: {
        isVoided: false,
        date: {
          gte: new Date(targetYear, targetMonth, 1),
          lte: new Date(targetYear, targetMonth + 1, 0),
        },
      },
      orderBy: {
        date: "desc",
      },
    });

    res.json(sales);
  } catch {
    res.status(500).json({ message: "Something went wrong" });
  }
});

//GET sales for a specific agent

router.get("/agent/:id", authenticate, async (req, res) => {
  const { id } = req.params as { id: string };
  const now = new Date();

  try {
    const agentSales = await prisma.sale.findMany({
      where: {
        isVoided: false,
        agentId: id,
        date: {
          gte: new Date(now.getFullYear(), now.getMonth(), 1),
          lte: new Date(now.getFullYear(), now.getMonth() + 1, 0),
        },
      },
    });
    res.json(agentSales);
  } catch {
    res.status(500).json({ message: "Something went wrong" });
  }
});

//PATCH update an existing entry

router.patch("/:id", authenticate, async (req, res) => {
  const { id } = req.params as { id: string };

  try {
    const entry = await prisma.sale.update({
      where: { id },
      data: req.body,
    });
    res.json(entry);
  } catch {
    res.status(500).json({ message: "Something went wrong" });
  }
});

//DELETE - implementing a soft delete (voiding) in case the wrong entry is deleted we have a trail

router.delete("/:id", authenticate, async (req, res) => {
  const { id } = req.params as { id: string };

  try {
    const deletedEntry = await prisma.sale.update({
      where: { id },
      data: { isVoided: true },
    });
    res.json(deletedEntry);
  } catch {
    res.status(500).json({ message: "Something went wrong" });
  }
});

export default router;
