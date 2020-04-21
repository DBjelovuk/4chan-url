(function() {
  const formTable = document.getElementById('postForm');
  if (!formTable) return;

  if (location.hash === '#posted') {
    setTimeout(() => {
      scrollTo(0, document.body.scrollHeight);
      location.hash = 'bottom';
    });
  }

  // Append url field
  const tbody = formTable.firstChild;
  const lastRow = tbody.querySelector('tr:last-child');

  const node = document.createElement('tr');

  node.innerHTML = `
    <td>URL</td>
    <td>
      <input type="text" data-type="Url" />
      <div class="url-error" style="color: red; display: none;">File not found (confirm your URL is accurate)</div>
      <div class="file-error" style="color: red; display: none;">File too large or unsupported</div>
    </td>`;

  tbody.insertBefore(node, lastRow);

  // Post logic
  let activeInput;
  let activeUrlError;
  let activeFileError;
  let activeSubmit;

  const patchForm = (form, isReply) => {
    if (!form) return;

    const urlInput = form.querySelector('input[data-type="Url"]');
    const urlError = form.querySelector('.url-error');
    const fileError = form.querySelector('.file-error');
    urlInput.oninput = () => {
      urlInput.style.backgroundColor = 'white';
      fileError.style.display = urlError.style.display = 'none';
    }

    if (isReply) urlInput.setAttribute('placeholder', 'URL');

    let subject;
    let comment;
    const isNewThread = !isReply && !location.pathname.includes('thread');
    if (isNewThread) {
      subject = form.querySelector('[name="sub"]');
      comment = form.querySelector('[name="com"]');
      const clearError = () => {
        subject.style.backgroundColor = 'white';
        comment.style.backgroundColor = 'white';
      };
      subject.oninput = clearError;
      comment.oninput = clearError;
    }

    const submitOverride = (e) => {
      activeInput = urlInput;
      activeUrlError = urlError;
      activeFileError = fileError;
      activeSubmit = form.querySelector('input[type="submit"]');

      const fileInput = form.querySelector('input[name="upfile"]');
      const captcha = form.querySelector('[name="g-recaptcha-response"]');
      const isMissingCaptcha = !captcha || !captcha.value;
      if (isMissingCaptcha || fileInput.value || !activeInput.value) return;

      e.preventDefault();
      e.stopPropagation();
      if (isNewThread && !subject.value && !comment.value) {
        subject.style.backgroundColor = 'lightpink';
        comment.style.backgroundColor = 'lightpink';
        return;
      }
      activeSubmit.value = 'Posting...';
      activeSubmit.disabled = true;
      const formObject = Object.fromEntries(new FormData(form));
      chrome.runtime.sendMessage({ formObject, imageUrl: activeInput.value, action: form.action });
    };
    form.onsubmit = submitOverride;

    const submitBtn = form.querySelector('input[type="submit"]');
    if (submitBtn) submitBtn.addEventListener('click', submitOverride, true);
  }

  patchForm(document.querySelector('form[name="post"]'));

  const observer = new MutationObserver(function(mutations) {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.id === 'quickReply') {
          patchForm(node.querySelector('form[name="qrPost"]'), true);
        }
      });
    });
  });
  observer.observe(document.body, { childList: true });

  chrome.runtime.onMessage.addListener((message) => {
    if (!message) return;

    if (message.threadUrl) {
      if (location.pathname.includes('thread')) {
        location.hash = 'posted';
        setTimeout(() => location.reload(), 1000);
      }
      else {
        location = message.threadUrl;
      }
      return;
    }
    activeSubmit.value = 'Post';
    activeSubmit.disabled = false;

    if (message === 'URL_ERROR') {
      activeInput.style.backgroundColor = 'lightpink';
      activeUrlError.style.display = 'block';
    }
    else if (message === 'FILE_ERROR') {
      activeInput.style.backgroundColor = 'lightpink';
      activeFileError.style.display = 'block';

      const captchaReset = document.createElement('script');
      captchaReset.innerHTML = `
        grecaptcha.reset();
        grecaptcha.reset(1);
      `;
      document.body.appendChild(captchaReset);
      setTimeout(() => captchaReset.remove());
    }
  });
})();
