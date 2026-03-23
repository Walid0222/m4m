import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const FAQ_ITEMS = [
  {
    q: 'Is it safe to buy from this marketplace?',
    a: 'Yes. All payments are protected by our escrow system. Sellers only receive funds after successful delivery.',
  },
  {
    q: 'How fast will I receive my order?',
    a: 'Delivery depends on the product, but most orders are delivered within minutes to a few hours.',
  },
  {
    q: "What happens if the seller doesn't deliver?",
    a: 'You are fully protected. If delivery is not completed, you can open a dispute and get a refund.',
  },
  {
    q: 'Is my payment secure?',
    a: 'Absolutely. We use secure payment systems and never release funds until your order is confirmed.',
  },
  {
    q: 'Can I get a refund?',
    a: 'Yes. If the seller fails to deliver or the product is not as described, you can request a refund.',
  },
  {
    q: 'Are sellers verified?',
    a: 'We monitor seller performance and highlight trusted sellers based on ratings and completed orders.',
  },
  {
    q: 'Why are prices lower than other platforms?',
    a: 'Our marketplace connects you directly with sellers, reducing unnecessary fees.',
  },
  {
    q: 'How can I contact support?',
    a: 'You can contact support anytime via live chat. Our team is here to help you 24/7.',
  },
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState(null);

  const toggle = (index) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  };

  return (
    <section className="mb-16 md:mb-20 relative">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-m4m-purple/5 via-transparent to-transparent blur-2xl" />
      <div className="mb-8 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-m4m-purple/10 text-m4m-purple text-xs font-medium mb-3">
          FAQs
        </div>
        <h2 className="text-1xl md:text-2xl font-bold text-m4m-black">
          Frequently Asked Questions
        </h2>
        <p className="text-sm text-m4m-gray-500 mt-1 max-w-xl mx-auto">
          Everything you need to know before buying on M4M
        </p>
      </div>

      <div className="max-w-3xl mx-auto space-y-5">
        {FAQ_ITEMS.map((item, index) => {
          const isOpen = openIndex === index;
          return (
            <div
              key={index}
              className={`group relative bg-white border border-m4m-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-[2px] overflow-hidden ${
                isOpen ? 'ring-2 ring-m4m-purple/20 shadow-[0_0_0_1px_rgba(124,58,237,0.2)]' : ''
              }`}
            >
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-r from-m4m-purple/5 via-transparent to-transparent transition-opacity duration-300 pointer-events-none" />
              <div className="absolute left-0 top-0 h-full w-[3px] bg-gradient-to-b from-m4m-purple to-m4m-purple/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <button
                type="button"
                onClick={() => toggle(index)}
                className="w-full flex items-center justify-between px-6 py-5 cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-m4m-purple focus:ring-offset-2"
                aria-expanded={isOpen}
                aria-controls={`faq-answer-${index}`}
                id={`faq-question-${index}`}
              >
                <span className="text-sm md:text-base font-semibold text-m4m-black group-hover:text-m4m-purple transition-colors">
                  {item.q}
                </span>
                <ChevronDown
                  className={`w-5 h-5 shrink-0 text-m4m-gray-400 transition-all duration-300 group-hover:text-m4m-purple ${
                    isOpen ? 'rotate-180 scale-110' : ''
                  }`}
                  aria-hidden
                />
              </button>
              <div
                id={`faq-answer-${index}`}
                role="region"
                aria-labelledby={`faq-question-${index}`}
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                <div className="px-6 pb-5 pt-2 text-sm text-m4m-gray-600 leading-relaxed border-t border-m4m-gray-100 bg-gradient-to-b from-m4m-purple/[0.03] to-transparent">
                  <p>{item.a}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
