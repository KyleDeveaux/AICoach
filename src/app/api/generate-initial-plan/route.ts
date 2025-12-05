// app/api/generate-initial-plan/route.ts
import { NextResponse } from "next/server";
import { openai } from "../../lib/openai";
import type {
  ClientProfile,
  CallAnswers,
  InitialPlanResponse,
  MacroTargets,
} from "../../lib/types";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const clientProfile = body.clientProfile as ClientProfile | undefined;
    const callAnswers = body.callAnswers as CallAnswers | undefined;
    const macroTargets: MacroTargets | undefined = body.macroTargets;

    if (!clientProfile || !callAnswers) {
      return NextResponse.json(
        { error: "Missing clientProfile or callAnswers in request body" },
        { status: 400 }
      );
    }
    if (!macroTargets || typeof macroTargets.calorieTarget !== "number") {
      return NextResponse.json(
        { error: "Missing or invalid macroTargets.calorieTarget" },
        { status: 400 }
      );
    }

    const systemPrompt = `
You are an empathetic fitness and nutrition coach.

Your job is to:

- Review the client’s profile and first-call answers.
- Use the provided \`macroTargets.calorieTarget\` as the client's daily calories. You MUST return this exact number as \`calorieTarget\` in your JSON. Do NOT invent a different calorie value.
- Summarize the plan back to the client in simple, supportive language.
- Extract and save their main “why” and main past struggles for future accountability.

You are a coach, NOT a doctor. You must not give medical advice. If the client mentions medical conditions, you gently recommend they speak to a healthcare professional before making changes.

OUTPUT FORMAT (IMPORTANT):

Return JSON with the following keys:

- \`planSummary\` (string): a conversational explanation of the plan for the client.
- \`calorieTarget\` (number): MUST match macroTargets.calorieTarget.
- \`workoutsPerWeek\` (number).
- \`workoutSplit\` (array of strings, e.g. ["Full Body A", "Full Body B", "Full Body C"]).
- \`weeklyWorkoutSchedule\` (array of objects, one per workout session, with:
  - \`dayOfWeek\` (string, e.g. "Monday"),
  - \`workoutName\` (string),
  - \`exercises\` (array of objects: { name, sets, reps, rest_seconds, notes })
  ).
- \`stepTarget\` (number, daily steps).
- \`goalWhy\` (string, restating their why in your words).
- \`pastStruggles\` (string).
- \`toneNotes\` (string, how you should talk to this client in the future—e.g., “very gentle,” “likes tough love,” etc.).

When designing \`weeklyWorkoutSchedule\`:

- Use the \`workoutsPerWeek\` value.
- Choose specific days of the week that make sense for the client (e.g., Monday/Wednesday/Friday for 3 days per week) unless the client’s schedule suggests otherwise.
- Each workout should include 5–7 exercises:
  - 3–4 main compound or accessory lifts.
  - 1–2 optional isolation or core exercises.
- Use realistic rep ranges (6–12) and 3–4 sets for most exercises.
- Make sure exercises match the client’s equipment access.

Return ONLY valid JSON. Do not include any extra commentary.
`.trim();

    const userContent = { clientProfile, callAnswers, macroTargets };

    // 👇 Use a model you definitely have access to, like gpt-4o-mini or gpt-4o
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Here is the client data as JSON:\n\n${JSON.stringify(
            userContent,
            null,
            2
          )}`,
        },
      ],
      temperature: 0.6,
      response_format: { type: "json_object" }, // <- ask for strict JSON
    });

    const raw = completion.choices[0]?.message?.content;

    if (!raw) {
      console.error("OpenAI returned no content:", completion);
      return NextResponse.json(
        { error: "No content returned from OpenAI" },
        { status: 500 }
      );
    }

    let parsed: InitialPlanResponse;
    try {
      parsed = JSON.parse(raw) as InitialPlanResponse;
    } catch (err) {
      console.error("Failed to parse LLM JSON:", raw);
      return NextResponse.json(
        {
          error: "Failed to parse LLM JSON",
          raw, // return raw so you can see it in Network tab
        },
        { status: 500 }
      );
    }

    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error("Error in generate-initial-plan:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error?.message ?? String(error),
      },
      { status: 500 }
    );
  }
}
