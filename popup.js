
(function() {
  'use strict';
  
  console.log('a');
  document.addEventListener('readystatechange', event => {
    console.log('b');
    if (event.target.readyState === 'complete') {
      console.log('c');
      document.getElementById('download-link').addEventListener('click', () => {
        console.log('Sending message to content script');
        chrome.tabs.sendMessage(tab.id, {text: 'do_epub'}, response => {
          console.log('Got response from content script', response);
        });
      });
    }
  });
})();

