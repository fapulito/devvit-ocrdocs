# Gemini API File Analysis - Implementation Tasks

## Phase 1: Core API Integration

### Task 1.1: Install Dependencies

- [x] Install `@google/generative-ai` package

- [x] Verify package compatibility with Devvit environment
- [x] Update package.json with correct version

**Acceptance Criteria:**

- Package installed successfully
- No conflicts with existing dependencies
- Build completes without errors

---

### Task 1.2: Create Gemini API Client Module

- [x] Create `src/server/ai/gemini.ts`

- [x] Implement `GoogleGenerativeAI` client initialization

- [x] Add API key retrieval from Redis
- [x] Configure model settings (gemini-1.5-flash, temperature, tokens)

**Files to Create:**

- `src/server/ai/gemini.ts`

**Acceptance Criteria:**

- Client initializes successfully
- API key retrieved from Redis config
- Model configuration matches design specs

---

### Task 1.3: Implement Image Analysis Function

- [x] Create `analyzeImage()` function in gemini.ts

- [x] Convert base64 image to Gemini format

- [x] Implement image analysis prompt

- [x] Parse JSON response from Gemini

- [x] Add error handling and fallback logic

**Acceptance Criteria:**

- Function accepts base64 image data

- Returns structured response: `{ description, summary }`
- Handles API errors gracefully
- Falls back to generic description on failure

---

### Task 1.4: Implement PDF Analysis Function

- [x] Create `analyzePDF()` function in gemini.ts

- [x] Convert base64 PDF to Gemini format

- [x] Implement PDF analysis prompt

- [x] Parse JSON response from Gemini
- [x] Add error handling and fallback logic

**Acceptance Criteria:**

- Function accepts base64 PDF data
- Returns structured response: `{ description, summary }`
- Handles API errors gracefully
- Falls back to generic description on failure

---

### Task 1.5: Create Main Analysis Function

- [x] Create `analyzeDocument()` function that routes to image/PDF handlers

- [x] Add file type detection logic

- [x] Implement unified error handling

- [x] Add logging for debugging

**Acceptance Criteria:**

- Function detects file type correctly
- Routes to appropriate analysis function
- Returns consistent response format
- Logs analysis attempts and results

---

## Phase 2: Server Endpoint

### Task 2.1: Create Analysis Endpoint

- [x] Add POST `/api/analyze` endpoint in server/index.ts

- [x] Extract fileData, fileType, fileName from request body
- [x] Call analyzeDocument() function
- [x] Return analysis results to client
- [x] Add request validation

**Acceptance Criteria:**

- Endpoint accepts file data and metadata
- Calls Gemini API successfully
- Returns JSON response with description and summary
- Validates required fields

---

### Task 2.2: Implement Rate Limiting

- [x] Add per-user rate limiting (100 requests/day)

- [x] Store rate limit counters in Redis

- [x] Return appropriate error when limit exceeded

- [x] Add rate limit headers to response

**Acceptance Criteria:**

- Rate limit enforced per user per day
- Counter resets after 24 hours
- Clear error message when limit reached
- Rate limit info in response headers

---

### Task 2.3: Add Caching Layer

- [x] Generate file hash (MD5) for cache key
- [x] Check cache before calling API

- [x] Store analysis results in Redis (7-day TTL)

- [x] Return cached results when available

**Acceptance Criteria:**

- Cache key based on file content hash
- Cache checked before API call
- Results cached for 7 days
- Cache hit/miss logged

---

### Task 2.4: Configure Devvit Settings for API Key

- [x] Add settings configuration to `devvit.json`

- [x] Update `gemini.ts` to use `settings.get('apiKey')`

- [x] Update documentation with CLI setup instructions

**Acceptance Criteria:**

- API key stored securely via Devvit settings
- Key accessible via `settings.get('apiKey')`
- Documentation explains `npx devvit settings set apiKey` command
- No custom admin endpoints needed

