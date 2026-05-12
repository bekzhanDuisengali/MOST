<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import supabase from './supabase';
import { translations } from './i18n';
import { archivedSlugs, archiveSlug, restoreSlug } from './composables/useArchivedSlugs';

const emit = defineEmits(['projects-updated']);

// views: 'list' | 'add'
const activeView = ref('list');

// ── Project list ──────────────────────────────────────────────
const supabaseProjects = ref([]);
const listLoading = ref(false);
const listError = ref('');

// i18n hardcoded slugs (EN as source of truth)
const i18nProjects = translations.en.projects.items.map((p) => ({
  slug: p.href.replace(/^\//, ''),
  status: p.status ?? 'built',
  source: 'static',
  id: null,
}));

const projectList = computed(() => {
  const supabaseSlugs = new Set(supabaseProjects.value.map((p) => p.slug));
  const staticItems = i18nProjects
    .filter((p) => !supabaseSlugs.has(p.slug))
    .map((p) => ({ ...p, archived: archivedSlugs.value.includes(p.slug) }));
  const dbItems = supabaseProjects.value.map((p) => ({ ...p, archived: p.status === 'archived', source: 'db' }));
  return [...dbItems, ...staticItems];
});

async function fetchProjects() {
  listLoading.value = true;
  listError.value = '';
  const { data, error } = await supabase
    .from('projects')
    .select('id, slug, status, created_at')
    .order('created_at', { ascending: false });
  listLoading.value = false;
  if (error) { listError.value = error.message; return; }
  supabaseProjects.value = data ?? [];
}

function toggleArchive(project) {
  if (project.source === 'db') {
    const newStatus = project.archived ? 'built' : 'archived';
    supabase.from('projects').update({ status: newStatus }).eq('id', project.id).then(({ error }) => {
      if (error) { listError.value = error.message; return; }
      const idx = supabaseProjects.value.findIndex((p) => p.id === project.id);
      if (idx >= 0) supabaseProjects.value[idx] = { ...supabaseProjects.value[idx], status: newStatus };
      emit('projects-updated');
    });
  } else {
    project.archived ? restoreSlug(project.slug) : archiveSlug(project.slug);
    emit('projects-updated');
  }
}

const deleteConfirmSlug = ref(null);

async function deleteProject(project) {
  if (project.source !== 'db') return;
  const { error } = await supabase.from('projects').delete().eq('id', project.id);
  if (error) { listError.value = error.message; deleteConfirmSlug.value = null; return; }
  deleteConfirmSlug.value = null;
  supabaseProjects.value = supabaseProjects.value.filter((p) => p.id !== project.id);
  emit('projects-updated');
}

// ── Migration ────────────────────────────────────────────────
const migrationState = ref('idle'); // idle | running | done | error
const migrationError = ref('');
const migrationConfirm = ref(false);

const staticOnlyCount = computed(() =>
  i18nProjects.filter((p) => !supabaseProjects.value.some((s) => s.slug === p.slug)).length,
);

async function runMigration() {
  migrationState.value = 'running';
  migrationError.value = '';
  const rows = translations.en.projects.items.map((enItem) => {
    const slug = enItem.href.replace(/^\//, '');
    const cardMeta = {};
    const translationsData = {};
    LANGS.forEach((l) => {
      const langItem = translations[l].projects.items.find((p) => p.href === enItem.href);
      cardMeta[l] = {
        title: langItem?.title ?? enItem.title,
        categories: langItem?.types ?? [],
        alt: langItem?.alt ?? enItem.alt ?? '',
      };
      const page = translations[l].projectPages?.[slug];
      if (page) {
        translationsData[l] = {
          title: page.title ?? '',
          category: page.category ?? '',
          heroAlt: page.heroAlt ?? '',
          summary: page.summary ?? '',
          facts: page.facts ?? [],
          galleryAlt: page.galleryAlt ?? [],
          sections: page.sections ?? [],
        };
      }
    });
    return {
      slug,
      status: enItem.status ?? 'built',
      large: enItem.large ?? false,
      hero_url: '',
      thumbnail_url: '',
      gallery_urls: [],
      translations: translationsData,
      card_meta: cardMeta,
    };
  });
  const { error } = await supabase.from('projects').upsert(rows, { onConflict: 'slug' });
  if (error) { migrationError.value = error.message; migrationState.value = 'error'; return; }
  migrationState.value = 'done';
  migrationConfirm.value = false;
  await fetchProjects();
  emit('projects-updated');
}

// ── Edit ─────────────────────────────────────────────────────
const editingProjectId = ref(null);
const editingProjectSlug = ref('');
const editCurrentHeroUrl = ref(null);
const editCurrentThumbnailUrl = ref(null);
const editCurrentGalleryUrls = ref([]);
const isEditing = computed(() => activeView.value === 'edit');

async function openEdit(project) {
  const { data, error } = await supabase.from('projects').select('*').eq('id', project.id).single();
  if (error) { listError.value = error.message; return; }

  editingProjectId.value = data.id;
  editingProjectSlug.value = data.slug;
  editCurrentHeroUrl.value = data.hero_url;
  editCurrentThumbnailUrl.value = data.thumbnail_url;
  editCurrentGalleryUrls.value = data.gallery_urls ?? [];

  slugInput.value = data.slug;
  statusInput.value = (data.status === 'archived' ? 'built' : data.status) ?? 'built';
  largeInput.value = data.large ?? false;

  LANGS.forEach((l) => {
    const cm = data.card_meta?.[l] ?? {};
    const tr = data.translations?.[l] ?? {};
    Object.assign(perLang[l], {
      cardTitle: cm.title ?? '',
      cardCategories: Array.isArray(cm.categories) ? cm.categories.join(', ') : (cm.categories ?? ''),
      cardAlt: cm.alt ?? '',
      title: tr.title ?? '',
      category: tr.category ?? '',
      heroAlt: tr.heroAlt ?? '',
      summary: tr.summary ?? '',
      facts: tr.facts?.length ? tr.facts.map((f) => ({ ...f })) : [{ label: '', value: '' }, { label: '', value: '' }],
      galleryAlt: tr.galleryAlt ? [...tr.galleryAlt] : [],
      sections: tr.sections?.length ? tr.sections.map((s) => ({ ...s })) : [{ title: '', text: '' }, { title: '', text: '' }],
    });
  });

  heroFile.value = null;
  heroPreview.value = null;
  thumbnailFile.value = null;
  thumbnailPreview.value = null;
  galleryFiles.value = [];
  galleryPreviews.value = [];
  formState.value = IDLE_STATE;
  submitError.value = '';
  activeLang.value = 'en';
  activeView.value = 'edit';
}

async function submitEdit() {
  for (const l of LANGS) {
    const d = perLang[l];
    if (!d.cardTitle || !d.cardCategories || !d.title || !d.category || !d.summary) {
      submitError.value = `Заполните обязательные поля для языка ${l.toUpperCase()}`;
      return;
    }
  }
  formState.value = 'submitting';
  submitError.value = '';
  try {
    let heroUrl = editCurrentHeroUrl.value;
    let thumbnailUrl = editCurrentThumbnailUrl.value;
    let galleryUrls = editCurrentGalleryUrls.value;
    const slug = editingProjectSlug.value;
    const newFileCount = (heroFile.value ? 1 : 0) + (thumbnailFile.value ? 1 : 0) + galleryFiles.value.length;
    uploadProgress.value = { done: 0, total: newFileCount };
    if (heroFile.value) heroUrl = await uploadFile(`projects/${slug}/hero.${ext(heroFile.value)}`, heroFile.value);
    if (thumbnailFile.value) thumbnailUrl = await uploadFile(`projects/${slug}/thumbnail.${ext(thumbnailFile.value)}`, thumbnailFile.value);
    if (galleryFiles.value.length) {
      galleryUrls = await Promise.all(
        galleryFiles.value.map((f) => uploadFile(`projects/${slug}/gallery/${crypto.randomUUID()}.${ext(f)}`, f)),
      );
    }
    const translationsData = {};
    const cardMetaData = {};
    for (const l of LANGS) {
      const d = perLang[l];
      translationsData[l] = {
        title: d.title, category: d.category, heroAlt: d.heroAlt, summary: d.summary,
        facts: d.facts.filter((f) => f.label || f.value),
        galleryAlt: d.galleryAlt,
        sections: d.sections.filter((s) => s.title || s.text),
      };
      cardMetaData[l] = {
        title: d.cardTitle,
        categories: d.cardCategories.split(',').map((s) => s.trim()).filter(Boolean),
        alt: d.cardAlt || d.cardTitle,
      };
    }
    const { error: updateError } = await supabase.from('projects').update({
      status: statusInput.value, large: largeInput.value,
      hero_url: heroUrl, thumbnail_url: thumbnailUrl, gallery_urls: galleryUrls,
      translations: translationsData, card_meta: cardMetaData,
    }).eq('id', editingProjectId.value);
    if (updateError) throw new Error(updateError.message);
    formState.value = SUCCESS_STATE;
    emit('projects-updated');
    fetchProjects();
  } catch (err) {
    submitError.value = err.message;
    formState.value = 'error';
  }
}

const session = ref(null);
const loginEmail = ref('');
const loginPassword = ref('');
const loginError = ref('');
const loginLoading = ref(false);

const SUCCESS_STATE = 'success';
const IDLE_STATE = 'idle';
const formState = ref(IDLE_STATE); // idle | submitting | success | error
const submitError = ref('');
const uploadProgress = ref({ done: 0, total: 0 });

const LANGS = ['en', 'kz', 'ru'];
const STATUS_OPTIONS = ['built', 'concept', 'sketch'];
const activeLang = ref('en');

const slugInput = ref('');
const statusInput = ref('built');
const largeInput = ref(false);

const heroFile = ref(null);
const heroPreview = ref(null);
const thumbnailFile = ref(null);
const thumbnailPreview = ref(null);
const galleryFiles = ref([]);
const galleryPreviews = ref([]);

const perLang = reactive({
  en: emptyLang(),
  kz: emptyLang(),
  ru: emptyLang(),
});

function emptyLang() {
  return {
    cardTitle: '',
    cardCategories: '',
    cardAlt: '',
    title: '',
    category: '',
    heroAlt: '',
    summary: '',
    facts: [
      { label: '', value: '' },
      { label: '', value: '' },
      { label: '', value: '' },
      { label: '', value: '' },
    ],
    galleryAlt: [],
    sections: [{ title: '', text: '' }, { title: '', text: '' }],
  };
}

function resetForm() {
  slugInput.value = '';
  statusInput.value = 'built';
  largeInput.value = false;
  heroFile.value = null;
  heroPreview.value = null;
  thumbnailFile.value = null;
  thumbnailPreview.value = null;
  galleryFiles.value = [];
  galleryPreviews.value.forEach((u) => URL.revokeObjectURL(u));
  galleryPreviews.value = [];
  LANGS.forEach((l) => Object.assign(perLang[l], emptyLang()));
  formState.value = IDLE_STATE;
  submitError.value = '';
  uploadProgress.value = { done: 0, total: 0 };
}

const objectUrls = [];
onBeforeUnmount(() => {
  objectUrls.forEach((u) => URL.revokeObjectURL(u));
});

function mkPreview(file) {
  const url = URL.createObjectURL(file);
  objectUrls.push(url);
  return url;
}

function onHeroChange(e) {
  heroFile.value = e.target.files[0] ?? null;
  heroPreview.value = heroFile.value ? mkPreview(heroFile.value) : null;
}

function onThumbnailChange(e) {
  thumbnailFile.value = e.target.files[0] ?? null;
  thumbnailPreview.value = thumbnailFile.value ? mkPreview(thumbnailFile.value) : null;
}

function onGalleryChange(e) {
  const files = Array.from(e.target.files);
  galleryPreviews.value.forEach((u) => URL.revokeObjectURL(u));
  galleryFiles.value = files;
  galleryPreviews.value = files.map(mkPreview);
  LANGS.forEach((l) => {
    perLang[l].galleryAlt = files.map(() => '');
  });
}

function addFact(lang) {
  perLang[lang].facts.push({ label: '', value: '' });
}
function removeFact(lang, i) {
  perLang[lang].facts.splice(i, 1);
}
function addSection(lang) {
  perLang[lang].sections.push({ title: '', text: '' });
}
function removeSection(lang, i) {
  perLang[lang].sections.splice(i, 1);
}

async function login() {
  loginError.value = '';
  loginLoading.value = true;
  const { error } = await supabase.auth.signInWithPassword({
    email: loginEmail.value,
    password: loginPassword.value,
  });
  loginLoading.value = false;
  if (error) loginError.value = error.message;
}

async function logout() {
  await supabase.auth.signOut();
}

function validate() {
  if (!/^[a-z0-9-]+$/.test(slugInput.value)) return 'Slug: только строчные буквы, цифры, дефис';
  if (!heroFile.value) return 'Загрузите hero-изображение';
  if (!thumbnailFile.value) return 'Загрузите thumbnail';
  for (const l of LANGS) {
    const d = perLang[l];
    if (!d.cardTitle || !d.cardCategories || !d.title || !d.category || !d.summary) {
      return `Заполните обязательные поля для языка ${l.toUpperCase()}`;
    }
  }
  return null;
}

function ext(file) {
  return file.name.split('.').pop().toLowerCase();
}

async function uploadFile(path, file) {
  const { error } = await supabase.storage.from('project-assets').upload(path, file, { upsert: true });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  uploadProgress.value.done += 1;
  return supabase.storage.from('project-assets').getPublicUrl(path).data.publicUrl;
}

async function submit() {
  const validationError = validate();
  if (validationError) {
    submitError.value = validationError;
    return;
  }

  // check slug uniqueness
  const { data: existing } = await supabase.from('projects').select('id').eq('slug', slugInput.value).maybeSingle();
  if (existing) {
    submitError.value = `Проект со slug "${slugInput.value}" уже существует`;
    return;
  }

  formState.value = 'submitting';
  submitError.value = '';

  const slug = slugInput.value;
  const totalFiles = 2 + galleryFiles.value.length;
  uploadProgress.value = { done: 0, total: totalFiles };

  try {
    const heroUrl = await uploadFile(`projects/${slug}/hero.${ext(heroFile.value)}`, heroFile.value);
    const thumbnailUrl = await uploadFile(`projects/${slug}/thumbnail.${ext(thumbnailFile.value)}`, thumbnailFile.value);

    const galleryUrls = await Promise.all(
      galleryFiles.value.map((f) => uploadFile(`projects/${slug}/gallery/${crypto.randomUUID()}.${ext(f)}`, f)),
    );

    const translationsData = {};
    const cardMetaData = {};
    for (const l of LANGS) {
      const d = perLang[l];
      translationsData[l] = {
        title: d.title,
        category: d.category,
        heroAlt: d.heroAlt,
        summary: d.summary,
        facts: d.facts.filter((f) => f.label || f.value),
        galleryAlt: d.galleryAlt,
        sections: d.sections.filter((s) => s.title || s.text),
      };
      cardMetaData[l] = {
        title: d.cardTitle,
        categories: d.cardCategories.split(',').map((s) => s.trim()).filter(Boolean),
        alt: d.cardAlt || d.cardTitle,
      };
    }

    const { error: insertError } = await supabase.from('projects').insert({
      slug,
      status: statusInput.value,
      large: largeInput.value,
      hero_url: heroUrl,
      thumbnail_url: thumbnailUrl,
      gallery_urls: galleryUrls,
      translations: translationsData,
      card_meta: cardMetaData,
    });

    if (insertError) throw new Error(insertError.message);

    formState.value = SUCCESS_STATE;
    emit('projects-updated');
    fetchProjects();
  } catch (err) {
    submitError.value = err.message;
    formState.value = 'error';
  }
}

onMounted(() => {
  supabase.auth.getSession().then(({ data }) => {
    session.value = data.session;
    if (data.session) fetchProjects();
  });
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
    session.value = s;
    if (s) fetchProjects();
  });
  onBeforeUnmount(() => subscription.unsubscribe());
});
</script>

