# Technical Implementation: Zoho Billing Subscription Flow

## Context & Goal

**Context:** We are integrating Zoho Billing to handle "Bible Sketch Premium" subscriptions ($4.99/mo USD). Our Zoho organization uses a CAD base currency with a USD Price List for fixed customer pricing.

**Goal:** Attribute every payment in Zoho to a specific **Firebase User ID (UID)** so we can automatically provision premium access and credits in Firestore.

**Architecture:**
- Frontend: React + TypeScript (Vite)
- Backend: Firebase Cloud Functions (Gen 2)
- Database: Firestore
- Auth: Firebase Authentication

---

## Zoho Configuration (Verified)

| Setting | Value |
|---------|-------|
| **Custom Field Label** | `firebase_uid` |
| **Custom Field API Name** | `cf_cf_firebase_uid` |
| **Custom Field Location** | Customer Profile |
| **Webhook Security** | Enabled with secret key |
| **Webhook Signature Header** | `X-Zoho-Webhook-Signature` |
| **Webhook Content-Type** | `application/json;charset=UTF-8` |
| **URL Parameter for UID** | `cf_cf_firebase_uid` |

---

## 1. Firestore Schema Updates

### User Document Extension

Add these fields to the existing user document:

| Field | Type | Description |
|-------|------|-------------|
| `isPremium` | boolean | ✅ Already exists - gates premium features |
| `credits` | number | ✅ Already exists - generation credits |
| `planStatus` | string | **NEW** - `'active'` \| `'canceled'` \| `'expired'` \| `'pending_cancel'` |
| `zohoSubscriptionId` | string | **NEW** - For customer support lookups |
| `zohoCustomerId` | string | **NEW** - Links to Zoho customer record |
| `subscriptionStartDate` | timestamp | **NEW** - When subscription began |
| `lastRenewal` | timestamp | **NEW** - Last successful renewal date |

### New Collection: `processedWebhooks`

For idempotency - prevents duplicate credit grants on webhook retries.

```
/processedWebhooks/{eventId}
  - processedAt: Timestamp
  - eventType: string
  - userId: string
  - subscriptionId: string
```

---

## 2. Frontend Implementation

### A. Update `App.tsx` - Plan Selection Handler

Replace the mock `handlePlanSelection` function:

```typescript
// App.tsx - inside AppContent function

const handlePlanSelection = (planId: string, price: number, credits: number) => {
  requireAuth(() => {
    if (!user) {
      console.error("No authenticated user");
      return;
    }

    // Zoho Hosted Payment Page URLs
    const ZOHO_PLAN_URLS: Record<string, string> = {
      'premium': 'https://billing.zohosecure.ca/subscribe/YOUR_PLAN_ID/bible-sketch-premium',
    };

    const planUrl = ZOHO_PLAN_URLS[planId];

    if (!planUrl) {
      // For one-time credit packs (future implementation)
      console.log(`Credit pack purchase: ${planId} (${credits} credits for $${price})`);
      alert(`Credit pack checkout coming soon!`);
      return;
    }

    // Build Zoho Hosted Payment Page URL
    // cf_cf_firebase_uid is the API Field Name for the Customer custom field
    const SUCCESS_REDIRECT = encodeURIComponent(`${window.location.origin}/pricing?subscription=success`);
    const checkoutUrl = `${planUrl}?cf_cf_firebase_uid=${encodeURIComponent(user.uid)}&redirect_url=${SUCCESS_REDIRECT}`;

    // Redirect to Zoho Checkout
    window.location.href = checkoutUrl;

  }, 'signup');
};
```

### B. Update `components/PricingPage.tsx`

Add success state handling and premium user detection:

```typescript
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Check, Zap, Crown, Sparkles, HelpCircle, ArrowLeft, PartyPopper } from 'lucide-react';
import { Button } from './ui/Button';

interface PricingPageProps {
  onBack: () => void;
  onSelectPlan: (planId: string, price: number, credits: number) => void;
  isPremium?: boolean;
}

export const PricingPage: React.FC<PricingPageProps> = ({ onBack, onSelectPlan, isPremium = false }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showSuccess, setShowSuccess] = useState(false);

  // Handle return from Zoho checkout
  useEffect(() => {
    if (searchParams.get('subscription') === 'success') {
      setShowSuccess(true);
      setSearchParams({});
      const timer = setTimeout(() => setShowSuccess(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [searchParams, setSearchParams]);

  // Success Banner (render after checkout return)
  {showSuccess && (
    <div className="mb-8 bg-green-50 border border-green-200 rounded-2xl p-6 flex items-center gap-4">
      <PartyPopper className="w-6 h-6 text-green-600" />
      <div>
        <h3 className="font-bold text-green-800">Welcome to Premium!</h3>
        <p className="text-green-600 text-sm">Your subscription is being activated.</p>
      </div>
    </div>
  )}

  // Already Premium Banner (render for existing subscribers)
  {isPremium && !showSuccess && (
    <div className="mb-8 bg-purple-50 border border-purple-200 rounded-2xl p-6">
      <Crown className="w-6 h-6 text-purple-600" />
      <span>You're a Premium Member!</span>
      <a href="https://billing.zohosecure.ca/portal/biblesketch/login" target="_blank">
        Manage Subscription
      </a>
    </div>
  )}

  // Update Premium button - $4.99/mo for 10 credits
  <Button onClick={() => onSelectPlan('premium', 4.99, 10)} disabled={isPremium}>
    {isPremium ? 'Current Plan' : 'Get Premium'}
  </Button>
};
```

