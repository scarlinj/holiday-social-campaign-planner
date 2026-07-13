import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

// Body parser with 10mb limit for images
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Initialize Gemini Client Lazily/Safely
let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// 1. API: Health Check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// 2. API: Generate Campaign
app.post("/api/campaigns/generate", async (req: express.Request, res: express.Response) => {
  try {
    const { holiday, brandName, audience, tone, productType, customContext } = req.body;

    if (!holiday) {
      res.status(400).json({ error: "Holiday/Event name is required." });
      return;
    }

    const ai = getAiClient();

    const prompt = `
      You are an expert Social Media Campaign Strategist. Create a complete social media campaign around the holiday/event "${holiday}" for the brand "${brandName || "a generic brand"}".
      
      Brand context:
      - Target Audience: ${audience || "General consumers"}
      - Tone of Voice: ${tone || "Professional, engaging, and friendly"}
      - Product/Service Category: ${productType || "General products"}
      ${customContext ? `- Additional Context: ${customContext}` : ""}

      Generate the following structured deliverables:
      1. Tailored social media posts for: Instagram, LinkedIn, and X (Twitter) with hashtags and platform-specific styling.
      2. Detailed prompts to generate eye-catching visuals (or AI images) for each post.
      3. A structured campaign planning timeline (e.g. countdown checkpoints like -7 Days, -3 Days, Day Of, +1 Day).
      4. A strategic launching checklist.
    `;

    const systemInstruction = `
      You are a high-performing creative director. You must return a strict JSON payload matching the requested schema.
      Keep content professional, engaging, highly relevant to the specific holiday, and perfectly tailored to the brand's target audience and tone.
      For the visualPrompt fields, write highly detailed, descriptive prompts optimized for AI image generators (describing style, lighting, composition, and subject matter clearly).
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            theme: {
              type: Type.STRING,
              description: "The overarching creative theme or tagline for this campaign."
            },
            posts: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  platform: {
                    type: Type.STRING,
                    description: "The platform name, must be exactly 'Instagram', 'LinkedIn', or 'X (Twitter)'."
                  },
                  content: {
                    type: Type.STRING,
                    description: "The complete post text, incorporating relevant emojis and hashtags, formatted with clean paragraph breaks."
                  },
                  visualPrompt: {
                    type: Type.STRING,
                    description: "Detailed, high-quality prompt for generating a visual image for this post (e.g., 'Flat design watercolor illustration of...')."
                  },
                  visualDescription: {
                    type: Type.STRING,
                    description: "A short, descriptive label of what the image represents (used for alt text)."
                  }
                },
                required: ["platform", "content", "visualPrompt", "visualDescription"]
              }
            },
            timeline: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  timeframe: {
                    type: Type.STRING,
                    description: "The countdown period, e.g. '-7 Days', '-3 Days', 'Day Of', '+1 Day'."
                  },
                  title: {
                    type: Type.STRING,
                    description: "A title for this timeline checkpoint."
                  },
                  task: {
                    type: Type.STRING,
                    description: "The specific actionable task for the social media manager."
                  },
                  objective: {
                    type: Type.STRING,
                    description: "The strategic objective or goal of this step."
                  }
                },
                required: ["timeframe", "title", "task", "objective"]
              }
            },
            checklist: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  phase: { type: Type.STRING }
                },
                required: ["id", "title", "phase"]
              }
            }
          },
          required: ["theme", "posts", "timeline", "checklist"]
        }
      }
    });

    const jsonText = response.text?.trim() || "{}";
    res.json(JSON.parse(jsonText));
  } catch (error: any) {
    console.error("Campaign generation error:", error);
    res.status(500).json({
      error: error.message || "An unexpected error occurred during campaign generation."
    });
  }
});

// 3. API: Generate Image
app.post("/api/images/generate", async (req: express.Request, res: express.Response) => {
  try {
    const { prompt, aspectRatio } = req.body;

    if (!prompt) {
      res.status(400).json({ error: "Prompt is required to generate an image." });
      return;
    }

    const ai = getAiClient();

    // Generate image using gemini-3.1-flash-lite-image as default
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-image",
      contents: {
        parts: [
          {
            text: prompt,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio || "1:1",
        },
      },
    });

    let base64Image = "";
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          base64Image = part.inlineData.data;
          break;
        }
      }
    }

    if (base64Image) {
      res.json({ imageUrl: `data:image/png;base64,${base64Image}` });
    } else {
      throw new Error("No image data returned from Gemini Image API.");
    }
  } catch (error: any) {
    console.error("Image generation error:", error);
    // Graceful fallback to Picsum Photos seed
    const seed = encodeURIComponent(req.body.prompt ? req.body.prompt.substring(0, 30) : "holiday");
    const fallbackUrl = `https://picsum.photos/seed/${seed}/800/800`;
    res.json({
      imageUrl: fallbackUrl,
      warning: "Generating with standard fallback because Gemini Image model limits/permissions were active.",
      details: error.message
    });
  }
});

// 4. Vite Dev Server and Static File Serving Middleware setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
