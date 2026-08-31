/**
 * Forma form protection: adds a honeypot and a short-lived submission token.
 * Usage: <script src="https://your-forma-host/js/forma-protect.js" data-form="FORM_ID" defer></script>
 */
(function () {
  'use strict';

  var script = document.currentScript;
  var formId = script && script.getAttribute('data-form');
  if (!formId) return;

  var origin = '';
  try {
    origin = new URL(script.src).origin;
  } catch (err) {
    origin = window.location.origin;
  }

  var MIN_AGE_MS = 1000;
  var tokenIssuedAt = 0;

  function addHoneypot(form) {
    if (form.querySelector('[name="_gotcha"], [name="_honeypot"]')) return;
    var wrap = document.createElement('div');
    wrap.setAttribute('aria-hidden', 'true');
    wrap.style.cssText = 'position:absolute;left:-10000px;top:auto;width:1px;height:1px;overflow:hidden';
    wrap.innerHTML = '<label>Company website</label><input type="text" name="_gotcha" tabindex="-1" autocomplete="off">';
    form.appendChild(wrap);
  }

  function setToken(form, token) {
    var input = form.querySelector('input[name="_forma_token"]');
    if (!input) {
      input = document.createElement('input');
      input.type = 'hidden';
      input.name = '_forma_token';
      form.appendChild(input);
    }
    input.value = token;
  }

  function fetchToken() {
    return fetch(origin + '/api/forms/' + encodeURIComponent(formId) + '/challenge', {
      method: 'POST',
      headers: { Accept: 'application/json' },
    }).then(function (res) {
      if (!res.ok) throw new Error('challenge');
      return res.json();
    }).then(function (data) {
      tokenIssuedAt = Date.now();
      return data.token;
    });
  }

  function nativeSubmit(form) {
    HTMLFormElement.prototype.submit.call(form);
  }

  function bindForm(form) {
    if (form.getAttribute('data-forma-protected')) return;
    form.setAttribute('data-forma-protected', 'true');
    addHoneypot(form);

    fetchToken().then(function (token) {
      if (token) setToken(form, token);
    }).catch(function () {});

    form.addEventListener('submit', function (event) {
      var input = form.querySelector('input[name="_forma_token"]');
      var hasToken = input && input.value;
      var wait = hasToken ? MIN_AGE_MS - (Date.now() - tokenIssuedAt) : 0;

      if (hasToken && wait <= 0) return;

      event.preventDefault();
      var proceed = function () {
        nativeSubmit(form);
      };

      if (!hasToken) {
        fetchToken()
          .then(function (token) {
            if (token) setToken(form, token);
            setTimeout(proceed, MIN_AGE_MS);
          })
          .catch(proceed);
        return;
      }

      setTimeout(proceed, Math.max(wait, 0));
    });
  }

  function findForms() {
    var forms = document.querySelectorAll('form');
    for (var i = 0; i < forms.length; i++) {
      var action = forms[i].getAttribute('action') || '';
      if (action.indexOf('/api/forms/' + formId + '/submissions') !== -1) {
        bindForm(forms[i]);
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', findForms);
  } else {
    findForms();
  }
})();
