import {
  type Account, type InsertAccount, accounts,
  type Category, type InsertCategory, categories,
  type Transaction, type InsertTransaction, transactions,
  type Investment, type InsertInvestment, investments,
  type Goal, type InsertGoal, goals,
  type DailyEntry, type InsertDailyEntry, dailyEntries,
} from "@shared/schema";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, desc, and } from "drizzle-orm";

const sqlite = new Database("data.db");
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite);

const DEFAULT_CATEGORIES: InsertCategory[] = [
  { name: "Salary", icon: "banknote", type: "income" },
  { name: "Freelance", icon: "laptop", type: "income" },
  { name: "Investment Return", icon: "trending-up", type: "income" },
  { name: "Other Income", icon: "plus-circle", type: "income" },
  { name: "Food & Dining", icon: "utensils", type: "expense" },
  { name: "Housing", icon: "home", type: "expense" },
  { name: "Transportation", icon: "car", type: "expense" },
  { name: "Utilities", icon: "zap", type: "expense" },
  { name: "Entertainment", icon: "film", type: "expense" },
  { name: "Shopping", icon: "shopping-bag", type: "expense" },
  { name: "Health", icon: "heart", type: "expense" },
  { name: "Education", icon: "book-open", type: "expense" },
  { name: "Subscriptions", icon: "repeat", type: "expense" },
  { name: "Other Expense", icon: "minus-circle", type: "expense" },
];

