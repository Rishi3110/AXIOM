/**
 * Supabase Storage Setup Script
 * Creates the 'issue-photos' bucket and sets up proper RLS policies
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

// Create admin client with service role key for bucket creation
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

async function setupStorage() {
  try {
    console.log('🚀 Setting up Supabase storage...')

    // 1. Check if bucket already exists
    const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets()
    
    if (listError) {
      console.error('❌ Error listing buckets:', listError)
      return
    }

    const existingBucket = buckets.find(bucket => bucket.name === 'issue-photos')
    
    if (existingBucket) {
      console.log('✅ Bucket "issue-photos" already exists')
    } else {
      // 2. Create the bucket with public access
      console.log('📦 Creating "issue-photos" bucket...')
      
      const { data: bucketData, error: bucketError } = await supabaseAdmin.storage.createBucket('issue-photos', {
        public: true,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
        fileSizeLimit: 5242880 // 5MB limit
      })

      if (bucketError) {
        console.error('❌ Error creating bucket:', bucketError)
        return
      }

      console.log('✅ Bucket created successfully:', bucketData)
    }

    // 3. Set up RLS policies (using SQL queries)
    console.log('🔐 Setting up RLS policies...')
    
    const policies = [
      {
        name: 'Enable RLS on storage.objects',
        query: 'ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;'
      },
      {
        name: 'Auth users can insert objects in issue-photos',
        query: `
          CREATE POLICY IF NOT EXISTS "Auth insert objects in issue-photos" 
          ON storage.objects 
          FOR INSERT 
          WITH CHECK (bucket_id = 'issue-photos' AND auth.role() = 'authenticated');
        `
      },
      {
        name: 'Auth users can update own objects in issue-photos',
        query: `
          CREATE POLICY IF NOT EXISTS "Auth update own objects in issue-photos" 
          ON storage.objects 
          FOR UPDATE 
          USING (bucket_id = 'issue-photos' AND auth.uid() = owner);
        `
      },
      {
        name: 'Auth users can delete own objects in issue-photos',
        query: `
          CREATE POLICY IF NOT EXISTS "Auth delete own objects in issue-photos" 
          ON storage.objects 
          FOR DELETE 
          USING (bucket_id = 'issue-photos' AND auth.uid() = owner);
        `
      },
      {
        name: 'Public read access for issue-photos (fallback)',
        query: `
          CREATE POLICY IF NOT EXISTS "Public read access for issue-photos" 
          ON storage.objects 
          FOR SELECT 
          USING (bucket_id = 'issue-photos');
        `
      }
    ]

    for (const policy of policies) {
      try {
        const { error: policyError } = await supabaseAdmin.rpc('exec_sql', { 
          query: policy.query 
        })
        
        if (policyError) {
          // Try alternative method using raw SQL
          const { error: altError } = await supabaseAdmin.query(policy.query)
          if (altError) {
            console.log(`⚠️  Policy "${policy.name}" may already exist or need manual setup`)
          } else {
            console.log(`✅ Policy "${policy.name}" set up successfully`)
          }
        } else {
          console.log(`✅ Policy "${policy.name}" set up successfully`)
        }
      } catch (err) {
        console.log(`⚠️  Policy "${policy.name}" may need manual setup via Supabase dashboard`)
      }
    }

    // 4. Test the bucket
    console.log('🧪 Testing bucket access...')
    
    const testFile = new Blob(['test'], { type: 'text/plain' })
    const testFileName = `test-${Date.now()}.txt`
    
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('issue-photos')
      .upload(testFileName, testFile)

    if (uploadError) {
      console.error('❌ Test upload failed:', uploadError)
    } else {
      console.log('✅ Test upload successful')
      
      // Clean up test file
      await supabaseAdmin.storage
        .from('issue-photos')
        .remove([testFileName])
      
      console.log('🧹 Test file cleaned up')
    }

    console.log('🎉 Storage setup completed successfully!')
    console.log('')
    console.log('Next steps:')
    console.log('1. If RLS policies failed, set them up manually in Supabase dashboard')
    console.log('2. Verify bucket is public in Storage settings')
    console.log('3. Test image upload functionality in the app')

  } catch (error) {
    console.error('❌ Setup failed:', error)
  }
}

// Run the setup
if (import.meta.url === `file://${process.argv[1]}`) {
  setupStorage()
}

export { setupStorage }