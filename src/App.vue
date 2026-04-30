<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { languages, projectTypeOrder, translations } from './i18n';

const isMenuOpen = ref(false);
const isHeaderSolid = ref(false);
const currentLanguage = ref('en');
const currentPath = ref('/');
const activeProjectSlide = ref(0);
const contactsMapStatus = ref('idle');
const activeType = ref('all');
let revealObserver;
let projectSliderTimer;
const homeHeroEl = ref(null);
const homeProjectsEl = ref(null);

const t = computed(() => translations[currentLanguage.value]);
const projectSlug = computed(() => currentPath.value.split('/').filter(Boolean)[0] || '');
const isAboutPage = computed(() => projectSlug.value === 'about');
const isContactsPage = computed(() => projectSlug.value === 'contacts');
const isProjectsPage = computed(() => projectSlug.value === 'projects');
const currentProject = computed(() => t.value.projectPages?.[projectSlug.value] || null);
const isProjectPage = computed(() => Boolean(currentProject.value));
const homePathPrefix = computed(() => (currentPath.value === '/' ? '' : '/'));

const navItems = computed(() => [
  { label: t.value.nav.project, href: '/projects' },
  { label: t.value.nav.about, href: '/about' },
  { label: t.value.nav.contacts, href: '/contacts' },
]);


const publicAsset = (path) => `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`;
const sourceAsset = (path) => new URL(`./public/${path.replace(/^\/+/, '')}`, import.meta.url).href;
const logoWhite = publicAsset('white.svg');
const heroImage = sourceAsset('View_02,2.jpg');
const heroMobileImage = sourceAsset('View_02,2.jpg');

const serviceImages = [
  sourceAsset('sections/services/1.jpg'),
  sourceAsset('sections/services/2.jpg'),
  sourceAsset('sections/services/3.jpg'),
  sourceAsset('sections/services/4.jpg'),
];

const projectThumbs = [
  publicAsset('meliora/general-road.jpg'),
  sourceAsset('sections/about-copy/1.jpg'),
  sourceAsset('sections/services/3.jpg'),
  sourceAsset('sections/about-copy/2.jpg'),
  sourceAsset('sections/services/2.jpg'),
  sourceAsset('sections/about-copy/3.jpg'),
];

