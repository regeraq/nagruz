# НМ-100 Industrial Load Testing Equipment Website

## Overview

This is a professional B2B website for the НМ-100-Т220/400-П220-400-К2 industrial load testing device. The application presents technical specifications, benefits, and applications of load testing equipment used for diesel generators, gas turbine installations, UPS systems, and battery testing. The site targets industrial clients and decision-makers in sectors like power generation and critical infrastructure.

The application is built as a single-page React application with a modern, minimalist design focused on technical precision and professional credibility.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React 18+ with TypeScript in a single-page application (SPA) architecture.

**Routing**: Wouter for lightweight client-side routing. The application uses smooth scrolling navigation to different sections within a single home page rather than traditional multi-page routing.

**UI Component System**: Shadcn/ui component library based on Radix UI primitives, configured in "new-york" style. Components follow a consistent design system with:
- Tailwind CSS for styling with custom theme variables
- IBM Plex Sans and IBM Plex Mono fonts for professional, technical aesthetic
- Enterprise design system with industrial aesthetics
- Dark mode support with theme toggle functionality

**State Management**: 
- React Hook Form for form state management with Zod schema validation
- TanStack Query (React Query) for server state management
- Local React state for UI interactions (mobile menu, theme toggle)

**Build System**: Vite for fast development and optimized production builds with custom alias resolution for cleaner imports (@/, @shared/, @assets/).

### Backend Architecture

**Server Framework**: Express.js serving both API endpoints and static frontend assets in production.

**API Design**: RESTful API with a single `/api/contact` POST endpoint for form submissions. The endpoint handles:
- Form validation using Zod schemas
- File upload support with base64 encoding
- File size validation (10MB limit)
- File type validation (PDF, DOC, DOCX, XLS, XLSX)

**Data Storage**: In-memory storage implementation (MemStorage class) for contact form submissions. The storage interface (IStorage) provides abstraction for potential migration to database-backed storage.

**Development Tools**: 
- TypeScript with strict mode for type safety
- Custom Vite plugins for Replit integration (error overlay, cartographer, dev banner)
- Hot module replacement (HMR) in development

### Data Schema

**Contact Submissions**: Defined in `shared/schema.ts` using Drizzle ORM schema with PostgreSQL dialect preparation:
- User information: name, phone, email, company
- Message content
- Optional file attachment (name and base64-encoded data)
- Automatic timestamp tracking

**Validation**: Zod schemas generated from Drizzle schemas ensure type-safe validation on both client and server:
- Minimum length requirements for text fields
- Email format validation
- Phone number format validation
- File attachment optional fields

### Design System

**Typography**: IBM Plex Sans for readability and professional appearance with Cyrillic support. IBM Plex Mono for technical specifications and precise values.

**Color System**: HSL-based theming with CSS custom properties for both light and dark modes. Neutral base colors (220° hue) for professional industrial aesthetic with tech-blue accents.

**Layout Primitives**: 
- Consistent spacing using Tailwind's 4px-based scale
- Responsive breakpoints (mobile-first approach)
- Maximum width containers for content readability
- Full-width sections with centered content

**Component Patterns**:
- Card-based layouts for specifications and features
- Icon-driven visual communication (Lucide React icons)
- Badge system for technical labels
- Tab interface for organizing complex information
- Smooth scroll navigation between page sections

### Form Handling

**Client-Side**: React Hook Form with Zod resolver provides:
- Real-time validation feedback
- Error message display
- File upload with preview
- Form state management
- Submission handling with loading states

**Server-Side**: Express endpoint validates all submissions:
- Schema validation using shared Zod schemas
- File size and type verification
- Base64 data extraction from data URLs
- Error handling with appropriate HTTP status codes (400, 413)

## External Dependencies

### Core Framework Dependencies
- **React 18+**: UI library for component-based architecture
- **Express.js**: Backend server framework
- **Vite**: Build tool and development server
- **TypeScript**: Type-safe development

### UI Component Libraries
- **Radix UI**: Headless UI primitives for accessible components (@radix-ui/react-*)
- **Shadcn/ui**: Pre-built component system based on Radix
- **Lucide React**: Icon library for consistent iconography
- **Tailwind CSS**: Utility-first CSS framework

### State Management & Data Fetching
- **TanStack Query**: Server state management and caching
- **React Hook Form**: Form state and validation
- **Zod**: Schema validation library

### Database & ORM
- **Drizzle ORM**: TypeScript ORM configured for PostgreSQL
- **Drizzle Kit**: Schema management and migrations
- **@neondatabase/serverless**: PostgreSQL driver (prepared for future use)

### Routing & Navigation
- **Wouter**: Lightweight React router (3KB alternative to React Router)

### Development Tools
- **@replit/vite-plugin-***: Replit-specific development enhancements
- **PostCSS**: CSS processing with Tailwind
- **Autoprefixer**: Browser compatibility for CSS

### Fonts
- **Google Fonts CDN**: IBM Plex Sans and IBM Plex Mono served via CDN for professional typography

### Notable Architectural Decisions

**In-Memory vs Database Storage**: Currently using in-memory storage for contact submissions. The IStorage interface allows seamless migration to PostgreSQL using Drizzle ORM when persistence is required.

**File Upload Strategy**: Files are base64-encoded and stored as text rather than using external storage services. This simplifies deployment but has size limitations (10MB max).

**Single-Page Architecture**: All content is on one scrollable page rather than multiple routes, optimizing for landing page conversion and reducing navigation complexity.

**Theme System**: CSS custom properties enable runtime theme switching without rebuilding, supporting both light and dark modes based on user preference.

**Shared Schema Definition**: TypeScript types and Zod validation schemas are derived from a single Drizzle schema definition, ensuring consistency between client and server.