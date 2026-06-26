/**
 * ELCO STUDIO — Hospital Template
 * main.js
 *
 * [백엔드 연동 가이드]
 * - BASE_URL : 실서버 API 주소로 교체
 * - fetchAPI  : 인증 토큰(JWT) 필요 시 headers에 Authorization 추가
 * - 각 섹션 data-api 속성에 엔드포인트가 명시되어 있음
 */

'use strict';

const BASE_URL = 'https://api.your-hospital.kr'; // ← 실서버 주소로 교체

/* ============================================================
   유틸리티
   ============================================================ */

/**
 * 공통 fetch 래퍼
 * @param {string} endpoint  - '/api/notices' 등 경로
 * @param {object} options   - fetch options
 */
async function fetchAPI(endpoint, options = {}) {
  const token = localStorage.getItem('access_token'); // JWT 저장 위치 통일
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };
  const res = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || '요청에 실패했습니다.');
  }
  return res.json();
}

/* 디바운스 */
function debounce(fn, ms) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
}

/* ============================================================
   헤더 — 스크롤 / 모바일 메뉴
   ============================================================ */
(function initHeader() {
  const header     = document.getElementById('header');
  const hamburger  = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobileMenu');

  /* 스크롤 시 그림자 */
  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 10);
  }, { passive: true });

  /* 햄버거 토글 */
  hamburger.addEventListener('click', () => {
    const open = hamburger.classList.toggle('open');
    mobileMenu.classList.toggle('open', open);
    document.body.style.overflow = open ? 'hidden' : '';
    hamburger.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
  });

  /* 모바일 메뉴 링크 클릭 시 닫기 */
  mobileMenu.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      hamburger.classList.remove('open');
      mobileMenu.classList.remove('open');
      document.body.style.overflow = '';
    });
  });
})();

/* ============================================================
   부드러운 스크롤 — .scroll-to
   ============================================================ */
(function initSmoothScroll() {
  document.querySelectorAll('.scroll-to').forEach(el => {
    el.addEventListener('click', e => {
      const href = el.getAttribute('href');
      if (!href || !href.startsWith('#')) return;
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      const offset = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 70;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });
})();

/* ============================================================
   히어로 슬라이더
   ============================================================ */
(function initHeroSlider() {
  const slides   = document.querySelectorAll('.hero-slide');
  const dotsWrap = document.getElementById('heroDots');
  const prevBtn  = document.querySelector('.hero-prev');
  const nextBtn  = document.querySelector('.hero-next');
  const pauseBtn = document.getElementById('heroPause');

  if (!slides.length) return;

  let current = 0;
  let playing = true;
  let timer;

  /* dots 생성 */
  slides.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.className = 'dot' + (i === 0 ? ' active' : '');
    dot.setAttribute('aria-label', `슬라이드 ${i + 1}`);
    dot.addEventListener('click', () => goTo(i));
    dotsWrap.appendChild(dot);
  });

  function goTo(idx) {
    slides[current].classList.remove('active');
    dotsWrap.children[current].classList.remove('active');
    current = (idx + slides.length) % slides.length;
    slides[current].classList.add('active');
    dotsWrap.children[current].classList.add('active');
  }

  function next() { goTo(current + 1); }
  function prev() { goTo(current - 1); }

  function startAuto() {
    clearInterval(timer);
    if (playing) timer = setInterval(next, 5000);
  }

  prevBtn.addEventListener('click', () => { prev(); startAuto(); });
  nextBtn.addEventListener('click', () => { next(); startAuto(); });
  pauseBtn.addEventListener('click', () => {
    playing = !playing;
    pauseBtn.textContent = playing ? '⏸' : '▶';
    startAuto();
  });

  startAuto();

  /*
   * [백엔드 연동]
   * fetchAPI('/api/banners').then(data => {
   *   // data.items 를 순회하며 슬라이드 HTML 동적 생성 후 goTo(0) 재호출
   * });
   */
})();

/* ============================================================
   의료진 탭 필터 (클라이언트 사이드 / API 전환 가능)
   ============================================================ */
