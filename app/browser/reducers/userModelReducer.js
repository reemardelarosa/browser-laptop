/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

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
    case appConstants.APP_TAB_UPDATED:
      console.log('actionType tab updated')
      state = userModel.tabUpdate(state, action)
      break
    case appConstants.APP_REMOVE_HISTORY_SITE:
      console.log('actionType remove history site')
      state = userModel.removeHistorySite(state, action)
      break
    case appConstants.APP_ON_CLEAR_BROWSING_DATA:
      console.log('actionType clear browsing data')
      state = userModel.removeAllHistory(state)
      break
    case appConstants.APP_LOAD_URL_IN_ACTIVE_TAB_REQUESTED: {
      const url = action.getIn(['details', 'newURL'])
      console.log('----load url in active tab:', url)
      state = userModel.testShoppingData(state, url)
      state = userModel.testSearchState(state, url)
      break
    }
    case appConstants.APP_TAB_ACTIVATE_REQUESTED: {
      const tabId = action.get('tabId')
      const tab = tabState.getByTabId(state, tabId)
      const url = tab.get('url')
      console.log('----app tab activate requested:', url)
      state = userModel.testShoppingData(state, url)
      state = userModel.testSearchState(state, url)
      break
    }
    case appConstants.APP_IDLE_STATE_CHANGED:
      console.log('actionType idle state changed')
      if (action.has('idleState') && action.get('idleState') !== 'active') {
        state = userModel.recordUnidle(state)
      }
      break
    case appConstants.APP_TEXT_SCRAPER_DATA_AVAILABLE:
      console.log('actionType text scrapper data available')
    //    const lastActivTabId = pageDataState.getLastActiveTabId(state)
    //    const tabId = action.get('tabId')
    //    if (!lastActivTabId || tabId === lastActivTabId) {
      state = userModel.classifyPage(state, action)
      break
    case appConstants.APP_SHUTTING_DOWN:
      console.log('actionType app shutting down')
      state = userModel.saveCachedInfo(state)
      break
    case (appConstants.APP_ADD_AUTOFILL_ADDRESS || appConstants.APP_ADD_AUTOFILL_CREDIT_CARD): {
      console.log('actionType autofill address filled')
      const url = action.getIn(['details', 'newURL'])
      state = userModelState.flagBuyingSomething(state, url)
      break
    }
    // all other settings go here
    case appConstants.APP_CHANGE_SETTING: {
      switch (action.get('key')) {
        case settings.USERMODEL_ENABELED: {
          console.log('actionType user model enabled')
          state = userModel.initialize(state, action.get('value'))
          break
        }
        case settings.ADJUST_FREQ: {
          console.log('actionType adjust freq')
          state = userModel.changeAdFreq(state, action.get('value'))
        }
      }
    }
  } // end switch
  return state
}

module.exports = userModelReducer
