import { queryOptions } from "@tanstack/react-query";
import { listCatalog } from "@/lib/booking.functions";

export const catalogQuery = queryOptions({ queryKey: ["catalog"], queryFn: () => listCatalog() });
