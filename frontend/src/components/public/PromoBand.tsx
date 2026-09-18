import { Link } from "react-router-dom";

/** Promo band over the promotion photo. */
export function PromoBand() {
  return (
    <section className="relative overflow-hidden" aria-label="Promotion">
      <img
        src="/assets/business/aircon-promotion.jpg"
        alt="KJAC promotion — aircon services available, call us now"
        className="absolute inset-0 h-full w-full object-cover"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-secondary-dark/70" aria-hidden="true" />
      <div className="relative mx-auto flex max-w-4xl flex-col items-center px-4 py-14 text-center sm:px-6">
        <h2 className="text-2xl font-extrabold text-white sm:text-3xl">
          Aircon? Meron kami niyan dito!
        </h2>
        <p className="mt-2 font-medium text-gray-100">
          Call us now and get your cooling fixed today.
        </p>
        <Link
          to="/book"
          className="mt-6 inline-flex min-h-[52px] items-center justify-center rounded-lg bg-primary-400 px-8 text-base font-semibold text-white hover:bg-primary-500"
        >
          Book Service Now
        </Link>
      </div>
    </section>
  );
}
