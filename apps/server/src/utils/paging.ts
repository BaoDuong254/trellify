export const pagingSkipValue = (page: number, itemsPerPage: number) => {
  if (!page || !itemsPerPage || page <= 0 || itemsPerPage <= 0) return 0;

  return (page - 1) * itemsPerPage;
};
