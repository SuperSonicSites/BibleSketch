// What /checkout/<plan> sells. The createCheckout function (functions/index.js section 18) holds the Zoho plan codes
// and charges these same USD prices; change both together.
export interface CheckoutPlan {
  name: string;
  price: number;
  cadence: string; // after the price: "a month", "one time"
  note?: string;
  perks: string[];
}

const PRINTS = ['Print or download any page, as often as you like', 'Every page in the gallery, and every new one'];

export const CHECKOUT: Record<string, CheckoutPlan> = {
  premium: {
    name: 'Bible Sketch Premium', price: 4.99, cadence: 'a month',
    perks: ['Unlimited prints and downloads', '10 credits every month to make pages of your own', 'Cancel anytime'],
  },
  'prints-monthly': { name: 'Unlimited Prints', price: 1.99, cadence: 'a month', perks: [...PRINTS, 'Cancel anytime'] },
  'prints-yearly': {
    name: 'Unlimited Prints, yearly', price: 19.99, cadence: 'a year', note: 'That’s $1.67 a month',
    perks: [...PRINTS, 'Cancel anytime'],
  },
  spark: { name: 'The Spark', price: 4.99, cadence: 'one time', perks: ['20 credits to make pages of your own', '20 prints', 'Credits never expire'] },
  torch: { name: 'The Torch', price: 14.99, cadence: 'one time', perks: ['80 credits to make pages of your own', '80 prints', 'Credits never expire'] },
  beacon: { name: 'The Beacon', price: 29.99, cadence: 'one time', perks: ['200 credits to make pages of your own', '200 prints', 'Credits never expire'] },
};
