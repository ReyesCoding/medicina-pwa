# Overview

This is a comprehensive Medicine Curriculum Planner web application designed for medical students following the UTESA 2013 Medicine curriculum. The system is built as a full-stack Progressive Web App (PWA) that helps students plan their degree across 18 terms plus a capstone/thesis term. The application provides course management, schedule planning with conflict detection, prerequisite validation, and student progress tracking.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **React 18** with TypeScript for the user interface
- **Vite** as the build tool and development server with HMR support
- **Tailwind CSS** with custom design system for styling
- **shadcn/ui** component library for consistent UI components
- **Radix UI** primitives for accessible, headless components
- **TanStack Query** for client-side state management and data fetching
- **Wouter** for lightweight client-side routing

## Backend Architecture
- **Express.js** server with TypeScript
- **RESTful API** design with `/api` prefix for all endpoints
- **Middleware-based architecture** with request/response logging
- **File-based development** with Vite integration for development mode
- **ESBuild** for production bundling

## Data Storage Solutions
- **PostgreSQL** as the primary database with Neon serverless hosting
- **Drizzle ORM** for type-safe database operations and schema management
- **Local Storage** for client-side persistence of user preferences and progress
- **JSON files** for static course and section data during development

## Database Schema Design
- **Courses table**: Core curriculum data with prerequisites, credits, and term information
- **Sections table**: Class schedules, instructors, and enrollment data
- **Student Progress table**: Individual course completion tracking
- **Course Plans table**: Student planning and scheduling data
- **Relational structure** with foreign key constraints and proper indexing

## Authentication and Authorization
- **Session-based authentication** with PostgreSQL session storage
- **Connect-pg-simple** for session persistence
- **Role-based access** with admin mode for curriculum management
- **URL parameter authentication** for admin features (`?admin=...`)

## Progressive Web App Features
- **Service Worker** with network-first caching strategy
- **Web App Manifest** for installable experience
- **Responsive design** optimized for mobile and desktop
- **Offline capabilities** with local data caching

## State Management Pattern
- **Custom hooks** for domain-specific logic (courses, progress, scheduling)
- **Local Storage persistence** for user data
- **React Query** for server state synchronization
- **Context providers** for global state where needed

## Schedule Management System
- **Conflict detection** algorithm for overlapping time slots
- **Prerequisites validation** engine
- **Credit limit enforcement** per term
- **Elective grouping** by type (GEN, BASICAS, CLINICAS)

## Development Workflow
- **TypeScript** throughout the stack for type safety
- **Path aliasing** for clean imports (@/, @shared/, @assets/)
- **ESLint and Prettier** integration for code quality
- **Hot module replacement** for rapid development

# External Dependencies

## Database and ORM
- **Neon Database** - Serverless PostgreSQL hosting
- **Drizzle ORM** - Type-safe database operations
- **Drizzle Kit** - Database migrations and schema management

## UI and Styling
- **Tailwind CSS** - Utility-first CSS framework
- **Radix UI** - Headless component primitives
- **Lucide React** - Icon library
- **Class Variance Authority** - Component variant management

## Development and Build Tools
- **Vite** - Frontend build tool and dev server
- **TypeScript** - Static typing
- **ESBuild** - Production bundling
- **PostCSS** - CSS processing with Autoprefixer

## Runtime Libraries
- **React** - Frontend framework
- **Express** - Backend server framework
- **TanStack Query** - Data fetching and caching
- **React Hook Form** - Form management
- **Date-fns** - Date manipulation utilities

## PWA and Performance
- **Workbox** - Service worker management (via Vite plugin)
- **Web App Manifest** - PWA configuration
- **React Router** alternative (Wouter) for lightweight routing

## Session and State Management
- **Express Session** - Server-side session management
- **Connect-pg-simple** - PostgreSQL session store
- **Local Storage** - Client-side persistence

## Deployment and Hosting
- **Replit** - Development environment with live preview
- **Node.js** - Server runtime environment