# Gemini API Logging and Monitoring

## Overview

The Gemini API integration includes comprehensive structured logging to track all analysis requests, performance metrics, errors, and cache operations. All logs are prefixed with `[Gemini]` for easy filtering.

## Log Levels

### INFO
Used for normal operational events:
- Client initialization
- Analysis request start
- File type detection
- Successful analysis completion
- Response parsing
- Cache hits/misses
- Rate limit checks (when not exceeded)

### WARN
Used for recoverable issues:
- API key not configured
- Fallback responses triggered
- File type detection failures
- Rate limit warnings

### ERROR
Used for failures that prevent normal operation:
- Client initialization failures
- Analysis failures
- Response parsing errors
- Retry exhaustion

### PERFORMANCE
Used for tracking operation timing:
- Document analysis duration
- Success/failure status
- Request metadata

## Log Structure

All logs are structured as JSON for easy parsing and analysis:

```json
{
  "timestamp": "2024-10-29T12:34:56.789Z",
  "level": "INFO|WARN|ERROR|PERFORMANCE",
  "message": "Human-readable message",
  "requestId": "req_1234567890_abc123",
  "fileName": "receipt.jpg",
  "fileType": "image",
  "durationMs": 1234,
  "...": "additional context-specific fields"
}
```

## Key Metrics Tracked

### Analysis Requests
- Request ID (unique identifier)
- File name
- File type (detected and provided)
- File size (data length)
- Timestamp

### Performance Metrics
- Analysis duration (milliseconds)
- Success/failure status
- Retry attempts
- Backoff delays

### Error Tracking
- Error messages
- Stack traces
- Retry count
- File context
- Fallback triggers

### Cache Operations (when implemented)
- Cache hits/misses
- Cache keys
- Cache operation metadata

### Rate Limiting (when implemented)
- Username
- Current request count
- Limit threshold
- Remaining quota
- Exceeded status

## Example Log Entries

### Successful Analysis
```json
{
  "timestamp": "2024-10-29T12:34:56.789Z",
  "level": "INFO",
  "message": "Starting document analysis",
  "requestId": "req_1698582896789_abc123",
  "fileName": "receipt.jpg",
  "fileType": "image/jpeg",
  "dataLength": 45678
}

{
  "timestamp": "2024-10-29T12:34:57.234Z",
  "level": "INFO",
  "message": "Image analysis successful",
  "descriptionLength": 45,
  "summaryLength": 120,
  "retryCount": 0,
  "fileName": "receipt.jpg"
}

{
  "timestamp": "2024-10-29T12:34:57.234Z",
  "level": "PERFORMANCE",
  "operation": "Document analysis completed",
  "durationMs": 445,
  "requestId": "req_1698582896789_abc123",
  "fileName": "receipt.jpg",
  "fileType": "image",
  "success": true
}
```

### Failed Analysis with Retry
```json
{
  "timestamp": "2024-10-29T12:35:00.123Z",
  "level": "ERROR",
  "message": "Image analysis failed",
  "error": "API timeout",
  "retryCount": 0,
  "fileName": "invoice.pdf",
  "fileSize": 123456
}

{
  "timestamp": "2024-10-29T12:35:00.124Z",
  "level": "INFO",
  "message": "Retrying image analysis",
  "backoffMs": 1000,
  "attempt": 1,
  "maxRetries": 2,
  "fileName": "invoice.pdf"
}
```

### Fallback Response
```json
{
  "timestamp": "2024-10-29T12:35:05.456Z",
  "level": "WARN",
  "message": "Using fallback response for image",
  "fileName": "receipt.jpg",
  "reason": "Max retries exceeded or non-retryable error"
}

{
  "timestamp": "2024-10-29T12:35:05.456Z",
  "level": "WARN",
  "message": "Creating fallback response",
  "fileName": "receipt.jpg",
  "fileType": "image",
  "errorMessage": "API timeout"
}
```

### Cache Operations
```json
{
  "timestamp": "2024-10-29T12:36:00.000Z",
  "level": "INFO",
  "message": "Cache hit",
  "cacheHit": true,
  "cacheKey": "analysis:abc123def456"
}

{
  "timestamp": "2024-10-29T12:36:01.000Z",
  "level": "INFO",
  "message": "Cache miss",
  "cacheHit": false,
  "cacheKey": "analysis:xyz789ghi012"
}
```

### Rate Limiting
```json
{
  "timestamp": "2024-10-29T12:37:00.000Z",
  "level": "INFO",
  "message": "Rate limit check",
  "username": "user123",
  "currentCount": 45,
  "limit": 100,
  "exceeded": false,
  "remaining": 55
}

{
  "timestamp": "2024-10-29T12:37:30.000Z",
  "level": "WARN",
  "message": "Rate limit exceeded",
  "username": "user456",
  "currentCount": 101,
  "limit": 100,
  "exceeded": true
}
```

## Monitoring and Analysis

### Filtering Logs

All Gemini logs are prefixed with `[Gemini]`, making them easy to filter:

```bash
# View all Gemini logs
grep "\[Gemini\]" logs.txt

# View only errors
grep "\[Gemini\].*ERROR" logs.txt

# View performance metrics
grep "\[Gemini\].*PERFORMANCE" logs.txt

# View cache operations
grep "\[Gemini\].*Cache" logs.txt
```

### Key Metrics to Monitor

1. **Success Rate**: Ratio of successful analyses to total attempts
2. **Average Response Time**: Mean duration of successful analyses
3. **Error Rate**: Frequency of errors by type
4. **Retry Rate**: How often retries are needed
5. **Fallback Rate**: How often fallback responses are used
6. **Cache Hit Rate**: Percentage of requests served from cache
7. **Rate Limit Hits**: Frequency of rate limit violations

### Performance Baselines

- **Target response time**: < 5 seconds
- **Expected success rate**: > 95%
- **Expected cache hit rate**: > 50% (when caching is enabled)
- **Expected retry rate**: < 10%

## Integration with Monitoring Tools

The structured JSON logs can be easily integrated with monitoring tools:

- **Splunk**: Parse JSON logs and create dashboards
- **ELK Stack**: Index logs in Elasticsearch for analysis
- **CloudWatch**: Stream logs to AWS CloudWatch Logs
- **Datadog**: Forward logs for real-time monitoring
- **Custom Scripts**: Parse JSON logs with jq or similar tools

## Utility Functions

### logCacheOperation
```typescript
logCacheOperation(hit: boolean, cacheKey: string, metadata?: Record<string, any>)
```
Call this function when checking cache to track hit/miss rates.

### logRateLimitCheck
```typescript
logRateLimitCheck(username: string, currentCount: number, limit: number, exceeded: boolean)
```
Call this function when checking rate limits to track usage patterns.

## Best Practices

1. **Always include requestId**: Helps trace requests through the system
2. **Log at appropriate levels**: Don't use ERROR for expected conditions
3. **Include context**: Add relevant metadata to help debugging
4. **Monitor performance logs**: Track trends over time
5. **Set up alerts**: Alert on high error rates or slow responses
6. **Review logs regularly**: Look for patterns and optimization opportunities

## Future Enhancements

- Add log aggregation to Redis for real-time metrics
- Implement log rotation and archival
- Add custom metrics dashboard
- Integrate with Reddit's monitoring infrastructure
- Add user-level analytics (anonymized)
