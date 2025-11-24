
import React from 'react';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft } from 'lucide-react';

interface TermsPageProps {
  onBack: () => void;
}

export const TermsPage: React.FC<TermsPageProps> = ({ onBack }) => {
  return (
    <>
      <Helmet>
        <title>Terms of Service - Bible Sketch</title>
        <meta name="description" content="Read the Terms of Service for Bible Sketch. Learn about our policies for creating and using Bible coloring pages, credits, subscriptions, and AI-generated content." />
        <meta property="og:title" content="Terms of Service - Bible Sketch" />
        <meta property="og:description" content="Read the Terms of Service for Bible Sketch." />
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
          ⚖️ Bible Sketch: Terms of Service
        </h1>
        <p className="text-gray-500 mb-8 font-medium">Last Updated: November 19, 2025</p>

        <div className="prose prose-purple max-w-none text-gray-600 space-y-8 leading-relaxed">
          <p>
            Welcome to <strong>Bible Sketch</strong> ("we," "our," or "us"). By creating an account, purchasing credits, or
            using our AI generation services, you agree to these legally binding Terms of Service. Please
            read them carefully.
          </p>

          <hr className="border-gray-100" />

          <section>
            <h2 className="font-display text-2xl font-bold text-[#1F2937] mb-4">1. Scope of Service</h2>
            <p className="mb-4">
              By using Bible Sketch, you agree that you are at least 18 years old (or a parent/guardian
              consenting on behalf of a minor).
            </p>
            
            <h3 className="font-bold text-gray-800 text-lg mb-2">1.1. Defined Artistic Scope</h3>
            <p className="mb-2">
              Bible Sketch is a specialized tool designed <strong>exclusively</strong> for generating coloring pages in three
              specific artistic styles:
            </p>
            <ul className="list-disc pl-5 space-y-1 mb-4">
              <li><strong>Sunday School</strong> (Cartoon/Line Art)</li>
              <li><strong>Stained Glass</strong> (Geometric/Mosaic)</li>
              <li><strong>Iconography</strong> (Byzantine/Orthodox)</li>
            </ul>
            <p>
              Any attempt to force the service to generate photorealistic imagery, modern art styles,
              non-biblical content, or content outside these parameters is a violation of these terms and is not
              supported.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold text-[#1F2937] mb-4">2. Intellectual Property & Rights</h2>
            
            <h3 className="font-bold text-gray-800 text-lg mb-2">2.1. User Ownership</h3>
            <p className="mb-4">
              As between you and Bible Sketch, <strong>you own the images you generate</strong> on the platform. We
              assign to you all rights, title, and interest in the assets you create, subject to your compliance
              with these Terms. You are free to print, sell, or distribute your generated images commercially.
            </p>

            <h3 className="font-bold text-gray-800 text-lg mb-2">2.2. License Grant to Bible Sketch</h3>
            <p className="mb-2">
              By generating content on Bible Sketch, you grant us a <strong>perpetual, worldwide, non-exclusive,
              royalty-free, sublicensable, and transferable license</strong> to use, reproduce, modify, display, and
              distribute your generated images. We require this license to:
            </p>
            <ul className="list-disc pl-5 space-y-1 mb-4">
              <li>Operate the service (rendering and storing images).</li>
              <li>Market the platform (showcasing examples).</li>
              <li>Improve our AI models and safety filters.</li>
            </ul>

            <h3 className="font-bold text-gray-800 text-lg mb-2">2.3. Public Gallery License</h3>
            <p>
              If you voluntarily choose to set an image to <strong>"Public"</strong> or share it to the Community Gallery,
              you grant other Bible Sketch users a non-exclusive license to view, download, print, and
              "Remix" (create variations of) that content.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold text-[#1F2937] mb-4">3. Payment Terms</h2>
            
            <h3 className="font-bold text-gray-800 text-lg mb-2">3.1. Credit System</h3>
            <p className="mb-2">Bible Sketch operates on a pre-paid credit basis.</p>
            <ul className="list-disc pl-5 space-y-1 mb-4">
              <li><strong>No Expiration:</strong> Purchased credits do not expire.</li>
              <li><strong>Final Sale:</strong> All credit purchases are final and non-refundable. Credits have no monetary value outside of the Bible Sketch platform and cannot be exchanged for cash.</li>
            </ul>

            <h3 className="font-bold text-gray-800 text-lg mb-2">3.2. Quality Disputes</h3>
            <p>
              While purchases are non-refundable, we may, at our sole discretion, refund a single credit to
              your account balance if a generated image is technically defective (e.g., illegible text or severe
              distortion). You must report such issues within 24 hours of generation.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold text-[#1F2937] mb-4">4. User Conduct & Prohibited Content</h2>
            <p className="mb-2">You agree NOT to use Bible Sketch to generate:</p>
            <ol className="list-decimal pl-5 space-y-1 mb-4">
              <li>Hate speech, violence, gore, or sexually explicit content.</li>
              <li>Images that mock, denigrate, or disrespect religious beliefs.</li>
              <li>Content that infringes on third-party intellectual property (e.g., requesting copyrighted characters).</li>
            </ol>
            <p>
              <strong>Termination:</strong> We reserve the right to suspend or ban any account that repeatedly attempts to
              bypass our safety filters or generates prohibited content.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold text-[#1F2937] mb-4">5. DISCLAIMERS & LIMITATION OF LIABILITY</h2>
            <p className="font-bold mb-4">PLEASE READ THIS SECTION CAREFULLY.</p>

            <h3 className="font-bold text-gray-800 text-lg mb-2">5.1. No Liability for AI Output ("Hallucinations")</h3>
            <p className="mb-4">
              You acknowledge that Artificial Intelligence is a non-deterministic technology. While we
              implement strict safety filters, the AI may, on rare occasions and without warning, generate
              content that is unexpected, inappropriate, offensive, biologically inaccurate, or visually
              disturbing. <strong>Bible Sketch is NOT responsible or liable for any such content.</strong>
              <br />
              By using the service, you agree to hold Bible Sketch harmless from any claims, damages, or
              distress arising from the visual nature of the AI output. Your sole remedy for an inappropriate
              generation is to report the image for deletion and request a credit refund.
            </p>

            <h3 className="font-bold text-gray-800 text-lg mb-2">5.2. No Guarantee of Accuracy</h3>
            <p className="mb-4">
              Bible Sketch does not guarantee that generated images are historically, anatomically, or
              theologically accurate.
            </p>

            <h3 className="font-bold text-gray-800 text-lg mb-2">5.3. Copyright Enforceability</h3>
            <p>
              You acknowledge that under current laws (including US Copyright Office guidance), purely
              AI-generated works may not be eligible for copyright registration. Bible Sketch makes no
              warranty regarding your ability to enforce copyright against third parties who copy your
              generated images.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold text-[#1F2937] mb-4">6. General Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, the Bible Sketch service is provided "AS IS" and "AS
              AVAILABLE." In no event shall Bible Sketch be liable for any indirect, incidental, special,
              consequential, or punitive damages, including loss of profits or data, arising out of or in
              connection with your use of the service.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold text-[#1F2937] mb-4">7. Contact Information</h2>
            <p>
              For legal inquiries regarding these Terms, please contact:<br/>
              <strong>support@biblesketch.com</strong>
            </p>
          </section>
        </div>
      </div>
      </div>
    </>
  );
};
