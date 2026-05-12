import { ref } from 'vue';

const STORAGE_KEY = 'most-archived-slugs';

function load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'); } catch { return []; }
}

export const archivedSlugs = ref(load());

export function archiveSlug(slug) {
  if (!archivedSlugs.value.includes(slug)) {
    archivedSlugs.value = [...archivedSlugs.value, slug];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(archivedSlugs.value));
  }
}

export function restoreSlug(slug) {
  archivedSlugs.value = archivedSlugs.value.filter((s) => s !== slug);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(archivedSlugs.value));
}
