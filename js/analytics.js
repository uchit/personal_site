/* hellouchit.com — Google Analytics 4 (G-XKE8WPKMMX) + outbound-click attribution.
 * Pairs with <script async src="https://www.googletagmanager.com/gtag/js?id=G-XKE8WPKMMX">
 * on the same page. Kept as a single external file so no page needs an inline
 * <script> block for analytics (CSP script-src has no 'unsafe-inline'). */
window.dataLayer = window.dataLayer || [];
function gtag() { dataLayer.push(arguments); }
gtag('js', new Date());
gtag('config', 'G-XKE8WPKMMX', { anonymize_ip: true });

document.addEventListener('click', function (e) {
  var a = e.target.closest('a'); if (!a || !a.href) return;
  var u; try { u = new URL(a.href, location.href); } catch (_) { return; }
  if (!u.hostname || u.hostname === location.hostname) return;
  var dest = 'outbound_click', h = u.hostname.replace(/^www\./, '');
  if (/substack\.com$/.test(h)) dest = 'substack_click';
  else if (/linkedin\.com$/.test(h)) dest = 'linkedin_click';
  else if (/github\.com$/.test(h)) dest = 'github_click';
  else if (/chatgpt\.com$/.test(h) || /openai\.com$/.test(h)) dest = 'gpt_click';
  else if (/claude\.ai$/.test(h) || /anthropic\.com$/.test(h)) dest = 'claude_click';
  gtag('event', dest, { link_url: a.href, link_domain: h, link_text: (a.innerText || '').slice(0, 80) });
});
