import OpenAI from 'openai';
import { config } from '../config/index.js';

let openai: OpenAI | null = null;

function getOpenAI(): OpenAI | null {
  if (!config.openaiApiKey) return null;
  if (!openai) {
    openai = new OpenAI({ apiKey: config.openaiApiKey });
  }
  return openai;
}

export interface AIAnalysisResult {
  summary: string;
  actionItems: { text: string; assigneeHint?: string }[];
  usedAI: boolean;
}

export async function analyzeMeetingTranscript(
  transcript: string,
  meetingTitle: string,
  participantNames: string[]
): Promise<AIAnalysisResult> {
  const client = getOpenAI();

  if (!client || !transcript.trim()) {
    return generateMockAnalysis(transcript, meetingTitle);
  }

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an enterprise meeting assistant. Analyze the transcript and return JSON with:
- summary: concise 2-3 paragraph meeting summary
- actionItems: array of { text, assigneeHint } where assigneeHint matches one of: ${participantNames.join(', ')}

Return ONLY valid JSON, no markdown.`,
        },
        {
          role: 'user',
          content: `Meeting: ${meetingTitle}\n\nTranscript:\n${transcript.slice(0, 12000)}`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('Empty AI response');

    const parsed = JSON.parse(content) as { summary?: string; actionItems?: { text: string; assigneeHint?: string }[] };
    return {
      summary: parsed.summary || 'Meeting summary generated.',
      actionItems: parsed.actionItems || [],
      usedAI: true,
    };
  } catch (error) {
    console.error('OpenAI analysis failed, using mock:', error);
    return generateMockAnalysis(transcript, meetingTitle);
  }
}

function generateMockAnalysis(transcript: string, meetingTitle: string): AIAnalysisResult {
  const lines = transcript.split('\n').filter(Boolean);
  const summary =
    lines.length > 0
      ? `Summary for "${meetingTitle}": The team discussed ${lines.length} key points during the meeting. ` +
        `Main topics included project updates, action planning, and next steps. ` +
        `Participants collaborated on identifying priorities and assigning follow-up tasks.`
      : `Summary for "${meetingTitle}": Meeting concluded with general discussion. No transcript was captured during this session.`;

  const actionItems = lines
    .filter((l) => /action|todo|follow|need to|will|should|assign/i.test(l))
    .slice(0, 5)
    .map((l) => ({ text: l.replace(/^[^:]+:\s*/, '').slice(0, 200) || 'Follow up on discussed item' }));

  if (actionItems.length === 0) {
    actionItems.push(
      { text: 'Review meeting notes and share with team' },
      { text: 'Schedule follow-up meeting if needed' }
    );
  }

  return { summary, actionItems, usedAI: false };
}
