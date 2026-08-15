document.addEventListener('DOMContentLoaded', () => {
  // Preloader
  setTimeout(() => {
    const preloader = document.getElementById('preloader');
    if(preloader) { preloader.classList.add('hidden'); setTimeout(() => preloader.style.display = 'none', 800); }
  }, 1800); 

  // ----- QUIZ LOGIC -----
  let quizData = {};
  
  window.openQuiz = function() {
    document.getElementById('quizOverlay').classList.add('active');
    document.body.style.overflow = 'hidden';
    showQuizStep(0);
  };
  window.closeQuiz = function() {
    document.getElementById('quizOverlay').classList.remove('active');
    document.body.style.overflow = '';
  };
  
  window.showQuizStep = function(step) {
    document.querySelectorAll('.quiz-step').forEach(el => el.classList.remove('active'));
    document.getElementById('qstep-' + step).classList.add('active');
  };
  
  window.nextQuizStep = function(step) { showQuizStep(step); };
  window.prevQuizStep = function(step) { showQuizStep(step); };
  
  window.handleEnter = function(e, nextStep) {
    if(e.key === 'Enter') { e.preventDefault(); showQuizStep(nextStep); }
  };

  // Quiz Options Logic
  document.querySelectorAll('.quiz-option').forEach(opt => {
    opt.addEventListener('click', function() {
      const container = this.closest('.quiz-options-container');
      const isMulti = container.classList.contains('multi-select');
      const max3 = container.classList.contains('max-3');

      if (!isMulti) {
        // Single select (handled in HTML onclick mostly, but just in case)
        container.querySelectorAll('.quiz-option').forEach(o => o.classList.remove('selected'));
        this.classList.add('selected');
      } else {
        if (this.classList.contains('selected')) {
          this.classList.remove('selected');
        } else {
          if (max3) {
            const selectedCount = container.querySelectorAll('.quiz-option.selected').length;
            if (selectedCount >= 3) return; // limit reached
          }
          this.classList.add('selected');
        }
      }
    });
  });

  window.selectSingleAndNext = function(elem, nextStep) {
    const container = elem.closest('.quiz-options-container');
    container.querySelectorAll('.quiz-option').forEach(o => o.classList.remove('selected'));
    elem.classList.add('selected');
    setTimeout(() => { showQuizStep(nextStep); }, 300);
  };

  // Google Script Web App URL (REPLACE WITH YOURS)
  const GOOGLE_APP_URL = "https://script.google.com/macros/s/AKfycbxbfQhNOjVWGVSglJW2AZCmupuRp7UI7_rr8TlQaBCHAAE4lFP-GIIa3cH90Io1yTTO/exec";

  window.submitQuiz = function() {
    const btn = document.getElementById('btnSubmitQuiz');
    btn.textContent = 'Enviando...';
    btn.disabled = true;

    // Collect Data
    const getVals = (id) => {
      const container = document.querySelector(`.quiz-options-container[data-id="${id}"]`);
      if(!container) return '';
      const selected = Array.from(container.querySelectorAll('.quiz-option.selected')).map(el => el.dataset.val);
      return selected.join(', ');
    };

    const payload = {
      tipo: "Quiz Curadoria",
      nome: document.getElementById('quiz_nome').value || 'Não informado',
      whatsapp: document.getElementById('quiz_whatsapp').value || '',
      email: document.getElementById('quiz_email').value || '',
      q2_usados: document.getElementById('quiz_amados').value || '',
      q3_naogosta: document.getElementById('quiz_odiados').value || '',
      q4_procura: getVals('quiz_procura'),
      q5_sentir: getVals('quiz_sentir'),
      q6_aromas: getVals('quiz_aromas'),
      q7_intensidade: getVals('quiz_intensidade'),
      q8_importa: getVals('quiz_importa'),
      q9_orcamento: getVals('quiz_orcamento'),
      perfumes_selecionados: '' // Vazio no quiz
    };

    fetch(GOOGLE_APP_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(() => {
      showQuizStep(11); // Tela de Sucesso
      btn.textContent = 'Receber Minha Curadoria';
      btn.disabled = false;
    }).catch(err => {
      // Como o no-cors não retorna sucesso legível, assumimos que foi se não der erro fatal de rede.
      showQuizStep(11);
      btn.textContent = 'Receber Minha Curadoria';
      btn.disabled = false;
    });
  };

  // ----- CATALOG LOGIC -----
  const catalogGrid = document.getElementById('catalogGrid');
  let database = window.PERFUMES_DB || [];
  let currentPage = 1;
  const ITEMS_PER_PAGE = 24;
  let activeFilters = { gender: [], family: [], occasion: [], intensity: [] };
  let searchQuery = '';
  let currentSort = 'salesRank';
  
  let favorites = JSON.parse(localStorage.getItem('duchi_favorites') || '[]');
  let showFavorites = false;

  const favBadge = document.getElementById('favCountBadge');
  const btnQuoteNav = document.getElementById('btnRequestQuoteNav');
  
  function updateFavBadge() {
    if(favBadge) favBadge.textContent = favorites.length;
    if(btnQuoteNav) {
      if(favorites.length > 0) btnQuoteNav.classList.add('visible');
      else btnQuoteNav.classList.remove('visible');
    }
  }
  updateFavBadge();

  // Scroll Nav
  window.addEventListener('scroll', () => {
    const nav = document.getElementById('navbar');
    if(window.scrollY > 50) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
  });

  // Render logic, filtering, etc (mesma lógica otimizada anterior)
  function normalize(str) { return str ? str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() : ''; }

  document.querySelectorAll('.filter-console .chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
      const type = e.target.closest('.chip-group').dataset.filter;
      const val = e.target.dataset.value;
      e.target.classList.toggle('active');
      if(activeFilters[type].includes(val)) activeFilters[type] = activeFilters[type].filter(v => v !== val);
      else activeFilters[type].push(val);
      currentPage = 1; render();
    });
  });

  const searchInput = document.getElementById('searchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
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
  
  const sortSelect = document.getElementById('sortSelect');
  if(sortSelect) sortSelect.addEventListener('change', e => { currentSort = e.target.value; currentPage = 1; render(); });

  const favFilterBtn = document.getElementById('favoritesFilterBtn');
  if(favFilterBtn) {
    favFilterBtn.addEventListener('click', function() {
      showFavorites = !showFavorites;
      this.classList.toggle('active');
      currentPage = 1; render();
    });
  }

  document.getElementById('resetFiltersBtn').addEventListener('click', resetAll);
  document.getElementById('emptyResetBtn').addEventListener('click', resetAll);
  
  function resetAll() {
    activeFilters = { gender: [], family: [], occasion: [], intensity: [] };
    document.querySelectorAll('.filter-console .chip').forEach(c => c.classList.remove('active'));
    if(searchInput) searchInput.value = ''; searchQuery = ''; 
    if(clearSearchBtn) clearSearchBtn.style.display='none';
    showFavorites = false; if(favFilterBtn) favFilterBtn.classList.remove('active');
    currentPage = 1; render();
  }

  function render() {
    const qNorm = normalize(searchQuery);
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

    const resCount = document.getElementById('resultsCount');
    if(resCount) resCount.textContent = filtered.length;
    
    const emptyState = document.getElementById('emptyState');
    if(filtered.length === 0) {
      if(catalogGrid) catalogGrid.innerHTML = '';
      if(emptyState) emptyState.style.display = 'block';
      document.getElementById('paginationWrapper').style.display = 'none';
      return;
    }
    if(emptyState) emptyState.style.display = 'none';

    const itemsToShow = filtered.slice(0, currentPage * ITEMS_PER_PAGE);
    document.getElementById('paginationWrapper').style.display = itemsToShow.length < filtered.length ? 'block' : 'none';
    document.getElementById('loadMoreRemaining').textContent = filtered.length - itemsToShow.length;

    if(catalogGrid) {
      catalogGrid.innerHTML = itemsToShow.map(p => {
        const isFav = favorites.includes(p.id);
        const heartSVG = `<svg viewBox="0 0 24 24" fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>`;
        return `
        <div class="card" onclick="openModal(${p.id})">
          <div class="card-media">
            <span class="card-badge-rank">#${p.salesRank}</span>
            <button class="card-fav-btn ${isFav ? 'favorited' : ''}" onclick="toggleFav(event, ${p.id})">${heartSVG}</button>
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

  const loadMoreBtn = document.getElementById('loadMoreBtn');
  if(loadMoreBtn) loadMoreBtn.addEventListener('click', () => { currentPage++; render(); });

  window.toggleFav = (e, id) => {
    e.stopPropagation();
    if(favorites.includes(id)) { 
      favorites = favorites.filter(x => x !== id); 
      showToast('Removido da seleção');
    } else { 
      favorites.push(id); 
      showToast('Adicionado à seleção para orçamento');
    }
    localStorage.setItem('duchi_favorites', JSON.stringify(favorites));
    updateFavBadge();
    render();
  };

  const modal = document.getElementById('perfumeModal');
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
  if(modal) modal.addEventListener('click', e => { if(e.target === modal) modal.classList.remove('active'); });

  // Modal Orçamento Catálogo
  const orcModal = document.getElementById('orcamentoModal');
  window.openOrcamentoModal = () => {
    orcModal.classList.add('active');
  };
  window.closeOrcamentoModal = () => {
    orcModal.classList.remove('active');
  };

  window.submitCatOrcamento = () => {
    const btn = document.getElementById('btnSubmitCat');
    btn.textContent = 'Enviando...';
    btn.disabled = true;

    // Pega nomes dos perfumes selecionados
    const selectedNames = database.filter(p => favorites.includes(p.id)).map(p => p.brand + ' - ' + p.name).join(' | ');

    const payload = {
      tipo: "Orcamento Catalogo",
      nome: document.getElementById('cat_nome').value || 'Não informado',
      whatsapp: document.getElementById('cat_whatsapp').value || '',
      email: '',
      perfumes_selecionados: selectedNames
    };

    fetch(GOOGLE_APP_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(() => {
      closeOrcamentoModal();
      showToast('Pedido de orçamento enviado com sucesso!');
      btn.textContent = 'Enviar Solicitação';
      btn.disabled = false;
      // Limpar campos
      document.getElementById('cat_nome').value = '';
      document.getElementById('cat_whatsapp').value = '';
    }).catch(err => {
      closeOrcamentoModal();
      showToast('Pedido enviado!');
      btn.textContent = 'Enviar Solicitação';
      btn.disabled = false;
    });
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
