import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

function getGroqClient() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY environment variable is missing');
  }
  return new Groq({ apiKey });
}

export async function POST(request: Request) {
  let description = '';
  try {
    const body = await request.json();
    description = body.description;
    const image_url = body.image_url;

    if (!description || typeof description !== 'string') {
      return NextResponse.json({ error: 'Valid description string is required' }, { status: 400 });
    }

    const groq = getGroqClient();
    const completion = await groq.chat.completions.create({
      model: 'llama-3.2-11b-vision-preview',
      messages: [
        {
          role: 'system',
          content: `You are an emergency response AI.

Analyze the user description carefully and extract EXACT needs.

Rules:

* If user mentions 'food', 'hungry', 'water', 'drinking':
  → required_resources = ['Food', 'Water']

* If user mentions 'injury', 'bleeding', 'medical':
  → required_resources = ['First Aid Kit', 'Medical Help']

* If user mentions 'trapped', 'collapsed', 'rescue':
  → required_resources = ['Rescue Team', 'Equipment']

* If number of people mentioned (e.g. '10 people'):
  → extract estimated_people correctly

* DO NOT guess unrelated resources

* DO NOT add generic items like 'Basic Aid' unless explicitly needed

Return ONLY JSON:

{
"category": "food | medical | rescue",
"priority": "Critical | High | Medium",
"summary": "clear short explanation",
"required_resources": [],
"estimated_people": number,
"risk_level": "Low | Medium | High",
"required_volunteers": 4,
"is_fake": false,
"is_verified": true,
"confidence": 0.9
}`,
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: `Description: ${description}` },
            ...(image_url ? [{ type: 'image_url' as const, image_url: { url: image_url } }] : [])
          ],
        },
      ],
      response_format: { type: 'json_object' },
    });

    let aiResponseContent = completion.choices[0]?.message?.content || '{}';
    // Clean markdown code blocks if the model wrapped the JSON
    aiResponseContent = aiResponseContent.replace(/```json\n?|\n?```/g, '').trim();

    const aiData = JSON.parse(aiResponseContent);

    // HARD VALIDATION (CRITICAL FIX)
    const desc = description.toLowerCase();

    // FOOD CASE
    if (desc.includes("food") || desc.includes("water") || desc.includes("hungry")) {
      aiData.required_resources = ["Food", "Water"];
      aiData.category = "food";
    }
    // MEDICAL CASE
    else if (desc.includes("injured") || desc.includes("blood") || desc.includes("medical")) {
      aiData.required_resources = ["First Aid Kit", "Medical Help"];
      aiData.category = "medical";
    }
    // RESCUE CASE
    else if (desc.includes("trapped") || desc.includes("collapse") || desc.includes("rescue")) {
      aiData.required_resources = ["Rescue Team", "Equipment"];
      aiData.category = "rescue";
    }

    // FAILSAFE DEFAULT
    if (!aiData.required_resources || aiData.required_resources.length === 0) {
      aiData.required_resources = ["General Assistance"];
    }

    console.log("AI FINAL OUTPUT:", aiData);

    return NextResponse.json({
      ...aiData,
      is_verified: aiData.is_verified || false,
      is_fake: aiData.is_fake || false,
      confidence: aiData.confidence || 0.5
    });
  } catch (error: any) {
    console.error('Groq Vision AI Failed:', error.message);

    // Fallback logic
    const lowerDesc = description.toLowerCase();
    let fallbackResources: string[] = [];
    let fallbackCategory = 'rescue';

    if (lowerDesc.includes('food') || lowerDesc.includes('water') || lowerDesc.includes('hungry') || lowerDesc.includes('drinking')) {
      fallbackResources = ['Food', 'Water'];
      fallbackCategory = 'food';
    } else if (lowerDesc.includes('injury') || lowerDesc.includes('bleeding') || lowerDesc.includes('medical')) {
      fallbackResources = ['First Aid Kit', 'Medical Help'];
      fallbackCategory = 'medical';
    } else if (lowerDesc.includes('trapped') || lowerDesc.includes('collapsed') || lowerDesc.includes('rescue')) {
      fallbackResources = ['Rescue Team', 'Equipment'];
      fallbackCategory = 'rescue';
    }

    // Attempt to extract numbers for estimated people
    const numberMatch = lowerDesc.match(/(\d+)\s*people/);
    const estimated_people = numberMatch ? parseInt(numberMatch[1], 10) : 1;

    return NextResponse.json({
      category: fallbackCategory,
      priority: 'Medium',
      summary: 'Emergency reported (Pending Verification)',
      risk_level: 'Low',
      required_volunteers: 4,
      required_resources: fallbackResources,
      estimated_people: estimated_people,
      is_fake: false,
      is_verified: false,
      confidence: 0.3
    });
  }
}