(function initDoctorFilter() {
  const tabBtns    = document.querySelectorAll('#deptTabs .tab-btn');
  const doctorCards = document.querySelectorAll('#doctorGrid .doctor-card');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const dept = btn.dataset.dept;

      /*
       * [백엔드 연동 옵션]
       * const doctors = await fetchAPI(`/api/doctors${dept !== 'all' ? '?dept=' + encodeURIComponent(dept) : ''}`);
       * renderDoctors(doctors.items);   // 동적 렌더 함수 별도 작성
       * return;
       */

      /* 현재: 클라이언트 사이드 필터 (정적 HTML 기반) */
      doctorCards.forEach(card => {
        const match = dept === 'all' || card.dataset.dept === dept;
        card.classList.toggle('hidden', !match);
      });
    });
  });
})();

/* ============================================================
   숫자 카운트업 애니메이션 (Stats)
   ============================================================ */
(function initCountUp() {
  const items = document.querySelectorAll('.stat-num[data-target]');
  if (!items.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      observer.unobserve(entry.target);
      const el     = entry.target;
      const target = parseInt(el.dataset.target, 10);
      const dur    = 1800;
      const step   = 16;
      const inc    = target / (dur / step);
      let current  = 0;
      const tick   = setInterval(() => {
        current += inc;
        if (current >= target) { current = target; clearInterval(tick); }
        el.textContent = Math.floor(current).toLocaleString('ko-KR');
      }, step);
    });
  }, { threshold: 0.4 });

  items.forEach(el => observer.observe(el));
})();

/* ============================================================
   진료 예약 폼 — 유효성 검사 & API 제출
   ============================================================ */
