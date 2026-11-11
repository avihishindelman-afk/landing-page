/* טופס "השאירו פרטים" – ShinTech
   שולח את הפרטים ל-webhook של Make שמוגדר ב-action של הטופס (index.html).
   הנתונים נשלחים כ-application/x-www-form-urlencoded, בשדות:
   FirstName, LastName, Email, Mobile – בדיוק כשמות העמודות בגיליון.
   Mobile נשלח בפורמט 050-1234567, כדי שהגיליון לא ימחק את ה-0 בהתחלה. */
(function () {
  'use strict';

  var form = document.getElementById('lead-form');
  if (!form || !window.fetch) return; /* בלי JavaScript הטופס נשלח ישירות ל-action */

  var endpoint = form.getAttribute('action');
  var firstEl = document.getElementById('lead-first');
  var lastEl = document.getElementById('lead-last');
  var emailEl = document.getElementById('lead-email');
  var mobileEl = document.getElementById('lead-mobile');
  var trapEl = document.getElementById('lead-website');
  var btn = form.querySelector('button[type="submit"]');
  var btnText = btn.textContent;
  var okEl = document.getElementById('lead-ok');
  var failEl = document.getElementById('lead-fail');
  var sending = false;

  var TEXT = {
    firstEmpty: 'נא להזין שם פרטי.',
    lastEmpty: 'נא להזין שם משפחה.',
    emailEmpty: 'נא להזין כתובת אימייל.',
    emailBad: 'כתובת האימייל אינה תקינה. לדוגמה: name@example.com',
    mobileEmpty: 'נא להזין מספר נייד.',
    mobileBad: 'מספר הנייד אינו תקין. לדוגמה: 050-1234567',
    sending: 'שולח...',
    ok: 'הפרטים התקבלו. אצור איתכם קשר בהקדם.',
    fail: 'הפרטים לא נשלחו. אפשר לנסות שוב, או לפנות אליי ב-' +
      '<a href="https://wa.me/972508856888" target="_blank" rel="noopener">WhatsApp<span class="sr-only"> (נפתח בחלון חדש)</span></a>' +
      ' או בטלפון <a href="tel:+972508856888" dir="ltr">050-8856888</a>.'
  };

  form.setAttribute('novalidate', ''); /* הבדיקה וההודעות מכאן, בעברית */

  /* 0501234567 / 050-123-4567 / +972501234567 → 0501234567 */
  function mobileDigits(value) {
    var d = value.replace(/[^\d+]/g, '');
    if (d.indexOf('+972') === 0) d = '0' + d.slice(4);
    else if (d.indexOf('972') === 0 && d.length === 12) d = '0' + d.slice(3);
    return d.replace(/\D/g, '');
  }

  function mobileFormatted(value) {
    var d = mobileDigits(value);
    return d.slice(0, 3) + '-' + d.slice(3);
  }

  var CHECKS = [
    { el: firstEl, test: function (v) { return v ? '' : TEXT.firstEmpty; } },
    { el: lastEl, test: function (v) { return v ? '' : TEXT.lastEmpty; } },
    { el: emailEl, test: function (v) {
      if (!v) return TEXT.emailEmpty;
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? '' : TEXT.emailBad;
    } },
    { el: mobileEl, test: function (v) {
      if (!v) return TEXT.mobileEmpty;
      return /^05\d{8}$/.test(mobileDigits(v)) ? '' : TEXT.mobileBad;
    } }
  ];

  function setError(field, message) {
    var err = document.getElementById(field.id + '-error');
    var hint = document.getElementById(field.id + '-hint');
    if (message) {
      err.textContent = message;
      err.hidden = false;
      field.setAttribute('aria-invalid', 'true');
      field.setAttribute('aria-describedby', (hint ? hint.id + ' ' : '') + err.id);
    } else {
      err.textContent = '';
      err.hidden = true;
      field.removeAttribute('aria-invalid');
      if (hint) field.setAttribute('aria-describedby', hint.id);
      else field.removeAttribute('aria-describedby');
    }
  }

  function check(c) {
    var msg = c.test(c.el.value.trim());
    setError(c.el, msg);
    return !msg;
  }

  /* השגיאה נעלמת ברגע שהשדה תוקן */
  CHECKS.forEach(function (c) {
    c.el.addEventListener('input', function () { if (c.el.getAttribute('aria-invalid')) check(c); });
  });

  function setSending(on) {
    sending = on;
    if (on) {
      btn.setAttribute('aria-disabled', 'true');
      btn.textContent = TEXT.sending;
    } else {
      btn.removeAttribute('aria-disabled');
      btn.textContent = btnText;
    }
  }

  function succeed() {
    form.reset();
    CHECKS.forEach(function (c) { setError(c.el, ''); });
    okEl.textContent = TEXT.ok;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (sending) return;
    okEl.textContent = '';
    failEl.innerHTML = '';

    var firstBad = null;
    CHECKS.forEach(function (c) { if (!check(c) && !firstBad) firstBad = c.el; });
    if (firstBad) { firstBad.focus(); return; }

    /* מלכודת לבוטים: שדה מוסתר שאדם לא ממלא */
    if (trapEl && trapEl.value) { succeed(); return; }

    var data = new URLSearchParams();
    data.append('FirstName', firstEl.value.trim());
    data.append('LastName', lastEl.value.trim());
    data.append('Email', emailEl.value.trim());
    data.append('Mobile', mobileFormatted(mobileEl.value));

    setSending(true);
    var controller = window.AbortController ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, 15000) : null;

    /* no-cors: הבקשה נמסרת ל-Make גם בלי כותרות CORS; כשל רשת או חריגת זמן מוצגים כשגיאה */
    fetch(endpoint, { method: 'POST', mode: 'no-cors', body: data, signal: controller ? controller.signal : undefined })
      .then(function () { succeed(); })
      .catch(function () { failEl.innerHTML = TEXT.fail; })
      .then(function () { if (timer) clearTimeout(timer); setSending(false); });
  });
})();