function ensureSchema() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      currency TEXT NOT NULL DEFAULT 'BRL',
      balance REAL NOT NULL DEFAULT 0,
      color TEXT NOT NULL DEFAULT '#4F98A3'
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      icon TEXT NOT NULL DEFAULT 'circle',
      type TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      type TEXT NOT NULL,
      date TEXT NOT NULL,
      account_id INTEGER NOT NULL,
      category_id INTEGER,
      notes TEXT,
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS investments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      current_value REAL NOT NULL,
      purchase_date TEXT NOT NULL,
      account_id INTEGER NOT NULL,
      notes TEXT,
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      target_amount REAL NOT NULL,
      current_amount REAL NOT NULL DEFAULT 0,
      deadline TEXT,
      account_id INTEGER NOT NULL,
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS daily_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER NOT NULL,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      day INTEGER NOT NULL,
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      notes TEXT,
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_daily_entries_period ON daily_entries(account_id, year, month);
  `);
}

function seedDefaultCategories() {
  const existingCategoryCount = sqlite.prepare("SELECT COUNT(*) as count FROM categories").get() as { count: number };
  if (existingCategoryCount.count === 0) {
    const insertCategory = sqlite.prepare("INSERT INTO categories (name, icon, type) VALUES (?, ?, ?)");
    const transaction = sqlite.transaction((items: InsertCategory[]) => {
      for (const item of items) {
        insertCategory.run(item.name, item.icon, item.type);
      }
    });

    transaction(DEFAULT_CATEGORIES);
  }
}

function getTransactionDelta(type: Transaction["type"], amount: number) {
  if (type === "income") return amount;
  if (type === "expense") return -amount;
  return 0;
}

ensureSchema();
seedDefaultCategories();

export interface IStorage {
  // Accounts
  getAccounts(): Account[];
  getAccount(id: number): Account | undefined;
  createAccount(data: InsertAccount): Account;
  updateAccount(id: number, data: Partial<InsertAccount>): Account | undefined;
  deleteAccount(id: number): void;

  // Categories
  getCategories(): Category[];
  createCategory(data: InsertCategory): Category;
  deleteCategory(id: number): void;

  // Transactions
  getTransactions(accountId?: number): Transaction[];
  getTransaction(id: number): Transaction | undefined;
  createTransaction(data: InsertTransaction): Transaction;
  updateTransaction(id: number, data: Partial<InsertTransaction>): Transaction | undefined;
  deleteTransaction(id: number): void;

  // Investments
  getInvestments(accountId?: number): Investment[];
  getInvestment(id: number): Investment | undefined;
  createInvestment(data: InsertInvestment): Investment;
  updateInvestment(id: number, data: Partial<InsertInvestment>): Investment | undefined;
  deleteInvestment(id: number): void;

  // Goals
  getGoals(accountId?: number): Goal[];
  createGoal(data: InsertGoal): Goal;
  updateGoal(id: number, data: Partial<InsertGoal>): Goal | undefined;
  deleteGoal(id: number): void;

  // Daily Entries
  getDailyEntries(accountId: number, year: number, month: number): DailyEntry[];
  getDailyEntry(id: number): DailyEntry | undefined;
  createDailyEntry(data: InsertDailyEntry): DailyEntry;
  updateDailyEntry(id: number, data: Partial<InsertDailyEntry>): DailyEntry | undefined;
  deleteDailyEntry(id: number): void;
  upsertDailyEntry(accountId: number, year: number, month: number, day: number, category: string, amount: number, notes?: string | null): DailyEntry;
}

export class DatabaseStorage implements IStorage {
  private adjustAccountBalance(accountId: number, delta: number) {
    if (!delta) return;
    const account = this.getAccount(accountId);
    if (!account) return;

    db.update(accounts)
      .set({ balance: account.balance + delta })
      .where(eq(accounts.id, accountId))
      .run();
  }

  // Accounts
  getAccounts(): Account[] {
    return db.select().from(accounts).all();
  }
  getAccount(id: number): Account | undefined {
    return db.select().from(accounts).where(eq(accounts.id, id)).get();
  }
  createAccount(data: InsertAccount): Account {
    return db.insert(accounts).values(data).returning().get();
  }
  updateAccount(id: number, data: Partial<InsertAccount>): Account | undefined {
    return db.update(accounts).set(data).where(eq(accounts.id, id)).returning().get();
  }
  deleteAccount(id: number): void {
    db.delete(transactions).where(eq(transactions.accountId, id)).run();
    db.delete(investments).where(eq(investments.accountId, id)).run();
    db.delete(goals).where(eq(goals.accountId, id)).run();
    db.delete(accounts).where(eq(accounts.id, id)).run();
  }

  // Categories
  getCategories(): Category[] {
    return db.select().from(categories).all();
  }
  createCategory(data: InsertCategory): Category {
    return db.insert(categories).values(data).returning().get();
  }
  deleteCategory(id: number): void {
    db.delete(categories).where(eq(categories.id, id)).run();
  }

  // Transactions
  getTransactions(accountId?: number): Transaction[] {
    if (accountId) {
      return db.select().from(transactions).where(eq(transactions.accountId, accountId)).orderBy(desc(transactions.date)).all();
    }
    return db.select().from(transactions).orderBy(desc(transactions.date)).all();
  }
  getTransaction(id: number): Transaction | undefined {
    return db.select().from(transactions).where(eq(transactions.id, id)).get();
  }
  createTransaction(data: InsertTransaction): Transaction {
    const tx = db.insert(transactions).values(data).returning().get();
    this.adjustAccountBalance(data.accountId, getTransactionDelta(data.type, data.amount));
    return tx;
  }
  updateTransaction(id: number, data: Partial<InsertTransaction>): Transaction | undefined {
    const existing = this.getTransaction(id);
    if (!existing) return undefined;

    const updated = db.update(transactions).set(data).where(eq(transactions.id, id)).returning().get();
    if (!updated) return undefined;

    this.adjustAccountBalance(existing.accountId, -getTransactionDelta(existing.type, existing.amount));
    this.adjustAccountBalance(updated.accountId, getTransactionDelta(updated.type, updated.amount));

    return updated;
  }
  deleteTransaction(id: number): void {
    const tx = this.getTransaction(id);
    if (tx) {
      this.adjustAccountBalance(tx.accountId, -getTransactionDelta(tx.type, tx.amount));
    }
    db.delete(transactions).where(eq(transactions.id, id)).run();
  }

  // Investments
  getInvestments(accountId?: number): Investment[] {
    if (accountId) {
      return db.select().from(investments).where(eq(investments.accountId, accountId)).all();
    }
    return db.select().from(investments).all();
  }
  getInvestment(id: number): Investment | undefined {
    return db.select().from(investments).where(eq(investments.id, id)).get();
  }
  createInvestment(data: InsertInvestment): Investment {
    return db.insert(investments).values(data).returning().get();
  }
  updateInvestment(id: number, data: Partial<InsertInvestment>): Investment | undefined {
    return db.update(investments).set(data).where(eq(investments.id, id)).returning().get();
  }
  deleteInvestment(id: number): void {
    db.delete(investments).where(eq(investments.id, id)).run();
  }

  // Goals
  getGoals(accountId?: number): Goal[] {
    if (accountId) {
      return db.select().from(goals).where(eq(goals.accountId, accountId)).all();
    }
    return db.select().from(goals).all();
  }
  createGoal(data: InsertGoal): Goal {
    return db.insert(goals).values(data).returning().get();
  }
  updateGoal(id: number, data: Partial<InsertGoal>): Goal | undefined {
    return db.update(goals).set(data).where(eq(goals.id, id)).returning().get();
  }
  deleteGoal(id: number): void {
    db.delete(goals).where(eq(goals.id, id)).run();
  }

  // Daily Entries
  getDailyEntries(accountId: number, year: number, month: number): DailyEntry[] {
    return db.select()
      .from(dailyEntries)
      .where(
        and(
          eq(dailyEntries.accountId, accountId),
          eq(dailyEntries.year, year),
          eq(dailyEntries.month, month)
        )
      )
      .all();
  }

  getDailyEntry(id: number): DailyEntry | undefined {
    return db.select().from(dailyEntries).where(eq(dailyEntries.id, id)).get();
  }

  createDailyEntry(data: InsertDailyEntry): DailyEntry {
    return db.insert(dailyEntries).values(data).returning().get();
  }

  updateDailyEntry(id: number, data: Partial<InsertDailyEntry>): DailyEntry | undefined {
    return db.update(dailyEntries).set(data).where(eq(dailyEntries.id, id)).returning().get();
  }

  deleteDailyEntry(id: number): void {
    db.delete(dailyEntries).where(eq(dailyEntries.id, id)).run();
  }

  upsertDailyEntry(accountId: number, year: number, month: number, day: number, category: string, amount: number, notes?: string | null): DailyEntry {
    // Find existing entry
    const existing = db.select()
      .from(dailyEntries)
      .where(
        and(
          eq(dailyEntries.accountId, accountId),
          eq(dailyEntries.year, year),
          eq(dailyEntries.month, month),
          eq(dailyEntries.day, day),
          eq(dailyEntries.category, category)
        )
      )
      .get();

    if (existing) {
      // Update existing
      return db.update(dailyEntries)
        .set({ amount, notes })
        .where(eq(dailyEntries.id, existing.id))
        .returning()
        .get()!;
    } else {
      // Insert new
      return db.insert(dailyEntries)
        .values({ accountId, year, month, day, category, amount, notes })
        .returning()
        .get();
    }
  }
}

export const storage = new DatabaseStorage();
