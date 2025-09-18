/**
 * Supabase Storage Setup Script
 * Creates the 'issue-photos' bucket with proper configuration
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables')
  console.log('Required: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY')
  process.exit(1)
}

// Create client
const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function setupStorage() {
  try {
    console.log('🚀 Setting up Supabase storage for issue-photos...')
    console.log(`📍 Using Supabase URL: ${supabaseUrl}`)

    // 1. Check if bucket already exists
    console.log('🔍 Checking existing buckets...')
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()
    
    if (listError) {
      console.error('❌ Error listing buckets:', listError.message)
      console.log('💡 This might be due to insufficient permissions')
      console.log('💡 You may need to create the bucket manually in Supabase dashboard')
      return
    }

    console.log(`📦 Found ${buckets.length} existing buckets:`, buckets.map(b => b.name))

    const existingBucket = buckets.find(bucket => bucket.name === 'issue-photos')
    
    if (existingBucket) {
      console.log('✅ Bucket "issue-photos" already exists!')
      console.log('📋 Bucket details:', {
        name: existingBucket.name,
        public: existingBucket.public,
        createdAt: existingBucket.created_at
      })
    } else {
      // 2. Try to create the bucket
      console.log('📦 Creating "issue-photos" bucket...')
      
      const { data: bucketData, error: bucketError } = await supabase.storage.createBucket('issue-photos', {
        public: true,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/jpg'],
        fileSizeLimit: 5242880 // 5MB limit
      })

      if (bucketError) {
        console.error('❌ Error creating bucket:', bucketError.message)
        
        if (bucketError.message.includes('Unauthorized') || bucketError.message.includes('permission')) {
          console.log('')
          console.log('🔧 MANUAL SETUP REQUIRED:')
          console.log('1. Go to your Supabase dashboard')
          console.log('2. Navigate to Storage section')
          console.log('3. Click "Create bucket"')
          console.log('4. Name: issue-photos')
          console.log('5. Set as Public bucket: YES')
          console.log('6. Configure these settings:')
          console.log('   - Allowed MIME types: image/jpeg, image/png, image/webp, image/gif')
          console.log('   - File size limit: 5MB')
          console.log('7. Create RLS policies for authenticated users to upload')
        }
        return
      }

      console.log('✅ Bucket created successfully!')
      console.log('📋 Bucket data:', bucketData)
    }

    // 3. Test bucket access by attempting a small upload
    console.log('🧪 Testing bucket access...')
    
    // Create a small test file
    const testContent = 'test-upload-' + Date.now()
    const testFile = new Blob([testContent], { type: 'text/plain' })
    const testFileName = `test-${Date.now()}.txt`
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('issue-photos')
      .upload(testFileName, testFile)

    if (uploadError) {
      console.error('❌ Test upload failed:', uploadError.message)
      
      if (uploadError.message.includes('not found')) {
        console.log('💡 Bucket might not be properly created. Check Supabase dashboard.')
      } else if (uploadError.message.includes('Unauthorized')) {
        console.log('💡 RLS policies need to be set up. Check Storage > Policies in dashboard.')
      }
    } else {
      console.log('✅ Test upload successful!')
      console.log('📋 Upload data:', uploadData)
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('issue-photos')
        .getPublicUrl(testFileName)
      
      console.log('🔗 Public URL:', publicUrl)
      
      // Clean up test file
      const { error: deleteError } = await supabase.storage
        .from('issue-photos')
        .remove([testFileName])
      
      if (!deleteError) {
        console.log('🧹 Test file cleaned up')
      }
    }

    console.log('')
    console.log('🎉 Storage setup process completed!')
    console.log('')
    console.log('📝 Manual steps (if needed):')
    console.log('1. Ensure bucket "issue-photos" exists in Supabase Dashboard > Storage')
    console.log('2. Set bucket as Public (for public URL access)')
    console.log('3. Configure RLS policies to allow authenticated users to upload')
    console.log('4. Test image upload in your application')

  } catch (error) {
    console.error('❌ Setup failed with error:', error.message)
    console.log('🔧 Please check your Supabase configuration and permissions')
  }
}

// Run the setup
setupStorage()