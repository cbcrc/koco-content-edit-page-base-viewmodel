// Copyright (c) CBC/Radio-Canada. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

define([
        'knockout',
        'jquery',
        'lodash',
        'url-utilities',
        'router',
        'object-utilities',
        'string-utilities',
        'mapping-utilities',
        'disposer',
        'list-base-viewmodel'
    ],
    function(ko, $, _, urlUtilities, router,
        objectUtilities, stringUtilities, mappingUtilities, Disposer, ListBaseViewModel) {
        'use strict';

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

        ContentListPageBaseViewModel.prototype = Object.create(ListBaseViewModel.prototype);
        ContentListPageBaseViewModel.prototype.contructor = ContentListPageBaseViewModel;


        ContentListPageBaseViewModel.prototype.getCurrentQueryString = function() {
            var self = this;
            var cleanedArguments = objectUtilities.pickNonFalsy(self.searchArguments);
            delete cleanedArguments.pageNumber;

            return $.param(cleanedArguments);
        };



        ContentListPageBaseViewModel.prototype.onSearchSuccess = function(searchResult) {
            var self = this;

            if (self.settings.pageable) {
                self.updatePagingInfo(searchResult);
            }

            if (self.skipUpdateUrlOneTime === false) {
                updateUrlWithSearchArguments(self);
            }

            self.skipUpdateUrlOneTime = false;

            self.updateReturnToQueryString();

            ListBaseViewModel.prototype.onSearchSuccess.call(self, searchResult);

        };

        ContentListPageBaseViewModel.prototype.updateReturnToQueryString = function() {
            var self = this;

            var queryParams = {
                returnTo: getUrlWithUpdatedQueryString(self)
            };

            self.returnToQueryString($.param(queryParams));
        };

        ContentListPageBaseViewModel.prototype.searchWithFilters = function() {
            var self = this;
            window.scrollTo(0, 0);

            return ListBaseViewModel.prototype.searchWithFilters.call(self);
        };

        ContentListPageBaseViewModel.prototype.searchByKeywords = function() {
            var self = this;

            self.searchWithFilters();
        };

        ContentListPageBaseViewModel.prototype.goToNextPage = function() {

            var self = this;
            

            var search = ListBaseViewModel.prototype.goToNextPage.call(self);
            search.always(function() {
                self.isPaging(false);
            });

            return search;
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

        ContentListPageBaseViewModel.prototype.loadLookups = function() {
            return new $.Deferred(function(dfd) {
                dfd.resolve();
            }).promise();
        };

        ContentListPageBaseViewModel.prototype.deserializeSearchArguments = function(serializedSearchArguments) {
            return new $.Deferred(function(dfd) {
                dfd.resolve(serializedSearchArguments);
            }).promise();
        };

        ContentListPageBaseViewModel.prototype.initSearchArgumentsAndPagingInfoOuter = function() {
            var self = this;

            return new $.Deferred(function(dfd) {
                try {
                    self.initSearchArgumentsAndPagingInfo(dfd);
                } catch (err) {
                    dfd.reject(err);
                }
            }).promise();
        };

        ContentListPageBaseViewModel.prototype.initSearchArgumentsAndPagingInfo = function(dfd) {
            var self = this;

            if (self.route.query && !_.isEmpty(self.route.query)) {

                if (self.settings.pageable) {
                    updatePagingInfoFromQueryParams(self, self.route.query);
                }

                self.deserializeSearchArguments(self.route.query).then(function(deserializedSearchArguments) {
                    var searchArguments = objectUtilities.pickInBoth(deserializedSearchArguments, self.settings.defaultSearchArguments);

                    ko.mapping.fromJS(searchArguments, self.searchArguments);

                    dfd.resolve();
                });
            } else {
                dfd.resolve();
            }
        };

        function updatePagingInfoFromQueryParams(self, queryParams) {
            var pagingArguments = self.pagingArguments();

            pagingArguments = $.extend({}, pagingArguments, objectUtilities.pickInBoth(queryParams, pagingArguments));
            self.pagingArguments(pagingArguments);
        }



        function updateUrlWithSearchArguments(self) {
            router.setUrlSilently({
                url: getUrlWithUpdatedQueryString(self),
                replace: true
            });
        }

        function getUrlWithUpdatedQueryString(self) {
            var route = !router.isActivating() && router.context() ? router.context().route : self.route;
            var routeUrl = route.url;
            var currentQueryString = route.query.toString();
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
        }

        return ContentListPageBaseViewModel;
    });