<template>
  <div class="admin-panel">
    <div class="admin-header">
      <span class="admin-logo">MOST Admin</span>
      <nav v-if="session" class="admin-nav">
        <button type="button" :class="['admin-nav-btn', { active: activeView === 'list' || activeView === 'edit' }]" @click="activeView = 'list'">Проекты</button>
        <button type="button" :class="['admin-nav-btn', { active: activeView === 'add' }]" @click="activeView = 'add'">+ Добавить</button>
      </nav>
      <button v-if="session" type="button" class="admin-signout" @click="logout">Выйти</button>
    </div>

    <!-- Login -->
    <div v-if="!session" class="admin-login">
      <h1>Вход</h1>
      <form @submit.prevent="login">
        <label>Email<input v-model="loginEmail" type="email" autocomplete="email" required></label>
        <label>Пароль<input v-model="loginPassword" type="password" autocomplete="current-password" required></label>
        <p v-if="loginError" class="admin-error">{{ loginError }}</p>
        <button type="submit" :disabled="loginLoading">{{ loginLoading ? 'Вход...' : 'Войти' }}</button>
      </form>
    </div>

    <!-- Success -->
    <div v-else-if="formState === 'success'" class="admin-success">
      <h2>{{ isEditing ? 'Проект обновлён!' : 'Проект добавлен!' }}</h2>
      <p>Slug: <strong>{{ slugInput }}</strong></p>
      <div class="admin-success-actions">
        <a :href="`/${slugInput}`" target="_blank">Посмотреть на сайте</a>
        <button v-if="isEditing" type="button" @click="activeView = 'list'">← К списку</button>
        <button v-else type="button" @click="resetForm">Добавить ещё</button>
      </div>
    </div>

    <!-- Project list -->
    <div v-else-if="activeView === 'list'" class="admin-list-view">
      <div class="admin-list-head">
        <h1>Проекты</h1>
        <button type="button" class="admin-refresh-btn" :disabled="listLoading" @click="fetchProjects">
          {{ listLoading ? 'Загрузка...' : '↻ Обновить' }}
        </button>
      </div>
      <p v-if="listError" class="admin-error">{{ listError }}</p>
      <p v-if="!listLoading && !projectList.length" class="admin-hint">Проектов пока нет. <button type="button" class="admin-link-btn" @click="activeView = 'add'">Добавить первый →</button></p>

      <!-- Migration banner -->
      <div v-if="staticOnlyCount > 0 && migrationState !== 'done'" class="admin-migration-banner">
        <div class="admin-migration-info">
          <strong>{{ staticOnlyCount }} проект{{ staticOnlyCount === 1 ? '' : (staticOnlyCount < 5 ? 'а' : 'ов') }} из i18n.js ещё не в Supabase</strong>
          <span class="admin-field-hint">После миграции все они станут редактируемыми прямо здесь. Изображения останутся как есть — только текст переедет в базу.</span>
        </div>
        <div v-if="!migrationConfirm" class="admin-migration-actions">
          <button type="button" class="admin-action-btn admin-action-btn--migrate" @click="migrationConfirm = true">
            Мигрировать {{ staticOnlyCount }} проектов →
          </button>
        </div>
        <div v-else class="admin-migration-actions">
          <span class="admin-delete-confirm">Записать {{ staticOnlyCount }} проектов в Supabase?</span>
          <button type="button" class="admin-action-btn admin-action-btn--danger"
            :disabled="migrationState === 'running'" @click="runMigration">
            {{ migrationState === 'running' ? 'Идёт миграция...' : 'Да, запустить' }}
          </button>
          <button type="button" class="admin-action-btn" @click="migrationConfirm = false">Отмена</button>
        </div>
        <p v-if="migrationError" class="admin-error">{{ migrationError }}</p>
      </div>
      <div v-else-if="migrationState === 'done'" class="admin-migration-done">
        ✓ Миграция завершена — все проекты теперь в Supabase
      </div>

      <div v-if="projectList.length" class="admin-project-table">
        <div class="admin-project-row admin-project-row--head">
          <span>Slug</span>
          <span>Статус</span>
          <span>Источник</span>
          <span></span>
        </div>
        <div v-for="p in projectList" :key="p.slug" class="admin-project-row" :class="{ 'is-archived': p.archived }">
          <span class="admin-project-slug">
            <a v-if="!p.archived" :href="`/${p.slug}`" target="_blank" class="admin-project-link">{{ p.slug }} ↗</a>
            <span v-else class="admin-project-slug-muted">{{ p.slug }}</span>
          </span>
          <span>
            <span class="admin-status-badge" :class="p.archived ? 'admin-status-badge--archived' : `admin-status-badge--${p.status}`">
              {{ p.archived ? 'archived' : p.status }}
            </span>
          </span>
          <span class="admin-project-source">{{ p.source === 'db' ? 'Supabase' : 'i18n.js' }}</span>
          <span class="admin-project-actions">
            <button v-if="p.source === 'db'" type="button" class="admin-action-btn admin-action-btn--edit"
              title="Редактировать проект" @click="openEdit(p)">
              Изменить
            </button>
            <button type="button"
              :class="['admin-action-btn', p.archived ? 'admin-action-btn--restore' : 'admin-action-btn--archive']"
              :title="p.archived ? 'Вернуть проект на сайт' : 'Скрыть с сайта (можно восстановить)'"
              @click="toggleArchive(p)">
              {{ p.archived ? 'Восстановить' : 'Архивировать' }}
            </button>
            <template v-if="p.source === 'db'">
              <template v-if="deleteConfirmSlug === p.slug">
                <span class="admin-delete-confirm">Удалить навсегда?</span>
                <button type="button" class="admin-action-btn admin-action-btn--danger" @click="deleteProject(p)">Да</button>
                <button type="button" class="admin-action-btn" @click="deleteConfirmSlug = null">Отмена</button>
              </template>
              <button v-else type="button" class="admin-action-btn admin-action-btn--delete"
                title="Удалить из Supabase безвозвратно" @click="deleteConfirmSlug = p.slug">
                Удалить
              </button>
            </template>
          </span>
        </div>
      </div>
    </div>

    <!-- Add / Edit form -->
    <form v-else-if="activeView === 'add' || activeView === 'edit'" class="admin-form" @submit.prevent="isEditing ? submitEdit() : submit()">
      <div class="admin-form-topbar">
        <h1>{{ isEditing ? `Редактирование: ${editingProjectSlug}` : 'Добавить проект' }}</h1>
        <button v-if="isEditing" type="button" class="admin-action-btn" @click="activeView = 'list'">← К списку</button>
      </div>
      <p class="admin-form-desc">{{ isEditing ? 'Измените нужные поля и нажмите «Сохранить изменения».' : 'Заполните все обязательные поля (отмечены *) на всех трёх языках, затем нажмите «Добавить проект».' }}</p>

      <p v-if="submitError" class="admin-error admin-error--top">{{ submitError }}</p>

      <div v-if="formState === 'submitting'" class="admin-progress">
        Загрузка {{ uploadProgress.done }}/{{ uploadProgress.total }} файлов...
      </div>

      <!-- Common fields -->
      <section class="admin-section">
        <h2>Основное</h2>
        <label>
          Slug {{ isEditing ? '' : '*' }}
          <span class="admin-field-hint">{{ isEditing ? 'Slug нельзя изменить после создания.' : 'Уникальный адрес проекта в URL. Только латинские буквы, цифры и дефис. Пример: park-almaty → сайт.ру/park-almaty' }}</span>
          <input v-model="slugInput" type="text" pattern="^[a-z0-9-]+" placeholder="park-almaty" :readonly="isEditing" :required="!isEditing" :class="{ 'admin-input-readonly': isEditing }">
        </label>
        <label>
          Статус
          <span class="admin-field-hint">Как отображать проект на сайте: <strong>built</strong> — построен, <strong>concept</strong> — концепт, <strong>sketch</strong> — эскиз.</span>
          <select v-model="statusInput">
            <option v-for="s in STATUS_OPTIONS" :key="s" :value="s">{{ s }}</option>
          </select>
        </label>
        <label class="admin-checkbox">
          <input v-model="largeInput" type="checkbox"> Большая карточка
          <span class="admin-field-hint admin-field-hint--inline">Если включено — карточка проекта займёт двойную ширину в сетке на странице проектов.</span>
        </label>
      </section>

      <!-- Images -->
      <section class="admin-section">
        <h2>Изображения</h2>
        <p class="admin-section-desc">Все изображения загружаются в облако автоматически при сохранении проекта.</p>
        <div class="admin-file-row">
          <div class="admin-file-block">
            <span>Hero {{ isEditing ? '' : '*' }} <span class="admin-field-hint admin-field-hint--inline">Главный баннер на странице проекта. Широкий горизонтальный снимок, мин. 1600px шириной.</span></span>
            <div v-if="isEditing && editCurrentHeroUrl" class="admin-current-image">
              <img :src="editCurrentHeroUrl" class="admin-preview" alt="текущий hero">
              <span class="admin-field-hint">Текущее изображение. Загрузите новое чтобы заменить.</span>
            </div>
            <input type="file" accept="image/*" @change="onHeroChange">
            <img v-if="heroPreview" :src="heroPreview" class="admin-preview admin-preview--new" alt="новый hero">
          </div>
          <div class="admin-file-block">
            <span>Thumbnail {{ isEditing ? '' : '*' }} <span class="admin-field-hint admin-field-hint--inline">Превью-карточка на странице всех проектов. Квадратное или близкое к нему, мин. 600×600px.</span></span>
            <div v-if="isEditing && editCurrentThumbnailUrl" class="admin-current-image">
              <img :src="editCurrentThumbnailUrl" class="admin-preview" alt="текущий thumbnail">
              <span class="admin-field-hint">Текущее изображение. Загрузите новое чтобы заменить.</span>
            </div>
            <input type="file" accept="image/*" @change="onThumbnailChange">
            <img v-if="thumbnailPreview" :src="thumbnailPreview" class="admin-preview admin-preview--new" alt="новый thumbnail">
          </div>
        </div>
        <div class="admin-file-block">
          <span>Галерея <span class="admin-field-hint admin-field-hint--inline">{{ isEditing ? 'Загрузите новые фото чтобы заменить всю галерею целиком.' : 'Слайдер на странице проекта. Выберите несколько файлов одновременно (Ctrl+клик / Cmd+клик).' }}</span></span>
          <div v-if="isEditing && editCurrentGalleryUrls.length" class="admin-gallery-previews">
            <img v-for="(url, i) in editCurrentGalleryUrls" :key="i" :src="url" class="admin-preview-sm" alt="">
          </div>
          <input type="file" accept="image/*" multiple @change="onGalleryChange">
          <div v-if="galleryPreviews.length" class="admin-gallery-previews">
            <img v-for="(url, i) in galleryPreviews" :key="i" :src="url" class="admin-preview-sm admin-preview-sm--new" alt="">
          </div>
        </div>
      </section>

      <!-- Per-lang tabs -->
      <section class="admin-section">
        <h2>Текст по языкам</h2>
        <p class="admin-section-desc">Заполните все три вкладки (EN, KZ, RU). Переключайте языки кнопками ниже — введённый текст сохраняется при переключении.</p>
        <div class="admin-lang-tabs">
          <button v-for="l in LANGS" :key="l" type="button"
            :class="['admin-lang-tab', { active: activeLang === l }]" @click="activeLang = l">
            {{ l.toUpperCase() }}
          </button>
        </div>

        <div v-for="l in LANGS" v-show="activeLang === l" :key="l" class="admin-lang-block">
          <h3>Карточка <span class="admin-h3-hint">— то, что видно в списке проектов</span></h3>
          <label>
            Название в карточке *
            <span class="admin-field-hint">Короткое название, которое выводится под превью на странице /projects.</span>
            <input v-model="perLang[l].cardTitle" type="text" :placeholder="l === 'ru' ? 'Парк Алматы' : l === 'kz' ? 'Алматы паркі' : 'Almaty Park'" required>
          </label>
          <label>
            Категории *
            <span class="admin-field-hint">Теги через запятую. Используются для фильтрации. Пример: <code>built-up, landscape</code></span>
            <input v-model="perLang[l].cardCategories" type="text" placeholder="built-up, landscape">
          </label>
          <label>
            Alt текст карточки
            <span class="admin-field-hint">Описание картинки для людей с ограниченным зрением и поисковиков. Если пусто — подставится название.</span>
            <input v-model="perLang[l].cardAlt" type="text" :placeholder="l === 'ru' ? 'Вид на парк с высоты птичьего полёта' : ''">
          </label>

          <h3>Страница проекта <span class="admin-h3-hint">— детальная страница /{{ slugInput || 'slug' }}</span></h3>
          <label>
            Название *
            <span class="admin-field-hint">Заголовок H1 на странице проекта. Может быть длиннее, чем название в карточке.</span>
            <input v-model="perLang[l].title" type="text" :placeholder="l === 'ru' ? 'Центральный парк Алматы' : ''" required>
          </label>
          <label>
            Категория *
            <span class="admin-field-hint">Одна строка под заголовком. Например: <em>Ландшафтный дизайн</em> или <em>Жилой комплекс</em>.</span>
            <input v-model="perLang[l].category" type="text" :placeholder="l === 'ru' ? 'Ландшафтный дизайн' : ''" required>
          </label>
          <label>
            Alt текст hero
            <span class="admin-field-hint">Описание главного баннера для поисковиков и скринридеров.</span>
            <input v-model="perLang[l].heroAlt" type="text" :placeholder="l === 'ru' ? 'Панорама парка летом' : ''">
          </label>
          <label>
            Summary *
            <span class="admin-field-hint">Короткое описание проекта (2–4 предложения). Выводится в самом верху страницы под заголовком.</span>
            <textarea v-model="perLang[l].summary" rows="3" :placeholder="l === 'ru' ? 'Проект реновации центрального парка...' : ''" required></textarea>
          </label>

          <h3>Факты <span class="admin-h3-hint">— таблица с характеристиками проекта</span></h3>
          <p class="admin-hint">Пары «метка / значение». Например: <em>Площадь</em> → <em>4,5 га</em>, <em>Год</em> → <em>2024</em>.</p>
          <div v-for="(fact, i) in perLang[l].facts" :key="i" class="admin-repeater-row">
            <input v-model="fact.label" type="text" :placeholder="l === 'ru' ? 'Площадь' : 'Label'">
            <input v-model="fact.value" type="text" :placeholder="l === 'ru' ? '4,5 га' : 'Value'">
            <button type="button" class="admin-remove-btn" title="Удалить факт" @click="removeFact(l, i)">×</button>
          </div>
          <button type="button" class="admin-add-btn" @click="addFact(l)">+ Добавить факт</button>

          <h3>Alt тексты галереи <span class="admin-h3-hint">— по одному на каждое фото</span></h3>
          <p class="admin-hint">Описание каждого фото для поисковиков. Порядок совпадает с порядком загруженных файлов галереи.</p>
          <div v-for="(_, i) in galleryFiles" :key="i" class="admin-gallery-alt-row">
            <span class="admin-gallery-thumb-num">{{ i + 1 }}</span>
            <input v-model="perLang[l].galleryAlt[i]" type="text" :placeholder="`Описание фото ${i + 1}`">
          </div>
          <p v-if="!galleryFiles.length" class="admin-hint">⬆ Сначала загрузите фотографии галереи в разделе «Изображения».</p>

          <h3>Секции <span class="admin-h3-hint">— текстовые блоки на странице проекта</span></h3>
          <p class="admin-hint">Каждая секция — это заголовок + абзац текста. Добавьте столько, сколько нужно.</p>
          <div v-for="(section, i) in perLang[l].sections" :key="i" class="admin-section-block">
            <label>
              Заголовок секции {{ i + 1 }}
              <input v-model="section.title" type="text" :placeholder="l === 'ru' ? 'Концепция' : 'Section title'">
            </label>
            <label>
              Текст секции {{ i + 1 }}
              <textarea v-model="section.text" rows="4" :placeholder="l === 'ru' ? 'Основная идея проекта заключается в...' : 'Section text'"></textarea>
            </label>
            <button type="button" class="admin-remove-btn" @click="removeSection(l, i)">× Удалить секцию</button>
          </div>
          <button type="button" class="admin-add-btn" @click="addSection(l)">+ Добавить секцию</button>
        </div>
      </section>

      <div class="admin-submit-area">
        <p class="admin-hint">{{ isEditing ? 'Изображения необязательны — если не загружать, останутся текущие.' : 'Перед отправкой убедитесь, что заполнены все три языка (EN, KZ, RU) и загружены hero + thumbnail.' }}</p>
        <button type="submit" class="admin-submit" :disabled="formState === 'submitting'">
          {{ formState === 'submitting' ? 'Сохранение...' : (isEditing ? 'Сохранить изменения' : 'Добавить проект') }}
        </button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.admin-panel {
  min-height: 100vh;
  background: #0a0a0a;
  color: #e8e8e8;
  font-family: inherit;
}

