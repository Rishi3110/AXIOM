-- Database Schema Updates for Admin Dashboard
-- Run these SQL commands in your Supabase SQL Editor

-- 1. Create departments table
CREATE TABLE IF NOT EXISTS departments (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add admin fields to issues table
ALTER TABLE issues 
ADD COLUMN IF NOT EXISTS assigned_department VARCHAR(255),
ADD COLUMN IF NOT EXISTS admin_remarks TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 3. Insert default departments
INSERT INTO departments (name, description, contact_email, contact_phone, active) VALUES 
('Electricity', 'Handles electrical infrastructure and power supply issues', 'electricity@civic.gov', '+1-555-0101', true),
('Municipality', 'General municipal services and administration', 'municipality@civic.gov', '+1-555-0102', true),
('Water Department', 'Water supply, drainage, and water quality management', 'water@civic.gov', '+1-555-0103', true),
('Traffic Department', 'Traffic management, signals, and road safety', 'traffic@civic.gov', '+1-555-0104', true)
ON CONFLICT (name) DO NOTHING;

-- 4. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_issues_status ON issues(status);
CREATE INDEX IF NOT EXISTS idx_issues_assigned_department ON issues(assigned_department);
CREATE INDEX IF NOT EXISTS idx_issues_created_at ON issues(created_at);
CREATE INDEX IF NOT EXISTS idx_departments_active ON departments(active);

-- 5. Add Row Level Security (RLS) policies if needed
-- Note: This is optional and depends on your security requirements

-- Enable RLS on departments table
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

-- Policy to allow authenticated users to read departments
CREATE POLICY "Allow authenticated users to read departments" ON departments
    FOR SELECT USING (auth.role() = 'authenticated');

-- Policy to allow admin users to manage departments (you'll need to implement admin role checking)
CREATE POLICY "Allow admin users to manage departments" ON departments
    FOR ALL USING (
        auth.email() = 'admin@gmail.com' OR 
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.email = 'admin@gmail.com'
        )
    );

-- Update triggers for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON departments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_issues_updated_at BEFORE UPDATE ON issues 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();