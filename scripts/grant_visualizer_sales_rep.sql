-- Grant Visualizer access to sales_rep role
-- This enables sales representatives to access the 3D Visualizer

-- First check if the permission record exists; if not, create it; if yes, enable it
INSERT INTO module_permissions (module_key, role, is_enabled)
VALUES ('visualizer', 'sales_rep', true)
ON CONFLICT (module_key, role)
DO UPDATE SET is_enabled = true, updated_at = NOW();

-- Verify the change
SELECT module_key, role, is_enabled, updated_at 
FROM module_permissions 
WHERE module_key = 'visualizer' AND role = 'sales_rep';
