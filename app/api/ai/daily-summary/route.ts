import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getOpenAIClient, getAIConfig, anonymizeEmail } from '@/lib/ai'

export async function POST(request: NextRequest) {
  try {
    const { roomId, date } = await request.json()

    if (!roomId) {
      return NextResponse.json(
        { ok: false, error: 'Room ID is required' },
        { status: 400 }
      )
    }

    const supabase = createServerSupabaseClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { ok: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Verify user is a member of the room
    const { data: membership, error: membershipError } = await supabase
      .from('room_members')
      .select('id')
      .eq('room_id', roomId)
      .eq('user_id', user.id)
      .single()

    if (membershipError || !membership) {
      return NextResponse.json(
        { ok: false, error: 'Access denied. You are not a member of this room.' },
        { status: 403 }
      )
    }

    // Get room details for currency
    type RoomRow = { currency: string; name: string }
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('currency, name')
      .eq('id', roomId)
      .single()

    if (roomError || !room) {
      return NextResponse.json(
        { ok: false, error: 'Room not found' },
        { status: 404 }
      )
    }

    // Build date filter
    const targetDate = date || new Date().toISOString().split('T')[0]
    const startDate = `${targetDate}T00:00:00.000Z`
    const endDate = `${targetDate}T23:59:59.999Z`

    // Get approved expenses for the date
    type ExpenseRow = {
      amount: number
      description: string
      created_at: string
      user_id: string
    }
    const { data: expenses, error: expensesError } = await supabase
      .from('expenses')
      .select(`
        amount,
        description,
        created_at,
        user_id
      `)
      .eq('room_id', roomId)
      .eq('status', 'approved')
      .gte('created_at', startDate)
      .lte('created_at', endDate)

    if (expensesError) {
      return NextResponse.json(
        { ok: false, error: 'Failed to fetch expenses' },
        { status: 500 }
      )
    }

    if (!expenses || expenses.length === 0) {
      // Derive room name in a type-safe way to avoid TS inference issues in CI builds
      const roomName = (room as RoomRow | null)?.name ?? 'this room'
      return NextResponse.json({
        ok: true,
        markdown: `# Daily Summary for ${targetDate}\n\nNo approved expenses found for this date in **${roomName}**.`
      })
    }

    // Get user emails for anonymization
    const expList = (expenses as unknown as ExpenseRow[]) || []
    const userIds: string[] = []
    const seenUsers: { [id: string]: true } = {}
    for (const e of expList) {
      if (!seenUsers[e.user_id]) {
        seenUsers[e.user_id] = true
        userIds.push(e.user_id)
      }
    }
    const userEmails: { [key: string]: string } = {}
    
    for (const userId of userIds) {
      try {
        const { data: userData } = await supabase.auth.admin.getUserById(userId)
        userEmails[userId] = userData.user?.email || 'Unknown User'
      } catch {
        userEmails[userId] = 'Unknown User'
      }
    }

    // Process expenses data for AI
    const expensesByUser: { [key: string]: { total: number; items: Array<{ description: string; amount: number }> } } = {}
    const expensesByCategory: { [key: string]: number } = {}
    let totalSpent = 0

    expList.forEach((expense) => {
      const userAlias = anonymizeEmail(userEmails[expense.user_id])
      const amount = Number(expense.amount)
      totalSpent += amount

      // Group by user
      if (!expensesByUser[userAlias]) {
        expensesByUser[userAlias] = { total: 0, items: [] }
      }
      expensesByUser[userAlias].total += amount
      expensesByUser[userAlias].items.push({
        description: expense.description,
        amount: amount
      })

      // Simple category detection based on description keywords
  const description = expense.description.toLowerCase()
      let category = 'Other'
      if (description.includes('food') || description.includes('restaurant') || description.includes('meal')) {
        category = 'Food & Dining'
      } else if (description.includes('transport') || description.includes('taxi') || description.includes('bus') || description.includes('train')) {
        category = 'Transportation'
      } else if (description.includes('hotel') || description.includes('accommodation') || description.includes('lodging')) {
        category = 'Accommodation'
      } else if (description.includes('activity') || description.includes('tour') || description.includes('ticket')) {
        category = 'Activities'
      }

      expensesByCategory[category] = (expensesByCategory[category] || 0) + amount
    })

    // Prepare data for AI prompt
    const summaryData = {
      date: targetDate,
      roomName: (room as RoomRow).name,
      currency: (room as RoomRow).currency,
      totalSpent,
      expensesByUser,
      expensesByCategory,
      expenseCount: expenses.length
    }

    // Create AI prompt
    const prompt = `You are a helpful financial assistant analyzing daily trip expenses. Generate a concise, friendly daily summary based on this data:

Date: ${summaryData.date}
Trip: ${summaryData.roomName}
Currency: ${summaryData.currency}
Total Spent: ${summaryData.totalSpent}
Number of Expenses: ${summaryData.expenseCount}

Expenses by User:
${Object.entries(summaryData.expensesByUser).map(([user, data]) => 
  `- ${user}: ${summaryData.currency} ${data.total.toFixed(2)} (${data.items.length} items)`
).join('\n')}

Expenses by Category:
${Object.entries(summaryData.expensesByCategory).map(([category, amount]) => 
  `- ${category}: ${summaryData.currency} ${amount.toFixed(2)} (${((amount / summaryData.totalSpent) * 100).toFixed(1)}%)`
).join('\n')}

Please provide a markdown summary including:
1. Total spent for the day with currency symbol
2. Top spending categories with percentage breakdown
3. Any notable patterns or unusual expenses
4. 2-3 practical, friendly suggestions to optimize spending tomorrow

Keep it concise, positive, and actionable. Use the currency symbol from the data.`

    // Get AI configuration
    const aiConfig = getAIConfig()
    let openai: any
    try {
      openai = getOpenAIClient()
    } catch (e: any) {
      if (e.message.includes('AI disabled at build time')) {
        return NextResponse.json({ ok: true, markdown: `# Daily Summary for ${summaryData.date}\n\nAI summarization disabled during build.` })
      }
      throw e
    }

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: aiConfig.model,
      messages: [
        {
          role: 'system',
          content: 'You are a helpful financial assistant that provides concise, friendly trip expense summaries in markdown format.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: aiConfig.maxTokens,
      temperature: aiConfig.temperature,
    })

    const summary = completion.choices[0]?.message?.content || 'Unable to generate summary.'

    return NextResponse.json({
      ok: true,
      markdown: summary
    })

  } catch (error: any) {
    console.error('Daily summary error:', error)
    
    if (error.message.includes('AI is not configured')) {
      return NextResponse.json(
        { ok: false, error: 'AI is not configured by the administrator. Please contact support.' },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { ok: false, error: 'Failed to generate daily summary. Please try again.' },
      { status: 500 }
    )
  }
}