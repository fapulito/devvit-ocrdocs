# Gemini API File Analysis - Design

## Architecture Overview

```
User uploads file → Client sends to server → Server calls Gemini API → 
Returns analysis → Pre-fills description/notes → User reviews/edits → Saves document
```

## Component Design

### 1. Client-Side Changes

#### DocumentUploader Component
**New State:**
```typescript
const [analyzing, setAnalyzing] = useState(false);
const [autoAnalyze, setAutoAnalyze] = useState(true);
```

**New UI Elements:**
- Loading spinner during analysis: "Analyzing document..."
- Toggle checkbox: "Auto-analyze with AI"
- Regenerate button: "Re-analyze" (if user wants to try again)

**Flow:**
1. User selects file
2. File loads and displays preview
3. If `autoAnalyze` is true, call `/api/analyze` endpoint
4. Show loading state while waiting
5. Pre-fill description and notes with results
6. User can edit or save

### 2. Server-Side Changes

#### New Endpoint: `/api/analyze`
```typescript
router.post('/api/analyze', async (req, res) => {
  const { fileData, fileType, fileName } = req.body;
  
  // Call Gemini API
  const analysis = await analyzeDocument(fileData, fileType);
  
  res.json({
    type: 'analysis',
    description: analysis.description,
    summary: analysis.summary,
  });
});
```

#### New Module: `src/server/ai/gemini.ts`
```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

export async function analyzeDocument(
  fileData: string,
  fileType: string
): Promise<{ description: string; summary: string }> {
  // Implementation details below
}
```

## Data Flow

### Image Analysis Flow
```
1. Client: User uploads image
2. Client: Compress image to base64
3. Client: POST /api/analyze with base64 data
4. Server: Send image to Gemini with prompt
5. Gemini: Analyze image, return structured response
6. Server: Parse response, return description + summary
7. Client: Pre-fill form fields
8. User: Review, edit, save
```

### PDF Analysis Flow
```
1. Client: User uploads PDF
2. Client: Read PDF as base64
3. Client: POST /api/analyze with base64 data
4. Server: Send PDF to Gemini with prompt
5. Gemini: Extract text, analyze content, return summary
6. Server: Parse response, return description + summary
7. Client: Pre-fill form fields
8. User: Review, edit, save
```

## API Integration Details

### Gemini API Configuration
```typescript
const model = genAI.getGenerativeModel({ 
  model: 'gemini-1.5-flash',
  generationConfig: {
    temperature: 0.4,
    maxOutputTokens: 200,
  }
});
```

### Prompts

#### Image Analysis Prompt
```
Analyze this document image and provide:
1. A brief description (max 80 characters) including document type, company/entity name, and date if visible
2. Key information extracted (amounts, reference numbers, important details)

Format your response as JSON:
{
  "description": "Receipt from Walmart dated 2024-10-15",
  "summary": "Total: $45.67\nPayment method: Credit card\nItems: Groceries"
}
```

#### PDF Analysis Prompt
```
Analyze this PDF document and provide:
1. A brief description (max 80 characters) including document type and main subject
2. A summary (max 400 characters) with key points, important dates, and main takeaways

Format your response as JSON:
{
  "description": "Q4 2024 Financial Report",
  "summary": "• Revenue increased 15% YoY\n• Net profit: $2.3M\n• Key focus: Market expansion\n• Report date: 2024-10-15"
}
```

## Error Handling

### API Failures
```typescript
try {
  const result = await model.generateContent([prompt, imagePart]);
  return parseResponse(result);
} catch (error) {
  console.error('Gemini API error:', error);
  return {
    description: `${fileType.includes('pdf') ? 'PDF' : 'Image'} - ${fileName}`,
    summary: 'Auto-analysis unavailable. Please add details manually.',
  };
}
```

### Fallback Strategy
1. **API timeout** (>5s): Return generic description
2. **Rate limit exceeded**: Show message, disable auto-analyze
3. **Invalid response**: Use filename as description
4. **Network error**: Retry once, then fallback

## Security Considerations

### API Key Storage
**Problem:** Devvit doesn't support environment variables

**Solution:** Use Devvit's built-in settings system

**Implementation:**
1. Define setting in `devvit.json`:
```json
{
  "settings": [
    {
      "type": "string",
      "name": "apiKey",
      "label": "Gemini API Key",
      "helpText": "Your Google Gemini API key for document analysis",
      "isSecret": true
    }
  ]
}
```

2. Set via CLI:
```bash
npx devvit settings set apiKey
```

3. Access in code:
```typescript
import { settings } from '@devvit/web/server';

const apiKey = await settings.get('apiKey');
const genAI = new GoogleGenerativeAI(apiKey as string);
```

**Benefits:**
- Encrypted storage by Devvit
- No custom endpoints needed
- Follows platform conventions
- Secure and simple

