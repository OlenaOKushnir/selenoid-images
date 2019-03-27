/*******************************************************************************
 *
 *  avast! Online Security plugin
 *  (c) 2013 Avast Corp.
 *
 *  @author: Lucian Corlaciu
 *
 *  Background Core - cross browser
 *
 ******************************************************************************/

(function(_, EventEmitter) {

    // Extension editions
    var DEFAULT_EDITION = 0; // if no ed. determined start with AOS ed.

    var EDITION_FEATURES = [
    // 0 - AOS
        {
            applicationEvents : true, // ev. for gamification
            newUrlInfoVersion : true,
            safePrice : true,
        },
    // 1 - ABOS
        {
            applicationEvents : false, // ev. for gamification
            newUrlInfoVersion : true,
            safePrice : false,
        },
    ];

    var CORE_DEFAULT_SETTINGS = { // core defaults
        current : {
            callerId : 0,  // Not set by default
            userId : null,  // Persisted userId
        },
        features : {},
    };

    if (typeof AvastWRC == "undefined") { AvastWRC = {}; } //AVAST Online Security - namespace

    var localStorage = null; // Browser specific local storage
    var sing; // AvastWRC.bal instance - browser agnostic
    var _forcedEdition = null;

    // Regexp matching URLs that will be enabled with avast:// protocol actions
    var AOS_URLS_ENABLED_URLS = /^http[s]?\:\/\/aos.avast.com(\:\d+)?\/upgrade(\/)?/;

    // Actions assigned to avast protocol: avast://[action]
    //  - action is in form of message to be send to the background script: bal.js
    var AOS_URLS_ACTIONS = {
        "settings" : { message: "openSettings", data : {}, }, // avast://settings -> open settings page
    };

    AvastWRC.bal = {

        safePrice: false,
    
        brandingType: 0, 

        reqServices: 0x0000, // services  of UrlInfo

        _bal_modules : [], // initialized modules
        _core_modules : [], // core modules
        _bootstrap_modules : [], // bootstrap modules based on edition config
        /**
         * Register BAL module.
         * @param {Object} module to register
         */
        registerModule: function(module) {
            if (typeof module.bootstrap === "function") {
                this._bootstrap_modules.push(module);
            } else {
                this._core_modules.push(module);
            }
        },
        /**
         * EventEmitter instance to hangle background layer events.
         * @type {Object}
         */
        _ee: new EventEmitter({wildcard:true, delimiter: ".",}),
        /**
         * Register events with instance of EventEmitter.
         * @param  {Object} callback to register with instance of eventEmitter
         * @return {void}
         */
        registerEvents: function(registerCallback, thisArg) {
            if (typeof registerCallback === "function") {
                registerCallback.call(thisArg, this._ee);
            }
        },
        // TODO mean to unregister the events
        /**
         * Emit background event
         * @param {String} event name
         * @param {Object} [arg1], [arg2], [...] event arguments
         */
        emitEvent: function() {
        // delegate to event emitter
            this._ee.emit.apply(this._ee, arguments);
        },
        /**
         * browser type
         * @type {String}
         */
        browser: "",

        /**
         * Get important info about the extension running.
         */
        trace: function (log) {
            _.each(this._bal_modules, function(module) {
                if (typeof module.trace === "function") {
                    module.trace(log);
                }
            });

            console.log("> all listeners ", this._ee.listeners("*").length);
        },

        getDateAsString: function(){
            var d = new Date();
            return d.getFullYear()+ "/" + d.getMonth()+ "/"+d.getDate()+ " " + d.getHours()+":"+d.getMinutes()+":"+d.getSeconds();
        },

        getInstallTime: function(dateAsString){
            var now = new Date();
            console.log("getInstallTime -> now", dateAsString, now);
            if(dateAsString !== ""){
                var myDate = dateAsString.split("/");
                //DateFormat(year, month, day, hours, minutes, seconds, milliseconds)
                var year = myDate[0];
                var month = myDate[1];
                var day = myDate[2].split(" ")[0];
                var hours = myDate[2].split(" ")[1].split(":")[0];
                var minutes = myDate[2].split(" ")[1].split(":")[1];
                var seconds = myDate[2].split(" ")[1].split(":")[2];
                now = new Date(year, month, day, hours, minutes, seconds);
                console.log("getInstallTime -> new string from InstallDate in localstorage: ", dateAsString, "params to build timestamp: ",  year, month, day, hours, minutes, seconds, "now: ", now);
            }
            var timestamp = Math.round(now.getTime()/1000.0);
            console.log("getInstallTime -> new timestamp: ", timestamp)
            return timestamp;
        },

        /**
         * Initialization       
         * @param  {Object} _back
         * @return {Object}
         */
        init: function(_back, locStorage, editionConfig, forceEdition) {
            if(sing){
                return sing;
            }

            _forcedEdition = forceEdition;

            EDITION_FEATURES = _.isArray(editionConfig) ?
                _.merge(EDITION_FEATURES, editionConfig) :
                _.map(EDITION_FEATURES, function (features) { return _.merge(features, editionConfig); });
                // same config for all editions applied to all features

            this.back = _back;
            localStorage = locStorage;
            sing = this;

            this.initEdition( _forcedEdition == null ? DEFAULT_EDITION : _forcedEdition );
            
            var defSettings = AvastWRC.bal.getDefaultSettings(this._core_modules);
            sing.settings = new AvastWRC.bal.troughStorage("settings", defSettings);
            /*this.settings = new AvastWRC.bal.troughStorage("settings");

			this.mergeInSettings(CORE_DEFAULT_SETTINGS);*/

            var installDate = new Promise((resolve, reject)=>{
                AvastWRC.getStorageAsync("InstallDate")
                .then(function(date){ 
                    console.log("InstallDate: ", date);
                    AvastWRC.CONFIG.InstallDate = date;
                    resolve();
                })
                .catch(function(reason){ 
                    console.log("InstallDate: no info");
                    AvastWRC.CONFIG.InstallDate = "";
                    resolve();
                });
            });

            var installTimestamp = new Promise((resolve, reject)=>{
                AvastWRC.getStorageAsync("InstallTimestamp")
                    .then(function(timestamp){ 
                        console.log("InstallTimestamp: ", timestamp);
                        AvastWRC.CONFIG.InstallTimestamp = timestamp;
                        resolve();
                    })
                    .catch(function(reason){ 
                        console.log("InstallTimestamp: no info");
                        AvastWRC.CONFIG.InstallTimestamp = "";
                        resolve();
                    });
            })
            Promise.all([installDate, installTimestamp]).then(()=>{
                if(AvastWRC.CONFIG.InstallDate === ""){
                    AvastWRC.CONFIG.InstallDate = sing.getDateAsString();
                    AvastWRC.setStorage("InstallDate", AvastWRC.CONFIG.InstallDate);
                }
                if(AvastWRC.CONFIG.InstallTimestamp === ""){
                    AvastWRC.CONFIG.InstallTimestamp = sing.getInstallTime(AvastWRC.CONFIG.InstallDate);
                    AvastWRC.setStorage("InstallTimestamp", AvastWRC.CONFIG.InstallTimestamp);
                }
                
            });
            
            AvastWRC.avastConfig.get(function (avastConfig) {
                if (typeof avastConfig !== "string") {
                    avastConfig = AvastWRC.getWindowStorage("AvastConfig");                    
                }
                if (typeof avastConfig == "string") {
                    var guids = JSON.parse(avastConfig);
                    if (guids) {
                        AvastWRC.CONFIG.GUID = guids.guid;
                        AvastWRC.CONFIG.AUID = guids.auid;
                        AvastWRC.CONFIG.UUID = guids.uuid;
                        AvastWRC.CONFIG.HWID = guids.hwid;

                        if(guids.plg_guid) {                    
                            AvastWRC.CONFIG.PLG_GUID = guids.plg_guid;
                        }
                        else {
                            if(guids.guid != null && guids.hwid != null) {
                                AvastWRC.CONFIG.PLG_GUID = AvastWRC.bal.utils.getRandomUID();
                            }
                            else if(guids.guid != null && guids.hwid == null) {
                                AvastWRC.CONFIG.PLG_GUID = guids.guid;
                                AvastWRC.CONFIG.GUID = null;
                            }                        
                        }
                        var new_guids = {
                            "guid": AvastWRC.CONFIG.GUID,
                            "plg_guid": AvastWRC.CONFIG.PLG_GUID,
                            "auid": AvastWRC.CONFIG.AUID,
                            "hwid": AvastWRC.CONFIG.HWID,
                            "uuid": AvastWRC.CONFIG.UUID,
                        };
                        AvastWRC.avastConfig.set(new_guids);
                    }
                }else{                
                    AvastWRC.CONFIG.PLG_GUID = AvastWRC.bal.utils.getRandomUID();                
                    var guids = {
                        "guid": AvastWRC.CONFIG.GUID,
                        "plg_guid": AvastWRC.CONFIG.PLG_GUID,
                        "auid": AvastWRC.CONFIG.AUID,
                        "hwid": AvastWRC.CONFIG.HWID,
                        "uuid": AvastWRC.CONFIG.UUID,
                    };
                    AvastWRC.avastConfig.set(guids);
                }
            });

            Q.fcall(function() {
                return this._core_modules;
            }.bind(this))
            .then(this.initModules.bind(this))
            .then(this.initModuleSettings.bind(this))             
            .then(function() {
                // Connect Avast if it listens on the machine
                return AvastWRC.local.connect(this);
            }.bind(this))
            .get("avastEdition")
            .then(this.getCurrentEdition.bind(this))
            .then(this.initEdition.bind(this))
            .then(this.bootstrapInit.bind(this))
            .then(this.initModuleSettings.bind(this))
            .then(this.initModules.bind(this))
            .then(this.afterInit.bind(this))
            .then(()=>{
                if(AvastWRC.getWindowStorage("landingPageShown")) {
                    AvastWRC.setStorage("landingPageShown", true);
                }
                AvastWRC.getStorage("landingPageShown", function(result) {
                    console.log("landingPageShown", result);
                    if (result == null || result === false) {
                        if (!AvastWRC.Utils.getBrowserInfo().isAvast()){
                            console.log("landingPageShown: open it");
                            AvastWRC.bal.openLandingPageTab();
                        } 
                        AvastWRC.setStorage(AvastWRC.bal.config.installationVersionLocalStorageKey, AvastWRC.bs.getVersion());
                        AvastWRC.Uninstall.setUninstallURL();
                    }
                }); 
            })
            .fail(function (e) {
                console.log("Error in bal.init: ", e);
            });

            if (_.isArray(editionConfig)) {
    	        this.safePrice = editionConfig[0].safePrice;
    	        this.brandingType = editionConfig[0].brandingType;
            }
            else {
    	        this.safePrice = editionConfig.safePrice;
    	        this.brandingType = editionConfig.brandingType;
            }
            /* AOSP-639, AOSP-694*/
             

            AvastWRC.CloseTooltip.init();
            AvastWRC.SettingsTooltip.init();

            return this;
        },
        initEdition : function (edition) {
            var features = EDITION_FEATURES[edition] || edition;

            AvastWRC.CONFIG.EDITION  = edition;
            AvastWRC.CONFIG.FEATURES = features;
            this.reqUrlInfoServices  = features.reqUrlInfoServices;
            AvastWRC.CONFIG.CALLERID = features.callerId;
            AvastWRC.CONFIG.EXT_TYPE = features.extType;
            AvastWRC.CONFIG.EXT_VER  = features.extVer;
            AvastWRC.CONFIG.DATA_VER = features.dataVer;
            AvastWRC.CONFIG.SHOW_NEW_VERSION = features.showNewVersion || false;
      
            return Q.fcall(function() { return edition;});
        },
        bootstrapInit : function (edition) {
            var features = EDITION_FEATURES[edition];
            var bootstrapped = _.reduce(this._bootstrap_modules, function(bModules, moduleBootstrap) {
                var module = moduleBootstrap.bootstrap(features);
                if (module) bModules.push(module);
                return bModules;
            }, [], this);
            return Q.fcall(function () { return bootstrapped; });
        },
        initModules : function (modules) {
            _.each(modules, function(module) {
                if (module) {
          // register individual modules - init and register with event emitter
                    if (typeof module.init === "function") module.init(this);
                    if (typeof module.registerModuleListeners === "function") module.registerModuleListeners(this._ee);
                    this._bal_modules.push(module);
                }
            }, this);
            return Q.fcall(function () { return modules; });
        },
        initModuleSettings : function (modules) {
            new Promise((resolve, reject) => {
                AvastWRC.getStorageAsync("settings")
               .then(function(value){
                    if(value.current.callerId < AvastWRC.CONFIG.CALLERID){
                        value.current.callerId = AvastWRC.CONFIG.CALLERID;
                    }
                    sing.settings.set(value);
                    var defSettings = AvastWRC.bal.getDefaultSettings(modules);
                    AvastWRC.bal.mergeInSettings(defSettings);
                    AvastWRC.bal.updateOldSettings();
                    AvastWRC.bal.updateOldUserSettings();
                    AvastWRC.bal.updateSp291Settings();
                    return Q.fcall(function () { return modules; });
               })
               .catch(function(reason){ 
                    var storageSettings = localStorage.getItem("settings");
                    if(!storageSettings){
                        var defSettings = AvastWRC.bal.getDefaultSettings(modules);
                        if(defSettings && defSettings.current &&  defSettings.current.callerId && defSettings.current.callerId < AvastWRC.CONFIG.CALLERID){
                            defSettings.current.callerId = AvastWRC.CONFIG.CALLERID;
                        }
                        AvastWRC.bal.mergeInSettings(defSettings);              
                    }
                    else{
                        var userSettings = JSON.parse(storageSettings);
                        if(userSettings.current.callerId < AvastWRC.CONFIG.CALLERID){
                            userSettings.current.callerId = AvastWRC.CONFIG.CALLERID;
                        }
                        sing.settings.set(userSettings);
                        delete localStorage["settings"];
                    }                    
                    AvastWRC.bal.updateOldSettings();
                    AvastWRC.bal.updateSp291Settings();
                    return Q.fcall(function () { return modules; });
               });
           });                   
        },
        afterInit : function () {
            _.each(this._bal_modules, function(module) {
                // after init - all modules initialized
                if (typeof module.afterInit === "function") module.afterInit();
                this._bal_modules.push(module);
            }, this);
        },
        
        /**
         * Called once the local based service get initialized.
         */
        initLocalService: function(port) {
            _.each(this._bal_modules, function(module) {
        // after init - all modules initialized
                if (typeof module.initLocalService === "function") module.initLocalService(port);
            }, this);
        },
        /**
         * creates the settings object or updates an already present one
         * @return {void}
         */
        mergeInSettings: function(settings) {
            var newSettings = this.settings.get(),
                big, small;
            if(!newSettings){
                this.settings.set(settings);
            }else{
                for(big in settings) {
                    if(newSettings[big] === undefined){
                        newSettings[big] = settings[big];
                    }
                    else {
                        for(small in settings[big]) {
                            if (newSettings[big][small] === undefined) {
                                newSettings[big][small] = settings[big][small];
                            }
                        }
                    }
                }
            }            
            this.settings.set(newSettings);
        },
        /**
         * updates the stored settings from AvastWRC
         * @return {void}
         *
         * TODO - save and use settings in a single place
         */
        updateOldSettings: function() {
            var settings = this.settings.get();
            AvastWRC.CONFIG.COMMUNITY_IQ = settings.features.communityIQ;
            AvastWRC.CONFIG.ENABLE_SERP = settings.features.serp;
            AvastWRC.CONFIG.ENABLE_SERP_POPUP = settings.features.serpPopup;
            AvastWRC.CONFIG.ENABLE_SAS = settings.features.safeShop;
            AvastWRC.CONFIG.USERID = settings.current.userId;
        },
        updateOldUserSettings: function(){
            var settings = this.settings.get();
            var newSettings = settings.userSPPoppupSettings;
            if(!newSettings || !newSettings.help || !newSettings.notifications)return;
           
            if(newSettings.advanced){
                if(newSettings.advanced.selected){
                    newSettings.help.selected = false;
                    newSettings.notifications.selected = true;
                    newSettings.customList.selected = false;
                }
                if(newSettings.general){
                    newSettings.notifications.offers.item1Selected = (newSettings.advanced.offers.item1Selected && !newSettings.general.item2Selected) ? true : false;
                    newSettings.notifications.offers.item2Selected = (newSettings.advanced.offers.item2Selected && !newSettings.general.item2Selected) ? true : false;
                    newSettings.notifications.offers.item3Selected = (newSettings.advanced.offers.item3Selected && !newSettings.general.item2Selected) ? true : false;
                    newSettings.notifications.coupons.item1Selected = (newSettings.advanced.coupons.item1Selected && !newSettings.general.item2Selected) ? true : false;
                    newSettings.notifications.coupons.item2Selected = (newSettings.advanced.coupons.item2Selected && !newSettings.general.item2Selected) ? true : false;
                }
                newSettings.notifications.offers.include.eShop = newSettings.advanced.offers.include.eShop ? true : false;
                newSettings.notifications.offers.include.accommodations = newSettings.advanced.offers.include.accommodations ? true : false;
                newSettings.notifications.others.item1Selected = newSettings.advanced.offers.include.special ? true : false;
            }
            if(newSettings.customList && newSettings.customList.selected){
                    newSettings.help.selected = false;
                    newSettings.notifications.selected = false;
                    newSettings.customList.selected = true;
            }
            if (newSettings.general){
                if(newSettings.general.selected){
                    newSettings.help.selected = true;
                    newSettings.notifications.selected = false;
                    newSettings.customList.selected = false;
                }
                newSettings.notifications.offers.item4Selected = (newSettings.general.item2Selected) ? true : false;
                newSettings.notifications.coupons.item3Selected = newSettings.general.item2Selected ? true : false;
            }

            delete newSettings.general;
            delete newSettings.advanced;
            settings.userSPPoppupSettings = newSettings;
            this.settings.set(settings);
        },
        updateSp291Settings: function () {
            let settings = this.settings.get();
            let newSettings = settings.userSPPoppupSettings;
            if(!newSettings || !newSettings.help || !newSettings.notifications)return;

            let newSettingsNotifications = newSettings.notifications;

            let newDefault = {
                offers: {
                    showAlways: true,// show always
                    showBetter: false,// show better than the original price
                    hide: false,// hide
                },
                accommodations: {
                    showBetter: true,// show better than the original price
                    showSimilar: true,// show similar hotels
                    showPopular: true,// show popular hotels
                },
                coupons: {
                    showAlways: true, // show always
                    showOnce: false, // show once
                    hide: false, // hide notifications
                },
                others: {
                    showAlways: true, // show always
                }
            }
            if(newSettingsNotifications.offers.item1Selected != undefined){
                newSettingsNotifications.offers.showAlways = newSettingsNotifications.offers.item1Selected;
                delete newSettingsNotifications.offers.item1Selected;
                newSettingsNotifications.accommodations = newDefault.accommodations;
            }else if(newSettingsNotifications.offers.showAlways == undefined) {
                newSettingsNotifications.offers.showAlways = newDefault.offers.showAlways;
            }
            if (newSettingsNotifications.offers.item2Selected  != undefined){
                newSettingsNotifications.offers.showBetter = newSettingsNotifications.offers.item2Selected;
                delete newSettingsNotifications.offers.item2Selected;
                delete newSettingsNotifications.offers.item3Selected;
             }else if(newSettings.notifications.offers.item3Selected  != undefined) {
                newSettingsNotifications.offers.showBetter = newSettingsNotifications.offers.item3Selected;
                delete newSettingsNotifications.offers.item2Selected;
                delete newSettingsNotifications.offers.item3Selected;
             }else if(newSettingsNotifications.offers.showBetter == undefined) {
                newSettingsNotifications.offers.showBetter = newDefault.offers.showBetter;
            }
            if(newSettingsNotifications.offers.item4Selected != undefined){
                newSettingsNotifications.offers.hide = newSettingsNotifications.offers.item4Selected;
                delete newSettingsNotifications.offers.item4Selected;
            }else if(newSettingsNotifications.offers.hide == undefined) {
                newSettingsNotifications.offers.hide = newDefault.offers.hide;
            }

            if(newSettingsNotifications.coupons.item1Selected != undefined){
                newSettingsNotifications.coupons.showAlways = newSettingsNotifications.coupons.item1Selected;
                delete newSettingsNotifications.coupons.item1Selected;
            }else if(newSettingsNotifications.coupons.showAlways == undefined) {
                newSettingsNotifications.coupons.showAlways = newDefault.coupons.showAlways;
            }
            if(newSettingsNotifications.coupons.item2Selected != undefined){
                newSettingsNotifications.coupons.showOnce = newSettingsNotifications.coupons.item2Selected;
                delete newSettingsNotifications.coupons.item2Selected;
            }else if(newSettingsNotifications.coupons.showOnce == undefined) {
                newSettingsNotifications.coupons.showOnce = newDefault.coupons.showOnce;
            }
            if(newSettingsNotifications.coupons.item3Selected != undefined){
                newSettingsNotifications.coupons.hide = newSettingsNotifications.coupons.item3Selected;
                delete newSettingsNotifications.coupons.item3Selected;
            }else if(newSettingsNotifications.coupons.hide == undefined) {
                newSettingsNotifications.coupons.hide = newDefault.coupons.hide;
            }
            if(newSettingsNotifications.others.item1Selected != undefined){
                newSettingsNotifications.others.showAlways = newSettingsNotifications.others.item1Selected;
                delete newSettingsNotifications.others.item1Selected;
            }else if(newSettingsNotifications.others.showAlways == undefined) {
                newSettingsNotifications.others.showAlways = newDefault.others.showAlways
            }

            delete newSettingsNotifications.offers.include;

            settings.userSPPoppupSettings.notifications = newSettingsNotifications;
            this.settings.set(settings);

        },

        getCurrentEdition : function(localAvastEdition) {
            var deferred = Q.defer();
            if (_forcedEdition == null) {
                var settings = this.settings.get();
                var storedEdition = settings.current.edition;
                if (localAvastEdition !== undefined && localAvastEdition !== null) {
                    if (!storedEdition || storedEdition !== localAvastEdition) {
                        settings.current.edition = localAvastEdition;
                        this.settings.set(settings);
                    }
                    deferred.resolve( localAvastEdition );
                } else {
                    deferred.resolve( storedEdition || DEFAULT_EDITION );
                }
            } else {
                deferred.resolve( _forcedEdition );
            }
            return deferred.promise;
        },
        /**
         * Default settings with default values
         * @return {Object}
         */
        getDefaultSettings: function(modules) {
            return _.reduce (modules,
                function(defaults, module) {
                    if (typeof module !== "undefined" 
                        && typeof module.getModuleDefaultSettings === "function") {
                        var moduleDefaults = module.getModuleDefaultSettings();
                        if (moduleDefaults) {
                            defaults = _.merge(defaults, moduleDefaults);
                        }
                    }
                    return defaults;
                },
                CORE_DEFAULT_SETTINGS
            );
        },
        getLandingPageCode: function (lang, local) {
            if (lang === "af" && local === "za") return "en-za";
            if (lang === "ar" && local === "sa") return "ar-sa";
            if (lang === "ar" && local === "ae") return "en-ae";
            if (lang === "ar") return "ar-ww";
            if (lang === "be") return "ru-ru";
            if (lang === "ca") return "es-es";
            if (lang === "cs") return "cs-cz";
            if (lang === "cy") return "en-gb";
            if (lang === "da") return "da-dk";
            if (lang === "de") return "de-de";
            if (lang === "el") return "el-gr";
            if (lang === "en" && local === "au") return "en-au";
            if (lang === "en" && local === "ca") return "en-ca";
            if (lang === "en" && local === "gb") return "en-gb";
            if (lang === "en" && local === "ph") return "en-ph";
            if (lang === "en" && local === "us") return "en-us";
            if (lang === "en" && local === "za") return "en-za";
            if (lang === "es" && local === "ar") return "es-ar";
            if (lang === "es" && local === "co") return "es-co";
            if (lang === "es" && local === "es") return "es-es";
            if (lang === "es" && local === "mx") return "es-mx";
            if (lang === "es") return "es-ww";
            if (lang === "eu") return "es-es";
            if (lang === "gu") return "en-in";
            if (lang === "fi") return "fi-fi";
            if (lang === "fo" && local === "fo") return "wn-ww";
            if (lang === "fr" && local === "be") return "fr-be";
            if (lang === "fr" && local === "ca") return "fr-ca";
            if (lang === "fr" && local === "ch") return "fr-ch";
            if (lang === "fr") return "fr-fr";
            if (lang === "gl") return "es-es";
            if (lang === "he") return "he-il";
            if (lang === "hi") return "hi-in";
            if (lang === "hu") return "hu-hu";
            if (lang === "id") return "id-id";
            if (lang === "it") return "it-it";
            if (lang === "ja") return "ja-jp";
            if (lang === "kk") return "ru-kz";
            if (lang === "ko") return "ko-kr";
            if (lang === "nb") return "no-no";
            if (lang === "nl" && local === "be") return "nl-be";
            if (lang === "nl") return "nl-nl";
            if (lang === "nn") return "no-no";
            if (lang === "ns") return "en-za";
            if (lang === "ms") return "en-my";
            if (lang === "pa") return "en-in";
            if (lang === "pl") return "pl-pl";
            if (lang === "pt" && local === "br") return "pt-br";
            if (lang === "pt") return "pt-pt";
            if (lang === "ru") return "ru-ru";
            if (lang === "se" && local === "fi") return "fi-fi";
            if (lang === "se" && local === "no") return "no-no";
            if (lang === "se" && local === "se") return "sv-se";
            if (lang === "sk") return "cs-sk";
            if (lang === "sv") return "sv-se";
            if (lang === "ta") return "en-in";
            if (lang === "te") return "en-in";
            if (lang === "tl") return "tl-ph";
            if (lang === "th") return "th-th";
            if (lang === "tr") return "tr-tr";
            if (lang === "tt") return "ru-ru";
            if (lang === "uk") return "uk-ua";
            if (lang === "vi") return "vi-vn";
            if (lang === "qu") return "es-ww";
            if (lang === "zh" && local === "tw") return "zh-tw";
            if (lang === "zh") return "zh-cn";
            if (lang === "zu" && local === "za") return "en-za";
            return "en-ww";
        },

        getLandingPageURL: function () {
            let useABTestUrl = (AvastWRC.Shepherd) ? AvastWRC.Shepherd.showPanelOnInstallPage() : false;
            let configs = {
                "AVAST": {
                    brandingType: "avast",
                    endpoint: "/lp-safeprice-welcome-new"
                },
                "AVG": {
                    brandingType: "avg",
                    endpoint: "/welcome/safeprice-new"
                }
            };
                
            let brandingSpecifics = AvastWRC.bal.brandingType === AvastWRC.BRANDING_TYPE_AVG ? configs.AVG : configs.AVAST;
            
            let url = {
                default: `https://www.${brandingSpecifics.brandingType}.com${brandingSpecifics.endpoint}?utm_medium=link&utm_source=safeprice&utm_campaign=${brandingSpecifics.brandingType}-safeprice-welcome`,
                variant1: `https://platform.${brandingSpecifics.brandingType}.com/Onboarding/?utm_medium=link&utm_source=safeprice&utm_campaign=safeprice-onboarding`
            };
           

            return !useABTestUrl ? url.default : url.variant1;
        },

        openLandingPageTab: function () {
            let url = AvastWRC.bal.getLandingPageURL();
            console.log("openLandingPageTab: urlData", url);
            AvastWRC.setStorage("landingPageShown", true);
            AvastWRC.bs.tabExistsWithUrl(url, function (tab) {                
                if (tab) {
                    console.log("openLandingPageTab: tab exist with url", tab, url);
                    AvastWRC.bs.tabRedirectAndSetActive(tab, url);
                } else {
                    console.log("openLandingPageTab: tab exist with url", tab, url);
                    AvastWRC.bs.openInNewTab(url);
                }
            });
        },

        openSearchPageInTab: function (tab) {
            let url = "https://search.avast.com/"; 
            if(AvastWRC.bal.brandingType === AvastWRC.BRANDING_TYPE_AVG){
                url = "https://mysearch.avg.com/";
            }
            if (tab) {
                AvastWRC.bs.tabRedirectAndSetActive(tab, url);
            } else {
                AvastWRC.bs.openInNewTab(url);
            }         
        },

        getFAQsUrl: function(){
            var bLocal = ABEK.locale.getBrowserLocale().toLowerCase();
            var bLang = ABEK.locale.getBrowserLang().toLowerCase();

            let brandingSpecifics = {
                brandingType: "avast",
                contain: "support.avast.com",
                pPro: 43,
                pElem: 202,
                pScr: "61"
            };

            if(AvastWRC.bal.brandingType === AvastWRC.BRANDING_TYPE_AVG){
                brandingSpecifics = {
                    brandingType: "avg",
                    contain: "/welcome/safeprice-new",
                    pPro: 72,
                    pElem: 334,
                    pScr: "AVG-SafePrice-Frequently-Asked-Questions"
                };
            }
            var data = { url: `https://ipm-provider.ff.avast.com/?action=2&p_pro=${brandingSpecifics.pPro}&p_elm=${brandingSpecifics.pElem}&p_lng=${bLang}&p_scr=${brandingSpecifics.pScr}`,
                contain: brandingSpecifics.contain
            }
            console.log(data);
            return data;
        },

        openFAQsPageTab: function() {
            let urlData = AvastWRC.bal.getFAQsUrl();

            AvastWRC.bs.tabExistsWithUrl(urlData.contain, function (tab) {
                if (tab) {
                    AvastWRC.bs.tabRedirectAndSetActive(tab, urlData.url);
                } else {
                    AvastWRC.bs.openInNewTab(urlData.url);
                }
            });     
                  
        },

        /**
         * Message hub - handles all the messages from the injected scripts
         * @param  {String} type
         * @param  {Object} message
         * @param  {Object} tab
         * @return {void}
         */
        commonMessageHub: function (type, data, tab) {
            if (typeof tab === "undefined") return;

            var url = tab.url || (tab.contentDocument && tab.contentDocument.location
                        ? tab.contentDocument.location.href : null);
            var host = AvastWRC.bal.getHostFromUrl(url);
            switch (type) {
           
            case "openInNewTab":
                AvastWRC.bs.openInNewTab(data.url);
                break;
            case "copyToClipboard":
                AvastWRC.bs.copyToClipboard (data.text);
                break;
            default:
                // emit messages in specific namespace
                this._ee.emit("message." + type, data, tab);
            }
        },

        /**
         * Detect pages where the extension will handle avast:// protocal URLs.
         * And it applies events to these links to trigger to extension specific functions.
         * Ie. avast://settings opens settings: .../options.html
         * @param {String} page URL
         * @param {Object} relevant tab to process the links
         */
        tabFixAosUrls: function(url, tab) {
            if (AOS_URLS_ENABLED_URLS.test(url)) {
                AvastWRC.bs.accessContent(tab, {
                    message : "fixAosUrls",
                    data: { actions : AOS_URLS_ACTIONS, },
                });
            }
        },
        
        /**
         * Temporary storage
         * @type {Object}
         */
        cache: {
            map: {},
            add: function(itemKey, itemValue, key) {
                (key ? this.map[key] : this.map)[itemKey] = itemValue;
                return itemValue;
            },
            get: function(itemKey, key) {
                return (key ? this.map[key] : this.map)[itemKey];
            },
            contains: function(itemKey, key) {
                return (key ? this.map[key] : this.map).hasOwnProperty(itemKey);
            },
            delete: function(itemKey, key) {
                delete (key ? this.map[key] : this.map)[itemKey];
            },
            reset: function(key) {
                this.map[key] = {};
            },
        },
        /**
         * Persistent storage
         * @type {Object}
         */
        storage: {
            add: function(itemKey, itemValue) {
                localStorage.setItem(itemKey, JSON.stringify(itemValue));
                return itemValue;
            },
            get: function(itemKey, key) {
                var item = localStorage.getItem(itemKey);
                try {
                    return JSON.parse(item);
                } catch (ex) {
                    return {};
                }
            }, 
            contains: function(itemKey, key) {
                return localStorage.hasOwnProperty(itemKey);
            },
            delete: function(itemKey, key) {
                delete localStorage[itemKey];
            },
        },
    /**
     * Persistent Storage wrapper
     * @param  {String} key
     * @param  {Object} initializer - in case the key is not present in localStorage
     * @return {Object} - troughStorage instance with get and set
     */
        troughStorage: function(key, initializer) {
            var tmpVal = null, tmpKey = key;
             
            return {
                get: function() {
                    return tmpVal || (tmpVal = initializer);
                },
                set: function(val) {
                    tmpVal = val;
                    AvastWRC.setStorage(tmpKey, tmpVal);
                },
            };
        },
    /**
     * Helper functions
     */
        isFirefox: function() {
            return sing.browser == "Firefox";
        },
        getHostFromUrl: function(url) {
            if (!url) {
                return undefined;
            }

            var lcUrl = url.toLowerCase();

            if (lcUrl.toLowerCase().indexOf("http") != 0 ||
                lcUrl.toLowerCase().indexOf("chrome") == 0 ||
                lcUrl.toLowerCase().indexOf("data") == 0 ||
                lcUrl.toLowerCase() == "about:newtab" ||
                lcUrl.toLowerCase() == "about:blank")
            {
                return undefined;
            }

            var match = url.match(/:\/\/(www[0-9]?\.)?(.[^/:]+)/);
            return match.length > 2 ? match[2] : undefined;
        },
        getDomainFromHost: function(host){
            // return only the last 2 levels of the domain
            return host ? host.split(".").slice(-2).join(".") : undefined;
        },
        getDomainFromUrl: function(url) {
            // return the complete domain (host) 
            return AvastWRC.bal.getHostFromUrl(url);
        },
        jsonToString: function(obj) {
            var s = "";
            for(var key in obj) {
                if(typeof obj[key] == "object") {
                    s += key+"<br />";
                    s += this.jsonToString(obj[key]);
                } else {
                    s += key+": "+obj[key]+"<br />";
                }
            }

            return s;
        },
        /**
         * WebRep Common Core
         * @type {Object}
         */
        WebRep: {
        },

        /* Wraps bal to register to submodule events */
        Core : {
            registerModuleListeners : function (ee) {
                // register for local Avast service
                ee.on("local.init", function(port) {
                    sing.initLocalService(port);
                });
                ee.on("local.paired", function(guid, auid, hwid, uuid) {
                    if (guid !=="" ) AvastWRC.CONFIG.GUID = guid;
                    if (auid !== "") AvastWRC.CONFIG.AUID = auid;
                    if (guid !== "") AvastWRC.CONFIG.HWID = hwid;
                    if (uuid !== "") AvastWRC.CONFIG.UUID = uuid;
                    var guids = {
                        "guid": AvastWRC.CONFIG.GUID,
                        "plg_guid": AvastWRC.CONFIG.PLG_GUID,
                        "auid": AvastWRC.CONFIG.AUID,
                        "hwid": AvastWRC.CONFIG.HWID,
                        "uuid": AvastWRC.CONFIG.UUID,
                    };
                    AvastWRC.avastConfig.set(guids);
                    AvastWRC.Uninstall.setUninstallURL();
                });
            },
        },

        /**
         * AvastWRC.bal specific utilities.
         */
        utils : {
            /**
             * Retrieve localised strings into given data object
             * based on the string ids array.
             * @param {Object} data to load the strings to
             * @param {Array} identifiers of strings to load
             * @return {Object} updated data object
             */
            loadLocalizedStrings : function (data, stringIds) {
                return _.reduce (stringIds, function(res, stringId) {
                    res[stringId] = AvastWRC.bs.getLocalizedString(stringId);
                    return res;
                }, data);
            },

            /**
             * Create local image url for given key/file map.
             * @param {Object} to add local URLs to
             * @param {Object} map key / image file to create the local URLs for
             * @return {Object} updated data object
             */
            getLocalImageURLs : function (data, imagesMap) {
                return _.reduce (imagesMap, function(res, image, key) {
                    res[key] = AvastWRC.bs.getLocalImageURL(image);
                    return res;
                }, data);
            },

            /**
            * Generate random UID.
            */
            getRandomUID : function () {
                var genericGuid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx";
                var hex = "0123456789abcdef";
                var r = 0;
                var guid = "";
                for (var i = 0; i < genericGuid.length; i++) {
                    if (genericGuid[i] !== "-" && genericGuid[i] !== "4") {
                        r = Math.random() * 16 | 0;
                    }
                    if (genericGuid[i] === "x") {
                        guid += hex[r];
                    } else if (genericGuid[i] === "y") {
                        r &= 0x3;  //  (sample:?0??)
                        r |= 0x8;  // (sample:1???)
                        guid += hex[r];
                    } else {
                        guid += genericGuid[i];
                    }
                }
                return guid;
            },
            /**
            * Generate hash from string.
            */
            getHash(str) {
                var hash = 0;
                if (str.length === 0) return hash;
                for (var i = 0; i < str.length; i++) {
                    var char = str.charCodeAt(i);
                    hash = ((hash << 5) - hash) + char;
                    hash = hash & hash; // Convert to 32bit integer
                }
                return hash;
            },
        }, // utils

        /**
         * Set bal instance with local storage instance.
         * @param {Object} browser local storage instance
         */
        setLocalStorage : function (ls) {
            localStorage = ls;
        },

        /**
         * Stores user Id so it is available to subsequent requests and persisted in local storage.
         * @param {String} userid to store
         */
        storeUserId : function (userId) {
            var settings = sing.settings.get();
            settings.current.userId = userId;
            sing.settings.set(settings);
            sing.updateOldSettings(); // refresh settings accessible through AvastWRC
        },

        config: {
            installationVersionLocalStorageKey: "installedVersion"
        }
    }; // AvastWRC.bal

    // Init the core module to register for event from sub-modules.
    AvastWRC.bal.registerModule(AvastWRC.bal.Core);

}).call(this, _, EventEmitter2);
/*******************************************************************************
 *  avast! Online Security plugin
 *  (c) 2014 Avast Corp.
 *
 *  Background Layer - SafePrice
 ******************************************************************************/