### C. Update `components/PremiumModal.tsx`

Change the CTA to navigate to pricing page:

```typescript
<Button
  variant="primary"
  className="w-full h-12 gap-2 shadow-lg shadow-purple-100"
  onClick={() => window.location.href = '/pricing'}
>
  <Crown className="w-5 h-5" />
  View Premium Options
</Button>
```

### D. Update `components/ProfileModal.tsx`

Add subscription management for premium users:

```typescript
// Add after profile edit section
{userData?.isPremium && (
  <div className="mt-6 pt-6 border-t border-gray-100">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Crown className="w-5 h-5 text-purple-600" />
        <span className="font-medium text-gray-800">Premium Member</span>
      </div>
      <a
        href="https://billing.zohosecure.ca/portal/biblesketch/login"
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-purple-600 hover:text-purple-800 font-medium"
      >
        Manage Billing →
      </a>
    </div>
    {userData.planStatus === 'pending_cancel' && (
      <p className="text-xs text-amber-600 mt-2">
        Your subscription is canceled but remains active until the billing period ends.
      </p>
    )}
  </div>
)}
```

---

## 3. Backend Implementation

### Add to `functions/index.js`

```javascript
// ============================================================
// ZOHO BILLING WEBHOOK HANDLER
// ============================================================

const crypto = require('crypto');

// Define the Zoho webhook secret (set via: firebase functions:secrets:set ZOHO_WEBHOOK_SECRET)
const zohoWebhookSecret = defineSecret("ZOHO_WEBHOOK_SECRET");

/**
 * Verifies the Zoho webhook signature using HMAC.
 * Zoho sends signature in X-Zoho-Webhook-Signature header.
 */
const verifyZohoSignature = (req, secret) => {
  const signature = req.headers['x-zoho-webhook-signature'];
  if (!signature) {
    console.warn('No X-Zoho-Webhook-Signature header found');
    return false;
  }

  const payload = JSON.stringify(req.body);
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  // Use timing-safe comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
};

/**
 * Extracts Firebase UID from Zoho customer custom fields.
 * Custom field is stored on Customer profile with label "firebase_uid".
 * 
 * Payload structure:
 * {
 *   "subscription": {
 *     "subscription_id": "...",
 *     "customer": {
 *       "customer_id": "...",
 *       "custom_fields": [
 *         { "label": "firebase_uid", "value": "USER_UID", "data_type": "text" }
 *       ]
 *     }
 *   }
 * }
 */
const extractFirebaseUid = (body) => {
  const customFields = body.subscription?.customer?.custom_fields || [];
  const uidField = customFields.find(f => f.label === 'firebase_uid');
  return uidField?.value || null;
};

/**
 * Handles Zoho Billing webhooks for subscription lifecycle events.
 *
 * Configure these events in Zoho Billing → Settings → Automation → Workflow Actions:
 * - New Subscription
 * - Subscription Renewal
 * - Cancel Subscription
 * - Subscription Expired
 * - Subscription Cancellation Scheduled (optional)
 */
exports.handleZohoWebhook = onRequest({
  secrets: [zohoWebhookSecret],
  cors: false,
  memory: "256MiB",
  timeoutSeconds: 60
}, async (req, res) => {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    // 1. Verify Webhook Signature
    if (!verifyZohoSignature(req, zohoWebhookSecret.value())) {
      console.error('❌ Invalid webhook signature - possible spoofing attempt');
      return res.status(401).send('Unauthorized: Invalid signature');
    }

    // 2. Extract subscription data
    const subscription = req.body.subscription;
    if (!subscription) {
      console.warn('⚠️ No subscription data in webhook payload');
      return res.status(200).send('Ignored: No subscription data');
    }

    const subscriptionId = subscription.subscription_id;
    const subscriptionStatus = subscription.status; // active, cancelled, expired, etc.
    
    console.log(`📩 Received Zoho webhook`);
    console.log(`   Subscription ID: ${subscriptionId}`);
    console.log(`   Status: ${subscriptionStatus}`);

    // 3. Extract Firebase UID from Customer custom fields
    const firebaseUid = extractFirebaseUid(req.body);

    if (!firebaseUid) {
      console.warn('⚠️ Webhook received without Firebase UID in customer custom fields');
      console.warn('   Customer data:', JSON.stringify(subscription.customer || {}));
      return res.status(200).send('Ignored: No Firebase UID found');
    }

    console.log(`   Firebase UID: ${firebaseUid}`);

    // 4. Idempotency Check
    const eventId = `${subscriptionStatus}_${subscriptionId}`;
    const processedRef = admin.firestore().collection('processedWebhooks').doc(eventId);

    const existingEvent = await processedRef.get();
    if (existingEvent.exists) {
      console.log(`⏭️ Webhook ${eventId} already processed. Skipping.`);
      return res.status(200).send('Already processed');
    }

    // 5. Get User Reference
    const db = admin.firestore();
    const userRef = db.collection('users').doc(firebaseUid);

    // 6. Handle based on subscription status
    if (subscriptionStatus === 'live' || subscriptionStatus === 'active') {
      // New subscription or renewal
      const userDoc = await userRef.get();
      const isNewSubscription = !userDoc.exists || !userDoc.data()?.isPremium;

      await userRef.set({
        isPremium: true,
        credits: admin.firestore.FieldValue.increment(10),
        planStatus: 'active',
        zohoSubscriptionId: subscriptionId,
        zohoCustomerId: subscription.customer?.customer_id || null,
        ...(isNewSubscription && { subscriptionStartDate: admin.firestore.FieldValue.serverTimestamp() }),
        ...(!isNewSubscription && { lastRenewal: admin.firestore.FieldValue.serverTimestamp() }),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      const action = isNewSubscription ? 'Premium subscription activated' : 'Monthly subscription renewal';
      await logSubscriptionTransaction(db, firebaseUid, 10, action);
      console.log(`✅ ${action} for user: ${firebaseUid}`);

    } else if (subscriptionStatus === 'cancelled' || subscriptionStatus === 'canceled') {
      // Subscription cancelled
      await userRef.update({
        isPremium: false,
        planStatus: 'canceled',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log(`❌ Premium DEACTIVATED for user: ${firebaseUid}`);

    } else if (subscriptionStatus === 'expired') {
      // Subscription expired
      await userRef.update({
        isPremium: false,
        planStatus: 'expired',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log(`❌ Premium EXPIRED for user: ${firebaseUid}`);

    } else if (subscriptionStatus === 'non_renewing') {
      // User cancelled but subscription still active until period ends
      await userRef.update({
        planStatus: 'pending_cancel',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log(`⏳ Cancellation SCHEDULED for user: ${firebaseUid}`);

    } else {
      console.log(`ℹ️ Unhandled subscription status: ${subscriptionStatus}`);
    }

    // 7. Mark as Processed
    await processedRef.set({
      processedAt: admin.firestore.FieldValue.serverTimestamp(),
      status: subscriptionStatus,
      userId: firebaseUid,
      subscriptionId: subscriptionId
    });

    res.status(200).send('Webhook processed successfully');

  } catch (error) {
    console.error('🔥 Error processing Zoho webhook:', error);
    res.status(500).send('Internal Server Error');
  }
});

/**
 * Helper: Log transaction to user's subcollection
 */
async function logSubscriptionTransaction(db, userId, amount, description) {
  try {
    const txRef = db.collection('users').doc(userId).collection('transactions').doc();
    await txRef.set({
      id: txRef.id,
      userId: userId,
      amount: amount,
      description: description,
      type: 'subscription',
      timestamp: Date.now(),
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
  } catch (error) {
    console.error('Failed to log transaction:', error);
  }
}
```

