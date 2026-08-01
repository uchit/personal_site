/* contact.js — submits the contact form without leaving the page.
 *
 * The form is a real <form> with a real action, so it still works with JS
 * disabled — the visitor just lands on the provider's confirmation page. This
 * upgrades that to an inline fetch so they stay put and get the confirmation
 * in context.
 *
 * No endpoint is hard-coded here; it is read from the form's action attribute,
 * so switching provider is a one-line HTML change.
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

  /* The placeholder is what ships until a real endpoint is configured. Failing
     loudly here beats a form that silently swallows messages — the worst
     possible outcome for a contact form. */
  function endpointConfigured() {
    var action = form.getAttribute("action") || "";
    return action && action.indexOf("REPLACE_WITH_FORM_ID") === -1;
  }

  form.addEventListener("submit", function (e) {
    if (!endpointConfigured()) {
      e.preventDefault();
      setStatus("Form not configured yet — please email contact@hellouchit.com", "err");
      return;
    }

    e.preventDefault();

    if (!form.checkValidity()) { form.reportValidity(); return; }

    var original = button ? button.textContent : "";
    if (button) { button.disabled = true; button.textContent = "Sending…"; }
    setStatus("");

    fetch(form.action, {
      method: "POST",
      body: new FormData(form),
      headers: { Accept: "application/json" },
    })
      .then(function (res) {
        if (res.ok) {
          form.reset();
          setStatus("Thanks — that reached me. I'll reply personally.", "ok");
          if (window.gtag) gtag("event", "contact_form_submit");
        } else {
          return res.json().then(function (d) {
            throw new Error((d && d.error) || "Submission failed");
          });
        }
      })
      .catch(function () {
        /* Never leave someone with a dead form and no route: give them the
           address they can use instead. */
        setStatus("Didn't send — please email contact@hellouchit.com", "err");
      })
      .then(function () {
        if (button) { button.disabled = false; button.textContent = original; }
      });
  });
})();