(function(AvastWRC, _) {
    var _safeShopInTab = {};

    (function(definition) {
        AvastWRC.bal.registerModule({
            bootstrap: function() {
                return definition();
            }
        });


    })(function() {

        AvastWRC.bal.sp = _.extend(AvastWRC.bal.SP || {}, {

            panelData: {
                strings: AvastWRC.bal.utils.loadLocalizedStrings({},["spOffersTab",
                    "spCouponsTab",
                    "spOthersTab", 
                    "spAdditionalFees", 
                    "spShippingLabel", 
                    "spGetCouponCode", 
                    "spApply", 
                    "spCopyAtCheckOut", 
                    "spCouponApplied", 
                    "spCouponsSelectedText",
                    "spCouponsAvailableText", 
                    "spCouponsSelected",
                    "spNothingFoundCoupons",
                    "spNothingFoundOffers",
                    "spNothingFoundOthers",
                    "spCouponsExpiration",
                    "spCityHotelNotificationMessage",
                    "spSimilarHotelsMessage", 
                    "spNotificationRedirectShowLessMessage",
                    "spNotificationRedirectShowMoreMessage",
                    "save",
                    "sasOpenShop",
                    "spCloseTooltip",
                    "spMinimizeTooltip",
                    "spHelpTooltip",
                    "spSettingsTooltip",
                    "spNoresultsFoundForOthers",
                    "spNoResultsFoundCoupons",
                    "spNoResultsFoundOffersBasedOnQuery",
                    "spNoResultsFoundOffers",
                    "spGreatDeal",
                    "spSiteVerified",
                    "spSiteNotVerified",
                    "spSiteNotVerifiedHover",
                    "spConnectionSecure",
                    "spConnectionNotSecure",
                    "spConnectionNotSecureHover",
                    "spSiteUntrustworthy",
                    "spSiteUntrustworthyDesc",
                    "spLeaveSite",
                    "spITrustThisSite",
                    "spRecommendESHop",
                    "spRecommendWhy",
                    "spRecommendExcellentSelectionOfProducts",
                    "spRecommendGreatValue",
                    "spRecommendGreatCcustomerService",
                    "spReportESHop",
                    "spReportWhy",
                    "spReportPaidAndNotGet",
                    "spReportGetSomethingDifferent",
                    "spReportTreatedMePoorly",
                    "spRequired",
                    "spOther",
                    "spTellUsMore",
                    "spEShopName",
                    "spProductOrdered",
                    "spLinkToProductPage",
                    "spReport",
                    "spRecommend",
                    "spThanksForVoting",
                    "spAvailableOffers",
                    "spAvailableHotels",
                    "spAvailableCoupons",
                    "spSelectedCoupons",
                    "spAvailableOthers",
                    "spProductsSearchInput",
                    "spCouponsSearchInput",
                    "spProductsSearchIconHover",
                    "spSearchForOffers",
                    "spSearchForCoupons",
                    "spCouponsSearchIconHover",
					"spPhishingSite",
                    "spPhishingSiteDesc",
                    "spNoResultsFoundCouponsNow",
                    "spFeedback",
                    "spFeedbackShare",
                    "spFeedbackback",
                    "spFeedbackSend",
                    "spFeedbackNext",
                    "spFeedbackGeneral",
                    "spFeedbackReportOnlineStore",
                    "spFeedbackThanks",
                    "spFeedbackGeneral",
                    "spFeedbackGeneralDesc",
                    "spFeedbackReportOnlineStore",
                    "spFeedbackReportOnlineStoreDesc",
                    "spFeedbackSPExp",
                    "spFeedbackWriteAComment",
                    "spFeedbackWhichOnlineStoreReporting",
                    "spFeedbackOnlineStoreName",
                    "spFeedbackRetailerMerchant",
                    "spFeedbackProductOrdered",
                    "spFeedbackLinkToProductPage",
                    "spFeedbackProblem",
                    "spFeedbackSomethingDifferent",
                    "spFeedbackPaidAndNotGet",
                    "spFeedbackOther",
                    "spFeedbackWhatWasTheProblem",
                    "spCodeCopied",
                    "spCouponWorks",
                    "spCouponCodeWorks",
                    "spRateCouponsThanks",
                    "spLoadingNotificationMessage", 
                    "spCouponsNotificationMessage",
                    "spBetterOffersNotificationMessage", 
                    "spOffersAndCouponsNotificationMessage",
                    "spBetterSpecialDealsNotificationMessage", 
                    "spShowNotificationMessage",
                    "spShowAll",
                    "spShowNotificationRedirectMessage", 
                    "spNotificationRedirectShowRedirectMessage",
                    "spLoadingNotificationDescriptionMessage",
                    "spSimilarHotelsNotificationMessage",
                    "spBetterOffersNotificationBarMessage",
                    "spBetterSpecialDealsNotificationBarMessage",
                    "spCouponsNotificationSaveTextMessage",
                    "spBetterOfferLowerPricesNotificationMessage", 
                    "spAfterCloseTooltip",
                    "spOnboardingSearchOffers",
                    "spOnboardingSearchCoupons",
                    "spTrySearchInAmazon",
                    "spSearchInAmazon",
                    "spOnboardingSettingsMsg",
                    "spOnboardingSettingsButton"
                ]),
                images: AvastWRC.bal.utils.getLocalImageURLs({}, {
                    logo: "logo-safeprice-48.png",
                    close: "close-icon-copy-8.png",
                    min: "minimise-icon.png",
                    settings: "settings-icon.png",
                    placeholder: "sp-offer-image-placeholder.png",
                    offersPlaceholder: "default-offers.png",
                    redirectPlaceholder: "Default-90x30.png",
                    redirectPlaceholderBig: "general.png",
                    dashedLine: "dashed-line.png",
                    help: "help-icon.png",
                    noCouponsImg: "no-coupons-img.png",
                    noOffers: "no-offers.png",
                    shield: "shield.png",
                    shieldRed: "shieldRed.png",
                    powered: "powered.png",
                    warningIcon: "warning.png",
                    dashedLineOffers: "combined-shape-offers.png",
                    searchIcon: "search-icon.svg",
                    searchOffers: "search-offers.png",
                    searchCoupons: "search-coupons.png",
                    ribbonOffers: "ribbon-xl.png",
                    ribbonImageCouponShopName: "ribbon-coupon-shop.png",
                    rateCouponPositive: "rateCouponPositive.png",
                    rateCouponPositiveHover: "rateCouponPositiveHover.png",
                    rateCouponNegative: "rateCouponNegative.png",
                    rateCouponNegativeHover: "rateCouponNegativeHover.png",
					arrowRate: "arrow-rate.png",
                    checkMarkIcon: "checkmark-icon.png",
                    arrowFeedback: "arrow-feedback.png",
                    checkGif: "rate-check-gif.gif",
                    back: "back.png",
                    ribbonRedirect: "ribbon-redirect.png",
                    hotelsBar: "Hotels-Horizontal.gif",
                    couponsBar: "Coupons-Horizontal.gif",
                    offersAndCouponsBar: "Deals-Coupons-Horizontal.gif",
                    specialDealsBar: "Special-Deals-Horizontal.gif",
                    moreOffersBar: "Deals-Horizontal.gif",
                    arrow: "arrow.png"
                }),
                animations: AvastWRC.bal.utils.getLocalImageURLs({}, {
                    moreOffersBar: "Anim-Deals-Horizontal.gif",
                    hotelsBar: "Anim-Hotels-Horizontal.gif",
                    couponsBar: "Anim-Coupons-Horizontal.gif",
                    offersAndCouponsBar: "Anim-Deals-Coupons-Horizontal.gif"
                }),
                userFeedback: {templateData: AvastWRC.YesNo.getTemplateData()},
                socialSharing: {templateData: AvastWRC.Social.getTemplateData()},
                closeTooltip: {templateData: AvastWRC.CloseTooltip.getTemplateData()},
                animationsSettings: AvastWRC.Shepherd.getAnimationsConfig(),
                avastBranding: AvastWRC.bal.brandingType == undefined || AvastWRC.bal.brandingType == AvastWRC.BRANDING_TYPE_AVAST ? true : false,
                browserType: {isFirefox: AvastWRC.Utils.getBrowserInfo().isFirefox(),
                    isChrome: AvastWRC.Utils.getBrowserInfo().isChrome(),
                    isEdge: AvastWRC.Utils.getBrowserInfo().isEdge(),
                    isOpera: AvastWRC.Utils.getBrowserInfo().isOpera(),
                    isAvast: AvastWRC.Utils.getBrowserInfo().isAvast()
                },
                searchBack:{
                    couponsSearchQueries: [],
                    lastCouponsSearchPos: 0,
                    offersSearchQueries: [],
                    lastOffersSearchPos: 0,
                },
                isInstallUrl: false,
                showOffersTooltip: false,
                showCouponsTooltip: false,
                showSettingsTooltip: false
            },

            appiedCouponData: {
                images: AvastWRC.bal.utils.getLocalImageURLs({}, {
                    logo: "logo-safeprice-48.png",
                    close: "close-icon-copy-8.png",
                    checkMarkIcon: "checkmark-icon.png",
                    dashedLine: "dashed-line.png",
                    ribbonImageCouponShopName: "ribbon-coupon-shop.png",
                    rateCouponPositive: "rateCouponPositive.png",
                    rateCouponPositiveHover: "rateCouponPositiveHover.png",
                    rateCouponNegative: "rateCouponNegative.png",
                    rateCouponNegativeHover: "rateCouponNegativeHover.png"
                }),
                browserType: {isFirefox: AvastWRC.Utils.getBrowserInfo().isFirefox(),
                    isChrome: AvastWRC.Utils.getBrowserInfo().isChrome(),
                    isEdge: AvastWRC.Utils.getBrowserInfo().isEdge(),
                    isOpera: AvastWRC.Utils.getBrowserInfo().isOpera(),
                    isAvast: AvastWRC.Utils.getBrowserInfo().isAvast()
                },
                strings: AvastWRC.bal.utils.loadLocalizedStrings({},["sasCouponAppliedOnPage",
                                                                    "spNotificationRedirectShowLessMessage",
                                                                    "spNotificationRedirectShowMoreMessage",
                                                                    "save",
                                                                    "spCopyAtCheckOut", 
                                                                    "spCodeCopied", 
                                                                    "spCouponWorks",
                                                                    "spCouponCodeWorks",
                                                                    "spClickThenPaste",
                                                                    "spRateCouponsThanks"])
            },

            isDomainInSettingsWhiteList: function(url){
                if(!url) return false;

                var settings = AvastWRC.bal.settings.get();
                var urlDomain = AvastWRC.bal.getDomainFromUrl(url);

                if( !settings || !urlDomain) return false;
                
                var poppupSettings = settings.userSPPoppupSettings;

                function checkList(item) {
                    return ((item.indexOf(urlDomain) != -1) || (urlDomain.indexOf(item) != -1));
                }

                if (poppupSettings && poppupSettings.customList && poppupSettings.customList.whiteList.length > 0 && poppupSettings.customList.whiteList.findIndex(checkList) != -1) {
                    return true;
                }
                return false;
            },

            getProviderInfo: function(data) {
                var queryOptions = data;
                
                queryOptions.callback = function(domainInfoResponse) {
                    var queryData = {
                        url: this.url,
                        urlDomain: this.urlDomain,
                        tab: this.tab,
                        tabId: this.tabId,
                        showABTest: this.showABTest,
                        campaignId: this.campaignId,
                        referrer: this.referrer,
                        transactionId: this.transactionId,
                        activeTab: "",
                        panelData: data.panelData,
                        minimizedNotifications: AvastWRC.NotificationsManager.notificationsAreMinimized(),
                        isDomainInSettingsWhiteList: AvastWRC.bal.sp.isDomainInSettingsWhiteList(this.url),
                        transactionFinished: domainInfoResponse.onlyFirstRequest || false,
                        diRules: this.diRules || [],
                        search: this.search ||  {couponsSearch: {}, offersSearch: {}},
                        isSearchActive: AvastWRC.Shepherd.isSearchActive()
                    };
                    
                    queryData.diRules = queryData.diRules.length > 0 ? queryData.diRules.concat(domainInfoResponse.couponsDiRules): domainInfoResponse.couponsDiRules;
                    queryData.isdeepIntegrationEnabled = queryData.diRules.length > 0 || false;

                    queryData.urlData = this.urlData;

                    queryData.panelData = this.panelData;
                    
                    AvastWRC.bs.accessContent(queryData.tab, {
                        message: "createPanel",
                        data: queryData
                    });

                    _safeShopInTab[queryData.tab.id] = _.extend({}, queryData, domainInfoResponse);

                    _safeShopInTab[queryData.tab.id].csl = domainInfoResponse.selector ? JSON.parse(domainInfoResponse.selector) : null;

                    var cachedData = AvastWRC.TabReqCache.get(queryData.tab.id, 'safePriceInTab');
                    _safeShopInTab[queryData.tab.id].iconClicked = (cachedData && cachedData.iconClicked) ? cachedData.iconClicked : 0;

                    AvastWRC.TabReqCache.set(queryData.tab.id, 'safePriceInTab', _safeShopInTab[queryData.tab.id]);

                    if(domainInfoResponse.onlyFirstRequest &&  domainInfoResponse.firstRequestTotalLength == 0 && queryData.urlData.isfakeShop && !queryData.urlData.isTrustedFakeDomain){
                        AvastWRC.bs.accessContent(queryData.tab, {
                            message: "createFakeShopNotification",
                            data: queryData,
                        });
                    }

                    if(domainInfoResponse.onlyFirstRequest &&  domainInfoResponse.firstRequestTotalLength == 0 && queryData.urlData.isPhishingDomain && !queryData.urlData.isTrustedPhishingDomain){
                        AvastWRC.bs.accessContent(queryData.tab, {
                            message: "createPhishingDomainNotification",
                            data: queryData,
                        });
                    }

                    if(domainInfoResponse.firstRequestTotalLength > 0 ){
                        AvastWRC.bal.sp.processSafeShopCoupons(queryData.tab, _safeShopInTab[queryData.tab.id]);
                    }

                    if (!_safeShopInTab[queryData.tab.id].onlyFirstRequest) {
                        if (_safeShopInTab[queryData.tab.id]) {
                            _safeShopInTab[queryData.tab.id].count = 0;
                            AvastWRC.bal.sp.tabSafeShopCheck(queryData.tab.id, queryData.tab, queryData.url, _safeShopInTab[queryData.tab.id]);
                        }
                    }
                };
                new AvastWRC.Query.SafeShopDomainInfo(queryOptions); //query Avast SafeShopDomainInfo Proxy
            },

            siteNameIsContainedOnCurrentURL: function (url, urlToBeContained) {
                console.log("siteNameIsContainedOnCurrentURL: url: " + url + " urlToBeContained: "+ urlToBeContained);
                let urlDomain = AvastWRC.bal.getDomainFromUrl(url);
                let urlToBeContainedDomain = AvastWRC.bal.getDomainFromUrl(urlToBeContained);

                if(urlDomain.indexOf(urlToBeContainedDomain.split(".")[0]) != -1 ){
                    console.log("siteNameIsContainedOnCurrentURL couponinTab: merchant (" + urlToBeContained + ") contained in url (" + url + ")");
                    return true;
                } else if(urlToBeContainedDomain.indexOf(urlDomain.split(".")[0]) != -1 ){
                    console.log("siteNameIsContainedOnCurrentURL couponinTab: url (" + url + ") contained in merchant (" + urlToBeContained + ")");
                    return true;
                }else 
                    return false;
            },

            affiliateIsContainedOnCurrentURL: function (url, urlToBeContained) {
                if(!url || !urlToBeContained || urlToBeContained === "") return false;
                console.log("affiliateIsContainedOnCurrentURL: url: " + url + " urlToBeContained: "+ urlToBeContained);
                let urlDomain = AvastWRC.bal.getDomainFromUrl(url);
                let urlToBeContainedDomain = clearAffiliateName(urlToBeContained);
                if(!urlDomain || !urlToBeContainedDomain || urlToBeContainedDomain === "") return false;
                if(urlDomain.indexOf(urlToBeContainedDomain.split(".")[0]) != -1 ){
                    console.log("affiliateIsContainedOnCurrentURL couponinTab: affiliate (" + urlToBeContained + ") contained in url (" + url + ")");
                    return true;
                } else if(urlToBeContainedDomain.indexOf(urlDomain.split(".")[0]) != -1 ){
                    console.log("affiliateIsContainedOnCurrentURL couponinTab: url (" + url + ") contained in affiliate (" + urlToBeContained + ")");
                    return true;
                }
                return false;

                function clearAffiliateName(affiliate){
                    if(!affiliate)return "";
                    var val = affiliate.toLowerCase().split(" ");
                    if(val[0] && val[0] !== ""){
                        return val[0];
                    }else if(val[1] && val[1] !== ""){
                        return val[1];
                    }
                    return "";
                }
            },
            isCouponInTab: function (url, tab) {
                var couponInTabsToShow = AvastWRC.UtilsCache.get("coupons_tabs_to_show", tab.id);
                if(couponInTabsToShow && couponInTabsToShow.coupons){
                    let _taburl = false, _url = false, _tabTedirectUrl = false;
                    
                    _taburl = couponInTabsToShow.toBeShownIn[tab.url] || AvastWRC.bal.sp.siteNameIsContainedOnCurrentURL(tab.url, couponInTabsToShow.merchantURL) || AvastWRC.bal.sp.affiliateIsContainedOnCurrentURL(tab.url, couponInTabsToShow.affiliateName);
                    
                    if(url !== tab.url){
                        _url = couponInTabsToShow.toBeShownIn[url] || AvastWRC.bal.sp.siteNameIsContainedOnCurrentURL(tab.url, couponInTabsToShow.merchantURL) || AvastWRC.bal.sp.affiliateIsContainedOnCurrentURL(tab.url, couponInTabsToShow.affiliateName)
                    }
                    
                    if(tab.redirectUrl && tab.redirectUrl !== ""){
                        _tabTedirectUrl = couponInTabsToShow.toBeShownIn[tab.redirectUrl] ||AvastWRC.bal.sp.siteNameIsContainedOnCurrentURL(tab.redirectUrl, couponInTabsToShow.merchantURL) || AvastWRC.bal.sp.affiliateIsContainedOnCurrentURL(tab.redirectUrl, couponInTabsToShow.affiliateName)
                    } 
                    
                    if(_taburl || _url || _tabTedirectUrl){
  
                        console.log("couponTab onUrlInfoResponse show " + JSON.stringify(couponInTabsToShow));

                        AvastWRC.bs.accessContent(couponInTabsToShow.tab, {
                            message: "applyCouponInTab",
                            data: couponInTabsToShow,
                        });
                        AvastWRC.bal.emitEvent("control.show", tab.id);
                        AvastWRC.bal.emitEvent("control.setIcon", tab.id, "common/ui/icons/logo-safeprice-128.png");
                        couponInTabsToShow.lastShown = parseInt(new Date().getTime()/1000);
                        console.log("Show in tab.url: ", tab.url, "url: ", url, couponInTabsToShow.toBeShownIn);
                        return true;
                    }
                }
                return false;
            },

            isInstallUrl: function(url){
                if(!url)return false;
                let installUrl =  (AvastWRC && AvastWRC.bal) ? AvastWRC.bal.getLandingPageURL() : null;
                if(installUrl && url.indexOf(installUrl) != -1){
                    return true;
                }
                return false
            }, 

            onUrlInfoResponse: function(url, response, tab, tabUpdate) {
                if (!response){
                    console.log("no safeShop value for: " +url);
                    return;
                }
                var isSearchActive = AvastWRC.Shepherd.isSearchActive();
                if(isSearchActive){
                    AvastWRC.bal.sp.setActiveIcon(tab);
                }
                else {
                    AvastWRC.bal.sp.setDisableIcon(tab);
                }

                AvastWRC.bal.sp.setBadge(tab.id, null, false/*no animation*/);

                response.is_affiliate = false; 
                
                if (AvastWRC.bal.sp.isAnAffiliateDomain(tab, tabUpdate, url)){
                    console.log("affiliate: " + url);
                    response.is_affiliate = true;
                }                

                var data = prepareData(response, url, tab);

                if(AvastWRC.bal.sp.isInstallUrl(url) && AvastWRC.Shepherd.showPanelOnInstallPage()){
                    data.activeTab == "OFFERS_TAB_HIGHLIGHTED";
                    data.panelData.isInstallUrl = true;
                    data.panelData.showOffersTooltip = true;
                    data.panelData.showCouponsTooltip = true;

                    AvastWRC.bs.accessContent(tab, {
                        message: "showPanelInInstallPage",
                        data: data
                    });
                    AvastWRC.TabReqCache.set(data.tab.id, 'safePriceInTab', data);
                }
                else{
                    if (data.urlData.match){
                        AvastWRC.bal.sp.getProviderInfo(data);
                        //this is a shop domain we support
                        sendUrlBurger(data, "SAFE_SHOP_DOMAIN_VISITED");
    
                    }
                    
                    else{
                        if ((!data.urlData.match && data.urlData.isfakeShop && !data.urlData.isTrustedFakeDomain)
                            || (!data.urlData.match && data.urlData.isPhishingDomain && !data.urlData.isTrustedPhishingDomain)){
                            console.log(data.urlData.isfakeShop ? "createFakeShopNotification" : "createPhishingDomainNotification", data);
                            AvastWRC.bs.accessContent(data.tab, {
                                message: data.urlData.isfakeShop ? "createFakeShopNotification" : "createPhishingDomainNotification",
                                data: data
                            });
    
                            AvastWRC.bal.sp.setBadge(tab.id, null, false/*no animation*/);
                            AvastWRC.TabReqCache.set(data.tab.id, 'safePriceInTab', data);
                        }
    
                        if(data.isSearchActive && data.iconClicked){
                            AvastWRC.bs.accessContent(tab, {
                                message: "extensionIconClicked",
                                data: data,
                            });
                            AvastWRC.TabReqCache.set(data.tab.id, 'safePriceInTab', data);
                        }
                    }     
                }
                           

                function sendUrlBurger(data, eventType){
                    //this is a shop domain we support
                    var eventDetails = 	{
                        clientInfo: AvastWRC.Utils.getClientInfo(data.campaignId),
                        url: data.url,
                        eventType: eventType,
                        offer: null,
                        offerType: ""
                    };		
                    eventDetails.clientInfo.referer = AvastWRC.TabReqCache.get(tab.id,"referer");
                    eventDetails.clientInfo.transaction_id = data.transactionId;
                    (AvastWRC.Burger != undefined)? AvastWRC.Burger.emitEvent("burger.newEvent", eventDetails):console.log("no burger lib");                                
                }
                
                function prepareData(response, url, tab) {
                    var cmp = { showABTest: false,
                        campaignId: "default"};
    
                    if(AvastWRC.Shepherd){
                        cmp = (AvastWRC.Shepherd) ? AvastWRC.Shepherd.getCampaing() : cmp;
                    }
                    var data = { urlData: response};
                                        
                    // this is a shop domain start process to get coupons and offers
                    // generate an uuid to recognize the requests process

                    var cachedData = AvastWRC.TabReqCache.get(tab.id, "safePriceInTab");

                    var transactionId = AvastWRC.bal.utils.getRandomUID();

                    data =  _.extend(data, {
                        url: url,
                        urlDomain: AvastWRC.bal.getDomainFromUrl(url),
                        tab: tab,
                        tabId: tab.id,
                        showABTest: cmp.showABTest,
                        campaignId: cmp.campaignId,
                        referrer: AvastWRC.TabReqCache.get(tab.id,"referer"),
                        transactionId: transactionId,
                        iconClicked : (cachedData && cachedData.iconClicked) ? true : false,
                        activeTab: "",
                        panelData: JSON.parse(JSON.stringify(AvastWRC.bal.sp.panelData)),
                        minimizedNotifications: AvastWRC.NotificationsManager.notificationsAreMinimized(),
                        isDomainInSettingsWhiteList: AvastWRC.bal.sp.isDomainInSettingsWhiteList(url),
                        transactionFinished: false,
                        diRules: [],
                        search: {couponsSearch: {}, offersSearch: {}},
                        isSearchActive: AvastWRC.Shepherd.isSearchActive(),
                        detailsToClosed: {offerNumber: 0},
                        closeTooltipInfo: AvastWRC.CloseTooltip.getCloseTooltipInfo()
                    });

                    data.urlData.isTrustedFakeDomain = AvastWRC.NotificationsManager.isTrustedFakeDomain(data.urlDomain);
                    data.urlData.isTrustedPhishingDomain = AvastWRC.NotificationsManager.isTrustedPhishingDomain(data.urlDomain);
                    data.urlData.showFakeShop = data.urlData.isfakeShop && !data.urlData.isTrustedFakeDomain;
                    data.panelData.strings.searchTitleOffers = null;
                    data.panelData.strings.searchTitleCoupons = null;
                    data.panelData.searchConfig = AvastWRC.Shepherd.getSearchConfig();
                    data.panelData.emptySearchConfig = AvastWRC.Shepherd.getEmptySearchConfig();
                    data.panelData.searchBack = {
                        couponsSearchQueries: [],
                        lastCouponsSearchPos: 0,
                        offersSearchQueries: [],
                        lastOffersSearchPos: 0,
                    }
                    data.panelData.topBarRules = AvastWRC.Shepherd.getUIAdaptionRule(data.urlDomain);
                    data.panelData.minimizedPosition = AvastWRC.bal.settings.get().userSPPoppupSettings.notifications.minimized || {};
                    data.panelData.standardPosition = AvastWRC.bal.settings.get().userSPPoppupSettings.notifications.standard || {};
                    data.panelData.panelPosition = AvastWRC.bal.settings.get().userSPPoppupSettings.notifications.panel || {};
                    return data;                    
                }
            },

            /**
             * Initiate page data check when safeShop selector received.
             * @param {String} page URL
             * @param {Object} urlInfo response
             * @param {Object} relevant tab to run the check
             */
            tabSafeShopCheck: function(tabId, tab, url, safeShopData) {
                if (!_safeShopInTab[tab.id]) {
                    return;
                }
                else if(_safeShopInTab[tab.id].url !== safeShopData.url || _safeShopInTab[tab.id].transactionId !== safeShopData.transactionId) {
                    return;
                }
                if(safeShopData.count > 5 && _safeShopInTab[tab.id].url === safeShopData.url && _safeShopInTab[tab.id].transactionId === safeShopData.transactionId) {
                    delete _safeShopInTab[tab.id]
                    return;
                }
                _safeShopInTab[tab.id].count++;

                if (safeShopData && safeShopData.providerId){
                    var data = {
                        message: "checkSafeShop",
                        data: safeShopData
                    };
                    AvastWRC.bs.accessContent(tab, data);
                }
            },

            safeShopOffersFound: function(data, tab) {
                if (!_safeShopInTab[tab.id]) {
                    return;
                }
                else if(_safeShopInTab[tab.id].url !== data.url || _safeShopInTab[tab.id].transactionId !== data.transactionId) {
                    return;
                }
                var safeShop = _safeShopInTab[tab.id];

                var repeatScan = 0; //if we parse the site to early we have no data, so parse again

                switch (safeShop.providerId) {
                    case "ciuvo":
                       if (data.scan.name === "RequireError" && safeShop && (safeShop.count < 6 || safeShop.readyEventTriggered == false)) {
                           repeatScan = 1;
                       }
                       break;
                    case 'comprigo':
                        if (data.scan.error == true && (data.scan.message.indexOf("Error: url not match") != 0 ) && safeShop && (safeShop.count < 6 || safeShop.readyEventTriggered == false)) {
                            repeatScan = 1;
                        }
                        break;
                    //TODO add new providers here
                }
                if (repeatScan) {
                    console.log("safeShopOffersFound(): " + data.scan.name + " provider: " + safeShop.providerId);

                    var url = safeShop.url;
                    var count = safeShop.count * 100;
                    setTimeout(function(tab, url, safeShop) {
                        AvastWRC.bal.sp.tabSafeShopCheck(tab.id, tab, url, safeShop);
                    }, count, tab, url, safeShop);
                    return;
                }

                delete _safeShopInTab[tab.id];
                this.processSafeShopOffers(tab, data, function(tab, data) {
                    /*AvastWRC.bs.accessContent(tab, {
                        message: "updatePanel",
                        data: data,
                    });*/
                });            
            },

            getUserSettings: function(){
                var settings = AvastWRC.bal.settings.get();
                var poppupSettings = {};
                poppupSettings.menuOpt = JSON.parse(JSON.stringify(settings.userSPPoppupSettings));
                if(settings.userSPPoppupSettings.defaultMenu === "help"){
                    settings.userSPPoppupSettings.help.selected = false;
                    settings.userSPPoppupSettings.notifications.selected = true;
                    settings.userSPPoppupSettings.customList.selected = false;
                    settings.userSPPoppupSettings.defaultMenu = "notifications";
                    AvastWRC.bal.settings.set(settings);
                }
                else if(settings.userSPPoppupSettings.defaultMenu === "notifications" && !settings.userSPPoppupSettings.notifications.selected){
                    // to reset the values on the localstorage of the old extensions
                    settings.userSPPoppupSettings.help.selected = false;
                    settings.userSPPoppupSettings.notifications.selected = true;
                    settings.userSPPoppupSettings.customList.selected = false;
                    settings.userSPPoppupSettings.defaultMenu = "notifications";
                    AvastWRC.bal.settings.set(settings);
                    poppupSettings.menuOpt = settings.userSPPoppupSettings;
                } 
                poppupSettings.autotrigger = false;
                poppupSettings.menuOpt.customList.newSite = [];
                poppupSettings.menuOpt.customList.removeSite = [];
                poppupSettings.images = AvastWRC.bal.utils.getLocalImageURLs({}, {
                    logo: "sp-settings-logo.png",
                    close: "sp-settings-close.png",
                    add: "sp-settings-add.png",
                    erase: "sp-settings-erase.png",
                    checkbox: "checkbox-unchecked.png",
                    checkboxChecked: "checkbox-checked.png",
                    
                });
                poppupSettings.strings = AvastWRC.bal.utils.loadLocalizedStrings({},[
                    "spSettingsPageTitleAvast",
                    "spSettingsPageTitleAvg",
                    "spSettingsTabNotifications",
                    "spOffersTab",
                    "spCouponsTab",
                    "spOthersTab",
                    "spSettingsTabNotificationsOffers",
                    "spSettingsTabNotificationsOffersTitle",                    
                    "spSettingsTabNotificationsOffersShowAll",
                    "spSettingsTabNotificationsOffersBetter",
                    "spSettingsTabNotificationsOffersHideAll",
                    "spSettingsTabNotificationsOffersHideAllDesc",
                    "spSettingsTabNotificationAccommodationsTitle",
                    "spSettingsTabNotificationsAccommodationsShowBetter",
                    "spSettingsTabNotificationsAccommodationsSimilar",
                    "spSettingsTabNotificationsAccommodationsPopular",
                    "spSettingsTabNotificationsCoupons",
                    "spSettingsTabNotificationsCouponsShowAll",
                    "spSettingsTabNotificationsCouponsShowOnce",
                    "spSettingsTabNotificationsCouponsHide",
                    "spSettingsTabNotificationsCouponsHideDesc",
                    "spSettingsTabNotificationsOthers",
                    "spSettingsTabNotificationsOthersDesc",                    
                    "spSettingsPageCustomList",
                    "spSettingsPageCustomListTitle",
                    "spSettingsPageCustomListTitleDesc",
                    "spSettingsPageCustomListItemAddSite",                    
                    "spSettingsPageCustomListItemAdd",
                    "spSettingsPageHelp",
                    "spSettingsPageHelpNotificationsTitle",
                    "spSettingsPageHelpNotificationsTitleDesc",
                    "spSettingsPageHelpOffersTitle",
                    "spSettingsPageHelpOffersTitleDesc",
                    "spSettingsPageHelpCouponsTitle",
                    "spSettingsPageHelpCouponsTitleDesc",
                    "spSettingsPageHelpOthersTitle",
                    "spSettingsTabNotificationsOthersTitle",
                    "spSettingsPageHelpOthersTitleDesc",
                    "spSettingsPageHelpFAQsTitle",
                    "spSettingsPageCancel",
                    "spSettingsPageSave",
                    "sasHintSettings"]);
                poppupSettings.strings.spSettingsTabNotifications = poppupSettings.strings.spSettingsTabNotifications.toUpperCase();
                poppupSettings.strings.spSettingsPageCustomList = poppupSettings.strings.spSettingsPageCustomList.toUpperCase();
                poppupSettings.strings.spSettingsPageHelp = poppupSettings.strings.spSettingsPageHelp.toUpperCase();
                poppupSettings.strings.spSettingsPageCancel = poppupSettings.strings.spSettingsPageCancel.toUpperCase();
                poppupSettings.strings.spSettingsPageSave = poppupSettings.strings.spSettingsPageSave.toUpperCase();
                poppupSettings.strings.spSettingsPageCustomListItemAddSite = poppupSettings.strings.spSettingsPageCustomListItemAddSite.toUpperCase();
                poppupSettings.strings.spSettingsPageCustomListItemAdd = poppupSettings.strings.spSettingsPageCustomListItemAdd.toUpperCase();
				var whiteList = _(poppupSettings.menuOpt.customList.whiteList) ||[];
                poppupSettings.menuOpt.customList.whiteList = whiteList.valueOf();
                return poppupSettings;
            },

            prepareOptionsData: function(){
                var cmp = { showABTest: false,
                    campaignId: "default"};

                if(AvastWRC.Shepherd){
                    cmp = AvastWRC.Shepherd.getCampaing();
                }
                var poppupSettings = AvastWRC.bal.sp.getUserSettings();
                var browserInfo = AvastWRC.Utils.getBrowserInfo();
                var settingsData = {
                    message: "user_settings",
                    data: {
                        poppupSettings: poppupSettings,
                        poppupSettingsNew: JSON.parse(JSON.stringify(poppupSettings)),
                        updateBar: false,
                        avastBranding: AvastWRC.bal.brandingType == undefined || AvastWRC.bal.brandingType == AvastWRC.BRANDING_TYPE_AVAST ? true : false,
                        campaignId: cmp.campaignId,
                        isFirefox: browserInfo.isFirefox(),
                        isChrome: browserInfo.isChrome(),
                        isEdge: browserInfo.isEdge(),
                        isOpera: browserInfo.isOpera(),
                        isSafari: browserInfo.isSafari(),
                        isAvast: browserInfo.isAvast(),
                        ispoppupSettings: false
                    },
                };
                return settingsData;
            },

            openNotificationsInSettignsPage: function(){
                var settings =  AvastWRC.bal.settings.get();
                settings.userSPPoppupSettings.help.selected = false;
                settings.userSPPoppupSettings.notifications.selected = true;
                settings.userSPPoppupSettings.customList.selected = false;
                settings.userSPPoppupSettings.defaultMenu = "notifications";
                AvastWRC.bal.settings.set(settings);
                if(AvastWRC.Utils.getBrowserInfo().isEdge()){
                    var optionsPage = AvastWRC.bs.getLocalResourceURL("options.html");
                    AvastWRC.bs.openInNewTab(optionsPage);
                }
                else {
                    AvastWRC.bal.back.openOptions();
                }  
            },

            openHelpInSettignsPage: function(){
                var settings =  AvastWRC.bal.settings.get();
                settings.userSPPoppupSettings.help.selected = true;
                settings.userSPPoppupSettings.notifications.selected = false;
                settings.userSPPoppupSettings.customList.selected = false;
                settings.userSPPoppupSettings.defaultMenu = "help";
                AvastWRC.bal.settings.set(settings);
                if(AvastWRC.Utils.getBrowserInfo().isEdge()){
                    var optionsPage = AvastWRC.bs.getLocalResourceURL("options.html");
                    AvastWRC.bs.openInNewTab(optionsPage);
                }
                else {
                    AvastWRC.bal.back.openOptions();
                }  
            },

            getAppliedCouponData: function(tab, eventDetails, requestUrl){
                var couponInTabInfo =  {}; // data for other messages
                couponInTabInfo.appiedCouponData = AvastWRC.bal.sp.appiedCouponData; 
                couponInTabInfo.tab = tab;
                var coupon = [];
                coupon.push(eventDetails.offer);
                coupon.selected = true;
                couponInTabInfo.coupons = _(coupon).valueOf() || _([]);
                couponInTabInfo.coupon_code = (coupon[0]) ? coupon[0].coupon_code : "";
                couponInTabInfo.couponsLength = 1;
                couponInTabInfo.vouchersSelected = true;
                couponInTabInfo.vouchersAvailable = false;
                couponInTabInfo.vouchersSelectedCounter = 1;
                couponInTabInfo.vouchersCounterBig = false;
                couponInTabInfo.transactionId = eventDetails.clientInfo.transaction_id;
                couponInTabInfo.merchantURL = eventDetails.url;
                couponInTabInfo.urlDomain = eventDetails.urlDomain;
                couponInTabInfo.affiliateName = coupon[0].affiliate;
                couponInTabInfo.couponUrl = coupon[0].url;
                couponInTabInfo.isSearch = coupon[0].isSearch;
                couponInTabInfo.country = eventDetails.country;
                couponInTabInfo.voucherProviderId = eventDetails.voucherProviderId;
                couponInTabInfo.avastBranding = AvastWRC.bal.brandingType == undefined || AvastWRC.bal.brandingType == AvastWRC.BRANDING_TYPE_AVAST ? true : false;
                
                couponInTabInfo.toBeShownIn = [];
                couponInTabInfo.toBeShownIn[eventDetails.offer.url] = true;
                if(requestUrl) {
                    couponInTabInfo.toBeShownIn[requestUrl] = true;
                }
                console.log("couponInTabInfo", couponInTabInfo);
                return couponInTabInfo;
            },

            getBurgerClickData: function (data, isOffer, eventDetails) {
                eventDetails = _.extend(eventDetails, {
                    providerId: data.providerId,
                    query: data.query,
                    offerQuery: data.offerQuery,
                    bestOffer: data.bestOffer,
                    eventType: "OFFER_PICKED",
                    clickType: data.which,
                    uiSource: data.uiSource,                    
                    country: data.country,
                    ui_id: data.ruleId || "000",
                    url: data.merchantURL,
                    isLinkClick: data.isLinkClick
                });

                if(isOffer){
                    eventDetails.offer = data.offer;
                    eventDetails.offerCategory = data.offerCategory;
                }
                else{
                    eventDetails.offer = data.coupon;
                    eventDetails.offerCategory = data.couponCategory;
                }
                eventDetails.offer.listPosition = data.positionInList,
                eventDetails.offer.showOffersNotification = data.showOffersNotification;
                eventDetails.offer.showPriceComparisonNotification = data.showPriceComparisonNotification;
                return eventDetails;
            },
            getUrlData: function (data) {
                let PickedOfferType = {
                    UNKNOWN: 0,
                    PRODUCT: 1,
                    ACCOMMODATION: 2,
                    REDIRECT: 3,
                    VOUCHER: 4,
                    EMPTY_SEARCH_REDIRECT_OFFER: 5,
                    EMPTY_SEARCH_REDIRECT_VOUCHER: 6,
                }
                let result = {client: data.clientInfo.client,
                    campaign_id: data.clientInfo.campaign_id,
                    rule_id: data.ui_id || "000",
                    transaction_id: data.clientInfo.transaction_id,
                    browser_type: data.clientInfo.browser.type,
                    a_guid: data.clientInfo.guid,
                    x_guid: data.clientInfo.extension_guid,
                    country_code: data.country,
                    source_url: data.url,
                    offer_type: PickedOfferType[data.offerCategory],
                    provider_id: data.providerId,
                    language: data.clientInfo.browser.language,
                    provider_redirect_id: data.offer.provider_redirect_id};
                console.log("getUrlData: ", data, result)
                return result;

            },
            saveCouponInTab: function(newTab, eventDetails, requestUrl, close){
                var couponInTabInfo =  AvastWRC.bal.sp.getAppliedCouponData(newTab, eventDetails, requestUrl);
                if(!close){
                    AvastWRC.UtilsCache.set("coupons_tabs_to_show", newTab.id, couponInTabInfo);
                }
                else{
                    AvastWRC.UtilsCache.set("coupons_tabs_to_remove", newTab.id, couponInTabInfo);
                }     
            },
            safeShopFeedback: function(data, tab) {
                var settings = AvastWRC.bal.settings.get();
                var cmpId = data.campaignId;
                if(cmpId == "" || !cmpId){
                    cmpId = AvastWRC.Shepherd.getCampaing().campaignId;
                }
                var eventDetails = 	{
                    clientInfo: AvastWRC.Utils.getClientInfo(cmpId),
                    url: data.url,
                    eventType: "",
                    offer: null,
                    offerCategory: ""
                };			
                eventDetails.clientInfo.referer = data.referrer || "";		
                eventDetails.clientInfo.transaction_id = data.transactionId || "";
                
                switch (data.type) {
                    case "offer_click":
                        // open URL in new tab        
                        settings.features.usage.clicks = settings.features.usage.clicks + 1;
                        AvastWRC.bal.settings.set(settings);
                        AvastWRC.bal.sp.getBurgerClickData(data, true, eventDetails);
                        var offerUrlDataInfo = AvastWRC.bal.sp.getUrlData(eventDetails);

                        var requestUrl = `${data.url}&p2=${encodeURIComponent(JSON.stringify(offerUrlDataInfo))}`;
                        console.log("offer url to open: ", requestUrl);

                        (AvastWRC.Burger != undefined)? AvastWRC.Burger.emitEvent("burger.newEvent", eventDetails):console.log("no burger lib");
                       
                        AvastWRC.bs.openInNewTab(requestUrl);
 
                        AvastWRC.YesNo.registerInteraction(tab);
                        break;
                    case "coupon_click":
                        // 1. Send burger
                        // 2. Open the link in a new tab, wait for the redirects to finish (return to original domain) increase the number of clicks
                        // 3. Insert new Bar with coupon_code and coupon_text
                        if (data.suppress_x_timeout && data.uiSource !== "SEARCH") data.uiSource = "CHECKOUT_MAINUI_ITEM";
                        AvastWRC.UtilsCache.set("active_coupons", data.coupon.url, data.coupon);
                        AvastWRC.bal.sp.getBurgerClickData(data, false, eventDetails);
                        var couponUrlDataInfo = AvastWRC.bal.sp.getUrlData(eventDetails);

                        var requestUrl = `${data.url}&p2=${encodeURIComponent(JSON.stringify(couponUrlDataInfo))}`;

                        console.log("coupon url to open: ", requestUrl);
                        
                        var couponsShowConfig = AvastWRC.Shepherd.getCouponsShowConfig();
                        var couponShowConfig = {};

                        (AvastWRC.Burger != undefined)? AvastWRC.Burger.emitEvent("burger.newEvent", eventDetails):console.log("no burger lib");

                        if(eventDetails.uiSource == "SEARCH" || eventDetails.isLinkClick){
                            couponShowConfig = {showInTab: "ACTIVE", close: false, closeAfter: null};   
                            console.log("SHOW COUPON CONFIG: this is a search coupon or an appliedCoupon-> config: ", couponShowConfig);
                        }
                        else if(eventDetails.offer.coupon_code){
                            couponShowConfig = couponsShowConfig.couponsWithCode;
                            console.log("SHOW COUPON CONFIG this is a coupon with code-> config: ", couponShowConfig);
                        }
                        else{
                            couponShowConfig = couponsShowConfig.couponsWithoutCode;
                            console.log("SHOW COUPON CONFIG: this is a coupon without code-> config: ", couponShowConfig);                            
                        }
                        if(couponShowConfig.showInTab.toUpperCase() == "ACTIVE") {
                            AvastWRC.bs.openInNewTab(requestUrl, function(newTab) {
                                AvastWRC.bal.sp.saveCouponInTab(newTab, eventDetails, requestUrl, couponShowConfig.close);
                            });
                        }else if(couponShowConfig.showInTab.toUpperCase() == "INACTIVE") {
                            AvastWRC.bs.openInNewTabInactive(requestUrl, function(newTab) {
                                AvastWRC.bal.sp.saveCouponInTab(newTab, eventDetails, requestUrl, couponShowConfig.close);
                            });
                        }
                        AvastWRC.YesNo.registerInteraction(tab);
                        break;
                    case "main_ui_event":
                        eventDetails.eventType = "MAIN_UI";
                        if (data.suppress_x_timeout) eventDetails.uiSource = "CHECKOUT";
                        eventDetails.category = data.category;
                        eventDetails.ui_id = data.ruleId;
                        switch (data.action) {
                            case "shown":
                                eventDetails.type = "SHOWN";
                                if (eventDetails.category === "COUPONS_TAB_HIGHLIGHTED"){
                                    setTimeout(() => {
                                        AvastWRC.NotificationsManager.disableCouponsForDomain(AvastWRC.bal.getDomainFromUrl(data.url));
                                    }, 2000);                                    
                                }
                                (AvastWRC.Burger != undefined)? AvastWRC.Burger.emitEvent("burger.newEvent", eventDetails):console.log("no burger lib");
                                AvastWRC.bal.sp.disableBadgeAnimation();
                                AvastWRC.NotificationsManager.removeDomainFromBlacklist(AvastWRC.bal.getDomainFromUrl(data.url));
                                break;
                            case "close_click":
                                eventDetails.type = "CLICKED_X";
                                (AvastWRC.Burger != undefined)? AvastWRC.Burger.emitEvent("burger.newEvent", eventDetails):console.log("no burger lib");
                                if(data.category == "COUPON_APPLIED_NOTIFICATION"){
                                    eventDetails.url = tab.url;
                                    data.data.closedCouponUrl = tab.url;                                    
                                    AvastWRC.UtilsCache.set("closed_applied_coupon", tab.id, data.data);
                                    AvastWRC.UtilsCache.remove("coupons_tabs_to_show", tab.id);
                                }
                                if(data.isPanelNotification && data.category != "COUPON_APPLIED_NOTIFICATION"){
                                    AvastWRC.NotificationsManager.disableCategoryForDomain(AvastWRC.bal.getDomainFromUrl(data.url), data.categoryFlag || 0);
                                }
                                AvastWRC.NotificationsManager.addDomainToBlacklist(AvastWRC.bal.getDomainFromUrl(data.url));
                                AvastWRC.NotificationsManager.setMinimized(false);
                                break;
                            case "minimize_click":
                                AvastWRC.NotificationsManager.setMinimized(true);
                                eventDetails.type = "CLICKED_MINIMIZE";
                                (AvastWRC.Burger != undefined)? AvastWRC.Burger.emitEvent("burger.newEvent", eventDetails):console.log("no burger lib");
                                break;
                            case "settings_click":
                                AvastWRC.bal.sp.openNotificationsInSettignsPage();
                                eventDetails.type = "CLICKED_SETTINGS";
                                (AvastWRC.Burger != undefined)? AvastWRC.Burger.emitEvent("burger.newEvent", eventDetails):console.log("no burger lib");
                                break;
                            case "help_click":  
                                AvastWRC.bal.sp.openHelpInSettignsPage();                              
                                eventDetails.type = "CLICKED_HELP";
                                (AvastWRC.Burger != undefined)? AvastWRC.Burger.emitEvent("burger.newEvent", eventDetails):console.log("no burger lib");
                                break;
                            case "offers_tab_click":
                                eventDetails.type = "CLICKED_OFFERS_TAB";
                                (AvastWRC.Burger != undefined)? AvastWRC.Burger.emitEvent("burger.newEvent", eventDetails):console.log("no burger lib");
                                break;
                            case "coupons_tab_click":
                                eventDetails.type = "CLICKED_COUPONS_TAB";
                                (AvastWRC.Burger != undefined)? AvastWRC.Burger.emitEvent("burger.newEvent", eventDetails):console.log("no burger lib");
                                break;
                            case "others_tab_click":
                                eventDetails.type = "CLICKED_OTHERS_TAB";
                                (AvastWRC.Burger != undefined)? AvastWRC.Burger.emitEvent("burger.newEvent", eventDetails):console.log("no burger lib");
                                break;
                        }
                        break;
                    case "notifications_events":
                        eventDetails.eventType = data.notificationType;
                        eventDetails.category = data.category;
                        eventDetails.ui_id = data.ruleId;
                        switch (data.action) {
                            case "button_click":
                                eventDetails.type = "CLICKED_CTA";
                                (AvastWRC.Burger != undefined)? AvastWRC.Burger.emitEvent("burger.newEvent", eventDetails):console.log("no burger lib");
                                break;
                            case "close_click":
                                AvastWRC.NotificationsManager.disableCategoryForDomain(AvastWRC.bal.getDomainFromUrl(data.url), data.categoryFlag || 0);
                                eventDetails.type = "CLICKED_X";
                                (AvastWRC.Burger != undefined)? AvastWRC.Burger.emitEvent("burger.newEvent", eventDetails):console.log("no burger lib");
                                break;
                            case "settings_click": 
                                AvastWRC.bal.sp.openNotificationsInSettignsPage();
                                eventDetails.type = "CLICKED_SETTINGS";
                                (AvastWRC.Burger != undefined)? AvastWRC.Burger.emitEvent("burger.newEvent", eventDetails):console.log("no burger lib");
                                break;                            
                            case "shown":
                                eventDetails.type = "SHOWN";
                                if (eventDetails.category === "COUPONS"){
                                    setTimeout(() => {
                                        AvastWRC.NotificationsManager.disableCouponsForDomain(AvastWRC.bal.getDomainFromUrl(data.url));
                                    }, 2000);                                    
                                }
                                (AvastWRC.Burger != undefined)? AvastWRC.Burger.emitEvent("burger.newEvent", eventDetails):console.log("no burger lib");
                                break;
                            case "failed":
                                eventDetails.type = data.failureType;
                                (AvastWRC.Burger != undefined)? AvastWRC.Burger.emitEvent("burger.newEvent", eventDetails):console.log("no burger lib");
                        }
                        break;
                    case "FAKE_SHOP":
                    case "PHISHING_SHOP":
                        eventDetails.eventType = "SECURITY";
                        eventDetails.category = data.category;
                        eventDetails.ui_id = data.ruleId;
                        switch (data.action) {
                            case "button_click":
                                AvastWRC.bal.openSearchPageInTab(tab);
                                eventDetails.type = "CLICKED_CTA";
                                (AvastWRC.Burger != undefined)? AvastWRC.Burger.emitEvent("burger.newEvent", eventDetails):console.log("no burger lib");
                                break;
                            case "link_click":
                                eventDetails.type = "CLICKED_CONTINUE";
                                if(data.category == "BAD_SHOP"){
                                    AvastWRC.NotificationsManager.setTrustedFakeDomain(data.urlDomain);
                                }
                                else if(data.category == "PHISHING"){
                                    AvastWRC.NotificationsManager.setTrustedPhishingDomain(data.urlDomain);
                                }
                                (AvastWRC.Burger != undefined)? AvastWRC.Burger.emitEvent("burger.newEvent", eventDetails):console.log("no burger lib");
                                break;
                            case "close_click":
                                AvastWRC.NotificationsManager.disableCategoryForDomain(AvastWRC.bal.getDomainFromUrl(data.url), data.categoryFlag || 0);
                                eventDetails.type = "CLICKED_X";
                                (AvastWRC.Burger != undefined)? AvastWRC.Burger.emitEvent("burger.newEvent", eventDetails):console.log("no burger lib");
                                break;                         
                            case "shown":
                                eventDetails.type = "SHOWN";
                                (AvastWRC.Burger != undefined)? AvastWRC.Burger.emitEvent("burger.newEvent", eventDetails):console.log("no burger lib");
                                break;

                        }
                        break;
                    case "minimized_ui_clicked":
                        eventDetails.eventType = "NOTIFICATIONS_MINIMIZED";
                        eventDetails.type = "CLICKED_CTA";
                        eventDetails.ui_id = data.ruleId;
                        (AvastWRC.Burger != undefined)? AvastWRC.Burger.emitEvent("burger.newEvent", eventDetails):console.log("no burger lib");
                        break;
                    case "minimized_ui_shown":
                       if (data.minimizedWithCoupons){
                            setTimeout(() => {
                                AvastWRC.NotificationsManager.disableCouponsForDomain(AvastWRC.bal.getDomainFromUrl(data.url));
                            }, 2000);
                        }
                        eventDetails.eventType = "NOTIFICATIONS_MINIMIZED";
                        eventDetails.type = "SHOWN";
                        eventDetails.ui_id = data.ruleId;
                        (AvastWRC.Burger != undefined)? AvastWRC.Burger.emitEvent("burger.newEvent", eventDetails):console.log("no burger lib");
                        AvastWRC.bal.sp.disableBadgeAnimation();
                        break;
                    case "minimized_ui_dragged_ended":
                        let minimizedSettings = _.extend({}, settings.userSPPoppupSettings.notifications.minimized) || {};
                        minimizedSettings.position = data.position;
                        settings.userSPPoppupSettings.notifications.minimized = minimizedSettings;
                        break;
                    case "standard_ui_dragged_ended":
                        let standardSettings = _.extend({}, settings.userSPPoppupSettings.notifications.standard) || {};
                        standardSettings.position = data.position;
                        settings.userSPPoppupSettings.notifications.standard = standardSettings;
                        break;
                    case "panel_ui_dragged_ended":
                        let panelSettings = _.extend({}, settings.userSPPoppupSettings.notifications.panel) || {};
                        panelSettings.position = data.position;
                        settings.userSPPoppupSettings.notifications.panel = panelSettings;
                        break;
                    case "reset_icon_click":
                        var cachedData = AvastWRC.TabReqCache.get(tab.id, "safePriceInTab");
                        if(cachedData){
                            cachedData.iconClicked = 0;
                            AvastWRC.TabReqCache.set(tab.id, "safePriceInTab", cachedData);
                        }
                        break;
                    case "settings_page":
                        switch (data.action) {
                            case "get_user_settings":
                                var settingsData = AvastWRC.bal.sp.prepareOptionsData();
                                AvastWRC.bal.back.messageOptions(settingsData);
                                break;
                            case "settings_shown":
                                eventDetails.eventType = "SETTINGS_EVENTS";
                                eventDetails.type = "SHOWN";
                                (AvastWRC.Burger != undefined)? AvastWRC.Burger.emitEvent("burger.newEvent", eventDetails):console.log("no burger lib");
                                break;
                            case "close_settings":
                                AvastWRC.bs.closeTab(tab);               
                                break;
                            case "save-new-menu-selection":
                                if(data.newSettings.help.selected)
                                {
                                    eventDetails.eventType = "SETTINGS_EVENTS";
                                    eventDetails.type = "CLICKED_HELP";
                                    (AvastWRC.Burger != undefined)? AvastWRC.Burger.emitEvent("burger.newEvent", eventDetails):console.log("no burger lib");
                                }
                                break;
                            case "save-settings":
                                eventDetails.eventType = "SAVE_SETTINGS";
                                eventDetails.newSettings = AvastWRC.Utils.buildUserSettingsMessage(data.newSettings);
                                settings.userSPPoppupSettings = data.newSettings;
                                settings.userSPPoppupSettings.notifications.settingsChanged = false;
                                settings.userSPPoppupSettings.customList.settingsChanged = false;
                                settings.userSPPoppupSettings.defaultMenuChanged = false;
                                AvastWRC.bal.settings.set(settings);
                                (AvastWRC.Burger != undefined)? AvastWRC.Burger.emitEvent("burger.newEvent", eventDetails):console.log("no burger lib");
                                console.log("settings popup: save button click");
                                break;
                            case "faqs_clicked": 
                                eventDetails.eventType = "SETTINGS_EVENTS";
                                eventDetails.type = "CLICKED_FAQS";
                                AvastWRC.bal.openFAQsPageTab();
                                (AvastWRC.Burger != undefined)? AvastWRC.Burger.emitEvent("burger.newEvent", eventDetails):console.log("no burger lib");
                                break;
                        }
                        AvastWRC.bal.settings.set(settings);
                        break;
                    case "SETTINGS_TOOLTIP":
                        eventDetails.eventType = "DIALOGS";
                        eventDetails.category = "SETTINGS_TOOLTIP";
                        switch (data.action) {
                            case"SHOWN":
                                eventDetails.type = data.action;
                                (AvastWRC.Burger != undefined) ? AvastWRC.Burger.emitEvent("burger.newEvent", eventDetails) : console.log("no burger lib");
                                break;
                            case "CLICKED_CTA":
                                eventDetails.type = data.action;
                                AvastWRC.SettingsTooltip.tooltipShown();
                                (AvastWRC.Burger != undefined) ? AvastWRC.Burger.emitEvent("burger.newEvent", eventDetails) : console.log("no burger lib");
                                break;
                            case "CLICKED_SETTINGS":
                                eventDetails.type = data.action;
                                AvastWRC.SettingsTooltip.tooltipShown();
                                (AvastWRC.Burger != undefined) ? AvastWRC.Burger.emitEvent("burger.newEvent", eventDetails) :console.log("no burger lib");
                                break;
                        }
                        break;
                    case "feedback_main":
                        eventDetails.eventType = "FEEDBACK";
                        eventDetails.category = "MAIN";
                        eventDetails.ui_id = data.ruleId;
                        switch (data.action) {
                            case "shown":
                                eventDetails.type = "SHOWN";
                                (AvastWRC.Burger != undefined)? AvastWRC.Burger.emitEvent("burger.newEvent", eventDetails):console.log("no burger lib");
                                AvastWRC.YesNo.userAsked();
                                break;
                            case "clicked_rate_good":
                                eventDetails.type = "CLICKED_RATE_GOOD";
                                (AvastWRC.Burger != undefined)? AvastWRC.Burger.emitEvent("burger.newEvent", eventDetails):console.log("no burger lib");
                                break;
                            case "clicked_rate_bad":
                                eventDetails.type = "CLICKED_RATE_BAD";
                                (AvastWRC.Burger != undefined)? AvastWRC.Burger.emitEvent("burger.newEvent", eventDetails):console.log("no burger lib");
                                break;
                            case "clicked_ask_me_later":
                                eventDetails.type = "CLICKED_ASK_ME_LATER";
                                (AvastWRC.Burger != undefined)? AvastWRC.Burger.emitEvent("burger.newEvent", eventDetails):console.log("no burger lib");
                                AvastWRC.YesNo.enableAskLater();
                                break;
                        }                        
                        break;
                    case "feedback_like":
                        eventDetails.eventType = "FEEDBACK";
                        eventDetails.category = "LIKE";
                        eventDetails.ui_id = data.ruleId;
                        switch (data.action) {
                            case "shown":
                                eventDetails.type = "SHOWN";
                                (AvastWRC.Burger != undefined)? AvastWRC.Burger.emitEvent("burger.newEvent", eventDetails):console.log("no burger lib");
                                break;
                            case "clicked_x":
                                eventDetails.type = "CLICKED_X";
                                (AvastWRC.Burger != undefined)? AvastWRC.Burger.emitEvent("burger.newEvent", eventDetails):console.log("no burger lib");
                                break;
                            case "clicked_cta":
                                eventDetails.type = "CLICKED_CTA";
                                (AvastWRC.Burger != undefined)? AvastWRC.Burger.emitEvent("burger.newEvent", eventDetails):console.log("no burger lib");
                                AvastWRC.YesNo.positiveFeedbackDone();
                                break;
                        }
                        break;
                    case "feedback_dislike":
                        eventDetails.eventType = "FEEDBACK";
                        eventDetails.category = "DISLIKE";
                        eventDetails.ui_id = data.ruleId;
                        switch (data.action) {
                            case "shown":
                                eventDetails.type = "SHOWN";
                                (AvastWRC.Burger != undefined)? AvastWRC.Burger.emitEvent("burger.newEvent", eventDetails):console.log("no burger lib");
                                break;
                            case "clicked_x":
                                eventDetails.type = "CLICKED_X";
                                (AvastWRC.Burger != undefined)? AvastWRC.Burger.emitEvent("burger.newEvent", eventDetails):console.log("no burger lib");
                                break;
                            case "clicked_cta":
                                eventDetails.type = "CLICKED_CTA";
                                (AvastWRC.Burger != undefined)? AvastWRC.Burger.emitEvent("burger.newEvent", eventDetails):console.log("no burger lib");
                                AvastWRC.YesNo.negativeFeedbackDone();
                                break;
                        }
                        break;
                    case "social_card":
                        eventDetails.eventType = (data.type) ? data.type.toUpperCase() : null;
                        eventDetails.type = (data.type) ? data.action.toUpperCase() : null;
                        eventDetails.category =  (data.category) ? data.category.toUpperCase() : null;
                        eventDetails.uiSource =  (data.uiSource) ? data.uiSource.toUpperCase() : null;
                        switch (data.action) {
                            case "shown":
                                if(data.category === "top"){
                                    eventDetails.uiSource = "MAIN_UI_COUPONS_TAB";
                                    (AvastWRC.Burger != undefined)? AvastWRC.Burger.emitEvent("burger.newEvent", eventDetails):console.log("no burger lib");
                                }else if(data.category === "bottom"){
                                    if(data.socialData.showInBottomOffers){
                                        eventDetails.uiSource = "MAIN_UI_OFFERS_TAB";
                                        (AvastWRC.Burger != undefined)? AvastWRC.Burger.emitEvent("burger.newEvent", eventDetails):console.log("no burger lib");
                                    }
                                    if(data.socialData.showInBottomCoupons){
                                        eventDetails.uiSource = "MAIN_UI_COUPONS_TAB";
                                        (AvastWRC.Burger != undefined)? AvastWRC.Burger.emitEvent("burger.newEvent", eventDetails):console.log("no burger lib");
                                    }   
                                }                                                             
                                break;
                            case "clicked_x":
                                (AvastWRC.Burger != undefined)? AvastWRC.Burger.emitEvent("burger.newEvent", eventDetails):console.log("no burger lib");
                                break;
                            case "clicked_f":
                                AvastWRC.Social.shareOnFb();
                                (AvastWRC.Burger != undefined)? AvastWRC.Burger.emitEvent("burger.newEvent", eventDetails):console.log("no burger lib");
                                break;
                            case "clicked_t":
                                AvastWRC.Social.shareOnTttr();
                                (AvastWRC.Burger != undefined)? AvastWRC.Burger.emitEvent("burger.newEvent", eventDetails):console.log("no burger lib");
                                break;
                        }
                        break;
                    case "search":
                        var cachedTabData = AvastWRC.TabReqCache.get(tab.id, "safePriceInTab");
                        if(data.searchBack){
                            var cachedTabData = AvastWRC.TabReqCache.get(tab.id, "safePriceInTab");
                            cachedTabData.panelData.searchBack = data.searchBack;
                            
                        }
                        cachedTabData.panelData.showOffersTooltip = data.showOffersTooltip;
                        cachedTabData.panelData.showCouponsTooltip = data.showCouponsTooltip;
                        AvastWRC.TabReqCache.set(tab.id, "safePriceInTab", cachedTabData);
                        switch (data.action) {
                            case "offers":
                                AvastWRC.bal.sp.processSearchOffers(tab, data);
                                break;
                            case "coupons":
                                AvastWRC.bal.sp.processSearchCoupons(tab, data);
                                break;
                            case "update_detailsToClosed":
                                var cachedTabData = AvastWRC.TabReqCache.get(tab.id, "safePriceInTab");
                                cachedTabData.detailsToClosed = data.detailsToClosed;
                                AvastWRC.TabReqCache.set(tab.id, "safePriceInTab", cachedTabData);
                                if(cachedTabData.detailsToClosed && cachedTabData.detailsToClosed.offerNumber > 0){
                                    AvastWRC.bal.sp.setActiveIcon(tab);
                                    AvastWRC.bal.sp.setBadge(tab.id, cachedTabData.detailsToClosed.offerNumber.toString(), false/*no animation*/);
                                }
                                break;
                            case "empty_search_redirect":                                
                                let emptySearchTypes = { //PickedOfferType
                                    EMPTY_SEARCH_REDIRECT_OFFER: 5,
                                    EMPTY_SEARCH_REDIRECT_VOUCHER: 6,
                                }
                                let offerUrlDataInfo = {client: eventDetails.clientInfo.client,
                                    campaign_id: eventDetails.clientInfo.campaign_id,
                                    rule_id: data.ui_id || "000",
                                    transaction_id: eventDetails.clientInfo.transaction_id,
                                    browser_type: eventDetails.clientInfo.browser.type,
                                    a_guid: eventDetails.clientInfo.guid,
                                    x_guid: eventDetails.clientInfo.extension_guid,
                                    country_code: data.country || "",
                                    source_url: data.url,
                                    offer_type: 3,
                                    provider_id: "EMPTY_SEARCH",
                                    language: eventDetails.clientInfo.browser.language};
                                let redirectUrl = data.redirectButtonUrl.replace("{{searchquery}}", data.querySearch);
                                let serverSP = AvastWRC.Query.CONST.SAFESHOP_SERVERS[AvastWRC.CONFIG.serverType] + AvastWRC.Query.CONST.SAFESHOP_ENDPOINTS[4];
                                var requestUrl = `${serverSP}${encodeURIComponent(redirectUrl)}&p2=${encodeURIComponent(JSON.stringify(offerUrlDataInfo))}`;
                                console.log("empty_search_redirect url to open: ", requestUrl);
                                    
                                AvastWRC.bs.openInNewTab(requestUrl); 
                                break;
                        }
                        break;
                    case "OFFERS_RATING":
                        eventDetails.eventType = "OFFERS_RATING";
                        if(data.offerCategory == "VOUCHER"){
                            AvastWRC.UtilsCache.set("rated_coupons", data.offer.url, true);
                        }else if(data.offerCategory == "PRODUCT"){
                            AvastWRC.UtilsCache.set("rated_product", data.offer.url, true);
                        }
                        else if(data.offerCategory == "ACCOMMODATION"){
                            AvastWRC.UtilsCache.set("rated_accommodation", data.offer.url, true);
                        }
                        else if(data.offerCategory == "REDIRECT"){
                            AvastWRC.UtilsCache.set("rated_redirect", data.offer.url, true);
                        }
                        var appliedCouponInTab = AvastWRC.UtilsCache.get("coupons_tabs_to_show", tab.id);
                        if(appliedCouponInTab && appliedCouponInTab.coupons && appliedCouponInTab.coupons[0]){
                            appliedCouponInTab.coupons[0].rated = true;
                            AvastWRC.UtilsCache.set("coupons_tabs_to_show", tab.id, appliedCouponInTab);
                        }                        
                        eventDetails.offer = data.offer;
                        eventDetails.offerCategory = data.offerCategory;
                        eventDetails.url = data.url || tab.url; 
                        eventDetails.country = data.country;
                        eventDetails.ruleId = data.ruleId;
                        eventDetails.ratedPositive = data.ratedPositive?1:0;
                        (AvastWRC.Burger != undefined)? AvastWRC.Burger.emitEvent("burger.newEvent", eventDetails):console.log("no burger lib");
                        break;
                    case "TOOLTIP_CLICK_X":
                        eventDetails.type = data.action;
                        eventDetails.eventType = "DIALOGS";
                        eventDetails.category = "TOOLTIP_CLICK_X";
                        if(data.action != "HIDE"){
                            AvastWRC.Burger.emitEvent("burger.newEvent", eventDetails);
                        }                        
                        AvastWRC.CloseTooltip.feedback(data, tab);
                        break;
                    case "USER_REPORTS":
                        switch (data.action) {
                            case "REPORT":
                                eventDetails.eventType = data.type;
                                eventDetails.type = data.feedbackType;
                                eventDetails.text = data.text;
                                eventDetails.shopName = data.shopName;
                                eventDetails.productOrdered = data.productOrdered;
                                eventDetails.reportReason = data.reportReason;
                                (AvastWRC.Burger != undefined)? AvastWRC.Burger.emitEvent("burger.newEvent", eventDetails):console.log("no burger lib");
                            break;
                            case "CLICKED_CTA":
                                eventDetails.eventType = "FEEDBACK";
                                eventDetails.type = "CLICKED_CTA";
                                eventDetails.category = data.feedbackType == "GENERAL" ? "REPORT_GENERAL" : "REPORT_SHOP";
                                (AvastWRC.Burger != undefined)? AvastWRC.Burger.emitEvent("burger.newEvent", eventDetails):console.log("no burger lib");
                            break;
                            case "SHOWN":
                                eventDetails.eventType = "FEEDBACK";
                                eventDetails.type = "SHOWN";
                                eventDetails.category = "REPORT_TYPE";
                                (AvastWRC.Burger != undefined)? AvastWRC.Burger.emitEvent("burger.newEvent", eventDetails):console.log("no burger lib");
                            break;
                        }
                }
                //console.log("Feedback: " , data, eventDetails);
                AvastWRC.bal.settings.set(settings);
            },

            badgeHighlighted: function(id, url, transactionId){
                var eventDetails = {
                    clientInfo: AvastWRC.Utils.getClientInfo((AvastWRC.Shepherd) ? AvastWRC.Shepherd.getCampaing().campaignId : "default"),
                    url: url,
                    eventType: "EXTENSION_ICON",
                    type: "HIGHLIGHTED",
                    offer: null,
                    offerType: ""
                };
                eventDetails.clientInfo.referer = AvastWRC.TabReqCache.get(id,"referer");
                eventDetails.clientInfo.transaction_id = transactionId;
                console.log("badgeHighlighted", eventDetails);
                (AvastWRC.Burger != undefined) ? AvastWRC.Burger.emitEvent("burger.newEvent", eventDetails) : console.log("no burger lib");
            },
            /**
             * Process safeShop offers returned for given tab.
             * @param {Object} tab to execute the SafeShop for
             * @param {Object} safeShop data retrieved
             * @param {Function} callback function to receive the prcessed data
             */
            processSafeShopOffers: function(tab, data, callback) {
                var tab = tab;

                var cachedData = AvastWRC.TabReqCache.get(tab.id, "safePriceInTab");
                var searchTitle = (data && data.scan && data.scan.title) ? data.scan.title : (data && data.scan && data.scan.result && data.scan.result["t"]) ? data.scan.result["t"] : null;

                var barState = 1;
                cachedData.panelData.strings.searchTitleOffers = searchTitle;
                cachedData.panelData.strings.searchTitleOffersRequest = searchTitle;
                cachedData.panelData.searchBack.offersSearchQueries = JSON.parse(JSON.stringify(AvastWRC.bal.sp.panelData.searchBack.offersSearchQueries));
                if(cachedData.panelData.strings.searchTitleOffers){
                    cachedData.panelData.searchBack.offersSearchQueries.push(cachedData.panelData.strings.searchTitleOffers);
                }
                AvastWRC.TabReqCache.set(tab.id, "safePriceInTab", cachedData);
                //commented cause only the notifications are going to be hidden but not the offers
                /*if(AvastWRC.bal.sp.isBarHiddenOnDomain(data.url)){
                    barState = 0 // hidden
                }*/

                var queryOptions = {
                    url: data.url,
                    query: data.scan,
                    providerId: data.providerId,
                    category: data.category,
                    state: barState,
                    explicit_request: cachedData.iconClicked,
                    showABTest: cachedData.showABTest,
                    campaignId: cachedData.campaignId,
                    referrer: cachedData.referrer,
                    transactionId: cachedData.transactionId,
                    callback: function(offersResponse) {
                        if ((!offersResponse || offersResponse.offersRequestTotalLength === 0)
                                && (data.firstRequestTotalLength === 0)){
                            if (cachedData.iconClicked == 1) {
                                cachedData.iconClicked = 0;
                                AvastWRC.TabReqCache.set(tab.id, "safePriceInTab", cachedData);
                            }
                        }

                        cachedData.minimizedNotifications = AvastWRC.NotificationsManager.notificationsAreMinimized();

                        var detailsToClosed = {
                            offerNumber: offersResponse.offersRequestTotalLength + data.firstRequestTotalLength,
                            closed: 0
                        };


                        cachedData.offerQuery = offersResponse.query;

                        cachedData.products = _(offersResponse.products).valueOf();
                        cachedData.accommodations = _(offersResponse.accommodations).valueOf();
                        cachedData.hotelsPriceComp =  _(offersResponse.hotelsPriceComp).valueOf();
                        cachedData.hotelsCity =  _(offersResponse.hotelsCity).valueOf();
                        cachedData.hotelsSimilar =  _(offersResponse.hotelsSimilar).valueOf();
                        cachedData.diRules = cachedData.diRules.length > 0 ? cachedData.diRules.concat(offersResponse.offersDiRules) : offersResponse.offersDiRules;
                        cachedData.offersRequestTotalLength = offersResponse.offersRequestTotalLength;
                        cachedData.producstLength = offersResponse.producstLength;
                        cachedData.accommodationsLength = offersResponse.accommodationsLength;
                        cachedData.priceComparisonLength = offersResponse.priceComparisonLength;
                        cachedData.cityHotelLength = offersResponse.cityHotelLength;
                        cachedData.similarHoteLength = offersResponse.similarHoteLength;
                        cachedData.offersRibbonText = offersResponse.offersRibbonText;
                        cachedData.avastBranding = AvastWRC.bal.brandingType == undefined || AvastWRC.bal.brandingType == AvastWRC.BRANDING_TYPE_AVAST ? true : false;
                        cachedData.offersToBeShown = cachedData.offerToBeShown ? cachedData.offerToBeShown : (offersResponse.offersRequestTotalLength > 0) ? true : false;
                        cachedData.couponsToBeShown = cachedData.couponToBeShown ? cachedData.couponToBeShown : data.couponsLength > 0 ? true : false;
                        cachedData.othersToBeShown = cachedData.othersToBeShown ? cachedData.othersToBeShown : (data.redirectLength > 0) ? true : false;
                        cachedData.detailsToClosed = detailsToClosed;
                        cachedData.scan = data.scan;
                        cachedData.showOffersNotification = offersResponse.showOffersNotification;
                        cachedData.showPriceComparisonNotification = offersResponse.showPriceComparisonNotification;
                        cachedData.cityName = offersResponse.cityName;
                        cachedData.accommodationsRibbonStars = offersResponse.accommodationsRibbonStars;
                        cachedData.transactionFinished = true;
                        cachedData.feedbackInfo = AvastWRC.YesNo.getFeedBackInfo();
                        cachedData.closeTooltipInfo = AvastWRC.CloseTooltip.getCloseTooltipInfo();
                        cachedData.social = AvastWRC.Social.getDisplayInfo(cachedData);
                        cachedData.isdeepIntegrationEnabled = cachedData.diRules > 0 || false;
                        cachedData.panelData.strings.searchTitleOffers = offersResponse.offersRequestTotalLength > 0 ? searchTitle : null;
                        if(detailsToClosed.offerNumber.toString() > 0){
                            cachedData.panelData.showSettingsTooltip = AvastWRC.SettingsTooltip.isTimeToShow(detailsToClosed.offerNumber);
                        }

                        AvastWRC.TabReqCache.set(tab.id, "safePriceInTab", cachedData);

                        console.log("-----------cachdata------------", cachedData);
                        callback(tab, cachedData);

                        if (!cachedData.iconClicked) {
                            AvastWRC.NotificationsManager.resolveOffersNotification(tab, _.extend(data, cachedData));
                        }
                        else{
                            AvastWRC.bs.accessContent(tab, {
                                message: "updatePanel",
                                data: cachedData,
                            });
                        }
                        if(detailsToClosed.offerNumber.toString() > 0){
                            AvastWRC.bal.sp.setActiveIcon(tab);
                            AvastWRC.bal.sp.setBadge(tab.id, detailsToClosed.offerNumber.toString(), !AvastWRC.NotificationsManager.notificationsAvailable(data));

                            if(!AvastWRC.NotificationsManager.notificationsAvailable(data)){
                                //send event badge
                                AvastWRC.bal.sp.badgeHighlighted(tab.id, data.url, cachedData.transactionId);
                                cachedData.badgeHighlighted = true;
                            }
                        }
                    }
                };

                new AvastWRC.Query.SafeShopOffer(queryOptions); // query Avast Offers Proxy

            }, // processSafeShopOffers

            /**
             * Process safeShop coupons returned for given tab.
             * @param {Object} tab to execute the SafeShop for
             * @param {Object} safeShop data retrieved
             * @param {Function} callback function to receive the prcessed data
             */
            processSafeShopCoupons: function(tab, data) {
                var tab = tab;

                var cachedData = AvastWRC.TabReqCache.get(tab.id, "safePriceInTab");
                
                var detailsToClosed = {
                    offerNumber: data.firstRequestTotalLength,
                    closed: 0
                };

                AvastWRC.bal.sp.setActiveIcon(tab);
                AvastWRC.bal.sp.setBadge(tab.id, detailsToClosed.offerNumber.toString(), !AvastWRC.NotificationsManager.notificationsAvailable(data));

                if(!AvastWRC.NotificationsManager.notificationsAvailable(data)){
                    //send event badge
                    AvastWRC.bal.sp.badgeHighlighted(tab.id, data.url, cachedData.transactionId);
                    cachedData.badgeHighlighted = true;
                }

                cachedData.minimizedNotifications = AvastWRC.NotificationsManager.notificationsAreMinimized();
                
                cachedData.redirects = _(data.redirects).valueOf() || _([]);
                cachedData.redirect = (data.redirectLength >= 1) ? data.redirects[0] : [];
                cachedData.coupons = _(data.coupons).valueOf() || _([]);
                cachedData.couponsLength = data.couponsLength;
                cachedData.redirectLength = data.redirectLength;
                cachedData.firstRequestTotalLength = data.firstRequestTotalLength;
                cachedData.couponRibbonText = data.couponRibbonText;
                cachedData.offersToBeShown = false;
                cachedData.producstLength = 0;
                cachedData.couponsToBeShown = cachedData.couponToBeShown ? cachedData.couponToBeShown : (data.vouchersLength > 0) ? true : false;
                cachedData.othersToBeShown = cachedData.othersToBeShown ? cachedData.othersToBeShown : (data.redirectsLength > 0)  ? true : false;
                cachedData.detailsToClosed = detailsToClosed;                
                cachedData.feedbackInfo = AvastWRC.YesNo.getFeedBackInfo(cachedData);
                cachedData.closeTooltipInfo = AvastWRC.CloseTooltip.getCloseTooltipInfo();
                cachedData.social = AvastWRC.Social.getDisplayInfo(cachedData);
                cachedData.avastBranding = AvastWRC.bal.brandingType == undefined || AvastWRC.bal.brandingType == AvastWRC.BRANDING_TYPE_AVAST ? true : false;
                cachedData.panelData.strings.searchTitleCoupons = data.couponsLength > 0 ? cachedData.urlDomain : null;
                cachedData.panelData.strings.searchTitleCouponsRequest = cachedData.urlDomain;
                cachedData.suppress_x_timeout = data.suppress_x_timeout;
                cachedData.panelData.searchBack = JSON.parse(JSON.stringify(AvastWRC.bal.sp.panelData.searchBack));
                if(cachedData.panelData.strings.searchTitleCouponsRequest){
                    cachedData.panelData.searchBack.couponsSearchQueries.push(cachedData.panelData.strings.searchTitleCouponsRequest);
                }

                if(detailsToClosed.offerNumber.toString() > 0){
                    cachedData.panelData.showSettingsTooltip = AvastWRC.SettingsTooltip.isTimeToShow(detailsToClosed.offerNumber);
                }

                AvastWRC.NotificationsManager.resolveCouponsNotify(tab, cachedData); 

                if(cachedData.onlyFirstRequest){
                    cachedData.transactionFinished = true;
                }

                AvastWRC.TabReqCache.set(tab.id, "safePriceInTab", cachedData);

            },

            processSearchOffers: function (tab, data) {
                var tab = tab;

                var cachedData = AvastWRC.TabReqCache.get(tab.id, "safePriceInTab");
                var searchTitle = data.query;
                cachedData.panelData.strings.searchTitleOffers = searchTitle;
                cachedData.couponsTabHaveSearch = data.couponsTabHaveSearch;
                cachedData.offersTabHaveSearch = data.offersTabHaveSearch;
                AvastWRC.TabReqCache.set(tab.id, "safePriceInTab", cachedData);

                var queryOptions = {
                    url: data.url,
                    query: data.query,
                    provider_id: (cachedData.search && cachedData.search.offersSearch && cachedData.search.offersSearch.providerId) ? cachedData.search.offersSearch.providerId : cachedData.providerId || "",
                    showABTest: cachedData.showABTest,
                    campaignId: cachedData.campaignId,
                    referrer: cachedData.referrer,
                    transactionId: cachedData.transactionId,
                    couponsTabHaveSearch: data.couponsTabHaveSearch,
                    offersTabHaveSearch: data.offersTabHaveSearch,
                    callback: function(offersSearchResponse) {
                        if ((!offersSearchResponse || offersSearchResponse.offersRequestTotalLength === 0)
                                && (data.firstRequestTotalLength === 0)){
                            if (cachedData.iconClicked == 1) {
                                cachedData.iconClicked = 0;
                                AvastWRC.TabReqCache.set(tab.id, "safePriceInTab", cachedData);
                            }
                        }

                        var couponsAndRedirectLength = cachedData.firstRequestTotalLength || 0;
                        if(offersSearchResponse.couponsTabHaveSearch ){
                            couponsAndRedirectLength = cachedData.search.couponsSearch && cachedData.search.couponsSearch.couponsLength ? cachedData.search.couponsSearch.couponsLength + cachedData.redirectLength || 0 : cachedData.redirectLength || 0;
                        }
                        var detailsToClosed = {
                            offerNumber: offersSearchResponse.offersRequestTotalLength + couponsAndRedirectLength,
                            closed: 0
                        };

                        cachedData.detailsToClosed = detailsToClosed;

                        cachedData.search.offersSearch = offersSearchResponse;

                        cachedData.search.lastSearch = "OFFERS";

                        cachedData.detailsToClosed = detailsToClosed;

                        if(detailsToClosed.offerNumber.toString() > 0){
                            cachedData.panelData.showSettingsTooltip = AvastWRC.SettingsTooltip.isTimeToShow(detailsToClosed.offerNumber);
                        }

                        AvastWRC.TabReqCache.set(tab.id, "safePriceInTab", cachedData);

                        console.log("-----------cachdata------------", cachedData);

                        AvastWRC.bs.accessContent(tab, {
                            message: "updatePanelWithSearch",
                            data: cachedData,
                        });

                        

                        if(detailsToClosed.offerNumber == 0){
                            AvastWRC.bal.sp.setBadge(tab.id, null, false/*no animation*/);
                        }     
                        else if(detailsToClosed && detailsToClosed.offerNumber > 0){
                            AvastWRC.bal.sp.setActiveIcon(tab);
                            AvastWRC.bal.sp.setBadge(tab.id, detailsToClosed.offerNumber.toString(), false/*no animation*/);
                        }
                    }
                };

                new AvastWRC.Query.SearchOffers(queryOptions); // query Avast Offers Proxy
            },

            processSearchCoupons: function(tab, data) {
                var tab = tab;

                var cachedData = AvastWRC.TabReqCache.get(tab.id, "safePriceInTab");
                var searchTitle = data.query;
                cachedData.panelData.strings.searchTitleCoupons = searchTitle;
                cachedData.couponsTabHaveSearch = data.couponsTabHaveSearch;
                cachedData.offersTabHaveSearch = data.offersTabHaveSearch;
                AvastWRC.TabReqCache.set(tab.id, "safePriceInTab", cachedData);

                var queryOptions = {
                    url: data.url,
                    provider_id: (cachedData.search && cachedData.search.couponsSearch && cachedData.search.couponsSearch.providerId) ? cachedData.search.couponsSearch.providerId : cachedData.voucherProviderId || "",
                    query: data.query,
                    showABTest: cachedData.showABTest,
                    campaignId: cachedData.campaignId,
                    referrer: cachedData.referrer,
                    transactionId: cachedData.transactionId,
                    couponsTabHaveSearch: data.couponsTabHaveSearch,
                    offersTabHaveSearch: data.offersTabHaveSearch,
                    callback: function(couponsSearchResponse) {
                        if ((!couponsSearchResponse || couponsSearchResponse.offersRequestTotalLength === 0)
                                && (data.firstRequestTotalLength === 0)){
                            if (cachedData.iconClicked == 1) {
                                cachedData.iconClicked = 0;
                                AvastWRC.TabReqCache.set(tab.id, "safePriceInTab", cachedData);
                            }
                        }
                        var offersLength = cachedData.offersRequestTotalLength || 0;
                        if(couponsSearchResponse.offersTabHaveSearch){
                            offersLength = (cachedData.search && cachedData.search.offersSearch && cachedData.search.offersSearch.offersRequestTotalLength) ? cachedData.search.offersSearch.offersRequestTotalLength : 0;
                        }
                        var detailsToClosed = {
                            offerNumber: couponsSearchResponse.couponsLength + offersLength + (cachedData.redirectLength || 0),
                            closed: 0
                        };

                        cachedData.detailsToClosed = detailsToClosed;

                        cachedData.search.couponsSearch = couponsSearchResponse;

                        cachedData.search.lastSearch = "COUPONS";

                        cachedData.detailsToClosed = detailsToClosed;

                        if(detailsToClosed.offerNumber.toString() > 0){
                            cachedData.panelData.showSettingsTooltip = AvastWRC.SettingsTooltip.isTimeToShow(detailsToClosed.offerNumber);
                        }

                        AvastWRC.TabReqCache.set(tab.id, "safePriceInTab", cachedData);

                        console.log("-----------cachdata------------", cachedData);

                        AvastWRC.bs.accessContent(tab, {
                            message: "updatePanelWithSearch",
                            data: cachedData,
                        });

                        if(detailsToClosed.offerNumber == 0){
                            AvastWRC.bal.sp.setBadge(tab.id, null, false/*no animation*/);
                        }
                        else if(detailsToClosed.offerNumber.toString() > 0){
                            AvastWRC.bal.sp.setActiveIcon(tab);
                            AvastWRC.bal.sp.setBadge(tab.id, detailsToClosed.offerNumber.toString(), false/*no animation*/);
                        }
                    }
                };

                new AvastWRC.Query.SearchCoupons(queryOptions); // query Avast Coupons Proxy

            },

            /* Register SafePrice Event handlers */
            registerModuleListeners: function(ee) {
                ee.on("urlInfo.response", AvastWRC.bal.sp.onUrlInfoResponse.bind(AvastWRC.bal.sp));
                ee.on("message.safeShopFeedback", AvastWRC.bal.sp.safeShopFeedback.bind(AvastWRC.bal.sp));
                ee.on("message.safeShopOffersFound", AvastWRC.bal.sp.safeShopOffersFound.bind(AvastWRC.bal.sp));
            },

            /**
             * Return SafePrice related default settings.
             */
            getModuleDefaultSettings: function() {
                return {
                    safeShop: {
                        noCouponDomains: {}, // {"domain":true}
                        hideDomains: {}, // {"domain":timeout}
                        hideAll: 0, // hide until
                        iconClicked: 0, // to know if the SP icon was clicked
                        closedByUser: []
                            /*{"url":{offerNumber: (number of offers we have), closed: (1 if closed)}} 
								reason: if the user intentionallity closed the bar we show on the badge 
                                the nummer of offers we have for that url (on clic of the icon the bar will appear again)*/
                    },
                    features: {
                        safeShop: -1, // NEW (-1), true = opt-in (default), false = opt-out
                        onBoardingPage: {
                            first: false,
                            second: false,
                            third: false,
                        },
                        usage: {
                            clicks: -1,
                            lastDay: -1
                        }
                    },
                    userSPPoppupSettings: {
                        help: {
                            selected: false,
                            settingsChanged: false,
                        },
                        notifications: {
                            selected: true,
                            settingsChanged: false,
                            offers: {
                                showAlways: true,// show always
                                showBetter: false,// show better than the original price
                                hide: false,// hide
                            },
                            accommodations: {
                                showBetter: true,// show better than the original price
                                showSimilar: true,// show similar hotels
                                showPopular: true,// show popular hotels
                            },
                            coupons: {
                                showAlways: true, // show always
                                showOnce: false, // show once
                                hide: false, // hide notifications
                            },
                            others: {
                                showAlways: true, // show always
                            },
                            standard: {
                                position: { top: 16,  right: 16 }
                            },
                            panel: {
                                position: { top: 16, right: 16 }
                            },
                            minimized: {
                                position: { top: 16, right: 16 }
                            }
                        },
                        customList: {
                            selected: false,
                            showAddButton: true,
                            settingsChanged: false,
                            whiteList: []
                        },
                        defaultMenuChanged: false,
                        defaultMenu: "notifications"
                    }
                };
            },
            setBadge: function (tabID, badge, animation = true, color = null, config = null) {
                let animationConfig = config || AvastWRC.Shepherd.getIconBlinkAnimationConfig();

                AvastWRC.bal.sp.currentBadge[tabID] = badge;

                if(badge == null){
                    clearBadge(tabID);
                    return;
                }

                animation ? setBadgeWithAnimation(tabID, badge) : setBadge(tabID, badge, color || animationConfig.color);

                function setBadgeWithAnimation(tabID, badge) {
                    let milliseconds = 0;
                    AvastWRC.bal.sp.disableBadgeAnimation();

                    for (let i = 0; i <= animationConfig.times; i++) {
                        AvastWRC.bal.sp.badgeAnimationTimers.push(setAnimationTimeout(tabID, badge, animationConfig.color, milliseconds));
                        if (i === animationConfig.times - 1) return;
                        AvastWRC.bal.sp.badgeAnimationTimers.push(setAnimationTimeout(tabID, "", animationConfig.color, milliseconds + animationConfig.milliseconds));
                        milliseconds += animationConfig.milliseconds * 2;
                    }
                }

                function setAnimationTimeout(tabID, badge, color, milliseconds) {
                    return setTimeout(function () {
                        setBadge(tabID, badge, color);
                    }, milliseconds);
                }

                function setBadge(tabID, badge, color) {
                    AvastWRC.bal.emitEvent("control.showText", tabID, badge, color);
                }

                function clearBadge(tabID) {
                    AvastWRC.bal.emitEvent("control.showText", tabID);
                }
            },

            /*Send heartbeat each 16H -> 57600 sec*/
            sendHeartbeatInterval: null,
            sendHeartbeat: function () {
                AvastWRC.getStorageAsync("HeartBeat")
                .then(function(date){
                    var now = parseInt(new Date().getTime())/1000;
                    if(date &&  date < now){
                        var eventDetails = 	{
                            clientInfo: AvastWRC.Utils.getClientInfo((AvastWRC.Shepherd) ? AvastWRC.Shepherd.getCampaing().campaignId : "default"),
                            url: "",
                            eventType: "HEARTBEAT",
                            offer: null,
                            offerType: "",
                            sendNow: true
                        };
                        (AvastWRC.Burger != undefined) ? AvastWRC.Burger.emitEvent("burger.newEvent", eventDetails):console.log("no burger lib");
                        var ttl = 57600;
                        if(AvastWRC.Shepherd){
                            ttl = AvastWRC.Shepherd.getHeartbeat();
                        }
                        var newDate = now + parseInt(ttl);
                        AvastWRC.setStorage("HeartBeat", newDate);
                        console.log("HEARTBEAT sent on then eventDetails: " + JSON.stringify(eventDetails) + "date: " + date + "now: " + now + "newDate: " + newDate);
                    }
                    console.log("HEARTBEAT on then not sent date: " + date + "now: " + now);
                })
                .catch(function(reason){
                    var ttl = 57600; //16h
                        if(AvastWRC.Shepherd){
                            ttl = AvastWRC.Shepherd.getHeartbeat();
                        }
                    // date will be now + ttl min 16h
                    var date = parseInt(new Date().getTime())/1000 + parseInt(ttl);
                    AvastWRC.setStorage("HeartBeat", date);
                    var eventDetails = 	{
                        clientInfo: AvastWRC.Utils.getClientInfo((AvastWRC.Shepherd) ? AvastWRC.Shepherd.getCampaing().campaignId : "default"),
                        url: "",
                        eventType: "HEARTBEAT",
                        offer: null,
                        offerType: "",
                        sendNow: true
                    };
                    (AvastWRC.Burger != undefined) ? AvastWRC.Burger.emitEvent("burger.newEvent", eventDetails):console.log("no burger lib");
                    console.log("HEARTBEAT sent on catch eventDetails: " + JSON.stringify(eventDetails) + "date: " + date);
                });
            },
            isAnAffiliateDomain: function (tab, sendAffiliateDomainEvent = true, url = false) {
                let eventTriggeredURL = url || tab.url,
                    isAnAffiliateDomain = (AvastWRC.bs.ciuvoASdetector && AvastWRC.bs.ciuvoASdetector.isAffiliateSource(tab.id, false))
                        || (AvastWRC.bs.comprigoASdetector && AvastWRC.bs.comprigoASdetector.isBolcked(eventTriggeredURL));

                if (isAnAffiliateDomain && sendAffiliateDomainEvent) emitAFSRCMatchBurgerEvent(tab);

                return isAnAffiliateDomain;

                function emitAFSRCMatchBurgerEvent(tab) {
                    const AFFILIATE_MATCHING_KEY = "AFFILIATE_MATCHING";

                    let eventDetails = {
                        clientInfo: AvastWRC.Utils.getClientInfo((AvastWRC.Shepherd) ? AvastWRC.Shepherd.getCampaing().campaignId : "default"),
                        url: `${eventTriggeredURL + (eventTriggeredURL.indexOf("?") < 0 ? "?" : "")}&${AFFILIATE_MATCHING_KEY}=${AvastWRC.bs.ciuvoASdetector.isAffiliateSource(tab.id, false) ? "CIUVO" : "COMPRIGO"}`,
                        offer: null,
                        offerType: "",
                        eventType: "AFSRC_MATCHING"
                    };

                    eventDetails.clientInfo.referer = AvastWRC.TabReqCache.get(tab.id, "referer");
                    (AvastWRC.Burger !== undefined) ? AvastWRC.Burger.emitEvent("burger.newEvent", eventDetails) : console.log("no burger lib");
                    console.log("afsrc=1 detected", eventTriggeredURL);
                }
            },
            setIcon: function (tab, icon) {
                AvastWRC.bal.emitEvent("control.setIcon", tab.id, icon);
            },
            setActiveIcon: function (tab) {
                AvastWRC.bal.emitEvent("control.show", tab.id);
                AvastWRC.bal.sp.setIcon(tab, AvastWRC.bal.sp.config.icons.active);
            },
            setDisableIcon: function (tab) {
                AvastWRC.bal.emitEvent("control.hide", tab.id);
                AvastWRC.bal.sp.setIcon(tab, AvastWRC.bal.sp.config.icons.disable);
            },
            clearTimeouts: function (timeouts) {
                for (let i = 0; i < timeouts.length; i++) {
                    clearTimeout(timeouts[i]);
                }
            },
            getCurrentBadge: function (tabId) {
                return AvastWRC.bal.sp.currentBadge[tabId];
            },
            disableBadgeAnimation: function (tabId) {
                AvastWRC.bal.sp.clearTimeouts(AvastWRC.bal.sp.badgeAnimationTimers);
                AvastWRC.bal.sp.badgeAnimationTimers = [];
                if (tabId) AvastWRC.bal.sp.setBadge(tabId, AvastWRC.bal.sp.getCurrentBadge(tabId), false);
            },
            badgeAnimationTimers: [],
            currentBadge: {},
            config: {
                icons: {
                    disable: "common/ui/icons/logo-safeprice-gray.png",
                    active: "common/ui/icons/logo-safeprice-128.png"
                }
            }

        }); // SP
        
        AvastWRC.Utils.Burger.initBurger(false/*sendAll*/);

        AvastWRC.bal.sp.sendHeartbeat();

        if(AvastWRC.bal.sp.sendHeartbeatInterval){
            clearInterval(AvastWRC.bal.sp.sendHeartbeatInterval);
            AvastWRC.bal.sp.sendHeartbeatInterval = null;
        }
        //send heartbeat each 16H (milisecond 57600000) or the ttl from shepherd
        AvastWRC.bal.sp.sendHeartbeatInterval = setInterval(function() {
            AvastWRC.bal.sp.sendHeartbeat();
        }, AvastWRC.Shepherd ? AvastWRC.Shepherd.getHeartbeat()*1000 : 57600*1000);

        AvastWRC.bal.registerEvents(AvastWRC.bal.sp.registerModuleListeners);

        AvastWRC.bal.registerModule(AvastWRC.bal.sp);

        return AvastWRC.bal.sp;
    });


}).call(this, AvastWRC, _);

