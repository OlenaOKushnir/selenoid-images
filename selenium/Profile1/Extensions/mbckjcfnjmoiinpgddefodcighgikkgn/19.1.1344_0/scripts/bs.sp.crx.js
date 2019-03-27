/*******************************************************************************
 *  avast! browsers extensions
 *  (c) 2012-2014 Avast Corp.
 *
 *******************************************************************************
 *
 *  Background Browser Specific - Core Chrome Extensions functionality
 *
 ******************************************************************************/

(function (_) {


    var bal = null; //AvastWRC.bal instance - browser agnostic

    /**
     * User has change from tab to tab or updated an url in the tab
     *
     * @param  {String} url    Site url loaded into the tab
     * @param  {Object} tab    Tab object reference
     * @param  {String} change Status of the tab (loading or undefined)
     * @param  {AvastWRC.gpb.All.EventType} event Represents event that was fired
     * @return {void}
     */
    function urlInfoChange(url, tab, change, event) {

        AvastWRC.TabReqCache.set(tab.id,"last_url_in_tab", {url: url, tab: tab});

        if(AvastWRC.bal && AvastWRC.bal.sp && AvastWRC.bal.sp.isCouponInTab(url, tab))return;

        else{
            console.log("urlInfoChange no coupons to show perform urlInfo");
            AvastWRC.UtilsCache.remove("closed_applied_coupon", tab.id);
        }

        if (AvastWRC.CONFIG.ENABLE_WEBREP_CONTROL) {
            var urlDetails = [url];

            if (tab.id) {
                urlDetails = {
                    url: url,
                    referer: AvastWRC.TabReqCache.get(tab.id, "referer"),
                    tabNum: tab.id,
                    windowNum: tab.windowId,
                    reqServices: bal.reqUrlInfoServices,
                    tabUpdated: event,
                    originHash: AvastWRC.bal.utils.getHash(url + tab.id + tab.windowId),
                    origin: AvastWRC.TabReqCache.get(tab.id, "origin"),
                    customKeyValue: AvastWRC.Queue.get("pageTitle")
                };
            }

            urlDetails.reqServices |= 0x0100; // ajax
            if(AvastWRC.Utils.reportPhishingDomain()) {
                urlDetails.reqServices |= 0x0002; // phishing info
            }            

            // perform urlinfo
            var urlInfo = new Promise((resolve, reject) => {
                AvastWRC.getUrlInfo(urlDetails, (result)=>{
                    var lastUrl = AvastWRC.TabReqCache.get(tab.id,"last_url_in_tab");
                    
                    let data = result[0] || result;

                    if (!data || (lastUrl && lastUrl.url !== data.url)) {
                        return resolve({match: false,
                                        urlInfoRequestUrl: "",
                                        isfakeShop: false, 
                                        isPhishingDomain: false});
                    }

                    let response = {
                        match: data.values.safeShop.match,
                        urlInfoRequestUrl: (lastUrl) ? lastUrl.url || "" : "",
                        urlInfoRequestTab: (lastUrl) ? lastUrl.tab || "" : "",
                        isfakeShop: data.values.safeShop.is_fake || false,
                        isPhishingDomain: AvastWRC.Utils.getBrowserInfo().isAvast() ? false : (data.values.phishing && data.values.phishing.phishing > 1) || false
                    }

                    return resolve(response);
                });
            });

            /*var secureUrl = new Promise((resolve, reject) => {
                new AvastWRC.Query.UrlSSLInfo(urlDetails.url, (result)=>{
                    var lastUrl = AvastWRC.TabReqCache.get(tab.id,"last_url_in_tab");

                    if(result && lastUrl === result.page_url){
                        return resolve({isSecureSSl: result.ssl && result.ssl_text.toUpperCase() === "ENABLED" && result.page_url.indexOf("https://") == 0,
                                        urlSslInfoRequestUrl: result.page_url,
                                        showResult: true});
                    }else{
                        return reject({isSecureSSl: undefined,
                                        urlSslInfoRequestUrl: undefined,
                                        showResult: false});
                    }
                });
            });*/

            Promise.all([urlInfo]).then((values) => {
                var lastUrl = AvastWRC.TabReqCache.get(tab.id,"last_url_in_tab");
                console.log("urlInfoChange Promise received values", values);
                if(values && values[0] && values[0].urlInfoRequestUrl && (lastUrl && values[0].urlInfoRequestUrl === lastUrl.url)){
                    var data = _.extend(values[0], {isSecureSSl: values[0].urlInfoRequestTab.url.indexOf("https://") == 0 ? true : false,
                                                    showResult: true});

                    console.log("urlInfoChange Promise", data);
                    AvastWRC.bal.emitEvent("urlInfo.response", url, data, tab, event);
                }
            });

        }
        if (event && AvastWRC.bal.DNT && AvastWRC.bal.DNT.initTab) {
            AvastWRC.bal.DNT.initTab(tab.id);
        }
    }
    /**
     * User updates URL  in the browser (clicking a link, etc.) Question: why is it also triggered for unloaded tabs
     *
     * @param  {Number} tabId      Tab Identification
     * @param  {Object} changeInfo state of loading {status : "loading | complete", url: "http://..."}  - url property appears only with status == "loading"
     * @param  {Object} tab        Tab properties
     * @return {void}
     */
    function onTabUpdated(tabId, changeInfo, tab) {
        AvastWRC.bs.tabExists.call(this, tabId, function () {
            //console.log("URLS UPDATE", tab.url, changeInfo.status);
            // ignore unsuported tab urls like chrome://, about: and chrome.google.com/webstore - these are banned by google.
            // and disable the browser extension for those tabs
            if (!AvastWRC.bs.checkUrl(tab.url)) {
                if (AvastWRC.bal.sp) AvastWRC.bal.sp.disableBadgeAnimation();
                AvastWRC.bal.emitEvent("control.hide", tabId);
                AvastWRC.bal.emitEvent("control.hide", tabId);
                return;
            }

            //enable the browser extension
            AvastWRC.bal.emitEvent("control.show", tabId);

            switch(changeInfo.status)
            {
                case 'complete':
                    if (AvastWRC.bal.sp) AvastWRC.bal.sp.disableBadgeAnimation();

                    var couponInTabsToShow = AvastWRC.UtilsCache.get("coupons_tabs_to_show", tab.id);
                    if(couponInTabsToShow && AvastWRC.bal.sp.affiliateIsContainedOnCurrentURL(tab.url, couponInTabsToShow.affiliateName)){
                        couponInTabsToShow.toBeShownIn[tab.url] = true;
                        AvastWRC.UtilsCache.set("coupons_tabs_to_show", tab.id, couponInTabsToShow);
                        console.log("couponInTabsToShow complete-> ", tab, couponInTabsToShow);
                    }

                    var couponInTabsToRemove = AvastWRC.UtilsCache.get("coupons_tabs_to_remove", tab.id);
                    if(couponInTabsToRemove && couponInTabsToRemove.coupons && !couponInTabsToRemove.timer){
                        console.log("couponTab onPageComplete: couponTab page complete removed ", couponInTabsToRemove);
                        var _tab = tab;
                        couponInTabsToRemove.timer = true;
                        var couponsShowConfig = AvastWRC.Shepherd.getCouponsShowConfig();
                        var couponShowConfig = {};
                        if(couponInTabsToRemove.coupons[0].coupon_code){
                            couponShowConfig = couponsShowConfig.couponsWithCode;
                        }
                        else{
                            couponShowConfig = couponsShowConfig.couponsWithoutCode;
                        }
                        console.log("couponTab onPageComplete: couponTab page complete removed ", couponInTabsToRemove, " config: ", couponShowConfig);
                        if(!isNaN(parseInt(couponShowConfig.closeAfter))){
                            closeTabWitTimeout(tab, parseInt(couponShowConfig.closeAfter));
                        }else{
                            closeTab(_tab);
                        }
                    }
    
                    function closeTabWitTimeout (tab, time){
                        var _tab = tab;
                        setTimeout(() => {
                            closeTab(_tab);
                        }, time*1000);
                    }
                    function closeTab (tab){
                        var _tab = tab;
                        AvastWRC.bs.tabExists(_tab.id, function () {
                            AvastWRC.bs.closeTab(_tab);
                            AvastWRC.UtilsCache.remove("coupons_tabs_to_remove", _tab.id);
                        });
                    }
                    
                    console.log("onTabUpdated() complete", tab, changeInfo);
                    urlInfoChange(tab.url, tab, changeInfo.status, true);

                break;

                default:
                break;
            }
        });
    }
    function onRedirect(info) {
        //console.log("URLS REDIRECT", info.redirectUrl);
    }


	/**
     * User clic SP icon when it is on hide mode
     *
     * @param  {Object} tab        Tab object
     * @return {void}
     */
    function onClicked(tab){
        AvastWRC.bs.tabExists.call(this, tab.id, function () {
            // ignore unsuported tab urls like chrome://, about: and chrome.google.com/webstore - these are banned by google.
            // and disable the browser extension for those tabs
            if (!AvastWRC.bs.checkUrl(tab.url)) {
                AvastWRC.bal.emitEvent("control.hide", tab.id);
                AvastWRC.bal.sp.setBadge(tab.id, null, false/*no animation*/);
                return;
            }

            var cachedData = AvastWRC.TabReqCache.get(tab.id, "safePriceInTab");
            var closedCoupon = AvastWRC.UtilsCache.get("closed_applied_coupon", tab.id);
            if(closedCoupon && tab.url.indexOf(closedCoupon.closedCouponUrl) != -1){
                console.log("onClicked", closedCoupon.closedCouponUrl);
                AvastWRC.bs.accessContent(tab, {
                    message: "applyCouponInTab",
                    data: closedCoupon,
                });
                AvastWRC.bal.emitEvent("control.show", tab.id);
                AvastWRC.bal.emitEvent("control.setIcon", tab.id, "common/ui/icons/logo-safeprice-128.png");
                sendIconClickedBurgerEvent(closedCoupon.transactionId || "");
            }else if(cachedData && cachedData.url === tab.url && cachedData.transactionId){
                if(!cachedData.panelData) {
                    cachedData.panelData = JSON.parse(JSON.stringify(AvastWRC.bal.sp.panelData));
                }
                if(!cachedData.search){
                    cachedData.search = {couponsSearch: {}, offersSearch: {}};
                }
                cachedData.iconClicked = 1;

                AvastWRC.TabReqCache.set(tab.id, "safePriceInTab", cachedData);
                console.log("extensionIconClicked -> update the data", cachedData)
                AvastWRC.bs.accessContent(tab, {
                    message: "extensionIconClicked",
                    data: cachedData,
                }); 
                if(cachedData.badgeHighlighted){
                    sendIconClickedBurgerEvent(cachedData.transactionId);
                }
            }else{
                var data = {panelData: JSON.parse(JSON.stringify(AvastWRC.bal.sp.panelData)),
                    iconClicked: 1}
                AvastWRC.TabReqCache.set(tab.id, "safePriceInTab", data);
                 
                urlInfoChange(tab.url, tab, false, false);
                console.log("onClicked Icon clicked: no data")
                //AvastWRC.bal.emitEvent("page.complete", tab.id, tab, tab.url);
            }

            function sendIconClickedBurgerEvent(transactionId = "") {
                var eventDetails = {
                    clientInfo: AvastWRC.Utils.getClientInfo((AvastWRC.Shepherd) ? AvastWRC.Shepherd.getCampaing().campaignId : "default"),
                    url: tab.url,
                    eventType: "EXTENSION_ICON",
                    type: "CLICKED_CTA",
                    offer: null,
                    offerType: ""
                };
                eventDetails.clientInfo.referer = AvastWRC.TabReqCache.get(tab.id,"referer");
                eventDetails.clientInfo.transaction_id = transactionId;
                console.log("onClicked", eventDetails);
                (AvastWRC.Burger != undefined) ? AvastWRC.Burger.emitEvent("burger.newEvent", eventDetails) : console.log("no burger lib");
            }
        });
    }

    /**
     * Forwards all the messages to the browser agnostic core
     */
    function messageHub(request, sender, reply) {
        console.log("onMessage messageHub bs.core.crx");
        (request.message === "control.onClicked") ? onClicked(request.tab) : (sender.tab) ? bal.commonMessageHub(request.message, request, sender.tab) : bal.commonMessageHub(request.message, request, request.tab);
        return reply({response: "message received"}) || Promise.resolve({response: "message received"});
    }

    /**
     * Injects all the needed scripts to a tab and sends a message
     */
    function accessContent(tab, data) {
        //let afiliateDomain = AvastWRC.bal.sp.isAnAffiliateDomain(tab, false);
        //if((afiliateDomain && data.message.indexOf("applyCouponInTab") != -1) || !afiliateDomain){
            AvastWRC.bs.messageTab(tab, data);
            //console.log("message: accessContent", data, " affiliate domain: "+afiliateDomain);
        //}
    }

    /*****************************************************************************
     * bs - override the common browser function with ext. specific
     ****************************************************************************/
    _.extend(AvastWRC.bs,
        {
            accessContent: accessContent,

            getLocalStorage(key, callback) {
                chrome.storage.local.get(key, function (result) {
                    if (typeof result === "object" && result[key]) {
                        callback(result[key]);
                    }
                    else {
                        callback(null);
                    }
                });
                return;
            },

            setLocalStorage(key, data) {
                var storage = {};
                storage[key] = data;
                chrome.storage.local.set(storage);
            }

        });

    /*****************************************************************************
     * bs.aos - browser specific AOS functionality
     ****************************************************************************/
    AvastWRC.bs.core = AvastWRC.bs.core || {};
    _.extend(AvastWRC.bs.core, // Browser specific
        {
            /**
             * Function called on BAL initialization to initialize the module.
             */
            init: function (balInst) {
                bal = balInst;

                chrome.tabs.onUpdated.addListener(onTabUpdated);
                chrome.tabs.onRemoved.addListener(AvastWRC.onTabRemoved);

                // chrome.webNavigation might also be an option, but it has a bug that affects google search result page: https://bugs.chromium.org/p/chromium/issues/detail?id=115138
                chrome.webRequest.onBeforeRedirect.addListener(onRedirect, { urls: ["http://*/*", "https://*/*"], types: ["main_frame"] });

                //clic on SP icon
                balInst.registerEvents(function (ee) {
                    ee.on("control.onClicked", onClicked);
                });

                chrome.runtime.onMessage.addListener(messageHub);

                chrome.webRequest.onSendHeaders.addListener(
                    AvastWRC.onSendHeaders,
                    { urls: ["http://*/*", "https://*/*"] },
                    ["requestHeaders"]
                );
            },
            /* Register SafePrice Event handlers */
            registerModuleListeners: function (ee) {

            }
        }); // AvastWRC.bs.aos

    AvastWRC.bal.registerModule(AvastWRC.bs.core);
}).call(this, _);
/*******************************************************************************
 *  avast! browsers extensions
 *  (c) 2012-2014 Avast Corp.
 *
 *  Background Browser Specific - AOS specific - module for stadalone execution
 *
 ******************************************************************************/

