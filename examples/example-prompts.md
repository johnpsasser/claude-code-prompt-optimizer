# 📝 Example Prompts - Before and After Optimization

This document shows real examples of how the prompt optimizer transforms simple requests into comprehensive, structured instructions.

## Example 1: Simple Bug Fix

### Input
```
<optimize> fix the login bug
```

### Optimized Output
```
You are tasked with systematically debugging and resolving a login functionality issue. Execute this task using a structured diagnostic and remediation framework.

## Primary Objective
Identify, analyze, and fix the login bug through comprehensive debugging methodology.

## Phase 1: Diagnostic Analysis
1. **Reproduce the Issue**
   - Document exact steps to reproduce
   - Identify affected user segments
   - Capture error messages and logs
   - Test across different browsers/devices

2. **Root Cause Investigation**
   - Examine authentication flow
   - Review recent code changes
   - Check database connections
   - Analyze API responses
   - Inspect client-side validation

## Phase 2: Solution Implementation
1. **Code Review**
   - Authentication logic
   - Session management
   - Input validation
   - Error handling

2. **Fix Development**
   - Implement targeted solution
   - Maintain backward compatibility
   - Add appropriate logging

## Phase 3: Verification
- Unit tests for edge cases
- Integration tests for auth flow
- Manual testing across platforms
- Performance impact assessment
```

## Example 2: API Development

### Input
```
<optimize> create REST API for user management
```

### Optimized Output
```
Design and implement a production-ready RESTful API for comprehensive user management functionality.

## Architectural Requirements

### Core Endpoints
- `POST /api/users` - User registration
- `GET /api/users/:id` - Retrieve user profile
- `PUT /api/users/:id` - Update user information
- `DELETE /api/users/:id` - Account deletion
- `GET /api/users` - List users with pagination
- `POST /api/users/auth` - Authentication
- `POST /api/users/refresh` - Token refresh
- `POST /api/users/logout` - Session termination

### Technical Specifications
1. **Authentication & Authorization**
   - JWT-based authentication
   - Role-based access control (RBAC)
   - Refresh token rotation
   - Session management

2. **Data Validation**
   - Input sanitization
   - Schema validation (Joi/Zod)
   - Request rate limiting
   - CORS configuration

3. **Security Implementation**
   - Password hashing (bcrypt/argon2)
   - SQL injection prevention
   - XSS protection
   - CSRF tokens
   - API key management

4. **Performance Optimization**
   - Database indexing strategy
   - Query optimization
   - Caching layer (Redis)
   - Connection pooling

5. **Error Handling**
   - Standardized error responses
   - Logging strategy
   - Error monitoring integration
```

## Example 3: Code Refactoring

### Input
```
<optimize> refactor this messy code
```

### Optimized Output
```
Execute a systematic code refactoring process to improve code quality, maintainability, and performance.

## Refactoring Strategy

### Phase 1: Code Analysis
1. **Quality Assessment**
   - Identify code smells
   - Measure cyclomatic complexity
   - Detect duplicated code
   - Analyze dependency graphs

2. **Performance Profiling**
   - Identify bottlenecks
   - Memory leak detection
   - Database query analysis
   - API response time measurement

### Phase 2: Refactoring Implementation
1. **Code Organization**
   - Apply SOLID principles
   - Extract reusable functions
   - Implement design patterns
   - Modularize components

2. **Optimization Techniques**
   - Algorithm improvements
   - Database query optimization
   - Caching implementation
   - Lazy loading strategies

3. **Code Quality**
   - Add comprehensive typing
   - Improve error handling
   - Enhance logging
   - Update documentation

### Phase 3: Validation
- Regression testing
- Performance benchmarks
- Code review checklist
- Documentation updates
```

## Example 4: Feature Implementation

### Input
```
<optimize> add dark mode to the app
```

### Optimized Output
```
Implement a comprehensive dark mode feature with user preferences and system integration.

## Implementation Framework

### Phase 1: Design System
1. **Color Palette Definition**
   - Primary/secondary colors for dark theme
   - Contrast ratio compliance (WCAG AA)
   - Semantic color tokens
   - Transition animations

2. **Component Adaptation**
   - Identify affected components
   - Create theme-aware variants
   - Handle images/icons
   - Update charts/visualizations

### Phase 2: Technical Implementation
1. **Theme Management**
   - Context/state management
   - Local storage persistence
   - System preference detection
   - Theme switching logic

2. **CSS Strategy**
   - CSS variables approach
   - Media query integration
   - Fallback mechanisms
   - Performance optimization

3. **User Interface**
   - Toggle component design
   - Smooth transitions
   - Accessibility features
   - Keyboard shortcuts

### Phase 3: Testing & Rollout
- Cross-browser testing
- Accessibility audit
- Performance impact analysis
- User acceptance testing
- A/B testing strategy
```

## Example 5: Database Optimization

### Input
```
<optimize> optimize database performance
```

### Optimized Output
```
Execute a comprehensive database optimization strategy to improve query performance and system scalability.

## Optimization Framework

### Phase 1: Performance Audit
1. **Current State Analysis**
   - Query execution plans
   - Slow query log analysis
   - Index usage statistics
   - Table size and growth patterns
   - Connection pool metrics

2. **Bottleneck Identification**
   - N+1 query problems
   - Missing indexes
   - Table scan operations
   - Lock contention issues
   - Memory usage patterns

### Phase 2: Optimization Implementation
1. **Index Strategy**
   - Create missing indexes
   - Remove redundant indexes
   - Composite index optimization
   - Covering index implementation

2. **Query Optimization**
   - Rewrite inefficient queries
   - Implement query caching
   - Batch operation strategies
   - Pagination optimization

3. **Schema Improvements**
   - Denormalization where appropriate
   - Partitioning strategies
   - Archive old data
   - Data type optimization

### Phase 3: Monitoring & Maintenance
- Performance baseline establishment
- Automated monitoring setup
- Alert configuration
- Regular maintenance schedule
```

## Usage Tips

1. **Be Specific When Possible**: While the optimizer enhances vague prompts, specific context helps
   ```
   <optimize> fix the login bug in the OAuth flow
   ```

2. **Preserve Important Details**: Use quotes to maintain exact naming
   ```
   <optimize> create a function called "processUserData" that validates input
   ```

3. **Combine Multiple Requirements**: The optimizer handles complex requests well
   ```
   <optimize> build a REST API with authentication, rate limiting, and WebSocket support
   ```

4. **Iterative Refinement**: You can optimize already detailed prompts for even more structure
   ```
   <optimize> [your detailed requirements here]
   ```

## Common Patterns

The optimizer excels at:
- Breaking down complex tasks into phases
- Adding security and performance considerations
- Including testing and validation steps
- Providing comprehensive technical specifications
- Suggesting best practices and standards
- Creating actionable implementation plans

---

**Try these examples in your Claude Code session with the `<optimize>` tag!**