class ASDetector {
    
    constructor (blockref) {
    	this.pastEvents = {};
        this.listeners = [];
        this.blockref = blockref || [ new RegExp('\.*&afsrc=1|\\?afsrc=1'),
                    new RegExp('7eer\.net'),
                    new RegExp('ad\.zanox\.com'),
                    new RegExp('affiliate\.buy\.com'),
                    new RegExp('affiliates\.market-ace\.com'),
                    new RegExp('awin1\.com'),
                    new RegExp('click\.linksynergy\.com'),
                    new RegExp('clickserve\.cc-dt\.com'),
                    new RegExp('clkde\.tradedoubler\.com'),
                    new RegExp('clk\.tradedoubler\.com'),
                    new RegExp('clkuk\.tradedoubler\.com'),
                    new RegExp('dtrk4\.com'),
                    new RegExp('evyy\.net'),
                    new RegExp('gan\.doubleclick\.net'),
                    new RegExp('linksynergy\.onlineshoes\.com'),
                    new RegExp('linksynergy\.walmart\.com'),
                    new RegExp('ojrq\.net'),
                    new RegExp('operator\.savings\.int'),
                    new RegExp('partners\.webmasterplan\.com'),
                    new RegExp('prf\.hn'),
                    new RegExp('rover\.ebay\.com'),
                    new RegExp('scripts\.affiliatefuture\.com'),
                    new RegExp('send\.onenetworkdirect\.net'),
                    new RegExp('tc\.tradetracker\.net'),
                    new RegExp('track\.moreniche\.com'),
                    new RegExp('track\.webgains\.com'),
                    new RegExp('.*\.belboon\.de'),
                    new RegExp('.*\.savoocompare\.co\.uk'),
                    new RegExp('.*\.anrdoezrs\.net'),
                    new RegExp('.*\.avantlink\.com'),
                    new RegExp('.*\.awin1\.com'),
                    new RegExp('.*\.clixGalore\.com'),
                    new RegExp('.*\.dpbolvw\.net'),
                    new RegExp('.*\.gopjn\.com'),
                    new RegExp('.*\.jdoqocy\.com'),
                    new RegExp('.*\.kqzyfj\.com'),
                    new RegExp('.*\.linkconnector\.com'),
                    new RegExp('.*\.mysupermarket\.co\.uk'),
                    new RegExp('.*\.paidonresults\.net'),
                    new RegExp('.*\.pjatr\.com'),
                    new RegExp('.*\.pjtra\.com'),
                    new RegExp('.*\.pntrac\.com'),
                    new RegExp('.*\.pntra\.com'),
                    new RegExp('.*\.pntrs\.com'),
                    new RegExp('.*\.rent\.com'),
                    new RegExp('.*\.shareasale\.com'),
                    new RegExp('.*\.tkqlhce\.com'),
                    new RegExp('.*\.zanox-affiliate\.de'),
                    new RegExp('.*savings\.com'),
                    new RegExp('.*affiliate\.rakuten\.com')
        ];

        this.ciuvo_rex = [new RegExp('.*ciuvo\.com'), // ciuvo
                          new RegExp('.*localhost:8002'), // ciuvo
                          new RegExp('cacp\.herokuapp\.com'), // comprigo
                          new RegExp('comprigo\.com'), // comprigo
                          new RegExp('a\.aclk\.pw'), // affilio
        ];
        
        this.NEW_EVENT_THRESHOLD_TIME = 1500;
        this.TAB_EVENT_EXPIRATION_TIME = 10 * 1000;
        this.SESSION_TIMEOUT = 60 * 60 * 1000; // 1 hour
        this.TAB_EVENT_EXPIRATION_TIME = this.SESSION_TIMEOUT + 10 * 1000; // 10 seconds
    }
    
