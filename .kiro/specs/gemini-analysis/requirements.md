# Gemini API File Analysis - Requirements

## Overview
Integrate Google's Gemini API to automatically analyze uploaded images and PDFs, generating descriptions and summaries to enhance document organization and searchability.

## Business Goals
- **Automatic Descriptions**: Generate intelligent descriptions for uploaded files without manual input
- **PDF Summarization**: Extract and summarize key information from PDF documents
- **Enhanced Searchability**: Make documents easier to find with AI-generated metadata
- **User Convenience**: Reduce manual data entry while maintaining accuracy

## User Stories

### US-1: Auto-Generate Image Descriptions
**As a** user uploading an image  
**I want** the app to automatically generate a description  
**So that** I don't have to manually type descriptions for every document

**Acceptance Criteria:**
- When I upload an image, Gemini analyzes the content
- A description is auto-generated (e.g., "Receipt from Walmart dated 2024-10-15")
- I can edit the auto-generated description before saving
- The description field is pre-filled but not locked

### US-2: PDF Content Summarization
**As a** user uploading a PDF  
**I want** the app to extract and summarize the content  
**So that** I can quickly understand what's in the document without opening it

**Acceptance Criteria:**
- When I upload a PDF, Gemini extracts text content
- A summary is generated highlighting key information
- Summary appears in the "Notes" field automatically
- I can edit or clear the auto-generated summary

### US-3: Optional Analysis
**As a** user  
**I want** to control whether AI analysis happens  
**So that** I can save time/costs when I don't need it

**Acceptance Criteria:**
- A toggle/checkbox to enable/disable AI analysis
- Analysis is enabled by default but can be turned off
- Manual description entry still works when disabled

## Functional Requirements

### FR-1: Gemini API Integration
- Use Google Gemini API (gemini-1.5-flash or gemini-1.5-pro)
- Support both image and PDF analysis
- Handle API errors gracefully with fallback to manual entry

### FR-2: Image Analysis
- Send image data (base64) to Gemini
- Request structured description including:
  - Document type (receipt, invoice, form, etc.)
  - Key entities (company names, dates, amounts)
  - Brief content summary
- Max 100 characters for description field

### FR-3: PDF Analysis
- Extract text from PDF (first 10 pages max to stay within limits)
- Send text to Gemini for summarization
- Request structured summary including:
  - Document type and purpose
  - Key points (3-5 bullet points)
  - Important dates, names, or numbers
- Max 500 characters for notes field

### FR-4: User Experience
- Show loading indicator during analysis ("Analyzing...")
- Display analysis results in editable fields
- Allow users to regenerate analysis if unsatisfied
- Provide clear error messages if analysis fails

## Non-Functional Requirements

### NFR-1: Performance
- Analysis should complete within 5 seconds
- Use streaming responses if available
- Cache results to avoid re-analysis

### NFR-2: Cost Management
- Use gemini-1.5-flash (cheaper) for most requests
- Limit PDF analysis to first 10 pages
- Implement rate limiting (max 100 requests/day per user)

### NFR-3: Privacy
- API calls made server-side only
- No document data stored by Google (use non-logged API mode)
- API key stored securely (not in client code)

### NFR-4: Reliability
- Graceful degradation if API is unavailable
- Retry logic with exponential backoff
- Fallback to manual entry on failure

## Technical Constraints

### TC-1: Devvit Limitations
- No environment variables support - API key must be hardcoded or stored in Redis
- 30-second max request timeout
- 4MB max request payload

### TC-2: Gemini API Limits
- Free tier: 15 requests/minute, 1500 requests/day
- Paid tier: 1000 requests/minute
- Max input tokens: 1M for gemini-1.5-flash

### TC-3: File Size Limits
- Images: 500KB max (already compressed)
- PDFs: 500KB max (Redis storage limit)
- Both fit within Gemini's limits

## Dependencies
- Google Gemini API access (API key required)
- `@google/generative-ai` npm package
- Existing document upload flow

## Success Metrics
- 80%+ of users keep auto-generated descriptions
- Average time to upload reduced by 50%
- User satisfaction score > 4/5 for AI features

## Out of Scope
- OCR for scanned documents (Gemini handles this natively)
- Multi-language support (future enhancement)
- Custom AI prompts (future enhancement)
- Batch analysis of existing documents
