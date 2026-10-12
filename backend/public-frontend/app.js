(function () {
  'use strict';

  var API_BASE = '/websitediscovery/api/public';
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // The page is served at {BASE_PATH}/:slug -> pull the slug straight out
  // of the URL so the same static page works for every client, whatever
  // BASE_PATH is configured to.
  var pathParts = window.location.pathname.split('/').filter(Boolean);
  var slug = pathParts[pathParts.length - 1] || '';
  var storageKey = 'questionnaire:' + slug;

  var els = {
    loading: document.getElementById('loading'),
    error: document.getElementById('error'),
    header: document.getElementById('header'),
    companyName: document.getElementById('companyName'),
    progressWrap: document.getElementById('progressWrap'),
    progressBar: document.getElementById('progressBar'),
    progressLabel: document.getElementById('progressLabel'),
    saveStatus: document.getElementById('saveStatus'),
    form: document.getElementById('questionnaireForm'),
    emailInput: document.getElementById('respondentEmail'),
    emailHint: document.getElementById('emailHint'),
    questionsContainer: document.getElementById('questionsContainer'),
    saveButton: document.getElementById('saveButton'),
    saveButtonLabel: document.getElementById('saveButtonLabel'),
    submitMessage: document.getElementById('submitMessage'),
    modalOverlay: document.getElementById('successModalOverlay'),
    modalMessage: document.getElementById('successModalMessage'),
    modalCloseBtn: document.getElementById('modalCloseBtn'),
    modalSubmitAnotherBtn: document.getElementById('modalSubmitAnotherBtn'),
  };

  var questions = [];
  // in-memory answers, keyed by question id (string) -> string | string[]
  var answers = {};
  // true right after a successful submit, until the visitor changes
  // something - stops leaving the page from saving the just-submitted answers
  // again as a new draft.
  var justSubmitted = false;

  function showError(message) {
    els.loading.hidden = true;
    els.error.hidden = false;
    els.error.textContent = message;
  }

  function readLocalDraft() {
    try {
      var raw = window.localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function writeLocalDraft() {
    try {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({ email: els.emailInput.value || '', answers: answers })
      );
    } catch (e) {
      // localStorage may be unavailable (private browsing, quota) - fail silently
    }
  }

  function clearLocalDraft() {
    try {
      window.localStorage.removeItem(storageKey);
    } catch (e) {
      /* ignore */
    }
  }

  function setSaveStatus(text) {
    if (!text) {
      els.saveStatus.hidden = true;
      return;
    }
    els.saveStatus.hidden = false;
    els.saveStatus.textContent = text;
  }

  function fieldName(question) {
    return 'q_' + question.id;
  }

  function renderQuestion(question) {
    var block = document.createElement('div');
    block.className = 'question-block';
    block.dataset.questionId = question.id;

    var label = document.createElement('label');
    label.className = 'question-label';
    label.textContent = question.text;
    if (question.required) {
      var star = document.createElement('span');
      star.className = 'required';
      star.textContent = ' *';
      label.appendChild(star);
    }
    block.appendChild(label);

    var name = fieldName(question);
    var input;

    switch (question.type) {
      case 'textarea':
        input = document.createElement('textarea');
        input.name = name;
        input.addEventListener('input', function () {
          setAnswer(question.id, input.value);
        });
        block.appendChild(input);
        break;

      case 'date':
        input = document.createElement('input');
        input.type = 'date';
        input.name = name;
        input.addEventListener('input', function () {
          setAnswer(question.id, input.value);
        });
        block.appendChild(input);
        break;

      case 'select': {
        input = document.createElement('select');
        input.name = name;
        var blankOpt = document.createElement('option');
        blankOpt.value = '';
        blankOpt.textContent = '-- Select --';
        input.appendChild(blankOpt);
        (question.options || []).forEach(function (opt) {
          var o = document.createElement('option');
          o.value = opt;
          o.textContent = opt;
          input.appendChild(o);
        });
        input.addEventListener('change', function () {
          setAnswer(question.id, input.value);
        });
        block.appendChild(input);
        break;
      }

      case 'radio': {
        var radioList = document.createElement('div');
        radioList.className = 'option-list';
        (question.options || []).forEach(function (opt, idx) {
          var row = document.createElement('div');
          row.className = 'option-row';
          var radio = document.createElement('input');
          radio.type = 'radio';
          radio.name = name;
          radio.value = opt;
          radio.id = name + '_' + idx;
          radio.addEventListener('change', function () {
            setAnswer(question.id, opt);
          });
          var lbl = document.createElement('label');
          lbl.htmlFor = radio.id;
          lbl.textContent = opt;
          row.appendChild(radio);
          row.appendChild(lbl);
          radioList.appendChild(row);
        });
        block.appendChild(radioList);
        break;
      }

      case 'checkbox': {
        var checkList = document.createElement('div');
        checkList.className = 'option-list';
        (question.options || []).forEach(function (opt, idx) {
          var row = document.createElement('div');
          row.className = 'option-row';
          var check = document.createElement('input');
          check.type = 'checkbox';
          check.name = name;
          check.value = opt;
          check.id = name + '_' + idx;
          check.addEventListener('change', function () {
            var current = Array.isArray(answers[question.id]) ? answers[question.id].slice() : [];
            if (check.checked) {
              if (current.indexOf(opt) === -1) current.push(opt);
            } else {
              current = current.filter(function (v) {
                return v !== opt;
              });
            }
            setAnswer(question.id, current);
          });
          var lbl = document.createElement('label');
          lbl.htmlFor = check.id;
          lbl.textContent = opt;
          row.appendChild(check);
          row.appendChild(lbl);
          checkList.appendChild(row);
        });
        block.appendChild(checkList);
        break;
      }

      case 'text':
      default:
        input = document.createElement('input');
        input.type = 'text';
        input.name = name;
        input.addEventListener('input', function () {
          setAnswer(question.id, input.value);
        });
        block.appendChild(input);
        break;
    }

    var hint = document.createElement('p');
    hint.className = 'hint';
    hint.id = 'hint_' + question.id;
    block.appendChild(hint);

    return block;
  }

  function setAnswer(questionId, value) {
    justSubmitted = false;
    answers[questionId] = value;
    writeLocalDraft();
    clearFieldError(questionId);
    updateProgress();
  }

  function clearFieldError(questionId) {
    var block = els.questionsContainer.querySelector('[data-question-id="' + questionId + '"]');
    if (!block) return;
    block.classList.remove('invalid');
    var hint = document.getElementById('hint_' + questionId);
    if (hint) {
      hint.textContent = '';
      hint.classList.remove('error');
    }
  }

  function isAnswerEmpty(value) {
    if (value === undefined || value === null) return true;
    if (Array.isArray(value)) return value.length === 0;
    return String(value).trim() === '';
  }

  function updateProgress() {
    if (!els.progressWrap || questions.length === 0) return;
    var answered = questions.filter(function (q) {
      return !isAnswerEmpty(answers[q.id]);
    }).length;
    var pct = Math.round((answered / questions.length) * 100);
    els.progressBar.style.width = pct + '%';
    els.progressLabel.textContent = answered + ' of ' + questions.length + ' answered';
    els.progressWrap.hidden = false;
  }

  // Populates the form fields (and the in-memory answers object) from a
  // { questionId: value } map, without overwriting fields that already hold
  // a value (so we never clobber what the visitor just typed).
  function applyAnswers(source, opts) {
    var overwrite = opts && opts.overwrite;
    questions.forEach(function (q) {
      var value = source[q.id] !== undefined ? source[q.id] : source[String(q.id)];
      if (value === undefined) return;
      if (!overwrite && !isAnswerEmpty(answers[q.id])) return;

      answers[q.id] = value;
      var name = fieldName(q);

      if (q.type === 'checkbox') {
        var selected = Array.isArray(value) ? value : [];
        var checks = els.form.querySelectorAll('input[name="' + name + '"]');
        checks.forEach(function (c) {
          c.checked = selected.indexOf(c.value) !== -1;
        });
      } else if (q.type === 'radio') {
        var radios = els.form.querySelectorAll('input[name="' + name + '"]');
        radios.forEach(function (r) {
          r.checked = r.value === value;
        });
      } else {
        var field = els.form.querySelector('[name="' + name + '"]');
        if (field) field.value = value || '';
      }
    });
    writeLocalDraft();
    updateProgress();
  }

  // Clears every field back to blank - used when starting a fresh response
  // (e.g. after "Submit another response").
  function clearAllAnswers() {
    answers = {};
    questions.forEach(function (q) {
      var name = fieldName(q);
      if (q.type === 'checkbox' || q.type === 'radio') {
        els.form.querySelectorAll('input[name="' + name + '"]').forEach(function (el) {
          el.checked = false;
        });
      } else {
        var field = els.form.querySelector('[name="' + name + '"]');
        if (field) field.value = '';
      }
      clearFieldError(q.id);
    });
    clearLocalDraft();
    updateProgress();
  }

  function validate() {
    var valid = true;
    var firstInvalid = null;

    if (!EMAIL_RE.test(els.emailInput.value.trim())) {
      valid = false;
      els.emailHint.textContent = 'Please enter a valid email address.';
      els.emailHint.classList.add('error');
      firstInvalid = firstInvalid || els.emailInput;
    } else {
      els.emailHint.textContent = '';
      els.emailHint.classList.remove('error');
    }

    questions.forEach(function (q) {
      if (!q.required) return;
      if (!isAnswerEmpty(answers[q.id])) return;
      valid = false;
      var block = els.questionsContainer.querySelector('[data-question-id="' + q.id + '"]');
      var hint = document.getElementById('hint_' + q.id);
      if (block) block.classList.add('invalid');
      if (hint) {
        hint.textContent = 'This question is required.';
        hint.classList.add('error');
      }
      firstInvalid = firstInvalid || block;
    });

    if (firstInvalid) firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return valid;
  }

  function currentEmail() {
    return els.emailInput.value.trim().toLowerCase();
  }

  // Auto-save (draft) to the server. Uses sendBeacon when leaving the page
  // (fire-and-forget, works even as the tab closes), otherwise a normal fetch.
  function autoSaveDraft(useBeacon) {
    if (justSubmitted) return;
    var email = currentEmail();
    if (!EMAIL_RE.test(email)) return;
    if (Object.keys(answers).length === 0) return;

    var payload = JSON.stringify({ email: email, answers: answers, submit: false });
    var url = API_BASE + '/client/' + encodeURIComponent(slug) + '/save';

    if (useBeacon && navigator.sendBeacon) {
      var blob = new Blob([payload], { type: 'application/json' });
      navigator.sendBeacon(url, blob);
    } else {
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch(function () {
        /* best effort */
      });
    }
  }

  var draftSaveTimer = null;
  function scheduleDraftSave() {
    if (justSubmitted) return;
    setSaveStatus('Saved on this device' + (EMAIL_RE.test(currentEmail()) ? '' : ' — add your email so we can keep a backup online'));
    if (draftSaveTimer) clearTimeout(draftSaveTimer);
    draftSaveTimer = setTimeout(function () {
      autoSaveDraft(false);
      if (EMAIL_RE.test(currentEmail())) setSaveStatus('Saved on this device and backed up online');
    }, 1500);
  }

  // Only a HALF-FILLED (draft, not yet submitted) response is fetched back
  // in. If this email already has a submitted response, we deliberately
  // leave the form blank for a fresh submission instead of re-filling their
  // old answers - they can still enter a new response and submit again.
  function loadEmailDraftFromServer() {
    var email = currentEmail();
    if (!EMAIL_RE.test(email)) return;

    fetch(API_BASE + '/client/' + encodeURIComponent(slug) + '/respondent?email=' + encodeURIComponent(email))
      .then(function (r) {
        return r.ok ? r.json() : null;
      })
      .then(function (data) {
        if (!data) return;
        if (data.status === 'submitted') {
          var when = data.updatedAt ? new Date(data.updatedAt).toLocaleDateString() : '';
          els.submitMessage.textContent = 'You already submitted a response with this email' + (when ? ' on ' + when : '') + '. Filling this in and pressing Save will submit a new response.';
          els.submitMessage.classList.remove('error', 'success');
          return;
        }
        applyAnswers(data.answers || {}, { overwrite: false });
      })
      .catch(function () {
        /* ignore network errors, local draft still works */
      });
  }

  function openSuccessModal() {
    els.modalOverlay.hidden = false;
    document.body.style.overflow = 'hidden';
    els.modalCloseBtn.focus();
  }

  function closeSuccessModal() {
    els.modalOverlay.hidden = true;
    document.body.style.overflow = '';
  }

  function submitForm(e) {
    e.preventDefault();
    if (!validate()) return;

    if (draftSaveTimer) clearTimeout(draftSaveTimer);
    els.saveButton.disabled = true;
    els.saveButtonLabel.textContent = 'Saving…';
    els.submitMessage.textContent = '';
    els.submitMessage.classList.remove('success', 'error');

    var payload = JSON.stringify({ email: currentEmail(), answers: answers, submit: true });

    fetch(API_BASE + '/client/' + encodeURIComponent(slug) + '/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
    })
      .then(function (r) {
        if (!r.ok) throw new Error('save failed');
        return r.json();
      })
      .then(function () {
        justSubmitted = true;
        clearLocalDraft();
        setSaveStatus('');
        openSuccessModal();
      })
      .catch(function () {
        els.submitMessage.textContent = 'Something went wrong saving your answers. Please try again.';
        els.submitMessage.classList.remove('success');
        els.submitMessage.classList.add('error');
      })
      .finally(function () {
        els.saveButton.disabled = false;
        els.saveButtonLabel.textContent = 'Save';
      });
  }

  function init() {
    if (!slug) {
      showError('No questionnaire was specified in this link.');
      return;
    }

    fetch(API_BASE + '/client/' + encodeURIComponent(slug))
      .then(function (r) {
        if (!r.ok) throw new Error('not found');
        return r.json();
      })
      .then(function (data) {
        questions = data.questions || [];
        els.loading.hidden = true;
        els.header.hidden = false;
        els.form.hidden = false;
        els.companyName.textContent = data.client.companyName || data.client.name || 'Questionnaire';
        document.title = (data.client.companyName || 'Questionnaire') + ' - Questionnaire';

        if (questions.length === 0) {
          els.questionsContainer.innerHTML = '<div class="question-block"><p class="hint" style="margin:0;font-size:0.95rem;">No questions have been assigned to this questionnaire yet.</p></div>';
          els.saveButton.hidden = true;
          return;
        }

        questions.forEach(function (q) {
          els.questionsContainer.appendChild(renderQuestion(q));
        });

        // 1. Restore anything already saved in this browser's localStorage
        var draft = readLocalDraft();
        if (draft.email) {
          els.emailInput.value = draft.email;
        }
        if (draft.answers) {
          applyAnswers(draft.answers, { overwrite: true });
        }
        updateProgress();

        // 2. If we now have a valid email (restored, or the visitor types
        // one), check the server for a previously saved DRAFT and fill in
        // anything still missing (a submitted response is never auto-filled
        // back in - see loadEmailDraftFromServer).
        if (EMAIL_RE.test(currentEmail())) {
          loadEmailDraftFromServer();
        }
        els.emailInput.addEventListener('blur', function () {
          writeLocalDraft();
          loadEmailDraftFromServer();
        });
        els.emailInput.addEventListener('input', function () {
          els.emailHint.textContent = '';
          els.emailHint.classList.remove('error');
          writeLocalDraft();
        });

        els.form.addEventListener('input', scheduleDraftSave);
        els.form.addEventListener('change', scheduleDraftSave);
        els.form.addEventListener('submit', submitForm);

        // 3. If the visitor leaves without pressing Save, back up whatever
        // they entered to the database against their email.
        window.addEventListener('pagehide', function () {
          autoSaveDraft(true);
        });
        document.addEventListener('visibilitychange', function () {
          if (document.visibilityState === 'hidden') autoSaveDraft(true);
        });

        // Success modal wiring
        els.modalCloseBtn.addEventListener('click', closeSuccessModal);
        els.modalSubmitAnotherBtn.addEventListener('click', function () {
          closeSuccessModal();
          clearAllAnswers();
          els.submitMessage.textContent = '';
          window.scrollTo({ top: 0, behavior: 'smooth' });
          els.emailInput.focus();
        });
        els.modalOverlay.addEventListener('click', function (e) {
          if (e.target === els.modalOverlay) closeSuccessModal();
        });
        document.addEventListener('keydown', function (e) {
          if (e.key === 'Escape' && !els.modalOverlay.hidden) closeSuccessModal();
        });
      })
      .catch(function () {
        showError('This questionnaire link could not be found. Please double-check the URL or contact the sender.');
      });
  }

  init();
})();
