'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { toast } from "sonner"
import { Plus, Edit, Trash2, Settings, Building2 } from "lucide-react"

export default function DepartmentSettings() {
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingDepartment, setEditingDepartment] = useState(null)
  const [departmentForm, setDepartmentForm] = useState({
    name: '',
    description: '',
    contact_email: '',
    contact_phone: '',
    active: true
  })

  useEffect(() => {
    loadDepartments()
    initializeDepartments()
  }, [])

  const initializeDepartments = async () => {
    try {
      // Check if departments table exists and has data
      const { data: existingDepts, error: checkError } = await supabase
        .from('departments')
        .select('*')
        .limit(1)

      if (checkError && checkError.code === '42P01') {
        // Table doesn't exist, we'll create it via API or manual setup
        console.log('Departments table does not exist yet')
        return
      }

      if (!existingDepts || existingDepts.length === 0) {
        // Create default departments
        const defaultDepartments = [
          {
            name: 'Electricity',
            description: 'Handles electrical infrastructure and power supply issues',
            contact_email: 'electricity@civic.gov',
            contact_phone: '+1-555-0101',
            active: true
          },
          {
            name: 'Municipality',
            description: 'General municipal services and administration',
            contact_email: 'municipality@civic.gov',
            contact_phone: '+1-555-0102',
            active: true
          },
          {
            name: 'Water Department',
            description: 'Water supply, drainage, and water quality management',
            contact_email: 'water@civic.gov',
            contact_phone: '+1-555-0103',
            active: true
          },
          {
            name: 'Traffic Department',
            description: 'Traffic management, signals, and road safety',
            contact_email: 'traffic@civic.gov',
            contact_phone: '+1-555-0104',
            active: true
          }
        ]

        const { error: insertError } = await supabase
          .from('departments')
          .insert(defaultDepartments)

        if (insertError) {
          console.error('Failed to create default departments:', insertError)
        } else {
          toast.success('Default departments created successfully')
        }
      }
    } catch (error) {
      console.error('Error initializing departments:', error)
    }
  }

  const loadDepartments = async () => {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .order('name')

      if (error && error.code !== '42P01') {
        throw error
      }

      setDepartments(data || [])
    } catch (error) {
      console.error('Failed to load departments:', error)
      if (error.code === '42P01') {
        // Table doesn't exist, show empty state
        setDepartments([])
        toast.info('Departments table will be created when you add your first department')
      } else {
        toast.error('Failed to load departments')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCreateDepartment = () => {
    setEditingDepartment(null)
    setDepartmentForm({
      name: '',
      description: '',
      contact_email: '',
      contact_phone: '',
      active: true
    })
    setDialogOpen(true)
  }

  const handleEditDepartment = (department) => {
    setEditingDepartment(department)
    setDepartmentForm({
      name: department.name || '',
      description: department.description || '',
      contact_email: department.contact_email || '',
      contact_phone: department.contact_phone || '',
      active: department.active ?? true
    })
    setDialogOpen(true)
  }

  const handleSaveDepartment = async () => {
    if (!departmentForm.name.trim()) {
      toast.error('Department name is required')
      return
    }

    try {
      if (editingDepartment) {
        // Update existing department
        const { error } = await supabase
          .from('departments')
          .update({
            name: departmentForm.name,
            description: departmentForm.description,
            contact_email: departmentForm.contact_email,
            contact_phone: departmentForm.contact_phone,
            active: departmentForm.active,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingDepartment.id)

        if (error) throw error
        toast.success('Department updated successfully')
      } else {
        // Create new department
        const { error } = await supabase
          .from('departments')
          .insert([{
            name: departmentForm.name,
            description: departmentForm.description,
            contact_email: departmentForm.contact_email,
            contact_phone: departmentForm.contact_phone,
            active: departmentForm.active
          }])

        if (error) throw error
        toast.success('Department created successfully')
      }

      setDialogOpen(false)
      loadDepartments()
    } catch (error) {
      console.error('Failed to save department:', error)
      if (error.code === '42P01') {
        toast.error('Departments table needs to be created first. Please contact system administrator.')
      } else {
        toast.error('Failed to save department: ' + error.message)
      }
    }
  }

  const handleToggleActive = async (department) => {
    try {
      const { error } = await supabase
        .from('departments')
        .update({ 
          active: !department.active,
          updated_at: new Date().toISOString()
        })
        .eq('id', department.id)

      if (error) throw error
      
      toast.success(`Department ${!department.active ? 'activated' : 'deactivated'}`)
      loadDepartments()
    } catch (error) {
      console.error('Failed to toggle department status:', error)
      toast.error('Failed to update department status')
    }
  }

  const handleDeleteDepartment = async (department) => {
    if (!confirm(`Are you sure you want to delete the ${department.name} department? This action cannot be undone.`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('departments')
        .delete()
        .eq('id', department.id)

      if (error) throw error
      
      toast.success('Department deleted successfully')
      loadDepartments()
    } catch (error) {
      console.error('Failed to delete department:', error)
      toast.error('Failed to delete department')
    }
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
          <h2 className="text-2xl font-bold text-slate-800">Department Settings</h2>
          <p className="text-slate-600">Manage departments and their configurations</p>
        </div>
        <Button onClick={handleCreateDepartment}>
          <Plus className="h-4 w-4 mr-2" />
          Add Department
        </Button>
      </div>

      {/* Department Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {departments.map((department) => (
          <Card key={department.id} className={`relative ${!department.active ? 'opacity-60' : ''}`}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{department.name}</CardTitle>
                    <Badge variant={department.active ? "default" : "secondary"}>
                      {department.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEditDepartment(department)}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteDepartment(department)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {department.description && (
                <p className="text-sm text-slate-600">{department.description}</p>
              )}
              
              <div className="space-y-2">
                {department.contact_email && (
                  <div className="text-sm">
                    <span className="font-medium">Email:</span>
                    <span className="ml-2 text-slate-600">{department.contact_email}</span>
                  </div>
                )}
                
                {department.contact_phone && (
                  <div className="text-sm">
                    <span className="font-medium">Phone:</span>
                    <span className="ml-2 text-slate-600">{department.contact_phone}</span>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t">
                <div className="flex items-center justify-between">
                  <Label htmlFor={`active-${department.id}`} className="text-sm">
                    Active Status
                  </Label>
                  <Switch
                    id={`active-${department.id}`}
                    checked={department.active}
                    onCheckedChange={() => handleToggleActive(department)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {departments.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Building2 className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-800 mb-2">No Departments Found</h3>
            <p className="text-slate-600 mb-4">
              Create your first department to start organizing issue assignments
            </p>
            <Button onClick={handleCreateDepartment}>
              <Plus className="h-4 w-4 mr-2" />
              Add Department
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Department Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingDepartment ? 'Edit Department' : 'Create New Department'}
            </DialogTitle>
            <DialogDescription>
              {editingDepartment 
                ? 'Update department information and settings'
                : 'Add a new department to organize issue assignments'
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="dept-name">Department Name *</Label>
              <Input
                id="dept-name"
                placeholder="e.g., Water Department"
                value={departmentForm.name}
                onChange={(e) => setDepartmentForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="dept-description">Description</Label>
              <Input
                id="dept-description"
                placeholder="Brief description of department responsibilities"
                value={departmentForm.description}
                onChange={(e) => setDepartmentForm(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="dept-email">Contact Email</Label>
              <Input
                id="dept-email"
                type="email"
                placeholder="department@civic.gov"
                value={departmentForm.contact_email}
                onChange={(e) => setDepartmentForm(prev => ({ ...prev, contact_email: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="dept-phone">Contact Phone</Label>
              <Input
                id="dept-phone"
                type="tel"
                placeholder="+1-555-0123"
                value={departmentForm.contact_phone}
                onChange={(e) => setDepartmentForm(prev => ({ ...prev, contact_phone: e.target.value }))}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="dept-active"
                checked={departmentForm.active}
                onCheckedChange={(checked) => setDepartmentForm(prev => ({ ...prev, active: checked }))}
              />
              <Label htmlFor="dept-active">Active Department</Label>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveDepartment}>
                {editingDepartment ? 'Update' : 'Create'} Department
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}