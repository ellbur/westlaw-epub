
'use strict';

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
        if (child.classList.contains('co_headnoteLink') || child.classList.contains('co_excludeAnnotations')) {
        }
        else if (child.classList.contains('co_footnoteReference')) {
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

function processParagraphSet(div, parType) {
  var res = {
    children: [ ],
    footnotes: [ ]
  };
  
  if (div.classList.contains('co_headtext') || div.classList.contains('co_paragraphText')) {
    var c1 = processParagraph(div);
    var p = document.createElement(parType);
    for (var u of c1.children) { p.appendChild(u); }
    res.children.push(p);
    res.footnotes.push(...c1.footnotes);
  }
  else {
    for (var child of div.children) {
      if (child.classList.contains('co_paragraphText') || child.classList.contains('co_headtext')) {
        var c1 = processParagraph(child);
        var p = document.createElement(parType);
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
          var p = document.createElement(parType);
          for (var u of c1.children) { p.appendChild(u); }
          res.children.push(p);
          res.footnotes.push(...c1.footnotes);
        }
      }
      else {
        var c1 = processParagraph(child);
        var p = document.createElement(parType);
        for (var u of c1.children) { p.appendChild(u); }
        res.children.push(p);
        res.footnotes.push(...c1.footnotes);
      }
    }
  }
  
  return res;
}

function processHeadtext(item, footnoteTable) {
  if (item.classList.contains('co_hAlign2')) {
    return processParagraphWithItsFootnotes(item, 'h1', footnoteTable);
  }
  else if (item.classList.contains('co_hAlign1')) {
    return processParagraphWithItsFootnotes(item, 'h2', footnoteTable);
  }
  else {
    const childHeadText = item.querySelector('.co_headtext');
    if (childHeadText) {
      const res = [ ];
      for (const child of item.children) {
        if (child.tagName.toUpperCase() === 'DIV' && child.classList.contains('co_headtext')) {
          res.push(...processHeadtext(child, footnoteTable));
        }
      }
      return res;
    }
    else {
      return processParagraphWithItsFootnotes(item, 'h3', footnoteTable);
    }
  }
}

function processParagraphWithItsFootnotes(item, parType, footnoteTable) {
  var outElems = [ ];
  
  var proc = processParagraphSet(item, parType);
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
        const li = document.createElement('p');
        li.classList.add('footnote');
        li.style.fontSize = 'small';
        const small = document.createElement('small');
        li.append(small);
        small.append(...fnP.childNodes);
        outElems.push(li);
      }
    }
    else {
      console.log('Failed to find footnote', href);
    }
  }
  
  return outElems;
}

