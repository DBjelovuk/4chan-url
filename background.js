chrome.runtime.onMessage.addListener(async ({ formObject, imageUrl, action }, sender) => {
  try {
    const imageBlob = await fetch(imageUrl).then((res) => res.blob());

    // Serialize form data
    const formData = new FormData();
    Object.keys(formObject).forEach(key => formData.append(key, formObject[key]));
    formData.set('upfile', imageBlob, imageUrl.match(/\/([^\/]*?)(\?|#|$)/)[1]);

    // Post image
    const response = await fetch(action, { method: 'POST', body: formData }).then((res) => res.text());
    const responseHtml = new DOMParser().parseFromString(response, 'text/html');

    const refreshMeta = responseHtml.querySelector('meta[http-equiv="refresh"]');
    if (refreshMeta) {
      const threadUrl = refreshMeta.getAttribute('content').split('URL=')[1];
      if (threadUrl) {
        chrome.tabs.sendMessage(sender.tab.id, { threadUrl });
        return;
      }
    }
    if (responseHtml.getElementById('errmsg')) {
      chrome.tabs.sendMessage(sender.tab.id, 'FILE_ERROR');
    }
  } catch (err) {
    chrome.tabs.sendMessage(sender.tab.id, 'URL_ERROR');
  }
});
