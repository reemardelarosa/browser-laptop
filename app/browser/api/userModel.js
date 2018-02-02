/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict'

// load utilities
// const path = require('path')
// const os = require('os')
// const levelUp = require('level')
// const historyUtil = require('../../common/lib/historyUtil')
const urlUtil = require('../../../js/lib/urlutil')
const um = require('bat-usermodel')
const notifier = require('node-notifier')

let matrixData
let priorData

// Actions
// const appActions = require('../../../js/actions/appActions')

// State
const userModelState = require('../../common/state/userModelState')

// Definitions
const miliseconds = {
  year: 365 * 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
  day: 24 * 60 * 60 * 1000,
  hour: 60 * 60 * 1000,
  minute: 60 * 1000,
  second: 1000
}

/* do things */
const initialize = (state) => {
  // TODO turn back on?
  // state = userModelState.setAdFrequency(state, 15)

  // after the app has initialized, load the big files we need
  // this could be done however slowly in the background
  // on the other side, return early until these are populated
  setImmediate(function () {
    matrixData = um.getMatrixDataSync()
    priorData = um.getPriorDataSync()
  })

  return state
}

const tabUpdate = (state, action) => {
  // nothing but update the ums for now
  state = userModelState.setLastUserActivity(state)
  return state
}

/* these two are pretty similar, userAction presently unused but maybe needed */
const userAction = (state) => {
  state = userModelState.setUserActivity()
  return state
}

const removeHistorySite = (state, action) => {
  // check to see how ledger removes history
  // first need to establish site classification DB in userModelState

  // blow it all away for now
  state = userModelState.removeAllHistory(state)
  return state
}

const removeAllHistory = (state) => {
  state = userModelState.removeAllHistory(state)
  return state
}

const saveCachedInfo = (state) => {
  // writes stuff to leveldb
  return state
}

const testShoppingData = (state, url) => {
  const hostname = urlUtil.getHostname(url)
  const lastShopState = userModelState.getSearchState(state)
  console.log('testShoppingdata:', [url, lastShopState])
  if (hostname === 'amazon.com') {
    const score = 1.0   // eventually this will be more sophisticated than if(), but amazon is always a shopping destination
    state = userModelState.flagShoppingState(state, url, score)
    console.log('hit amazon')
  } else if (hostname !== 'amazon.com' && lastShopState) {
    state = userModelState.unflagShoppingState(state)
    console.log('unhit amazon')
  }
  return state
}

const testSearchState = (state, url) => {
  console.log('testSearchState:', url)
  const hostname = urlUtil.getHostname(url)
  const lastSearchState = userModelState.getSearchState(state)
  if (hostname === 'google.com') {
    const score = 1.0  // eventually this will be more sophisticated than if(), but google is always a search destination
    state = userModelState.flagSearchState(state, url, score)
    console.log('hit google')
  } else if (hostname !== 'google.com' && lastSearchState) {
    state = userModelState.unflagSearchState(state, url)
    console.log('unhit google')
  }
  return state
}

const recordUnidle = (state) => {
  console.log('unidle')
  state = userModelState.setLastUserIdleStopTime(state)
  return state
}

function cleanLines (x) {
  // split each: ['the quick', 'when in'] -> [['the', 'quick'], ['when', 'in']]
  x = x.map(x => x.split(/\s+/))
  // flatten: [[a,b], [c,d]] -> [a, b, c, d]
  x = x.reduce((x, y) => x.concat(y), [])
  // lowecase each
  x = x.map(x => x.toLowerCase())
  x = x.map(x => x.trim())
  return x
}

