import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-sm p-8">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6"
        >
          <ArrowLeft size={20} />
          Back
        </Link>

        <h1 className="text-3xl font-bold text-gray-900 mb-8">Terms of Service</h1>

        <div className="prose prose-gray max-w-none">
          <p className="text-gray-600 mb-6">Last updated: {new Date().toLocaleDateString()}</p>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Acceptance of Terms</h2>
            <p className="text-gray-700 mb-4">
              By accessing and using Yap.Network, you accept and agree to be bound by the terms and
              provision of this agreement.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Use License</h2>
            <p className="text-gray-700 mb-4">
              Permission is granted to temporarily use Yap.Network for personal, non-commercial
              transitory viewing only. This is the grant of a license, not a transfer of title.
            </p>
            <p className="text-gray-700 mb-4">Under this license you may not:</p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>Modify or copy the materials</li>
              <li>Use the materials for any commercial purpose</li>
              <li>Attempt to decompile or reverse engineer any software</li>
              <li>Remove any copyright or other proprietary notations</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">3. User Conduct</h2>
            <p className="text-gray-700 mb-4">You agree not to use the service to:</p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>Post harmful, threatening, or abusive content</li>
              <li>Impersonate any person or entity</li>
              <li>Spam or harass other users</li>
              <li>Violate any applicable laws or regulations</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Content</h2>
            <p className="text-gray-700 mb-4">
              You retain all rights to the content you post on Yap.Network. By posting content, you
              grant us a worldwide, non-exclusive, royalty-free license to use, copy, reproduce,
              process, adapt, publish, and display such content.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Disclaimer</h2>
            <p className="text-gray-700 mb-4">
              The materials on Yap.Network are provided on an &apos;as is&apos; basis. Yap.Network
              makes no warranties, expressed or implied, and hereby disclaims and negates all other
              warranties including, without limitation, implied warranties or conditions of
              merchantability, fitness for a particular purpose, or non-infringement of intellectual
              property or other violation of rights.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Limitations</h2>
            <p className="text-gray-700 mb-4">
              In no event shall Yap.Network or its suppliers be liable for any damages (including,
              without limitation, damages for loss of data or profit, or due to business
              interruption) arising out of the use or inability to use Yap.Network.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">7. Revisions</h2>
            <p className="text-gray-700 mb-4">
              Yap.Network may revise these terms of service at any time without notice. By using
              this service you are agreeing to be bound by the then current version of these terms
              of service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">8. Contact</h2>
            <p className="text-gray-700">
              If you have any questions about these Terms, please contact us through our platform.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
