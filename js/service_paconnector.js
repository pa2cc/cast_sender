'use strict';

var paccServices = angular.module('paccServices');

/**
 * Service that enables the communication with the PulseAudio source device by 
 * opening a stream to it.
 */
paccServices.service('PAConnector', function($rootScope) {
    /// CONSTANTS
    var self = this;

    /**
     * The url to the PA websocket endpoint.
     */
    var PACC_SOURCE_NAME = 'PACC';

    /// Global variables
    var device = null;
    var stream = null;


    /// Public API.
    
    /**
     * Returns whether the websocket is connected.
     * @return {boolean}
     */
    this.isConnected = function() {
        return stream != null;
    }

    /**
     * Searches for the PACC source in the list of available devices. If it is
     * found, a stream is fetched and returned.
     *
     * @return {Promise} - The promise which eventually resolves to the stream.
     */
    this.getStream = function() {
        return navigator.mediaDevices.enumerateDevices().then(deviceInfos => {
            var device = deviceInfos.find(
                d => d.kind === 'audioinput' &&
                d.label.indexOf(PACC_SOURCE_NAME) != -1);

            var newDeviceId = device ? device.deviceId : '';
            var oldDeviceId = self.device ? self.device.deviceId : '';

            if (newDeviceId == oldDeviceId && stream) {
                // This stream is already fetched.
                return Promise.resolve(stream)
            }

            self.device = device;
            setStream(null);

            return device
                ? fetchStreamForDevice(device)
                : Promise.reject("Device not found.");
        });
    }


    /// Event listeners.

    /**
     * Callback that handles mediaDeivce changes.
     * @callback
     */
    this.ondevicechange = null;


    /**
     * Fetches the stream for a given audio device.
     * @param {MediaDeviceInfo} device
     */
    function fetchStreamForDevice(device) {
        var constraints = {
            audio: {
                deviceId: { exact: device.deviceId },

                autoGainControl: false,
                echoCancellation: false,
                noiseSuppression: false,
            },
            video: false,
        };

        return navigator.mediaDevices.getUserMedia(constraints).then(stream => {
            setStream(stream);

            return Promise.resolve(stream);
        });
    }

    /**
     * Sets the attached MediaStream. This is done in the angularjs $rootScope
     * to allow any bindings to update (isConnected depends on this value).
     * @param {s} MediaStream
     */
    function setStream(s) {
        $rootScope.$apply(() => {
            stream = s;
        });
    }

    // Listens for device changes.
    navigator.mediaDevices.ondevicechange = event => {
        if (self.ondevicechange) {
            self.ondevicechange();
        }
    };

}).run(function(PAConnector) {});
