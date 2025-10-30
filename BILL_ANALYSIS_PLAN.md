# Power Bill Analysis Feature - Implementation Plan

## Overview
Enable users to upload power bill images and automatically extract/analyze key information like amount due, due date, usage, and trends.

## Current State
- ✅ Users can upload images (desktop only)
- ✅ Images stored in Redis as base64
- ✅ Manual notes field for text entry
- ❌ No OCR or analysis capability

## Technical Challenges

### Challenge 1: OCR in Devvit
**Problem:** 
- Client-side OCR (tesseract-wasm) blocked by CSP `unsafe-eval`
- External OCR APIs (OCR.space) blocked by sandbox
- No native OCR in Devvit

**Solutions:**
1. **External OCR Proxy** (Recommended)
2. **Manual Text Entry** (Current workaround)
3. **AI Vision API** (Most powerful)

## Proposed Architecture

### Option A: External OCR Proxy (Moderate Complexity)

```
User uploads bill → Devvit stores image → 
Devvit sends to your API → API calls OCR service → 
Returns extracted text → Devvit parses & stores → 
Shows analysis to user
```

**Components:**
1. **Your API Server** (Vercel/Railway/Cloudflare Workers)
   - Receives base64 image from Devvit
   - Calls OCR.space or Google Vision API
   - Returns structured data

2. **Devvit Server Endpoint** (`/api/bills/analyze`)
   - Sends image to your API
   - Receives OCR text
   - Parses bill data (regex/patterns)
   - Stores in Redis

3. **Bill Parser Module**
   - Extracts: Amount, Due Date, Usage (kWh), Account Number
   - Handles multiple utility formats
   - Validates extracted data

4. **Analysis Engine**
   - Compares to previous bills
   - Calculates trends (usage up/down)
   - Alerts for high bills
   - Suggests savings

**Redis Structure:**
```javascript
// Key: bills:{postId}:{userId}
{
  bills: [
    {
      id: "bill_123",
      imageData: "base64...",
      uploadDate: 1234567890,
      
      // Extracted data
      extracted: {
        amount: 125.50,
        dueDate: "2025-11-15",
        usageKwh: 850,
        accountNumber: "1234567890",
        billingPeriod: "Oct 1 - Oct 31",
        provider: "Pacific Gas & Electric"
      },
      
      // Analysis
      analysis: {
        vsLastMonth: {
          amountChange: +15.50,
          percentChange: +14.1,
          usageChange: +50
        },
        alerts: ["Usage increased 14%", "Bill higher than average"],
        recommendations: ["Consider energy audit", "Check for phantom loads"]
      }
    }
  ]
}
```

**Implementation Steps:**

1. **Set up External API** (Week 1)
   - Deploy to Vercel/Railway
   - Add OCR.space API integration
   - Create `/analyze-bill` endpoint
   - Return structured JSON

2. **Request Domain Whitelisting** (Week 1-2)
   - Contact Reddit Devvit team
   - Request whitelist for your API domain
   - Wait for approval

3. **Add Bill Analysis Endpoint** (Week 2)
   - Create `/api/bills/analyze` in Devvit
   - Send image to external API
   - Parse response
   - Store in Redis

4. **Build Bill Parser** (Week 2)
   - Regex patterns for common utilities
   - Extract amount, date, usage
   - Handle multiple formats
   - Validation logic

5. **Create Analysis UI** (Week 3)
   - Bill details view
   - Trend charts (usage over time)
   - Comparison to previous months
   - Alerts and recommendations

6. **Add Bill History** (Week 3)
   - List all bills
   - Sort by date
   - Filter by provider
   - Export to CSV

**Pros:**
- Real OCR capability
- Accurate text extraction
- Handles various bill formats
- Can improve over time

**Cons:**
- Requires external infrastructure
- Needs domain whitelisting from Reddit
- OCR API costs (OCR.space: $60/month for 25k requests)
- More complex architecture

---

### Option B: AI Vision API (Most Powerful)

```
User uploads bill → Devvit stores image → 
Devvit sends to your API → API calls GPT-4 Vision/Claude → 
Returns structured bill data → Devvit stores → 
Shows analysis to user
```

**Why Better Than OCR:**
- Understands context (not just text extraction)
- Handles poor quality images
- Extracts structured data directly
- No need for complex parsing

**API Options:**
1. **OpenAI GPT-4 Vision** ($0.01 per image)
2. **Anthropic Claude 3** ($0.008 per image)
3. **Google Gemini Vision** (Free tier available)

