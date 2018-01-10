/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict'

// load utilities
// const Immutable = require('immutable')
// const path = require('path')
// const os = require('os')
// const levelUp = require('level')
// const historyUtil = require('../../common/lib/historyUtil.js')
const urlUtil = require('../../../js/lib/urlutil.js')

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
  state = userModelState.setAdFrequency(state, 15)
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
}

const removeAllHistory = (state) => {
  // reset wherever you put the history
}

const saveCachedInfo = () => {
  // writes stuff to leveldb
}

const testShoppingData = (state, url) => {
  const hostname = urlUtil.getHostName(url)
  if (hostname === 'amazon.com') {
    const score = 1.0
    state = userModelState.flagShoppingState(state, url, score)
    console.log('hit amazon')
  } else {
    state = userModelState.unflagShoppingState(state)
    console.log('unhit amazon')
  }
  return state
}

const testSearchState = (state, url) => {
  const hostname = urlUtil.getHostName(url)
  if (hostname === 'google.com') {
    const score = 1.0
    state = userModelState.flagSearchState(state, url, score)
    console.log('hit google')
  } else {
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

const classifyPage = (state, action) => {
  console.log('data in', action)// run NB on the code
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
