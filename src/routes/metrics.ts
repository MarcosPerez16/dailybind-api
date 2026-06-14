import { Router } from "express";
import prisma from "../utils/prisma";
import { authenticate, requireAdmin } from "../middleware/auth";
import { string } from "zod";

const router = Router();

//GET /metrics/summary - calculates total sales count and total premium per agent for the current month

router.get("/summary", authenticate, async (req, res) => {
  const now = new Date();

  try {
    const results = await prisma.sale.groupBy({
      by: ["agentId"],
      where: {
        isVoided: false,
        date: {
          gte: new Date(now.getFullYear(), now.getMonth(), 1), // first day
          lte: new Date(now.getFullYear(), now.getMonth() + 1, 0), // last day
        },
      },
      _count: {
        id: true, //count the number of sale records
      },
      _sum: {
        premiumAmount: true, //sum up the premiums
      },
    });
    res.json(results);
  } catch {
    res.status(500).json({ message: "Something went wrong" });
  }
});

// GET /metrics/bundles — bundle percentage per agent for current month
router.get("/bundles", authenticate, async (req, res) => {
  const now = new Date();

  try {
    // Query 1 — count ALL auto sales per agent this month
    const totalAutoSales = await prisma.sale.groupBy({
      by: ["agentId"], // one result per agent
      where: {
        isVoided: false,
        date: {
          gte: new Date(now.getFullYear(), now.getMonth(), 1), // first day
          lte: new Date(now.getFullYear(), now.getMonth() + 1, 0), // last day
        },
        policyType: "AUTO",
      },
      _count: { id: true }, // count number of sales
    });

    // Query 2 — count only BUNDLED auto sales per agent this month
    const bundledAutoSales = await prisma.sale.groupBy({
      by: ["agentId"],
      where: {
        isVoided: false,
        date: {
          gte: new Date(now.getFullYear(), now.getMonth(), 1),
          lte: new Date(now.getFullYear(), now.getMonth() + 1, 0),
        },
        policyType: "AUTO",
        isBundled: true, // only bundled entries
      },
      _count: { id: true },
    });

    // Combine both queries to calculate percentage per agent
    const bundlePercentages = totalAutoSales.map((agentTotal) => {
      // find matching bundled entry for this agent — undefined if none
      const bundled = bundledAutoSales.find(
        (b) => b.agentId === agentTotal.agentId,
      );

      const bundledCount = bundled?._count.id ?? 0; // default to 0 if no bundled sales
      const totalCount = agentTotal._count.id;

      // (bundled / total) * 100 — avoid dividing by zero
      const percentage =
        totalCount > 0
          ? Math.round((bundledCount / totalCount) * 100 * 10) / 10
          : 0;

      // return one result per agent
      return {
        agentId: agentTotal.agentId,
        bundledCount,
        totalAutoSales: totalCount,
        bundlePercentage: percentage,
      };
    });

    res.json(bundlePercentages);
  } catch {
    res.status(500).json({ message: "Something went wrong" });
  }
});

// GET /metrics/pif — paid in full percentage per agent for current month
router.get("/pif", authenticate, async (req, res) => {
  const now = new Date();

  try {
    // Query 1 — count ALL auto sales per agent this month
    const totalPaidInFullSales = await prisma.sale.groupBy({
      by: ["agentId"], // one result per agent
      where: {
        isVoided: false,
        date: {
          gte: new Date(now.getFullYear(), now.getMonth(), 1), // first day
          lte: new Date(now.getFullYear(), now.getMonth() + 1, 0), // last day
        },
        policyType: "AUTO",
      },
      _count: { id: true }, // count number of sales
    });

    // Query 2 — count only PIF auto sales per agent this month
    const paidInFull = await prisma.sale.groupBy({
      by: ["agentId"],
      where: {
        isVoided: false,
        date: {
          gte: new Date(now.getFullYear(), now.getMonth(), 1),
          lte: new Date(now.getFullYear(), now.getMonth() + 1, 0),
        },
        policyType: "AUTO",
        isPaidInFull: true, // only PIF entries
      },
      _count: { id: true },
    });

    // Combine both queries to calculate percentage per agent
    const pifPercentages = totalPaidInFullSales.map((agentTotal) => {
      // find matching PIF entry for this agent — undefined if none
      const pif = paidInFull.find((p) => p.agentId === agentTotal.agentId);

      const pifCount = pif?._count.id ?? 0; // default to 0 if no PIF sales
      const totalCount = agentTotal._count.id;

      // (pif / total) * 100 — avoid dividing by zero
      const percentage =
        totalCount > 0
          ? Math.round((pifCount / totalCount) * 100 * 10) / 10
          : 0;

      // return one result per agent
      return {
        agentId: agentTotal.agentId,
        pifCount,
        totalAutoSales: totalCount,
        pifPercentage: percentage,
      };
    });

    res.json(pifPercentages);
  } catch {
    res.status(500).json({ message: "Something went wrong" });
  }
});