const projectImageGroups = {
  meliora: {
    hero: publicAsset('meliora/general-road.jpg'),
    gallery: [
      publicAsset('meliora/general-park.jpg'),
      publicAsset('meliora/evening-front.jpg'),
      publicAsset('meliora/ev-view-mt-warm.jpg'),
      publicAsset('meliora/front-terras.jpg'),
      publicAsset('meliora/back-ter.jpg'),
      publicAsset('meliora/0-f.jpg'),
      publicAsset('meliora/3-f.jpg'),
      publicAsset('meliora/4-f.jpg'),
      publicAsset('meliora/7-f.jpg'),
      publicAsset('meliora/11-f.jpg'),
      publicAsset('meliora/12-f.jpg'),
    ],
  },
  biography: {
    hero: publicAsset('biography/New_01.jpg'),
    gallery: [
      publicAsset('biography/New_02.jpg'),
      publicAsset('biography/View_02_1.jpg'),
      publicAsset('biography/View_02_2.jpg'),
      publicAsset('biography/com_02_day.jpg'),
      publicAsset('biography/Commerce.jpg'),
      publicAsset('biography/Commerce_02.jpg'),
      publicAsset('biography/Commerce_Alley.jpg'),
      publicAsset('biography/bird_commerce_LOGO_19-08-2025.jpg'),
      publicAsset('biography/bird_view_04-25-02-2025.jpg'),
    ],
  },
  naukograd: {
    hero: publicAsset('naukograd/pos_tuzusai.jpg'),
    gallery: [
      publicAsset('naukograd/01_Tehno_Park.jpg'),
      publicAsset('naukograd/Tekhno_Park_02.jpg'),
      publicAsset('naukograd/02_lib_night.jpg'),
      publicAsset('naukograd/lib_day.jpg'),
      publicAsset('naukograd/library.jpg'),
      publicAsset('naukograd/Bird_night_02_02.jpg'),
      publicAsset('naukograd/Bird_view_Lilrary.jpg'),
      publicAsset('naukograd/Bus_view.jpg'),
      publicAsset('naukograd/Univer_01_2.jpg'),
      publicAsset('naukograd/Univer_02_1.jpg'),
    ],
  },
  'raddison-turkestan': {
    hero: publicAsset('raddison-turkestan/pos_tuzusai.jpg'),
    gallery: [
      publicAsset('raddison-turkestan/01_Tehno_Park.jpg'),
      publicAsset('raddison-turkestan/Tekhno_Park_02.jpg'),
      publicAsset('raddison-turkestan/02_lib_night.jpg'),
      publicAsset('raddison-turkestan/lib_day.jpg'),
      publicAsset('raddison-turkestan/library.jpg'),
      publicAsset('raddison-turkestan/Bird_night_02_02.jpg'),
      publicAsset('raddison-turkestan/Bird_view_Lilrary.jpg'),
      publicAsset('raddison-turkestan/Bus_view.jpg'),
      publicAsset('raddison-turkestan/Univer_01_2.jpg'),
      publicAsset('raddison-turkestan/Univer_02_1.jpg'),
    ],
  },
  yubileynyy: {
    hero: sourceAsset('Yubileynyy/21.04_f.jpg'),
    gallery: [
      sourceAsset('Yubileynyy/22.04_f.jpg'),
      sourceAsset('Yubileynyy/3.2_Base1.jpg'),
      sourceAsset('Yubileynyy/5.2_F.jpg'),
      sourceAsset('Yubileynyy/1 (3).jpg'),
      sourceAsset('Yubileynyy/4_F (1).jpg'),
    ],
  },
  'alatau-village': {
    hero: sourceAsset('alatau-village/06.07_23C1_f.jpg'),
    gallery: [
      sourceAsset('alatau-village/09.07_C2_f.jpg'),
      sourceAsset('alatau-village/09.07_C2v2_f1.jpg'),
      sourceAsset('alatau-village/10.07_C3_f1.jpg'),
      sourceAsset('alatau-village/10.07_C4_f.jpg'),
      sourceAsset('alatau-village/11.07_C5_f.jpg'),
      sourceAsset('alatau-village/11.07_C5_f1.jpg'),
      sourceAsset('alatau-village/11.07_C6_f.jpg'),
      sourceAsset('alatau-village/11.07_C6_f1.jpg'),
    ],
  },
  'arkon-city': {
    hero: sourceAsset('arkon-city/Bird_view.jpg'),
    gallery: [
      sourceAsset('arkon-city/Bird_view_2.jpg'),
      sourceAsset('arkon-city/03.jpg'),
      sourceAsset('arkon-city/04.jpg'),
      sourceAsset('arkon-city/Aut.jpg'),
      sourceAsset('arkon-city/Commerce (1).jpg'),
      sourceAsset('arkon-city/Parking.jpg'),
      sourceAsset('arkon-city/Playground.jpg'),
      sourceAsset('arkon-city/winter.jpg'),
    ],
  },
  aulet: {
    hero: sourceAsset('aulet/_SA_Cam-01.jpg'),
    gallery: [
      sourceAsset('aulet/_SA_Cam-02.jpg'),
      sourceAsset('aulet/SA_Cam-03.jpg'),
      sourceAsset('aulet/SA_Cam-03(Night).jpg'),
      sourceAsset('aulet/_SA_Cam-4.jpg'),
      sourceAsset('aulet/Cam-05.jpg'),
      sourceAsset('aulet/Cam-11(kommercia).jpg'),
      sourceAsset('aulet/DJI_0488.jpg'),
    ],
  },
  besagash: {
    hero: sourceAsset('besagash/0012b.jpg'),
    gallery: [
      sourceAsset('besagash/001BA001.jpg'),
      sourceAsset('besagash/00223.jpg'),
      sourceAsset('besagash/002BA001.jpg'),
      sourceAsset('besagash/0031b.jpg'),
      sourceAsset('besagash/0041b.jpg'),
      sourceAsset('besagash/005b.jpg'),
    ],
  },
  enesai: {
    hero: sourceAsset('enesai/view_01.jpg'),
    gallery: [
      sourceAsset('enesai/view_02.jpg'),
      sourceAsset('enesai/view_02,1.jpg'),
      sourceAsset('enesai/View_02,2.jpg'),
      sourceAsset('enesai/view_09.jpg'),
    ],
  },
  'everest-boulevard': {
    hero: sourceAsset('everest-boulevard/bird_boulevard.jpg'),
    gallery: [
      sourceAsset('everest-boulevard/07_view.jpg'),
      sourceAsset('everest-boulevard/KMP_02.jpg'),
      sourceAsset('everest-boulevard/KMP.jpg'),
      sourceAsset('everest-boulevard/View_01 (2).jpg'),
      sourceAsset('everest-boulevard/View_02 (2).jpg'),
      sourceAsset('everest-boulevard/View_04 (1).jpg'),
      sourceAsset('everest-boulevard/View_05 (1).jpg'),
      sourceAsset('everest-boulevard/View_06 (1).jpg'),
      sourceAsset('everest-boulevard/View_06_day.jpg'),
      sourceAsset('everest-boulevard/view_08_01.jpg'),
    ],
  },
  'family-club': {
    hero: sourceAsset('family-club/3.jpg'),
    gallery: [
      sourceAsset('family-club/4.jpg'),
      sourceAsset('family-club/5.jpg'),
      sourceAsset('family-club/1 (1).jpg'),
      sourceAsset('family-club/2 (1).jpg'),
    ],
  },
  'family-comfort': {
    hero: sourceAsset('family-comfort/1_F.jpg'),
    gallery: [
      sourceAsset('family-comfort/2_F.jpg'),
      sourceAsset('family-comfort/3_F (1).jpg'),
      sourceAsset('family-comfort/4_F (2).jpg'),
      sourceAsset('family-comfort/5_F.jpg'),
      sourceAsset('family-comfort/6_F.jpg'),
    ],
  },
  'hayat-city': {
    hero: sourceAsset('hayat-city/view_12.jpg'),
    gallery: [
      sourceAsset('hayat-city/view_01 (4).jpg'),
      sourceAsset('hayat-city/view_02 (4).jpg'),
      sourceAsset('hayat-city/view_03 (2).jpg'),
      sourceAsset('hayat-city/view_04 (2).jpg'),
      sourceAsset('hayat-city/view_05 (2).jpg'),
      sourceAsset('hayat-city/view_06 (3).jpg'),
      sourceAsset('hayat-city/view_07 (1).jpg'),
      sourceAsset('hayat-city/view_08 (1).jpg'),
      sourceAsset('hayat-city/view_09 (2).jpg'),
      sourceAsset('hayat-city/view_10 (1).jpg'),
      sourceAsset('hayat-city/view_11 (1).jpg'),
    ],
  },
  'hayat-park': {
    hero: sourceAsset('hayat-park/01HP001.jpg'),
    gallery: [
      sourceAsset('hayat-park/02HP001.jpg'),
      sourceAsset('hayat-park/011BAG010.jpg'),
      sourceAsset('hayat-park/020BAG002.jpg'),
      sourceAsset('hayat-park/030BAG002.jpg'),
      sourceAsset('hayat-park/040BAG002.jpg'),
      sourceAsset('hayat-park/050BAG020.jpg'),
    ],
  },
  'high-garden': {
    hero: sourceAsset('high-garden/GPIMR005.jpg'),
    gallery: [
      sourceAsset('high-garden/003IMR006.jpg'),
      sourceAsset('high-garden/004IMR006.jpg'),
      sourceAsset('high-garden/008IMR003.jpg'),
    ],
  },
  'jenys-judo-center': {
    hero: sourceAsset('jenys-judo-center/Bird_View_near_3.jpg'),
    gallery: [
      sourceAsset('jenys-judo-center/03b.jpg'),
      sourceAsset('jenys-judo-center/05.jpg'),
      sourceAsset('jenys-judo-center/06_2.jpg'),
      sourceAsset('jenys-judo-center/07.jpg'),
      sourceAsset('jenys-judo-center/08.jpg'),
      sourceAsset('jenys-judo-center/11_D.jpg'),
      sourceAsset('jenys-judo-center/11_N.jpg'),
      sourceAsset('jenys-judo-center/16-2_D_2.jpg'),
      sourceAsset('jenys-judo-center/19_D_2.jpg'),
      sourceAsset('jenys-judo-center/2_D.jpg'),
    ],
  },
  jezkazgan: {
    hero: sourceAsset('jezkazgan/view_01_3000.jpg'),
    gallery: [
      sourceAsset('jezkazgan/view_02_3000.jpg'),
      sourceAsset('jezkazgan/view_03_3000.jpg'),
      sourceAsset('jezkazgan/view_05_3000.jpg'),
      sourceAsset('jezkazgan/view_06_3000.jpg'),
      sourceAsset('jezkazgan/Front_01_Interactive LightMix.jpg'),
      sourceAsset('jezkazgan/commercia_A01_Interactive LightMix.jpg'),
    ],
  },
  monterosa: {
    hero: sourceAsset('monterosa/Monte_1.2.1_F.jpg'),
    gallery: [
      sourceAsset('monterosa/view_03.jpg'),
      sourceAsset('monterosa/view_04.jpg'),
      sourceAsset('monterosa/view_05.jpg'),
      sourceAsset('monterosa/view_06.jpg'),
      sourceAsset('monterosa/view_01 (1).jpg'),
      sourceAsset('monterosa/view_02 (1).jpg'),
    ],
  },
  'mountain-drive': {
    hero: sourceAsset('mountain-drive/cam3_F.jpg'),
    gallery: [
      sourceAsset('mountain-drive/cam4_F.jpg'),
      sourceAsset('mountain-drive/viz_offis2_.jpg'),
      sourceAsset('mountain-drive/cam2_F (2).jpg'),
    ],
  },
  'munar-tau': {
    hero: sourceAsset('munar-tau/view_01_10000_final.jpg'),
    gallery: [
      sourceAsset('munar-tau/view_03_10000_final.jpg'),
      sourceAsset('munar-tau/view_04_10000_final.jpg'),
      sourceAsset('munar-tau/view_05_10000_final.jpg'),
      sourceAsset('munar-tau/view_07_10000_final.jpg'),
    ],
  },
  'nova-23': {
    hero: sourceAsset('nova-23/view_01_5000_10.02.jpg'),
    gallery: [
      sourceAsset('nova-23/view_02_5000_14.02.jpg'),
      sourceAsset('nova-23/view_03_5000_14.02.jpg'),
      sourceAsset('nova-23/view_03_5000_14.02_1111111.jpg'),
    ],
  },
  'nova-park': {
    hero: sourceAsset('nova-park/cam_002_eyeview_front_brick.jpg'),
    gallery: [
      sourceAsset('nova-park/cam_001_eyeview_dvor_wood.jpg'),
      sourceAsset('nova-park/cam_003_front noch.jpg'),
      sourceAsset('nova-park/cam_004_eyeview_wood.jpg'),
      sourceAsset('nova-park/cam_005_eyeview_brick.jpg'),
      sourceAsset('nova-park/cam_006_dvor_brick.jpg'),
      sourceAsset('nova-park/cam_007_alley_wood.jpg'),
    ],
  },
  'nova-village': {
    hero: sourceAsset('nova-village/view_06_ptichka.jpg'),
    gallery: [
      sourceAsset('nova-village/view_01_d2.jpg'),
      sourceAsset('nova-village/view_01_d3.jpg'),
      sourceAsset('nova-village/view_02_d1.jpg'),
      sourceAsset('nova-village/view_02_d2.jpg'),
      sourceAsset('nova-village/view_02_d3.jpg'),
      sourceAsset('nova-village/view_03_d2.jpg'),
    ],
  },
  tausamal: {
    hero: sourceAsset('tausamal/view_07.jpg'),
    gallery: [
      sourceAsset('tausamal/view_08.jpg'),
      sourceAsset('tausamal/view_10.jpg'),
      sourceAsset('tausamal/view_11.jpg'),
      sourceAsset('tausamal/view_04_Dron.jpg'),
      sourceAsset('tausamal/view_05_Dron.jpg'),
      sourceAsset('tausamal/view_01 (3).jpg'),
      sourceAsset('tausamal/view_02 (3).jpg'),
      sourceAsset('tausamal/view_03 (1).jpg'),
      sourceAsset('tausamal/view_06 (2).jpg'),
      sourceAsset('tausamal/view_09 (1).jpg'),
    ],
  },
  'terrenkur-terrace': {
    hero: sourceAsset('terrenkur-terrace/ROAD_VIEW_2.jpg'),
    gallery: [
      sourceAsset('terrenkur-terrace/BIRD WIEV 1_2.jpg'),
      sourceAsset('terrenkur-terrace/BIRD WIEV 2_2_.jpg'),
      sourceAsset('terrenkur-terrace/NIGHT (1).jpg'),
      sourceAsset('terrenkur-terrace/PLAYGROUND_1.jpg'),
      sourceAsset('terrenkur-terrace/PLAYGROUND 2_opt_2_.jpg'),
      sourceAsset('terrenkur-terrace/SPORT_opt_3.jpg'),
      sourceAsset('terrenkur-terrace/TERRACCE_opt_2_.jpg'),
      sourceAsset('terrenkur-terrace/YARD_1_2.jpg'),
    ],
  },
};

