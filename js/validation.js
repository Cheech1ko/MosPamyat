(function () {
    'use strict';

    // ─────────────────────────────────────────────────────────────
    // 1. МАСКА ТЕЛЕФОНА
    // ─────────────────────────────────────────────────────────────

    function formatPhone(raw) {
        var digits = raw.replace(/\D/g, '');
        if (digits.length === 0) return '';
        // 8 в начале → 7
        if (digits[0] === '8') digits = '7' + digits.slice(1);
        // нет 7 → добавить
        if (digits[0] !== '7') digits = '7' + digits;
        digits = digits.slice(0, 11);

        var r = '+7';
        if (digits.length > 1) r += ' (' + digits.slice(1, 4);
        if (digits.length >= 4) r += ')';
        if (digits.length >  4) r += ' ' + digits.slice(4, 7);
        if (digits.length >  7) r += '-' + digits.slice(7, 9);
        if (digits.length >  9) r += '-' + digits.slice(9, 11);
        return r;
    }

    function applyPhoneMask(input) {
        if (input._phoneMaskApplied) return;
        input._phoneMaskApplied = true;

        input.addEventListener('input', function () {
            var pos = input.selectionStart;
            var old = input.value.length;
            input.value = formatPhone(input.value);
            var diff = input.value.length - old;
            input.setSelectionRange(pos + diff, pos + diff);
            clearFieldError(input);
        });

        input.addEventListener('focus', function () {
            if (input.value === '') input.value = '+7 (';
        });

        input.addEventListener('blur', function () {
            if (input.value === '+7 (' || input.value === '+7') input.value = '';
        });

        input.addEventListener('keydown', function (e) {
            var nav = ['Backspace','Delete','ArrowLeft','ArrowRight','Tab','Home','End'];
            if (nav.includes(e.key)) return;
            if (e.ctrlKey || e.metaKey) return; // разрешаем Ctrl+A, Ctrl+C и т.п.
            if (!/^\d$/.test(e.key)) e.preventDefault();
        });

        input.addEventListener('paste', function (e) {
            e.preventDefault();
            var text = (e.clipboardData || window.clipboardData).getData('text');
            input.value = formatPhone(text);
        });
    }

    // ─────────────────────────────────────────────────────────────
    // 2. ПРАВИЛА ВАЛИДАЦИИ
    // ─────────────────────────────────────────────────────────────

    function validateFio(val) {
        var v = val.trim();
        if (!v) return 'Введите ваше имя';
        if (!/^[А-ЯЁа-яёA-Za-z\-\s]+$/.test(v)) return 'Только буквы, пробел и дефис';
        if (v.replace(/\s/g,'').length < 2) return 'Слишком короткое имя';
        return null;
    }

    function validatePhone(val) {
        if (!val || val.trim() === '' || val === '+7 (') return 'Введите номер телефона';
        var d = val.replace(/\D/g, '');
        if (d.length < 11) return 'Введите полный номер — 11 цифр';
        if (d[0] !== '7')  return 'Номер должен начинаться с +7';
        return null;
    }

    // ─────────────────────────────────────────────────────────────
    // 3. ПОКАЗ / СБРОС ОШИБОК ПОЛЯ
    // ─────────────────────────────────────────────────────────────

    function showFieldError(input, msg) {
        clearFieldError(input);
        input.style.borderColor  = '#d32f2f';
        input.style.borderWidth  = '2px';
        input.style.background   = '#fff8f8';

        var d = document.createElement('div');
        d.className = 'v-error-msg';
        d.style.cssText = 'color:#d32f2f;font-size:12px;margin-top:5px;font-weight:600;display:flex;align-items:center;gap:5px;';
        d.innerHTML = '<i class="fas fa-exclamation-circle"></i>' + msg;
        if (input.parentNode) input.parentNode.appendChild(d);
    }

    function clearFieldError(input) {
        input.style.borderColor = '';
        input.style.borderWidth = '';
        input.style.background  = '';
        if (input.parentNode) {
            var old = input.parentNode.querySelector('.v-error-msg');
            if (old) old.remove();
        }
    }

    function markSuccess(input) {
        clearFieldError(input);
        input.style.borderColor = '#27ae60';
        input.style.borderWidth = '2px';
    }

    // ─────────────────────────────────────────────────────────────
    // 4. СОГЛАСИЕ НА ОПД
    // ─────────────────────────────────────────────────────────────

    var _depth = window.location.pathname.split('/').filter(Boolean).length;
    var _prefix = _depth > 1 ? '../'.repeat(_depth - 1) : '';
    var CONSENT_HTML =
        'Нажимая кнопку, я даю согласие на ' +
        '<a href="' + _prefix + 'privacy-policy.html" target="_blank" ' +
        'style="color:#C8A84B;text-decoration:underline;">обработку персональных данных</a>' +
        ' в соответствии с&nbsp;Федеральным законом №&nbsp;152-ФЗ.';

    function injectConsent(containerEl, uid) {
        if (!containerEl) return;
        if (containerEl.querySelector('.v-consent-block')) return;

        var submitBtn = containerEl.querySelector(
            'button[type="submit"],.btn-submit,button[onclick*="submit"],button[onclick*="Submit"],button[onclick*="Order"]'
        );

        var wrap = document.createElement('div');
        wrap.className = 'v-consent-block';
        wrap.style.cssText = 'margin-bottom:16px;';
        wrap.innerHTML =
            '<label style="display:flex;align-items:flex-start;gap:10px;cursor:pointer;">' +
            '  <input type="checkbox" id="v_consent_' + uid + '" ' +
            '         style="width:16px;height:16px;margin-top:3px;flex-shrink:0;accent-color:#C8A84B;cursor:pointer;">' +
            '  <span style="font-size:13px;color:#666;line-height:1.5;">' + CONSENT_HTML + '</span>' +
            '</label>' +
            '<div class="v-consent-err" ' +
            '     style="display:none;color:#d32f2f;font-size:12px;margin-top:5px;font-weight:600;">' +
            '  <i class="fas fa-exclamation-circle"></i> Необходимо согласие для отправки' +
            '</div>';

        if (submitBtn) {
            submitBtn.parentNode.insertBefore(wrap, submitBtn);
        } else {
            containerEl.appendChild(wrap);
        }
        var cb = wrap.querySelector('input');
        var errEl = wrap.querySelector('.v-consent-err');
        cb.addEventListener('change', function () {
            if (cb.checked && errEl) errEl.style.display = 'none';
        });
    }

    function checkConsent(containerEl) {
        if (!containerEl) return true;
        var cb  = containerEl.querySelector('.v-consent-block input[type="checkbox"]');
        var err = containerEl.querySelector('.v-consent-err');
        if (!cb) return true;
        if (cb.checked) { if (err) err.style.display = 'none'; return true; }
        if (err) err.style.display = 'block';
        cb.closest('.v-consent-block').scrollIntoView({ behavior: 'smooth', block: 'center' });
        return false;
    }

    // ─────────────────────────────────────────────────────────────
    // 5. ПУБЛИЧНАЯ ФУНКЦИЯ ВАЛИДАЦИИ
    // ─────────────────────────────────────────────────────────────

    window.validateForm = function (nameId, phoneId, containerId) {
        var nameEl  = document.getElementById(nameId);
        var phoneEl = document.getElementById(phoneId);
        var formEl  = containerId ? document.getElementById(containerId) : null;
        var ok = true;

        if (nameEl) {
            var fioErr = validateFio(nameEl.value);
            if (fioErr) { showFieldError(nameEl, fioErr); ok = false; }
            else        { markSuccess(nameEl); }
        }

        if (phoneEl) {
            var telErr = validatePhone(phoneEl.value);
            if (telErr) { showFieldError(phoneEl, telErr); ok = false; }
            else        { markSuccess(phoneEl); }
        }

        if (!checkConsent(formEl)) ok = false;

        if (!ok && (nameEl || phoneEl)) {
            var first = nameEl || phoneEl;
            if (nameEl && nameEl.style.borderColor === '#d32f2f') first = nameEl;
            else if (phoneEl && phoneEl.style.borderColor === '#d32f2f') first = phoneEl;
            first.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        return ok;
    };

    // ─────────────────────────────────────────────────────────────
    // 6. ПЕРЕХВАТ ФУНКЦИЙ ИЗ main.js
    // ─────────────────────────────────────────────────────────────

    var _origSubmitForm = window.submitForm;
    window.submitForm = function (formId, successId) {
        var isModal = formId === 'modalFormWrap';
        var nameId  = isModal ? 'mname' : 'fname';
        var phoneId = isModal ? 'mphone' : 'fphone';

        if (!window.validateForm(nameId, phoneId, formId)) return;

        if (!isModal) {
            var fcheck = document.getElementById('fcheck');
            if (fcheck && !fcheck.checked) {
                var fcErr = fcheck.closest('.form-group');
                if (fcErr) {
                    var old = fcErr.querySelector('.v-error-msg');
                    if (!old) {
                        var d = document.createElement('div');
                        d.className = 'v-error-msg';
                        d.style.cssText = 'color:#d32f2f;font-size:12px;margin-top:4px;font-weight:600;';
                        d.innerHTML = '<i class="fas fa-exclamation-circle"></i> Необходимо согласие';
                        fcErr.appendChild(d);
                    }
                }
                return;
            }
        }

        if (typeof _origSubmitForm === 'function') _origSubmitForm(formId, successId);
    };

    // — submitOrderFromModal (карточка товара)
    var _origOrderModal = window.submitOrderFromModal;
    window.submitOrderFromModal = function () {
        if (!window.validateForm('modalName', 'modalPhone', 'orderForm')) return;
        if (typeof _origOrderModal === 'function') _origOrderModal();
    };

    // — sendCallbackRequest (форма «Выезд менеджера»)
    var _origCallback = window.sendCallbackRequest;
    window.sendCallbackRequest = function () {
        if (!window.validateForm('cbname', 'cbphone', 'callbackFormWrap')) return;
        if (typeof _origCallback === 'function') _origCallback();
    };

    // ─────────────────────────────────────────────────────────────
    // 7. ИНИЦИАЛИЗАЦИЯ
    // ─────────────────────────────────────────────────────────────

    function init() {
        // Маска на все поля tel
        document.querySelectorAll('input[type="tel"], [data-phone]').forEach(applyPhoneMask);

        // Живой сброс ошибки при вводе имени
        ['mname','fname','modalName','cbname'].forEach(function (id) {
            var el = document.getElementById(id);
            if (el) el.addEventListener('input', function () { clearFieldError(el); });
        });

        // Вставляем согласия
        // Модалка заказа товара (#orderForm)
        injectConsent(document.getElementById('orderForm'), 'order');

        // Обычная модалка на главной (#modalFormWrap)
        injectConsent(document.getElementById('modalFormWrap'), 'modal');

        // Основная контактная форма (#mainFormWrap)
        injectConsent(document.getElementById('mainFormWrap'), 'main');

        // Форма выезда менеджера (#callbackFormWrap)
        injectConsent(document.getElementById('callbackFormWrap'), 'callback');

        // Подстраховка — любые формы с data-form
        document.querySelectorAll('[data-form]').forEach(function (el, i) {
            injectConsent(el, 'df' + i);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // ─────────────────────────────────────────────────────────────
    // 8. СТИЛИ
    // ─────────────────────────────────────────────────────────────

    var css = [
        /* Поле с ошибкой */
        'input.inp-error, input[style*="#d32f2f"] {',
        '  box-shadow: 0 0 0 3px rgba(211,47,47,.10) !important;',
        '}',
        /* Поле ок */
        'input[style*="#27ae60"] {',
        '  box-shadow: 0 0 0 3px rgba(39,174,96,.10) !important;',
        '}',
        /* Блок согласия */
        '.v-consent-block { user-select: none; }',
        '.v-consent-block label:hover span { color: #333; }',
        '.v-consent-block a:hover { text-decoration: none; }',
    ].join('\n');

    var s = document.createElement('style');
    s.textContent = css;
    document.head.appendChild(s);

}());