---

## Phase 3: Client UI Updates

### Task 3.1: Update DocumentUploader State

- [x] Add `analyzing` state (boolean)

- [x] Add `autoAnalyze` state (boolean, default true)

- [x] Add `analysisError` state (string | null)

**Files to Modify:**

- `src/client/components/DocumentUploader.tsx`

**Acceptance Criteria:**

- State variables added correctly
- Default values set appropriately
- State updates trigger re-renders

---

### Task 3.2: Add Auto-Analyze Toggle

- [x] Add checkbox UI element for auto-analyze

- [x] Connect to `autoAnalyze` state

- [x] Position above file input

- [x] Style consistently with existing UI

**Acceptance Criteria:**

- Checkbox visible and functional
- State updates when toggled
- Persists during upload flow
- Styled to match app design

---

### Task 3.3: Implement Analysis API Call

-

- [x] Create `analyzeFile()` function in DocumentUploader

- [x] Call `/api/analyze` endpoint with file data

- [x] Handle loading state during analysis

-

- [x] Update description and notes with results

- [x] Handle errors and show fallback

**Acceptance Criteria:**

- Function called after file selection (if autoAnalyze enabled)
- Loading indicator shown during analysis
- Results pre-fill description and notes fields
- Errors handled gracefully

---

### Task 3.4: Add Loading Indicator

- [x] Show "Analyzing document..." message during analysis

- [x] Add spinner/loading animation

- [x] Disable form submission during analysis

- [x] Position near file preview

**Acceptance Criteria:**


- Loading state visible during API call
- Clear message shown to user
- Form disabled until analysis completes
- UI updates smoothly

---

### Task 3.5: Add AI-Generated Badges

- [x] Add ✨ sparkle icon next to AI-generated fields

- [x] Add "AI-generated" label

-

- [x] Style badges subtly

- [x] Show only when content is AI-generated

**Acceptance Criteria:**

- Badges visible for AI-generated content
- Icons and labels styled appropriately

- Badges don't interfere with editing

- Clear visual distinction from manual input

---

### Task 3.6: Add Re-Analyze Button

- [x] Add "Re-analyze" button next to description field
- [x] Call analysis API again when clicked
- [x] Update fields with new results
- [x] Show loading state during re-analysis

**Acceptance Criteria:**

- Re-analysis works correctly
  analysis
- Re-analysis works correctly
- Loading state shown during re-analysis
- Results update in form fields

---

## Phase 4: Error Handling & Polish

### Task 4.1: Implement Comprehensive Error Handling

- [ ] Handle API timeout (>5s)
- [ ] Handle rate limit errors
- [ ] Handle invalid API responses
- [ ] Handle network errors
- [ ] Add retry logic with exponential backoff

**Acceptance Criteria:**

- All error types handled gracefully
- Clear error messages shown to user
- Fallback to manual entry on failure
- Retry logic works correctly

---

### Task 4.2: Add Response Validation

- [ ] Validate Gemini API response structure
- [ ] Check for required fields (description, summary)
- [ ] Sanitize output (remove unsafe characters)
- [ ] Enforce length limits (description: 100 chars, summary: 500 chars)

**Acceptance Criteria:**

- Invalid responses rejected
- Required fields validated
- Output sanitized for safety
- Length limits enforced

---

### Task 4.3: Optimize Prompts

- [ ] Test prompts with various document types
- [ ] Refine prompts based on results
- [ ] Add examples to prompts for better accuracy
- [ ] Document final prompt templates

**Acceptance Criteria:**

- Prompts tested with 10+ document types
- Accuracy improved based on testing
- Final prompts documented
- Consistent output format

---

### Task 4.4: Add Logging and Monitoring

- [x] Log all analysis requests
- [x] Log API response times
- [x] Log errors and fallbacks
- [x] Log cache hit/miss rates

**Acceptance Criteria:**

