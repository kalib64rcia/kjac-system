import { useCallback, useState } from "react";

/** Shared page/page-size state for list boards. One hook — never hand-roll
 *  page/pageSize/reset/prev/next per page. Default sizes stay per page
 *  (directory boards use 50, the rest 20). */
export function usePaginationState(defaultPageSize = 20) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const resetPage = useCallback(() => setPage(1), []);
  const setSize = useCallback((n: number) => {
    setPageSize(n);
    setPage(1);
  }, []);
  const prevPage = useCallback(() => setPage((p) => Math.max(1, p - 1)), []);
  const nextPage = useCallback(
    (pageCount: number) => setPage((p) => Math.min(pageCount, p + 1)),
    [],
  );
  return { page, setPage, pageSize, setPageSize: setSize, resetPage, prevPage, nextPage };
}

/** Page count from a server/local total. */
export function pageCountOf(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}
