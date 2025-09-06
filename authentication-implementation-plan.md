# Server-Side Application Database & Authentication Implementation Plan

## Executive Summary

**Goal**: Transform Insight Magician from an open-access tool to a secure, user-authenticated dashboard platform.

**Scope**: 7 phases implementing application database, magic link authentication, route protection, and frontend integration.

**Approach**: Incremental implementation starting with database foundation, building through authentication infrastructure, and completing with UI integration.

**Architecture Context**: Extends existing Bun.serve application with authentication layer while maintaining complete separation from user-uploaded databases.

## Current State Analysis

### Database Architecture
- **User Databases**: SQLite files uploaded to `./uploads/` directory (read-only access)
- **DatabaseManager**: Handles user database connections (`lib/database.js`)
- **No App Database**: Zero persistent application state or user management

### Authentication & Sessions  
- **No Authentication**: Completely open access to all functionality
- **Client-Side Only**: Widget/dashboard state in browser `sessionStorage`
- **No Server Sessions**: No user identity, session management, or access control

### Server Architecture
- **Bun.serve**: Modern runtime with route-based handling (`index.js`)
- **API Routes**: `/api/upload`, `/api/schema`, `/api/query`, `/api/chat`
- **Static Serving**: Frontend components and assets from `/public/`

### Frontend Architecture
- **Component-Based SPA**: Modular UI components (`public/components/`)
- **No Auth Awareness**: UI assumes unrestricted access
- **Session Storage**: Local persistence only, no server coordination

## Implementation Strategy

### Phase 1: Application Database Foundation

**Goal**: Establish secure application database separate from user uploads

**Feature Added**: SQLite application database with user and session tables

**Why First**: 
- Foundation for all authentication functionality
- Zero risk to existing user data
- Can be tested independently
- Required by all subsequent phases

**Task List** (Check off completed tasks with ✅):

