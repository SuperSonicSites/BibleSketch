// /pricing behaviour (bundle `fq` + checkout `D`, docs/bundle-map/pricing-billing.md §4, §6).
// The checkout URL must stay byte-compatible: the Zoho webhook reads the uid from `cf_cf_firebase_uid`.
import { $authReady, $profile, $user, requireAuth } from '../lib/store.ts';
import { CHECKOUT } from '../lib/checkout.ts';

declare const zaraz: {
  track: (name: string, payload: Record<string, unknown>) => void;
  ecommerce: (name: string, payload: Record<string, unknown>) => void;
} | undefined;

const ZOHO: Record<string, string> = {
  premium: 'https://billing.zohosecure.ca/subscribe/c4eda214b750306200eded5d860ee14ac337b81ca6421fdb875baa1a2a7b3c2f/bible-sketch-premium',
  spark: 'https://billing.zohosecure.ca/subscribe/c4eda214b750306200eded5d860ee14af89aa6dc60075c271e442233279cd445/Spark?addon_code%5B0%5D=20credits&addon_quantity%5B0%5D=20',
  torch: 'https://billing.zohosecure.ca/subscribe/c4eda214b750306200eded5d860ee14af01b06f31285bf8e05af38a9b0c1e6f3/Torch?addon_code%5B0%5D=80credits&addon_quantity%5B0%5D=80',
  beacon: 'https://billing.zohosecure.ca/subscribe/c4eda214b750306200eded5d860ee14a60094b8252300a63400de1ca08bc5eda/200credits?addon_code%5B0%5D=200credit&addon_quantity%5B0%5D=200',
};
const PRICE: Record<string, number> = { premium: 4.99, spark: 4.99, torch: 14.99, beacon: 29.99 };
const CREDITS: Record<string, number> = { spark: 20, torch: 80, beacon: 200 };
const productName = (id: string) => (id === 'premium' ? 'Premium Subscription' : `${id.charAt(0).toUpperCase()}${id.slice(1)} Credit Pack`);

function checkout(plan: string) {
  // Reads the user when it runs (after sign-in too), not when the button was clicked.
  const user = $user.get();
  if (!user) return;
  const base = ZOHO[plan];
  const qs = plan === 'premium' ? 'subscription=success' : `purchase=${plan}`;
  const url = `${base}${base.includes('?') ? '&' : '?'}cf_cf_firebase_uid=${encodeURIComponent(user.uid)}`
    + `&redirect_url=${encodeURIComponent(`${location.origin}/pricing?${qs}`)}`;
  if (typeof zaraz !== 'undefined') {
    const price = PRICE[plan];
    zaraz.ecommerce('Product Added', { value: price, currency: 'USD', products: [{ product_id: plan, name: productName(plan), price }] });
    zaraz.track('AddToCart', {
      value: price, currency: 'USD', content_name: productName(plan), em: user.email, external_id: user.uid,
      event_id: `addtocart_${user.uid}_${Date.now()}`,
    });
  }
  location.href = url;
}

document.querySelectorAll<HTMLButtonElement>('[data-plan]').forEach((b) =>
  b.addEventListener('click', () => requireAuth(() => checkout(b.dataset.plan!), 'signup')));

// Premium members: banner, and the premium button becomes "Current Plan" (packs stay available).
const member = document.getElementById('pricing-member')!;
const premiumButton = document.querySelector<HTMLButtonElement>('[data-plan="premium"]')!;
const caption = document.querySelector<HTMLElement>('[data-premium-caption]')!;
const success = document.getElementById('pricing-success')!;
$profile.subscribe((p) => {
  const premium = Boolean(p?.isPremium);
  member.hidden = !premium || !success.hidden;
  premiumButton.disabled = premium;
  premiumButton.textContent = premium ? 'Current Plan' : 'Get Premium';
  caption.textContent = premium ? 'Thank you for your support!' : 'Cancel anytime';
});

// Return from Zoho: banner + purchase events once, with the buyer's identity (the bundle fired before the
// session was restored, so em/external_id were empty), then drop the params without a new history entry.
const params = new URLSearchParams(location.search);
const pack = params.get('purchase');
const prints = pack === 'prints-monthly' || pack === 'prints-yearly';
const plan = params.get('subscription') === 'success' ? 'premium' : pack && (CREDITS[pack] || prints) ? pack : null;
if (plan) {
  const orderId = params.get('order_id');
  history.replaceState(null, '', location.pathname);
  success.querySelector('[data-title]')!.textContent = plan === 'premium' ? 'Welcome to Premium! 🎉' : prints ? 'Unlimited printing is on! 🎉' : 'Credits Added! 🎉';
  success.querySelector('[data-subtitle]')!.textContent = plan === 'premium'
    ? 'Your subscription is being activated. Features will unlock momentarily.'
    : prints ? 'Print or download any page, as often as you like. It unlocks in a moment.'
    : `${CREDITS[plan]} credits + ${CREDITS[plan]} bonus prints have been added to your account.`;
  success.hidden = false;
  member.hidden = true;
  setTimeout(() => {
    success.hidden = true;
    member.hidden = !$profile.get()?.isPremium;
  }, 8000);
  const unsubscribe = $authReady.subscribe((ready) => {
    if (!ready) return;
    queueMicrotask(() => unsubscribe());
    if (typeof zaraz === 'undefined') return;
    const user = $user.get();
    const price = CHECKOUT[plan].price;
    const order = orderId || `${plan === 'premium' ? 'premium' : `pack_${plan}`}_${Date.now()}`;
    zaraz.ecommerce('Order Completed', { value: price, currency: 'USD', order_id: order, products: [{ product_id: plan, name: CHECKOUT[plan].name, price }] });
    zaraz.track('Purchase', {
      value: price, currency: 'USD', order_id: order, em: user?.email, external_id: user?.uid,
      event_id: orderId || `purchase_${user?.uid}_${Date.now()}`,
    });
  });
}
