# End-to-End Integration Testing Guide

## Overview

This document describes the end-to-end integration testing strategy for the Acro SaaS Demo Video Creation Tool. The tests validate the complete flow across all components: Chrome Extension → Backend API → Dashboard → Editor.

## Test Coverage

### Complete Flow Tests

1. **Recording to Editor Flow**
   - Extension starts recording session
   - Extension captures multiple steps with screenshots
   - Extension stops recording
   - Backend processes and stores data
   - Dashboard displays project
   - Editor loads and renders video

2. **Data Consistency Tests**
   - Verify data integrity across components
   - Validate step ordering
   - Check folder-project relationships
   - Ensure soft delete preservation

3. **Error Recovery Tests**
   - Invalid session handling
   - Missing project errors
   - Network failure recovery
   - TTS generation failures

4. **Folder Management Tests**
   - Folder creation and organization
   - System folder protection
   - Trash folder operations
   - Default folder assignment

5. **Script Editing Tests**
   - TTS regeneration on script update
   - Composition recalculation
   - Duration frame updates

## Test Files

### Backend Integration Tests
**File:** `backend/tests/test_e2e_integration.py`

Tests the complete backend flow:
- Recording session management
- Step capture and storage
- Project finalization
- Dashboard data retrieval
- Editor data loading
- Script editing and TTS

**Run tests:**
```bash
cd backend
pytest tests/test_e2e_integration.py -v
```

### Dashboard Integration Tests
**File:** `dashboard/__tests__/integration.test.tsx`

Tests the frontend integration:
- Dashboard to Editor navigation
- API client consistency
- Project operations
- Folder management
- Video composition calculations

**Run tests:**
```bash
cd dashboard
npm test -- integration.test.tsx
```

## Test Scenarios

### Scenario 1: Complete Recording Flow

**Steps:**
1. Extension calls `POST /api/recording/start`
2. Extension captures 3 steps with screenshots
3. Extension calls `POST /api/recording/chunk` for each step
4. Extension calls `POST /api/recording/stop`
5. Backend generates thumbnail and returns project details
6. Dashboard loads project list
7. Editor loads project details with all steps

**Validation:**
- All steps are stored in correct order
- Images are saved and accessible
- TTS audio is generated (if applicable)
- Thumbnail is created
- Project appears in dashboard
- Editor receives complete step data

### Scenario 2: Soft Delete Consistency

**Steps:**
1. Create project with steps
2. Soft delete project via `DELETE /api/projects/{id}`
3. Verify project has `deleted_at` timestamp
4. Verify steps remain in database
5. Verify project doesn't appear in normal listing
6. Verify project can still be accessed by ID

**Validation:**
- Project record exists with `deleted_at` set
- All steps remain unchanged
- Project excluded from `GET /api/projects`
- Project accessible via `GET /api/projects/{id}/details`

### Scenario 3: Folder Organization

**Steps:**
1. Create custom folder
2. Create project (defaults to "All Flows")
3. Move project to custom folder
4. Filter projects by folder
5. Verify project appears in correct folder
6. Verify project excluded from "All Flows"

**Validation:**
- Default folder assignment works
- Folder filtering is accurate
- Project-folder relationship maintained
- System folders protected from deletion

### Scenario 4: Script Editing and TTS

**Steps:**
1. Load project in editor
2. Edit step script text
3. Backend regenerates TTS audio
4. Editor receives updated audio URL and duration
5. Composition recalculates total duration
6. Changes persist across page reload

**Validation:**
- Script text updated in database
- New audio file generated
- Duration frames recalculated
- Composition updated correctly
- Changes visible after reload

### Scenario 5: Error Recovery

**Steps:**
1. Attempt upload with invalid session ID
2. Attempt to load non-existent project
3. Simulate network failure
4. Simulate TTS generation failure

**Validation:**
- Appropriate error codes returned (400, 404, 500)
- Error messages are descriptive
- System remains stable after errors
- Partial data preserved where possible

## Data Consistency Checks

### Step Ordering
- Steps must be ordered by `order_index`
- No gaps in order sequence
- Order preserved across all queries

### Frame Calculations
- Total duration = sum of all step durations
- Frame positions calculated correctly
- No overlapping sequences

### Folder Relationships
- Projects belong to exactly one folder
- Folder filtering returns correct projects
- System folders cannot be deleted
- Trash folder excludes from "All Flows"

### Soft Delete Integrity
- Deleted projects have `deleted_at` timestamp
- Associated steps remain in database
- Deleted projects excluded from listings
- Deleted projects accessible by direct ID

## Running All Integration Tests

### Backend Tests
```bash
cd backend
pytest tests/test_e2e_integration.py -v --cov=. --cov-report=html
```

### Dashboard Tests
```bash
cd dashboard
npm test -- integration.test.tsx --coverage
```

### Full Test Suite
```bash
# Run backend tests
cd backend
pytest tests/test_e2e_integration.py -v

# Run dashboard tests
cd ../dashboard
npm test -- integration.test.tsx

# Run extension tests (if applicable)
cd ../extension
npm test
```

## Test Data

### Sample Screenshot
Tests use a generated blue 1920x1080 PNG image encoded as Base64.

### Sample Projects
- Project 1: 3 steps, "All Flows" folder
- Project 2: 5 steps, "All Flows" folder

### Sample Folders
- "All Flows" (system)
- "Trash" (system)
- "Product Demos" (user)

### Sample Steps
Each step includes:
- Order index (1, 2, 3, ...)
- Action type (click)
- Target text
- Position (x, y)
- Screenshot URL
- Audio URL
- Duration frames

## Continuous Integration

### Pre-commit Checks
- Lint all code
- Run fast unit tests
- Check formatting

### CI Pipeline
1. Run all unit tests
2. Run integration tests
3. Generate coverage reports
4. Build and deploy to staging
5. Run smoke tests on staging

### Coverage Goals
- Backend: 80%+ line coverage
- Dashboard: 75%+ line coverage
- Integration tests: All critical paths covered

## Troubleshooting

### Common Issues

**Issue: Tests fail with database errors**
- Solution: Ensure test database is properly initialized
- Check: `db.create_all()` is called in fixtures

**Issue: Screenshot encoding fails**
- Solution: Verify PIL/Pillow is installed
- Check: Base64 encoding format is correct

**Issue: API mocks not working**
- Solution: Clear jest cache: `npm test -- --clearCache`
- Check: Mock implementations match actual API

**Issue: TTS tests fail**
- Solution: TTS may be unavailable in test environment
- Check: Mock TTS service or skip TTS tests

### Debug Mode

Run tests with verbose output:
```bash
# Backend
pytest tests/test_e2e_integration.py -v -s

# Dashboard
npm test -- integration.test.tsx --verbose
```

## Next Steps

After integration tests pass:
1. Run manual end-to-end testing
2. Test on different browsers
3. Test with real Chrome extension
4. Verify performance under load
5. Test error scenarios manually
6. Validate user experience

## Related Documentation

- [Requirements Document](.kiro/specs/acro-saas-demo-video-tool/requirements.md)
- [Design Document](.kiro/specs/acro-saas-demo-video-tool/design.md)
- [Tasks Document](.kiro/specs/acro-saas-demo-video-tool/tasks.md)
- [Backend README](backend/README.md)
- [Dashboard README](dashboard/README.md)
- [Extension README](extension/README.md)
