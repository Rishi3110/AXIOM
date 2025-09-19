'use client'

import { useState, useEffect } from 'react'
import { supabase, getCurrentUser } from '@/lib/supabase'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Home, List, Search, Map, User, Camera, MapPin, Upload, FileText, Clock, CheckCircle, Plus } from "lucide-react"
import dynamic from 'next/dynamic'

// Dynamic import for Map component to avoid SSR issues
const MapComponent = dynamic(() => import('@/components/MapComponent'), { 
  ssr: false,
  loading: () => <div className="h-96 bg-muted animate-pulse rounded-lg flex items-center justify-center">Loading Map...</div>
})

const ISSUE_CATEGORIES = [
  'Pothole',
  'Streetlight',
  'Garbage',
  'Water Supply',
  'Drainage',
  'Road Damage',
  'Traffic Signal',
  'Others'
]

const ISSUE_STATUSES = {
  SUBMITTED: 'Submitted',
  ACKNOWLEDGED: 'Acknowledged',
  RESOLVED: 'Resolved'
}

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('login')
  const [issues, setIssues] = useState([])
  const [userProfile, setUserProfile] = useState(null)
  const [allIssuesStats, setAllIssuesStats] = useState({
    total: 0,
    submitted: 0,
    acknowledged: 0,
    resolved: 0
  })

  // Auth form states
  const [isLogin, setIsLogin] = useState(true)
  const [authForm, setAuthForm] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
    address: '',
    aadhar: ''
  })

  // Issue form states
  const [issueForm, setIssueForm] = useState({
    description: '',
    category: '',
    location: '',
    coordinates: null
  })
  const [selectedFile, setSelectedFile] = useState(null)
  const [trackingId, setTrackingId] = useState('')
  const [trackedIssue, setTrackedIssue] = useState(null)

  // Personal dashboard counters (user's own issues)
  const totalIssues = issues.length
  const submittedCount = issues.filter(i => i.status === ISSUE_STATUSES.SUBMITTED).length
  const acknowledgedCount = issues.filter(i => i.status === ISSUE_STATUSES.ACKNOWLEDGED).length
  const resolvedCount = issues.filter(i => i.status === ISSUE_STATUSES.RESOLVED).length

  useEffect(() => {
    checkAuth()
    loadAllIssuesStats()
  }, [])

  useEffect(() => {
    if (user) {
      loadUserIssues()
    }
  }, [user])

  const checkAuth = async () => {
    try {
      const currentUser = await getCurrentUser()
      if (currentUser) {
        setUser(currentUser)
        await loadUserProfile(currentUser.id)
        setActiveTab('home')
      }
    } catch (error) {
      console.error('Auth check failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadUserProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (error) throw error
      setUserProfile(data)
    } catch (error) {
      console.error('Failed to load user profile:', error)
    }
  }

  const loadUserIssues = async () => {
    if (!user?.id) return
    
    try {
      const { data, error } = await supabase
        .from('issues')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setIssues(data || [])
    } catch (error) {
      console.error('Failed to load user issues:', error)
    }
  }

  const loadAllIssuesStats = async () => {
    try {
      // Use the new backend statistics API endpoint
      const response = await fetch('/api/stats')
      if (response.ok) {
        const stats = await response.json()
        setAllIssuesStats(stats)
      } else {
        // Fallback to direct Supabase query if API fails
        const { data, error } = await supabase
          .from('issues')
          .select('status')
        
        if (error) throw error
        
        const stats = {
          total: data?.length || 0,
          submitted: data?.filter(i => i.status === ISSUE_STATUSES.SUBMITTED).length || 0,
          acknowledged: data?.filter(i => i.status === ISSUE_STATUSES.ACKNOWLEDGED).length || 0,
          resolved: data?.filter(i => i.status === ISSUE_STATUSES.RESOLVED).length || 0
        }
        
        setAllIssuesStats(stats)
      }
    } catch (error) {
      console.error('Failed to load all issues stats:', error)
    }
  }

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: authForm.email,
          password: authForm.password
        })
        
        if (error) throw error
        
        setUser(data.user)
        await loadUserProfile(data.user.id)
        setActiveTab('home')
        toast.success('Welcome back!')
        // Load user's issues after login
        await loadUserIssues()
      } else {
        // Sign up
        const { data, error } = await supabase.auth.signUp({
          email: authForm.email,
          password: authForm.password
        })
        
        if (error) throw error
        
        // Create user profile
        const { error: profileError } = await supabase
          .from('users')
          .insert([{
            id: data.user.id,
            name: authForm.name,
            phone: authForm.phone,
            address: authForm.address,
            aadhar_number: authForm.aadhar,
            email: authForm.email
          }])
        
        if (profileError) throw profileError
        
        setUser(data.user)
        await loadUserProfile(data.user.id)
        setActiveTab('home')
        toast.success('Account created successfully!')
      }
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      setUser(null)
      setUserProfile(null)
      setActiveTab('login')
      toast.success('Signed out successfully')
    } catch (error) {
      toast.error('Error signing out')
    }
  }

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by this browser')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        setIssueForm(prev => ({
          ...prev,
          location: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
          coordinates: { lat: latitude, lng: longitude }
        }))
        toast.success('Current location captured!')
      },
      (error) => {
        toast.error('Unable to retrieve your location')
      }
    )
  }

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      // Check file size (limit to 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB')
        return
      }
      
      // Check file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file')
        return
      }
      
      setSelectedFile(file)
      toast.success(`Photo selected: ${file.name}`)
    }
  }

  const convertFileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result)
      reader.onerror = error => reject(error)
    })
  }

  const submitIssue = async (e) => {
    e.preventDefault()
    if (!issueForm.description || !issueForm.category || !issueForm.location) {
      toast.error('Please fill in all required fields')
      return
    }

    setLoading(true)
    try {
      // Generate unique issue ID
      const issueId = `CIV-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`
      
      let imageUrl = null
      
      // Process image if selected
      if (selectedFile) {
        try {
          console.log('Processing image:', selectedFile.name, 'Size:', selectedFile.size)
          
          // Convert image to base64 for storage
          const base64Image = await convertFileToBase64(selectedFile)
          imageUrl = base64Image
          console.log('Image converted to base64 successfully')
          toast.success('Image processed successfully')
        } catch (imageError) {
          console.error('Image processing failed:', imageError)
          toast.error('Image processing failed. Proceeding without image.')
          // Continue without image instead of failing completely
        }
      }

      // Create issue record
      const { data, error } = await supabase
        .from('issues')
        .insert([{
          id: issueId,
          user_id: user.id,
          description: issueForm.description,
          category: issueForm.category,
          location: issueForm.location,
          coordinates: issueForm.coordinates,
          image_url: imageUrl,
          status: ISSUE_STATUSES.SUBMITTED
        }])
        .select()
        .single()
      
      if (error) throw error
      
      // Reset form
      setIssueForm({
        description: '',
        category: '',
        location: '',
        coordinates: null
      })
      setSelectedFile(null)
      
      // Clear file input
      const fileInput = document.getElementById('photo')
      if (fileInput) fileInput.value = ''
      
      // Reload issues and stats
      await loadUserIssues()
      await loadAllIssuesStats()
      
      toast.success(`Issue submitted successfully! Issue ID: ${issueId}`)
    } catch (error) {
      console.error('Submit issue error:', error)
      toast.error('Failed to submit issue: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const trackIssue = async () => {
    if (!trackingId.trim()) {
      toast.error('Please enter an Issue ID')
      return
    }

    try {
      const { data, error } = await supabase
        .from('issues')
        .select('*, users(name)')
        .eq('id', trackingId.trim())
        .single()
      
      if (error) throw error
      
      if (data) {
        setTrackedIssue(data)
        toast.success('Issue found!')
      } else {
        setTrackedIssue(null)
        toast.error('Issue not found')
      }
    } catch (error) {
      setTrackedIssue(null)
      toast.error('Issue not found')
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case ISSUE_STATUSES.SUBMITTED: return 'bg-yellow-500'
      case ISSUE_STATUSES.ACKNOWLEDGED: return 'bg-blue-500'
      case ISSUE_STATUSES.RESOLVED: return 'bg-green-500'
      default: return 'bg-gray-500'
    }
  }

  if (loading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100 p-4">
        <div className="max-w-md mx-auto pt-8">
          <Card className="rounded-2xl border-0 shadow-2xl bg-gradient-to-br from-white to-gray-50">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Civic Reporter</CardTitle>
              <CardDescription>Report civic issues in your community</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex mb-6">
                <Button
                  variant={isLogin ? "default" : "outline"}
                  onClick={() => setIsLogin(true)}
                  className="flex-1 mr-2 rounded-xl transition-all duration-200 hover:scale-[1.02]"
                >
                  Login
                </Button>
                <Button
                  variant={!isLogin ? "default" : "outline"}
                  onClick={() => setIsLogin(false)}
                  className="flex-1 ml-2 rounded-xl transition-all duration-200 hover:scale-[1.02]"
                >
                  Sign Up
                </Button>
              </div>

              <form onSubmit={handleAuth} className="space-y-4">
                {!isLogin && (
                  <>
                    <div>
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        type="text"
                        placeholder="Enter your full name"
                        value={authForm.name}
                        onChange={(e) => setAuthForm(prev => ({ ...prev, name: e.target.value }))}
                        required
                        className="rounded-xl border-gray-200 focus:border-blue-500 transition-colors duration-200"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="Enter your phone number"
                        value={authForm.phone}
                        onChange={(e) => setAuthForm(prev => ({ ...prev, phone: e.target.value }))}
                        required
                        className="rounded-xl border-gray-200 focus:border-blue-500 transition-colors duration-200"
                      />
                    </div>
                    <div>
                      <Label htmlFor="address">Address</Label>
                      <Textarea
                        id="address"
                        placeholder="Enter your address"
                        value={authForm.address}
                        onChange={(e) => setAuthForm(prev => ({ ...prev, address: e.target.value }))}
                        required
                        className="rounded-xl border-gray-200 focus:border-blue-500 transition-colors duration-200"
                      />
                    </div>
                    <div>
                      <Label htmlFor="aadhar">Aadhar Number</Label>
                      <Input
                        id="aadhar"
                        type="text"
                        placeholder="Enter your Aadhar number"
                        value={authForm.aadhar}
                        onChange={(e) => setAuthForm(prev => ({ ...prev, aadhar: e.target.value }))}
                        required
                        className="rounded-xl border-gray-200 focus:border-blue-500 transition-colors duration-200"
                      />
                    </div>
                  </>
                )}
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={authForm.email}
                    onChange={(e) => setAuthForm(prev => ({ ...prev, email: e.target.value }))}
                    required
                    className="rounded-xl border-gray-200 focus:border-blue-500 transition-colors duration-200"
                  />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={authForm.password}
                    onChange={(e) => setAuthForm(prev => ({ ...prev, password: e.target.value }))}
                    required
                    className="rounded-xl border-gray-200 focus:border-blue-500 transition-colors duration-200"
                  />
                </div>
                <Button type="submit" className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 hover:scale-[1.02]" disabled={loading}>
                  {loading ? 'Processing...' : (isLogin ? 'Login' : 'Sign Up')}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Main Content - No header */}
      <div className="pb-20">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsContent value="home" className="p-4 space-y-6">
            <div className="space-y-4">
              <div>
                <h2 className="text-2xl font-bold">Welcome, {userProfile?.name || 'Citizen'}!</h2>
                <p className="text-muted-foreground">Report and track civic issues in your area</p>
              </div>

              <div className="bg-gradient-to-r from-slate-800 via-slate-900 to-slate-800 text-white rounded-2xl p-6 shadow-xl">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold">Report New Issue</h3>
                    <p className="text-sm opacity-80">Help improve your community</p>
                  </div>
                  <Button onClick={() => setActiveTab('report')} className="bg-white text-slate-900 hover:bg-white/90 rounded-xl transition-all duration-200 hover:scale-105">
                    <Plus className="h-4 w-4 mr-1" />
                    Report
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Card className="rounded-2xl border-0 shadow-lg bg-gradient-to-br from-white to-gray-50">
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Your Issues</p>
                    <div className="mt-1 flex items-center gap-2">
                      <FileText className="h-5 w-5 text-slate-600" />
                      <span className="text-2xl font-semibold">{totalIssues}</span>
                    </div>
                  </CardContent>
                </Card>
                <Card className="rounded-2xl border-0 shadow-lg bg-gradient-to-br from-amber-50 to-yellow-50">
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Your Submitted</p>
                    <div className="mt-1 flex items-center gap-2">
                      <Clock className="h-5 w-5 text-amber-500" />
                      <span className="text-2xl font-semibold">{submittedCount}</span>
                    </div>
                  </CardContent>
                </Card>
                <Card className="rounded-2xl border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50">
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Your Acknowledged</p>
                    <div className="mt-1 flex items-center gap-2">
                      <Clock className="h-5 w-5 text-blue-500" />
                      <span className="text-2xl font-semibold">{acknowledgedCount}</span>
                    </div>
                  </CardContent>
                </Card>
                <Card className="rounded-2xl border-0 shadow-lg bg-gradient-to-br from-green-50 to-emerald-50">
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Your Resolved</p>
                    <div className="mt-1 flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="text-2xl font-semibold">{resolvedCount}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Overall Community Statistics */}
              <div className="space-y-3">
                <div className="bg-gradient-to-r from-slate-800 via-slate-900 to-slate-800 text-white rounded-2xl p-4 shadow-xl">
                  <h3 className="text-lg font-semibold mb-3 text-center">Community Overview</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/10 rounded-xl p-3 text-center">
                      <p className="text-xs opacity-80">Total Issues</p>
                      <div className="flex items-center justify-center gap-1 mt-1">
                        <FileText className="h-4 w-4" />
                        <span className="text-xl font-bold">{allIssuesStats.total}</span>
                      </div>
                    </div>
                    <div className="bg-white/10 rounded-xl p-3 text-center">
                      <p className="text-xs opacity-80">Active</p>
                      <div className="flex items-center justify-center gap-1 mt-1">
                        <Clock className="h-4 w-4 text-amber-300" />
                        <span className="text-xl font-bold">{allIssuesStats.submitted}</span>
                      </div>
                    </div>
                    <div className="bg-white/10 rounded-xl p-3 text-center">
                      <p className="text-xs opacity-80">In Progress</p>
                      <div className="flex items-center justify-center gap-1 mt-1">
                        <Clock className="h-4 w-4 text-blue-300" />
                        <span className="text-xl font-bold">{allIssuesStats.acknowledged}</span>
                      </div>
                    </div>
                    <div className="bg-white/10 rounded-xl p-3 text-center">
                      <p className="text-xs opacity-80">Resolved</p>
                      <div className="flex items-center justify-center gap-1 mt-1">
                        <CheckCircle className="h-4 w-4 text-green-300" />
                        <span className="text-xl font-bold">{allIssuesStats.resolved}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div
                  role="button"
                  onClick={() => setActiveTab('issues')}
                  className="w-full border-0 bg-gradient-to-r from-gray-50 to-white rounded-2xl px-4 py-3 flex items-center justify-between hover:shadow-md transition-all duration-200 hover:scale-[1.02] shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-600" />
                    <span>View My Issues</span>
                  </div>
                  <span className="text-muted-foreground">›</span>
                </div>
                <div
                  role="button"
                  onClick={() => setActiveTab('track')}
                  className="w-full border-0 bg-gradient-to-r from-gray-50 to-white rounded-2xl px-4 py-3 flex items-center justify-between hover:shadow-md transition-all duration-200 hover:scale-[1.02] shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    <Search className="h-4 w-4 text-green-600" />
                    <span>Track Issue by ID</span>
                  </div>
                  <span className="text-muted-foreground">›</span>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="report" className="p-4 space-y-6">
            <Card className="rounded-2xl border-0 shadow-xl bg-gradient-to-br from-white to-gray-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5 text-blue-600" />
                  Report New Issue
                </CardTitle>
                <CardDescription>
                  Help improve your community by reporting civic issues
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={submitIssue} className="space-y-4">
                  <div>
                    <Label htmlFor="description">Description *</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe the issue in detail..."
                      value={issueForm.description}
                      onChange={(e) => setIssueForm(prev => ({ ...prev, description: e.target.value }))}
                      required
                      className="rounded-xl border-gray-200 focus:border-blue-500 transition-colors duration-200"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="category">Category *</Label>
                    <Select
                      value={issueForm.category}
                      onValueChange={(value) => setIssueForm(prev => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger className="rounded-xl border-gray-200 focus:border-blue-500 transition-colors duration-200">
                        <SelectValue placeholder="Select issue category" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {ISSUE_CATEGORIES.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="location">Location *</Label>
                    <div className="flex gap-2">
                      <Input
                        id="location"
                        placeholder="Enter location or use current location"
                        value={issueForm.location}
                        onChange={(e) => setIssueForm(prev => ({ ...prev, location: e.target.value }))}
                        required
                        className="rounded-xl border-gray-200 focus:border-blue-500 transition-colors duration-200"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={getCurrentLocation}
                        className="shrink-0 rounded-xl border-gray-200 hover:bg-blue-50 hover:border-blue-300 transition-all duration-200"
                      >
                        <MapPin className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="photo">Photo (Optional)</Label>
                    <div className="flex gap-2">
                      <Input
                        id="photo"
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="rounded-xl border-gray-200 focus:border-blue-500 transition-colors duration-200 file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-500 file:text-white hover:file:bg-blue-600"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById('photo').click()}
                        className="shrink-0 rounded-xl border-gray-200 hover:bg-blue-50 hover:border-blue-300 transition-all duration-200"
                      >
                        <Camera className="h-4 w-4" />
                      </Button>
                    </div>
                    {selectedFile && (
                      <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-xl">
                        <p className="text-sm text-green-700 flex items-center gap-2">
                          <CheckCircle className="h-4 w-4" />
                          Selected: {selectedFile.name}
                        </p>
                      </div>
                    )}
                  </div>

                  <Button type="submit" className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 hover:scale-[1.02]" disabled={loading}>
                    {loading ? 'Submitting...' : 'Submit Issue'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="issues" className="p-4">
            <Card className="rounded-2xl border-0 shadow-xl bg-gradient-to-br from-white to-gray-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <List className="h-5 w-5 text-blue-600" />
                  My Issues ({issues.length})
                </CardTitle>
                <CardDescription>
                  Issues you have reported
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {issues.map((issue) => (
                    <div key={issue.id} className="border-0 bg-gradient-to-r from-white to-gray-50 rounded-2xl p-4 shadow-md hover:shadow-lg transition-all duration-200">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold text-slate-800">{issue.id}</h3>
                          <p className="text-sm text-muted-foreground">{issue.category}</p>
                        </div>
                        <Badge className={`${getStatusColor(issue.status)} rounded-full px-3 py-1`}>
                          {issue.status}
                        </Badge>
                      </div>
                      <p className="text-sm mb-2 text-slate-700">{issue.description}</p>
                      <p className="text-xs text-muted-foreground">
                        📍 {issue.location} • {new Date(issue.created_at).toLocaleDateString()}
                      </p>
                      {issue.image_url && (
                        <div className="mt-3">
                          <img
                            src={issue.image_url}
                            alt="Issue"
                            className="w-full h-48 object-cover rounded-xl shadow-md hover:shadow-lg transition-all duration-200"
                            onError={(e) => {
                              e.target.style.display = 'none'
                              console.error('Failed to load image:', issue.image_url)
                            }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                  {issues.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      No issues reported yet
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="track" className="p-4">
            <Card className="rounded-2xl border-0 shadow-xl bg-gradient-to-br from-white to-gray-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5 text-green-600" />
                  Track Issue
                </CardTitle>
                <CardDescription>
                  Enter your Issue ID to track its status
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter Issue ID (e.g., CIV-1234567890-ABCDE)"
                    value={trackingId}
                    onChange={(e) => setTrackingId(e.target.value)}
                    className="rounded-xl border-gray-200 focus:border-green-500 transition-colors duration-200"
                  />
                  <Button onClick={trackIssue} className="rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 transition-all duration-200">
                    <Search className="h-4 w-4" />
                  </Button>
                </div>

                {trackedIssue && (
                  <div className="border-0 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-4 shadow-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold text-slate-800">{trackedIssue.id}</h3>
                        <p className="text-sm text-muted-foreground">{trackedIssue.category}</p>
                      </div>
                      <Badge className={`${getStatusColor(trackedIssue.status)} rounded-full px-3 py-1`}>
                        {trackedIssue.status}
                      </Badge>
                    </div>
                    <p className="text-sm mb-2 text-slate-700">{trackedIssue.description}</p>
                    <p className="text-xs text-muted-foreground">
                      📍 {trackedIssue.location} • Reported by: {trackedIssue.users?.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      📅 {new Date(trackedIssue.created_at).toLocaleString()}
                    </p>
                    {trackedIssue.image_url && (
                      <div className="mt-3">
                        <img
                          src={trackedIssue.image_url}
                          alt="Issue"
                          className="w-full h-48 object-cover rounded-xl shadow-md hover:shadow-lg transition-all duration-200"
                          onError={(e) => {
                            e.target.style.display = 'none'
                            console.error('Failed to load tracked issue image:', trackedIssue.image_url)
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="map" className="p-4">
            <Card className="rounded-2xl border-0 shadow-xl bg-gradient-to-br from-white to-gray-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Map className="h-5 w-5 text-purple-600" />
                  Issue Map
                </CardTitle>
                <CardDescription>
                  View all reported issues on the map
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-2xl overflow-hidden shadow-lg">
                  <MapComponent issues={issues} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile" className="p-4">
            <Card className="rounded-2xl border-0 shadow-xl bg-gradient-to-br from-white to-gray-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-indigo-600" />
                  Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {userProfile && (
                  <div className="space-y-4">
                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4">
                      <Label className="text-sm font-semibold text-indigo-800">Name</Label>
                      <p className="text-slate-700 font-medium">{userProfile.name}</p>
                    </div>
                    <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-4">
                      <Label className="text-sm font-semibold text-blue-800">Email</Label>
                      <p className="text-slate-700 font-medium">{userProfile.email}</p>
                    </div>
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4">
                      <Label className="text-sm font-semibold text-green-800">Phone</Label>
                      <p className="text-slate-700 font-medium">{userProfile.phone}</p>
                    </div>
                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4">
                      <Label className="text-sm font-semibold text-amber-800">Address</Label>
                      <p className="text-slate-700 font-medium">{userProfile.address}</p>
                    </div>
                  </div>
                )}
                <Button onClick={handleSignOut} variant="destructive" className="w-full rounded-xl bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 transition-all duration-200 hover:scale-[1.02]">
                  Sign Out
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-white via-gray-50 to-white border-t border-gray-200 shadow-lg">
        <div className="flex justify-around py-3">
          <Button
            variant={activeTab === 'home' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('home')}
            className="flex-col h-auto py-2 rounded-xl transition-all duration-200 hover:scale-105"
          >
            <Home className="h-5 w-5 mb-1" />
            <span className="text-xs">Home</span>
          </Button>
          <Button
            variant={activeTab === 'report' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('report')}
            className="flex-col h-auto py-2 rounded-xl transition-all duration-200 hover:scale-105 bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700"
          >
            <Plus className="h-5 w-5 mb-1" />
            <span className="text-xs">Report</span>
          </Button>
          <Button
            variant={activeTab === 'issues' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('issues')}
            className="flex-col h-auto py-2 rounded-xl transition-all duration-200 hover:scale-105"
          >
            <List className="h-5 w-5 mb-1" />
            <span className="text-xs">My Issues</span>
          </Button>
          <Button
            variant={activeTab === 'track' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('track')}
            className="flex-col h-auto py-2 rounded-xl transition-all duration-200 hover:scale-105"
          >
            <Search className="h-5 w-5 mb-1" />
            <span className="text-xs">Track</span>
          </Button>
          <Button
            variant={activeTab === 'map' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('map')}
            className="flex-col h-auto py-2 rounded-xl transition-all duration-200 hover:scale-105"
          >
            <Map className="h-5 w-5 mb-1" />
            <span className="text-xs">Map</span>
          </Button>
          <Button
            variant={activeTab === 'profile' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('profile')}
            className="flex-col h-auto py-2 rounded-xl transition-all duration-200 hover:scale-105"
          >
            <User className="h-5 w-5 mb-1" />
            <span className="text-xs">Profile</span>
          </Button>
        </div>
      </div>
    </div>
  )
}