    /**
     * Add a new navigation event of the tab's main frame.
     * 
     * @param tabId
     *            the tabId for this navigation event (required)
     * @param url
     *            the url for this navigation event (required)
     * @param requestId
     *            the request-id if available. It helps recognizing multiple
     *            urls which actually belong to one navigation event because
     *            of redirects. (optional)
     * @param timestamp
     *            the timestamp in ms of the navigation event. It is usefull
     *            for recognizing events which belong together (optional).
     * @param main_page_changed
     *            only used in firefox because there a workaround to recognize main-page changes
     *            is needed
     * @returns true if the current chain of navigation events has been
     *          marked as affiliate source. False otherwise.
     */
    onNavigationEvent (tabId, url, requestId, timestamp, main_page_changed) {
        timestamp = timestamp || Date.now();

        var lastEvent = this.getLastEvent(tabId);
        var newEvent = this.isNewEvent(lastEvent, url, requestId, timestamp, main_page_changed);

        // update timestamp & hostname
        lastEvent.timestamp = timestamp;
        lastEvent.hostname = AvastWRC.bal.getHostFromUrl(url);
        if (newEvent || !lastEvent.isFromCiuvo) {
            lastEvent.isFromCiuvo = this.isCiuvoEvent(url);
        }

        if (lastEvent.isFromCiuvo) {
            // ignore afsrc if ciuvo itself triggered the coupon-click
            lastEvent.isAfsrc = false;
        } else if (!lastEvent.isAfsrc) {
            lastEvent.isAfsrc = this.ifAfsrcEvent(url);
        }
        console.log("DETECTOR -> CIUVO: onBeforeRedirect", "tabId: ", tabId, "url: ", url, "lastEvent: ", lastEvent, "newEvent: ", newEvent);
        return lastEvent.isAfsrc;
    }

