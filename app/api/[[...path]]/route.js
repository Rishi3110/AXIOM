import { NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabase.js'

// Helper function to handle CORS
function handleCORS() {
  return {
    'Access-Control-Allow-Origin': process.env.CORS_ORIGINS || '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
}

// Helper function to create response with CORS headers
function createResponse(data, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: handleCORS()
  })
}

// Handle preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: handleCORS()
  })
}

// GET handler
export async function GET(request) {
  try {
    const { pathname } = new URL(request.url)
    const path = pathname.replace('/api/', '')

    // Root endpoint
    if (!path || path === '') {
      return createResponse({ 
        message: 'Civic Reporter API is running!',
        endpoints: {
          '/api/issues': 'Get all issues',
          '/api/issues/[id]': 'Get specific issue',
          '/api/users': 'Get all users',
          '/api/health': 'Health check'
        }
      })
    }

    // Health check
    if (path === 'health') {
      return createResponse({ 
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: 'connected'
      })
    }

    // Get all issues
    if (path === 'issues') {
      const { data, error } = await supabase
        .from('issues')
        .select(`
          *,
          users (
            name,
            email
          )
        `)

      if (error) {
        console.error('Error fetching issues:', error)
        return createResponse({ error: 'Failed to fetch issues' }, 500)
      }

      return createResponse(data || [])
    }

    // Get specific issue by ID
    if (path.startsWith('issues/')) {
      const issueId = path.split('/')[1]
      
      const { data, error } = await supabase
        .from('issues')
        .select(`
          *,
          users (
            name,
            email
          )
        `)
        .eq('id', issueId)
        .single()

      if (error) {
        console.error('Error fetching issue:', error)
        return createResponse({ error: 'Issue not found' }, 404)
      }

      return createResponse(data)
    }

    // Get all users (limited info for privacy)
    if (path === 'users') {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, createdAt')

      if (error) {
        console.error('Error fetching users:', error)
        return createResponse({ error: 'Failed to fetch users' }, 500)
      }

      return createResponse(data || [])
    }

    // Route not found
    return createResponse({ error: 'Route not found' }, 404)

  } catch (error) {
    console.error('API Error:', error)
    return createResponse({ 
      error: 'Internal server error',
      message: error.message 
    }, 500)
  }
}

// POST handler
export async function POST(request) {
  try {
    const { pathname } = new URL(request.url)
    const path = pathname.replace('/api/', '')
    const body = await request.json()

    // Create new issue
    if (path === 'issues') {
      const { 
        id, 
        user_id, 
        description, 
        category, 
        location, 
        coordinates, 
        image_url 
      } = body

      if (!description || !category || !location || !user_id) {
        return createResponse({ 
          error: 'Missing required fields: description, category, location, user_id' 
        }, 400)
      }

      const { data, error } = await supabase
        .from('issues')
        .insert([{
          id: id || `CIV-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
          user_id,
          description,
          category,
          location,
          coordinates,
          image_url,
          status: 'Submitted'
        }])
        .select()
        .single()

      if (error) {
        console.error('Error creating issue:', error)
        return createResponse({ error: 'Failed to create issue' }, 500)
      }

      return createResponse(data, 201)
    }

    // Create new user profile
    if (path === 'users') {
      const { id, name, email, phone, address, aadhar_number } = body

      if (!id || !name || !email) {
        return createResponse({ 
          error: 'Missing required fields: id, name, email' 
        }, 400)
      }

      const { data, error } = await supabase
        .from('users')
        .insert([{
          id,
          name,
          email,
          phone,
          address,
          aadhar_number
        }])
        .select()
        .single()

      if (error) {
        console.error('Error creating user:', error)
        return createResponse({ error: 'Failed to create user' }, 500)
      }

      return createResponse(data, 201)
    }

    return createResponse({ error: 'Route not found' }, 404)

  } catch (error) {
    console.error('POST API Error:', error)
    return createResponse({ 
      error: 'Internal server error',
      message: error.message 
    }, 500)
  }
}

// PUT handler for updates
export async function PUT(request) {
  try {
    const { pathname } = new URL(request.url)
    const path = pathname.replace('/api/', '')
    const body = await request.json()

    // Update issue status
    if (path.startsWith('issues/')) {
      const issueId = path.split('/')[1]
      const { status } = body

      if (!status) {
        return createResponse({ error: 'Status is required' }, 400)
      }

      const validStatuses = ['Submitted', 'Acknowledged', 'Resolved']
      if (!validStatuses.includes(status)) {
        return createResponse({ 
          error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
        }, 400)
      }

      const { data, error } = await supabase
        .from('issues')
        .update({ 
          status,
          updatedAt: new Date().toISOString()
        })
        .eq('id', issueId)
        .select()
        .single()

      if (error) {
        console.error('Error updating issue:', error)
        return createResponse({ error: 'Failed to update issue' }, 500)
      }

      return createResponse(data)
    }

    return createResponse({ error: 'Route not found' }, 404)

  } catch (error) {
    console.error('PUT API Error:', error)
    return createResponse({ 
      error: 'Internal server error',
      message: error.message 
    }, 500)
  }
}

// DELETE handler
export async function DELETE(request) {
  try {
    const { pathname } = new URL(request.url)
    const path = pathname.replace('/api/', '')

    // Delete issue (admin only - would need auth check in production)
    if (path.startsWith('issues/')) {
      const issueId = path.split('/')[1]

      const { error } = await supabase
        .from('issues')
        .delete()
        .eq('id', issueId)

      if (error) {
        console.error('Error deleting issue:', error)
        return createResponse({ error: 'Failed to delete issue' }, 500)
      }

      return createResponse({ message: 'Issue deleted successfully' })
    }

    return createResponse({ error: 'Route not found' }, 404)

  } catch (error) {
    console.error('DELETE API Error:', error)
    return createResponse({ 
      error: 'Internal server error',
      message: error.message 
    }, 500)
  }
}