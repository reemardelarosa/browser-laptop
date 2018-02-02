/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */
// SCL COMMENTS
// Like with UMS, it was written in an aspirational way, not because I had any idea if
// it was correct.
// initialize should initialize the UMS. At present it is missing initialization for searching/shopping/userActivity
// APP_TAB_UPDATED
// I was hoping this would give some interesting telemetry, but it seems to fire too often (presumably when loading different pieces of the DOM)
// If there is something like this which updates only when a page is loaded, I guess that's what I was looking for.
// maybee TEXT_SCRAPER_DATA_AVAIL can do this.
// APP_REMOVE_HISTORY_SITE
// eventually this needs to remove classifier site data in the UMS -LOW PRIORITY
// APP_ON_CLEAR_BROWSING_DATA
// this needs to clear all UMS data, reset to init
// APP_LOAD_URL_IN_ACTIVE_TAB_REQUESTED
// I had assumed this would fire when a tab gets loaded or a new tab is opened. It doesn't. Might delete it.
// APP_TAB_ACTIVATE_REQUESTED
// This seems to only work on switching between existing tabs. It's useful, but probably the wrong place to test for search or shopping.
// APP_IDLE_STATE_CHANGED
// I was hoping idle would happen after like 2 minutes of browser idleness
// It does occasionally fire, but the period of time is indeterminate and doesn't look reliable
// TODO someone tell me WTF this thing is
// APP_TEXT_SCRAPER_DATA_AVAILABLE
// this actually works! At some point I defined this message, and BBondy eventually made it go.
// this guy fires both when loading a new page in a new tab, when clicking through to a new page, and when switching to another tab.
// I suggest this one gets overloaded and used for testShopping/Search, and others deleted
// APP_SHUTTING_DOWN
// should do stuff when browser is shut down
// APP_ADD_AUTOFILL_XXXX
// the idea of this is to find when the user has purchased something, so we don't serve him an
// ad any more. Or, perhaps this is a super great time to serve an ad. Anyway I want to record this, and possibly fire off an ad when this happens
// APP_CHANGE_SETTING

// TODO INCOMPLETES:
// It is important to have something  like "APP_IDLE_STATE_CHANGED" which records when someone has recently restarted doing stuff
// I think there should also be something which counts user interactions with the browser, as in, actively is scrolling, reading searching
// A good time to serve an ad is when the user is about to go back to browsing.
// Possibly it can all be done through TEXT_SCRAPER_DATA_AVAILABLE and something that does what I wish IDLE_STATE_CHANGE did.
// Other than the "fix history/constants" pieces, this would make the reducer design considerably simpler.
// END SCL COMMENTS

'use strict'
// constants
const appConstants = require('../../../js/constants/appConstants')
// const appConfig = require('../../../js/constants/appConfig')
const settings = require('../../../js/constants/settings')

// data things
const tabState = require('../../common/state/tabState') /* for front tab */
// const pageDataState = require('../../common/state/pageDataState')

// self & utils
const userModel = require('../api/userModel.js')
const userModelState = require('../../common/state/userModelState')
const {makeImmutable} = require('../../common/state/immutableUtil')

// webContents.getFocusedWebContents()
// all of these are todo
const userModelReducer = (state, action, immutableAction) => {
  action = immutableAction || makeImmutable(action)
  // if (!appConfig.BATads.enabled) {
  //   console.log('no ads')
  //   state = userModel.dummyLog(state)
  //   return state
  // }
  switch (action.get('actionType')) {
    case appConstants.APP_SET_STATE: // performed once on app startup
      state = userModel.initialize(state)
      break
    case appConstants.APP_TAB_UPDATED: // kind of worthless; fires too often
      state = userModel.tabUpdate(state, action)
      break
    case appConstants.APP_REMOVE_HISTORY_SITE:
      console.log('actionType remove history site')
      state = userModel.removeHistorySite(state, action)
      break
    case appConstants.APP_ON_CLEAR_BROWSING_DATA:
      state = userModel.removeAllHistory(state)
      break
    case appConstants.APP_LOAD_URL_IN_ACTIVE_TAB_REQUESTED: { // this doesn't seem to ever get called TODO find replacement
      const url = action.getIn(['details', 'newURL'])
      console.log('load_url_active_tab_req')
      state = userModel.testShoppingData(state, url)
      state = userModel.testSearchState(state, url)
      break
    }
    case appConstants.APP_TAB_ACTIVATE_REQUESTED: { // tab switching
      const tabId = action.get('tabId')
      const tab = tabState.getByTabId(state, tabId)
      const url = tab.get('url')
      console.log('app_tab_activate') // tab switching is interesting, but shouldn't call these TODO delete them once they work and you have an appConstant which makes sense
      state = userModel.testShoppingData(state, url)
      state = userModel.testSearchState(state, url)
      break
    }
    case appConstants.APP_IDLE_STATE_CHANGED: // TODO where to set this globally
      if (action.has('idleState') && action.get('idleState') !== 'active') {
        state = userModel.recordUnidle(state)
      }
      break
    case appConstants.APP_TEXT_SCRAPER_DATA_AVAILABLE:
    //    const lastActivTabId = pageDataState.getLastActiveTabId(state)
    //    const tabId = action.get('tabId')
    //    if (!lastActivTabId || tabId === lastActivTabId) {
      state = userModel.classifyPage(state, action)
      break
    case appConstants.APP_SHUTTING_DOWN:
      state = userModel.saveCachedInfo(state)
      break
    case (appConstants.APP_ADD_AUTOFILL_ADDRESS || appConstants.APP_ADD_AUTOFILL_CREDIT_CARD): {
      const url = action.getIn(['details', 'newURL'])
      state = userModelState.flagBuyingSomething(state, url)
      break
    }
    // all other settings go here
    case appConstants.APP_CHANGE_SETTING: {
      switch (action.get('key')) {
        case settings.USERMODEL_ENABELED: {
          state = userModel.initialize(state, action.get('value'))
          break
        }
        case settings.ADJUST_FREQ: {
          state = userModel.changeAdFreq(state, action.get('value'))
        }
      }
    }
  } // end switch
  return state
}

module.exports = userModelReducer
