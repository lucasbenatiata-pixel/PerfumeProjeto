document.addEventListener('DOMContentLoaded', () => {
  const catalogGrid = document.getElementById('catalogGrid');
  const searchInput = document.getElementById('searchInput');
  const sortSelect = document.getElementById('sortSelect');
  const resultsCount = document.getElementById('resultsCount');
  const resetFiltersBtn = document.getElementById('resetFiltersBtn');
  
  const modal = document.getElementById('perfumeModal');
  const modalBody = document.getElementById('modalBody');
  const modalCloseBtn = document.getElementById('modalCloseBtn');

  // Estado dos Filtros Ativos
  let activeFilters = {
    gender: [],
    family: [],
    occasion: [],
    intensity: []
  };

  let searchQuery = '';
  let currentSort = 'match';

  // Inicializar Chips
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
        renderCatalog();
      });
    });
  });

  // Limpar Filtros
  resetFiltersBtn.addEventListener('click', () => {
    activeFilters = { gender: [], family: [], occasion: [], intensity: [] };
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    searchInput.value = '';
    searchQuery = '';
    renderCatalog();
  });

  // Busca por Texto
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase().trim();
    renderCatalog();
  });

  // Ordenação
  sortSelect.addEventListener('change', (e) => {
    currentSort = e.target.value;
    renderCatalog();
  });

  // Algoritmo de Pontuação de Afinidade (Match Score)
  function calculateMatchScore(perfume) {
    let totalCriteria = 0;
    let matches = 0;

    // Gênero
    if (activeFilters.gender.length > 0) {
      totalCriteria += 1;
      if (activeFilters.gender.includes(perfume.gender) || perfume.gender === 'Unissex') {
        matches += 1;
      }
    }

    // Família Olfativa
    if (activeFilters.family.length > 0) {
      totalCriteria += 1;
      if (activeFilters.family.some(f => perfume.family.toLowerCase().includes(f.toLowerCase()))) {
        matches += 1;
      }
    }

    // Ocasiões
    if (activeFilters.occasion.length > 0) {
      totalCriteria += activeFilters.occasion.length;
      activeFilters.occasion.forEach(occ => {
        if (perfume.occasions.includes(occ)) {
          matches += 1;
        }
      });
    }

    // Intensidade
    if (activeFilters.intensity.length > 0) {
      totalCriteria += 1;
      if (activeFilters.intensity.includes(perfume.intensity)) {
        matches += 1;
      }
    }

    // Se nenhum filtro estiver marcado, o score é 100% neutro
    if (totalCriteria === 0) return 100;

    return Math.round((matches / totalCriteria) * 100);
  }

  // Renderização Principal do Catálogo
  function renderCatalog() {
    let list = PERFUMES_DB.map(perfume => {
      return {
        ...perfume,
        matchScore: calculateMatchScore(perfume)
      };
    });

    // Filtro de Texto
    if (searchQuery) {
      list = list.filter(p => 
        p.name.toLowerCase().includes(searchQuery) ||
        p.brand.toLowerCase().includes(searchQuery) ||
        p.family.toLowerCase().includes(searchQuery) ||
        p.topNotes.toLowerCase().includes(searchQuery) ||
        p.heartNotes.toLowerCase().includes(searchQuery) ||
        p.baseNotes.toLowerCase().includes(searchQuery)
      );
    }

    // Ordenação
    list.sort((a, b) => {
      if (currentSort === 'match') {
        if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
        return a.salesRank - b.salesRank;
      }
      if (currentSort === 'salesRank') return a.salesRank - b.salesRank;
      if (currentSort === 'rating') return b.rating - a.rating;
      if (currentSort === 'name') return a.name.localeCompare(b.name);
      return 0;
    });

    resultsCount.textContent = `${list.length} fragrância${list.length !== 1 ? 's' : ''} encontrada${list.length !== 1 ? 's' : ''}`;

    // Construção dos Cards HTML
    catalogGrid.innerHTML = list.map(p => {
      const hasActiveFilters = Object.values(activeFilters).some(arr => arr.length > 0);
      const matchBadge = hasActiveFilters ? `<div class="card-match-badge">${p.matchScore}% Match</div>` : '';

      return `
        <div class="card" onclick="openModal(${p.id})">
          <div class="card-img-container">
            <span class="card-badge-rank">#${p.salesRank} GLOBAL</span>
            ${matchBadge}
            <img src="${p.image}" alt="${p.name}" loading="lazy" />
          </div>
          <div class="card-content">
            <div class="card-brand">${p.brand}</div>
            <div class="card-name">${p.name}</div>
            <div class="card-meta">
              <span>★ ${p.rating} / 5.0</span>
              <span>${p.gender} • ${p.intensity}</span>
            </div>
            <p class="card-notes-preview"><strong>Pirâmide:</strong> ${p.topNotes.split(',').slice(0, 2).join(',')}...</p>
            <div class="card-tags">
              <span class="tag">${p.family}</span>
              <span class="tag">${p.occasions[0] || ''}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // Modal de Detalhes
  window.openModal = function(id) {
    const p = PERFUMES_DB.find(item => item.id === id);
    if (!p) return;

    modalBody.innerHTML = `
      <div class="modal-img-wrapper">
        <img src="${p.image}" alt="${p.name}">
      </div>
      <div class="modal-info">
        <div class="modal-brand">${p.brand} ✦ Ranking Global #${p.salesRank}</div>
        <h2 class="modal-title">${p.name}</h2>
        <p class="modal-desc">${p.description}</p>
        
        <div class="pyramid">
          <div class="pyramid-level"><strong>Topo:</strong> <span>${p.topNotes}</span></div>
          <div class="pyramid-level"><strong>Coração:</strong> <span>${p.heartNotes}</span></div>
          <div class="pyramid-level"><strong>Fundo:</strong> <span>${p.baseNotes}</span></div>
        </div>

        <div class="card-tags" style="margin-top: 1.5rem;">
          <span class="tag">Gênero: ${p.gender}</span>
          <span class="tag">Família: ${p.family}</span>
          <span class="tag">Fixação: ${p.intensity}</span>
          ${p.occasions.map(occ => `<span class="tag">${occ}</span>`).join('')}
        </div>
      </div>
    `;

    modal.classList.add('active');
  };

  modalCloseBtn.addEventListener('click', () => modal.classList.remove('active'));
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('active');
  });

  // Render inicial
  renderCatalog();
});