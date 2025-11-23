"use client";

import Link from "next/link";
import type { Resource } from "@/server/core/resources/types";

interface ResourcesClientProps {
  resources: Resource[];
  mode?: string;
  query?: string;
}

export function ResourcesClient({
  resources,
  mode,
  query,
}: ResourcesClientProps) {
  if (mode === "search" && query) {
    return (
      <div className="flex flex-col h-screen max-h-[600px] p-4">
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div>{`# Search Results for "${query}"`}</div>
          <Link href="/resources?mode=list">
            <button className="px-4 py-2 bg-gray-200 rounded">
              Clear Search
            </button>
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          {resources.length === 0 ? (
            <div>No resources found.</div>
          ) : (
            <div className="flex flex-col gap-2">
              {resources.map((resource) => (
                <div
                  key={resource.resource}
                  className="flex flex-col gap-2 rounded-lg border p-4"
                >
                  <div className="font-medium overflow-x-auto whitespace-nowrap">
                    {resource.resource}
                  </div>
                  <div className="flex gap-2">
                    <span className="px-2 py-1 border rounded text-xs">
                      {resource.type}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Default list mode
  return (
    <div className="flex flex-col h-screen max-h-[600px] p-4">
      <div className="mb-4 flex-shrink-0"># Resources</div>

      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="flex flex-col gap-2">
          {resources.map((resource) => (
            <div
              key={resource.resource}
              className="flex flex-col gap-2 rounded-lg border p-4"
            >
              <div className="font-medium overflow-x-auto whitespace-nowrap">
                {resource.resource}
              </div>
              <div className="flex gap-2">
                <span className="px-2 py-1 border rounded text-xs">
                  {resource.type}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
