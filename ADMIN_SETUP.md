# Admin Setup Documentation

## Admin Login Fix (2025-09-17)

### Issue
The `/admin` login was not working because the admin user existed in `auth.users` but was missing from the `admin_profiles` table.

### Root Cause
The authentication logic in `src/contexts/AuthContext.tsx` checks for admin privileges by querying the `admin_profiles` table. Without an entry in this table, users cannot access admin features even if they have valid authentication credentials.

### Solution
Added the admin user to the `admin_profiles` table:

```sql
INSERT INTO admin_profiles (id, email)
VALUES ('44a78f89-b03d-48e9-9dc7-0771c1cecdc4', 'admin@startupatlantic.ca');
```

### Verification
The admin user can now:
1. Sign in at `/login`
2. Be correctly identified as an admin
3. Access the admin dashboard at `/admin`

### Future Admin Users
To add new admin users:
1. Create the user account in Supabase Auth
2. Add their user ID and email to the `admin_profiles` table
3. They will automatically have admin access upon next login