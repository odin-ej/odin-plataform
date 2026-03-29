"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";

interface RateLimitStatus {
  remaining: number;
  limit: number;
  tokensRemaining: number;
  tokensLimit: number;
}

export function useKrakenRateLimit() {
  return useQuery({
    queryKey: ["kraken-rate-limit"],
    queryFn: async (): Promise<RateLimitStatus> => {
      // This calls a lightweight check endpoint
      // For now, we derive from the daily usage info
      try {
        const { data } = await axios.get("/api/kraken/rate-limits/my-usage");
        return data;
      } catch {
        // Default fallback
        return {
          remaining: 30,
          limit: 30,
          tokensRemaining: 50000,
          tokensLimit: 50000,
        };
      }
    },
    refetchInterval: 60_000, // Refresh every minute
    staleTime: 30_000,
  });
}
