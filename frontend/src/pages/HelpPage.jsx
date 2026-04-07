import { useState } from 'react';
import { useParams, Link, NavLink, useNavigate } from 'react-router-dom';
import { MessageSquare, Mail, Twitter } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { updateMe } from '../services/api';

const NAV_LINKS = [
  { slug: 'about',        label: 'About M4M' },
  { slug: 'faq',          label: 'FAQ' },
  { slug: 'how-to-buy',   label: 'How to Buy' },
  { slug: 'how-to-sell',  label: 'How to Sell' },
  { slug: 'rules',        label: 'Marketplace Rules' },
  { slug: 'disputes',     label: 'How Disputes Work' },
  { slug: 'contact',      label: 'Contact' },
  { slug: 'terms',        label: 'Terms of Service' },
  { slug: 'privacy',      label: 'Privacy Policy' },
];

function AboutContent() {
  return (
    <article className="prose prose-sm sm:prose max-w-none">
      <h1>About M4M Marketplace</h1>
      <p>M4M is a trusted digital marketplace for game services and virtual goods. Our mission is to connect buyers and sellers worldwide in a safe, transparent, and fast environment.</p>
      <h2>Our Values</h2>
      <ul>
        <li><strong>Security:</strong> All payments are held in escrow until delivery is confirmed.</li>
        <li><strong>Trust:</strong> Verified sellers are manually reviewed by our team.</li>
        <li><strong>Transparency:</strong> Seller badges and ratings are based on real completed orders.</li>
        <li><strong>Support:</strong> Our team is available to resolve any issue through our dispute system.</li>
      </ul>
      <h2>How it Works</h2>
      <p>Buyers browse products, make purchases with wallet funds held securely in escrow, and confirm delivery once satisfied. Sellers receive payment only after delivery is confirmed.</p>
      <div className="not-prose flex flex-wrap gap-3 mt-6">
        <Link to="/help/how-to-buy" className="px-4 py-2 rounded-lg bg-m4m-purple text-white text-sm font-medium hover:bg-purple-700 transition-colors">How to Buy</Link>
        <Link to="/help/how-to-sell" className="px-4 py-2 rounded-lg border border-m4m-purple text-m4m-purple text-sm font-medium hover:bg-purple-50 transition-colors">How to Sell</Link>
      </div>
    </article>
  );
}

function FaqContent() {
  const faqs = [
    { q: 'How do I make a purchase?', a: 'Add funds to your wallet, browse products, and click Buy. Your payment is held securely until you confirm delivery.' },
    { q: 'When does the seller receive payment?', a: 'The seller receives payment only after you confirm the delivery, or automatically after the auto-confirmation period (delivery time + 24 hours).' },
    { q: 'What is escrow?', a: 'Escrow is a security mechanism where M4M holds your payment temporarily. This protects you as a buyer — if delivery fails, you can open a dispute to get a refund.' },
    { q: 'What is instant delivery?', a: 'Instant delivery products have pre-loaded account credentials. When you purchase, the credentials are automatically delivered to you and the order is marked delivered immediately.' },
    { q: 'How do I become a verified seller?', a: 'Go to your Seller Dashboard → Get Verified, upload your national ID and optionally a bank statement. Our team reviews and approves within 24-48 hours.' },
    { q: 'What are seller badges?', a: 'Seller badges indicate completed sales: Beginner (1+), Trusted (10+), Professional (100+), Expert (500+), Elite (1000+). They help buyers identify reliable sellers.' },
    { q: 'How do disputes work?', a: 'If you have an issue with a delivery, open a dispute from your order page. Our team reviews the case and will either issue a refund or release funds to the seller.' },
    { q: 'What is the platform commission?', a: 'M4M takes a 10% commission on each completed order. Sellers receive 90% of the sale price.' },
    { q: 'How do I withdraw my earnings?', a: 'Go to Wallet → Withdraw. Our team manually reviews and approves withdraw requests within 24-48 hours.' },
    { q: 'Can I cancel an order?', a: 'Orders can be cancelled before delivery. Contact the seller through chat, or open a dispute if needed.' },
  ];
  return (
    <article>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Frequently Asked Questions</h1>
      <div className="space-y-4">
        {faqs.map(({ q, a }, i) => (
          <details key={i} className="group rounded-xl border border-gray-200 bg-white overflow-hidden">
            <summary className="flex items-center justify-between p-4 cursor-pointer font-semibold text-gray-900 text-sm list-none select-none">
              {q}
              <svg className="w-4 h-4 text-gray-400 transition-transform group-open:rotate-180 shrink-0 ml-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            <p className="px-4 pb-4 text-sm text-gray-600 leading-relaxed">{a}</p>
          </details>
        ))}
      </div>
    </article>
  );
}

