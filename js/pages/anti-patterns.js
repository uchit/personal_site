
// Filter
document.querySelectorAll('.ap-filter button').forEach(b => {
  b.addEventListener('click', () => {
    const f = b.dataset.f;
    document.querySelectorAll('.ap-filter button').forEach(x => x.classList.toggle('on', x === b));
    document.querySelectorAll('.ap').forEach(ap => {
      const tags = (ap.dataset.f || '').split(/\s+/);
      const show = f === 'all' || tags.includes(f);
      ap.classList.toggle('hidden', !show);
    });
    // Update visible count in the All button
    const allBtn = document.querySelector('.ap-filter button[data-f="all"]');
    const total = document.querySelectorAll('.ap').length;
    if (f === 'all') allBtn.textContent = `All (${total})`;
    else {
      const visible = document.querySelectorAll('.ap:not(.hidden)').length;
      allBtn.textContent = `All (${total})`;
      b.textContent = b.textContent.replace(/\s*\(\d+\)$/, '') + ` (${visible})`;
    }
  });
});

// Smooth-scroll for in-page anchors so the sticky filter doesn't hide the heading
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', () => {
    const id = a.getAttribute('href').slice(1);
    const el = document.getElementById(id);
    if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30);
  });
});
