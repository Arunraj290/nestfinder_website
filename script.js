// ─── NestFinder Global Script ─────────────────────────────────────────

// ── Nav scroll effect
const nav = document.querySelector('.nav');
if (nav) {
  window.addEventListener('scroll', () => {
    nav.classList.toggle('nav-scrolled', window.scrollY > 20);
  });
}

// ── Mobile nav
const hamburger = document.querySelector('.nav-hamburger');
const navLinks = document.querySelector('.nav-links');
if (hamburger && navLinks) {
  hamburger.addEventListener('click', () => {
    navLinks.style.display = navLinks.style.display === 'flex' ? 'none' : 'flex';
    navLinks.style.flexDirection = 'column';
    navLinks.style.position = 'absolute';
    navLinks.style.top = '70px';
    navLinks.style.left = '0';
    navLinks.style.right = '0';
    navLinks.style.background = 'white';
    navLinks.style.padding = '20px';
    navLinks.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)';
    navLinks.style.zIndex = '999';
  });
}

// ── Scroll animations
const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: 0.1 });
document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));

// ── Toast utility
function showToast(msg, emoji = '✅') {
  let t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    t.className = 'toast';
    document.body.appendChild(t);
  }
  t.innerHTML = `<span>${emoji}</span> ${msg}`;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

// ── Fetch properties
async function fetchProperties() {
  try {
    const res = await fetch('properties.json');
    return await res.json();
  } catch {
    console.warn('Using embedded fallback data');
    return [];
  }
}

// ── Format price
function formatPrice(p) {
  return p >= 100000
    ? '₹' + (p / 100000).toFixed(1) + 'L'
    : '₹' + p.toLocaleString('en-IN');
}

// ── Render property cards
function renderCards(props, containerId) {
  const c = document.getElementById(containerId);
  if (!c) return;
  c.innerHTML = props.map(p => `
    <div class="prop-card fade-in" onclick="window.location='property.html?id=${p.id}'">
      <div class="prop-card-img">
        <img src="${p.images[0]}" alt="${p.title}" loading="lazy">
        <span class="prop-badge badge-${p.type}">${p.type}</span>
        <button class="prop-fav" onclick="event.stopPropagation();this.classList.toggle('active')" title="Save">♥</button>
      </div>
      <div class="prop-card-body">
        <div class="prop-price">${formatPrice(p.price)}<span>/month</span></div>
        <div class="prop-title">${p.title}</div>
        <div class="prop-addr">📍 ${p.city}</div>
        <div class="prop-tags">
          <span class="prop-tag">${p.bhk}</span>
          <span class="prop-tag">Floor ${p.floor}</span>
          ${p.amenities.slice(0,2).map(a => `<span class="prop-tag">${a}</span>`).join('')}
        </div>
        <div class="prop-card-foot">
          <span class="prop-owner">👤 ${p.owner.name}</span>
          <a href="property.html?id=${p.id}" class="btn-view">View →</a>
        </div>
      </div>
    </div>
  `).join('');
  document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));
}

// ── Hero search redirect
const heroForm = document.querySelector('.hero-search');
if (heroForm) {
  heroForm.addEventListener('submit', e => {
    e.preventDefault();
    const q = heroForm.querySelector('input').value.trim();
    if (q) window.location = `map.html?search=${encodeURIComponent(q)}`;
  });
  heroForm.querySelector('input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); heroForm.dispatchEvent(new Event('submit')); }
  });
}
const heroBtn = document.querySelector('.hero-search-btn');
if (heroBtn) {
  heroBtn.addEventListener('click', () => heroForm?.dispatchEvent(new Event('submit')));
}

// ── Homepage featured properties
(async () => {
  if (!document.getElementById('featuredCards')) return;
  const props = await fetchProperties();
  renderCards(props.slice(0, 6), 'featuredCards');

  // filter chips
  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', function () {
      document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      this.classList.add('active');
      const f = this.dataset.filter;
      const filtered = f === 'all' ? props : props.filter(p => p.type === f);
      renderCards(filtered.slice(0, 6), 'featuredCards');
    });
  });

  // price slider
  const slider = document.getElementById('priceSlider');
  const sliderVal = document.getElementById('priceVal');
  if (slider) {
    slider.addEventListener('input', () => {
      const max = parseInt(slider.value);
      sliderVal.textContent = formatPrice(max);
      const activeChip = document.querySelector('.filter-chip.active');
      const f = activeChip?.dataset.filter || 'all';
      const filtered = (f === 'all' ? props : props.filter(p => p.type === f))
        .filter(p => p.price <= max);
      renderCards(filtered.slice(0, 6), 'featuredCards');
    });
  }
})();

