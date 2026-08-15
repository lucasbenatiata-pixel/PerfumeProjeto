document.addEventListener('DOMContentLoaded', () => {
  
  // ----- PRELOADER LOGIC -----
  window.addEventListener('load', () => {
    setTimeout(() => {
      const preloader = document.getElementById('preloader');
      if(preloader) {
        preloader.classList.add('hidden');
        setTimeout(() => preloader.style.display = 'none', 800);
      }
    }, 1500); 
  });

  // Efeitos Navbar Scrolled
  window.addEventListener('scroll', () => {
    const nav = document.getElementById('navbar');
    if(window.scrollY > 50) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
  });

  const catalogGrid = document.getElementById('catalogGrid');
  const searchInput = document.getElementById('searchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  const sortSelect = document.getElementById('sortSelect');
  const resultsCount = document.getElementById('resultsCount');
  const activeTagsBar = document.getElementById('activeTagsBar');
  const activeTagsList = document.getElementById('activeTagsList');
  const loadMoreBtn = document.getElementById('loadMoreBtn');
  const modal = document.getElementById('perfumeModal');

  let database = window.PERFUMES_DB || [];
  let currentPage = 1;
  const ITEMS_PER_PAGE = 24;
  let activeFilters = { gender: [], family: [], occasion: [], intensity: [] };
  let searchQuery = '';
  let currentSort = 'salesRank';
  
  let favorites = JSON.parse(localStorage.getItem('duchi_favorites') || '[]');
  let showFavorites = false;

  const favBadge = document.getElementById('favCountBadge');
  if(favBadge) favBadge.textContent = favorites.length;

  function normalize(str) {
    return str ? str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() : '';
  }

  // Bind Chips
  document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
      const type = e.target.closest('.chip-group').dataset.filter;
      const val = e.target.dataset.value;
      e.target.classList.toggle('active');
      
      if(activeFilters[type].includes(val)) {
        activeFilters[type] = activeFilters[type].filter(v => v !== val);
      } else {
        activeFilters[type].push(val);
      }
      currentPage = 1;
      render();
    });
  });

  // Search
  if(searchInput) {
    searchInput.addEventListener('input', e => {
      searchQuery = e.target.value;
      clearSearchBtn.style.display = searchQuery ? 'block' : 'none';
      currentPage = 1; render();
    });
  }
  
  if(clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => {
      searchInput.value = ''; searchQuery = ''; clearSearchBtn.style.display = 'none';
      currentPage = 1; render();
    });
  }

  // Sort & Favs
  if(sortSelect) {
    sortSelect.addEventListener('change', e => { currentSort = e.target.value; currentPage = 1; render(); });
  }
  
  const favFilterBtn = document.getElementById('favoritesFilterBtn');
  if(favFilterBtn) {
    favFilterBtn.addEventListener('click', function() {
      showFavorites = !showFavorites;
      this.classList.toggle('active');
      currentPage = 1; render();
    });
  }

  const resetBtn = document.getElementById('resetFiltersBtn');
  const emptyResetBtn = document.getElementById('emptyResetBtn');
  if(resetBtn) resetBtn.addEventListener('click', resetAll);
  if(emptyResetBtn) emptyResetBtn.addEventListener('click', resetAll);
  
  function resetAll() {
    activeFilters = { gender: [], family: [], occasion: [], intensity: [] };
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    if(searchInput) searchInput.value = ''; 
    searchQuery = ''; 
    if(clearSearchBtn) clearSearchBtn.style.display='none';
    showFavorites = false; 
    if(favFilterBtn) favFilterBtn.classList.remove('active');
    currentPage = 1; render();
  }

  window.removeActiveFilter = (type, val) => {
    activeFilters[type] = activeFilters[type].filter(v => v !== val);
    const chip = document.querySelector(`.chip-group[data-filter="${type}"] .chip[data-value="${val}"]`);
    if(chip) chip.classList.remove('active');
    currentPage = 1; render();
  };

  function render() {
    const qNorm = normalize(searchQuery);
    
    // Atualiza Tags Ativas
    const tags = Object.entries(activeFilters).flatMap(([k,v]) => v.map(val => ({k, val})));
    if(tags.length > 0) {
      activeTagsBar.style.display = 'flex';
      activeTagsList.innerHTML = tags.map(t => `<span class="active-tag-chip" onclick="removeActiveFilter('${t.k}','${t.val}')">${t.val} &times;</span>`).join('');
    } else {
      if(activeTagsBar) activeTagsBar.style.display = 'none';
    }

    let filtered = database.filter(p => {
      if(showFavorites && !favorites.includes(p.id)) return false;
      
      if(qNorm) {
        const txt = normalize(`${p.name} ${p.brand} ${p.family} ${p.topNotes} ${p.baseNotes}`);
        if(!txt.includes(qNorm)) return false;
      }
      
      if(activeFilters.gender.length && !activeFilters.gender.some(g => g === p.gender || p.gender==='Unissex' || g==='Unissex')) return false;
      if(activeFilters.family.length && !activeFilters.family.some(f => normalize(p.family).includes(normalize(f)))) return false;
      if(activeFilters.occasion.length && !activeFilters.occasion.some(o => p.occasions.map(normalize).some(po => po.includes(normalize(o))))) return false;
      if(activeFilters.intensity.length && !activeFilters.intensity.includes(p.intensity)) return false;

      return true;
    });

    filtered.sort((a,b) => {
      if(currentSort==='salesRank') return a.salesRank - b.salesRank;
      if(currentSort==='rating') return b.rating - a.rating;
      if(currentSort==='brand') return a.brand.localeCompare(b.brand);
      return a.name.localeCompare(b.name);
    });

    if(resultsCount) resultsCount.textContent = filtered.length;
    
    const emptyState = document.getElementById('emptyState');
    if(filtered.length === 0) {
      if(catalogGrid) catalogGrid.innerHTML = '';
      if(emptyState) emptyState.style.display = 'block';
      const pagWrap = document.getElementById('paginationWrapper');
      if(pagWrap) pagWrap.style.display = 'none';
      return;
    }
    if(emptyState) emptyState.style.display = 'none';

    const itemsToShow = filtered.slice(0, currentPage * ITEMS_PER_PAGE);
    const pagWrap = document.getElementById('paginationWrapper');
    if(pagWrap) pagWrap.style.display = itemsToShow.length < filtered.length ? 'block' : 'none';
    
    const rem = document.getElementById('loadMoreRemaining');
    if(rem) rem.textContent = filtered.length - itemsToShow.length;

    if(catalogGrid) {
      catalogGrid.innerHTML = itemsToShow.map(p => {
        const isFav = favorites.includes(p.id);
        const heartSVG = `<svg viewBox="0 0 24 24" fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>`;
        
        return `
        <div class="card" onclick="openModal(${p.id})">
          <div class="card-media">
            <span class="card-badge-rank">#${p.salesRank}</span>
            <button class="card-fav-btn ${isFav ? 'favorited' : ''}" onclick="toggleFav(event, ${p.id})">
              ${heartSVG}
            </button>
            <img src="${p.image}" loading="lazy" alt="${p.name}">
          </div>
          <div class="card-body">
            <div class="card-brand">${p.brand}</div>
            <h3 class="card-name">${p.name}</h3>
            <div class="card-meta"><span>★ ${p.rating.toFixed(1)}</span><span>${p.intensity.split('/')[0]}</span></div>
            <div class="card-tags"><span class="tag-badge">${p.family}</span><span class="tag-badge">${p.gender}</span></div>
          </div>
        </div>
      `}).join('');
    }
  }

  if(loadMoreBtn) {
    loadMoreBtn.addEventListener('click', () => { currentPage++; render(); });
  }

  window.toggleFav = (e, id) => {
    e.stopPropagation();
    if(favorites.includes(id)) { 
      favorites = favorites.filter(x => x !== id); 
      showToast('Removido da sua coleção');
    } else { 
      favorites.push(id); 
      showToast('Adicionado à sua coleção');
    }
    localStorage.setItem('duchi_favorites', JSON.stringify(favorites));
    if(favBadge) favBadge.textContent = favorites.length;
    render();
  };

  window.openModal = id => {
    const p = database.find(x => x.id === id);
    document.getElementById('modalBody').innerHTML = `
      <div class="modal-media"><img src="${p.image}" alt="${p.name}"></div>
      <div class="modal-details">
        <div class="modal-brand">${p.brand}</div>
        <h2 class="modal-title">${p.name}</h2>
        <p style="color:var(--gold); margin-bottom:15px; font-weight:700; font-family:var(--font-sans); font-size:0.85rem;">
          ★ ${p.rating.toFixed(1)} | RANKING #${p.salesRank} | ${p.gender.toUpperCase()}
        </p>
        <p class="modal-desc">${p.description}</p>
        <div class="pyramid-box">
          <div class="pyramid-row"><span class="lvl-name">Topo</span><span class="lvl-notes">${p.topNotes}</span></div>
          <div class="pyramid-row"><span class="lvl-name">Corpo</span><span class="lvl-notes">${p.heartNotes}</span></div>
          <div class="pyramid-row"><span class="lvl-name">Fundo</span><span class="lvl-notes">${p.baseNotes}</span></div>
        </div>
      </div>
    `;
    if(modal) modal.classList.add('active');
  };

  const modClose = document.getElementById('modalCloseBtn');
  if(modClose) modClose.addEventListener('click', () => modal.classList.remove('active'));
  
  if(modal) {
    modal.addEventListener('click', e => { if(e.target === modal) modal.classList.remove('active'); });
  }

  function showToast(msg) {
    const t = document.getElementById('toast');
    if(!t) return;
    t.textContent = msg; 
    t.classList.add('active');
    setTimeout(() => t.classList.remove('active'), 2500);
  }

  render();
});
