// ─── Loading Screen ──────────────────────────────────────────────────────────
window.addEventListener('load', () => {
  const loadingScreen = document.getElementById('loading-screen');
  if (loadingScreen) {
    setTimeout(() => {
      loadingScreen.classList.add('hidden');
    }, 1500);
  }
});

// ─── Scroll Progress Bar ─────────────────────────────────────────────────────
const scrollProgress = document.getElementById('scroll-progress');
window.addEventListener('scroll', () => {
  const scrollTop = document.documentElement.scrollTop;
  const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
  if (scrollProgress) {
    scrollProgress.style.width = ((scrollTop / scrollHeight) * 100) + '%';
  }
}, { passive: true });

// ─── Theme Toggle ────────────────────────────────────────────────────────────
const themeToggle = document.getElementById('theme-toggle');
const html = document.documentElement;

function setTheme(theme) {
  html.setAttribute('data-theme', theme);
  localStorage.setItem('portfolio-theme', theme);
  const icon = themeToggle.querySelector('i');
  if (icon) {
    icon.className = theme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
  }
}

// Load saved theme
const savedTheme = localStorage.getItem('portfolio-theme') || 'dark';
setTheme(savedTheme);

if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    const current = html.getAttribute('data-theme');
    setTheme(current === 'dark' ? 'light' : 'dark');
  });
}

// ─── Hamburger Menu ──────────────────────────────────────────────────────────
const hamburgerBtn = document.getElementById('hamburger-btn');
const headerNav = document.querySelector('header nav');
let navOverlay = null;

if (hamburgerBtn && headerNav) {
  // Create overlay
  navOverlay = document.createElement('div');
  navOverlay.className = 'nav-overlay';
  document.body.appendChild(navOverlay);

  hamburgerBtn.addEventListener('click', () => {
    hamburgerBtn.classList.toggle('active');
    headerNav.classList.toggle('open');
    navOverlay.classList.toggle('active');
  });

  navOverlay.addEventListener('click', () => {
    hamburgerBtn.classList.remove('active');
    headerNav.classList.remove('open');
    navOverlay.classList.remove('active');
  });

  // Close nav on link click (mobile)
  headerNav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      hamburgerBtn.classList.remove('active');
      headerNav.classList.remove('open');
      navOverlay.classList.remove('active');
    });
  });
}

// ─── Typing Animation ─────────────────────────────────────────────────────────
const typedEl = document.getElementById('typed-role');
if (typedEl) {
  const roles = ['Robotics Engineer', 'ML Researcher', 'ROS2 Developer', 'C++ Developer'];
  let roleIndex = 0;
  let charIndex = 0;
  let isDeleting = false;

  function typeRole() {
    const currentRole = roles[roleIndex];
    if (isDeleting) {
      typedEl.textContent = currentRole.substring(0, charIndex - 1);
      charIndex--;
    } else {
      typedEl.textContent = currentRole.substring(0, charIndex + 1);
      charIndex++;
    }

    if (!isDeleting && charIndex === currentRole.length) {
      setTimeout(() => { isDeleting = true; typeRole(); }, 2200);
      return;
    }
    if (isDeleting && charIndex === 0) {
      isDeleting = false;
      roleIndex = (roleIndex + 1) % roles.length;
    }
    setTimeout(typeRole, isDeleting ? 45 : 95);
  }

  setTimeout(typeRole, 1800);
}

// ─── Active Nav Highlight ─────────────────────────────────────────────────────
const sections = document.querySelectorAll('main section[id]');
const navLinks = document.querySelectorAll('header nav ul li a');

const navObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      navLinks.forEach(link => {
        link.classList.remove('active');
        const href = link.getAttribute('href');
        if (href === '#' + entry.target.id || (href === '#' && entry.target.id === 'about')) {
          link.classList.add('active');
        }
      });
    }
  });
}, { threshold: 0.35 });

sections.forEach(s => navObserver.observe(s));

// ─── Section Heading Underline Animation ─────────────────────────────────────
const headingObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in-view');
      headingObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.5 });

document.querySelectorAll('section h2').forEach(h => headingObserver.observe(h));

// ─── About Content (bidirectional) ────────────────────────────────────────────
const aboutContent = document.querySelector('.about-content');
if (aboutContent) {
  const aboutObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        aboutContent.classList.add('in-view');
        aboutContent.classList.remove('out-of-view');
      } else {
        aboutContent.classList.remove('in-view');
        aboutContent.classList.add('out-of-view');
      }
    });
  }, { threshold: 0.2 });
  aboutObserver.observe(aboutContent);
}

