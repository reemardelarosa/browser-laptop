/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

if(chrome.contentSettings.BATads == "allow") {
  const headers = Array.from(document.querySelectorAll('h1, h2, h3, h4'))
  const body =  Array.from(document.querySelectorAll('p'))
  const scrapeResults = {headers: headers, body: body, url: window.location.href}

/*  console.log(body) */

  chrome.ipcRenderer.send('dispatch-action', JSON.stringify([{
    actionType: 'app-text-scraper-data-available',
    location: window.location.href,
    scrapedData: scrapeResults
  }])) 
}


// TODO clean  possibly stem, tokenize here
