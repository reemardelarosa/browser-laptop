const React = require('react')
const {StyleSheet, css} = require('aphrodite/no-important')

// Components
const ReduxComponent = require('../reduxComponent')
const WebviewDisplay = require('../../pooledWebviewDisplay')
// const WebviewDisplay = require('../../webviewDisplay')

// Actions
const windowActions = require('../../../../js/actions/windowActions')
const webviewActions = require('../../../../js/actions/webviewActions')

// state
const frameStateUtil = require('../../../../js/state/frameStateUtil')

// utils
const {getCurrentWindowId, isFocused} = require('../../currentWindow')

class GuestInstanceRenderer extends React.Component {
  constructor (props) {
    super(props)
    this.setWebviewRef = this.setWebviewRef.bind(this)
  }

  mergeProps (state, ownProps) {
    const frameKey = ownProps.frameKey
    const frame = frameStateUtil.getFrameByKey(state.get('currentWindow'), frameKey)
    const location = frame && frame.get('location')
    const frameIsInWindow = frame && frame.get('tabStripWindowId') === getCurrentWindowId()

    const props = {
      guestInstanceId: frameIsInWindow && frame.get('guestInstanceId'),
      tabId: frameIsInWindow && frame.get('tabId'),
      isDefaultNewTabLocation: location === 'about:newtab',
      isBlankLocation: location === 'about:blank',
      isPlaceholder: frame && frame.get('isPlaceholder'),
      windowIsFocused: isFocused(state),
      frameKey,
      frameLocation: frame && frame.get('location'),
      urlBarFocused: frame && frame.getIn(['navbar', 'urlbar', 'focused'])
    }
    return props
  }

  componentDidMount () {
    this.onPropsChanged()
  }

  componentDidUpdate (prevProps, prevState) {
    this.onPropsChanged(prevProps)
  }

  onPropsChanged (prevProps = {}) {
    // attach new guest instance
    if (this.webviewDisplay && this.props.tabId && prevProps.tabId !== this.props.tabId) {
      console.log('guestInstanceRenderer, attach tab', this.props.tabId, 'guest', this.props.guestInstanceId, this.props.isPlaceholder)
      if (!this.props.isPlaceholder) {
        this.webviewDisplay.attachActiveTab(this.props.tabId)
      } else {
        console.log('placeholder, not showing')
      }
    }
    // update state of which frame is currently being viewed
    if (this.props.tabId !== prevProps.tabId && this.props.windowIsFocused) {
      windowActions.setFocusedFrame(this.props.frameLocation, this.props.tabId)
    }
    if (this.props.tabId !== prevProps.tabId && !this.props.urlBarFocused) {
      webviewActions.setWebviewFocused()
    }
  }

  setWebviewRef (containerElement) {
    // first time, create the webview
    if (containerElement && !this.webviewDisplay) {
      this.webviewDisplay = new WebviewDisplay({
        containerElement,
        classNameWebview: css(styles.guestInstanceRenderer__webview),
        classNameWebviewAttached: css(styles.guestInstanceRenderer__webview_attached),
        classNameWebviewAttaching: css(styles.guestInstanceRenderer__webview_attaching),
        onFocus: this.onFocus.bind(this),
        onZoomChange: this.onUpdateZoom.bind(this)
      })
      webviewActions.init(this.webviewDisplay)
      if (this.props && this.props.guestInstanceId != null) {
        this.webviewDisplay.attachActiveTab(this.props.guestInstanceId)
      }
      containerElement.addEventListener('mouseenter', (e) => {
        windowActions.onFrameMouseEnter()
      }, { passive: true })

      containerElement.addEventListener('mouseleave', (e) => {
        windowActions.onFrameMouseLeave()
      }, { passive: true })
    }
  }

  onFocus () {
    if (this.props.tabId !== null) {
      windowActions.setTabPageIndexByFrame(this.props.tabId)
      windowActions.tabOnFocus(this.props.tabId)
    }
  }

  onUpdateZoom (zoomPercent) {
    windowActions.setLastZoomPercentage(this.props.frameKey, zoomPercent)
  }

  render () {
    return (
      <div
        className={css(
          styles.guestInstanceRenderer,
          this.props.isDefaultNewTabLocation && styles.guestInstanceRenderer_isDefaultNewTabLocation,
          this.props.isBlankLocation && styles.guestInstanceRenderer_isBlankLocation
        )}
        ref={this.setWebviewRef}
      />
    )
  }
}

const styles = StyleSheet.create({
  guestInstanceRenderer: {
    display: 'flex',
    flex: 1,
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    // default frame background
    // TODO: use theme.frame.defaultBackground
    '--frame-bg': '#fff'
  },

  guestInstanceRenderer_isDefaultNewTabLocation: {
    // matches tab dashboard background
    // will also show when about:newtab === about:blank or is Private Tab
    // TODO: use theme.frame.newTabBackground
    '--frame-bg': '#222'
  },

  guestInstanceRenderer_isBlankLocation: {
  },

  guestInstanceRenderer__webview: {
    flex: 1,
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: 'var(--frame-bg)',
    border: 0,
    outline: 'none'
  },

  guestInstanceRenderer__webview_attached: {
    zIndex: 20
  },

  guestInstanceRenderer__webview_attaching: {
    // only show the active webview when it is attached, reducing white flash
    zIndex: 15
  }
})

module.exports = ReduxComponent.connect(GuestInstanceRenderer)
