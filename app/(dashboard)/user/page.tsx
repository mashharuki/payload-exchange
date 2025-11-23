import { readFile } from "fs/promises";
import { join } from "path";
import UserSearchClient from "./user-search-client";

interface ResourceItem {
  resource: string;
  type: string;
  lastUpdated: string;
  accepts: Array<{
    resource: string;
    description?: string;
    [key: string]: unknown;
  }>;
  metadata?: {
    confidence?: {
      overallScore?: number;
    };
    [key: string]: unknown;
  };
}

async function getResources(): Promise<ResourceItem[]> {
  try {
    const filePath = join(process.cwd(), "public", "resources.json");
    const fileContents = await readFile(filePath, "utf-8");
    const resources: ResourceItem[] = JSON.parse(fileContents);
    return resources;
  } catch (error) {
    console.error("Failed to load resources:", error);
    return [];
  }
}

export default async function UserSearchPage() {
  const resources = await getResources();

  return <UserSearchClient initialResources={resources} />;
}
