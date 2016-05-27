'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _knockout = require('knockout');

var _knockout2 = _interopRequireDefault(_knockout);

var _jquery = require('jquery');

var _jquery2 = _interopRequireDefault(_jquery);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _kocoUrlUtilities = require('koco-url-utilities');

var _kocoUrlUtilities2 = _interopRequireDefault(_kocoUrlUtilities);

var _koco = require('koco');

var _koco2 = _interopRequireDefault(_koco);

var _kocoQuery = require('koco-query');

var _kocoQuery2 = _interopRequireDefault(_kocoQuery);

var _kocoObjectUtilities = require('koco-object-utilities');

var _kocoObjectUtilities2 = _interopRequireDefault(_kocoObjectUtilities);

var _kocoStringUtilities = require('koco-string-utilities');

var _kocoStringUtilities2 = _interopRequireDefault(_kocoStringUtilities);

var _kocoMappingUtilities = require('koco-mapping-utilities');

var _kocoMappingUtilities2 = _interopRequireDefault(_kocoMappingUtilities);

var _kocoDisposer = require('koco-disposer');

var _kocoDisposer2 = _interopRequireDefault(_kocoDisposer);

var _kocoListBaseViewmodel = require('koco-list-base-viewmodel');

var _kocoListBaseViewmodel2 = _interopRequireDefault(_kocoListBaseViewmodel);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var ContentListPageBaseViewModel = function ContentListPageBaseViewModel(api, apiResourceName, settings) {
    var self = this;

    self.skipUpdateUrlOneTime = false;
    self.isSorting = _knockout2.default.observable(false);
    self.title = _knockout2.default.observable('');
    self.returnUrl = _knockout2.default.observable('');
    self.returnTitle = _knockout2.default.observable('');

    _kocoListBaseViewmodel2.default.call(self, api, apiResourceName, settings);

    self.returnToQueryString = _knockout2.default.observable('');

    self.creationFormUrl = _knockout2.default.pureComputed(function () {
        //Attention - ceci est une convention!
        return _kocoUrlUtilities2.default.url(apiResourceName + '/edit?' + self.returnToQueryString());
    });
    self.disposer.add(self.creationFormUrl);

    return self;
}; // Copyright (c) CBC/Radio-Canada. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

ContentListPageBaseViewModel.prototype = Object.create(_kocoListBaseViewmodel2.default.prototype);
ContentListPageBaseViewModel.prototype.contructor = ContentListPageBaseViewModel;

//todo: rename async here & inside koco.router
ContentListPageBaseViewModel.prototype.activate = function () {
    var self = this;

    return new _jquery2.default.Deferred(function (dfd) {
        try {
            self.loadLookups().then(function () {
                self.skipUpdateUrlOneTime = true;

                return self.initSearchArgumentsAndPagingInfo().then(function () {
                    return self.searchWithFilters();
                });
            }).then(function () {
                dfd.resolve();
            }).fail(function (jqXHR, textStatus, errorThrown) {
                if (jqXHR.status === 404 || errorThrown === 'Not Found') {
                    dfd.reject(404);
                } else {
                    //TODO: Handle better
                    self.handleUnknownError(jqXHR, textStatus, errorThrown);
                    dfd.reject(errorThrown);
                }
            });
        } catch (err) {
            dfd.reject(err);
        }
    }).promise();
};

ContentListPageBaseViewModel.prototype.getCurrentQueryString = function () {
    var self = this;
    var args = _kocoMappingUtilities2.default.toJS(self.searchArguments);
    var cleanedArguments = _kocoObjectUtilities2.default.pickNonFalsy(args);
    delete cleanedArguments[this.settings.defaultPagingAttr.pageNumber];

    return _jquery2.default.param(cleanedArguments);
};

//todo: rename async
ContentListPageBaseViewModel.prototype.onSearchSuccess = function (searchResult) {
    var self = this;

    if (self.settings.pageable) {
        self.updatePagingInfo(searchResult);
    }

    if (self.skipUpdateUrlOneTime === false) {
        self.updateUrlWithSearchArguments();
    }

    self.skipUpdateUrlOneTime = false;

    self.updateReturnToQueryString();

    return _kocoListBaseViewmodel2.default.prototype.onSearchSuccess.call(self, searchResult);
};

