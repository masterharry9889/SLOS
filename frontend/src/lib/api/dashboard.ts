import { useQuery } from "@tanstack/react-query";
import type { DashboardData } from "@/types";
import { getDashboard } from "./endpoints";

export function useDashboardData() {
  return useQuery<DashboardData>({
    queryKey: ["dashboard-data"],
    queryFn: getDashboard,
  });
}
