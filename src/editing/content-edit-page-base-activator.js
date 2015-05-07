// Copyright (c) CBC/Radio-Canada. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

define(['knockout', 'jquery'],
    function(ko, $) {
        'use strict';

        var ContentEditPageBaseActivator = function(viewmodel) {
            var self = this;

            self.viewmodel = viewmodel;
        };

        ContentEditPageBaseActivator.prototype.activate = function(context) {
            var self = this;

            return new $.Deferred(function(dfd) {
                try {
                    var id = context.route.urlParams[0].id;
                    $.extend(context, self.viewmodel);

                    context.loadLookups()
                        .then(function() {
                            return context.loadContent(id).then(function() {
                                return context.afterContentLoaded().then(function() {
                                    context.finalize.call(context);
                                    dfd.resolve();
                                });
                            });
                        }).fail(function(jqXHR, textStatus, errorThrown) {
                            if (jqXHR.status === 404 || errorThrown === 'Not Found') {
                                dfd.reject(404);
                            } else {
                                //TODO: Handle better
                                self.viewmodel.handleUnknownError(jqXHR, textStatus, errorThrown);
                                dfd.reject(errorThrown);
                            }
                        });
                } catch (err) {
                    dfd.reject(err);
                }
            }).promise();
        };

        return ContentEditPageBaseActivator;
    });
