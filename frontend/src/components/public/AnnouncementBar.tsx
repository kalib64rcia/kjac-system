import { Megaphone } from "lucide-react";
import type { LandingContent } from "@/types/content.types";

/** Announcement band (admin-editable; hidden unless enabled with text). */
export function AnnouncementBar({ content }: { content: LandingContent }) {
  if (!content.announcement_enabled || !content.announcement_text.trim()) return null;
  return (
    <div className="bg-primary-700 px-4 py-2.5 text-center" role="status">
      <p className="mx-auto inline-flex max-w-7xl items-center gap-2 text-sm font-semibold text-white">
        <Megaphone size={16} aria-hidden="true" />
        {content.announcement_text}
      </p>
    </div>
  );
}
