import { Link } from 'react-router-dom';

export default function MarketplaceRulesPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Marketplace Rules & Safety</h1>
        <Link
          to="/help/rules"
          className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-m4m-purple text-white hover:bg-m4m-purple-dark transition-colors"
        >
          View help article
        </Link>
      </div>

      <p className="text-sm text-gray-600 mb-6">
        These rules apply to all buyers and sellers on M4M. By using the platform, you agree to follow these policies.
      </p>

      <div className="space-y-6 text-sm text-gray-800">
        <section>
          <h2 className="font-semibold text-gray-900 mb-1">Prohibited products</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>Stolen, hacked or phished accounts</li>
            <li>Credit cards, bank logins or any financial credentials</li>
            <li>Malware, keyloggers, exploits or cheats that violate game ToS</li>
            <li>Any content that is illegal in your country or in Morocco</li>
          </ul>
        </section>

        <section>
          <h2 className="font-semibold text-gray-900 mb-1">Misleading listings</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>Listings must accurately describe the product (game, region, duration, etc.).</li>
            <li>No fake screenshots or false “proof of funds / proof of rank”.</li>
            <li>No titles that imply something is free when payment is required.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-semibold text-gray-900 mb-1">Fake or shared accounts</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>Do not sell accounts that you do not fully own or control.</li>
            <li>No shared accounts that multiple buyers can access at the same time.</li>
            <li>Shared subscription accounts that violate the original provider&apos;s terms are not allowed.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-semibold text-gray-900 mb-1">Account resale restrictions</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>Many games and services forbid account resale. You are responsible for respecting those rules.</li>
            <li>If a game publisher reclaims an account due to ToS violations, M4M may suspend the seller.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-semibold text-gray-900 mb-1">Buyer protection policy</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>M4M holds your payment securely in escrow until your order is completed.</li>
            <li>If the product is not delivered or does not work, you can open a dispute from the order page.</li>
            <li>Our team will review evidence from both buyer and seller before deciding to refund or release funds.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-semibold text-gray-900 mb-1">Seller responsibilities</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>Deliver exactly what is described in the listing.</li>
            <li>Respect the chosen delivery type and time (instant or manual).</li>
            <li>Respond to buyer messages in a reasonable time.</li>
            <li>Do not pressure buyers to confirm delivery before they have received and tested the product.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-semibold text-gray-900 mb-1">Delivery rules</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>For instant delivery: upload valid, working accounts. Invalid or reused credentials are forbidden.</li>
            <li>For manual delivery: send credentials within the specified delivery time.</li>
            <li>Do not reuse the same credential line for multiple buyers.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-semibold text-gray-900 mb-1">Dispute abuse</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>Buyers should only open disputes when there is a real problem with delivery or product quality.</li>
            <li>Opening false disputes to obtain free products can lead to suspension or bans.</li>
            <li>Sellers who repeatedly trigger valid disputes may face account limits or bans.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-semibold text-gray-900 mb-1">Warning / suspension / ban policy</h2>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Warning</strong> – for first-time or minor violations. Visible on the seller dashboard.</li>
            <li><strong>Temporary suspension</strong> – selling and withdrawals are paused for a defined period.</li>
            <li><strong>Permanent ban</strong> – serious or repeated fraud. Access to the marketplace is removed.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-semibold text-gray-900 mb-1">Fraud detection</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>M4M monitors IP addresses, devices and suspicious login patterns.</li>
            <li>Creating multiple accounts to avoid bans or limits is prohibited.</li>
            <li>Fraudulent activity may be reported to relevant authorities when necessary.</li>
          </ul>
        </section>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          to="/help/rules"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-m4m-purple text-white hover:bg-m4m-purple-dark transition-colors"
        >
          View detailed help article
        </Link>
        <Link
          to="/seller-dashboard?section=verification"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Go to Seller Dashboard
        </Link>
      </div>
    </div>
  );
}

