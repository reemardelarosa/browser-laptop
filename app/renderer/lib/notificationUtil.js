/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

const notifier = require('brave-node-notifier')
const os = require('os')

// Actions
const appActions = require('../../../js/actions/appActions')

// Constants
const notificationTypes = require('../../common/constants/notificationTypes')

// Utils
const immutableUtil = require('../../common/state/immutableUtil')

const notificationUtil = {
  createNotification: (options) => {
    if (!options) {
      return
    }

    options = immutableUtil.makeJS(options)

    if (!options.title) {
      console.log('Title is not provided for the notification')
      return
    }

    const type = os.type()
    let extras = {
      Linux: () => {
        // TBD: add NotifySend() options here
      },

      // Terminal.icns has been updated!
      Darwin: () => {
        if (notifier.utils.isMountainLion()) {
          return {
            actions: 'View',
            closeLabel: 'Dismiss'
          }
        }
      },

      Windows_NT: () => {
        if (!notifier.utils.isLessThanWin8()) {
          return {
            appID: 'com.squirrel.brave.Brave'
          }
        }
      }
    }[type]

    if (extras) extras = extras()
    if (!extras) {
      console.error('notifications not supported')
      return
    }

    notifier.notify(Object.assign(options, extras), function () { })
      .on('click', (notifierObject, options) => {
        console.log('click')
        if (typeof options === 'object' && options.data) {
          notificationUtil.clickHandler(options)
        }
      })
      .on('timeout', () => {
        console.log('timeout')
      })
  },

  clickHandler: (options) => {
    const data = options.data

    switch (data.notificationId) {
      case notificationTypes.ADS:
        {
          appActions.createTabRequested({
            url: data.notificationUrl,
            windowId: data.windowId
          })
          break
        }
    }
  }
}

module.exports = notificationUtil
