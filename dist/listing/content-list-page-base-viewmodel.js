(function (global, factory) {
  if (typeof define === "function" && define.amd) {
    define(['exports', 'knockout', 'jquery', 'lodash', 'koco-url-utilities', 'koco', 'koco-query', 'koco-object-utilities', 'koco-mapping-utilities', 'koco-list-base-viewmodel'], factory);
  } else if (typeof exports !== "undefined") {
    factory(exports, require('knockout'), require('jquery'), require('lodash'), require('koco-url-utilities'), require('koco'), require('koco-query'), require('koco-object-utilities'), require('koco-mapping-utilities'), require('koco-list-base-viewmodel'));
  } else {
    var mod = {
      exports: {}
    };
    factory(mod.exports, global.knockout, global.jquery, global.lodash, global.kocoUrlUtilities, global.koco, global.kocoQuery, global.kocoObjectUtilities, global.kocoMappingUtilities, global.kocoListBaseViewmodel);
    global.contentListPageBaseViewmodel = mod.exports;
  }
})(this, function (exports, _knockout, _jquery, _lodash, _kocoUrlUtilities, _koco, _kocoQuery, _kocoObjectUtilities, _kocoMappingUtilities, _kocoListBaseViewmodel) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });

  var _knockout2 = _interopRequireDefault(_knockout);

  var _jquery2 = _interopRequireDefault(_jquery);

  var _lodash2 = _interopRequireDefault(_lodash);

  var _kocoUrlUtilities2 = _interopRequireDefault(_kocoUrlUtilities);

  var _koco2 = _interopRequireDefault(_koco);

  var _kocoQuery2 = _interopRequireDefault(_kocoQuery);

  var _kocoObjectUtilities2 = _interopRequireDefault(_kocoObjectUtilities);

  var _kocoMappingUtilities2 = _interopRequireDefault(_kocoMappingUtilities);

  var _kocoListBaseViewmodel2 = _interopRequireDefault(_kocoListBaseViewmodel);

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
      default: obj
    };
  }

  var ContentListPageBaseViewModel = function ContentListPageBaseViewModel(context, componentInfo, api, apiResourceName, settings) {
    var self = this;

    self.skipUpdateUrlOneTime = false;
    self.isSorting = _knockout2.default.observable(false);
    self.title = _knockout2.default.observable('');
    self.returnUrl = _knockout2.default.observable('');
    self.returnTitle = _knockout2.default.observable('');

    this.route = context.route;

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

  function updatePagingInfoFromQueryParams(self, queryParams) {
    var pagingArguments = self.pagingArguments();

    pagingArguments = _jquery2.default.extend({}, pagingArguments, _kocoObjectUtilities2.default.pickInBoth(queryParams, pagingArguments));
    self.pagingArguments(pagingArguments);
  }

  ContentListPageBaseViewModel.prototype = Object.create(_kocoListBaseViewmodel2.default.prototype);
  ContentListPageBaseViewModel.prototype.contructor = ContentListPageBaseViewModel;

  // todo: rename async here & inside koco.router
  ContentListPageBaseViewModel.prototype.activate = function () {
    var _this = this;

    return this.loadLookups().then(function () {
      _this.skipUpdateUrlOneTime = true;
    }).then(function () {
      return _this.initSearchArgumentsAndPagingInfo();
    }).then(function () {
      return _this.searchWithFilters();
    }).catch(function (ex) {
      _this.handleUnknownError(ex);
      throw ex;
    });
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

    var promise = _kocoListBaseViewmodel2.default.prototype.goToNextPage.call(self);

    promise.catch(function (ex) {}).then(function () {
      self.isPaging(false);
    });

    return promise;
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
    return Promise.resolve();
  };

  //todo: rename async
  ContentListPageBaseViewModel.prototype.deserializeSearchArguments = function (serializedSearchArguments) {
    return Promise.resolve(serializedSearchArguments);
  };

  //todo: rename async
  ContentListPageBaseViewModel.prototype.initSearchArgumentsAndPagingInfo = function () {
    var _this2 = this;

    var currentQueryParams = new _kocoQuery2.default(this.route.url).params;

    if (currentQueryParams && !_lodash2.default.isEmpty(currentQueryParams)) {
      if (this.settings.pageable) {
        updatePagingInfoFromQueryParams(this, currentQueryParams);
      }

      return this.deserializeSearchArguments(currentQueryParams).then(function (deserializedSearchArguments) {
        var searchArguments = _kocoObjectUtilities2.default.pickInBoth(deserializedSearchArguments.params, _this2.settings.defaultSearchArguments);
        _knockout2.default.mapping.fromJS(searchArguments, _this2.searchArguments);
      });
    }

    return Promise.resolve();
  };

  ContentListPageBaseViewModel.prototype.updateUrlWithSearchArguments = function () {
    var self = this;

    _koco2.default.router.setUrlSilently({
      url: self.getUrlWithUpdatedQueryString(),
      replace: true
    });
  };

  ContentListPageBaseViewModel.prototype.getUrlWithUpdatedQueryString = function () {
    var self = this;

    var route = !_koco2.default.router.isActivating() && _koco2.default.router.context() ? _koco2.default.router.context().route : self.route;
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
});