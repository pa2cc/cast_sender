'use strict';

var paccControllers = angular.module('paccControllers');

paccControllers.controller('PACCCtrl', function($scope, CCConnector, PAConnector) {
    $scope.CCConnector = CCConnector;
    $scope.PAConnector = PAConnector;
});
