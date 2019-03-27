/*******************************************************************************
 *
 *  avast! Online Security plugin
 *  (c) 2013 Avast Corp.
 *
 *  @author: Avast Software
 *
 *  Injected Core - cross browser
 *
 ******************************************************************************/

(function($, EventEmitter) {

  if (typeof AvastWRC == 'undefined') { AvastWRC = {}; }//AVAST Online Security

  AvastWRC.ial = AvastWRC.ial || {
    /**
     * Background script instance - browser specific
     * @type {Object}
     */
    bs: null,
    /**
     * DNT settings used to determine if a page needs to be refreshed or not
     * @type {Object}
     */
    _CHANGED_FIELDS: {},
    /**
     * Initialization
     * @param  {Object} _bs instance of browser specifics
     * @return {Object} AvastWRC.ial instance - browser agnostic
     */
    init: function(_bs){
      this.bs = _bs;
      this.initPage();
      this.attachHandlers();
      //this.bs.messageHandler('initMe');

      return this;
    },
    /**
     * EventEmitter instance to hangle injected layer events.
     * @type {Object}
     */
    _ee: new EventEmitter(),

    _isOldGui : true,
    /**
     * Register events with instance of EventEmitter.
     * @param  {Object} callback to register with instance of eventEmitter
     * @return {void}
     */

    registerEvents: function(registerCallback, thisArg) {
      if (typeof registerCallback === 'function') {
        registerCallback.call(thisArg, this._ee);
      }
    },
    /**
     * Initializes the page where this script is injected
     * @return {void}
     */
    initPage: function() {
        if ($('head').length === 0) {
            $('html').prepend("<head></head>");
        }
        AvastWRC.ial.injectFonts();
    },
    /**
     * Injects custom fonts
     * @return {void}
     */
    injectFonts: function () {
        if ($('#avast_os_ext_custom_font').length === 0) {
            $('head').append(`<link id='avast_os_ext_custom_font' href='${AvastWRC.bs.getLocalResourceURL('/common/ui/fonts/fonts.css')}' rel='stylesheet' type='text/css'>`)
        }
    },
    /**
     * Message hub - handles all the messages from the background script
     * @param  {String} message
     * @param  {Object} data
     * @param  {Function} reply
     * @return {void}
     */
    messageHub: function(message, data, reply) {
      // emit messages in specific namespace
      this._ee.emit('message.' + message, data, reply);      
      return reply({response: "message received"}) || Promise.resolve({response: "message received"});
    },
    /**
     * Attaches DOM handlers
     * @return {void}
     */
    attachHandlers: function() {
      typeof $ !== 'undefined' && $(document).ready(function() {
        window.onunload = AvastWRC.ial.onUnload;     
      });
    },
    /**
     * Notifies the background script
     * @return {void}
     */
    onUnload: function() {
      // we should remove our content from the page
      AvastWRC.ial.bs.messageHandler('unload');
    },
    /**
     * Retrive the top element of the page.
     * See: http://stackoverflow.com/questions/10100540/chrome-extension-inject-sidebar-into-page
     * @return retrieved top element to inject ext. HTML into
     */
    getTopHtmlElement: function () {
      var docElement = document.documentElement;
      if (docElement) {
        return $(docElement); //just drop $ wrapper if no jQuery
      } else {
        docElement = document.getElementsByTagName('html');
        if (docElement && docElement[0]) {
          return $(docElement[0]);
        } else {
          docElement = $('html');
          if (docElement.length > -1) {//drop this branch if no jQuery
            return docElement;
          } else {
            throw new Error('Cannot insert the bar.');
          }
        }
      }
    },

    /**
     * Create the button effect
     */

    addRippleEffect: function (e, buttonClassName, bgColor, useCurrentTarget = false) {
      if(!buttonClassName) return false;
      if(!bgColor){
        if((AvastWRC.ial.sp.data && AvastWRC.ial.sp.data.avastBranding) || (AvastWRC.ial.sp.couponInTabData && AvastWRC.ial.sp.couponInTabData.avastBranding)){
          bgColor = "#087E3A";
        }
        else{
          bgColor = "#44cc88";
        }          
      }
      var target = (!useCurrentTarget) ? e.target : e.currentTarget;
      var rect = target.getBoundingClientRect();
      var ripple = document.createElement('div');
      var max = Math.floor(Math.max(rect.width, rect.height)/2);
      ripple.style.setProperty("height", max + "px", "important");
      ripple.style.setProperty("width", max + "px", "important");
      if(bgColor)ripple.style.setProperty("background-color", bgColor, "important");
      ripple.className = 'avast-sas-ripple';
      target.appendChild(ripple);
      ripple.style.setProperty("zIndex", "-1", "important");
      var top = e.pageY - rect.top - ripple.offsetHeight / 2 - document.body.scrollTop;
      var left = e.pageX - rect.left - ripple.offsetWidth / 2 - document.body.scrollLeft;
      //ripple.style.setProperty("top", top + "px", "important");
      ripple.style.setProperty("left", left + "px", "important");

			return setTimeout(() => {
          $(".avast-sas-ripple").remove();
			}, 350);
    },

    prependTemplate: function (html) {
        let rootTemplate = {
            id: AvastWRC.ial.config.rootTemplateId,
            template: AvastWRC.Templates.safePriceRootTemplate
        };

        if (!$(rootTemplate.id).length) AvastWRC.ial.getTopHtmlElement().prepend(Mustache.render(rootTemplate.template, {}));

        $(rootTemplate.id).prepend(html);
    },

    config: {
        rootTemplateId: "#a-sp-root-template"
    }
  }; // AvastWRC.ial

  /*AvastWRC.ial.registerEvents(function(ee) {
    ee.on('message.reInit',AvastWRC.ial.reInitPage);
  });*/

}).call(this, $, EventEmitter2);

/*******************************************************************************
 *
 *  avast! Online Security plugin
 *  (c) 2014 Avast Corp.
 *
 *  @author:
 *
 *  Injected Layer - SafePrice - cross browser
 *
 ******************************************************************************/

