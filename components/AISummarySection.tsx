'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, Brain, Calendar, FileText } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

interface AISummarySectionProps {
  roomId: string
}

export function AISummarySection({ roomId }: AISummarySectionProps) {
  const [dailySummary, setDailySummary] = useState<string>('')
  const [finalSummary, setFinalSummary] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [loadingDaily, setLoadingDaily] = useState(false)
  const [loadingFinal, setLoadingFinal] = useState(false)
  const { toast } = useToast()

  const handleDailySummary = async () => {
    setLoadingDaily(true)
    try {
      const response = await fetch('/api/ai/daily-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomId,
          date: selectedDate.toISOString().split('T')[0]
        }),
      })

      const data = await response.json()

      if (data.ok) {
        setDailySummary(data.markdown)
        toast({
          title: 'Daily summary generated!',
          description: 'AI has analyzed your daily expenses.',
        })
      } else {
        throw new Error(data.error || 'Failed to generate summary')
      }
    } catch (error: any) {
      toast({
        title: 'Error generating daily summary',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setLoadingDaily(false)
    }
  }

  const handleFinalSummary = async () => {
    setLoadingFinal(true)
    try {
      const response = await fetch('/api/ai/final-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomId,
        }),
      })

      const data = await response.json()

      if (data.ok) {
        setFinalSummary(data.markdown)
        toast({
          title: 'Final summary generated!',
          description: 'AI has analyzed your complete trip expenses.',
        })
      } else {
        throw new Error(data.error || 'Failed to generate summary')
      }
    } catch (error: any) {
      toast({
        title: 'Error generating final summary',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setLoadingFinal(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Brain className="h-5 w-5 mr-2 text-purple-600" />
          AI Expense Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Controls */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Daily Summary */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Daily Summary</span>
            </div>
            <DatePicker
              date={selectedDate}
              onDateChange={(date) => setSelectedDate(date || new Date())}
              placeholder="Select date"
              disabled={loadingDaily}
            />
            <Button
              onClick={handleDailySummary}
              disabled={loadingDaily}
              className="w-full"
              variant="outline"
            >
              {loadingDaily ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Calendar className="mr-2 h-4 w-4" />
                  Generate Daily Summary
                </>
              )}
            </Button>
          </div>

          {/* Final Summary */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Trip Summary</span>
            </div>
            <div className="h-10 flex items-center text-sm text-gray-600">
              Complete trip analysis with settlements
            </div>
            <Button
              onClick={handleFinalSummary}
              disabled={loadingFinal}
              className="w-full"
              variant="outline"
            >
              {loadingFinal ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Generate Final Summary
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Daily Summary Results */}
        {dailySummary && (
          <div className="space-y-2">
            <h4 className="font-medium text-blue-800 flex items-center">
              <Calendar className="h-4 w-4 mr-2" />
              Daily Summary for {selectedDate.toLocaleDateString()}
            </h4>
            <div className="prose prose-sm max-w-none bg-blue-50 p-4 rounded-lg border border-blue-200">
              <ReactMarkdown>{dailySummary}</ReactMarkdown>
            </div>
          </div>
        )}

        {/* Final Summary Results */}
        {finalSummary && (
          <div className="space-y-2">
            <h4 className="font-medium text-green-800 flex items-center">
              <FileText className="h-4 w-4 mr-2" />
              Complete Trip Summary
            </h4>
            <div className="prose prose-sm max-w-none bg-green-50 p-4 rounded-lg border border-green-200">
              <ReactMarkdown>{finalSummary}</ReactMarkdown>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!dailySummary && !finalSummary && (
          <div className="text-center py-8 text-gray-500">
            <Brain className="h-12 w-12 mx-auto mb-3 text-gray-400" />
            <p className="text-sm">Generate AI-powered insights about your trip expenses</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}