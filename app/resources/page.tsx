import Link from "next/link";
import {
  getResource,
  listResources,
  searchResources,
} from "@/server/core/resources/registry";
import { ResourcesClient } from "./resources-client";

export default async function ResourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; url?: string; query?: string }>;
}) {
  const { mode, url, query } = await searchParams;

  // Handle view mode separately (server-rendered detail view)
  if (mode === "view" && url) {
    const resource = await getResource(url);

    if (!resource) {
      return (
        <div className="flex flex-col gap-4 p-4">
          <div># Resource Not Found</div>
          <div>{`The resource with URL \`${url}\` could not be found.`}</div>
          <Link href="/resources">
            <button className="px-4 py-2 bg-gray-200 rounded">
              Back to List
            </button>
          </Link>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-4 p-4">
        <div className="flex items-center justify-between">
          <div>{`# ${resource.resource || "Resource Details"}`}</div>
          <Link href="/resources?mode=list">
            <button className="px-4 py-2 bg-gray-200 rounded">Back</button>
          </Link>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="px-2 py-1 bg-gray-200 rounded">{resource.type}</span>
          <span className="px-2 py-1 border rounded">
            {String(resource.x402Version)}
          </span>
        </div>

        <div className="space-y-2">
          <div>### Content</div>
          <pre className="p-4 overflow-auto bg-gray-100 rounded-md">
            {JSON.stringify(resource, null, 2)}
          </pre>
        </div>
      </div>
    );
  }

  // Handle search mode
  if (mode === "search" && query) {
    const results = await searchResources(query);
    return <ResourcesClient resources={results} mode={mode} query={query} />;
  }

  // Default to list mode
  const resources = await listResources();
  return <ResourcesClient resources={resources} />;
}
