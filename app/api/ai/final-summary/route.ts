import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getOpenAIClient, getAIConfig, anonymizeEmail } from '@/lib/ai'
import { calculateSettlements } from '@/lib/utils/settlements'
import { MemberBalance } from '@/types/app'

export async function POST(request: NextRequest) {
  try {
    const { roomId } = await request.json()

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

    // Get room details
    type RoomRow = { currency: string; name: string; created_at: string }
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('currency, name, created_at')
      .eq('id', roomId)
      .single()

    if (roomError || !room) {
      return NextResponse.json(
        { ok: false, error: 'Room not found' },
        { status: 404 }
      )
    }

    // Get all approved expenses for the room
    type ExpenseRow = { amount: number; description: string; created_at: string; user_id: string }
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
      .order('created_at', { ascending: true })

    if (expensesError) {
      return NextResponse.json(
        { ok: false, error: 'Failed to fetch expenses' },
        { status: 500 }
      )
    }

    if (!expenses || expenses.length === 0) {
      const roomName = (room as RoomRow | null)?.name ?? 'this room'
      return NextResponse.json({
        ok: true,
        markdown: `# Final Trip Summary\n\nNo approved expenses found for **${roomName}**.`
      })
    }

    // Get all room members
    type MemberRow = { user_id: string }
    const { data: members, error: membersError } = await supabase
      .from('room_members')
      .select('user_id')
      .eq('room_id', roomId)

    if (membersError || !members) {
      return NextResponse.json(
        { ok: false, error: 'Failed to fetch room members' },
        { status: 500 }
      )
    }

    // Get user emails for anonymization
    const expList = (expenses as unknown as ExpenseRow[]) || []
    const memList = (members as unknown as MemberRow[]) || []
    const userIds: string[] = []
    const seen: { [id: string]: true } = {}
    for (const e of expList) {
      if (!seen[e.user_id]) { seen[e.user_id] = true; userIds.push(e.user_id) }
    }
    for (const m of memList) {
      if (!seen[m.user_id]) { seen[m.user_id] = true; userIds.push(m.user_id) }
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

    // Calculate member balances for settlements
    const memberBalances: MemberBalance[] = memList.map(member => {
      const userExpenses = expList
        .filter(e => e.user_id === member.user_id)
        .reduce((sum, e) => sum + Number(e.amount), 0)
      
      const totalExpenses = expList.reduce((sum, e) => sum + Number(e.amount), 0)
      const sharePerMember = memList.length > 0 ? totalExpenses / memList.length : 0

      return {
        user_id: member.user_id,
        user_email: anonymizeEmail(userEmails[member.user_id]),
        total_spent: userExpenses,
        share: sharePerMember,
        balance: userExpenses - sharePerMember
      }
    })

    // Calculate settlements
    const settlements = calculateSettlements(memberBalances)

    // Process expenses data for AI
    const expensesByUser: { [key: string]: { total: number; count: number } } = {}
    const expensesByCategory: { [key: string]: number } = {}
    const dailyTotals: { [key: string]: number } = {}
    let totalSpent = 0

  expList.forEach(expense => {
      const userAlias = anonymizeEmail(userEmails[expense.user_id])
      const amount = Number(expense.amount)
      const date = new Date(expense.created_at).toISOString().split('T')[0]
      
      totalSpent += amount

      // Group by user
      if (!expensesByUser[userAlias]) {
        expensesByUser[userAlias] = { total: 0, count: 0 }
      }
      expensesByUser[userAlias].total += amount
      expensesByUser[userAlias].count += 1

      // Group by date
      dailyTotals[date] = (dailyTotals[date] || 0) + amount

      // Simple category detection
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

    // Calculate trip duration
  const startDate = new Date(Math.min(...expList.map(e => new Date(e.created_at).getTime())))
  const endDate = new Date(Math.max(...expList.map(e => new Date(e.created_at).getTime())))
    const tripDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1

    // Prepare data for AI prompt
    const summaryData = {
  roomName: (room as RoomRow).name,
  currency: (room as RoomRow).currency,
      totalSpent,
  memberCount: memList.length,
  expenseCount: expList.length,
      tripDays,
      avgPerDay: totalSpent / tripDays,
  avgPerPerson: memList.length > 0 ? totalSpent / memList.length : 0,
      expensesByUser,
      expensesByCategory,
      settlements: settlements.map(s => ({
        from: s.from,
        to: s.to,
        amount: s.amount
      })),
      topSpendingDay: Object.entries(dailyTotals).reduce((max, [date, amount]) => 
        amount > max.amount ? { date, amount } : max, { date: '', amount: 0 }
      )
    }

    // Create AI prompt
    const prompt = `You are a helpful financial assistant analyzing a complete trip's expenses. Generate a comprehensive final summary based on this data:

Trip: ${summaryData.roomName}
Currency: ${summaryData.currency}
Duration: ${summaryData.tripDays} days
Total Members: ${summaryData.memberCount}
Total Expenses: ${summaryData.expenseCount}
Total Spent: ${summaryData.totalSpent}
Average per Day: ${summaryData.avgPerDay.toFixed(2)}
Average per Person: ${summaryData.avgPerPerson.toFixed(2)}

Spending by Member:
${Object.entries(summaryData.expensesByUser).map(([user, data]) => 
  `- ${user}: ${summaryData.currency} ${data.total.toFixed(2)} (${data.count} expenses)`
).join('\n')}

Spending by Category:
${Object.entries(summaryData.expensesByCategory).map(([category, amount]) => 
  `- ${category}: ${summaryData.currency} ${amount.toFixed(2)} (${((amount / summaryData.totalSpent) * 100).toFixed(1)}%)`
).join('\n')}

Settlement Summary:
${summaryData.settlements.length > 0 ? 
  summaryData.settlements.map(s => `- ${s.from} owes ${s.to}: ${summaryData.currency} ${s.amount.toFixed(2)}`).join('\n') :
  'All members are settled up!'
}

Highest Spending Day: ${summaryData.topSpendingDay.date} (${summaryData.currency} ${summaryData.topSpendingDay.amount.toFixed(2)})

Please provide a markdown summary including:
1. Trip overview with total spent and key metrics
2. Per-member spending breakdown
3. Top spending categories with insights
4. Notable patterns, outliers, or interesting observations
5. Clear settlement explanation (who owes whom and why)
6. 2-3 practical suggestions for future trips

Keep it comprehensive but readable, positive, and actionable. Use the currency symbol from the data.`

    // Get AI configuration
    const aiConfig = getAIConfig()
    let openai: any
    try {
      openai = getOpenAIClient()
    } catch (e: any) {
      if (e.message.includes('AI disabled at build time')) {
        return NextResponse.json({ ok: true, markdown: '# Final Trip Summary\n\nAI summarization disabled during build.' })
      }
      throw e
    }

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: aiConfig.model,
      messages: [
        {
          role: 'system',
          content: 'You are a helpful financial assistant that provides comprehensive, friendly trip expense summaries in markdown format.'
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
    console.error('Final summary error:', error)
    
    if (error.message.includes('AI is not configured')) {
      return NextResponse.json(
        { ok: false, error: 'AI is not configured by the administrator. Please contact support.' },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { ok: false, error: 'Failed to generate final summary. Please try again.' },
      { status: 500 }
    )
  }
}