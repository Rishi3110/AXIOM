'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Shield, Lock } from "lucide-react"
import AdminDashboard from '@/components/admin/AdminDashboard'

export default function AdminLogin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: ''
  })

  useEffect(() => {
    checkAdminAuth()
  }, [])

  const checkAdminAuth = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error) throw error
      
      if (user && user.email === 'admin@gmail.com') {
        setIsAuthenticated(true)
      }
    } catch (error) {
      console.error('Auth check failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAdminLogin = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Check if this is the admin email
      if (loginForm.email !== 'admin@gmail.com') {
        throw new Error('Access denied. Admin credentials required.')
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginForm.email,
        password: loginForm.password
      })
      
      if (error) throw error
      
      if (data.user && data.user.email === 'admin@gmail.com') {
        setIsAuthenticated(true)
        toast.success('Welcome, Administrator!')
      } else {
        throw new Error('Access denied. Admin credentials required.')
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
      setIsAuthenticated(false)
      setLoginForm({ email: '', password: '' })
      toast.success('Signed out successfully')
    } catch (error) {
      toast.error('Error signing out')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 p-4">
        <div className="max-w-md mx-auto pt-20">
          <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur">
            <CardHeader className="text-center space-y-2">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-full flex items-center justify-center">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold text-slate-800">Admin Dashboard</CardTitle>
              <CardDescription>Civic Reporter Administration Portal</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div>
                  <Label htmlFor="email">Administrator Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter admin email"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm(prev => ({ ...prev, email: e.target.value }))}
                    required
                    className="border-slate-300 focus:border-blue-500"
                  />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter admin password"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                    required
                    className="border-slate-300 focus:border-blue-500"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800" 
                  disabled={loading}
                >
                  {loading ? 'Authenticating...' : (
                    <>
                      <Lock className="h-4 w-4 mr-2" />
                      Secure Login
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return <AdminDashboard onSignOut={handleSignOut} />
}