var React = require('react');
var RectCache = require('./rect-cache');

var ZingaScroller = require('../vendor/zynga.scroller.js');

var Scroller = React.createClass({

  mixins: [RectCache],

  childContextTypes: {
    scrollingParent: React.PropTypes.object,
  },

  getChildContext: function() {
    return {
      scrollingParent: this,
    };
  },

  propTypes: {
    scrollingX: React.PropTypes.bool.isRequired,
    scrollingY: React.PropTypes.bool.isRequired,
    getContentSize: React.PropTypes.func.isRequired,
  },

  _scrollItems: {},

  registerItem: function(scrollableItem) {
    this._scrollItems[scrollableItem.props.name] = scrollableItem;
  },

  unRegisterItem: function(scrollableItem) {
    delete this._scrollItems[scrollableItem.props.name];
  },

  // _lastStyles: {},

  _scrollHandler: function(x, y) {
    var self = this;
    var items = self._scrollItems;
    for(var itemK in items) {
      var item = items[itemK];
      var styleObject = item.props.scrollHandler(x, y, item, items, self);
      if (styleObject) {

        var tx = styleObject.x || 0;
        var ty = styleObject.y || 0;
        var tz = styleObject.zIndex && styleObject.zIndex/10 || 0;

        delete styleObject.x;
        delete styleObject.y;
        styleObject.WebkitTransform = 'translate3d('+tx+'px, '+(ty)+'px, '+tz+'px)';

        if (styleObject.scale) {
          styleObject.WebkitTransform += ' scale('+styleObject.scale+')';
          delete styleObject.scale;
        }

        // Using this simple for loops yeilds HUGE performance improvements
        // specially on iPhone 4 with iOS 7.

        // Set styles and remove from the last ones in memory
        for(var prop in styleObject) {
          item._node.style[prop] = styleObject[prop];
          // if (self._lastStyles.hasOwnProperty(prop)) {
          //   delete self._lastStyles[prop];
          // }
        }

        // if we have remaining styles on the _lastStyles, it means the new
        // calculation does not return it, then we should remove
        // for(var prop in self._lastStyles) {
        //   delete item._node.style[prop];
        // }

        // self._lastStyles = styleObject;

      }
    }
  },

  _getContentSize: function() {
    return this.props.getContentSize(this._scrollItems, this);
  },

  _disabled: false,
  disable: function() {
    this._disabled = true;
  },

  enable: function() {
    this._disabled = false;
  },

  componentDidMount: function () {
    var self = this;
    var container = self.getDOMNode();

    var scroller = (self.scroller = new ZingaScroller(
      self._scrollHandler,
      {
        scrollingX: self.props.scrollingX,
        scrollingY: self.props.scrollingY,
      }
    ));

    // Because of React batch operations and optimizations, we need to wait
    // for next tick in order to all ScrollableItems initialize and have proper
    // RectCache before updating containerSizer for the first time.
    setTimeout(function() {
      var content = self._getContentSize();
      self.scroller.setDimensions(self.rect.width, self.rect.height, content.width, content.height);
    }, 1);

    // setup events
    container.addEventListener("touchstart", function(e) {
      if (e.touches[0] && e.touches[0].target && e.touches[0].target.tagName.match(/input|textarea|select/i)) {
        return;
      }
      var isMoving = scroller.__isDragging || scroller.__isDecelerating || scroller.__isAnimating;
      if (isMoving) {
        e.preventDefault();
        e.stopPropagation();
      }
      !self._disabled && scroller.doTouchStart(e.touches, e.timeStamp);
    }, false);
    container.addEventListener("touchmove", function(e) {
      e.preventDefault(); // unconditionally to prevent React onScroll handlers
      var isMoving = scroller.__isDragging || scroller.__isDecelerating || scroller.__isAnimating;
      if (isMoving) {
        e.stopPropagation();
      }
      !self._disabled && scroller.doTouchMove(e.touches, e.timeStamp, e.scale);
    }, false);

    container.addEventListener("touchend", function(e) {
      var isMoving = scroller.__isDragging || scroller.__isDecelerating || scroller.__isAnimating;
      if (isMoving) {
        e.preventDefault();
        e.stopPropagation();
      }
      scroller.doTouchEnd(e.timeStamp);
    }, false);
    container.addEventListener("touchcancel", function(e) {
      var isMoving = scroller.__isDragging || scroller.__isDecelerating || scroller.__isAnimating;
      if (isMoving) {
        e.preventDefault();
        e.stopPropagation();
      }
      scroller.doTouchEnd(e.timeStamp);
    }, false);
  },

  render: function () {
    var className = 'scrollable';
    if (this.props.hasOwnProperty('viewport')) {
      className += '-viewport';
    }
    return (
      <div className={className}>
        {this.props.children}
      </div>
    );
  },

});

module.exports = Scroller;
