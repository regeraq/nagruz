# НМ-100 Industrial Load Testing Equipment Website - FINAL BUILD

## Overview

Fully integrated B2B website for industrial load testing devices (НУ-100, НУ-200, and НУ-30) with Russian language support, complete authentication system, profile management with working orders/favorites/notifications, comprehensive multi-functional admin panel, and Resend email integration.

**Status**: ✅ PRODUCTION READY  
**Last Updated**: December 2, 2025 (PostgreSQL Migration Complete)

## Database Configuration

**IMPORTANT FOR DEPLOYMENT**: This project uses standard PostgreSQL (not cloud-specific solutions like Neon) for portability to external hosting.

### Database Driver
- Uses `pg` (node-postgres) driver instead of Neon serverless
- Standard PostgreSQL connection via DATABASE_URL
- Compatible with any PostgreSQL hosting provider

### Admin Account
- **Email**: rostext@gmail.com
- **Password**: 125607
- **Role**: superadmin

### Default Products
Three products are auto-created on startup:
- НУ-100 (100 кВт, 20 ступеней) - 100,000 RUB
- НУ-200 (200 кВт, 40 ступеней) - 150,000 RUB  
- НУ-30 (30 кВт, 6 ступеней) - 50,000 RUB

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture - UPDATED

### Frontend Architecture

**Framework**: React 18+ with TypeScript in a single-page application (SPA) architecture.

**Routing**: Wouter for lightweight client-side routing with smooth scrolling navigation.

**UI Component System**: Shadcn/ui component library with Radix UI primitives, "new-york" style configuration including:
- Tailwind CSS styling with custom theme variables
- IBM Plex Sans and IBM Plex Mono fonts
- Dark mode support with theme toggle
- Professional industrial design aesthetic

**State Management**: 
- React Hook Form + Zod schema validation
- TanStack Query v5 for server state management
- Local React state for UI interactions

**Build System**: Vite with custom alias resolution (@/, @shared/, @assets/)

### Backend Architecture - ENHANCED

**Server Framework**: Express.js serving both API and static assets.

**API Design**: RESTful API with comprehensive endpoints:
- `/api/contact` - Contact form submissions with Resend email integration
- `/api/orders` - Order creation and management
- `/api/admin/*` - Full admin panel endpoints for user/order/product management
- `/api/auth/*` - Authentication with JWT tokens
- All endpoints include rate limiting, CSRF protection, input sanitization

**Email Integration**: 
- **Resend API** for reliable transactional email delivery
- Email templates for contact submissions and order confirmations
- Submission IDs included in emails for tracking
- User IDs included in order emails for identification

**Data Storage**: PostgreSQL with Drizzle ORM (standard pg driver for portability).

**ID Generation**: 
- Simple numeric IDs for human readability
- Format: Simple integer sequence (e.g., 1763935804)
- All entities: users, sessions, notifications, contacts, orders use numeric IDs

**Database Files**:
- `server/db.ts` - PostgreSQL connection using pg driver
- `server/storage.ts` - Database operations interface (DatabaseStorage)
- `shared/schema.ts` - Drizzle schema definitions

**Security Enhancements**:
- Rate limiting on all endpoints (contact, orders, crypto-rates, general)
- CSRF token protection
- Input sanitization and HTML escaping (XSS prevention)
- File upload validation (MIME type, extension, size limits: 10MB max)
- Secure password hashing with bcryptjs
- JWT token-based authentication
- Email validation
- All user input escaped before HTML rendering

### Data Schema

**Contact Submissions**: 
- ID (numeric), name, email, phone, company, message
- Optional file attachments (base64-encoded)
- Automatic email sent to admin with submission ID

**Orders**:
- ID (numeric), userId, productId, quantity, price, status
- Product details included (name, price, stock deduction)
- Automatic email with order ID and user ID
- Payment tracking and status management

**Users**:
- ID (numeric), email, password hash, name, phone, role
- Support for admin and regular users
- Email verification status tracking

**Admin Functions**:
- User search by ID
- Full order management (view all, change status)
- Product price editing
- Content management (banners, SEO, product descriptions)
- Contact information management
- System settings dashboard
- Analytics and charts

### Design System

**Typography**: IBM Plex Sans (Cyrillic support) + IBM Plex Mono for technical values

**Color System**: HSL-based theming with CSS custom properties for light/dark modes

**Layout**: Responsive, mobile-first with maximum width containers