// ─── Timeline Items (slide in) ───────────────────────────────────────────────
const slideObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in-view');
      slideObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.timeline-item, .education-card').forEach(el => slideObserver.observe(el));

// ─── Stats Counter Animation ─────────────────────────────────────────────────
const statNumbers = document.querySelectorAll('.stat-number');
let statsAnimated = false;

function animateStats() {
  if (statsAnimated) return;
  statsAnimated = true;

  statNumbers.forEach(stat => {
    const target = parseFloat(stat.dataset.target);
    const isDecimal = target % 1 !== 0;
    const duration = 1800;
    const start = performance.now();

    function update(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = eased * target;

      if (isDecimal) {
        stat.textContent = current.toFixed(2);
      } else {
        stat.textContent = Math.floor(current);
      }

      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        stat.textContent = isDecimal ? target.toFixed(2) : target;
      }
    }

    requestAnimationFrame(update);
  });
}

const statsSection = document.getElementById('stats');
if (statsSection) {
  const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateStats();
        statsObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.4 });
  statsObserver.observe(statsSection);
}

// ─── Helper: Observe cards with stagger ──────────────────────────────────────
function observeCardsWithStagger(selector) {
  const cardObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const siblings = [...entry.target.parentElement.children];
        const index = siblings.indexOf(entry.target);
        setTimeout(() => {
          entry.target.classList.add('in-view');
        }, (index % 6) * 80);
        cardObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.05 });

  document.querySelectorAll(selector).forEach(card => cardObserver.observe(card));
}

// ─── Skill Bar Animation ───────────────────────────────────────────────────────
function observeSkillBars() {
  const skillObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const fill = entry.target.querySelector('.skill-fill');
        if (fill) {
          const level = parseFloat(fill.dataset.level) * 100;
          setTimeout(() => { fill.style.width = level + '%'; }, 200);
        }
        skillObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3 });

  document.querySelectorAll('.skill-card').forEach(card => skillObserver.observe(card));
}

// ─── Projects ─────────────────────────────────────────────────────────────────
const projectList = document.getElementById('project-list');
const modalView = document.getElementById('modal-view');
const projectFilters = document.getElementById('project-filters');
let allProjects = [];

function collectAllTags(projects) {
  const tagSet = new Set();
  projects.forEach(p => p.tags.forEach(t => tagSet.add(t)));
  return [...tagSet].sort();
}

function buildFilterButtons(tags) {
  if (!projectFilters) return;
  tags.forEach(tag => {
    const btn = document.createElement('button');
    btn.className = 'filter-btn';
    btn.dataset.filter = tag;
    btn.textContent = tag;
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filterProjects(tag);
    });
    projectFilters.appendChild(btn);
  });

  // "All" button click handler
  const allBtn = projectFilters.querySelector('[data-filter="all"]');
  if (allBtn) {
    allBtn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      allBtn.classList.add('active');
      filterProjects('all');
    });
  }
}

function filterProjects(tag) {
  if (tag === 'all') {
    updateProjectList(allProjects);
  } else {
    const filtered = allProjects.filter(p => p.tags.includes(tag));
    updateProjectList(filtered);
  }
}