(function(AvastWRC, chrome, _) {

  function show (tabId) {
    chrome.browserAction.enable(tabId);
  }

  function hide (tabId) {
    chrome.browserAction.disable(tabId);
  }

  function showText (tabId, text, bgcolor) {
    if (AvastWRC.Utils.getBrowserInfo().isFirefox() && AvastWRC.getBrowserVersion() >= 63) chrome.browserAction.setBadgeTextColor({color: "white"});

    chrome.browserAction.setBadgeText({
      tabId: tabId,
      text: text || ""
    });

    if (bgcolor) {
      chrome.browserAction.setBadgeBackgroundColor({
        tabId: tabId,
        color: bgcolor
      });
    }
  }

  function setTitle (tabId, title) {
    chrome.browserAction.setTitle({
      tabId: tabId,
      title: title || ""
    });
  }

  function setIcon (tabId, iconPath) {
    chrome.browserAction.setIcon({
      tabId: tabId,
      path: iconPath
    }, function (){
      if (chrome.runtime.lastError) {
        console.log("LOG: "+chrome.runtime.lastError.message);
    }});
  }

  AvastWRC.bs.icon = AvastWRC.bs.icon || {};
   _.extend(AvastWRC.bs.icon, // Browser specific
    {
      /**
       * Function called on BAL initialization to initialize the module.
       */
      init: function (balInst) {

        balInst.registerEvents(function (ee) {
          ee.on("control.show", show);
          ee.on("control.hide", hide);
          ee.on("control.showText", showText);
          ee.on("control.setTitle", setTitle);
          ee.on("control.setIcon", setIcon);
        });

        chrome.browserAction.onClicked.addListener(function (tab) {
          balInst.emitEvent("control.onClicked", tab);
        });

    },

  });

  AvastWRC.bal.registerModule(AvastWRC.bs.icon);

}).call(this, AvastWRC, chrome, _);

