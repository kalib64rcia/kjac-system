import type { LandingContent } from "@/types/content.types";

/** Mission / Vision cards (admin-editable; hidden while empty). */
export function MissionVision({ content }: { content: LandingContent }) {
  const showMission = content.mission_text.trim().length > 0;
  const showVision = content.vision_text.trim().length > 0;
  if (!showMission && !showVision) return null;
  return (
    <section id="mission-vision" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-14 sm:px-6" aria-label="Mission and vision">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {showMission && (
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-xl font-bold text-gray-900">Our Mission</h2>
            <p className="mt-2 text-gray-600">{content.mission_text}</p>
          </div>
        )}
        {showVision && (
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-xl font-bold text-gray-900">Our Vision</h2>
            <p className="mt-2 text-gray-600">{content.vision_text}</p>
          </div>
        )}
      </div>
    </section>
  );
}
