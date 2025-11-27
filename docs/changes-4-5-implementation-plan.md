# Implementation Plan: Changes 4 & 5

## Overview
Detailed, surgical implementation plan for adding LAYOUT_RULES and CRITICAL_NEGATIVES to the Artist prompt without breaking the app.

---

## Change 4: Add LAYOUT_RULES to Artist Prompt

### Risk Assessment
- **Risk Level:** LOW
- **Impact:** Adds text to prompt only, no logic changes
- **Breaking Risk:** None - just adds instructions

### Implementation Steps

#### Step 4a: Add Import
**File:** `services/gemini.ts`  
**Location:** Lines 5-12

**Current code:**
```typescript
import {
  MODELS,
  REFERENCE_MAP,
  GOLDEN_NEGATIVES,
  CHRISTIAN_GUIDELINES,
  AGE_LOGIC,
  STYLE_LOGIC
} from "../constants";
```

**Change to:**
```typescript
import {
  MODELS,
  REFERENCE_MAP,
  GOLDEN_NEGATIVES,
  LAYOUT_RULES,
  CHRISTIAN_GUIDELINES,
  AGE_LOGIC,
  STYLE_LOGIC
} from "../constants";
```

**Verification:** App should compile without errors.

---

#### Step 4b: Add LAYOUT_RULES to Prompt
**File:** `services/gemini.ts`  
**Location:** Lines 245-254 (promptText variable)

**Current code:**
```typescript
const promptText = `
  ${brief.positive_prompt}
  
  --- TECHNICAL SPECIFICATIONS (STRICT) ---
  1. LINE STYLE: ${ageKeywords} 
  2. ART TECHNIQUE: ${styleKeywords}
  
  ${styleInstruction}
  NEGATIVE PROMPT: ${brief.negative_prompt}, ${GOLDEN_NEGATIVES}
`;
```

**Change to:**
```typescript
const promptText = `
  ${brief.positive_prompt}
  
  --- LAYOUT REQUIREMENTS ---
  ${LAYOUT_RULES}
  
  --- TECHNICAL SPECIFICATIONS (STRICT) ---
  1. LINE STYLE: ${ageKeywords} 
  2. ART TECHNIQUE: ${styleKeywords}
  
  ${styleInstruction}
  NEGATIVE PROMPT: ${brief.negative_prompt}, ${GOLDEN_NEGATIVES}
`;
```

**Key Points:**
- Insert LAYOUT_RULES section AFTER positive_prompt
- Insert BEFORE TECHNICAL SPECIFICATIONS
- Keep all other sections unchanged
- GOLDEN_NEGATIVES remains unchanged (for now)

---

### Testing Checklist for Change 4

- [ ] App compiles without errors
- [ ] Generate one test image (any age/style)
- [ ] Check browser console - no errors
- [ ] Verify image generates successfully
- [ ] Visually inspect output:
  - [ ] Image fills canvas edge-to-edge
  - [ ] No decorative frames or borders
  - [ ] No white margins around image

### Rollback Plan
If issues occur:
1. Remove `LAYOUT_RULES,` from imports (line ~8)
2. Remove LAYOUT_RULES section from promptText (lines ~248-250)

---

## Change 5: Switch to CRITICAL_NEGATIVES (Optional)

### Risk Assessment
- **Risk Level:** MEDIUM
- **Impact:** Changes negative prompt content (~650 fewer tokens)
- **Breaking Risk:** Low, but may affect output quality
- **Recommendation:** Deploy Change 4 first, test thoroughly, then consider Change 5

### Implementation Steps

#### Step 5a: Add Import
**File:** `services/gemini.ts`  
**Location:** Lines 5-12 (after Change 4)

**After Change 4, imports should be:**
```typescript
import {
  MODELS,
  REFERENCE_MAP,
  GOLDEN_NEGATIVES,
  LAYOUT_RULES,
  CHRISTIAN_GUIDELINES,
  AGE_LOGIC,
  STYLE_LOGIC
} from "../constants";
```

**Change to:**
```typescript
import {
  MODELS,
  REFERENCE_MAP,
  GOLDEN_NEGATIVES,
  LAYOUT_RULES,
  CRITICAL_NEGATIVES,
  CHRISTIAN_GUIDELINES,
  AGE_LOGIC,
  STYLE_LOGIC
} from "../constants";
```

**Note:** Keep GOLDEN_NEGATIVES import for easy rollback.

---

#### Step 5b: Replace GOLDEN_NEGATIVES with CRITICAL_NEGATIVES
**File:** `services/gemini.ts`  
**Location:** Line ~253 (after Change 4)

