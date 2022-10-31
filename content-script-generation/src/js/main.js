
var JSZip = require("jszip");
import { saveAs } from 'file-saver';
import { v4 as uuidv4 } from 'uuid';
import { gatherParts } from './westlaw-utils.mjs';

chrome.runtime.onMessage.addListener(function (msg, _sender, _sendResponse) {
  if (msg.text === 'do_epub') {
    var zip = new JSZip();
    
    const parts = gatherParts();
    
    var cite = parts.cite;
    var court = parts.court;
    var authoringJudge = parts.authoringJudge;
    var caption = parts.caption;
    var docket = parts.docket;
    var shortTitle = parts.shortTitle;
    
    var bodyElems = parts.bodyElems;

    var title = parts.title;

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
    <link rel="stylesheet" type="text/css" href="style.css"/>
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
    <dc:title>${shortTitle}</dc:title>
    <dc:language>en</dc:language>
    <dc:creator id="creator">${court}, ${authoringJudge}</dc:creator>
  </metadata>
  <manifest>
    <item href="ch01.xhtml" id="chapter_0" media-type="application/xhtml+xml"/>
    <item href="style.css" id="style" media-type="text/css"/>
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

    // EPUB/style/style.css
    zip.file('EPUB/style.css', `
.footnote {
  margin-left: 2em;
}
p {
  text-align: justify;
}
`);

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
    <text>${shortTitle}</text>
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

