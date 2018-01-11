/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict'
// constants
const Immutable = require('immutable')
const assert = require('assert') // validateState uses this

// State
// const pageDataState = require('./pageDataState') // stuff like last closedTab

// utilities
const {makeImmutable, isMap} = require('../../common/state/immutableUtil') // needed?
const urlUtil = require('../../../js/lib/urlutil') //  used to check valid URL: test

const validateState = function (state) {
  state = makeImmutable(state)
  assert.ok(isMap(state), 'state must be an Immutable.Map')
  assert.ok(isMap(state.get('usermodel')), 'state must contain an Immutable.Map of usermodel')
  return state
}

const userModelState = {
  setUserModelValue: (state, key, value) => {
    state = validateState(state)
    if (key == null) {
      return state
    }

    return state.setIn(['usermodel', key], value)
  },

  getUserModelValue: (state, key) => {
    state = validateState(state)
    return state.getIn(['usermodel', key]) || Immutable.Map()
  },

  // later maybe include a search term and history
  flagSearchState: (state, url, score) => {
    state = validateState(state)
    if (url == null) { // I think isURL isn't truthy on nulls
      return state
    }

    if (!urlUtil.isURL(url)) { // bum url; log this?
      return state
    }
    const date = new Date().getTime()
    state.setIn(['usermodel', 'searchactivity'], true)
    state.setIn(['usermodel', 'searchurl'], url)  // can we check this here?
    state.setIn(['usermodel', 'score'], score)
    state.setIn(['usermodel', 'lastsearchtime'], date)
    return state
  },

  // user has stopped searching for things
  unflagSearchState: (state, url) => {
    state = validateState(state)
    if (url == null) {
      return state
    }
    if (!urlUtil.isURL(url)) { // bum url; log this?
      return state
    }

    // if you're still at the same url, you're still searching; maybe this should log an error
    if (state.getIn(['usermodel', 'searchurl']) === url) {
      return state
    }

    const date = new Date().getTime()
    state.setIn(['usermodel', 'searchactivity'], false) // toggle off date probably more useful
    state.setIn(['usermodel', 'lastsearchtime'], date)
    return state
  },

  // user is visiting a shopping website
  flagShoppingState: (state, url) => {
    state = validateState(state)
    const date = new Date().getTime()
    state.setIn(['usermodel', 'shopactivity'], true)
    state.setIn(['usermodel', 'shopurl'], url)
    state.setIn(['usermodel', 'lastshoptime'], date)
    return state
  },

  getShoppingState: (state) => {
    state = validateState(state)
    return state.getIn(['usermodel', 'shopactivity'])
  },

  unflagShoppingState: (state) => {
    state = validateState(state)
    state.setIn(['usermodel', 'shopactivity'], false)
    return state
  },

  flagUserBuyingSomething: (state, url) => {
    const date = new Date().getTime()
    state.setIn(['usermodel', 'purchasetime'], date)
    state.setIn(['usermodel', 'purchaseurl'], url)
    state.setIn(['usermodel', 'purchaseactive'], true)
    return state
  },

  setUrlActive: (state, url) => {
    if (url == null) {
      return state
    }
    if (!urlUtil.isURL(url)) { // bum url; log this?
      return state
    }
    state = validateState(state)
    return state.setIn(['usermodel', 'url'], url)
  },

  setUrlClass: (state, url, pageclass) => {
    state = validateState(state)
    if (url == null || pageclass == null) {
      return state
    }
    if (!urlUtil.isURL(url)) { // bum url; log this?
      return state
    }
    const date = new Date().getTime()
    state.setIn(['usermodel', 'updated'], date)
    state.setIn(['usermodel', 'url'], url)
    state.setIn(['usermodel', 'pageclass'], pageclass)
    return state
  },

  // this gets called when an ad is served, so we know the last time
  // we served what
  // potential fun stuff to put here; length of ad-view, some kind of
  // signatures on ad-hash and length of ad view
  setServedAd: (state, adserved, adclass) => {
    state = validateState(state)
    if (adserved == null) {
      return state
    }
    const date = new Date().getTime()
    state.setIn(['usermodel', 'lastadtime'], date)
    state.setIn(['usermodel', 'adserved'], adserved)
    state.setIn(['usermodel', 'adclass'], adclass)
    return state
  },

  getLastServedAd: (state) => {
    state = validateState(state)
    const retval = {
      lastadtime: state.getIn(['usermodel', 'lastadtime']),
      lastadserved: state.getIn(['usermodel', 'adserved']),
      lastadclass: state.getIn(['usermodel', 'adclass'])
    }
    return Immutable.Map(retval) || Immutable.Map()
  },

  setLastUserActivity: (state) => {
    state = validateState(state)
    const date = new Date().getTime()
    state.setIn(['usermodel', 'lastuseractivity'], date)
    return state
  },

  setAdFrequency: (state, freq) => {
    state.setIn(['usermodel', 'adfrequency'], freq)
  },

  setLastUserIdleStopTime: (state) => {
    state = validateState(state)
    const date = new Date().getTime()
    state.setIn(['usermodel', 'lastuseridlestoptime'], date)
    return state
  },

  setUserModelError: (state, error, caller) => {
    state = validateState(state)
    if (error == null && caller == null) {
      return state.setIn(['ledger', 'info', 'error'], null)
    }

    return state.setIn(['ledger', 'info', 'error'], Immutable.fromJS({
      caller: caller,
      error: error
    })) // copy pasta from ledger
  }

}

module.exports = userModelState
