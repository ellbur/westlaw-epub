
var JSZip = require("jszip");
import { saveAs } from 'file-saver';
import { v4 as uuidv4 } from 'uuid';

function combineParOuts(p1, p2) {
  return {
    children: p1.children.concat(p2.children),
    footnotes: p1.footnotes.concat(p2.footnotes)
  };
}

function processParagraph(p) {
  var res = {
    children: [ ],
    footnotes: [ ]
  };
  
  p.childNodes.forEach(child => {
    if (child instanceof Text) {
      res.children.push(new Text(child.textContent));
    }
    else if (child instanceof Element) {
      if (child.tagName.toUpperCase() == 'DIV') {
        res = combineParOuts(res, processParagraph(child));
      }
      else if (child.tagName.toUpperCase() == 'SPAN') {
        if (child.classList.contains('co_starPage')) {
        }
        else if (child.classList.contains('co_underline')) {
          var emBit = document.createElement('em');
          var sub = processParagraph(child);
          sub.children.forEach(nested => {
            emBit.appendChild(nested);
          });
          res.children.push(emBit);
          res.footnotes.push(...sub.footnotes);
        }
        else {
          res = combineParOuts(res, processParagraph(child));
        }
      }
      else if (child.tagName.toUpperCase() == 'EM') {
        var emBit = document.createElement('em');
        var sub = processParagraph(child);
        sub.children.forEach(nested => {
          emBit.appendChild(nested);
        });
        res.children.push(emBit);
        res.footnotes.push(...sub.footnotes);
      }
      else if (child.tagName.toUpperCase() == 'A') {
        if (child.classList.contains('co_footnoteReference')) {
          var call = document.createElement('sup');
          call.appendChild(new Text(child.textContent));
          res.children.push(call);
          res.footnotes.push(new URL(child.href).hash.substring(1));
        }
        else {
          res = combineParOuts(res, processParagraph(child));
        }
      }
      else {
        res = combineParOuts(res, processParagraph(child));
      }
    }
    else {
      res = combineParOuts(res, processParagraph(child));
    }
  });
  
  return res;
}

function processParagraphSet(div) {
  var res = {
    children: [ ],
    footnotes: [ ]
  };
  
  for (var child of div.children) {
    if (child.classList.contains('co_paragraphText')) {
      var c1 = processParagraph(child);
      var p = document.createElement('p');
      for (var u of c1.children) { p.appendChild(u); }
      res.children.push(p);
      res.footnotes.push(...c1.footnotes);
    }
    else if (child.classList.contains('co_paragraph')) {
      if (child.classList.contains('co_indentLeft1')) {
        var c1 = processParagraph(child);
        var p = document.createElement('blockquote');
        for (var u of c1.children) { p.appendChild(u); }
        res.children.push(p);
        res.footnotes.push(...c1.footnotes);
      }
      else {
        var c1 = processParagraph(child);
        var p = document.createElement('p');
        for (var u of c1.children) { p.appendChild(u); }
        res.children.push(p);
        res.footnotes.push(...c1.footnotes);
      }
    }
    else {
      var c1 = processParagraph(child);
      var p = document.createElement('p');
      for (var u of c1.children) { p.appendChild(u); }
      res.children.push(p);
      res.footnotes.push(...c1.footnotes);
    }
  }
  
  return res;
}

function gatherBody(cite, court, caption, docket, footnotes) {
  var footnoteTable = { };
  
  for (var fn of footnotes) {
    footnoteTable[fn.id] = fn;
  }
  
  var outElems = [ ];
  
  document.querySelectorAll('.co_headtext > .co_headtext, .co_contentBlock > .co_paragraph').forEach(item => {
    if (item.classList.contains('co_headtext')) {
      if (item.classList.contains('co_hAlign2')) {
        var h1 = document.createElement('h1');
        h1.innerText = item.textContent;
        outElems.push(h1);
      }
      else if (item.classList.contains('co_hAlign1')) {
        var h2 = document.createElement('h2');
        h2.innerText = item.textContent;
        outElems.push(h2);
      }
      else {
        var h3 = document.createElement('h3');
        h3.innerText = item.textContent;
        outElems.push(h3);
      }
    }
    else if (item.classList.contains('co_paragraph')) {
      var proc = processParagraphSet(item);
      outElems.push(...proc.children);
      
      for (var href of proc.footnotes) {
        var foundFN = footnoteTable[href];
        if (typeof foundFN !== 'undefined') {
          var pars = foundFN.pars;
          if (pars.length > 0) {
            var sup = document.createElement('sup');
            sup.innerText = foundFN.number;
            pars[0].prepend(sup);
          }
          for (var fnP of pars) {
            fnP.classList.add('footnote');
            outElems.push(fnP);
          }
        }
      }
    }
  });
  
  var res = document.createDocumentFragment();
  res.append(makeP(caption));
  res.append(makeP(court));
  res.append(makeP(docket));
  res.append(makeP(cite));
  res.append(...outElems);
  
  return res;
}

