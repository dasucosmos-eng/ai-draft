export const dynamic = "force-static";
import { NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
import { stripMarkdown } from '@/lib/utils'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { query, court, year, caseType } = body

    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      )
    }

    const filterContext = [
      court && court !== 'all' ? `Court filter: ${court}` : '',
      year && year !== 'all' ? `Year filter: ${year}` : '',
      caseType && caseType !== 'all' ? `Case type: ${caseType}` : '',
    ]
      .filter(Boolean)
      .join('. ')

    const zai = await ZAI.create()

    const response = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are an expert Indian legal research assistant with deep knowledge of Indian case law, statutes, and legal precedents.

MULTILINGUAL CAPABILITY: You understand queries in ANY language (Telugu, Hindi, Tamil, Kannada, Malayalam, Bengali, Marathi, Urdu, English, etc.). If the query is in a regional language, understand it fully but always respond with English field values.

Provide a structured JSON response:

{
  "results": [
    {
      "title": "Full case title (e.g., Appellant v. Respondent)",
      "court": "Court name (e.g., Supreme Court of India)",
      "year": "Year of judgment",
      "summary": "Detailed summary paragraph of the judgment (3-4 sentences)",
      "keyHoldings": ["Holding 1", "Holding 2", "Holding 3", "Holding 4"],
      "relevance": <number 0-100>,
      "citation": "Standard citation format (e.g., 2024 SCC OnLine SC 1842)"
    }
  ],
  "suggestedArguments": [
    "Argument paragraph 1 based on case law found",
    "Argument paragraph 2..."
  ],
  "relatedPrecedents": [
    { "title": "Case title", "year": "Year", "citation": "Citation" }
  ]
}

Provide 3-5 relevant case results. Make the keyHoldings specific legal propositions. The suggestedArguments should be ready-to-use legal arguments. ${filterContext ? `Filters applied: ${filterContext}.` : ''}

Respond ONLY with valid JSON, no markdown. Do NOT use **, *, #, -, or any markdown formatting in any text field.`,
        },
        {
          role: 'user',
          content: query,
        },
      ],
    })

    const content = response.choices?.[0]?.message?.content || ''

    let researchData
    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content]
      const parsed = JSON.parse(jsonMatch[1] || content)
      researchData = JSON.parse(JSON.stringify(parsed, (_, v) => typeof v === 'string' ? stripMarkdown(v) : v))
    } catch {
      researchData = {
        results: [
          {
            title: 'Research Results Pending',
            court: court === 'all' ? 'Multiple Courts' : court,
            year: year === 'all' ? 'Recent' : year,
            summary: stripMarkdown(content),
            keyHoldings: ['Please refine your search query for more specific results'],
            relevance: 50,
            citation: 'N/A',
          },
        ],
        suggestedArguments: ['Review the research results and refine the query'],
        relatedPrecedents: [],
      }
    }

    return NextResponse.json(researchData)
  } catch (error) {
    console.error('AI Research error:', error)
    return NextResponse.json(
      { error: 'Failed to complete research', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