function HowToBuyContent() {
  const steps = [
    { n: 1, title: 'Create an Account', desc: 'Register on M4M with your email. You can sign up as a buyer or seller.' },
    { n: 2, title: 'Add Funds to Your Wallet', desc: 'Go to Wallet → Deposit. Generate a unique reference code and transfer funds. Our team approves deposits manually.' },
    { n: 3, title: 'Browse and Choose a Product', desc: 'Explore the marketplace. Check seller badges, ratings, and reviews to find trusted sellers.' },
    { n: 4, title: 'Purchase the Product', desc: 'Click Buy on a product. Review the confirmation modal and complete your purchase. Funds are held in escrow.' },
    { n: 5, title: 'Wait for Delivery', desc: 'For instant delivery: credentials appear immediately. For manual delivery: the seller sends credentials within the stated time.' },
    { n: 6, title: 'Confirm Delivery', desc: 'Once you receive and verify the delivery, click Confirm Delivery. The seller receives payment and the order is completed.' },
    { n: 7, title: 'Leave a Review', desc: 'Help other buyers by leaving an honest review about the product and seller.' },
  ];
  return (
    <article>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">How to Buy on M4M</h1>
      <p className="text-gray-500 text-sm mb-8">Follow these steps to make a safe purchase on M4M Marketplace.</p>
      <div className="space-y-4">
        {steps.map(({ n, title, desc }) => (
          <div key={n} className="flex gap-4 rounded-xl border border-gray-200 bg-white p-4">
            <div className="w-9 h-9 rounded-full bg-m4m-purple text-white flex items-center justify-center text-sm font-bold shrink-0">{n}</div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">{title}</p>
              <p className="text-gray-500 text-sm mt-0.5">{desc}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-8 rounded-xl bg-blue-50 border border-blue-200 p-4 text-sm text-blue-800">
        <strong>Buyer Protection:</strong> M4M holds your payment securely in escrow until you confirm delivery. If something goes wrong, you can open a dispute.
      </div>
    </article>
  );
}

function HowToSellContent() {
  const { user, refreshUser, loading } = useAuth();
  const navigate = useNavigate();
  const [activating, setActivating] = useState(false);
  const [activationError, setActivationError] = useState('');
  const [sellerActivationConfirmOpen, setSellerActivationConfirmOpen] = useState(false);

  const isSeller = user?.is_seller === true || user?.is_seller === 1;
  const isLoggedIn = Boolean(user);
  const isEmailVerified = Boolean(user?.email_verified_at);

  const handleConfirmSeller = async () => {
    if (user?.is_seller === true || user?.is_seller === 1) {
      return;
    }
    setActivationError('');
    setActivating(true);
    try {
      const updated = await updateMe({ is_seller: true });
      await refreshUser();
      // SellerRoute does not require email verification; send unverified users to /profile
      // so ProtectedRoute shows the standard verification UI instead of dashboard-only flows.
      if (!updated?.email_verified_at) {
        navigate('/profile', { replace: true });
      } else {
        navigate('/seller-dashboard', { replace: true });
      }
    } catch (e) {
      setActivationError(e?.message || 'Could not activate seller mode. Please try again.');
    } finally {
      setActivating(false);
    }
  };

  const secondaryOutlineBtn =
    'inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-sm font-semibold border border-m4m-gray-300 text-m4m-gray-700 bg-white hover:bg-gray-50 transition-colors disabled:opacity-60';

  const steps = [
    { n: 1, title: 'Create your M4M account', desc: 'Register as a buyer first. Seller mode is turned on only after you confirm below on this page.' },
    { n: 2, title: 'Create Your Products', desc: 'Go to Seller Dashboard → Products → Add Product. Set title, description, price, delivery type, and images.' },
    { n: 3, title: 'Choose Delivery Type', desc: 'Instant Delivery: upload pre-loaded credentials. Manual Delivery: send credentials manually after each order.' },
    { n: 4, title: 'Receive Orders', desc: 'You will be notified for each new order. For manual delivery, send credentials through the order page.' },
    { n: 5, title: 'Get Paid', desc: 'Funds are released to your wallet after buyers confirm delivery, or automatically after the auto-confirmation period.' },
    { n: 6, title: 'Withdraw Earnings', desc: 'Request a withdrawal from your Wallet page. Our team processes withdrawals manually within 24-48 hours.' },
    { n: 7, title: 'Get Verified', desc: 'Submit verification documents to get the Verified Seller badge, increasing trust and your product limit.' },
  ];

  const purpleBtn =
    'inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold bg-m4m-purple text-white hover:bg-m4m-purple-dark transition-colors disabled:opacity-60 disabled:pointer-events-none';
  const showTopOnboarding = isLoggedIn && !isSeller;

  return (
    <article>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">How to Sell on M4M</h1>
      <p className="text-gray-500 text-sm mb-8">Start selling digital products to buyers worldwide.</p>
      {showTopOnboarding ? (
        <>
          <div className="rounded-xl border border-m4m-gray-200 bg-white p-5 space-y-4 mb-6">
            <h2 className="text-base font-semibold text-m4m-black">Seller onboarding progress</h2>
            <p className="text-sm text-m4m-gray-700">
              Your account has been created successfully. Complete the final step below to activate seller mode.
            </p>
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-lg bg-m4m-gray-50 px-3 py-2 text-sm">
                <span className="text-m4m-gray-700">Account created</span>
                <span className="text-green-700 font-semibold">Completed</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-m4m-gray-50 px-3 py-2 text-sm">
                <span className="text-m4m-gray-700">Email verification</span>
                {isEmailVerified ? (
                  <span className="text-green-700 font-semibold">Verified</span>
                ) : (
                  <span className="text-blue-700 font-semibold">Needs verification</span>
                )}
              </div>
              <div className="flex items-center justify-between rounded-lg bg-m4m-gray-50 px-3 py-2 text-sm">
                <span className="text-m4m-gray-700">Seller mode activation</span>
                <span className="text-amber-700 font-semibold">Pending</span>
              </div>
            </div>
          </div>
          <div className="mb-8 flex flex-col items-center gap-3">
            {activationError ? (
              <p className="text-sm text-red-600 text-center max-w-md">{activationError}</p>
            ) : null}
            {!sellerActivationConfirmOpen ? (
              <button
                type="button"
                onClick={() => {
                  setActivationError('');
                  setSellerActivationConfirmOpen(true);
                }}
                disabled={activating}
                className={purpleBtn}
              >
                I want to sell on M4M
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </button>
            ) : null}
            {sellerActivationConfirmOpen ? (
              <div className="w-full max-w-md rounded-xl border border-m4m-gray-200 bg-m4m-gray-50 p-5 space-y-4">
                <p className="text-sm text-gray-700 text-center leading-relaxed">
                  You are about to enable <strong>seller mode</strong> on your account. You will be able to list products
                  and receive payouts per M4M rules and commission. This can be reviewed in the steps above.
                </p>
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  <button
                    type="button"
                    onClick={() => setSellerActivationConfirmOpen(false)}
                    disabled={activating}
                    className={secondaryOutlineBtn}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmSeller}
                    disabled={activating}
                    className={purpleBtn}
                  >
                    {activating ? 'Activating…' : 'Yes, activate seller mode'}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </>
      ) : null}
      <div className="space-y-4">
        {steps.map(({ n, title, desc }) => (
          <div key={n} className="flex gap-4 rounded-xl border border-gray-200 bg-white p-4">
            <div className="w-9 h-9 rounded-full bg-m4m-purple text-white flex items-center justify-center text-sm font-bold shrink-0">{n}</div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">{title}</p>
              <p className="text-gray-500 text-sm mt-0.5">{desc}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-8 rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
        <strong>Platform Commission:</strong> M4M takes a 10% commission on each completed order. You receive 90% of the sale price.
      </div>
      {!showTopOnboarding ? (
      <div className="mt-6 rounded-xl border border-m4m-gray-200 bg-white p-5 space-y-4">
        <h2 className="text-base font-semibold text-m4m-black">Seller onboarding progress</h2>
        {isLoggedIn && !isSeller ? (
          <p className="text-sm text-m4m-gray-700">
            Your account has been created successfully. Complete the final step below to activate seller mode.
          </p>
        ) : null}
        <div className="space-y-2">
          <div className="flex items-center justify-between rounded-lg bg-m4m-gray-50 px-3 py-2 text-sm">
            <span className="text-m4m-gray-700">Account created</span>
            {isLoggedIn ? (
              <span className="text-green-700 font-semibold">Completed</span>
            ) : (
              <span className="text-amber-700 font-semibold">Pending</span>
            )}
          </div>
          <div className="flex items-center justify-between rounded-lg bg-m4m-gray-50 px-3 py-2 text-sm">
            <span className="text-m4m-gray-700">Email verification</span>
            {!isLoggedIn ? (
              <span className="text-amber-700 font-semibold">Pending</span>
            ) : isEmailVerified ? (
              <span className="text-green-700 font-semibold">Verified</span>
            ) : (
              <span className="text-blue-700 font-semibold">Needs verification</span>
            )}
          </div>
          <div className="flex items-center justify-between rounded-lg bg-m4m-gray-50 px-3 py-2 text-sm">
            <span className="text-m4m-gray-700">Seller mode activation</span>
            {isSeller ? (
              <span className="text-green-700 font-semibold">Activated</span>
            ) : (
              <span className="text-amber-700 font-semibold">Pending</span>
            )}
          </div>
        </div>
      </div>
      ) : null}
      {!showTopOnboarding ? (
      <div className="mt-8 flex flex-col items-center gap-3">
        {activationError ? (
          <p className="text-sm text-red-600 text-center max-w-md">{activationError}</p>
        ) : null}
        {loading ? (
          <p className="text-sm text-gray-500 text-center">Loading…</p>
        ) : !user ? (
          <Link to="/auth" state={{ sellerIntent: true }} className={purpleBtn}>
            Start selling
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        ) : !isSeller ? (
          <>
            {!sellerActivationConfirmOpen ? (
              <button
                type="button"
                onClick={() => {
                  setActivationError('');
                  setSellerActivationConfirmOpen(true);
                }}
                disabled={activating}
                className={purpleBtn}
              >
                I want to sell on M4M
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </button>
            ) : null}
            {sellerActivationConfirmOpen ? (
              <div className="w-full max-w-md rounded-xl border border-m4m-gray-200 bg-m4m-gray-50 p-5 space-y-4">
                <p className="text-sm text-gray-700 text-center leading-relaxed">
                  You are about to enable <strong>seller mode</strong> on your account. You will be able to list products
                  and receive payouts per M4M rules and commission. This can be reviewed in the steps above.
                </p>
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  <button
                    type="button"
                    onClick={() => setSellerActivationConfirmOpen(false)}
                    disabled={activating}
                    className={secondaryOutlineBtn}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmSeller}
                    disabled={activating}
                    className={purpleBtn}
                  >
                    {activating ? 'Activating…' : 'Yes, activate seller mode'}
                  </button>
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <Link to="/seller-dashboard" className={purpleBtn}>
            Go to Seller Dashboard
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        )}
      </div>
      ) : null}
    </article>
  );
}

function DisputeContent() {
  return (
    <article className="prose prose-sm sm:prose max-w-none">
      <h1>How Disputes Work</h1>
      <p>M4M's dispute system is designed to protect both buyers and sellers fairly.</p>
      <h2>When can you open a dispute?</h2>
      <ul>
        <li>The delivered product is invalid or not working</li>
        <li>Account credentials don't work</li>
        <li>Wrong product delivered</li>
        <li>Seller did not deliver within the promised time</li>
      </ul>
      <h2>How to open a dispute</h2>
      <ol>
        <li>Go to <strong>My Orders</strong></li>
        <li>Open the order with the issue</li>
        <li>Click <strong>Open Dispute</strong></li>
        <li>Select a reason and provide a description</li>
        <li>Submit the dispute</li>
      </ol>
      <h2>What happens next?</h2>
      <p>Our team will review the dispute within 24 hours. The order status changes to <strong>Disputed</strong> and funds remain in escrow. After review, we will either:</p>
      <ul>
        <li><strong>Refund the buyer</strong> — if the seller failed to deliver correctly</li>
        <li><strong>Release funds to the seller</strong> — if the delivery was valid</li>
      </ul>
      <h2>Dispute Statuses</h2>
      <ul>
        <li><strong>Open</strong> — Dispute submitted, awaiting review</li>
        <li><strong>Under Review</strong> — Admin is investigating</li>
        <li><strong>Resolved</strong> — Funds released to seller</li>
        <li><strong>Refunded</strong> — Buyer has been refunded</li>
      </ul>
    </article>
  );
}

function RulesContent() {
  return (
    <article className="prose prose-sm sm:prose max-w-none">
      <h1>Marketplace Rules & Safety Policy</h1>
      <p>M4M is designed to be a safe and fair marketplace for everyone. These rules apply to all buyers and sellers.</p>

      <h2>Prohibited products</h2>
      <ul>
        <li>Stolen or hacked accounts</li>
        <li>Credit cards, bank credentials, or financial data</li>
        <li>Malware, cheats, or tools that violate game ToS</li>
        <li>Any content that is illegal in your country or in Morocco</li>
      </ul>

      <h2>Misleading listings</h2>
      <p>Listings must accurately describe what the buyer will receive.</p>
      <ul>
        <li>No fake screenshots or fake proof of ownership</li>
        <li>No bait titles such as “Free” if payment is required</li>
        <li>No claiming official partnership with game publishers without permission</li>
      </ul>

      <h2>Fake accounts & abusive behavior</h2>
      <ul>
        <li>Creating multiple accounts to evade bans is strictly prohibited</li>
        <li>Harassment, hate speech, or abusive language is not allowed</li>
        <li>Do not pressure buyers to confirm delivery before they receive the product</li>
      </ul>

      <h2>Dispute abuse</h2>
      <p>Buyers must only open disputes when there is a real issue.</p>
      <ul>
        <li>Opening false disputes to obtain free products may lead to suspension</li>
        <li>Repeated abuse of the dispute system can result in permanent bans</li>
      </ul>

      <h2>Seller responsibilities</h2>
      <ul>
        <li>Deliver exactly what is described in the listing</li>
        <li>Respect the selected delivery time (instant or manual)</li>
        <li>Respond to buyer messages in a reasonable time</li>
        <li>Do not cancel orders without a valid reason</li>
      </ul>

      <h2>Buyer responsibilities</h2>
      <ul>
        <li>Provide correct information required for delivery</li>
        <li>Test delivered accounts as soon as possible</li>
        <li>Confirm delivery once you receive and verify the product</li>
        <li>Leave honest and fair reviews</li>
      </ul>

      <h2>Moderation actions</h2>
      <p>M4M moderation may apply the following actions when rules are broken:</p>
      <ul>
        <li><strong>Warning</strong> — visible notification on the seller dashboard</li>
        <li><strong>Temporary suspension</strong> — seller cannot sell or withdraw for a limited time</li>
        <li><strong>Permanent ban</strong> — account is closed and access to the marketplace is removed</li>
      </ul>

      <h2>Warning / suspension / ban policy</h2>
      <p>
        In most cases, we start with a warning for first-time issues. Serious fraud, chargebacks, or selling illegal
        goods can result in immediate permanent bans without prior warning.
      </p>
      <p>
        By using M4M, you agree to follow these rules. Repeated violations may result in loss of access to the platform
        and any associated wallet balance obtained through fraud.
      </p>
    </article>
  );
}

function ContactContent() {
  return (
    <article>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Contact Us</h1>
      <p className="text-gray-500 text-sm mb-8">Have a question or issue? Reach out through one of these channels.</p>
      <div className="grid sm:grid-cols-2 gap-4">
        {[
          { icon: <MessageSquare className="w-5 h-5" />, title: 'Live Support Chat', desc: 'Chat with our support team directly from the platform.', action: 'Open Chat', to: '/chat' },
          { icon: <Mail className="w-5 h-5" />, title: 'Email Support', desc: 'Send us an email and we will respond within 24 hours.', action: 'support@m4m.market', to: '#' },
          { icon: <Twitter className="w-5 h-5" />, title: 'Twitter / X', desc: 'Follow us for updates and send us a DM for quick support.', action: '@m4mmarket', to: '#' },
          { icon: <MessageSquare className="w-5 h-5" />, title: 'Discord Community', desc: 'Join our Discord server to connect with other users and get help.', action: 'Join Discord', to: '#' },
        ].map(({ icon, title, desc, action, to }) => (
          <div key={title} className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="text-2xl mb-2 flex items-center justify-center text-m4m-purple">
              {icon}
            </div>
            <h3 className="font-semibold text-gray-900 text-sm mb-1">{title}</h3>
            <p className="text-gray-500 text-xs mb-3">{desc}</p>
            <Link to={to} className="text-xs font-semibold text-m4m-purple hover:underline">{action}</Link>
          </div>
        ))}
      </div>
    </article>
  );
}

function TermsContent() {
  return (
    <article className="prose prose-sm sm:prose max-w-none">
      <h1>Terms of Service</h1>
      <p><em>Last updated: March 2026</em></p>
      <p>By using M4M Marketplace, you agree to these terms. Please read them carefully.</p>
      <h2>1. Use of Platform</h2>
      <p>M4M is a marketplace for digital goods. You must be 18+ to use the platform. You are responsible for all activities under your account.</p>
      <h2>2. Buyer Responsibilities</h2>
      <ul>
        <li>Buyers must fund their wallet before purchasing.</li>
        <li>Buyers must confirm delivery honestly. False confirmations may result in account suspension.</li>
        <li>Disputes must be opened within 7 days of delivery.</li>
      </ul>
      <h2>3. Seller Responsibilities</h2>
      <ul>
        <li>Sellers must deliver as described within the stated delivery time.</li>
        <li>Selling counterfeit or illegal goods is strictly prohibited.</li>
        <li>Sellers agree to a 10% platform commission on completed orders.</li>
      </ul>
      <h2>4. Escrow & Payments</h2>
      <p>M4M holds funds in escrow until delivery is confirmed. Platform commission is deducted on completion. Withdrawal requests are processed within 24-48 hours.</p>
      <h2>5. Prohibited Activities</h2>
      <ul>
        <li>Fraud, scamming, or deceptive practices</li>
        <li>Creating multiple accounts to evade bans</li>
        <li>Listing stolen accounts or illegally obtained digital goods</li>
      </ul>
      <h2>6. Account Termination</h2>
      <p>We may suspend or terminate accounts that violate these terms. Banned users may lose access to their wallet funds if obtained through fraud.</p>
    </article>
  );
}

function PrivacyContent() {
  return (
    <article className="prose prose-sm sm:prose max-w-none">
      <h1>Privacy Policy</h1>
      <p><em>Last updated: March 2026</em></p>
      <h2>1. Information We Collect</h2>
      <ul>
        <li>Account information: name, email address</li>
        <li>Transaction data: orders, wallet transactions</li>
        <li>Usage data: IP address, device type, last activity</li>
        <li>Verification documents: for verified sellers only</li>
      </ul>
      <h2>2. How We Use Your Information</h2>
      <ul>
        <li>To provide and improve the marketplace</li>
        <li>To process payments and prevent fraud</li>
        <li>To send notifications about orders and account activity</li>
        <li>To comply with legal requirements</li>
      </ul>
      <h2>3. Data Sharing</h2>
      <p>We do not sell your personal data. We may share data with payment processors and law enforcement when legally required.</p>
      <h2>4. Data Security</h2>
      <p>We use industry-standard encryption and security practices to protect your data. However, no system is 100% secure.</p>
      <h2>5. Your Rights</h2>
      <p>You may request access to, correction of, or deletion of your personal data by contacting us through the support chat.</p>
      <h2>6. Cookies</h2>
      <p>We use only essential cookies for authentication. We do not use advertising cookies.</p>
    </article>
  );
}

const CONTENT_MAP = {
  about:       <AboutContent />,
  faq:         <FaqContent />,
  'how-to-buy':  <HowToBuyContent />,
  'how-to-sell': <HowToSellContent />,
  rules:       <RulesContent />,
  disputes:    <DisputeContent />,
  contact:     <ContactContent />,
  terms:       <TermsContent />,
  privacy:     <PrivacyContent />,
};

export default function HelpPage() {
  const { slug } = useParams();
  const content = CONTENT_MAP[slug] ?? CONTENT_MAP['faq'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar */}
        <aside className="lg:w-56 shrink-0">
          <div className="lg:sticky lg:top-24 rounded-2xl border border-gray-200 bg-white p-3 overflow-hidden">
            <p className="px-2 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">Help Center</p>
            <nav className="space-y-0.5">
              {NAV_LINKS.map(({ slug: s, label }) => (
                <NavLink
                  key={s}
                  to={`/help/${s}`}
                  className={({ isActive }) =>
                    `block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive ? 'bg-m4m-purple text-white' : 'text-gray-700 hover:bg-gray-50'
                    }`
                  }
                >
                  {label}
                </NavLink>
              ))}
            </nav>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 bg-white rounded-2xl border border-gray-200 p-6 sm:p-8">
          {content}
        </main>
      </div>
    </div>
  );
}
