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
  const handleResourceClick = async (resource: Resource) => {
    // Call the show_paywall MCP tool
    if (window.openai?.callTool) {
      try {
        await window.openai.callTool("show_paywall", {
          resourceUrl: resource.resource,
        });
      } catch (error) {
        console.error("Failed to show paywall:", error);
      }
    }
  };

  if (mode === "search" && query) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <div className="flex items-center justify-between">
          <div>{`# Search Results for "${query}"`}</div>
          <Link href="/resources?mode=list">
            <button className="px-4 py-2 bg-gray-200 rounded">
              Clear Search
            </button>
          </Link>
        </div>

        {resources.length === 0 ? (
          <div>No resources found.</div>
        ) : (
          <div className="flex flex-col gap-2">
            {resources.map((resource) => (
              <div
                key={resource.resource}
                className="flex flex-col gap-2 rounded-lg border p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{resource.resource}</span>
                  <button
                    onClick={() => handleResourceClick(resource)}
                    className="px-2 py-1 bg-gray-200 rounded text-sm hover:bg-gray-300 transition-colors"
                  >
                    View
                  </button>
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
    );
  }

  // Default list mode
  return (
    <div className="flex flex-col gap-4 p-4">
      <div># Resources</div>

      <div className="flex flex-col gap-2">
        {resources.map((resource) => (
          <div
            key={resource.resource}
            className="flex flex-col gap-2 rounded-lg border p-4"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">{resource.resource}</span>
              <button
                onClick={() => handleResourceClick(resource)}
                className="px-2 py-1 bg-gray-200 rounded text-sm hover:bg-gray-300 transition-colors"
              >
                View
              </button>
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
  );
}