#### Core Database Implementation
- [✅] Create `lib/schemas/app-database.sql` with users, auth_tokens, and sessions table definitions
- [✅] Create `lib/app-database.js` - AppDatabase class with initialization and user operations
- [✅] Implement schema loading and execution from SQL file on database initialization
- [✅] Add database file creation logic (creates `./app.db` if it doesn't exist)
- [✅] Add user management methods (create, find, update)
- [✅] Ensure complete separation from `./uploads/` directory

#### System Integration
- [✅] Update `index.js` to connect to existing app database on startup  
- [✅] Add global database instance for route access
- [✅] Create database setup script (`make setup-db`) for development
- [✅] Add environment variable configuration for database path

#### Quality Assurance
- [✅] Write unit tests for AppDatabase class operations
- [✅] Test database schema creation from SQL file
- [✅] Test database initialization on fresh install
- [✅] Verify isolation from user upload system
- [✅] Run `make test-unit` to ensure all unit tests pass
- [✅] Run `make check` for code quality validation

**Success Criteria:**
- App database creates successfully at `./app.db`
- User table operations work correctly
- Database completely isolated from user uploads
- All tests pass

**Manual Testing:**
- [✅] Start server and verify `app.db` is created
- [✅] Confirm no interference with user database uploads
- [✅] Test database operations through unit tests

### Phase 2: Authentication Infrastructure

**Goal**: Implement magic link authentication system with email integration

**Feature Added**: Magic link generation, token validation, and session management

**Why Second**: 
- Builds directly on Phase 1 database foundation
- Core authentication logic required before route protection
- Can be tested independently with mocked email
- Sets up session management for frontend integration

**Task List** (Check off completed tasks with ✅):

#### Authentication Manager Implementation
- [✅] Create `lib/auth.js` - AuthManager class with magic link workflow
- [✅] Implement secure token generation using `crypto.randomBytes(32).toString('hex')`
- [✅] Add email validation and user creation/retrieval logic
- [✅] Build token storage with 24-hour expiration
- [✅] Create session management (creation, validation, cleanup)
- [✅] Add logout functionality with session cleanup

#### Email Service Integration
- [✅] Create `lib/email.js` - EmailService class for magic link delivery using Nodemailer
- [✅] Configure SMTP transporter with environment variable support
- [✅] Design HTML email template with branded styling
- [✅] Implement development mode (send real emails + console logging for easy testing)
- [✅] Add configuration support for production SMTP providers (Gmail, SendGrid, AWS SES)
- [✅] Create email sending workflow with error handling and connection verification
- [✅] Add environment variable configuration for SMTP settings

#### Security Implementation
- [✅] Implement cryptographically secure token generation using built-in `crypto.randomBytes(32).toString('hex')`
- [✅] Add single-use token validation (mark as used)
- [✅] Create cryptographically secure session IDs using `crypto.randomBytes(32).toString('hex')` (not auto-increment)
- [✅] Add token and session expiration validation and cleanup
- [✅] Implement proper error handling for auth failures

#### Quality Assurance
- [✅] Write unit tests for AuthManager operations
- [✅] Test email service with mocked SMTP
- [✅] Test token generation, validation, and expiration
- [✅] Test session lifecycle (create, validate, expire, logout)
- [✅] Run `make test-unit` to ensure all unit tests pass
- [✅] Run `make check` for code quality validation

**Success Criteria:**
- Magic link tokens generate securely and validate correctly
- Email service sends login links (development mode)
- Session management works end-to-end
- Token expiration and single-use validation works
- All authentication tests pass

**Manual Testing:**
- [✅] Generate magic link and verify token format
- [✅] Test token expiration (mock time if needed)
- [✅] Verify email template rendering
- [✅] Test session creation and validation

### Phase 3: Route Protection & New Endpoints

**Goal**: Secure existing API routes and add authentication endpoints

**Feature Added**: Authentication middleware and public auth routes (login, verify, status, logout)

**Why Third**: 
- Requires Phase 2 authentication infrastructure
- Protects existing functionality without breaking it
- Enables testing of complete auth flow
- Foundation for frontend integration

**Task List** (Check off completed tasks with ✅):

#### Authentication Middleware
- [✅] Create `lib/middleware/auth.js` - requireAuth middleware function
- [✅] Implement session token extraction from cookies/headers
- [✅] Add user validation and request context injection
- [✅] Create 401 error responses for unauthenticated requests
- [✅] Add proper error handling for auth middleware failures

#### Authentication Routes
- [✅] Create `routes/auth.js` with authentication endpoint handlers
- [✅] Implement `/api/auth/login` - email validation and magic link sending
- [✅] Implement `/api/auth/verify` - token validation and session creation with HTTP-only cookies
- [✅] Implement `/api/auth/status` - current authentication status check
- [✅] Implement `/api/auth/logout` - session cleanup and cookie clearing
- [✅] Configure HTTP-only session cookies with Secure and SameSite flags
- [✅] Add proper error handling and response formatting

#### Route Protection Integration
- [✅] Update `index.js` to add authentication routes
- [✅] Apply requireAuth middleware to existing protected routes:
  - [✅] `/api/upload` - database upload protection
  - [✅] `/api/schema` - schema access protection  
  - [✅] `/api/query` - query execution protection
  - [✅] `/api/chat` - AI chat protection
- [✅] Ensure backward compatibility for existing functionality

#### Quality Assurance
- [ ] Write unit tests for authentication middleware
- [ ] Test each authentication endpoint independently
- [ ] Test route protection with valid and invalid sessions
- [ ] Verify existing functionality works with authentication
- [ ] Run `make test-unit` to ensure all unit tests pass
- [ ] Run `make test-integration` to verify end-to-end auth flow
- [ ] Run `make check` for code quality validation

**Success Criteria:**
- All existing API routes protected with authentication
- Authentication endpoints work correctly
- 401 responses returned for unauthenticated access
- Session cookies set/cleared properly
- No breaking changes to existing functionality

**Manual Testing:**
- [ ] Test protected route access without session (should get 401)
- [ ] Test login flow: email → magic link → session creation
- [ ] Test auth status endpoint with valid/invalid sessions
- [ ] Test logout clears session and blocks future access

### Phase 4: Frontend Authentication Integration

**Goal**: Integrate authentication into frontend application with login/logout UI

**Feature Added**: Frontend authentication service, login component, and user status display

**Why Fourth**: 
- Requires Phase 3 authentication endpoints
- Transforms existing open app into authenticated experience
- Enables end-to-end testing of auth flow
- Completes core authentication functionality

**Task List** (Check off completed tasks with ✅):

#### Authentication Service
- [✅] Create `public/lib/auth-service.js` - AuthService class for frontend auth
- [✅] Implement auth status checking with backend API
- [✅] Add login/logout methods with proper error handling
- [✅] Create authenticated fetch wrapper for API calls
- [✅] Add user state management (current user, auth status)

#### Login Component
- [✅] Create `public/components/login.js` - LoginComponent for unauthenticated users
- [✅] Design email input form with validation
- [✅] Add login submission with loading states
- [✅] Implement "check your email" success messaging
- [✅] Add error handling and user feedback
- [✅] Create responsive login screen styling

#### User Status Component
- [✅] Create `public/components/user-status.js` - UserStatusComponent for authenticated users
- [✅] Display current user email in header
- [✅] Add logout button with confirmation
- [✅] Integrate with existing header layout
- [✅] Handle logout flow and app refresh

#### Main Application Updates
- [✅] Update `public/app.js` to check authentication on startup
- [✅] Add conditional rendering (login screen vs main app)
- [✅] Implement authentication polling for multi-tab support
- [✅] Update all API calls to use authenticated fetch
- [✅] Add 401 error handling with redirect to login
- [✅] Maintain existing functionality for authenticated users

#### Quality Assurance
- [ ] Write unit tests for authentication service methods
- [ ] Test login component with various email inputs and error states
- [ ] Test user status component integration with header
- [ ] Write integration tests for complete auth flow (login → dashboard → logout)
- [ ] Test multi-tab authentication synchronization
- [ ] Run `make test-unit` to ensure all unit tests pass
- [ ] Run `make test-integration` to verify complete frontend auth flow
- [ ] Run `make check` for code quality validation

**Success Criteria:**
- Unauthenticated users see login screen
- Authenticated users see main dashboard with user status
- Login flow works end-to-end (email → magic link → dashboard)
- Logout clears session and returns to login
- All existing dashboard functionality preserved

**Manual Testing:**
- [ ] Complete login flow from email entry to dashboard access
- [ ] Test logout and verify session cleared
- [ ] Test multi-tab behavior (login in one tab, check other tabs)
- [ ] Verify all existing dashboard features work when authenticated

**Cleanup Tasks:**
- [ ] Remove `test-email.js` script (replaced by complete UI testing capability)
- [ ] Verify email functionality is fully testable through the web interface

---

### Phase 4.5: URL Structure & User Experience Improvements

**Goal**: Improve user experience with proper URL structure and page-based navigation

**Feature Added**: Separate pages for homepage, sign-in, check email, and dashboard with proper routing

**Why Now**: 
- Current implementation is clunky with everything on `/`
- Magic link verification returns JSON instead of proper page
- Need better separation between public pages and authenticated app
- Creates foundation for marketing homepage

**Task List** (Check off completed tasks with ✅):


#### Homepage Implementation  
- [ ] Create `homepage.html` - Landing page with basic marketing content
- [ ] Add "Sign In" button/link that goes to `/sign-in/`
- [ ] Include placeholder content (company info, features overview)
- [ ] Style homepage to match brand (simple, professional)
- [ ] Add meta tags and proper page titles

#### Sign-in Page Implementation
- [ ] Create `sign-in.html` - Dedicated sign-in page
- [ ] Move login form logic to dedicated sign-in page
- [ ] Update form submission to redirect to `/sign-in/check` on success
- [ ] Add "Back to Home" link
- [ ] Handle error query params (invalid_token, expired_token, server_error) with user-friendly messages
- [ ] Ensure proper error handling and validation

#### Check Email Page Implementation
- [ ] Create `sign-in-check.html` - Email instructions page
- [ ] Display email address user signed in with (pass via URL param or session)
- [ ] Include helpful tips for finding email
- [ ] Add "Try Different Email" button that goes back to `/sign-in/`
- [ ] Style consistently with sign-in page

#### Magic Link Verification Improvement
- [ ] Move from `/api/auth/verify` to `/sign-in/verify` for better URL semantics
- [ ] Create `/sign-in/verify?token=xyz` route that processes magic link tokens
- [ ] Show verification loading page during token processing
- [ ] 302 redirect to `/dashboard` on successful verification
- [ ] 302 redirect to `/sign-in/?error=invalid_token` for invalid tokens
- [ ] 302 redirect to `/sign-in/?error=expired_token` for expired tokens  
- [ ] 302 redirect to `/sign-in/?error=server_error` for server errors during verification
- [ ] Update magic link emails to use new `/sign-in/verify?token=xyz` URL
- [ ] Ensure all redirects preserve session cookies

#### Dashboard Page Updates
- [ ] Update dashboard to be accessible only at `/dashboard`
- [ ] Remove authentication logic from main app initialization
- [ ] Dashboard assumes user is already authenticated (redirect if not)
- [ ] Preserve all existing dashboard functionality

#### Server Routing Implementation
- [ ] Update `index.js` to handle new routes:
  - `/` → homepage.html
  - `/sign-in/` → sign-in.html (302 redirect to `/dashboard` if authenticated)
  - `/sign-in/check` → sign-in-check.html (302 redirect to `/dashboard` if authenticated)
  - `/sign-in/verify` → verification processing (show loading page, then redirect)
  - `/dashboard` → dashboard.html (302 redirect to `/sign-in/` if not authenticated)
- [ ] Remove old `/api/auth/verify` route
- [ ] Add server-side session validation before serving protected pages
- [ ] Implement 302 redirects for authentication flow (no client-side routing for auth pages)
- [ ] Each page serves dedicated HTML file with appropriate meta tags

#### Client-Side Navigation
- [ ] Update client-side code to handle page transitions
- [ ] Remove single-page app authentication switching
- [ ] Add navigation helpers for page redirects
- [ ] Preserve existing dashboard SPA functionality

#### Quality Assurance
- [ ] Write unit tests for new routing logic
- [ ] Test all URL paths and redirects
- [ ] Test authentication flow across multiple pages
- [ ] Verify magic link flow: email → `/sign-in/check` → magic link → `/dashboard`
- [ ] Test error cases and edge cases
- [ ] Run `make test-unit` to ensure all unit tests pass
- [ ] Run `make test-integration` to verify complete flow
- [ ] Run `make check` for code quality validation

**Success Criteria:**
- Clean URL structure with logical page separation
- Homepage provides clear entry point to application
- Sign-in process feels like traditional website flow
- Magic link verification redirects properly to dashboard
- Dashboard is a proper single-page application
- No loss of existing functionality

**Manual Testing:**
- [ ] Navigate through complete flow: homepage → sign-in → check email → magic link → dashboard
- [ ] Test all redirects and error cases
- [ ] Verify URL structure matches expectations
- [ ] Test backward/forward browser navigation
- [ ] Verify magic link clicking goes to dashboard, not JSON
- [ ] Test bookmarking and direct URL access

**Design Considerations:**
- Homepage can be expanded later with marketing content
- Dashboard remains single-page app for optimal user experience
- Authentication pages follow traditional web patterns
- All pages maintain consistent styling and branding
- URL structure supports future features (password reset, user settings, etc.)

---

### Phase 5: CSS & UI Polish

**Goal**: Create polished authentication UI that integrates seamlessly with existing design

**Feature Added**: Authentication-specific CSS, responsive design, and visual feedback

**Why Fifth**: 
- Depends on Phase 4 components being functional
- Enhances user experience without affecting functionality
- Can be iterated on independently
- Final touch for production readiness

**Task List** (Check off completed tasks with ✅):

#### Authentication UI Styling
- [ ] Add login screen CSS to `public/style.css`
- [ ] Create gradient background and centered login card
- [ ] Style email input with focus states and validation feedback
- [ ] Design login button with hover and loading states
- [ ] Add success/error message styling
- [ ] Ensure mobile responsive design

#### Header Integration
- [ ] Update header layout to accommodate user status component
- [ ] Style user email display and logout button
- [ ] Ensure header remains functional on various screen sizes
- [ ] Add smooth transitions for login/logout state changes

#### Visual Feedback
- [ ] Add loading indicators during authentication operations
- [ ] Create clear error states with helpful messaging
- [ ] Design success states for positive feedback
- [ ] Ensure accessibility compliance (ARIA labels, keyboard navigation)

#### Quality Assurance
- [ ] Test UI on various screen sizes and devices
- [ ] Verify color contrast and accessibility standards
- [ ] Test keyboard navigation and screen reader compatibility
- [ ] Validate visual consistency with existing design system
- [ ] Run `make test-integration` to verify UI components work correctly
- [ ] Run `make check` for code quality validation

**Success Criteria:**
- Login screen is visually appealing and professional
- Authentication UI integrates seamlessly with existing design
- All UI components are responsive and accessible
- Loading and error states provide clear user feedback

**Manual Testing:**
- [ ] Test login screen on mobile and desktop
- [ ] Verify error and success message display
- [ ] Test header layout with user status component
- [ ] Validate keyboard and screen reader navigation

---

### Phase 6: Configuration & Environment Setup

**Goal**: Prepare application for production deployment with proper configuration

**Feature Added**: Environment variables, package dependencies, and setup scripts

**Why Sixth**: 
- Required for production deployment
- Enables different configurations for dev/staging/production
- Completes technical implementation
- Prepares for operational concerns

**Task List** (Check off completed tasks with ✅):

#### Environment Configuration
- [ ] Create `.env.example` with all required environment variables
- [ ] Add database path configuration
- [ ] Add session secret and timeout configuration
- [ ] Add SMTP email service configuration (host, port, auth, security)
- [ ] Add application URL configuration for magic links

#### Dependencies and Scripts
- [ ] Install email dependencies with `bun add nodemailer`
- [ ] Add setup scripts for database initialization
- [ ] Add development and production start scripts
- [ ] Create database migration/setup automation

#### Setup Scripts
- [ ] Create `scripts/setup-database.js` for initial database setup
- [ ] Add environment validation script
- [ ] Create development mode helpers
- [ ] Add production readiness checks

#### Documentation
- [ ] Update README with setup instructions
- [ ] Document environment variable requirements
- [ ] Add deployment considerations
- [ ] Create troubleshooting guide
- [ ] Run `make test-all` to ensure complete system works
- [ ] Run `make check` for final code quality validation

**Success Criteria:**
- Application can be configured for different environments
- Setup process is documented and automated
- All dependencies properly declared
- Production deployment considerations documented

**Manual Testing:**
- [ ] Test setup from scratch with `.env.example`
- [ ] Verify database initialization script
- [ ] Test different configuration options
- [ ] Validate production configuration setup

---

### Phase 7: Testing & Quality Assurance

**Goal**: Comprehensive testing coverage and production readiness validation

**Feature Added**: Unit tests, integration tests, and manual testing procedures

**Why Seventh**: 
- Validates all previous phases work together
- Ensures production stability
- Documents expected behavior
- Provides regression protection

**Task List** (Check off completed tasks with ✅):

#### Unit Tests
- [ ] Write `tests/unit/lib/app-database.test.js` - database operations
- [ ] Write `tests/unit/lib/auth.test.js` - authentication logic
- [ ] Write `tests/unit/lib/email.test.js` - email service
- [ ] Write `tests/unit/routes/auth.test.js` - authentication endpoints
- [ ] Write `tests/unit/middleware/auth.test.js` - authentication middleware

#### Integration Tests
- [ ] Write `tests/integration/auth-flow.test.js` - complete authentication flow
- [ ] Write `tests/integration/protected-routes.test.js` - route protection
- [ ] Write `tests/integration/session-management.test.js` - session handling
- [ ] Write `tests/integration/frontend-auth.test.js` - frontend integration

#### Manual Testing Procedures
- [ ] User registration flow (new email)
- [ ] User login flow (existing email)
- [ ] Magic link expiration handling
- [ ] Session persistence across browser restarts
- [ ] Route protection (401 responses)
- [ ] Logout functionality
- [ ] Email delivery (development mode)

#### Quality Gates
- [ ] All unit tests pass (`make test-unit`)
- [ ] All integration tests pass (`make test-integration`) 
- [ ] Complete test suite passes (`make test-all`)
- [ ] Code quality checks pass (`make check`)
- [ ] Manual testing checklist completed
- [ ] Security review completed

**Success Criteria:**
- Comprehensive test coverage for all authentication functionality
- All tests pass consistently
- Manual testing procedures documented and validated
- Application ready for production deployment

**Manual Testing:**
- [ ] Complete end-to-end authentication workflows
- [ ] Test error conditions and edge cases
- [ ] Verify security controls and protections
- [ ] Validate performance under normal load

---

## Phase 8: Security Enhancements & Rate Limiting

**Goal**: Add production-ready security controls and abuse prevention

**Feature Added**: Rate limiting, session cleanup policies, and token invalidation improvements

**Why Eighth**: 
- Builds on complete authentication system from previous phases
- Addresses production security concerns before deployment
- Can be implemented and tested independently
- Enhances system robustness without breaking existing functionality

**Task List** (Check off completed tasks with ✅):

#### Rate Limiting Implementation
- [ ] Add email rate limiting (max 5 magic link requests per hour per email address)
- [ ] Implement IP-based rate limiting for authentication endpoints
- [ ] Create rate limit storage (in-memory for single instance, Redis for scaling)
- [ ] Add rate limit error responses with helpful messaging
- [ ] Create rate limit bypass for development/testing

#### Session Security Enhancements
- [ ] Implement session cleanup policies (remove expired sessions)
- [ ] Add concurrent session limits per user (configurable, default 5)
- [ ] Create session invalidation on successful login (prevent token reuse)
- [ ] Add automatic session cleanup job/scheduler
- [ ] Implement session timeout handling with proper cleanup

#### Audit Logging
- [ ] Add authentication event logging (login attempts, successes, failures)
- [ ] Log rate limit violations and suspicious activity
- [ ] Include IP addresses and user agents in logs
- [ ] Create structured logging format for monitoring integration
- [ ] Add log rotation and retention policies

#### Quality Assurance
- [ ] Write unit tests for rate limiting functionality
- [ ] Test concurrent session limits and cleanup
- [ ] Test token invalidation scenarios
- [ ] Write integration tests for security controls
- [ ] Run `make test-unit` to ensure all unit tests pass
- [ ] Run `make test-integration` to verify security controls
- [ ] Run `make test-all` for comprehensive validation
- [ ] Run `make check` for code quality validation

**Success Criteria:**
- Rate limiting prevents magic link abuse effectively
- Session management handles concurrent logins properly
- Token invalidation prevents reuse attacks
- Audit logs provide comprehensive security monitoring
- All security controls work without impacting user experience

**Manual Testing:**
- [ ] Test rate limiting with rapid magic link requests
- [ ] Test concurrent login scenarios from multiple devices
- [ ] Verify token invalidation after successful login
- [ ] Test session cleanup and timeout functionality
- [ ] Validate audit log completeness and format

---

## Implementation Principles

### Database Security
- **Complete Separation**: App database (`./app.db`) isolated from user uploads (`./uploads/`)
- **SQL Injection Prevention**: Parameterized queries for all database operations
- **Access Control**: Appropriate file permissions and database constraints

### Authentication Security  
- **Cryptographically Secure Tokens**: Using `crypto.randomBytes` for magic links
- **Token Expiration**: 24-hour expiry with single-use validation
- **Session Management**: HTTP-only cookies with secure flags
- **Input Validation**: Email format validation and sanitization

### User Experience
- **Seamless Transition**: Existing functionality unchanged after authentication
- **Clear Feedback**: Obvious login process with helpful error messaging
- **Session Persistence**: Users stay logged in across browser sessions
- **Mobile Responsive**: Authentication UI works on all device sizes

### System Design
- **Backward Compatibility**: No impact on existing dashboard functionality
- **Progressive Enhancement**: Authentication layer added without breaking changes
- **Clean Architecture**: Separation of concerns with middleware pattern
- **Future Ready**: Foundation for user management, roles, and multi-tenancy

## Success Metrics

### Functional Requirements
- [ ] Users can register and login with email address
- [ ] Magic link authentication works end-to-end
- [ ] Dashboard access restricted to authenticated users only
- [ ] Session persistence across browser sessions
- [ ] Clean logout functionality

### Security Requirements
- [ ] No unauthorized access to protected routes
- [ ] Secure token generation and validation
- [ ] Proper session management with expiration
- [ ] Database isolation maintained

### User Experience Requirements
- [ ] Intuitive login flow with clear feedback
- [ ] Seamless transition between login and dashboard
- [ ] Responsive design on mobile and desktop
- [ ] Accessible UI with keyboard navigation support

### Technical Requirements
- [ ] Clean separation of concerns in codebase
- [ ] Comprehensive test coverage (unit + integration)
- [ ] Performance meets requirements (<2s page load)
- [ ] Scalable architecture for future enhancements

## Future Enhancements

### User Management
- User profiles and preferences storage
- Admin panel for user management
- Role-based access control
- Multi-tenant database isolation per user

### Enhanced Security
- Two-factor authentication support
- Login attempt rate limiting
- Session device tracking and management
- Comprehensive audit logging

### Social Features
- Dashboard sharing capabilities
- Collaborative editing features
- Comments and annotations system
- Public dashboard publishing

This implementation provides a solid foundation for secure, scalable user authentication while preserving all existing functionality and maintaining excellent user experience.

---

## Appendix: Email Service Reference

### Basic Nodemailer Setup

```bash
bun add nodemailer
```

```javascript
// lib/email.js
import nodemailer from 'nodemailer';

export class EmailService {
  constructor() {
    // Same SMTP configuration for both dev and production
    this.transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_AUTH_USER,
        pass: process.env.SMTP_AUTH_PASS,
      },
    });
  }

  async sendMagicLink(email, token) {
    const loginUrl = `${process.env.APP_URL}/api/auth/verify?token=${token}`;
    
    // Send real email in both dev and production
    await this.transporter.sendMail({
      from: process.env.EMAIL_FROM_ADDRESS,
      to: email,
      subject: 'Login to Insight Magician',
      html: `<p>Click <a href="${loginUrl}">here</a> to login</p>`
    });

    // In development, also log the magic link for easy testing
    if (process.env.NODE_ENV === 'development') {
      console.log('🔗 Magic Link (dev):', loginUrl);
    }
  }
}
```

### Environment Variables
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_AUTH_USER=your-email@gmail.com
SMTP_AUTH_PASS=your-app-password
```
