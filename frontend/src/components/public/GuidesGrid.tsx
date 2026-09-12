/** Aircon guides: fixed 2x2 square grid, order 1→4 (never reordered). */
const GUIDES = [
  { src: "/assets/guides/aircon-guide-1.jpg", caption: "What's the right aircon for you?" },
  { src: "/assets/guides/aircon-guide-2.jpg", caption: "Before choosing: room size, heat, occupants, activities" },
  { src: "/assets/guides/aircon-guide-3.jpg", caption: "Choose an aircon that fits your home" },
  { src: "/assets/guides/aircon-guide-4.jpg", caption: "Find your perfect Daikin match" },
];

export function GuidesGrid() {
  return (
    <section id="guides" className="mx-auto max-w-4xl scroll-mt-24 px-4 py-14 sm:px-6" aria-label="Aircon guides">
      <h2 className="text-center text-2xl font-bold text-gray-900 sm:text-3xl">
        Aircon Buying Guides
      </h2>
      <p className="mt-2 text-center text-gray-600">
        Quick reads before you choose a unit or service
      </p>
      <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4">
        {GUIDES.map((g) => (
          <figure
            key={g.src}
            className="overflow-hidden rounded-lg border border-gray-200 bg-white transition-shadow hover:shadow-md"
          >
            <img
              src={g.src}
              alt={g.caption}
              loading="lazy"
              className="aspect-square w-full object-cover"
            />
            <figcaption className="px-3 py-2 text-xs font-medium text-gray-600 sm:text-sm">
              {g.caption}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
