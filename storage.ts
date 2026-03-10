import { db } from "./db";
import { legalQueries, type InsertLegalQuery, type LegalQuery } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  getQueries(): Promise<LegalQuery[]>;
  createQuery(query: InsertLegalQuery): Promise<LegalQuery>;
  updateQueryAnalysis(
    id: number,
    analysis: { aiCategory: string; aiExplanation: string; aiSteps: string[] }
  ): Promise<LegalQuery>;
}

export class DatabaseStorage implements IStorage {
  async getQueries(): Promise<LegalQuery[]> {
    return await db.select().from(legalQueries).orderBy(desc(legalQueries.createdAt));
  }

  async createQuery(insertQuery: InsertLegalQuery): Promise<LegalQuery> {
    const [query] = await db.insert(legalQueries).values(insertQuery).returning();
    return query;
  }

  async updateQueryAnalysis(
    id: number,
    analysis: { aiCategory: string; aiExplanation: string; aiSteps: string[] }
  ): Promise<LegalQuery> {
    const [updated] = await db
      .update(legalQueries)
      .set(analysis)
      .where(eq(legalQueries.id, id))
      .returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();
