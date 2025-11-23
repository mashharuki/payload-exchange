import { PaywallWidget } from "@/components/paywall-widget";
import { getResource } from "@/server/core/resources/registry";

export default async function PaywallPage({
  searchParams,
}: {
  searchParams: Promise<{ resourceUrl?: string }>;
}) {
  const { resourceUrl } = await searchParams;

  // Fetch the resource if resourceUrl is provided
  let resource = null;
  if (resourceUrl) {
    resource = await getResource(resourceUrl);
  }

  return (
    <div className="min-h-screen bg-transparent p-4">
      <PaywallWidget resource={resource} />
    </div>
  );
}
