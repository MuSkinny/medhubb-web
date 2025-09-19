# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🏥 Project Overview

**MedHubb** is a healthcare platform connecting patients with doctors through secure prescription management, appointment booking, and medical office administration. Built with Next.js 15, TypeScript, and Supabase.

## 🛠️ Development Commands

### Core Commands
```bash
# Development server (with Turbopack)
npm run dev

# Production build (with Turbopack optimization)
npm run build

# Production server
npm start

# Linting
npm run lint
```

### Environment Setup
Required environment variables:
```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Database Setup
Execute the complete database setup:
```sql
-- Run this file in Supabase SQL Editor
database/complete_setup_summary.sql
```

## 🏗️ Architecture Overview

### Technology Stack
- **Frontend**: Next.js 15 App Router, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Supabase PostgreSQL
- **Authentication**: Supabase Auth with JWT tokens
- **Security**: Row Level Security (RLS) policies
- **Styling**: Tailwind CSS with professional healthcare theme

### Project Structure
```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── prescriptions/ # Prescription management
│   │   ├── connections/   # Patient-doctor connections
│   │   ├── admin/         # Admin operations
│   │   └── auth/          # Authentication
│   ├── dashboard/         # User dashboards
│   │   ├── patient/       # Patient interface
│   │   └── doctor/        # Doctor interface
│   ├── login/             # Authentication pages
│   └── register/
├── components/            # Reusable React components
│   ├── ui/               # Base UI components
│   ├── Sidebar.tsx       # Role-based navigation
│   └── prescriptions/    # Prescription-specific components
├── lib/                  # Utility libraries
│   ├── supabaseClient.ts # Client-side Supabase config
│   ├── supabaseAdmin.ts  # Server-side admin client
│   └── middleware/       # Rate limiting & auth middleware
└── types/               # TypeScript type definitions
```

### Core Database Architecture

#### User Management
- **patients** table: Patient profiles with RLS
- **doctors** table: Doctor profiles with approval workflow
- **patient_doctor_connections**: Secure patient-doctor relationships

#### Prescription System (✅ Fully Implemented)
- **prescription_requests**: Main prescription requests
- **prescription_items**: Individual medications per request
- Complete workflow: request → doctor review → approve/reject/require appointment

#### Office & Appointment System (❌ Pending Implementation)
- **doctor_offices**: Medical office locations
- **doctor_office_schedules**: Office hours and availability
- **appointments**: Appointment booking system

### Security Architecture

#### Row Level Security (RLS)
All tables use RLS policies to ensure data isolation:
- Patients can only access their own data
- Doctors can only access connected patients' data
- Critical policy: `doctors_read_connected_patients` enables cross-table access

#### API Security Pattern
```typescript
// Standard API security pattern used throughout
export async function GET(req: Request) {
  // 1. Extract Bearer token
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: "Token required" }, { status: 401 });
  }

  // 2. Validate user with Supabase
  const token = authHeader.split(' ')[1];
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  });

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 3. Authorize specific access
  if (user.id !== requestedUserId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 4. Execute RLS-protected query
  const { data, error } = await supabase
    .from('table_name')
    .select('*')
    .eq('user_id', user.id);
}
```

### Frontend Patterns

#### Component Development
Follow existing patterns when creating new components:
- Look at `src/components/Sidebar.tsx` for navigation patterns
- Check `src/app/dashboard/patient/prescriptions/page.tsx` for form patterns
- Use `src/components/ui/` components for consistent styling

#### State Management Pattern
```typescript
// Standard state pattern used throughout
const [data, setData] = useState<DataType[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  const fetchData = async () => {
    try {
      setLoading(true);
      // API call with proper error handling
      const response = await fetch('/api/endpoint', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch');
      const result = await response.json();
      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };
  fetchData();
}, [dependencies]);
```

## 📋 Development Status

### ✅ Completed Features
1. **User Authentication**: Registration, login, role-based access
2. **Patient-Doctor Connections**: Request/approve workflow with RLS
3. **Prescription System**: Complete end-to-end prescription management
4. **Professional UI**: Healthcare-themed responsive design
5. **Security**: Enterprise-grade RLS policies and JWT authentication

### ❌ Pending Features (High Priority)
1. **Office Management**: Doctor office creation and scheduling (`src/app/dashboard/doctor/offices/`)
2. **Appointment System**: Patient booking and doctor calendar (`src/app/dashboard/*/appointments/`)
3. **Enhanced Patient Management**: Detailed patient lists and profiles

### Implementation Priority
1. **Next: Office Management** - Required for appointment booking
2. **Then: Appointment System** - Core feature dependent on offices
3. **Finally: UI Enhancements** - Polish and additional features

## 🔍 Code Conventions

### File Naming
- API routes: `/api/resource/route.ts` (Next.js App Router)
- Pages: `/dashboard/role/feature/page.tsx`
- Components: `PascalCase.tsx`
- Utilities: `camelCase.ts`

### TypeScript Usage
- Strict mode enabled in `tsconfig.json`
- Import aliases: `@/*` points to `src/*`
- All components and API handlers must be typed

### Styling
- Tailwind CSS with healthcare color scheme
- Blue primary (`blue-600`), green success (`green-600`), red danger (`red-600`)
- Responsive design patterns already established

### Database Queries
- Always use RLS-protected queries through Supabase client
- Prefer database functions for complex operations
- Follow established patterns in `/api/prescriptions/route.ts`

## 🚨 Important Notes

### Security Requirements
- Never bypass RLS policies or use direct SQL
- Always validate user authentication on API routes
- Use secure database functions for sensitive operations
- Rate limiting is implemented in `src/lib/middleware/rateLimit.ts`

### Testing
- Test all features with separate patient/doctor accounts
- Verify RLS policies prevent unauthorized access
- Check responsive design on mobile devices

### Known Working Features
- Prescription workflow is fully tested and production-ready
- Patient-doctor connections work correctly with real name display
- Authentication and role-based navigation are stable

### Database Functions
Use these secure functions instead of direct queries:
- `create_prescription_request()` - For new prescription requests
- `respond_to_prescription()` - For doctor responses
- `register_doctor()` / `register_patient()` - For user registration

## 📚 Key Files to Reference

### For API Development
- `src/app/api/prescriptions/route.ts` - Complete CRUD API example
- `src/lib/supabaseAdmin.ts` - Server-side database client
- `src/lib/middleware/rateLimit.ts` - Security middleware

### For UI Development
- `src/app/dashboard/patient/prescriptions/page.tsx` - Complex form example
- `src/app/dashboard/doctor/prescriptions/page.tsx` - Data display patterns
- `src/components/Sidebar.tsx` - Navigation and role handling

### For Database Reference
- `database/complete_setup_summary.sql` - Complete schema and security setup
- `PROJECT_STATUS.md` - Detailed implementation guide
- `TECHNICAL_SPECIFICATIONS.md` - Comprehensive technical documentation

## 🔄 Development Workflow

1. **Before starting**: Review existing patterns in similar components
2. **For new features**: Check if database tables exist in schema
3. **For API endpoints**: Follow the security pattern established
4. **For UI components**: Use existing Tailwind classes and patterns
5. **Testing**: Always test with both patient and doctor roles
6. **Security**: Verify RLS policies protect all new data access