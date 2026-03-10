export default function ServiceCard({ service }) {
  if (!service) return null;

  const slug = (service.slug || '').toLowerCase();
  const baseSrc = service.icon && typeof service.icon === 'string' && service.icon.startsWith('/services/')
    ? service.icon
    : (slug ? `/services/${slug}.svg` : '/services/default.svg');

  const handleError = (e) => {
    // Fallback to generic icon once if specific logo is missing
    if (e.currentTarget.dataset.fallbackApplied) return;
    e.currentTarget.dataset.fallbackApplied = '1';
    e.currentTarget.src = '/services/default.svg';
  };

  return (
    <div className="w-[90px] h-[90px] flex flex-col items-center justify-center rounded-xl border border-m4m-gray-200 bg-white shadow-sm hover:shadow-md hover:border-m4m-purple/60 hover:-translate-y-0.5 transition-all duration-150 text-center">
      <img
        src={baseSrc}
        alt={service.name}
        className="service-icon w-10 h-10 object-contain mb-1"
        onError={handleError}
      />
      <span className="text-[11px] font-medium text-m4m-black truncate w-full">
        {service.name}
      </span>
    </div>
  );
}