- All key events logged
- Logs include relevant context
- Performance metrics tracked
- Error patterns identifiable

---

## Phase 5: Testing & Deployment

### Task 5.1: Unit Tests

- [ ] Test analyzeImage() with various images
- [ ] Test analyzePDF() with various PDFs
- [ ] Test error handling paths
- [ ] Test caching logic
- [ ] Test rate limiting

**Acceptance Criteria:**

- All functions have unit tests
- Edge cases covered
- Error paths tested
- Tests pass consistently

---

### Task 5.2: Integration Tests

- [ ] Test full upload flow with analysis
- [ ] Test auto-analyze toggle
- [ ] Test re-analyze functionality
- [ ] Test rate limit enforcement
- [ ] Test cache behavior

**Acceptance Criteria:**

- End-to-end flows tested
- UI interactions tested
- API integration tested
- All tests pass

---

### Task 5.3: Manual Testing

- [ ] Test with receipts
- [ ] Test with invoices
- [ ] Test with forms
- [ ] Test with reports
- [ ] Test with poor quality images
- [ ] Test with large PDFs
- [ ] Test with various file types

**Acceptance Criteria:**

- All document types tested
- Results are accurate and useful
- Edge cases handled correctly
- User experience is smooth

---

### Task 5.4: Performance Testing

- [ ] Measure analysis response times
- [ ] Test with maximum file sizes
- [ ] Test cache performance
- [ ] Test rate limiting under load

**Acceptance Criteria:**

- Analysis completes within 5 seconds
- Large files handled correctly
- Cache improves performance
- Rate limiting works under load

---

### Task 5.5: Deploy to Test Subreddit

- [ ] Set up Gemini API key in test environment
- [ ] Deploy updated app
- [ ] Test in live Reddit environment
- [ ] Collect initial user feedback

**Acceptance Criteria:**

- App deployed successfully
- API key configured correctly
- Feature works in production
- No critical issues found

---

## Phase 6: Documentation & Launch

### Task 6.1: Update User Documentation

- [ ] Document auto-analyze feature
- [ ] Add screenshots of new UI
- [ ] Explain how to use re-analyze
- [ ] Document rate limits

**Files to Update:**

- `USER_GUIDE.md`

**Acceptance Criteria:**

- Documentation clear and complete
- Screenshots show new features
- Rate limits explained
- Examples provided

---

### Task 6.2: Update Developer Documentation

- [ ] Document Gemini API integration
- [ ] Add API key setup instructions
- [ ] Document caching strategy
- [ ] Document rate limiting implementation

**Files to Update:**

- `README.md`
- `DEPLOYMENT_GUIDE.md`

**Acceptance Criteria:**

- Technical details documented
- Setup instructions clear
- Architecture explained
- Code examples provided

---

### Task 6.3: Create Admin Setup Guide

- [ ] Document how to obtain Gemini API key
- [ ] Document how to set API key via admin endpoint
- [ ] Add troubleshooting section
- [ ] Add cost estimation guide

**Files to Create:**

- `GEMINI_SETUP.md`

**Acceptance Criteria:**

- Step-by-step setup instructions
- API key acquisition explained
- Common issues documented
- Cost information provided

---

### Task 6.4: Final Review & Launch

- [ ] Code review by team
- [ ] Security review (API key handling)
- [ ] Performance review
- [ ] Deploy to production
- [ ] Monitor for issues

**Acceptance Criteria:**

- Code reviewed and approved
- Security concerns addressed
- Performance acceptable
- Deployed successfully
- Monitoring in place

---

## Summary

**Total Tasks:** 34
**Estimated Time:** 3-4 weeks
**Priority:** High (enhances core user experience)

**Dependencies:**

- Google Cloud account with Gemini API access
- API key with sufficient quota
- Redis storage for caching and rate limiting

**Risks:**

- API rate limits may require paid tier
- Analysis accuracy depends on document quality
- Devvit environment constraints may affect performance
