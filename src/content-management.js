// Copyright (c) CBC/Radio-Canada. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

define(['jquery', 'router', 'url-utilities'],
    function($, router, urls) {
        'use strict';


        var ContentManagement = function() {

        };

        ContentManagement.prototype.registerContentPages = function(content, options) {

            var defaultOptions = {
                withActivator: true,
                editTitle: '',
                listTitle: '',
                listContentName: content + 's'
            };

            options = $.extend(defaultOptions, options);

            router.registerPage(content + '-edit', {
                basePath: 'components/' + content + '-pages/edit',
                withActivator: options.withActivator,
                title: options.editTitle
            });
            router.addRoute(urls.patternWithQueryString(content + '/edit/:id:'), {
                pageName: content + '-edit'
            });
            router.registerPage(content + '-list', {
                basePath: 'components/' + content + '-pages/list',
                withActivator: true,
                title: options.listTitle
            });
            router.addRoute(urls.patternWithQueryString(options.listContentName), {
                pageName: content + '-list'
            });
        };

        return new ContentManagement();
    });