**Your API Endpoint:**
```javascript
// POST /analyze-bill
{
  image: "base64...",
  type: "power_bill"
}

// Response
{
  provider: "Pacific Gas & Electric",
  accountNumber: "1234567890",
  amount: 125.50,
  dueDate: "2025-11-15",
  billingPeriod: {
    start: "2025-10-01",
    end: "2025-10-31"
  },
  usage: {
    kwh: 850,
    peakKwh: 320,
    offPeakKwh: 530
  },
  charges: [
    { description: "Energy Charge", amount: 85.00 },
    { description: "Delivery Charge", amount: 30.50 },
    { description: "Taxes", amount: 10.00 }
  ],
  confidence: 0.95
}
```

**Prompt Example:**
```
Analyze this power bill image and extract the following information in JSON format:
- Provider name
- Account number
- Total amount due
- Due date
- Billing period (start and end dates)
- Total usage in kWh
- Breakdown of charges
- Any alerts or important notices

Return only valid JSON. If any field cannot be determined, use null.
```

**Implementation Steps:**

1. **Set up AI API Server** (Week 1)
   - Deploy to Vercel/Cloudflare Workers
   - Add OpenAI/Claude API key
   - Create `/analyze-bill` endpoint
   - Test with sample bills

2. **Request Domain Whitelisting** (Week 1-2)
   - Same as Option A

3. **Integrate with Devvit** (Week 2)
   - Add `/api/bills/analyze` endpoint
   - Send image to AI API
   - Store structured response
   - Handle errors gracefully

4. **Build Analysis Features** (Week 2-3)
   - Bill details view
   - Trend analysis
   - Comparison charts
   - Alerts for anomalies

5. **Add Smart Features** (Week 3-4)
   - Predict next bill amount
   - Identify usage patterns
   - Suggest optimal plans
   - Budget tracking

**Pros:**
- Most accurate extraction
- Handles any bill format
- Understands context
- No complex parsing needed
- Can extract more data

**Cons:**
- Requires external infrastructure
- Needs domain whitelisting
- API costs ($0.01 per bill)
- Requires API key management

---

### Option C: Manual Entry with Smart Suggestions (Simplest)

```
User uploads bill → Devvit stores image → 
User manually enters key data → 
Devvit analyzes trends → 
Shows insights
```

**No External Dependencies!**

**Implementation:**

1. **Enhanced Upload Form**
   - Image upload (existing)
   - Manual fields:
     - Amount: $___
     - Due Date: ___
     - Usage (kWh): ___
     - Provider: dropdown
   - Auto-save to Redis

2. **Bill Analysis Logic** (Client/Server)
   - Compare to previous bills
   - Calculate trends
   - Generate alerts
   - No OCR needed!

3. **Smart Features**
   - Average monthly cost
   - Usage trends chart
   - High bill alerts
   - Budget tracking

**Redis Structure:**
```javascript
{
  bills: [
    {
      id: "bill_123",
      imageData: "base64...",
      uploadDate: 1234567890,
      
      // User-entered data
      amount: 125.50,
      dueDate: "2025-11-15",
      usageKwh: 850,
      provider: "PG&E",
      
      // Auto-calculated
      analysis: {
        vsLastMonth: +14.1,
        vsAverage: +8.5,
        trend: "increasing"
      }
    }
  ]
}
```

**Pros:**
- No external dependencies
- Works within Devvit constraints
- No API costs
- Simple architecture
- Can implement immediately

**Cons:**
- Manual data entry required
- More work for users
- Prone to entry errors
- Less "magical" experience

---

## Recommended Approach

### Phase 1: Manual Entry (Immediate)
Start with Option C to validate the concept:
- Add bill-specific fields to upload form
- Build analysis engine
- Create trend visualizations
- Get user feedback

**Timeline:** 1-2 weeks
**Cost:** $0
**Complexity:** Low

### Phase 2: AI Vision (Future)
Once proven valuable, add AI:
- Deploy external API with GPT-4 Vision
- Request domain whitelisting
- Add automatic extraction
- Keep manual entry as fallback

**Timeline:** 2-3 weeks
**Cost:** ~$0.01 per bill
**Complexity:** Medium

## Feature Breakdown

### Core Features (Phase 1)
1. **Bill Upload**
   - Image upload (existing)
   - Manual data entry form
   - Provider selection
   - Save to Redis

2. **Bill List**
   - Show all bills
   - Sort by date
   - Filter by provider
   - Quick stats

3. **Bill Details**
   - View image
   - Show entered data
   - Comparison to previous
   - Trend indicators

4. **Analysis Dashboard**
   - Average monthly cost
   - Usage trends (chart)
   - High bill alerts
   - Budget tracking

### Advanced Features (Phase 2)
5. **Automatic Extraction**
   - AI-powered OCR
   - Auto-fill form
   - User can edit
   - Confidence scores