function gatherFootnotes() {
  var res = [ ];
  
  var footnoteSection = document.getElementById('co_footnoteSection');
  if (footnoteSection === null) {
    return [ ];
  }
  
  for (var d of footnoteSection.children) {
    if (d.tagName.toUpperCase() == 'DIV') {
      var footnoteNumber = d.querySelector('.co_footnoteNumber');
      var footnoteBody = d.querySelector('.co_footnoteBody');
      
      if (typeof footnoteNumber !== 'undefined' && typeof footnoteBody !== 'undefined') {
        var numberText = footnoteNumber.textContent.trim();
        
        var footnoteID = null;
        var foundID = false;
        for (var numberChild of footnoteNumber.children) {
          if (numberChild.tagName.toUpperCase() == 'SPAN') {
            if (numberChild.hasAttribute('id')) {
              foundID = true;
              footnoteID = numberChild.getAttribute('id');
              break;
            }
          }
        }
        
        if (foundID) {
          var pars = [ ];
          
          for (var fp of footnoteBody.querySelectorAll('.co_paragraph')) {
            var proc = processParagraphSet(fp);
            pars.push(...proc.children);
          }
          
          res.push({
            'number': numberText,
            'id': footnoteID,
            'pars': pars
          });
        }
      }
    }
  }
  
  return res;
}

function makeP(text) {
  var p = document.createElement('p');
  p.innerText = text;
  return p;
}

chrome.runtime.onMessage.addListener(function (msg, _sender, _sendResponse) {
  if (msg.text === 'do_epub') {
    var zip = new JSZip();
    
    var cite = document.querySelector('.co_cites').textContent;
    var court = document.querySelector('.co_courtBlock').textContent;
    var caption = document.querySelector('.co_title').textContent;
    var docket = document.querySelector('.co_docketDate').textContent;
    var shortTitle = document.getElementById('title').innerText;
    
    var footnotes = gatherFootnotes();
    var bodyElems = gatherBody(cite, court, caption, docket, footnotes);

    var title = caption;

    var chapterBodyElems = bodyElems;

    var chapterTitle = document.createElement('title');
    chapterTitle.text = title;

    var dummyBody = document.createElement('body');
    dummyBody.append(chapterBodyElems);

    var chapterHTML = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" epub:prefix="z3998: http://www.daisy.org/z3998/2012/vocab/structure/#" lang="en" xml:lang="en">
  <head>
    ${chapterTitle.outerHTML}
  </head>
  <body>
    ${dummyBody.innerHTML}
  </body>
</html>
`;

    var id = uuidv4();
    
    // EPUB/ch01.xhtml
    zip.file('EPUB/ch01.xhtml', chapterHTML);

    // EPUB/content.opf
    zip.file('EPUB/content.opf',
`<?xml version='1.0' encoding='utf-8'?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="id" version="3.0" prefix="rendition: http://www.idpf.org/vocab/rendition/#">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
    <meta property="dcterms:modified">2022-02-16T08:12:42Z</meta>
    <meta name="generator" content="Ebook-lib 0.17.1"/>
    <dc:identifier id="id">${id}</dc:identifier>
    <dc:title>Document</dc:title>
    <dc:language>en</dc:language>
    <dc:creator id="creator">Author</dc:creator>
  </metadata>
  <manifest>
    <item href="ch01.xhtml" id="chapter_0" media-type="application/xhtml+xml"/>
    <item href="style/nav.css" id="style_nav" media-type="text/css"/>
    <item href="toc.ncx" id="ncx" media-type="application/x-dtbncx+xml"/>
    <item href="nav.xhtml" id="nav" media-type="application/xhtml+xml" properties="nav"/>
  </manifest>
  <spine toc="ncx">
    <itemref idref="nav"/>
    <itemref idref="chapter_0"/>
  </spine>
</package>
`);

    // EPUB/nav.xhtml
    zip.file('EPUB/nav.xhtml',
`<?xml version='1.0' encoding='utf-8'?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="en" xml:lang="en">
  <head>
    ${chapterTitle.outerHTML}
  </head>
  <body>
    <nav epub:type="toc" id="id" role="doc-toc">
      <h1>${shortTitle}</h1>
      <p>${caption}</p>
      <p>${court}</p>
      <p>${docket}</p>
      <p>${cite}</p>
    </nav>
  </body>
</html>
`);

    // EPUB/style/nav.css
    zip.file('EPUB/style/nav.css', '');

    // EPUB/toc.ncx
    zip.file('EPUB/toc.ncx',
`<?xml version='1.0' encoding='utf-8'?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta content="${id}" name="dtb:uid"/>
    <meta content="0" name="dtb:depth"/>
    <meta content="0" name="dtb:totalPageCount"/>
    <meta content="0" name="dtb:maxPageNumber"/>
  </head>
  <docTitle>
    <text>Document</text>
  </docTitle>
  <navMap/>
</ncx>
`);

    // META-INF/container.xml
    zip.file('META-INF/container.xml',
`<?xml version='1.0' encoding='utf-8'?>
<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0">
  <rootfiles>
    <rootfile media-type="application/oebps-package+xml" full-path="EPUB/content.opf"/>
  </rootfiles>
</container>
`);

    // mimetype
    zip.file('mimetype',
`application/epub+zip
`);

    zip.generateAsync({type: 'blob', mimeType: 'application/epub+zip'}).then(content => {
      saveAs(content, shortTitle.replace(/[\/\\\<\>\:\"\|\?\*]/g, '') + '.epub');
    });
  }
});

