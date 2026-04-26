<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { languages, translations } from './i18n';

const isMenuOpen = ref(false);
const isHeaderSolid = ref(false);
const currentLanguage = ref('en');
const currentPath = ref('/');
const activeProjectSlide = ref(0);
const contactsMapStatus = ref('idle');
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
  { label: t.value.nav.services, href: `${homePathPrefix.value}#services` },
  { label: t.value.nav.contacts, href: '/contacts' },
]);

const socials = [
  { label: 'WhatsApp', href: 'https://wa.me/77717337700' },
  { label: 'Instagram', href: 'https://www.instagram.com/' },
  { label: 'Behance', href: 'https://www.behance.net/' },
];

const publicAsset = (path) => `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`;
const logoWhite = publicAsset('white.svg');
const heroImage = publicAsset('view-02-2.jpg');
const heroMobileImage = publicAsset('sections/about-copy/mixed-use-exterior.jpg');

const serviceImages = [
  publicAsset('sections/services/architecture-idea.jpg'),
  publicAsset('sections/services/city-concept.jpg'),
  publicAsset('sections/services/detailed-documents.jpg'),
  publicAsset('sections/services/masterplan.jpg'),
];

const projectThumbs = [
  publicAsset('meliora/general-road.jpg'),
  publicAsset('sections/about-copy/residential-exterior.jpg'),
  publicAsset('sections/services/detailed-documents.jpg'),
  publicAsset('sections/about-copy/mixed-use-exterior.jpg'),
  publicAsset('sections/services/city-concept.jpg'),
  publicAsset('sections/about-copy/waterfront-residential.jpg'),
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
};

const projectImages = computed(() => projectImageGroups[projectSlug.value] || projectImageGroups.meliora);
const projectSliderImages = computed(() => [projectImages.value.hero, ...projectImages.value.gallery]);
const projectCards = computed(() => t.value.projects.items.map((project, index) => ({
  ...project,
  image: projectThumbs[index % projectThumbs.length],
})));

const aboutImages = {
  left: publicAsset('sections/about-copy/residential-exterior.jpg'),
  center: publicAsset('sections/about-copy/mixed-use-exterior.jpg'),
  right: publicAsset('sections/about-copy/waterfront-residential.jpg'),
};

const aboutPageImages = {
  hero: publicAsset('sections/about/team.jpg'),
  story: publicAsset('sections/about/team2.jpg'),
};

const aboutFeaturedProjects = computed(() => projectCards.value.slice(0, 2));
const contactsMapEl = ref(null);

function closeMenu() {
  isMenuOpen.value = false;
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

  const headerOffset = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-height')) || 76;
  const rect = projects.getBoundingClientRect();
  const start = Math.max(220, window.innerHeight * 0.7);
  const progress = Math.min(1, Math.max(0, (start - (rect.top - headerOffset)) / start));

  projects.style.setProperty('--stack-progress', progress.toFixed(4));
  homeHeroEl.value?.style.setProperty('--stack-progress', progress.toFixed(4));
}

function updateHeaderState() {
  const firstSection = document.querySelector('main section');
  const headerOffset = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-height')) || 76;

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
  });

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

watch([isContactsPage, currentLanguage], () => {
  contactsMapStatus.value = 'idle';
  nextTick(initContactsMap);
});

onUnmounted(() => {
  document.body.classList.remove('menu-open');
  revealObserver?.disconnect();
  window.clearInterval(projectSliderTimer);
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
          <p>{{ t.hero.text }}</p>
        </div>
      </section>

      <section ref="homeProjectsEl" id="projects" class="projects section-pad stack-next" aria-labelledby="projects-title">
        <div class="section-head" data-animate>
          <h2 id="projects-title">{{ t.projects.title }}</h2>
        </div>

        <div class="project-grid">
          <article v-for="project in projectCards" :key="project.title" class="project-card"
            :class="{ 'project-card-large': project.large }" data-animate>
            <a class="media-frame" :href="project.href">
              <img :src="project.image" :alt="project.alt">
            </a>
            <div class="project-meta">
              <h3>{{ project.title }}</h3>
              <p>{{ project.category }}</p>
              <a :href="project.href">{{ t.projects.view }}</a>
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
                <p>{{ project.category }}</p>
                <a :href="project.href">{{ t.projects.view }}</a>
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
            <iframe
              v-if="contactsMapStatus !== 'ready'"
              class="contacts-page-map-fallback"
              :title="t.contactsPage.heroAlt"
              :src="`https://www.google.com/maps?q=${encodeURIComponent(t.contactsPage.mapQuery)}&output=embed`"
              loading="lazy"
              referrerpolicy="no-referrer-when-downgrade"
            ></iframe>
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
              <input type="text" name="name" :placeholder="t.contact.name" autocomplete="name" required>
            </label>
            <label>
              <input type="tel" name="phone" :placeholder="t.contact.phonePlaceholder" autocomplete="tel" required>
            </label>
            <label>
              <input type="text" name="message" :placeholder="t.contactsPage.messagePlaceholder" autocomplete="off">
            </label>
            <label class="checkbox">
              <input type="checkbox" name="privacy" checked required>
              <span>{{ t.contact.privacyBefore }} <a href="/" target="_blank" rel="noreferrer noopener">{{ t.contact.privacyLink }}</a></span>
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

        <div class="project-grid projects-page-grid">
          <article v-for="project in projectCards" :key="project.title" class="project-card" data-animate>
            <a class="media-frame" :href="project.href">
              <img :src="project.image" :alt="project.alt">
            </a>
            <div class="project-meta">
              <h3>{{ project.title }}</h3>
              <p>{{ project.category }}</p>
              <a :href="project.href">{{ t.projects.view }}</a>
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
            <article v-for="project in projectCards.filter((item) => item.href !== `/${projectSlug}`)"
              :key="project.title" class="project-card">
              <a class="media-frame" :href="project.href">
                <img :src="project.image" :alt="project.alt">
              </a>
              <div class="project-meta">
                <h3>{{ project.title }}</h3>
                <p>{{ project.category }}</p>
                <a :href="project.href">{{ t.projects.view }}</a>
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
