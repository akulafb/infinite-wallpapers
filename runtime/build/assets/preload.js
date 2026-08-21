"use strict";(()=>{var O="__glazeIPCStructuredCloneV1",R="glaze.transport.hello",Y={Int8Array,Uint8Array,Uint8ClampedArray,Int16Array,Uint16Array,Int32Array,Uint32Array,Float32Array,Float64Array,BigInt64Array,BigUint64Array};function P(e,t){let r=ue(t),i=e?` at \`${e}\``:"",n="";return r==="Promise"?n=`Found a Promise${i} \u2014 did you forget to \`await\` an async call before returning it? Some Glaze APIs are async where Electron's are synchronous (e.g. \`app.isPackaged()\`, \`globalShortcut.register()\`).`:r==="function"?n=`Found a function${i}; functions cannot cross the IPC boundary \u2014 return a serializable value instead.`:r?n=`Found a non-serializable value of type \`${r}\`${i}.`:i&&(n=`Non-serializable value${i}.`),new Error(n?`An object could not be cloned. ${n}`:"An object could not be cloned.")}function ue(e){if(e==null)return null;let t=typeof e;if(t==="function"||t==="symbol")return t;if(t==="object"){if(typeof e.then=="function")return"Promise";let r=e.constructor?.name;return r&&r!=="Object"?r:"object"}return t}function k(e){return Object.is(e,-0)?"-0":String(e)}function T(e){return e==="-0"?-0:Number(e)}function U(e){let t=globalThis.Buffer;if(t)return t.from(e).toString("base64");let r="";for(let i=0;i<e.length;i+=1)r+=String.fromCharCode(e[i]);return btoa(r)}function Q(e){let t=globalThis.Buffer;if(t)return t.from(e,"base64");let r=atob(e),i=new Uint8Array(r.length);for(let n=0;n<r.length;n+=1)i[n]=r.charCodeAt(n);return i}function Z(e){let t=new ArrayBuffer(e.byteLength);return new Uint8Array(t).set(e),t}function pe(e){return U(new Uint8Array(e))}function _(e){return Z(Q(e))}function he(e,t){try{return structuredClone(e)}catch{throw P(t,e)}}function X(e){let t=Object.getPrototypeOf(e);return t===Object.prototype||t===null}function ge(){return{references:new WeakMap,nextId:1}}function fe(){return{references:new Map}}function me(e,t){let r=t.references.get(e);if(r!==void 0)return{id:r,alreadyEncoded:!0};let i=t.nextId;return t.nextId+=1,t.references.set(e,i),{id:i,alreadyEncoded:!1}}function p(e,t,r){typeof e=="number"&&r.references.set(e,t)}function g(e,t,r){if(e===void 0)return{type:"Undefined"};if(e===null)return{type:"Null"};switch(typeof e){case"boolean":return{type:"Boolean",value:e};case"string":return{type:"String",value:e};case"number":return{type:"Number",value:k(e)};case"bigint":return{type:"BigInt",value:e.toString()};case"function":case"symbol":throw P(t,e);case"object":break;default:throw P(t,e)}let i=me(e,r);if(i.alreadyEncoded)return{type:"Reference",id:i.id};if(Array.isArray(e)){let n=[];for(let a=0;a<e.length;a++)Object.prototype.hasOwnProperty.call(e,a)?n.push(g(e[a],`${t}[${a}]`,r)):n.push({type:"ArrayHole"});return{type:"Array",id:i.id,value:n}}if(e instanceof Date)return{type:"Date",id:i.id,value:k(e.getTime())};if(e instanceof RegExp)return{type:"RegExp",id:i.id,source:e.source,flags:e.flags,lastIndex:k(e.lastIndex)};if(e instanceof Map)return{type:"Map",id:i.id,value:Array.from(e.entries(),([n,a],s)=>[g(n,`${t}.<map-key-${s}>`,r),g(a,`${t}.<map-value-${s}>`,r)])};if(e instanceof Set)return{type:"Set",id:i.id,value:Array.from(e.values(),(n,a)=>g(n,`${t}.<set-${a}>`,r))};if(e instanceof ArrayBuffer)return{type:"ArrayBuffer",id:i.id,value:pe(e)};if(ArrayBuffer.isView(e)){let n=new Uint8Array(e.buffer,e.byteOffset,e.byteLength);if(e instanceof DataView)return{type:"DataView",id:i.id,value:U(n)};let a=e.constructor.name==="Buffer"?"Uint8Array":e.constructor.name;if(!(a in Y))throw P(t,e);return{type:"TypedArray",id:i.id,name:a,value:U(n)}}if(e instanceof Error)return{type:"Error",id:i.id,name:e.name,message:e.message,...typeof e.stack=="string"?{stack:e.stack}:{}};if(!X(e))throw P(t,e);return{type:"Object",id:i.id,value:Object.entries(e).map(([n,a])=>[n,g(a,`${t}.${n}`,r)])}}function f(e,t){switch(e.type){case"Undefined":return;case"Null":return null;case"Boolean":case"String":return e.value;case"Number":return T(e.value);case"BigInt":return BigInt(e.value);case"Reference":{if(!t.references.has(e.id))throw new Error(`Invalid IPC reference id: ${e.id}`);return t.references.get(e.id)}case"Array":{let r=new Array(e.value.length);p(e.id,r,t);for(let i=0;i<e.value.length;i++){let n=e.value[i];n.type!=="ArrayHole"&&(r[i]=f(n,t))}return r}case"ArrayHole":return;case"Object":{let r={};p(e.id,r,t);for(let[i,n]of e.value)Object.defineProperty(r,i,{value:f(n,t),writable:!0,configurable:!0,enumerable:!0});return r}case"Date":{let r=new Date(T(e.value));return p(e.id,r,t),r}case"RegExp":{let r=new RegExp(e.source,e.flags);return r.lastIndex=T(e.lastIndex),p(e.id,r,t),r}case"Map":{let r=new Map;p(e.id,r,t);for(let[i,n]of e.value)r.set(f(i,t),f(n,t));return r}case"Set":{let r=new Set;p(e.id,r,t);for(let i of e.value)r.add(f(i,t));return r}case"ArrayBuffer":{let r=_(e.value);return p(e.id,r,t),r}case"TypedArray":{let r=Q(e.value),i=Z(r),n=Y[e.name],a=new n(i);return p(e.id,a,t),a}case"DataView":{let r=new DataView(_(e.value));return p(e.id,r,t),r}case"Error":{let r=new Error(e.message);return r.name=e.name,typeof e.stack=="string"&&(r.stack=e.stack),p(e.id,r,t),r}}}function ee(e){return!!e&&typeof e=="object"&&O in e&&Object.keys(e).length===1}function ye(e){return ee(e)||!z(e,new WeakSet)}function z(e,t){if(e===null)return!0;switch(typeof e){case"boolean":case"string":return!0;case"number":return Number.isFinite(e)&&!Object.is(e,-0);case"object":break;default:return!1}let r=e;if(t.has(r))return!1;if(t.add(r),Array.isArray(e)){for(let i=0;i<e.length;i+=1)if(!Object.prototype.hasOwnProperty.call(e,i)||!z(e[i],t))return!1;return!0}if(!X(r))return!1;for(let i of Object.values(r))if(!z(i,t))return!1;return!0}function D(e,t="argument"){let r=he(e,t);return{[O]:g(r,t,ge())}}function h(e){return ee(e)?f(e[O],fe()):e}function N(e,t="argument"){D(e,t)}function j(e){for(let t=0;t<e.length;t++)N(e[t],`argument[${t}]`)}function ve(e){return e instanceof Error&&e.isIpcTransportFailure===!0}var q=class extends Error{constructor(e,t={}){super(`Request timeout: ${e}`),this.isIpcTransportFailure=!0,this.ipcSanitizedMessage="Something went wrong. Please try again.",this.ipcFailureKind="request_timeout",this.name="IpcRequestTimeoutError",this.ipcOperation=t.operation,this.ipcChannel=t.method,this.ipcRawMessage=this.message,this.ipcTimeoutMs=t.timeoutMs,this.ipcAgeMs=t.ageMs,this.ipcIdleMs=t.idleMs}},y=()=>typeof window<"u"&&window.__GLAZE_IPC_TRACE__===!0||typeof process<"u"&&process?.env?.GLAZE_IPC_TRACE==="1",we=class{constructor(){this.pendingRequests=new Map,this.requestCounter=0,this.notificationHandlers=new Map,this.notificationQueue=new Map,this.MAX_QUEUE_SIZE=10,this.lastClearPendingReason=null,this.lastClearPendingAt=null}generateRequestId(){return`${++this.requestCounter}`}createRequest(e,t,r){return{jsonrpc:"2.0",id:this.generateRequestId(),method:e,params:t,...r?{meta:r}:{}}}registerPendingRequest(e,t,r,i=5e3,n,a="invoke"){let s=setTimeout(()=>{let o=this.pendingRequests.get(e);o&&(this.pendingRequests.delete(e),o.reject(new q(e,{method:o.metadata.method,operation:o.metadata.operation,timeoutMs:o.metadata.timeoutMs,ageMs:Date.now()-o.metadata.createdAt})))},i);this.pendingRequests.set(e,{resolve:t,reject:r,timeout:s,metadata:{method:n,createdAt:Date.now(),lastActivityAt:Date.now(),isStreaming:!1,timeoutMs:i,operation:a}})}registerStreamingRequest(e,t,r,i,n=3600*1e3,a){this.pendingRequests.set(e,{resolve:r,reject:i,timeout:this.scheduleStreamInactivityTimeout(e,n),onChunk:t,metadata:{method:a,createdAt:Date.now(),lastActivityAt:Date.now(),isStreaming:!0,timeoutMs:n,operation:"stream"}}),y()&&console.log("[IPCTrace] Registered streaming request",{id:e,method:a??"unknown",timeoutMs:n})}scheduleStreamInactivityTimeout(e,t){return setTimeout(()=>{let r=this.pendingRequests.get(e);if(!r)return;let i=r.metadata.timeoutMs,n=Date.now()-r.metadata.lastActivityAt;if(n<i){r.timeout=this.scheduleStreamInactivityTimeout(e,i-n);return}this.pendingRequests.delete(e),r.reject(new q(e,{method:r.metadata.method,operation:r.metadata.operation,timeoutMs:r.metadata.timeoutMs,ageMs:Date.now()-r.metadata.createdAt,idleMs:n}))},t)}handleResponse(e){try{let t=JSON.parse(e);this.handleResponseObject(t)}catch(t){console.error("[MessageProcessor] Failed to parse response:",t)}}handleResponseObject(e){if(!e.id&&typeof e.method=="string"){this.handleNotification({method:e.method,params:h(e.params)});return}let t=this.normalizeResponseId(e.id,e.type);if(!t)return;let r=this.pendingRequests.get(t);if(!r){if(e.type==="complete"||e.type==="error"){let n=this.lastClearPendingAt===null?null:Math.max(0,Date.now()-this.lastClearPendingAt);console.error("[MessageProcessor] Unmatched stream completion response",{id:t,type:e.type,pendingIds:Array.from(this.pendingRequests.keys()),lastClearPendingReason:this.lastClearPendingReason??"none",lastClearPendingAgoMs:n})}else y()&&console.log("[IPCTrace] Unmatched response",{id:t,type:e.type,method:e.method});return}if(e.type){let n=e;this.handleStreamResponse(n,t,r);return}let i=e;if(clearTimeout(r.timeout),this.pendingRequests.delete(t),i.error){let n=this.hydrateBackendError(new Error(i.error.message),h(i.error.data));r.reject(n);return}y()&&r.metadata.isStreaming&&console.log("[IPCTrace] Streaming request resolved via regular response",{id:t,method:r.metadata.method??"unknown",durationMs:Date.now()-r.metadata.createdAt}),r.resolve(h(i.result))}handleStreamResponse(e,t,r){if(e.type==="chunk"){if(r.metadata.lastActivityAt=Date.now(),r.onChunk)try{r.onChunk(h(e.data))}catch(i){console.error("[MessageProcessor] Error in stream onChunk callback",{id:t,method:r.metadata.method??"unknown",error:i})}}else if(e.type==="complete"){let i=Date.now()-r.metadata.createdAt;clearTimeout(r.timeout),this.pendingRequests.delete(t),y()&&console.log("[IPCTrace] Streaming request completed",{id:t,method:r.metadata.method??"unknown",durationMs:i}),r.resolve(h(e.data))}else if(e.type==="error"){let i=Date.now()-r.metadata.createdAt;clearTimeout(r.timeout),this.pendingRequests.delete(t),console.error("[MessageProcessor] Streaming request failed",{id:t,method:r.metadata.method??"unknown",durationMs:i,message:e.error?.message??"Unknown error"}),r.reject(this.hydrateBackendError(new Error(e.error?.message||"Unknown error"),h(e.error?.data)))}}hydrateBackendError(e,t){if(!t||typeof t!="object")return e;let r=t;return typeof r.name=="string"&&r.name&&(e.name=r.name),(typeof r.code=="number"||typeof r.code=="string")&&(e.code=r.code),typeof r.stack=="string"&&(e.backendStack=r.stack),r.reportedToSentry===!0&&(e.reportedToSentry=!0),e}normalizeResponseId(e,t){if(typeof e=="string")return e;if(typeof e=="number"&&Number.isFinite(e)){let r=String(e);return console.warn("[MessageProcessor] Received numeric response ID, normalizing to string",{id:e,normalizedId:r,type:t}),r}return t==="complete"||t==="error"?console.error("[MessageProcessor] Dropping stream completion response with invalid ID",{id:e,idType:typeof e,type:t}):y()&&console.warn("[MessageProcessor] Dropping response with invalid ID",{id:e,idType:typeof e,type:t}),null}clearAllPending(e,t="unspecified"){let r=Array.from(this.pendingRequests.keys());r.length>0&&console.warn("[MessageProcessor] Clearing pending IPC requests",{reason:t,count:r.length,pendingIds:r.slice(0,20)}),this.pendingRequests.forEach(i=>{clearTimeout(i.timeout),i.reject(e)}),this.pendingRequests.clear(),this.lastClearPendingReason=t,this.lastClearPendingAt=Date.now()}registerNotificationHandler(e,t){this.notificationHandlers.has(e)||this.notificationHandlers.set(e,new Set),this.notificationHandlers.get(e).add(t);let r=this.notificationQueue.get(e);return r&&r.length>0&&(console.log(`[MessageProcessor] Replaying ${r.length} queued notification(s) for ${e}`),r.forEach(i=>{t(i.params)}),this.notificationQueue.delete(e)),()=>{this.notificationHandlers.get(e)?.delete(t)}}handleNotification(e){let t=this.notificationHandlers.get(e.method);if(t&&t.size>0)console.log(`[MessageProcessor] Handling notification: ${e.method} (${t.size} handler(s))`),t.forEach(r=>r(e.params));else{this.notificationQueue.has(e.method)||this.notificationQueue.set(e.method,[]);let r=this.notificationQueue.get(e.method);e.method.includes(".userChanged")||e.method.includes(".stateChanged")||e.method.includes(".updated")?(r.length=0,r.push(e),console.log(`[MessageProcessor] Queued state notification: ${e.method} (replaced previous). Will replay when handler is registered.`)):(r.length>=this.MAX_QUEUE_SIZE&&r.shift(),r.push(e),console.log(`[MessageProcessor] Queued notification: ${e.method} (queue size: ${r.length}). Will replay when handler is registered.`))}}},be=class{constructor(){this.pendingRequests=new Map,this.messageCounter=0,window.addEventListener("message",this.handleMessage.bind(this))}async request(e,t){let r=`${++this.messageCounter}`;return new Promise((i,n)=>{this.pendingRequests.set(r,{resolve:i,reject:n});let a={id:r,method:e,params:t};window.webkit?.messageHandlers?.["glaze-ipc"]?(window.webkit.messageHandlers["glaze-ipc"].postMessage(a),setTimeout(()=>{this.pendingRequests.has(r)&&(this.pendingRequests.delete(r),n(new Error(`Request timeout: ${e}`)))},5e3)):(this.pendingRequests.delete(r),n(new Error("WebKit message handler not available")))})}handleMessage(e){let t=e.data;if(!t.id)return;let r=this.pendingRequests.get(t.id);r&&(this.pendingRequests.delete(t.id),t.error?r.reject(new Error(t.error)):r.resolve(t.result))}},$=new be,Pe="glaze.transport.cancelStream",Ie="glaze.ipc.connect",Re="glaze.ipc.disconnect",Ee="glaze.ipc.message",E={structuredCloneV1:!0},Ae=class extends Error{constructor(){super("Native IPC disconnected"),this.isIpcTransportFailure=!0,this.name="NativeBridgeDisconnectedError"}},Ce=e=>e instanceof Error?e.message||e.name||"transport failure":String(e),A=()=>typeof window<"u"&&window.__GLAZE_IPC_TRACE__===!0||typeof process<"u"&&process?.env?.GLAZE_IPC_TRACE==="1",x=class{constructor(){this.messageProcessor=new we,this.connected=!1,this.connectPromise=null,this.clientId=this.createClientId(),this.webViewId=this.getWebViewId(),this.listenerAttached=!1,this.hostEnvelopeSupport=null,this.hostCapabilityProbe=null,this.activeStreamCleanup=new Map,this.connectionEpoch=0,this.handleMessage=e=>{let t=e.data;!t||t.jsonrpc!=="2.0"||this.handleIncomingMessage(t)},this.attachListener(),this.attachDirectReceiver()}async connect(e){if(!this.connected){if(this.connectPromise)return this.connectPromise;this.connectPromise=(async()=>{this.attachListener(),await $.request(Ie,{clientId:this.clientId,webViewId:this.webViewId}),this.connected=!0,this.connectionEpoch+=1,this.hostEnvelopeSupport=null,this.hostCapabilityProbe=null,this.ensureHostCapabilityProbe(),A()&&console.log("[NativeIPC] Connected to native bridge",{clientId:this.clientId,webViewId:this.webViewId})})();try{await this.connectPromise}finally{this.connectPromise&&(this.connectPromise=null)}}}disconnect(){if(this.connected){for(let e of this.activeStreamCleanup.keys())this.postStreamCancellation(e);this.connected=!1,this.hostEnvelopeSupport=null,this.hostCapabilityProbe=null,this.messageProcessor.clearAllPending(new Ae,"native-bridge-disconnect"),this.detachListener(),$.request(Re,{clientId:this.clientId}).catch(e=>{console.error("[NativeIPC] Disconnect failed:",e)})}}isConnected(){return this.connected}async sendMessage(e,t,r,i){if(!this.connected)throw new Error("Native IPC not connected");let n=await this.encodeOutboundParams(t,e),a=this.messageProcessor.createRequest(e,n,{...i?.kind?{ipcKind:i.kind}:{},transport:E});return new Promise((s,o)=>{this.messageProcessor.registerPendingRequest(a.id,s,o,r,e,i?.kind),A()&&console.log("[IPCTrace] Native send",{id:a.id,method:e}),this.postRequest(a)})}async sendStreamingMessage(e,t,r,i){if(!this.connected)throw new Error("Native IPC not connected");if(i?.signal?.aborted)throw i.signal.reason;let n=await this.encodeOutboundParams(t,e);if(i?.signal?.aborted)throw i.signal.reason;let a=this.messageProcessor.createRequest(e,n,{ipcKind:"stream",transport:E}),s=()=>this.postStreamCancellation(a.id);i?.signal?.addEventListener("abort",s,{once:!0}),this.activeStreamCleanup.set(a.id,()=>i?.signal?.removeEventListener("abort",s));try{return await new Promise((o,d)=>{this.messageProcessor.registerStreamingRequest(a.id,r,o,d,void 0,e),A()&&console.log("[IPCTrace] Native stream send",{id:a.id,method:e}),this.postRequest(a)})}finally{this.activeStreamCleanup.get(a.id)?.(),this.activeStreamCleanup.delete(a.id)}}postStreamCancellation(e){try{let t={requestId:e},r=this.messageProcessor.createRequest(Pe,t,{ipcKind:"send",transport:E});this.postRequest(r)}catch(t){console.error("[NativeIPC] Failed to cancel stream:",t)}}onNotification(e,t){return this.messageProcessor.registerNotificationHandler(e,t)}async encodeOutboundParams(e,t){if(!ye(e))return e;let r=D(e,"params");if(this.hostEnvelopeSupport===!0)return r;if(this.hostEnvelopeSupport===!1)throw this.createHostEnvelopeUnsupportedError(t);let i=await this.ensureHostCapabilityProbe();switch(i.status){case"supported":return r;case"unsupported":throw this.createHostEnvelopeUnsupportedError(t);case"indeterminate":throw this.createHostCapabilityUnknownError(t,i.reason)}}ensureHostCapabilityProbe(){if(this.hostEnvelopeSupport!==null){let e=this.hostEnvelopeSupport?{status:"supported"}:{status:"unsupported"};return Promise.resolve(e)}return this.hostCapabilityProbe||(this.hostCapabilityProbe=this.probeHostCapabilities()),this.hostCapabilityProbe}async probeHostCapabilities(){let e=this.connectionEpoch;try{let t=this.messageProcessor.createRequest(R,void 0,{ipcKind:"invoke",transport:E}),r=await new Promise((n,a)=>{this.messageProcessor.registerPendingRequest(t.id,n,a,5e3,R),this.postRequest(t)}),i=!!r&&typeof r=="object"&&r.structuredCloneV1===!0;return e===this.connectionEpoch&&(this.hostEnvelopeSupport=i),i?{status:"supported"}:{status:"unsupported"}}catch(t){return ve(t)?{status:"indeterminate",reason:Ce(t)}:(e===this.connectionEpoch&&(this.hostEnvelopeSupport=!1),{status:"unsupported"})}finally{e===this.connectionEpoch&&(this.hostCapabilityProbe=null)}}createHostEnvelopeUnsupportedError(e){return new Error(`This Glaze host does not support rich IPC values (Date, Map/Set, typed arrays, bigint, undefined, cyclic references, \u2026) required by \`${e}\`. The host answered the \`${R}\` capability handshake without advertising structured-clone support, so it predates the transport envelope. Update the host, or pass only plain JSON-serializable values over this channel.`)}createHostCapabilityUnknownError(e,t){return new Error(`Could not confirm whether this Glaze host can decode rich IPC values (Date, Map/Set, typed arrays, bigint, \u2026) required by \`${e}\`: the \`${R}\` capability probe did not complete (${t}). This is not a confirmed version mismatch \u2014 the IPC channel may be degraded (e.g. after the WebView slept) and the next rich-value send will re-probe. Retry, or pass only plain JSON-serializable values over this channel.`)}postRequest(e){this.postMessage({clientId:this.clientId,webViewId:this.webViewId,message:JSON.stringify(e),requestId:e.id})}postMessage(e){if(!window.webkit?.messageHandlers?.["glaze-ipc"])throw new Error("WebKit message handler not available");window.webkit.messageHandlers["glaze-ipc"].postMessage({id:e.requestId,method:Ee,params:e})}attachListener(){this.listenerAttached||(window.addEventListener("message",this.handleMessage),this.listenerAttached=!0)}detachListener(){this.listenerAttached&&(window.removeEventListener("message",this.handleMessage),this.listenerAttached=!1)}attachDirectReceiver(){if(typeof window>"u")return;let e=window;e.__glazeReceiveIPCMessageJSON=t=>{try{let r=JSON.parse(t);this.handleIncomingMessage(r)}catch(r){console.error("[NativeIPC] Failed to parse direct JSON message",r)}},e.__glazeReceiveIPCMessageObject=t=>{this.handleIncomingMessage(t)}}handleIncomingMessage(e){A()&&console.log("[IPCTrace] Native recv",{id:e.id,type:e.type,hasError:!!e.error}),this.messageProcessor.handleResponseObject(e)}createClientId(){let e=this.getWebViewId()??"webview",t=typeof crypto<"u"&&typeof crypto.randomUUID=="function"?crypto.randomUUID():Math.random().toString(16).slice(2);return`${e}-${t}`}getWebViewId(){if(!(typeof window>"u"))return window.identifier}},Le=class{constructor(){this.emitterEvents=new Map,this.warnedEvents=new Set,this.maxListeners=10}on(e,t){return this.addListener(e,t)}addListener(e,t){return this.assertListener(t),this.emitNewListener(e,t),this.addEntry(e,{listener:t,once:!1},!1),this}once(e,t){this.assertListener(t);let r=(...i)=>{this.removeListener(e,r),t.apply(this,i)};return r.listener=t,this.emitNewListener(e,t),this.addEntry(e,{listener:r,original:t,once:!0},!1),this}prependListener(e,t){return this.assertListener(t),this.emitNewListener(e,t),this.addEntry(e,{listener:t,once:!1},!0),this}prependOnceListener(e,t){this.assertListener(t);let r=(...i)=>{this.removeListener(e,r),t.apply(this,i)};return r.listener=t,this.emitNewListener(e,t),this.addEntry(e,{listener:r,original:t,once:!0},!0),this}off(e,t){return this.removeListener(e,t)}removeListener(e,t){this.assertListener(t);let r=this.emitterEvents.get(e);if(!r)return this;for(let i=r.length-1;i>=0;i-=1){let n=r[i];if(n.listener===t||n.original===t){r.splice(i,1),r.length===0&&(this.emitterEvents.delete(e),this.warnedEvents.delete(e)),this.emitRemoveListener(e,n.original??n.listener);break}}return this}removeAllListeners(e){if(e===void 0){for(let r of this.eventNames())this.removeAllListeners(r);return this}let t=this.emitterEvents.get(e);if(!t)return this;for(let r=t.length-1;r>=0;r-=1){let i=t[r];t.splice(r,1),t.length===0&&(this.emitterEvents.delete(e),this.warnedEvents.delete(e)),this.emitRemoveListener(e,i.original??i.listener)}return this}emit(e,...t){let r=this.emitterEvents.get(e);if(!r||r.length===0){if(e==="error"){let i=t[0];throw i instanceof Error?i:new Error(`Unhandled error.${i===void 0?"":` (${String(i)})`}`)}return!1}for(let i of[...r])i.listener.apply(this,t);return!0}listeners(e){return(this.emitterEvents.get(e)??[]).map(t=>t.original??t.listener)}rawListeners(e){return(this.emitterEvents.get(e)??[]).map(t=>t.listener)}listenerCount(e,t){let r=this.emitterEvents.get(e)??[];return t==null?r.length:typeof t!="function"?0:r.filter(i=>i.listener===t||i.original===t).length}eventNames(){return[...this.emitterEvents.keys()]}setMaxListeners(e){if(typeof e!="number"){let t=new TypeError(`The "setMaxListeners" argument must be of type number. Received ${this.formatReceived(e)}`);throw t.code="ERR_INVALID_ARG_TYPE",t}if(Number.isNaN(e)||e<0){let t=new RangeError(`The value of "setMaxListeners" is out of range. It must be >= 0. Received ${e}`);throw t.code="ERR_OUT_OF_RANGE",t}return this.maxListeners=e,this}getMaxListeners(){return this.maxListeners}addEntry(e,t,r){let i=this.emitterEvents.get(e)??[];r?i.unshift(t):i.push(t),this.emitterEvents.set(e,i),this.maybeEmitMaxListenersWarning(e,i.length)}assertListener(e){if(typeof e!="function"){let t=new TypeError(`The "listener" argument must be of type function. Received ${this.formatReceived(e)}`);throw t.code="ERR_INVALID_ARG_TYPE",t}}emitNewListener(e,t){this.emit("newListener",e,t)}emitRemoveListener(e,t){this.emit("removeListener",e,t)}maybeEmitMaxListenersWarning(e,t){if(this.maxListeners===0||t<=this.maxListeners||this.warnedEvents.has(e))return;this.warnedEvents.add(e);let r=this.constructor.name||"EventEmitter",i=new Error(`Possible EventEmitter memory leak detected. ${t} ${String(e)} listeners added to [${r}]. MaxListeners is ${this.maxListeners}. Use emitter.setMaxListeners() to increase limit`);i.name="MaxListenersExceededWarning",i.emitter=this,i.type=e,i.count=t;let n=globalThis.process;typeof n?.emitWarning=="function"?n.emitWarning(i):console.warn(i)}formatReceived(e){return e===null?"null":e===void 0?"undefined":typeof e=="string"?`type string ('${e}')`:typeof e=="number"?`type number (${e})`:typeof e=="boolean"?`type boolean (${e})`:`type ${typeof e}`}},te="__glazeIpcTransferPayloadV1",v="__glaze:message-port";function Se(e,t){return{[te]:!0,args:e,ports:t}}function V(e){if(!e||typeof e!="object"||Array.isArray(e))return!1;let t=e;return t[te]===!0&&Array.isArray(t.args)&&Array.isArray(t.ports)&&t.ports.every(re)}function re(e){return e!==null&&typeof e=="object"&&typeof e.id=="string"}var Me=Symbol.for("glaze.ipcRendererBridgeValue"),ke="Something went wrong. Please try again.",Te="IPC method called after context was released",xe=/\b[a-z][a-z0-9_.-]*:[a-z0-9_.:-]+\b/i,Ue=/\b(ipc|channel|method)\b/i,ze=[{kind:"unknown_method",pattern:/^Unknown method:/i},{kind:"request_timeout",pattern:/^Request timeout:/i},{kind:"backend_not_connected",pattern:/^IPC backend not connected$/i},{kind:"native_not_connected",pattern:/^Native IPC not connected$/i},{kind:"native_disconnected",pattern:/^Native IPC disconnected$/i},{kind:"webkit_handler_missing",pattern:/^WebKit message handler not available$/i},{kind:"invalid_message_format",pattern:/^Invalid message format$/i},{kind:"native_bridge_unavailable",pattern:/^Glaze ipcRenderer requires native bridge/i}],Ne=class extends Le{constructor(){super(),this.listenerChannels=new Set,this.listenerUnsubscribers=new Map,this.isInitialized=!1,this.initPromise=null,this.contextReleased=!1,this.dispatchQueue=Promise.resolve(),this.messagePortControlUnsubscribe=null,this.transferredRendererPorts=new Map,this.rendererTransferredMessagePorts=new WeakSet,this.nextRendererTransferredPortId=0,this.streamCancellationControllers=new Map,Object.defineProperty(this,Me,{value:!0,enumerable:!1,configurable:!1,writable:!1}),this.transport=new x,this.setupMessageHandling(),this.registerMessagePortControlListener(),this.setupContextReleaseHandling()}send(e,...t){this.assertContextActive(),this.assertChannel(e),j(t),this.enqueueTransportDispatch(()=>this.transport.sendMessage(e,t,void 0,{kind:"send"})).catch(r=>{console.error(`[ipcRenderer] Failed to send on channel '${e}':`,r)})}enqueueTransportDispatch(e){let t,r=this.dispatchQueue.then(async()=>{await this.ensureConnected();try{t=e()}catch(i){t=Promise.reject(i)}});return this.dispatchQueue=r.catch(()=>{}),r.then(()=>{if(!t)throw new Error("IPC dispatch did not start");return t})}postMessage(e,t,r){if(this.assertContextActive(),arguments.length<2)throw new Error("Insufficient number of arguments");this.assertChannel(e);let i=this.validatePostMessageTransferList(r);if(N(t),i.length===0){this.send(e,t);return}let n=Se([t],i.map(a=>this.createRendererTransferredMessagePortDescriptor(a)));this.enqueueTransportDispatch(()=>this.transport.sendMessage(e,[n],void 0,{kind:"send"})).catch(a=>{console.error(`[ipcRenderer] Failed to postMessage on channel '${e}':`,a)})}async invoke(e,...t){this.assertContextActive(),this.assertChannel(e),j(t);try{return await this.enqueueTransportDispatch(()=>this.transport.sendMessage(e,t,6e5,{kind:"invoke"}))}catch(r){throw this.createUserSafeIpcError("invoke",e,r)}}sendSync(e,...t){throw this.assertContextActive(),this.assertChannel(e),console.warn("[ipcRenderer] sendSync() is deprecated and not recommended. Use invoke() instead."),new Error("sendSync is not supported in Glaze. Use invoke() for async communication.")}on(e,t){return super.on(e,t),this.registerIPCListenerChannel(e),this.ensureConnected().catch(r=>{console.error(`[ipcRenderer] Failed to connect for listener on channel '${String(e)}':`,r)}),this}once(e,t){return super.once(e,t),this.registerIPCListenerChannel(e),this.ensureConnected().catch(r=>{console.error(`[ipcRenderer] Failed to connect for listener on channel '${String(e)}':`,r)}),this}addListener(e,t){return super.addListener(e,t),this.registerIPCListenerChannel(e),this.ensureConnected().catch(r=>{console.error(`[ipcRenderer] Failed to connect for listener on channel '${String(e)}':`,r)}),this}prependListener(e,t){return super.prependListener(e,t),this.registerIPCListenerChannel(e),this.ensureConnected().catch(r=>{console.error(`[ipcRenderer] Failed to connect for listener on channel '${String(e)}':`,r)}),this}prependOnceListener(e,t){return super.prependOnceListener(e,t),this.registerIPCListenerChannel(e),this.ensureConnected().catch(r=>{console.error(`[ipcRenderer] Failed to connect for listener on channel '${String(e)}':`,r)}),this}off(e,t){return this.removeListener(e,t)}removeListener(e,t){return super.removeListener(e,t),this.unregisterIPCListenerChannelIfEmpty(e),this}removeAllListeners(e){return e===void 0?(super.removeAllListeners(),this.listenerChannels.clear(),this.unregisterAllNotificationListeners()):typeof e=="string"?(super.removeAllListeners(e),this.listenerChannels.delete(e),this.unregisterNotificationListener(e)):super.removeAllListeners(e),this}async stream(e,t,r,i){this.assertContextActive(),this.assertChannel(e),N(t);let n=i?.cancellationId;if(n!==void 0&&(this.assertCancellationId(n),this.streamCancellationControllers.has(n)))throw new Error(`An IPC stream already uses cancellation id '${n}'`);let a=n?new AbortController:void 0,s=()=>a?.abort(i?.signal?.reason);a&&n&&(this.streamCancellationControllers.set(n,a),i?.signal?.aborted?s():i?.signal?.addEventListener("abort",s,{once:!0}));try{return await this.enqueueTransportDispatch(()=>this.transport.sendStreamingMessage(e,t,o=>{r(o)},{signal:a?.signal??i?.signal}))}catch(o){throw this.createUserSafeIpcError("stream",e,o)}finally{i?.signal?.removeEventListener("abort",s),n&&this.streamCancellationControllers.get(n)===a&&this.streamCancellationControllers.delete(n)}}cancelStream(e){this.assertContextActive(),this.assertCancellationId(e),this.streamCancellationControllers.get(e)?.abort(new DOMException("The IPC stream was cancelled.","AbortError"))}async _wireToClient(e){e&&(this.unregisterAllNotificationListeners(),this.unregisterMessagePortControlListener(),this.transport=e,this.registerAllNotificationListeners(),this.registerMessagePortControlListener()),await this.connect(),console.log("[ipcRenderer] Wired to transport")}async connect(){if(!(this.isInitialized&&this.transport.isConnected())){if(this.initPromise){if(await this.initPromise,this.transport.isConnected())return;this.initPromise=null,this.isInitialized=!1}return this.initPromise=(async()=>{if(!this.isGlazeApp())throw new Error("Glaze ipcRenderer requires native bridge (Glaze app context)");this.transport instanceof x||(this.unregisterMessagePortControlListener(),this.transport.disconnect(),this.transport=new x,this.registerMessagePortControlListener()),this.registerMessagePortControlListener(),console.log("[ipcRenderer] Connecting via native bridge (stdio transport)"),await this.transport.connect("native"),this.isInitialized=!0})(),this.initPromise}}async ensureConnected(){(!this.isInitialized||!this.transport.isConnected())&&await this.connect()}setupMessageHandling(){this.registerAllNotificationListeners()}registerAllNotificationListeners(){for(let e of this.listenerChannels)this.registerNotificationListener(e)}registerNotificationListener(e){if(this.listenerUnsubscribers.has(e))return;let t=this.transport.onNotification(e,r=>{this.dispatchNotification(e,r)});this.listenerUnsubscribers.set(e,t)}unregisterNotificationListener(e){this.listenerUnsubscribers.get(e)?.(),this.listenerUnsubscribers.delete(e)}unregisterAllNotificationListeners(){for(let e of this.listenerUnsubscribers.values())e();this.listenerUnsubscribers.clear()}dispatchNotification(e,t){if(this.listenerCount(e)===0)return;let{args:r,ports:i}=this.unpackNotificationPayload(t),n={sender:this,ports:i,channel:e};this.emit(e,n,...r)}unpackNotificationPayload(e){let t=V(e)?e:Array.isArray(e)&&e.length===1&&V(e[0])?e[0]:null;return t?{args:t.args,ports:t.ports.map(r=>this.createTransferredRendererPort(r))}:{args:Array.isArray(e)?e:e==null?[]:[e],ports:[]}}createTransferredRendererPort(e){if(typeof MessageChannel>"u")throw new Error("MessagePort transfer requires MessageChannel support");let t=new MessageChannel,r=t.port1,i=s=>{n.closed||this.send(v,{type:"message",portId:e.id,data:s.data,...this.createRendererTransferredMessagePortsControlPayload(s.ports)})},n={bridgePort:t.port2,closed:!1,removeBridgeMessageListener:()=>{t.port2.removeEventListener("message",i)},userPort:r};n.bridgePort.addEventListener("message",i),n.bridgePort.start();let a=r.close.bind(r);return r.close=()=>{n.closed||(n.closed=!0,this.send(v,{type:"close",portId:e.id}),this.transferredRendererPorts.delete(e.id),n.removeBridgeMessageListener(),n.bridgePort.close()),a()},this.transferredRendererPorts.set(e.id,n),r}validatePostMessageTransferList(e){if(e===void 0)return[];if(!Array.isArray(e))throw new TypeError("Invalid value for transfer");if(!e.every(r=>typeof MessagePort<"u"&&r instanceof MessagePort))throw new TypeError("Invalid value for transfer");let t=new Set;for(let r of e){if(t.has(r)||this.rendererTransferredMessagePorts.has(r))throw new TypeError("Invalid value for transfer");t.add(r)}return e}createRendererTransferredMessagePortDescriptor(e){let t=`renderer-port-${++this.nextRendererTransferredPortId}`,r=a=>{i.closed||this.send(v,{type:"message",portId:t,data:a.data,...this.createRendererTransferredMessagePortsControlPayload(a.ports)})},i={bridgePort:e,closed:!1,removeBridgeMessageListener:()=>{e.removeEventListener("message",r)}};this.rendererTransferredMessagePorts.add(e),e.addEventListener("message",r),e.start();let n=e.close.bind(e);return e.close=()=>{i.closed||(i.closed=!0,this.send(v,{type:"close",portId:t}),this.transferredRendererPorts.delete(t),i.removeBridgeMessageListener()),n()},this.transferredRendererPorts.set(t,i),{id:t}}registerMessagePortControlListener(){this.messagePortControlUnsubscribe||(this.messagePortControlUnsubscribe=this.transport.onNotification(v,e=>{this.dispatchMessagePortControl(e)}))}unregisterMessagePortControlListener(){this.messagePortControlUnsubscribe?.(),this.messagePortControlUnsubscribe=null}dispatchMessagePortControl(e){let t=this.normalizeMessagePortControlMessage(e);if(!t)return;let r=this.transferredRendererPorts.get(t.portId);if(!(!r||r.closed)){if(t.type==="message"){let i=(t.ports??[]).map(n=>this.createTransferredRendererPort(n));r.bridgePort.postMessage(t.data,i);return}r.closed=!0,this.transferredRendererPorts.delete(t.portId),r.removeBridgeMessageListener(),r.bridgePort.close(),r.userPort?.close()}}normalizeMessagePortControlMessage(e){let t=Array.isArray(e)&&e.length===1?e[0]:e;if(!t||typeof t!="object")return null;let r=t;return r.type!=="message"&&r.type!=="close"||typeof r.portId!="string"||r.type==="message"&&r.ports!==void 0&&(!Array.isArray(r.ports)||!r.ports.every(re))?null:r}createRendererTransferredMessagePortsControlPayload(e){return!e||e.length===0?{}:{ports:Array.from(e,t=>this.createRendererTransferredMessagePortDescriptor(t))}}closeTransferredRendererPorts(){for(let e of this.transferredRendererPorts.values())e.closed=!0,e.removeBridgeMessageListener(),e.bridgePort.close(),e.userPort?.close();this.transferredRendererPorts.clear()}registerIPCListenerChannel(e){typeof e=="string"&&(this.listenerChannels.add(e),this.registerNotificationListener(e))}unregisterIPCListenerChannelIfEmpty(e){typeof e=="string"&&this.listenerCount(e)===0&&(this.listenerChannels.delete(e),this.unregisterNotificationListener(e))}assertChannel(e){if(typeof e!="string")throw new TypeError("Error processing argument at index 0, conversion failure")}assertCancellationId(e){if(typeof e!="string"||e.length===0||e.length>200)throw new TypeError("IPC stream cancellation id must be a non-empty string of at most 200 characters")}assertContextActive(){if(this.contextReleased)throw new Error(Te)}setupContextReleaseHandling(){typeof window>"u"||window.addEventListener("pagehide",e=>{e.persisted!==!0&&this.markContextReleased()})}markContextReleased(){this.contextReleased||(this.contextReleased=!0,this.unregisterAllNotificationListeners(),this.unregisterMessagePortControlListener(),this.closeTransferredRendererPorts(),this.transport.disconnect(),this.isInitialized=!1,this.initPromise=null)}isGlazeApp(){return!!(typeof window<"u"&&window.__GLAZE_APP__||typeof window<"u"&&window.webkit?.messageHandlers?.["glaze-ipc"]||typeof window<"u"&&window.location?.protocol==="glaze:")}isConnected(){return this.transport.isConnected()}async waitForReady(){this.assertContextActive(),await this.ensureConnected()}disconnect(){this.unregisterMessagePortControlListener(),this.closeTransferredRendererPorts(),this.transport.disconnect(),this.isInitialized=!1,this.initPromise=null}onNotification(e,t){return this.assertContextActive(),this.transport.onNotification(e,t)}_markContextReleasedForTesting(){this.markContextReleased()}_resetContextReleasedForTesting(){this.contextReleased=!1}createUserSafeIpcError(e,t,r){let i=r instanceof Error?r.message:String(r),n=r&&typeof r=="object"?r:void 0,a=typeof n?.backendStack=="string",s=this.classifyIpcFailure(i),o=(typeof n?.ipcFailureKind=="string"?n.ipcFailureKind:void 0)??(e==="invoke"&&a?void 0:s),d=e==="invoke"&&!o?this.createElectronInvokeErrorMessage(t,i):typeof n?.ipcSanitizedMessage=="string"?n.ipcSanitizedMessage:this.sanitizeErrorMessage(i,o);console.error(`[ipcRenderer] ${e} failed`,{channel:t,rawErrorMessage:i,error:r});let c=new Error(d);return c.ipcOperation=n?.ipcOperation==="send"||n?.ipcOperation==="invoke"||n?.ipcOperation==="stream"?n.ipcOperation:e,c.ipcChannel=typeof n?.ipcChannel=="string"?n.ipcChannel:t,c.ipcRawMessage=typeof n?.ipcRawMessage=="string"?n.ipcRawMessage:i,c.ipcSanitizedMessage=d,o&&(c.ipcFailureKind=o),typeof n?.ipcTimeoutMs=="number"&&(c.ipcTimeoutMs=n.ipcTimeoutMs),typeof n?.ipcAgeMs=="number"&&(c.ipcAgeMs=n.ipcAgeMs),n&&(typeof n.name=="string"&&n.name&&(c.name=n.name),(typeof n.code=="number"||typeof n.code=="string")&&(c.code=n.code),typeof n.backendStack=="string"&&(c.backendStack=n.backendStack),n.reportedToSentry===!0&&(c.reportedToSentry=!0)),c}stripLegacyIpcErrorPrefix(e){return e.trim().replace(/^IPC invoke error on\s+'[^']+':\s*/i,"")}classifyIpcFailure(e){let t=e.trim(),r=this.stripLegacyIpcErrorPrefix(e);if(!r)return"empty_message";let i=ze.find(({pattern:n})=>n.test(r)||n.test(t));if(i)return i.kind;if(Ue.test(t)&&xe.test(t))return"ipc_internal"}sanitizeErrorMessage(e,t){let r=this.stripLegacyIpcErrorPrefix(e);return!r||t?ke:r}createElectronInvokeErrorMessage(e,t){return`Error invoking remote method '${e}': ${this.stripLegacyIpcErrorPrefix(t)||"Error"}`}},l=new Ne,W=new Set(["constructor","prototype"]),Oe=Symbol.for("glaze.pageWorldFunctionSource"),De=Symbol.for("glaze.ipcRendererBridgeValue"),Be=String.raw`
() => {
  const TRANSPORT_ENVELOPE_KEY = "__glazeIPCStructuredCloneV1";
  const TYPED_ARRAY_CONSTRUCTORS = {
    Int8Array,
    Uint8Array,
    Uint8ClampedArray,
    Int16Array,
    Uint16Array,
    Int32Array,
    Uint32Array,
    Float32Array,
    Float64Array,
    BigInt64Array,
    BigUint64Array,
  };

  const createCloneError = () => new Error("An object could not be cloned.");
  const encodeNumber = (value) => Object.is(value, -0) ? "-0" : String(value);
  const decodeNumber = (value) => value === "-0" ? -0 : Number(value);
  const encodeBytes = (bytes) => {
    let binary = "";
    for (let index = 0; index < bytes.length; index += 1) {
      binary += String.fromCharCode(bytes[index]);
    }
    return btoa(binary);
  };
  const decodeBytes = (value) => {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  };
  const toStandaloneArrayBuffer = (bytes) => {
    const buffer = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(buffer).set(bytes);
    return buffer;
  };
  const isPlainObject = (value) => {
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  };
  const createEncodeState = () => ({ references: new WeakMap(), nextId: 1 });
  const createDecodeState = () => ({ references: new Map() });
  const getOrCreateReferenceId = (value, state) => {
    const existingId = state.references.get(value);
    if (existingId !== undefined) {
      return { id: existingId, alreadyEncoded: true };
    }
    const id = state.nextId;
    state.nextId += 1;
    state.references.set(value, id);
    return { id, alreadyEncoded: false };
  };
  const rememberDecodedReference = (id, value, state) => {
    if (typeof id === "number") {
      state.references.set(id, value);
    }
  };
  const encodeValue = (value, state) => {
    if (value === undefined) return { type: "Undefined" };
    if (value === null) return { type: "Null" };

    switch (typeof value) {
      case "boolean":
        return { type: "Boolean", value };
      case "string":
        return { type: "String", value };
      case "number":
        return { type: "Number", value: encodeNumber(value) };
      case "bigint":
        return { type: "BigInt", value: value.toString() };
      case "function":
      case "symbol":
        throw createCloneError();
      case "object":
        break;
      default:
        throw createCloneError();
    }

    const reference = getOrCreateReferenceId(value, state);
    if (reference.alreadyEncoded) {
      return { type: "Reference", id: reference.id };
    }

    if (Array.isArray(value)) {
      const encodedItems = [];
      for (let index = 0; index < value.length; index += 1) {
        encodedItems.push(Object.prototype.hasOwnProperty.call(value, index) ? encodeValue(value[index], state) : {
          type: "ArrayHole",
        });
      }
      return { type: "Array", id: reference.id, value: encodedItems };
    }
    if (value instanceof Date) {
      return { type: "Date", id: reference.id, value: encodeNumber(value.getTime()) };
    }
    if (value instanceof RegExp) {
      return {
        type: "RegExp",
        id: reference.id,
        source: value.source,
        flags: value.flags,
        lastIndex: encodeNumber(value.lastIndex),
      };
    }
    if (value instanceof Map) {
      return {
        type: "Map",
        id: reference.id,
        value: Array.from(value.entries(), ([key, nestedValue]) => [encodeValue(key, state), encodeValue(nestedValue, state)]),
      };
    }
    if (value instanceof Set) {
      return {
        type: "Set",
        id: reference.id,
        value: Array.from(value.values(), (nestedValue) => encodeValue(nestedValue, state)),
      };
    }
    if (value instanceof ArrayBuffer) {
      return { type: "ArrayBuffer", id: reference.id, value: encodeBytes(new Uint8Array(value)) };
    }
    if (ArrayBuffer.isView(value)) {
      const bytes = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
      if (value instanceof DataView) {
        return { type: "DataView", id: reference.id, value: encodeBytes(bytes) };
      }
      const constructorName = value.constructor.name;
      if (!(constructorName in TYPED_ARRAY_CONSTRUCTORS)) {
        throw createCloneError();
      }
      return {
        type: "TypedArray",
        id: reference.id,
        name: constructorName,
        value: encodeBytes(bytes),
      };
    }
    if (value instanceof Error) {
      return {
        type: "Error",
        id: reference.id,
        name: value.name,
        message: value.message,
        ...(typeof value.stack === "string" ? { stack: value.stack } : {}),
      };
    }
    if (!isPlainObject(value)) {
      throw createCloneError();
    }
    return {
      type: "Object",
      id: reference.id,
      value: Object.entries(value).map(([key, nestedValue]) => [key, encodeValue(nestedValue, state)]),
    };
  };
  const decodeValue = (value, state) => {
    switch (value.type) {
      case "Undefined":
        return undefined;
      case "Null":
        return null;
      case "Boolean":
      case "String":
        return value.value;
      case "Number":
        return decodeNumber(value.value);
      case "BigInt":
        return BigInt(value.value);
      case "Reference":
        if (!state.references.has(value.id)) {
          throw new Error("Invalid IPC reference id: " + value.id);
        }
        return state.references.get(value.id);
      case "Array": {
        const array = new Array(value.value.length);
        rememberDecodedReference(value.id, array, state);
        for (let index = 0; index < value.value.length; index += 1) {
          const item = value.value[index];
          if (item.type !== "ArrayHole") {
            array[index] = decodeValue(item, state);
          }
        }
        return array;
      }
      case "ArrayHole":
        return undefined;
      case "Object": {
        const object = {};
        rememberDecodedReference(value.id, object, state);
        for (const [key, nestedValue] of value.value) {
          Object.defineProperty(object, key, {
            value: decodeValue(nestedValue, state),
            writable: true,
            configurable: true,
            enumerable: true,
          });
        }
        return object;
      }
      case "Date": {
        const date = new Date(decodeNumber(value.value));
        rememberDecodedReference(value.id, date, state);
        return date;
      }
      case "RegExp": {
        const regexp = new RegExp(value.source, value.flags);
        regexp.lastIndex = decodeNumber(value.lastIndex);
        rememberDecodedReference(value.id, regexp, state);
        return regexp;
      }
      case "Map": {
        const map = new Map();
        rememberDecodedReference(value.id, map, state);
        for (const [key, nestedValue] of value.value) {
          map.set(decodeValue(key, state), decodeValue(nestedValue, state));
        }
        return map;
      }
      case "Set": {
        const set = new Set();
        rememberDecodedReference(value.id, set, state);
        for (const nestedValue of value.value) {
          set.add(decodeValue(nestedValue, state));
        }
        return set;
      }
      case "ArrayBuffer": {
        const buffer = toStandaloneArrayBuffer(decodeBytes(value.value));
        rememberDecodedReference(value.id, buffer, state);
        return buffer;
      }
      case "TypedArray": {
        const Constructor = TYPED_ARRAY_CONSTRUCTORS[value.name];
        const typedArray = new Constructor(toStandaloneArrayBuffer(decodeBytes(value.value)));
        rememberDecodedReference(value.id, typedArray, state);
        return typedArray;
      }
      case "DataView": {
        const dataView = new DataView(toStandaloneArrayBuffer(decodeBytes(value.value)));
        rememberDecodedReference(value.id, dataView, state);
        return dataView;
      }
      case "Error": {
        const error = new Error(value.message);
        error.name = value.name;
        if (typeof value.stack === "string") {
          error.stack = value.stack;
        }
        rememberDecodedReference(value.id, error, state);
        return error;
      }
    }
  };
  return {
    serialize(value) {
      return { [TRANSPORT_ENVELOPE_KEY]: encodeValue(value, createEncodeState()) };
    },
    deserialize(value) {
      if (!value || typeof value !== "object" || !(TRANSPORT_ENVELOPE_KEY in value)) {
        return value;
      }
      return decodeValue(value[TRANSPORT_ENVELOPE_KEY], createDecodeState());
    },
  };
}
`,Fe=class{constructor(){this.exposedKeysByWorld=new Set,this.executeCounter=0,this.fnCounter=0}exposeInMainWorld(e,t){this.exposeInWorld(0,e,t)}exposeInIsolatedWorld(e,t,r){if(!Number.isInteger(e)||e<0)throw new Error("contextBridge: worldId must be a non-negative integer");this.exposeInWorld(e,t,r)}executeInMainWorld(e){if(!e||typeof e!="object"||Array.isArray(e))throw new TypeError("contextBridge.executeInMainWorld expected an execution script object");if(typeof e.func!="function")throw new TypeError("contextBridge.executeInMainWorld expected executionScript.func to be a function");if(e.args!==void 0&&!Array.isArray(e.args))throw new TypeError("contextBridge.executeInMainWorld expected executionScript.args to be an array");let t=Function.prototype.toString.call(e.func);return window.webkit?.messageHandlers?.["glaze-bridge-register"]?this.executeInPageWorld(t,e.args??[]):(0,eval)(`(${t})`)(...e.args??[])}exposeInWorld(e,t,r){if(!t||typeof t!="string")throw new Error("contextBridge: apiKey must be a non-empty string");let i=`${e}:${t}`;if(this.exposedKeysByWorld.has(i))throw new Error(`contextBridge: '${t}' has already been exposed in world ${e}`);let n=window.webkit?.messageHandlers?.["glaze-bridge-register"];if(n){let a=this.buildShape(r);n.postMessage({worldId:e,apiKey:t,shape:a}),this.exposedKeysByWorld.add(i)}else{if(e!==0&&e!==999)throw new Error(`contextBridge: cannot expose '${t}' in isolated world ${e} without native bridge support`);console.warn(`[contextBridge] glaze-bridge-register not available \u2014 exposing '${t}' directly in world ${e} (no context isolation). Run /upgrade in Glaze to apply the preload migration.`),this.exposeDirectly(t,r),this.exposedKeysByWorld.add(i)}}executeInPageWorld(e,t){let r=window.document,i=r?.documentElement;if(!r||!i)throw new Error("contextBridge.executeInMainWorld requires a document in the main world");let n;try{n=JSON.stringify(D(t,"executionScript.args"))}catch(c){throw new TypeError(`contextBridge.executeInMainWorld could not serialize executionScript.args: ${c instanceof Error?c.message:String(c)}`)}let a=`data-glaze-execute-main-world-${Date.now()}-${this.executeCounter++}`,s=r.createElement("script");s.textContent=`
      (() => {
        const resultAttribute = ${JSON.stringify(a)};
        const codec = (${Be})();
        const finish = (payload) => {
          document.documentElement.setAttribute(resultAttribute, JSON.stringify(payload));
        };
        const finishError = (error) => {
          finish({
            ok: false,
            error: codec.serialize(error instanceof Error ? error : new Error(String(error))),
          });
        };
        try {
          const func = (0, eval)("(" + ${JSON.stringify(e)} + ")");
          const args = codec.deserialize(JSON.parse(${JSON.stringify(n)}));
          const value = func(...args);
          finish({ ok: true, value: codec.serialize(value) });
        } catch (error) {
          finishError(error);
        }
      })();
    `,i.appendChild(s),s.remove();let o=i.getAttribute(a);if(i.removeAttribute(a),!o)throw new Error("contextBridge.executeInMainWorld did not receive a page-world result");let d=JSON.parse(o);if(!d.ok){let c=h(d.error);throw c instanceof Error?c:new Error(String(c??"contextBridge.executeInMainWorld failed"))}return h(d.value)}buildShape(e){if(this.isBlockedBridgeValue(e))return{};if(typeof e=="function"){let r=e[Oe];if(typeof r=="string")return{type:"page-function",source:r};let i=`fn_${this.fnCounter++}`;return window.__glazePreloadBridge?.register(i,e),{type:"function",id:i}}if(e===null||typeof e!="object"||Array.isArray(e))return{type:"data",value:this.snapshotDataValue(e)};let t={};for(let[r,i]of Object.entries(e))W.has(r)||Object.defineProperty(t,r,{value:this.buildShape(i),writable:!0,configurable:!0,enumerable:!0});return t}exposeDirectly(e,t){let r=this.cloneBridgeValue(t);this.deepFreeze(r),Object.defineProperty(window,e,{value:r,writable:!1,configurable:!1,enumerable:!0})}deepFreeze(e){if(!(e===null||typeof e!="object"||Object.isFrozen(e))){Object.freeze(e);for(let t of Object.values(e))this.deepFreeze(t)}}isBlockedBridgeValue(e){return e!==null&&typeof e=="object"&&e[De]===!0}snapshotDataValue(e){return e===null||typeof e!="object"?e:structuredClone(e)}cloneBridgeValue(e,t=new WeakMap){if(this.isBlockedBridgeValue(e))return{};if(e===null||typeof e!="object"||typeof e=="function")return e;let r=e,i=t.get(r);if(i!==void 0)return i;let n=Array.isArray(e)?new Array(e.length):{};t.set(r,n);for(let[a,s]of Object.entries(r))W.has(a)||Object.defineProperty(n,a,{value:this.cloneBridgeValue(s,t),writable:!0,configurable:!0,enumerable:!0});return n}},C=new Fe;var H=Symbol.for("glaze.pageWorldFunctionSource"),ie=new WeakMap,w=[],b=[],G=!1;function K(e){return Array.isArray(e)?e.filter(t=>typeof t=="string"&&t.length>0):[]}function _e(){if(G||typeof window>"u")return;G=!0;let e=i=>{w=K(i.detail?.paths)},t=i=>{b=K(i.detail?.paths)},r=(i,n)=>{let a=Math.min(i.length,n.length);for(let s=0;s<a;s+=1){let o=i[s];o&&ie.set(o,n[s])}};window.addEventListener("__glaze-drop-committed",e,!0),window.addEventListener("__glaze-native-drop-paths",e,!0),window.addEventListener("__glaze-file-selection-committed",t,!0),window.addEventListener("drop",i=>{let n=i.dataTransfer?.files;if(!n||n.length===0||w.length===0){w=[];return}r(Array.from(n),w),w=[]},!0),window.addEventListener("change",i=>{if(b.length===0)return;let n=i.target,a=n&&typeof n=="object"&&"files"in n?n.files:null;if(!a||a.length===0){b=[];return}r(Array.from(a),b),b=[]},!0)}function je(e){if(typeof Blob>"u"||!(e instanceof Blob))throw new TypeError("getPathForFile expected to receive a File object but one was not provided");let t=ie.get(e);if(typeof t=="string")return t;let r=e.path;return typeof r=="string"?r:""}var qe=`function(file) {
  if (typeof Blob === "undefined" || !(file instanceof Blob)) {
    throw new TypeError("getPathForFile expected to receive a File object but one was not provided");
  }

  const mappedPath = window.__glazeGetDroppedFilePath?.(file);
  if (typeof mappedPath === "string") {
    return mappedPath;
  }

  return file && typeof file.path === "string" ? file.path : "";
}`;function $e(e,t){let r=e;return r[H]!==t&&Object.defineProperty(r,H,{value:t,writable:!1,configurable:!1,enumerable:!1}),e}function ne(){return _e(),{getPathForFile:$e(je,qe)}}var J=!1;function ae(){J||(J=!0,C.exposeInMainWorld("__glazeDisplayMediaBridge",{request:e=>l.invoke("displayMedia:request",e),stop:e=>{l.invoke("displayMedia:stop",e).catch(()=>{})}}),C.executeInMainWorld({func:Ve}))}function Ve(){let e=window;if(e.__glazeDisplayMedia)return;let t=navigator.mediaDevices;if(!t)return;let r=()=>e.__glazeDisplayMediaBridge??null,i=new Map;e.__glazeDisplayMedia={onFrame(s,o){let d=i.get(s);if(!d||d.busy||d.stopped||!d.context)return;d.busy=!0;let c=new Image;c.onload=()=>{d.stopped||((d.canvas.width!==c.naturalWidth||d.canvas.height!==c.naturalHeight)&&(d.canvas.width=c.naturalWidth,d.canvas.height=c.naturalHeight),d.context?.drawImage(c,0,0),d.frames+=1,d.busy=!1)},c.onerror=()=>{d.busy=!1},c.src=o},stats(){return{active:i.size,frames:Array.from(i.values()).map(s=>s.frames)}}};let n=typeof t.getDisplayMedia=="function"?t.getDisplayMedia.bind(t):null,a=s=>{if(typeof s=="number"&&Number.isFinite(s))return s;if(s&&typeof s=="object"){let o=s;if(typeof o.ideal=="number"&&Number.isFinite(o.ideal))return o.ideal;if(typeof o.max=="number"&&Number.isFinite(o.max))return o.max}};t.getDisplayMedia=async function(s){let o=s?.video===void 0?!0:s.video;if(o===!1)throw new TypeError("getDisplayMedia requires video to be requested");let d=o&&typeof o=="object"?{maxWidth:a(o.width),maxHeight:a(o.height),frameRate:a(o.frameRate)}:null,c=r(),u=c?await c.request({videoRequested:!0,audioRequested:!!s?.audio,userGesture:!!navigator.userActivation?.isActive,securityOrigin:location.origin,video:d}):null;if(!u||u.handled!==!0){if(n)return n(s);throw new DOMException("getDisplayMedia is not supported","NotSupportedError")}if(!u.granted||!u.token)throw new DOMException(u.error||"Permission denied","NotAllowedError");let L=u.token,m=document.createElement("canvas");m.width=Math.max(1,u.width??1),m.height=Math.max(1,u.height??1);let S={canvas:m,context:m.getContext("2d"),frames:0,busy:!1,stopped:!1};i.set(L,S);let ce=u.frameRate&&u.frameRate>0?u.frameRate:15,F=m.captureStream(ce),M=()=>{S.stopped||(S.stopped=!0,i.delete(L),r()?.stop(L))};for(let I of F.getTracks()){let de=I.stop.bind(I);I.stop=()=>{de(),M()},I.addEventListener("ended",M)}return window.addEventListener("pagehide",M,{once:!0}),F}}var We=ne(),B=new Map,se=null;function He(){se||(se=l.onNotification("systemPreferences:notification",e=>{let t=e,r=B.get(t.subscriptionId);if(r)try{r(t.event,t.userInfo??{},t.object??"")}catch{}}))}var oe=Symbol.for("glaze.pageWorldFunctionSource");function Ge(e,t){let r=e;return r[oe]!==t&&Object.defineProperty(r,oe,{value:t,writable:!1,configurable:!1,enumerable:!1}),e}var Ke=`function() {
  void window.glazeAPI.glaze.ipc.invoke("shell:beep").catch(() => {});
  return undefined;
}`;function Je(e){return{channel:e.channel,ports:[]}}function le(e,t,r){let i=(n,...a)=>{t(Je(n),...a)};return r?l.once(e,i):l.on(e,i),()=>{l.removeListener(e,i)}}var Ye={dialog:{showOpenDialog:e=>l.invoke("dialog:showOpenDialog",e),showSaveDialog:e=>l.invoke("dialog:showSaveDialog",e),showMessageBox:e=>l.invoke("dialog:showMessageBox",e),showErrorBox:(e,t)=>l.invoke("dialog:showErrorBox",e,t),showDatePicker:e=>l.invoke("dialog:showDatePicker",e)},shell:{beep:Ge(function(){l.invoke("shell:beep").catch(()=>{})},Ke),beepAsync:()=>l.invoke("shell:beep")},webUtils:We,nativeTheme:{getInfo:()=>l.invoke("nativeTheme:getInfo"),setThemeSource:e=>l.invoke("nativeTheme:setThemeSource",e),getShouldUseDarkColors:()=>l.invoke("nativeTheme:getShouldUseDarkColors"),getThemeSource:()=>l.invoke("nativeTheme:getThemeSource")},systemPreferences:{getMediaAccessStatus:e=>l.invoke("systemPreferences:getMediaAccessStatus",e),askForMediaAccess:e=>l.invoke("systemPreferences:askForMediaAccess",e),requestScreenCaptureAccess:()=>l.invoke("systemPreferences:requestScreenCaptureAccess"),getAuthorizationStatus:e=>l.invoke("systemPreferences:getAuthorizationStatus",e),getPreferredScrollerStyle:()=>l.invoke("systemPreferences:getPreferredScrollerStyle"),subscribeLocalNotification:async(e,t)=>{He();let r=await l.invoke("systemPreferences:subscribeLocalNotification",e);return B.set(r,t),r},unsubscribeLocalNotification:async e=>{await l.invoke("systemPreferences:unsubscribeLocalNotification",e),B.delete(e)}},location:{getCurrentPosition:e=>l.invoke("location:getCurrentPosition",e)},permissions:{getDiagnostics:()=>l.invoke("glaze:permissions:getDiagnostics")},Menu:{popup:e=>l.invoke("Menu:popup",e),setApplicationMenu:e=>l.invoke("Menu:setApplicationMenu",e)},glaze:{ipc:{invoke:(e,...t)=>l.invoke(e,...t),send:(e,...t)=>l.send(e,...t),on:(e,t)=>le(e,t,!1),once:(e,t)=>le(e,t,!0),stream:(e,t,r,i)=>l.stream(e,t,r,i),cancelStream:e=>l.cancelStream(e),onNotification:(e,t)=>l.onNotification(e,t),isConnected:()=>l.isConnected(),waitForReady:()=>l.waitForReady(),disconnect:()=>l.disconnect()}}},dt=new URL(window.location.href);function Qe(){C.exposeInMainWorld("glazeAPI",Ye)}Qe();ae();})();
