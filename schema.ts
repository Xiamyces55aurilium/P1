import { pgTable, text, serial, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const legalQueries = pgTable("legal_queries", {
  id: serial("id").primaryKey(),
  queryText: text("query_text").notNull(),
  language: text("language").notNull().default("en"),
  aiCategory: text("ai_category"),
  aiExplanation: text("ai_explanation"),
  aiSteps: jsonb("ai_steps").$type<string[]>(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertLegalQuerySchema = createInsertSchema(legalQueries).omit({
  id: true,
  createdAt: true,
  aiCategory: true,
  aiExplanation: true,
  aiSteps: true,
});

export type LegalQuery = typeof legalQueries.$inferSelect;
export type InsertLegalQuery = z.infer<typeof insertLegalQuerySchema>;

export type AnalyzeProblemRequest = InsertLegalQuery;
export type AnalyzeProblemResponse = LegalQuery;
