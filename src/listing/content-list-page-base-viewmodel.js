// Copyright (c) CBC/Radio-Canada. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

define([
        'knockout',
        'jquery',
        'lodash',
        'url-utilities',
        'router',
        'query',
        'object-utilities',
        'string-utilities',
        'mapping-utilities',
        'disposer',
        'list-base-viewmodel'
    ],
    function(ko, $, _, urlUtilities, router, Query,
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

        ContentListPageBaseViewModel.prototype.activate = function() {
            var self = this;

            return new $.Deferred(function(dfd) {
                try {

                    self.loadLookups()
                        .then(function() {
                            self.skipUpdateUrlOneTime = true;

                            return self.initSearchArgumentsAndPagingInfoOuter().then(function() {
                                return self.searchWithFilters().then(function() {
                                    dfd.resolve();
                                });
                            });
                        }).fail(function(jqXHR, textStatus, errorThrown) {
                            if (jqXHR.status === 404  || errorThrown === 'Not Found') {
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

        ContentListPageBaseViewModel.prototype.getCurrentQueryString = function() {
            var self = this;
            var args = mappingUtilities.toJS(self.searchArguments);
            var cleanedArguments = objectUtilities.pickNonFalsy(args);
            delete cleanedArguments[this.settings.defaultPagingAttr.pageNumber];

            return $.param(cleanedArguments);
        };

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

            ListBaseViewModel.prototype.onSearchSuccess.call(self, searchResult);
        };

        ContentListPageBaseViewModel.prototype.updateReturnToQueryString = function() {
            var self = this;

            var queryParams = {
                returnTo: self.getUrlWithUpdatedQueryString()
            };

            self.returnToQueryString($.param(queryParams));
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

            var currentQueryParams = new Query(self.route.url).params;
            if (currentQueryParams && !_.isEmpty(currentQueryParams)) {

                if (self.settings.pageable) {
                    updatePagingInfoFromQueryParams(self, currentQueryParams);
                }

                self.deserializeSearchArguments(currentQueryParams).then(function(deserializedSearchArguments) {
                    var searchArguments = objectUtilities.pickInBoth(deserializedSearchArguments.params, self.settings.defaultSearchArguments);

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



        ContentListPageBaseViewModel.prototype.updateUrlWithSearchArguments = function() {
            var self = this;

            router.setUrlSilently({
                url: self.getUrlWithUpdatedQueryString(),
                replace: true
            });
        };

        ContentListPageBaseViewModel.prototype.getUrlWithUpdatedQueryString = function() {
            var self = this;

            var route = !router.isActivating() && router.viewModel() ? router.viewModel().route : self.route;
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

        return ContentListPageBaseViewModel;
    });
