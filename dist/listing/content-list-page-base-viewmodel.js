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

var _urlUtilities = require('url-utilities');

var _urlUtilities2 = _interopRequireDefault(_urlUtilities);

var _router = require('router');

var _router2 = _interopRequireDefault(_router);

var _query = require('query');

var _query2 = _interopRequireDefault(_query);

var _objectUtilities = require('object-utilities');

var _objectUtilities2 = _interopRequireDefault(_objectUtilities);

var _stringUtilities = require('string-utilities');

var _stringUtilities2 = _interopRequireDefault(_stringUtilities);

var _mappingUtilities = require('mapping-utilities');

var _mappingUtilities2 = _interopRequireDefault(_mappingUtilities);

var _disposer = require('disposer');

var _disposer2 = _interopRequireDefault(_disposer);

var _listBaseViewmodel = require('list-base-viewmodel');

var _listBaseViewmodel2 = _interopRequireDefault(_listBaseViewmodel);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var ContentListPageBaseViewModel = function ContentListPageBaseViewModel(api, apiResourceName, settings) {
    var self = this;

    self.skipUpdateUrlOneTime = false;
    self.isSorting = _knockout2.default.observable(false);
    self.title = _knockout2.default.observable('');
    self.returnUrl = _knockout2.default.observable('');
    self.returnTitle = _knockout2.default.observable('');

    _listBaseViewmodel2.default.call(self, api, apiResourceName, settings);

    self.returnToQueryString = _knockout2.default.observable('');

    self.creationFormUrl = _knockout2.default.pureComputed(function () {
        //Attention - ceci est une convention!
        return _urlUtilities2.default.url(apiResourceName + '/edit?' + self.returnToQueryString());
    });
    self.disposer.add(self.creationFormUrl);

    return self;
}; // Copyright (c) CBC/Radio-Canada. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

ContentListPageBaseViewModel.prototype = Object.create(_listBaseViewmodel2.default.prototype);
ContentListPageBaseViewModel.prototype.contructor = ContentListPageBaseViewModel;

//todo: rename async here & inside router
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
    var args = _mappingUtilities2.default.toJS(self.searchArguments);
    var cleanedArguments = _objectUtilities2.default.pickNonFalsy(args);
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

    return _listBaseViewmodel2.default.prototype.onSearchSuccess.call(self, searchResult);
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

    return _listBaseViewmodel2.default.prototype.goToNextPage.call(self).always(function () {
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
        return _urlUtilities2.default.url(self.apiResourceName + '/edit/' + item.id + '?' + self.returnToQueryString());
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
            var currentQueryParams = new _query2.default(self.route.url).params;
            if (currentQueryParams && !_lodash2.default.isEmpty(currentQueryParams)) {

                if (self.settings.pageable) {
                    updatePagingInfoFromQueryParams(self, currentQueryParams);
                }

                self.deserializeSearchArguments(currentQueryParams).then(function (deserializedSearchArguments) {
                    var searchArguments = _objectUtilities2.default.pickInBoth(deserializedSearchArguments.params, self.settings.defaultSearchArguments);

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

    pagingArguments = _jquery2.default.extend({}, pagingArguments, _objectUtilities2.default.pickInBoth(queryParams, pagingArguments));
    self.pagingArguments(pagingArguments);
}

ContentListPageBaseViewModel.prototype.updateUrlWithSearchArguments = function () {
    var self = this;

    _router2.default.setUrlSilently({
        url: self.getUrlWithUpdatedQueryString(),
        replace: true
    });
};

ContentListPageBaseViewModel.prototype.getUrlWithUpdatedQueryString = function () {
    var self = this;

    var route = !_router2.default.isActivating() && _router2.default.viewModel() ? _router2.default.viewModel().route : self.route;
    var routeUrl = route.url;
    var currentQuery = new _query2.default(route.url);
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