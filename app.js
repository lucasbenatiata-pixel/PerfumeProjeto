/**
 * NOIR PARFUMS - Recommendation Engine & Interactive Filtering
 * Agora 100% blindado contra surtos de Encoding do Windows.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Pegando os elementos do HTML
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
  
  // Elementos do Modal
  const modal = document.getElementById('perfumeModal');
  const modalBody = document.getElementById('modalBody');
  const modalCloseBtn = document.getElementById('modalCloseBtn');
  const toast = document.getElementById('toast');

  // Verificação robusta do Banco de Dados (Para o navegador não chorar)
  let database = [];
  if (typeof window.PERFUMES_DB !== 'undefined' && Array.isArray(window.PERFUMES_DB)) {
    database = window.PERFUMES_DB;
  } else if (typeof PERFUMES_DB !== 'undefined' && Array.isArray(PERFUMES_DB)) {
    database = PERFUMES_DB;
  }

  // Atualiza as estatísticas do topo
  if (totalPerfumesStat) totalPerfumesStat.textContent = database.length;

  // Estado Atual do Sistema
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

  // Puxando seus favoritos do abismo do LocalStorage
  let favorites = JSON.parse(localStorage.getItem('noir_favorites') || '[]');
  updateFavBadge();

  // Função anti-surto para limpar acentos (agora usando regex segura e escapada)
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
  // EVENTOS DE CLIQUE DOS FILTROS (CHIPS)
  // --------------------------------------------------------------------------
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

        currentPage = 1; // Reseta a paginação
        renderActiveTags();
        renderCatalog();
      });
    });
  });

  // Botão Mágico de Resetar Tudo
  function resetAllFilters() {
    activeFilters = { gender: [], family: [], occasion: [], intensity: [] };
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    searchInput.value = '';
    searchQuery = '';
    if (clearSearchBtn) clearSearchBtn.style.display = 'none';
    showFavoritesOnly = false;
    if (favoritesFilterBtn) favoritesFilterBtn.classList.remove('active');
    
    currentPage = 1;
    renderActiveTags();
    renderCatalog();
    showToast('Tudo limpo! Voltamos à estaca zero.');
  }

  if (resetFiltersBtn) resetFiltersBtn.addEventListener('click', resetAllFilters);
  if (emptyResetBtn) emptyResetBtn.addEventListener('click', resetAllFilters);

  // --------------------------------------------------------------------------
  // BARRA DE BUSCA
  // --------------------------------------------------------------------------
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      if (clearSearchBtn) clearSearchBtn.style.display = searchQuery.trim().length > 0 ? 'block' : 'none';
      currentPage = 1;
      renderCatalog();
    });
  }

  if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => {
      searchInput.value = '';
      searchQuery = '';
      clearSearchBtn.style.display = 'none';
      currentPage = 1;
      renderCatalog();
      searchInput.focus();
    });
  }

  // --------------------------------------------------------------------------
  // ORDENAÇÃO E FAVORITOS
  // --------------------------------------------------------------------------
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      currentSort = e.target.value;
      currentPage = 1;
      renderCatalog();
    });
  }

  if (favoritesFilterBtn) {
    favoritesFilterBtn.addEventListener('click', () => {
      showFavoritesOnly = !showFavoritesOnly;
      favoritesFilterBtn.classList.toggle('active', showFavoritesOnly);
      currentPage = 1;
      renderCatalog();
      showToast(showFavoritesOnly ? 'Modo VIP: Só seus favoritos.' : 'Mostrando todo o acervo.');
    });
  }

  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', () => {
      currentPage += 1;
      renderCatalog(true);
    });
  }

  // --------------------------------------------------------------------------
  // TAGS VISUAIS NO TOPO
  // --------------------------------------------------------------------------
  function renderActiveTags() {
    const allActive = [];
    Object.keys(activeFilters).forEach(type => {
      activeFilters[type].forEach(val => {
        allActive.push({ type, val });
      });
    });

    if (allActive.length === 0) {
      if (activeTagsBar) activeTagsBar.style.display = 'none';
      if (activeTagsList) activeTagsList.innerHTML = '';
      return;
    }

    if (activeTagsBar) activeTagsBar.style.display = 'flex';
    if (activeTagsList) {
      activeTagsList.innerHTML = allActive.map(item => `
        <span class="active-tag-chip" onclick="removeActiveFilter('${item.type}', '${item.val}')">
          ${item.val} <span class="close-x">&times;</span>
        </span>
      `).join('');
    }
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
  // O CÉREBRO DA OPERAÇÃO (FILTRO + ORDENAÇÃO)
  // --------------------------------------------------------------------------
  function filterAndSortData() {
    const qNorm = normalizeText(searchQuery);

    let list = database.filter(p => {
      // Favoritos
      if (showFavoritesOnly && !favorites.includes(p.id)) return false;

      // Busca por Texto Livre
      if (qNorm) {
        const fullContent = normalizeText(`
          ${p.name} ${p.brand} ${p.family} ${p.gender} 
          ${p.intensity} ${p.topNotes} ${p.heartNotes} 
          ${p.baseNotes} ${p.occasions.join(' ')}
        `);
        if (!fullContent.includes(qNorm)) return false;
      }

      // Gênero
      if (activeFilters.gender.length > 0) {
        const matchesGender = activeFilters.gender.some(g => {
          return g === p.gender || p.gender === 'Unissex' || g === 'Unissex';
        });
        if (!matchesGender) return false;
      }

      // Família
      if (activeFilters.family.length > 0) {
        const pFamNorm = normalizeText(p.family);
        const matchesFamily = activeFilters.family.some(f => {
          const fNorm = normalizeText(f);
          return pFamNorm.includes(fNorm) || fNorm.includes(pFamNorm);
        });
        if (!matchesFamily) return false;
      }

      // Ocasião
      if (activeFilters.occasion.length > 0) {
        const pOccsNorm = p.occasions.map(o => normalizeText(o));
        const matchesOccasion = activeFilters.occasion.some(occ => {
          const occNorm = normalizeText(occ);
          return pOccsNorm.some(pOcc => pOcc.includes(occNorm) || occNorm.includes(pOcc));
        });
        if (!matchesOccasion) return false;
      }

      // Intensidade
      if (activeFilters.intensity.length > 0) {
        const pInteNorm = normalizeText(p.intensity);
        const matchesIntensity = activeFilters.intensity.some(inte => {
          const inteNorm = normalizeText(inte);
          return pInteNorm.includes(inteNorm) || inteNorm.includes(pInteNorm);
        });
        if (!matchesIntensity) return false;
      }

      return true; // Passou na blitz!
    });

    // Ordenação
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
  // RENDERIZAÇÃO DOS CARDS
  // --------------------------------------------------------------------------
  function renderCatalog(append = false) {
    if (!catalogGrid) return;

    if (database.length === 0) {
      catalogGrid.innerHTML = '<p style="color: #ff4b72; padding: 2rem; font-weight: bold;">Oops! O banco de dados (perfumes.js) não foi carregado corretamente.</p>';
      return;
    }

    const filteredList = filterAndSortData();
    if (resultsCount) resultsCount.textContent = filteredList.length;

    // Estado Vazio
    if (filteredList.length === 0) {
      catalogGrid.innerHTML = '';
      if (emptyState) emptyState.style.display = 'block';
      if (paginationWrapper) paginationWrapper.style.display = 'none';

      if (emptyStateMsg) {
        if (showFavoritesOnly) {
          emptyStateMsg.textContent = 'Ainda não há favoritos aqui. Clique no coraçãozinho em algum perfume para salvá-lo!';
        } else if (searchQuery) {
          emptyStateMsg.textContent = `Nada encontrado para "${searchQuery}". Talvez esse perfume seja de um universo paralelo.`;
        } else {
          emptyStateMsg.textContent = 'Sua combinação de filtros foi exigente demais. Tente remover alguma coisa.';
        }
      }
      return;
    } else {
      if (emptyState) emptyState.style.display = 'none';
    }

    // Paginação
    const totalToShow = currentPage * ITEMS_PER_PAGE;
    const itemsToRender = filteredList.slice(0, totalToShow);
    const remainingCount = Math.max(0, filteredList.length - itemsToRender.length);

    if (paginationWrapper && loadMoreRemaining) {
      if (remainingCount > 0) {
        paginationWrapper.style.display = 'block';
        loadMoreRemaining.textContent = remainingCount;
      } else {
        paginationWrapper.style.display = 'none';
      }
    }

    // Criando os HTML Cards
    const cardsHtml = itemsToRender.map(p => {
      const isFav = favorites.includes(p.id);
      const safeIntensity = p.intensity ? p.intensity.split('/')[0].trim() : '';
      const safeOccasion = p.occasions && p.occasions[0] ? p.occasions[0] : 'Elegante';
      const safeNotes = p.topNotes ? p.topNotes.split(',').slice(0, 3).join(', ') : 'Exclusivas';

      return `
        <div class="card" onclick="openModal(${p.id})">
          <div class="card-media">
            <span class="card-badge-rank">#${p.salesRank || '?'} GLOBAL</span>
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
              <span class="card-stars">★ ${p.rating ? p.rating.toFixed(1) : 'N/A'}</span>
              <span>${p.gender} • ${safeIntensity}</span>
            </div>

            <p class="card-notes">
              <strong>Notas:</strong> ${safeNotes}...
            </p>

            <div class="card-tags">
              <span class="tag-badge">${p.family}</span>
              <span class="tag-badge">${safeOccasion}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');

    catalogGrid.innerHTML = cardsHtml;
  }

  // --------------------------------------------------------------------------
  // SISTEMA DE FAVORITOS
  // --------------------------------------------------------------------------
  window.toggleFavorite = function(e, id) {
    e.stopPropagation(); // Evita abrir o modal ao clicar no coração
    if (favorites.includes(id)) {
      favorites = favorites.filter(favId => favId !== id);
      showToast('Removido dos favoritos 💔');
    } else {
      favorites.push(id);
      showToast('Adicionado aos favoritos ♥');
    }
    localStorage.setItem('noir_favorites', JSON.stringify(favorites));
    updateFavBadge();
    renderCatalog();
  };

  function updateFavBadge() {
    if (favCountBadge) favCountBadge.textContent = favorites.length;
  }

  // --------------------------------------------------------------------------
  // O FAMOSO MODAL DETALHADO
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
          <span style="color: #ffbe3b; font-weight: bold;">★ ${p.rating ? p.rating.toFixed(1) : 'N/A'} / 5.0</span>
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

        <div class="modal-tags" style="margin-top: auto; display: flex; flex-wrap: wrap; gap: 5px;">
          <span class="tag-badge" style="border-color: var(--gold-primary); color: var(--gold-light);">Família: ${p.family}</span>
          ${(p.occasions || []).map(occ => `<span class="tag-badge">${occ}</span>`).join('')}
        </div>
      </div>
    `;

    modal.classList.add('active');
    document.body.style.overflow = 'hidden'; // Trava o scroll do fundo
  };

  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal && modal.classList.contains('active')) {
      closeModal();
    }
  });

  function closeModal() {
    if (modal) modal.classList.remove('active');
    document.body.style.overflow = '';
  }

  // --------------------------------------------------------------------------
  // MENSAGENS TOAST
  // --------------------------------------------------------------------------
  let toastTimer;
  function showToast(msg) {
    if (!toast) return;
    clearTimeout(toastTimer);
    toast.textContent = msg;
    toast.classList.add('active');
    toastTimer = setTimeout(() => {
      toast.classList.remove('active');
    }, 2400);
  }

  // Dá a largada na aplicação!
  renderCatalog();
});
