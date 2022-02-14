
console.log('Hello there');

function generateEPUBHTML() {
  document.querySelectorAll('.co_contentBlock > .co_headtext, .co_paragraph').forEach(item => {
    console.log('>', item.textContent);
  });
}

chrome.runtime.onMessage.addListener(function (msg, _sender, sendResponse) {
  if (msg.text === 'do_epub') {
    console.log('Content script got message');
    var epubHTML = generateEPUBHTML();
    sendResponse('I got you :)');
  }
});

