/*
 * Expandable, a jQuery plugin to dynamically group and hide web content
 * Copyright (C) 2009  Marc Diethelm
 * License: (GPL 3, http://www.gnu.org/licenses/gpl-3.0.txt) see license.txt
 */

(function($)
{

	$.fn.expandable = function()
	{

		//console.log(typeof $.ui);

		var action;
		var userOptions = {};

		if ( arguments.length == 1 ) {

			action = ( arguments[0].constructor == String ? arguments[0] : null );
			userOptions = ( arguments[0].constructor == Object ? arguments[0] : null );

			if ( action == "options" ) {
				return $(this).eq(0).data("options-expandable");
			}

		} else if ( arguments.length == 2 ) {

			action = ( arguments[0].constructor == String ? arguments[0] : null );
			userOptions = arguments[1];
		}

		if ( action == "state" ) {
			return $(this).eq(0).data("state");
		}

		// apply options vs. defaults

        var options = $.extend({}, $.fn.expandable.defaults, userOptions);


		return this.each( function() {

			var $this = $(this);
			var _this = this; // save it to restore scope in different contexts

			$this.data("options-expandable", options);


			switch ( action ) { // this certainly is not the way it's done. But I don't know better for now, and it works nicely.

				case "destroy": // restore original element
					$this.removeClass("ui-widget ui-expandable ui-expandable-open");

					$(".ui-widget-content", this).remove().contents().appendTo(this);

					if ( $this.data("elTitle") ) {
						$(".ui-widget-header", this).unbind("click").remove();
						$this.prepend( $this.data("elTitle") );
					}

					return this;

				case "close":
					this.closeExpandable(null, options);
					return this;

				case "open":
					this.openExpandable(null, options); // hack for restore onload, with arg "open" and one-time options (eg: {duration: 0})
					return this;
			}


			$this
			.hide() // hide everything quickly
			.addClass("ui-expandable ui-widget");

			var title = "";

			// user has created a title child. replaced later.
			if ( $(".ui-expandable-title", this).length > 0 ) {
				var $title = $(".ui-expandable-title", this).eq(0).remove();
				title = $title.text();
				$this.data("elTitle", $title);
				delete $title;
			}

			title = options.title || title;

			// wrap the content in an animatable box
			if ( $(".ui-widget-content", this).length == 0 ) {

				//$(this).wrapInner('<div class="ui-widget-content ui-helper-clearfix"></div>'); // fails if there is no content. jQuery bug #3552
				// workaround (same as my proposed patch to jQuery trunk)
				var html = '<div class="ui-widget-content ui-helper-clearfix"></div>';

				if ( $this.contents().length ) {
					$this.contents().wrapAll( html );
				} else {
					$this.html( html );
				}
			}

			var $content = $(".ui-widget-content", this);

			if ( options.startopen ) {
				$this.data("state", "open");
			} else {
				$this.data("state", "closed");
				$content.hide();
			}

			if ( options.uiIconClosed && options.uiIconOpen ) {
				//console.log("ui closed = %s, ui open = %s, %s", options.uiIconClosed, options.uiIconOpen, $(this).attr("id"))
				var iconstartclass = ( options.startopen ? options.uiIconOpen : options.uiIconClosed );
				var iconclosedclass = options.uiIconClosed;
				var iconopenclass = options.uiIconOpen;
			} else {
				//console.log("default icon (non UI), %s", $(this).attr("id"))
				var iconstartclass = ( options.startopen ? "icon-open" : "icon-closed" );
				var iconclosedclass = "icon-closed";
				var iconopenclass = "icon-open";
			}

			var extra_icon = "";

			if ( options.extraicon ) {
				extra_icon = "ui-icon " + options.extraicon;
			}


			var $header = $(
				'<div class="ui-state-default ui-widget-header" title="'+options.tooltip+'">' +
				'	<div class="ui-expandable-icon ui-icon '+iconstartclass+'"></div>' +
				'	<div class="ui-expandable-title">'+title+'</div>' +
				'	<div class="ui-expandable-extraicon"><span class="'+extra_icon+'"></span></div>' +
				'</div>'
			);

			// if header exists replace, else add
			$(".ui-widget-header", this).length ? $(".ui-widget-header", this).replaceWith($header) : $this.prepend($header);

			$this.show(); // show the finished expander

			// adjust vertical position of the icon to look nice
				// innerHeight fails if a parent has display: none. jQuery bug #4500

			$(".ui-icon", $header).each(function()
			{
				var margin_top, px_remain = 0;

				if ( $header.innerHeight() > 0 ) {
					var px_extra = $header.innerHeight() - $(this).height();
						margin_top = Math.floor((px_extra / 2 ));
					var px_remain = px_extra - margin_top;

					// hack: if innerHeight fails, force fixed value
				} else if ( options.iconMarginTop ) {
					margin_top = options.iconMarginTop;
					px_remain =  options.iconMarginBottom || 0;
				}

				if (margin_top > 0) {
					$(this).css({"margin-top": margin_top, "margin-bottom": px_remain});
				}
			});




			$header.bind("click", null, function(event)
			{
				if (!
					($(event.target).hasClass("ui-widget-header") ||
					 $(event.target).hasClass("ui-expandable-icon") ||
					 $(event.target).hasClass("ui-expandable-title") ||
					 $(event.target).parents(".ui-expandable-title").length // if there's more markup in the title...
					)
				) {
					return true;
				}

				var state = $this.data("state");

				if ( options.headerClick ) {
					if ( options.headerClick.call(_this, event, options) === false ) {
						return false;
					}
				}

				if ( state == "closed" || state == "closing" ) {
					_this.openExpandable.call(_this, event, options);
				} else {
					_this.closeExpandable.call(_this, event, options);
				};

				return true;
			});


			this.closeExpandable = function(_event, options)
			{
				$(".ui-expandable-icon", $header).removeClass(iconopenclass).addClass(iconclosedclass);

				// closing now
				$this.data("state", "closing");

				if (options.closing) { // user callback
					options.closing.call(this, _event, options);
				}

				//$content.stop(); // cancel running anims
-				$content.animate(options.animationClose, options.duration, options.easing, function()
				{
					$this.data("state", "closed");

					// user callback
					if (options.closed) { // user callback
						options.closed.call(_this, _event, options);
					}
				});
			};


			this.openExpandable = function(_event, options)
			{
				$(".ui-expandable-icon", $header).removeClass(iconclosedclass).addClass(iconopenclass);

				// opening now
				$this.data("state", "opening");

				if (options.opening) { // user callback
					options.opening.call(this, _event, options);
				}

				//$content.stop(); // cancel running anims
-				$content.animate(options.animationOpen, options.duration, options.easing, function()
				{
					$this.data("state", "open");

					if (options.open) { // user callback
						options.open.call(_this, _event, options);
					}
				});
			};

			if (options.headerHover) { // user callback
				$header.hover(
					function(event) {
						return options.headerHover.call($header, true, event, options);
					},
					function(event) {
						return options.headerHover.call($header, false, event, options);
					}
				);
			}

			if (options.extraiconClick) { // user callback
				$(".ui-expandable-extraicon", this).click(function(event)
				{
					return options.extraiconClick.call(_this, event, options);
				});
			}

			if (options.extraiconHover) { // user callback

				var $extraicon = $(".ui-expandable-extraicon", _this);

				$extraicon.hover(
					function(event) {
						return options.extraiconHover.call($extraicon.get(0), true, event, options);
					},
					function(event) {
						return options.extraiconHover.call($extraicon.get(0), false, event, options);
					}
				);
			}

			return this;

		});

	};



	$.fn.expandable.defaults = {
		startopen: false,
		title: null,
		tooltip: "Click to expand",
		uiIconClosed: "ui-icon-triangle-1-e",
		uiIconOpen: "ui-icon-triangle-1-s",
		/*uiIconClosed: null,
		uiIconOpen: null,*/
		animationClose: { height: "hide" },
		animationOpen: { height: "show" },
		duration: "normal",
		easing: "swing",
		open: null, // callbacks: also not the way it's done it seems... (but works alright)
		closed: null,
		opening: null,
		closing: null,
		headerClick: null,
		headerHover: function(over, event)
		{
			if ( over ) {
				$(this)
				.removeClass("ui-state-default")
				.addClass("ui-state-hover");
			} else {
				$(this)
				.removeClass("ui-state-hover")
				.addClass("ui-state-default");
			}
		},
		extraicon: null,
		extraiconClick: null,
		extraiconHover: null,
		extraiconHover: function(over, event, options) {
			if ( over ) {
				$(this).addClass("ui-state-hover");
			} else {
				$(this).removeClass("ui-state-hover");
			}
		},
		iconMarginTop: null,
		iconMarginBottom: null
	};


})(jQuery);