// GET /metrics/bi-limits — BI limit tier breakdown per agent for current month
router.get("/bi-limits", authenticate, async (req, res) => {
  const now = new Date();

  try {
    // Single query — group by BOTH agentId and biLimit
    // gives one row per agent per tier
    const totalBiLimitSales = await prisma.sale.groupBy({
      by: ["agentId", "biLimit"],
      where: {
        isVoided: false,
        date: {
          gte: new Date(now.getFullYear(), now.getMonth(), 1),
          lte: new Date(now.getFullYear(), now.getMonth() + 1, 0),
        },
        policyType: "AUTO", // BI limits only apply to auto
      },
      _count: { id: true }, // count sales per agent per tier
    });

    // Step 1 — reshape flat array into a nested object
    // from: [{ agentId, biLimit, count }, ...]
    // to:   { agentId: { LIMIT_25_50: 3, LIMIT_50_100: 5 } }
    const agentMap: Record<string, Record<string, number>> = {};

    totalBiLimitSales.forEach((row) => {
      const agentId = row.agentId;
      const biLimit = row.biLimit ?? "UNKNOWN"; // handle null biLimit
      const count = row._count.id;

      // create agent entry if first time seeing this agent
      if (!agentMap[agentId]) {
        agentMap[agentId] = {};
      }

      // store this tier's count under the agent
      agentMap[agentId][biLimit] = count;
    });

    // Step 2 — calculate percentages for each tier per agent
    const biLimitBreakdown = Object.entries(agentMap).map(
      ([agentId, tiers]) => {
        // add up all tier counts to get agent's total auto sales
        const total = Object.values(tiers).reduce(
          (sum, count) => sum + count,
          0,
        );

        // convert each tier count to a percentage of total
        const tierPercentages = Object.entries(tiers).reduce(
          (acc, [tier, count]) => {
            acc[tier] = Math.round((count / total) * 100 * 10) / 10;
            return acc;
          },
          {} as Record<string, number>,
        );

        // return one object per agent with all their tier percentages
        return {
          agentId,
          totalAutoSales: total,
          tiers: tierPercentages,
        };
      },
    );

    res.json(biLimitBreakdown);
  } catch {
    res.status(500).json({ message: "Something went wrong" });
  }
});

// GET /metrics/agent-total/:agentId — Admin only
// Returns total sales count and premium for one agent across any date range
router.get(
  "/agent-total/:agentId",
  authenticate, // must be logged in
  requireAdmin, // must be ADMIN role
  async (req, res) => {
    const { agentId } = req.params as { agentId: string };

    // optional date range from query params e.g. ?startDate=2026-01-01&endDate=2026-04-30
    const { startDate, endDate } = req.query as {
      startDate?: string;
      endDate?: string;
    };

    try {
      // base filter — always applied
      const where: {
        agentId: string;
        isVoided: boolean;
        date?: { gte: Date; lte: Date };
      } = {
        agentId,
        isVoided: false,
      };

      // only add date filter if both dates were provided
      if (startDate && endDate) {
        where.date = {
          gte: new Date(startDate),
          lte: new Date(endDate),
        };
      }

      // aggregate totals for this one agent
      const result = await prisma.sale.aggregate({
        where,
        _count: { id: true }, // total number of sales
        _sum: { premiumAmount: true }, // total dollar amount
      });

      // shape the response — clean and readable for the frontend
      res.json({
        agentId,
        totalSales: result._count.id,
        totalPremium: result._sum.premiumAmount,
        startDate: startDate || "all time",
        endDate: endDate || "all time",
      });
    } catch {
      res.status(500).json({ message: "Something went wrong" });
    }
  },
);

export default router;
