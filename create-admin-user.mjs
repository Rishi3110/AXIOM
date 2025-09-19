import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL is required')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createAdminUser() {
  console.log('🚀 Creating admin user in Supabase...')

  try {
    // First, let's try to sign up the admin user normally
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: 'admin@gmail.com',
      password: 'admin'
    })

    if (signUpError) {
      if (signUpError.message.includes('already registered')) {
        console.log('✅ Admin user already exists')
        
        // Try to sign in to verify credentials work
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: 'admin@gmail.com',
          password: 'admin'
        })

        if (signInError) {
          console.log('⚠️  Admin user exists but password might be different')
          console.log('You may need to reset the password for admin@gmail.com')
        } else {
          console.log('✅ Admin user credentials verified')
        }
      } else {
        console.error('❌ Error creating admin user:', signUpError.message)
      }
    } else {
      console.log('✅ Admin user created successfully')
      console.log('User ID:', signUpData.user?.id)
    }

    // Create admin profile if it doesn't exist
    console.log('📝 Setting up admin profile...')
    
    // First get the user ID by email
    const { data: userData, error: userError } = await supabase.auth.signInWithPassword({
      email: 'admin@gmail.com',
      password: 'admin'
    })

    if (!userError && userData.user) {
      const { data: existingProfile, error: profileCheckError } = await supabase
        .from('users')
        .select('id')
        .eq('id', userData.user.id)
        .single()

      if (profileCheckError && profileCheckError.code === 'PGRST116') {
        // Profile doesn't exist, create it
        const { error: profileError } = await supabase
          .from('users')
          .insert([{
            id: userData.user.id,
            name: 'System Administrator',
            email: 'admin@gmail.com',
            phone: '+1-555-ADMIN',
            address: 'System Administration',
            aadhar_number: 'ADMIN-000000'
          }])

        if (profileError) {
          console.error('❌ Error creating admin profile:', profileError.message)
        } else {
          console.log('✅ Admin profile created')
        }
      } else {
        console.log('✅ Admin profile already exists')
      }
    }

    console.log('\n🎉 Admin setup completed!')
    console.log('Admin Login Credentials:')
    console.log('  📧 Email: admin@gmail.com')
    console.log('  🔑 Password: admin')
    console.log('\n🌐 Access the admin dashboard at: /admin')

  } catch (error) {
    console.error('❌ Setup failed:', error.message)
  }
}

// Run the setup
createAdminUser()