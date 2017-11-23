'use strict';

var paccServices = angular.module('paccServices');

/**
 * Service that enables forwarding the sound of the PulseAudio source to the 
 * Chromecast by opening a WebRTC connection.
 */
paccServices.service('WebRTC', function($rootScope, PAConnector, CCConnector) {
    /// CONSTANTS
    var self = this;

    /// Global variables 

    /**
     * Represents a WebRTC connection. Everytime a reset message is received 
     * from the Chromecast a new instance of this class is created and the
     * WebRTC connection on the old one is closed.
     */
    var WebRTCConnection = function() {
        var self = this;

        /// CONSTANTS
        var configuration = {};


        /// Public API.

        /**
         * Closes the WebRTC connection.
         */
        this.close = function() {
            pc.close();
        };


        var pc = new RTCPeerConnection(configuration);

        // Listens for local ICE candidates and forwards them to the Chromecast.
        pc.onicecandidate = function(event) {
            if (event.candidate) {
                CCConnector.sendLocalIceCandidate(event.candidate);
            }
        };

        // Listens for renegotiation requests from the WebRTC framework. A new
        // session description is created and sent to the Chromecast.
        pc.onnegotiationneeded = function() {
            pc.createOffer()
                .then(description => pc.setLocalDescription(description))
                .then(() => CCConnector.sendLocalSessionDescription(
                    pc.localDescription))
                .catch(console.error);
        };

        // Listens for stream changes from the PAConnector. It re-fetches the PA
        // stream and adjusts it if it changed (this callback is also issued if
        // something changed on a for us uninterresting device).
        PAConnector.ondevicechange = function() {
            fetchPAStream();
        };

        // Listens for session descriptions from the Chromecast.
        CCConnector.onremotesessiondescription = function(description) {
            // Sets the remote description.
            pc.setRemoteDescription(description)
                .catch(e => console.error('setRemoteDescription: ' + e));
        };
        // Listens for ICE candidates from the Chromecast.
        CCConnector.onremoteicecandidate = function(candidate) {
            pc.addIceCandidate(candidate)
                .catch(e => console.error('addIceCandidate: ' + e));
        };

        /**
         * Gets the PulseAudio stream and attaches it to the WebRTC connection.
         * If the stream is already attached, this function is a noop.
         */
        function fetchPAStream() {
            // Reloads the stream.
            PAConnector.getStream().then(stream => {
                var streams = pc.getLocalStreams();
                if (streams.length === 1 && streams[0] === stream) {
                    // Nothing changed for us.
                    return;
                }

                // Removes the old tracks.
                pc.getSenders().forEach(trackSender => pc.removeTrack(trackSender));

                // Adds the new tracks.
                if (stream) {
                    stream.getTracks().forEach(track => pc.addTrack(track, stream));
                }
            })
            .catch(e => console.error('getStream: ' + e));
        }
        fetchPAStream();
    };

    // Stores the current WebRTC connection.
    var webrtcConnection = new WebRTCConnection();

    // Listens for reset messages from the Chromecast and resets the
    // webrtcConnection.
    CCConnector.onreset = function() {
        if (webrtcConnection) {
            // Closes the WebRTC connection on the old handler.
            webrtcConnection.close();
        }
        webrtcConnection = new WebRTCConnection();
    };

}).run(function(WebRTC) {});
