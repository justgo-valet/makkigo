import "server-only";

const PAGE_SIZE = 20;

const parsePage = (value: string | string[] | undefined) => {
  const page = Number(typeof value === "string" ? value : 1);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
};

const pageArgs = (page: number) => ({ skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE });

const pageCount = (total: number) => Math.max(1, Math.ceil(total / PAGE_SIZE));

export { pageArgs, pageCount, parsePage };