.admin-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 2rem;
  background: #111;
  border-bottom: 1px solid #222;
  position: sticky;
  top: 0;
  z-index: 10;
}

.admin-logo {
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #fff;
}

.admin-signout {
  background: none;
  border: 1px solid #444;
  color: #aaa;
  padding: 0.3rem 0.8rem;
  cursor: pointer;
  font-size: 0.8rem;
  transition: border-color 0.2s, color 0.2s;
}
.admin-signout:hover { border-color: #888; color: #fff; }

.admin-login {
  max-width: 380px;
  margin: 6rem auto;
  padding: 2rem;
  background: #111;
  border: 1px solid #222;
}
.admin-login h1 { margin: 0 0 1.5rem; font-size: 1.4rem; }
.admin-login form { display: flex; flex-direction: column; gap: 1rem; }
.admin-login label { display: flex; flex-direction: column; gap: 0.3rem; font-size: 0.85rem; color: #aaa; }
.admin-login input {
  background: #1a1a1a;
  border: 1px solid #333;
  color: #e8e8e8;
  padding: 0.6rem 0.8rem;
  font-size: 0.95rem;
  outline: none;
  transition: border-color 0.2s;
}
.admin-login input:focus { border-color: #555; }
.admin-login button {
  background: #e8e8e8;
  color: #0a0a0a;
  border: none;
  padding: 0.7rem;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}
.admin-login button:hover { background: #fff; }
.admin-login button:disabled { background: #555; color: #999; cursor: not-allowed; }

.admin-success {
  max-width: 480px;
  margin: 6rem auto;
  padding: 2rem;
  background: #111;
  border: 1px solid #222;
  text-align: center;
}
.admin-success h2 { margin: 0 0 0.5rem; }
.admin-success-actions { display: flex; gap: 1rem; justify-content: center; margin-top: 1.5rem; flex-wrap: wrap; }
.admin-success-actions a, .admin-success-actions button {
  padding: 0.6rem 1.2rem;
  border: 1px solid #555;
  color: #e8e8e8;
  text-decoration: none;
  background: none;
  cursor: pointer;
  font-size: 0.9rem;
  transition: border-color 0.2s, background 0.2s;
}
.admin-success-actions a:hover, .admin-success-actions button:hover { border-color: #aaa; background: #1a1a1a; }

.admin-form {
  max-width: 860px;
  margin: 0 auto;
  padding: 2.5rem 2rem 4rem;
  display: flex;
  flex-direction: column;
  gap: 0;
}
.admin-form h1 { margin: 0 0 2rem; font-size: 1.6rem; }

.admin-section {
  border-top: 1px solid #222;
  padding: 1.5rem 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.admin-section h2 { margin: 0 0 0.5rem; font-size: 1rem; text-transform: uppercase; letter-spacing: 0.08em; color: #aaa; }
.admin-section h3 { margin: 0.5rem 0 0.25rem; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.06em; color: #666; }

.admin-form label {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  font-size: 0.85rem;
  color: #aaa;
}
.admin-checkbox { flex-direction: row; align-items: center; gap: 0.5rem; color: #e8e8e8; }
.admin-checkbox input { width: auto; }

.admin-form input[type="text"],
.admin-form input[type="email"],
.admin-form select,
.admin-form textarea {
  background: #1a1a1a;
  border: 1px solid #2a2a2a;
  color: #e8e8e8;
  padding: 0.55rem 0.8rem;
  font-size: 0.9rem;
  font-family: inherit;
  outline: none;
  width: 100%;
  box-sizing: border-box;
  transition: border-color 0.2s;
}
.admin-form input:focus, .admin-form select:focus, .admin-form textarea:focus { border-color: #555; }
.admin-form textarea { resize: vertical; }
.admin-form select { appearance: none; cursor: pointer; }

.admin-file-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.admin-file-block { display: flex; flex-direction: column; gap: 0.5rem; }
.admin-file-block span { font-size: 0.85rem; color: #aaa; }
.admin-preview { width: 100%; max-height: 160px; object-fit: cover; border: 1px solid #222; }
.admin-gallery-previews { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.5rem; }
.admin-preview-sm { width: 80px; height: 60px; object-fit: cover; border: 1px solid #222; }

.admin-lang-tabs { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
.admin-lang-tab {
  background: none;
  border: 1px solid #333;
  color: #777;
  padding: 0.4rem 1rem;
  cursor: pointer;
  font-size: 0.85rem;
  letter-spacing: 0.06em;
  transition: border-color 0.2s, color 0.2s;
}
.admin-lang-tab.active { border-color: #e8e8e8; color: #e8e8e8; }

.admin-lang-block { display: flex; flex-direction: column; gap: 0.75rem; }

.admin-repeater-row { display: grid; grid-template-columns: 1fr 1fr auto; gap: 0.5rem; align-items: center; }
.admin-gallery-alt-row { display: grid; grid-template-columns: 2rem 1fr; gap: 0.5rem; align-items: center; }
.admin-gallery-thumb-num { font-size: 0.75rem; color: #555; text-align: right; }
.admin-section-block { display: flex; flex-direction: column; gap: 0.5rem; border: 1px solid #1a1a1a; padding: 0.75rem; }
.admin-remove-btn {
  background: none;
  border: 1px solid #3a1a1a;
  color: #cc6666;
  padding: 0.3rem 0.6rem;
  cursor: pointer;
  font-size: 0.8rem;
  transition: border-color 0.2s;
  align-self: flex-start;
}
.admin-remove-btn:hover { border-color: #cc4444; }
.admin-add-btn {
  background: none;
  border: 1px solid #1a3a1a;
  color: #66cc66;
  padding: 0.4rem 0.8rem;
  cursor: pointer;
  font-size: 0.8rem;
  align-self: flex-start;
  transition: border-color 0.2s;
}
.admin-add-btn:hover { border-color: #44aa44; }

.admin-hint { font-size: 0.8rem; color: #555; margin: 0; }

.admin-form-desc {
  font-size: 0.85rem;
  color: #777;
  margin: -1rem 0 1.5rem;
  line-height: 1.5;
}

.admin-section-desc {
  font-size: 0.82rem;
  color: #666;
  margin: -0.25rem 0 0.25rem;
  line-height: 1.5;
}

.admin-field-hint {
  display: block;
  font-size: 0.78rem;
  color: #5a5a5a;
  font-weight: 400;
  line-height: 1.4;
  margin-bottom: 0.2rem;
}
.admin-field-hint--inline {
  display: inline;
  margin-left: 0.3em;
}
.admin-field-hint code, .admin-field-hint em, .admin-field-hint strong {
  color: #888;
  font-style: normal;
}

.admin-h3-hint {
  font-size: 0.75rem;
  color: #4a4a4a;
  font-weight: 400;
  text-transform: none;
  letter-spacing: 0;
  margin-left: 0.3em;
}

.admin-submit-area {
  margin-top: 2rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  align-items: flex-start;
}

.admin-form-topbar {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.5rem;
}
.admin-form-topbar h1 { margin: 0; font-size: 1.4rem; font-family: monospace; }

.admin-input-readonly {
  opacity: 0.5;
  cursor: not-allowed;
}

.admin-current-image { margin-bottom: 0.4rem; }
.admin-preview--new { outline: 2px solid #555577; }
.admin-preview-sm--new { outline: 2px solid #555577; }

.admin-migration-banner {
  margin-bottom: 1.5rem;
  border: 1px solid #2a2a3a;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  background: #0d0d14;
}
.admin-migration-info { display: flex; flex-direction: column; gap: 0.25rem; }
.admin-migration-info strong { font-size: 0.9rem; color: #aaaadd; }
.admin-migration-actions { display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; }
.admin-migration-done { font-size: 0.85rem; color: #66cc66; margin-bottom: 1rem; }
.admin-action-btn--edit { border-color: #1a2a3a; color: #6688aa; }
.admin-action-btn--edit:hover { border-color: #3355aa; color: #88aadd; }
.admin-action-btn--migrate { border-color: #2a2a4a; color: #8888cc; font-size: 0.8rem; }
.admin-action-btn--migrate:hover { border-color: #4444aa; color: #aaaaff; }
.admin-error {
  background: #1a0a0a;
  border: 1px solid #551111;
  color: #cc6666;
  padding: 0.7rem 1rem;
  font-size: 0.85rem;
}
.admin-error--top { margin-bottom: 1rem; }
.admin-progress {
  background: #111;
  border: 1px solid #333;
  padding: 0.7rem 1rem;
  font-size: 0.85rem;
  color: #aaa;
}

.admin-submit {
  background: #e8e8e8;
  color: #0a0a0a;
  border: none;
  padding: 0.9rem 2rem;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  align-self: flex-start;
  transition: background 0.2s;
  letter-spacing: 0.04em;
}
.admin-submit:hover { background: #fff; }
.admin-submit:disabled { background: #444; color: #888; cursor: not-allowed; }

.admin-nav {
  display: flex;
  gap: 0.25rem;
  margin-right: auto;
  margin-left: 2rem;
}
.admin-nav-btn {
  background: none;
  border: 1px solid transparent;
  color: #666;
  padding: 0.35rem 0.9rem;
  cursor: pointer;
  font-size: 0.85rem;
  letter-spacing: 0.04em;
  transition: color 0.2s, border-color 0.2s;
}
.admin-nav-btn:hover { color: #ccc; }
.admin-nav-btn.active { color: #e8e8e8; border-color: #444; }

.admin-list-view {
  max-width: 860px;
  margin: 0 auto;
  padding: 2.5rem 2rem 4rem;
}
.admin-list-head {
  display: flex;
  align-items: baseline;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}
.admin-list-head h1 { margin: 0; font-size: 1.6rem; }
.admin-refresh-btn {
  background: none;
  border: 1px solid #333;
  color: #777;
  padding: 0.3rem 0.8rem;
  cursor: pointer;
  font-size: 0.8rem;
  transition: color 0.2s, border-color 0.2s;
}
.admin-refresh-btn:hover { color: #ccc; border-color: #666; }
.admin-refresh-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.admin-link-btn {
  background: none;
  border: none;
  color: #888;
  cursor: pointer;
  font-size: 0.8rem;
  padding: 0;
  text-decoration: underline;
}
.admin-link-btn:hover { color: #ccc; }

.admin-project-table {
  border: 1px solid #1e1e1e;
}
.admin-project-row {
  display: grid;
  grid-template-columns: 1fr 7rem 8rem auto;
  gap: 1rem;
  align-items: center;
  padding: 0.7rem 1rem;
  border-bottom: 1px solid #1a1a1a;
  transition: background 0.15s;
}
.admin-project-row:last-child { border-bottom: none; }
.admin-project-row:not(.admin-project-row--head):hover { background: #111; }
.admin-project-row--head {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #555;
  background: #0d0d0d;
}
.admin-project-row.is-archived { opacity: 0.55; }

.admin-project-slug { font-size: 0.9rem; }
.admin-project-link { color: #e8e8e8; text-decoration: none; font-family: monospace; font-size: 0.85rem; }
.admin-project-link:hover { color: #fff; text-decoration: underline; }
.admin-project-slug-muted { color: #555; font-family: monospace; font-size: 0.85rem; }
.admin-project-date { font-size: 0.8rem; color: #666; }
.admin-project-source { font-size: 0.75rem; color: #555; font-family: monospace; }

.admin-status-badge {
  font-size: 0.72rem;
  padding: 0.15rem 0.5rem;
  border: 1px solid #333;
  color: #888;
  letter-spacing: 0.04em;
}
.admin-status-badge--built { border-color: #1a3a1a; color: #66cc66; }
.admin-status-badge--concept { border-color: #2a2a3a; color: #7788cc; }
.admin-status-badge--sketch { border-color: #2a2a2a; color: #888; }
.admin-status-badge--archived { border-color: #2a1a1a; color: #774444; }

.admin-project-actions {
  display: flex;
  gap: 0.4rem;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.admin-action-btn {
  background: none;
  border: 1px solid #2a2a2a;
  color: #888;
  padding: 0.25rem 0.6rem;
  cursor: pointer;
  font-size: 0.75rem;
  white-space: nowrap;
  transition: border-color 0.15s, color 0.15s;
}
.admin-action-btn:hover { border-color: #555; color: #ccc; }
.admin-action-btn--archive:hover { border-color: #555577; color: #aaaadd; }
.admin-action-btn--restore:hover { border-color: #1a4a1a; color: #66cc66; }
.admin-action-btn--delete { border-color: #2a1a1a; color: #774444; }
.admin-action-btn--delete:hover { border-color: #553333; color: #cc6666; }
.admin-action-btn--danger { border-color: #553333; color: #cc4444; }
.admin-action-btn--danger:hover { border-color: #cc3333; color: #ff5555; }
.admin-delete-confirm { font-size: 0.75rem; color: #cc6666; }

@media (max-width: 600px) {
  .admin-file-row { grid-template-columns: 1fr; }
  .admin-repeater-row { grid-template-columns: 1fr; }
  .admin-project-row { grid-template-columns: 1fr; gap: 0.4rem; }
  .admin-project-row--head { display: none; }
  .admin-project-actions { justify-content: flex-start; }
}
</style>
