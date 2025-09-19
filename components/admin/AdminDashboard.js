'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { 
  BarChart, 
  Map, 
  Settings, 
  FileText, 
  LogOut, 
  Users, 
  AlertTriangle,
  TrendingUp,
  Activity
} from "lucide-react"
import DashboardOverview from './DashboardOverview'
import IssueManagement from './IssueManagement'
import AdminMap from './AdminMap'
import DepartmentSettings from './DepartmentSettings'

export default function AdminDashboard({ onSignOut }) {
  const [activeTab, setActiveTab] = useState('overview')
  const [stats, setStats] = useState({
    total: 0,
    submitted: 0,
    acknowledged: 0,
    resolved: 0
  })
  const [recentIssues, setRecentIssues] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      // Load all issues for statistics
      const { data: issues, error } = await supabase
        .from('issues')
        .select(`
          *,
          users (
            name,
            email
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Calculate statistics
      const stats = {
        total: issues?.length || 0,
        submitted: issues?.filter(i => i.status === 'Submitted').length || 0,
        acknowledged: issues?.filter(i => i.status === 'Acknowledged').length || 0,
        resolved: issues?.filter(i => i.status === 'Resolved').length || 0
      }

      setStats(stats)
      setRecentIssues(issues?.slice(0, 5) || [])
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'Submitted': return 'bg-yellow-500'
      case 'Acknowledged': return 'bg-blue-500'
      case 'Resolved': return 'bg-green-500'
      default: return 'bg-gray-500'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg flex items-center justify-center">
                <Activity className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800">Civic Reporter Admin</h1>
                <p className="text-sm text-slate-600">Administration Dashboard</p>
              </div>
            </div>
            
            {/* Quick Stats */}
            <div className="hidden md:flex items-center space-x-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-slate-800">{stats.total}</div>
                <div className="text-xs text-slate-600">Total Issues</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{stats.submitted}</div>
                <div className="text-xs text-slate-600">Pending</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.resolved}</div>
                <div className="text-xs text-slate-600">Resolved</div>
              </div>
            </div>

            <Button onClick={onSignOut} variant="outline" size="sm">
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:grid-cols-4">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="issues" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Issues
            </TabsTrigger>
            <TabsTrigger value="map" className="flex items-center gap-2">
              <Map className="h-4 w-4" />
              Map View
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <DashboardOverview stats={stats} recentIssues={recentIssues} onRefresh={loadDashboardData} />
          </TabsContent>

          <TabsContent value="issues">
            <IssueManagement onRefresh={loadDashboardData} />
          </TabsContent>

          <TabsContent value="map">
            <AdminMap />
          </TabsContent>

          <TabsContent value="settings">
            <DepartmentSettings />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}