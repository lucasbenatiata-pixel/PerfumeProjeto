/**
 * NOIR PARFUMS - Recommendation Engine & Interactive Filtering
 * Real multi-faceted filtering + Accent-Insensitive Instant Search
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const catalogGrid = document.getElementById('catalogGrid');
  const searchInput = document.getElementById('searchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  const sortSelect = document.getElementById('sortSelect');
  const resultsCount = document.getElementById('resultsCount');
  const totalPerfumesStat = document.getElementById('totalPerfumesStat');
  const resetFiltersBtn = document.getElementById('resetFiltersBtn');
  const emptyResetBtn = document.getElementById('emptyResetBtn');
  const activeTagsBar = document.getElementById('activeTagsBar');
  const activeTagsList = document.getElementById('activeTagsList');
  const emptyState = document.getElementById('emptyState');
  const emptyStateMsg = document.getElementById('emptyStateMsg');
  const loadMoreBtn = document.getElementById('loadMoreBtn');
  const loadMoreRemaining = document.getElementById('loadMoreRemaining');
  const paginationWrapper = document.getElementById('paginationWrapper');
  const favoritesFilterBtn = document.getElementById('favoritesFilterBtn');
  const favCountBadge = document.getElementById('favCountBadge');
  const toast = document.getElementById('toast');

  // Modal Elements
  const modal = document.getElementById('perfumeModal');
  const modalBody = document.getElementById('modalBody');
  const modalCloseBtn = document.getElementById('modalCloseBtn');

  // Verify dataset
  const database = (typeof window.PERFUMES_DB !== 'undefined' && Array.isArray(window.PERFUMES_DB)) 
    ? window.PERFUMES_DB 
    : (typeof PERFUMES_DB !== 'undefined' ? PERFUMES_DB : []);

  // Update total stats
  if (totalPerfumesStat) {
    totalPerfumesStat.textContent = database.length;
  }

  // State Management
  const ITEMS_PER_PAGE = 24;
  let currentPage = 1;
  let searchQuery = '';
  let currentSort = 'salesRank';
  let showFavoritesOnly = false;

  let activeFilters = {
    gender: [],
    family: [],
    occasion: [],
    intensity: []
  };

  // LocalStorage for Favorites
  let favorites = JSON.parse(localStorage.getItem('noir_favorites') || '[]');
  updateFavBadge();

  // Helper: Normalize String (Remove Accents & Lowercase)
  function normalizeText(text) {
    if (!text) return '';
    return text
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  // --------------------------------------------------------------------------
  // EVENT LISTENERS & CHIP BINDINGS
  // --------------------------------------------------------------------------
  
  // Chip Click Handlers
  document.querySelectorAll('.chip-group').forEach(group => {
    const filterType = group.dataset.filter;
    group.querySelectorAll('.chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const val = chip.dataset.value;
        chip.classList.toggle('active');
        
        if (activeFilters[filterType].includes(val)) {
          activeFilters[filterType] = activeFilters[filterType].filter(item => item !== val);
        } else {
          activeFilters[filterType].push(val);
        }

        currentPage = 1;
        renderActiveTags();
        renderCatalog();
      });
    });
  });

  // Reset All Filters
  function resetAllFilters() {
    activeFilters = {
      gender: [],
      family: [],
      occasion: [],
      intensity: []
    };
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    searchInput.value = '';
    searchQuery = '';
    clearSearchBtn.style.display = 'none';
    showFavoritesOnly = false;
    favoritesFilterBtn.classList.remove('active');
    currentPage = 1;
    renderActiveTags();
    renderCatalog();
    showToast('Filtros restaurados');
  }

  if (resetFiltersBtn) resetFiltersBtn.addEventListener('click', resetAllFilters);
  if (emptyResetBtn) emptyResetBtn.addEventListener('click', resetAllFilters);

  // Search Input Handlers
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    clearSearchBtn.style.display = searchQuery.trim().length > 0 ? 'block' : 'none';
    currentPage = 1;
    renderCatalog();
  });

  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchQuery = '';
    clearSearchBtn.style.display = 'none';
    currentPage = 1;
    renderCatalog();
    searchInput.focus();
  });

  // Sort Selection
  sortSelect.addEventListener('change', (e) => {
    currentSort = e.target.value;
    currentPage = 1;
    renderCatalog();
  });

  // Favorites Filter Toggle
  favoritesFilterBtn.addEventListener('click', () => {
    showFavoritesOnly = !showFavoritesOnly;
    favoritesFilterBtn.classList.toggle('active', showFavoritesOnly);
    currentPage = 1;
    renderCatalog();
    showToast(showFavoritesOnly ? 'Exibindo apenas seus favoritos' : 'Exibindo todos os perfumes');
  });

  // Load More Button
  loadMoreBtn.addEventListener('click', () => {
    currentPage += 1;
    renderCatalog(true);
  });

  // --------------------------------------------------------------------------
  // ACTIVE TAGS UI
  // --------------------------------------------------------------------------
  function renderActiveTags() {
    const allActive = [];
    Object.keys(activeFilters).forEach(type => {
      activeFilters[type].forEach(val => {
        allActive.push({ type, val });
      });
    });

    if (allActive.length === 0) {
      activeTagsBar.style.display = 'none';
      activeTagsList.innerHTML = '';
      return;
    }

    activeTagsBar.style.display = 'flex';
    activeTagsList.innerHTML = allActive.map(item => `
      <span class="active-tag-chip" onclick="removeActiveFilter('${item.type}', '${item.val}')">
        ${item.val} <span class="close-x">&times;</span>
      </span>
    `).join('');
  }

  window.removeActiveFilter = function(type, val) {
    activeFilters[type] = activeFilters[type].filter(v => v !== val);
    const group = document.querySelector(`.chip-group[data-filter="${type}"]`);
    if (group) {
      const chip = group.querySelector(`.chip[data-value="${val}"]`);
      if (chip) chip.classList.remove('active');
    }
    renderActiveTags();
    renderCatalog();
  };

  // --------------------------------------------------------------------------
  // CORE FILTERING & SEARCH LOGIC
  // --------------------------------------------------------------------------
  function filterAndSortData() {
    const qNorm = normalizeText(searchQuery);

    let list = database.filter(p => {
      // 1. Favorites check
      if (showFavoritesOnly && !favorites.includes(p.id)) {
        return false;
      }

      // 2. Search query check (accent-insensitive across all perfume data)
      if (qNorm) {
        const fullContent = normalizeText(`
          ${p.name} 
          ${p.brand} 
          ${p.family} 
          ${p.gender} 
          ${p.intensity} 
          ${p.topNotes} 
          ${p.heartNotes} 
          ${p.baseNotes} 
          ${p.occasions.join(' ')} 
          ${p.description}
        `);
        if (!fullContent.includes(qNorm)) {
          return false;
        }
      }

      // 3. Gender Filter (OR within Gender)
      if (activeFilters.gender.length > 0) {
        const matchesGender = activeFilters.gender.some(g => {
          if (g === p.gender) return true;
          if (p.gender === 'Unissex') return true;
          if (g === 'Unissex') return true;
          return false;
        });
        if (!matchesGender) return false;
      }

      // 4. Family Filter (OR within Family)
      if (activeFilters.family.length > 0) {
        const pFamNorm = normalizeText(p.family);
        const matchesFamily = activeFilters.family.some(f => {
          const fNorm = normalizeText(f);
          return pFamNorm.includes(fNorm) || fNorm.includes(pFamNorm);
        });
        if (!matchesFamily) return false;
      }

      // 5. Occasion Filter (OR within Occasion)
      if (activeFilters.occasion.length > 0) {
        const pOccsNorm = p.occasions.map(o => normalizeText(o));
        const matchesOccasion = activeFilters.occasion.some(occ => {
          const occNorm = normalizeText(occ);
          return pOccsNorm.some(pOcc => pOcc.includes(occNorm) || occNorm.includes(pOcc));
        });
        if (!matchesOccasion) return false;
      }

      // 6. Intensity Filter (OR within Intensity)
      if (activeFilters.intensity.length > 0) {
        const pInteNorm = normalizeText(p.intensity);
        const matchesIntensity = activeFilters.intensity.some(inte => {
          const inteNorm = normalizeText(inte);
          return pInteNorm.includes(inteNorm) || inteNorm.includes(pInteNorm);
        });
        if (!matchesIntensity) return false;
      }

      return true;
    });

    // Sort Logic
    list.sort((a, b) => {
      if (currentSort === 'salesRank') return a.salesRank - b.salesRank;
      if (currentSort === 'rating') return b.rating - a.rating;
      if (currentSort === 'brand') return a.brand.localeCompare(b.brand);
      if (currentSort === 'name') return a.name.localeCompare(b.name);
      return 0;
    });

    return list;
  }

  // --------------------------------------------------------------------------
  // CATALOG RENDERING
  // --------------------------------------------------------------------------
  function renderCatalog(append = false) {
    if (!database || database.length === 0) {
      catalogGrid.innerHTML = '<p style="color: red; padding: 2rem;">Erro ao carregar banco de perfumes.</p>';
      return;
    }

    const filteredList = filterAndSortData();
    resultsCount.textContent = filteredList.length;

    // Handle Empty State
    if (filteredList.length === 0) {
      catalogGrid.innerHTML = '';
      emptyState.style.display = 'block';
      paginationWrapper.style.display = 'none';

      if (showFavoritesOnly) {
        emptyStateMsg.textContent = 'Você ainda não adicionou nenhum perfume aos favoritos. Clique no ícone de coração ♥ nos perfumes para salvá-los aqui.';
      } else if (searchQuery) {
        emptyStateMsg.textContent = `Nenhum perfume encontrado para "${searchQuery}". Verifique a ortografia ou limpe os filtros.`;
      } else {
        emptyStateMsg.textContent = 'Nenhum perfume corresponde exatamente à combinação de filtros selecionada.';
      }
      return;
    } else {
      emptyState.style.display = 'none';
    }

    // Pagination slice
    const totalToShow = currentPage * ITEMS_PER_PAGE;
    const itemsToRender = filteredList.slice(0, totalToShow);
    const remainingCount = Math.max(0, filteredList.length - itemsToRender.length);

    if (remainingCount > 0) {
      paginationWrapper.style.display = 'block';
      loadMoreRemaining.textContent = remainingCount;
    } else {
      paginationWrapper.style.display = 'none';
    }

    // Build Cards HTML
    const cardsHtml = itemsToRender.map(p => {
      const isFav = favorites.includes(p.id);

      return `
        <div class="card" onclick="openModal(${p.id})">
          <div class="card-media">
            <span class="card-badge-rank">#${p.salesRank} GLOBAL</span>
            <button class="card-fav-btn ${isFav ? 'favorited' : ''}" 
                    title="${isFav ? 'Remover dos Favoritos' : 'Salvar nos Favoritos'}" 
                    onclick="toggleFavorite(event, ${p.id})">
              ♥
            </button>
            <img src="${p.image}" alt="${p.name}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1594035910387-fea47794261f?w=600&auto=format&fit=crop&q=80'" />
          </div>
          <div class="card-body">
            <div class="card-brand">${p.brand}</div>
            <h3 class="card-name">${p.name}</h3>
            
            <div class="card-meta">
              <span class="card-stars">★ ${p.rating.toFixed(1)}</span>
              <span>${p.gender} • ${p.intensity.split('/')[0].trim()}</span>
            </div>

            <p class="card-notes">
              <strong>Notas:</strong> ${p.topNotes.split(',').slice(0, 3).join(', ')}...
            </p>

            <div class="card-tags">
              <span class="tag-badge">${p.family}</span>
              <span class="tag-badge">${p.occasions[0] || 'Elegante'}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');

    catalogGrid.innerHTML = cardsHtml;
  }

  // --------------------------------------------------------------------------
  // FAVORITES LOGIC
  // --------------------------------------------------------------------------
  window.toggleFavorite = function(e, id) {
    e.stopPropagation();
    if (favorites.includes(id)) {
      favorites = favorites.filter(favId => favId !== id);
      showToast('Removido dos favoritos');
    } else {
      favorites.push(id);
      showToast('Adicionado aos favoritos ♥');
    }
    localStorage.setItem('noir_favorites', JSON.stringify(favorites));
    updateFavBadge();
    renderCatalog();
  };

  function updateFavBadge() {
    if (favCountBadge) {
      favCountBadge.textContent = favorites.length;
    }
  }

  // --------------------------------------------------------------------------
  // MODAL DETAILS
  // --------------------------------------------------------------------------
  window.openModal = function(id) {
    const p = database.find(item => item.id === id);
    if (!p) return;

    modalBody.innerHTML = `
      <div class="modal-media">
        <img src="${p.image}" alt="${p.name}" />
      </div>
      <div class="modal-details">
        <div class="modal-header-meta">
          <span class="modal-brand">${p.brand}</span>
          <span class="modal-rank-badge">Ranking Global #${p.salesRank}</span>
        </div>

        <h2 class="modal-title">${p.name}</h2>
        <div class="modal-rating-row">
          <span style="color: #ffbe3b; font-weight: bold;">★ ${p.rating.toFixed(1)} / 5.0</span>
          <span>•</span>
          <span>${p.gender}</span>
          <span>•</span>
          <span>${p.intensity}</span>
        </div>

        <p class="modal-desc">${p.description}</p>

        <div class="pyramid-box">
          <div class="pyramid-row">
            <span class="lvl-name">Topo:</span>
            <span class="lvl-notes">${p.topNotes}</span>
          </div>
          <div class="pyramid-row">
            <span class="lvl-name">Coração:</span>
            <span class="lvl-notes">${p.heartNotes}</span>
          </div>
          <div class="pyramid-row">
            <span class="lvl-name">Fundo:</span>
            <span class="lvl-notes">${p.baseNotes}</span>
          </div>
        </div>

        <div class="modal-tags">
          <span class="tag-badge" style="border-color: var(--gold-primary); color: var(--gold-light);">Família: ${p.family}</span>
          ${p.occasions.map(occ => `<span class="tag-badge">${occ}</span>`).join('')}
        </div>
      </div>
    `;

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  };

  modalCloseBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
      closeModal();
    }
  });

  function closeModal() {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }

  // --------------------------------------------------------------------------
  // TOAST NOTIFICATIONS
  // --------------------------------------------------------------------------
  let toastTimer;
  function showToast(msg) {
    clearTimeout(toastTimer);
    toast.textContent = msg;
    toast.classList.add('active');
    toastTimer = setTimeout(() => {
      toast.classList.remove('active');
    }, 2400);
  }

  // Initial Run
  renderCatalog();
});