(function ($) {
    if (typeof AvastWRC === 'undefined' || typeof AvastWRC.ial === 'undefined') {
        console.log('AvastWRC.ial instance not initialised to add SafePrice component');
        return;
    } else if (typeof AvastWRC.ial.sp !== 'undefined') {
        return;
    }

    $.fn.scrollGuard = function () {
        return this
            .on('wheel', function (e) {
                var $this = $(this);
                if (e.originalEvent.deltaY < 0) {
                    /* scrolling up */
                    return ($this.scrollTop() > 0);
                } else {
                    /* scrolling down */
                    return ($this.scrollTop() + $this.innerHeight() < $this[0].scrollHeight);
                }
            });
    };

    $.fn.positionRight = function() {
        var defPosition = JSON.parse(JSON.stringify(AvastWRC.ial.sp.PANEL_DEFAULT_POSITION));
        if($(document) && $(document).width() && this && this.offset() && this.offset().left && this.outerWidth()){
            defPosition.right = $(document).width() - (this.offset().left + this.outerWidth());
        }
        if(this && this.position() && this.position().top){
            defPosition.top = this.position().top;
        }
        return defPosition;
    };

    AvastWRC.ial.sp = {

        PANEL_MIN_HEIGHT: 442,
        PANEL_DEFAULT_POSITION: {top: 16, right: 16},

        /**
         * Check the current page using the received selector.
         * @param {Object} page related data
         */
        data: null,
        topBarElement: null,
        animations: {},
        rulesTimers: {},


        /**
         * Create a top bar instance
         * @param {String} bar template HTML to be injected
         * @param {String} selector of the injected bar template
         * @param {String} bar height styling ('40px')
         * @return {Object} a wrapper for the bar
         */
        topBar: function (barHtml, barElementSelector, barHeight, topBarRules) {
            var _oldHtmlTopMargin = null;
            var _oldGoogleTopElem = [];
            var _oldFixed = [];
            let style = document.createElement("style");

            document.head.appendChild(style);
            AvastWRC.ial.prependTemplate(barHtml);

            return {
                /**
                 * Display the bar.
                 */
                show: function () {
                    if (AvastWRC.ial.sp.topBarMoved) return;
                    AvastWRC.ial.sp.topBarMoved = true;

                    $(barElementSelector).css({ top: '0px', left: '0px' });
                    AvastWRC.ial.getTopHtmlElement().css('margin-top',
                        function (index, value) {
                            _oldHtmlTopMargin = value;
                            return barHeight;
                        }
                    );
                    if (!RegExp("^http(s)?\\:\\/\\/\\www\\.chase\\.com\\/?").test(document.URL)) {
                        // fix for elements with position fixed
                        $("*").each(function () {
                            var $node = $(this);
                            if ($node[0].className == -1) {
                                if ($node.css("position") == "fixed") {
                                    var top = parseInt($node.css("top"));
                                    if (typeof (top) == "number" && !isNaN(top)) {
                                        var newValue = top + parseInt(barHeight);
                                        newValue += "px";
                                        $node.css("top", newValue);
                                        _oldFixed.push({ $node: $node, top: top });
                                    }
                                }
                            }
                        });
                    }

                    var appliedRule = 0;
                    if (topBarRules != null && topBarRules != undefined && topBarRules.rulesToApply > 0 && topBarRules.specifics != []) {
                        $(topBarRules.specifics).each(function (i, specific) {
                            if (topBarRules.rulesToApply > appliedRule) {
                                var propVal = 0;
                                var newValue = 0;
                                if (specific.computedStyle) {
                                    var elem = document.getElementsByClassName(specific.styleName);
                                    if (elem[0]) {
                                        propVal = window.getComputedStyle(elem[0], specific.computedStyle).getPropertyValue(specific.styleProperty);
                                    }
                                }
                                else {
                                    propVal = parseInt($(specific.styleName).css(specific.styleProperty));
                                }

                                if (specific.dynamicValue) {
                                    propVal = specific.dynamicOldValue;
                                    newValue = specific.dynamicValue;
                                } else if (propVal == "auto") {
                                    newValue = parseInt(barHeight);
                                    newValue += "px";
                                }
                                else {
                                    propVal = parseInt(propVal);
                                    if (typeof (propVal) == "number" && !isNaN(propVal)) {
                                        newValue = propVal + parseInt(barHeight);
                                        newValue += "px";
                                    }
                                }
                                if (newValue != 0) {
                                    if (specific.computedStyle) {
                                        var rule = "." + specific.styleName + "::" + specific.computedStyle;
                                        var value = specific.styleProperty + ": " + newValue;

                                        try {
                                            style.sheet.insertRule(rule + ' { ' + value + ' }', 0);
                                        } catch (e) {
                                            console.log(e);
                                        }

                                        _oldGoogleTopElem.push({
                                            styleName: specific.styleName,
                                            styleProperty: specific.styleProperty,
                                            computedStyle: specific.computedStyle,
                                            oldValue: propVal
                                        });
                                        appliedRule++;
                                    }
                                    else {
                                        $(specific.styleName).css(specific.styleProperty, newValue);
                                        _oldGoogleTopElem.push({
                                            styleName: specific.styleName,
                                            styleProperty: specific.styleProperty,
                                            oldValue: propVal
                                        });
                                        appliedRule++;
                                    }
                                }
                            }
                        });
                    }
                    return true;
                },
                /**
                 * Remove/close the top bar and reset relevant CSS.
                 */
                remove: function () {
                    $(barElementSelector).remove();
                    // restore page position
                    if (_oldHtmlTopMargin)
                        AvastWRC.ial.getTopHtmlElement().css('margin-top', _oldHtmlTopMargin);

                    // revert altered fixed positions.
                    if (_oldFixed.length > 0) {
                        for (var i = 0, j = _oldFixed.length; i < j; i++) {
                            _oldFixed[i].$node.css("top", _oldFixed[i].top + "px");
                        }
                    }
                    if (_oldGoogleTopElem != null) {
                        for (var i = 0, j = _oldGoogleTopElem.length; i < j; i++) {
                            if (_oldGoogleTopElem[i].computedStyle) {
                                var rule = "." + _oldGoogleTopElem[i].styleName + "::" + _oldGoogleTopElem[i].computedStyle;
                                var value = _oldGoogleTopElem[i].styleProperty + ": " + _oldGoogleTopElem[i].oldValue;

                                try {
                                    style.sheet.insertRule(rule + ' { ' + value + ' }', 0);
                                } catch (e) {
                                    console.log(e);
                                }
                            }
                            else {
                                $(_oldGoogleTopElem[i].styleName).css(_oldGoogleTopElem[i].styleProperty, _oldGoogleTopElem[i].oldValue + (_oldGoogleTopElem[i].oldValue === "" ? "" : "px"));
                            }
                        }
                    }
                }
            };
        },

        checkSafeShopDataConst: {
            timer: null,
            count: 0,
            error: true,
            data: null,
            parsedOnReady: false,
            readyEventTriggered: false,
            locationUrl: ""
        },

        checkSafeShop: function (data) {
            AvastWRC.ial.sp.checkSafeShopDataConst.data = data;
            AvastWRC.ial.sp.checkSafeShopDataConst.locationUrl = document.location.href;
            console.log("checkSafeShop called");
            var domCounter = document.getElementsByTagName('*').length;
            if(AvastWRC.ial.sp.checkSafeShopDataConst.timer != null){
                clearTimeout(AvastWRC.ial.sp.checkSafeShopDataConst.timer);
                AvastWRC.ial.sp.checkSafeShopDataConst.timer = null;
            }
            if(domCounter > 700){
                console.log("parse now domCounter: ",domCounter);
                AvastWRC.ial.sp.parseSite(data);               
            }else{
                AvastWRC.ial.sp.checkSafeShopDataConst.timer = setTimeout((_data, _locationUrl) => {
                    if(_locationUrl === document.location.href){
                        console.log("parse in timer domCounter now is: ", document.getElementsByTagName('*').length);
                        AvastWRC.ial.sp.parseSite(_data);
                        clearTimeout(AvastWRC.ial.sp.checkSafeShopDataConst.timer);
                        AvastWRC.ial.sp.checkSafeShopDataConst.timer = null;
                    }                    
                }, 500, data, AvastWRC.ial.sp.checkSafeShopDataConst.locationUrl);   
            }          

        },
        parseSite: function (data){
            AvastWRC.ial.sp.checkSafeShopDataConst.count = data.count;
            var safeShopData = $.extend({ scan: null }, data);
            if (data.csl && !safeShopData.onlyCoupons) {
                switch (data.providerId) {
                    case "ciuvo":
                        // product scan - to retrieve page data
                        AvastWRC.ial.productScan(data.csl, function (response) {
                            console.log("ciuvo parser result: ", response);
                            AvastWRC.ial.sp.checkSafeShopDataConst.error = (response.city_coordinates !== undefined && response.city_coordinates == "") || (response.name === "RequireError");
                            sendMessageToGetOffers(response, "ciuvo");
                        });
                        break;
                    case "comprigo":
                        // product scan - to retrieve page data
                        AvastWRC.ial.comprigoRun(data.csl, data.url, function (response) {
                            console.log("comprigo parser result: ", response);
                            AvastWRC.ial.sp.checkSafeShopDataConst.error = response.error;
                            sendMessageToGetOffers(response, "comprigo");
                        });
                        break;
                }
            }
            function sendMessageToGetOffers(response){
                safeShopData.scan = response;
                safeShopData.referrer = document.referrer;
                safeShopData.readyEventTriggered = AvastWRC.ial.sp.checkSafeShopDataConst.readyEventTriggered;
                AvastWRC.ial.bs.messageHandler('safeShopOffersFound', safeShopData);
            }
        },

        feedback: function (data) {
            AvastWRC.ial.bs.messageHandler('safeShopFeedback', Object.assign(data, {suppress_x_timeout: (AvastWRC.ial.sp.data) ? AvastWRC.ial.sp.data.suppress_x_timeout : false}));
        },

        makeDraggable: function (el, effectedEl = null, dragEndCallback = null) {
            if(!el)return;
            if (!effectedEl) effectedEl = el;

            let newX = 0, newY = 0, originalX = 0, originalY = 0, movementThreshold = 3;
            el.onmousedown = onDragMouseDown;

            function onDragMouseDown(e) {
                e = e || window.event;
                originalX = e.clientX;
                originalY = e.clientY;
                document.onmouseup = stopDrag;
                document.onmousemove = dragElement;
            }

            function dragElement(e) {
                let distX = Math.abs(originalX - e.clientX);
                let distY = Math.abs(originalY - e.clientY);
                if ((originalX === e.clientX && originalY === e.clientY)) return;
                if (Math.max(distX, distY) > movementThreshold) {
                    $(effectedEl).addClass('dragged');
                }
                e = e || window.event;
                newX = originalX - e.clientX;
                newX = originalX - e.clientX;
                newY = originalY - e.clientY;
                originalX = e.clientX;
                originalY = e.clientY;
                let newTop = effectedEl.offsetTop - newY;
                let newLeft = effectedEl.offsetLeft - newX;
                let newRight = document.body.clientWidth - (newLeft + effectedEl.scrollWidth);
                let maxHeight = window.innerHeight - effectedEl.clientHeight;
                let maxWidth = document.body.clientWidth - effectedEl.clientWidth;
                if (effectedEl.clientHeight < window.innerHeight) {
                    effectedEl.style.top = (newTop < 0 ? 0 : newTop > maxHeight ? maxHeight : newTop) + "px";
                    //effectedEl.style.left = (newLeft < 0 ? 0 : newLeft > maxWidth ? maxWidth : newLeft) + "px";
                    effectedEl.style.left = null;
                    effectedEl.style.right = Math.max(0, Math.min(newRight, maxWidth)) + "px";
                }
                return false;
            }

            function stopDrag(e) {
                document.onmouseup = null;
                document.onmousemove = null;
                setTimeout(function () {
                    $(effectedEl).removeClass('dragged');
                }, 100);
                if (dragEndCallback && typeof dragEndCallback === 'function'){
                    dragEndCallback();
                }
            }
        },

        makeResizeable: function(el, effectedEl = null, minHeight = 0, maxHeight = null){
            if (!effectedEl) effectedEl = el;
            if (!maxHeight) maxHeight = window.innerHeight;

            let startY = 0;
            let startHeight = 0;

            el.onmousedown = onDragMouseDown;

            function onDragMouseDown(e) {
                e = e || window.event;
                startY = e.clientY;
                startHeight = parseInt(document.defaultView.getComputedStyle(effectedEl).height, 10);
                document.onmouseup = stopResize;
                document.onmousemove = resizeElement;
            }

            function resizeElement(e) {
                let newHeight = startHeight + e.clientY - startY;

                let rect = effectedEl.getBoundingClientRect();
                if (rect.top + newHeight > maxHeight) return false;

                var minMaxHeigth = Math.min(Math.max(newHeight, AvastWRC.ial.sp.PANEL_MIN_HEIGHT), maxHeight);
                effectedEl.style.height = minMaxHeigth + 'px';

                return false;
            }

            function stopResize(e) {
                //AvastWRC.ial.sp.resizeTextElements("#shop2");

                //AvastWRC.ial.sp.resizeTextElements("#general");

                document.onmouseup = null;
                document.onmousemove = null;
            }

        },
        FEEDBACK_VALUES: {
            lastPanelHeight: 0, // will be modified on resize
            panelFixedElemHeight: 164, /*headerPanelHeight: 48, resizePanelHeight: 12, feedbackTopHeight: 36 feedbackBottonsHeight: 68,*/            
            "#shop2": {
                topSize: 0,
                container: ".asp-shop2-text-area-other",
                textArea: ".asp-shop2-text-area",
                feedbackTopHeight: 0 // will be calculated as soon as it's shown
            },
            "#general":{
                topSize: 0,
                container: ".asp-general-wrapper-text-area",
                textArea: ".asp-general-text-area",
                feedbackTopHeight: 66
            }
        },

        resizeTextElements: function(feedbackId){
            var container = AvastWRC.ial.sp.FEEDBACK_VALUES[feedbackId].container;
            var text = AvastWRC.ial.sp.FEEDBACK_VALUES[feedbackId].textArea;

            console.log("resizeTextElements", container, text)
            if($(container) && $(container)[0] && $(container)[0].clientHeight > 10
                && $(text) && $(text)[0] && $(text)[0].clientHeight > 10){
                var containerHeigth = $(container)[0].clientHeight;
                var textAreaHeigth = $(text)[0].clientHeight;                
                var panelHeight = ($("#a-panel") && $("#a-panel")[0] && $("#a-panel")[0].clientHeight) ? $("#a-panel")[0].clientHeight : 442;

                if(AvastWRC.ial.sp.FEEDBACK_VALUES.lastPanelHeight > panelHeight){
                    var newValue = panelHeight - AvastWRC.ial.sp.FEEDBACK_VALUES[feedbackId].feedbackTopHeight - AvastWRC.ial.sp.FEEDBACK_VALUES.panelFixedElemHeight;
                    console.log("resizeTextElements: to newValue", newValue, containerHeigth, textAreaHeigth, AvastWRC.ial.sp.FEEDBACK_VALUES.lastPanelHeight, panelHeight)
                    $(text).css("max-height", newValue +"px");
                    $(text).css("height", newValue +"px");                    
                }
                else if(containerHeigth < textAreaHeigth){
                    console.log("resizeTextElements: text elem height and max-height to containersize-10", containerHeigth-10, containerHeigth, textAreaHeigth)
                    $(text).css("max-height", containerHeigth-10 +"px");
                    $(text).css("height", containerHeigth-10 +"px");
                }
                else{
                    console.log("resizeTextElements: text elem max-height to containersize-10", containerHeigth-10, containerHeigth, textAreaHeigth)
                    $(text).css("max-height", containerHeigth-10 +"px");
                }

                AvastWRC.ial.sp.FEEDBACK_VALUES.lastPanelHeight = panelHeight;
            }
        },

        removeElementById: function(elementId) {
            if ($("#"+elementId).length <= 0) return;
            var elem = document.getElementById(elementId);
            if (elem) {
                elem.parentNode.removeChild(elem);
            }
        },

        removeAll: function(){
            console.log("remove all in tab");
                       
            AvastWRC.ial.sp.removeElementById('a-sp-feedback-container');
            
            AvastWRC.ial.sp.removeElementById('asp-panel-min');

            AvastWRC.ial.sp.removeNotifications();
            
        },
        removeNotifications: function(){
            console.log("remove all notifications in tab");
            if ($('#asp-notifications-redirect-bar').length > 0){
                if (AvastWRC.ial.sp.topBarElement && AvastWRC.ial.sp.topBarElement[AvastWRC.ial.sp.notifications.config.notificationsContainer.redirectBar]){
                    AvastWRC.ial.sp.topBarElement[AvastWRC.ial.sp.notifications.config.notificationsContainer.redirectBar].remove();
                }
            }
            if ($('#asp-notifications-bar').length > 0){
                if (AvastWRC.ial.sp.topBarElement && AvastWRC.ial.sp.topBarElement[AvastWRC.ial.sp.notifications.config.notificationsContainer.bar]){
                    AvastWRC.ial.sp.topBarElement[AvastWRC.ial.sp.notifications.config.notificationsContainer.bar].remove();
                }
            }

            AvastWRC.ial.sp.notifications.config.values.eventsRegistered.bar = false;
            AvastWRC.ial.sp.notifications.config.values.eventsRegistered.barRedirect = false;
            AvastWRC.ial.sp.notifications.config.values.eventsRegistered.minimized = false;


            AvastWRC.ial.sp.removeElementById('asp-panel-min-notification');

            AvastWRC.ial.sp.removeElementById('asp-fake-shop-panel');
        },
        setSecurityHoverEffect: function (panel = false) {            
            let data = { 
                panel: {
                    securityHoveredId: "#fakeShopPanel",
                    securityHoverElement: "#asp-not-verified-panel",
                    sslHoveredId: "#noSslPanel",
                    sslHoverElement: "#asp-no-ssl-panel",
                },
                panelMin: {
                    securityHoveredId: "#fakeShop",
                    securityHoverElement: "#asp-not-verified",
                    sslHoveredId: "#noSsl",
                    sslHoverElement: "#asp-no-ssl",
                },
                classToShow: "asp-show-hover"
            }

            $(data.panel.securityHoveredId).unbind('hover');
            $(data.panel.sslHoveredId).unbind('hover');

            $(data.panelMin.securityHoveredId).unbind('hover');
            $(data.panelMin.sslHoveredId).unbind('hover');

            let timer = null;
            if(panel){
                $(data.panel.securityHoveredId).hover((e) => {
                    timer = mouseEnterAction(data.panel.securityHoverElement, -2);
                }, (e) => {
                    mouseOutAction(data.panel.securityHoverElement); 
                },);
                $(data.panel.sslHoveredId).hover((e) => {
                    timer = mouseEnterAction(data.panel.sslHoverElement, -20);
                }, (e) => {
                    mouseOutAction(data.panel.sslHoverElement); 
                },);
            }
            else {
                $(data.panelMin.securityHoveredId).hover((e) => {
                    timer = mouseEnterAction(data.panelMin.securityHoverElement, -2);
                }, (e) => {
                    mouseOutAction(data.panelMin.securityHoverElement); 
                },);
                $(data.panelMin.sslHoveredId).hover((e) => {
                    timer = mouseEnterAction(data.panelMin.sslHoverElement, -20);
                }, (e) => {
                    mouseOutAction(data.panelMin.sslHoverElement); 
                },);
            }
            
            function mouseEnterAction(elemId, offset = 0){
                $(elemId).addClass(data.classToShow);
                let pos = 0;
                if(AvastWRC.ial.sp.data.panelData.browserType.isFirefox || AvastWRC.ial.sp.data.panelData.isEdge){
                    pos = $(elemId)[0].clientHeight + offset;
                }else{                    
                    pos = $(elemId)[0].offsetHeight + offset;
                    
                }    
                $(elemId).css("top", "-" + pos + "px");
                return setTimeout(function(){
                    $(elemId).removeClass(data.classToShow);
                }, 100000);
            }
            function mouseOutAction(elemId){
                $(elemId).removeClass(data.classToShow);
                clearTimeout(timer);
            }
        },
        createFakeShopNotification: function (data) {
            AvastWRC.ial.sp.removeAll();

            if(data.cachedData){
                AvastWRC.ial.sp.updatePanel(data.cachedData);
                AvastWRC.ial.sp.notifications.config.values.currentData = data;
            }
            else{
                AvastWRC.ial.sp.updatePanel(data);
                AvastWRC.ial.sp.notifications.config.values.currentData = {};
            }

            if ($('#asp-fake-shop-panel').length === 0) {
                let position = JSON.parse(JSON.stringify(AvastWRC.ial.sp.PANEL_DEFAULT_POSITION));
                /*if(AvastWRC.ial.sp.data.panelData && AvastWRC.ial.sp.data.panelData.panelPosition && AvastWRC.ial.sp.data.panelData.panelPosition.position) {
                    position = AvastWRC.ial.sp.data.panelData.panelPosition.position;
                }*/
                var ourTemplate = {};
                if(AvastWRC.ial.sp.data.urlData.isfakeShop){
                    var ourTemplate = Mustache.render(AvastWRC.Templates.fakeShopPanel, AvastWRC.ial.sp.data);
                    AvastWRC.ial.prependTemplate(ourTemplate);
                    $('#asp-fake-shop-panel').css(position);
                }
                else if(AvastWRC.ial.sp.data.urlData.isPhishingDomain){
                    var ourTemplate = Mustache.render(AvastWRC.Templates.fakeShopPanel, AvastWRC.ial.sp.data);
                    AvastWRC.ial.prependTemplate(ourTemplate);
                    $('#asp-phishing-domain-panel').css(position);
                }
                
                let currentData = AvastWRC.ial.sp.notifications.config.values.currentData || {};
                AvastWRC.ial.sp.feedback({
                    type: 'FAKE_SHOP',
                    notificationType: currentData.notificationType || "",
                    action: 'shown',
                    category: AvastWRC.ial.sp.data.urlData.showFakeShop ? "BAD_SHOP" : "PHISHING",
                    url: data.url || "",
                    urlDomain: AvastWRC.ial.sp.data.urlDomain,
                    campaignId: AvastWRC.ial.sp.data.campaignId,
                    showABTest: AvastWRC.ial.sp.data.showABTest,
                    referrer: AvastWRC.ial.sp.data.referrer || "",
                    transactionId: AvastWRC.ial.sp.data.transactionId || ""
                });

            }
            $("#asp-fake-shop-close").click(()=>{
                AvastWRC.ial.sp.removeNotifications();
                let data = AvastWRC.ial.sp.data, currentData = AvastWRC.ial.sp.notifications.config.values.currentData || {};

                AvastWRC.ial.sp.feedback({
                    type: 'FAKE_SHOP',
                    action: "close_click",
                    urlDomain: data.urlDomain,
                    url: data.url || "",
                    mesageCategory: currentData.message || "",
                    category: AvastWRC.ial.sp.data.urlData.showFakeShop ? "BAD_SHOP" : "PHISHING",
                    categoryFlag: currentData.notificationCategoryFlag || "",
                    notificationType: currentData.notificationType || "",
                    campaignId: data.campaignId,
                    showABTest: data.showABTest,
                    referrer: data.referrer || "",
                    transactionId: data.transactionId || ""
                });
            });

            $(".asp-warning-button").mousedown((e)=>{
                e.preventDefault();
                AvastWRC.ial.addRippleEffect(e, ".asp-warning-button", null, true);
            });

            $(".asp-warning-button").click(()=>{
                AvastWRC.ial.sp.removeNotifications();
                let data = AvastWRC.ial.sp.data, currentData = AvastWRC.ial.sp.notifications.config.values.currentData || {};
                
                AvastWRC.ial.sp.feedback({
                    type: 'FAKE_SHOP',
                    action: "button_click",
                    mesageCategory: currentData.message || "",
                    category: AvastWRC.ial.sp.data.urlData.showFakeShop ? "BAD_SHOP" : "PHISHING",
                    notificationType: currentData.notificationType || "",
                    urlDomain: data.urlDomain,
                    url: data.url || "",
                    campaignId: data.campaignId,
                    showABTest: data.showABTest,
                    referrer: data.referrer || "",
                    transactionId: data.transactionId || ""
                });
            });

            $(".asp-warning-link-text").click(()=>{
                AvastWRC.ial.sp.removeNotifications();
                let data = AvastWRC.ial.sp.data, currentData = AvastWRC.ial.sp.notifications.config.values.currentData || {}, showPanel = false;
                if(currentData && currentData.category){
                    AvastWRC.ial.sp.showPanel(AvastWRC.ial.sp.notifications.config.values.currentData.category);
                    showPanel = true;
                }
                
                AvastWRC.ial.sp.feedback({
                    type: 'FAKE_SHOP',
                    action: "link_click",
                    mesageCategory: currentData.message || "",
                    category: AvastWRC.ial.sp.data.urlData.showFakeShop ? "BAD_SHOP" : "PHISHING",
                    notificationType: currentData.notificationType  || "",
                    urlDomain: data.urlDomain,
                    url: data.url || "",
                    campaignId: data.campaignId,
                    showABTest: data.showABTest,
                    referrer: data.referrer || "",
                    transactionId: data.transactionId || "",
                    showPanel: showPanel
                });
            });
        },
        /**
         * Creates UI for the Top Bar (SafeZone)
         * @param  {Object} data
         * @return {[type]}
         */
        createPanel: function (data, removeAll = true) {
            if(removeAll)AvastWRC.ial.sp.removeAll();
            if(!AvastWRC.ial.sp.couponInTabData || AvastWRC.ial.sp.couponInTabData.couponClosed){
                console.log("createPanel message");
                // we have all the info we need to create the panel but it will be only shown on the click on notifications
                if ($('#a-panel').length === 0) {
                    var selectedTab = "";
                    if(AvastWRC.ial.sp.data && AvastWRC.ial.sp.data.panelShown){
                        selectedTab = AvastWRC.ial.sp.data.activeTab;
                        data.panelShown = true
                    }
                    AvastWRC.ial.sp.data = data;
                    let position = JSON.parse(JSON.stringify(AvastWRC.ial.sp.PANEL_DEFAULT_POSITION));
                    if(AvastWRC.ial.sp.data.panelData && AvastWRC.ial.sp.data.panelData.panelPosition && AvastWRC.ial.sp.data.panelData.panelPosition.position) {
                        if((AvastWRC.ial.sp.data.panelData.panelPosition.position.right < (document.body.clientWidth - 326)) &&
                            (AvastWRC.ial.sp.data.panelData.panelPosition.position.top < window.outerHeight)){
                            position = AvastWRC.ial.sp.data.panelData.panelPosition.position;
                        }
                    }
                    var ourTemplate = Mustache.render(AvastWRC.Templates.safeShopPanel, AvastWRC.ial.sp.data);
                    AvastWRC.ial.prependTemplate(ourTemplate);
                    $(AvastWRC.ial.sp.notifications.config.notificationsContainer.panel).css(position);
                    this.makeDraggable(document.getElementById('a-panel-header'), document.getElementById('a-panel'),
                        () => {
                            AvastWRC.ial.sp.feedback({
                                type: 'panel_ui_dragged_ended',
                                position: $(AvastWRC.ial.sp.notifications.config.notificationsContainer.panel).positionRight() || JSON.parse(JSON.stringify(AvastWRC.ial.sp.PANEL_DEFAULT_POSITION))
                            })

                        });
                    this.makeResizeable(document.getElementById('panel-resize'), document.getElementById('a-panel'), AvastWRC.ial.sp.PANEL_MIN_HEIGHT);
                    AvastWRC.ial.sp.BindPanelEvents();
                    AvastWRC.ial.sp.BindSearchEvents();
                    $('.a-sp-items-wrapper').scrollGuard();

                    $('#a-panel').mouseenter(function () {
                        AvastWRC.ial.sp.isPanelActive = true;
                    }).mouseleave(function () {
                        AvastWRC.ial.sp.isPanelActive = false;
                    });

                }
                this.userFeedback.prepareTemplate(data.panelData.userFeedback);
            }

            AvastWRC.ial.sp.lastHeight = window.innerHeight;
            AvastWRC.ial.sp.lastWidth = window.innerWidth;

            $(window).resize(function() {
                const elementsToFixPosition = ['.a-sp-panel', '.asp-panel-minimized-wrapper', '#asp-panel-min-notification'];
                elementsToFixPosition.forEach((el) => {
                    let element = $(el);
                    if (element && element[0]){
                        if (element.positionRight().right + $(el).width() > window.innerWidth || 
                            element.positionRight().top > window.outerHeight) {
                            AvastWRC.ial.sp.data.panelData.panelPosition.position = JSON.parse(JSON.stringify(AvastWRC.ial.sp.PANEL_DEFAULT_POSITION));
                            $(el).css(AvastWRC.ial.sp.data.panelData.panelPosition.position);
                            AvastWRC.ial.sp.feedback({
                                type: 'panel_ui_dragged_ended',
                                position: AvastWRC.ial.sp.data.panelData.panelPosition.position
                            });
                        }
                    }
                });
            });

        },

        showPanelInInstallPage: function (data) {
            AvastWRC.ial.sp.createPanel(data);
            AvastWRC.ial.sp.showPanel("OFFERS");
        },
        showCouponPanel: function (data, isCouponTab = null) {
            if(AvastWRC.ial.sp.couponInTab && isCouponTab){
                AvastWRC.ial.sp.couponInTabData = data;
                // we have all the info we need to create the panel but it will be only shown on the click on notifications
                if ($('#a-coupon-panel').length === 0) {
                    var ourTemplate = Mustache.render(AvastWRC.Templates.safeShopCouponPanel, AvastWRC.ial.sp.couponInTabData);
                    AvastWRC.ial.prependTemplate(ourTemplate);
                    $('#a-coupon-panel').addClass('asp-sas-display-grid');
                    AvastWRC.ial.sp.makeDraggable(document.getElementById('couponPanelHeader'), document.getElementById('a-coupon-panel'),
                        () => {
                            AvastWRC.ial.sp.feedback({
                                type: 'standard_ui_dragged_ended',
                                position:  $('#a-coupon-panel').positionRight() || JSON.parse(JSON.stringify(AvastWRC.ial.sp.PANEL_DEFAULT_POSITION))
                            })
                        });
                    $('#closeCouponPanel').click(function(){
                        var data = AvastWRC.ial.sp.couponInTabData;
                        AvastWRC.ial.sp.couponInTabData.couponClosed = true;
                        var elem = document.getElementById("a-coupon-panel");
                        if (elem) {
                            elem.parentNode.removeChild(elem);
                        }
                        AvastWRC.ial.sp.feedback({
                            type: 'main_ui_event',
                            action: "close_click",
                            urlDomain: data.urlDomain,
                            url: data.url,
                            category: "COUPON_APPLIED_NOTIFICATION",
                            campaignId: data.campaignId,
                            showABTest: data.showABTest,
                            referrer: data.referrer || "",
                            transactionId: data.transactionId || "",
                            data: data,
                            ruleId: AvastWRC.ial.sp.lastRuleClicked || null
                            //isCouponTab: AvastWRC.ial.sp.couponInTab /*only if event needed*/
                        });
                    });
                    $(".asp-coupon-item-coupon-code-text").click(function (e) {
                        e.preventDefault();
                        AvastWRC.ial.sp.copyTextToClipboard(e);
                    })
                    $(".asp-coupon-rate-positive").click(function (e) {
                        e.preventDefault();
                        AvastWRC.ial.sp.sendRatedCouponFeedback(true, e, AvastWRC.ial.sp.couponInTabData);
                    });
        
                    $(".asp-coupon-rate-negative").click(function (e) {
                        e.preventDefault();
                        AvastWRC.ial.sp.sendRatedCouponFeedback(false, e, AvastWRC.ial.sp.couponInTabData);
                    });

                }
            }
        },

        moveExternalPanels: function (size) {
            let element = $("#honeyContainer"), positionOffset = 15;

            if (element && element[0] && element[0].shadowRoot && element[0].shadowRoot.childNodes && element[0].shadowRoot.childNodes[2])
                element[0].shadowRoot.childNodes[2].style.setProperty('top', `${isNaN(size) ? getCurrentNotificationSize() : size}px`, 'important');

            function getCurrentNotificationSize() {
                for (let key in AvastWRC.ial.sp.notifications.config.notificationsContainer) {
                    if ($(AvastWRC.ial.sp.notifications.config.notificationsContainer[key]).length
                        && ($(AvastWRC.ial.sp.notifications.config.notificationsContainer[key]).css('display') !== "none")) {
                        return document.getElementById(AvastWRC.ial.sp.notifications.config.notificationsContainer[key].replace("#", "")).clientHeight + positionOffset;
                    }
                }

                return 0;
            }
        },

        UpdateContent: function (parentClass, prepend, contentId, templateId, bindCallBack, data = null) {
            if (!data) data = AvastWRC.ial.sp.data;

            var elem = document.getElementById(contentId);
            if (elem) {
                elem.parentNode.removeChild(elem);
            }
            if (prepend) {
                $(parentClass).prepend(Mustache.render(templateId, data));
            } else {
                $(parentClass).append(Mustache.render(templateId, data));
            }
            if (typeof bindCallBack === "function") {
                bindCallBack();
            }
        },

        updatePanelWithSearch: function (data) {
            console.log("updatePanelWithSearch", data);
            var selectedTab = "";
            if(!data.search){
                return;
            }
            if(AvastWRC.ial.sp.data && AvastWRC.ial.sp.data.panelShown){
                selectedTab = AvastWRC.ial.sp.data.activeTab;
                data.panelShown = true
            }
            AvastWRC.ial.sp.data = data;
            var updateData = {};
            if(AvastWRC.ial.sp.data.search.lastSearch === "OFFERS"){
                AvastWRC.ial.sp.toggleLoadingSearch("offers", true /*stop loading*/);
                updateData = (AvastWRC.ial.sp.data.searchMatchOffersRequest) ? AvastWRC.ial.sp.data : AvastWRC.ial.sp.data.search.offersSearch;
                updateData.panelData = AvastWRC.ial.sp.data.panelData;
                
                AvastWRC.ial.sp.UpdateContent(".a-sp-items-wrapper", true, "offersItemsWrapper", AvastWRC.Templates.offersItemsWrapper, function () {
                    $('#offersTabState').removeClass("a-sp-shown").addClass("a-sp-to-be-shown");
                    AvastWRC.ial.sp.BindOfferEvents();
                    showSearchInSelectedTab();
                },updateData);

            }else if(AvastWRC.ial.sp.data.search.lastSearch === "COUPONS"){
                AvastWRC.ial.sp.toggleLoadingSearch("coupons", true /*stop loading*/);
                updateData = (AvastWRC.ial.sp.data.searchMatchCouponsRequest) ? AvastWRC.ial.sp.data : AvastWRC.ial.sp.data.search.couponsSearch;
                updateData.panelData = AvastWRC.ial.sp.data.panelData;
                
                AvastWRC.ial.sp.UpdateContent(".a-sp-items-wrapper", true, "couponsItemsWrapper", AvastWRC.Templates.couponsItemsWrapper, function () {
                    $('#couponsTabState').removeClass("a-sp-shown").addClass("a-sp-to-be-shown");
                    AvastWRC.ial.sp.BindCouponEvents();
                    showSearchInSelectedTab();
                }, updateData);
            }
            function showSearchInSelectedTab(){
                AvastWRC.ial.sp.BindSearchEvents();
                console.log("Active tab is : ", selectedTab);
                if (selectedTab == "OFFERS_TAB_HIGHLIGHTED") {
                    AvastWRC.ial.sp.OffersTabClick();
                }
                else if (selectedTab == "COUPONS_TAB_HIGHLIGHTED") {
                    AvastWRC.ial.sp.CouponsTabClick();
                }
                else if (selectedTab == "OTHERS_TAB_HIGHLIGHTED") {
                    AvastWRC.ial.sp.OthersTabClick();
                }
                else if(selectedTab === "" && AvastWRC.ial.sp.data.search.lastSearch === "OFFERS"){
                    AvastWRC.ial.sp.OffersTabClick();
                }
                else if(selectedTab === "" && AvastWRC.ial.sp.data.search.lastSearch === "COUPONS"){
                    AvastWRC.ial.sp.CouponsTabClick();
                }
            }
        },

        removeUnsafeFromImages: function () {
            $(`${AvastWRC.ial.config.rootTemplateId} img`).each(function () {
                let src = $(this).attr('src');

                if (typeof src !== typeof undefined && src !== false) {
                    $(this).attr('src', $(this).attr('src').replace("unsafe:", ""));
                }
            });
        },

        updatePanel: function (data) {
            console.log(data);
            console.log("updatePanel");
            var selectedTab = "";
            if(AvastWRC.ial.sp.data && AvastWRC.ial.sp.data.panelShown){
                selectedTab = AvastWRC.ial.sp.data.activeTab;
                data.panelShown = true
            }
            AvastWRC.ial.sp.data = data;
            if (data.transactionFinished && data.iconClicked) {
                AvastWRC.ial.sp.feedback({
                    type: 'reset_icon_click'
                });
                AvastWRC.ial.sp.data.iconClicked = false;
            }
            if ($('#a-panel').length === 0) {
                AvastWRC.ial.sp.createPanel(AvastWRC.ial.sp.data, false);
            }
            if(AvastWRC.ial.sp.data.panelData.showSettingsTooltip){
                AvastWRC.ial.sp.renderSettingsTooltip();
            }
            // on the case we receive more info to show
            if (data && (data.searchProducstLength <= 0 &&  data.panelData.searchConfig.offers.active) || (data.producstLength <= 0 && data.accommodationsLength <= 0 &&  !data.panelData.searchConfig.offers.active) ) {
                var updateData = AvastWRC.ial.sp.data;
                updateData.updateNothingFound = true;
                AvastWRC.ial.sp.UpdateContent(".a-sp-offers-items-wrapper", true, "offersWrapper", AvastWRC.Templates.nothingFoundOffers, function () {
                    showPanelInSelectedTab();
                }, updateData);
            }
            else if (data && data.producstLength > 0) {
                AvastWRC.ial.sp.UpdateContent(".a-sp-items-wrapper", true, "offersItemsWrapper", AvastWRC.Templates.offersItemsWrapper, function () {
                    $('#offersTabState').removeClass("a-sp-shown").addClass("a-sp-to-be-shown");
                    AvastWRC.ial.sp.BindOfferEvents();
                    showPanelInSelectedTab();
                });
            }
            else if (data && data.accommodationsLength > 0) {
                AvastWRC.ial.sp.UpdateContent(".a-sp-items-wrapper", true, "offersItemsWrapper", AvastWRC.Templates.offersItemsWrapper, function () {
                    $('#offersTabState').removeClass("a-sp-shown").addClass("a-sp-to-be-shown");
                    AvastWRC.ial.sp.BindOfferEvents();
                    showPanelInSelectedTab();
                });
            }
            if (data && (data.searchCouponsLength <= 0  &&  data.panelData.searchConfig.coupons.active) || (data.couponsLength <= 0 &&  !data.panelData.searchConfig.coupons.active)){
                var updateData = AvastWRC.ial.sp.data;
                updateData.updateNothingFound = true;
                AvastWRC.ial.sp.UpdateContent(".a-sp-coupons-items-wrapper", true, "couponsWrapper", AvastWRC.Templates.nothingFoundCoupons, function () {
                    showPanelInSelectedTab();
                }, updateData);
            }
            else if (data && data.couponsLength > 0) {
                AvastWRC.ial.sp.UpdateContent(".a-sp-items-wrapper", true, "couponsItemsWrapper", AvastWRC.Templates.couponsItemsWrapper, function () {
                    $('#couponsTabState').removeClass("a-sp-shown").addClass("a-sp-to-be-shown");
                    AvastWRC.ial.sp.BindCouponEvents();
                    showPanelInSelectedTab();
                });
            }

            if (data && data.redirectLength > 0) {                   
                AvastWRC.ial.sp.UpdateContent(".a-sp-items-wrapper", true, "othersItemsWrapper", AvastWRC.Templates.othersItemsWrapper, function () {
                    $('#othersTabState').removeClass("a-sp-shown").addClass("a-sp-to-be-shown");
                    AvastWRC.ial.sp.BindOtherEvents();
                    showPanelInSelectedTab();
                }, { redirect: data.redirect, templateData: data.panelData.redirect, isPanelTemplate: true, isRedirect: true, panelData: data.panelData });
            }

            AvastWRC.ial.sp.UpdateContent(".a-sp-panel", true, "a-sp-panel-security", AvastWRC.Templates.panelSecurity, function () {
                AvastWRC.ial.sp.setSecurityHoverEffect(true);
                AvastWRC.ial.sp.bindFeedbackEvents();
            }); 

            AvastWRC.ial.sp.notifications.initDeepIntegration();

            if(AvastWRC.ial.sp.couponInTabData && !AvastWRC.ial.sp.couponInTabData.couponClosed){
                AvastWRC.ial.sp.applyCouponInTab(AvastWRC.ial.sp.couponInTabData);
            }
            

            function showPanelInSelectedTab(){
                AvastWRC.ial.sp.BindSearchEvents();
                console.log("Active tab is : ", selectedTab);
                if (selectedTab == "OFFERS_TAB_HIGHLIGHTED") {
                    AvastWRC.ial.sp.OffersTabClick();
                }
                else if (selectedTab == "COUPONS_TAB_HIGHLIGHTED") {
                    AvastWRC.ial.sp.CouponsTabClick();
                }
                else if (selectedTab == "OTHERS_TAB_HIGHLIGHTED") {
                    AvastWRC.ial.sp.OthersTabClick();
                }
            }
        },

        /**
         * Adds a tooltip to a given selector with a given timeout.
         * Please use the a-sp-tooltip / a-sp-tooltip-hidden classes with this function.
         * @param selector string - DOM element to apply tooltip on
         * @param delay int - Tooltip display timeout
         * @param align boolean - Align tooltip to element
         */
        attachTooltip: function(selector, delay = 1000, align = true){
            let timer;
            $(selector).mouseenter(function() {
                let that = this;
                timer = setTimeout(function(){
                    $(that).find(".a-sp-tooltip").removeClass('a-sp-tooltip-hidden');
                    if (align) {
                        let parentLeftPos = $(selector).position().left;
                        let parentWidth = $(selector).width();
                        let childWidth = $(that).find(".a-sp-tooltip").width();
                        let pos = parentLeftPos - (childWidth - parentWidth) + (childWidth - parentWidth) / 2 - parentWidth / 2;
                        $(that).find(".a-sp-tooltip").css("left", pos + "px", "important");
                    }
                }, delay);
            }).mouseleave(function() {
                $(selector).find(".a-sp-tooltip").addClass('a-sp-tooltip-hidden');
                clearTimeout(timer);
            });
        },
        renderSettingsTooltip: function () {
            let data = AvastWRC.ial.sp.data;
            let tooltip = $(".asp-settings-tooltip");
            if(!tooltip || tooltip.length == 0){
                $(".a-sp-panel").append(Mustache.render(AvastWRC.Templates.settingsTooltip, data));
                AvastWRC.ial.sp.bindSettingsTooltipEvents();
            }
        },
        sendSettingsTooltipEvent: function (action = null) {
            if(action == null) return;
            let data = AvastWRC.ial.sp.data;
            AvastWRC.ial.sp.feedback({
                type: 'SETTINGS_TOOLTIP',
                action: action,
                category: data.activeTab,
                urlDomain: data.urlDomain,
                url: data.url,
                campaignId: data.campaignId,
                showABTest: data.showABTest,
                referrer: data.referrer || "",
                transactionId: data.transactionId || "",
                ruleId: AvastWRC.ial.sp.lastRuleClicked || null
            });
        },
        bindSettingsTooltipEvents: function () {
            let tooltip = $(".asp-settings-tooltip");
            let tooltipButton =  $("#settingsTooltipButton");
            if(tooltip && (tooltip.length > 0 &&  tooltip[0].className.indexOf("asp-hide-tooltip") === -1) && tooltipButton && tooltipButton.length > 0){
                tooltipButton.click(function (e) {
                    tooltipButton.off();
                    tooltip.addClass("asp-hide-tooltip");
                    AvastWRC.ial.sp.sendSettingsTooltipEvent('CLICKED_CTA');
                });
            }            
        },
        hideSettingsTooltip: function () {
            let tooltip = $(".asp-settings-tooltip");
            let tooltipButton =  $("#settingsTooltipButton");
            if(tooltip && (tooltip.length > 0 &&  tooltip[0].className.indexOf("asp-hide-tooltip") === -1) && tooltipButton && tooltipButton.length > 0){
                tooltipButton.off();
                tooltip.addClass("asp-hide-tooltip");
            }
        },
        BindPanelEvents: function () {
            $("#closePanel").click(function (e) {
                AvastWRC.ial.sp.ClosePanel(e);
                if(AvastWRC.ial.sp.data.feedbackInfo && AvastWRC.ial.sp.data.feedbackInfo.askForFeedback) AvastWRC.ial.sp.userFeedback.showFeedbackQuestion();
            });
            $("#minPanel").click(function (e) {
                AvastWRC.ial.sp.MinPanel(e);
                AvastWRC.ial.sp.stopAnimation("PULSE");
                var data = AvastWRC.ial.sp.data;
                if((!AvastWRC.ial.sp.couponInTabData || AvastWRC.ial.sp.couponInTabData.couponClosed) ){
                    AvastWRC.ial.sp.feedback({
                        type: 'main_ui_event',
                        action: 'minimize_click',
                        category: data.activeTab,
                        urlDomain: data.urlDomain,
                        url: data.url,
                        campaignId: data.campaignId,
                        showABTest: data.showABTest,
                        referrer: data.referrer || "",
                        transactionId: data.transactionId || "",
                        ruleId: AvastWRC.ial.sp.lastRuleClicked || null
                        //isCouponTab: AvastWRC.ial.sp.couponInTab /*only if event needed*/
                    });
                }
            });
            $("#helpPanel").click(function (e) {
                AvastWRC.ial.sp.helpPanel(e);
            });
            $("#settingsPanel").click(function (e) {
                let tooltip = $(".asp-settings-tooltip");
                if(tooltip && (tooltip.length > 0 &&  tooltip[0].className.indexOf("asp-hide-tooltip") === -1)){
                    tooltip.addClass("asp-hide-tooltip");
                    AvastWRC.ial.sp.sendSettingsTooltipEvent('CLICKED_SETTINGS');
                }
                AvastWRC.ial.sp.SettingsPanel(e);
            });
            $("#offersTab").click(function (e) {
                AvastWRC.ial.sp.OffersTabClick(e);
                var data = AvastWRC.ial.sp.data;
                AvastWRC.ial.sp.feedback({
                    type: 'main_ui_event',
                    action: 'offers_tab_click',
                    category: AvastWRC.ial.sp.data.defaultTab,
                    urlDomain: data.urlDomain,
                    url: data.url,
                    campaignId: data.campaignId,
                    showABTest: data.showABTest,
                    referrer: data.referrer || "",
                    transactionId: data.transactionId || "",
                    ruleId: AvastWRC.ial.sp.lastRuleClicked || null
                });
            });
            $("#couponsTab").click(function (e) {
                AvastWRC.ial.sp.CouponsTabClick(e);
                var data = AvastWRC.ial.sp.data;
                AvastWRC.ial.sp.feedback({
                    type: 'main_ui_event',
                    action: 'coupons_tab_click',
                    category: AvastWRC.ial.sp.data.defaultTab,
                    urlDomain: data.urlDomain,
                    url: data.url,
                    campaignId: data.campaignId,
                    showABTest: data.showABTest,
                    referrer: data.referrer || "",
                    transactionId: data.transactionId || "",
                    ruleId: AvastWRC.ial.sp.lastRuleClicked || null
                });
            });
            $("#othersTab").click(function (e) {
                AvastWRC.ial.sp.OthersTabClick(e);
                var data = AvastWRC.ial.sp.data;
                AvastWRC.ial.sp.feedback({
                    type: 'main_ui_event',
                    action: 'others_tab_click',
                    category: AvastWRC.ial.sp.data.defaultTab,
                    urlDomain: data.urlDomain,
                    url: data.url,
                    campaignId: data.campaignId,
                    showABTest: data.showABTest,
                    referrer: data.referrer || "",
                    transactionId: data.transactionId || "",
                    ruleId: AvastWRC.ial.sp.lastRuleClicked || null
                });
            });

            AvastWRC.ial.sp.bindFeedbackEvents();

            this.attachTooltip("#closePanel");
            this.attachTooltip("#minPanel");
            this.attachTooltip("#helpPanel");
            this.attachTooltip("#settingsPanel");
        },

        bindFeedbackEvents: function(){
            var classToSetOpacityToFeedbackPanel = "asp-opacity-1",
                classToShowFeedbackPanel = "a-sp-rate-panel-show",
                classForHidden = "a-sp-rate-panel-hidden",
                classTodisabledButton = "a-sp-rate-button-green-disabled",
                classToHideShop2TextArea = "asp-shop2-text-area-hidden";
                feedbackPanel = ".a-sp-rate-panel",
                feedbackContainerGeneral = ".a-sp-rate-panel-feedback-general",
                feedbackContainerShare = ".a-sp-rate-panel-feedback-share",
                feedbackContainerShop1 = ".a-sp-rate-panel-feedback-report-shop-1",
                feedbackContainerShop2 = ".a-sp-rate-panel-feedback-report-shop-2",
                feedbackContainerThanks = ".a-sp-rate-panel-feedback-thanks",                
                //with events
                clickedClassToShowFeedbackPanel = ".asp-feedback-text",
                hideRatePanel = ".a-sp-rate-top-icon",
                feedbackWhiteContainerGeneral = ".asp-general-feedback-container",
                feedbackWhiteContainerShop = ".asp-online-shop-container",  
                buttonGeneralBack = "#generalBack",
                buttonGeneralSend = "#generalSend",
                buttonShop1Back = "#shop1Back",
                buttonShop1Next = "#shop1Next",
                buttonShop2Back = "#shop2Back",
                buttonShop2Send = "#shop2Send",
                generalTextArea = ".asp-general-text-area",
                shop2TextArea = ".asp-shop2-text-area",
                shopInput = ".asp-shop1-input-online-store",
                productInput = ".asp-shop1-input-product",
                radioButtonShop2SomethingDiff = "#shop2SomethingDiff",
                radioButtonShop2PaidNotGet = "#shop2PaidNotGet",
                radioButtonShop2Other = "#shop2Other",
                generalTextAreaFirstClick = true,
                shop2TextAreaFirstClick = true,
                shopInputFirstClick = true,
                productInputFirstClick = true,
                // timers
                afterThanksTimeout = null,
                rerender = false,
                rippleEffectTimers = [];

            unbindAllEvents();
            $(`${clickedClassToShowFeedbackPanel}`).off();


            function unbindAllEvents(){
                $(`${hideRatePanel}, ${feedbackWhiteContainerGeneral}, ${feedbackWhiteContainerShop}`).off();
                $(`${buttonGeneralBack}, ${buttonGeneralSend}`).off();
                $(`${buttonShop1Back}, ${buttonShop1Next}`).off();
                $(`${buttonShop2Back}, ${buttonShop2Send}`).off();
                $(`${generalTextArea}, ${shop2TextArea}, ${shopInput}, ${productInput}`).off();
                $(`${radioButtonShop2SomethingDiff}, ${radioButtonShop2PaidNotGet}, ${radioButtonShop2Other}`).off();
            }           

            $(clickedClassToShowFeedbackPanel).click(()=>{
                unbindAllEvents();
                $(feedbackPanel).addClass(classToSetOpacityToFeedbackPanel).addClass(classToShowFeedbackPanel);
                feedbackShareEvents();
                var data = AvastWRC.ial.sp.data;
                AvastWRC.ial.sp.feedback({
                    type: 'USER_REPORTS',
                    action: "SHOWN",
                    urlDomain: data.urlDomain,
                    url: data.url,
                    campaignId: data.campaignId,
                    showABTest: data.showABTest,
                    referrer: data.referrer || "",
                    transactionId: data.transactionId || ""
                });
            });

            function feedbackShareEvents(){
                $(hideRatePanel).click((e)=>{
                    if(rerender || afterThanksTimeout != null ){
                        hideFeedbackPanel(0, true);
                    }else{
                        hideFeedbackPanel();
                    }
                    show(feedbackContainerShare, [feedbackContainerGeneral, feedbackContainerShop1, feedbackContainerShop2, feedbackContainerThanks]);
                });
                $(feedbackWhiteContainerGeneral).click(()=>{
                    show(feedbackContainerGeneral, feedbackContainerShare);
                    AvastWRC.ial.sp.FEEDBACK_VALUES["#general"].feedbackTopHeight = ($(".asp-general-container-title") && $(".asp-general-container-title")[0] && $(".asp-general-container-title")[0].clientHeight) ? $(".asp-general-container-title")[0].clientHeight + 44 : 0;
                    
                    AvastWRC.ial.sp.resizeTextElements("#general");
                });
                $(buttonGeneralBack).mousedown((e)=>{
                    addRippleEffectToRateButtons(e, true);
                });
                $(buttonGeneralBack).click(()=>{
                    show(feedbackContainerShare, feedbackContainerGeneral);
                });
                $(buttonGeneralSend).mousedown((e)=>{
                    if(setDefaultStringAndDeactivateButton(generalTextArea, buttonGeneralSend)){
                        return;
                    }
                    addRippleEffectToRateButtons(e, false);
                });
                $(buttonGeneralSend).click((e)=>{
                    if(setDefaultStringAndDeactivateButton(generalTextArea, buttonGeneralSend)){
                        return;
                    }
                    show(feedbackContainerThanks, feedbackContainerGeneral);
                    if($(".a-sp-rated-thanks-icon").length > 0){
                        // trick to make the gif run each time
                        $(".a-sp-rated-thanks-icon")[0].src = AvastWRC.ial.sp.data.panelData.images.checkGif.replace(/\?.*$/,"")+"?x="+Math.random();
                    }
                    hideFeedbackPanel(3000, true);
                    sendFeedbackEvent("GENERAL");
                });
                $(feedbackWhiteContainerShop).click(()=>{
                    show(feedbackContainerShop1, feedbackContainerShare);
                });
                $(buttonShop1Back).mousedown((e)=>{
                    addRippleEffectToRateButtons(e, true);
                });       
                $(buttonShop1Back).click(()=>{
                    show(feedbackContainerShare, feedbackContainerShop1);
                });
                $(buttonShop1Next).mousedown((e)=>{
                    if(setDefaultStringAndDeactivateButton(shopInput, buttonShop1Next)){
                        return;
                    }
                    addRippleEffectToRateButtons(e, false);
                });     
                $(buttonShop1Next).click(()=>{
                    if(setDefaultStringAndDeactivateButton(shopInput, buttonShop1Next)){
                        return;
                    }
                    show(feedbackContainerShop2, feedbackContainerShop1);
                    AvastWRC.ial.sp.FEEDBACK_VALUES["#shop2"].feedbackTopHeight = ($(".asp-shop2-top") && $(".asp-shop2-top")[0] && $(".asp-shop2-top")[0].clientHeight) ? $(".asp-shop2-top")[0].clientHeight : 0;
                    
                    AvastWRC.ial.sp.resizeTextElements("#shop2");
                });
                $(buttonShop2Back).mousedown((e)=>{
                    addRippleEffectToRateButtons(e, true);
                });    
                $(buttonShop2Back).click(()=>{
                    show(feedbackContainerShop1, feedbackContainerShop2);
                });
                $(buttonShop2Send).mousedown((e)=>{
                    if(!$(radioButtonShop2SomethingDiff)[0].checked && !$(radioButtonShop2PaidNotGet)[0].checked && !$(radioButtonShop2Other)[0].checked
                        || $(radioButtonShop2Other)[0].checked && setDefaultStringAndDeactivateButton(shop2TextArea, buttonShop2Send)){
                        return;
                    }
                    addRippleEffectToRateButtons(e, false);
                }); 
                $(buttonShop2Send).click((e)=>{
                    if(!$(radioButtonShop2SomethingDiff)[0].checked && !$(radioButtonShop2PaidNotGet)[0].checked && !$(radioButtonShop2Other)[0].checked
                        || $(radioButtonShop2Other)[0].checked && setDefaultStringAndDeactivateButton(shop2TextArea, buttonShop2Send)){
                        return;
                    }
                    show(feedbackContainerThanks, feedbackContainerShop2);
                    if($(".a-sp-rated-thanks-icon").length > 0){
                        // trick to make the gif run each time
                        $(".a-sp-rated-thanks-icon")[0].src = AvastWRC.ial.sp.data.panelData.images.checkGif.replace(/\?.*$/,"")+"?x="+Math.random();
                    }

                    hideFeedbackPanel(3000, true);
                    sendFeedbackEvent("SHOP");
                });
                $(generalTextArea).click((e)=>{
                    setEmptyStringAndActivateButton(generalTextArea, null);
                    if(generalTextAreaFirstClick){
                        $(generalTextArea).select();
                        generalTextAreaFirstClick = false;
                    }
                });
                $(generalTextArea).contextmenu((e)=>{
                    setEmptyStringAndActivateButton(generalTextArea, null);
                });
                $(generalTextArea).keypress((e)=>{
                    $(buttonGeneralSend).removeClass(classTodisabledButton);
                });
                $(generalTextArea).bind('paste', (e)=>{
                    $(buttonGeneralSend).removeClass(classTodisabledButton);
                });
                $(generalTextArea).blur((e)=>{
                    setDefaultStringAndDeactivateButton(generalTextArea, buttonGeneralSend);
                    generalTextAreaFirstClick = true;
                });
                $(shopInput).click((e)=>{
                    setEmptyStringAndActivateButton(shopInput, null);
                    if(shopInputFirstClick){
                        $(shopInput).select();
                        shopInputFirstClick = false;
                    }
                });
                $(shopInput).contextmenu((e)=>{
                    setEmptyStringAndActivateButton(shopInput, null);
                });
                $(shopInput).keypress((e)=>{
                    $(buttonShop1Next).removeClass(classTodisabledButton);
                });
                $(shopInput).bind('paste', (e)=>{
                    $(buttonShop1Next).removeClass(classTodisabledButton);
                });
                $(shopInput).blur((e)=>{
                    setDefaultStringAndDeactivateButton(shopInput, buttonShop1Next);
                    shopInputFirstClick = true;
                });
                $(productInput).click((e)=>{
                    setEmptyStringAndActivateButton(productInput, null);
                    if(productInputFirstClick){
                        $(productInput).select();
                        productInputFirstClick = false;
                    }
                });
                $(productInput).contextmenu((e)=>{
                    setEmptyStringAndActivateButton(productInput, null);
                });
                $(productInput).blur((e)=>{
                    setDefaultStringAndDeactivateButton(productInput, null);
                    productInputFirstClick = true;
                });
                $(radioButtonShop2SomethingDiff).click(()=>{
                    $(buttonShop2Send).removeClass(classTodisabledButton);
                    if($(shop2TextArea)[0].classList.length == 1){
                        $(shop2TextArea).addClass(classToHideShop2TextArea);
                    }
                })
                $(radioButtonShop2PaidNotGet).click(()=>{
                    $(buttonShop2Send).removeClass(classTodisabledButton);
                    if($(shop2TextArea)[0].classList.length == 1){
                        $(shop2TextArea).addClass(classToHideShop2TextArea);
                    }
                })
                $(radioButtonShop2Other).click(()=>{
                    $(buttonShop2Send).addClass(classTodisabledButton);

                    if($(shop2TextArea)[0].classList.length > 1){
                        $(shop2TextArea).removeClass(classToHideShop2TextArea);
                    }
                })
                $(shop2TextArea).click((e)=>{
                    setEmptyStringAndActivateButton(shop2TextArea, null);
                    if(shop2TextAreaFirstClick){
                        $(shop2TextArea).select();
                        shop2TextAreaFirstClick = false;
                    }
                });
                $(shop2TextArea).contextmenu((e)=>{
                    setEmptyStringAndActivateButton(shop2TextArea, null);
                });
                $(shop2TextArea).keypress((e)=>{
                    $(buttonShop2Send).removeClass(classTodisabledButton);
                });
                $(shop2TextArea).bind('paste', (e)=>{
                    $(buttonShop2Send).removeClass(classTodisabledButton);
                });
                $(shop2TextArea).blur((e)=>{
                    setDefaultStringAndDeactivateButton(shop2TextArea, buttonShop2Send);
                    shop2TextAreaFirstClick = true;
                });

                function show(toShow, toHide){                    
                    if(toHide && typeof toHide === 'string'){
                        $(toHide).removeClass(classForHidden).addClass(classForHidden);
                    }
                    else if(toHide && typeof toHide === 'object'){
                        toHide.forEach(element => {
                            $(element).removeClass(classForHidden).addClass(classForHidden);
                        });                       
                    }
                    if(toShow){
                        $(toShow).removeClass(classForHidden);
                    }
                    if(rippleEffectTimers){
                        rippleEffectTimers.forEach(ripple => {
                            clearTimeout(ripple);
                            $(".avast-sas-ripple").remove();
                        });
                    }
                    rippleEffectTimers = []           
                }
                function hideFeedbackPanel(time = 0, renderAgain = false){
                    rerender = renderAgain; // save in the global var to know if it will be rerender again after the timeout
                    afterThanksTimeout = setTimeout((_rerender) => {
                        if($(feedbackPanel + "." + classToShowFeedbackPanel).length > 0){
                            $(feedbackPanel).removeClass(classToShowFeedbackPanel);
                            setTimeout(() => {
                                $(feedbackPanel).removeClass(classToSetOpacityToFeedbackPanel);
                            }, 250);
                            clearTimeout(afterThanksTimeout);
                            afterThanksTimeout = null;
                            if(_rerender){
                                // we need to wait until the animation finish to rerender everithing
                                $(clickedClassToShowFeedbackPanel).off();
                                var renderTimeOut = setTimeout(() => {
                                    AvastWRC.ial.sp.UpdateContent(".a-sp-panel", true, "ratePanel", AvastWRC.Templates.ratePanel, ()=>{
                                        AvastWRC.ial.sp.bindFeedbackEvents();
                                        clearTimeout(renderTimeOut);
                                        renderTimeOut = null;
                                    });
                                }, 2000);                                
                            }
                        }                        
                    }, time, rerender);
                }
                function addRippleEffectToRateButtons(e, isBackButton) {
                    e.preventDefault();
                    var colors = {
                        backButton: {avast: "#ffffff", avg:"#ffffff"},
                        sendButton: {avast: "#087e3a", avg:"#44cc88"}
                    }
                    var bgColor = colors[(isBackButton)?"backButton":"sendButton"][AvastWRC.ial.sp.data.panelData.avastBranding?"avast":"avg"];
                    rippleEffectTimers.push(AvastWRC.ial.addRippleEffect(e, e.target.className, bgColor));
               
                }
                function setEmptyStringAndActivateButton(elemClassName, buttonToActivate) {
                     $(elemClassName).css("font-style", "normal");
                    if(!buttonToActivate) return;
                    $(buttonToActivate).removeClass(classTodisabledButton);
                }
                function setDefaultStringAndDeactivateButton(elemClassName, buttonToActivate) {
                    $(elemClassName).css("font-style", "italic");
                    if(AvastWRC.ial.sp.clearInput($(elemClassName)[0].value) === "" && buttonToActivate){
                        $(buttonToActivate).addClass(classTodisabledButton);
                        return true;
                    }
                    return false;
                }
                function sendFeedbackEvent(feedbackType){
                    var data = AvastWRC.ial.sp.data;
                    var text = "", shopName = "", productOrdered = "", reportReason = "";
                    if(feedbackType == "GENERAL"){
                        text = $(generalTextArea)[0].value;
                    }else if(feedbackType == "SHOP"){
                        shopName = $(shopInput)[0].value;
                        productOrdered = $(productInput)[0].value;
                        reportReason = $(radioButtonShop2SomethingDiff)[0].checked ? "ORDERED_SOMETHING_DIFFERENT" : $(radioButtonShop2PaidNotGet)[0].checked ? "PAID_DID_NOT_GET" : $(radioButtonShop2Other)[0].checked ? "OTHER" : "ORDERED_SOMETHING_DIFFERENT";
                        if(reportReason == "OTHER"){
                            text = $(shop2TextArea)[0].value;
                        }
                    }
                    text = AvastWRC.ial.sp.clearInput(text);
                    shopName = AvastWRC.ial.sp.clearInput(shopName);
                    productOrdered = AvastWRC.ial.sp.clearInput(productOrdered);
                    reportReason = AvastWRC.ial.sp.clearInput(reportReason);

                    AvastWRC.ial.sp.feedback({
                        type: 'USER_REPORTS',
                        action: "REPORT",
                        feedbackType: feedbackType,
                        urlDomain: data.urlDomain,
                        url: data.url,
                        campaignId: data.campaignId,
                        showABTest: data.showABTest,
                        referrer: data.referrer || "",
                        transactionId: data.transactionId || "",
                        text: text,
                        shopName: shopName,
                        productOrdered: productOrdered,
                        reportReason: reportReason
                    });
                    AvastWRC.ial.sp.feedback({
                        type: 'USER_REPORTS',
                        action: "CLICKED_CTA",
                        feedbackType: feedbackType,
                        urlDomain: data.urlDomain,
                        url: data.url,
                        campaignId: data.campaignId,
                        showABTest: data.showABTest,
                        referrer: data.referrer || "",
                        transactionId: data.transactionId || ""
                    });
                }
            }
        },

        BindMinPanelEvents: function (el) {
            $("#asp-panel-min").click(function (e) {
                if (!$(this).hasClass("dragged")) {
                    AvastWRC.ial.sp.MaxPanel(e);
                    AvastWRC.ial.sp.stopAnimation("PULSE");
                    AvastWRC.ial.sp.data.hasNewNotifications = false;
                }
            })
        },

        stopAnimation(name){
            if (AvastWRC.ial.sp.animations[name]) {
                clearInterval(AvastWRC.ial.sp.animations[name]);
                delete AvastWRC.ial.sp.animations[name];
            }
        },

        toggleLoadingSearch: function(type, stop) {
            if(type === "offers" && stop){
                $(AvastWRC.ial.sp.searchTemplateClasses.offers.expanded.icon).removeClass(AvastWRC.ial.sp.searchTemplateClasses.toggleClass);
                $(AvastWRC.ial.sp.searchTemplateClasses.offers.loadingicon).addClass(AvastWRC.ial.sp.searchTemplateClasses.toggleClass);
            }
            if(type === "offers" && !stop){
                $(AvastWRC.ial.sp.searchTemplateClasses.offers.expanded.icon).addClass(AvastWRC.ial.sp.searchTemplateClasses.toggleClass);
                $(AvastWRC.ial.sp.searchTemplateClasses.offers.loadingicon).removeClass(AvastWRC.ial.sp.searchTemplateClasses.toggleClass);
                $(AvastWRC.ial.sp.searchTemplateClasses.offers.loadingicon).css("background", "-webkit-radial-gradient(50% 45%,circle, #fff0 58%, #45485178 66%, #2c2f344f 66%, #9199ab 10%) no-repeat");
                $(AvastWRC.ial.sp.searchTemplateClasses.offers.loadingicon).css("background", "-moz-radial-gradient(50% 45%,circle, #fff0 58%, #45485178 66%, #2c2f344f 66%, #9199ab 10%) no-repeat");
                $(AvastWRC.ial.sp.searchTemplateClasses.offers.loadingicon).css("background", "-o-radial-gradient(50% 45%,circle, #fff0 58%, #45485178 66%, #2c2f344f 66%, #9199ab 10%) no-repeat");
            }
            if(type === "coupons" && stop){
                $(AvastWRC.ial.sp.searchTemplateClasses.coupons.expanded.icon).removeClass(AvastWRC.ial.sp.searchTemplateClasses.toggleClass);
                $(AvastWRC.ial.sp.searchTemplateClasses.coupons.loadingicon).addClass(AvastWRC.ial.sp.searchTemplateClasses.toggleClass);
            }
            if(type === "coupons" && !stop){
                $(AvastWRC.ial.sp.searchTemplateClasses.coupons.expanded.icon).addClass(AvastWRC.ial.sp.searchTemplateClasses.toggleClass);
                $(AvastWRC.ial.sp.searchTemplateClasses.coupons.loadingicon).removeClass(AvastWRC.ial.sp.searchTemplateClasses.toggleClass);
                $(AvastWRC.ial.sp.searchTemplateClasses.coupons.loadingicon).css("background", "-webkit-radial-gradient(50% 45%,circle, #fff0 58%, #45485178 66%, #2c2f344f 66%, #9199ab 10%) no-repeat");
                $(AvastWRC.ial.sp.searchTemplateClasses.coupons.loadingicon).css("background", "-moz-radial-gradient(50% 45%,circle, #fff0 58%, #45485178 66%, #2c2f344f 66%, #9199ab 10%) no-repeat");
                $(AvastWRC.ial.sp.searchTemplateClasses.coupons.loadingicon).css("background", "-o-radial-gradient(50% 45%,circle, #fff0 58%, #45485178 66%, #2c2f344f 66%, #9199ab 10%) no-repeat");
            }
        },

        searchTemplateClasses: {
            offers: {
                expanded: {
                    input: "#query-search-offers",
                    icon: "#a-sp-search-image-offers-expanded",
                    container: "#searchOffersWrapper .a-sp-search-box",
                    backIcon: "#a-sp-search-image-search-back-offers",
                    containerWithBack: "#searchOffersWrapper .a-sp-search-box-with-back",
                },
                collapsed: {
                    icon: "#a-sp-search-image-offers-collapsed",
                    iconHover: "#spOffersSearchIconHover",
                    container: "#searchOffersWrapper .a-sp-search-box-collapsed"
                },
                feedbackAction: "offers",
                loadingicon: "#a-sp-search-loading-offers",
                onInstallTooltip: "#asp-install-tooptip-offers",
                redirectButton: "#asp-nothing-found-go-in-button-offers"
            },
            coupons: {
                expanded: {
                    input: "#query-search-coupons",
                    icon: "#a-sp-search-image-coupons-expanded",
                    container: "#searchCouponsWrapper .a-sp-search-box",
                    backIcon: "#a-sp-search-image-search-back-coupons",
                    containerWithBack: "#searchCouponsWrapper .a-sp-search-box-with-back",
                },
                collapsed: {
                    icon: "#a-sp-search-image-coupons-collapsed",
                    iconHover: "#spCouponsSearchIconHover",
                    container: "#searchCouponsWrapper .a-sp-search-box-collapsed"

                },
                loadingicon: "#a-sp-search-loading-coupons",
                feedbackAction: "coupons",
                onInstallTooltip: "#asp-install-tooptip-coupons",
                redirectButton: "#asp-nothing-found-go-in-button-coupons"
            },
            toggleClass: "asp-sas-display-none",
            classToShow: "asp-sas-display-block",
            hideTooltipClass: "asp-hide-tooltip"
        },

        BindSearchEvents: function () {
            $(AvastWRC.ial.sp.searchTemplateClasses.offers.expanded.input).unbind();
            $(AvastWRC.ial.sp.searchTemplateClasses.offers.expanded.icon).unbind();
            $(AvastWRC.ial.sp.searchTemplateClasses.offers.collapsed.icon).unbind();
            $(AvastWRC.ial.sp.searchTemplateClasses.offers.expanded.container).unbind();
            $(AvastWRC.ial.sp.searchTemplateClasses.offers.redirectButton).unbind();
            $(AvastWRC.ial.sp.searchTemplateClasses.coupons.expanded.input).unbind();
            $(AvastWRC.ial.sp.searchTemplateClasses.coupons.expanded.icon).unbind();
            $(AvastWRC.ial.sp.searchTemplateClasses.coupons.collapsed.icon).unbind();
            $(AvastWRC.ial.sp.searchTemplateClasses.coupons.expanded.container).unbind();
            $(AvastWRC.ial.sp.searchTemplateClasses.coupons.redirectButton).unbind();

            let timer4Sec = null;
            let timer = null;
            let searchOffersFirstCLick = true;
            let searchCouponsFirstCLick = true;
            let searchOffersFirstChar = true;
            let searchCouponsFirstChar = true;

            //offers
            $(AvastWRC.ial.sp.searchTemplateClasses.offers.expanded.input).keypress(function (e) {
                if(searchOffersFirstChar){
                    searchOffersFirstChar = false;
                    AvastWRC.ial.sp.data.panelData.showOffersTooltip = false;
                    $(AvastWRC.ial.sp.searchTemplateClasses.offers.onInstallTooltip).addClass(AvastWRC.ial.sp.searchTemplateClasses.hideTooltipClass);
                }
				var key = e.which;
                if(key == 13) { //13 enter key
                    var query = AvastWRC.ial.sp.clearInput($(AvastWRC.ial.sp.searchTemplateClasses.offers.expanded.input)[0].value);
                    if(query !== ""){
                        search(query, AvastWRC.ial.sp.searchTemplateClasses.offers.feedbackAction, true);
                    }
				}
            });
            $(AvastWRC.ial.sp.searchTemplateClasses.offers.expanded.input).click(function (e) {
                var defaultSearchBoxStrings = [
                    AvastWRC.ial.sp.data.panelData.strings.spProductsSearchInput,
                    AvastWRC.ial.sp.data.panelData.strings.spCouponsSearchInput];

                var query = AvastWRC.ial.sp.clearInput($(AvastWRC.ial.sp.searchTemplateClasses.offers.expanded.input)[0].value);
                if(defaultSearchBoxStrings.indexOf(query) != -1){
                    $(AvastWRC.ial.sp.searchTemplateClasses.offers.expanded.input)[0].value = "";
                }
                if(searchOffersFirstCLick){
                    $(AvastWRC.ial.sp.searchTemplateClasses.offers.expanded.input).select();
                    searchOffersFirstCLick = false;
                }
            });

            $(AvastWRC.ial.sp.searchTemplateClasses.offers.expanded.input).blur(function (e) {
                searchOffersFirstCLick = true;
            });

            $(AvastWRC.ial.sp.searchTemplateClasses.offers.expanded.icon).click(function (e) {
                var query = AvastWRC.ial.sp.clearInput($(AvastWRC.ial.sp.searchTemplateClasses.offers.expanded.input)[0].value);
                if(query !== ""){
                    search(query, AvastWRC.ial.sp.searchTemplateClasses.offers.feedbackAction, true);
                }
            });

            $(AvastWRC.ial.sp.searchTemplateClasses.offers.expanded.backIcon).click(function (e) {
                if(AvastWRC.ial.sp.data.panelData.searchBack.lastOffersSearchPos <= 0)return;
                var query = AvastWRC.ial.sp.data.panelData.searchBack.offersSearchQueries[AvastWRC.ial.sp.data.panelData.searchBack.lastOffersSearchPos -1];
                if(query !== ""){
                    $(AvastWRC.ial.sp.searchTemplateClasses.offers.expanded.input)[0].value = query;                
                    search(query, AvastWRC.ial.sp.searchTemplateClasses.offers.feedbackAction, false);
                }
            });

            $(AvastWRC.ial.sp.searchTemplateClasses.offers.collapsed.icon).click(function (e) {
                expandSearch(AvastWRC.ial.sp.searchTemplateClasses.offers.feedbackAction);
            });
            
            $(AvastWRC.ial.sp.searchTemplateClasses.offers.collapsed.icon).hover((e) => {
                timer = mouseEnterAction(AvastWRC.ial.sp.searchTemplateClasses.offers.collapsed.iconHover);
            }, (e) => {
                mouseOutAction(AvastWRC.ial.sp.searchTemplateClasses.offers.collapsed.iconHover); 
            },);

            $(AvastWRC.ial.sp.searchTemplateClasses.offers.redirectButton).click(function (e) {
                sendRedirectInEmptySearchClick(AvastWRC.ial.sp.searchTemplateClasses.offers.feedbackAction);
            });
            $(AvastWRC.ial.sp.searchTemplateClasses.offers.redirectButton).mousedown((e)=>{
                e.preventDefault();
                var colors = {avast: "#087e3a", avg:"#44cc88"};
                var bgColor = colors[AvastWRC.ial.sp.data.panelData.avastBranding?"avast":"avg"];
                AvastWRC.ial.addRippleEffect(e, e.target.className, bgColor, true);
            });
            //coupons
            $(AvastWRC.ial.sp.searchTemplateClasses.coupons.expanded.input).keypress(function (e) {
                if(searchCouponsFirstChar){
                    searchOffersFirstChar = false;
                    AvastWRC.ial.sp.data.panelData.showCouponsTooltip = false;
                    $(AvastWRC.ial.sp.searchTemplateClasses.coupons.onInstallTooltip).addClass(AvastWRC.ial.sp.searchTemplateClasses.hideTooltipClass);
                }
				var key = e.which;
                if(key == 13) { //13 enter key
                    var query = AvastWRC.ial.sp.clearInput($(AvastWRC.ial.sp.searchTemplateClasses.coupons.expanded.input)[0].value);
                    if(query !== ""){
                        search(query, AvastWRC.ial.sp.searchTemplateClasses.coupons.feedbackAction, true);
                    }
				}
            });
            
            $(AvastWRC.ial.sp.searchTemplateClasses.coupons.expanded.input).click(function (e) {
                var defaultSearchBoxStrings = [
                    AvastWRC.ial.sp.data.panelData.strings.spProductsSearchInput,
                    AvastWRC.ial.sp.data.panelData.strings.spCouponsSearchInput];

                var query = AvastWRC.ial.sp.clearInput($(AvastWRC.ial.sp.searchTemplateClasses.coupons.expanded.input)[0].value);
                if(defaultSearchBoxStrings.indexOf(query) != -1){
                    $(AvastWRC.ial.sp.searchTemplateClasses.coupons.expanded.input)[0].value = "";
                }
                if(searchCouponsFirstCLick){
                    $(AvastWRC.ial.sp.searchTemplateClasses.coupons.expanded.input).select();
                    searchCouponsFirstCLick = false;
                }
            });

            $(AvastWRC.ial.sp.searchTemplateClasses.coupons.expanded.input).blur(function (e) {
                searchCouponsFirstCLick = true;
            });

            $(AvastWRC.ial.sp.searchTemplateClasses.coupons.expanded.icon).click(function (e) {
                var query = AvastWRC.ial.sp.clearInput($(AvastWRC.ial.sp.searchTemplateClasses.coupons.expanded.input)[0].value);
                if(query !== ""){
                    search(query, AvastWRC.ial.sp.searchTemplateClasses.coupons.feedbackAction, true);
                }
            });

            $(AvastWRC.ial.sp.searchTemplateClasses.coupons.expanded.backIcon).click(function (e) {
                if(AvastWRC.ial.sp.data.panelData.searchBack.lastCouponsSearchPos <= 0)return;
                var query = AvastWRC.ial.sp.data.panelData.searchBack.couponsSearchQueries[AvastWRC.ial.sp.data.panelData.searchBack.lastCouponsSearchPos -1];
                if(query !== ""){
                    $(AvastWRC.ial.sp.searchTemplateClasses.coupons.expanded.input)[0].value = query;                
                    search(query, AvastWRC.ial.sp.searchTemplateClasses.coupons.feedbackAction, false);
                }
            });

            $(AvastWRC.ial.sp.searchTemplateClasses.coupons.collapsed.icon).click(function (e) {
                expandSearch(AvastWRC.ial.sp.searchTemplateClasses.coupons.feedbackAction);
            });
            
            $(AvastWRC.ial.sp.searchTemplateClasses.coupons.collapsed.icon).hover((e) => {
                timer = mouseEnterAction(AvastWRC.ial.sp.searchTemplateClasses.coupons.collapsed.iconHover);
            }, (e) => {
                mouseOutAction(AvastWRC.ial.sp.searchTemplateClasses.coupons.collapsed.iconHover); 
            },);

            $(AvastWRC.ial.sp.searchTemplateClasses.coupons.redirectButton).click(function (e) {
                sendRedirectInEmptySearchClick(AvastWRC.ial.sp.searchTemplateClasses.coupons.feedbackAction);
            });

            $(AvastWRC.ial.sp.searchTemplateClasses.coupons.redirectButton).mousedown((e)=>{
                e.preventDefault();
                var colors = {avast: "#087e3a", avg:"#44cc88"};
                var bgColor = colors[AvastWRC.ial.sp.data.panelData.avastBranding?"avast":"avg"];
                AvastWRC.ial.addRippleEffect(e, e.target.className, bgColor, true);
            });

            function isOffersOrCouponsRequestQuery (query, action = null){
                if(!action)return; 
                if(action === AvastWRC.ial.sp.searchTemplateClasses.offers.feedbackAction && AvastWRC.ial.sp.data.panelData.strings.searchTitleOffersRequest === query){
                    AvastWRC.ial.sp.data.panelData.strings.searchTitleOffers = AvastWRC.ial.sp.data.panelData.strings.searchTitleOffersRequest;
                    AvastWRC.ial.sp.data.searchMatchOffersRequest = true;
                    AvastWRC.ial.sp.data.search.lastSearch = "OFFERS";
                    AvastWRC.ial.sp.data.offersTabHaveSearch = false;
                    setDetailsToClosed();
                    AvastWRC.ial.sp.data.panelData.searchBack.lastOffersSearchPos = 0;
                    AvastWRC.ial.sp.data.panelData.searchBack.offersSearchQueries.splice(1);
                    AvastWRC.ial.sp.toggleLoadingSearch(action, false  /*stop loading*/);
                    AvastWRC.ial.sp.updatePanelWithSearch(AvastWRC.ial.sp.data);
                    return true;
                }else if(action === AvastWRC.ial.sp.searchTemplateClasses.coupons.feedbackAction && AvastWRC.ial.sp.data.panelData.strings.searchTitleCouponsRequest === query){
                    AvastWRC.ial.sp.data.panelData.strings.searchTitleCoupons = AvastWRC.ial.sp.data.panelData.strings.searchTitleCouponsRequest
                    AvastWRC.ial.sp.data.searchMatchCouponsRequest = true;
                    AvastWRC.ial.sp.data.search.lastSearch = "COUPONS";
                    AvastWRC.ial.sp.data.couponsTabHaveSearch = false;
                    setDetailsToClosed();
                    AvastWRC.ial.sp.data.panelData.searchBack.lastCouponsSearchPos = 0;
                    AvastWRC.ial.sp.data.panelData.searchBack.couponsSearchQueries.splice(1);
                    AvastWRC.ial.sp.toggleLoadingSearch(action, false  /*stop loading*/);
                    AvastWRC.ial.sp.updatePanelWithSearch(AvastWRC.ial.sp.data);
                    return true;
                }
                return false;

                function setDetailsToClosed(){
                    var data = AvastWRC.ial.sp.data;
                    var offersLength = data.offersRequestTotalLength || 0;
                    if(data.offersTabHaveSearch){
                        offersLength = data.search.offersSearch.offersRequestTotalLength;
                    }
                    var couponsLength = data.couponsLength || 0;
                    if(data.couponsTabHaveSearch){
                        couponsLength = data.search.couponsSearch.couponsLength;
                    }
                    var detailsToClosed = {
                        offerNumber: offersLength + couponsLength + data.redirectLength,
                        closed: 0
                    };
                    if(detailsToClosed.offerNumber.toString() > 0){
                        AvastWRC.ial.sp.data.detailsToClosed = detailsToClosed;
                        AvastWRC.ial.sp.feedback({
                            type: 'search',
                            action: 'update_detailsToClosed',
                            detailsToClosed: detailsToClosed
                        });
                    }
                    
                }
            }

            function search(query, action = null, increasePos = true) {
                if(!action || !query)return;            

                var data = AvastWRC.ial.sp.data;
                query.trim();
                if(isOffersOrCouponsRequestQuery(query, action)) return;
    
                var defaultSearchBoxStrings = [];
                if(action === AvastWRC.ial.sp.searchTemplateClasses.offers.feedbackAction){
                    searchOffersFirstCLick = true;
                    defaultSearchBoxStrings = [
                            data.panelData.strings.spProductsSearchInput, 
                            data.panelData.strings.searchTitleOffers,
                            ];
                    AvastWRC.ial.sp.data.offersTabHaveSearch = true;                    

                    if(defaultSearchBoxStrings.indexOf(query) != -1){
                        //AvastWRC.ial.sp.data.panelData.searchBack.lastOffersSearchPos = 0;
                        //AvastWRC.ial.sp.data.panelData.searchBack.offersSearchQueries.splice(1);
                        return;
                    }
                    if(increasePos){
                        AvastWRC.ial.sp.data.panelData.searchBack.offersSearchQueries.push(query);
                        AvastWRC.ial.sp.data.panelData.searchBack.lastOffersSearchPos = AvastWRC.ial.sp.data.panelData.searchBack.offersSearchQueries.length-1;
                    }
                    else{
                        AvastWRC.ial.sp.data.panelData.searchBack.lastOffersSearchPos --;
                        if(AvastWRC.ial.sp.data.panelData.searchBack.lastOffersSearchPos == 0){
                            AvastWRC.ial.sp.data.panelData.searchBack.offersSearchQueries.splice(1);
                        }else{
                            AvastWRC.ial.sp.data.panelData.searchBack.offersSearchQueries.splice(AvastWRC.ial.sp.data.panelData.searchBack.lastOffersSearchPos);
                        }                        
                    }
                   
                }else if(action === AvastWRC.ial.sp.searchTemplateClasses.coupons.feedbackAction){
                    searchCouponsFirstCLick = true;
                    defaultSearchBoxStrings = [
                            data.panelData.strings.spCouponsSearchInput,
                            data.panelData.strings.searchTitleCoupons
                            ];
                    AvastWRC.ial.sp.data.couponsTabHaveSearch = true;

                    if(defaultSearchBoxStrings.indexOf(query) != -1){
                        //AvastWRC.ial.sp.data.panelData.searchBack.lastCouponsSearchPos = 0;
                        //AvastWRC.ial.sp.data.panelData.searchBack.couponsSearchQueries.splice(1);
                        return;
                    }
                    if(increasePos){
                        AvastWRC.ial.sp.data.panelData.searchBack.couponsSearchQueries.push(query);
                        AvastWRC.ial.sp.data.panelData.searchBack.lastCouponsSearchPos = AvastWRC.ial.sp.data.panelData.searchBack.couponsSearchQueries.length-1;
                    }
                    else{
                        AvastWRC.ial.sp.data.panelData.searchBack.lastCouponsSearchPos --;
                        if(AvastWRC.ial.sp.data.panelData.searchBack.lastCouponsSearchPos == 0){
                            AvastWRC.ial.sp.data.panelData.searchBack.couponsSearchQueries.splice(1);   
                        }else{
                            AvastWRC.ial.sp.data.panelData.searchBack.couponsSearchQueries.splice(AvastWRC.ial.sp.data.panelData.searchBack.lastCouponsSearchPos);
                        }
                    }
                }
                

                AvastWRC.ial.sp.toggleLoadingSearch(action, false  /*stop loading*/);

                AvastWRC.ial.sp.feedback({
                    type: 'search',
                    action: action,
                    urlDomain: data.urlDomain,
                    url: data.url,
                    campaignId: data.campaignId,
                    showABTest: data.showABTest,
                    referrer: data.referrer || "",
                    transactionId: data.transactionId || "",
                    query: query,
                    offersTabHaveSearch: AvastWRC.ial.sp.data.offersTabHaveSearch ? true : false,
                    couponsTabHaveSearch:  AvastWRC.ial.sp.data.couponsTabHaveSearch ? true : false,
                    ruleId: AvastWRC.ial.sp.lastRuleClicked || null,
                    searchBack: AvastWRC.ial.sp.data.panelData.searchBack,
                    showOffersTooltip: AvastWRC.ial.sp.data.panelData.showOffersTooltip,
                    showCouponsTooltip: AvastWRC.ial.sp.data.panelData.showCouponsTooltip
                });
            } 
    
            function expandSearch(type) {
                if(type === "offers"){
                    $(AvastWRC.ial.sp.searchTemplateClasses.offers.expanded.container).toggleClass(AvastWRC.ial.sp.searchTemplateClasses.toggleClass);
                    $(AvastWRC.ial.sp.searchTemplateClasses.offers.expanded.containerWithBack).toggleClass(AvastWRC.ial.sp.searchTemplateClasses.toggleClass);
                    $(AvastWRC.ial.sp.searchTemplateClasses.offers.collapsed.container).toggleClass(AvastWRC.ial.sp.searchTemplateClasses.toggleClass);
                    $(AvastWRC.ial.sp.searchTemplateClasses.offers.expanded.input).select();
                }
                else if(type === "coupons"){
                    $(AvastWRC.ial.sp.searchTemplateClasses.coupons.expanded.container).toggleClass(AvastWRC.ial.sp.searchTemplateClasses.toggleClass);
                    $(AvastWRC.ial.sp.searchTemplateClasses.coupons.expanded.containerWithBack).toggleClass(AvastWRC.ial.sp.searchTemplateClasses.toggleClass);
                    $(AvastWRC.ial.sp.searchTemplateClasses.coupons.collapsed.container).toggleClass(AvastWRC.ial.sp.searchTemplateClasses.toggleClass);
                    $(AvastWRC.ial.sp.searchTemplateClasses.coupons.expanded.input).select();
                }
            }

            function mouseEnterAction(elemId){
                timer4Sec = setTimeout(function(){
                    $(elemId).addClass(AvastWRC.ial.sp.searchTemplateClasses.classToShow);
                    return setTimeout(function(){
                        clearTimeout(timer4Sec);
                        clearTimeout(timer); 
                        $(elemId).removeClass(AvastWRC.ial.sp.searchTemplateClasses.classToShow);
                    }, 100000);
                }, 500);
            }

            function mouseOutAction(elemId){
                $(elemId).removeClass(AvastWRC.ial.sp.searchTemplateClasses.classToShow);
                clearTimeout(timer4Sec);
                clearTimeout(timer);                
            }

            function sendRedirectInEmptySearchClick(type) {
                let redirectButtonUrl = "", offerCategory = "", querySearch= "";
                if(type === "offers"){
                    redirectButtonUrl = AvastWRC.ial.sp.data.panelData.emptySearchConfig.offers.url || "";
                    offerCategory = "EMPTY_SEARCH_REDIRECT_OFFER";
                    querySearch = AvastWRC.ial.sp.clearInput($(AvastWRC.ial.sp.searchTemplateClasses.offers.expanded.input)[0].value);
                }
                else if(type === "coupons"){
                    redirectButtonUrl = AvastWRC.ial.sp.data.panelData.emptySearchConfig.coupons.url || "";
                    offerCategory = "EMPTY_SEARCH_REDIRECT_VOUCHER";
                    querySearch = AvastWRC.ial.sp.clearInput($(AvastWRC.ial.sp.searchTemplateClasses.coupons.expanded.input)[0].value);
                }

                if(!redirectButtonUrl) return;

                AvastWRC.ial.sp.feedback({
                    type: 'search',
                    action: 'empty_search_redirect',
                    urlDomain: AvastWRC.ial.sp.data.urlDomain,
                    url: AvastWRC.ial.sp.data.url,
                    campaignId: AvastWRC.ial.sp.data.campaignId,
                    showABTest: AvastWRC.ial.sp.data.showABTest,
                    referrer: AvastWRC.ial.sp.data.referrer || "",
                    transactionId: AvastWRC.ial.sp.data.transactionId || "",
                    redirectButtonUrl: redirectButtonUrl,
                    offerCategory: offerCategory,
                    querySearch: querySearch
                });
            }

        },
        clearInput: function (inputText){
            if(inputText && inputText !== ""){
                return inputText.replace(/↵/g, " ").replace(/[<>]/g, " ").replace(/(\r\n)+|\r+|\n+|↵/ig, " ").trim();
            }
            else{
                return "";
            }
        },
        BindOfferEvents: function () {
            $(".asp-offer-item").click(function (e) {
                AvastWRC.ial.sp.OfferClick(e, "MAIN_UI_ITEM");
            });
        },

        BindOtherEvents: function () {
            $("#redirect").click(function (e) {
                AvastWRC.ial.sp.OfferClick(e, "MAIN_UI_ITEM");
            });
        },

        BindCouponEvents: function () {
            let couponsSelector = ".asp-coupon-item", openShopSelector = ".asp-shopname-span",
                couponBottomWithCodeSelector = ".asp-coupon-item-coupon-code-text",
                rateCouponPositive = ".asp-coupon-rate-positive",
                rateCouponNegative = ".asp-coupon-rate-negative";

            $(`${couponsSelector}, ${openShopSelector}, ${couponBottomWithCodeSelector}, ${couponBottomWithCodeSelector}, ${rateCouponPositive}, ${rateCouponNegative}`).off();

            AvastWRC.ial.sp.activateShowMoreTextDivs();

            $(couponsSelector).click(function (e) {
                console.log('coupon clicked fired');
                if(e.target.className === "asp-coupon-description-less" || e.target.className === "asp-coupon-description-more")return;
                e.preventDefault();
                $(".asp-coupon-hover").removeClass("avast-sas-display-block");
                AvastWRC.ial.sp.SetActiveCoupon(e);
                
            });

            $(openShopSelector).click(function(e){
                e.preventDefault();
                AvastWRC.ial.sp.CouponClick(e, "MAIN_UI_ITEM_APPLIED");
            });

            $(couponBottomWithCodeSelector).click(function (e) {
                e.preventDefault();
                AvastWRC.ial.sp.copyTextToClipboard(e);
            });

            $(rateCouponPositive).click(function (e) {
                e.preventDefault();
                AvastWRC.ial.sp.sendRatedCouponFeedback(true, e, AvastWRC.ial.sp.data);
            });

            $(rateCouponNegative).click(function (e) {
                e.preventDefault();
                AvastWRC.ial.sp.sendRatedCouponFeedback(false, e, AvastWRC.ial.sp.data);
            });
        },
        findAndUpdateRatedCouponInList: function(ratedPositive, e){
            var data = {
                isSearch: (e.currentTarget.attributes && e.currentTarget.attributes.isSearch && e.currentTarget.attributes.isSearch.value) ? parseInt(e.currentTarget.attributes.isSearch.value) : false,
                url: (e.currentTarget.attributes && e.currentTarget.attributes.resurl && e.currentTarget.attributes.resurl.value) ? e.currentTarget.attributes.resurl.value : "",
                coupon: {}
            }
            if(data.url === "")return data;

            var coupons = [];

            if(AvastWRC.ial.sp.couponInTabData && !AvastWRC.ial.sp.couponInTabData.couponClosed){
                AvastWRC.ial.sp.ModifyInList(AvastWRC.ial.sp.couponInTabData.coupons, data.url, "rated", true);
                coupons = AvastWRC.ial.sp.couponInTabData.coupons;
            }
            else if(!data.isSearch){
                AvastWRC.ial.sp.ModifyInList(AvastWRC.ial.sp.data.coupons, data.url, "rated", true);
                coupons = AvastWRC.ial.sp.data.coupons;
            }
            else {
                AvastWRC.ial.sp.ModifyInList(AvastWRC.ial.sp.data.search.couponsSearch.coupons, data.url, "rated", true);
                coupons = AvastWRC.ial.sp.data.search.couponsSearch.coupons;
            }

            if(coupons.length == 0)return data;
            
            data.coupon = AvastWRC.ial.sp.FindInList(coupons, data.url);
            return data;
        },
        
        sendRatedCouponFeedback: function(ratedPositive, e, data){
            var currentData = AvastWRC.ial.sp.findAndUpdateRatedCouponInList(ratedPositive, e)
            if(currentData.url === "")return;
            if(!currentData.coupon || !currentData.coupon.element)return;
            if(e && e.currentTarget && e.currentTarget.parentElement && e.currentTarget.parentElement.parentElement){
                var elementToRemove = e.currentTarget.parentElement.parentElement;
                $(`.asp-coupon-rate-thanks[resurl="${currentData.url}"]`).addClass("asp-coupon-rate-thanks-show");
                setTimeout((_elementToRemove) => {
                    _elementToRemove.remove();
                }, 2000, elementToRemove);
            }
            
            AvastWRC.ial.sp.feedback({
                type: 'OFFERS_RATING',
                transactionId: data.transactionId || "",
                url: data.url,
                urlDomain: data.urlDomain,
                campaignId: data.campaignId,                    
                referrer: data.referrer || "",
                offer: currentData.coupon.element,
                offerCategory: "VOUCHER",
                ratedPositive: ratedPositive
            });
        },

        activateShowMoreTextDivs: function (activeCoupons = null){
            $(".asp-coupon-description-more").unbind("click");
            $(".asp-coupon-description-less").unbind("click");
            
            $(".asp-coupon-description-less").click(function(e){
                showLess(e);
            });

            $(".asp-coupon-description-more").click(function(e){
                showMore(e);
            });

            function findAndReplace(domElement, className, newClassName) {
                if(!domElement || !className || !newClassName)return;

                var child = (className) ? $(domElement).find(className) : false;
                if(child){
                    child[0].className = newClassName;
                }
            }

            function showMore(e) {
                e.preventDefault();

                findAndReplace(e.currentTarget.parentElement.parentElement, "#couponsCompleteDesc", "asp-coupon-description-text");
                findAndReplace(e.currentTarget.parentElement.parentElement, "#couponsOneLineDesc", "asp-coupon-description-text asp-description-hidden");
                AvastWRC.ial.sp.activateShowMoreTextDivs();
            }

            function showLess(e) {                
                e.preventDefault();

                findAndReplace(e.currentTarget.parentElement.parentElement, "#couponsCompleteDesc", "asp-coupon-description-text asp-description-hidden");
                findAndReplace(e.currentTarget.parentElement.parentElement, "#couponsOneLineDesc", "asp-coupon-description-text  asp-more-info-to-show");
                AvastWRC.ial.sp.activateShowMoreTextDivs();
            }    
        },

        SetActiveCoupon: function (e, notificationType) {
            $(AvastWRC.ial.sp.commonSelectors.secondCouponsSeparators).css("opacity", 0);
            $(AvastWRC.ial.sp.commonSelectors.firstCouponsSeparator).css("opacity", 0);
            let couponUrl = e.currentTarget.attributes.resurl.value;
            let isSearch = (e.currentTarget.attributes.isSearch && e.currentTarget.attributes.isSearch.value) ? parseInt(e.currentTarget.attributes.isSearch.value) : false;
            if(isSearch){
                if (AvastWRC.ial.sp.ModifyInList(AvastWRC.ial.sp.data.search.couponsSearch.coupons, couponUrl, "selected", true)) {
                    AvastWRC.ial.sp.data.search.couponsSearch.vouchersSelectedCounter = AvastWRC.ial.sp.data.search.couponsSearch.vouchersSelectedCounter + 1;
                    if (AvastWRC.ial.sp.data.search.couponsSearch.vouchersSelectedCounter >= 10) {
                        AvastWRC.ial.sp.data.search.couponsSearch.vouchersCounterBig = true;
                    }
                    AvastWRC.ial.sp.data.search.couponsSearch.vouchersSelected = true;
                    AvastWRC.ial.sp.data.search.couponsSearch.vouchersAvailable = (AvastWRC.ial.sp.data.search.couponsSearch.couponsLength - AvastWRC.ial.sp.data.search.couponsSearch.vouchersSelectedCounter) > 0;
                }
            }
            else{
                if (AvastWRC.ial.sp.ModifyInList(AvastWRC.ial.sp.data.coupons, couponUrl, "selected", true)) {
                    AvastWRC.ial.sp.data.vouchersSelectedCounter = AvastWRC.ial.sp.data.vouchersSelectedCounter + 1;
                    if (AvastWRC.ial.sp.data.vouchersSelectedCounter >= 10) {
                        AvastWRC.ial.sp.data.vouchersCounterBig = true;
                    }
                    AvastWRC.ial.sp.data.vouchersSelected = true;
                    AvastWRC.ial.sp.data.vouchersAvailable = (AvastWRC.ial.sp.data.couponsLength - AvastWRC.ial.sp.data.vouchersSelectedCounter) > 0;
                }
            }      
            this.addActiveCoupon(e, couponUrl, notificationType);      
        },

        addActiveCoupon: function (e, couponUrl, notificationType) {
            let isSearch = (e.currentTarget.attributes.isSearch && e.currentTarget.attributes.isSearch.value) ? parseInt(e.currentTarget.attributes.isSearch.value) : false;
            $(`#coupon[resurl="${couponUrl}"]`).replaceWith(Mustache.render(AvastWRC.Templates.selectedCoupon, this.getClickedCouponTemplateData(couponUrl, isSearch)));
            AvastWRC.ial.sp.BindCouponEvents();
            let type = notificationType || "MAIN_UI_ITEM";
            AvastWRC.ial.sp.CouponClick(e, type);
            AvastWRC.ial.sp.animateSelectedCoupon(couponUrl, isSearch);
            AvastWRC.ial.sp.BindSearchEvents();
        },

        addActiveCouponsSeparator: function (isSearch) {
            if(!isSearch){
                if (AvastWRC.ial.sp.data.vouchersSelectedCounter !== 1) return;
                AvastWRC.ial.sp.data.selectedCouponAnimation = true;
            }else{
                if (AvastWRC.ial.sp.data.search.couponsSearch.vouchersSelectedCounter !== 1) return;
                AvastWRC.ial.sp.data.search.couponsSearch.selectedCouponAnimation = true;
            }
                
            let selectors = AvastWRC.ial.sp.commonSelectors, separators = {
                first: Mustache.render(AvastWRC.Templates.separatorTextFirst,!isSearch ? AvastWRC.ial.sp.data : AvastWRC.ial.sp.data.search.couponsSearch),
                second: Mustache.render(AvastWRC.Templates.separatorTextSecond, !isSearch ? AvastWRC.ial.sp.data : AvastWRC.ial.sp.data.search.couponsSearch)
            };           

            
            if($(selectors.firstCouponsSeparator)[0]){
                $(selectors.firstCouponsSeparator).replaceWith(separators.first);
            }
            else {
                $(selectors.couponsWrapper).prepend(separators.first);
            }
            if((isSearch && AvastWRC.ial.sp.data.search.couponsSearch.vouchersAvailable <= 0) || (!isSearch && AvastWRC.ial.sp.data.vouchersAvailable <= 0)){
                $(selectors.secondCouponsSeparators).remove();
            }
            else{                
                $(selectors.secondCouponsSeparators).replaceWith(separators.second);
            }
            

            if(!isSearch){
                AvastWRC.ial.sp.data.selectedCouponAnimation = false;
            }else{
                AvastWRC.ial.sp.data.search.couponsSearch.selectedCouponAnimation = false;
            }
        },

        setCouponsSeparatorVisibility: function (isSearch) {
            let onlyFirst = false;
            if(isSearch && AvastWRC.ial.sp.data.search.couponsSearch.vouchersAvailable <= 0){
                onlyFirst = true;
            }else if(!isSearch && AvastWRC.ial.sp.data.vouchersAvailable <= 0){
                onlyFirst = true;
            }
            if(onlyFirst){
                $(AvastWRC.ial.sp.commonSelectors.secondCouponsSeparators).css("opacity", 0);
                $(`${AvastWRC.ial.sp.commonSelectors.firstCouponsSeparator}`).animate({"opacity": 1}, {
                    duration: AvastWRC.ial.sp.data.vouchersSelectedCounter !== 1 ? 0 : 460,
                    queue: false
                });
                
            }else{
                $(`${AvastWRC.ial.sp.commonSelectors.firstCouponsSeparator}, ${AvastWRC.ial.sp.commonSelectors.secondCouponsSeparators}`).animate({"opacity": 1}, {
                    duration: AvastWRC.ial.sp.data.vouchersSelectedCounter !== 1 ? 0 : 460,
                    queue: false
                });
            }
            AvastWRC.ial.sp.BindSearchEvents();
        },

        getClickedCouponTemplateData: function (couponUrl, isSearch) {
            let clickedCouponData = {};

            if(isSearch){
                clickedCouponData = AvastWRC.ial.sp.data.search.couponsSearch.coupons.find(function (element) {
                    return element.url === couponUrl;
                });
            }
            else{
                clickedCouponData = AvastWRC.ial.sp.data.coupons.find(function (element) {
                    return element.url === couponUrl;
                });
            }

            clickedCouponData.panelData = AvastWRC.ial.sp.data.panelData;
            clickedCouponData.selectedCouponAnimation = true;

            return clickedCouponData;
        },

        animateSelectedCoupon: function (couponUrl, isSearch) {
            let selectors = AvastWRC.ial.sp.commonSelectors;
            var isSearch = isSearch;

            AvastWRC.ial.sp.addActiveCouponsSeparator(isSearch);

            setTimeout(initAnimation, 100);

            function initAnimation() {
                let clickedCoupon = $(`#coupon[resurl="${couponUrl}"]`),
                    listHeight = $(selectors.couponsWrapper).innerHeight(),
                    elemHeight = clickedCoupon.outerHeight(true),
                    elemTop = clickedCoupon.position().top,
                    activeShadowClass = "asp-coupon-bottom-with-code-active-shadow",
                    speed = 0, speedPerElement = 250,
                    socialCardHeight = (!isSearch) ? AvastWRC.ial.sp.socialSharing.getCurrentHeightOnTop() : 0,
                    elementsToAvoidOnMovingDown = [selectors.firstCouponsSeparator.replace(".", ""), AvastWRC.ial.sp.socialSharing.getContainerId()],
                    moveUp = listHeight - (listHeight - elemTop) - $(selectors.firstCouponsSeparator).outerHeight(true) - socialCardHeight;

                // It moves all elements down after the clicked coupon
                $(selectors.couponsWrapper).children().each(function () {
                    if ($(this).attr("resurl") === couponUrl) return false;
                    speed += speedPerElement;
                    if (elementsToAvoidOnMovingDown.indexOf($(this).attr("id")) < 0) $(this).animate({"top": '+=' + elemHeight}, speed);
                });

                // Animation up
                $(function () {
                    clickedCoupon.addClass(activeShadowClass);

                    clickedCoupon.animate({"top": '-=' + moveUp}, speed, function () {
                        let firstSeparatorHTML = $(selectors.firstCouponsSeparator)[0].outerHTML,
                            socialCardOnTopHTML = (!isSearch) ?  AvastWRC.ial.sp.socialSharing.getCurrentHTMLOnTop() : "",
                            clickedCouponHtTML = clickedCoupon[0].outerHTML.replace(new RegExp("asp-coupon-item-code-animation", 'g'), "");

                        $(this).remove();
                        $(selectors.firstCouponsSeparator).remove();
                        $(selectors.couponsWrapper).html(socialCardOnTopHTML
                            + firstSeparatorHTML
                            + clickedCouponHtTML.replace(activeShadowClass, "")
                            + $(selectors.couponsWrapper).html().replace(socialCardOnTopHTML, "").replace("asp-coupon-item-code-animation", ""));
                        $(`${selectors.couponsWrapper} *`).attr("style", "");
                        AvastWRC.ial.sp.setCouponsSeparatorVisibility(isSearch);
                        AvastWRC.ial.sp.BindCouponEvents();
                        AvastWRC.ial.sp.BindSearchEvents();
                        if((!isSearch)){
                            AvastWRC.ial.sp.socialSharing.init();
                            AvastWRC.ial.sp.socialSharing.moveCardToTop();
                        }                        
                    });

                    AvastWRC.ial.sp.scrollTop(speed - 100, socialCardHeight);
                });
            }
        },

        scrollTop: function (speed, position = 0) {
            $(AvastWRC.ial.sp.commonSelectors.scroll).animate({scrollTop: position}, {duration: speed, queue: false});
        },

        ClosePanel: function (e) {
            $('#a-panel').removeClass('asp-sas-display-grid')
                .addClass('asp-sas-display-none');
            //AvastWRC.ial.sp.UnbindPanelEvents();
            AvastWRC.ial.sp.data.panelShown = false;
            var data = AvastWRC.ial.sp.data;
            var categoryFlagValues = {
                "OFFERS_TAB_HIGHLIGHTED" : 2,
                "COUPONS_TAB_HIGHLIGHTED" : 4,
                "OTHERS_TAB_HIGHLIGHTED" : 64,
                "" : null
            }
            var categoryFlag = null;
            if(AvastWRC.ial.sp.notifications.config.values.currentData){
                categoryFlag = AvastWRC.ial.sp.notifications.config.values.currentData.notificationCategoryFlag;
            }else{
                categoryFlag = categoryFlagValues[data.activeTab];
            }
            
            if(!AvastWRC.ial.sp.couponInTabData || AvastWRC.ial.sp.couponInTabData.couponClosed){
                AvastWRC.ial.sp.feedback({
                    type: 'main_ui_event',
                    action: "close_click",
                    urlDomain: data.urlDomain,
                    url: data.url,
                    category: data.activeTab,
                    campaignId: data.campaignId,
                    showABTest: data.showABTest,
                    referrer: data.referrer || "",
                    transactionId: data.transactionId || "",
                    isPanelNotification: AvastWRC.ial.sp.data.isPanelNotification,
                    isdeepIntegrationEnabled: AvastWRC.ial.sp.data.isdeepIntegrationEnabled,
                    categoryFlag: categoryFlag,
                    ruleId: AvastWRC.ial.sp.lastRuleClicked || null
                });
            }
            AvastWRC.ial.sp.moveExternalPanels(0);
            AvastWRC.ial.sp.closeTooltip.show();
        },

        MinPanel: function (e, minimizedNotification) {
            $('#a-panel').removeClass('asp-sas-display-grid').addClass('asp-sas-display-none');
            AvastWRC.ial.sp.data.isNotification = false;
            AvastWRC.ial.sp.panelShown = false;
            AvastWRC.ial.sp.notifications.showMinimizedNotification();
        },
        
        MaxPanel: function (e) {
            $('#asp-panel-min').addClass(AvastWRC.ial.sp.notifications.config.classForHidden);
            //AvastWRC.ial.sp.UnBindMinPanelEvents();
            AvastWRC.ial.sp.panelShown = true;
            AvastWRC.ial.sp.showPanel("showMinimizedNotifications");
            var data = AvastWRC.ial.sp.data;
            if(!AvastWRC.ial.sp.couponInTabData || AvastWRC.ial.sp.couponInTabData.couponClosed)  {
                AvastWRC.ial.sp.feedback({
                    type: 'minimized_ui_clicked',
                    urlDomain: data.urlDomain,
                    url: data.url,
                    campaignId: data.campaignId,
                    showABTest: data.showABTest,
                    referrer: data.referrer || "",
                    transactionId: data.transactionId || "",
                    ruleId: AvastWRC.ial.sp.lastRuleClicked || null
                });
            }

            AvastWRC.ial.sp.stopAnimation("PULSE");
            $(AvastWRC.ial.sp.notifications.config.notificationsContainer.minimizedCircle).removeClass("a-sp-notifications-appear-pulse-animation");
            $(AvastWRC.ial.sp.notifications.config.notificationsContainer.minimizedBadge).removeClass("a-sp-notifications-pulse-animation");
            $(AvastWRC.ial.sp.notifications.config.notificationsContainer.minimizedInnerCircle).removeClass("a-sp-circle-animation");
        },

        SettingsPanel: function (e) {
            var data = AvastWRC.ial.sp.data;
            if(!AvastWRC.ial.sp.couponInTabData || AvastWRC.ial.sp.couponInTabData.couponClosed) {
                AvastWRC.ial.sp.feedback({
                    type: 'main_ui_event',
                    action: 'settings_click',
                    category: data.activeTab,
                    urlDomain: data.urlDomain,
                    url: data.url,
                    campaignId: data.campaignId,
                    showABTest: data.showABTest,
                    referrer: data.referrer || "",
                    transactionId: data.transactionId || "",
                    ruleId: AvastWRC.ial.sp.lastRuleClicked || null
                    //isCouponTab: AvastWRC.ial.sp.couponInTab /*only if event needed*/
                });
            }
        },

        helpPanel: function (e) {
            var data = AvastWRC.ial.sp.data;
            if(!AvastWRC.ial.sp.couponInTabData || AvastWRC.ial.sp.couponInTabData.couponClosed) {
                AvastWRC.ial.sp.feedback({
                    type: 'main_ui_event',
                    action: 'help_click',
                    category: data.activeTab,
                    urlDomain: data.urlDomain,
                    url: data.url,
                    campaignId: data.campaignId,
                    showABTest: data.showABTest,
                    referrer: data.referrer || "",
                    transactionId: data.transactionId || "",
                    ruleId: AvastWRC.ial.sp.lastRuleClicked || null
                    //isCouponTab: AvastWRC.ial.sp.couponInTab /*only if event needed*/
                });
            }
        },

        OffersTabClick: function (e) {
            $('#offersTab').removeClass('a-sp-header-bottom-col1').addClass('a-sp-header-bottom-col1-selected');
            $('#couponsTab').removeClass('a-sp-header-bottom-col2-selected').addClass('a-sp-header-bottom-col2');
            $('#othersTab').removeClass('a-sp-header-bottom-col3-selected').addClass('a-sp-header-bottom-col3');

            $('.a-sp-offers-items-wrapper').addClass('asp-sas-display-grid');
            $('.a-sp-coupons-items-wrapper').removeClass('asp-sas-display-grid');
            $('.a-sp-others-items-wrapper').removeClass('asp-sas-display-grid');

            $('#offersTabState').removeClass("a-sp-to-be-shown").addClass("a-sp-shown");
            AvastWRC.ial.sp.data.activeTab = "OFFERS_TAB_HIGHLIGHTED";
        },

        CouponsTabClick: function (e) {
            $('#offersTab').removeClass('a-sp-header-bottom-col1-selected').addClass('a-sp-header-bottom-col1');
            $('#couponsTab').removeClass('a-sp-header-bottom-col2').addClass('a-sp-header-bottom-col2-selected');
            $('#othersTab').removeClass('a-sp-header-bottom-col3-selected').addClass('a-sp-header-bottom-col3');

            $('.a-sp-offers-items-wrapper').removeClass('asp-sas-display-grid');
            $('.a-sp-coupons-items-wrapper').addClass('asp-sas-display-grid');
            $('.a-sp-others-items-wrapper').removeClass('asp-sas-display-grid');

            $('#couponsTabState').removeClass("a-sp-to-be-shown").addClass("a-sp-shown");

            AvastWRC.ial.sp.data.activeTab = "COUPONS_TAB_HIGHLIGHTED";

            AvastWRC.ial.sp.activateShowMoreTextDivs();
        },

        OthersTabClick: function (e) {
            $('#offersTab').removeClass('a-sp-header-bottom-col1-selected').addClass('a-sp-header-bottom-col1');
            $('#couponsTab').removeClass('a-sp-header-bottom-col2-selected').addClass('a-sp-header-bottom-col2');
            $('#othersTab').removeClass('a-sp-header-bottom-col3').addClass('a-sp-header-bottom-col3-selected');

            $('.a-sp-offers-items-wrapper').removeClass('asp-sas-display-grid');
            $('.a-sp-coupons-items-wrapper').removeClass('asp-sas-display-grid');
            $('.a-sp-others-items-wrapper').addClass('asp-sas-display-grid');

            $('#othersTabState').removeClass("a-sp-to-be-shown").addClass("a-sp-shown");

            AvastWRC.ial.sp.data.activeTab = "OTHERS_TAB_HIGHLIGHTED";
        },

        FindInList: function (list, url) {
            for (var i = 0; i < list.length; i++) {
                if (list[i].url === url) {
                    return { element: list[i], position: i };
                }
            }
            return null;
        },
        ModifyInList: function (list, url, key, value) {
            for (var i = 0; i < list.length; i++) {
                if (list[i].url === url) {
                    list[i][key] = value;
                    return true;
                }
            }
            return false;
        },

        OfferClick: function (e, uiSource = "UNKNOWN") {
            var data = AvastWRC.ial.sp.data;
            if(!data) return;

            e.preventDefault();
            var url = e.currentTarget.attributes.resurl.value;
            var isSearch = (e.currentTarget.attributes.isSearch && e.currentTarget.attributes.isSearch.value) ? parseInt(e.currentTarget.attributes.isSearch.value) : false;
            var offers = [];
            var offer = null;
            var offerCategory = "";
            uiSource = (isSearch) ? "SEARCH" : uiSource;
            var queryString = (isSearch) ? data.panelData.strings.searchTitleOffers : data.scan ? JSON.stringify(data.scan) : "";
            if(!url) return;

            if (data.producstLength > 0 || data.search.offersSearch.producstLength > 0) {
                offers = (!isSearch) ? data.products : data.search.offersSearch.products;
                providerId = data.providerId ? data.providerId : "";
                offer = AvastWRC.ial.sp.FindInList(offers, url);
                offerCategory = "PRODUCT";
                if (offer) {
                    sendOffersFeedback();
                    return;
                }
            }
            if (data.accommodationsLength > 0 || data.search.offersSearch.accommodationsLength > 0) {
                offers =  (!isSearch) ? data.accommodations : data.search.offersSearch.accommodations;
                providerId = data.providerId ? data.providerId : "";
                offer = AvastWRC.ial.sp.FindInList(offers, url);
                offerCategory = "ACCOMMODATION";
                if (offer) {
                    sendOffersFeedback();
                    return;
                }
            }
            if (data.redirectLength > 0) {
                offers = data.redirects;
                offerCategory = "REDIRECT";
                providerId = data.redirectProviderId ? data.redirectProviderId : "";
                offer = AvastWRC.ial.sp.FindInList(offers, url);
                if (offer) {
                    sendOffersFeedback();
                    return;
                }
            }

            function sendOffersFeedback(){
                AvastWRC.ial.sp.feedback({
                    type: 'offer_click',
                    url: url,
                    offer: offer.element,
                    positionInList: offer.position,
                    offerCategory: offerCategory,
                    providerId: providerId,
                    query: queryString,
                    offerQuery: data.offerQuery,
                    urlDomain: data.urlDomain,
                    campaignId: data.campaignId,
                    showABTest: data.showABTest,
                    showRateWindow: data.showRateWindow,
                    referrer: data.referrer || "",
                    which: e.target.myWhich || 1,
                    transactionId: data.transactionId || "",
                    showOffersNotification: data.showOffersNotification,
                    showPriceComparisonNotification: data.showPriceComparisonNotification,
                    uiSource: uiSource,
                    merchantURL: data.url,
                    country: data.country,
                    ruleId: AvastWRC.ial.sp.lastRuleClicked || "000"
                });
            }

        },
        // add the events on click of the offers and 

        CouponClick: function (e, uiSource = "UNKNOWN") {
            var data = AvastWRC.ial.sp.data;

            e.preventDefault();
            
            var url = "";
            var isSearch = false;

            if(e.currentTarget.attributes && (e.currentTarget.attributes.resurl || e.currentTarget.attributes.isSearch)){
                if(e.currentTarget.attributes.resurl && e.currentTarget.attributes.resurl.value){
                    url = e.currentTarget.attributes.resurl.value;
                }
                if(e.currentTarget.attributes.isSearch && e.currentTarget.attributes.isSearch.value){
                    isSearch = parseInt(e.currentTarget.attributes.isSearch.value);
                }
            }
            else if(e.currentTarget.offsetParent && e.currentTarget.offsetParent.attributes && (e.currentTarget.offsetParent.attributes.resurl || e.currentTarget.offsetParent.attributes.isSearch)){
                if(e.currentTarget.offsetParent.attributes.resurl && e.currentTarget.offsetParent.attributes.resurl.value){
                    url = e.currentTarget.offsetParent.attributes.resurl.value;
                }
                if(e.currentTarget.offsetParent.attributes.isSearch && e.currentTarget.offsetParent.attributes.isSearch.value){
                    isSearch = parseInt(e.currentTarget.offsetParent.attributes.isSearch.value);
                }
            }
            var coupons = [], coupon = null, isLinkClick = (uiSource == "MAIN_UI_ITEM_APPLIED") ? true : false;

            uiSource = (isSearch) ? "SEARCH" : uiSource;
            var queryString = (isSearch) ? data.panelData.strings.searchTitleCoupons : data.scan ? JSON.stringify(data.scan) : "";

            if(!url) return;
            if (data.couponsLength > 0 || data.search.couponsSearch.couponsLength > 0) {
                coupons = (!isSearch) ? data.coupons : data.search.couponsSearch.coupons;
                coupon = AvastWRC.ial.sp.FindInList(coupons, url);
                if(coupon){
                    sendCouponsFeedback();
                    return;
                }
            }

            function sendCouponsFeedback(){
                 AvastWRC.ial.sp.feedback({
                    type: 'coupon_click',
                    url: url,
                    coupon: coupon.element,
                    couponCategory: "VOUCHER",
                    positionInList: coupon.position,
                    urlDomain: data.urlDomain,
                    campaignId: data.campaignId,
                    showABTest: data.showABTest,
                    showRateWindow: data.showRateWindow,
                    referrer: data.referrer || "",
                    which: e.target.myWhich || 1,
                    providerId: data.voucherProviderId ? data.voucherProviderId : "",
                    query: queryString,
                    offerQuery: data.offerQuery,
                    transactionId: data.transactionId || "",
                    merchantURL: data.url,
                    uiSource: uiSource,
                    country: data.country,
                    ruleId: AvastWRC.ial.sp.lastRuleClicked || "000",
                    isLinkClick: isLinkClick
                });
            }
            e.target.myWhich = 0;
        },
        // add the events on click of the coupons and special deal

        copyTextToClipboard: function (e) {
            var couponBottomWithCodeSelector = "",
            couponBottomWithCopiedSelector = "";

            if(e && e.currentTarget && e.currentTarget.parentNode && e.currentTarget.parentNode.children[0]){
                couponBottomWithCodeSelector = e.currentTarget.parentNode.children[0];
            }

            if(e && e.currentTarget && e.currentTarget.parentNode && e.currentTarget.parentNode.children[1]){
                couponBottomWithCopiedSelector = e.currentTarget.parentNode.children[1];
            } 

            if(couponBottomWithCodeSelector !== "" && couponBottomWithCopiedSelector !== ""){
                $(couponBottomWithCodeSelector).removeClass("asp-code-opacity");
                $(couponBottomWithCopiedSelector).addClass("asp-code-opacity");        

                setTimeout(() => {
                    $(couponBottomWithCopiedSelector).removeClass("asp-code-opacity");
                    $(couponBottomWithCodeSelector).addClass("asp-code-opacity");
                }, 1800);
            }

            let text = e.currentTarget.attributes.cupcod.value;
            let $temp = $("<input>");
            $("body").append($temp);
            $temp.val(text).select();
            document.execCommand("copy");
            $temp.remove();
        },

        togglePanel: function(tab) {
            if (AvastWRC.ial.sp.data.panelShown) {
                if (AvastWRC.ial.sp.data.activeTab.indexOf(tab) < 0) {
                    if (tab === "OFFERS") {
                        AvastWRC.ial.sp.OffersTabClick();
                    }
                    else if (tab === "COUPONS") {
                        AvastWRC.ial.sp.CouponsTabClick();
                    }
                    else if (tab === "OTHERS") {
                        AvastWRC.ial.sp.OthersTabClick();
                    }
                    else {
                        AvastWRC.ial.sp.OffersTabClick();
                    }
                } else {
                    $('#a-panel').removeClass('asp-sas-display-grid')
                        .addClass('asp-sas-display-none');
                    AvastWRC.ial.sp.data.panelShown = false;
                }
            } else {
                AvastWRC.ial.sp.showPanel(tab);
            }
        },

        showPanel: function (message, isCouponTab = null) {
            //on click on the button display the panel
            console.log("showPanel");
            var defMessages = {
                "showMinimizedNotifications": "min",
                "OFFERS_AND_COUPONS": "offers",
                "OFFERS": "offers",
                "POPULAR_HOTELS": "offers",
                "ALTERNATIVE_HOTELS": "offers",
                "COUPONS": "coupons",        
                "SIMILAR_COUPONS": "others",
                "SPECIAL_DEALS": "others",
            }
            if((!AvastWRC.ial.sp.couponInTabData || AvastWRC.ial.sp.couponInTabData.couponClosed) && !isCouponTab){
                if ($('#a-panel').length === 0) {
                    AvastWRC.ial.sp.createPanel(AvastWRC.ial.sp.data, true);
                }
                var data = AvastWRC.ial.sp.data;
                $('.a-sp-header-bottom-col1').removeClass("asp-sas-display-none");
                $('.a-sp-header-bottom-col3').removeClass("asp-sas-display-none");
                if (data.panelShown) {
                    if (AvastWRC.ial.sp.data.activeTab == "OFFERS_TAB_HIGHLIGHTED") {
                        AvastWRC.ial.sp.OffersTabClick();
                    }
                    else if (AvastWRC.ial.sp.data.activeTab == "COUPONS_TAB_HIGHLIGHTED") {
                        AvastWRC.ial.sp.CouponsTabClick();
                    }
                    else if (AvastWRC.ial.sp.data.activeTab == "OTHERS_TAB_HIGHLIGHTED") {
                        AvastWRC.ial.sp.OthersTabClick();
                    }
                    else {
                        AvastWRC.ial.sp.OffersTabClick();
                    }
                }
                else if (!message || defMessages[message] == "min") {
                    if (data.offersToBeShown || (data.producstLength > 0) || (data.accommodationsLength > 0)) {
                        AvastWRC.ial.sp.OffersTabClick();
                        AvastWRC.ial.sp.data.offersToBeShown = false;
                        $('#offersTabState').removeClass("a-sp-to-be-shown").addClass("a-sp-shown");
                    } else if (data.othersToBeShown || (data.redirectLength > 0)) {
                        AvastWRC.ial.sp.OthersTabClick();
                        AvastWRC.ial.sp.data.othersToBeShown = false;
                        $('#othersTabState').removeClass("a-sp-to-be-shown").addClass("a-sp-shown");
                    } else if (data.couponsToBeShown || (data.couponsLength > 0)) {
                        AvastWRC.ial.sp.CouponsTabClick();
                        AvastWRC.ial.sp.data.couponsToBeShown = false;
                        $('#couponsTabState').removeClass("a-sp-to-be-shown").addClass("a-sp-shown");
                    }
                    else {
                        AvastWRC.ial.sp.OffersTabClick();
                        AvastWRC.ial.sp.data.offersToBeShown = false;
                        $('#offersTabState').removeClass("a-sp-to-be-shown").addClass("a-sp-shown");
                    }
                }
                else if (defMessages[message] == "offers") {
                    AvastWRC.ial.sp.OffersTabClick();
                    AvastWRC.ial.sp.data.offersToBeShown = false;
                }
                else if (defMessages[message] == "others") {
                    AvastWRC.ial.sp.OthersTabClick();
                    AvastWRC.ial.sp.data.othersToBeShown = false;
                }
                else if (defMessages[message] == "coupons") {
                    AvastWRC.ial.sp.CouponsTabClick();
                    AvastWRC.ial.sp.data.couponsToBeShown = false;
                }
                $("#asp-panel-min").removeClass("asp-sas-display-block").addClass("a-sp-notifications-hidden");
                $('.a-sp-panel').removeClass('asp-sas-display-none').addClass('asp-sas-display-grid');

                AvastWRC.ial.sp.FEEDBACK_VALUES.lastPanelHeight = ($("#a-panel") && $("#a-panel")[0] && $("#a-panel")[0].clientHeight) ? $("#a-panel")[0].clientHeight : 442;

                AvastWRC.ial.sp.activateShowMoreTextDivs();

                AvastWRC.ial.sp.setSecurityHoverEffect(true);

                AvastWRC.ial.sp.feedback({
                    type: 'main_ui_event',
                    action: 'shown', // panel was shown
                    urlDomain: data.urlDomain,
                    url: data.url,
                    category: data.activeTab,
                    campaignId: data.campaignId,
                    showABTest: data.showABTest,
                    referrer: data.referrer || "",
                    transactionId: data.transactionId || "",
                    ruleId: AvastWRC.ial.sp.lastRuleClicked || null
                });

                let tooltip = $(".asp-settings-tooltip");
                if(tooltip && tooltip.length > 0 && tooltip[0].className.indexOf("asp-hide-tooltip") === -1){
                    AvastWRC.ial.sp.sendSettingsTooltipEvent('SHOWN');
                }

                var activeTab = AvastWRC.ial.sp.data.activeTab;
                if (data && !data.panelShown) {
                    data.panelShown = true;
                    AvastWRC.ial.sp.data.defaultTab = activeTab;
                }

                AvastWRC.ial.sp.data.defaultTab = activeTab;
                AvastWRC.ial.sp.moveExternalPanels();
                AvastWRC.ial.sp.socialSharing.init();
                AvastWRC.ial.sp.socialSharing.sendShownFeedback();

                if ((!data.urlData || !data.urlData.match || data.transactionFinished) && data.iconClicked) {
                    AvastWRC.ial.sp.feedback({
                        type: 'reset_icon_click'
                    });
                    AvastWRC.ial.sp.data.iconClicked = false;
                }

                AvastWRC.ial.sp.panelShown = true;
            }
            else{
                AvastWRC.ial.sp.applyCouponInTab(AvastWRC.ial.sp.couponInTabData);
            }         

        },

        extensionIconClicked: function (data) {
            // remove notifications
            if(!AvastWRC.ial.sp.couponInTabData || AvastWRC.ial.sp.couponInTabData.couponClosed){
                console.log("extensionIconClicked", data);
                AvastWRC.ial.sp.removeNotifications();
                AvastWRC.ial.sp.closeTooltip.hide();
                if(AvastWRC.ial.sp.data){
                    console.log("extensionIconClicked with data");
                    AvastWRC.ial.sp.data.iconClicked = data.iconClicked;
                    AvastWRC.ial.sp.showPanel();
                }
                else{
                    console.log("extensionIconClicked no data");
                    AvastWRC.ial.sp.data = data;
                    AvastWRC.ial.sp.createPanel(AvastWRC.ial.sp.data, true);
                    AvastWRC.ial.sp.showPanel();
                }
            }
        },

        showPanelNotification: function (message) {
            // remove notifications
            console.log("showPanelNotification: ", message);
            AvastWRC.ial.sp.removeNotifications();
            AvastWRC.ial.sp.showPanel(message);
        },

        applyCouponInTabTimeOut: null,

        applyCouponInTab: function (data) {
            var locationUrl = document.location.href;
            var domCounter = document.getElementsByTagName('*').length;
            if(AvastWRC.ial.sp.applyCouponInTabTimeOut != null){
                clearTimeout(AvastWRC.ial.sp.applyCouponInTabTimeOut);
            }
            if(domCounter > 150){
                console.log("apply coupon now domCounter: ",domCounter);
                applyCouponNow(data);             
            }
            else{
                AvastWRC.ial.sp.applyCouponInTabTimeOut = setTimeout((_data, _locationUrl) => {
                    console.log("dom counter: ",document.getElementsByTagName('*').length);
                    // remove notifications
                    if(_locationUrl === document.location.href){
                        applyCouponNow(_data);
                    }
                }, 500, data, locationUrl);
            }
                        
            function applyCouponNow(){
                console.log("applyCouponInTab location: ", document.location.href);
                AvastWRC.ial.sp.couponInTab = true;
                AvastWRC.ial.sp.showCouponPanel(data, true);
                AvastWRC.ial.sp.activateShowMoreTextDivs(true);
            }
        },

        addRippleEffectToButtons: function (buttonsWithRippleEffect) {
            for (let i = 0; i <= buttonsWithRippleEffect.length; i++) {
                $(buttonsWithRippleEffect[i]).mousedown(AvastWRC.ial.sp.rippleCommonAction);
            }
        },

        rippleCommonAction: function (e, color) {
            e.preventDefault();
            AvastWRC.ial.addRippleEffect(e, e.target.className, color);
        },

        addRippleEffectToButtonsWithSpecificColor: function (buttonsWithRippleEffect) {
            for (let i = 0; i < buttonsWithRippleEffect.length; i++) {
                $(buttonsWithRippleEffect[i].button).mousedown(function (e) {
                    AvastWRC.ial.sp.rippleCommonAction(e, buttonsWithRippleEffect[i].color)
                });
            }
        },

        notifications: {
            showRedirectNotification: function (data, template, notificationsType) {
                if(!AvastWRC.ial.sp.couponInTabData || AvastWRC.ial.sp.couponInTabData.couponClosed)  {
                   console.log("Notification: showRedirectNotification");
                    this.loadNotification(notificationsType, data);
                }
            },
            showBarNotification: function (data) {
                if(!AvastWRC.ial.sp.couponInTabData || AvastWRC.ial.sp.couponInTabData.couponClosed) {
                    console.log("Notification: showBarNotification");
                    this.loadNotification(AvastWRC.ial.sp.notifications.config.notificationsType.bar, data);
                }
            },

            applyDeepIntegration: function(data){
                AvastWRC.ial.sp.removeNotifications();

                if(!AvastWRC.ial.sp.couponInTabData || AvastWRC.ial.sp.couponInTabData.couponClosed)  {
                    console.log("Notification: applyDeepIntegration");
                    this.loadNotification(AvastWRC.ial.sp.notifications.config.notificationsType.deepIntegration, data);
                }
            },

            showMinimizedNotification: function (data = {
                replace: [AvastWRC.ial.sp.data.detailsToClosed.offerNumber],
                message: AvastWRC.ial.sp.notifications.config.messages.injected.showMinimizedNotifications.key.replace("message.", "")
            }) {
                if (!AvastWRC.ial.sp.couponInTabData || AvastWRC.ial.sp.couponInTabData.couponClosed) {
                    console.log("Notification: showMinimizedNotification");
                    this.loadNotification(AvastWRC.ial.sp.notifications.config.notificationsType.minimized, data);
                }
            },
            showPanelNotifications: function (data) {
                if (!AvastWRC.ial.sp.couponInTabData || AvastWRC.ial.sp.couponInTabData.couponClosed) {
                    console.log("Notification: showPanelNotifications");
                    this.loadNotification(AvastWRC.ial.sp.notifications.config.notificationsType.panel, data);
                }
            },

            showPanelMinNotifications: function (data) {
                if(!AvastWRC.ial.sp.couponInTabData || AvastWRC.ial.sp.couponInTabData.couponClosed){
                    console.log("Notification: showPanelMinNotifications");
                    AvastWRC.ial.sp.removeNotifications();
                    
                    if(data.cachedData){
                        AvastWRC.ial.sp.updatePanel(data.cachedData);
                    }
                    
                    AvastWRC.ial.sp.notifications.config.values.currentData = data;

                    var panelMinData = {};                
                    panelMinData = data.panelMinSpecific;
                    panelMinData.activeNotificationMessage = data.activeNotificationMessage;
                    panelMinData.panelData = data.cachedData.panelData;
                    panelMinData.offerQuery = data.cachedData.offerQuery;

                    if (AvastWRC.ial.sp.data.panelShown) return null;

                    var defaultPosition = JSON.parse(JSON.stringify(AvastWRC.ial.sp.PANEL_DEFAULT_POSITION));
                    if(AvastWRC.ial.sp.data.panelData.standardPosition && AvastWRC.ial.sp.data.panelData.standardPosition.position) {
                        if(( AvastWRC.ial.sp.data.panelData.standardPosition.position.right < (document.body.clientWidth - 326)) && 
                            (AvastWRC.ial.sp.data.panelData.standardPosition.position.top < window.outerHeight)){
                            defaultPosition = AvastWRC.ial.sp.data.panelData.standardPosition.position;
                        }
                    }
                    else if (AvastWRC.ial.sp.notifications.config.values.currentData.notificationSettings && AvastWRC.ial.sp.notifications.config.values.currentData.notificationSettings.position) {
                        if((AvastWRC.ial.sp.notifications.config.values.currentData.notificationSettings.position.right < (document.body.clientWidth - 326))&& 
                            (AvastWRC.ial.sp.data.panelData.standardPosition.position.top < window.outerHeight)){
                            defaultPosition = AvastWRC.ial.sp.notifications.config.values.currentData.notificationSettings.position;
                        }
                    }                  

                    panelMinData.isPanelMin = true;
                    var ourTemplate = Mustache.render(AvastWRC.Templates.safeShopPanelMinNotification, panelMinData);
                    AvastWRC.ial.prependTemplate(ourTemplate);
                    
                    $("#asp-panel-min-notification").css(defaultPosition);

                    AvastWRC.ial.sp.activateShowMoreTextDivs();

                    AvastWRC.ial.sp.setSecurityHoverEffect(false);

                    AvastWRC.ial.sp.makeDraggable(document.getElementById("a-panel-min-header"), document.getElementById("asp-panel-min-notification"), () => {
                        AvastWRC.ial.sp.feedback({
                            type: 'standard_ui_dragged_ended',
                            position: $("#asp-panel-min-notification").positionRight() || JSON.parse(JSON.stringify(AvastWRC.ial.sp.PANEL_DEFAULT_POSITION))
                        })
                    });

                    $(".asp-header-logo").click(()=>{
                        let data = AvastWRC.ial.sp.data, currentData = AvastWRC.ial.sp.notifications.config.values.currentData;
                        AvastWRC.ial.sp.feedback({
                            type: 'notifications_events',
                            notificationType: currentData.notificationType,
                            action: 'logo_click',
                            category: currentData.category,
                            urlDomain: data.urlDomain,
                            url: data.url,
                            campaignId: data.campaignId,
                            showABTest: data.showABTest,
                            referrer: data.referrer || "",
                            transactionId: data.transactionId || "",
                            ruleId: AvastWRC.ial.sp.lastRuleClicked || null
                        });
                    });

                    $(".asp-header-close").click((e)=>{
                        AvastWRC.ial.sp.removeNotifications();
                        if ((e.target.id === "a-panel-min-close") && AvastWRC.ial.sp.data.feedbackInfo && AvastWRC.ial.sp.data.feedbackInfo.askForFeedback) AvastWRC.ial.sp.userFeedback.showFeedbackQuestion();

                        let data = AvastWRC.ial.sp.data, currentData = AvastWRC.ial.sp.notifications.config.values.currentData;

                        AvastWRC.ial.sp.feedback({
                            type: 'notifications_events',
                            action: "close_click",
                            urlDomain: data.urlDomain,
                            url: currentData.url,
                            mesageCategory: currentData.message,
                            category: currentData.category,
                            categoryFlag: currentData.notificationCategoryFlag,
                            notificationType: currentData.notificationType,
                            campaignId: data.campaignId,
                            showABTest: data.showABTest,
                            referrer: data.referrer || "",
                            transactionId: currentData.transactionId || "",
                            ruleId: AvastWRC.ial.sp.lastRuleClicked || null
                        });

                        AvastWRC.ial.sp.closeTooltip.show();
                    });

                    $(".asp-button-show-all").mousedown((e)=>{
                        e.preventDefault();
                        AvastWRC.ial.addRippleEffect(e, ".asp-button-show-all", null, true);
                    });

                    $(".asp-button-show-all").click(()=>{
                        AvastWRC.ial.sp.removeNotifications();
                        let data = AvastWRC.ial.sp.data, currentData = AvastWRC.ial.sp.notifications.config.values.currentData;
                        
                        AvastWRC.ial.sp.showPanel(AvastWRC.ial.sp.notifications.config.values.currentData.category);
                        
                        AvastWRC.ial.sp.feedback({
                            type: 'notifications_events',
                            action: "button_click",
                            mesageCategory: currentData.message,
                            category: currentData.category,
                            notificationType: currentData.notificationType,
                            urlDomain: data.urlDomain,
                            url: currentData.url,
                            campaignId: data.campaignId,
                            showABTest: data.showABTest,
                            referrer: data.referrer || "",
                            transactionId: currentData.transactionId || "",
                            ruleId: AvastWRC.ial.sp.lastRuleClicked || null
                        });
                    });

                    $("#wrapperItemsPanelMinNotifications .asp-offer-item").click((e)=>{
                        console.log("offer click")
                        AvastWRC.ial.sp.removeNotifications();

                        AvastWRC.ial.sp.OfferClick(e, "MINIMIZED_MAINUI_ITEM");
                    
                        AvastWRC.ial.sp.showPanel(AvastWRC.ial.sp.notifications.config.values.currentData.category);
                });

                    $("#wrapperItemsPanelMinNotifications .asp-coupon-item").click((e)=>{
                        if(e.target.className === "asp-coupon-description-less" || e.target.className === "asp-coupon-description-more")return;
                    	e.preventDefault();
                        console.log("offer click");
                        AvastWRC.ial.sp.removeNotifications();

                        AvastWRC.ial.sp.SetActiveCoupon(e, "MINIMIZED_MAINUI_ITEM");
                    
                        AvastWRC.ial.sp.showPanel(AvastWRC.ial.sp.notifications.config.values.currentData.category);

                    });

                    $("#wrapperItemsPanelMinNotifications .asp-redirect-item").click((e)=>{
                        console.log("offer click")
                        AvastWRC.ial.sp.removeNotifications();

                        AvastWRC.ial.sp.OfferClick(e, "MINIMIZED_MAINUI_ITEM");
                    
                        AvastWRC.ial.sp.showPanel(AvastWRC.ial.sp.notifications.config.values.currentData.category);
                    });

                    AvastWRC.ial.sp.feedback({
                        type: 'notifications_events',
                        notificationType: AvastWRC.ial.sp.notifications.config.values.currentData.notificationType,
                        action: 'shown',
                        category: AvastWRC.ial.sp.notifications.config.values.currentData.category,
                        urlDomain: data.urlDomain,
                        url: data.url,
                        campaignId: data.campaignId,
                        showABTest: data.showABTest,
                        referrer: data.referrer || "",
                        transactionId: data.transactionId || "",
                        ruleId: AvastWRC.ial.sp.lastRuleClicked || null
                    });

                }                
            },

            registerEventsMessage: function (ee) {
                console.log("registerEventsMessage called ");
                for (let message in this.config.messages.injected) {
                    ee.on(this.config.messages.injected[message].key,
                        this.config.messages.injected[message].action);
                }
            },

            initDeepIntegration: function () {
                //if (AvastWRC.ial.sp.data.panelShown) return null;
                
                if (AvastWRC.ial.sp.data.diRules.length === 0) return;

                const ruleRetriesInterval = 1000;
                AvastWRC.ial.sp.data.diRules.forEach((rule) => {
                    AvastWRC.ial.sp.rulesTimers[rule.id] = {
                        retries: 5
                    };
                    applyRule(rule, document.location.href);
                });

                function sendFailureDIFeedback(failureType, ruleId = "000") {
                    let data = AvastWRC.ial.sp.data;
                    let failureTypes = {
                        0: "FAILED_STRING_MATCHING",
                        1: "FAILED_FIND_ELEMENT",
                        2: "FAILED_INJECT"
                    };
                    if(failureTypes[failureType]){
                        AvastWRC.ial.sp.feedback({
                            type: "notifications_events",
                            action: "failed",
                            mesageCategory: "applyDeepIntegration",
                            notificationType: "DEEP_INTEGRATION",
                            urlDomain: data.urlDomain,
                            url: data.url,
                            campaignId: data.campaignId,
                            showABTest: data.showABTest,
                            referrer: data.referrer || "",
                            transactionId: data.transactionId || "",
                            minimizedWithCoupons: data.couponsLength > 0,
                            ruleId: ruleId,
                            failureType: failureTypes[failureType],
                        });
                    }
                }

                function sendShownDIFeedback(ruleId = "000") {
                    let data = AvastWRC.ial.sp.data;
                    AvastWRC.ial.sp.feedback({
                        type: "notifications_events",
                        action: "shown",
                        mesageCategory: "applyDeepIntegration",
                        notificationType: "DEEP_INTEGRATION",
                        urlDomain: data.urlDomain,
                        url: data.url,
                        campaignId: data.campaignId,
                        showABTest: data.showABTest,
                        referrer: data.referrer || "",
                        transactionId: data.transactionId || "",
                        minimizedWithCoupons: data.couponsLength > 0,
                        ruleId: ruleId
                    });
                }

                function sendDIClickNotificationFeedback(ruleId = "000") {
                    AvastWRC.ial.sp.removeNotifications();
                    let data = AvastWRC.ial.sp.data;
                    AvastWRC.ial.sp.feedback({
                        type: 'notifications_events',
                        action: "button_click",
                        mesageCategory: "applyDeepIntegration",
                        notificationType: "DEEP_INTEGRATION",
                        urlDomain: data.urlDomain,
                        url: data.url,
                        campaignId: data.campaignId,
                        showABTest: data.showABTest,
                        referrer: data.referrer || "",
                        transactionId: data.transactionId || "",
                        ruleId: ruleId
                    });
                }

                function ruleMatches(search, content, matchesRequires) {
                    const matches = search.filter(str => content.includes(str));
                    return matches.length >= matchesRequires;
                }

                function applyRule(rule, targetUrl) {
                    console.log("Applying rule for url " + targetUrl);
                    console.log("Current url is : " + document.location.href);
                    AvastWRC.ial.sp.rulesTimers[rule.id].retries--;
                    let bodyContent = (document && document.body && document.body.innerText) ? document.body.innerText : "";
                    console.log("Trying to apply DI rule " + rule.id);
                    
                    const injectionId = 'sp-di-' + rule.id;
                    if (document.getElementById(injectionId) !== null) {
                        if (AvastWRC.ial.sp.rulesTimers[rule.id].retries > 0) {
                            setTimeout(applyRule, ruleRetriesInterval, rule, targetUrl);
                        }
                        return; // this rule has been already injected
                    }
                    let domElements = $(rule.injectAt);
                    let anchor = (domElements && domElements[0]) ? domElements[0] : null;
                      //  || $("[class^=" + rule.injectAt + "]").get(0) || $("[id^=" + rule.injectAt + "]").get(0);
                    if (!anchor) {
                        console.log("no anchor ruleId", rule.id);
                        if (AvastWRC.ial.sp.rulesTimers[rule.id].retries > 0) {
                            setTimeout(applyRule, ruleRetriesInterval, rule, targetUrl);
                        }
                        else{
                            sendFailureDIFeedback(1, rule.id);
                        }
                        return;
                        // failed ot apply, couldn't find injectAt attribute - report
                    }
                    if (rule.search.length > 0) { // if search strings are defined, we must match them before applying the rule
                        let matchesRequires = (rule.matchesRequires === 'all') ? rule.search.length : parseInt(rule.matchesRequires);
                        if (!ruleMatches(rule.search, bodyContent, matchesRequires)) {
                            if (AvastWRC.ial.sp.rulesTimers[rule.id].retries > 0) {
                                setTimeout(applyRule, ruleRetriesInterval, rule, targetUrl);
                            }
                            else{
                                sendFailureDIFeedback(0, rule.id);                                
                            }
                            return;
                        }
                    }
                    let element = document.createElement('div');
                    element.innerHTML = processTemplate(rule.template);
                    element = element.firstChild;
                    element.id = injectionId;
                    element.classList.add('asp-di-common-style');
                    let clickAction = processActions(rule.clickAction, element);
                    let hoverAction = processActions(rule.hoverAction, element);
                    let leaveAction = processActions(rule.leaveAction, element);
                    let callbackAction = processActions(rule.callbackAction, element);
                    if (typeof clickAction !== 'function') clickAction = new Function(clickAction);
                    if (typeof hoverAction !== 'function') hoverAction = new Function(hoverAction);
                    if (typeof leaveAction !== 'function') leaveAction = new Function(leaveAction);
                    if (typeof callbackAction !== 'function') callbackAction = new Function(callbackAction);
                    const clickHandlerFunc = wrapAction(clickAction, rule);
                    element.addEventListener('click', clickHandlerFunc);
                    element.addEventListener('mouseenter', hoverAction);
                    element.addEventListener('mouseleave', leaveAction);

                    const ruleMethod = parseInt(rule.injectMethod) || 1;
                    try {
                        if (targetUrl === document.location.href) {
                            switch (ruleMethod) {
                                case 1:
                                default:
                                    insertAfter(element, anchor);
                                    break;
                                case 2:
                                    anchor.appendChild(element);
                                    break;
                                case 3:
                                    insertBefore(element, anchor);
                                    break;
                            }
                            console.log("DI rule " + rule.id + " applied successfully");
                            sendShownDIFeedback(rule.id);
                            callbackAction();
                            if (AvastWRC.ial.sp.rulesTimers[rule.id].retries > 0) {
                                setTimeout(applyRule, ruleRetriesInterval, rule, targetUrl);
                            }
                        }
                    } catch (e){
                        sendFailureDIFeedback(2, rule.id);
                        console.log("Error occurred while trying to append child element " + e);
                    }
                }

                // Wrap the action functionality with additional custom functionality
                function wrapAction(action, rule){
                    return ((e) => {
                        AvastWRC.ial.sp.lastRuleClicked = rule.id;
                        if (typeof action === 'function') {
                            action(e);
                            sendDIClickNotificationFeedback(rule.id);
                        }                            
                    })
                }
                function processActions(action, element){
                    switch(action){
                        case "OPEN_PANEL_OFFERS":
                            return AvastWRC.ial.sp.togglePanel.bind(AvastWRC.ial.sp, "OFFERS", null);
                        case "OPEN_PANEL_COUPONS":
                            return AvastWRC.ial.sp.togglePanel.bind(AvastWRC.ial.sp, "COUPONS", null);
                        case "OPEN_PANEL_REDIRECTS":
                            return AvastWRC.ial.sp.togglePanel.bind(AvastWRC.ial.sp, "OTHERS", null);
                        case "OPEN_OFFER_LINK":
                            element.setAttribute("resurl", AvastWRC.ial.sp.data.products[0].url);
                            return AvastWRC.ial.sp.OfferClick.bind(AvastWRC.ial.sp);
                        case "OPEN_OFFER_LINK_NEW_TAB":
                            element.setAttribute("resurl", AvastWRC.ial.sp.data.products[0].url);
                            element.setAttribute("newtab", true);
                            return AvastWRC.ial.sp.OfferClick.bind(AvastWRC.ial.sp);
                        case "OPEN_COUPON_LINK":
                            element.setAttribute("resurl", AvastWRC.ial.sp.data.coupons[0].url);
                            return AvastWRC.ial.sp.CouponClick.bind(AvastWRC.ial.sp);
                        case "OPEN_COUPON_LINK_NEW_TAB":
                            element.setAttribute("resurl", AvastWRC.ial.sp.data.coupons[0].url);
                            element.setAttribute("newtab", true);
                            return AvastWRC.ial.sp.CouponClick.bind(AvastWRC.ial.sp);
                        case "OPEN_REDIRECT_LINK":
                            element.setAttribute("resurl", AvastWRC.ial.sp.data.redirects[0].url);
                            return AvastWRC.ial.sp.OfferClick.bind(AvastWRC.ial.sp);
                        case "OPEN_REDIRECT_LINK_NEW_TAB":
                            element.setAttribute("resurl", AvastWRC.ial.sp.data.redirects[0].url);
                            return element.setAttribute("newtab", true);
                        default:
                            return action;
                    }
                }
                function processTemplate(content){
                    const placeHolders = {
                        "{{logo}}": chrome.extension.getURL('common/ui/icons/logo-safeprice-48.png'),
                        "{{arrow:(.+)}}": '<svg class="arrow-cta" style="overflow: visible !important;" width="30px" height="11px" viewBox="0 0 6 11" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"> <g id="SP-redesign" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd"> <g id="Deep-Integration" transform="translate(-519.000000, -640.000000)" fill="{{color}}" fill-rule="nonzero"> <polygon points="525 645.5 520.553981 640 519 641.551 522.5 645.5 519 649.449 520.553981 651"></polygon> </g> </g> </svg>',
                    };

                    for (ph in placeHolders) {
                        if (placeHolders.hasOwnProperty(ph)) {
                            let matches = content.match(ph);
                            if (matches && matches[1]){ // have color
                                let phhData = matches[0].replace("{{", "").replace("}}", "").split(':');
                                content = content.replace(matches[0], placeHolders[ph]);
                                content = content.replace(`{{color}}`, phhData[1]);
                            } else {
                                content = content.replace(ph, placeHolders[ph]);
                            }
                        }
                    }

                    return content;
                }
                function insertAfter(newNode, referenceNode) {
                    referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
                }
                function insertBefore(newNode, referenceNode){
                    referenceNode.parentNode.insertBefore(newNode, referenceNode);
                }
            },
            loadNotification: function (notificationsType, data) {
                console.log("loadNotification called");
                if(data.cachedData){
                    AvastWRC.ial.sp.updatePanel(data.cachedData);
                }
                AvastWRC.ial.sp.notifications.config.values.currentData = data;
                AvastWRC.ial.sp.data.isNotification = true;

                AvastWRC.ial.sp.data.isPanelNotification = AvastWRC.ial.sp.notifications.config.values.currentData.isPanelNotification;
                
                if(AvastWRC.ial.sp.data.isPanelNotification && notificationsType === AvastWRC.ial.sp.notifications.config.notificationsType.panel){
                    if(AvastWRC.ial.sp.notifications.config.values.currentData.message !== "showLoadingNotification"){
                        AvastWRC.ial.sp.data.transactionId = AvastWRC.ial.sp.notifications.config.values.currentData.transactionId;
                        console.log("message: ", AvastWRC.ial.sp.notifications.config.values.currentData)
                        AvastWRC.ial.sp.showPanelNotification(AvastWRC.ial.sp.notifications.config.values.currentData.category);
                    }
                    return;
                }

                init(notificationsType);
                AvastWRC.ial.sp.moveExternalPanels();
                
                function init(notificationsType) {
                    let shownNotification = null;
                    switch (notificationsType) {
                        case AvastWRC.ial.sp.notifications.config.notificationsType.barRedirect:
                            shownNotification = initRedirectBarNotification();
                            break;
                        case AvastWRC.ial.sp.notifications.config.notificationsType.bar:
                            shownNotification = initBarNotification();
                            break;
                        case AvastWRC.ial.sp.notifications.config.notificationsType.minimized:
                            shownNotification = initMinimizedNotification();
                            break;
                        case AvastWRC.ial.sp.notifications.config.notificationsType.deepIntegration:
                            AvastWRC.ial.sp.notifications.initDeepIntegration();
                            break;
                    }
                    if(shownNotification){
                        sendShownNotificationFeedback();
                    }
                }

                function initRedirectBarNotification() {
                    if (AvastWRC.ial.sp.data.panelShown) return null;
                    let element = AvastWRC.ial.sp.notifications.config.notificationsContainer.redirectBar,
                    template = AvastWRC.Templates.notificationRedirectBar,
                    data = AvastWRC.ial.sp.data;
                    AvastWRC.ial.sp.topBarElement = AvastWRC.ial.sp.topBarElement || [];
                    
                    if ($('#asp-notifications-redirect-bar').length > 0) {
                        if (AvastWRC.ial.sp.topBarElement && AvastWRC.ial.sp.topBarElement[element]){
                            AvastWRC.ial.sp.topBarElement[element].remove();
                        }
                    }
                    AvastWRC.ial.sp.topBarElement[element] = AvastWRC.ial.sp.topBar(Mustache.render(template, data), element,
                    AvastWRC.ial.sp.notifications.config.values.bar.height, data.panelData.topBarRules || []);

                    if (!AvastWRC.ial.sp.notifications.config.values.eventsRegistered.barRedirect) registerStandardEvents();

                    hidePanels();
                    showNotification();
                    return true;

                    function showNotification() {
                        if(AvastWRC.ial.sp.topBarElement && AvastWRC.ial.sp.topBarElement[AvastWRC.ial.sp.notifications.config.notificationsContainer.redirectBar]){
                            AvastWRC.ial.sp.topBarElement[AvastWRC.ial.sp.notifications.config.notificationsContainer.redirectBar].show();
                        }
                        showElement(AvastWRC.ial.sp.notifications.config.notificationsContainer.redirectBar);
                    }

                    function registerStandardEvents() {
                        let closeNotificationIcon = ".asp-notifications-bar-close-icon",
                            settingsNotificationIcon = ".asp-notifications-bar-gear-icon",
                            notificationsButton = ".asp-notifications-bar-button";  

                        $(settingsNotificationIcon).click((e) => {
                            sendSettingsNotificationFeedback();
                        });

                        $(closeNotificationIcon).click((e) => {
                            AvastWRC.ial.sp.removeNotifications();
                            sendCloseNotificationFeedback();
                        });

                        $(notificationsButton).click((e) => {
                            AvastWRC.ial.sp.removeNotifications();
                            AvastWRC.ial.sp.OfferClick(e, "NOTIFICATION_BAR");
                            sendButtonClickNotificationFeedback();
                        });

                        $(notificationsButton).mousedown((e) => {
                            e.preventDefault();
                            AvastWRC.ial.addRippleEffect(e, notificationsButton, null, true);
                        });
                        AvastWRC.ial.sp.notifications.config.values.eventsRegistered.barRedirect = true;
                    }
                }

                function initBarNotification() {
                    if (AvastWRC.ial.sp.data.panelShown) return null;
                    
                    let element = AvastWRC.ial.sp.notifications.config.notificationsContainer.bar,
                    template = AvastWRC.Templates.notificationBar,
                    data = AvastWRC.ial.sp.data;

                    AvastWRC.ial.sp.topBarElement = AvastWRC.ial.sp.topBarElement || [];

                    if ($('#asp-notifications-bar').length > 0) {
                        if (AvastWRC.ial.sp.topBarElement && AvastWRC.ial.sp.topBarElement[element]){
                            AvastWRC.ial.sp.topBarElement[element].remove();
                        }
                    }                    
                    AvastWRC.ial.sp.topBarElement[element] = AvastWRC.ial.sp.topBar(Mustache.render(template, data), element,
                    AvastWRC.ial.sp.notifications.config.values.bar.height, data.panelData.topBarRules || []);


                    if (!AvastWRC.ial.sp.notifications.config.values.eventsRegistered.bar) registerStandardEvents();

                    hidePanels();
                    showNotification();

                    return true;

                    function showNotification() {
                        let currentData = AvastWRC.ial.sp.notifications.config.values.currentData,
                            currentNotificationConfig = AvastWRC.ial.sp.notifications.config.messages.injected[currentData.message];

                        hideElements(currentNotificationConfig.elementsToHide);
                        showElements(currentNotificationConfig.elementsToShow);
                        switchElements(currentNotificationConfig.elementsToSwitch);
                        showElement(currentNotificationConfig.container);
                        replaceElements(currentNotificationConfig.replace, currentData.replace);
                        showElement(AvastWRC.ial.sp.notifications.config.notificationsContainer.bar);
                        if(AvastWRC.ial.sp.topBarElement && AvastWRC.ial.sp.topBarElement[AvastWRC.ial.sp.notifications.config.notificationsContainer.bar]){
                            AvastWRC.ial.sp.topBarElement[AvastWRC.ial.sp.notifications.config.notificationsContainer.bar].show();
                        }
                    }

                    function registerStandardEvents() {
                        let closeNotificationIcon = ".asp-notifications-bar-close-icon",
                            settingsIcon = ".asp-notifications-bar-gear-icon",
                            notificationsButton = ".asp-notifications-bar-button",
                            avastIcon = ".asp-notifications-bar-logo";

                        $(settingsIcon).click((e) => {
                            sendSettingsNotificationFeedback();
                        });

                        $(closeNotificationIcon).click((e) => {
                            AvastWRC.ial.sp.removeNotifications();
                            sendCloseNotificationFeedback();
                        });

                        $(notificationsButton).click((e) => {
                            AvastWRC.ial.sp.removeNotifications();
                            AvastWRC.ial.sp.showPanel(AvastWRC.ial.sp.notifications.config.values.currentData.category);
                            sendButtonClickNotificationFeedback();
                        });

                        $(notificationsButton).mousedown((e) => {
                            e.preventDefault();
                            AvastWRC.ial.addRippleEffect(e, notificationsButton, null, true);
                        });

                        AvastWRC.ial.sp.notifications.config.values.eventsRegistered.bar = true;
                    }
                }

                function initMinimizedNotification() {
                    if (AvastWRC.ial.sp.panelShown) return null;

                    let currentData = AvastWRC.ial.sp.notifications.config.values.currentData,
                        currentNotificationConfig = AvastWRC.ial.sp.notifications.config.messages.injected[currentData.message];
                    let buttonsWithRippleEffect = AvastWRC.ial.sp.notifications.config.messages.injected.showMinimizedNotifications.buttonsWithRippleEffect;
                    let defaultPosition = JSON.parse(JSON.stringify(AvastWRC.ial.sp.PANEL_DEFAULT_POSITION));
                    if(AvastWRC.ial.sp.data.panelData.minimizedPosition && AvastWRC.ial.sp.data.panelData.minimizedPosition.position) {
                        if((AvastWRC.ial.sp.data.panelData.minimizedPosition.position.right < (document.body.clientWidth - 326)) && 
                            (AvastWRC.ial.sp.data.panelData.minimizedPosition.position.top < window.outerHeight)){
                            defaultPosition = AvastWRC.ial.sp.data.panelData.minimizedPosition.position;
                        }
                    }
                    else 
                    if (currentData.notificationSettings && currentData.notificationSettings.position) {
                        if((currentData.notificationSettings.position.right < (document.body.clientWidth - 326)) && 
                            (currentData.notificationSettings.position.top < window.outerHeight)){
                            defaultPosition = currentData.notificationSettings.position;
                        }
                    }
                    let element = AvastWRC.ial.sp.notifications.config.notificationsContainer.minimized;
                    if($(element).length <= 0){
                        AvastWRC.ial.prependTemplate(Mustache.render(AvastWRC.Templates.safeShopMinimizedPanel, AvastWRC.ial.sp.data));
                    }                    
                    // In case that notifications weren't available, it takes badge from panel
                    if (!AvastWRC.ial.sp.notifications.config.values.eventsRegistered.minimized) registerEvents();
                    replaceElements(currentNotificationConfig.replace, currentData.replace ? currentData.replace.filter((item) => Number.isInteger(item)) : []);
                    showElements(currentNotificationConfig.elementsToShow);
                    showElement(AvastWRC.ial.sp.notifications.config.notificationsContainer.minimized);
                    showElement(AvastWRC.ial.sp.notifications.config.notificationsContainer.minimizedCircle);
                    showElement(AvastWRC.ial.sp.notifications.config.notificationsContainer.minimizedBadge);
                    showElement(AvastWRC.ial.sp.notifications.config.notificationsContainer.minimizedInnerCircle);
                    hideElements(currentNotificationConfig.elementsToHide);
                    showNotification();
                    AvastWRC.ial.sp.notifications.config.values.eventsRegistered.minimized = true;
                    AvastWRC.ial.sp.notifications.initDeepIntegration();
                    return true;
                    
                    function registerEvents() {
                        AvastWRC.ial.sp.makeDraggable(
                            document.getElementById(AvastWRC.ial.sp.notifications.config.notificationsContainer.minimized.replace("#", "")),
                            null,
                            () => {
                                let newPosition = $(AvastWRC.ial.sp.notifications.config.notificationsContainer.minimized).positionRight() || defaultPosition;
                                AvastWRC.ial.sp.feedback({
                                    type: 'minimized_ui_dragged_ended',
                                    position: newPosition
                                });
                                AvastWRC.ial.sp.data.panelData.minimizedPosition.position = newPosition;
                            }

                        );
                        AvastWRC.ial.sp.BindMinPanelEvents();
                        AvastWRC.ial.sp.addRippleEffectToButtonsWithSpecificColor(buttonsWithRippleEffect);
                    }

                    function showNotification() {
                        $(AvastWRC.ial.sp.notifications.config.notificationsContainer.minimized).css(defaultPosition);

                        if (AvastWRC.ial.sp.data.isNotification){
                            if (currentData.animationsSettings && currentData.animationsSettings.minimized) {
                                const animationData = currentData.animationsSettings.minimized;
                                const minimizedEl = AvastWRC.ial.sp.notifications.config.notificationsContainer.minimizedCircle;
                                const badgeEl = AvastWRC.ial.sp.notifications.config.notificationsContainer.minimizedBadge;
                                const innerEl = AvastWRC.ial.sp.notifications.config.notificationsContainer.minimizedInnerCircle;
                                const interval = currentData.animationsSettings.minimized.interval || 0;

                                if (animationData.type === "PULSE") {
                                    $(minimizedEl).addClass("a-sp-notifications-appear-pulse-animation");
                                    $(innerEl).addClass("a-sp-circle-animation");
                                    $(badgeEl).addClass("a-sp-notifications-pulse-animation");
                                } else if (animationData.type === "BADGE_PULSE") {
                                    $(badgeEl).addClass("a-sp-notifications-pulse-animation");
                                }

                                if (interval > 0) {
                                    AvastWRC.ial.sp.animations['PULSE'] = setInterval(() => {
                                        if (animationData.type === "PULSE") {
                                            resetAnimation(minimizedEl, ["a-sp-notifications-appear-pulse-animation", "a-sp-notifications-pulse-animation"]);
                                            resetAnimation(innerEl, "a-sp-circle-animation");
                                            resetAnimation(badgeEl, "a-sp-notifications-pulse-animation");
                                        } else if (animationData.type === "BADGE_PULSE") {
                                            resetAnimation(badgeEl, "a-sp-notifications-pulse-animation");
                                        }
                                    }, interval);
                                }
                            }
                        }
                        //$(AvastWRC.ial.sp.notifications.config.notificationsContainer.minimized).addClass(AvastWRC.ial.sp.notifications.config.classForNotificationAnimation);
                        //$(AvastWRC.ial.sp.notifications.config.notificationsContainer.minimizedBadge).addClass(AvastWRC.ial.sp.notifications.config.classForNotificationAnimation);
                    }
                }

                function resetAnimation(el, animationClass){
                    if (Array.isArray(animationClass)){
                        for (let cl in animationClass){
                            $(el).removeClass(animationClass[cl]);
                        }
                        animationClass = animationClass.pop();
                    } else {
                        $(el).removeClass(animationClass);
                    }
                    setTimeout(() => {
                        $(el).addClass(animationClass);
                    }, 1);
                }

                function sendSettingsNotificationFeedback() {
                    let data = AvastWRC.ial.sp.data, currentData = AvastWRC.ial.sp.notifications.config.values.currentData;

                    AvastWRC.ial.sp.feedback({
                        type: 'notifications_events',
                        action: "settings_click",
                        urlDomain: data.urlDomain,
                        url: currentData.url,
                        mesageCategory: currentData.message,
                        category: currentData.category,
                        notificationType: currentData.notificationType,
                        campaignId: data.campaignId,
                        showABTest: data.showABTest,
                        referrer: data.referrer || "",
                        transactionId: currentData.transactionId || "",
                        ruleId: AvastWRC.ial.sp.lastRuleClicked || null
                    });
                }

                function sendCloseNotificationFeedback() {
                    let data = AvastWRC.ial.sp.data, currentData = AvastWRC.ial.sp.notifications.config.values.currentData;

                    AvastWRC.ial.sp.feedback({
                        type: 'notifications_events',
                        action: "close_click",
                        urlDomain: data.urlDomain,
                        url: currentData.url,
                        mesageCategory: currentData.message,
                        category: currentData.category,
                        categoryFlag: currentData.notificationCategoryFlag,
                        notificationType: currentData.notificationType,
                        campaignId: data.campaignId,
                        showABTest: data.showABTest,
                        referrer: data.referrer || "",
                        transactionId: currentData.transactionId || "",
                        ruleId: AvastWRC.ial.sp.lastRuleClicked || null
                    });

                    AvastWRC.ial.sp.moveExternalPanels(0);
                    AvastWRC.ial.sp.closeTooltip.show();
                }

                function sendButtonClickNotificationFeedback( ruleId = "000") {
                    let data = AvastWRC.ial.sp.data, currentData = AvastWRC.ial.sp.notifications.config.values.currentData;

                    AvastWRC.ial.sp.feedback({
                        type: 'notifications_events',
                        action: "button_click",
                        mesageCategory: currentData.message,
                        category: currentData.category,
                        notificationType: currentData.notificationType,
                        urlDomain: data.urlDomain,
                        url: currentData.url,
                        campaignId: data.campaignId,
                        showABTest: data.showABTest,
                        referrer: data.referrer || "",
                        transactionId: currentData.transactionId || "",
                        ruleId: ruleId
                    });
                }

                function sendShownNotificationFeedback(ruleId = "000") {
                    let data = AvastWRC.ial.sp.data,
                        currentData = AvastWRC.ial.sp.notifications.config.values.currentData,
                        defaultMessage = "notifications_events";
                    if(currentData.category !== "DEAL_SEARCH"){
                        AvastWRC.ial.sp.feedback({
                            type: AvastWRC.ial.sp.notifications.config.messages.injected[currentData.message].notificationType || defaultMessage,
                            action: "shown",
                            mesageCategory: currentData.message,
                            category: currentData.category,
                            notificationType: currentData.notificationType,
                            urlDomain: data.urlDomain,
                            url: currentData.url,
                            campaignId: data.campaignId,
                            showABTest: data.showABTest,
                            referrer: data.referrer || "",
                            transactionId: currentData.transactionId || "",
                            minimizedWithCoupons: data.couponsLength > 0,
                            ruleId: ruleId
                        });
                    }
                }

                function hidePanels() {
                    let panels = {
                        min: "#asp-panel-min",
                        standard: ".a-sp-panel",
                        showToggleClass: "asp-sas-display-block",
                        hideToggleClass: "asp-sas-display-none"
                    };

                    $(panels.standard).removeClass(panels.showToggleClass).addClass(panels.hideToggleClass);
                    $(panels.min).addClass(AvastWRC.ial.sp.notifications.config.classForHidden);
                }

                function hideElement(element, classForHiding = AvastWRC.ial.sp.notifications.config.classForHidden) {
                    classForHiding ? $(element).addClass(classForHiding) : $(element).hide();
                }

                function showElement(element, classToAvoidHidden = AvastWRC.ial.sp.notifications.config.classForHidden) {
                    classToAvoidHidden ? $(element).removeClass(classToAvoidHidden) : $(element).show();
                }

                function hideElements(elements = []) {
                    for (let i = 0; i < elements.length; i++) {
                        hideElement(elements[i]);
                    }
                }

                function showElements(elements = []) {
                    for (let i = 0; i < elements.length; i++) {
                        showElement(elements[i]);
                    }
                }

                function replaceElements(elements = [], values = []) {
                    for (let i = 0; i < elements.length; i++) {
                        if (typeof elements[i] === "object") {
                            setTimeout(() => {
                                $(elements[i].el).attr(elements[i].prop, elements[i].val)
                            }, elements[i].timeout || 0)
                        } else {
                            $(elements[i]).text(values[i]);
                        }
                    }
                }

                function switchElements(elements = []) {
                    for (let i = 0; i < elements.length; i++) {
                        setTimeout(() => {
                            $(elements[i].hide).addClass(elements[i].class);
                            $(elements[i].show).removeClass(elements[i].class);
                        }, elements[i].timeout || 0)
                    }
                }
            },
            config: {
                messages: {
                    injected: {
                        applyDeepIntegration: {
                          key: "message.applyDeepIntegration",
                          action: ((data) => AvastWRC.ial.sp.notifications.applyDeepIntegration(data))
                        },
                        showOffersBarNotification: {
                            key: "message.showOffersBarNotification",
                            container: ".asp-notifications-bar-offers",
                            elementsToShow: [".asp-notifications-bar-button"],
                            elementsToSwitch: [{
                                show: ".asp-notifications-bar-offers >.asp-notifications-bar-image-animated",
                                hide: ".asp-notifications-bar-offers > .asp-notifications-bar-image",
                                class: "asp-notification-bar-image-hidden",
                                timeout: 2060
                            }],
                            replace: [".asp-notifications-bar-button-badge-text"],
                            action: ((data) => AvastWRC.ial.sp.notifications.showBarNotification(data))
                        },
                        showCouponsBarNotification: {
                            key: "message.showCouponsBarNotification",
                            container: ".asp-notifications-bar-coupons",
                            elementsToShow: [".asp-notifications-bar-button"],
                            elementsToSwitch: [{
                                show: ".asp-notifications-bar-coupons > .asp-notifications-bar-image-animated",
                                hide: ".asp-notifications-bar-coupons > .asp-notifications-bar-image",
                                class: "asp-notification-bar-image-hidden",
                                timeout: 1820
                            }],
                            replace: [".asp-notifications-bar-button-badge-text"],
                            action: ((data) => AvastWRC.ial.sp.notifications.showBarNotification(data))
                        },
                        showOffersAndCouponsBarNotification: {
                            key: "message.showOffersAndCouponsBarNotification",
                            container: ".asp-notifications-bar-offers-and-coupons",
                            elementsToShow: [".asp-notifications-bar-button"],
                            replace: [".asp-notifications-bar-button-badge-text"],
                            elementsToSwitch: [{
                                show: ".asp-notifications-bar-offers-and-coupons > .asp-notifications-bar-image-animated",
                                hide: ".asp-notifications-bar-offers-and-coupons > .asp-notifications-bar-image",
                                class: "asp-notification-bar-image-hidden",
                                timeout: 1980
                            }],
                            action: ((data) => AvastWRC.ial.sp.notifications.showBarNotification(data))
                        },
                        showCityHotelsBarNotification: {
                            key: "message.showCityHotelsBarNotification",
                            container: ".asp-notifications-bar-popular-hotels",
                            elementsToShow: [".asp-notifications-bar-button"],
                            elementsToSwitch: [{
                                show: ".asp-notifications-bar-popular-hotels > .asp-notifications-bar-image-animated",
                                hide: ".asp-notifications-bar-popular-hotels >  .asp-notifications-bar-image",
                                class: "asp-notification-bar-image-hidden",
                                timeout: 1820
                            }],
                            replace: [".asp-notifications-bar-city-text", ".asp-notifications-bar-button-badge-text"],
                            action: ((data) => AvastWRC.ial.sp.notifications.showBarNotification(data))
                        },
                        showSimilarHotelsBarNotification: {
                            key: "message.showSimilarHotelsBarNotification",
                            container: ".asp-notifications-bar-alt-hotels",
                            elementsToShow: [".asp-notifications-bar-button"],
                            replace: [".asp-notifications-bar-button-badge-text"],
                            elementsToSwitch: [{
                                show: ".asp-notifications-bar-alt-hotels > .asp-notifications-bar-image-animated",
                                hide: ".asp-notifications-bar-alt-hotels > .asp-notifications-bar-image",
                                class: "asp-notification-bar-image-hidden",
                                timeout: 2980
                            }],
                            action: ((data) => AvastWRC.ial.sp.notifications.showBarNotification(data))
                        },
                        showRedirectBarNotification: {
                            key: "message.showRedirectBarNotification",
                            action: ((data) => AvastWRC.ial.sp.notifications.showRedirectNotification(data, AvastWRC.Templates.notificationRedirectBar, AvastWRC.ial.sp.notifications.config.notificationsType.barRedirect))
                        },
                        showMinimizedNotifications: {
                            key: "message.showMinimizedNotifications",
                            action: ((data) => AvastWRC.ial.sp.notifications.showMinimizedNotification(data)),
                            replace: [".asp-panel-badge-text"],
                            notificationType: "minimized_ui_shown",
                            elementsToShow: [".asp-panel-badge"],
                            buttonsWithRippleEffect: [{
                                button: "#asp-panel-minimized-top-circle",
                                color: "#e2e2e9"
                            }]
                        },
                        showPanelMinNotifications: {
                            key: "message.showPanelMinNotifications",
                            action: ((data) => AvastWRC.ial.sp.notifications.showPanelMinNotifications(data))
                        },
                        showPanelNotifications: {
                            key: "message.showPanelNotifications",
                            action: ((data) => AvastWRC.ial.sp.notifications.showPanelNotifications(data))
                        },
                    },
                    background: {}
                },
                notificationsType: {
                    redirect: "REDIRECT",
                    barRedirect: "BAR_REDIRECT",
                    bar: "BAR",
                    minimized: "MINIMIZED",
                    panelMinimized: "PANEL_MINIMIZED",
                    fakeShop: "SECURITY",
                    deepIntegration: "DEEP_INTEGRATION",
                    panel: "PANEL"
                },
                notificationsContainer: {
                    bar: "#asp-notifications-bar",
                    redirectBar: "#asp-notifications-redirect-bar",
                    minimized: "#asp-panel-min",
                    minimizedCircle: "#asp-panel-min-circle",
                    minimizedBadge: "#asp-panel-min-badge",
                    minimizedInnerCircle: "#asp-panel-minimized-inner-circle",
                    panel: "#a-panel",
                },
                classForHidden: "a-sp-notifications-hidden",
                classForNotificationAnimation: "a-sp-notifications-animation",
                values: {
                    eventsRegistered: {
                        redirect: false,
                        barRedirect: false,
                        minimized: false
                    },
                    currentData: null,
                    bar: {
                        height: "60px"
                    }
                }
            }
        },

        userFeedback: {
            prepareTemplate: function (data = {}) {
                if ($(AvastWRC.ial.sp.userFeedback.config.containers.mainContainer).length <= 0) {
                    AvastWRC.ial.prependTemplate(Mustache.render(AvastWRC.Templates.feedback, data));
                    this.registerEvents();
                }
            },
            registerEvents: function () {
                let self = AvastWRC.ial.sp.userFeedback;

                AvastWRC.ial.sp.addRippleEffectToButtons(self.config.buttonsWithRippleEffect);

                registerMainFeedbackEvents();
                registerPositiveFeedbackEvents();
                registerNegativeFeedbackEvents();

                function registerMainFeedbackEvents() {
                    $(self.config.actionElements.main.yesButton).click(showPositiveFeedback);
                    $(self.config.actionElements.main.noButton).click(showNegativeFeedback);
                    $(self.config.actionElements.main.askMeLaterButton).click(askMeLaterFeedback);

                    function showPositiveFeedback() {
                        self.sendFeedback(self.config.events.mainFeedback.type, self.config.events.mainFeedback.actions.rateButtonClicked);
                        hideQuestionFeedback();
                        self.showElement(self.config.containers.positiveFeedbackContainer);
                        self.sendFeedback(self.config.events.positiveFeedback.type, self.config.events.positiveFeedback.actions.shown);
                    }

                    function showNegativeFeedback() {
                        self.sendFeedback(self.config.events.mainFeedback.type, self.config.events.mainFeedback.actions.feedbackButtonClicked);
                        hideQuestionFeedback();
                        self.showElement(self.config.containers.negativeFeedbackContainer);
                        self.sendFeedback(self.config.events.negativeFeedback.type, self.config.events.negativeFeedback.actions.shown);
                    }

                    function hideQuestionFeedback() {
                        self.hideElement(self.config.containers.questionContainer);
                    }

                    function askMeLaterFeedback() {
                        self.hideElement(self.config.containers.mainContainer);
                        self.sendFeedback(self.config.events.mainFeedback.type, self.config.events.mainFeedback.actions.askMeLaterClicked);
                    }
                }

                function registerPositiveFeedbackEvents() {
                    $(self.config.actionElements.positive.closeIcon).click(closePositiveFeedback);
                    $(self.config.actionElements.positive.rateButton).click(openPositiveFeedback);

                    function closePositiveFeedback() {
                        self.sendFeedback(self.config.events.positiveFeedback.type, self.config.events.positiveFeedback.actions.closeButtonClicked);
                        self.hideElement(self.config.containers.mainContainer);
                    }

                    function openPositiveFeedback() {
                        self.sendFeedback(self.config.events.positiveFeedback.type, self.config.events.positiveFeedback.actions.rateClicked);
                        self.hideElement(self.config.containers.mainContainer);
                    }
                }

                function registerNegativeFeedbackEvents() {
                    $(self.config.actionElements.negative.closeIcon).click(closeNegativeFeedback);
                    $(self.config.actionElements.negative.feedbackButton).click(openNegativeFeedbackPage);

                    function closeNegativeFeedback() {
                        self.sendFeedback(self.config.events.negativeFeedback.type, self.config.events.negativeFeedback.actions.closeButtonClicked);
                        self.hideElement(self.config.containers.mainContainer);
                    }

                    function openNegativeFeedbackPage() {
                        self.sendFeedback(self.config.events.negativeFeedback.type, self.config.events.negativeFeedback.actions.rateClicked);
                        self.hideElement(self.config.containers.mainContainer);
                    }
                }
            },
            showFeedbackQuestion: function () {
                let delay = 1000, self = this;

                if (self.feedbackAlreadyShown || !AvastWRC.ial.sp.data.feedbackInfo) return;

                setTimeout(function () {
                    AvastWRC.ial.sp.userFeedback.showElement(AvastWRC.ial.sp.userFeedback.config.containers.mainContainer);
                    self.feedbackAlreadyShown = true;
                    AvastWRC.ial.sp.data.feedbackInfo.askForFeedback = false;
                    self.sendFeedback(self.config.events.mainFeedback.type, self.config.events.mainFeedback.actions.shown);
                }, delay);
            },
            sendFeedback: function (type, action) {
                let commonDataEvents = AvastWRC.ial.sp.data;

                AvastWRC.ial.sp.feedback({
                    type: type,
                    action: action,
                    urlDomain: commonDataEvents.urlDomain,
                    url: commonDataEvents.url,
                    campaignId: commonDataEvents.campaignId,
                    showABTest: commonDataEvents.showABTest,
                    referrer: commonDataEvents.referrer || "",
                    transactionId: commonDataEvents.transactionId || "",
                    ruleId: AvastWRC.ial.sp.lastRuleClicked || null
                });
            },
            hideElement: function (element, classForHidden = this.config.classForHidden) {
                classForHidden ? $(element).addClass(classForHidden) : $(element).hide();
            },
            showElement: function (element, classToCancelHidden = this.config.classForHidden) {
                classToCancelHidden ? $(element).removeClass(classToCancelHidden) : $(element).show();
            },
            config: {
                buttonsWithRippleEffect: [".a-sp-feedback-question-buttons-yes", ".a-sp-feedback-question-buttons-no", ".a-sp-feedback-action-button-content"],
                classForHidden: "a-sp-feedback-hidden",
                containers: {
                    mainContainer: "#a-sp-feedback-container",
                    questionContainer: "#a-sp-feedback-action-question",
                    positiveFeedbackContainer: "#a-sp-feedback-action-positive",
                    negativeFeedbackContainer: "#a-sp-feedback-action-negative",
                },
                actionElements: {
                    main: {
                        yesButton: ".a-sp-feedback-question-buttons-yes",
                        noButton: ".a-sp-feedback-question-buttons-no",
                        askMeLaterButton: ".a-sp-feedback-question-later"
                    },
                    positive: {
                        closeIcon: "#a-sp-feedback-action-close-positive",
                        rateButton: "#a-sp-feedback-action-button-positive",
                    },
                    negative: {
                        closeIcon: "#a-sp-feedback-action-close-negative",
                        feedbackButton: "#a-sp-feedback-action-button-negative",
                    }
                },
                events: {
                    mainFeedback: {
                        type: "feedback_main",
                        actions: {
                            shown: "shown",
                            rateButtonClicked: "clicked_rate_good",
                            feedbackButtonClicked: "clicked_rate_bad",
                            askMeLaterClicked: "clicked_ask_me_later"
                        }
                    },
                    positiveFeedback: {
                        type: "feedback_like",
                        actions: {
                            shown: "shown",
                            closeButtonClicked: "clicked_x",
                            rateClicked: "clicked_cta",
                        }
                    },
                    negativeFeedback: {
                        type: "feedback_dislike",
                        actions: {
                            shown: "shown",
                            closeButtonClicked: "clicked_x",
                            rateClicked: "clicked_cta",
                        }
                    }
                },
                feedbackAlreadyShown: false
            }
        },

        socialSharing: {
            init: function () {
                this.registerEvents();
            },
            registerEvents: function () {
                let self = this;

                //this.sendShownFeedback();

                $(this.config.mainElement).find("*").off();
                AvastWRC.ial.sp.addRippleEffectToButtonsWithSpecificColor(this.config.buttonsWithRippleEffect);

                changeSocialIconsOnHover();
                shareOnFbOnClickedButton();
                shareOnTttrOnClickedButton();
                hideSocialCardOnClickedIconClose();

                this.config.eventsRegistered = true;

                function changeSocialIconsOnHover() {
                    for (let i = 0; i < self.config.iconActiveElements.length; i++) {
                        let currentElement = self.config.actionElements[self.config.iconActiveElements[i]];

                        $(currentElement.button).mouseenter(function () {
                            $(currentElement.iconElement).addClass(self.config.classForHidden);
                            $(currentElement.iconActiveElement).removeClass(self.config.classForHidden);
                        }).mouseleave(function () {
                            $(currentElement.iconActiveElement).addClass(self.config.classForHidden);
                            $(currentElement.iconElement).removeClass(self.config.classForHidden);
                        });
                    }
                }

                function shareOnFbOnClickedButton() {
                    let fbButton = self.config.actionElements.fb;

                    $(fbButton.button).click(function () {
                        self.sendFeedback(fbButton.clickedEvent);
                    });
                }

                function shareOnTttrOnClickedButton() {
                    let tttrButton = self.config.actionElements.tttr;

                    $(tttrButton.button).click(function () {
                        self.sendFeedback(tttrButton.clickedEvent);
                    });
                }

                function hideSocialCardOnClickedIconClose() {
                    let iconCloseElement = self.config.actionElements.closeIcon;

                    $(iconCloseElement.icon).click(function () {
                        self.sendFeedback(iconCloseElement.clickedEvent);
                        self.config.isOnTop = false;
                        self.config.itWasClosed = true;
                        $("#couponsWrapper "+self.config.mainElement).addClass(self.config.classForHidden);

                    });
                }
            },
            sendFeedback: function (action) {
                let commonDataEvents = AvastWRC.ial.sp.data, socialCardEventType = "social_card",
                    categories = AvastWRC.ial.sp.socialSharing.config.events.categories;

                AvastWRC.ial.sp.feedback({
                    type: socialCardEventType,
                    action: action,
                    urlDomain: commonDataEvents.urlDomain,
                    url: commonDataEvents.url,
                    category: AvastWRC.ial.sp.socialSharing.config.isOnTop ? categories.top : categories.bottom,
                    uiSource: (commonDataEvents.activeTab === "OFFERS_TAB_HIGHLIGHTED") ? "main_ui_offers_tab" : (commonDataEvents.activeTab === "COUPONS_TAB_HIGHLIGHTED") ? "main_ui_coupons_tab" : 0,
                    campaignId: commonDataEvents.campaignId,
                    showABTest: commonDataEvents.showABTest,
                    referrer: commonDataEvents.referrer || "",
                    transactionId: commonDataEvents.transactionId || "",
                    socialData: commonDataEvents.social || null,
                    ruleId: AvastWRC.ial.sp.lastRuleClicked || null
                });
            },
            sendShownFeedback: function () {
                if (AvastWRC.ial.sp.data && AvastWRC.ial.sp.data.social && AvastWRC.ial.sp.data.social.isPowerSocialUser) this.sendFeedback(this.config.events.shown);
            },
            moveCardToTop: function () {
                let self = this;

                if (this.config.itWasClosed || !AvastWRC.ial.sp.data.social.showInTop) return;

                showOnTop();
                self.registerEvents();
                this.sendShownFeedback();

                function showOnTop() {
                    let backgroundClass = "a-sp-social-top", closeIcon = "#couponsWrapper .a-sp-social-close-img",
                        closeIconVisibilityClass = "a-sp-social-close-img-visible",
                        container = "#couponsWrapper";

                    $(AvastWRC.ial.sp.socialSharing.getMainElement()).addClass(self.config.classForHidden);
                    $(AvastWRC.ial.sp.socialSharing.getMainElement()).addClass(backgroundClass);
                    $(closeIcon).addClass(closeIconVisibilityClass);
                    $(AvastWRC.ial.sp.socialSharing.getMainElement()).prependTo(container);
                    self.config.isOnTop = true;
                    self.animateSocialCard();
                }
            },
            animateSocialCard: function () {
                let self = this;

                $(AvastWRC.ial.sp.socialSharing.getMainElement()).css({
                    "top": (-1 * this.config.height) + 'px',
                    "opacity": 0
                });

                $(AvastWRC.ial.sp.socialSharing.getMainElement()).removeClass(self.config.classForHidden);
                AvastWRC.ial.sp.scrollTop(0, self.config.height);

                $(AvastWRC.ial.sp.socialSharing.getMainElement()).animate({
                    "opacity": 1
                }, {duration: 1240, queue: false});

                $(AvastWRC.ial.sp.socialSharing.getMainElement()).animate({
                    "top": '+=' + self.config.height,
                }, {duration: 440, queue: false}, function () {
                    $(AvastWRC.ial.sp.socialSharing.getMainElement()).attr("style", "");
                });

                AvastWRC.ial.sp.scrollTop(1040, 0);
            },
            getCurrentHeightOnTop: function () {
                return this.config.isOnTop ? $(AvastWRC.ial.sp.socialSharing.getMainElement()).outerHeight(true) : 0;
            },
            getContainerId: function () {
                return this.config.mainElement.replace("#", "");
            },
            getCurrentHTMLOnTop: function () {
                return this.config.isOnTop ? $(AvastWRC.ial.sp.socialSharing.getMainElement())[0].outerHTML : "";
            },
            getMainElement: function () {
                return this.config.tabsContainers[AvastWRC.ial.sp.data.activeTab]+this.config.mainElement;
            },
            config: {
                buttonsWithRippleEffect: [
                    {button: ".a-sp-social-buttons-fb-container", color: "#375490"},
                    {button: ".a-sp-social-buttons-tttr-container", color: "#188dd4"}
                ],
                actionElements: {
                    fb: {
                        button: ".a-sp-social-buttons-fb-container",
                        iconElement: ".a-sp-social-buttons-fb-img",
                        iconActiveElement: ".a-sp-social-buttons-fb-img-action",
                        clickedEvent: "clicked_f"
                    },
                    tttr: {
                        button: ".a-sp-social-buttons-tttr-container",
                        iconElement: ".a-sp-social-buttons-tttr-img",
                        iconActiveElement: ".a-sp-social-buttons-tttr-img-action",
                        clickedEvent: "clicked_t"
                    },
                    closeIcon: {
                        icon: ".a-sp-social-close-img",
                        clickedEvent: "clicked_x"
                    }
                },
                iconActiveElements: ["fb", "tttr"],
                events: {
                    shown: "shown",
                    categories: {
                        top: "top",
                        bottom: "bottom"
                    }
                },
                tabsContainers: {
                    "OFFERS_TAB_HIGHLIGHTED": "#offersWrapper ",
                    "COUPONS_TAB_HIGHLIGHTED": "#couponsWrapper ",
                    "OTHERS_TAB_HIGHLIGHTED": "#othersWrapper ",
                    "":""
                },
                eventsRegistered: false,
                classForHidden: "a-sp-social-hidden",
                mainElement: "#a-sp-social-container",
                isOnTop: false,
                itWasClosed: false,
                height: 106
            }
        },

        closeTooltip: {
            show: function () {
                let container = AvastWRC.ial.sp.closeTooltip.config.containerId,
                    toggleClass = AvastWRC.ial.sp.closeTooltip.config.classForHidden;

                if ( !AvastWRC.ial.sp.data 
                    || !AvastWRC.ial.sp.data.closeTooltipInfo 
                    || (AvastWRC.ial.sp.data.feedbackInfo && AvastWRC.ial.sp.data.feedbackInfo.askForFeedback) 
                    || (AvastWRC.ial.sp.data.closeTooltipInfo && !AvastWRC.ial.sp.data.closeTooltipInfo.show)) return;

                clearTimeout(AvastWRC.ial.sp.closeTooltip.config.hideTimeout);
                AvastWRC.ial.prependTemplate(Mustache.render(AvastWRC.Templates.closeTooltip, AvastWRC.ial.sp.data.panelData.closeTooltip));
                $(AvastWRC.ial.sp.closeTooltip.config.buttonId).click(AvastWRC.ial.sp.closeTooltip.onClick);
                $(AvastWRC.ial.sp.closeTooltip.config.buttonId).mousedown(AvastWRC.ial.sp.closeTooltip.onMouseDown);
                AvastWRC.ial.sp.closeTooltip.config.hideTimeout = setTimeout(AvastWRC.ial.sp.closeTooltip.hide, 10000);

                $(container).addClass(toggleClass).delay(500).queue(function (next) {
                    $(this).removeClass(toggleClass);
                    next();
                });
                AvastWRC.ial.sp.closeTooltip.sendCloseTooltipFeedback("SHOWN");
            },
            onClick: function () {
                AvastWRC.ial.sp.closeTooltip.hide();
                AvastWRC.ial.sp.closeTooltip.sendCloseTooltipFeedback("CLICKED_CTA");
                AvastWRC.ial.sp.closeTooltip.disable();
            },
            onMouseDown: function (e) {
                AvastWRC.ial.addRippleEffect(e, "#a-sp-close-tooltip-button-got-it", null, true);
            },
            hide: function () {
                $(AvastWRC.ial.sp.closeTooltip.config.containerId).addClass(AvastWRC.ial.sp.closeTooltip.config.classForHidden);
                AvastWRC.ial.sp.closeTooltip.sendCloseTooltipFeedback("HIDE");
            },
            disable: function () {
                if(AvastWRC.ial.sp.data && AvastWRC.ial.sp.data.closeTooltipInfo){
                    AvastWRC.ial.sp.data.closeTooltipInfo.show = false;
                }
            },
            sendCloseTooltipFeedback: function (action) {
                var data = AvastWRC.ial.sp.data;
                if(!data)return;
                AvastWRC.ial.sp.feedback({
                    type: "TOOLTIP_CLICK_X",
                    action: action,
                    urlDomain: data.urlDomain || "",
                    campaignId: data.campaignId || "",
                    referrer: data.referrer || "",
                    transactionId: data.transactionId || "",
                    url: data.url,
                    ruleId: AvastWRC.ial.sp.lastRuleClicked || null
                });
            },
            config: {
                classForHidden: "asp-sas-display-none",
                containerId: "#a-sp-close-tooltip-container",
                buttonId: "#a-sp-close-tooltip-button-got-it",
                hideTimeout: null
            }
        },

        commonSelectors: {
            couponsWrapper: "#couponsWrapper",
            firstCouponsSeparator: "#couponsWrapper > .asp-separator-text-first",
            secondCouponsSeparators: "#couponsWrapper > .asp-separator-text",
            scroll: ".a-sp-items-wrapper"
        }
    };

    /* Register SafePrice Event handlers */
    AvastWRC.ial.registerEvents(function (ee) {
        ee.on('message.checkSafeShop',
            AvastWRC.ial.sp.checkSafeShop.bind(AvastWRC.ial.sp));
        // new events
        ee.on('message.createPanel',
            AvastWRC.ial.sp.createPanel.bind(AvastWRC.ial.sp));
        ee.on('message.createFakeShopNotification',
            AvastWRC.ial.sp.createFakeShopNotification.bind(AvastWRC.ial.sp));
        ee.on('message.createPhishingDomainNotification',
            AvastWRC.ial.sp.createFakeShopNotification.bind(AvastWRC.ial.sp));
        ee.on('message.updatePanel',
            AvastWRC.ial.sp.updatePanel.bind(AvastWRC.ial.sp));
        ee.on('message.extensionIconClicked',
            AvastWRC.ial.sp.extensionIconClicked.bind(AvastWRC.ial.sp));
        ee.on('message.applyCouponInTab',
            AvastWRC.ial.sp.applyCouponInTab.bind(AvastWRC.ial.sp));
        ee.on('message.updatePanelWithSearch',
            AvastWRC.ial.sp.updatePanelWithSearch.bind(AvastWRC.ial.sp));
        ee.on('message.closeTooltipShown', 
            AvastWRC.ial.sp.closeTooltip.disable);
        ee.on('message.showPanelInInstallPage',
            AvastWRC.ial.sp.showPanelInInstallPage.bind(AvastWRC.ial.sp));
        ee.on('message.hideSettingsTooltip', 
            AvastWRC.ial.sp.hideSettingsTooltip.bind(AvastWRC.ial.sp));
        AvastWRC.ial.sp.notifications.registerEventsMessage(ee);
    });

    $(document).ready(function () {
        setTimeout(function () {
            AvastWRC.ial.sp.removeUnsafeFromImages();
        }, 500);
        AvastWRC.ial.sp.checkSafeShopDataConst.readyEventTriggered = true;
        console.log("ready: before call parse for last time", AvastWRC.ial.sp.checkSafeShopDataConst);
        if(AvastWRC.ial.sp.checkSafeShopDataConst.error && AvastWRC.ial.sp.checkSafeShopDataConst.data && AvastWRC.ial.sp.checkSafeShopDataConst.locationUrl === document.location.href){
            console.log("ready: parse again");
            AvastWRC.ial.sp.parseSite(AvastWRC.ial.sp.checkSafeShopDataConst.data);
            AvastWRC.ial.sp.checkSafeShopDataConst.parsedOnReady = true;
        }
    });

}).call(this, $);