const classifyPage = (state, action) => {
  // console.log('data in', action)// run NB on the code

  let headers = action.get('scrapedData').get('headers')
  let body = action.get('scrapedData').get('body')

  headers = cleanLines(headers)
  body = cleanLines(body)

  let words = headers.concat(body) // combine

  if (words.length < um.minimumWordsToClassify) {
    return state
  }

  if (words.length > um.maximumWordsToClassify) {
    words = words.slice(0, um.maximumWordsToClassify)
  }

  // don't do anything until our files have loaded in the background
  if (!matrixData || !priorData) {
    return state
  }

  const pageScore = um.NBWordVec(words, matrixData, priorData)

  state = userModelState.appendPageScoreToHistoryAndRotate(state, pageScore)

  let mutable = true
  let history = userModelState.getPageScoreHistory(state, mutable)

  let scores = um.deriveCategoryScores(history)
  let indexOfMax = um.vectorIndexOfMax(scores)

  let catNames = priorData['names']
  let winner = catNames[indexOfMax]

  let indCurrentMax = um.vectorIndexOfMax(pageScore)
  let pageCat = catNames[indCurrentMax]

  console.log('PageClass: ', pageCat, ' Moving Average: ', winner)

  notifier.on('click', function (notifierObject, options) {
    // Triggers if `wait: true` and user clicks notification
    // console.log('notifierObject: ', notifierObject)
    console.log('click options: ', options, '\n')
  })

  notifier.on('timeout', function (notifierObject, options) {
    // Triggers if `wait: true` and notification closes
    // console.log('notifierObject: ', notifierObject)
    console.log('timeout options: ', options, '\n')
  })

  // Object
  notifier.notify({
    title: 'Brave Ad',
    subtitle: '(Click to visit URL)',
    message: 'Category: ' + winner,
    icon: 'Terminal Icon',
    contentImage: void 0,
    open: 'https://brave.com?ad_origin=' + winner,
    sound: true,
    wait: true,
    timeout: 5,
    closeLabel: 'BraveClose',
    actions: ['Action1', 'Action2'],
    dropdownLabel: 'Brave Actions'
    // appIcon:
    // contentImage
  },
    function (err, response, metadata) {
      if (err) {
        console.log('BAT Ad Notification Error: ', err)
      }

      if (response) {
        // it seemed like we get 'closed' for `closed`
        // and 'activate' for `action1`, `action2`, and `clicked body`
        console.log('BAT Ad Notification Response: ', response)
      }

      if (metadata) {
        console.log('BAT Ad Notification Metadata: ', metadata)
      }
    }
  )


  return state
}

const dummyLog = (state) => {
  console.log('boing')
  return state
}
// this needs a place where it can be called from in the reducer. when to check?
const checkReadyAdServe = (state) => {
  const lastAd = userModelState.getLastServedAd(state)
  const prevadserv = lastAd.lastadtime
  const prevadid = lastAd.lastadserved
  const date = new Date().getTime()
  const timeSinceLastAd = date - prevadserv
  // make sure you're not serving one too quickly or the same one as last time
  const shoppingp = userModelState.getShoppingState(state)
  /* is the user shopping (this needs to be recency thing) define ad by the
   running average class */
  const ad = 1
  if (shoppingp && (ad !== prevadid) && (timeSinceLastAd > miliseconds.hour)) {
    serveAdNow(state, ad)
  }
}

const serveAdNow = (state, ad) => {
  /* do stuff which pushes the ad */
}

/* frequency a float meaning ads per day */
const changeAdFrequency = (state, freq) => {
  state = userModelState.setAdFrequency(state, freq)
  return state
}

const privateTest = () => {
  return 1
}

const getMethods = () => {
  const publicMethods = {
    initialize,
    tabUpdate,
    userAction,
    removeHistorySite,
    removeAllHistory,
    testShoppingData,
    saveCachedInfo,
    testSearchState,
    classifyPage,
    checkReadyAdServe,
    recordUnidle,
    serveAdNow,
    changeAdFrequency,
    dummyLog
  }

  let privateMethods = {}

  if (process.env.NODE_ENV === 'test') {
    privateMethods = {
      privateTest
      // private if testing
    }
  }
  return Object.assign({}, publicMethods, privateMethods)
}
module.exports = getMethods()
