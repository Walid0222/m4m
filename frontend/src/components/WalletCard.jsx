import { useLanguage } from '../contexts/LanguageContext';

export default function WalletCard({ balance, currency = 'USD' }) {
  const { t } = useLanguage();
  const bal = Number(balance ?? 0);

  return (
    <div className="bg-white rounded-xl border border-m4m-gray-200 shadow-md p-6">
      <p className="text-sm font-medium text-m4m-gray-500 uppercase tracking-wide">
        {t('wallet.available_balance')}
      </p>
      <p className="mt-2 text-3xl font-bold text-m4m-black">
        {currency} {bal.toFixed(2)}
      </p>
    </div>
  );
}