### Data Privacy
- Don't log file contents
- Use Gemini's non-logged API mode
- Clear sensitive data from memory after processing

## UI/UX Design

### Upload Form Updates

**Before Analysis:**
```
┌─────────────────────────────────┐
│  [PDF Icon]                     │
│  DOD 8570 Directive.pdf         │
│                                 │
│  ☑ Auto-analyze with AI         │
│  [Analyzing document... 🔄]     │
└─────────────────────────────────┘
```

**After Analysis:**
```
┌─────────────────────────────────┐
│  [PDF Icon]                     │
│  DOD 8570 Directive.pdf         │
│                                 │
│  Description *                  │
│  [DOD 8570 Certification Guide] │
│  ✨ AI-generated [Re-analyze]   │
│                                 │
│  Notes (optional)               │
│  [• Covers IA workforce certs   │
│   • Baseline certifications     │
│   • Updated 2024]               │
│  ✨ AI-generated                │
│                                 │
│  [Save Document]  [Cancel]      │
└─────────────────────────────────┘
```

### Visual Indicators
- ✨ Sparkle icon for AI-generated content
- 🔄 Spinner during analysis
- "Re-analyze" button to regenerate
- Subtle badge: "AI-generated"

## Performance Optimization

### Caching Strategy
```typescript
// Cache analysis results by file hash
const fileHash = crypto.createHash('md5').update(buffer).digest('hex');
const cacheKey = `analysis:${fileHash}`;

// Check cache first
const cached = await redis.get(cacheKey);
if (cached) {
  return JSON.parse(cached);
}

// Analyze and cache for 7 days
const analysis = await callGeminiAPI(fileData);
await redis.set(cacheKey, JSON.stringify(analysis), { ex: 604800 });
```

### Rate Limiting
```typescript
// Per-user rate limiting
const rateLimitKey = `ratelimit:${username}:${date}`;
const count = await redis.incr(rateLimitKey);
await redis.expire(rateLimitKey, 86400); // 24 hours

if (count > 100) {
  throw new Error('Daily analysis limit reached (100/day)');
}
```

## API Response Format

### Successful Response
```json
{
  "type": "analysis",
  "description": "Receipt from Target dated 2024-10-29",
  "summary": "Total: $123.45\nPayment: Visa\nCategory: Household items",
  "confidence": 0.95,
  "processingTime": 1234
}
```

### Error Response
```json
{
  "type": "analysis",
  "description": "PDF - filename.pdf",
  "summary": "Auto-analysis unavailable. Please add details manually.",
  "error": "API timeout",
  "fallback": true
}
```

## Testing Strategy

### Test Cases
1. **Image with clear text** - Should extract company, date, amount
2. **Image with poor quality** - Should provide generic description
3. **PDF with multiple pages** - Should summarize key points
4. **PDF with images** - Should describe visual content
5. **Large file** - Should handle within timeout
6. **API failure** - Should fallback gracefully
7. **Rate limit exceeded** - Should show appropriate message

### Manual Testing
- Upload various document types (receipts, invoices, forms, reports)
- Verify descriptions are accurate and useful
- Test edit functionality after auto-generation
- Verify re-analyze button works

## Rollout Plan

### Phase 1: Basic Integration (Week 1)
- Implement Gemini API client
- Add image analysis endpoint
- Update UI with auto-analyze toggle
- Deploy to test subreddit

### Phase 2: PDF Support (Week 2)
- Add PDF text extraction
- Implement summarization
- Test with various PDF types
- Optimize prompts based on results

### Phase 3: Polish & Optimization (Week 3)
- Add caching layer
- Implement rate limiting
- Add re-analyze functionality
- Collect user feedback

## Cost Estimation

### Gemini API Pricing (gemini-1.5-flash)
- **Free tier**: 15 RPM, 1500 RPD, 1M RPD tokens
- **Paid tier**: $0.075 per 1M input tokens, $0.30 per 1M output tokens

### Expected Usage
- Average request: ~50KB image or 100KB PDF text
- Average tokens: ~1000 input, ~100 output per request
- Cost per request: ~$0.0001 (paid tier)
- 1000 requests/day = ~$0.10/day = $3/month

**Recommendation:** Start with free tier, upgrade if needed

## Dependencies
- `@google/generative-ai` npm package (v0.21.0+)
- Google Cloud account with Gemini API enabled
- API key with Gemini API access

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| API key exposure | High | Store in Redis, never in client code |
| API rate limits | Medium | Implement caching and rate limiting |
| Inaccurate analysis | Low | Allow manual editing, show as suggestions |
| API downtime | Medium | Graceful fallback to manual entry |
| Cost overruns | Low | Free tier sufficient, add rate limits |

## Future Enhancements
- Multi-language support
- Custom analysis prompts
- Batch analysis for existing documents
- Analysis history and accuracy tracking
- Integration with other AI providers (Claude, GPT-4)