// ─── MAP PAGE ──────────────────────────────────────────────────────────
(async () => {
  if (!document.getElementById('map')) return;

  const props = await fetchProperties();
  let map, markers = [], drawCircle = null, drawMode = false;
  let allProps = [...props];

  // Init map
  map = L.map('map', { zoomControl: true }).setView([20.5937, 78.9629], 5);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
    maxZoom: 19
  }).addTo(map);

  // Marker icon factory
  function makeIcon(p) {
    const colors = { apartment: '#00A699', house: '#FFB400', shop: '#FF5A5F' };
    const color = colors[p.type] || '#FF5A5F';
    return L.divIcon({
      className: '',
      html: `<div style="
        background:white; border:2.5px solid ${color}; color:${color};
        border-radius:50px; padding:5px 10px; font-weight:700;
        font-size:11px; white-space:nowrap; box-shadow:0 2px 10px rgba(0,0,0,0.15);
        font-family:'Syne',sans-serif; cursor:pointer;
        transition:all 0.2s;">
        ${formatPrice(p.price)}
      </div>`,
      iconAnchor: [30, 16]
    });
  }

  // Popup factory
  function makePopup(p) {
    return `
      <div>
        <img src="${p.images[0]}" alt="${p.title}" class="popup-img">
        <div class="popup-body">
          <div class="popup-price">${formatPrice(p.price)}<span style="font-size:0.72rem;font-weight:400;color:#9CA8B8">/month</span></div>
          <div class="popup-title">${p.title}</div>
          <div class="popup-desc">${p.bhk} · ${p.type} · ${p.city}</div>
          <a href="property.html?id=${p.id}" class="popup-btn">View Details →</a>
        </div>
      </div>
    `;
  }

  // Add markers
  function addMarkers(pList) {
    markers.forEach(m => m.remove());
    markers = [];
    pList.forEach(p => {
      const m = L.marker([p.lat, p.lng], { icon: makeIcon(p) }).addTo(map);
      m.bindPopup(makePopup(p), { maxWidth: 250, minWidth: 240 });
      m.on('click', () => highlightSidebar(p.id));
      markers.push(m);
    });
    renderSidebar(pList);
  }

  // Sidebar
  function renderSidebar(pList) {
    const el = document.getElementById('sidebarResults');
    const count = document.getElementById('resultsCount');
    if (count) count.innerHTML = `Found <strong>${pList.length}</strong> properties`;
    if (!el) return;
    if (pList.length === 0) {
      el.innerHTML = `<div style="text-align:center;padding:40px;color:#9CA8B8">
        <div style="font-size:2rem;margin-bottom:10px">🔍</div>
        <p>No properties in this area</p>
      </div>`;
      return;
    }
    el.innerHTML = pList.map(p => `
      <div class="sidebar-card" id="sc_${p.id}" onclick="window.location='property.html?id=${p.id}'">
        <img src="${p.images[0]}" alt="${p.title}" class="sidebar-card-img" onerror="this.src='https://via.placeholder.com/80x72'">
        <div class="sidebar-card-info">
          <div class="sidebar-card-price">${formatPrice(p.price)}/mo</div>
          <div class="sidebar-card-title">${p.title}</div>
          <div class="sidebar-card-sub">📍 ${p.city} · ${p.bhk} ${p.type}</div>
        </div>
      </div>
    `).join('');
  }

  function highlightSidebar(id) {
    document.querySelectorAll('.sidebar-card').forEach(c => c.classList.remove('highlighted'));
    const el = document.getElementById(`sc_${id}`);
    if (el) { el.classList.add('highlighted'); el.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
  }

  // Initial load
  addMarkers(allProps);

  // Search by location name
  const searchInput = document.getElementById('mapSearch');
  const searchBtn = document.getElementById('mapSearchBtn');

  async function geocode(q) {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`);
      const data = await res.json();
      if (data.length > 0) {
        const { lat, lon } = data[0];
        map.setView([parseFloat(lat), parseFloat(lon)], 12);
        showToast(`Showing results near ${q}`, '📍');
      } else {
        showToast('Location not found. Try another name.', '⚠️');
      }
    } catch {
      showToast('Search failed. Check internet connection.', '❌');
    }
  }

  if (searchBtn) searchBtn.addEventListener('click', () => geocode(searchInput?.value));
  if (searchInput) {
    searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') geocode(searchInput.value); });
    // pre-fill from URL
    const urlSearch = new URLSearchParams(window.location.search).get('search');
    if (urlSearch) { searchInput.value = urlSearch; geocode(urlSearch); }
  }

  // ── Draw circle mode
  let drawStart = null;
  const drawBtn = document.getElementById('drawCircleBtn');
  const clearBtn = document.getElementById('clearCircleBtn');

  if (drawBtn) {
    drawBtn.addEventListener('click', () => {
      drawMode = !drawMode;
      drawBtn.classList.toggle('active', drawMode);
      map.getContainer().style.cursor = drawMode ? 'crosshair' : '';
      if (!drawMode) showToast('Draw mode off', '✏️');
      else showToast('Click on map to set circle center, then drag', '🎯');
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (drawCircle) { drawCircle.remove(); drawCircle = null; }
      addMarkers(allProps);
      const ri = document.getElementById('radiusInfo');
      if (ri) ri.classList.remove('show');
      showToast('Circle cleared', '🗑️');
    });
  }

  // Click to place circle
  map.on('click', function (e) {
    if (!drawMode) return;
    if (drawCircle) { drawCircle.remove(); drawCircle = null; }
    drawStart = e.latlng;
    drawCircle = L.circle(drawStart, {
      radius: 5000,
      color: '#FF5A5F', fillColor: '#FF5A5F',
      fillOpacity: 0.08, weight: 2, dashArray: '6,4'
    }).addTo(map);
    filterByCircle(drawStart, 5000);
    const ri = document.getElementById('radiusInfo');
    if (ri) { ri.textContent = `📏 Circle: 5km radius`; ri.classList.add('show'); }
    drawMode = false;
    if (drawBtn) drawBtn.classList.remove('active');
    map.getContainer().style.cursor = '';
    showToast('Circle placed! Adjust radius with slider →', '✅');
  });

  // Radius slider
  const radiusSlider = document.getElementById('radiusSlider');
  if (radiusSlider) {
    radiusSlider.addEventListener('input', () => {
      const km = parseInt(radiusSlider.value);
      document.getElementById('radiusLabel').textContent = `${km} km`;
      if (drawCircle && drawStart) {
        drawCircle.setRadius(km * 1000);
        filterByCircle(drawStart, km * 1000);
        const ri = document.getElementById('radiusInfo');
        if (ri) { ri.textContent = `📏 Circle: ${km}km radius`; ri.classList.add('show'); }
      }
    });
  }

  function filterByCircle(center, radiusM) {
    const filtered = allProps.filter(p => {
      const d = map.distance(center, L.latLng(p.lat, p.lng));
      return d <= radiusM;
    });
    addMarkers(filtered);
  }

  // Property type filter chips on map
  document.querySelectorAll('.map-filter-chip').forEach(chip => {
    chip.addEventListener('click', function () {
      this.classList.toggle('active');
      const activeFilters = [...document.querySelectorAll('.map-filter-chip.active')].map(c => c.dataset.type);
      const filtered = activeFilters.length === 0 ? allProps : allProps.filter(p => activeFilters.includes(p.type));
      addMarkers(filtered);
    });
  });

})();

// ─── PROPERTY DETAIL PAGE ──────────────────────────────────────────────
(async () => {
  if (!document.getElementById('propDetail')) return;
  const id = parseInt(new URLSearchParams(window.location.search).get('id'));
  const props = await fetchProperties();
  const p = props.find(x => x.id === id);
  if (!p) { document.getElementById('propDetail').innerHTML = '<p style="padding:40px">Property not found.</p>'; return; }

  // Gallery
  const galleryEl = document.getElementById('detailGallery');
  if (galleryEl) {
    galleryEl.innerHTML = p.images.slice(0, 3).map((img, i) =>
      `<img src="${img}" alt="${p.title} ${i+1}" onclick="openLightbox(${i})">`
    ).join('');
  }

  // Title
  document.getElementById('detailTitle').textContent = p.title;
  document.getElementById('detailBadge').textContent = p.type;
  document.getElementById('detailBadge').className = `detail-badge badge-${p.type}`;
  document.getElementById('detailCity').textContent = `📍 ${p.address}`;
  document.getElementById('detailDesc').textContent = p.description;

  // Amenities
  const amenEl = document.getElementById('detailAmenities');
  if (amenEl) {
    const icons = { WiFi: '📶', Parking: '🚗', Gym: '💪', Pool: '🏊', Security: '🔐', Garden: '🌿', AC: '❄️', Terrace: '🌇', 'Power Backup': '⚡', Lift: '🛗', Laundry: '👕', CCTV: '📷' };
    amenEl.innerHTML = p.amenities.map(a => `
      <div class="amenity-pill">${icons[a] || '✓'} ${a}</div>
    `).join('');
  }

  // Price card
  document.getElementById('detailPrice').innerHTML = `${formatPrice(p.price)}<span>/month</span>`;
  document.getElementById('detailDeposit').textContent = formatPrice(p.deposit);
  document.getElementById('detailMinStay').textContent = `${p.minStay} months`;
  document.getElementById('detailBhk').textContent = p.bhk;
  document.getElementById('detailFloor').textContent = p.floor === 0 ? 'Ground' : `${p.floor}${['','st','nd','rd'][p.floor]||'th'}`;

  // Agreement
  document.getElementById('detailAgrTerms').innerHTML = `
    <div class="agr-highlight">Security Deposit: ${formatPrice(p.deposit)}</div>
    <div class="agr-highlight">Minimum Stay: ${p.minStay} months</div>
    <div class="agr-highlight">Payment: ${p.paymentTerms}</div>
    <p style="margin-top:10px;color:var(--text-sub);font-size:0.85rem">${p.agreement}</p>
  `;

  // Owner
  document.getElementById('ownerName').textContent = p.owner.name;
  document.getElementById('ownerInitial').textContent = p.owner.name.charAt(0);
  document.getElementById('ownerPhone').href = `tel:${p.owner.phone}`;
  document.getElementById('ownerEmail').href = `mailto:${p.owner.email}`;

  // Buttons
  document.getElementById('scheduleBtn').href = `schedule.html?id=${p.id}`;
  document.getElementById('agreementBtn').href = `agreement.html?id=${p.id}`;

  // Lightbox
  window.openLightbox = function(i) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:9999;display:flex;align-items:center;justify-content:center;`;
    overlay.innerHTML = `
      <img src="${p.images[i]}" style="max-width:90vw;max-height:90vh;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,0.5)">
      <button onclick="document.body.removeChild(this.parentElement)" style="position:absolute;top:20px;right:28px;background:none;border:none;color:white;font-size:2rem;cursor:pointer;">✕</button>
    `;
    overlay.addEventListener('click', e => { if (e.target === overlay) document.body.removeChild(overlay); });
    document.body.appendChild(overlay);
  };
})();

