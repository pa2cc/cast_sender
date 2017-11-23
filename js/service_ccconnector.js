'use strict';

var paccServices = angular.module('paccServices');

/**
 * Service that enables the communication with the Chromecast.
 */
paccServices.service('CCConnector', function($rootScope) {
    /// CONSTANTS
    var self = this;
    
    /**
     * Message namespace for the message channel (synced with cast_receiver).
     */
    var MESSAGE_NAMESPACE = 'urn:x-cast:ch.gorrion.pacc';

    /**
     * Message types (synced with cast_receiver).
     */
    var MSG_TYPE_RESET = 'reset';
    var MSG_TYPE_ICE_CANDIDATE = 'iceCandidate';
    var MSG_TYPE_SESSION_DESCRIPTION = 'sessionDescription';

    /**
     * Application ID
     */
    var APPLICATION_ID = 'BBD69F9A';


    /// Global variables

    /**
     * Current session object.
     * @type {chrome.cast.Session}
     */
    var session = null;

    /**
     * Messages that are to be delivered as soon as a session is started.
     * @type {Object[]}
     */
    var pendingMessages = [];


    /// Public API.
    
    /**
     * Callbacks for message handlers.
     */
    this.onreset = null;
    this.onremotesessiondescription = null;
    this.onremoteicecandidate = null;
    
    /**
     * Returns whether a cast session is started.
     * @return {boolean}
     */
    this.isConnected = function() {
        return session != null;
    }

    /**
     * Sends the local session description to the Chromecast.
     * @param {RTCSessionDescription} description
     */
    this.sendLocalSessionDescription = function(description) {
        sendMessage(MSG_TYPE_SESSION_DESCRIPTION, description);
    };

    /**
     * Sends a local ICE candidate to the Chromecast.
     * @param {RTCIceCandidate} candidate
     */
    this.sendLocalIceCandidate = function(candidate) {
        sendMessage(MSG_TYPE_ICE_CANDIDATE, candidate);
    };

    
    /// Functions.

    /**
     * Initializes the cast API.
     *
     * Sets the Chromecast properties and adds handlers for session changes.
     */
    function initializeCastApi() {
        var context = cast.framework.CastContext.getInstance();

        context.setOptions({
            receiverApplicationId: APPLICATION_ID,
            autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED,
            resumeSavedSession: true
        });

        context.addEventListener(
            cast.framework.CastContextEventType.SESSION_STATE_CHANGED, (event) => {
                switch (event.sessionState) {
                    case cast.framework.SessionState.SESSION_STARTED:
                        onSessionStarted(event.session);
                        break;

                    case cast.framework.SessionState.SESSION_RESUMED:
                        onSessionUpdated(event.session);
                        break;
                    case cast.framework.SessionState.SESSION_ENDED:
                        onSessionEnded(event.session);
                        break;
                }
            });
    }


    /**
     * Sets the current cast session. This is done in the angularjs $rootScope
     * to allow any bindings to update.
     * @param {chrome.cast.session} sess
     */
    function setSession(sess) {
        $rootScope.$apply(() => {
            session = sess;
        });
    }

    /**
     * Session listener callback. Gets called when a session is started.
     * @param {chrome.cast.Session} session - The new session.
     */
    function onSessionStarted(sess) {
        console.log('New session: ' + sess.getSessionId());
        onSession(sess);
    }

    /**
     * Session update callback. Gets called when the session has changed.
     * @param {chrome.cast.Session} session - The updated session.
     */
    function onSessionUpdated(sess) {
        console.log('Session updated: ' + sess.getSessionId());
        onSession(sess);
    }

    /**
     * Attaches us to a new or updated session.
     * @param {chrome.cast.Session} session - The session.
     */
    function onSession(sess) {
        setSession(sess);

        session.addMessageListener(MESSAGE_NAMESPACE, onReceiveMessage);
        sendPendingMessages();
    }

    /**
     * Session end callback. Gets called when the session has ended.
     * @param {chrome.cast.Session} session - The old session.
     */
    function onSessionEnded(sess) {
        console.log('Session closed: ' + sess.getSessionId());
        setSession(null);
    }

    /**
     * Callback that gets called when the Chromecast sends a message to us.
     * It is then forwarded to the listener.
     * @param {string} namespace - The namespace
     * @param {string} message - The message
     */
    function onReceiveMessage(namespace, message) {
        if (namespace != MESSAGE_NAMESPACE) {
            return;
        }
        
        message = JSON.parse(message);
        switch (message.type) {
            case MSG_TYPE_RESET:
                if (self.onreset) {
                    self.onreset();
                }
                break;

            case MSG_TYPE_SESSION_DESCRIPTION:
                if (self.onremotesessiondescription) {
                    self.onremotesessiondescription(message.data);
                }
                break;

            case MSG_TYPE_ICE_CANDIDATE:
                if (self.onremoteicecandidate) {
                    self.onremoteicecandidate(message.data);
                }
                break;

            default:
                console.error('Unknown message type: ' + message.type);
        };
    }

    /**
     * Sends the given message to the Chromecast.
     * @param {String} type - The message type
     * @param {Object} data - The message data
     */
    function sendMessage(type, data) {
        var message = {
            type: type,
            data: data,
        };

        if (self.isConnected()) {
            session.sendMessage(MESSAGE_NAMESPACE, message)
                .catch(e => console.error('sendMessage: ' + e));
        } else {
            pendingMessages.push(message);
        }
    }
    
    /**
     * Sends all pending messages.
     */
    function sendPendingMessages() {
        while (pendingMessages.length > 0) {
            var message = pendingMessages.pop();
            sendMessage(message.type, message.data);
        }
    }

    
    /// Initialization code.
    window['__onGCastApiAvailable'] = function(isAvailable) {
        if (isAvailable) {
            initializeCastApi();
        }
    }
}).run(function(CCConnector) {});