ContentListPageBaseViewModel.prototype.updateReturnToQueryString = function () {
    var self = this;

    var queryParams = {
        returnTo: self.getUrlWithUpdatedQueryString()
    };

    self.returnToQueryString(_jquery2.default.param(queryParams));
};

//todo: rename async
ContentListPageBaseViewModel.prototype.searchByKeywords = function () {
    var self = this;

    return self.searchWithFilters();
};

//todo: rename async
ContentListPageBaseViewModel.prototype.goToNextPage = function () {
    var self = this;

    return _kocoListBaseViewmodel2.default.prototype.goToNextPage.call(self).always(function () {
        self.isPaging(false);
    });
};

ContentListPageBaseViewModel.prototype.addPropertiesToSearchResultItem = function (item) {
    var self = this;

    self.addEditingFormUrlToSearchResultItem(item);
};

ContentListPageBaseViewModel.prototype.addEditingFormUrlToSearchResultItem = function (item) {
    var self = this;

    item.editingFormUrl = _knockout2.default.pureComputed(function () {
        //Attention - on utilise les conventions
        return _kocoUrlUtilities2.default.url(self.apiResourceName + '/edit/' + item.id + '?' + self.returnToQueryString());
    });
};

//todo: rename async
ContentListPageBaseViewModel.prototype.loadLookups = function () {
    return _jquery2.default.Deferred().resolve().promise();
};

//todo: rename async
ContentListPageBaseViewModel.prototype.deserializeSearchArguments = function (serializedSearchArguments) {
    return new _jquery2.default.Deferred(function (dfd) {
        dfd.resolve(serializedSearchArguments);
    }).promise();
};

//todo: rename async
ContentListPageBaseViewModel.prototype.initSearchArgumentsAndPagingInfo = function () {
    var self = this;

    return new _jquery2.default.Deferred(function (dfd) {
        try {
            var currentQueryParams = new _kocoQuery2.default(self.route.url).params;
            if (currentQueryParams && !_lodash2.default.isEmpty(currentQueryParams)) {

                if (self.settings.pageable) {
                    updatePagingInfoFromQueryParams(self, currentQueryParams);
                }

                self.deserializeSearchArguments(currentQueryParams).then(function (deserializedSearchArguments) {
                    var searchArguments = _kocoObjectUtilities2.default.pickInBoth(deserializedSearchArguments.params, self.settings.defaultSearchArguments);

                    _knockout2.default.mapping.fromJS(searchArguments, self.searchArguments);

                    dfd.resolve();
                });
            } else {
                dfd.resolve();
            }
        } catch (err) {
            dfd.reject(err);
        }
    }).promise();
};

function updatePagingInfoFromQueryParams(self, queryParams) {
    var pagingArguments = self.pagingArguments();

    pagingArguments = _jquery2.default.extend({}, pagingArguments, _kocoObjectUtilities2.default.pickInBoth(queryParams, pagingArguments));
    self.pagingArguments(pagingArguments);
}

ContentListPageBaseViewModel.prototype.updateUrlWithSearchArguments = function () {
    var self = this;

    _koco2.default.router.setUrlSilently({
        url: self.getUrlWithUpdatedQueryString(),
        replace: true
    });
};

ContentListPageBaseViewModel.prototype.getUrlWithUpdatedQueryString = function () {
    var self = this;

    var route = !_koco2.default.router.isActivating() && _koco2.default.router.viewModel() ? _koco2.default.router.viewModel().route : self.route;
    var routeUrl = route.url;
    var currentQuery = new _kocoQuery2.default(route.url);
    var currentQueryString = currentQuery.toString();
    var newQueryString = self.getCurrentQueryString();

    var result;

    if (currentQueryString) {
        result = routeUrl.replace(currentQueryString, newQueryString);
    } else {
        result = routeUrl + '?' + newQueryString;
    }

    if (result.charAt(result.length - 1) === '?') {
        result = result.slice(0, -1);
    }

    return result;
};

exports.default = ContentListPageBaseViewModel;