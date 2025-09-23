"use client"

import Link from "next/link"
import { useAuth } from "@/lib/hooks/useAuth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, DollarSign, MessageSquare, MapPin, Sparkles } from "lucide-react"

export default function Dashboard() {
  const { user, loading } = useAuth()

  if (loading) return null

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Welcome{user ? `, ${user.email}` : ""}</h1>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Calendar className="h-4 w-4"/> Trip Dates</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">Add or pick a room to see countdowns</p>
              <div className="mt-3">
                <Link href="/rooms"><Button size="sm" variant="outline">Go to Rooms</Button></Link>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><MapPin className="h-4 w-4"/> Location</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">Set destination in your room for richer insights</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4"/> AI Highlights</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">Generate daily or final trip summaries from the Expenses details</p>
              <div className="mt-3 flex gap-2">
                <Link href="/rooms"><Button size="sm"><DollarSign className="h-4 w-4 mr-1"/> Expenses</Button></Link>
                <Link href="/group"><Button size="sm" variant="outline"><MessageSquare className="h-4 w-4 mr-1"/> Chat</Button></Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}