const projectThumbnailMap = {
  meliora: publicAsset('meliora/general-road.jpg'),
  biography: publicAsset('biography/New_01.jpg'),
  naukograd: publicAsset('naukograd/pos_tuzusai.jpg'),
  'raddison-turkestan': publicAsset('raddison-turkestan/01_Tehno_Park.jpg'),
  yubileynyy: sourceAsset('Yubileynyy/21.04_f.jpg'),
  'alatau-village': sourceAsset('alatau-village/06.07_23C1_f.jpg'),
  'arkon-city': sourceAsset('arkon-city/Bird_view.jpg'),
  aulet: sourceAsset('aulet/_SA_Cam-01.jpg'),
  besagash: sourceAsset('besagash/0012b.jpg'),
  enesai: sourceAsset('enesai/view_01.jpg'),
  'everest-boulevard': sourceAsset('everest-boulevard/bird_boulevard.jpg'),
  'family-club': sourceAsset('family-club/3.jpg'),
  'family-comfort': sourceAsset('family-comfort/1_F.jpg'),
  'hayat-city': sourceAsset('hayat-city/view_12.jpg'),
  'hayat-park': sourceAsset('hayat-park/01HP001.jpg'),
  'high-garden': sourceAsset('high-garden/GPIMR005.jpg'),
  'jenys-judo-center': sourceAsset('jenys-judo-center/Bird_View_near_3.jpg'),
  jezkazgan: sourceAsset('jezkazgan/view_01_3000.jpg'),
  monterosa: sourceAsset('monterosa/Monte_1.2.1_F.jpg'),
  'mountain-drive': sourceAsset('mountain-drive/cam3_F.jpg'),
  'munar-tau': sourceAsset('munar-tau/view_01_10000_final.jpg'),
  'nova-23': sourceAsset('nova-23/view_01_5000_10.02.jpg'),
  'nova-park': sourceAsset('nova-park/cam_002_eyeview_front_brick.jpg'),
  'nova-village': sourceAsset('nova-village/view_06_ptichka.jpg'),
  tausamal: sourceAsset('tausamal/view_07.jpg'),
  'terrenkur-terrace': sourceAsset('terrenkur-terrace/ROAD_VIEW_2.jpg'),
};

