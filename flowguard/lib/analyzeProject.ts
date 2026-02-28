import { ProjectData } from "./sampleData";
import { AnalysisResult, fallbackAnalysis } from "./scoring";

function buildPrompt(data: ProjectData): string {
  return `You are a senior release manager and project risk analyst.

Analyze the following software project data and detect:
1. Hidden waiting bottlenecks
2. Scope drift patterns
3. Release delay risk

Return ONLY a valid JSON object with this exact schema — no markdown, no explanation:
{
  "delay_risk_score": <number 0-100>,
  "waiting_score": <number 0-100>,
  "scope_drift_score": <number 0-100>,
  "scope_growth_percent": <number>,
  "insights": [<string>, ...],
  "recommendations": [<string>, ...]
}

Project Data:
${JSON.stringify(data, null, 2)}

Respond with JSON only.`;
}

export async function analyzeProject(
  data: ProjectData
): Promise<AnalysisResult & { ai_powered: boolean }> {
  const apiKey = process.env.LLM_API_KEY;

  if (!apiKey) {
    console.log("[FlowGuard] No LLM_API_KEY — using fallback scoring.");
    return { ...fallbackAnalysis(data), ai_powered: false };
  }

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama3-8b-8192",
        messages: [
          {
            role: "user",
            content: buildPrompt(data),
          },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) throw new Error(`Groq API error: ${response.status}`);

    const groqData = await response.json();
    const rawText = groqData.choices?.[0]?.message?.content ?? "";
    const cleaned = rawText.replace(/```json|```/g, "").trim();
    const result: AnalysisResult = JSON.parse(cleaned);

    return { ...result, ai_powered: true };
  } catch (err) {
    console.warn("[FlowGuard] Groq call failed, using fallback:", err);
    return { ...fallbackAnalysis(data), ai_powered: false };
  }
}


