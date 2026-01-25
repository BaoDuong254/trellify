export const pagingSkipValue = (page: number, itemsPerPage: number) => {
  if (!page || !itemsPerPage) return 0;
  if (page <= 0 || itemsPerPage <= 0) return 0;

  return (page - 1) * itemsPerPage;
};
