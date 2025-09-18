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
import { Home, List, Search, Map, User, Camera, MapPin, Upload } from "lucide-react"
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

  useEffect(() => {
    checkAuth()
    loadIssues()
  }, [])

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

  const loadIssues = async () => {
    try {
      const { data, error } = await supabase
        .from('issues')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setIssues(data || [])
    } catch (error) {
      console.error('Failed to load issues:', error)
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
      setSelectedFile(file)
      toast.success('Photo selected')
    }
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
      
      // Upload image if selected
      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop()
        const fileName = `${issueId}.${fileExt}`
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('issue-photos')
          .upload(fileName, selectedFile)
        
        if (uploadError) throw uploadError
        
        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('issue-photos')
          .getPublicUrl(fileName)
        
        imageUrl = publicUrl
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
      
      // Reload issues
      await loadIssues()
      
      toast.success(`Issue submitted successfully! Issue ID: ${issueId}`)
    } catch (error) {
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-md mx-auto pt-8">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-primary">Civic Reporter</CardTitle>
              <CardDescription>Report civic issues in your community</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex mb-6">
                <Button
                  variant={isLogin ? "default" : "outline"}
                  onClick={() => setIsLogin(true)}
                  className="flex-1 mr-2"
                >
                  Login
                </Button>
                <Button
                  variant={!isLogin ? "default" : "outline"}
                  onClick={() => setIsLogin(false)}
                  className="flex-1 ml-2"
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
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">Civic Reporter</h1>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setActiveTab('profile')}
          className="hover:bg-primary-foreground/20"
        >
          <User className="h-5 w-5" />
        </Button>
      </header>

      {/* Main Content */}
      <div className="pb-20">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsContent value="home" className="p-4 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Home className="h-5 w-5" />
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
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="category">Category *</Label>
                    <Select
                      value={issueForm.category}
                      onValueChange={(value) => setIssueForm(prev => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select issue category" />
                      </SelectTrigger>
                      <SelectContent>
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
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={getCurrentLocation}
                        className="shrink-0"
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
                        className="file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById('photo').click()}
                        className="shrink-0"
                      >
                        <Camera className="h-4 w-4" />
                      </Button>
                    </div>
                    {selectedFile && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Selected: {selectedFile.name}
                      </p>
                    )}
                  </div>

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Submitting...' : 'Submit Issue'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="issues" className="p-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <List className="h-5 w-5" />
                  All Issues ({issues.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {issues.map((issue) => (
                    <div key={issue.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold">{issue.id}</h3>
                          <p className="text-sm text-muted-foreground">{issue.category}</p>
                        </div>
                        <Badge className={getStatusColor(issue.status)}>
                          {issue.status}
                        </Badge>
                      </div>
                      <p className="text-sm mb-2">{issue.description}</p>
                      <p className="text-xs text-muted-foreground">
                        📍 {issue.location} • {new Date(issue.created_at).toLocaleDateString()}
                      </p>
                      {issue.image_url && (
                        <img
                          src={issue.image_url}
                          alt="Issue"
                          className="mt-2 w-full h-32 object-cover rounded"
                        />
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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
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
                  />
                  <Button onClick={trackIssue}>
                    <Search className="h-4 w-4" />
                  </Button>
                </div>

                {trackedIssue && (
                  <div className="border rounded-lg p-4 bg-muted/50">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold">{trackedIssue.id}</h3>
                        <p className="text-sm text-muted-foreground">{trackedIssue.category}</p>
                      </div>
                      <Badge className={getStatusColor(trackedIssue.status)}>
                        {trackedIssue.status}
                      </Badge>
                    </div>
                    <p className="text-sm mb-2">{trackedIssue.description}</p>
                    <p className="text-xs text-muted-foreground">
                      📍 {trackedIssue.location} • Reported by: {trackedIssue.users?.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      📅 {new Date(trackedIssue.created_at).toLocaleString()}
                    </p>
                    {trackedIssue.image_url && (
                      <img
                        src={trackedIssue.image_url}
                        alt="Issue"
                        className="mt-2 w-full h-32 object-cover rounded"
                      />
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="map" className="p-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Map className="h-5 w-5" />
                  Issue Map
                </CardTitle>
                <CardDescription>
                  View all reported issues on the map
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MapComponent issues={issues} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile" className="p-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {userProfile && (
                  <div className="space-y-2">
                    <div>
                      <Label>Name</Label>
                      <p className="text-sm">{userProfile.name}</p>
                    </div>
                    <div>
                      <Label>Email</Label>
                      <p className="text-sm">{userProfile.email}</p>
                    </div>
                    <div>
                      <Label>Phone</Label>
                      <p className="text-sm">{userProfile.phone}</p>
                    </div>
                    <div>
                      <Label>Address</Label>
                      <p className="text-sm">{userProfile.address}</p>
                    </div>
                  </div>
                )}
                <Button onClick={handleSignOut} variant="destructive" className="w-full">
                  Sign Out
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t">
        <div className="flex justify-around py-2">
          <Button
            variant={activeTab === 'home' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('home')}
            className="flex-col h-auto py-2"
          >
            <Home className="h-4 w-4 mb-1" />
            <span className="text-xs">Home</span>
          </Button>
          <Button
            variant={activeTab === 'issues' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('issues')}
            className="flex-col h-auto py-2"
          >
            <List className="h-4 w-4 mb-1" />
            <span className="text-xs">Issues</span>
          </Button>
          <Button
            variant={activeTab === 'track' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('track')}
            className="flex-col h-auto py-2"
          >
            <Search className="h-4 w-4 mb-1" />
            <span className="text-xs">Track</span>
          </Button>
          <Button
            variant={activeTab === 'map' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('map')}
            className="flex-col h-auto py-2"
          >
            <Map className="h-4 w-4 mb-1" />
            <span className="text-xs">Map</span>
          </Button>
        </div>
      </div>
    </div>
  )
}