// ─── UPLOAD PAGE ───────────────────────────────────────────────────────
(() => {
  const form = document.getElementById('uploadForm');
  if (!form) return;

  // File drop
  const drop = document.getElementById('imageDrop');
  const fileInput = document.getElementById('imageFiles');
  const preview = document.getElementById('imagePreview');

  if (drop) {
    drop.addEventListener('click', () => fileInput?.click());
    drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('drag-over'); });
    drop.addEventListener('dragleave', () => drop.classList.remove('drag-over'));
    drop.addEventListener('drop', e => {
      e.preventDefault(); drop.classList.remove('drag-over');
      handleFiles(e.dataTransfer.files);
    });
  }
  if (fileInput) {
    fileInput.addEventListener('change', () => handleFiles(fileInput.files));
  }

  function handleFiles(files) {
    if (!preview) return;
    preview.innerHTML = '';
    [...files].forEach(f => {
      const reader = new FileReader();
      reader.onload = e => {
        const img = document.createElement('img');
        img.src = e.target.result;
        img.className = 'file-preview-thumb';
        preview.appendChild(img);
      };
      reader.readAsDataURL(f);
    });
  }

  form.addEventListener('submit', e => {
    e.preventDefault();
    form.style.display = 'none';
    const msg = document.getElementById('successMsg');
    if (msg) msg.classList.add('show');
    showToast('Listing submitted successfully!', '🎉');
  });
})();

