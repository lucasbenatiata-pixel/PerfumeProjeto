document.addEventListener('DOMContentLoaded', () => {
  
  // ----- PRELOADER LOGIC -----
  window.addEventListener('load', () => {
    // Dá um tempinho extra para exibir a animação linda do perfume espirrando
    setTimeout(() => {
      const preloader = document.getElementById('preloader');
      if(preloader) {
        preloader.classList.add('hidden');
        setTimeout(() => preloader.style.display = 'none', 800); // remove do DOM
      }
    }, 2000); 
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
  
  let favorites = JSON.parse(localStorage.getItem('terra_favorites') || '[]');
  let showFavorites = false;

  document.getElementById('favCountBadge').textContent = favorites.length;

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
  searchInput.addEventListener('input', e => {
    searchQuery = e.target.value;
    clearSearchBtn.style.display = searchQuery ? 'block' : 'none';
    currentPage = 1; render();
  });
  
  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = ''; searchQuery = ''; clearSearchBtn.style.display = 'none';
    currentPage = 1; render();
  });

  // Sort & Favs
  sortSelect.addEventListener('change', e => { currentSort = e.target.value; currentPage = 1; render(); });
  document.getElementById('favoritesFilterBtn').addEventListener('click', function() {
    showFavorites = !showFavorites;
    this.classList.toggle('active');
    currentPage = 1; render();
  });

  document.getElementById('resetFiltersBtn').addEventListener('click', resetAll);
  document.getElementById('emptyResetBtn').addEventListener('click', resetAll);
  
  function resetAll() {
    activeFilters = { gender: [], family: [], occasion: [], intensity: [] };
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    searchInput.value = ''; searchQuery = ''; clearSearchBtn.style.display='none';
    showFavorites = false; document.getElementById('favoritesFilterBtn').classList.remove('active');
    currentPage = 1; render();
  }

  window.removeActiveFilter = (type, val) => {
    activeFilters[type] = activeFilters[type].filter(v => v !== val);
    document.querySelector(`.chip-group[data-filter="${type}"] .chip[data-value="${val}"]`).classList.remove('active');
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
      activeTagsBar.style.display = 'none';
    }

    let filtered = database.filter(p => {
      if(showFavorites && !favorites.includes(p.id)) return false;
      
      if(qNorm) {
        const txt = normalize(`${p.name} ${p.brand} ${p.family} ${p.topNotes} ${p.baseNotes}`);
        if(!txt.includes(qNorm)) return false;
      }
      
      if(activeFilters.gender.length && !activeFilters.gender.some(g => g === p.gender || p.gender==='Unissex')) return false;
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

    resultsCount.textContent = filtered.length;
    
    const emptyState = document.getElementById('emptyState');
    if(filtered.length === 0) {
      catalogGrid.innerHTML = '';
      emptyState.style.display = 'block';
      document.getElementById('paginationWrapper').style.display = 'none';
      return;
    }
    emptyState.style.display = 'none';

    const itemsToShow = filtered.slice(0, currentPage * ITEMS_PER_PAGE);
    document.getElementById('paginationWrapper').style.display = itemsToShow.length < filtered.length ? 'block' : 'none';
    document.getElementById('loadMoreRemaining').textContent = filtered.length - itemsToShow.length;

    catalogGrid.innerHTML = itemsToShow.map(p => `
      <div class="card" onclick="openModal(${p.id})">
        <div class="card-media">
          <span class="card-badge-rank">#${p.salesRank} GLOBAL</span>
          <button class="card-fav-btn ${favorites.includes(p.id) ? 'favorited' : ''}" onclick="toggleFav(event, ${p.id})">♥</button>
          <img src="${p.image}" loading="lazy">
        </div>
        <div class="card-body">
          <div class="card-brand">${p.brand}</div>
          <h3 class="card-name">${p.name}</h3>
          <div class="card-meta"><span>★ ${p.rating.toFixed(1)}</span><span>${p.intensity.split('/')[0]}</span></div>
          <div class="card-tags"><span class="tag-badge">${p.family}</span><span class="tag-badge">${p.gender}</span></div>
        </div>
      </div>
    `).join('');
  }

  loadMoreBtn.addEventListener('click', () => { currentPage++; render(); });

  window.toggleFav = (e, id) => {
    e.stopPropagation();
    if(favorites.includes(id)) { favorites = favorites.filter(x => x !== id); showToast('Removido dos favoritos 💔');}
    else { favorites.push(id); showToast('Salvo nos favoritos ♥');}
    localStorage.setItem('terra_favorites', JSON.stringify(favorites));
    document.getElementById('favCountBadge').textContent = favorites.length;
    render();
  };

  window.openModal = id => {
    const p = database.find(x => x.id === id);
    document.getElementById('modalBody').innerHTML = `
      <div class="modal-media"><img src="${p.image}"></div>
      <div class="modal-details">
        <div class="modal-brand">${p.brand}</div>
        <h2 class="modal-title">${p.name}</h2>
        <p style="color:#d4af37; margin-bottom:15px; font-weight:bold;">★ ${p.rating} | Rank #${p.salesRank}</p>
        <p class="modal-desc">${p.description}</p>
        <div class="pyramid-box">
          <div class="pyramid-row"><span class="lvl-name">Topo:</span><span class="lvl-notes">${p.topNotes}</span></div>
          <div class="pyramid-row"><span class="lvl-name">Corpo:</span><span class="lvl-notes">${p.heartNotes}</span></div>
          <div class="pyramid-row"><span class="lvl-name">Fundo:</span><span class="lvl-notes">${p.baseNotes}</span></div>
        </div>
      </div>
    `;
    modal.classList.add('active');
  };

  document.getElementById('modalCloseBtn').addEventListener('click', () => modal.classList.remove('active'));
  modal.addEventListener('click', e => { if(e.target === modal) modal.classList.remove('active'); });

  function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg; t.classList.add('active');
    setTimeout(() => t.classList.remove('active'), 2500);
  }

  // Init (wait for window load to let preloader shine)
  render();
});