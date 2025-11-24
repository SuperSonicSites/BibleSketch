
import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Check, Zap, Crown, Sparkles, HelpCircle, ArrowLeft } from 'lucide-react';
import { Button } from './ui/Button';

interface PricingPageProps {
  onBack: () => void;
  onSelectPlan: (planId: string, price: number, credits: number) => void;
}

export const PricingPage: React.FC<PricingPageProps> = ({ onBack, onSelectPlan }) => {
  
  const tiers = [
    {
      id: 'spark',
      name: 'The Spark',
      price: 4.99,
      credits: 20,
      costPerImage: 0.25,
      savings: null,
      audience: 'For a single lesson series',
      buttonVariant: 'outline' as const,
      buttonText: 'Get Spark Pack',
      icon: Sparkles,
      highlight: false
    },
    {
      id: 'torch',
      name: 'The Torch',
      price: 14.99,
      credits: 80,
      costPerImage: 0.19,
      savings: '25%',
      audience: 'For families & devotionals',
      buttonVariant: 'primary' as const,
      buttonText: 'Get Torch Pack',
      icon: Zap,
      highlight: true // The Hero Card
    },
    {
      id: 'beacon',
      name: 'The Beacon',
      price: 29.99,
      credits: 200,
      costPerImage: 0.15,
      savings: '40%',
      audience: 'For Ministry Directors',
      buttonVariant: 'secondary' as const,
      buttonText: 'Get Beacon Pack',
      icon: Crown,
      highlight: false
    }
  ];

  const faqs = [
    {
      q: "Do these credits expire?",
      a: "No! Your purchased credits never expire. You can buy a pack today and use it next year for Easter."
    },
    {
      q: "What happens if I don't like an image?",
      a: "AI isn't perfect. If a generation fails (e.g., distorted face), use the \"Report\" button, and we will refund that credit to your account."
    },
    {
      q: "Can I print these for my whole Sunday School class?",
      a: "Yes! Once you generate an image, you own the rights to print it as many times as you need for your class or ministry."
    },
    {
      q: "Why no subscription?",
      a: "We know church life is seasonal. We don't want to charge you for months when you aren't teaching. Pay only for what you use."
    }
  ];

  return (
    <>
      <Helmet>
        <title>Pricing - Affordable Bible Coloring Page Credits | Bible Sketch</title>
        <meta name="description" content="Get credits to create custom Bible coloring pages. No subscriptions - pay only for what you use. Perfect for Sunday School teachers, homeschool families, and church ministries. Plans start at $4.99." />
        <meta property="og:title" content="Pricing - Affordable Bible Coloring Page Credits | Bible Sketch" />
        <meta property="og:description" content="Get credits to create custom Bible coloring pages. No subscriptions - pay only for what you use. Perfect for Sunday School teachers, homeschool families, and church ministries." />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Pricing - Affordable Bible Coloring Page Credits | Bible Sketch" />
        <meta name="twitter:description" content="Get credits to create custom Bible coloring pages. No subscriptions - pay only for what you use." />
      </Helmet>

      <div className="max-w-7xl mx-auto px-4 py-12 md:py-20 animate-in fade-in duration-500">

        {/* Back Button */}
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-gray-500 hover:text-[#7C3AED] font-bold mb-8 transition-colors group"
      >
        <div className="p-2 bg-white rounded-full shadow-sm group-hover:shadow-md border border-gray-100 transition-all">
          <ArrowLeft className="w-5 h-5" />
        </div>
        <span>Back to Home</span>
      </button>

      {/* Header */}
      <div className="text-center mb-16 md:mb-24">
        <h1 className="font-display text-4xl md:text-5xl font-bold text-[#1F2937] mb-6">
          Simple, Flexible Pricing.
        </h1>
        <p className="text-lg md:text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
          No subscriptions. No expiring credits. <br className="hidden md:block" />
          Just buy what you need for your lesson or devotional.
        </p>
      </div>

      {/* Premium Plan - Featured */}
      <div className="w-full mb-16">
        <div className="relative bg-gradient-to-br from-purple-600 to-purple-800 rounded-3xl p-8 md:p-10 text-white shadow-2xl shadow-purple-300/50 border-4 border-purple-300">
          {/* Featured Badge */}
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#FCD34D] text-purple-900 text-xs font-bold uppercase tracking-widest py-2 px-5 rounded-full shadow-lg border-2 border-white whitespace-nowrap">
            Best Value
          </div>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            {/* Left Side - Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                  <Crown className="w-6 h-6 text-[#FCD34D]" />
                </div>
                <div>
                  <h3 className="font-display text-2xl md:text-3xl font-bold">Premium Plan</h3>
                  <p className="text-purple-200 text-sm">For dedicated teachers & ministries</p>
                </div>
              </div>

              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-4xl md:text-5xl font-bold">$9.99</span>
                <span className="text-purple-200 font-medium">/ one-time</span>
              </div>

              {/* Features */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <div className="p-0.5 bg-[#FCD34D] rounded-full">
                    <Check className="w-3 h-3 text-purple-900" strokeWidth={4} />
                  </div>
                  <span className="font-medium">Unlimited Downloads & Prints</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="p-0.5 bg-[#FCD34D] rounded-full">
                    <Check className="w-3 h-3 text-purple-900" strokeWidth={4} />
                  </div>
                  <span className="font-medium">15 Credits Included</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="p-0.5 bg-[#FCD34D] rounded-full">
                    <Check className="w-3 h-3 text-purple-900" strokeWidth={4} />
                  </div>
                  <span>High-Res PDF Download</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="p-0.5 bg-[#FCD34D] rounded-full">
                    <Check className="w-3 h-3 text-purple-900" strokeWidth={4} />
                  </div>
                  <span>No Watermark</span>
                </div>
              </div>
            </div>

            {/* Right Side - CTA */}
            <div className="md:text-right">
              <Button
                variant="outline"
                size="lg"
                className="w-full md:w-auto bg-white text-purple-700 hover:bg-purple-50 border-2 border-white font-bold shadow-lg"
                onClick={() => onSelectPlan('premium', 9.99, 15)}
              >
                Get Premium
              </Button>
              <p className="text-xs text-purple-200 mt-2">Never worry about limits again</p>
            </div>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-4 max-w-md mx-auto mb-12">
        <div className="flex-1 h-px bg-gray-200"></div>
        <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">Or Pay As You Go</span>
        <div className="flex-1 h-px bg-gray-200"></div>
      </div>

      {/* Credit Packs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12 mb-24 px-2 items-stretch">
        {tiers.map((tier) => (
          <div 
            key={tier.id}
            className={`
              relative bg-white rounded-3xl p-8 flex flex-col h-full
              transition-all duration-300
              ${tier.highlight 
                ? 'md:-mt-8 z-10 border-2 border-[#7C3AED] shadow-2xl shadow-purple-200/50 scale-100 md:scale-110' 
                : 'border border-gray-100 shadow-lg hover:shadow-xl'
              }
            `}
          >
            {/* Most Popular Badge */}
            {tier.highlight && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#FCD34D] text-[#7C3AED] text-xs font-bold uppercase tracking-widest py-2 px-4 rounded-full shadow-md border border-white whitespace-nowrap">
                Most Popular
              </div>
            )}

            {/* Header */}
            <div className="mb-6">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${tier.highlight ? 'bg-purple-100 text-[#7C3AED]' : 'bg-gray-50 text-gray-400'}`}>
                <tier.icon className="w-6 h-6" />
              </div>
              <h3 className="font-display text-2xl font-bold text-gray-800">{tier.name}</h3>
              <p className="text-sm text-gray-500 italic mt-1 min-h-[1.25rem]">{tier.audience}</p>
            </div>

            {/* Price */}
            <div className="mb-6">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-gray-900">${tier.price}</span>
                <span className="text-gray-400 font-medium">/ one-time</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-sm font-bold text-[#7C3AED] bg-purple-50 px-2 py-1 rounded-md">
                  {tier.credits} Images
                </span>
                <span className="text-xs text-gray-400">
                  (${tier.costPerImage.toFixed(2)} / image)
                </span>
              </div>
            </div>

            {/* Savings (Visible or Invisible Spacer) */}
            <div className={`mb-6 text-sm font-bold py-2 px-3 rounded-lg text-center ${tier.savings ? 'bg-green-50 text-green-700' : 'bg-transparent text-transparent select-none'}`}>
              {tier.savings ? `Save ${tier.savings} instantly` : 'Save 0% instantly'}
            </div>

            {/* Features */}
            <div className="space-y-4 mb-8 flex-1">
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <div className="p-0.5 bg-green-100 rounded-full">
                  <Check className="w-3 h-3 text-green-600" strokeWidth={4} />
                </div>
                <span>High-Res PDF Download</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <div className="p-0.5 bg-green-100 rounded-full">
                  <Check className="w-3 h-3 text-green-600" strokeWidth={4} />
                </div>
                <span>No Watermark</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <div className="p-0.5 bg-green-100 rounded-full">
                  <Check className="w-3 h-3 text-green-600" strokeWidth={4} />
                </div>
                <span>Private Mode</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <div className="p-0.5 bg-green-100 rounded-full">
                  <Check className="w-3 h-3 text-green-600" strokeWidth={4} />
                </div>
                <span>Commercial Rights</span>
              </div>
            </div>

            {/* Action */}
            <Button
              variant={tier.buttonVariant}
              size="lg"
              className="w-full mt-auto"
              onClick={() => onSelectPlan(tier.id, tier.price, tier.credits)}
            >
              {tier.buttonText}
            </Button>
          </div>
        ))}
      </div>

      {/* FAQ Section */}
      <div className="max-w-3xl mx-auto bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-purple-50">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <HelpCircle className="w-6 h-6 text-[#7C3AED]" />
          <h2 className="font-display text-2xl font-bold text-gray-800">Frequently Asked Questions</h2>
        </div>

        <div className="space-y-8">
          {faqs.map((faq, idx) => (
            <div key={idx} className="border-b border-gray-100 last:border-0 pb-6 last:pb-0">
              <h3 className="font-bold text-gray-900 mb-2">{faq.q}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Note */}
      <div className="text-center mt-12">
        <p className="text-sm text-gray-400">
          Payments are securely processed by Stripe. <br />
          Need help? Contact support@biblesketch.com
        </p>
      </div>

      </div>
    </>
  );
};
