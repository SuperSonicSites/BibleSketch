
import React from 'react';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft } from 'lucide-react';

interface PrivacyPageProps {
  onBack: () => void;
}

export const PrivacyPage: React.FC<PrivacyPageProps> = ({ onBack }) => {
  return (
    <>
      <Helmet>
        <title>Privacy Policy - Bible Sketch</title>
        <meta name="description" content="Read the Privacy Policy for Bible Sketch. Learn how we collect, use, and protect your data when using our Bible coloring page generation service." />
        <meta property="og:title" content="Privacy Policy - Bible Sketch" />
        <meta property="og:description" content="Read the Privacy Policy for Bible Sketch." />
        <meta property="og:type" content="website" />
        <meta name="robots" content="noindex, follow" />
      </Helmet>

      <div className="max-w-4xl mx-auto px-4 py-12 animate-in fade-in duration-500">
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-gray-500 hover:text-[#7C3AED] font-bold mb-8 transition-colors group"
      >
        <div className="p-2 bg-white rounded-full shadow-sm group-hover:shadow-md border border-gray-100 transition-all">
          <ArrowLeft className="w-5 h-5" />
        </div>
        <span>Back to Home</span>
      </button>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-8 md:p-12">
        <h1 className="font-display text-3xl md:text-4xl font-bold text-[#1F2937] mb-2">
          🔒 Bible Sketch: Privacy Policy
        </h1>
        <p className="text-gray-500 mb-8 font-medium">Last Updated: November 26, 2025</p>

        <div className="prose prose-purple max-w-none text-gray-600 space-y-8 leading-relaxed">
          <p>
            Welcome to <strong>Bible Sketch</strong> ("we," "our," or "us"). This Privacy Policy explains how we collect,
            use, disclose, and safeguard your information when you use our website and services. Please read
            this privacy policy carefully. By using Bible Sketch, you consent to the data practices described
            in this policy.
          </p>

          <hr className="border-gray-100" />

          <section>
            <h2 className="font-display text-2xl font-bold text-[#1F2937] mb-4">1. Information We Collect</h2>
            
            <h3 className="font-bold text-gray-800 text-lg mb-2">1.1. Personal Information</h3>
            <p className="mb-4">
              When you create an account or make a purchase, we may collect:
            </p>
            <ul className="list-disc pl-5 space-y-1 mb-4">
              <li><strong>Account Information:</strong> Email address, display name, and profile picture (if provided via Google Sign-In).</li>
              <li><strong>Payment Information:</strong> When you purchase credits, your payment is processed by our third-party payment processor, Zoho Billing. We do not store your full credit card number or payment credentials on our servers.</li>
              <li><strong>Generated Content:</strong> The images you create and any prompts or settings you use.</li>
            </ul>

            <h3 className="font-bold text-gray-800 text-lg mb-2">1.2. Automatically Collected Information</h3>
            <p className="mb-2">
              When you access Bible Sketch, we automatically collect certain information, including:
            </p>
            <ul className="list-disc pl-5 space-y-1 mb-4">
              <li><strong>Device Information:</strong> Browser type, operating system, device type, and screen resolution.</li>
              <li><strong>Usage Data:</strong> Pages visited, features used, time spent on pages, and interaction patterns.</li>
              <li><strong>IP Address:</strong> Your approximate geographic location based on IP address.</li>
              <li><strong>Cookies and Tracking Technologies:</strong> See Section 3 for details.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold text-[#1F2937] mb-4">2. How We Use Your Information</h2>
            <p className="mb-2">We use the information we collect to:</p>
            <ul className="list-disc pl-5 space-y-1 mb-4">
              <li>Provide, operate, and maintain our services.</li>
              <li>Process transactions and send related information (purchase confirmations, credit updates).</li>
              <li>Send you technical notices, security alerts, and support messages.</li>
              <li>Respond to your comments, questions, and customer service requests.</li>
              <li>Monitor and analyze usage trends to improve user experience.</li>
              <li>Detect, prevent, and address technical issues, fraud, or abuse.</li>
              <li>Deliver targeted advertising and measure ad effectiveness.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold text-[#1F2937] mb-4">3. Cookies and Tracking Technologies</h2>
            <p className="mb-4">
              We use cookies and similar tracking technologies to collect and track information about your
              activity on our service. This helps us understand how you use Bible Sketch and allows us to
              improve our services and deliver relevant advertising.
            </p>

            <h3 className="font-bold text-gray-800 text-lg mb-2">3.1. Google Analytics 4 (GA4)</h3>
            <p className="mb-4">
              We use Google Analytics 4 to analyze website traffic and user behavior. GA4 collects information
              such as how often you visit, which pages you view, and what other sites you visited before coming
              to Bible Sketch. Google may use this data to contextualize and personalize ads in its advertising
              network. You can opt out of Google Analytics by installing the{' '}
              <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer" className="text-[#7C3AED] hover:underline">
                Google Analytics Opt-out Browser Add-on
              </a>.
            </p>

            <h3 className="font-bold text-gray-800 text-lg mb-2">3.2. Facebook Pixel</h3>
            <p className="mb-4">
              We use the Facebook Pixel to measure the effectiveness of our advertising on Facebook and
              Instagram, and to deliver targeted ads to you on those platforms. The Facebook Pixel collects
              information about your activity on Bible Sketch, which Facebook may associate with your Facebook
              account. You can manage your ad preferences in your{' '}
              <a href="https://www.facebook.com/settings/?tab=ads" target="_blank" rel="noopener noreferrer" className="text-[#7C3AED] hover:underline">
                Facebook Ad Settings
              </a>.
            </p>

            <h3 className="font-bold text-gray-800 text-lg mb-2">3.3. Pinterest Tag</h3>
            <p className="mb-4">
              We use the Pinterest Tag to measure conversions from Pinterest ads and to build audiences for
              future advertising. The Pinterest Tag collects information about your activity on Bible Sketch.
              You can opt out of interest-based advertising from Pinterest by adjusting your{' '}
              <a href="https://www.pinterest.com/settings/privacy" target="_blank" rel="noopener noreferrer" className="text-[#7C3AED] hover:underline">
                Pinterest Privacy Settings
              </a>.
            </p>

            <h3 className="font-bold text-gray-800 text-lg mb-2">3.4. Managing Cookies</h3>
            <p>
              Most web browsers allow you to control cookies through their settings. You can set your browser
              to refuse all cookies or to indicate when a cookie is being sent. However, if you disable cookies,
              some features of Bible Sketch may not function properly.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold text-[#1F2937] mb-4">4. Payment Processing</h2>
            <p className="mb-4">
              All payment transactions are processed through <strong>Zoho Billing</strong>, a third-party payment processor.
              When you make a purchase:
            </p>
            <ul className="list-disc pl-5 space-y-1 mb-4">
              <li>Your payment information is collected and processed directly by Zoho Billing.</li>
              <li>We receive only limited information (such as the last four digits of your card, transaction ID, and payment status) necessary to fulfill your order.</li>
              <li>Zoho Billing's use of your personal information is governed by their own{' '}
                <a href="https://www.zoho.com/privacy.html" target="_blank" rel="noopener noreferrer" className="text-[#7C3AED] hover:underline">
                  Privacy Policy
                </a>.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold text-[#1F2937] mb-4">5. Data Sharing and Disclosure</h2>
            <p className="mb-2">We may share your information in the following circumstances:</p>
            <ul className="list-disc pl-5 space-y-1 mb-4">
              <li><strong>Service Providers:</strong> We share data with third-party vendors who perform services on our behalf (payment processing, analytics, advertising).</li>
              <li><strong>Legal Requirements:</strong> We may disclose information if required by law or in response to valid legal requests.</li>
              <li><strong>Business Transfers:</strong> If Bible Sketch is involved in a merger, acquisition, or sale of assets, your information may be transferred as part of that transaction.</li>
              <li><strong>With Your Consent:</strong> We may share information for other purposes with your explicit consent.</li>
            </ul>
            <p>
              We do <strong>not</strong> sell your personal information to third parties.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold text-[#1F2937] mb-4">6. Data Security</h2>
            <p>
              We implement appropriate technical and organizational measures to protect your personal information
              against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission
              over the Internet or electronic storage is 100% secure. While we strive to protect your data, we
              cannot guarantee its absolute security.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold text-[#1F2937] mb-4">7. Your Rights and Choices</h2>
            <p className="mb-4">Depending on your location, you may have certain rights regarding your personal information:</p>
            
            <h3 className="font-bold text-gray-800 text-lg mb-2">7.1. Access and Portability</h3>
            <p className="mb-4">
              You can request a copy of the personal information we hold about you.
            </p>

            <h3 className="font-bold text-gray-800 text-lg mb-2">7.2. Correction</h3>
            <p className="mb-4">
              You can update your account information directly through your profile settings.
            </p>

            <h3 className="font-bold text-gray-800 text-lg mb-2">7.3. Deletion</h3>
            <p className="mb-4">
              You can request deletion of your account and associated data. Note that some information may be
              retained for legal or legitimate business purposes.
            </p>

            <h3 className="font-bold text-gray-800 text-lg mb-2">7.4. Opt-Out of Marketing</h3>
            <p className="mb-4">
              You can opt out of receiving promotional emails by following the unsubscribe instructions in those
              emails. You may still receive transactional communications (such as purchase confirmations).
            </p>

            <h3 className="font-bold text-gray-800 text-lg mb-2">7.5. Opt-Out of Tracking</h3>
            <p>
              You can opt out of tracking by adjusting your browser settings, using browser extensions, or
              adjusting your preferences in the third-party platforms mentioned in Section 3.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold text-[#1F2937] mb-4">8. Data Retention</h2>
            <p>
              We retain your personal information for as long as your account is active or as needed to provide
              you services. We may also retain and use your information to comply with legal obligations, resolve
              disputes, and enforce our agreements. Generated images in your account are retained until you delete
              them or close your account.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold text-[#1F2937] mb-4">9. Children's Privacy</h2>
            <p>
              Bible Sketch is not intended for children under the age of 13. We do not knowingly collect personal
              information from children under 13. If you are a parent or guardian and believe your child has
              provided us with personal information, please contact us immediately at{' '}
              <a href="mailto:hello@biblesketch.app" className="text-[#7C3AED] hover:underline">
                hello@biblesketch.app
              </a>{' '}
              so we can delete the information.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold text-[#1F2937] mb-4">10. International Data Transfers</h2>
            <p>
              Your information may be transferred to and processed in countries other than your own. These
              countries may have different data protection laws. By using Bible Sketch, you consent to the
              transfer of your information to countries outside your country of residence, including the
              United States.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold text-[#1F2937] mb-4">11. Changes to This Privacy Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting
              the new Privacy Policy on this page and updating the "Last Updated" date. You are advised to review
              this Privacy Policy periodically for any changes. Your continued use of Bible Sketch after any
              modifications indicates your acceptance of the updated Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold text-[#1F2937] mb-4">12. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy or our data practices, please contact us at:<br/>
              <a href="mailto:hello@biblesketch.app" className="text-[#7C3AED] hover:underline font-bold">
                hello@biblesketch.app
              </a>
            </p>
          </section>
        </div>
      </div>
      </div>
    </>
  );
};

