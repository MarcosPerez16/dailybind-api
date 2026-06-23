import { Router } from "express";
import prisma from "../utils/prisma";
import { authenticate, requireAdmin } from "../middleware/auth";

const router = Router();

//GET /metrics/summary - calculates total sales count and total premium per agent
router.get("/summary", authenticate, async (req, res) => {
  const { month, year } = req.query;
  const now = new Date();
  const targetYear = year ? parseInt(year as string) : now.getFullYear();
  const targetMonth = month ? parseInt(month as string) - 1 : now.getMonth();

  try {
    const results = await prisma.sale.groupBy({
      by: ["agentId"],
      where: {
        isVoided: false,
        date: {
          gte: new Date(targetYear, targetMonth, 1), // first day
          lte: new Date(targetYear, targetMonth + 1, 0), // last day
        },
      },
      _count: {
        id: true, //count the number of sale records
      },
      _sum: {
        premiumAmount: true, //sum up the premiums
      },
    });

    const agentIds = results.map((r) => r.agentId);

    const users = await prisma.user.findMany({
      where: { id: { in: agentIds } },
      select: { id: true, name: true },
    });

    const summary = results.map((result) => {
      const user = users.find((u) => u.id === result.agentId);

      return {
        agentId: result.agentId,
        agentName: user?.name ?? "Unknown",
        totalSales: result._count.id,
        totalPremium: result._sum.premiumAmount,
      };
    });

    res.json(summary);
  } catch {
    res.status(500).json({ message: "Something went wrong" });
  }
});

// GET /metrics/bundles — bundle percentage per agent
router.get("/bundles", authenticate, async (req, res) => {
  const { month, year } = req.query;
  const now = new Date();
  const targetYear = year ? parseInt(year as string) : now.getFullYear();
  const targetMonth = month ? parseInt(month as string) - 1 : now.getMonth();

  try {
    // Query 1 — count ALL auto sales per agent this month
    const totalAutoSales = await prisma.sale.groupBy({
      by: ["agentId"], // one result per agent
      where: {
        isVoided: false,
        date: {
          gte: new Date(targetYear, targetMonth, 1), // first day
          lte: new Date(targetYear, targetMonth + 1, 0), // last day
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
          gte: new Date(targetYear, targetMonth, 1),
          lte: new Date(targetYear, targetMonth + 1, 0),
        },
        policyType: "AUTO",
        isBundled: true, // only bundled entries
      },
      _count: { id: true },
    });

    // fetch agent names for all agents in results
    const agentIds = totalAutoSales.map((r) => r.agentId);
    const users = await prisma.user.findMany({
      where: { id: { in: agentIds } },
      select: { id: true, name: true },
    });

    // Combine both queries to calculate percentage per agent
    const bundlePercentages = totalAutoSales.map((agentTotal) => {
      const bundled = bundledAutoSales.find(
        (b) => b.agentId === agentTotal.agentId,
      );
      // find matching user name
      const user = users.find((u) => u.id === agentTotal.agentId);

      const bundledCount = bundled?._count.id ?? 0; // default to 0 if no bundled sales
      const totalCount = agentTotal._count.id;

      // (bundled / total) * 100 — avoid dividing by zero
      const percentage =
        totalCount > 0
          ? Math.round((bundledCount / totalCount) * 100 * 10) / 10
          : 0;

      return {
        agentId: agentTotal.agentId,
        agentName: user?.name ?? "Unknown", // attach agent name
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

// GET /metrics/pif — paid in full percentage per agent
router.get("/pif", authenticate, async (req, res) => {
  const { month, year } = req.query;
  const now = new Date();
  const targetYear = year ? parseInt(year as string) : now.getFullYear();
  const targetMonth = month ? parseInt(month as string) - 1 : now.getMonth();

  try {
    // Query 1 — count ALL auto sales per agent this month
    const totalPaidInFullSales = await prisma.sale.groupBy({
      by: ["agentId"], // one result per agent
      where: {
        isVoided: false,
        date: {
          gte: new Date(targetYear, targetMonth, 1), // first day
          lte: new Date(targetYear, targetMonth + 1, 0), // last day
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
          gte: new Date(targetYear, targetMonth, 1),
          lte: new Date(targetYear, targetMonth + 1, 0),
        },
        policyType: "AUTO",
        isPaidInFull: true, // only PIF entries
      },
      _count: { id: true },
    });

    // fetch agent names for all agents in results
    const agentIds = totalPaidInFullSales.map((r) => r.agentId);
    const users = await prisma.user.findMany({
      where: { id: { in: agentIds } },
      select: { id: true, name: true },
    });

    // Combine both queries to calculate percentage per agent
    const pifPercentages = totalPaidInFullSales.map((agentTotal) => {
      const pif = paidInFull.find((p) => p.agentId === agentTotal.agentId);
      // find matching user name
      const user = users.find((u) => u.id === agentTotal.agentId);

      const pifCount = pif?._count.id ?? 0; // default to 0 if no PIF sales
      const totalCount = agentTotal._count.id;

      // (pif / total) * 100 — avoid dividing by zero
      const percentage =
        totalCount > 0
          ? Math.round((pifCount / totalCount) * 100 * 10) / 10
          : 0;

      return {
        agentId: agentTotal.agentId,
        agentName: user?.name ?? "Unknown", // attach agent name
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

// GET /metrics/bi-limits — BI limit tier breakdown per agent
router.get("/bi-limits", authenticate, async (req, res) => {
  const { month, year } = req.query;
  const now = new Date();
  const targetYear = year ? parseInt(year as string) : now.getFullYear();
  const targetMonth = month ? parseInt(month as string) - 1 : now.getMonth();

  try {
    // Single query — group by BOTH agentId and biLimit
    // gives one row per agent per tier
    const totalBiLimitSales = await prisma.sale.groupBy({
      by: ["agentId", "biLimit"],
      where: {
        isVoided: false,
        date: {
          gte: new Date(targetYear, targetMonth, 1),
          lte: new Date(targetYear, targetMonth + 1, 0),
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