(function initReservationForm() {
  const form      = document.getElementById('reservationForm');
  const submitBtn = document.getElementById('submitBtn');
  const result    = document.getElementById('formResult');
  const deptSelect   = document.getElementById('dept');
  const doctorSelect = document.getElementById('doctor');

  if (!form) return;

  /* 날짜 최소값: 오늘 이후만 선택 가능 */
  const dateInput = document.getElementById('reserveDate');
  const today = new Date().toISOString().split('T')[0];
  dateInput.min = today;

  /* 진료과 변경 시 의료진 목록 동적 로드 */
  deptSelect.addEventListener('change', async () => {
    const dept = deptSelect.value;
    doctorSelect.innerHTML = '<option value="">불러오는 중...</option>';
    doctorSelect.disabled = true;

    if (!dept) {
      doctorSelect.innerHTML = '<option value="">의료진 선택 (선택사항)</option>';
      doctorSelect.disabled = false;
      return;
    }

    try {
      /*
       * [백엔드 연동]
       * const data = await fetchAPI(`/api/doctors?dept=${encodeURIComponent(dept)}`);
       * const doctors = data.items;
       */

      /* 임시 정적 데이터 (백엔드 연동 후 삭제) */
      const mockDoctors = {
        '내과':   [{ id: 1, name: '김철수 원장' }],
        '정형외과': [{ id: 2, name: '이영희 원장' }],
        '신경과':  [{ id: 3, name: '박민준 과장' }],
        '소아청소년과': [{ id: 4, name: '최수연 원장' }],
      };
      const doctors = mockDoctors[dept] || [];

      doctorSelect.innerHTML = '<option value="">의료진 선택 (선택사항)</option>';
      doctors.forEach(doc => {
        const opt = document.createElement('option');
        opt.value = doc.id;
        opt.textContent = doc.name;
        doctorSelect.appendChild(opt);
      });
    } catch (e) {
      doctorSelect.innerHTML = '<option value="">불러오기 실패</option>';
    } finally {
      doctorSelect.disabled = false;
    }
  });

  /* 단일 필드 유효성 검사 */
  function validateField(id, condition, msg) {
    const el   = document.getElementById(id);
    const errEl = document.getElementById('err-' + id);
    const ok   = condition(el.value);
    el.classList.toggle('error', !ok);
    if (errEl) errEl.textContent = ok ? '' : msg;
    return ok;
  }

  function validateAll() {
    const phoneRegex = /^0\d{1,2}-?\d{3,4}-?\d{4}$/;
    return [
      validateField('patientName',  v => v.trim().length >= 2,        '이름을 2자 이상 입력해주세요.'),
      validateField('phone',        v => phoneRegex.test(v.replace(/-/g, '')), '올바른 연락처를 입력해주세요.'),
      validateField('dept',         v => v !== '',                     '진료과를 선택해주세요.'),
      validateField('reserveDate',  v => v !== '',                     '날짜를 선택해주세요.'),
      (() => {
        const cb  = document.getElementById('agreePrivacy');
        const err = document.getElementById('err-agreePrivacy');
        const ok  = cb.checked;
        if (err) err.textContent = ok ? '' : '개인정보 수집에 동의해주세요.';
        return ok;
      })(),
    ].every(Boolean);
  }

  /* 폼 제출 */
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!validateAll()) return;

    const btnText    = submitBtn.querySelector('.btn-text');
    const btnLoading = submitBtn.querySelector('.btn-loading');
    submitBtn.disabled = true;
    btnText.style.display    = 'none';
    btnLoading.style.display = 'inline';
    result.style.display = 'none';

    const payload = {
      patientName:  form.patientName.value.trim(),
      phone:        form.phone.value.trim(),
      dept:         form.dept.value,
      doctorId:     form.doctor.value || null,
      reserveDate:  form.reserveDate.value,
      reserveTime:  form.reserveTime.value || null,
      symptoms:     form.symptoms.value.trim(),
    };

    try {
      /*
       * [백엔드 연동]
       * const data = await fetchAPI('/api/reservations', {
       *   method: 'POST',
       *   body: JSON.stringify(payload),
       * });
       * showResult('success', `예약이 완료되었습니다. 예약번호: ${data.reservationNo}`);
       */

      /* 임시: 1.5초 딜레이 후 성공 시뮬레이션 */
      await new Promise(r => setTimeout(r, 1500));
      showResult('success', '예약 신청이 완료되었습니다. 확인 문자를 발송드립니다. 예약번호: 2026-00001');
      form.reset();

    } catch (err) {
      showResult('error', err.message || '예약 신청 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      submitBtn.disabled = false;
      btnText.style.display    = 'inline';
      btnLoading.style.display = 'none';
    }
  });

  function showResult(type, msg) {
    result.className = 'form-result ' + type;
    result.textContent = msg;
    result.style.display = 'block';
    result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /* 실시간 유효성 검사 (blur) */
  ['patientName', 'phone', 'dept', 'reserveDate'].forEach(id => {
    document.getElementById(id)?.addEventListener('blur', () => {
      const phoneRegex = /^0\d{1,2}-?\d{3,4}-?\d{4}$/;
      const rules = {
        patientName: [v => v.trim().length >= 2, '이름을 2자 이상 입력해주세요.'],
        phone:       [v => phoneRegex.test(v.replace(/-/g,'')), '올바른 연락처를 입력해주세요.'],
        dept:        [v => v !== '', '진료과를 선택해주세요.'],
        reserveDate: [v => v !== '', '날짜를 선택해주세요.'],
      };
      if (rules[id]) validateField(id, rules[id][0], rules[id][1]);
    });
  });
})();

/* ============================================================
   플로팅 TOP 버튼
   ============================================================ */
(function initTopBtn() {
  const topBtn = document.getElementById('topBtn');
  window.addEventListener('scroll', () => {
    topBtn.classList.toggle('visible', window.scrollY > 400);
  }, { passive: true });
  topBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
})();

/* ============================================================
   [백엔드 연동 예시] 공지사항 동적 로드
   실서버 연동 시 아래 주석을 해제하고 정적 HTML을 제거하세요.
   ============================================================

async function loadNotices() {
  try {
    const data = await fetchAPI('/api/notices?limit=5');
    const list = document.querySelector('#noticeBoard .notice-list');
    list.innerHTML = data.items.map(item => `
      <li>
        <span class="notice-tag ${getTagClass(item.category)}">${item.category}</span>
        <a href="/notice/${item.id}">${item.title}</a>
        <span class="notice-date">${formatDate(item.createdAt)}</span>
      </li>
    `).join('');
  } catch (e) {
    console.error('공지사항 로드 실패:', e);
  }
}

function getTagClass(cat) {
  const map = { '공지': 'tag-notice', '이벤트': 'tag-event' };
  return map[cat] || '';
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('ko-KR', { year:'numeric', month:'2-digit', day:'2-digit' }).replace(/\. /g, '.').replace(/\.$/,'');
}

loadNotices();
============================================================ */
