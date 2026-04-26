<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { languages, translations } from './i18n';
import logoWhite from './public/white.svg';

const isMenuOpen = ref(false);
const isHeaderSolid = ref(false);
const currentLanguage = ref('en');
const currentPath = ref('/');
const activeProjectSlide = ref(0);
let revealObserver;
let projectSliderTimer;

const t = computed(() => translations[currentLanguage.value]);
const projectSlug = computed(() => currentPath.value.split('/').filter(Boolean)[0] || '');
const isProjectsPage = computed(() => projectSlug.value === 'projects');
const currentProject = computed(() => t.value.projectPages?.[projectSlug.value] || null);
const isProjectPage = computed(() => Boolean(currentProject.value));
const homePathPrefix = computed(() => (isProjectPage.value || isProjectsPage.value ? '/' : ''));

const navItems = computed(() => [
  { label: t.value.nav.project, href: '/projects' },
  { label: t.value.nav.about, href: `${homePathPrefix.value}#about` },
  { label: t.value.nav.services, href: `${homePathPrefix.value}#services` },
  { label: t.value.nav.contacts, href: `${homePathPrefix.value}#contacts` },
]);

const socials = [
  { label: 'WhatsApp', href: 'https://wa.me/77717337700' },
  { label: 'Instagram', href: 'https://www.instagram.com/' },
  { label: 'Behance', href: 'https://www.behance.net/' },
];

const heroImage = new URL('./public/View_02,2.jpg', import.meta.url).href;

const serviceImages = [
  new URL('./public/sections/services/1.jpg', import.meta.url).href,
  new URL('./public/sections/services/2.jpg', import.meta.url).href,
  new URL('./public/sections/services/3.jpg', import.meta.url).href,
  new URL('./public/sections/services/4.jpg', import.meta.url).href,
];

const projectThumbs = [
  new URL('./public/meliora/General view from the road_F_Upd.jpg', import.meta.url).href,
  new URL('./public/sections/about-copy/1.jpg', import.meta.url).href,
  new URL('./public/sections/services/3.jpg', import.meta.url).href,
  new URL('./public/sections/about-copy/2.jpg', import.meta.url).href,
  new URL('./public/sections/services/2.jpg', import.meta.url).href,
  new URL('./public/sections/about-copy/3.jpg', import.meta.url).href,
];

const projectImageGroups = {
  meliora: {
    hero: new URL('./public/meliora/General view from the road_F_Upd.jpg', import.meta.url).href,
    gallery: [
      new URL('./public/meliora/General view from the park_F.jpg', import.meta.url).href,
      new URL('./public/meliora/Evening front view_F.jpg', import.meta.url).href,
      new URL('./public/meliora/Ev_view_MT_F_warm.jpg', import.meta.url).href,
      new URL('./public/meliora/Front_terras_F.jpg', import.meta.url).href,
      new URL('./public/meliora/Back_ter_F.jpg', import.meta.url).href,
      new URL('./public/meliora/0_F.jpg', import.meta.url).href,
      new URL('./public/meliora/3_F.jpg', import.meta.url).href,
      new URL('./public/meliora/4_F.jpg', import.meta.url).href,
      new URL('./public/meliora/7_F.jpg', import.meta.url).href,
      new URL('./public/meliora/11_F.jpg', import.meta.url).href,
      new URL('./public/meliora/12_F.jpg', import.meta.url).href,
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
  left: new URL('./public/sections/about-copy/1.jpg', import.meta.url).href,
  center: new URL('./public/sections/about-copy/2.jpg', import.meta.url).href,
  right: new URL('./public/sections/about-copy/3.jpg', import.meta.url).href,
};

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

function updateHeaderState() {
  const firstSection = document.querySelector('main section');
  const headerOffset = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-height')) || 76;

  isHeaderSolid.value = firstSection
    ? window.scrollY > firstSection.offsetHeight - headerOffset
    : window.scrollY > headerOffset;
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
    document.querySelectorAll('[data-animate]').forEach((element) => {
      revealObserver.observe(element);
    });

    updateHeaderState();
  });

  window.addEventListener('scroll', updateHeaderState, { passive: true });
  window.addEventListener('resize', updateHeaderState);
  startProjectSlider();
});

watch(isMenuOpen, (value) => {
  document.body.classList.toggle('menu-open', value);
});

watch(currentLanguage, (value) => {
  document.documentElement.lang = value;
  window.localStorage.setItem('most-language', value);
});

watch(projectSlug, () => {
  activeProjectSlide.value = 0;
  nextTick(startProjectSlider);
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
  <header class="site-header" :class="{ 'is-solid': isHeaderSolid || isMenuOpen || isProjectsPage }">
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
    <template v-if="!isProjectPage && !isProjectsPage">
      <section class="hero" aria-labelledby="hero-title">
        <div class="hero-media media-frame">
          <img :src="heroImage" :alt="t.hero.alt">
        </div>
        <div class="hero-content section-pad">
          <p class="eyebrow">{{ t.hero.eyebrow }}</p>
          <h1 id="hero-title">{{ t.hero.title }}</h1>
          <p>{{ t.hero.text }}</p>
        </div>
      </section>

      <section id="projects" class="projects section-pad" aria-labelledby="projects-title">
        <div class="section-head" data-animate>
          <h2 id="projects-title">{{ t.projects.title }}</h2>
        </div>

        <div class="project-grid">
          <article v-for="project in projectCards" :key="project.title" class="project-card"
            :class="{ 'project-card-large': project.large }" data-animate>
            <div class="media-frame">
              <img :src="project.image" :alt="project.alt">
            </div>
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
              <div class="media-frame">
                <img :src="project.image" :alt="project.alt">
              </div>
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
