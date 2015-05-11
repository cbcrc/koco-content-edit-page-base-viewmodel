// Copyright (c) CBC/Radio-Canada. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

define([
        'knockout',
        'jquery',
        'lodash',
        'mapping-utilities',
        'url-utilities',
        'router',
        'toastr',
        'modaler',
        'array-utilities',
        'validation-utilities',
        'disposer'
    ],
    function(ko, $, _, mappingUtilities, urlUtilities, router,
        toastr, modaler, arrayUtilities, validationUtilities, Disposer) {
        'use strict';

        var defaultSettings = {
            tinyMcePropertyNames: [],
            observableValueObjects: [],
            alikeArraysPropertyNames: [],
            quitConfirmMessage: 'Si vous quitter cette page, vos changements seront perdus.',
            contentCreatedMessage: 'Le contenu a été sauvegardé.',
            contentUpdatedMessage: 'Le contenu a été sauvegardé.',
            validationErrorsMessage: 'Le formulaire comporte des erreurs. Veuillez les corriger.'
        };

        var ContentEditPageBaseViewModel = function(api, apiResourceName, observableContent, settings) {
            var self = this;

            if (!api) {
                throw new Error('ContentEditPageBaseViewModel - missing api');
            }

            if (!apiResourceName) {
                throw new Error('ContentEditPageBaseViewModel - missing api resource name');
            }

            if (!observableContent) {
                throw new Error('ContentEditPageBaseViewModel - missing api observable content');
            }

            self.settings = $.extend({}, defaultSettings, settings);

            self.api = api;

            self.disposer = new Disposer();

            self.observableContent = ko.validatedObservable(observableContent);
            self.observableContent.extend({
                bootstrapValidation: {}
            });

            self.originalModelSnapshot = ko.observable();

            self.apiResourceName = apiResourceName;

            self.validatedObservables = [self.observableContent];

            self.editMode = ko.pureComputed(function() {
                return self.observableContent().id() ? 'update' : 'create';
            });
            self.disposer.add(self.editMode);

            self.serverSideValidationErrors = ko.observableArray([]);

            self.content = ko.pureComputed(function() {
                return mappingUtilities.toJS(self.observableContent);
            });
            self.disposer.add(self.content);
        };

        ContentEditPageBaseViewModel.prototype.canNavigate = function() {
            var self = this;

            if (self.isChangesWillBeLostConfirmationDisabled) {
                return true;
            }

            if (!self.hasModelChanged()) {
                return true;
            }

            return modaler.show('confirm', {
                message: self.settings.quitConfirmMessage,
                okButtonHtml: 'Quitter'
            });
        };

        ContentEditPageBaseViewModel.prototype.onBeforeUnload = function() {
            var self = this;

            if (self.isChangesWillBeLostConfirmationDisabled) {
                return;
            }

            if (!self.hasModelChanged()) {
                return;
            }

            return self.settings.quitConfirmMessage;
        };

        ContentEditPageBaseViewModel.prototype.save = function(options) {
            var self = this;

            var promise = $.Deferred(function(dfd) {
                try {
                    self.serverSideValidationErrors([]);

                    self.validate().then(function(isValid) {
                        if (isValid) {
                            saveInner(self, dfd, options);
                        } else {
                            dfd.resolve();
                        }
                    }).fail(function() {
                        dfd.reject.apply(self, arguments);
                    });
                } catch (error) {
                    dfd.reject.apply(self, arguments);
                }
            }).promise();

            promise.fail(function( /*error*/ ) {
                self.handleUnknownError.apply(self, arguments);
            });

            return promise;
        };

        ContentEditPageBaseViewModel.prototype.validate = function() {
            var self = this;

            var promise = self.validateInner();

            promise.then(function (isValid) {
                if (!isValid) {
                    self.prepareScreenForValidationErrors();
                }
            });

            return promise;
        };

        ContentEditPageBaseViewModel.prototype.validateInner = function() {
            var self = this;

            return validationUtilities.validateObservables(self.validatedObservables);
        };

        ContentEditPageBaseViewModel.prototype.toOutputModel = function(saveOptions) {
            var self = this;

            var content = mappingUtilities.toJS(self.observableContent);

            return content;
        };

        ContentEditPageBaseViewModel.prototype.hasModelChanged = function() {
            var self = this;

            return self.isEqual(
                self.originalModelSnapshot(),
                self.takeCurrentModelSnapshot(),
                self.settings.tinyMcePropertyNames,
                self.settings.alikeArraysPropertyNames
            ) === false;
        };

        ContentEditPageBaseViewModel.prototype.isEqual = function(object, other, htmlPropertyNames, alikeArraysPropertyNames) {
            var self = this;

            object = mappingUtilities.toJS(object);
            other = mappingUtilities.toJS(other);

            if (_.isObject(object) && _.isObject(other)) {
                var hasHtmlPropertyNames = arrayUtilities.isNotEmptyArray(htmlPropertyNames);
                var hasAlikeArraysPropertyNames = arrayUtilities.isNotEmptyArray(alikeArraysPropertyNames);

                return self.isEqualObject(object, other, htmlPropertyNames, alikeArraysPropertyNames, hasHtmlPropertyNames, hasAlikeArraysPropertyNames);
            } else {
                throw new Error('content-utilities - isEqual - this function can only compare objects (_.isObject).');
            }
        };

        ContentEditPageBaseViewModel.prototype.isEqualObject = function(object, other, htmlPropertyNames, alikeArraysPropertyNames, hasHtmlPropertyNames, hasAlikeArraysPropertyNames) {
            var self = this;
            var propertiesEqual;

            if (_.keys(object).length !== _.keys(other).length) {
                return false;
            }

            for (var key in object) {
                if (object.hasOwnProperty(key)) {
                    if (other.hasOwnProperty(key)) {
                        propertiesEqual = self.isEqualProperty(key, object, other, htmlPropertyNames, alikeArraysPropertyNames, hasHtmlPropertyNames, hasAlikeArraysPropertyNames);

                        if (!propertiesEqual) {
                            return false;
                        }
                    } else {
                        return false;
                    }
                }
            }

            return true;
        };

        ContentEditPageBaseViewModel.prototype.isEqualProperty = function(key, object, other, htmlPropertyNames, alikeArraysPropertyNames, hasHtmlPropertyNames, hasAlikeArraysPropertyNames) {
            var self = this;
            var val1 = object[key];
            var val2 = other[key];

            if (_.isFunction(val1) || _.isFunction(val2)) {
                if (!_.isFunction(val1) || !_.isFunction(val2)) {
                    return false;
                }

                return true; //we do not compare functions...
            }

            if (_.isArray(val1) || _.isArray(val2)) {
                if (hasAlikeArraysPropertyNames && _.contains(alikeArraysPropertyNames, key)) {
                    //humm... c'est bon ça!? comparaison boiteuse... pourquoi on fait ça donc? pour ne pas tenir compte de l'ordre des valeurs de l'array!?
                    return val1.length === val2.length && _.intersection(val1, val2).length === val1.length;
                }

                return val1.length === val2.length && _.all(val1, function(val, i) {
                    //pas de récursion pour les valeurs des array
                    return _.isEqual(val, val2[i]);
                });
            }

            if (_.isObject(val1) || _.isObject(val2)) {
                if (!_.isObject(val1) || !_.isObject(val2)) {
                    return false;
                } else {
                    return self.isEqualObject(val1, val2, htmlPropertyNames, alikeArraysPropertyNames, hasHtmlPropertyNames, hasAlikeArraysPropertyNames);
                }
            }

            if (hasHtmlPropertyNames && _.contains(htmlPropertyNames, key)) {
                var html1, html2;

                if (val1) {
                    html1 = $('<div/>').html(val1.replace(/(\r\n|\n|\r)/gm, ''))[0];
                } else {
                    html1 = $('<div/>').html(val1)[0];
                }

                if (val2) {
                    html2 = $('<div/>').html(val2.replace(/(\r\n|\n|\r)/gm, ''))[0];
                } else {
                    html2 = $('<div/>').html(val2)[0];
                }

                //Attention: IE9+
                //http://stackoverflow.com/questions/10679762/how-to-compare-two-html-elements/19342581
                return html1.isEqualNode(html2);
            }

            return _.isEqual(val1, val2);
        };

        ContentEditPageBaseViewModel.prototype.takeCurrentModelSnapshot = function() {
            var self = this;
            var modelSnapshot = self.getModelSnapshot();

            for (var i = 0; i < self.settings.tinyMcePropertyNames.length; i++) {
                var propertyName = self.settings.tinyMcePropertyNames[i];

                if (modelSnapshot.hasOwnProperty(propertyName)) {
                    modelSnapshot[propertyName] = self.clearContentFromTinyMceSpecificMarkup(modelSnapshot[propertyName]);
                }
            }

            return modelSnapshot;
        };

        ContentEditPageBaseViewModel.prototype.clearContentFromTinyMceSpecificMarkup = function(tinymceContnet) {
            //var self = this;

            var $buffer = $('<div>');
            $buffer.html(tinymceContnet);
            $buffer.find('.articleBody').removeClass('articleBody');
            $buffer.find('.first').removeClass('first');
            $buffer.find('[itemprop]').removeAttr('itemprop');
            $buffer.find('*[class=""]').removeAttr('class');

            var result = $buffer.html();

            return result;
        };

        ContentEditPageBaseViewModel.prototype.takeOriginalModelSnapshot = function() {
            var self = this;

            self.originalModelSnapshot(self.takeCurrentModelSnapshot());
        };

        ContentEditPageBaseViewModel.prototype.getModelSnapshot = function() {
            var self = this;

            var modelSnapshot = mappingUtilities.toJS(self.observableContent);

            return modelSnapshot;
        };

        ContentEditPageBaseViewModel.prototype.loadContent = function(id, dfd) {
            var self = this;

            if (dfd) {
                loadContentInner(self, id, dfd);
                return dfd;
            }

            return $.Deferred(function(dfd) {
                try {
                    loadContentInner(self, id, dfd);
                } catch (error) {
                    dfd.reject(error);
                }

            }).promise();
        };

        ContentEditPageBaseViewModel.prototype.loadLookups = function() {
            return $.Deferred().resolve().promise();
        };

        ContentEditPageBaseViewModel.prototype.afterContentLoaded = function() {
            return $.Deferred().resolve().promise();
        };

        ContentEditPageBaseViewModel.prototype.onContentLoaded = function(content) {
            var self = this;

            var adaptedContentFromServer = self.fromInputModel(content);

            var mapping = {};
            mappingUtilities.mapAsObservableValueObjects(mapping, self.settings.observableValueObjects);

            ko.mapping.fromJS(adaptedContentFromServer, mapping, self.observableContent);

            self.takeOriginalModelSnapshot();

            return $.Deferred().resolve().promise();
        };

        ContentEditPageBaseViewModel.prototype.fromInputModel = function(inputModel) {
            return inputModel;
        };

        ContentEditPageBaseViewModel.prototype.reload = function(id, dfd) {
            var self = this;

            self.loadContent(id, dfd).then(function() {
                var route = router.context().route;

                var url = self.apiResourceName + '/edit';

                var defaultOptions = {
                    url: route.url.toLowerCase().replace(url, url + '/' + id),
                    pageTitle: router.context().pageTitle,
                    stateObject: {},
                    replace: true
                };

                router.setUrlSilently(defaultOptions);

                $('html, body').animate({
                    scrollTop: 0
                }, 'slow', function() {

                });

                $('.nav-tabs a').first().click();

                //TODO: Faire en sorte qu'on résoude le dfd ici plutôt que dans loadContent
            });
        };

        ContentEditPageBaseViewModel.prototype.create = function(writeModel, dfd, options) {
            var self = this;

            self.api.postJson(self.apiResourceName, writeModel)
                .fail(function(jqXhr, textStatus, errorThrown) {
                    self.onCreateFail(dfd, jqXhr, textStatus, errorThrown);
                })
                .success(function(data, textStatus, jqXhr) {
                    self.onCreateSuccess(dfd, data, textStatus, jqXhr);
                });
        };

        ContentEditPageBaseViewModel.prototype.update = function(writeModel, dfd, options) {
            var self = this;
            var id = self.observableContent().id();

            self.api.putJson(self.apiResourceName + '/' + id, writeModel)
                .fail(function(jqXhr, textStatus, errorThrown) {
                    self.onUpdateFail(dfd, writeModel, id, jqXhr, textStatus, errorThrown);
                })
                .success(function(data, textStatus, jqXhr) {
                    self.onUpdateSuccess(id, dfd, data, textStatus, jqXhr);
                });
        };

        ContentEditPageBaseViewModel.prototype.onCreateSuccess = function(dfd, id) {
            var self = this;

            self.isChangesWillBeLostConfirmationDisabled = true;
            toastr.success(self.settings.contentCreatedMessage);

            self.reload(id, dfd);
        };

        ContentEditPageBaseViewModel.prototype.onUpdateFail = function(dfd, writeModel, id, jqXhr, textStatus, errorThrown) {
            var self = this;

            switch (jqXhr.status) {
                case 400: //Erreurs de validations
                    self.handleServerValidationErrors(jqXhr.responseJSON, dfd);
                    break;
                case 406: //erreur a la sauvegarde des donnees
                    self.handleServerValidationErrors([jqXhr.responseJSON], dfd);
                    break;
                case 409: //Version conflict
                    self.handleSaveConflict(writeModel, jqXhr.responseJSON, dfd);
                    break;
                default:
                    self.handleUnknownError(jqXhr, textStatus, errorThrown);
                    self.loadContent(id, dfd);
                    break;
            }
        };

        ContentEditPageBaseViewModel.prototype.onCreateFail = function(dfd, jqXhr, textStatus, errorThrown) {
            var self = this;

            switch (jqXhr.status) {
                case 400: //Erreurs de validations
                    self.handleServerValidationErrors(jqXhr.responseJSON, dfd);
                    break;
                case 406: //erreur a la sauvegarde des donnees
                    self.handleServerValidationErrors([jqXhr.responseJSON], dfd);
                    break;
                default:
                    self.handleUnknownError(jqXhr, textStatus, errorThrown);
                    self.isChangesWillBeLostConfirmationDisabled = true;
                    dfd.resolve();
                    router.navigate(urlUtilities.getReturnUrl(self.apiResourceName)); //Convention pour l'url...
                    break;
            }
        };

        ContentEditPageBaseViewModel.prototype.handleUnknownError = function(jqXhr, textStatus, errorThrown) {};

        ContentEditPageBaseViewModel.prototype.onUpdateSuccess = function(id, dfd /*, data, textStatus, jqXhr*/ ) {
            var self = this;

            toastr.success(self.settings.contentUpdatedMessage);
            self.loadContent(id, dfd);
        };

        ContentEditPageBaseViewModel.prototype.handleSaveConflict = function(writeModel, conflictInfo, dfd) {
            var self = this;
        };

        ContentEditPageBaseViewModel.prototype.handleServerValidationErrors = function(errors, dfd) {
            var self = this;
            //On affiche seulement les erreurs globales (key = '') pour l'instant
            //TODO: Vider les erreurs avant de commencer ?

            var finalErrors = [];

            for (var key in errors) {
                for (var key2 in errors[key]) {
                    finalErrors.push(errors[key][key2]);
                }
            }

            if (arrayUtilities.isNotEmptyArray(finalErrors)) {
                self.serverSideValidationErrors(finalErrors);
                self.prepareScreenForValidationErrors(dfd);
            } else {
                dfd.resolve();
            }
        };

        ContentEditPageBaseViewModel.prototype.prepareScreenForValidationErrors = function(dfd) {
            var self = this;

            toastr.error(self.settings.validationErrorsMessage);

            if (self.selectFirstTabWithValidationErrors) {
                self.selectFirstTabWithValidationErrors();
            }

            $('html, body').animate({
                scrollTop: 0
            }, dfd ? dfd.resolve : null);
        };

        ContentEditPageBaseViewModel.prototype.selectFirstTabWithValidationErrors = function() {
            var panel = $('.tab-pane.active');

            if (!panel.length || !panel.find('.form-group.has-error').length) {
                panel = $('.form-group.has-error').closest('.tab-pane');
            }

            if (panel.length) {
                $('.nav-tabs a[href="#' + panel.attr('id') + '"]').click();
            } else {
                $('.nav-tabs a').first().click();
            }
        };

        ContentEditPageBaseViewModel.prototype.finalize = function() {
            var self = this;

            self.takeOriginalModelSnapshot();
            router.navigating.subscribe(self.canNavigate, self);
            $(window).on('beforeunload.editpage', self.onBeforeUnload.bind(self));
        };

        //TODO: Utiliser de l'héritage & call base dans la fonction qui override au lieu de nommer cette fonction baseDispose
        ContentEditPageBaseViewModel.prototype.baseDispose = function() {
            var self = this;

            $(window).off('beforeunload.editpage');
            router.navigating.unsubscribe(self.canNavigate);
            self.disposer.dispose();
        };

        function saveInner(self, dfd, options) {
            var writeModel = self.toOutputModel(options);

            if (self.editMode() === 'create') {
                self.create(writeModel, dfd, options);
            } else {
                self.update(writeModel, dfd, options);
            }
        }

        function loadContentInner(self, id, dfd) {
            if (id) {
                self.api.getJson(self.apiResourceName + '/' + id,
                        function(content) {
                            return self.onContentLoaded(content).then(function() {
                                dfd.resolve();
                            });
                        })
                    .fail(function(jqXHR, textStatus, errorThrown) {
                        dfd.reject(jqXHR, textStatus, errorThrown);
                    });
            } else {
                dfd.resolve();
            }
        }

        return ContentEditPageBaseViewModel;
    });
