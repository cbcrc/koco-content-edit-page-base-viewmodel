// Copyright (c) CBC/Radio-Canada. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

define(['knockout', 'jquery'],
    function(ko, $) {
        'use strict';

        var ContentListPageActivator = function(viewmodel) {
            var self = this;

            self.viewmodel = viewmodel;
        };

        ContentListPageActivator.prototype.activate = function(context) {
            var self = this;

            return new $.Deferred(function(dfd) {
                try {
                    $.extend(context, self.viewmodel);

                    context.loadLookups()
                        .then(function() {
                            context.skipUpdateUrlOneTime = true;

                            return context.initSearchFieldsAndPagingInfo().then(function() {
                                return context.searchWithFilters().then(function() {
                                    dfd.resolve();
                                });
                            });
                        }).fail(function(jqXHR, textStatus, errorThrown) {
                            if (jqXHR.status === 404  || errorThrown === 'Not Found') {
                                dfd.reject(404);
                            } else {
                                //TODO: Handle better
                                context.handleUnknownError(jqXHR, textStatus, errorThrown);
                                dfd.reject(errorThrown);
                            }
                        });

                } catch (err) {
                    dfd.reject(err);
                }
            }).promise();
        };

        return ContentListPageActivator;
    });