6. **Smart Insights**
   - Predict next bill
   - Identify patterns
   - Seasonal adjustments
   - Savings recommendations

7. **Notifications**
   - Bill due reminders
   - High usage alerts
   - Budget exceeded warnings
   - Payment confirmations

8. **Export & Reports**
   - Annual summary
   - Tax reports
   - CSV export
   - PDF generation

## Technical Specifications

### New Components

**Client:**
```
src/client/components/
  BillUploader.tsx       - Upload with data entry form
  BillsList.tsx          - List all bills
  BillDetails.tsx        - Single bill view
  BillAnalysis.tsx       - Trends and insights
  BillChart.tsx          - Usage chart component
```

**Server:**
```
src/server/
  routes/
    bills.ts             - Bill CRUD endpoints
  services/
    billAnalyzer.ts      - Analysis logic
    billParser.ts        - OCR text parsing (Phase 2)
  utils/
    billValidation.ts    - Data validation
```

**Shared:**
```
src/shared/types/
  bill.ts                - Bill type definitions
  analysis.ts            - Analysis types
```

### API Endpoints

```typescript
// Create/upload bill
POST /api/bills/create
Body: { imageData, amount, dueDate, usageKwh, provider }
Response: { bill: Bill }

// List bills
GET /api/bills/list
Response: { bills: Bill[] }

// Get bill details
GET /api/bills/:id
Response: { bill: Bill, analysis: Analysis }

// Delete bill
DELETE /api/bills/:id
Response: { success: boolean }

// Get analysis
GET /api/bills/analysis
Response: { summary: Summary, trends: Trends }

// Analyze bill (Phase 2)
POST /api/bills/analyze
Body: { imageData }
Response: { extracted: ExtractedData }
```

### Data Models

```typescript
type Bill = {
  id: string;
  imageData: string;
  uploadDate: number;
  
  // User-entered or extracted
  amount: number;
  dueDate: string;
  usageKwh: number;
  provider: string;
  accountNumber?: string;
  billingPeriod?: {
    start: string;
    end: string;
  };
  
  // Auto-calculated
  analysis: {
    vsLastMonth: number;
    vsAverage: number;
    trend: 'increasing' | 'decreasing' | 'stable';
    alerts: string[];
  };
};

type Analysis = {
  totalBills: number;
  averageAmount: number;
  averageUsage: number;
  totalSpent: number;
  trends: {
    month: string;
    amount: number;
    usage: number;
  }[];
  insights: string[];
};
```

## Cost Estimates

### Option A: OCR Proxy
- **Infrastructure:** $0 (Vercel free tier)
- **OCR.space API:** $60/month (25k requests)
- **Total:** $60/month

### Option B: AI Vision
- **Infrastructure:** $0 (Vercel free tier)
- **OpenAI API:** $0.01 per bill
- **Example:** 1000 bills/month = $10/month
- **Total:** $10-50/month depending on usage

### Option C: Manual Entry
- **Infrastructure:** $0 (Devvit hosted)
- **APIs:** $0
- **Total:** $0/month

## Success Metrics

1. **Adoption:** % of users who upload bills
2. **Accuracy:** % of correctly extracted data (Phase 2)
3. **Engagement:** Bills uploaded per user
4. **Value:** Users who report saving money
5. **Retention:** Users who return monthly

## Risks & Mitigations

### Risk 1: Domain Whitelisting Denied
**Mitigation:** Start with manual entry (Option C)

### Risk 2: OCR Accuracy Issues
**Mitigation:** Allow manual editing, show confidence scores

### Risk 3: Privacy Concerns
**Mitigation:** 
- Clear privacy policy
- Data stored per-post (isolated)
- Option to delete all data
- No sharing with third parties

### Risk 4: Cost Overruns
**Mitigation:**
- Start with free tier
- Set usage limits
- Monitor costs closely
- Consider user limits

## Next Steps

1. **Validate Concept** - Survey users about bill tracking interest
2. **Start Phase 1** - Implement manual entry version
3. **Test & Iterate** - Get feedback, improve UX
4. **Evaluate Phase 2** - Decide if AI worth the cost
5. **Scale** - Add more bill types (water, gas, internet)

## Future Expansion

Once power bills work well:
- **Water bills**
- **Gas bills**
- **Internet bills**
- **Phone bills**
- **Credit card statements**
- **Receipts**

Become a complete **Personal Finance Document Manager** on Reddit!

---

## Recommendation

**Start with Option C (Manual Entry)**
- Validate the concept
- Zero cost
- Works within constraints
- Can add AI later

**Then upgrade to Option B (AI Vision)**
- Once proven valuable
- Better user experience
- More accurate
- Worth the cost

This approach minimizes risk while maximizing learning and user value.
