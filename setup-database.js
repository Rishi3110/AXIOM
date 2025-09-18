const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://cfvcfssqxjguquqvkoxo.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmdmNmc3NxeGpndXF1cXZrb3hvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODE5NTEzOCwiZXhwIjoyMDczNzcxMTM4fQ.zB4E6m9ZEpCrG5SEbrkYmHXBq8KvXrtsHfHY3GuabIo'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function setupDatabase() {
  try {
    console.log('🚀 Setting up Supabase database...')
    
    // Execute database setup SQL
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        -- Drop existing tables if they exist
        DROP TABLE IF EXISTS issues;
        DROP TABLE IF EXISTS users;

        -- Create users table
        CREATE TABLE users (
          id UUID PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          phone TEXT,
          address TEXT,
          aadhar_number TEXT,
          "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Create issues table
        CREATE TABLE issues (
          id TEXT PRIMARY KEY,
          user_id UUID NOT NULL,
          description TEXT NOT NULL,
          category TEXT NOT NULL,
          location TEXT NOT NULL,
          coordinates JSONB,
          image_url TEXT,
          status TEXT DEFAULT 'Submitted',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          FOREIGN KEY (user_id) REFERENCES users(id)
        );

        -- Enable Row Level Security
        ALTER TABLE users ENABLE ROW LEVEL SECURITY;
        ALTER TABLE issues ENABLE ROW LEVEL SECURITY;

        -- Create policies for public access (for MVP - in production, you'd want more restrictive policies)
        CREATE POLICY "Allow public read on users" ON users FOR SELECT USING (true);
        CREATE POLICY "Allow public insert on users" ON users FOR INSERT WITH CHECK (true);
        CREATE POLICY "Allow public update on users" ON users FOR UPDATE USING (true);

        CREATE POLICY "Allow public read on issues" ON issues FOR SELECT USING (true);
        CREATE POLICY "Allow public insert on issues" ON issues FOR INSERT WITH CHECK (true);
        CREATE POLICY "Allow public update on issues" ON issues FOR UPDATE USING (true);
        CREATE POLICY "Allow public delete on issues" ON issues FOR DELETE USING (true);

        -- Create indexes for performance
        CREATE INDEX idx_issues_user_id ON issues(user_id);
        CREATE INDEX idx_issues_status ON issues(status);
        CREATE INDEX idx_issues_category ON issues(category);
        CREATE INDEX idx_issues_created ON issues(created_at DESC);
        CREATE INDEX idx_users_email ON users(email);

        -- Auto-update timestamp trigger function
        CREATE OR REPLACE FUNCTION update_timestamp()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW."updatedAt" = NOW();
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        -- Create triggers for updated_at
        DROP TRIGGER IF EXISTS update_users_timestamp ON users;
        CREATE TRIGGER update_users_timestamp
          BEFORE UPDATE ON users
          FOR EACH ROW
          EXECUTE FUNCTION update_timestamp();

        DROP TRIGGER IF EXISTS update_issues_timestamp ON issues;
        CREATE TRIGGER update_issues_timestamp
          BEFORE UPDATE ON issues
          FOR EACH ROW
          EXECUTE FUNCTION update_timestamp();
      `
    })

    if (error) {
      console.error('❌ Error setting up database:', error)
      
      // Try alternative approach - create tables individually
      console.log('📝 Trying alternative setup method...')
      
      // Create users table
      const { error: usersError } = await supabase
        .from('users')
        .select('id')
        .limit(1)
      
      if (usersError && usersError.code === 'PGRST116') {
        console.log('Creating users table...')
        // Table doesn't exist, we need to create it via SQL
        throw new Error('Database tables need to be created manually. Please run the SQL commands in Supabase dashboard.')
      }
      
    } else {
      console.log('✅ Database setup completed successfully!')
    }

    // Test the connection
    const { data: testData, error: testError } = await supabase
      .from('users')
      .select('count')
      .limit(1)
    
    if (testError) {
      console.log('⚠️  Table creation might be needed. Error:', testError.message)
    } else {
      console.log('✅ Database connection test passed!')
    }

    // Create storage bucket for issue photos if it doesn't exist
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()
    
    if (!bucketsError) {
      const issuePhotosBucket = buckets.find(bucket => bucket.name === 'issue-photos')
      
      if (!issuePhotosBucket) {
        console.log('📸 Creating issue-photos storage bucket...')
        const { error: bucketError } = await supabase.storage.createBucket('issue-photos', {
          public: true,
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp']
        })
        
        if (bucketError) {
          console.error('❌ Error creating storage bucket:', bucketError)
        } else {
          console.log('✅ Storage bucket created successfully!')
        }
      } else {
        console.log('✅ Storage bucket already exists!')
      }
    }

  } catch (error) {
    console.error('❌ Setup failed:', error.message)
    
    console.log('\n📋 Manual Setup Required:')
    console.log('Please run the following SQL in your Supabase dashboard (SQL Editor):')
    console.log(`
-- Create users table
CREATE TABLE users (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  address TEXT,
  aadhar_number TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create issues table
CREATE TABLE issues (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  location TEXT NOT NULL,
  coordinates JSONB,
  image_url TEXT,
  status TEXT DEFAULT 'Submitted',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;

-- Create policies for public access
CREATE POLICY "Allow public read on users" ON users FOR SELECT USING (true);
CREATE POLICY "Allow public insert on users" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on users" ON users FOR UPDATE USING (true);

CREATE POLICY "Allow public read on issues" ON issues FOR SELECT USING (true);
CREATE POLICY "Allow public insert on issues" ON issues FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on issues" ON issues FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on issues" ON issues FOR DELETE USING (true);

-- Create indexes
CREATE INDEX idx_issues_user_id ON issues(user_id);
CREATE INDEX idx_issues_status ON issues(status);
CREATE INDEX idx_issues_category ON issues(category);
CREATE INDEX idx_issues_created ON issues(created_at DESC);
CREATE INDEX idx_users_email ON users(email);
    `)
    
    console.log('\nAlso create a storage bucket named "issue-photos" in Supabase Storage.')
  }
}

setupDatabase()