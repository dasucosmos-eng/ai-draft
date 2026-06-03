export const dynamic = "force-static";
import { NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
import { stripMarkdown } from '@/lib/utils'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { documentContent } = body

    if (!documentContent) {
      return NextResponse.json(
        { error: 'Document content is required' },
        { status: 400 }
      )
    }

    const zai = await ZAI.create()

    const response = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are an expert legal document analyzer for Indian law with deep knowledge of multilingual legal documents.

MULTILINGUAL CAPABILITY: You MUST analyze documents in ANY language including Telugu (తెలుగు), Tamil (தமிழ்), Hindi (हिन्दी), Kannada (ಕನ್ನಡ), Malayalam (മലയാളം), Bengali (বাংলা), Marathi (मराठी), Urdu (اردو), and English. Documents may contain mixed scripts. Extract and analyze content regardless of language.

Analyze the given document and provide a structured JSON response:

{
  "summary": "Concise professional summary of the document (2-3 paragraphs, in English)",
  "keyClauses": ["Key legal clause/provision 1", "Key legal clause/provision 2"],
  "riskPoints": ["Risk point or red flag 1", "Risk point 2"],
  "missingElements": ["Missing element 1", "Missing element 2"],
  "deadlines": ["Deadline or time-sensitive date 1", "Deadline 2"],
  "parties": [{"role": "Role description", "name": "Party name (preserve original script)"}],
  "suggestedActions": ["Recommended action 1", "Recommended action 2"],
  "documentLanguage": "Detected language(s) of the document (e.g., Telugu, Hindi, Mixed Telugu-English)"
}

Respond ONLY with valid JSON, no markdown or explanation. Do NOT use **, *, #, -, or any markdown formatting in any text field.`,
        },
        {
          role: 'user',
          content: `Analyze this legal document:\n\n${documentContent}`,
        },
      ],
    })

    const content = response.choices?.[0]?.message?.content || ''

    let analysis
    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content]
      const parsed = JSON.parse(jsonMatch[1] || content)
      analysis = typeof parsed === 'object'
        ? JSON.parse(JSON.stringify(parsed, (_, v) => typeof v === 'string' ? stripMarkdown(v) : v))
        : parsed
    } catch {
      analysis = {
        summary: stripMarkdown(content),
        keyClauses: ['Document received for analysis'],
        riskPoints: ['Automated extraction could not parse structured data'],
        missingElements: ['Review document manually for complete analysis'],
        deadlines: [],
        parties: [{ role: 'Unknown', name: 'Parties extraction pending manual review' }],
        suggestedActions: ['Review document thoroughly and consult with experts'],
        documentLanguage: 'Auto-detected',
      }
    }

    return NextResponse.json(analysis)
  } catch (error) {
    console.error('AI Document Analysis error:', error)
    return NextResponse.json(
      { error: 'Failed to analyze document', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