// ─── SCHEDULE PAGE ─────────────────────────────────────────────────────
(async () => {
  const form = document.getElementById('scheduleForm');
  if (!form) return;

  const id = parseInt(new URLSearchParams(window.location.search).get('id'));
  const props = await fetchProperties();
  const p = props.find(x => x.id === id);

  if (p) {
    const card = document.getElementById('schedulePropCard');
    if (card) {
      card.innerHTML = `
        <img src="${p.images[0]}" class="schedule-prop-img" alt="${p.title}">
        <div>
          <div class="schedule-prop-title">${p.title}</div>
          <div class="schedule-prop-price">${formatPrice(p.price)}/month</div>
        </div>
      `;
    }
  }

  form.addEventListener('submit', e => {
    e.preventDefault();
    form.style.display = 'none';
    document.getElementById('scheduleSuccess')?.classList.add('show');
    showToast('Visit scheduled! We\'ll confirm shortly.', '📅');
  });
})();

// ─── AGREEMENT PAGE ────────────────────────────────────────────────────
(async () => {
  if (!document.getElementById('agrContent')) return;
  const id = parseInt(new URLSearchParams(window.location.search).get('id'));
  const props = await fetchProperties();
  const p = props.find(x => x.id === id);
  if (!p) return;

  document.getElementById('agrPropertyName').textContent = p.title;
  document.getElementById('agrOwnerName').textContent = p.owner.name;
  document.getElementById('agrAddress').textContent = p.address;
  document.getElementById('agrRent').textContent = formatPrice(p.price);
  document.getElementById('agrDeposit').textContent = formatPrice(p.deposit);
  document.getElementById('agrMinStay').textContent = `${p.minStay} months`;
  document.getElementById('agrPaymentTerms').textContent = p.paymentTerms;
  document.getElementById('agrDate').textContent = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
})();