---

## 4. Firestore Security Rules

Add rule for the `processedWebhooks` collection:

```javascript
// firestore.rules - add inside match /databases/{database}/documents

// Processed Webhooks: Admin SDK only (Cloud Functions bypass rules)
match /processedWebhooks/{eventId} {
  allow read, write: if false;
}
```

---

## 5. Zoho Billing Configuration

### Step 1: Create Customer Custom Field

1. Go to **Settings → Preferences → Customers → Custom Fields**
2. Create field:
   - **Label**: `firebase_uid`
   - **Data Type**: Text
   - **Show in portal**: No (internal use only)

### Step 2: Create Webhook Actions

For each event, create a separate Workflow Action:

1. Go to **Settings → Automation → Workflow Actions**
2. Click **+ New Workflow Action** → **Webhook**

#### Webhook 1: New Subscription

| Setting | Value |
|---------|-------|
| **Name** | `Firebase_NewSubscription` |
| **Module** | Subscriptions |
| **Event** | New Subscription |
| **URL** | `https://us-central1-biblesketch-5104c.cloudfunctions.net/handleZohoWebhook` |
| **Method** | POST |
| **Secure webhook** | ✅ Checked |
| **Secret** | (Your secret - save this for Firebase) |
| **Body** | Default Payload |

#### Webhook 2: Subscription Renewal

