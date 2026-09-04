
document.querySelectorAll('.copy').forEach(b => {
  b.addEventListener('click', () => {
    const src = document.getElementById(b.dataset.src);
    if (!src) return;
    const txt = src.innerText.replace(/\s+/g, ' ').trim();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(txt).then(() => {
        const orig = b.textContent;
        b.textContent = 'Copied ✓';
        setTimeout(() => b.textContent = orig, 1800);
      });
    }
  });
});
