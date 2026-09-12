import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";

/** Honest scaffold for modules arriving in the next wave (bookings, etc.). */
export function ModulePlaceholder({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={title} description="This module ships in the next wave." />
      <Card>
        <CardContent className="py-10 text-center">
          <p className="text-sm text-gray-600">
            {hint ?? "The shell, navigation, and permissions are live — content follows."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
