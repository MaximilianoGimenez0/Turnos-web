import type { HelpCategory } from '../texts/pages/Help';

const normalizeSearchText = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

export const filterHelpCategories = (
  categories: readonly HelpCategory[],
  rawQuery: string
): HelpCategory[] => {
  const normalizedQuery = normalizeSearchText(rawQuery);
  if (!normalizedQuery) {
    return [...categories];
  }

  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) {
    return [...categories];
  }

  return categories
    .map((category) => {
      const catText = normalizeSearchText(`${category.title} ${category.description}`);
      const filteredItems = category.items.filter((item) => {
        const haystack = normalizeSearchText(
          `${catText} ${item.question} ${item.answer} ${item.tags.join(' ')}`
        );
        return tokens.every((token) => haystack.includes(token));
      });
      return {
        ...category,
        items: filteredItems,
      };
    })
    .filter((category) => category.items.length > 0);
};

export const countHelpItems = (categories: readonly HelpCategory[]): number =>
  categories.reduce((acc, cat) => acc + cat.items.length, 0);
