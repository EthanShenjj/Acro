# Extension Testing Results

**Date**: _____________  
**Tester**: _____________  
**Chrome Version**: _____________  
**Backend Version**: _____________

## Test 1: Recording Flow End-to-End

| Step | Expected Result | Actual Result | Pass/Fail | Notes |
|------|----------------|---------------|-----------|-------|
| Start recording | 3-2-1 countdown appears | | ☐ Pass ☐ Fail | |
| Badge state | Badge turns red with "REC" | | ☐ Pass ☐ Fail | |
| Click capture | Red ripple appears at clicks | | ☐ Pass ☐ Fail | |
| Data upload | POST requests to /api/recording/chunk | | ☐ Pass ☐ Fail | |
| Complete recording | Editor opens in new tab | | ☐ Pass ☐ Fail | |
| Badge clear | Badge clears after stop | | ☐ Pass ☐ Fail | |

**Overall Result**: ☐ Pass ☐ Fail

---

## Test 2: Badge State Transitions

| State | Expected Badge | Actual Badge | Pass/Fail | Notes |
|-------|---------------|--------------|-----------|-------|
| Idle | No badge text | | ☐ Pass ☐ Fail | |
| Initializing | Yellow bg, "..." text | | ☐ Pass ☐ Fail | |
| Recording | Red bg (#FF0000), "REC" | | ☐ Pass ☐ Fail | |
| Paused | Gray bg (#808080), "\|\|" | | ☐ Pass ☐ Fail | |
| Stopped | No badge text | | ☐ Pass ☐ Fail | |

**Overall Result**: ☐ Pass ☐ Fail

---

## Test 3: Pause and Resume Functionality

| Step | Expected Result | Actual Result | Pass/Fail | Notes |
|------|----------------|---------------|-----------|-------|
| Pause | Page freezes (grayscale) | | ☐ Pass ☐ Fail | |
| Pause | Control bar appears | | ☐ Pass ☐ Fail | |
| Pause | Badge turns gray with "\|\|" | | ☐ Pass ☐ Fail | |
| Pause | Clicks are blocked | | ☐ Pass ☐ Fail | |
| Resume | Control bar disappears | | ☐ Pass ☐ Fail | |
| Resume | Page unfreezes | | ☐ Pass ☐ Fail | |
| Resume | 3-2-1 countdown shows | | ☐ Pass ☐ Fail | |
| Resume | Badge turns red with "REC" | | ☐ Pass ☐ Fail | |
| Resume | Clicks captured normally | | ☐ Pass ☐ Fail | |
| Multiple cycles | Pause/resume works multiple times | | ☐ Pass ☐ Fail | |

**Overall Result**: ☐ Pass ☐ Fail

---

## Test 4: Data Upload Verification

| Check | Expected Result | Actual Result | Pass/Fail | Notes |
|-------|----------------|---------------|-----------|-------|
| Backend receives data | Chunks logged in backend | | ☐ Pass ☐ Fail | |
| Database records | Steps saved in database | | ☐ Pass ☐ Fail | |
| Step data complete | All fields populated | | ☐ Pass ☐ Fail | |
| Screenshots saved | PNG files in static/images/ | | ☐ Pass ☐ Fail | |
| Batch uploading | Uploads every 5 steps or 10s | | ☐ Pass ☐ Fail | |

**Steps captured**: _____  
**Steps in database**: _____  
**Screenshot files**: _____

**Overall Result**: ☐ Pass ☐ Fail

---

## Test 5: Error Handling

| Scenario | Expected Result | Actual Result | Pass/Fail | Notes |
|----------|----------------|---------------|-----------|-------|
| Backend offline | Error notification shown | | ☐ Pass ☐ Fail | |
| Backend offline | Extension continues | | ☐ Pass ☐ Fail | |
| Backend offline | Data stored in IndexedDB | | ☐ Pass ☐ Fail | |
| Screenshot failure | Error logged, recording continues | | ☐ Pass ☐ Fail | |
| Network error | Retry with exponential backoff | | ☐ Pass ☐ Fail | |
| Max retries | Data stored in IndexedDB | | ☐ Pass ☐ Fail | |

**Overall Result**: ☐ Pass ☐ Fail

---

## Summary

**Total Tests**: 5  
**Tests Passed**: _____  
**Tests Failed**: _____  
**Pass Rate**: _____%

### Critical Issues Found

1. 
2. 
3. 

### Minor Issues Found

1. 
2. 
3. 

### Recommendations

1. 
2. 
3. 

### Sign-off

**Tester Signature**: _____________  
**Date**: _____________  

**Ready to proceed to Phase 3 (Web Dashboard)?**: ☐ Yes ☐ No

**If No, explain**: 

---

## Additional Notes

