(function(_, AvastWRC, PROTO) {

  if (typeof(AvastWRC)=="undefined") { AvastWRC = {};}

  var HTTP_SERVER  = "http://ui.ff.avast.com",
      HTTP_PORT    = "80",
      HTTPS_SERVER = "https://uib.ff.avast.com",
      HTTPS_PORT   = "443",
      USE_HTTPS    = true,
      countryIP    = null;

  if( AvastWRC && typeof AvastWRC.getWindowStorage === "function"){
    countryIP  = AvastWRC.getWindowStorage("countryIP") || "";
  }

  /*******************************************************************************
   *
   *  Query CONSTANTS
   *
   ******************************************************************************/
  AvastWRC.Query = {
    CONST : {
      HEADERS : {
        //"Accept": "binary",
        //dataType: 'binary',
        "Content-Type": "application/octet-stream",
        "x-forwarded-for": countryIP,
        //"Connection": "keep-alive" // refused in Chrome
      },
      //SERVER : "http://lon09.ff.avast.com",
      SERVER : USE_HTTPS ? HTTPS_SERVER : HTTP_SERVER,
      PORT   : USE_HTTPS ? HTTPS_PORT   : HTTP_PORT,
      HTTPS_SERVER: "https://uib.ff.avast.com:443",
      UPDATE_SERVER: "http://ui.ff.avast.com/v5/ruleUpdate",
      VOTE_SERVER: 'http://uiv.ff.avast.com/v3/urlVote',
      TA_SERVER: 'http://ta.ff.avast.com/F/', // 'http://ta.ff.avast.com/F/AAoH2YP6qRuPTnJl7LgVp8ur',
      URLINFO : "urlinfo",
      URLINFO_V4 : "v4/urlinfo",
      URLINFO_V5 : "v5/urlinfo",
      LOCAL_PORTS : [27275, 18821, 7754],
      LOCAL_PORT : null,
      LOCAL_TOKEN : null,
      GAMIFICATION_SERVER : "https://gamification.ff.avast.com:8743/receiver"
    }
  };

  /*******************************************************************************
   *
   *  Query Master Class
   *
   ******************************************************************************/
  AvastWRC.Query.__MASTER__ = {
    completed : false,
    /**
     * Initialize UrlInfo request.
     * @return {[type]} [description]
     */
    init : function(){
      this.headers = _.extend({}, AvastWRC.Query.CONST.HEADERS, this.headers);
      if(countryIP === null && AvastWRC && typeof AvastWRC.getWindowStorage === "function"){
        countryIP  = AvastWRC.getWindowStorage("countryIP");
      }
      this.headers["x-forwarded-for"] = countryIP;
      // Populate proto message
      this.message();
      // Send it to server
      if(this.options.go) this.post();
    },
    headers : {},
    /**
     * Set an option value
     * @param {String} option Property name
     * @param {}     value  Property value
     */
    set : function (option, value) {
      this.options[option] = value;
      return this;
    },
    /**
     * Get an option value
     * @param  {String} option Property name
     * @return {}           Property value
     */
    get : function (option) {
      return this.options[option];
    },
    /**
     * return json string of the message
     * @return {Object} Json representation of the GPB message
     */
    toJSON : function(){

      // return AvastWRC.Utils.gpbToJSON(this.response);
      var protoJSON = function (p) {
        var res = {};
        for(var prop in p.values_) {
          if(p.values_[prop].length) {
            // repeated message
            res[prop] = [];
            for(var i=0, j=p.values_[prop].length; i<j; i++) {
              res[prop].push(protoJSON(p.values_[prop][i]));
            }
          } else if(p.values_[prop].properties_){
            // composite message

              res[prop] = {};
            for(var krop in p.values_[prop].values_) {
              if(p.values_[prop].values_[krop] instanceof PROTO.I64) {
                // convert PROTO.I64 to number
                res[prop][krop] = p.values_[prop].values_[krop].toNumber();
              }else {
                res[prop][krop] = p.values_[prop].values_[krop];
              }
            }
          } else {
            // value :: deprecated - remove it
            res[prop] = p.values_[prop];
          }
        }
        return res;
      };
      return protoJSON(this.response);
    },
    /**
     * Send request to server
     * @return {Object} Self reference
     */
    post : function(){
      if (this.options.server.indexOf(":null") !== -1) {
          return this;
      }
      var buffer = this.getBuffer(this.request);
      console.log("Request:", this.request.message_type_, this.options.server, this.request.values_);

      var self = this;
      var xhr = new XMLHttpRequest();
      xhr.open(this.options.method.toUpperCase(), this.options.server, true);
      xhr.responseType = "arraybuffer";
      xhr.withCredentials = true;
      xhr.timeout = this.options.timeout || 0; // default to no timeout

      for(var prop in this.headers) {
        xhr.setRequestHeader(prop, this.headers[prop]);
      }

      xhr.onload = function(e) {    	  
        var status = 0;
        if(typeof e.srcElement !== "undefined"){
          status = e.srcElement.status;
        }
        else if(typeof e.target !== "undefined"){
          status = e.target.status;
        }
        
        var errorCodes = [400, 401, 403, 405, 406, 408, 413, 414, 500];

        if(errorCodes.indexOf(status) > -1){
          var bodyEncodedInString = String.fromCharCode.apply(String, new Uint8Array(xhr.response));
          console.log("Response Status: "+status  +" Error: "+ bodyEncodedInString);
          self.error(xhr);
        }

        self.callback(xhr.response);
      };
      xhr.onerror = function() {
        var bodyEncodedInString = String.fromCharCode.apply(String, new Uint8Array(xhr.response));
        console.log("Response Status: "+status  +" Error: "+ bodyEncodedInString);
        self.error(xhr);
      };
      xhr.ontimeout = function() {
        var bodyEncodedInString = String.fromCharCode.apply(String, new Uint8Array(xhr.response));
        console.log("Response Status: "+status  +" ontimeout: "+ bodyEncodedInString);
        self.error(xhr);
      };
      xhr.send(buffer);
        return this;
    },
    /**
     * Convert message to ArrayBuffer
     * @param  {Object} message Message instance
     * @return {Array}         Array Buffer
     */
    getBuffer : function(message){

      var stream = new PROTO.ByteArrayStream;
      message.SerializeToStream(stream);
      return this.baToab(stream.getArray());
    },
    /**
     * Handle server response
     * @param  {Array}   arrayBuffer Incoming message
     * @return {void}
     */
    callback : function (arrayBuffer) {
      var format = this.options.format;
      var res = null;
      if ('string' === format) {
        res = String.fromCharCode.apply(String, this.abToba(arrayBuffer));
      } else {
        this.parser(arrayBuffer);

        if(this.updateCache) { this.updateCache(); }

        if('json' === format) {
          res = this.toJSON();
        }
        else if('object' === format) {
          res = this.format();
        }
        else {
          res = this.response;
        }
      }
      
      console.log('Response:', this.response.message_type_, this.options.server, res);
      this.options.callback(res);
      this.completed = true;
    },
    /**
     * Handle error responses
     * @param  {Object} xhr xmlhttp request object
     * @return {void}
     */
    error : function(xhr){
      if(this.options.error) this.options.error(xhr);
    },
    /**
     * Placeholder - each Instance can override this to format the message
     * @return {[type]} [description]
     */

    format : function(){
      return { error : "This call has now formatting message.", message: this.response };
    },
    /**
     * parse arrayBuffer into a ProtoJS response
     * @param  {Array} arrayBuffer
     * @return {void}
     */
    parser : function (arrayBuffer){
      this.response.ParseFromStream(new PROTO.ByteArrayStream(this.abToba(arrayBuffer)));
    },
    /**
     * ByteArray to ArrayBuffer
     * @param  {Object} data [description]
     * @return {Array}
     */
    baToab: function(data){
      var buf = new ArrayBuffer(data.length);

      var bytes = new Uint8Array(buf);
      for(var i = 0; i < bytes.length; i++) {
        bytes[i] = data[i] % 256;
      }

      return AvastWRC.Utils.getBrowserInfo().isChrome() ? bytes : buf;
    },
    /**
     * ArrayBuffer to ByteArray
     * @param  {Array} arrayBuffer [description]
     * @return {Array}             [description]
     */
    abToba: function(arrayBuffer){
      if(arrayBuffer === null) return [];
      var bytes = new Uint8Array(arrayBuffer);
          var arr = [];
      for(var i = 0; i < bytes.length; i++) {
        arr[i] = bytes[i] % 256;
      }
          return arr;
    },
    setBaseIdentityIds : function(identity) {
      if (AvastWRC.CONFIG.GUID != null) {
        identity.guid = PROTO.encodeUTF8(AvastWRC.CONFIG.GUID);
      }     
      if (AvastWRC.CONFIG.AUID != null) {
        identity.auid = PROTO.encodeUTF8(AvastWRC.CONFIG.AUID);
      }
      if (AvastWRC.CONFIG.USERID != null) {
        identity.userid = PROTO.encodeUTF8(AvastWRC.CONFIG.USERID);
      }
      return identity;
    },
    setExtIdentityIds : function(identity) {
      if (AvastWRC.CONFIG.UUID != null) {
        identity.uuid = PROTO.encodeUTF8(AvastWRC.CONFIG.UUID);
      }
      if (AvastWRC.CONFIG.PLG_GUID != null) {
        identity.plugin_guid = PROTO.encodeUTF8(AvastWRC.CONFIG.PLG_GUID);
      }
      if (AvastWRC.CONFIG.HWID != null) {
        identity.hwid = PROTO.encodeUTF8(AvastWRC.CONFIG.HWID);
      }
      return identity;
    },
    /**
     * Format Identity message (base identity)
     * @param dnl - do not log = exclude user identification
     * @return {Object} GPB Identity message
     */
    identity : function(dnl) {
      var msg = new AvastWRC.gpb.All.Identity;
      var browserInfo = AvastWRC.Utils.getBrowserInfo();

      if (!dnl) {  msg = this.setBaseIdentityIds(msg); }

      msg.browserType = AvastWRC.gpb.All.BrowserType[browserInfo.getBrowser()];

      msg.browserVersion = browserInfo.getBrowserVersion();

      return msg;
    },
    /**
     * Generate extended identity (w/ hwid + uuid) when required
     * @param dnl - do not log = exclude user identification
     */
    extIdentity : function(dnl) {
      var msg = this.identity(dnl);
      return dnl ? msg : this.setExtIdentityIds(msg);
    },
    /**
     * Generate clientIdentity for new UrlInfo format.
     * @param dnl - do not log = exclude user identification
     */
    clientIdentity : function(dnl) {
      var avIdentity = new AvastWRC.gpb.All.AvastIdentity;
      var browserInfo = AvastWRC.Utils.getBrowserInfo();

      if (!dnl) {
        avIdentity = this.setBaseIdentityIds(avIdentity);
        avIdentity = this.setExtIdentityIds(avIdentity);
      }

      var extInfo = new AvastWRC.gpb.All.BrowserExtInfo;
      extInfo.extensionType = AvastWRC.CONFIG.EXT_TYPE;
      extInfo.extensionVersion = AvastWRC.CONFIG.EXT_VER;
      extInfo.dataVersion = AvastWRC.CONFIG.DATA_VER;
      extInfo.browserType = AvastWRC.gpb.All.BrowserType[browserInfo.getBrowser()];
      extInfo.browserVersion = browserInfo.getBrowserVersion();

      var client = new AvastWRC.gpb.All.Client;
      client.id = avIdentity;
      client.type = AvastWRC.gpb.All.Client.CType.BROWSER_EXT;
      client.browserExtInfo = extInfo;
      return client;
    }
  };

  /*******************************************************************************
   *
   *  avast! Program Communication
   *
   ******************************************************************************/

  AvastWRC.Query.Avast = function(options){

      if(!options.type) {
        return;
      }

      this.options = _.extend({
        url : null,
        type : "GET_PROPERTIES",
        property : "",
        value : "",
        server : "http://localhost:"+AvastWRC.Query.CONST.LOCAL_PORT+"/command",
        method : "post",
        callback : _.noop,
        //format : "json",      // return response in JSON
        timeout: 0,
        go : true        // true = trigger the request immediately

      },options);

      if (AvastWRC.Query.CONST.LOCAL_TOKEN) {
        this.headers = _.extend({ "X-AVAST-APP-ID": AvastWRC.Query.CONST.LOCAL_TOKEN }, this.headers);
      }
      
      if(AvastWRC.Utils.getBrowserInfo().isEdge()) {
    	  this.options.timeout = 1;
      }

      this.request = new AvastWRC.gpb.All.LocalServerRequest;
      this.response = new AvastWRC.gpb.All.LocalServerResponse;
      this.init();
  };

  AvastWRC.Query.Avast.prototype = _.extend({},AvastWRC.Query.__MASTER__,{
    message : function(type){
      var i,j;
      this.request.type = AvastWRC.gpb.All.LocalServerRequest.CommandType[this.options.type];
      this.request.browser = AvastWRC.gpb.All.BrowserType[AvastWRC.Utils.getBrowserInfo().getBrowser()]; // 3

      switch(this.options.type){
        case "ACKNOWLEDGEMENT":
          this.request.params.push(PROTO.encodeUTF8(AvastWRC.CONFIG.VERSION));
          break;
        case "GET_PROPERTY":
          this.request.params.push(PROTO.encodeUTF8("avastcfg://avast5/Common/"+this.options.property));
          break;
        case "SET_PROPERTY":
          this.request.params.push(PROTO.encodeUTF8("avastcfg://avast5/Common/"+this.options.property));
          this.request.params.push(PROTO.encodeUTF8(this.options.value));
          break;
        case "GET_PROPERTIES":
          for(i=0, j=this.options.params.length; i<j; i++){
            this.request.params.push(PROTO.encodeUTF8("avastcfg://avast5/Common/"+this.options.params[i]));
          }
          break;
        case "SET_PROPERTIES":
          for(i=0, j=this.options.params.length; i<j; i++){
            this.request.params.push(PROTO.encodeUTF8(
              "avastcfg://avast5/Common/" + this.options.params[i] + '=' + this.options.values[i]
            ));
          }
          break;
        case "IS_BANKING_SITE":
        case "IS_SAFEZONE_CUSTOM_SITE":
        case "SITECORRECT":
        case "SWITCH_TO_SAFEZONE":
          this.request.params.push(PROTO.encodeUTF8(this.options.value));
        break;
      }

      return this;
    }
  });

  /*******************************************************************************
   *
   *  UrlInfo
   *
   ******************************************************************************/
  AvastWRC.Query.CONST.URLINFO_SERVERS = {
    0: "https://uib.ff.avast.com:443/v5/urlinfo",
    1: "https://urlinfo-stage.ff.avast.com:443/v5/urlinfo",
    2: "https://urlinfo-test.ff.avast.com:443/v5/urlinfo"
  }

  AvastWRC.Query.UrlInfo = function(options) {
      // no url, just stop right here
      if(!options.url) return false;
      if(typeof options == "string") options = {url: options};

      this.options = _.extend({
        url : null,
        visited : true,
        server : AvastWRC.Query.CONST.URLINFO_SERVERS[AvastWRC.CONFIG.serverType],
        method : "post",
        webrep : true,
        phishing : true,
        blocker : false,
        typo : false,
        safeShop: 0,        // opt-in, not in cache by default
        callback : _.noop,
        format : "object",  // return response in JSON
        go : true           // true = trigger the request immediately
      },options);

      this.request = new AvastWRC.gpb.All.UrlInfoRequest.Request;
      this.response = new AvastWRC.gpb.All.UrlInfoRequest.Response;

      this.init();
  };

  AvastWRC.Query.UrlInfo.prototype = _.extend({},AvastWRC.Query.__MASTER__,{

    // build PROTO message
    message : function() {
      var dnl = (AvastWRC.CONFIG.COMMUNITY_IQ === false);
      
      if(typeof this.options.url == "string") {
        this.request.uri.push(PROTO.encodeUTF8(this.options.url));
      } else {
        this.request.uri = this.options.url;
      }

      this.request.callerid = PROTO.I64.fromNumber(this.getCallerid());
      this.request.locale = ABEK.locale.getBrowserLocale();
      this.request.client = this.clientIdentity(dnl);
      this.request.identity = this.extIdentity(dnl);

      if (this.request.uri.length > 1) {
          this.request.visited = false;
      }
      else this.request.visited = this.options.visited; // bool
      
      this.request.referer = this.options.referer;
      this.request.tabNum = this.options.tabNum;
      this.request.windowNum = this.options.windowNum;
      this.request.windowEvent = this.options.windowEvent;

      if (_.isArray(this.options.customKeyValue)) {
          for (var i in this.options.customKeyValue) {
              var keyValue = new AvastWRC.gpb.All.KeyValue;
              keyValue.key = this.options.customKeyValue[i].key;
              keyValue.value = this.options.customKeyValue[i].value;
              this.request.customKeyValue.push(keyValue);              
          }
          console.log("customKeyValue", this.options.customKeyValue);
      }

      if (typeof this.options.originHash !== "undefined") {
            this.request.originHash = this.options.originHash;
            //console.log("UrlInfo: originHash:" + this.options.originHash);
      }

      if (typeof this.options.origin === "object" && this.options.origin !== null) {
            this.request.lastOrigin = new AvastWRC.gpb.All.Origin;
            this.request.lastOrigin.hash = this.options.origin.hash;
            this.request.lastOrigin.origin = this.options.origin.origin;
            //console.log("UrlInfo: hash:" + this.options.origin.hash + " origin:" + this.options.origin.origin);
      }

      this.request.clientTimestamp = PROTO.I64.fromNumber((new Date).getTime());
        
        // this.request.fullUris = this.options.fullUrls;

      this.request.safeShop = PROTO.I64.fromNumber(this.options.safeShop);

      // Requested service bitmask  (webrep 1, phishing 2) - webrep always, phishing not in multiple requested
      //var requestedServices = new AvastWRC.Utils.BitWriter(0);
      //requestedServices.addBitmask(AvastWRC.DEFAULTS.URLINFO_MASK.webrep);
      //if(this.options.visited) requestedServices.addBitmask(AvastWRC.DEFAULTS.URLINFO_MASK.phishing);
      //this.request.requestedServices = requestedServices.getValue();
      //TODO - use settings here
      if( this.options.reqServices === null || this.options.reqServices === undefined )
      {
          this.request.requestedServices = 0x00BF;
      }
      else
      {
          this.request.requestedServices = this.options.reqServices;
      }
      // if(this.options.visited){
      //   requestedServices |= AvastWRC.DEFAULTS.URLINFO_MASK.siteCorrect;
      // }

      if ( dnl ) { this.request.dnl = true; }

      return this;
    },
    /**
     * Create an instance(s) of AvastWRC.UrlInfo object
     * @return {Object}
     */
    format : function(){
      var json = this.toJSON();
      var res = [];
      for(var i=0, j=json.urlInfo.length; i<j; i++) {
         res[i] = new AvastWRC.UrlInfo(this.options.url[i], json.urlInfo[i], !this.options.visited);
      }
      return res;
    },
    updateCache : function(){
      // TODO: update Cache >> currently handled elswhere - should be moved here.
    },
    updateRequest : function(){
      var msg = new AvastWRC.gpb.All.UrlInfoRequest.UpdateRequest;

      return msg;
    },
    /**
     * url info message type
     * @return {Strinng} call
     */
    getCallerid : function() {
      return AvastWRC.CONFIG.CALLERID;
    }
  });

/*******************************************************************************
   *
   *  UrlSSLInfo
   *
   ******************************************************************************/
  AvastWRC.Query.UrlSSLInfo = function(url, callback) {

    var bLang = ABEK.locale.getBrowserLang().toLowerCase();
    var SERVER = `http://webtuneup.avg.com/api/sitesafety?id=""&u=${url}&lang=${bLang}`;

    var xhr = new XMLHttpRequest();
    console.log("UrlSSLInfo-> Request: ", SERVER)
    xhr.open("GET", SERVER, true);
    xhr.onreadystatechange = function() {
        var status, data;
        if (xhr.readyState === 4) {
            status = xhr.status;
            if (status === 200) {
                data = JSON.parse(xhr.responseText);
                console.log("UrlSSLInfo-> Response: ", data)
                callback(data);
            } else {
              callback(undefined);
            }
        }
    };
    xhr.send();  
};
  /************************************************************************************************************ 
  *   Gamification Application Event 
  ************************************************************************************************************/
  AvastWRC.Query.ApplicationEvent = function(options) {
    var d = new Date();  
    // no url, just stop right here
    if((!AvastWRC.CONFIG.GUID && !AvastWRC.CONFIG.AUID) || !options.eventType) return false;
  
    this.options = _.extend({
      eventType : [0],
      eventTime : Math.floor(d.getTime()/1000),
      guid : AvastWRC.CONFIG.GUID,
      auid : AvastWRC.CONFIG.AUID,
      hwid : AvastWRC.CONFIG.HWID,
      uuid : AvastWRC.CONFIG.UUID,
      callerId : AvastWRC.CONFIG.CALLERID,
      source : AvastWRC.gpb.All.ApplicationEvent.Source.BROWSER_PLUGIN,
      server : AvastWRC.Query.CONST.GAMIFICATION_SERVER,
      method : "post",
      callback : _.noop,
      format : "object",  // return response in JSON
      go : true           // true = trigger the request immediately
    }, options);

    this.request = new AvastWRC.gpb.All.ApplicationEvent;
    this.response = new AvastWRC.gpb.All.GamificationResponse;

    this.init();
  };

  AvastWRC.Query.ApplicationEvent.prototype = _.extend({},AvastWRC.Query.__MASTER__,{

    // build PROTO message
    message : function() {

      this.request.identity = new AvastWRC.gpb.All.ApplicationIdentity;
      this.request.identity.type = AvastWRC.gpb.All.ApplicationIdentity.ApplicationIdentityType.HW_IDENTITY;
      this.request.identity.guid = this.options.guid;
      this.request.identity.auid = this.options.auid;
      this.request.identity.hwid = this.options.hwid;
      this.request.identity.uuid = this.options.uuid;
      
      this.request.event = new AvastWRC.gpb.All.GeneratedEvent;
      this.request.event.eventType = this.options.eventType;
      this.request.event.eventTime = PROTO.I64.fromNumber(this.options.eventTime);

      var browserPar = new AvastWRC.gpb.All.GeneratedEvent.GeneratedEventParam;
      browserPar.paramName = 'browserType';
      browserPar.value = (Math.floor(AvastWRC.CONFIG.CALLERID / 1000)).toString();
      this.request.event.params = [browserPar];

      this.request.source = this.options.source;

      this.request.productInformation = new AvastWRC.gpb.All.ProductInformation;
      this.request.productInformation.code = 'AV_AOS';
      this.request.productInformation.version = PROTO.encodeUTF8(this.options.callerId.toString());  

      return this;
    },
    /**
     * Create an instance(s) of AvastWRC.UrlInfo object
     * @return {Object}
     */
    format : function(){
      var json = this.toJSON();
      return json;
    }
  });

/*******************************************************************************
 *
 *  Query Shepherd
 *
 ********************************************************************************/
AvastWRC.Query.Shepherd = function (onSuccess, onError) {
    let SHEPHERD_BASE_URL = {
        0: "https://shepherd.ff.avast.com/", 
        1: "https://shepherd-test-mobile.ff.avast.com/",
        2: "https://shepherd-test-mobile.ff.avast.com/"};
        manifestSplitVersion = AvastWRC.bs.getVersion().split("."),
        parameters = {
            p_pro: AvastWRC.bal.brandingType === AvastWRC.BRANDING_TYPE_AVAST ? 43 : 72, //43 Avast SafePrice, 72 AVG SafePrice.
            p_hid: AvastWRC.CONFIG.GUID ? AvastWRC.CONFIG.GUID : AvastWRC.CONFIG.PLG_GUID || "",
            p_vep: manifestSplitVersion[0],
            p_ves: manifestSplitVersion[1],
            p_vbd: manifestSplitVersion[2],
            p_bwe: AvastWRC.gpb.All.SafeShopOffer.ClientInfo.Browser.BrowserType[AvastWRC.Utils.getBrowserInfo().getBrowser()]
        },
        SHEPHERD_CONFIGS = `${SHEPHERD_BASE_URL[AvastWRC.CONFIG.serverType]}${AvastWRC.Utils.buildQueryString(parameters)}`;

    if (AvastWRC.Shepherd.browserCampaign) SHEPHERD_CONFIGS += `&p_sbcid=${AvastWRC.Shepherd.browserCampaign}`; // Extra parameter for ASB

    let xhr = new XMLHttpRequest();
    console.log("Shepherd-> Request: " + JSON.stringify(SHEPHERD_CONFIGS));
    xhr.open("GET", SHEPHERD_CONFIGS, true);

    xhr.onreadystatechange = function () {
        let status, data, ttl;

        if (xhr.readyState === 4) {
            status = xhr.status;
            if (status === 200) {
                ttl = xhr.getResponseHeader("ttl");
                data = JSON.parse(xhr.responseText);
                console.log("Shepherd-> Response: " + JSON.stringify(data) + "ttl: " + ttl);
                onSuccess(data, ttl);
            } else {
                onError(status);
            }
        }
    };

    xhr.send();
};

/*******************************************************************************
 *
 *  ende Query Shepherd
 *
 ********************************************************************************/
var USERID_UPDATE = "http://ui.ff.avast.com/v3/userid/";
AvastWRC.Query.CONST.SAFESHOP_FEEDBACK_SERVER = {
    AVAST: "https://www.avast.com/survey-qualtrics?qp_sid=SV_bgeuolgWSBHEQPH",
    AVG: "http://www.avg.com/campaign-landing-pages/survey-qualtrics?qp_sid=SV_5iF6p3DJT4tP8PP"
};

AvastWRC.Query.CONST.SAFESHOP_SERVERS = {
    0: "https://safeprice.ff.avast.com:443",
    1: "https://safeprice-stage.ff.avast.com:443",
    2: "http://safeprice-test.ff.int.avast.com:8080"
}
AvastWRC.Query.CONST.SAFESHOP_ENDPOINTS = {
    0: "/v2/domainInfo",
    1: "/v2/offers",    
    2: "/v3/search/offers",
    3: "/v3/search/coupons",
    4: "/v2/redirectOffers?p1="
}

/*******************************************************************************
 *
 *  SafeShopCommon
 *
 ******************************************************************************/
AvastWRC.Query.SafeShopCommon = {
    formatCoupons: function (resp, res, isSearch = 0) {
        var openShopString = AvastWRC.bs.getLocalizedString("spCouponApplied") + `<span class="asp-shopname-span">`+ AvastWRC.bs.getLocalizedString("sasOpenShop") + `</span>` 
        if(resp && resp.voucher && resp.voucher.length > 0){
            var ribbonFound = false;                                         
            var vouDetails = {};
            var affiliateName = "";
            for (var m = 0, n = resp.voucher.length; m < n; m++) {
                var voucher = resp.voucher[m].values_;
                if (voucher != undefined) {
                    affiliateName = voucher.affiliate;
                    vouDetails = {
                        label: voucher.title || "",
                        category: voucher.category || "",
                        url: voucher.url || "",
                        affiliate: voucher.affiliate || "",
                        showAffiliateTitle: (voucher.affiliate && voucher.affiliate.length > 17) || false,
                        value: voucher.value || "",
                        expire_date: voucher.expire_date || "",
                        expire_date_to_show: "",
                        coupon_code: (voucher.code) ? !(voucher.code.match(/No code required/gi)) ? voucher.code : "" : "",
                        coupon_text: voucher.text || "",
                        coupon_text_is_long: (voucher.value && voucher.text && voucher.text.length >= 31) ? voucher.text.slice(0,31) + "..." : (!voucher.value && voucher.text && voucher.text.length >= 45) ? voucher.text.slice(0,45) + "..."  : "",
                        free_shipping: voucher.free_shipping || 0,
                        type: voucher.type || 0,
                        selected: AvastWRC.UtilsCache.get("active_coupons", voucher.url) ? true : false,
                        rated: AvastWRC.UtilsCache.get("rated_coupons", voucher.url) ? true : false,
                        provider_id: voucher.provider_id,
                        isSearch: isSearch,
                        spClickThenPaste: affiliateName ? AvastWRC.bs.getLocalizedString("spClickThenPasteSearchResult", [affiliateName]) : AvastWRC.bs.getLocalizedString("spClickThenPaste"),
                        spSearchCouponAppliedOnPage: affiliateName ? AvastWRC.bs.getLocalizedString("spSearchCouponAppliedOnPage", [affiliateName]) : openShopString,
                        spCouponWorksIsLong: AvastWRC.bal.sp.panelData.strings.spCouponWorks.length > 34 || false,
                        spCouponCodeWorksIsLong: AvastWRC.bal.sp.panelData.strings.spCouponCodeWorks.length > 34 || false
                    };
                    affiliateName = "";
                    if(vouDetails.selected) {
                        res.vouchersSelectedCounter++;                                      
                    }
                    else if(!res.firstCouponNotApplied){
                        res.firstCouponNotApplied = vouDetails;
                    }  

                    if(vouDetails.type == 3){
                        res.similarvouchers.push(vouDetails);
                    } 
                    else{
                        res.coupons.push(vouDetails);
                    }
                    if(!ribbonFound){
                        res.couponRibbonText = vouDetails.value;
                        ribbonFound = true;
                    }
                    vouDetails = {};
                }
            }

            if(!res.firstCouponNotApplied) {
                res.firstCouponNotApplied = res.coupons[0];
            }
            res.couponsLength = res.coupons.length;
            res.vouchersSelected = (res.vouchersSelectedCounter > 0) ? true : false;
            res.vouchersAvailable = (res.coupons.length - res.vouchersSelectedCounter > 0) ? true : false;
            res.vouchersCounterBig = (res.vouchersSelectedCounter >= 10) ? true : false;
        }
    },

    formatRedirect: function (resp, res) {
        if(resp && resp.redirect && resp.redirect.redirect.length > 0){
            var redirectResponse = resp.redirect;
            if(redirectResponse != undefined && typeof redirectResponse === "object" && redirectResponse != null){
                var redirects = redirectResponse.redirect;
                if (redirects && redirects.length > 0) {
                    res.redirectProviderId = redirectResponse.provider_id;
                    for (var m = 0, n = redirects.length; m < n; m++) {
                        var redirect = redirects[m].values_;
                        if (redirect != undefined) {
                            var redirectImages = AvastWRC.Utils.resolveImageUrl(redirect.primary_image || "", redirect.secondary_image || "", redirect.sub_category);
                            var redDetails = {
                                label: redirect.title || "",
                                url: redirect.url || "",
                                image: redirect.image || AvastWRC.bs.getLocalImageURL("general.png"),
                                fprice: redirect.formatted_price || "",
                                saving: redirect.saving || "",
                                availability: redirect.availability || "",
                                buttonText: redirect.button_text || "",
                                infoText: redirect.info_text || "",
                                primaryImage: redirectImages.primaryImage || "",
                                secondaryImage: redirectImages.secondaryImage || "",
                                barImage: redirectImages.barImage || "",
                                imageTimeout: parseInt(redirect.image_timeout) || 2240,
                                category: redirect.category || 0,
                                subCategory: redirect.sub_category || 0,
                                providerId: redirect.provider_id || 0,
                                provider_redirect_id: redirect.provider_redirect_id || "",
                                rated: AvastWRC.UtilsCache.get("rated_redirect",  redirect.url) ? true : false,
                            };
                            res.redirects.push(redDetails);
                        }
                    }
                    res.redirectLength = res.redirects.length;
                }
            }
        }
    },

    hasPrice: function(price){
        return !price.match(/^0.?0*$/)
    },

    isLongPrice: function(price){
        return price && price.length > 10;
    },

    formatProducts: function (resp, res, isSearch = 0) {
        var ribbonFound = false;
        if (resp && resp.product && resp.product.length > 0) {
            for (var m = 0, n = resp.product.length; m < n; m++) {
                var product = resp.product[m].values_;
                if (product != undefined) {
                    var prodDetails = {
                        label: product.offer.values_.title || "",
                        price: product.offer.values_.price || 0,
                        fprice: product.offer.values_.formatted_price || "",
                        url: product.offer.values_.url || "",
                        affiliate: product.offer.values_.affiliate || "",
                        recommended: product.offer.values_.recommended || 0,
                        affiliate_image: product.offer.values_.image || AvastWRC.bs.getLocalImageURL("default-offers.png"),
                        availability: product.availability || "",
                        availability_code: product.availability_code || "",
                        saving: product.saving || "",
                        shipping: product.shipping || "",
                        show_price: this.hasPrice(product.offer.values_.formatted_price),
                        is_long_price: this.isLongPrice(product.offer.values_.formatted_price) && product.saving,
                        provider_id: product.offer.values_.provider_id,
                        isSearch: isSearch,
                        rated: AvastWRC.UtilsCache.get("rated_product", product.offer.values_.url) ? true : false,
                        product_image: product.product_image || ""
                    };

                    prodDetails.show_top_stroke_price = prodDetails.is_long_price && prodDetails.saving && res.query.formatted_price.length > 0;

                    res.products.push(prodDetails);
                    if(!ribbonFound && this.hasPrice(prodDetails.fprice)){
                        res.offersRibbonText = prodDetails.fprice;
                        ribbonFound = true;
                    }
                }

            }
            res.producstLength = res.products.length;
        }
    },

    formatAccommodations: function (resp, res, isSearch = 0) {
        var ribbonFound = false, ribbonStarsFound = false;
        if (resp && resp.accommodation && resp.accommodation.length > 0) {
            var fullStarImg =  AvastWRC.bs.getLocalImageURL("sp-rating-star.png");
            var halfStarImg = AvastWRC.bs.getLocalImageURL("sp-rating-half-star.png");
            var fullStarRibbonImg =  AvastWRC.bs.getLocalImageURL("star.png");
            var halfStarRibbonImg = AvastWRC.bs.getLocalImageURL("half-star.png");
            var fullStarDarkRibbonImg = AvastWRC.bs.getLocalImageURL("dark-star.png");
            for (var m = 0, n = resp.accommodation.length; m < n; m++) {
                var accommodation = resp.accommodation[m].values_;
                if (accommodation != undefined) {
                    var halfStar = ((accommodation.stars_precise % 1).toFixed(4) > 0) ? true : false;
                    var stars = parseInt(accommodation.stars_precise);
                    var stars_to_show = (stars < 5 && halfStar) ? stars + 1 : stars;
                    var urlStars = "", urlStarsHover = "";
                    var starsArr =  _.range(stars).map(function() { return fullStarImg });
                    var starsArrForRibbon =  _.range(stars).map(function() { return fullStarRibbonImg });
                    if (halfStar){
                        starsArr.push(halfStarImg);
                        starsArrForRibbon.push(halfStarRibbonImg);
                    }
                    var accomDetails = {
                        label: accommodation.offer.values_.title || "",
                        price: accommodation.offer.values_.price || 0,
                        fprice: accommodation.offer.values_.formatted_price || "",
                        url: accommodation.offer.values_.url || "",
                        affiliate: accommodation.offer.values_.affiliate || "",
                        recommended: accommodation.offer.values_.recommended || 0,
                        affiliate_image: accommodation.offer.values_.image || AvastWRC.bs.getLocalImageURL("sp-offer-image-placeholder.png"),
                        priority: accommodation.priority || 0,
                        address: accommodation.address || "",
                        stars: starsArr || [],
                        stars_to_show: stars_to_show || 0,
                        stars_precise: accommodation.stars_precise || 0,
                        additional_fees: accommodation.additional_fees || 0,
                        price_netto: accommodation.price_netto || 0,
                        hotel: true,
                        saving: accommodation.saving || "",
                        type: accommodation.type || 0,
                        show_price: this.hasPrice(accommodation.offer.values_.formatted_price),
                        is_long_price: this.isLongPrice(accommodation.offer.values_.formatted_price) && accommodation.saving,
                        city: accommodation.city || "",
                        provider_id: accommodation.offer.values_.provider_id,
                        isSearch: isSearch,
                        rated: AvastWRC.UtilsCache.get("rated_accommodation", accommodation.offer.values_.url) ? true : false,
                    };

                    accomDetails.show_top_stroke_price = accomDetails.is_long_price && accomDetails.saving && res.query.formatted_price.length > 0;

                    if (res.cityName === ""){
                        res.cityName = accomDetails.city
                    }
                    if(accomDetails.type == 0 || accomDetails.type == 1){
                        res.hotelsPriceComp.push(accomDetails);
                    }
                    else if(accomDetails.type == 2){
                        res.hotelsCity.push(accomDetails);
                    }
                    else if(accomDetails.type == 3){
                        res.hotelsSimilar.push(accomDetails);
                    }
                    res.accommodations.push(accomDetails);

                    if(!ribbonFound && this.hasPrice(accomDetails.fprice)){
                        res.offersRibbonText = accomDetails.fprice;
                        ribbonFound = true;
                    }
                    
                    if(!ribbonStarsFound && starsArrForRibbon.length > 0){                        
                        while(starsArrForRibbon.length < 5){
                            starsArrForRibbon.push(fullStarDarkRibbonImg);
                        }

                        res.accommodationsRibbonStars = starsArrForRibbon;
                        ribbonStarsFound = true;
                    }
                }
            }
            res.accommodationsLength = res.accommodations.length;
            res.priceComparisonLength = res.hotelsPriceComp.length;
            res.cityHotelLength = res.hotelsCity.length;
            res.similarHoteLength = res.hotelsSimilar.length;
        }        
    }
    
};
/*******************************************************************************
 *
 *  SafeShopDomainInfo
 *
 ******************************************************************************/
AvastWRC.Query.SafeShopDomainInfo = function (options) {
    if (!options.url) return false; // no page data

    this.options = _.extend({
        server: AvastWRC.Query.CONST.SAFESHOP_SERVERS[AvastWRC.CONFIG.serverType] + AvastWRC.Query.CONST.SAFESHOP_ENDPOINTS[0],
        method: "post",
        timeout: 10000, // 10s
        client_info: {},
        url: null,
        callback: _.noop,
        format: "object", // return response in JSON
        go: true, // true = trigger the request immediately
    }, options);

    this.request = new AvastWRC.gpb.All.SafeShopOffer.DomainInfoRequest;
    this.response = new AvastWRC.gpb.All.SafeShopOffer.DomainInfoResponse;

    this.init();
};

AvastWRC.Query.SafeShopDomainInfo.prototype = _.extend({}, AvastWRC.Query.__MASTER__, {
    /**
     * build PROTO message
     */
    message: function () {
        //-- TODO - will be served by proxy server
        this.request.client_info = AvastWRC.Utils.getClientInfo(this.options.campaignId);
        this.request.client_info.referer = this.options.referrer;
        this.request.client_info.transaction_id = this.options.transactionId;
        this.request.url = this.options.url;
        this.request.is_affiliate = this.options.urlData.is_affiliate || false;
        return this;
    },

    /**
     * Create an instance(s) of AvastWRC.SafeShopDomainInfo object
     * @return {Object}
     */
    format: function () {
        var resp = this.response.values_;
        //console.log("response from Backend not parsed: ", JSON.stringify(resp));

        var res = {
            providerId: "",
            selector: "",
            ui_adaption_rule: "",
            onlyFirstRequest: false, //only coupons and/or redirect but not offers
            category: [],
            country: "",
            coupons: [],
            voucherProviderId: "",
            vouchersSelected: false,
            vouchersAvailable: false,
            vouchersSelectedCounter: 0,
            vouchersCounterBig: false,
            redirects: [],
            redirectProviderId: "",
            similarvouchers: [],
            firstRequestTotalLength: 0,
            couponsLength: 0,
            redirectLength: 0,
            couponRibbonText: null,
            firstCouponNotApplied: null,
			couponsDIRulesLength: 0,
            couponsDiRules: [],
            suppress_x_timeout: false
        };
        if (resp != undefined && typeof resp === "object" && resp != null) {
            res.suppress_x_timeout = resp.suppress_x_timeout || false;
            var provSpecRes = resp.provider_specific_result;
            if (provSpecRes != undefined && typeof provSpecRes === "object" && provSpecRes != null) {
                res.providerId = provSpecRes.provider_id;
                res.selector = provSpecRes.scraper_script;
                if (provSpecRes.category && provSpecRes.category.length > 0) {
                    var category;
                    for (var m = 0, n = provSpecRes.category.length; m < n; m++) {
                        category = provSpecRes.category[m];
                        res.category.push(category);
                    }
                    if(category.length == 1 && category[0] === "COUPON"){
                        console.log("onlyFirstRequest -> only one category COUPON");
                        res.onlyFirstRequest = true;
                    }
                }
            }
            else{
                console.log("onlyFirstRequest -> no provSpecRes");
                res.onlyFirstRequest = true;
            }
            var adaptionRule = resp.ui_adaption_rule;
            if (adaptionRule && adaptionRule.length > 0) {
                var rule;
                for (var m = 0, n = adaptionRule.length; m < n; m++) {
                    rule = adaptionRule[m];
                    res.ui_adaption_rule.push(rule);
                }
            }
            res.country = resp.country || "";

            if(resp && resp.voucher){
                res.voucherProviderId = resp.voucher.provider_id;
                AvastWRC.Query.SafeShopCommon.formatCoupons(resp.voucher, res);
            }
            
            AvastWRC.Query.SafeShopCommon.formatRedirect(resp, res);

            var couponsDIRules = resp.coupon_deep_integration;
            if (couponsDIRules != undefined && typeof couponsDIRules === "object" && couponsDIRules != null) {
                if(couponsDIRules.length > 0){
                    for (var m = 0, n = couponsDIRules.length; m < n; m++) {
                        var diRule = couponsDIRules[m].values_;
                        if (diRule != undefined) {                           
                            var ruleDetails = {
                                id: diRule.id,
                                search: [],
                                matchesRequires: diRule.matches_requires,
                                injectAt: diRule.inject_at,
                                injectMethod: diRule.inject_method,
                                template: diRule.template,
                                clickAction: diRule.click_action,
                                hoverAction: diRule.hover_action                                
                            };
                            for (var i = 0, j = diRule.search.length; i < j; i++) {
                                ruleDetails.search.push(diRule.search[i]);
                            }
                            res.couponsDiRules.push(ruleDetails);
                        }
                    }
                    res.couponsDIRulesLength = res.couponsDiRules.length;
                }
            }

            res.firstRequestTotalLength = res.couponsLength + res.redirectLength;
        }
        else {
            res.onlyFirstRequest = true;
        }
        return res;
    }
});

/*******************************************************************************
 *
 *  SafeShopOffer
 *
 ******************************************************************************/

AvastWRC.Query.SafeShopOffer = function (options) {
    if (!options.url && !options.query) return false; // no page data

    this.options = _.extend({
        server: AvastWRC.Query.CONST.SAFESHOP_SERVERS[AvastWRC.CONFIG.serverType] + AvastWRC.Query.CONST.SAFESHOP_ENDPOINTS[1],
        method: "post",
        timeout: 10000, // 10s
        url: null,
        query: null,
        client_info: {},
        provider_id: null,
        category: [],
        state: null,
        explicit_request: null,
        callback: _.noop,
        format: "object", // return response in JSON
        go: true, // true = trigger the request immediately
    }, options);

    this.request = new AvastWRC.gpb.All.SafeShopOffer.OfferRequest;
    this.response = new AvastWRC.gpb.All.SafeShopOffer.OfferResponse;

    this.init();
};

AvastWRC.Query.SafeShopOffer.prototype = _.extend({}, AvastWRC.Query.__MASTER__, {
    /**
     * build PROTO message
     */
    message: function () {
        //-- TODO - will be served by proxy server
        this.request.url = this.options.url;
        this.request.query = JSON.stringify(this.options.query);
        this.request.client_info = AvastWRC.Utils.getClientInfo(this.options.campaignId);
        this.request.client_info.referer = this.options.referrer;
        this.request.client_info.transaction_id = this.options.transactionId;
        this.request.provider_id = this.options.providerId;
        this.request.category = this.options.category;
        this.request.state = this.options.state;
        this.request.explicit_request = this.options.explicit_request;
        return this;
    },

    /**
     * Create an instance(s) of AvastWRC.SafeShopOffer object
     * @return {Object}
     */
    format: function () {
        var resp = this.response.values_;
        //console.log("response from Backend not parsed: ", JSON.stringify(resp));
        var res = {
            products: [],
            accommodations: [],
            hotelsPriceComp: [],
            hotelsCity: [],
            hotelsSimilar: [],
            query: {},
            showPriceComparisonNotification: (resp.available_price_comparison != undefined) ? resp.available_price_comparison : true,
            cityName: "",
            offersRequestTotalLength: 0,
            producstLength: 0,
            accommodationsLength: 0,
            priceComparisonLength: 0,
            cityHotelLength: 0,
            similarHoteLength: 0,
            offersRibbonText: null,
            accommodationsRibbonStars: null,
            offersDIRulesLength: 0,
            offersDiRules: []
        };

        if (resp.query && resp.query.values_) {
            res.query.price = resp.query.values_.price || 0;
            res.query.formatted_price = resp.query.values_.formatted_price || "";
        }

        AvastWRC.Query.SafeShopCommon.formatProducts(resp, res);

        AvastWRC.Query.SafeShopCommon.formatAccommodations(resp, res);
        
        res.offersRequestTotalLength = res.producstLength + res.accommodationsLength;
                
        var offersDIRules = resp.offer_deep_integration;
        if (offersDIRules != undefined && typeof offersDIRules === "object" && offersDIRules != null) {
            if(offersDIRules.length > 0){
                for (var m = 0, n = offersDIRules.length; m < n; m++) {
                    var diRule = offersDIRules[m].values_;
                    if (diRule != undefined) {                           
                        var ruleDetails = {
                            id: diRule.id,
                            matchesRequires: diRule.matches_requires,
                            injectAt: diRule.inject_at,
                            injectMethod: diRule.inject_method,
                            template: diRule.template,
                            clickAction: diRule.click_action,
                            hoverAction: diRule.hover_action,
                            leaveAction: diRule.leave_action,
                            callbackAction: diRule.callback_action,
                            search: []
                        };
                        for (var i = 0, j = diRule.search.length; i < j; i++) {
                            ruleDetails.search.push(diRule.search[i]);
                        }
                        res.offersDiRules.push(ruleDetails);
                    }
                }
                res.offersDIRulesLength = res.offersDiRules.length;
            }
        }

        // Hide offers for test users
        if (AvastWRC.Shepherd.getCampaing().showABTest && AvastWRC.Shepherd.getCampaing().campaignId.indexOf("AvastABT992") != -1) {
            res.products = [];
            console.log("Removed offers because of abtest: " + JSON.stringify(res));
        }

        return res;
    },

    /**
     * url info message type
     * @return {Strinng} call
     */
    getCallerid: function () {
        return AvastWRC.CONFIG.CALLERID;
    },
});

AvastWRC.Query.getServerUserId = function (onSuccess, onError) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", USERID_UPDATE, true);
    xhr.onreadystatechange = function () {
        var status, data;
        if (xhr.readyState === 4) {
            status = xhr.status;
            if (status === 200) {
                data = JSON.parse(xhr.responseText);
                onSuccess && onSuccess(data["userid"]);
            } else {
                onError && onError(status);
            }
        }
    };
    xhr.send();
};

 /*******************************************************************************
 *
 *  SearchOffers
 *
 ******************************************************************************/

AvastWRC.Query.SearchOffers = function (options) {
    if (!options.url && !options.query) return false; // no page data

    this.options = _.extend({
        server: AvastWRC.Query.CONST.SAFESHOP_SERVERS[AvastWRC.CONFIG.serverType] + AvastWRC.Query.CONST.SAFESHOP_ENDPOINTS[2],
        method: "post",
        timeout: 10000, // 10s
        url: null,
        query: null,
        client_info: {},
        provider_id: null,
        category: [],
        state: null,
        explicit_request: null,
        callback: _.noop,
        format: "object", // return response in JSON
        go: true, // true = trigger the request immediately
    }, options);

    this.request = new AvastWRC.gpb.All.SafeShopOffer.SearchOfferRequest;
    this.response = new AvastWRC.gpb.All.SafeShopOffer.SearchOfferResponse;

    this.init();
};

AvastWRC.Query.SearchOffers.prototype = _.extend({}, AvastWRC.Query.__MASTER__, {
    /**
     * build PROTO message
     */
    message: function () {
        //-- TODO - will be served by proxy server
        this.request.url = this.options.url;
        this.request.query = this.options.query;
        if(this.options.provider_id &&  this.options.provider_id !== ""){
            this.request.provider_id.push(this.options.provider_id);
        }            
        this.request.client_info = AvastWRC.Utils.getClientInfo(this.options.campaignId);
        this.request.client_info.referer = this.options.referrer;
        this.request.client_info.transaction_id = this.options.transactionId;
        return this;
    },

    /**
     * Create an instance(s) of AvastWRC.SafeShopOffer object
     * @return {Object}
     */
    format: function () {
        var resp = this.response.values_;
        //console.log("response from Backend not parsed: ", JSON.stringify(resp));
        var res = {
            products: [],
            accommodations: [],
            hotelsPriceComp: [],
            hotelsCity: [],
            hotelsSimilar: [],            
            cityName: "",
            offersRequestTotalLength: 0,
            producstLength: 0,
            accommodationsLength: 0,
            priceComparisonLength: 0,
            cityHotelLength: 0,
            similarHoteLength: 0,
            offersRibbonText: null,
            accommodationsRibbonStars: null,
            isOffersSearch: true,            
            couponsTabHaveSearch: this.options.couponsTabHaveSearch || false,
            offersTabHaveSearch: this.options.offersTabHaveSearch || true,
            providerId: ""
        };

        AvastWRC.Query.SafeShopCommon.formatProducts(resp, res, 1/*is search*/);

        AvastWRC.Query.SafeShopCommon.formatAccommodations(resp, res, 1/*is search*/);
        
        if(res.producstLength > 0){
            res.providerId = res.products[0].provider_id || "";
        }
        else if(res.accommodationsLength > 0){
            res.providerId = res.accommodations[0].provider_id || "";
        }
        res.offersRequestTotalLength = res.producstLength + res.accommodationsLength;

        return res;
    },
});

/*******************************************************************************
 *
 *  SearchCoupons
 *
 ******************************************************************************/
AvastWRC.Query.SearchCoupons = function (options) {
    if (!options.url && !options.query) return false; // no page data

    this.options = _.extend({
        server: AvastWRC.Query.CONST.SAFESHOP_SERVERS[AvastWRC.CONFIG.serverType] + AvastWRC.Query.CONST.SAFESHOP_ENDPOINTS[3],
        method: "post",
        timeout: 10000, // 10s
        url: null,
        query: null,
        client_info: {},
        provider_id: null,
        category: [],
        state: null,
        explicit_request: null,
        callback: _.noop,
        format: "object", // return response in JSON
        go: true, // true = trigger the request immediately
    }, options);

    this.request = new AvastWRC.gpb.All.SafeShopOffer.SearchCouponRequest;
    this.response = new AvastWRC.gpb.All.SafeShopOffer.SearchCouponResponse;

    this.init();
};

AvastWRC.Query.SearchCoupons.prototype = _.extend({}, AvastWRC.Query.__MASTER__, {
    /**
     * build PROTO message
     */
    message: function () {
        //-- TODO - will be served by proxy server
        this.request.url = this.options.url;
        this.request.query = this.options.query;
        if(this.options.provider_id &&  this.options.provider_id !== ""){
            this.request.provider_id.push(this.options.provider_id);
        }
        this.request.client_info = AvastWRC.Utils.getClientInfo(this.options.campaignId);
        this.request.client_info.referer = this.options.referrer;
        this.request.client_info.transaction_id = this.options.transactionId;
        return this;
    },

    /**
     * Create an instance(s) of AvastWRC.SafeShopDomainInfo object
     * @return {Object}
     */
    format: function () {
        var resp = this.response.values_;
        //console.log("response from Backend not parsed: ", JSON.stringify(resp));

        var res = {
            coupons: [],
            vouchersSelected: false,
            vouchersAvailable: false,
            vouchersSelectedCounter: 0,
            vouchersCounterBig: false,
            couponsLength: 0,
            firstCouponNotApplied: null,
            isCouponsSearch: true,
            couponsTabHaveSearch: this.options.couponsTabHaveSearch || true,
            offersTabHaveSearch: this.options.offersTabHaveSearch || false,
            providerId: ""
        };

        AvastWRC.Query.SafeShopCommon.formatCoupons(resp, res, 1/*is search*/);   

        if(res.couponsLength >0){
            res.providerId = res.coupons[0].provider_id || "";
        }
        return res;
    }
});
}).call(this, _, AvastWRC, AvastWRC.PROTO);