'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { toast } from "sonner"
import { Search, Filter, Edit, Eye, Calendar, MapPin, User } from "lucide-react"

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

const ISSUE_STATUSES = ['Submitted', 'Acknowledged', 'Resolved']

export default function IssueManagement({ onRefresh }) {
  const [issues, setIssues] = useState([])
  const [filteredIssues, setFilteredIssues] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedIssue, setSelectedIssue] = useState(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [departments, setDepartments] = useState([])
  
  // Filter states
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    category: '',
    department: '',
    dateFrom: '',
    dateTo: ''
  })

  // Edit form state
  const [editForm, setEditForm] = useState({
    status: '',
    assigned_department: '',
    admin_remarks: ''
  })

  useEffect(() => {
    loadIssues()
    loadDepartments()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [issues, filters])

  const loadIssues = async () => {
    try {
      const { data, error } = await supabase
        .from('issues')
        .select(`
          *,
          users (
            name,
            email,
            phone
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setIssues(data || [])
    } catch (error) {
      console.error('Failed to load issues:', error)
      toast.error('Failed to load issues')
    } finally {
      setLoading(false)
    }
  }

  const loadDepartments = async () => {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .eq('active', true)
        .order('name')

      if (error) throw error
      setDepartments(data || [])
    } catch (error) {
      console.error('Failed to load departments:', error)
      // Default departments if table doesn't exist yet
      setDepartments([
        { id: 1, name: 'Electricity', active: true },
        { id: 2, name: 'Municipality', active: true },
        { id: 3, name: 'Water Department', active: true },
        { id: 4, name: 'Traffic Department', active: true }
      ])
    }
  }

  const applyFilters = () => {
    let filtered = [...issues]

    // Search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase()
      filtered = filtered.filter(issue =>
        issue.id.toLowerCase().includes(searchTerm) ||
        issue.description.toLowerCase().includes(searchTerm) ||
        issue.location.toLowerCase().includes(searchTerm) ||
        issue.category.toLowerCase().includes(searchTerm) ||
        issue.users?.name?.toLowerCase().includes(searchTerm)
      )
    }

    // Status filter
    if (filters.status) {
      filtered = filtered.filter(issue => issue.status === filters.status)
    }

    // Category filter
    if (filters.category) {
      filtered = filtered.filter(issue => issue.category === filters.category)
    }

    // Department filter
    if (filters.department) {
      filtered = filtered.filter(issue => issue.assigned_department === filters.department)
    }

    // Date filters
    if (filters.dateFrom) {
      filtered = filtered.filter(issue => 
        new Date(issue.created_at) >= new Date(filters.dateFrom)
      )
    }

    if (filters.dateTo) {
      filtered = filtered.filter(issue => 
        new Date(issue.created_at) <= new Date(filters.dateTo)
      )
    }

    setFilteredIssues(filtered)
  }

  const handleEditIssue = (issue) => {
    setSelectedIssue(issue)
    setEditForm({
      status: issue.status || '',
      assigned_department: issue.assigned_department || '',
      admin_remarks: issue.admin_remarks || ''
    })
    setEditDialogOpen(true)
  }

  const handleUpdateIssue = async () => {
    if (!selectedIssue) return

    try {
      const { error } = await supabase
        .from('issues')
        .update({
          status: editForm.status,
          assigned_department: editForm.assigned_department,
          admin_remarks: editForm.admin_remarks,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedIssue.id)

      if (error) throw error

      toast.success('Issue updated successfully')
      setEditDialogOpen(false)
      loadIssues()
      onRefresh()
    } catch (error) {
      console.error('Failed to update issue:', error)
      toast.error('Failed to update issue')
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

  const clearFilters = () => {
    setFilters({
      search: '',
      status: '',
      category: '',
      department: '',
      dateFrom: '',
      dateTo: ''
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Issue Management</h2>
          <p className="text-slate-600">Manage and track all civic issues</p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-slate-600">
          <span>Total: {filteredIssues.length}</span>
          <span>•</span>
          <span>Pending: {filteredIssues.filter(i => i.status === 'Submitted').length}</span>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <div>
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Search issues..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  {ISSUE_STATUSES.map(status => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="category">Category</Label>
              <Select value={filters.category} onValueChange={(value) => setFilters(prev => ({ ...prev, category: value }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All categories</SelectItem>
                  {ISSUE_CATEGORIES.map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="department">Department</Label>
              <Select value={filters.department} onValueChange={(value) => setFilters(prev => ({ ...prev, department: value }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="All departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All departments</SelectItem>
                  {departments.map(dept => (
                    <SelectItem key={dept.id} value={dept.name}>{dept.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="dateFrom">From Date</Label>
              <Input
                id="dateFrom"
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="dateTo">To Date</Label>
              <Input
                id="dateTo"
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                className="mt-1"
              />
            </div>
          </div>
          
          <div className="flex justify-end mt-4">
            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Issues List */}
      <div className="space-y-4">
        {filteredIssues.map((issue) => (
          <Card key={issue.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-slate-800">{issue.id}</h3>
                    <Badge className={`${getStatusColor(issue.status)} text-white`}>
                      {issue.status}
                    </Badge>
                    {issue.assigned_department && (
                      <Badge variant="outline" className="bg-blue-50">
                        {issue.assigned_department}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                    <div>
                      <p className="text-sm text-slate-600 mb-1">
                        <strong>Category:</strong> {issue.category}
                      </p>
                      <p className="text-sm text-slate-700 mb-2">{issue.description}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600 flex items-center gap-1 mb-1">
                        <MapPin className="h-3 w-3" />
                        {issue.location}
                      </p>
                      <p className="text-sm text-slate-600 flex items-center gap-1 mb-1">
                        <User className="h-3 w-3" />
                        {issue.users?.name} ({issue.users?.email})
                      </p>
                      <p className="text-sm text-slate-600 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(issue.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {issue.admin_remarks && (
                    <div className="bg-blue-50 rounded-lg p-3 mb-3">
                      <p className="text-sm font-medium text-blue-800 mb-1">Admin Remarks:</p>
                      <p className="text-sm text-blue-700">{issue.admin_remarks}</p>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2 ml-4">
                  <Button size="sm" onClick={() => handleEditIssue(issue)}>
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                </div>
              </div>

              {issue.image_url && (
                <div className="mt-4">
                  <img
                    src={issue.image_url}
                    alt="Issue"
                    className="max-w-xs h-32 object-cover rounded-lg shadow-md"
                    onError={(e) => {
                      e.target.style.display = 'none'
                    }}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {filteredIssues.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-slate-500">No issues found matching your filters</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit Issue Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Issue: {selectedIssue?.id}</DialogTitle>
            <DialogDescription>
              Update issue status, assign department, and add remarks
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-status">Status</Label>
              <Select value={editForm.status} onValueChange={(value) => setEditForm(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {ISSUE_STATUSES.map(status => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="edit-department">Assign Department</Label>
              <Select value={editForm.assigned_department} onValueChange={(value) => setEditForm(prev => ({ ...prev, assigned_department: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No department</SelectItem>
                  {departments.map(dept => (
                    <SelectItem key={dept.id} value={dept.name}>{dept.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="edit-remarks">Admin Remarks</Label>
              <Textarea
                id="edit-remarks"
                placeholder="Add any remarks or updates..."
                value={editForm.admin_remarks}
                onChange={(e) => setEditForm(prev => ({ ...prev, admin_remarks: e.target.value }))}
                rows={4}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateIssue}>
                Update Issue
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}