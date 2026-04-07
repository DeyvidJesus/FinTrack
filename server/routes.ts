import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { insertAccountSchema, insertCategorySchema, insertTransactionSchema, insertInvestmentSchema, insertGoalSchema } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // === Accounts ===
  app.get("/api/accounts", (_req, res) => {
    const accounts = storage.getAccounts();
    res.json(accounts);
  });

  app.get("/api/accounts/:id", (req, res) => {
    const account = storage.getAccount(Number(req.params.id));
    if (!account) return res.status(404).json({ error: "Account not found" });
    res.json(account);
  });

  app.post("/api/accounts", (req, res) => {
    const parsed = insertAccountSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
    const account = storage.createAccount(parsed.data);
    res.status(201).json(account);
  });

  app.patch("/api/accounts/:id", (req, res) => {
    const account = storage.updateAccount(Number(req.params.id), req.body);
    if (!account) return res.status(404).json({ error: "Account not found" });
    res.json(account);
  });

  app.delete("/api/accounts/:id", (req, res) => {
    storage.deleteAccount(Number(req.params.id));
    res.status(204).send();
  });

  // === Categories ===
  app.get("/api/categories", (_req, res) => {
    const categories = storage.getCategories();
    res.json(categories);
  });

  app.post("/api/categories", (req, res) => {
    const parsed = insertCategorySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
    const category = storage.createCategory(parsed.data);
    res.status(201).json(category);
  });

  app.delete("/api/categories/:id", (req, res) => {
    storage.deleteCategory(Number(req.params.id));
    res.status(204).send();
  });

  // === Transactions ===
  app.get("/api/transactions", (req, res) => {
    const accountId = req.query.accountId ? Number(req.query.accountId) : undefined;
    const txs = storage.getTransactions(accountId);
    res.json(txs);
  });

  app.post("/api/transactions", (req, res) => {
    const parsed = insertTransactionSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
    const tx = storage.createTransaction(parsed.data);
    res.status(201).json(tx);
  });

  app.patch("/api/transactions/:id", (req, res) => {
    const tx = storage.updateTransaction(Number(req.params.id), req.body);
    if (!tx) return res.status(404).json({ error: "Transaction not found" });
    res.json(tx);
  });

  app.delete("/api/transactions/:id", (req, res) => {
    storage.deleteTransaction(Number(req.params.id));
    res.status(204).send();
  });

  // === Investments ===
  app.get("/api/investments", (req, res) => {
    const accountId = req.query.accountId ? Number(req.query.accountId) : undefined;
    const invs = storage.getInvestments(accountId);
    res.json(invs);
  });

  app.post("/api/investments", (req, res) => {
    const parsed = insertInvestmentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
    const inv = storage.createInvestment(parsed.data);
    res.status(201).json(inv);
  });

  app.patch("/api/investments/:id", (req, res) => {
    const inv = storage.updateInvestment(Number(req.params.id), req.body);
    if (!inv) return res.status(404).json({ error: "Investment not found" });
    res.json(inv);
  });

  app.delete("/api/investments/:id", (req, res) => {
    storage.deleteInvestment(Number(req.params.id));
    res.status(204).send();
  });

  // === Goals ===
  app.get("/api/goals", (req, res) => {
    const accountId = req.query.accountId ? Number(req.query.accountId) : undefined;
    const g = storage.getGoals(accountId);
    res.json(g);
  });

  app.post("/api/goals", (req, res) => {
    const parsed = insertGoalSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
    const goal = storage.createGoal(parsed.data);
    res.status(201).json(goal);
  });

  app.patch("/api/goals/:id", (req, res) => {
    const goal = storage.updateGoal(Number(req.params.id), req.body);
    if (!goal) return res.status(404).json({ error: "Goal not found" });
    res.json(goal);
  });

  app.delete("/api/goals/:id", (req, res) => {
    storage.deleteGoal(Number(req.params.id));
    res.status(204).send();
  });

  // === Dashboard stats ===
  app.get("/api/stats", (_req, res) => {
    const allAccounts = storage.getAccounts();
    const allTransactions = storage.getTransactions();
    const allInvestments = storage.getInvestments();

    const personalAccounts = allAccounts.filter(a => a.type === "personal");
    const companyAccounts = allAccounts.filter(a => a.type === "company");

    const personalBalance = personalAccounts.reduce((sum, a) => sum + a.balance, 0);
    const companyBalance = companyAccounts.reduce((sum, a) => sum + a.balance, 0);

    const totalInvestmentValue = allInvestments.reduce((sum, i) => sum + i.currentValue, 0);
    const totalInvestmentCost = allInvestments.reduce((sum, i) => sum + i.amount, 0);

    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

    const thisMonthTxs = allTransactions.filter(t => t.date >= monthStart);
    const monthIncome = thisMonthTxs.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const monthExpense = thisMonthTxs.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);

    // Monthly trend (last 6 months)
    const monthlyTrend = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mStart = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
      const mEnd = `${d.getFullYear()}-${String(d.getMonth() + 2).padStart(2, "0")}-01`;
      const mTxs = allTransactions.filter(t => t.date >= mStart && t.date < mEnd);
      monthlyTrend.push({
        month: d.toLocaleString("en", { month: "short" }),
        income: mTxs.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0),
        expense: mTxs.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0),
      });
    }

    // Category breakdown for current month expenses
    const allCategories = storage.getCategories();
    const categoryBreakdown = allCategories
      .filter(c => c.type === "expense")
      .map(c => {
        const total = thisMonthTxs
          .filter(t => t.type === "expense" && t.categoryId === c.id)
          .reduce((s, t) => s + t.amount, 0);
        return { name: c.name, value: total };
      })
      .filter(c => c.value > 0);

    res.json({
      personalBalance,
      companyBalance,
      totalBalance: personalBalance + companyBalance,
      totalInvestmentValue,
      investmentReturn: totalInvestmentCost > 0 ? ((totalInvestmentValue - totalInvestmentCost) / totalInvestmentCost) * 100 : 0,
      monthIncome,
      monthExpense,
      monthlyTrend,
      categoryBreakdown,
      recentTransactions: allTransactions.slice(0, 5),
    });
  });

  // Seed default categories
  app.post("/api/seed", (_req, res) => {
    res.json({ seeded: storage.getCategories().length > 0 });
  });

  return httpServer;
}