Same settings, but:
- **Name**: `Firebase_Renewal`
- **Event**: Subscription Renewal

#### Webhook 3: Cancel Subscription

Same settings, but:
- **Name**: `Firebase_Cancel`
- **Event**: Cancel Subscription

#### Webhook 4: Subscription Expired

Same settings, but:
- **Name**: `Firebase_Expired`
- **Event**: Subscription Expired

#### Webhook 5: Cancellation Scheduled (Optional)

Same settings, but:
- **Name**: `Firebase_CancelScheduled`
- **Event**: Subscription Cancellation Scheduled

### Step 3: Use Same Secret for All Webhooks

Use the **same secret key** for all webhooks so the Firebase function only needs one secret.

---

## 6. Deployment

### Step 1: Set the Webhook Secret

```bash
firebase functions:secrets:set ZOHO_WEBHOOK_SECRET
# Paste the exact secret you entered in Zoho webhook configuration
```

### Step 2: Deploy Function

```bash
firebase deploy --only functions:handleZohoWebhook
```

### Step 3: Get Function URL

Copy from deployment output:
```
https://us-central1-biblesketch-5104c.cloudfunctions.net/handleZohoWebhook
```

### Step 4: Update Zoho Webhooks

Paste the Firebase Function URL into each webhook configuration in Zoho.

### Step 5: Deploy Frontend & Rules

```bash
npm run build
firebase deploy --only hosting,firestore:rules
```

---

## 7. Testing Checklist

### Subscription Activation
- [ ] User redirected to Zoho with `cf_firebase_uid` in URL
- [ ] Customer created in Zoho with `firebase_uid` custom field populated
- [ ] After payment, webhook fires to Firebase
- [ ] `isPremium: true` set in Firestore
- [ ] `credits` incremented by 10
- [ ] `planStatus: 'active'`
- [ ] Transaction logged in subcollection
- [ ] Success banner shows on return to `/pricing`

### Premium Features
- [ ] Unlimited downloads work (`downloads.ts` checks `isPremium`)
- [ ] Watermark removed
- [ ] Private mode available

### Renewal
- [ ] Monthly webhook triggers credit increment (+10)
- [ ] `lastRenewal` timestamp updated
- [ ] `isPremium` remains true

### Cancellation
- [ ] `planStatus` changes to `'pending_cancel'` (if still in billing period)
- [ ] Warning shows in ProfileModal
- [ ] After period ends: `isPremium: false`, `planStatus: 'canceled'`

### Security
- [ ] Invalid/missing signature returns 401
- [ ] Duplicate webhooks are ignored (idempotency)
- [ ] Missing UID webhooks are logged and return 200

---

## 8. Monitoring

### View Logs

```bash
firebase functions:log --only handleZohoWebhook
```

### Key Log Messages

| Log | Meaning |
|-----|---------|
| `✅ Premium subscription activated` | New subscription successful |
| `✅ Monthly subscription renewal` | Renewal processed |
| `❌ Premium DEACTIVATED` | Subscription canceled |
| `❌ Premium EXPIRED` | Subscription expired |
| `⏳ Cancellation SCHEDULED` | User canceled, period not over |
| `⏭️ Already processed` | Idempotency working |
| `⚠️ No Firebase UID` | Custom field not populated |
| `❌ Invalid signature` | Security alert |

---

## 9. Troubleshooting

### User didn't get premium after payment

1. Check Cloud Function logs for errors
2. Verify `firebase_uid` custom field exists on Customer in Zoho
3. Verify webhook fired (Zoho → Settings → Automation → Workflow Logs)
4. Check `processedWebhooks` collection for the event
5. Manually set `isPremium: true` in Firestore if needed

### Webhook signature validation failing

1. Verify secret matches exactly between Zoho and Firebase
2. Check for leading/trailing whitespace in secret value
3. Verify Content-Type is `application/json`

### Firebase UID not found in webhook

1. Check that hosted payment page URL includes `?cf_firebase_uid=XXX`
2. Verify Customer was created with the custom field populated
3. Check Zoho Customer record for the `firebase_uid` field

### Credits not incrementing

1. Check if webhook was already processed (idempotency)
2. Verify user document exists in Firestore
3. Check for Firestore write errors in logs

---

## 10. Rollback Plan

```bash
# Remove webhook handler
firebase functions:delete handleZohoWebhook

# Disable webhooks in Zoho
# Settings → Automation → Workflow Actions → Disable each webhook

# Manually fix affected users via Firebase Console
# Firestore → users → {uid} → Edit: isPremium, credits, planStatus
```
