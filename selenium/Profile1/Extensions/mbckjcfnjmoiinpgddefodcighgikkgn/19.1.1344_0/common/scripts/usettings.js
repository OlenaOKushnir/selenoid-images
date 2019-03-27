/*******************************************************************************
 *
 *  avast! Safeprice
 *  (c) 2013 Avast Corp.
 *
 *  User settings functions to be used on the poppup and settings page
 *
 ******************************************************************************/

(function ($) {

	if (typeof AvastWRC == 'undefined') { AvastWRC = {}; }
	/**
	 * attaches all the DOM event handlers
	 * @return {void}
	 */
	AvastWRC.USettings = AvastWRC.USettings || {

		originalSettings: null,

		bind: function (data, tab) {
			AvastWRC.USettings.originalSettings = JSON.parse(JSON.stringify(data.poppupSettings));
			AvastWRC.USettings.data = data;
			AvastWRC.USettings.tab = tab || {};

			AvastWRC.USettings.bindTitleEvents();			

			$("#asp-popup-settings-close").click(function (e) {
				AvastWRC.USettings.ResetSettings(e, AvastWRC.USettings.data);
			});

			$("#asp-popup-settings-cancel").click(function (e) {
				AvastWRC.USettings.ResetSettings(e, AvastWRC.USettings.data);
			});

			$("#sp-menu-notifications").click(function (e) {
				AvastWRC.USettings.SelectMenu(e, AvastWRC.USettings.data);
			});
			$("#sp-menu-help").click(function (e) {
				AvastWRC.USettings.SelectMenu(e, AvastWRC.USettings.data);
			});
			$("#sp-menu-customList").click(function (e) {
				AvastWRC.USettings.SelectMenu(e, AvastWRC.USettings.data);
			});


			$("#offersShowAll").click(function (e) {
				AvastWRC.USettings.SelectOfferOptions(e, AvastWRC.USettings.data);
			});
			$("#offersShowBetter").click(function (e) {
				AvastWRC.USettings.SelectOfferOptions(e, AvastWRC.USettings.data);
			});
			$("#offersHide").click(function (e) {
				AvastWRC.USettings.SelectOfferOptions(e, AvastWRC.USettings.data);
			});

			$("#accommodationsShowBetter").click(function (e) {
				AvastWRC.USettings.SelectAccommodationsOptions(e, AvastWRC.USettings.data);
			});
			$("#accommodationsShowSimilar").click(function (e) {
				AvastWRC.USettings.SelectAccommodationsOptions(e, AvastWRC.USettings.data);
			});
			$("#accommodationsShowPopular").click(function (e) {
				AvastWRC.USettings.SelectAccommodationsOptions(e, AvastWRC.USettings.data);
			});

			$("#tabOffer").click(function (e) {
				AvastWRC.USettings.TabsClick(e, AvastWRC.USettings.data);
			});
			$("#tabCoupon").click(function (e) {
				AvastWRC.USettings.TabsClick(e, AvastWRC.USettings.data);
			});
			$("#tabOther").click(function (e) {
				AvastWRC.USettings.TabsClick(e, AvastWRC.USettings.data);
			});

			$("#couponsShowAll").click(function (e) {
				AvastWRC.USettings.SelectCouponsOptions(e, AvastWRC.USettings.data);
			});
			$("#couponsShowOnce").click(function (e) {
				AvastWRC.USettings.SelectCouponsOptions(e, AvastWRC.USettings.data);
			});
			$("#couponsHide").click(function (e) {
				AvastWRC.USettings.SelectCouponsOptions(e, AvastWRC.USettings.data);
			});
			$("#othersShowAll").click(function (e) {
				AvastWRC.USettings.SelectOthersOptions(e, AvastWRC.USettings.data);
			});

			$("#add-site-button-to-box").click(function (e) {
				AvastWRC.USettings.ShowAddSiteBox(e, AvastWRC.USettings.data);
			});

			$("#add-site-add").click(function (e) {
				AvastWRC.USettings.AddSite(e, AvastWRC.USettings.data);
			});
			$(".asp-p-cl-box-element-close").click(function (e) {
				AvastWRC.USettings.RemoveSite(e, AvastWRC.USettings.data);
			});
			$("#add-site-cancel").click(function (e) {
				AvastWRC.USettings.ShowAddButton(e, AvastWRC.USettings.data);
			});

			$("#asp-poppup-settings-save").click(function (e) {
				AvastWRC.USettings.SaveNewSettings(e, AvastWRC.USettings.data);
			});

			$(".asp-faqs-span").click(function (e) {
				AvastWRC.USettings.FAQsClick(e, AvastWRC.USettings.data);
			});

			$("#asp-poppup-settings-save").mousedown(function (e) {
				e.preventDefault();
				var color = (AvastWRC.USettings.data.avastBranding) ? "#087e3a" : "#f1f1f8";
				AvastWRC.USettings.addRippleEffect(e, e.target.className, color);
			});

			$("#asp-poppup-settings-save").hover(function (e) {
					e.preventDefault();
					$('#asp-poppup-settings-save').removeClass('asp-glowing');
				}, function(e) {
				e.preventDefault();
				if (AvastWRC.USettings.data.poppupSettingsNew.menuOpt.notifications.settingsChanged
						|| AvastWRC.USettings.data.poppupSettingsNew.menuOpt.customList.settingsChanged
						|| AvastWRC.USettings.data.poppupSettingsNew.menuOpt.defaultMenuChanged) {
					$('#asp-poppup-settings-save').addClass('asp-glowing');
				}
			});

			$("#asp-popup-settings-cancel").mousedown(function (e) {
				e.preventDefault();
				var color = (AvastWRC.USettings.data.avastBranding) ? "#f1f1f8" : "#f1f1f8";
				AvastWRC.USettings.addRippleEffect(e, e.target.className, color);
			});
		},

		bindTitleEvents: function(){
			$('.asp-middle-item-notifications, .asp-middle-item-notifications-selected').bind('mouseenter', function(e){
				AvastWRC.USettings.showTitle(e, AvastWRC.USettings.data);
			});
			$('.asp-middle-item-custom-list, .asp-middle-item-custom-list-selected').bind('mouseenter', function(e){
				AvastWRC.USettings.showTitle(e, AvastWRC.USettings.data);
			});
			$('.asp-middle-item-help, .asp-middle-item-help-selected').bind('mouseenter', function(e){
				AvastWRC.USettings.showTitle(e, AvastWRC.USettings.data);
			});
			$('.asp-desc').bind('mouseenter', function(e){
				AvastWRC.USettings.showTitle(e, AvastWRC.USettings.data);
			});
			$('.asp-radio-button-option-desc').bind('mouseenter', function(e){
				AvastWRC.USettings.showTitle(e, AvastWRC.USettings.data);
			});
			$('.asp-check-box-desc').bind('mouseenter', function(e){
				AvastWRC.USettings.showTitle(e, AvastWRC.USettings.data);
			});
		},

		showTitle: function(e, data){
			var $this = $(e);
			$this[0].target.title = $this[0].target.innerText;
		},

		addRippleEffect: function (e, buttonClassName, rippleColor) {
			var bgColor = rippleColor;
			if(!bgColor){
				bgColor = "#034c1d";
			}
			if (!buttonClassName) return false;
			var target = e.target;
			var rect = target.getBoundingClientRect();
			var ripple = document.createElement('div');
			var max = Math.floor(Math.max(rect.width, rect.height) / 2);
			ripple.style.setProperty("height", max + "px", "important");
			ripple.style.setProperty("width", max + "px", "important");
			ripple.className = 'asp-ripple-settings';
			target.appendChild(ripple);
			ripple.style.setProperty("zIndex", "-1", "important");
			var top = e.pageY - rect.top - ripple.offsetHeight / 2 - document.body.scrollTop;
			var left = e.pageX - rect.left - ripple.offsetWidth / 2 - document.body.scrollLeft;
			ripple.style.setProperty("top", top + "px", "important");
			ripple.style.setProperty("left", left + "px", "important");
			ripple.style.setProperty("background-color", bgColor, "important");
			$('.asp-ripple-settings').addClass("a-sp-animate");

			setTimeout(() => {
					$(".asp-ripple-settings").remove()
			}, 3000)

			return false;
		},

		Close: function(data){

			AvastWRC.USettings.UnbindSettingsEvents();
			
			AvastWRC.USettings.feedback({
				type: 'settings_page',
				action: 'close_settings'
			});

			//window.close();			
    	},
		
		UnbindSettingsEvents: function () {
			$("#asp-popup-settings-close ").unbind("click", AvastWRC.USettings.ResetSettings);
			$("#asp-popup-settings-cancel").unbind("click", AvastWRC.USettings.ResetSettings);

			$("#sp-menu-notifications").unbind("click", AvastWRC.USettings.SelectMenu);
			$("#sp-menu-help").unbind("click", AvastWRC.USettings.SelectMenu);
			$("#sp-menu-customList").unbind("click", AvastWRC.USettings.SelectMenu);

			$("#offersShowAll").unbind("click", AvastWRC.USettings.SelectOfferOptions);
			$("#offersShowBetter").unbind("click", AvastWRC.USettings.SelectOfferOptions);
			$("#offersHide").unbind("click", AvastWRC.USettings.SelectOfferOptions);

			$("#othersShowAll").unbind("click", AvastWRC.USettings.SelectOthersOptions);

			$("#couponsShowAll").unbind("click", AvastWRC.USettings.SelectCouponsOptions);
			$("#couponsShowOnce").unbind("click", AvastWRC.USettings.SelectCouponsOptions);
			$("#couponsHide").unbind("click", AvastWRC.USettings.SelectCouponsOptions);

			$("#add-site-button-to-box").unbind("click", AvastWRC.USettings.ShowAddSiteBox);

			$("#add-site-add").unbind("click", AvastWRC.USettings.AddSite);
			$(".asp-p-cl-box-element-close").unbind("click", AvastWRC.USettings.RemoveSite);
			$("#add-site-cancel").unbind("click", AvastWRC.USettings.ShowAddButton);

			$("#asp-poppup-settings-save").unbind("click", AvastWRC.USettings.SaveNewSettings);

			$(".asp-faqs-span").unbind("click", AvastWRC.USettings.FAQsClick);

			$("#asp-poppup-settings-save").unbind("mousedown", AvastWRC.USettings.addRippleEffect);
			$("#asp-popup-settings-cancel").unbind("mousedown", AvastWRC.USettings.addRippleEffect);
		},

		FAQsClick: function(e, data){
			AvastWRC.USettings.feedback({
				type: 'settings_page',
				action: 'faqs_clicked',
				domain: data.domain || "",
				campaignId: data.campaignId,
				showABTest: data.showABTest,
				referrer: data.referrer || "",
			});
		},

		ResetSettings: function (e, data) {
			e.preventDefault();
			var defaultSettings = AvastWRC.USettings.originalSettings;
			if (data.poppupSettingsNew.menuOpt.defaultMenuChanged == true) {
				data.poppupSettingsNew.menuOpt.defaultMenuChanged = false;
				data.poppupSettings.menuOpt.defaultMenuChanged = false;
				if(data.poppupSettingsNew.menuOpt.notifications.selected){
					AvastWRC.USettings.originalSettings.menuOpt.notifications.selected = true;
					AvastWRC.USettings.originalSettings.menuOpt.help.selected = false;
					AvastWRC.USettings.originalSettings.menuOpt.customList.selected = false;

					data.poppupSettings.menuOpt.notifications.selected = true;
					data.poppupSettings.menuOpt.help.selected = false;
					data.poppupSettings.menuOpt.customList.selected = false;

					data.poppupSettingsNew.menuOpt.notifications.selected = true;
					data.poppupSettingsNew.menuOpt.help.selected = false;
					data.poppupSettingsNew.menuOpt.customList.selected = false;
				}
				else if(data.poppupSettingsNew.menuOpt.help.selected){
					AvastWRC.USettings.originalSettings.menuOpt.notifications.selected = false;
					AvastWRC.USettings.originalSettings.menuOpt.help.selected = true;
					AvastWRC.USettings.originalSettings.menuOpt.customList.selected = false;

					data.poppupSettings.menuOpt.notifications.selected = false;
					data.poppupSettings.menuOpt.help.selected = true;
					data.poppupSettings.menuOpt.customList.selected = false;

					data.poppupSettingsNew.menuOpt.notifications.selected = false;
					data.poppupSettingsNew.menuOpt.help.selected = true;
					data.poppupSettingsNew.menuOpt.customList.selected = false;
				}
				else if(data.poppupSettingsNew.menuOpt.customList.selected){
					AvastWRC.USettings.menuOpt.notifications.selected = false;
					AvastWRC.USettings.menuOpt.help.selected = false;
					AvastWRC.USettings.menuOpt.customList.selected = true;

					data.poppupSettings.menuOpt.notifications.selected = false;
					data.poppupSettings.menuOpt.help.selected = false;
					data.poppupSettings.menuOpt.customList.selected = true;

					data.poppupSettingsNew.menuOpt.notifications.selected = false;
					data.poppupSettingsNew.menuOpt.help.selected = false;
					data.poppupSettingsNew.menuOpt.customList.selected = true;
				}
				AvastWRC.USettings.feedback({
					type: 'settings_page',
					action: 'save-new-menu-selection',
					domain: data.domain || "",
					campaignId: data.campaignId,
					showABTest: data.showABTest,
					referrer: data.referrer || "",
					newSettings: data.poppupSettingsNew.menuOpt,
					ispoppupSettings: data.ispoppupSettings
				});
			}
			if (data.poppupSettingsNew.menuOpt.notifications.settingsChanged){
				data.poppupSettingsNew.menuOpt.notifications.settingsChanged = false;
				data.poppupSettings.menuOpt.notifications.settingsChanged = false;
				AvastWRC.USettings.originalSettings.menuOpt.notifications.settingsChanged = false;

				if(defaultSettings.menuOpt.notifications.offers.showAlways){
					data.poppupSettings.menuOpt.notifications.offers.showAlways = true;
					data.poppupSettings.menuOpt.notifications.offers.showBetter = false;
					data.poppupSettings.menuOpt.notifications.offers.hide = false;
					
					data.poppupSettingsNew.menuOpt.notifications.offers.showAlways = true;
					data.poppupSettingsNew.menuOpt.notifications.offers.showBetter = false;
					data.poppupSettingsNew.menuOpt.notifications.offers.hide = false;
				}
				else if(defaultSettings.menuOpt.notifications.offers.showBetter){
					data.poppupSettings.menuOpt.notifications.offers.showAlways = false;
					data.poppupSettings.menuOpt.notifications.offers.showBetter = true;
					data.poppupSettings.menuOpt.notifications.offers.hide = false;
					
					data.poppupSettingsNew.menuOpt.notifications.offers.showAlways = false;
					data.poppupSettingsNew.menuOpt.notifications.offers.showBetter = true;
					data.poppupSettingsNew.menuOpt.notifications.offers.hide = false;
				}
				else if(defaultSettings.menuOpt.notifications.offers.hide){
					data.poppupSettings.menuOpt.notifications.offers.showAlways = false;
					data.poppupSettings.menuOpt.notifications.offers.showBetter = false;
					data.poppupSettings.menuOpt.notifications.offers.hide = true;
					
					data.poppupSettingsNew.menuOpt.notifications.offers.showAlways = false;
					data.poppupSettingsNew.menuOpt.notifications.offers.showBetter = false;
					data.poppupSettingsNew.menuOpt.notifications.offers.hide = true;
				}	
				if(defaultSettings.menuOpt.notifications.coupons.showAlways){
					data.poppupSettings.menuOpt.notifications.coupons.showAlways = true;
					data.poppupSettings.menuOpt.notifications.coupons.showOnce = false;
					data.poppupSettings.menuOpt.notifications.coupons.hide = false;
					
					data.poppupSettingsNew.menuOpt.notifications.coupons.showAlways = true;
					data.poppupSettingsNew.menuOpt.notifications.coupons.showOnce = false;
					data.poppupSettingsNew.menuOpt.notifications.coupons.hide = false;
				}
				else if(defaultSettings.menuOpt.notifications.coupons.showOnce){
					data.poppupSettings.menuOpt.notifications.coupons.showAlways = false;
					data.poppupSettings.menuOpt.notifications.coupons.showOnce = true;
					data.poppupSettings.menuOpt.notifications.coupons.hide = false;
					
					data.poppupSettingsNew.menuOpt.notifications.coupons.showAlways = false;
					data.poppupSettingsNew.menuOpt.notifications.coupons.showOnce = true;
					data.poppupSettingsNew.menuOpt.notifications.coupons.hide = false;
				}
				else if(defaultSettings.menuOpt.notifications.coupons.hide){
					data.poppupSettings.menuOpt.notifications.coupons.showAlways = false;
					data.poppupSettings.menuOpt.notifications.coupons.showOnce = false;
					data.poppupSettings.menuOpt.notifications.coupons.hide = true;
					
					data.poppupSettingsNew.menuOpt.notifications.coupons.showAlways = false;
					data.poppupSettingsNew.menuOpt.notifications.coupons.showOnce = false;
					data.poppupSettingsNew.menuOpt.notifications.coupons.hide = true;
				}
			}
			if (data.poppupSettingsNew.menuOpt.customList.settingsChanged) {
				//reset all elements
				data.poppupSettingsNew.menuOpt.customList.whiteList = defaultSettings.menuOpt.customList.whiteList.slice(0);
				data.poppupSettings.menuOpt.customList.whiteList = defaultSettings.menuOpt.customList.whiteList.slice(0);
			}
			AvastWRC.USettings.Close(data);
		},

		SelectMenu: function (e, data) {
			e.preventDefault();
			console.log("SelectMenu");
			if (e.target.id.indexOf("notifications") != -1) {
				$('#sp-menu-notifications').removeClass('asp-middle-item-notifications').addClass('asp-middle-item-notifications-selected');
				$('#sp-menu-help').removeClass('asp-middle-item-help-selected').addClass('asp-middle-item-help');
				$('#sp-menu-customList').removeClass('asp-middle-item-custom-list-selected').addClass('asp-middle-item-custom-list');

				$('#sp-panel-notifications-options').addClass('asp-display-grid');
				$('#sp-panel-help-options').removeClass('asp-display-grid');
				$('#sp-panel-customList-options').removeClass('asp-display-grid');

				data.poppupSettingsNew.menuOpt.notifications.selected = true;
				data.poppupSettingsNew.menuOpt.help.selected = false;
				data.poppupSettingsNew.menuOpt.customList.selected = false;

			}
			else if (e.target.id.indexOf("help") != -1) {
				$('#sp-menu-notifications').removeClass('asp-middle-item-notifications-selected').addClass('asp-middle-item-notifications');
				$('#sp-menu-help').removeClass('asp-middle-item-help').addClass('asp-middle-item-help-selected');
				$('#sp-menu-customList').removeClass('asp-middle-item-custom-list-selected').addClass('asp-middle-item-custom-list');

				$('#sp-panel-help-options').addClass('asp-display-grid');
				$('#sp-panel-notifications-options').removeClass('asp-display-grid');
				$('#sp-panel-customList-options').removeClass('asp-display-grid');

				data.poppupSettingsNew.menuOpt.help.selected = true;
				data.poppupSettingsNew.menuOpt.customList.selected = false;
				data.poppupSettingsNew.menuOpt.notifications.selected = false;
			}
			else if (e.target.id.indexOf("customList") != -1) {
				$('#sp-menu-notifications').removeClass('asp-middle-item-notifications-selected').addClass('asp-middle-item-notifications');
				$('#sp-menu-help').removeClass('asp-middle-item-help-selected').addClass('asp-middle-item-help');
				$('#sp-menu-customList').removeClass('asp-middle-item-custom-list').addClass('asp-middle-item-custom-list-selected');

				$('#sp-panel-customList-options').addClass('asp-display-grid');
				$('#sp-panel-help-options').removeClass('asp-display-grid');
				$('#sp-panel-notifications-options').removeClass('asp-display-grid');

				data.poppupSettingsNew.menuOpt.customList.selected = true;
				data.poppupSettingsNew.menuOpt.help.selected = false;
				data.poppupSettingsNew.menuOpt.notifications.selected = false;

			}
			if (data.poppupSettings.menuOpt.notifications.selected == data.poppupSettingsNew.menuOpt.notifications.selected
				&& data.poppupSettings.menuOpt.help.selected == data.poppupSettingsNew.menuOpt.help.selected
				&& data.poppupSettings.menuOpt.customList.selected == data.poppupSettingsNew.menuOpt.customList.selected) {
				data.poppupSettingsNew.menuOpt.defaultMenuChanged = false;
				console.log("SelectMenu changed to default");
			}
			else /*something changed here*/ {
				data.poppupSettings.menuOpt.notifications.selected = data.poppupSettingsNew.menuOpt.notifications.selected;
				data.poppupSettings.menuOpt.help.selected = data.poppupSettingsNew.menuOpt.help.selected;
				data.poppupSettings.menuOpt.customList.selected = data.poppupSettingsNew.menuOpt.customList.selected;
				AvastWRC.USettings.feedback({
					type: 'settings_page',
					action: 'save-new-menu-selection',
					domain: data.domain || "",
					campaignId: data.campaignId,
					showABTest: data.showABTest,
					referrer: data.referrer || "",
					newSettings: data.poppupSettingsNew.menuOpt,
					ispoppupSettings: data.ispoppupSettings
				});
				console.log("SelectMenu changed");
			}
		},

		TabsClick: function (e, data){
			console.log("tabsclick: tarjet-> ", e.target.id, "currentTarget-> "+ e.currentTarget.id);
			if (e.target.id.indexOf("tabOffer") != -1 || e.currentTarget.id.indexOf("tabOffer") != -1) {
				$('#tabOffer').removeClass('asp-offers-tab').addClass('asp-offers-tab-selected');
				$('#contentOffers').removeClass('asp-tabs-content').addClass('asp-tabs-content-selected');

				$('#tabCoupon').removeClass('asp-coupons-tab-selected').addClass('asp-coupons-tab');
				$('#contentCoupons').removeClass('asp-tabs-content-selected').addClass('asp-tabs-content');

				$('#tabOther').removeClass('asp-others-tab-selected').addClass('asp-others-tab');
				$('#contentOthers').removeClass('asp-tabs-content-selected').addClass('asp-tabs-content');
			}
			else if (e.target.id.indexOf("tabCoupon") != -1 || e.currentTarget.id.indexOf("tabCoupon") != -1) {
				$('#tabOffer').removeClass('asp-offers-tab-selected').addClass('asp-offers-tab');
				$('#contentOffers').removeClass('asp-tabs-content-selected').addClass('asp-tabs-content');

				$('#tabCoupon').removeClass('asp-coupons-tab').addClass('asp-coupons-tab-selected');
				$('#contentCoupons').removeClass('asp-tabs-content').addClass('asp-tabs-content-selected');

				$('#tabOther').removeClass('asp-others-tab-selected').addClass('asp-others-tab');
				$('#contentOthers').removeClass('asp-tabs-content-selected').addClass('asp-tabs-content');
			}
			else if (e.target.id.indexOf("tabOther") != -1 || e.currentTarget.id.indexOf("tabOther") != -1) {
				$('#tabOffer').removeClass('asp-offers-tab-selected').addClass('asp-offers-tab');
				$('#contentOffers').removeClass('asp-tabs-content-selected').addClass('asp-tabs-content');

				$('#tabCoupon').removeClass('asp-coupons-tab-selected').addClass('asp-coupons-tab');
				$('#contentCoupons').removeClass('asp-tabs-content-selected').addClass('asp-tabs-content');

				$('#tabOther').removeClass('asp-others-tab').addClass('asp-others-tab-selected');
				$('#contentOthers').removeClass('asp-tabs-content').addClass('asp-tabs-content-selected');
			}
		},

		AdvancedOptionsChanges: function (e, data) {
			if (data.poppupSettings.menuOpt.notifications.offers.showAlways == data.poppupSettingsNew.menuOpt.notifications.offers.showAlways
				&& data.poppupSettings.menuOpt.notifications.offers.showBetter == data.poppupSettingsNew.menuOpt.notifications.offers.showBetter
				&& data.poppupSettings.menuOpt.notifications.offers.hide == data.poppupSettingsNew.menuOpt.notifications.offers.hide
				&& data.poppupSettings.menuOpt.notifications.accommodations.showBetter == data.poppupSettingsNew.menuOpt.notifications.accommodations.showBetter
				&& data.poppupSettings.menuOpt.notifications.accommodations.showSimilar == data.poppupSettingsNew.menuOpt.notifications.accommodations.showSimilar
				&& data.poppupSettings.menuOpt.notifications.accommodations.showPopular == data.poppupSettingsNew.menuOpt.notifications.accommodations.showPopular
				&& data.poppupSettings.menuOpt.notifications.coupons.showAlways == data.poppupSettingsNew.menuOpt.notifications.coupons.showAlways
				&& data.poppupSettings.menuOpt.notifications.coupons.showOnce == data.poppupSettingsNew.menuOpt.notifications.coupons.showOnce
				&& data.poppupSettings.menuOpt.notifications.coupons.hide == data.poppupSettingsNew.menuOpt.notifications.coupons.hide
				&& data.poppupSettings.menuOpt.notifications.others.showAlways == data.poppupSettingsNew.menuOpt.notifications.others.showAlways) {
				data.poppupSettingsNew.menuOpt.notifications.settingsChanged = false;
				console.log("AdvancedOptionsChanges changed to default or never changed");
				$('#asp-poppup-settings-save').removeClass('asp-glowing');
			}
			else/*something changed here*/ {
				data.poppupSettingsNew.menuOpt.notifications.settingsChanged = true;
				console.log("AdvancedOptionsChanges changed");
				$('#asp-poppup-settings-save').addClass('asp-glowing');
			}
		},

		SelectOfferOptions: function (e, data) {
			console.log("SelectOfferOptions");
			if (e.target.id.indexOf("offersShowAll") != -1 || e.currentTarget.id.indexOf("offersShowAll") != -1) {
				data.poppupSettingsNew.menuOpt.notifications.offers.showAlways = true;
				data.poppupSettingsNew.menuOpt.notifications.offers.showBetter = false;
				data.poppupSettingsNew.menuOpt.notifications.offers.hide = false;

				$('#offersShowAll').removeClass('asp-offers-show-all').addClass('asp-offers-show-all-selected');
				$('#offersShowBetter').removeClass('asp-offers-show-better-selected').addClass('asp-offers-show-better');
				$('#offersHide').removeClass('asp-offers-hide-selected').addClass('asp-offers-hide');
			}
			else if (e.target.id.indexOf("offersShowBetter") != -1 || e.currentTarget.id.indexOf("offersShowBetter") != -1) {
				data.poppupSettingsNew.menuOpt.notifications.offers.showAlways = false;
				data.poppupSettingsNew.menuOpt.notifications.offers.showBetter = true;
				data.poppupSettingsNew.menuOpt.notifications.offers.hide = false;

				$('#offersShowAll').removeClass('asp-offers-show-all-selected').addClass('asp-offers-show-all');
				$('#offersShowBetter').removeClass('asp-offers-show-better').addClass('asp-offers-show-better-selected');
				$('#offersHide').removeClass('asp-offers-hide-selected').addClass('asp-offers-hide');
			}
			else if (e.target.id.indexOf("offersHide") != -1 || e.currentTarget.id.indexOf("offersHide") != -1) {
				data.poppupSettingsNew.menuOpt.notifications.offers.showAlways = false;
				data.poppupSettingsNew.menuOpt.notifications.offers.showBetter = false;
				data.poppupSettingsNew.menuOpt.notifications.offers.hide = true;

				$('#offersShowAll').removeClass('asp-offers-show-all-selected').addClass('asp-offers-show-all');
				$('#offersShowBetter').removeClass('asp-offers-show-better-selected').addClass('asp-offers-show-better');
				$('#offersHide').removeClass('asp-offers-hide').addClass('asp-offers-hide-selected');
			}
			AvastWRC.USettings.AdvancedOptionsChanges(e, data);
		},

		SelectAccommodationsOptions: function (e, data){
			console.log("SelectAcommodationOptions");
			if (e.target.id.indexOf("accommodationsShowBetter") != -1 || e.currentTarget.id.indexOf("accommodationsShowBetter") != -1) {
				if (data.poppupSettingsNew.menuOpt.notifications.accommodations.showBetter) {
					data.poppupSettingsNew.menuOpt.notifications.accommodations.showBetter = false;
					$('#checkboxAccommodationsShowBetter').css("background-image", 'url("'+data.poppupSettings.images.checkbox+'")');
				} else {
					data.poppupSettingsNew.menuOpt.notifications.accommodations.showBetter = true;
					$('#checkboxAccommodationsShowBetter').css("background-image", 'url("'+data.poppupSettings.images.checkboxChecked+'")');
				}
			}
			else if (e.target.id.indexOf("accommodationsShowSimilar") != -1 || e.currentTarget.id.indexOf("accommodationsShowSimilar") != -1) {
				if (data.poppupSettingsNew.menuOpt.notifications.accommodations.showSimilar) {
					data.poppupSettingsNew.menuOpt.notifications.accommodations.showSimilar = false;
					$('#checkboxAccommodationsShowSimilar').css("background-image", 'url("'+data.poppupSettings.images.checkbox+'")');
				} else {
					data.poppupSettingsNew.menuOpt.notifications.accommodations.showSimilar = true;
					$('#checkboxAccommodationsShowSimilar').css("background-image", 'url("'+data.poppupSettings.images.checkboxChecked+'")');
				}
			}
			else if (e.target.id.indexOf("accommodationsShowPopular") != -1 || e.currentTarget.id.indexOf("accommodationsShowPopular") != -1) {
				if (data.poppupSettingsNew.menuOpt.notifications.accommodations.showPopular) {
					data.poppupSettingsNew.menuOpt.notifications.accommodations.showPopular = false;
					$('#checkboxAccommodationsShowPopular').css("background-image", 'url("'+data.poppupSettings.images.checkbox+'")');
				} else {
					data.poppupSettingsNew.menuOpt.notifications.accommodations.showPopular = true;
					$('#checkboxAccommodationsShowPopular').css("background-image", 'url("'+ data.poppupSettings.images.checkboxChecked+'")');
				}
			}
			AvastWRC.USettings.AdvancedOptionsChanges(e, data);
		},

		SelectCouponsOptions: function (e, data) {
			console.log("SelectCouponsOptions");
			if (e.target.id.indexOf("couponsShowAll") != -1 || e.currentTarget.id.indexOf("couponsShowAll") != -1) {
				data.poppupSettingsNew.menuOpt.notifications.coupons.showAlways = true;
				data.poppupSettingsNew.menuOpt.notifications.coupons.showOnce = false;
				data.poppupSettingsNew.menuOpt.notifications.coupons.hide = false;

				$('#couponsShowAll').removeClass('asp-coupons-show-all').addClass('asp-coupons-show-all-selected');
				$('#couponsShowOnce').removeClass('asp-coupons-show-once-selected').addClass('asp-coupons-show-once');
				$('#couponsHide').removeClass('asp-coupons-hide-selected').addClass('asp-coupons-hide');
			}
			else if (e.target.id.indexOf("couponsShowOnce") != -1 || e.currentTarget.id.indexOf("couponsShowOnce") != -1) {
				data.poppupSettingsNew.menuOpt.notifications.coupons.showAlways = false;
				data.poppupSettingsNew.menuOpt.notifications.coupons.showOnce = true;
				data.poppupSettingsNew.menuOpt.notifications.coupons.hide = false;

				$('#couponsShowAll').removeClass('asp-coupons-show-all-selected').addClass('asp-coupons-show-all');
				$('#couponsShowOnce').removeClass('asp-coupons-show-once').addClass('asp-coupons-show-once-selected');
				$('#couponsHide').removeClass('asp-coupons-hide-selected').addClass('asp-coupons-hide');

			}
			else if (e.target.id.indexOf("couponsHide") != -1 || e.currentTarget.id.indexOf("couponsHide") != -1) {
				data.poppupSettingsNew.menuOpt.notifications.coupons.showAlways = false;
				data.poppupSettingsNew.menuOpt.notifications.coupons.showOnce = false;
				data.poppupSettingsNew.menuOpt.notifications.coupons.hide = true;

				$('#couponsShowAll').removeClass('asp-coupons-show-all-selected').addClass('asp-coupons-show-all');
				$('#couponsShowOnce').removeClass('asp-coupons-show-once-selected').addClass('asp-coupons-show-once');
				$('#couponsHide').removeClass('asp-coupons-hide').addClass('asp-coupons-hide-selected');
				
			}
			AvastWRC.USettings.AdvancedOptionsChanges(e, data);
		},

		SelectOthersOptions: function (e, data) {
			console.log("SelectOthersOptions");
			if (e.target.id.indexOf("othersShowAll") != -1 || e.currentTarget.id.indexOf("othersShowAll") != -1) {
				if (data.poppupSettingsNew.menuOpt.notifications.others.showAlways) {
					data.poppupSettingsNew.menuOpt.notifications.others.showAlways = false;
					$('#checkboxOthersShowAll').css("background-image", 'url("'+data.poppupSettings.images.checkbox+'")');
				} else {
					data.poppupSettingsNew.menuOpt.notifications.others.showAlways = true;
					$('#checkboxOthersShowAll').css("background-image", 'url("'+data.poppupSettings.images.checkboxChecked+'")');
				}
			}
			
			AvastWRC.USettings.AdvancedOptionsChanges(e, data);
		},

		getDomainFromUrl: function (url){
			function getHostFromUrl(url) {
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
			}
			function getDomainFromHost(host){
				return host ? host.split(".").slice(-2).join(".") : undefined;
			}

			return getHostFromUrl(url);
		}, 
		ShowAddSiteBox: function (e, data) {
			e.preventDefault();
			$('#add-site-button-to-box').removeClass('asp-display-block');
			$('#add-site-box').addClass('asp-display-grid');
			$('.asp-p-cl-add-site-text').keypress(function (e) {
				var key = e.which;
				if(key == 13) { //13 enter key
				AvastWRC.USettings.AddSite(e,AvastWRC.USettings.data);
				   return false;  
				}
			});
			$('.asp-p-cl-add-site-text').bind('copy paste', function (e) {
				e.preventDefault();
				var val = e.originalEvent.clipboardData.getData('text/plain');
				var domain = "";
				if(val){
					domain = AvastWRC.USettings.getDomainFromUrl(val);
				}
				if(domain){
					$('.asp-p-cl-add-site-text').val(domain);
				}else{
					$('.asp-p-cl-add-site-text').val(val);
				}
			});
			$("#new-site-name").focus();
		},

		AddSite: function (e, data) {
			var site = $(".asp-p-cl-add-site-text")[0].value.toLowerCase();
			site = site.replace(/↵/g, "");
			site = site.replace(" ", "");
			function checkList(item) {
				return ((item.indexOf(site) != -1) || (site.indexOf(item) != -1));
			}
			if (!site || site == "") {
				AvastWRC.USettings.ShowAddButton(e, data);
			}
			else if (data.poppupSettingsNew.menuOpt.customList.whiteList.findIndex(checkList) == -1) {
				data.poppupSettingsNew.menuOpt.customList.whiteList.push(site);
				data.poppupSettingsNew.menuOpt.customList.settingsChanged = true;
				$('.asp-p-cl-sites-box').append(
					Mustache.render(AvastWRC.Templates.whiteListElement,
						{ site: site, icon: data.poppupSettings.images.erase }));
				$(".asp-p-cl-box-element-close").unbind("click", AvastWRC.USettings.RemoveSite);
				$(".asp-p-cl-box-element-close").click(function (e) {
					AvastWRC.USettings.RemoveSite(e, data);
				});
				$('#asp-poppup-settings-save').addClass('asp-glowing');
				AvastWRC.USettings.ShowAddButton(e, data);
			}
			AvastWRC.USettings.ShowAddButton(e, data);
		},

		RemoveSite: function (e, data) {
			var site = e.currentTarget.parentElement.firstElementChild.innerText.toLowerCase();
			site = site.replace(/↵/g, "");
			site = site.replace(" ", "");
			function checkList(item) {
				return (item.indexOf(site) != -1);
			}
			var index = data.poppupSettingsNew.menuOpt.customList.whiteList.findIndex(checkList);
			if (index != -1) {
				data.poppupSettingsNew.menuOpt.customList.whiteList.splice(index, 1);
				data.poppupSettingsNew.menuOpt.customList.settingsChanged = true;
				var parent = document.getElementsByClassName('asp-p-cl-sites-box');
				var elem = e.currentTarget.parentElement;
				parent[0].removeChild(elem);
				$('#asp-poppup-settings-save').addClass('asp-glowing');
			}
			AvastWRC.USettings.ShowAddButton(e, data);
		},

		ShowAddButton: function (e, data) {
			$(".asp-p-cl-add-site-text")[0].value = "";
			$('.asp-p-cl-add-site-text').unbind('copy paste');
			$('#add-site-button-to-box').addClass('asp-display-block');
			$('#add-site-box').removeClass('asp-display-grid');
		},

		SaveNewSettings: function (e, data) {			
			e.preventDefault();
			if (data.poppupSettingsNew.menuOpt.notifications.settingsChanged) {
				data.poppupSettings.menuOpt.notifications.offers.showAlways = data.poppupSettingsNew.menuOpt.notifications.offers.showAlways ? true : false;
				data.poppupSettings.menuOpt.notifications.offers.showBetter = data.poppupSettingsNew.menuOpt.notifications.offers.showBetter ? true : false;
				data.poppupSettings.menuOpt.notifications.offers.hide = data.poppupSettingsNew.menuOpt.notifications.offers.hide ? true : false;
				data.poppupSettings.menuOpt.notifications.accommodations.showBetter = data.poppupSettingsNew.menuOpt.notifications.accommodations.showBetter ? true : false;
				data.poppupSettings.menuOpt.notifications.accommodations.showSimilar = data.poppupSettingsNew.menuOpt.notifications.accommodations.showSimilar ? true : false;
				data.poppupSettings.menuOpt.notifications.accommodations.showPopular = data.poppupSettingsNew.menuOpt.notifications.accommodations.showPopular ? true : false;
				data.poppupSettings.menuOpt.notifications.coupons.showAlways = data.poppupSettingsNew.menuOpt.notifications.coupons.showAlways ? true : false;
				data.poppupSettings.menuOpt.notifications.coupons.showOnce = data.poppupSettingsNew.menuOpt.notifications.coupons.showOnce ? true : false;
				data.poppupSettings.menuOpt.notifications.coupons.hide = data.poppupSettingsNew.menuOpt.notifications.coupons.hide ? true : false;		
				data.poppupSettings.menuOpt.notifications.others.showAlways = data.poppupSettingsNew.menuOpt.notifications.others.showAlways ? true : false;
				
				AvastWRC.USettings.originalSettings.menuOpt.notifications.offers.showAlways = data.poppupSettingsNew.menuOpt.notifications.offers.showAlways ? true : false;
				AvastWRC.USettings.originalSettings.menuOpt.notifications.offers.showBetter = data.poppupSettingsNew.menuOpt.notifications.offers.showBetter ? true : false;
				AvastWRC.USettings.originalSettings.menuOpt.notifications.offers.hide = data.poppupSettingsNew.menuOpt.notifications.offers.hide ? true : false;
				AvastWRC.USettings.originalSettings.menuOpt.notifications.accommodations.showBetter = data.poppupSettingsNew.menuOpt.notifications.accommodations.showBetter ? true : false;
				AvastWRC.USettings.originalSettings.menuOpt.notifications.accommodations.showSimilar = data.poppupSettingsNew.menuOpt.notifications.accommodations.showSimilar ? true : false;
				AvastWRC.USettings.originalSettings.menuOpt.notifications.accommodations.showPopular = data.poppupSettingsNew.menuOpt.notifications.accommodations.showPopular ? true : false;
				AvastWRC.USettings.originalSettings.menuOpt.notifications.coupons.showAlways = data.poppupSettingsNew.menuOpt.notifications.coupons.showAlways ? true : false;
				AvastWRC.USettings.originalSettings.menuOpt.notifications.coupons.showOnce = data.poppupSettingsNew.menuOpt.notifications.coupons.showOnce ? true : false;
				AvastWRC.USettings.originalSettings.menuOpt.notifications.coupons.hide = data.poppupSettingsNew.menuOpt.notifications.coupons.hide ? true : false;
				AvastWRC.USettings.originalSettings.menuOpt.notifications.others.showAlways = data.poppupSettingsNew.menuOpt.notifications.others.showAlways ? true : false;
			}
			if (data.poppupSettingsNew.menuOpt.customList.settingsChanged) {
				data.poppupSettingsNew.menuOpt.customList.settingsChanged = AvastWRC.USettings.listAreDifferents(AvastWRC.USettings.originalSettings.menuOpt.customList.whiteList, data.poppupSettingsNew.menuOpt.customList.whiteList.slice());
				if(data.poppupSettingsNew.menuOpt.customList.settingsChanged){
					data.poppupSettings.menuOpt.customList.whiteList = data.poppupSettingsNew.menuOpt.customList.whiteList.slice();
					AvastWRC.USettings.originalSettings.menuOpt.customList.whiteList = data.poppupSettingsNew.menuOpt.customList.whiteList.slice();
					data.poppupSettings.menuOpt.customList.whiteList.sort();
					AvastWRC.USettings.originalSettings.menuOpt.customList.whiteList.sort();
				}				
			}
			if (data.poppupSettingsNew.menuOpt.defaultMenuChanged) {
				data.poppupSettings.menuOpt.notifications.selected = data.poppupSettingsNew.menuOpt.notifications.selected ? true : false;
				data.poppupSettings.menuOpt.help.selected = data.poppupSettingsNew.menuOpt.help.selected ? true : false;
				data.poppupSettings.menuOpt.customList.selected = data.poppupSettingsNew.menuOpt.customList.selected ? true : false;
				AvastWRC.USettings.originalSettings.menuOpt.notifications.selected = data.poppupSettingsNew.menuOpt.notifications.selected ? true : false;
				AvastWRC.USettings.originalSettings.menuOpt.help.selected = data.poppupSettingsNew.menuOpt.help.selected ? true : false;
				AvastWRC.USettings.originalSettings.menuOpt.customList.selected = data.poppupSettingsNew.menuOpt.customList.selected ? true : false;
			}

			if (data.poppupSettingsNew.menuOpt.notifications.settingsChanged
				|| data.poppupSettingsNew.menuOpt.customList.settingsChanged
				|| data.poppupSettingsNew.menuOpt.defaultMenuChanged) {

				var customListChanged = data.poppupSettingsNew.menuOpt.customList.settingsChanged;

				AvastWRC.USettings.feedback({
					type: 'settings_page',
					action: 'save-settings',
					domain: data.domain || "",
					campaignId: data.campaignId,
					showABTest: data.showABTest,
					referrer: data.referrer || "",
					newSettings: data.poppupSettingsNew.menuOpt,
					customListChanged: customListChanged,
					ispoppupSettings: data.ispoppupSettings
				});

				data.poppupSettingsNew.menuOpt.defaultMenuChanged = false;
				data.poppupSettingsNew.menuOpt.notifications.settingsChanged = false;
				data.poppupSettingsNew.menuOpt.help.settingsChanged = false;
				data.poppupSettingsNew.menuOpt.customList.settingsChanged = false;

				$('#asp-poppup-settings-save').removeClass('asp-glowing');
				
			}
			AvastWRC.USettings.Close(data);
			console.log("SaveNewSettings save settings data");
		},

		listAreDifferents: function (listA, listB) {
			listA = listA.sort();
			listB = listB.sort();
			if(listA.length != listB.length){
				return true;
			}
			for (let i = 0; i < listA.length; i++) {
				if(listA[i] !== listB[i]){
					return true;
				}				
			}
			return false;
		},

		feedback: function (_data) {
			var data = _data || {};
            data.message = 'safeShopFeedback';
			data.tab = AvastWRC.USettings.tab;
            chrome.runtime.sendMessage(data);
		}
	};

	AvastWRC.USettings = AvastWRC.USettings;

}).call(this, $);
