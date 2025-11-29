# Partner Registration Fix

## Problem

Partner registration was failing with "database saving error" because:

1. The `AuthContext` didn't pass company-specific metadata (`companyName`, `nip`)
2. The database trigger referenced non-existent columns (`first_name`, `last_name`)
3. Missing `phone` column in `profiles` table

## Code Changes (✅ Deployed)

- Updated `AuthContext.tsx` to pass all registration metadata including company data
- Fixed redirect logic in `LoginPage.tsx` and `PartnerLoginPage.tsx`

## Database Migration Required ⚠️

You need to run the SQL migration to fix the database trigger:

### Steps

1. Go to Supabase Dashboard: <https://supabase.com/dashboard>
2. Select your project
3. Navigate to **SQL Editor**
4. Copy and paste the contents of `fix_registration_trigger.sql`
5. Click **Run**

### What the migration does

- Adds missing columns: `phone`, `company_name`, `nip`
- Updates the `handle_new_user()` trigger to:
  - Use `full_name` instead of non-existent `first_name`/`last_name`
  - Properly map metadata fields from Supabase auth
  - Handle both standard and partner registrations

## Verification

After running the migration:

1. Try registering a new partner account
2. Check that the account is created with status "pending"
3. Approve the account in Admin → User Management
4. Login with the partner account

## Production URL
<https://offer-eytp1nn5e-tomaszs-projects-358bcf85.vercel.app>
