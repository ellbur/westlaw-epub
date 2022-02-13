
console.log('Hello there');

chrome.runtime.onMessage.addListener(function (msg, _sender, sendResponse) {
  if (msg.text === 'do_epub') {
    console.log('Content script got message');
    sendResponse('I got you :)');
  }
});

