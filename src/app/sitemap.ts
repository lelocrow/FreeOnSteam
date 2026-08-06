import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [{
    url: process.env.SITE_URL || "http://localhost:3000",
    changeFrequency: "hourly",
    priority: 1,
  }];
}
