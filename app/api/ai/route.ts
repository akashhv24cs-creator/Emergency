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
  try {
    const body = await request.json();
    const { description, image_url } = body;

    if (!description) {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 });
    }

    const groq = getGroqClient();
    const completion = await groq.chat.completions.create({
      model: 'llama-3.2-11b-vision-preview',
      messages: [
        {
          role: 'system',
          content: `You are an emergency validation AI. Analyze the description and image URL provided.
Return ONLY valid JSON:
{
  "priority": "Critical | High | Medium",
  "summary": "short explanation",
  "risk_level": "Low | Medium | High",
  "required_volunteers": number,
  "required_resources": [],
  "estimated_people": number,
  "is_fake": boolean,
  "is_verified": boolean,
  "confidence": number (0.0 to 1.0)
}

Validation Rules:
- If image_url is null: is_verified=false, confidence=0.5.
- If image shows an actual emergency (flood, fire, injury) matching text: is_verified=true, is_fake=false, confidence=0.9.
- If image is unrelated (memes, scenery, food) but text says "flood": is_fake=true, is_verified=false, confidence=0.9.
- If text is suspicious but image is valid: trust the image.`,
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: `Description: ${description}` },
            { type: 'image_url', image_url: { url: image_url || '' } }
          ],
        },
      ],
      response_format: { type: 'json_object' },
    });

    const aiResponseContent = completion.choices[0]?.message?.content;
    const parsed = JSON.parse(aiResponseContent || '{}');

    return NextResponse.json({
      ...parsed,
      is_verified: parsed.is_verified || false,
      is_fake: parsed.is_fake || false,
      confidence: parsed.confidence || 0.5
    });
  } catch (error: any) {
    console.error('Groq Vision AI Failed:', error.message);
    
    return NextResponse.json({
      priority: 'Medium',
      summary: 'Emergency reported (Pending Verification)',
      risk_level: 'Low',
      required_volunteers: 4,
      required_resources: ['Basic Aid'],
      estimated_people: 1,
      is_fake: false,
      is_verified: false,
      confidence: 0.3
    });
  }
}
