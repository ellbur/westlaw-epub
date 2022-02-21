
chrome.action.onClicked.addListener(tab => {
  console.log('Browser action triggered');
  chrome.tabs.sendMessage(tab.id, {text: 'do_epub'});
});