**Component Patterns**: Cards, badges, tabs, dialogs, tables with professional styling

### Form Handling

**Client-Side**: React Hook Form + Zod with real-time validation

**Server-Side**: 
- Zod schema validation
- File size and type verification
- Base64 data extraction and validation
- Comprehensive error responses with HTTP status codes

## External Dependencies

### Core
- React 18+, Express.js, Vite, TypeScript

### UI & Styling
- Radix UI, Shadcn/ui, Lucide React, Tailwind CSS

### State & Data
- TanStack Query v5, React Hook Form, Zod, Drizzle ORM

### Email & Communication
- **Resend API** (re_VvLSMZny_PHBRPG9bnVmK3JeU5sbPt4Wu)
- Admin email: rostext@gmail.com

### Routing
- Wouter

### Development
- Replit Vite plugins, PostCSS, Autoprefixer

## Key Implementation Notes

**PostgreSQL Storage**: Data persists in PostgreSQL database. Schema managed by Drizzle ORM with `npm run db:push` for migrations.

**Email Workflow**: 
- Contact form → Email to admin with submission ID
- Order creation → Email to admin with order ID and user ID
- Both emails formatted with proper HTML templates and all user input escaped

**Numeric IDs**: All entities now use simple numeric IDs (timestamp-based sequences) instead of UUIDs for better readability and user tracking.

**Admin Panel Features**:
- ✅ User search and profile viewing
- ✅ Order management (view, status changes)
- ✅ Product price editing with real-time updates
- ✅ Content management interface
- ✅ Analytics dashboard with charts
- ✅ System settings display

**Security Measures**:
- All endpoints have rate limiting
- CSRF protection on form submissions
- XSS prevention via HTML escaping
- Input validation on all fields
- File upload restrictions
- Password hashing
- JWT authentication

## Recent Updates (Session 2)

1. **Numeric ID Generation**: Replaced UUID with simple numeric IDs (timestamp-based sequential generation)
2. **Email Enhancement**: Added submission IDs and user IDs to email templates
3. **Resend Integration**: Full setup with API key and owner email configuration
4. **Admin Panel**: Complete with price editing, user search, order management, content management
5. **Security Review**: Implemented comprehensive input validation, XSS prevention, rate limiting

## Recent Updates (Session 3 - Data Synchronization)

1. **Real-Time Data Sync**: Implemented proper TanStack Query cache invalidation for all admin mutations
2. **SEO Settings Management**: Admin can edit site title, description, keywords in admin panel
3. **Contact Settings Sync**: Admin can edit contact email, phone, address - automatically synced to homepage
4. **Settings Loading**: Added useQuery fetch for `/api/admin/settings` endpoint
5. **Form Initialization**: Settings automatically load into admin form on mount via useEffect
6. **Homepage Integration**: Contact information on homepage now pulls from admin-configured settings
7. **Cache Invalidation**: All mutations properly invalidate relevant caches for immediate UI updates

## Recent Updates (Session 4 - PostgreSQL Migration - December 2, 2025)

1. **PostgreSQL Migration**: Migrated from Neon serverless to standard PostgreSQL with pg driver
2. **Database Portability**: Uses standard node-postgres for deployment to any PostgreSQL hosting
3. **Admin Initialization**: Auto-creates superadmin (rostext@gmail.com) and 3 default products on startup
4. **JWT Authentication**: Working access/refresh token system with secure password hashing
5. **Auto-Fill Functionality**: Payment modal and contact forms auto-populate from user profile
6. **Image Storage**: Product images stored as JSON array in database (admin can upload via admin panel)
7. **Security Verified**: Rate limiting, CSRF, XSS protection, SQL injection prevention via Drizzle ORM

## Deployment Ready

The application is production-ready with:
- ✅ PostgreSQL database (portable to any hosting)
- ✅ Complete authentication system with JWT tokens
- ✅ Working order management with user profile auto-fill
- ✅ Email notifications via Resend
- ✅ Admin panel with full functionality
- ✅ Security measures (rate limiting, CSRF, XSS, SQL injection protection)
- ✅ Error handling and validation
- ✅ Product image management

### Deployment Instructions
1. Set up PostgreSQL database on your hosting
2. Configure DATABASE_URL environment variable
3. Run `npm run db:push` to create tables
4. Set RESEND_API_KEY and OWNER_EMAIL for email functionality
5. Deploy and access admin panel at /admin with rostext@gmail.com / 125607