const projectImages = computed(() => projectImageGroups[projectSlug.value] || projectImageGroups.meliora);
const projectSliderImages = computed(() => [projectImages.value.hero, ...projectImages.value.gallery]);
const projectCards = computed(() => t.value.projects.items.map((project, index) => {
  const slug = project.href.replace(/^\//, '');
  const image = projectThumbnailMap[slug] || projectThumbs[index % projectThumbs.length];
  const types = project.types ?? project.categories ?? [];
  const typeLabel = types.map((type) => t.value.categoryLabels[type]).join(', ');
  return { ...project, types, image, typeLabel };
}));
const featuredProjectCards = computed(() => projectCards.value.slice(0, 6));
const filteredProjectCards = computed(() => {
  if (activeType.value === 'all') return projectCards.value;
  return projectCards.value.filter((project) => project.types.includes(activeType.value));
});

const filterTabs = computed(() => [
  { value: 'all', label: t.value.projects.allFilter },
  ...projectTypeOrder.map((value) => ({ value, label: t.value.categoryLabels[value] })),
]);

function setFilter(type) {
  activeType.value = type;
}

const aboutImages = {
  left: sourceAsset('sections/about-copy/1.jpg'),
  center: sourceAsset('sections/about-copy/2.jpg'),
  right: sourceAsset('sections/about-copy/3.jpg'),
};

const aboutPageImages = {
  hero: sourceAsset('sections/about/team.jpg'),
  story: sourceAsset('sections/about/team2.jpg'),
};

const aboutFeaturedProjects = computed(() => projectCards.value.slice(0, 2));
const contactsMapEl = ref(null);

function closeMenu() {
  isMenuOpen.value = false;
}

function getHeaderOffset() {
  return Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-height')) || 76;
}

function scrollToHash(hash, behavior = 'smooth') {
  const id = decodeURIComponent(hash.replace(/^#/, ''));

  if (!id) return false;

  const target = document.getElementById(id);

  if (!target) return false;

  const top = target.getBoundingClientRect().top + window.scrollY - getHeaderOffset() - 12;

  window.scrollTo({
    top: Math.max(0, top),
    behavior,
  });

  return true;
}

async function syncRoute(scrollMode = 'auto') {
  currentPath.value = window.location.pathname;
  closeMenu();

  await nextTick();

  observeAnimatedElements();
  updateHeaderState();

  if (scrollMode === 'hash') {
    scrollToHash(window.location.hash, 'smooth');
    return;
  }

  if (scrollMode === 'top') {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }
}

function navigateTo(href) {
  const url = new URL(href, window.location.origin);
  const nextLocation = `${url.pathname}${url.search}${url.hash}`;
  const currentLocation = `${window.location.pathname}${window.location.search}${window.location.hash}`;

  if (nextLocation === currentLocation) {
    if (url.hash) {
      scrollToHash(url.hash, 'smooth');
    }

    return;
  }

  window.history.pushState({}, '', nextLocation);
  void syncRoute(url.hash ? 'hash' : 'top');
}

function handleDocumentClick(event) {
  if (
    event.defaultPrevented
    || event.button !== 0
    || event.metaKey
    || event.ctrlKey
    || event.shiftKey
    || event.altKey
    || !(event.target instanceof Element)
  ) {
    return;
  }

  const anchor = event.target.closest('a[href]');

  if (!anchor || anchor.hasAttribute('download') || anchor.getAttribute('target') === '_blank') {
    return;
  }

  const href = anchor.getAttribute('href');

  if (!href || href.startsWith('mailto:') || href.startsWith('tel:')) {
    return;
  }

  const url = new URL(anchor.href, window.location.href);

  if (url.origin !== window.location.origin) {
    return;
  }

  event.preventDefault();
  navigateTo(`${url.pathname}${url.search}${url.hash}`);
}

function handlePopState() {
  void syncRoute(window.location.hash ? 'hash' : 'none');
}

function setLanguage(code) {
  currentLanguage.value = code;
  closeMenu();
}

function goToProjectSlide(direction) {
  const total = projectSliderImages.value.length;

  activeProjectSlide.value = (activeProjectSlide.value + direction + total) % total;
  startProjectSlider();
}

function setProjectSlide(index) {
  activeProjectSlide.value = index;
  startProjectSlider();
}

function getProjectSlideClass(index) {
  const total = projectSliderImages.value.length;
  const previous = (activeProjectSlide.value - 1 + total) % total;
  const next = (activeProjectSlide.value + 1) % total;

  if (index === activeProjectSlide.value) return 'is-active';
  if (index === previous) return 'is-previous';
  if (index === next) return 'is-next';
  return 'is-hidden';
}

function startProjectSlider() {
  window.clearInterval(projectSliderTimer);

  if (!isProjectPage.value || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  projectSliderTimer = window.setInterval(() => {
    goToProjectSlide(1);
  }, 5200);
}

function observeAnimatedElements() {
  if (!revealObserver) return;

  document.querySelectorAll('[data-animate]').forEach((element) => {
    if (!element.classList.contains('is-visible')) {
      revealObserver.observe(element);
    }
  });
}

function updateHomeStackTransition() {
  if (currentPath.value !== '/') return;
  const projects = homeProjectsEl.value;

  if (!projects) return;

  const headerOffset = getHeaderOffset();
  const rect = projects.getBoundingClientRect();
  const start = Math.max(220, window.innerHeight * 0.7);
  const progress = Math.min(1, Math.max(0, (start - (rect.top - headerOffset)) / start));

  projects.style.setProperty('--stack-progress', progress.toFixed(4));
  homeHeroEl.value?.style.setProperty('--stack-progress', progress.toFixed(4));
}

function updateHeaderState() {
  const firstSection = document.querySelector('main section');
  const headerOffset = getHeaderOffset();

  isHeaderSolid.value = firstSection
    ? window.scrollY > firstSection.offsetHeight - headerOffset
    : window.scrollY > headerOffset;

  updateHomeStackTransition();
}

onMounted(() => {
  const savedLanguage = window.localStorage.getItem('most-language');
  currentPath.value = window.location.pathname;

  if (translations[savedLanguage]) {
    currentLanguage.value = savedLanguage;
  }

  revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, {
    rootMargin: '0px 0px -12% 0px',
    threshold: 0.12,
  });

  nextTick(() => {
    observeAnimatedElements();

    updateHeaderState();

    if (window.location.hash) {
      scrollToHash(window.location.hash, 'auto');
    }
  });

  document.addEventListener('click', handleDocumentClick);
  window.addEventListener('popstate', handlePopState);
  window.addEventListener('scroll', updateHeaderState, { passive: true });
  window.addEventListener('resize', updateHeaderState);
  startProjectSlider();
});

function loadGoogleMaps(key) {
  if (!key) return Promise.resolve(null);
  if (window.google?.maps) return Promise.resolve(window.google.maps);

  contactsMapStatus.value = 'loading';

  return new Promise((resolve) => {
    const existing = document.querySelector('script[data-google-maps-loader]');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.google?.maps ?? null), { once: true });
      existing.addEventListener('error', () => resolve(null), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.dataset.googleMapsLoader = 'true';
    script.onload = () => resolve(window.google?.maps ?? null);
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });
}

async function initContactsMap() {
  if (!isContactsPage.value) return;
  const target = contactsMapEl.value;
  if (!target) return;

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const maps = await loadGoogleMaps(apiKey);

  if (!maps) {
    contactsMapStatus.value = apiKey ? 'error' : 'no-key';
    return;
  }

  const map = new maps.Map(target, {
    center: { lat: 43.238949, lng: 76.889709 },
    zoom: 13,
    disableDefaultUI: true,
    zoomControl: true,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: true,
    gestureHandling: 'cooperative',
  });

  const address = t.value.contactsPage?.mapQuery || t.value.footer?.addressValue;
  const geocoder = new maps.Geocoder();

  geocoder.geocode({ address }, (results, status) => {
    if (status !== 'OK' || !results?.[0]?.geometry?.location) {
      contactsMapStatus.value = 'error';
      return;
    }

    const location = results[0].geometry.location;
    map.setCenter(location);
    map.setZoom(16);

    // eslint-disable-next-line no-new
    new maps.Marker({
      map,
      position: location,
      title: t.value.footer?.addressValue || address,
    });

    contactsMapStatus.value = 'ready';
  });
}

watch(isMenuOpen, (value) => {
  document.body.classList.toggle('menu-open', value);
});

watch(currentLanguage, (value) => {
  document.documentElement.lang = value;
  window.localStorage.setItem('most-language', value);

  nextTick(() => {
    observeAnimatedElements();
    updateHeaderState();
  });
});

watch(projectSlug, () => {
  activeProjectSlide.value = 0;
  nextTick(startProjectSlider);
});

watch(activeType, () => {
  nextTick(() => {
    observeAnimatedElements();
  });
});

watch([isContactsPage, currentLanguage], () => {
  contactsMapStatus.value = 'idle';
  nextTick(initContactsMap);
});

onUnmounted(() => {
  document.body.classList.remove('menu-open');
  revealObserver?.disconnect();
  window.clearInterval(projectSliderTimer);
  document.removeEventListener('click', handleDocumentClick);
  window.removeEventListener('popstate', handlePopState);
  window.removeEventListener('scroll', updateHeaderState);
  window.removeEventListener('resize', updateHeaderState);
});
</script>

<template>
  <header class="site-header"
    :class="{ 'is-solid': isHeaderSolid || isMenuOpen || isProjectsPage || isContactsPage, 'is-about-page': isAboutPage }">
    <a class="brand" href="/" :aria-label="t.aria.home">
      <img :src="logoWhite" alt="Most Architects">
    </a>

    <nav class="desktop-nav" :aria-label="t.aria.mainNavigation">
      <a v-for="item in navItems" :key="item.href" :href="item.href">{{ item.label }}</a>
    </nav>

    <div class="header-actions">
      <div class="language" :aria-label="t.aria.languageSwitcher">
        <button v-for="language in languages" :key="language.code" type="button"
          :aria-current="currentLanguage === language.code ? 'page' : undefined" @click="setLanguage(language.code)">
          {{ language.label }}
        </button>
      </div>
      <button class="menu-button" type="button" :aria-expanded="isMenuOpen" aria-controls="mobile-menu"
        :aria-label="isMenuOpen ? t.aria.closeMenu : t.aria.openMenu" @click="isMenuOpen = !isMenuOpen">
        <span></span>
        <span></span>
      </button>
    </div>

    <div id="mobile-menu" class="mobile-panel" :class="{ 'is-open': isMenuOpen }">
      <nav :aria-label="t.aria.mobileNavigation">
        <a v-for="item in navItems" :key="item.href" :href="item.href" @click="closeMenu">{{ item.label }}</a>
      </nav>
      <div class="mobile-language" :aria-label="t.aria.languageSwitcher">
        <button v-for="language in languages" :key="language.code" type="button"
          :aria-current="currentLanguage === language.code ? 'page' : undefined" @click="setLanguage(language.code)">
          {{ language.name }}
        </button>
      </div>
      <div class="mobile-socials">
        <a v-for="social in socials" :key="social.label" :href="social.href" rel="noreferrer">{{ social.label }}</a>
      </div>
    </div>
  </header>

  <main>
    <template v-if="!isProjectPage && !isProjectsPage && !isAboutPage && !isContactsPage">
      <section ref="homeHeroEl" class="hero stack-hero" aria-labelledby="hero-title">
        <div class="hero-media media-frame">
          <picture>
            <source :srcset="heroMobileImage" media="(max-width: 820px)">
            <img :src="heroImage" :alt="t.hero.alt">
          </picture>
        </div>
        <div class="hero-content section-pad">
          <p class="eyebrow">{{ t.hero.eyebrow }}</p>
          <h1 id="hero-title">{{ t.hero.title }}</h1>
          <p class="hero-desc">{{ t.hero.text }}</p>
          <p class="hero-tagline">{{ t.hero.tagline }}</p>
        </div>
      </section>

      <section ref="homeProjectsEl" id="projects" class="projects section-pad stack-next"
        aria-labelledby="projects-title">
        <div class="section-head" data-animate>
          <h2 id="projects-title">{{ t.projects.title }}</h2>
        </div>

        <div class="project-grid">
          <article v-for="project in featuredProjectCards" :key="project.title" class="project-card"
            :class="{ 'project-card-large': project.large }" data-animate>
            <a class="media-frame" :href="project.href">
              <img :src="project.image" :alt="project.alt">
            </a>
            <div class="project-meta">
              <h3>{{ project.title }}</h3>
              <p>{{ project.typeLabel }}</p>
            </div>
          </article>
        </div>

        <a class="project-all-button" href="/projects">{{ t.projects.all }}</a>
      </section>

      <section id="services" class="services section-pad" aria-labelledby="services-title">
        <div class="services-intro" data-animate>
          <p class="eyebrow">{{ t.services.eyebrow }}</p>
          <h2 id="services-title">{{ t.services.title }}</h2>
          <p>{{ t.services.text }}</p>
        </div>

        <div class="service-list">
          <article v-for="(service, index) in t.services.items" :key="service.number" class="service-item" data-animate>
            <div class="service-body">
              <div class="service-body-image media-frame">
                <img :src="serviceImages[index]" :alt="service.title">
              </div>
              <div class="service-copy">
                <h3 class="service-body-title">{{ service.title }}</h3>
                <p>{{ service.text }}</p>
              </div>
              <div class="service-details">
                <div>
                  <h3>{{ t.services.scope }}</h3>
                  <ul>
                    <li v-for="item in service.scope" :key="item">{{ item }}</li>
                  </ul>
                </div>
                <div>
                  <h3>{{ t.services.result }}</h3>
                  <p>{{ service.result }}</p>
                </div>
              </div>
              <div class="service-side-number" aria-hidden="true">
                {{ service.number }}
              </div>
            </div>
          </article>
        </div>
      </section>

      <section id="about" class="about section-pad" aria-labelledby="about-title">
        <div class="about-head" data-animate>
          <p class="eyebrow">{{ t.about.eyebrow }}</p>
          <h2 id="about-title">{{ t.about.title }}</h2>
        </div>

        <div class="about-layout" data-animate>
          <div class="about-media about-media-left media-frame">
            <img :src="aboutImages.left" :alt="t.about.gallery.leftAlt">
          </div>

          <div class="about-column">
            <div class="about-media about-media-center media-frame">
              <img :src="aboutImages.center" :alt="t.about.gallery.centerAlt">
            </div>
          </div>

          <div class="about-copy">
            <p>{{ t.about.text }}</p>
            <dl class="stats">
              <div v-for="stat in t.about.stats" :key="stat.value">
                <dt>{{ stat.value }}</dt>
                <dd v-html="stat.label"></dd>
              </div>
            </dl>
          </div>

          <div class="about-media about-media-right media-frame">
            <img :src="aboutImages.right" :alt="t.about.gallery.rightAlt">
          </div>
        </div>
      </section>

      <section id="contacts" class="contact section-pad" aria-labelledby="contact-title" data-animate>
        <div class="contact-heading">
          <h2 id="contact-title">{{ t.contact.title }}</h2>
          <p>{{ t.contact.text }}</p>
        </div>

        <form class="contact-form" action="#" method="post">
          <p class="contact-form-note">{{ t.contact.note }}</p>
          <label>
            <input type="text" name="name" :placeholder="t.contact.name" autocomplete="name" required>
          </label>
          <label>
            <input type="tel" name="phone" :placeholder="t.contact.phonePlaceholder" autocomplete="tel" required>
          </label>
          <label class="checkbox">
            <input type="checkbox" name="privacy" checked required>
            <span>{{ t.contact.privacyBefore }} <a href="/" target="_blank" rel="noreferrer noopener">{{
              t.contact.privacyLink }}</a></span>
          </label>
          <button class="submit-button" type="submit">{{ t.contact.submit }}</button>
        </form>
      </section>
    </template>

    <template v-else-if="isAboutPage">
      <section class="about-page" aria-labelledby="about-page-title">
        <section class="about-page-hero section-pad">
          <div class="about-page-hero-media media-frame" data-animate>
            <img :src="aboutPageImages.hero" :alt="t.aboutPage.heroAlt">
          </div>

          <div class="about-page-hero-copy" data-animate>
            <p class="eyebrow">{{ t.aboutPage.eyebrow }}</p>
            <h1 id="about-page-title">{{ t.aboutPage.title }}</h1>
            <p class="about-page-lead">{{ t.aboutPage.lead }}</p>
            <p class="about-page-lead about-page-lead-secondary">{{ t.aboutPage.leadSecondary }}</p>

            <div class="about-page-experience">
              <span>{{ t.aboutPage.experienceLabel }}</span>
              <dl class="about-page-stats">
                <div v-for="stat in t.aboutPage.stats" :key="stat.value">
                  <dt>{{ stat.value }}</dt>
                  <dd>{{ stat.label }}</dd>
                </div>
              </dl>
            </div>
          </div>
        </section>

        <section class="about-page-approach section-pad" data-animate>
          <h2>{{ t.aboutPage.approachTitle }}</h2>
          <p class="about-page-approach-intro">{{ t.aboutPage.approachIntro }}</p>
          <div class="about-page-approach-lines">
            <p v-for="item in t.aboutPage.approachItems" :key="item">{{ item }}</p>
          </div>
        </section>

        <section class="about-page-story section-pad" data-animate>
          <div class="about-page-story-copy">
            <p>{{ t.aboutPage.storyIntro }}</p>
            <p>{{ t.aboutPage.storyText }}</p>
          </div>

          <div class="about-page-story-media media-frame is-contain">
            <img :src="aboutPageImages.story" :alt="t.aboutPage.storyAlt">
          </div>
        </section>

        <section class="about-page-featured section-pad" data-animate>
          <div class="section-head about-page-featured-head">
            <h2>{{ t.aboutPage.featuredTitle }}</h2>
          </div>

          <div class="project-grid about-page-featured-grid">
            <article v-for="project in aboutFeaturedProjects" :key="project.title" class="project-card"
              :class="{ 'project-card-large': project.large }">
              <a class="media-frame" :href="project.href">
                <img :src="project.image" :alt="project.alt">
              </a>
              <div class="project-meta">
                <h3>{{ project.title }}</h3>
                <p>{{ project.typeLabel }}</p>
              </div>
            </article>
          </div>
        </section>
      </section>
    </template>

    <template v-else-if="isContactsPage">
      <section class="contacts-page" aria-labelledby="contacts-page-title">
        <section class="contacts-page-hero section-pad">
          <div class="contacts-page-hero-media media-frame contacts-page-map" data-animate>
            <div ref="contactsMapEl" class="contacts-page-map-canvas" :data-state="contactsMapStatus"></div>
            <iframe v-if="contactsMapStatus !== 'ready'" class="contacts-page-map-fallback"
              :title="t.contactsPage.heroAlt"
              :src="`https://www.google.com/maps?q=${encodeURIComponent(t.contactsPage.mapQuery)}&output=embed`"
              loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
          </div>

          <div class="contacts-page-hero-copy" data-animate>
            <p class="eyebrow">{{ t.contactsPage.eyebrow }}</p>
            <h1 id="contacts-page-title">{{ t.contactsPage.title }}</h1>
            <p class="contacts-page-lead">{{ t.contactsPage.lead }}</p>
          </div>
        </section>

        <section class="contacts-page-grid section-pad" data-animate>
          <div class="contacts-page-info">
            <h2 class="contacts-page-subtitle">{{ t.contactsPage.infoTitle }}</h2>

            <div class="contacts-page-cards">
              <div class="contacts-page-card">
                <span>{{ t.contactsPage.cards.phoneLabel }}</span>
                <a href="tel:+77717337700">+ 7 (771) 733 77 00</a>
              </div>
              <div class="contacts-page-card">
                <span>{{ t.contactsPage.cards.emailLabel }}</span>
                <a href="mailto:info@most-a.com">info@most-a.com</a>
              </div>
              <div class="contacts-page-card">
                <span>{{ t.contactsPage.cards.addressLabel }}</span>
                <p>{{ t.footer.addressValue }}</p>
              </div>
              <div class="contacts-page-card">
                <span>{{ t.contactsPage.cards.hoursLabel }}</span>
                <p>{{ t.footer.hoursValue }}</p>
              </div>
            </div>

            <div class="contacts-page-note">
              <p>{{ t.contactsPage.note }}</p>
            </div>
          </div>

          <form class="contacts-page-form" action="#" method="post">
            <p class="contacts-page-form-title">{{ t.contactsPage.formTitle }}</p>
            <label>
              <input type="text" name="name" :placeholder="t.contactsPage.namePlaceholder" autocomplete="name" required>
            </label>
            <label class="contacts-page-form-select-wrap">
              <select name="service" required>
                <option value="" disabled selected>{{ t.contactsPage.serviceLabel }}</option>
                <option v-for="opt in t.contactsPage.serviceOptions" :key="opt" :value="opt">{{ opt }}</option>
              </select>
            </label>
            <label>
              <textarea name="description" :placeholder="t.contactsPage.descPlaceholder" rows="4"
                autocomplete="off"></textarea>
            </label>
            <label class="contacts-page-form-file">
              <input type="file" name="files" multiple accept=".pdf,.jpg,.jpeg,.png,.dwg,.zip">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path
                  d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
              </svg>
              <span>{{ t.contactsPage.filePlaceholder }}</span>
            </label>
            <label class="checkbox">
              <input type="checkbox" name="privacy" checked required>
              <span>{{ t.contact.privacyBefore }} <a href="/" target="_blank" rel="noreferrer noopener">{{
                t.contact.privacyLink }}</a></span>
            </label>
            <button class="submit-button" type="submit">{{ t.contactsPage.submit }}</button>
          </form>
        </section>
      </section>
    </template>

    <template v-else-if="isProjectsPage">
      <section class="projects-page section-pad" aria-labelledby="all-projects-title">
        <div class="projects-page-head" data-animate>
          <a class="project-back" href="/#projects">{{ t.projectPage.back }}</a>
          <div>
            <h1 id="all-projects-title">{{ t.projects.all }}</h1>
          </div>
          <p>{{ t.projectsPage.text }}</p>
        </div>

        <div class="projects-filter" data-animate>
          <button v-for="tab in filterTabs" :key="tab.value" type="button" class="filter-btn"
            :class="{ 'is-active': activeType === tab.value }" @click="setFilter(tab.value)">{{ tab.label }}</button>
        </div>

        <div class="project-grid projects-page-grid">
          <article v-for="project in filteredProjectCards" :key="project.title" class="project-card" data-animate>
              <a class="media-frame" :href="project.href">
                <img :src="project.image" :alt="project.alt">
              </a>
              <div class="project-meta">
                <h3>{{ project.title }}</h3>
                <p>{{ project.typeLabel }}</p>
              </div>
            </article>
          </div>
      </section>
    </template>

    <template v-else>
      <article class="project-page">
        <section class="project-hero" aria-labelledby="project-title">
          <div class="project-hero-media media-frame">
            <img :src="projectImages.hero" :alt="currentProject.heroAlt">
          </div>
          <div class="project-hero-content section-pad">
            <a class="project-back" href="/#projects">{{ t.projectPage.back }}</a>
            <p class="eyebrow">{{ currentProject.category }}</p>
            <h1 id="project-title">{{ currentProject.title }}</h1>
            <dl class="project-hero-facts">
              <div v-for="fact in currentProject.facts.slice(0, 3)" :key="fact.label">
                <dt>{{ fact.label }}</dt>
                <dd>{{ fact.value }}</dd>
              </div>
            </dl>
          </div>
        </section>

        <section class="project-overview section-pad" data-animate>
          <div class="project-summary">
            <p>{{ currentProject.summary }}</p>
          </div>
          <dl class="project-facts">
            <div v-for="fact in currentProject.facts" :key="fact.label">
              <dt>{{ fact.label }}</dt>
              <dd>{{ fact.value }}</dd>
            </div>
          </dl>
        </section>

        <section class="project-slider section-pad" :aria-label="t.projectPage.gallery" data-animate>
          <div class="project-slider-head">
            <p class="eyebrow">{{ t.projectPage.gallery }}</p>
            <h2>Atmosphere in motion</h2>
          </div>

          <div class="project-slider-window">
            <figure v-for="(image, index) in projectSliderImages" :key="image" class="project-slider-panel"
              :class="getProjectSlideClass(index)" @click="index !== activeProjectSlide && setProjectSlide(index)">
              <img :src="image" :alt="currentProject.galleryAlt[index] || currentProject.heroAlt">
              <figcaption>
                <span>{{ String(index + 1).padStart(2, '0') }}</span>
                <strong>{{ currentProject.galleryAlt[index] || currentProject.category }}</strong>
              </figcaption>
            </figure>

            <button class="project-slider-arrow project-slider-arrow-prev" type="button" aria-label="Previous image"
              @click="goToProjectSlide(-1)">
              ‹
            </button>
            <button class="project-slider-arrow project-slider-arrow-next" type="button" aria-label="Next image"
              @click="goToProjectSlide(1)">
              ›
            </button>

            <div class="project-slider-meter" aria-hidden="true">
              <span :key="activeProjectSlide"></span>
            </div>
          </div>
        </section>

        <section class="project-story section-pad">
          <div v-for="section in currentProject.sections" :key="section.title" class="project-story-block" data-animate>
            <h2>{{ section.title }}</h2>
            <p>{{ section.text }}</p>
          </div>
        </section>

        <section class="project-more section-pad" data-animate>
          <h2>{{ t.projectPage.more }}</h2>
          <div class="project-grid">
            <article v-for="project in featuredProjectCards.filter((item) => item.href !== `/${projectSlug}`)"
              :key="project.title" class="project-card">
              <a class="media-frame" :href="project.href">
                <img :src="project.image" :alt="project.alt">
              </a>
              <div class="project-meta">
                <h3>{{ project.title }}</h3>
                <p>{{ project.typeLabel }}</p>
              </div>
            </article>
          </div>
        </section>
      </article>
    </template>
  </main>

  <footer class="site-footer section-pad">
    <div class="footer-top" data-animate>
      <div class="footer-contacts">
        <address>
          <span>{{ t.footer.email }}</span>
          <a href="mailto:info@most-a.com">info@most-a.com</a>
        </address>
        <address>
          <span>{{ t.footer.contact }}</span>
          <a href="tel:+77717337700">+ 7 (771) 733 77 00</a>
        </address>
        <p>
          <span>{{ t.footer.hours }}</span>
          {{ t.footer.hoursValue }}
        </p>
        <p>
          <span>{{ t.footer.address }}</span>
          {{ t.footer.addressValue }}
        </p>
      </div>

      <nav class="footer-nav" :aria-label="t.aria.footerNavigation">
        <a href="/">{{ t.nav.home }}</a>
        <a v-for="item in navItems.slice(0, 3)" :key="item.href" :href="item.href">{{ item.label }}</a>
      </nav>
    </div>
    <div class="footer-wordmark" aria-hidden="true">MOST ARCHITECTS</div>
  </footer>
</template>
