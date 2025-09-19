'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, TrendingUp, AlertTriangle, CheckCircle, Clock } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const COLORS = ['#fbbf24', '#3b82f6', '#10b981']

export default function DashboardOverview({ stats, recentIssues, onRefresh }) {
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    await onRefresh()
    setTimeout(() => setRefreshing(false), 1000)
  }

  // Prepare chart data
  const barChartData = [
    { name: 'Submitted', value: stats.submitted, color: '#fbbf24' },
    { name: 'Acknowledged', value: stats.acknowledged, color: '#3b82f6' },
    { name: 'Resolved', value: stats.resolved, color: '#10b981' }
  ]

  const pieChartData = [
    { name: 'Submitted', value: stats.submitted, color: '#fbbf24' },
    { name: 'Acknowledged', value: stats.acknowledged, color: '#3b82f6' },
    { name: 'Resolved', value: stats.resolved, color: '#10b981' }
  ]

  const getStatusColor = (status) => {
    switch (status) {
      case 'Submitted': return 'bg-yellow-500'
      case 'Acknowledged': return 'bg-blue-500'
      case 'Resolved': return 'bg-green-500'
      default: return 'bg-gray-500'
    }
  }

  const resolutionRate = stats.total > 0 ? ((stats.resolved / stats.total) * 100).toFixed(1) : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Dashboard Overview</h2>
          <p className="text-slate-600">Real-time insights into civic issues</p>
        </div>
        <Button onClick={handleRefresh} disabled={refreshing} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-800">Total Issues</p>
                <p className="text-3xl font-bold text-blue-900">{stats.total}</p>
              </div>
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-800">Pending</p>
                <p className="text-3xl font-bold text-yellow-900">{stats.submitted}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-600 rounded-full flex items-center justify-center">
                <Clock className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-800">In Progress</p>
                <p className="text-3xl font-bold text-blue-900">{stats.acknowledged}</p>
              </div>
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-800">Resolved</p>
                <p className="text-3xl font-bold text-green-900">{stats.resolved}</p>
                <p className="text-xs text-green-700">{resolutionRate}% resolution rate</p>
              </div>
              <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Issue Status Distribution</CardTitle>
            <CardDescription>Current breakdown of issue statuses</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#8884d8">
                  {barChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Issue Status Percentage</CardTitle>
            <CardDescription>Percentage breakdown of all issues</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Issues */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Issues</CardTitle>
          <CardDescription>Latest 5 reported issues</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentIssues.map((issue) => (
              <div key={issue.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-semibold text-slate-800">{issue.id}</h4>
                    <Badge className={`${getStatusColor(issue.status)} text-white`}>
                      {issue.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-600 mb-1">{issue.category} • {issue.location}</p>
                  <p className="text-sm text-slate-700">{issue.description}</p>
                  <p className="text-xs text-slate-500 mt-2">
                    Reported by: {issue.users?.name} • {new Date(issue.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
            {recentIssues.length === 0 && (
              <p className="text-center text-slate-500 py-8">No issues found</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}