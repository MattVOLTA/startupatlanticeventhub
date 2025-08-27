# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Startup Atlantic Event Hub is a React-based web application that aggregates and displays events from various startup ecosystem organizations in Atlantic Canada. The app syncs events from Eventbrite, analyzes them with OpenAI for categorization, and stores them in Supabase for efficient querying.

## Development Commands

### Essential Commands
```bash
# Development server
npm run dev

# Build for production  
npm run build

# Preview production build
npm run preview

# Sync events from Eventbrite API
npm run sync-events

# Analyze events with OpenAI for categorization
npm run analyze-events

# List all events in database
npm run list-events
```

### Testing & Validation Commands
```bash
# Test event analysis functionality
npm run test-analysis

# Test validation fixes
npm run test-fix

# Dry run event sync without database changes
npm run dry-run
```

Note: No linting or type-checking scripts are currently configured. Consider adding `eslint` and `tsc` scripts if needed.

## Architecture & Data Flow

### Core Architecture
1. **Frontend (React + TypeScript + Vite)**
   - Main entry: `src/App.tsx` - Central application with filtering, search, and view modes
   - State management via custom hooks with localStorage persistence
   - Tailwind CSS for styling with custom ocean/rock color theme
   - PWA support with offline capabilities

2. **Backend (Supabase)**
   - Project ID: `rlnaguafmnysmmhdpsry`
   - Region: ca-central-1
   - Real-time data fetching via Supabase client
   - Row-level security disabled (public read access)

3. **Data Pipeline**
   - **Sync**: `scripts/sync-events.js` fetches from Eventbrite API
   - **Analysis**: `scripts/analyze-events.js` uses OpenAI to generate summaries and categorize events
   - **Storage**: Events stored in Supabase with relationships to organizations and interests

### Database Schema

#### Key Tables
- **organizations**: Startup ecosystem organizations with Eventbrite IDs
- **events**: Event details including pricing (`is_free`), location, and AI-generated summaries
- **interests**: Event categories (e.g., "Networking", "Funding", "Technical Skills")
- **event_interests**: Many-to-many junction table

#### Critical Fields
- `events.is_free`: Boolean flag for event pricing (must sync correctly from Eventbrite)
- `events.detailed_summary`: AI-generated event description
- `events.id`: Uses Eventbrite event ID as primary key (text format)

### Component Structure

#### Core Components
- `Header.tsx`: Navigation with search and view toggle
- `CollapsibleFilters.tsx`: Multi-criteria filtering system
- `EventCard.tsx`: Individual event display with GTM tracking
- `CalendarView.tsx`: Calendar display mode with day details

#### Custom Hooks  
- `useEvents.ts`: Fetches and filters events from Supabase
- `useOrganizations.ts`: Manages organization data
- `useLocalStorage.ts`: Persists user preferences
- `useInterests.ts` / `useLocations.ts`: Filter option providers

### Third-Party Integrations

1. **Eventbrite API**
   - Token: `VITE_EVENTBRITE_TOKEN`
   - Fetches events with venue, ticket, and organizer data
   - 6-month rolling window for event retrieval

2. **OpenAI API**
   - Used for generating event summaries and interest categorization
   - GPT-4 model for analysis tasks
   - Batch processing with retry logic

3. **Google Tag Manager**
   - Tracks user interactions (filter changes, event clicks, searches)
   - Custom data layer events throughout components

## Environment Configuration

Required environment variables in `.env`:
```
VITE_SUPABASE_URL=https://rlnaguafmnysmmhdpsry.supabase.co
VITE_SUPABASE_ANON_KEY=[your-anon-key]
VITE_EVENTBRITE_TOKEN=[your-eventbrite-token]
OPENAI_API_KEY=[your-openai-key]
```

## Key Implementation Details

### Event Synchronization
- Events filtered by `is_shareable = true` and future `end_date`
- Structured content fetched separately for detailed descriptions
- HTML stripping and text normalization applied to content
- Organization relationships maintained via UUID foreign keys

### Performance Optimizations
- PWA with service worker caching
- Runtime caching for Eventbrite API and images
- Batch database operations in sync scripts
- Debounced search with localStorage persistence

### Error Handling Patterns
- Graceful fallbacks for missing event data
- Retry logic in API calls with exponential backoff
- User-friendly error messages in UI components
- Validation checks before database operations

## Important Considerations

1. **Data Integrity**: Always verify `is_free` field syncs correctly from Eventbrite
2. **API Rate Limits**: Scripts include delays to respect Eventbrite/OpenAI limits
3. **Database Migrations**: Run migrations sequentially (see `migrations/` folder)
4. **TypeScript Types**: Database types generated in `src/types/database.ts`
5. **GTM Integration**: All user interactions should fire appropriate tracking events