// GET /checkout/done?plan=<plan>: where Zoho sends the buyer after paying, which is inside the checkout's iframe.
// It moves the whole tab to the pricing page's thank-you banner, which also sends the purchase events.
import type { APIRoute } from 'astro';
import { CHECKOUT } from '../../lib/checkout.ts';

export const GET: APIRoute = ({ url, cache }) => {
  cache.set(false);
  const plan = url.searchParams.get('plan') ?? '';
  const order = url.searchParams.get('hostedpage_id');
  let to = plan === 'premium' ? '/pricing?subscription=success' : Object.hasOwn(CHECKOUT, plan) ? `/pricing?purchase=${plan}` : '/pricing';
  if (order && to.includes('?')) to += `&order_id=${encodeURIComponent(order)}`;
  return new Response(
    '<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex"><title>Thank you - Bible Sketch</title>'
      + '<p style="font-family:system-ui,sans-serif;text-align:center;margin-top:3rem">Payment received. Taking you back to Bible Sketch...</p>'
      + `<script>(window.top || window).location.replace(${JSON.stringify(to)})</script>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } },
  );
};
