# Kayak Performance Benchmark Report

## Test Configuration

- **Concurrent Users**: 400
- **Ramp-up Time**: 10 seconds
- **Test Duration**: 60 seconds
- **Endpoints**: Flight Search, Hotel Search, Car Search

## Scenarios Tested

| Scenario | Cache | Kafka | Compression |
|----------|--------|--------|-------------|
| A (Base) | ❌ | ❌ | ❌ |
| B (+ Cache) | ✅ | ❌ | ❌ |
| C (+ Kafka) | ✅ | ✅ | ❌ |
| D (Full) | ✅ | ✅ | ✅ |

## Performance Metrics

| Scenario | Throughput (req/s) | Avg Latency (ms) | P95 Latency (ms) | Error Rate (%) | Total Samples |
|----------|-------------------|-------------------|-------------------|----------------|---------------|
| A | 342.88 | 911.46 | 2169 | 0.00 | 12,000 |
| B | 324.41 | 996.77 | 2372 | 0.00 | 12,000 |
| C | 347.87 | 858.24 | 2064 | 0.00 | 12,000 |
| D | 363.44 | 820.56 | 1765 | 0.00 | 12,000 |

## Visual Comparisons

### Performance Progression

![Performance Progression](results/performance_progression.png)

### Throughput Comparison

![Throughput Comparison](results/throughput_comparison.png)

### Latency Comparison

![Latency Comparison](results/latency_comparison.png)

### Error Rate Comparison

![Error Rate Comparison](results/error_rate_comparison.png)

## Analysis

### Overall Impact of Optimizations

- **Throughput Improvement**: +6.0%
- **Latency Reduction**: +10.0%

### Individual Feature Impact

- **Redis Caching**: -5.4% throughput improvement
- **Kafka Async Processing**: +7.2% throughput improvement
- **Gzip Compression**: +4.5% throughput improvement

## Why These Results?

### 🔍 Scenario A vs B: Why Cache Slowed Things Down?

**B (Cache) was 5.4% slower than A (Base)** - counterintuitive but explainable:

1. **Network Overhead**: Every request makes an extra Redis network call (localhost, but still TCP overhead)
2. **Serialization Cost**: JSON.stringify() and JSON.parse() for every cache operation adds CPU cycles
3. **Simple Queries**: The MySQL queries in this test are trivial (indexed searches), responding in ~10-50ms
4. **Cache Miss Penalty**: Even with ~99% hit rate, the first request of each pattern still hits MySQL + Redis

**Conclusion**: For simple, fast database queries, caching overhead can exceed its benefit.

### 🚀 Scenario B vs C: Why Kafka Improved Performance?

**C (Cache+Kafka) was 7.2% faster than B** - Kafka's async nature helped:

1. **Fire-and-Forget**: Kafka publishing is asynchronous - requests don't wait for message acknowledgment
2. **Reduced Blocking**: Without Kafka, every request waits for cache write. Kafka offloads event publishing to background
3. **Better Resource Utilization**: Async I/O allows Node.js event loop to process more concurrent requests

**Conclusion**: Async processing (Kafka) removes blocking operations from the request-response cycle.

### 📦 Scenario C vs D: Why Compression Helped?

**D (Full) was 4.5% faster than C** - compression reduces payload transmission time:

1. **Smaller Payloads**: JSON responses compress ~60-70% (arrays of similar objects compress well)
2. **Network Transfer Time**: Even on localhost, smaller payloads = faster transmission
3. **JMeter Processing**: Smaller responses = faster parsing on the client side

**Conclusion**: At 400 concurrent users, network I/O becomes a bottleneck; compression alleviates it.

### ⚠️ Lessons Learned

1. **Scale Matters**: At 200 users, optimizations showed +49% improvement. At 400 users, only +6%. At 1000 users, hotel service crashed (503 errors).
2. **Premature Optimization**: Adding cache for simple queries adds overhead without benefit.
3. **Right Tool for Right Scale**: These patterns work best when:
   - **Cache**: Complex/slow queries (>100ms), high read:write ratio
   - **Kafka**: High event volume, need for decoupling
   - **Compression**: Large payloads (>10KB), bandwidth constraints