/*******************************************************************************
 *  Background Browser Specific - SafePrice Chrome Extensions functionality
 ******************************************************************************/

(function(_) {
  
  AvastWRC.bs.SP = AvastWRC.bs.SP || {};
  _.extend(AvastWRC.bs.SP, // Browser specific
  {
    /**
     * Function called on BAL initialization to initialize the module.
     */
    init: function (balInst) {

    }
  }); // AvastWRC.bs.aos

  AvastWRC.bal.registerModule(AvastWRC.bs.SP);
}).call(this, _);

/*******************************************************************************
 *  avast! browsers extensions
 *  (c) 2012-2014 Avast Corp.
 *
 *  Background Browser Specific - AOS specific - module for stadalone execution
 *
 ******************************************************************************/

(function(AvastWRC, chrome, _) {

AvastWRC.bs.SP.sa = AvastWRC.bs.SP.sa || {};

  var EDITIONS_CONFIG = // same config for all editions
    { 
      extType: AvastWRC.EXT_TYPE_SP,
      callerId: 8020,
      reqUrlInfoServices: 0x0040, // SP only
       extVer: 15, dataVer: 15,
      safePrice : true, // SP module always enabled
      brandingType: AvastWRC.BRANDING_TYPE_AVG,
      showNewVersion: true
    };

  _.extend(AvastWRC.bs.SP.sa, // Browser specific
  {
    /**
     * Function called on BAL initialization to initialize the module.
     */
    init: function (balInst) {
      chrome.runtime.onMessageExternal.addListener (
        function(request, sender, sendResponse) {
          switch(request.msg) {
            case 'init':
              sendResponse({response: "message received"}) || Promise.resolve({response: "message received"});
              break;
            default:

          }
        }
      );

      // Obtain userId
      var settings = balInst.settings.get();
      var userid = settings.current.userId;
      if (!userid || userid.length <= 0 ) {
        AvastWRC.Query.getServerUserId(function(userid) {
          balInst.storeUserId(userid);
        });
      }
    }
  }); // AvastWRC.bs.SP.sa

  AvastWRC.bal.registerModule(AvastWRC.bs.SP.sa);

  AvastWRC.init(EDITIONS_CONFIG.callerId); // initialize the avastwrc modules
  // Start background page initilizing BAL core
  AvastWRC.bal.init(AvastWRC.bs, localStorage, EDITIONS_CONFIG);

}).call(this, AvastWRC, chrome, _);
