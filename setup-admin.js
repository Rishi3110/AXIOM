/**
 * Setup script for admin user and database schema
 * This script creates the admin user and sets up necessary database tables
 */

import { supabase } from './lib/supabase.js'

async function setupAdmin() {
  console.log('🚀 Setting up admin user and database schema...')

  try {
    // 1. Create admin user
    console.log('1. Creating admin user...')
    const { data: adminUser, error: adminError } = await supabase.auth.admin.createUser({
      email: 'admin@gmail.com',
      password: 'admin',
      email_confirm: true
    })

    if (adminError && !adminError.message.includes('already exists')) {
      console.error('Error creating admin user:', adminError)
    } else {
      console.log('✅ Admin user created/verified:', 'admin@gmail.com')
    }

    // 2. Check and create departments table if it doesn't exist
    console.log('2. Setting up departments table...')
    
    // Try to query the table first
    const { data: existingDepts, error: tableError } = await supabase
      .from('departments')
      .select('id')
      .limit(1)

    if (tableError && tableError.code === '42P01') {
      console.log('⚠️  Departments table does not exist.')
      console.log('Please create it manually in Supabase with this SQL:')
      console.log(`
CREATE TABLE departments (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
      `)
    } else {
      console.log('✅ Departments table exists')
      
      // Add default departments if none exist
      const { data: deptCount } = await supabase
        .from('departments')
        .select('id', { count: 'exact' })

      if (!deptCount || deptCount.length === 0) {
        console.log('3. Creating default departments...')
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
          console.error('Error creating default departments:', insertError)
        } else {
          console.log('✅ Default departments created')
        }
      }
    }

    // 3. Check and update issues table schema
    console.log('4. Checking issues table schema...')
    
    // Check if admin fields exist by trying to select them
    const { data: sampleIssue, error: schemaError } = await supabase
      .from('issues')
      .select('assigned_department, admin_remarks')
      .limit(1)

    if (schemaError && schemaError.message.includes('does not exist')) {
      console.log('⚠️  Admin fields missing from issues table.')
      console.log('Please add these columns manually in Supabase with this SQL:')
      console.log(`
ALTER TABLE issues 
ADD COLUMN assigned_department VARCHAR(255),
ADD COLUMN admin_remarks TEXT,
ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
      `)
    } else {
      console.log('✅ Issues table schema is up to date')
    }

    console.log('\n🎉 Admin setup completed!')
    console.log('Admin credentials:')
    console.log('  Email: admin@gmail.com')
    console.log('  Password: admin')
    console.log('\nYou can now access the admin dashboard at: /admin')

  } catch (error) {
    console.error('❌ Setup failed:', error)
  }
}

// Run the setup
setupAdmin()