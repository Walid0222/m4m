import { Link } from 'react-router-dom';

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-gray-900 text-gray-300 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-8 mb-10">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-3 lg:col-span-2">
            <Link to="/" className="text-2xl font-bold text-white">M4M</Link>
            <p className="mt-3 text-sm text-gray-400 max-w-xs leading-relaxed">
              The trusted digital marketplace for game services and virtual goods. Buy and sell securely worldwide.
            </p>
            {/* Social icons */}
            <div className="flex items-center gap-3 mt-5">
              {[
                { label: 'Twitter', path: 'M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z' },
                { label: 'Instagram', path: 'M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37zm1.5-4.87h.01M6.5 3h11A3.5 3.5 0 0121 6.5v11a3.5 3.5 0 01-3.5 3.5h-11A3.5 3.5 0 013 17.5v-11A3.5 3.5 0 016.5 3z' },
                { label: 'Discord', path: 'M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028 14.09 14.09 0 001.226-1.994.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03z' },
              ].map(({ label, path }) => (
                <a key={label} href="#" aria-label={label} className="w-9 h-9 rounded-xl bg-gray-800 flex items-center justify-center hover:bg-m4m-purple transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={path} />
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {/* Links: Marketplace */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Marketplace</h4>
            <ul className="space-y-2.5">
              {[
                { label: 'Browse Products', to: '/' },
                { label: 'Sell on M4M', to: '/seller-dashboard' },
                { label: 'My Orders', to: '/orders' },
                { label: 'Wallet', to: '/wallet' },
              ].map(({ label, to }) => (
                <li key={to}><Link to={to} className="text-sm text-gray-400 hover:text-white transition-colors">{label}</Link></li>
              ))}
            </ul>
          </div>

          {/* Links: Company */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Company</h4>
            <ul className="space-y-2.5">
              {[
                { label: 'About Us', to: '#' },
                { label: 'Blog', to: '#' },
                { label: 'Careers', to: '#' },
                { label: 'Contact', to: '#' },
              ].map(({ label, to }) => (
                <li key={label}><a href={to} className="text-sm text-gray-400 hover:text-white transition-colors">{label}</a></li>
              ))}
            </ul>
          </div>

          {/* Links: Support */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Support</h4>
            <ul className="space-y-2.5">
              {[
                { label: 'Help Center', to: '#' },
                { label: 'FAQ', to: '#' },
                { label: 'Privacy Policy', to: '#' },
                { label: 'Terms of Service', to: '#' },
              ].map(({ label, to }) => (
                <li key={label}><a href={to} className="text-sm text-gray-400 hover:text-white transition-colors">{label}</a></li>
              ))}
            </ul>
          </div>
        </div>

        {/* Payment methods */}
        <div className="border-t border-gray-800 pt-8 mb-8">
          <p className="text-xs text-gray-500 mb-4 font-medium uppercase tracking-wide">Accepted Payment Methods</p>
          <div className="flex flex-wrap items-center gap-3">
            {/* Visa */}
            <div className="bg-white rounded-lg px-3 py-2 flex items-center gap-1.5 h-9">
              <span className="text-blue-800 font-bold italic text-sm tracking-tight">VISA</span>
            </div>
            {/* Mastercard */}
            <div className="bg-white rounded-lg px-2 py-1.5 flex items-center h-9">
              <span className="relative inline-flex">
                <span className="w-6 h-6 rounded-full bg-red-500 opacity-90" />
                <span className="w-6 h-6 rounded-full bg-yellow-400 opacity-90 -ml-3" />
              </span>
              <span className="ml-1.5 text-gray-800 font-semibold text-xs">Mastercard</span>
            </div>
            {/* Apple Pay */}
            <div className="bg-black rounded-lg px-3 py-2 flex items-center gap-1.5 h-9">
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
              <span className="text-white text-xs font-medium">Pay</span>
            </div>
            {/* Google Pay */}
            <div className="bg-white rounded-lg border border-gray-200 px-3 py-2 flex items-center gap-1 h-9">
              <span className="text-blue-500 font-bold text-sm">G</span>
              <span className="text-red-500 font-bold text-sm">o</span>
              <span className="text-yellow-500 font-bold text-sm">o</span>
              <span className="text-blue-500 font-bold text-sm">g</span>
              <span className="text-green-500 font-bold text-sm">le</span>
              <span className="text-gray-600 font-medium text-xs ml-1">Pay</span>
            </div>
            {/* Bank Transfer */}
            <div className="bg-gray-800 rounded-lg px-3 py-2 flex items-center gap-1.5 h-9">
              <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              <span className="text-gray-300 text-xs font-medium">Bank Transfer</span>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-gray-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-500">&copy; {year} M4M Marketplace. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <a href="#" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">Privacy</a>
            <a href="#" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">Terms</a>
            <a href="#" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">Cookies</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
