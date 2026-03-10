import type { Express } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.get(api.queries.list.path, async (req, res) => {
    try {
      const queries = await storage.getQueries();
      res.json(queries);
    } catch (error) {
      console.error("Error fetching queries:", error);
      res.status(500).json({ message: "Failed to fetch queries" });
    }
  });

  app.post(api.queries.analyze.path, async (req, res) => {
    try {
      const input = api.queries.analyze.input.parse(req.body);
      
      // Save the initial query
      const queryRecord = await storage.createQuery(input);

      // Define the AI prompt
      const systemPrompt = `You are an AI Legal Rights Navigator for citizens.
The user will describe a legal problem in natural language.
You need to identify the legal category, provide a simple legal explanation, and suggest 3-5 actionable steps to take.

Respond with ONLY a JSON object containing these keys:
- "category": A string (e.g., "🏠 Tenant Rights (Rent Control)", "👷 Worker Rights", "🛒 Consumer Rights")
- "explanation": A string explaining their rights simply.
- "steps": An array of strings, each being a clear, actionable step.`;

      // Call OpenAI AI Integration
      const response = await openai.chat.completions.create({
        model: "gpt-5.1",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Language preference: ${input.language}. Problem: ${input.queryText}` }
        ],
        response_format: { type: "json_object" }
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("Failed to get a response from AI");
      }

      const parsed = JSON.parse(content);
      
      // Update the record with the AI's analysis
      const updatedQuery = await storage.updateQueryAnalysis(queryRecord.id, {
        aiCategory: parsed.category || "⚖️ General Legal Help",
        aiExplanation: parsed.explanation || "Please consult a legal professional.",
        aiSteps: parsed.steps || ["Visit the nearest Legal Aid Center."]
      });

      res.status(200).json(updatedQuery);
    } catch (err) {
      console.error("Error in analyze route:", err);
      if (err instanceof z.ZodError) {
        res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      } else {
        res.status(500).json({ message: "Internal server error during analysis." });
      }
    }
  });

  return httpServer;
}

// Seed the database with a sample query
async function seedDatabase() {
  try {
    const existing = await storage.getQueries();
    if (existing.length === 0) {
      const q = await storage.createQuery({
        queryText: "My landlord is not returning my deposit.",
        language: "en"
      });
      await storage.updateQueryAnalysis(q.id, {
        aiCategory: "🏠 Tenant Rights (Rent Control)",
        aiExplanation: "Under local Rent Control laws, a landlord cannot withhold a security deposit without providing a list of specific damages.",
        aiSteps: [
          "Send a formal written notice via WhatsApp or Speed Post.",
          "Keep proof of all rent receipts.",
          "Approach the Rent Controller office if they don't reply in 15 days."
        ]
      });
    }
  } catch (error) {
    console.error("Failed to seed database:", error);
  }
}

// Ensure the seed function runs
seedDatabase().catch(console.error);