    /**
     * Whether the event originated with an clickout from ciuvo
     */
    isCiuvoEvent(url) {
        for (var i = 0; i < this.ciuvo_rex.length; ++i) {
            if (this.ciuvo_rex[i].exec(url)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Whether the event originated with an clickout from another affiliate source
     */
    ifAfsrcEvent(url) {
        for (var i = 0; i < this.blockref.length; i++) {
            if (this.blockref[i].exec(url)) {
                return true;
            }
        }
        return false;
    }

    /**
     * @returns dictionary
     */
    getSessionBlockList() {
        var sbl = window.localStorage.getItem("__ciuvo__afsrc__sbl");

        if (sbl && typeof sbl === "string") {
            sbl = JSON.parse(sbl);
        }

        if (!sbl || typeof sbl !== "object") {
            // recover gracefully
            sbl = {};
            this.storeSessionBlockList(sbl);
        }

        return sbl;
    }

    /**
     * @param sbl
     *          dictionary
     */
    storeSessionBlockList(sbl) {
        window.localStorage.setItem("__ciuvo__afsrc__sbl", JSON.stringify(sbl));
    }

    /**
     * @param hostname
     *          the hostname of the request
     */
    addToSessionBlockList(hostname) {
        var blockList = this.getSessionBlockList();
        blockList[hostname] = Date.now();
        this.storeSessionBlockList(blockList);
    }

    /**
     * @param hostname
     *          the hostname of the request
     * @returns true
     *         if it is on the blocklist, resets session timestamp
     **/
    isOnSessionBlockList(hostname) {
        var blockList = this.getSessionBlockList(),
            timestamp = blockList[hostname];

        if (!timestamp) {
            // "The host <" + hostname + "> is not on session block list."
            return false;
        }

        var now_ts = Date.now();

        if (timestamp + this.SESSION_TIMEOUT > now_ts) {
            // "The host <" + hostname + "> is on session block list."
            return true;
        }

        // cleanup expired timestamp
        delete blockList[hostname];
        this.storeSessionBlockList(blockList);
        return false;
    }

    /**
     * decide whether it is a new event or not
     * @param lastEvent
     *            the last Event recorded for this tab
     * @param url
     *            the url for this navigation event (required)
     * @param requestId
     *            the request-id if available. It helps recognizing multiple
     *            urls which actually belong to one navigation event because
     *            of redirects. (optional)
     * @param timestamp
     *            the timestamp in ms of the navigation event. It is usefull
     *            for recognizing events which belong together (optional).
     * @param main_page_changed
     *            only used in firefox because there a workaround to recognize main-page changes
     *            is needed
     * @returns true if this is a new navigation event or part of the same clickout
     **/
    isNewEvent(lastEvent, url, requestId, timestamp, main_page_changed) {
        console.log("DETECTOR: isNewEvent", "lastEvent: ", lastEvent, "url: ", url, "requestId: ", requestId, "timestamp: ", timestamp, "main_page_changed: ", main_page_changed);
        // try to detect if this is a new navigation event
        if (typeof requestId !== 'undefined') {
            if (requestId == lastEvent.requestId) {
                    return false;
            }
        }

        // those damn JS redirects make requestId unreliable
        var delta = timestamp - lastEvent.timestamp;
        console.log("DETECTOR: delta ", delta, "NEW_EVENT_THRESHOLD_TIME: ", this.NEW_EVENT_THRESHOLD_TIME, "url: ", url);
        if (delta < this.NEW_EVENT_THRESHOLD_TIME) {
           return false;
        }

        if (lastEvent.isAfsrc)  {
            if (main_page_changed !== undefined)  {
                if (!main_page_changed) {
                        return false;
                }
            } else if ((AvastWRC.bal.getHostFromUrl(url) === lastEvent.hostname) && this.ifAfsrcEvent(url)) {
                // still on the same event
                    return false;
            }
        }

        // create a new event if one has been detected
        lastEvent.isAfsrc = false;
        lastEvent.isFromCiuvo = false;
        lastEvent.requestId = requestId;

        return true;
    }

    /**
     * be nice, clean up a bit after ourselves
     */
    cleanupExpiredTabs () {
        now = Date.now();
        for ( var tabId in this.pastEvents) {
            if (this.pastEvents.hasOwnProperty(tabId)) {
                var event = this.pastEvents[tabId];
                if ((now - event.timestamp) > this.TAB_EVENT_EXPIRATION_TIME) {
                    delete this.pastEvents[tabId];
                }
            }
        }
    }

    /**
     * @param tabId
     *            the tab's id
     * @returns the last navigation event or an empty one
     */
    getLastEvent (tabId) {
        	 var lastEvent = this.pastEvents[tabId];
        if (typeof lastEvent === 'undefined') {
            lastEvent = {
                isAfsrc : false,
                requestId : undefined,
                isFromCiuvo : false,
                timestamp : 0,
                hostname: undefined
            };
            this.pastEvents[tabId] = lastEvent;
        }
        return lastEvent;
    }

    /**
     * @param tabId the id of the tab to be checked for the affiliate source
     * @param cleanup will clear the affiliate source flag since displays are allowed
     *          on subsequent requests
     * @returns true if the current chain of navigation events has been
     *          marked as affiliate source. False otherwise.
     */
    isAffiliateSource (tabId, cleanup) {
        var lastEvent = this.getLastEvent(tabId);

        // add hostname to session blocklist / check if it is on one
        if (lastEvent.isAfsrc) {
            this.addToSessionBlockList(lastEvent.hostname);
        } else if (this.isOnSessionBlockList(lastEvent.hostname)) {
           return true;
        }

        if (cleanup) {
            this.cleanupExpiredTabs();
        }

        return lastEvent.isAfsrc;
    }
}

AvastWRC.bs.ciuvoASdetector = AvastWRC.bs.ciuvoASdetector || new ASDetector();
/*******************************************************************************
     *
     *  AvastWRC Shepherd
     * 
     ********************************************************************************/
(function (AvastWRC, _) {
    AvastWRC.Shepherd = {
        /**
         * Initialize rules class
         * @return {Object} Self reference
         */
        init: function () {
            let self = this;

            this.setBrowserCampaign().then(() => {
                self.restore(function (rules) {
                    if (!rules.isValidTtl()) {
                        rules.load();
                    }

                    return rules;
                });
            });
        },
        /**
         * Default / Current rules version (timestamp)
         * @type {Number}
         */
        rules : {
            expireTime: 170926000000000,
            showABTest: false,
        },

        defaultSearchConfig: {
            coupons: {
                active: true,
                designType: {
                    expanded: true,
                    collapsed: false
                }
            },
            offers: {
                active: true,
                designType: {
                    expanded: true,
                    collapsed: false
                }
            }
        },

        couponsShowInTabConfig: {
            couponsWithCode: {
                showInTab: "INACTIVE",
                close: true,
                closeAfter: 5

            },
            couponsWithoutCode: {
                showInTab: "ACTIVE",
                close: false,
                closeAfter: null

            }
        },

        tooltipsConfigs: {
            settings: false
        },
        defaultEmptySearch: {
            offers: {
                url: "",
                image: "",
                domain: "",
                domainName: "",
                trySearchIn: "",
                searchIn: ""
            },
            coupons: {
                url: "",
                image: "",
                domain: "",
                domainName: "",
                trySearchIn: "",
                searchIn: ""
            }
        },
        
        /**
         * Restore rules from cache
         * @return {void}
         */
        restore: function (callback) {
            // TODO: load rules from cache and return true if still valid
            var self = this;

            AvastWRC.getStorage("Shepherd", function (rules) {
                self.rules = JSON.parse(rules);
                self.rules = self.updateSearchConfig(self.rules);
                self.rules = self.updateCouponsShowConfig(self.rules);
                self.rules = self.updateEmptySearchConfig(self.rules);
                console.log("Shepherd -> Restored: " + JSON.stringify(self.rules));
                callback(self);
            });

        },

        /**
         * Download all the rules and configurations from the server
         * @return {void}
         */
        load: function () {
            var self = this;
            new AvastWRC.Query.Shepherd(function (rules,ttl) {
                if(self.rules && self.rules.abtests && self.rules.abtests.variant_id && self.rules.abtests.variant_id !=  rules.abtests.variant_id){
                   // the test variant changed, we need to update all tags to remove the old styles
                    AvastWRC.bs.updateAllTabs();
                }                
                rules.expireTime = self.getExpirationTime(ttl);
                if(!rules.abtests || !rules.abtests.variant_id){
                    rules.showABTest = false;
                    rules.campaignId = "default";
                }else{
                    rules.campaignId = rules.abtests.test_id+rules.abtests.variant_id;
                    rules.showABTest = rules.abtests.variant_id == "v2" ? true : false;
                }                
                self.rules = self.updateSearchConfig(rules);
                self.rules = self.updateCouponsShowConfig(rules);
                self.rules = self.updateEmptySearchConfig(rules);
                console.log("Shepherd-> Response before being saved: "+ JSON.stringify(rules));
                self.save();
            },function(error){
                console.log("Shepherd-> Response error: "+ error);
                rules = {
                    expireTime: self.getExpirationTime(86400),
                    showABTest: (self.rules && self.rules.showABTest) ? self.rules.showABTest : false,
                    campaignId: (self.rules && self.rules.campaignId) ? self.rules.campaignId : "default",
                    BarUISpecifics: (self.rules && self.rules.BarUISpecifics) ? self.rules.BarUISpecifics : null //not downloaded and not in cache (null)
                };
                self.rules = self.updateSearchConfig(rules);
                self.rules = self.updateCouponsShowConfig(rules);
                self.rules = self.updateEmptySearchConfig(rules);
                self.save();
            });
        },

        /**
         * Generate the new expiration time based on ttl
         * @return expiration time 
         */
        getExpirationTime: function(ttl){
            var expireTime = parseInt(new Date().getTime())/1000 + parseInt(ttl);
            return expireTime;
        },

        /**
         * Return if the Ttl is still valid
         * @return true if still valid otherwise false
         */
        isValidTtl : function(){
            var now = parseInt(new Date().getTime())/1000;
            if(this.rules && this.rules.expireTime)
                return (this.rules.expireTime > now);
            else return false;
        },
        
        /**
         * Save all the rules currently stored locally to cache
         * @return {void}
         */
        save: function () {
            AvastWRC.setStorage("Shepherd", JSON.stringify(this.rules));
        },

        setBrowserCampaign: function () {
            return new Promise((resolve, reject) => {
                if (!(AvastWRC.Utils.getBrowserInfo().isAvast() && chrome.avast)) resolve(null);

                chrome.avast.getPref("install_channel", function (name, val) {
                    if (isNaN(val) || ((val + "").length > 4)) resolve(null);
                    AvastWRC.Shepherd.browserCampaign = val;
                    resolve(val)
                });
            });
        },

        browserCampaign: null
    };

    AvastWRC.bal.registerModule(AvastWRC.Shepherd);

}).call(this, AvastWRC, _);
/*******************************************************************************
 *
 *  AvastWRC Shepherd specifics for SP
 * 
 ********************************************************************************/
(function(_,Shepherd) {

    _.extend(Shepherd,{
        /**
         * Get a individual rule based on the regexp defined in the rule
         * @param  {String} url Url of the site
         * @return {Object}     Rule object (default topBarRules object if no applicable rule was found)
         */
        getUIAdaptionRule: function (url) {
            if(!this.isValidTtl()){
                this.load();
            }

            if(!this.rules || !this.rules.BarUISpecifics) return null;

            var topBarRules = {
                rulesToApply: 0,
                specifics: []
            };

            var ui_specifics = (this.rules.BarUISpecifics.Configs) ? this.rules.BarUISpecifics.Configs : [];
            for (var i = 0; i < ui_specifics.length; i++) {
                if (RegExp(ui_specifics[i].domainPattern).test(url)) {
                    ui_specifics[i].styles.forEach(function(node) {
                        if (AvastWRC.Utils.getBrowserInfo().getBrowser() === node.browser || node.browser === "ALL") {
                            if(node.specifics instanceof Array){
                                node.specifics.forEach(function(specific) {
                                    if(specific.styleName && specific.styleProperty){
                                        topBarRules.specifics.push({
                                            styleName: specific.styleName,
                                            styleProperty: specific.styleProperty,
                                            computedStyle: specific.computedStyle ? specific.computedStyle : null,
                                            dynamicValue: specific.dynamicValue ? specific.dynamicValue : null,
                                            dynamicOldValue: specific.dynamicOldValue ? specific.dynamicOldValue : ""
                                        });
                                        topBarRules.rulesToApply = specific.rulesToApply;
                                    }
                                });
                            }else {
                                var specific = node.specifics;
                                if(specific.styleName && specific.styleProperty){
                                    topBarRules.specifics.push({
                                        styleName: specific.styleName,
                                        styleProperty: specific.styleProperty,
                                        computedStyle: specific.computedStyle ? specific.computedStyle : null,
                                        dynamicValue: specific.dynamicValue ? specific.dynamicValue : null,
                                        dynamicOldValue: specific.dynamicOldValue ? specific.dynamicOldValue : ""
                                    });
                                    topBarRules.rulesToApply = specific.rulesToApply;
                                }                               
                            }                            
                        }
                    });
                }
            }
            return topBarRules;
        },
        /**
         * ObcompaingId 
         * @param  {String} url Url of the site
         * @return {Object}     Rule object (default topBarRules object if no applicable rule was found)
         */
        getCampaing: function () {
            if(!this.isValidTtl()){
                this.load();
            }
            return {
                campaignId: (this.rules && this.rules.campaignId) ? this.rules.campaignId : "default",
                showABTest: (this.rules && this.rules.showABTest) ? this.rules.showABTest : false
            };           
        },

        setOnBoardingPageDefaults: function (resetAll){
            var settings = AvastWRC.bal.settings.get(); 
            if(resetAll || settings.features.usage.lastDay == -1){
                settings.features.onBoardingPage.first = (this.rules.onBoardingPage.Configs.first) ? this.getExpirationTime(this.rules.onBoardingPage.Configs.first) : true;
                settings.features.onBoardingPage.second =  (this.rules.onBoardingPage.Configs.second) ? this.getExpirationTime(this.rules.onBoardingPage.Configs.second) : true;
                settings.features.onBoardingPage.third =  (this.rules.onBoardingPage.Configs.third) ? this.getExpirationTime(this.rules.onBoardingPage.Configs.third) : true;
                settings.features.usage.lastDay = (this.rules.onBoardingPage.Configs.days) ? this.getExpirationTime(this.rules.onBoardingPage.Configs.days*86400) : -1;
                settings.features.usage.clicks = 0;
            }

            AvastWRC.bal.settings.set(settings);
        },

        showOnboardingPage: function () {
            if(!this.isValidTtl()){
                this.load();
                this.setOnBoardingPageDefaults(false);
            }

            if(!this.rules || !this.rules.onBoardingPage) return null;

            var settings = AvastWRC.bal.settings.get(); 

            if (settings.features.safeShop === -1){               
                return true;
            }
            else{
                var now = parseInt(new Date().getTime())/1000;
                if(settings.features.usage.lastDay == -1) {
                    this.setOnBoardingPageDefaults(true);
                }
                else if(settings.features.usage.lastDay < now){
                    if(settings.features.usage.clicks <= this.rules.onBoardingPage.Configs.minClicks){
                        if((settings.features.onBoardingPage.first != true && (settings.features.onBoardingPage.first && settings.features.onBoardingPage.first < now))
                            ||(settings.features.onBoardingPage.second != true &&  (settings.features.onBoardingPage.second && settings.features.onBoardingPage.second < now))
                            ||(settings.features.onBoardingPage.third != true &&   (settings.features.onBoardingPage.third && settings.features.onBoardingPage.third < now))){
                            return true;
                        }
                    }
                }
                return false;
            }
            return false;
        },

        onboardingPageShown: function () {
            if(!this.rules || !this.rules.onBoardingPage) return null;

            var settings = AvastWRC.bal.settings.get(); 

            if (settings.features.safeShop === -1){
                settings.features.safeShop = true;
                AvastWRC.bal.settings.set(settings);
            }
            else{
                var now = parseInt(new Date().getTime())/1000;   
                if(settings.features.usage.lastDay == -1) {
                    this.setOnBoardingPageDefaults(true);
                }       
                else if(settings.features.usage.lastDay < now){
                    if(settings.features.usage.clicks <= this.rules.onBoardingPage.Configs.minClicks){
                        if(settings.features.onBoardingPage.first != true && (settings.features.onBoardingPage.first && settings.features.onBoardingPage.first < now)){
                            settings.features.onBoardingPage.first = true;
                            AvastWRC.bal.settings.set(settings);
                        }
                        else if(settings.features.onBoardingPage.second != true &&  (settings.features.onBoardingPage.second && settings.features.onBoardingPage.second < now)){
                            settings.features.onBoardingPage.second = true;
                            AvastWRC.bal.settings.set(settings);
                        }
                        else if(settings.features.onBoardingPage.third != true &&   (settings.features.onBoardingPage.third && settings.features.onBoardingPage.third < now)){
                            settings.features.onBoardingPage.third = true;
                            this.setOnBoardingPageDefaults(true);
                        }
                    }                   
                }
            }
        },

        getPowerUserConfig: function () {
            if(!this.isValidTtl()){
                this.load();
            }
            if(!this.rules || !this.rules.powerUser) return null;
            return this.rules.powerUser.Configs;
        },

        getIconBlinkAnimationConfig: function () {
            return this.rules && this.rules.spIconAnimation && this.rules.spIconAnimation.Configs ? this.rules.spIconAnimation.Configs : {
                icon: "common/ui/icons/logo-safeprice-128.png",
                color: AvastWRC.bal.brandingType === AvastWRC.BRANDING_TYPE_AVAST ? "#0CB754" : "#556688",
                times: 4,
                milliseconds: 230
            };
        },

        getIconBlinkingAnimationAfterCloseTooltip: function () {
            return this.rules && this.rules.spIconAnimationCloseTooltip && this.rules.spIconAnimationCloseTooltip.Configs ? this.rules.spIconAnimationCloseTooltip.Configs : {
                icon: "common/ui/icons/logo-safeprice-128.png",
                color: AvastWRC.bal.brandingType === AvastWRC.BRANDING_TYPE_AVAST ? "#0CB754" : "#556688",
                times: 22,
                milliseconds: 230
            };
        },

		getHeartbeat: function () {
            if(!this.isValidTtl()){
                this.load();
            }
        
            if(!this.rules || !this.rules.heartbeat) return 57600; // 16h
            return (this.rules.heartbeat.ttl) ? this.rules.heartbeat.ttl : 57600;
        },

        getRecruitmentConfig: function () {
            return this.rules && this.rules.recruitment ? this.rules.recruitment.Configs : null;
        },

        getNotificationsConfig: function () {
            let defaultNotificationsConfig = {
                notificationType: {
                    bar: false,
                    minimized: false,
                    none: false,
                    panel: false,
                    panelMin: true
                },
                redirectTTL: 86400,
                closeTTL: 1800
            };

            let notificationsConfig = (this.rules && this.rules.notifications && this.rules.notifications.configs) ? this.rules.notifications.configs : defaultNotificationsConfig;

            // we need this check becuase of the update
            if(!notificationsConfig.closeTTL){
                notificationsConfig.closeTTL = defaultNotificationsConfig.closeTTL;
            }
            return notificationsConfig;
        },

        getSocialConfig: function () {
            return this.rules && this.rules.socialSharing && this.rules.socialSharing.Configs || false;
        },

        getAnimationsConfig: function () {
            return this.rules && this.rules.animations || false;
        },

        getIgnoredTabs: function () {
            return this.rules && this.rules.ignoreTabs && this.rules.ignoreTabs.configs ? this.rules.ignoreTabs.configs : false;
        },

        updateSearchConfig: function (rules) {
            if(!rules){
                return {searchConfigs: {Configs: this.defaultSearchConfig}};
            } 
            if(!rules.searchConfigs || !rules.searchConfigs.Configs){
                rules.searchConfigs = {Configs: this.defaultSearchConfig};
                return rules;
            } 
            if(!rules.searchConfigs.Configs.offers){
                rules.searchConfigs.Configs.offers = this.defaultSearchConfig.offers;
            }
            if(rules.searchConfigs.Configs.offers.active){
                if(!rules.searchConfigs.Configs.offers.designType
                || (rules.searchConfigs.Configs.offers.designType && !rules.searchConfigs.Configs.offers.designType.expanded && !rules.searchConfigs.Configs.offers.designType.collapsed)
                    || (rules.searchConfigs.Configs.offers.designType && rules.searchConfigs.Configs.offers.designType.expanded && rules.searchConfigs.Configs.offers.designType.collapsed)){
                    rules.searchConfigs.Configs.offers.designType = {
                        expanded: true,
                        collapsed: false
                    };
                }
            }
            if(!rules.searchConfigs.Configs.coupons){
                rules.searchConfigs.Configs.coupons = this.defaultSearchConfig.coupons;
            }
            if(rules.searchConfigs.Configs.coupons.active){
                if(!rules.searchConfigs.Configs.coupons.designType
                || (rules.searchConfigs.Configs.coupons.designType && !rules.searchConfigs.Configs.coupons.designType.expanded && !rules.searchConfigs.Configs.coupons.designType.collapsed)
                    || (rules.searchConfigs.Configs.coupons.designType && rules.searchConfigs.Configs.coupons.designType.expanded && rules.searchConfigs.Configs.coupons.designType.collapsed)){
                    rules.searchConfigs.Configs.coupons.designType = {
                        expanded: true,
                        collapsed: false
                    };
                }
            }
            return rules;
        },
        showPanelOnInstallPage: function () {
            if(ABEK.locale.getBrowserLang().toLowerCase() == "en"
            && this.rules 
            && this.rules.showPanelOnInstallPage 
            && this.rules.showPanelOnInstallPage.Configs
            && this.isSearchActive()){
                return true;
            }
            else{
                return false;
            }
        },
        updateEmptySearchConfig: function (rules) {
            if(!rules){
                return {emptySearch: {Configs: this.defaultEmptySearch}};
            } 
            if(!rules.emptySearch || !rules.emptySearch.Configs){
                rules.emptySearch = {Configs: this.defaultEmptySearch};
                return rules;
            }
            if(!rules.emptySearch.Configs.offers){
                rules.emptySearch.Configs.offers = {Configs: this.defaultEmptySearch.offers};
            }
            if(!rules.emptySearch.Configs.coupons){
                rules.emptySearch.Configs.coupons = {Configs: this.defaultEmptySearch.coupons};
            }

            rules.emptySearch.Configs.offers.trySearchIn = "";
            rules.emptySearch.Configs.offers.searchIn = "";
            rules.emptySearch.Configs.coupons.trySearchIn = "";
            rules.emptySearch.Configs.coupons.searchIn = "";

            if(rules.emptySearch.Configs.offers.domain){
                rules.emptySearch.Configs.offers.trySearchIn = AvastWRC.bs.getLocalizedString("spTrySearchInAmazon", [rules.emptySearch.Configs.offers.domain]);
            }
            if(rules.emptySearch.Configs.offers.domainName){
                rules.emptySearch.Configs.offers.searchIn = AvastWRC.bs.getLocalizedString("spSearchInAmazon", [rules.emptySearch.Configs.offers.domainName]);
            }
            if(rules.emptySearch.Configs.coupons.domain){
                rules.emptySearch.Configs.coupons.trySearchIn = AvastWRC.bs.getLocalizedString("spTrySearchDeals", [rules.emptySearch.Configs.coupons.domain]);
            }
            if(rules.emptySearch.Configs.coupons.domainName){
                rules.emptySearch.Configs.coupons.searchIn = AvastWRC.bs.getLocalizedString("spSearchInAmazon", [rules.emptySearch.Configs.coupons.domainName]);
            }
            return rules;

        },

        getEmptySearchConfig: function () {
            if(!this.rules || !this.rules.emptySearch || !this.rules.emptySearch.Configs){
                return this.defaultEmptySearch;
            } 
            return this.rules.emptySearch.Configs;
        },

        getSearchConfig: function () {
            if(!this.isValidTtl()){
                this.load();
            }
            
            if(!this.rules || !this.rules.searchConfigs || !this.rules.searchConfigs.Configs) return this.defaultSearchConfig;
            return this.rules.searchConfigs.Configs;
        },
        isSearchActive: function(){
            if(this.rules && this.rules.searchConfigs && this.rules.searchConfigs.Configs
                && ((this.rules.searchConfigs.Configs.coupons && this.rules.searchConfigs.Configs.coupons.active)
                    || (this.rules.searchConfigs.Configs.offers && this.rules.searchConfigs.Configs.offers.active))){
                return true;
            }
            return false;
        },
        getBurgerSendInfo: function () {
            var defBurgerSendInfo = {
				BATCH_MAX_MESSAGES: null,
				SEND_INTERVAL_TIME: null
            };
            if(this.rules && this.rules.burgerSendInfo && this.rules.burgerSendInfo.Configs){
                if(this.rules.burgerSendInfo.Configs.BATCH_MAX_MESSAGES){
                    defBurgerSendInfo.BATCH_MAX_MESSAGES = this.rules.burgerSendInfo.Configs.BATCH_MAX_MESSAGES;
                }
                if(this.rules.burgerSendInfo.Configs.SEND_INTERVAL_TIME){
                    defBurgerSendInfo.SEND_INTERVAL_TIME = this.rules.burgerSendInfo.Configs.SEND_INTERVAL_TIME;
                }
            }
            return defBurgerSendInfo;
        },
        updateCouponsShowConfig: function(rules){
            if(!rules)return this.couponsShowInTabConfig;

            if(!rules.couponsShow || !rules.couponsShow.Configs){
                rules.couponsShow = {Configs: this.couponsShowInTabConfig};
                return rules;
            }
            if(!rules.couponsShow.Configs.couponsWithCode){
                rules.couponsShow.Configs.couponsWithCode = this.couponsShowInTabConfig.couponsWithCode;
            }
            if(!rules.couponsShow.Configs.couponsWithoutCode){
                rules.couponsShow.Configs.couponsWithoutCode = this.couponsShowInTabConfig.couponsWithoutCode;
            }
            return rules;
            
        },
        getCouponsShowConfig: function () {
            if(!this.rules || !this.rules.couponsShow || !this.rules.couponsShow.Configs) return this.couponsShowInTabConfig;
            
            return this.rules.couponsShow.Configs;
        },
        tooltips: function(){
            if(!this.rules || !this.rules.tooltips || !this.rules.tooltips.Configs) return this.tooltipsConfigs;
            
            return this.rules.tooltips.Configs;
        }
    });
}).call(this, _, AvastWRC.Shepherd);

/*******************************************************************************
 *
 *  ende AvastWRC Shepherd
 */

/*******************************************************************************
 *
 *  AvastWRC Yes/No
 *
 ********************************************************************************/
(function (AvastWRC, _) {
    AvastWRC.YesNo = {
        init: function () {
            this.updateStoredValue();
        },
        updateStoredValue: function () {
            let self = this;

            self.getValue().then((value) => {
                if (value.askedTTL) {
                    self.powerUserData = value;
                } else {
                    self.setInitialConfig();
                }
            });
        },
        getValue: function () {
            return new Promise((resolve, reject) => {
                AvastWRC.getStorage(this.keyName, function (value) {
                    resolve(JSON.parse(value || "{}"));
                });
            });
        },
        isValidDelay: function (delay, ttlToCompare) {
            return ((parseInt(new Date().getTime()) / 1000) - ttlToCompare) > delay;
        },
        setInitialConfig: function () {
            let powerUserConfig = AvastWRC.Shepherd.getPowerUserConfig();

            if (powerUserConfig && powerUserConfig.delays) this.powerUserData.serverConfig = powerUserConfig;

            this.saveData();
        },
        isPowerUser: function () {
            return this.currentLanguageIsSupported()
                && this.rating[AvastWRC.Utils.getBrowserInfo().getBrowser()]
                && !this.userAlreadyProvidedFeedback()
                && this.userHasInteractEnough()
                && this.isTimeToAsk();
        },
        userAlreadyProvidedFeedback: function () {
            return this.powerUserData.reactions.positive || this.powerUserData.reactions.negative;
        },
        userHasInteractEnough: function () {
            return (daysSinceInstallation() > this.powerUserData.serverConfig.minimumTime) && (this.powerUserData.interactions.length >= this.powerUserData.serverConfig.minimumInteracionts);

            function daysSinceInstallation() {
                let date = AvastWRC.CONFIG.InstallDate.split(" ")[0], millisecondsOfOneDay = 86400000;
                return Math.round((new Date().getTime() / millisecondsOfOneDay) -
                    (new Date(`${date.split("/")[0]}/${parseInt(date.split("/")[1]) + 1}/${date.split("/")[2]}`).getTime() / millisecondsOfOneDay));
            }
        },
        isTimeToAsk: function () {
            let validTTLFound = false,
                delaysLeftToCheck = this.powerUserData.serverConfig.delays.slice(this.powerUserData.askedTTL.standard.length);

            for (let i = 0; i < delaysLeftToCheck.length; i++) {
                if (this.isValidDelay(delaysLeftToCheck[i], this.powerUserData.askedTTL.standard.slice(-1)[0] || 0)) {
                    validTTLFound = true;
                    break;
                }
            }

            return validTTLFound && this.askLaterValid();
        },
        getFeedBackInfo: function () {
            return {
                askForFeedback: this.isPowerUser()
            };
        },
        askLaterValid: function () {
            let askLaterValid = !this.powerUserData.askLaterEnabled || (this.isValidDelay(this.powerUserData.serverConfig.askLaterDelay * 86400, this.powerUserData.askedTTL.askLater)),
                self = this;

            if (askLaterValid) updateAskLater();

            return askLaterValid;

            function updateAskLater() {
                self.powerUserData.askedTTL.askLater = 0;
                self.powerUserData.askLaterEnabled = false;
                self.saveData();
            }
        },
        getHowToImproveLink: function () {
            return AvastWRC.Query.CONST.SAFESHOP_FEEDBACK_SERVER[AvastWRC.bal.brandingType === AvastWRC.BRANDING_TYPE_AVAST ? "AVAST" : "AVG"];
        },
        userAsked: function () {
            this.powerUserData.askedTTL.standard.push(Math.round(new Date().getTime() / 1000));
            this.saveData();
        },
        negativeFeedback: function () {
            this.config.powerUserData.reactions.negative = true;
            this.saveData();
        },
        positiveFeedback: function () {
            this.config.powerUserData.reactions.positive = true;
            this.saveData();
        },
        saveData: function () {
            AvastWRC.setStorage(this.keyName, JSON.stringify(this.powerUserData));
        },
        enableAskLater: function () {
            this.powerUserData.askLaterEnabled = true;
            this.powerUserData.reactions.askLater = true;
            this.powerUserData.askedTTL.askLater = Math.round(new Date().getTime() / 1000);
            this.powerUserData.askedTTL.standard.pop(); // It removes the ttl coming from on shown
            this.saveData();
        },
        getRatingLink: function () {
            return this.rating[AvastWRC.Utils.getBrowserInfo().getBrowser()] && this.rating[AvastWRC.Utils.getBrowserInfo().getBrowser()].rateLinks[AvastWRC.bal.brandingType === AvastWRC.BRANDING_TYPE_AVAST ? "AVAST" : "AVG"]
                .replace(new RegExp('__BROWSER_LANGUAGE__', 'g'), ABEK.locale.getBrowserLang());
        },
        currentLanguageIsSupported: function () {
            return this.ratingLanguagesSupported.indexOf(ABEK.locale.getBrowserLang()) >= 0;
        },
        getTemplateData: function () {
            return {
                strings: AvastWRC.bal.utils.loadLocalizedStrings({}, this.config.template.strings),
                images: AvastWRC.bal.utils.getLocalImageURLs({}, this.config.template.images)
            };
        },
        registerInteraction: function (tab) {
            let self = this;
            if (this.powerUserData.interactions.length > this.powerUserData.serverConfig.minimumInteracionts) return;

            addInteraction(tab);

            function addInteraction(tab) {
                let domain = AvastWRC.bal.getDomainFromUrl(tab.url), tabId = tab.id, index = domain + tabId;

                if ((self.powerUserData.interactions.length > self.powerUserData.serverConfig.minimumInteracionts)
                    || (self.powerUserData.interactions.indexOf(index) >= 0))
                    return;

                self.powerUserData.interactions.push(index);
                self.saveData();
            }
        },
        negativeFeedbackDone: function () {
            this.openFeedbackPageInNewTab(this.getHowToImproveLink()).then(() => {
                this.powerUserData.reactions.negative = true;
                this.saveData();
            });
        },
        positiveFeedbackDone: function () {
            this.openFeedbackPageInNewTab(this.getRatingLink()).then(() => {
                this.powerUserData.reactions.positive = true;
                this.saveData();
            });
        },
        openFeedbackPageInNewTab: function (link) {
            return new Promise((resolve, reject) => {
                AvastWRC.bs.openInNewTab(link, function (newTab) {
                    resolve();
                });
            });
        },
        keyName: "YesNo",
        rating: {
            "CHROME": {
                rateLinks: {
                    "AVG": "https://chrome.google.com/webstore/detail/avg-safeprice/mbckjcfnjmoiinpgddefodcighgikkgn/reviews?hl=__BROWSER_LANGUAGE__",
                    "AVAST": "https://chrome.google.com/webstore/detail/avast-safeprice/eofcbnmajmjmplflapaojjnihcjkigck/reviews?hl=__BROWSER_LANGUAGE__"
                }
            },
            "FIREFOX": {
                rateLinks: {
                    "AVG": "https://addons.mozilla.org/__BROWSER_LANGUAGE__/firefox/addon/avg-safeprice/reviews/add",
                    "AVAST": "https://addons.mozilla.org/__BROWSER_LANGUAGE__/firefox/addon/avast-safeprice/reviews/add"
                }
            },
            "OPERA": {
                rateLinks: {
                    "AVG": false,
                    "AVAST": "https://auth.opera.com/account/login?return_url=https://addons.opera.com/__BROWSER_LANGUAGE__/extensions/details/avast-safeprice/?display=__BROWSER_LANGUAGE__&service=addons"
                }
            }
        },
        ratingLanguagesSupported: ["en", "fr", "de", "ru", "pt", "es"],
        powerUserData: {
            serverConfig: {
                delays: [86400, 172800, 259200],
                minimumTime: 21,
                askLaterDelay: 60,
                minimumInteracionts: 3
            },
            askedTTL: {
                standard: [],
                askLater: 0
            },
            reactions: {
                positive: false,
                negative: false,
                askLater: false
            },
            interactions: [],
            askLaterEnabled: false
        },
        config: {
            template: {
                strings: [
                    AvastWRC.bal.brandingType === AvastWRC.BRANDING_TYPE_AVAST ? "safePriceEnjoyQuestion_Avast" : "safePriceEnjoyQuestion_AVG",
                    "sasGladYouLike", "sasSorry", "sasWhatToDo",
                    "safePriceLeaveRating", "sasAnswerYes", "sasAnswerNo",
                    "safePriceAskMeLater", "sasfeedback", "sasRate"
                ],
                images: {
                    logoSP32x32: "logo-safe-price-32.png",
                    positiveFeedback: "img-positive.png",
                    negativeFeedback: "img-negative.png",
                    closeIcon: "sp-settings-close.png"
                }
            }
        }
    };

    AvastWRC.bal.registerModule(AvastWRC.YesNo);

}).call(this, AvastWRC, _);

/*******************************************************************************
 *
 *  AvastWRC Social
 *
 ********************************************************************************/
(function (AvastWRC, _) {
    AvastWRC.Social = {
        init: function () {
            this.updateStoredValue();
        },
        updateStoredValue: function () {
            let self = this;

            self.getValue().then((value) => {
                if (value.interactionsTTL) {
                    self.config.socialData = this.alignWithServer(value);
                } else {
                    self.setInitialConfig();
                }

                self.saveData();
            });
        },
        alignWithServer: function (value) {
            let socialConfig = AvastWRC.Shepherd.getSocialConfig(), result = JSON.parse(JSON.stringify(value));

            if (socialConfig) {
                for (let key in value.serverConfig) {
                    result.serverConfig[key] = socialConfig[key];
                }
            }

            return result;
        },
        getValue: function () {
            return new Promise((resolve, reject) => {
                AvastWRC.getStorage(this.config.keyName, function (value) {
                    resolve(JSON.parse(value || "{}"));
                });
            });
        },
        setInitialConfig: function () {
            let socialConfig = AvastWRC.Shepherd.getSocialConfig();

            if (socialConfig) this.config.socialData.serverConfig = socialConfig;
        },
        shareOnFb: function () {
            AvastWRC.bs.openInNewTab(`${this.config.sharer.fb.url}?u=${encodeURIComponent(this.getFbLinkToShare())}`);
            this.addInteraction();
        },
        shareOnTttr: function () {
            AvastWRC.bs.openInNewTab(`${this.config.sharer.tttr.url}?url=${encodeURIComponent(this.getTttrLinkToShare())}`);
            this.addInteraction();
        },
        getFbLinkToShare: function () {
            return this.config.sharer.fb.urlToShare[AvastWRC.bal.brandingType === AvastWRC.BRANDING_TYPE_AVAST ? "AVAST" : "AVG"];
        },
        getTttrLinkToShare: function () {
            return this.config.sharer.tttr.urlToShare[AvastWRC.bal.brandingType === AvastWRC.BRANDING_TYPE_AVAST ? "AVAST" : "AVG"];
        },
        getTemplateData: function () {
            this.config.templateData.loaded = this.config.templateData.loaded || loadTemplateData();

            return this.config.templateData.loaded;

            function loadTemplateData() {
                return {
                    strings: AvastWRC.bal.utils.loadLocalizedStrings({}, AvastWRC.Social.config.templateData.strings),
                    images: AvastWRC.bal.utils.getLocalImageURLs({}, AvastWRC.Social.config.templateData.images)
                };
            }
        },
        isPowerSocialUser: function () {
            return AvastWRC.YesNo.userHasInteractEnough();
        },
        getDisplayInfo: function (data) {
            let isPowerSocialUser = this.isPowerSocialUser() || false;

            return {
                isPowerSocialUser: isPowerSocialUser,
                showInTop: isPowerSocialUser && this.interactionDelayIsValid(),
                showInBottomOffers: isPowerSocialUser && ((data.producstLength >= this.config.displayInfo.minimumOffers) || (data.accommodationsLength >= this.config.displayInfo.minimumOffers)),
                showInBottomCoupons: isPowerSocialUser && (data.couponsLength >= this.config.displayInfo.minimumCoupons)
            };
        },
        saveData: function () {
            AvastWRC.setStorage(this.config.keyName, JSON.stringify(this.config.socialData));
        },
        interactionDelayIsValid: function () {
            let self = this;

            return ((new Date().getTime() / 1000) - getLastInteractionTTL()) > (this.config.socialData.serverConfig.delay * 3600 * 24);

            function getLastInteractionTTL() {
                return self.config.socialData.interactionsTTL.length ? self.config.socialData.interactionsTTL.slice(-1).pop() : 0;
            }
        },
        addInteraction: function () {
            let currentDateInSeconds = Math.round((new Date().getTime() / 1000)),
                maximumInteractions = this.config.socialData.serverConfig.maximumInteractions;

            if (this.config.socialData.interactionsTTL.length < maximumInteractions) {
                this.config.socialData.interactionsTTL.push(currentDateInSeconds);
            } else {
                this.config.socialData.interactionsTTL = this.config.socialData.interactionsTTL.slice(maximumInteractions - 1).concat(currentDateInSeconds);
            }

            this.saveData();
        },
        config: {
            socialData: {
                serverConfig: {
                    maximumInteractions: 2,
                    delay: 60
                },
                interactionsTTL: []
            },
            sharer: {
                fb: {
                    url: "https://www.facebook.com/sharer/sharer.php",
                    urlToShare: {
                        AVAST: "https://www.avast.com/safeprice-new?utm_source=facebook&utm_campaign=social_sharing",
                        AVG: "https://www.avg.com/safeprice?utm_source=facebook&utm_campaign=social_sharing"
                    }
                },
                tttr: {
                    url: "https://twitter.com/share",
                    urlToShare: {
                        AVAST: "https://www.avast.com/safeprice-new?utm_source=twitter&utm_campaign=social_sharing",
                        AVG: "https://www.avg.com/safeprice?utm_source=twitter&utm_campaign=social_sharing"
                    }
                },
            },
            templateData: {
                strings: [
                    "spSocialShare",
                    "spSocialShareFb",
                    "spSocialSharetttr",
                    "avastAppName"
                ],
                images: {
                    fbLogo5x11: "fbLogo5x11.png",
                    fbLogo5x11HoverAndActive: "fbLogo5x11HoverAndActive.png",
                    tttrLogo5x11: "tttrLogo5x11.png",
                    tttrLogo5x11HoverAndActive: "tttrLogo5x11HoverAndActive.png",
                    closeIcon12x12: "close-icon-copy-8.png",
                },
                loaded: false
            },
            displayInfo: {
                minimumCoupons: 2,
                minimumOffers: 3
            },
            keyName: "Social"
        }
    };

    AvastWRC.bal.registerModule(AvastWRC.Social);
}).call(this, AvastWRC, _);
/*******************************************************************************
 *
 *  AvastWRC Uninstall Service
 *
 ********************************************************************************/
(function (AvastWRC, _) {
    AvastWRC.Uninstall = {
        setUninstallURL: function () {
            chrome.runtime.setUninstallURL(this.getUninstallURL(), function () {
                console.log("UninstallURL has been updated");
            });
        },
        getUninstallDataParameters: function () {
            return {
                action: this.config.defaultURLParameters.action,
                p_pro: this.config.defaultURLParameters.p_pro[AvastWRC.bal.brandingType === AvastWRC.BRANDING_TYPE_AVAST ? "AVAST" : "AVG"],
                p_elm: this.config.defaultURLParameters.p_elm,
                p_lng: ABEK.locale.getBrowserLang(),
                p_lid: AvastWRC.bal.getLandingPageCode(ABEK.locale.getBrowserLang(), ABEK.locale.getBrowserLocale()),
                p_hid: AvastWRC.CONFIG.GUID || AvastWRC.CONFIG.PLG_GUID,
                p_eguid: AvastWRC.CONFIG.PLG_GUID,
                p_its: this.installationDateToMilliseconds(AvastWRC.CONFIG.InstallDate),
                p_cmp: AvastWRC.Shepherd.getCampaing().campaignId,
                p_vep: AvastWRC.CONFIG.VERSION.split(".")[0],
                p_ves: AvastWRC.CONFIG.VERSION.split(".")[1],
                p_vbd: AvastWRC.CONFIG.VERSION.split(".")[2]
            };
        },
        getUninstallURL: function () {
            let uninstallDataParameters = this.getUninstallDataParameters(), uninstallURL = "";

            for (let key in uninstallDataParameters) {
                uninstallURL = `${uninstallURL}&${key}=${uninstallDataParameters[key]}`;
            }

            return `${this.config.uninstallURL.replace("_LANG_", AvastWRC.bal.getLandingPageCode(ABEK.locale.getBrowserLang(), ABEK.locale.getBrowserLocale()))}${uninstallURL}`.replace("?&", "?");
        },
        /*
            @installationDate: input format 2018/0/22 16:22:14, output in milliseconds
         */
        installationDateToMilliseconds: function (installationDate) {
            let date = installationDate.split(" ")[0], time = installationDate.split(" ")[1];
            return (new Date(`${date.split("/")[0]}/${parseInt(date.split("/")[1]) + 1}/${date.split("/")[2]} ${time}`).getTime()).toString();
        },
        config: {
            uninstallURL: `https://ipm-provider.ff.${AvastWRC.bal.brandingType === AvastWRC.BRANDING_TYPE_AVAST ? "avast" : "avg"}.com:443/?`,
            defaultURLParameters: {
                action: 2,
                p_pro: {
                    AVAST: 43,
                    AVG: 72
                },
                p_elm: 298
            }
        }
    };

}).call(this, AvastWRC, _);

/*******************************************************************************
 *
 *  AvastWRC Update Manager
 *
 ********************************************************************************/
(function (AvastWRC, _) {
    AvastWRC.UpdateManager = {
        init: function () {            
            if(self.config.recoveredFromLocalStorage !== true){
                
                AvastWRC.getStorage(self.config.localStorage.keyNames.main, function (data) {
                    let thisVersion = self.getCurrentVersion();
                    if(data){
                        self.config.recoveredFromLocalStorage = true;
                        self.config.localStorage.value = JSON.parse(data);

                        let excluded = self.isUpdatePageExcludedForThisRelase(thisVersion);
                        if(self.config.localStorage.value.showNextTime && !excluded){
                            self.showUpdatePage();
                        }
                        else{
                            let oldVersion = self.config.localStorage.value.currentVersion;                            
                            if(excluded && self.config.localStorage.value.currentVersion !== thisVersion){
                                self.config.localStorage.value.currentVersion = thisVersion;
                                self.config.localStorage.value.previousVersion = oldVersion;
                                self.config.localStorage.value.showNextTime = false;
                            }
                            else{
                                let change = self.isMajorVersionChange(self.config.localStorage.value.currentVersion, thisVersion);
                            
                                console.log("UpdateManager: isMajorVersionChange result ", change, self.config.localStorage.value.currentVersion, thisVersion);
    
                                if(change && change.major){
                                    self.config.localStorage.value.currentVersion = thisVersion;
                                    self.config.localStorage.value.previousVersion = oldVersion;
                                    self.config.localStorage.value.showNextTime = true;
                                }
                                if(change && change.minor){
                                    self.config.localStorage.value.currentVersion = thisVersion;
                                    self.config.localStorage.value.previousVersion = oldVersion;
                                    self.config.localStorage.value.showNextTime = false;
                                }
                            }
                            
                            self.saveValues();
                        }
                    }
                    else{             
                        self.config.localStorage.value = {
                            currentVersion: thisVersion,
                            showNextTime: false
                        };
                        self.saveValues();
                    }
                });
            }
        },
        isMajorVersionChange: function (storageVersion, newVersion){
            let storageVersionValues = (storageVersion) ? storageVersion.split(".") : [];
            let newVersionValues = (newVersion) ? newVersion.split(".") : [];
            let change = {
                major: false,
                minor: false
            };
            if(parseInt(storageVersionValues[0]) < parseInt(newVersionValues[0]) || parseInt(storageVersionValues[1]) < parseInt(newVersionValues[1])){
                change.major = true;
            }
            else if(parseInt(storageVersionValues[2]) < parseInt(newVersionValues[2])){
                change.minor = true;
            }
            return change;
        },
        isUpdatePageExcludedForThisRelase: function (newVersion) {
            let excluded = false;

            if(typeof newVersion !== "string" || !self.config.excludedReleases)return excluded;

            self.config.excludedReleases.forEach(v => {
                if(newVersion.indexOf(v) !== -1){
                    excluded = true;
                    return;
                }
            });

            return excluded;
            
        },
        getCurrentVersion: function () {
            return chrome.runtime.getManifest().version;
        },
        getUpdatePageLink: function () {
            var link = (AvastWRC.bal.brandingType === undefined || AvastWRC.bal.brandingType === AvastWRC.BRANDING_TYPE_AVAST) ?  self.config.updatePageLinkAvast : self.config.updatePageLinkAVG;
            return link.replace("__VERSION__", self.getCurrentVersion);
        },
        showUpdatePage: function () {
            let link = self.getUpdatePageLink();
            if (AvastWRC.Utils.getBrowserInfo().isAvast()){
                self.updatePageShown();
                return;
            }             
            console.log("showUpdatePage: url",  link);
            AvastWRC.bs.tabExistsWithUrl("lp-safeprice-update", function (tab) {
                if (tab) {
                    AvastWRC.bs.tabRedirectAndSetActive(tab, link);
                } else {
                    AvastWRC.bs.openInNewTab(link);
                }
                self.updatePageShown();
            });
        },
        updatePageShown: function () {
            self.config.localStorage.value.showNextTime = false;
            self.saveValues();
        },
        saveValues: function () {
            console.log("UpdateManager: saveValues", self.config.localStorage.value);
            AvastWRC.setStorage(self.config.localStorage.keyNames.main, JSON.stringify(self.config.localStorage.value));
        },
        config: {
            localStorage: {
                keyNames: {
                    main: "update"
                },
                value: {}
            },
            excludedReleases: ["19.1.",],
            recoveredFromLocalStorage: false,
            updatePageLinkAvast: "https://www.avast.com/lp-safeprice-update-v2?version=__VERSION__&utm_medium=link&utm_source=safeprice&utm_campaign=safeprice-update",
            updatePageLinkAVG: "https://www.avg.com/en-ww/lp-safeprice-update-v3?version=__VERSION__&utm_medium=link&utm_source=safeprice&utm_campaign=safeprice-update"
        }
    };
    let self = AvastWRC.UpdateManager;
    AvastWRC.bal.registerModule(AvastWRC.UpdateManager);
}).call(this, AvastWRC, _);

/*******************************************************************************
 *
 *  AvastWRC Notifications Manager Service
 *
 ********************************************************************************/
(function (AvastWRC, _) {
    AvastWRC.NotificationsManager = {
        init: function () {
            let self = this;

            AvastWRC.getStorage(this.config.localStorageKey, function (data) {
                if (data) self.config.values = _.extend(self.config.values, JSON.parse(data));
            });

        },
        resolveCouponsNotify: function (tab, data) {
            this.resolve(this.resolvers.coupons, data)(tab, data);
        },
        resolveOffersNotification: function (tab, data) {
            this.resolve(this.resolvers.offers, data)(tab, data);
        },
        notificationCommonData(notificationType, data){
            const settings = AvastWRC.bal.settings.get();
            data.data.notificationSettings = settings.userSPPoppupSettings.notifications[(_.invert(this.config.notificationType))[notificationType]] || {};
            data.data.animationsSettings =  AvastWRC.Shepherd.getAnimationsConfig();
            data.data.isPanelNotification = this.panelNotificationsAreEnabled(data.data.cachedData) && !this.deepIntegrationWithRules(data.data.cachedData);

            return data;
        },
        notifyCoupons: function (tab, data) {
            let notificationMessageAndType = this.getNotificationMessage(this.config.messages.injected.showCouponsNotification, data);
            let message = notificationMessageAndType.message;
            const notificationType = notificationMessageAndType.type; 
            let activeNotificationMessage = notificationMessageAndType.activeNotificationMessage;
            activeNotificationMessage.isCoupon = true;

            let panelMinSpecific = this.getDefaultPanelMinSpecifics(data.detailsToClosed);
            panelMinSpecific.coupon = JSON.parse(JSON.stringify(data.firstCouponNotApplied));

            let messageData = {
                message: message,
                data: {
                    message: message,
                    replace: [data.detailsToClosed.offerNumber],
                    replaceAB: [data.couponRibbonText, true /*true: coupons message false: offers message null no message*/],
                    category: this.config.messages.injected.showCouponsNotification.notificationCategory,
                    notificationCategoryFlag: this.config.messages.injected.showCouponsNotification.notificationCategoryFlag,
                    notificationType: notificationType,
                    transactionId: data.transactionId,
                    url: data.url,
                    cachedData: data,
                    panelMinSpecific: panelMinSpecific,
                    activeNotificationMessage: activeNotificationMessage
                }
            };
            messageData = this.notificationCommonData(notificationType, messageData);
            AvastWRC.bs.accessContent(tab, messageData);
        },
        notifyOffers: function (tab, data) {
            let notificationMessageAndType = this.getNotificationMessage(this.config.messages.injected.showOffersNotification, data);
            let message = notificationMessageAndType.message;
            const notificationType = notificationMessageAndType.type; 
            let activeNotificationMessage = notificationMessageAndType.activeNotificationMessage;

            let panelMinSpecific = this.getDefaultPanelMinSpecifics(data.detailsToClosed);

            if(data.products[0]){
                activeNotificationMessage.isOffer = true;
                panelMinSpecific.offer = JSON.parse(JSON.stringify(data.products[0]));
            }else if(data.accommodations[0]){
                activeNotificationMessage.isOfferAccommodations = true;
                panelMinSpecific.offer = data.accommodations[0] ? JSON.parse(JSON.stringify(data.accommodations[0])) : {};
            }
            let messageData = {
                message: message,
                data: {
                    message: message,
                    replace: [data.detailsToClosed.offerNumber],
                    replaceAB: [data.offersRibbonText, false /*true: coupons message false: offers message null no message*/],
                    category: this.config.messages.injected.showOffersNotification.notificationCategory,
                    notificationCategoryFlag: this.config.messages.injected.showOffersNotification.notificationCategoryFlag,
                    notificationType: notificationType,
                    transactionId: data.transactionId,
                    url: data.url,
                    cachedData: data,
                    panelMinSpecific: panelMinSpecific,
                    activeNotificationMessage: activeNotificationMessage
                },
            };
            messageData = this.notificationCommonData(notificationType, messageData);
            AvastWRC.bs.accessContent(tab, messageData);
        },
        notifyCouponsAndOffers: function (tab, data) {
            let notificationMessageAndType = this.getNotificationMessage(this.config.messages.injected.showOffersAndCouponsNotification, data);
            let message = notificationMessageAndType.message;
            const notificationType = notificationMessageAndType.type; 
            let activeNotificationMessage = notificationMessageAndType.activeNotificationMessage;

            let panelMinSpecific = this.getDefaultPanelMinSpecifics(data.detailsToClosed);
            if(data.products[0])
            {
                activeNotificationMessage.isOfferAndCoupon = true;
                panelMinSpecific.offerAndCoupon = JSON.parse(JSON.stringify(data.products[0]));
            }else if(data.accommodations[0]){
                activeNotificationMessage.isOfferAndCouponAccommodations = true;
                panelMinSpecific.offerAndCoupon = JSON.parse(JSON.stringify(AvastWRC.NotificationsManager.getRightHotel(data)));
            }
            let messageData = {
                message: message,
                data: {
                    message: message,
                    replace: [data.detailsToClosed.offerNumber],
                    replaceAB: [data.offersRibbonText, false /*true: coupons message false: offers message null no message*/],
                    category: this.config.messages.injected.showOffersAndCouponsNotification.notificationCategory,
                    notificationCategoryFlag: this.config.messages.injected.showOffersAndCouponsNotification.notificationCategoryFlag,
                    notificationType: notificationType,
                    transactionId: data.transactionId,
                    url: data.url,
                    cachedData: data,
                    panelMinSpecific: panelMinSpecific,
                    activeNotificationMessage: activeNotificationMessage
                }
            };
            messageData = this.notificationCommonData(notificationType, messageData);
            AvastWRC.bs.accessContent(tab, messageData);
        },
        updatePanel: function (tab, data) {
            AvastWRC.bs.accessContent(tab, {
                message: "updatePanel",
                data: data,
            });
        },
        isOnlyFakeShop: function (tab, data) {
            AvastWRC.bs.accessContent(tab, {
                message: "createFakeShopNotification",
                data: data,
            });
        },
        isOnlyPhishingDomain: function (tab, data) {
            AvastWRC.bs.accessContent(tab, {
                message: "createPhishingNotification",
                data: data,
            });
        },
        notifyCityHotels: function (tab, data) {
            let notificationMessageAndType = this.getNotificationMessage(this.config.messages.injected.showCityHotelsNotification, data);
            let message = notificationMessageAndType.message;
            const notificationType = notificationMessageAndType.type; 
            let activeNotificationMessage = notificationMessageAndType.activeNotificationMessage;

            let panelMinSpecific = this.getDefaultPanelMinSpecifics(data.detailsToClosed);
            activeNotificationMessage.isPopularHotel = true;
            panelMinSpecific.popularHotel = JSON.parse(JSON.stringify(data.hotelsCity[0]));
            panelMinSpecific.city = data.cityName;

            let messageData = {
                message: message,
                data: {
                    message: message,
                    replace: [data.cityName, data.detailsToClosed.offerNumber],
                    replaceAB: [false, false /*true: coupons message false: offers message null no message*/, data.accommodationsRibbonStars],
                    category: this.config.messages.injected.showCityHotelsNotification.notificationCategory,
                    notificationCategoryFlag: this.config.messages.injected.showCityHotelsNotification.notificationCategoryFlag,
                    notificationType: notificationType,
                    transactionId: data.transactionId,
                    url: data.url,
                    cachedData: data,
                    panelMinSpecific: panelMinSpecific,
                    activeNotificationMessage:activeNotificationMessage
                }
            };
            messageData = this.notificationCommonData(notificationType, messageData);
            AvastWRC.bs.accessContent(tab, messageData);
        },
        notifySimilarHotels: function (tab, data) {
            let notificationMessageAndType = this.getNotificationMessage(this.config.messages.injected.showSimilarHotelsNotification, data);
            let message = notificationMessageAndType.message;
            const notificationType = notificationMessageAndType.type; 
            let activeNotificationMessage = notificationMessageAndType.activeNotificationMessage;

            let panelMinSpecific = this.getDefaultPanelMinSpecifics(data.detailsToClosed);
            activeNotificationMessage.isAlternativeHotel = true;
            panelMinSpecific.alternativeHotel = JSON.parse(JSON.stringify(data.hotelsSimilar[0]));

            let messageData = {
                message: message,
                data: {
                    message: message,
                    replace: [data.detailsToClosed.offerNumber],
                    replaceAB: [false, false /*true: coupons message false: offers message null no message*/,data.accommodationsRibbonStars],
                    category: this.config.messages.injected.showSimilarHotelsNotification.notificationCategory,
                    notificationCategoryFlag: this.config.messages.injected.showSimilarHotelsNotification.notificationCategoryFlag,
                    notificationType: notificationType,
                    transactionId: data.transactionId,
                    url: data.url,
                    cachedData: data,
                    panelMinSpecific: panelMinSpecific,
                    activeNotificationMessage: activeNotificationMessage
                }
            };
            messageData = this.notificationCommonData(notificationType, messageData);
            AvastWRC.bs.accessContent(tab, messageData);
        },
        notifyRedirect: function (tab, data) {
            let notificationMessageAndType = this.getNotificationMessage(this.config.messages.injected.showRedirectNotification, data);
            let message = notificationMessageAndType.message;
            const notificationType = notificationMessageAndType.type; 
            let activeNotificationMessage = notificationMessageAndType.activeNotificationMessage;

            let panelMinSpecific = this.getDefaultPanelMinSpecifics(data.detailsToClosed);
            activeNotificationMessage.isSpecialDeal = true;
            panelMinSpecific.redirect = JSON.parse(JSON.stringify(data.redirect));

            let messageData = {
                message: message,
                data: _.extend(this.addNotifyData(data, message), {
                    replace: [data.detailsToClosed.offerNumber],
                    category: this.config.messages.injected.showRedirectNotification.notificationCategory,
                    notificationCategoryFlag: this.config.messages.injected.showRedirectNotification.notificationCategoryFlag,
                    notificationType: notificationType,
                    transactionId: data.transactionId,
                    url: data.url,
                    cachedData: data,
                    panelMinSpecific: panelMinSpecific,
                    activeNotificationMessage: activeNotificationMessage
                })
            };
            messageData = this.notificationCommonData(notificationType, messageData);
            AvastWRC.bs.accessContent(tab, messageData);
        },
        getDefaultPanelMinSpecifics: function (detailsToClosed) {
            if(!detailsToClosed)detailsToClosed = {offerNumber: 0};
            return {
                offerAndCoupon: {},
                offer: {},
                popularHotel: {},
                city: "",
                alternativeHotel: {},
                coupon: {},
                redirect: {},
                offersNumber: detailsToClosed.offerNumber,
                offersNumberLength: detailsToClosed.offerNumber.toString().length,
                showShowAllButton: detailsToClosed.offerNumber > 1
            };
        },
        blinkIcon: function (tab, data) {
            console.log("blinkIcon no notifications available")

            AvastWRC.bs.accessContent(tab, {
                message: "updatePanel",
                data: data,
            });

            AvastWRC.bal.sp.setBadge(tab.id, data.detailsToClosed.offerNumber.toString(), true);
            //send event badge
            AvastWRC.bal.sp.badgeHighlighted(tab.id, data.url, data.transactionId);

            var cachedData = AvastWRC.TabReqCache.get(tab.id, "safePriceInTab");
            cachedData.badgeHighlighted = true;
            AvastWRC.TabReqCache.set(tab.id, "safePriceInTab", cachedData);
        },
        getTemplateData: function () {
            return {
                strings: AvastWRC.bal.utils.loadLocalizedStrings({}, this.config.template.strings),
                images: AvastWRC.bal.utils.getLocalImageURLs({}, this.config.template.images),
                animations: AvastWRC.bal.utils.getLocalImageURLs({}, this.config.template.animations),
                isPanelNotification: this.panelNotificationsAreEnabled() || false
            };
        },
        addNotifyData: function (originalData, message) {
            let originalDataCopy = JSON.parse(JSON.stringify(originalData));
            originalDataCopy.templateData = {
                strings: AvastWRC.bal.utils.loadLocalizedStrings({}, this.config.template.strings),
                images: AvastWRC.bal.utils.getLocalImageURLs({}, this.config.template.images)
            };

            originalDataCopy.message = message;

            return originalDataCopy;

        },
        isTimeForRedirect: function (data) {
            let currentTimeInMilliseconds = (new Date()).getTime(),
                redirectUrl = data.redirect.url,
                redirectTTLIsValid = (currentTimeInMilliseconds - this.getTTLForRedirectUrl(redirectUrl)) >= (AvastWRC.Shepherd.getNotificationsConfig().redirectTTL * 1000);
            console.log("referrer: "+ data.referrer);
            if (redirectTTLIsValid) {
                setTimeout(() => {
                    this.updateRedirectTTL(redirectUrl, currentTimeInMilliseconds);
                }, 2000);
            }

            return redirectTTLIsValid;
        },
        getTTLForRedirectUrl: function (domain) {
            return this.config.values.redirectTTL[domain] || 0;
        },
        updateRedirectTTL: function (url, dateInMilliseconds) {
            this.config.values.redirectTTL[url] = dateInMilliseconds;
            this.cleanRedirectUrlTTl();
            this.saveValues();
        },
        setTrustedFakeDomain: function (domain) {
            this.config.values.trustedFakeDomain[domain] = true;
            this.saveValues();
        },
        setTrustedPhishingDomain: function (domain) {
            this.config.values.trustedPhishingDomain[domain] = true;
            this.saveValues();
        },
        isTrustedFakeDomain: function (domain) {
           return this.config.values.trustedFakeDomain && this.config.values.trustedFakeDomain[domain] ? true : false;
        },
        isTrustedPhishingDomain: function (domain) {
            return this.config.values.trustedPhishingDomain && this.config.values.trustedPhishingDomain[domain] ? true : false;
         },
        cleanRedirectUrlTTl: function () {
            let currentTimeInMilliseconds = (new Date()).getTime();

            for (let key in  this.config.values.redirectTTL) {
                if ((currentTimeInMilliseconds - this.config.values.redirectTTL[key]) >= (AvastWRC.Shepherd.getNotificationsConfig().redirectTTL * 1000)) delete this.config.values.redirectTTL[key];
            }
        },
        saveValues: function () {
            AvastWRC.setStorage(this.config.localStorageKey, JSON.stringify(this.config.values));
        },
        resolve: function (resolvers, data) {
            let notifier = resolveRecursive(resolvers, data);

            return notifier.found ? notifier.action() : (() => undefined);

            function resolveRecursive(resolvers, data, feedback = {found: false}) {
                for (let key in resolvers) {
                    if (feedback.found) return feedback;

                    if (resolvers[key].resolver()(data)) {
                        if (!resolvers[key].resolvers) {
                            return {
                                found: true,
                                action: resolvers[key].action
                            };
                        } else {
                            feedback = resolveRecursive(resolvers[key].resolvers, data);
                        }
                    }
                }

                return feedback;
            }
        },
        disableCategoryForDomain: function (domain, category) {
            let domainData = this.config.onlyInMemoryValues.categoriesBlackListedOnDomain[domain] || {categoryFlag: 0, closedTimestamps: []};
            domainData.categoryFlag = domainData.categoryFlag + category;
            domainData.closedTimestamps[category] = (new Date()).getTime();
            this.config.onlyInMemoryValues.categoriesBlackListedOnDomain[domain] = domainData;
            console.log(this.config.onlyInMemoryValues.categoriesBlackListedOnDomain, "after disable");
        },
        isCategoryAvailableForDomain: function (domain, category) {
            let closedCategoryData = this.config.onlyInMemoryValues.categoriesBlackListedOnDomain[domain] || {categoryFlag: 0, closedTimestamp: []};
            if( (closedCategoryData.categoryFlag & category) == category){
                let closedTime = closedCategoryData.closedTimestamps[category];
                let closedCategoryTtlIsValid = (closedTime) ? ((new Date()).getTime() - closedTime) < AvastWRC.Shepherd.getNotificationsConfig().closeTTL*1000 : false;
                if(closedCategoryTtlIsValid){
                    //console.log("Category: ", category, " ----NOT AVAILABLE----", this.config.onlyInMemoryValues.categoriesBlackListedOnDomain);
                    return false;
                }else{
                    this.config.onlyInMemoryValues.categoriesBlackListedOnDomain[domain].closedTimestamps[category] = null;
                    this.config.onlyInMemoryValues.categoriesBlackListedOnDomain[domain].categoryFlag = this.config.onlyInMemoryValues.categoriesBlackListedOnDomain[domain].categoryFlag - category;
                    //console.log("Category: ", category, " ----AVAILABLE (TTL expired)----", this.config.onlyInMemoryValues.categoriesBlackListedOnDomain);
                    return true;
                }
            }else{
                //console.log("Category: ", category, " ----AVAILABLE (not blocked)----", this.config.onlyInMemoryValues.categoriesBlackListedOnDomain);
                return true;
            }
        },
        ignoreCouponsTimeout: function (data) {
            return data.suppress_x_timeout;
        },
        disableCouponsForDomain: function (domain) {
            if (!AvastWRC.bal.settings.get().userSPPoppupSettings.notifications.coupons.showOnce) {
                this.config.values.domainsWhereCouponsHaveBeenShowed = [];
            } else {
                if (this.config.values.domainsWhereCouponsHaveBeenShowed.indexOf(domain) < 0) this.config.values.domainsWhereCouponsHaveBeenShowed.push(domain)
            }

            this.saveValues();
        },
        couponHaveBeenShowedInDomain: function (data) {
            var value = (!AvastWRC.bal.settings.get().userSPPoppupSettings.notifications.coupons.showOnce)
            || (this.config.values.domainsWhereCouponsHaveBeenShowed.indexOf(data.urlDomain || AvastWRC.bal.getDomainFromUrl(data.url)) >= 0)
            return value;
        },
        barNotificationsAreEnabled: function () {
            return AvastWRC.Shepherd.getNotificationsConfig().notificationType.bar;
        },

        deepIntegrationWithRules: function(data) {
            if(data && data.diRules && data.diRules.length > 0){
                return true;
            }
            return false;
        },
        panelNotificationsAreEnabled: function (data = null) {
            if (!data) {
                return AvastWRC.Shepherd.getNotificationsConfig().notificationType.panel;
            }
            else if (AvastWRC.Shepherd.getNotificationsConfig().notificationType.panel || ((data.accommodationsLength > 0 || data.suppress_x_timeout) && !AvastWRC.bs.browserCampaign)) {
                return true;
            }
            return false;
        },
        notificationsArePanelMin: function () {
            return AvastWRC.Shepherd.getNotificationsConfig().notificationType.panelMin;
        },
        isfakeShopNotification: function(data){
            return data.urlData.isfakeShop && !data.urlData.isTrustedFakeDomain;
        },
        isPhishingDomainNotification: function(data){
            return data.urlData.isPhishingDomain && !data.urlData.isTrustedPhishingDomain;
        },
        getNotificationMessage: function (messageKey, data) {
            let notification = {
                message: "NOTHING",
                type: "NOTHING",
                activeNotificationMessage: {
                    isOfferAndCoupon: false,
                    isOfferAndCouponAccommodations: false,
                    isOffer: false,
                    isOfferAccommodations: false,
                    isPopularHotel: false,
                    isAlternativeHotel: false,
                    isCoupon: false,
                    isSpecialDeal: false,   
                }
            }
            if (this.isfakeShopNotification(data)) {
                notification.message = messageKey.fakeShop;
                notification.type = this.config.notificationType.fakeShop;
            }else if (this.isPhishingDomainNotification(data)) {
                notification.message = messageKey.phishingDomain;
                notification.type = this.config.notificationType.phishingDomain;
            }if (this.deepIntegrationWithRules(data)){
                notification.message = messageKey.di;
                notification.type = this.config.notificationType.deepIntegration;
            }else if (this.notificationsAreMinimized()) {
                if(AvastWRC.NotificationsManager.isDomainInBlacklist(AvastWRC.bal.getDomainFromUrl(data.url))){
                    AvastWRC.NotificationsManager.blinkIcon.bind(AvastWRC.NotificationsManager)(data.tab, data)
                }else{
                    notification.message = messageKey.minimized;
                    notification.type = this.config.notificationType.minimized;
                }
            }else if (this.panelNotificationsAreEnabled(data)) {
                notification.message = messageKey.panel;
                notification.type = this.config.notificationType.panel;
            }else if (this.notificationsArePanelMin()) {
                notification.message = messageKey.panelMin;
                notification.type = this.config.notificationType.panelMin;
            }else if (this.barNotificationsAreEnabled()) {
                notification.message = messageKey.bar;
                notification.type = this.config.notificationType.bar;
            }else{
                notification.message = messageKey.panelMin;
                notification.type = this.config.notificationType.panelMin;
            }
            return notification;
        },
        notificationsAreMinimized: function () {
           return AvastWRC.Shepherd.getNotificationsConfig().notificationType.minimized || this.config.onlyInMemoryValues.minimized;
        },
        notificationsAvailable: function (data = {}) {
            return !AvastWRC.Shepherd.getNotificationsConfig().notificationType.none && !data.isDomainInSettingsWhiteList;
        },
        setMinimized: function (value) {
            this.config.onlyInMemoryValues.minimized = value;
        },
        getRightHotel: function (data) {
            if (AvastWRC.bal.settings.get().userSPPoppupSettings.notifications.accommodations.showBetter) {
                return data.hotelsPriceComp.length ? data.hotelsPriceComp[0] : data.accommodations[0];
            } else if (AvastWRC.bal.settings.get().userSPPoppupSettings.notifications.accommodations.showSimilar) {
                return data.hotelsSimilar.length ? data.hotelsSimilar[0] : data.accommodations[0];
            } else if (AvastWRC.bal.settings.get().userSPPoppupSettings.notifications.accommodations.showPopular) {
                return data.hotelsCity.length ? data.hotelsCity[0] : data.accommodations[0];
            }

            return {};
        },
        removeDomainFromBlacklist: function (domain) {
            let index = this.config.onlyInMemoryValues.domainsBlacklist.indexOf(domain);

            if (index >= 0) this.config.onlyInMemoryValues.domainsBlacklist.splice(index, 1);
        },
        addDomainToBlacklist: function (domain) {
            let index = this.config.onlyInMemoryValues.domainsBlacklist.indexOf(domain);

            if (index < 0) this.config.onlyInMemoryValues.domainsBlacklist.push(domain);
        },
        isDomainInBlacklist: function (domain) {
            return this.config.onlyInMemoryValues.domainsBlacklist.indexOf(domain) >= 0;
        },
        resolvers: {
            coupons: {
                isOnlyFakeShopInFirstRequest: {
                    resolver: (() => AvastWRC.NotificationsManager.resolvers.isOnlyFakeShopInFirstRequest),
                    action: (() => AvastWRC.NotificationsManager.isOnlyFakeShop.bind(AvastWRC.NotificationsManager))
                },
                isOnlyPhishingDomainInFirstRequest: {
                    resolver: (() => AvastWRC.NotificationsManager.resolvers.isOnlyPhishingInFirstRequest),
                    action: (() => AvastWRC.NotificationsManager.isOnlyPhishingDomain.bind(AvastWRC.NotificationsManager))
                },
                isIconClicked: {
                    resolver: (() => AvastWRC.NotificationsManager.resolvers.isIconClicked),
                    action: (() => AvastWRC.NotificationsManager.updatePanel.bind(AvastWRC.NotificationsManager))
                },
                notificationsAvailable: {
                    resolver: (() => AvastWRC.NotificationsManager.resolvers.notificationsAvailable),
                    resolvers: {
                        isOnlyFirstRequest:{
                            resolver: (() => AvastWRC.NotificationsManager.resolvers.isOnlyFirstRequest),
                            resolvers:{
                                redirectIsAvailable: {
                                    resolver: (() => AvastWRC.NotificationsManager.resolvers.redirectIsAvailable),
                                    action: (() => AvastWRC.NotificationsManager.notifyRedirect.bind(AvastWRC.NotificationsManager))
                                },
                                couponsAreAvailable: {
                                    resolver: (() => AvastWRC.NotificationsManager.resolvers.couponsAreAvailable),
                                    action: (() => AvastWRC.NotificationsManager.notifyCoupons.bind(AvastWRC.NotificationsManager))
                                },
                                isFirstRequestBlinkIcon: {
                                    resolver: (() => AvastWRC.NotificationsManager.resolvers.isFirstRequestBlinkIcon),
                                    action: (() => AvastWRC.NotificationsManager.blinkIcon.bind(AvastWRC.NotificationsManager))
                                },
                                isUpdatePanel: {
                                    resolver: (() => AvastWRC.NotificationsManager.resolvers.isUpdatePanel),
                                    action: (() => AvastWRC.NotificationsManager.updatePanel.bind(AvastWRC.NotificationsManager))
                                },
                            }
                        },
                        isUpdatePanel: {
                            resolver: (() => AvastWRC.NotificationsManager.resolvers.isUpdatePanel),
                            action: (() => AvastWRC.NotificationsManager.updatePanel.bind(AvastWRC.NotificationsManager))
                        },
                    }
                },
                isUpdatePanelWithBlink: {
                    resolver: (() => AvastWRC.NotificationsManager.resolvers.isUpdatePanelWithBlink),
                    action: (() => AvastWRC.NotificationsManager.blinkIcon.bind(AvastWRC.NotificationsManager))
                },
                isUpdatePanel: {
                    resolver: (() => AvastWRC.NotificationsManager.resolvers.isUpdatePanel),
                    action: (() => AvastWRC.NotificationsManager.updatePanel.bind(AvastWRC.NotificationsManager))
                }
            },
            offers: {
                isOnlyFakeShopInSecondRequest: {
                    resolver: (() => AvastWRC.NotificationsManager.resolvers.isOnlyFakeShopInSecondRequest),
                    action: (() => AvastWRC.NotificationsManager.isOnlyFakeShop.bind(AvastWRC.NotificationsManager))
                },
                isOnlyPhishingDomainInSecondRequest: {
                    resolver: (() => AvastWRC.NotificationsManager.resolvers.isOnlyPhishingInSecondRequest),
                    action: (() => AvastWRC.NotificationsManager.isOnlyPhishingDomain.bind(AvastWRC.NotificationsManager))
                },
                isIconClicked: {
                    resolver: (() => AvastWRC.NotificationsManager.resolvers.isIconClicked),
                    action: (() => AvastWRC.NotificationsManager.updatePanel.bind(AvastWRC.NotificationsManager))
                },
                notificationsAvailable: {
                    resolver: (() => AvastWRC.NotificationsManager.resolvers.notificationsAvailable),
                    resolvers: {
                        redirectIsAvailable: {
                            resolver: (() => AvastWRC.NotificationsManager.resolvers.redirectIsAvailable),
                            action: (() => AvastWRC.NotificationsManager.notifyRedirect.bind(AvastWRC.NotificationsManager))
                        },
                        isCouponsAndOffers: {
                            resolver: (() => AvastWRC.NotificationsManager.resolvers.isCouponsAndOffers),
                            action: (() => AvastWRC.NotificationsManager.notifyCouponsAndOffers.bind(AvastWRC.NotificationsManager))
                        },
                        isPriceComparison: {
                            resolver: (() => AvastWRC.NotificationsManager.resolvers.isPriceComparison),
                            action: (() => AvastWRC.NotificationsManager.notifyOffers.bind(AvastWRC.NotificationsManager))
                        },
                        isCityHotel: {
                            resolver: (() => AvastWRC.NotificationsManager.resolvers.isCityHotel),
                            action: (() => AvastWRC.NotificationsManager.notifyCityHotels.bind(AvastWRC.NotificationsManager))
                        },
                        isSimilarHotels: {
                            resolver: (() => AvastWRC.NotificationsManager.resolvers.isSimilarHotels),
                            action: (() => AvastWRC.NotificationsManager.notifySimilarHotels.bind(AvastWRC.NotificationsManager))
                        },
                        couponsAreAvailable: {
                            resolver: (() => AvastWRC.NotificationsManager.resolvers.couponsAreAvailable),
                            action: (() => AvastWRC.NotificationsManager.notifyCoupons.bind(AvastWRC.NotificationsManager))
                        },
                        isUpdatePanelWithBlink: {
                            resolver: (() => AvastWRC.NotificationsManager.resolvers.isUpdatePanelWithBlink),
                            action: (() => AvastWRC.NotificationsManager.blinkIcon.bind(AvastWRC.NotificationsManager))
                        },
                        isUpdatePanel: {
                            resolver: (() => AvastWRC.NotificationsManager.resolvers.isUpdatePanel),
                            action: (() => AvastWRC.NotificationsManager.updatePanel.bind(AvastWRC.NotificationsManager))
                        }
                    }
                },
                isUpdatePanelWithBlink: {
                    resolver: (() => AvastWRC.NotificationsManager.resolvers.isUpdatePanelWithBlink),
                    action: (() => AvastWRC.NotificationsManager.blinkIcon.bind(AvastWRC.NotificationsManager))
                },
                isUpdatePanel: {
                    resolver: (() => AvastWRC.NotificationsManager.resolvers.isUpdatePanel),
                    action: (() => AvastWRC.NotificationsManager.updatePanel.bind(AvastWRC.NotificationsManager))
                }
            },
            notificationsAvailable: function (data) {
                var result = AvastWRC.NotificationsManager.notificationsAvailable(data);
                console.log("notificationsAvailable", result);
                return result;
            },
            isOnlyFakeShopInFirstRequest: function (data) {
                return data && data.onlyFirstRequest && data.panelData && data.urlData && data.urlData.isfakeShop && !data.urlData.isTrustedFakeDomain && !AvastWRC.NotificationsManager.resolvers.isCouponsOrSimilarCoupons(data) && !AvastWRC.NotificationsManager.resolvers.isRedirect(data);
            },
            isOnlyFakeShopInSecondRequest: function (data) {
                return data && data.panelData && data.urlData && data.urlData.isfakeShop && !data.urlData.isTrustedFakeDomain && !AvastWRC.NotificationsManager.resolvers.isCouponsOrSimilarCoupons(data) && !AvastWRC.NotificationsManager.resolvers.isRedirect(data) &&  !AvastWRC.NotificationsManager.resolvers.isProductsOrAccommodations(data);
            },
            isOnlyPhishingInFirstRequest: function (data) {
                return data && data.onlyFirstRequest && data.panelData && data.urlData && data.urlData.isPhishingDomain && !data.urlData.isTrustedPhishingDomain && !AvastWRC.NotificationsManager.resolvers.isCouponsOrSimilarCoupons(data) && !AvastWRC.NotificationsManager.resolvers.isRedirect(data);
            },
            isOnlyPhishingInSecondRequest: function (data) {
                return data && data.panelData && data.urlData && data.urlData.isPhishingDomain && !data.urlData.isTrustedPhishingDomain && !AvastWRC.NotificationsManager.resolvers.isCouponsOrSimilarCoupons(data) && !AvastWRC.NotificationsManager.resolvers.isRedirect(data) &&  !AvastWRC.NotificationsManager.resolvers.isProductsOrAccommodations(data);
            },
            isOnlyFirstRequest: function (data) {
                console.log("isOnlyFirstRequest");
                return data && data.onlyFirstRequest;
            },
            redirectIsAvailable: function (data) {
                var categoryFlag = AvastWRC.NotificationsManager.config.messages.injected.showRedirectNotification.notificationCategoryFlag;
                var result = AvastWRC.NotificationsManager.isCategoryAvailableForDomain(data.urlDomain, categoryFlag)
                    && AvastWRC.bal.settings.get().userSPPoppupSettings.notifications.others.showAlways
                    &&  AvastWRC.NotificationsManager.resolvers.isRedirect(data)
                    && AvastWRC.NotificationsManager.isTimeForRedirect(data);
                console.log("redirectIsAvailable", result);
                return result;
            },
            couponsAreAvailable: function (data) {
                let categoryFlag = AvastWRC.NotificationsManager.config.messages.injected.showCouponsNotification.notificationCategoryFlag,
                    result = AvastWRC.NotificationsManager.resolvers.isCoupons(data)
                        && (AvastWRC.NotificationsManager.ignoreCouponsTimeout(data) || (AvastWRC.NotificationsManager.isCategoryAvailableForDomain(data.urlDomain, categoryFlag)
                            && ((AvastWRC.bal.settings.get().userSPPoppupSettings.notifications.coupons.showAlways) ||
                                !(AvastWRC.bal.settings.get().userSPPoppupSettings.notifications.coupons.hide || AvastWRC.NotificationsManager.couponHaveBeenShowedInDomain(data)))));
                console.log("couponsAreAvailable", result);
                return result;
            },
            isFirstRequestBlinkIcon: function (data) {
                var result = AvastWRC.NotificationsManager.resolvers.isRedirect(data) || AvastWRC.NotificationsManager.resolvers.isCouponsOrSimilarCoupons(data);
                console.log("isFirstRequestBlinkIcon", result);
                return result;
            },
            isUpdatePanelWithBlink: function (data) {
                var result = AvastWRC.NotificationsManager.resolvers.isCouponsOrSimilarCoupons(data) || AvastWRC.NotificationsManager.resolvers.isRedirect(data) || AvastWRC.NotificationsManager.resolvers.isProductsOrAccommodations(data);
                console.log("isUpdatePanelWithBlink", result);
                return result;
            },
            isUpdatePanel: function (data) {
                return true;
            },
            isIconClicked: function (data) {
                console.log("isIconClicked", data.iconClicked);
                return data.iconClicked;
            },
            isCouponsAndOffers: function (data) {
                var categoryFlag = AvastWRC.NotificationsManager.config.messages.injected.showOffersAndCouponsNotification.notificationCategoryFlag;
                var result = AvastWRC.NotificationsManager.isCategoryAvailableForDomain(data.urlDomain, categoryFlag)
                    && AvastWRC.NotificationsManager.resolvers.couponsAreAvailable(data)
                    && (AvastWRC.NotificationsManager.resolvers.isPriceComparison(data)
                        || AvastWRC.NotificationsManager.resolvers.isCityHotel(data)
                        || AvastWRC.NotificationsManager.resolvers.isSimilarHotels(data));
                console.log("isCouponsAndOffers", result);
                return result;
            },
            isPriceComparison: function (data){
                var categoryFlag = AvastWRC.NotificationsManager.config.messages.injected.showOffersNotification.notificationCategoryFlag;
                var result = AvastWRC.NotificationsManager.isCategoryAvailableForDomain(data.urlDomain, categoryFlag)
                    && data.showPriceComparisonNotification
                    && (AvastWRC.NotificationsManager.resolvers.isProducts(data) || (data && data.priceComparisonLength));
                console.log("isPriceComparison", result);
                return result;
            },
            isCityHotel: function (data) {
                var categoryFlag = AvastWRC.NotificationsManager.config.messages.injected.showCityHotelsNotification.notificationCategoryFlag;
                var result = AvastWRC.NotificationsManager.isCategoryAvailableForDomain(data.urlDomain, categoryFlag)
                    && data && data.cityHotelLength && data.cityName && AvastWRC.bal.settings.get().userSPPoppupSettings.notifications.accommodations.showPopular;
                console.log("isCityHotel", result);
                return result;
            },
            isSimilarHotels: function (data) {
                var categoryFlag = AvastWRC.NotificationsManager.config.messages.injected.showSimilarHotelsNotification.notificationCategoryFlag;
                var result = AvastWRC.NotificationsManager.isCategoryAvailableForDomain(data.urlDomain, categoryFlag)
                    && data && data.similarHoteLength && AvastWRC.bal.settings.get().userSPPoppupSettings.notifications.accommodations.showSimilar;
                console.log("isSimilarHotels", result);
                return result;
            },
            isRedirect: function (data) {
                return data && data.redirectLength;
            },
            isCoupons: function (data) {
                return data && data.couponsLength;
            },
            isProducts: function (data) {
                return  data && data.producstLength;
            },
            isAccommodations: function (data) {
                return data && data.accommodationsLength;
            },
            isCouponsOrSimilarCoupons: function (data) {
                return data && (data.couponsLength);
            },
            isProductsOrAccommodations: function (data) {
                return AvastWRC.NotificationsManager.resolvers.isProducts(data) || AvastWRC.NotificationsManager.resolvers.isAccommodations(data);
            }
        },
        config: {
            messages: {
                background: {},
                injected: {
                    showOffersNotification: {
                        di: "applyDeepIntegration",
                        bar: "showOffersBarNotification",
                        minimized: "showMinimizedNotifications",
                        panelMin: "showPanelMinNotifications",
                        panel: "showPanelNotifications",
                        fakeShop: "createFakeShopNotification",
                        phishingDomain: "createPhishingDomainNotification",
                        notificationCategory: "OFFERS",
                        notificationCategoryFlag: 2 // bitmask value
                    },
                    showCouponsNotification: {
                        di: "applyDeepIntegration",
                        bar: "showCouponsBarNotification",
                        minimized: "showMinimizedNotifications",
                        panelMin: "showPanelMinNotifications",
                        panel: "showPanelNotifications",
                        fakeShop: "createFakeShopNotification",
                        phishingDomain: "createPhishingDomainNotification",
                        notificationCategory: "COUPONS",
                        notificationCategoryFlag: 4 // bitmask value
                    },
                    showOffersAndCouponsNotification: {
                        di: "applyDeepIntegration",
                        bar: "showOffersAndCouponsBarNotification",
                        minimized: "showMinimizedNotifications",
                        panelMin: "showPanelMinNotifications",
                        panel: "showPanelNotifications",
                        fakeShop: "createFakeShopNotification",
                        phishingDomain: "createPhishingDomainNotification",
                        notificationCategory: "OFFERS_AND_COUPONS",
                        notificationCategoryFlag: 8 // bitmask value
                    },
                    showRedirectNotification: {
                        di: "applyDeepIntegration",
                        bar: "showRedirectBarNotification",
                        minimized: "showMinimizedNotifications",
                        panelMin: "showPanelMinNotifications",
                        panel: "showPanelNotifications",
                        fakeShop: "createFakeShopNotification",
                        phishingDomain: "createPhishingDomainNotification",
                        notificationCategory: "SPECIAL_DEALS",
                        notificationCategoryFlag: 64 // bitmask value
                    },
                    showCityHotelsNotification: {
                        di: "applyDeepIntegration",
                        bar: "showCityHotelsBarNotification",
                        minimized: "showMinimizedNotifications",
                        panelMin: "showPanelMinNotifications",
                        panel: "showPanelNotifications",
                        fakeShop: "createFakeShopNotification",
                        phishingDomain: "createPhishingDomainNotification",
                        notificationCategory: "POPULAR_HOTELS",
                        notificationCategoryFlag: 128 // bitmask value
                    },
                    showSimilarHotelsNotification: {
                        di: "applyDeepIntegration",
                        bar: "showSimilarHotelsBarNotification",
                        minimized: "showMinimizedNotifications",
                        panelMin: "showPanelMinNotifications",
                        panel: "showPanelNotifications",
                        fakeShop: "createFakeShopNotification",
                        phishingDomain: "createPhishingDomainNotification",
                        notificationCategory: "ALTERNATIVE_HOTELS",
                        notificationCategoryFlag: 256 // bitmask value
                    },
                    showMinimizedNotifications: "showMinimizedNotifications",
                }
            },
            template: {
                strings: [],
                images: {},
                animations: {}
            },
            values: {
                redirectTTL: {},
                domainsWhereCouponsHaveBeenShowed: [],
                trustedFakeDomain: {},
                trustedPhishingDomain: {}
            },
            onlyInMemoryValues: {
                categoriesBlackListedOnDomain: [],
                domainsBlacklist: [],
                minimized: false,
            },
            notifications: {
                minimized: false
            },
            localStorageKey: "__NOTIFICATIONS__",
            notificationType: {
                panel: "MAIN_UI",
                bar: "NOTIFICATIONS_BAR",
                panelMin: "MINIMIZED_MAINUI",
                minimized: "NOTIFICATIONS_MINIMIZED",
                fakeShop: "SECURITY",
                phishingDomain: "SECURITY",
				deepIntegration: "DEEP_INTEGRATION"
            }
        }
    };

    AvastWRC.bal.registerModule(AvastWRC.NotificationsManager);
}).call(this, AvastWRC, _);

/*******************************************************************************
 *
 *  AvastWRC Close Tooltip Service
 *
 ********************************************************************************/
AvastWRC.CloseTooltip = {
    init: function(){
        AvastWRC.getStorage("CloseTooltip", function (data) {
            if(data){
                AvastWRC.CloseTooltip.config.storedValues.show = data.show;
            }else{
                AvastWRC.setStorage("CloseTooltip", AvastWRC.CloseTooltip.config.storedValues);
                AvastWRC.CloseTooltip.config.storedValues.show = true;
            }
            console.log("CloseTooltip -> " + JSON.stringify(AvastWRC.CloseTooltip.config.storedValues));
        });
    },
    getCloseTooltipInfo: function () {
        return AvastWRC.CloseTooltip.config.storedValues;
    },
    closeTooltipShown: function (data) {
        // TODO Generate Events
        AvastWRC.CloseTooltip.setBadgeAnimation(data);
    },
    closeTooltipClicked: function (data) {
        AvastWRC.CloseTooltip.config.storedValues.show = false;
        AvastWRC.setStorage("CloseTooltip", AvastWRC.CloseTooltip.config.storedValues);
        AvastWRC.CloseTooltip.disableCloseTooltipForAllTabs();
        AvastWRC.bal.sp.disableBadgeAnimation(data.tabId);
    },
    autoHideTooltip: function (data) {
        AvastWRC.bal.sp.disableBadgeAnimation(data.tabId);
    },
    disableCloseTooltipForAllTabs: function () {
        AvastWRC.bs.messageAllTabs({
            message: "closeTooltipShown",
            data: {},
        });
    },
    setBadgeAnimation: function (data) {
        AvastWRC.bal.sp.setBadge(data.tabId, AvastWRC.bal.sp.getCurrentBadge(data.tabId), true, null, AvastWRC.Shepherd.getIconBlinkingAnimationAfterCloseTooltip());
    },
    getTemplateData: function () {
        return {
            strings: AvastWRC.bal.utils.loadLocalizedStrings({}, this.config.template.strings),
            images: AvastWRC.bal.utils.getLocalImageURLs({}, this.config.template.images)
        };
    },
    feedback: function (data, tab) {
        let actions = {
            "SHOWN": AvastWRC.CloseTooltip.closeTooltipShown,
            "CLICKED_CTA": AvastWRC.CloseTooltip.closeTooltipClicked,
            "HIDE": AvastWRC.CloseTooltip.autoHideTooltip
        };

        if (actions[data.action]) actions[data.action](_.extend(data, {tabId: tab.id}));
    },
    config: {
        storedValues: {
            show: true
        },
        template: {
            strings: ["spAfterCloseTooltip", "spAfterCloseTooltipGotIt"],
            images: {
                closeTooltipImage: "close-tooltip-image.png",
            }
        }
    }
};

/*******************************************************************************
 *
 *  AvastWRC SettingsTooltip Service
 *
 ********************************************************************************/
AvastWRC.SettingsTooltip = {
    init: function(){
        AvastWRC.getStorage(AvastWRC.SettingsTooltip.config.key, function (data) {
            if(data){
                AvastWRC.SettingsTooltip.config.data = data;
            }else{
                AvastWRC.SettingsTooltip.saveData();
            }
            console.log("SettingsTooltip data -> " + JSON.stringify(AvastWRC.SettingsTooltip.config.data));
        });
    },
    saveData: function () {
        if(AvastWRC.SettingsTooltip.config.data === null){
            AvastWRC.SettingsTooltip.config.data = JSON.parse(JSON.stringify(AvastWRC.SettingsTooltip.config.defaultData));
        }

        AvastWRC.setStorage(AvastWRC.SettingsTooltip.config.key, AvastWRC.SettingsTooltip.config.data);

    },
    getNextTimeToShow : function(){
        var numberOfMonths = 3; //or whatever offset
        var CurrentDate = new Date();
       return CurrentDate.setMonth(CurrentDate.getMonth() + numberOfMonths);        
    },
    isTimeToShow : function(offersNumber){
        if(offersNumber === 0 || !AvastWRC.Shepherd.tooltips().settings)return false;

        var now = parseInt(new Date().getTime())/1000;
        if(AvastWRC.YesNo.powerUserData.interactions && AvastWRC.YesNo.powerUserData.interactions.length == 0 
            && ((AvastWRC.SettingsTooltip.config.data.showIn < now) 
                || (AvastWRC.SettingsTooltip.config.data.shown == false))){
            return true;
        }

        return false;
    },
    tooltipShown: function () {
        AvastWRC.SettingsTooltip.config.data.shown = true;
        AvastWRC.SettingsTooltip.config.data.showIn = AvastWRC.SettingsTooltip.getNextTimeToShow();
        AvastWRC.SettingsTooltip.saveData();
        AvastWRC.bs.messageAllTabs({
            message: "hideSettingsTooltip",
            data: {},
        });
    },
    config: {
        key: "SettingsTooltip",
        data: null,
        defaultData: {
            shown: false, // if it was shown
            showIn: 0 // when it should be show again
        }
    }
};