function updateProjectList(projects) {
  projectList.innerHTML = '';
  modalView.innerHTML = '';

  projects.forEach(project => {
    const card = document.createElement('div');
    card.classList.add('project-card');

    const image = document.createElement('img');
    image.loading = 'lazy';
    image.src = project.image;
    image.alt = project.title;
    card.appendChild(image);

    const title = document.createElement('h2');
    title.textContent = project.title;
    card.appendChild(title);

    const description = document.createElement('p');
    description.classList.add('desc');
    description.textContent = project.description;
    card.appendChild(description);

    const date = document.createElement('p');
    date.classList.add('date');
    date.textContent = project.date;
    card.appendChild(date);

    const tags = document.createElement('ul');
    tags.classList.add('tag-list');
    project.tags.forEach(tag => {
      const tagItem = document.createElement('li');
      tagItem.textContent = tag;
      tags.appendChild(tagItem);
    });
    card.appendChild(tags);

    // Modal
    const modal = document.createElement('div');
    modal.classList.add('modal');
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>${project.title}</h2>
          <span class="close">&times;</span>
        </div>
        <div class="modal-body">
          <div class="left-column">
            <div class="carousel">
              <div class="carousel-content">
                ${project.media.map(media => `
                  <div class="carousel-item" data-type="${media.type}">
                    ${media.type === 'article'
                      ? `<img src="${media.image}" alt="${project.title}" loading="lazy" />
                         <a href="${media.url}" target="_blank" class="view-article-button">View Article</a>`
                      : `<${media.type === 'video' ? 'video autoplay loop muted' : 'img'} src="${media.url}"
                          ${media.type === 'video' ? 'controls autoplay muted loop' : ''}
                          ${media.type === 'image' ? 'loading="lazy"' : ''}
                          alt="${project.title}" />`
                    }
                  </div>`).join('')}
              </div>
              <div class="carousel-label">Image</div>
              <button class="prev">&#10094;</button>
              <button class="next">&#10095;</button>
            </div>
            <ul class="tag-list">
              ${project.tags.map(tag => `<li>${tag}</li>`).join('')}
            </ul>
            <div class="links">
              <a href="${project.github}" target="_blank"><i class="fab fa-github"></i> View on GitHub</a>
              ${project.video ? `<a href="${project.video}" target="_blank"><i class="fas fa-play-circle"></i> Watch Demo</a>` : ''}
            </div>
          </div>
          <div class="right-column">
            <p>${project.longDescription || 'No detailed description available.'}</p>
          </div>
        </div>
      </div>
    `;

    modalView.appendChild(modal);

    const carouselContent = modal.querySelector('.carousel-content');
    const carouselItems = modal.querySelectorAll('.carousel-item');
    const label = modal.querySelector('.carousel-label');
    let currentSlide = 0;
    let autoSlideInterval;

    function showSlide(index) {
      currentSlide = (index + carouselItems.length) % carouselItems.length;
      carouselContent.style.transform = `translateX(-${currentSlide * 100}%)`;
      const type = carouselItems[currentSlide].getAttribute('data-type');
      label.textContent = type.charAt(0).toUpperCase() + type.slice(1);
      if (type === 'article') {
        label.classList.add('clickable');
        label.onclick = () => window.open(carouselItems[currentSlide].querySelector('.view-article-button').href, '_blank');
      } else {
        label.classList.remove('clickable');
        label.onclick = null;
      }
    }

    function startAutoSlide() {
      autoSlideInterval = setInterval(() => showSlide(currentSlide + 1), 5000);
    }

    function stopAutoSlide() {
      clearInterval(autoSlideInterval);
    }

    modal.querySelector('.next').onclick = () => { showSlide(currentSlide + 1); stopAutoSlide(); startAutoSlide(); };
    modal.querySelector('.prev').onclick = () => { showSlide(currentSlide - 1); stopAutoSlide(); startAutoSlide(); };

    card.addEventListener('click', () => {
      modal.style.display = 'flex';
      showSlide(0);
      startAutoSlide();
    });

    modal.querySelector('.close').onclick = () => {
      modal.style.display = 'none';
      stopAutoSlide();
    };

    window.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.style.display = 'none';
        stopAutoSlide();
      }
    });

    projectList.appendChild(card);
  });

  observeCardsWithStagger('.project-card');
}

fetch('data/project-data.json')
  .then(r => r.json())
  .then(data => {
    allProjects = data.projects.sort((a, b) => new Date(b.date) - new Date(a.date));
    const allTags = collectAllTags(allProjects);
    buildFilterButtons(allTags);
    updateProjectList(allProjects);
  });

// ─── Blogs ────────────────────────────────────────────────────────────────────
const blogList = document.getElementById('blog-list');
let allBlogs = [];

function estimateReadTime(description) {
  const words = description.split(/\s+/).length;
  const minutes = Math.max(1, Math.ceil(words / 200));
  return minutes;
}

function updateBlogList(blogs) {
  blogList.innerHTML = '';

  blogs.forEach(blog => {
    const card = document.createElement('div');
    card.classList.add('blog-card');
    card.addEventListener('click', () => window.open(blog.url, '_blank'));

    const image = document.createElement('img');
    image.loading = 'lazy';
    image.src = blog.image;
    image.alt = blog.title;
    card.appendChild(image);

    const title = document.createElement('h2');
    title.textContent = blog.title;
    card.appendChild(title);

    const description = document.createElement('p');
    description.classList.add('desc');
    description.textContent = blog.description;
    card.appendChild(description);

    // Meta row: date + read time
    const metaRow = document.createElement('div');
    metaRow.style.cssText = 'display:flex;align-items:center;gap:12px;margin-top:auto;';

    const date = document.createElement('p');
    date.classList.add('date');
    date.textContent = blog.date;
    date.style.margin = '0';
    metaRow.appendChild(date);

    const readTime = document.createElement('span');
    readTime.classList.add('read-time');
    const mins = estimateReadTime(blog.description);
    readTime.innerHTML = `<i class="fas fa-clock"></i> ${mins} min read`;
    metaRow.appendChild(readTime);

    card.appendChild(metaRow);

    blogList.appendChild(card);
  });

  observeCardsWithStagger('.blog-card');
}

fetch('data/blog-data.json')
  .then(r => r.json())
  .then(data => {
    allBlogs = data.blogs.sort((a, b) => new Date(`${b.date} 01`) - new Date(`${a.date} 01`));
    updateBlogList(allBlogs);
  });

// ─── Skills ───────────────────────────────────────────────────────────────────
const skillsContainer = document.getElementById('skills-container');

fetch('data/skills.json')
  .then(r => r.json())
  .then(data => {
    data.skills.forEach(skill => {
      const card = document.createElement('div');
      card.classList.add('skill-card');

      const icon = document.createElement('i');
      icon.classList.add(skill.icon);
      card.appendChild(icon);

      const title = document.createElement('h3');
      title.textContent = skill.title;
      card.appendChild(title);

      const desc = document.createElement('p');
      desc.textContent = skill.description;
      card.appendChild(desc);

      const skillBar = document.createElement('div');
      skillBar.classList.add('skill-bar');
      const skillFill = document.createElement('div');
      skillFill.classList.add('skill-fill');
      skillFill.dataset.level = skill.level;
      skillBar.appendChild(skillFill);
      card.appendChild(skillBar);

      skillsContainer.appendChild(card);
    });

    observeSkillBars();
  });

// ─── Background Video Rotation ────────────────────────────────────────────────
const aboutVideo = document.querySelector('#about-video');
const aboutImageOverlay = document.querySelector('.about-image-overlay');
const textOverlay = document.createElement('div');
textOverlay.classList.add('text-overlay');
if (aboutImageOverlay) {
  aboutImageOverlay.parentElement.appendChild(textOverlay);
}

const videoSources = [
  { src: 'images/videos/quadruped_rl.mp4', title: 'Reinforcement Learning' },
  { src: 'images/videos/aloha.mp4', title: 'Imitation Learning' },
  { src: 'images/videos/b2.mp4', title: 'Unitree B2 Quadruped' },
  { src: 'images/videos/robocon3.mp4', title: 'Autonomous Robots' },
  { src: 'images/videos/ariac.mp4', title: 'AGILE Robot Infrastructure' },
  { src: 'images/videos/drne.mp4', title: 'Drones' },
  { src: 'images/videos/autorobot.mp4', title: 'Autonomous Robot Exploration' },
  { src: 'images/videos/auto_vehicle.mp4', title: 'Autonomous Vehicle' },
  { src: 'images/videos/firefly.mp4', title: 'Firefly Swarm Robotics' },
];
let videoIndex = 0;

function changeBackgroundVideo() {
  if (!aboutVideo) return;
  aboutVideo.style.opacity = '0';
  textOverlay.style.opacity = '0';
  textOverlay.style.transform = 'translateX(100%)';

  setTimeout(() => {
    videoIndex = (videoIndex + 1) % videoSources.length;
    aboutVideo.src = videoSources[videoIndex].src;
    aboutVideo.play();
    textOverlay.textContent = videoSources[videoIndex].title;
    textOverlay.style.transform = 'translateX(0)';
    aboutVideo.style.opacity = '1';
    textOverlay.style.opacity = '1';
  }, 1000);
}

if (aboutVideo && aboutImageOverlay) {
  setTimeout(() => {
    aboutImageOverlay.style.opacity = '0';
    aboutVideo.style.opacity = '1';
    textOverlay.style.opacity = '1';
    textOverlay.style.transform = 'translateX(0)';
    aboutVideo.src = videoSources[videoIndex].src;
    aboutVideo.play();
    textOverlay.textContent = videoSources[videoIndex].title;
    setInterval(changeBackgroundVideo, 7000);
  }, 1600);
}

// ─── Resume Modal ─────────────────────────────────────────────────────────────
function openModal() {
  document.getElementById('resumeModal').style.display = 'block';
}

function closeModal() {
  document.getElementById('resumeModal').style.display = 'none';
}

window.addEventListener('click', (event) => {
  const modal = document.getElementById('resumeModal');
  if (modal && event.target === modal) {
    modal.style.display = 'none';
  }
});
