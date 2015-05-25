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
        'disposer'
    ],
    function(ko, $, _, urlUtilities, router,
        objectUtilities, stringUtilities, mappingUtilities, Disposer) {
        'use strict';

        var defaultPagingInfo = {
            orderByDirection: null,
            orderBy: null,
            pageNumber: null,
            pageSize: null
        };

        var defaultSettings = {
            defaultSearchFields: {},
            pageable: true
        };

        var ContentListPageBaseViewModel = function(api, apiResourceName, settings) {
            var self = this;

            if (!api) {
                throw new Error('ContentListPageBaseViewModel - missing api');
            }

            if (!apiResourceName) {
                throw new Error('ContentListPageBaseViewModel - missing api resource name');
            }

            self.disposer = new Disposer();
            self.apiResourceName = apiResourceName;
            self.api = api;

            self.settings = $.extend({}, defaultSettings, settings);

            self.apiCriteriaFields = Object.keys(self.settings.defaultSearchFields).concat(Object.keys(defaultPagingInfo));
            self.searchArguments = null;
            self.isSearchInProgress = ko.observable(false);
            self.searchFields = ko.mapping.fromJS(self.settings.defaultSearchFields);
            self.totalNumberOfItems = ko.observable();
            self.items = ko.observableArray([]);
            self.skipUpdateUrlOneTime = false;
            self.isSorting = ko.observable(false);
            self.title = ko.observable('');
            self.returnUrl = ko.observable('');
            self.returnTitle = ko.observable('');

            self.hasItems = ko.pureComputed(function() {
                return self.items().length > 0;
            });
            self.disposer.add(self.hasItems);

            self.pagingInfo = ko.observable(defaultPagingInfo);

            self.remainingItemsToLoad = ko.observable(false);

            self.isPaging = ko.observable(false);

            self.returnToQueryString = ko.observable('');

            self.creationFormUrl = ko.pureComputed(function() {
                //Attention - ceci est une convention!
                return urlUtilities.url(apiResourceName + '/edit?' + self.returnToQueryString());
            });
            self.disposer.add(self.creationFormUrl);

            return self;
        };

        ContentListPageBaseViewModel.prototype.toApiCriteria = function(searchArguments) {
            //This is error prone... this means that you have to pass all possible search fields to the
            //defaultSearchFields setting in order to be able to use a specific field later (may be acceptable but must be explicit)
            var criteria = _.pick(searchArguments, this.apiCriteriaFields);

            return criteria;
        };

        ContentListPageBaseViewModel.prototype.getCurrentQueryString = function() {
            var self = this;
            var cleanedArguments = objectUtilities.pickNonFalsy(self.searchArguments);
            delete cleanedArguments.pageNumber;

            return $.param(cleanedArguments);
        };

        ContentListPageBaseViewModel.prototype.search = function() {
            var self = this;

            self.isSearchInProgress(true);

            var apiCriteria = self.toApiCriteria(self.searchArguments);

            var promise = self.api.getJson(self.apiResourceName, {
                    data: $.param(apiCriteria, true)
                })
                .done(function(searchResult) {
                    self.onSearchSuccess(searchResult);
                })
                .fail(function(jqXhr, textStatus, errorThrown) {
                    self.onSearchFail(jqXhr, textStatus, errorThrown);
                })
                .always(function() {
                    self.isSearchInProgress(false);
                });

            return promise;
        };

        ContentListPageBaseViewModel.prototype.onSearchFail = function(jqXhr, textStatus, errorThrown) {
            var self = this;

            if (errorThrown !== 'abort') {
                self.handleUnknownError(jqXhr, textStatus, errorThrown);
            }
        };

        ContentListPageBaseViewModel.prototype.onSearchSuccess = function(searchResult) {
            var self = this;

            if (self.settings.pageable) {
                updatePagingInfo(self, searchResult);
            }

            if (self.skipUpdateUrlOneTime === false) {
                updateUrlWithSearchArguments(self);
            }

            self.skipUpdateUrlOneTime = false;

            self.updateReturnToQueryString();

            self.totalNumberOfItems(searchResult.totalNumberOfItems);

            var newItems = self.getItemsFromSearchResult(searchResult);

            self.addPropertiesToItems(newItems);

            if (self.settings.pageable) {
                var allItems = newItems;

                if (self.isPaging()) {
                    allItems = self.items();

                    for (var i = 0; i < newItems.length; i++) {

                        allItems.push(newItems[i]);
                    }
                }

                //Doit être fait avant la ligne suivante
                self.remainingItemsToLoad(allItems.length < searchResult.totalNumberOfItems);
                self.items(allItems);
            } else {
                self.items(newItems);
            }
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

            if (self.settings.pageable) {
                self.resetPageNumber();
            }

            self.searchArguments = self.getSearchArgumentsFromFields();

            if (self.settings.pageable) {
                self.updateSearchArgumentsWithPagingFields();
            }

            return self.search();
        };

        ContentListPageBaseViewModel.prototype.resetPageNumber = function() {
            var self = this;

            var pagingInfo = self.pagingInfo();
            pagingInfo.pageNumber = null;

            self.pagingInfo(pagingInfo);
        };

        ContentListPageBaseViewModel.prototype.updateSearchArgumentsWithPagingFields = function() {
            var self = this;

            self.searchArguments = $.extend({}, self.searchArguments, objectUtilities.pickNonFalsy(self.pagingInfo()));
        };

        ContentListPageBaseViewModel.prototype.searchByKeywords = function() {
            var self = this;

            self.searchWithFilters();
        };

        ContentListPageBaseViewModel.prototype.goToNextPage = function() {
            var self = this;
            self.isPaging(true);

            var pagingInfo = self.pagingInfo();
            pagingInfo.pageNumber = (pagingInfo.pageNumber || 1) + 1;
            self.pagingInfo(pagingInfo);

            self.updateSearchArgumentsWithPagingFields();

            var search = self.search();
            search.always(function() {
                self.isPaging(false);
            });

            return search;
        };

        ContentListPageBaseViewModel.prototype.updateOrderBy = function(newOrderBy) {
            var self = this;
            var pagingInfo = self.pagingInfo();
            pagingInfo.pageNumber = 1;

            if (stringUtilities.equalsIgnoreCase(pagingInfo.orderBy, newOrderBy)) {
                if (stringUtilities.equalsIgnoreCase(pagingInfo.orderByDirection, 'ascending')) {
                    pagingInfo.orderByDirection = 'descending';
                } else {
                    pagingInfo.orderByDirection = 'ascending';
                }
            } else {
                pagingInfo.orderByDirection = 'ascending';
                pagingInfo.orderBy = newOrderBy;
            }

            self.pagingInfo(pagingInfo);

            self.updateSearchArgumentsWithPagingFields();

            return self.search();
        };

        ContentListPageBaseViewModel.prototype.addPropertiesToItems = function(items) {
            var self = this;

            for (var i = 0; i < items.length; i++) {
                var item = items[i];

                self.addPropertiesToSearchResultItem(item);
            }
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

        ContentListPageBaseViewModel.prototype.getItemsFromSearchResult = function(searchResult) {
            //var self = this;

            return _.compact(searchResult.items);
        };

        ContentListPageBaseViewModel.prototype.getSearchArgumentsFromFields = function() {
            var self = this;

            var searchFields = mappingUtilities.toJS(self.searchFields);
            searchFields = objectUtilities.pickNonFalsy(searchFields);

            return searchFields;
        };

        ContentListPageBaseViewModel.prototype.loadLookups = function() {
            return new $.Deferred(function(dfd) {
                dfd.resolve();
            }).promise();
        };

        ContentListPageBaseViewModel.prototype.deserializeSearchFields = function(serializedSearchFields) {
            return new $.Deferred(function(dfd) {
                dfd.resolve(serializedSearchFields);
            }).promise();
        };

        ContentListPageBaseViewModel.prototype.initSearchFieldsAndPagingInfoOuter = function() {
            var self = this;

            return new $.Deferred(function(dfd) {
                try {
                    self.initSearchFieldsAndPagingInfo(dfd);
                } catch (err) {
                    dfd.reject(err);
                }
            }).promise();
        };

        ContentListPageBaseViewModel.prototype.initSearchFieldsAndPagingInfo = function(dfd) {
            var self = this;

            if (self.route.query && !_.isEmpty(self.route.query)) {

                if (self.settings.pageable) {
                    updatePagingInfoFromQueryParams(self, self.route.query);
                }

                self.deserializeSearchFields(self.route.query).then(function(deserializedSearchFields) {
                    var searchFields = objectUtilities.pickInBoth(deserializedSearchFields, self.settings.defaultSearchFields);

                    ko.mapping.fromJS(searchFields, self.searchFields);

                    dfd.resolve();
                });
            } else {
                dfd.resolve();
            }
        };

        ContentListPageBaseViewModel.prototype.handleUnknownError = function(jqXHR, textStatus, errorThrown) {};

        ContentListPageBaseViewModel.prototype.dispose = function() {
            this.disposer.dispose();
        };

        function updatePagingInfoFromQueryParams(self, queryParams) {
            var pagingInfo = self.pagingInfo();

            pagingInfo = $.extend({}, pagingInfo, objectUtilities.pickInBoth(queryParams, pagingInfo));
            self.pagingInfo(pagingInfo);
        }

        function updatePagingInfo(self, pagedListOfItems) {
            var pagingInfo = {
                pageNumber: pagedListOfItems.pageNumber,
                pageSize: pagedListOfItems.pageSize,
                orderBy: pagedListOfItems.orderBy,
                orderByDirection: pagedListOfItems.orderByDirection
            };

            self.pagingInfo(pagingInfo);
            self.updateSearchArgumentsWithPagingFields();
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
