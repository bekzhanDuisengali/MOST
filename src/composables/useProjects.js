import supabase from '../supabase';

export async function loadProjects() {
  try {
    const { data, error } = await supabase.from('projects').select('*').neq('status', 'archived').order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  } catch {
    return [];
  }
}

export function mergeIntoI18n(translations, projectImageGroups, projectThumbnailMap, rows) {
  for (const row of rows) {
    const { slug } = row;
    for (const lang of ['en', 'kz', 'ru']) {
      const td = translations[lang];
      if (!td) continue;
      td.projectPages[slug] = row.translations[lang];
      const cardMeta = row.card_meta[lang];
      const exists = td.projects.items.findIndex((p) => p.href === `/${slug}`);
      const item = {
        title: cardMeta.title,
        types: Array.isArray(cardMeta.categories) ? cardMeta.categories : [cardMeta.categories].filter(Boolean),
        href: `/${slug}`,
        alt: cardMeta.alt,
        status: row.status ?? 'sketch',
        large: row.large ?? false,
      };
      if (exists >= 0) {
        td.projects.items[exists] = item;
      } else {
        td.projects.items.push(item);
      }
    }
    if (row.hero_url) projectImageGroups[slug] = { hero: row.hero_url, gallery: row.gallery_urls ?? [] };
    if (row.thumbnail_url) projectThumbnailMap[slug] = row.thumbnail_url;
  }
}
