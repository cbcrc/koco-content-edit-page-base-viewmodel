// Copyright (c) CBC/Radio-Canada. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

import ko from 'knockout';
import $ from 'jquery';
import _ from 'lodash';
import urlUtilities from 'koco-url-utilities';
import koco from 'koco';
import Query from 'koco-query';
import objectUtilities from 'koco-object-utilities';
import mappingUtilities from 'koco-mapping-utilities';
import ListBaseViewModel from 'koco-list-base-viewmodel';

var ContentListPageBaseViewModel = function(api, apiResourceName, settings) {
  var self = this;

  self.skipUpdateUrlOneTime = false;
  self.isSorting = ko.observable(false);
  self.title = ko.observable('');
  self.returnUrl = ko.observable('');
  self.returnTitle = ko.observable('');

  ListBaseViewModel.call(self, api, apiResourceName, settings);

  self.returnToQueryString = ko.observable('');

  self.creationFormUrl = ko.pureComputed(function() {
    //Attention - ceci est une convention!
    return urlUtilities.url(apiResourceName + '/edit?' + self.returnToQueryString());
  });
  self.disposer.add(self.creationFormUrl);

  return self;
};

function updatePagingInfoFromQueryParams(self, queryParams) {
  let pagingArguments = self.pagingArguments();

  pagingArguments = $.extend({}, pagingArguments, objectUtilities.pickInBoth(queryParams, pagingArguments));
  self.pagingArguments(pagingArguments);
}

ContentListPageBaseViewModel.prototype = Object.create(ListBaseViewModel.prototype);
ContentListPageBaseViewModel.prototype.contructor = ContentListPageBaseViewModel;

// todo: rename async here & inside koco.router
ContentListPageBaseViewModel.prototype.activate = function() {
  return this.loadLookups()
    .then(() => {
      this.skipUpdateUrlOneTime = true;
    })
    .then(() => this.initSearchArgumentsAndPagingInfo())
    .then(() => this.searchWithFilters())
    .catch((ex) => {
      this.handleUnknownError(ex);
      throw ex;
    });
};

ContentListPageBaseViewModel.prototype.getCurrentQueryString = function() {
  var self = this;
  var args = mappingUtilities.toJS(self.searchArguments);
  var cleanedArguments = objectUtilities.pickNonFalsy(args);
  delete cleanedArguments[this.settings.defaultPagingAttr.pageNumber];

  return $.param(cleanedArguments);
};

//todo: rename async
ContentListPageBaseViewModel.prototype.onSearchSuccess = function(searchResult) {
  var self = this;

  if (self.settings.pageable) {
    self.updatePagingInfo(searchResult);
  }

  if (self.skipUpdateUrlOneTime === false) {
    self.updateUrlWithSearchArguments();
  }

  self.skipUpdateUrlOneTime = false;

  self.updateReturnToQueryString();

  return ListBaseViewModel.prototype.onSearchSuccess.call(self, searchResult);
};

ContentListPageBaseViewModel.prototype.updateReturnToQueryString = function() {
  var self = this;

  var queryParams = {
    returnTo: self.getUrlWithUpdatedQueryString()
  };

  self.returnToQueryString($.param(queryParams));
};

//todo: rename async
ContentListPageBaseViewModel.prototype.searchByKeywords = function() {
  var self = this;

  return self.searchWithFilters();
};

//todo: rename async
ContentListPageBaseViewModel.prototype.goToNextPage = function() {
  var self = this;

  var promise = ListBaseViewModel.prototype.goToNextPage.call(self);

  promise
    .catch(ex => {})
    .then(() => {
      self.isPaging(false);
    });

  return promise;
};

ContentListPageBaseViewModel.prototype.addPropertiesToSearchResultItem = function(item) {
  var self = this;

  self.addEditingFormUrlToSearchResultItem(item);
};

ContentListPageBaseViewModel.prototype.addEditingFormUrlToSearchResultItem = function(item) {
  var self = this;

  item.editingFormUrl = ko.pureComputed(function() {
    //Attention - on utilise les conventions
    return urlUtilities.url(self.apiResourceName + '/edit/' + item.id + '?' + self.returnToQueryString());
  });
};

//todo: rename async
ContentListPageBaseViewModel.prototype.loadLookups = function() {
  return Promise.resolve();
};

//todo: rename async
ContentListPageBaseViewModel.prototype.deserializeSearchArguments = function(serializedSearchArguments) {
  return Promise.resolve(serializedSearchArguments);
};

//todo: rename async
ContentListPageBaseViewModel.prototype.initSearchArgumentsAndPagingInfo = function() {
  const currentQueryParams = new Query(this.route.url).params;

  if (currentQueryParams && !_.isEmpty(currentQueryParams)) {
    if (this.settings.pageable) {
      updatePagingInfoFromQueryParams(this, currentQueryParams);
    }

    return this.deserializeSearchArguments(currentQueryParams)
      .then((deserializedSearchArguments) => {
        const searchArguments = objectUtilities.pickInBoth(deserializedSearchArguments.params,
          this.settings.defaultSearchArguments);
        ko.mapping.fromJS(searchArguments, this.searchArguments);
      });
  }

  return Promise.resolve();
};

ContentListPageBaseViewModel.prototype.updateUrlWithSearchArguments = function() {
  var self = this;

  koco.router.setUrlSilently({
    url: self.getUrlWithUpdatedQueryString(),
    replace: true
  });
};

ContentListPageBaseViewModel.prototype.getUrlWithUpdatedQueryString = function() {
  var self = this;

  var route = !koco.router.isActivating() && koco.router.context() ? koco.router.context().route : self.route;
  var routeUrl = route.url;
  var currentQuery = new Query(route.url);
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

export default ContentListPageBaseViewModel;