**Current code (after Change 4):**
```typescript
NEGATIVE PROMPT: ${brief.negative_prompt}, ${GOLDEN_NEGATIVES}
```

**Change to:**
```typescript
NEGATIVE PROMPT: ${brief.negative_prompt}, ${CRITICAL_NEGATIVES}
```

**Key Points:**
- Only change the variable name: `GOLDEN_NEGATIVES` → `CRITICAL_NEGATIVES`
- Keep the label "NEGATIVE PROMPT:" unchanged
- Keep `${brief.negative_prompt},` unchanged

---

### Important Considerations

**Token Reduction:**
- GOLDEN_NEGATIVES: ~800 characters
- CRITICAL_NEGATIVES: ~150 characters
- **Savings: ~650 characters (~50% reduction)**

**Expected Effects:**
- ✅ Faster generation (fewer tokens to process)
- ✅ Lower API costs (fewer tokens)
- ⚠️ Fewer explicit exclusions (may allow some edge cases)
- ⚠️ Need to monitor output quality closely

**What CRITICAL_NEGATIVES Includes:**
- Color/shading exclusions (critical)
- Text/watermark exclusions (critical)
- Frame/border exclusions (critical)
- Theology exclusions (critical)
- Scale exclusions (critical)

**What CRITICAL_NEGATIVES Excludes (from GOLDEN_NEGATIVES):**
- Detailed anatomy exclusions (extra fingers, etc.)
- Modern clothing details
- Specific scene exclusions
- Detailed coloring book physics

---

### Testing Checklist for Change 5

**Before Deploying:**
- [ ] Change 4 is deployed and working
- [ ] Have baseline images from Change 4 for comparison

**After Deploying:**
- [ ] Generate 3-5 test images across different combinations:
  - [ ] Different age groups (Toddler, Child, Teen, Adult)
  - [ ] Different styles (Sunday School, Stained Glass, etc.)
- [ ] For each image, verify:
  - [ ] Still pure black and white (no color)
  - [ ] Still no text or watermarks
  - [ ] Still no frames/borders (from Change 4)
  - [ ] Quality is acceptable (no obvious degradation)
- [ ] Check generation speed:
  - [ ] Should be noticeably faster (~20% improvement)
  - [ ] Monitor API response times

**Quality Monitoring:**
- [ ] Watch for any new issues:
  - [ ] Extra fingers/limbs appearing?
  - [ ] Modern elements slipping through?
  - [ ] Any other quality regressions?
- [ ] If issues appear, rollback immediately

---

### Rollback Plan for Change 5

If quality issues occur:

1. **Quick Rollback (1 line change):**
   - Change line ~253 back to: `NEGATIVE PROMPT: ${brief.negative_prompt}, ${GOLDEN_NEGATIVES}`
   - Keep CRITICAL_NEGATIVES import (unused is fine)

2. **Full Rollback (if needed):**
   - Remove `CRITICAL_NEGATIVES,` from imports
   - Change back to GOLDEN_NEGATIVES

**Rollback Time:** < 1 minute (single line change)

---

## Recommended Deployment Strategy

### Phase 1: Change 4 Only
1. Deploy Change 4 (LAYOUT_RULES)
2. Test thoroughly (generate 5-10 images)
3. Monitor for 24-48 hours
4. Verify frame/border issues are reduced

### Phase 2: Change 5 (If Phase 1 Successful)
1. Deploy Change 5 (CRITICAL_NEGATIVES)
2. Test immediately (generate 5-10 images)
3. Compare against Phase 1 baseline
4. Monitor closely for quality issues
5. Be ready to rollback if needed

### Phase 3: Monitor & Iterate
1. Collect metrics:
   - Frame occurrence rate
   - Generation speed
   - Quality scores
2. Compare V1 vs V2 performance
3. Adjust if needed

---

## Success Criteria

### Change 4 Success:
- ✅ No compilation errors
- ✅ Images generate successfully
- ✅ Frame/border occurrence reduced by >50%
- ✅ No new errors introduced

### Change 5 Success:
- ✅ No compilation errors
- ✅ Images generate successfully
- ✅ Generation speed improved by >15%
- ✅ Quality maintained (no regressions)
- ✅ No increase in color/text/watermark issues

---

## Emergency Contacts & Notes

**If Critical Issues Occur:**
1. Rollback immediately (single line change)
2. Document the issue
3. Revert to previous working state

**Code Locations:**
- Imports: `services/gemini.ts` lines 5-12
- Prompt: `services/gemini.ts` lines 245-254
- Constants: `constants.ts` lines 163-175

