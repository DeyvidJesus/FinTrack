import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date");
const accountTypeSchema = z.enum(["personal", "company"]);
const categoryTypeSchema = z.enum(["income", "expense"]);
const transactionTypeSchema = z.enum(["income", "expense", "transfer"]);
const investmentTypeSchema = z.enum(["stocks", "crypto", "bonds", "real_estate", "other"]);

// Accounts (personal or company)
export const accounts = sqliteTable("accounts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  type: text("type").notNull(), // "personal" | "company"
  currency: text("currency").notNull().default("BRL"),
  balance: real("balance").notNull().default(0),
  color: text("color").notNull().default("#4F98A3"),
});

export const insertAccountSchema = createInsertSchema(accounts, {
  name: (schema) => schema.trim().min(1, "Account name is required"),
  type: () => accountTypeSchema,
  currency: (schema) => schema.trim().length(3, "Currency must be a 3-letter code"),
  balance: () => z.number().finite(),
  color: (schema) => schema.trim().min(4, "Color is required"),
}).omit({ id: true });
export type InsertAccount = z.infer<typeof insertAccountSchema>;
export type Account = typeof accounts.$inferSelect;

// Categories
export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  icon: text("icon").notNull().default("circle"),
  type: text("type").notNull(), // "income" | "expense"
});

export const insertCategorySchema = createInsertSchema(categories, {
  name: (schema) => schema.trim().min(1, "Category name is required"),
  icon: (schema) => schema.trim().min(1, "Category icon is required"),
  type: () => categoryTypeSchema,
}).omit({ id: true });
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;

// Transactions
export const transactions = sqliteTable("transactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  description: text("description").notNull(),
  amount: real("amount").notNull(),
  type: text("type").notNull(), // "income" | "expense" | "transfer"
  date: text("date").notNull(),
  accountId: integer("account_id").notNull(),
  categoryId: integer("category_id"),
  notes: text("notes"),
});

export const insertTransactionSchema = createInsertSchema(transactions, {
  description: (schema) => schema.trim().min(1, "Description is required"),
  amount: () => z.number().positive("Amount must be greater than zero"),
  type: () => transactionTypeSchema,
  date: () => isoDateSchema,
  accountId: () => z.number().int().positive("Account is required"),
  categoryId: () => z.number().int().positive().nullable(),
  notes: () => z.string().trim().max(500).nullable(),
}).omit({ id: true });
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;

// Investments
export const investments = sqliteTable("investments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  type: text("type").notNull(), // "stocks" | "crypto" | "bonds" | "real_estate" | "other"
  amount: real("amount").notNull(),
  currentValue: real("current_value").notNull(),
  purchaseDate: text("purchase_date").notNull(),
  accountId: integer("account_id").notNull(),
  notes: text("notes"),
});

export const insertInvestmentSchema = createInsertSchema(investments, {
  name: (schema) => schema.trim().min(1, "Investment name is required"),
  type: () => investmentTypeSchema,
  amount: () => z.number().positive("Cost basis must be greater than zero"),
  currentValue: () => z.number().nonnegative("Current value cannot be negative"),
  purchaseDate: () => isoDateSchema,
  accountId: () => z.number().int().positive("Account is required"),
  notes: () => z.string().trim().max(500).nullable(),
}).omit({ id: true });
export type InsertInvestment = z.infer<typeof insertInvestmentSchema>;
export type Investment = typeof investments.$inferSelect;

// Goals
export const goals = sqliteTable("goals", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  targetAmount: real("target_amount").notNull(),
  currentAmount: real("current_amount").notNull().default(0),
  deadline: text("deadline"),
  accountId: integer("account_id").notNull(),
});

export const insertGoalSchema = createInsertSchema(goals, {
  name: (schema) => schema.trim().min(1, "Goal name is required"),
  targetAmount: () => z.number().positive("Target amount must be greater than zero"),
  currentAmount: () => z.number().nonnegative("Current amount cannot be negative"),
  deadline: () => isoDateSchema.nullable(),
  accountId: () => z.number().int().positive("Account is required"),
}).omit({ id: true });
export type InsertGoal = z.infer<typeof insertGoalSchema>;
export type Goal = typeof goals.$inferSelect;

// Daily Entries (Monthly tracking matrix)
const categoryNameSchema = z.enum([
  "renda",
  "contribuicao",
  "impostos_taxas",
  "moradia",
  "alimentacao",
  "transporte",
  "seguros",
  "dividas",
  "lazer_eventos",
  "vestuario",
  "investimento",
  "saude",
  "educacao",
  "cuidados_pessoais",
  "comunicacao",
  "manutencao",
  "diversos"
]);

export const dailyEntries = sqliteTable("daily_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  accountId: integer("account_id").notNull(),
  year: integer("year").notNull(),
  month: integer("month").notNull(), // 1-12
  day: integer("day").notNull(), // 1-31
  category: text("category").notNull(), // One of the category names from enum
  amount: real("amount").notNull(), // Positive for income, negative for expenses
  notes: text("notes"),
});

export const insertDailyEntrySchema = createInsertSchema(dailyEntries, {
  accountId: () => z.number().int().positive("Account is required"),
  year: () => z.number().int().min(2000).max(2100),
  month: () => z.number().int().min(1).max(12),
  day: () => z.number().int().min(1).max(31),
  category: () => categoryNameSchema,
  amount: () => z.number().finite(),
  notes: () => z.string().trim().max(500).nullable(),
}).omit({ id: true });
export type InsertDailyEntry = z.infer<typeof insertDailyEntrySchema>;
export type DailyEntry = typeof dailyEntries.$inferSelect;

// Category display configuration
export const categoryConfig = {
  renda: { label: "Renda", type: "income" },
  contribuicao: { label: "Contribuição", type: "expense" },
  impostos_taxas: { label: "Impostos e Taxas", type: "expense" },
  moradia: { label: "Moradia", type: "expense" },
  alimentacao: { label: "Alimentação", type: "expense" },
  transporte: { label: "Transporte", type: "expense" },
  seguros: { label: "Seguros", type: "expense" },
  dividas: { label: "Dívidas", type: "expense" },
  lazer_eventos: { label: "Lazer e Eventos", type: "expense" },
  vestuario: { label: "Vestuário", type: "expense" },
  investimento: { label: "Investimento", type: "expense" },
  saude: { label: "Saúde", type: "expense" },
  educacao: { label: "Educação", type: "expense" },
  cuidados_pessoais: { label: "Cuidados Pessoais", type: "expense" },
  comunicacao: { label: "Comunicação", type: "expense" },
  manutencao: { label: "Manutenção", type: "expense" },
  diversos: { label: "Diversos", type: "expense" },
} as const;
