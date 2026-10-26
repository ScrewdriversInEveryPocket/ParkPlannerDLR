import{G as h}from"./chunk-6QSYOQCJ.js";import{a as g}from"./chunk-CJEUBXI6.js";import{ja as n,ma as a,nd as d,oa as c}from"./chunk-3RQOQ5TH.js";var v=new a("device-detection.config"),b=(()=>{class r{constructor(){this._cookieService=c(g),this._loggerService=c(h),this.config=c(v),this.cookieData="",this.cookieName=this.getConfig(),this.deviceTypes={DESKTOP:"desktop",MOBILE:"mobile",TABLET:"tablet",DEFAULT:"unknown"},this.deviceOS={ANDROID:"androidos",IOS:"ios",DEFAULT:"unknown"},this.deviceBrowser={CHROME:"chrome",IEXPLORER:"microsoft_ie",FIREFOX:"firefox",SAFARI:"safari",RA_HYBRID:"disneyrawebview",DEFAULT:"unknown"}}debugLog(i,e){d()&&this._loggerService.log(i,e)}getConfig(){return this.config.WDPR_DEVICE_DETECTION_COOKIE_NAME}getCookie(i,e){return e?(this.debugLog("getCookie reading value from external source: ",e),this.cookieData=e,e):(this.debugLog("getCookie reading cookie "+i),this.cookieData=this._cookieService.get(i),this.debugLog("Cookie Data = ",this.cookieData),this.cookieData)}getParsedCookie(){let i=decodeURI(this.cookieData),e=!1;try{e=JSON.parse(i)}catch{e=!1}return{obj:e,unencodedString:i}}getDeviceType(){let i=this.deviceTypes.DEFAULT,e="DeviceDataService::getDeviceType() ",o,s,t;if(this.cookieData){if(t=this.getParsedCookie(),o=t.obj,!o||!o.preferred||!o.preferred.device)return e+=`
                    returned cookie ${this.cookieName} has missing or invalid jsonObject.preferred.device:
                    ${t.unencodedString}
                `,this.debugLog(e),i;switch(s=o.preferred.device.toLowerCase(),s){case this.deviceTypes.DESKTOP:case this.deviceTypes.MOBILE:case this.deviceTypes.TABLET:i=s;break;default:e+=`
                        ${this.cookieName} cookie value is not one of the expected values,
                        rejecting whatever it sent and defaulting to desktop for styling:
                        ${o.preferred.device}
                    `,this.debugLog(e);break}}else e+=`
                returned cookie value for ${this.cookieName} was unreadable.
                Defaulting to desktop for styles.
            `,this.debugLog(e);return e+="getDeviceType returning "+i,this.debugLog(e),i}getDeviceBrowser(){let i=this.deviceBrowser.DEFAULT,e,o,s,t="DeviceDataService::getDeviceBrowser(), ";if(this.cookieData){if(o=this.getParsedCookie(),e=o.obj,!e||!e.browserInfo||!e.browserInfo.agent)return t+=`
                    returned ${this.cookieName} cookie has missing or invalid jsonObject.browserInfo.agent
                    ${o.unencodedString}
                `,this.debugLog(t),i;switch(s=e.browserInfo.agent.toLowerCase(),s){case this.deviceBrowser.CHROME:case this.deviceBrowser.IEXPLORER:case this.deviceBrowser.FIREFOX:case this.deviceBrowser.SAFARI:case this.deviceBrowser.RA_HYBRID:i=s;break;default:t+=`
                        ${this.cookieName} cookie value is not one of the expected values,
                        rejecting whatever it sent and defaulting for styling:
                        Passed in: ${s}
                        Default: ${this.deviceBrowser.DEFAULT}
                    `,i=this.deviceBrowser.DEFAULT,this.debugLog(t);break}}else t+=`
                returned ${this.cookieName} cookie value was unreadable,
                defaulting to browser for styles:
                ${this.deviceBrowser.DEFAULT}
            `,this.debugLog(t);return t+="getDeviceBrowser returning "+i,this.debugLog(t),i}getDeviceOS(){let i=this.deviceOS.DEFAULT,e,o,s,t="DeviceDataService::getDeviceOS(), ";if(this.cookieData){if(o=this.getParsedCookie(),e=o.obj,!e||!e.deviceInfo||!e.deviceInfo.os)return t+=`
                    returned ${this.cookieName} cookie has missing or invalid data in/for
                    jsonObject.deviceInfo.os:
                    ${o.unencodedString}
                `,this.debugLog(t),i;switch(s=e.deviceInfo.os.toLowerCase(),s){case this.deviceOS.ANDROID:case this.deviceOS.IOS:i=s;break;default:t+=`${this.cookieName} cookie value is not one of the expected values,
                        rejecting whatever it sent and defaulting for styling:
                        Passed in: ${s}
                        Default: ${this.deviceOS.DEFAULT}`,i=this.deviceOS.DEFAULT,this.debugLog(t);break}}else t+=`
                returned ${this.cookieName} cookie value was unreadable,
                defaulting to OS for styles:
                ${this.deviceOS.DEFAULT}
            `,this.debugLog(t);return t+="getDeviceOS returning "+i,this.debugLog(t),i}isMobile(){return this.getDeviceType()===this.deviceTypes.MOBILE}isTablet(){return this.getDeviceType()===this.deviceTypes.TABLET}isDesktop(){return this.getDeviceType()===this.deviceTypes.DESKTOP}isAndroid(){return this.getDeviceOS()===this.deviceOS.ANDROID}isIOS(){return this.getDeviceOS()===this.deviceOS.IOS}deleteCookie(){this._cookieService.delete(this.cookieName)}static{this.\u0275fac=function(e){return new(e||r)}}static{this.\u0275prov=n({token:r,factory:r.\u0275fac})}}return r})();export{v as a,b};
//# sourceMappingURL=chunk-RHOUUT7P.js.map
