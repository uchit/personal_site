/* contact.js — client-side guards for the contact form.
 *
 * The form submits natively (a real POST that navigates), not via fetch. That
 * is deliberate, and was arrived at by testing rather than preference:
 * Web3Forms returns no Access-Control-Allow-Origin header, so an in-page fetch
 * fails CORS every time and the visitor sees a send failure on a form that is
 * actually configured correctly. A native POST is a navigation, so CORS never
 * applies — and it keeps working with JavaScript disabled.
 *
 * Success lands on /thanks/ via the form's hidden redirect field.
 *
 * What is left for JS to do is small: refuse to submit while the access key is
 * still a placeholder, and give the button a pending state so nobody double-
 * submits on a slow connection.
 */
(function () {
  "use strict";

  var form = document.getElementById("contact-form");
  if (!form) return;

  var status = document.getElementById("ct-status");
  var button = form.querySelector('button[type="submit"]');

  function setStatus(msg, kind) {
    if (!status) return;
    status.textContent = msg;
    status.className = "ct-status" + (kind ? " " + kind : "");
  }

  /* Until a real access key is in place, fail loudly. A form that silently
     swallows messages is the worst outcome available here. */
  function configured() {
    var key = form.querySelector('[name="access_key"]');
    return key && key.value && key.value.indexOf("REPLACE_WITH_ACCESS_KEY") === -1;
  }

  form.addEventListener("submit", function (e) {
    if (!configured()) {
      e.preventDefault();
      setStatus("Form not configured yet — please email contact@hellouchit.com", "err");
      return;
    }

    /* Let the browser handle validation messaging, then let the POST proceed. */
    if (!form.checkValidity()) return;

    if (button) {
      button.disabled = true;
      button.textContent = "Sending…";
    }
    setStatus("");
    if (window.gtag) gtag("event", "contact_form_submit");

    /* If the navigation is slow or the user comes back via bfcache, re-enable
       the button rather than leaving it stuck on "Sending…". */
    window.setTimeout(function () {
      if (button) { button.disabled = false; button.textContent = "Send message"; }
    }, 8000);
  });

  window.addEventListener("pageshow", function (ev) {
    if (ev.persisted && button) {
      button.disabled = false;
      button.textContent = "Send message";
    }
  });
})();