function gatherBody(cite, court, caption, docket, footnotes) {
  const footnoteTable = { };
  
  for (const fn of footnotes) {
    footnoteTable[fn.id] = fn;
  }
  
  const outElems = [ ];
  
  const root = document.getElementById('co_document');
  
  function process1(item) {
    if (item.tagName.toUpperCase() === 'DIV' && item.classList.contains('co_document')) {
      for (const child of item.children) {
        process1(child);
      }
    }
    else if (item.tagName.toUpperCase() === 'DIV' && item.classList.contains('co_synopsis')) {
      // Skip
    }
    else if (item.tagName.toUpperCase() === 'DIV' && item.classList.contains('co_proceduralPostureBlock')) {
      // Skip
    }
    else if (item.tagName.toUpperCase() === 'DIV' && item.classList.contains('co_headnotes')) {
      // Skip
    }
    else if (item.tagName.toUpperCase() === 'DIV' && item.classList.contains('co_attorneyBlock')) {
      // Skip
    }
    else if (item.tagName.toUpperCase() === 'DIV' && item.classList.contains('co_contentBlock')) {
      for (const child of item.children) {
        process2(child);
      }
    }
  }
  
  function process2(item) {
    if (item.tagName.toUpperCase() === 'DIV' && item.classList.length === 0) {
      for (const child of item.children) {
        process2(child);
      }
    }
    else if (item.tagName.toUpperCase() === 'DIV' && item.classList.contains('x_concurranceAuthorLine')) {
      outElems.push(makeH1(item.innerText));
    }
    else if (item.tagName.toUpperCase() === 'DIV' && item.classList.contains('x_dissentAuthorLine')) {
      outElems.push(makeH1(item.innerText));
    }
    else if (item.tagName.toUpperCase() === 'DIV' && item.classList.contains('co_paragraph')) {
      outElems.push(...processParagraphWithItsFootnotes(item, 'p', footnoteTable));
    }
    else if (item.tagName.toUpperCase() === 'DIV' && item.classList.contains('co_headtext')) {
      outElems.push(...processHeadtext(item, footnoteTable));
    }
    else if (item.tagName.toUpperCase() === 'DIV' && item.classList.contains('co_contentBlock')) {
      for (const child of item.children) {
        process2(child);
      }
    }
    else if (item.tagName.toUpperCase() === 'DIV' && item.classList.contains('CipDipContainer')) {
      for (const child of item.children) {
        process2(child);
      }
    }
    else if (item.tagName.toUpperCase() === 'DIV' && item.classList.contains('CipDipHeader')) {
      for (const child of item.children) {
        process2(child);
      }
    }
    else if (item.tagName.toUpperCase() === 'DIV' && item.classList.contains('CipDipContent')) {
      for (const child of item.children) {
        process2(child);
      }
    }
    else {
      // Skip
    }
  }
  
  for (const child of root.children) {
    process1(child);
  }
  
  const res = document.createDocumentFragment();
  res.append(makeP(caption));
  res.append(makeP(court));
  res.append(makeP(docket));
  res.append(makeP(cite));
  res.append(...outElems);
  
  return res;
}

function gatherFootnotePars(footnoteBody) {
  const res = [ ];
  
  function process1(item) {
    if (item.tagName.toUpperCase() === 'DIV' && item.classList.contains('co_paragraph')) {
      res.push(...processParagraphSet(item).children);
    }
  }
  
  for (const child of footnoteBody.children) {
    process1(child);
  }
  
  return res;
}

function gatherFootnotes() {
  var res = [ ];
  
  var footnoteSection = document.getElementById('co_footnoteSection') ?? document.querySelector('.co_footnoteSection');
  if (footnoteSection === null) {
    console.log('Did not find co_footnoteSection');
    return [ ];
  }
  
  for (var d of footnoteSection.children) {
    if (d.tagName.toUpperCase() == 'DIV') {
      var footnoteNumber = d.querySelector('.co_footnoteNumber');
      var footnoteBody = d.querySelector('.co_footnoteBody');
      
      if (footnoteNumber !== null && typeof footnoteNumber !== 'undefined' && typeof footnoteBody !== 'undefined') {
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
          var pars = gatherFootnotePars(footnoteBody);
          
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

function makeH1(text) {
  var p = document.createElement('h1');
  p.innerText = text;
  return p;
}

export function gatherParts() {
  var cite = document.querySelector('.co_cites')?.textContent ?? '';
  var court = document.querySelector('.co_courtBlock')?.textContent ?? '';
  var caption = document.querySelector('.co_title')?.textContent ?? '';
  var docket = document.querySelector('.co_docketDate')?.textContent ?? '';
  var shortTitle = document.getElementById('title')?.innerText ?? '';
  var authoringJudge = document.querySelector('.x_leadAuthorLine')?.textContent ?? '';

  var footnotes = gatherFootnotes();
  var bodyElems = gatherBody(cite, court, caption, docket, footnotes);

  var title = caption;

  return {
    cite: cite,
    court: court,
    authoringJudge: authoringJudge,
    caption: caption,
    docket: docket,
    shortTitle: shortTitle,
    title: title,
    footnotes: footnotes,
    bodyElems: bodyElems,
  };
}

