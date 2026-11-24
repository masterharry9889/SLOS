import { useQuery } from "@tanstack/react-query";
import type { Subject } from "@/types";
import { getSubjects } from "./endpoints";

export function useSubjects() {
  return useQuery<Subject[]>({
    queryKey: ["subjects"],
    queryFn: getSubjects,
  });
}
