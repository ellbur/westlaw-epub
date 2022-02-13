
chrome.browserAction.onClicked.addListener(tab => {
  console.log('Got a click on tab with id', tab.id);
});

