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

var _mappingUtilities = require('mapping-utilities');

var _mappingUtilities2 = _interopRequireDefault(_mappingUtilities);

var _urlUtilities = require('url-utilities');

var _urlUtilities2 = _interopRequireDefault(_urlUtilities);

var _router = require('router');

var _router2 = _interopRequireDefault(_router);

var _toastr = require('toastr');

var _toastr2 = _interopRequireDefault(_toastr);

var _modaler = require('modaler');

var _modaler2 = _interopRequireDefault(_modaler);

var _arrayUtilities = require('array-utilities');

var _arrayUtilities2 = _interopRequireDefault(_arrayUtilities);

var _validationUtilities = require('validation-utilities');

var _validationUtilities2 = _interopRequireDefault(_validationUtilities);

var _disposer = require('disposer');

var _disposer2 = _interopRequireDefault(_disposer);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var defaultSettings = {
    tinymcePropertyNames: [],
    observableValueObjects: null,
    alikeArraysPropertyNames: [],
    quitConfirmMessage: 'Si vous quitter cette page, vos changements seront perdus.',
    contentCreatedMessage: 'Le contenu a été sauvegardé.',
    contentUpdatedMessage: 'Le contenu a été sauvegardé.',
    validationErrorsMessage: 'Le formulaire comporte des erreurs. Veuillez les corriger.',
    unknownErrorMessage: 'Une erreur de type inconnu est survenu: ',
    confirmQuitButtonText: 'Quitter',
    apiQueryParams: null
}; // Copyright (c) CBC/Radio-Canada. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

var ContentEditPageBaseViewModel = function ContentEditPageBaseViewModel(api, apiResourceName, observableContent, settings) {
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

    self.settings = _jquery2.default.extend({}, defaultSettings, settings);

    self.ignoreDispose = false;

    self.apiQueryParams = self.settings.apiQueryParams;

    self.api = api;

    self.disposer = new _disposer2.default();

    self.mapping = self.settings.mapping || {};

    if (self.settings.observableValueObjects) {
        _mappingUtilities2.default.mapAsObservableValueObjects(self.mapping, self.settings.observableValueObjects);
    }

    self.observableContent = _knockout2.default.validatedObservable(_knockout2.default.mapping.fromJS(observableContent, self.mapping));
    self.observableContent.extend({
        bootstrapValidation: {}
    });

    self.originalModelSnapshot = _knockout2.default.observable();

    self.apiResourceName = apiResourceName;

    self.validatedObservables = [self.observableContent];

    self.editMode = _knockout2.default.pureComputed(function () {
        return self.getId() ? 'update' : 'create';
    });
    self.disposer.add(self.editMode);

    self.serverSideValidationErrors = _knockout2.default.observableArray([]);

    self.content = _knockout2.default.pureComputed(function () {
        return _mappingUtilities2.default.toJS(self.observableContent);
    });
    self.disposer.add(self.content);
};

//todo: rename async here & inside router
ContentEditPageBaseViewModel.prototype.activate = function () {
    var self = this;

    return new _jquery2.default.Deferred(function (dfd) {
        try {
            var id = self.route.urlParams[0].id;

            self.loadLookups().then(function () {
                return self.loadContent(id).then(function () {
                    return self.afterContentLoaded().then(function () {
                        self.finalize();
                        dfd.resolve();
                    });
                });
            }).fail(function (jqXHR, textStatus, errorThrown) {
                if (jqXHR.status === 404 || errorThrown === 'Not Found') {
                    dfd.reject(404);
                } else {
                    //TODO: Handle better
                    self.handleUnknownError(jqXHR, textStatus, errorThrown);
                    dfd.reject(errorThrown || textStatus || jqXHR);
                }
            });
        } catch (err) {
            dfd.reject(err);
        }
    }).promise();
};

ContentEditPageBaseViewModel.prototype.getId = function () {
    var self = this;

    return self.observableContent().id();
};

//todo: rename async
ContentEditPageBaseViewModel.prototype.canNavigate = function () {
    var self = this;

    if (self.isChangesWillBeLostConfirmationDisabled) {
        return true;
    }

    if (!self.hasModelChanged()) {
        return true;
    }

    return _modaler2.default.show('confirm', {
        message: self.settings.quitConfirmMessage,
        okButtonHtml: self.settings.confirmQuitButtonText
    });
};

ContentEditPageBaseViewModel.prototype.onBeforeUnload = function () {
    var self = this;

    if (self.isChangesWillBeLostConfirmationDisabled) {
        return;
    }

    if (!self.hasModelChanged()) {
        return;
    }

    return self.settings.quitConfirmMessage;
};

//todo: rename async
ContentEditPageBaseViewModel.prototype.save = function (options) {
    var self = this;

    self.serverSideValidationErrors([]);

    return self.validate().then(function (isValid) {
        if (isValid) {
            return self.saveInner(options);
        }
    });
};

//todo: rename async
ContentEditPageBaseViewModel.prototype.validate = function () {
    var self = this;
    var _isValid = false;

    return _jquery2.default.Deferred(function (dfd) {
        try {
            self.validateInner().then(function (isValid) {
                _isValid = isValid;

                if (!isValid) {
                    return self.prepareScreenForValidationErrors();
                }
            }).then(function () {
                dfd.resolve(_isValid);
            }).fail(function () {
                dfd.reject.apply(self, arguments);
            });
        } catch (error) {
            dfd.reject.apply(self, arguments);
        }
    }).promise();
};

//todo: rename async
ContentEditPageBaseViewModel.prototype.validateInner = function () {
    var self = this;

    return _validationUtilities2.default.validateObservables(self.validatedObservables);
};

ContentEditPageBaseViewModel.prototype.toOutputModel = function () /*saveOptions*/{
    var self = this;

    var content = _mappingUtilities2.default.toJS(self.observableContent);

    return content;
};

/******** todo: extraire logique de isEqual pour contenu *********/

ContentEditPageBaseViewModel.prototype.hasModelChanged = function () {
    var self = this;

    return self.isEqual(self.originalModelSnapshot(), self.takeCurrentModelSnapshot(), self.settings.tinymcePropertyNames, self.settings.alikeArraysPropertyNames) === false;
};

ContentEditPageBaseViewModel.prototype.isEqual = function (object, other, htmlPropertyNames, alikeArraysPropertyNames) {
    var self = this;

    object = _mappingUtilities2.default.toJS(object);
    other = _mappingUtilities2.default.toJS(other);

    if (_lodash2.default.isObject(object) && _lodash2.default.isObject(other)) {
        var hasHtmlPropertyNames = _arrayUtilities2.default.isNotEmptyArray(htmlPropertyNames);
        var hasAlikeArraysPropertyNames = _arrayUtilities2.default.isNotEmptyArray(alikeArraysPropertyNames);

        return self.isEqualObject(object, other, htmlPropertyNames, alikeArraysPropertyNames, hasHtmlPropertyNames, hasAlikeArraysPropertyNames);
    } else {
        throw new Error('content-utilities - isEqual - this function can only compare objects (_.isObject).');
    }
};

ContentEditPageBaseViewModel.prototype.isEqualObject = function (object, other, htmlPropertyNames, alikeArraysPropertyNames, hasHtmlPropertyNames, hasAlikeArraysPropertyNames) {
    var self = this;
    var propertiesEqual;

    if (_lodash2.default.keys(object).length !== _lodash2.default.keys(other).length) {
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

ContentEditPageBaseViewModel.prototype.isEqualProperty = function (key, object, other, htmlPropertyNames, alikeArraysPropertyNames, hasHtmlPropertyNames, hasAlikeArraysPropertyNames) {
    var self = this;
    var val1 = object[key];
    var val2 = other[key];

    if (_lodash2.default.isFunction(val1) || _lodash2.default.isFunction(val2)) {
        if (!_lodash2.default.isFunction(val1) || !_lodash2.default.isFunction(val2)) {
            return false;
        }

        return true; //we do not compare functions...
    }

    if (_lodash2.default.isArray(val1) || _lodash2.default.isArray(val2)) {
        if (hasAlikeArraysPropertyNames && _lodash2.default.includes(alikeArraysPropertyNames, key)) {
            //humm... c'est bon ça!? comparaison boiteuse... pourquoi on fait ça donc? pour ne pas tenir compte de l'ordre des valeurs de l'array!?
            return val1.length === val2.length && _lodash2.default.intersection(val1, val2).length === val1.length;
        }

        return val1.length === val2.length && _lodash2.default.every(val1, function (val, i) {
            //pas de récursion pour les valeurs des array
            return _lodash2.default.isEqual(val, val2[i]);
        });
    }

    if (_lodash2.default.isObject(val1) || _lodash2.default.isObject(val2)) {
        if (!_lodash2.default.isObject(val1) || !_lodash2.default.isObject(val2)) {
            return false;
        } else {
            return self.isEqualObject(val1, val2, htmlPropertyNames, alikeArraysPropertyNames, hasHtmlPropertyNames, hasAlikeArraysPropertyNames);
        }
    }

    if (hasHtmlPropertyNames && _lodash2.default.includes(htmlPropertyNames, key)) {
        var html1, html2;

        if (val1) {
            html1 = (0, _jquery2.default)('<div/>').html(val1.replace(/(\r\n|\n|\r)/gm, ''))[0];
        } else {
            html1 = (0, _jquery2.default)('<div/>').html(val1)[0];
        }

        if (val2) {
            html2 = (0, _jquery2.default)('<div/>').html(val2.replace(/(\r\n|\n|\r)/gm, ''))[0];
        } else {
            html2 = (0, _jquery2.default)('<div/>').html(val2)[0];
        }

        //Attention: IE9+
        //http://stackoverflow.com/questions/10679762/how-to-compare-two-html-elements/19342581
        return html1.isEqualNode(html2);
    }

    return _lodash2.default.isEqual(val1, val2);
};

/*************************************************************/

ContentEditPageBaseViewModel.prototype.takeCurrentModelSnapshot = function () {
    var self = this;
    var modelSnapshot = self.getModelSnapshot();

    for (var i = 0; i < self.settings.tinymcePropertyNames.length; i++) {
        var propertyName = self.settings.tinymcePropertyNames[i];

        if (modelSnapshot.hasOwnProperty(propertyName)) {
            modelSnapshot[propertyName] = self.clearContentFromTinymceSpecificMarkup(modelSnapshot[propertyName]);
        }
    }

    return modelSnapshot;
};

ContentEditPageBaseViewModel.prototype.clearContentFromTinymceSpecificMarkup = function (tinymceContnet) {
    //var self = this;

    var $buffer = (0, _jquery2.default)('<div>');
    $buffer.html(tinymceContnet);
    $buffer.find('.articleBody').removeClass('articleBody');
    $buffer.find('.first').removeClass('first');
    $buffer.find('[itemprop]').removeAttr('itemprop');
    $buffer.find('*[class=""]').removeAttr('class');

    var result = $buffer.html();

    return result;
};

ContentEditPageBaseViewModel.prototype.takeOriginalModelSnapshot = function () {
    var self = this;

    self.originalModelSnapshot(self.takeCurrentModelSnapshot());
};

ContentEditPageBaseViewModel.prototype.getModelSnapshot = function () {
    var self = this;

    var modelSnapshot = _mappingUtilities2.default.toJS(self.observableContent);

    return modelSnapshot;
};

//todo: rename async
ContentEditPageBaseViewModel.prototype.loadContent = function (id) {
    var self = this;
    var apiEndpointUrl;

    if (id) {
        apiEndpointUrl = self.apiResourceName + '/' + id;
    }

    return self.loadContentInner(apiEndpointUrl);
};

//todo: rename async
ContentEditPageBaseViewModel.prototype.loadLookups = function () {
    return _jquery2.default.Deferred().resolve().promise();
};

//todo: rename async
ContentEditPageBaseViewModel.prototype.afterContentLoaded = function () {
    return _jquery2.default.Deferred().resolve().promise();
};

//todo: rename async
ContentEditPageBaseViewModel.prototype.onContentLoaded = function (content) {
    var self = this;

    return _jquery2.default.Deferred(function (dfd) {
        try {
            self.updateObservableContent(content);
            self.takeOriginalModelSnapshot();

            dfd.resolve();
        } catch (error) {
            dfd.reject.apply(self, arguments);
        }
    }).promise();
};

ContentEditPageBaseViewModel.prototype.updateObservableContent = function (content) {
    var self = this;

    var adaptedContentFromServer = self.fromInputModel(content);

    _knockout2.default.mapping.fromJS(adaptedContentFromServer, self.mapping, self.observableContent);
};

ContentEditPageBaseViewModel.prototype.fromInputModel = function (inputModel) {
    return inputModel;
};

//todo: rename async
ContentEditPageBaseViewModel.prototype.reload = function (id) {
    var self = this;

    return self.loadContent(id).then(function () {
        var route = _router2.default.viewModel().route;

        var url = self.apiResourceName + '/edit';

        var defaultOptions = {
            url: route.url.replace(new RegExp(url, 'i'), url + '/' + id),
            pageTitle: _router2.default.viewModel().pageTitle,
            stateObject: {},
            replace: true
        };

        _router2.default.setUrlSilently(defaultOptions);

        return self.refresh();
    });
};

//todo: rename async
ContentEditPageBaseViewModel.prototype.create = function (writeModel /*, options*/) {
    var self = this;

    return self.api.postJson(self.apiResourceName, writeModel).then(function (data, textStatus, jqXhr) {
        return self.onCreateSuccess(data, textStatus, jqXhr);
    }, function (jqXhr, textStatus, errorThrown) {
        return self.onCreateFail(jqXhr, textStatus, errorThrown);
    });
};

//todo: rename async
ContentEditPageBaseViewModel.prototype.update = function (writeModel /*, options*/) {
    var self = this,
        id = self.getId(),
        queryParams = '';

    if (self.apiQueryParams) {
        queryParams = '?' + _jquery2.default.param(self.apiQueryParams, true);
    }

    return self.api.putJson(self.apiResourceName + '/' + id + queryParams, writeModel).then(function (data, textStatus, jqXhr) {
        return self.onUpdateSuccess(id, data, textStatus, jqXhr);
    }, function (jqXhr, textStatus, errorThrown) {
        return self.onUpdateFail(writeModel, id, jqXhr, textStatus, errorThrown);
    });
};

//todo: rename async
ContentEditPageBaseViewModel.prototype.onCreateSuccess = function (id) {
    var self = this;

    self.isChangesWillBeLostConfirmationDisabled = true;
    _toastr2.default.success(self.settings.contentCreatedMessage);

    return self.reload(id);
};

//todo: rename async
ContentEditPageBaseViewModel.prototype.refresh = function () {
    var self = this;

    return _jquery2.default.Deferred(function (dfd) {
        try {
            //hack!!! - todo: router to be the creator of the viewmodel - refactoring maxime
            self.ignoreDispose = true;
            //hack pour rafraichir le formulaire car certain components ne supportent pas bien le two-way data binding!!!! - problematique!
            var viewModel = _router2.default.viewModel();
            _router2.default.viewModel(viewModel);
            dfd.resolve();
        } catch (error) {
            dfd.reject.apply(self, arguments);
        }
    }).promise();
};

//todo: rename async
ContentEditPageBaseViewModel.prototype.onUpdateFail = function (writeModel, id, jqXhr, textStatus, errorThrown) {
    var self = this;

    switch (jqXhr.status) {
        case 400:
            return self.handleServerValidationErrors(jqXhr.responseJSON);

        case 406:
            return self.handleServerValidationErrors([jqXhr.responseJSON]);

        case 409:
            //Version conflict
            return self.handleSaveConflict(writeModel, jqXhr.responseJSON);

        default:
            return self.handleUnknownError(jqXhr, textStatus, errorThrown);
    }
};

//todo: rename async
ContentEditPageBaseViewModel.prototype.onCreateFail = function (jqXhr, textStatus, errorThrown) {
    var self = this;

    switch (jqXhr.status) {
        case 400:
            return self.handleServerValidationErrors(jqXhr.responseJSON);
        case 406:
            return self.handleServerValidationErrors([jqXhr.responseJSON]);
        default:
            return self.handleUnknownError(jqXhr, textStatus, errorThrown);
    }
};

//todo: rename async
ContentEditPageBaseViewModel.prototype.handleUnknownError = function (jqXhr, textStatus, errorThrown) {
    var self = this;

    _toastr2.default.error(self.settings.unknownErrorMessage + errorThrown);

    return _jquery2.default.Deferred().resolve().promise();
};

//todo: rename async
ContentEditPageBaseViewModel.prototype.onUpdateSuccess = function (id /*, data, textStatus, jqXhr*/) {
    var self = this;

    _toastr2.default.success(self.settings.contentUpdatedMessage);

    return self.loadContent(id);
};

//todo: rename async
ContentEditPageBaseViewModel.prototype.handleSaveConflict = function () /*writeModel, conflictInfo*/{
    //var self = this;

    return _jquery2.default.Deferred().resolve().promise();
};

//todo: rename async
ContentEditPageBaseViewModel.prototype.handleServerValidationErrors = function (errors) {
    var self = this;
    //On affiche seulement les erreurs globales (key = '') pour l'instant
    //TODO: Vider les erreurs avant de commencer ?

    var finalErrors = [];

    for (var key in errors) {
        for (var key2 in errors[key]) {
            finalErrors.push(errors[key][key2]);
        }
    }

    if (_arrayUtilities2.default.isNotEmptyArray(finalErrors)) {
        self.serverSideValidationErrors(finalErrors);
        return self.prepareScreenForValidationErrors();
    }

    return _jquery2.default.Deferred().resolve().promise();
};

//todo: rename async
ContentEditPageBaseViewModel.prototype.prepareScreenForValidationErrors = function () {
    var self = this;

    return _jquery2.default.Deferred(function (dfd) {
        try {
            _toastr2.default.error(self.settings.validationErrorsMessage);

            if (self.selectFirstTabWithValidationErrors) {
                self.selectFirstTabWithValidationErrors();
            }

            (0, _jquery2.default)('html, body').animate({
                scrollTop: 0
            }, dfd.resolve);
        } catch (error) {
            dfd.reject.apply(self, arguments);
        }
    }).promise();
};

ContentEditPageBaseViewModel.prototype.selectFirstTabWithValidationErrors = function () {
    var panel = (0, _jquery2.default)('.tab-pane.active');

    if (!panel.length || !panel.find('.form-group.has-error').length) {
        panel = (0, _jquery2.default)('.form-group.has-error').closest('.tab-pane');
    }

    if (panel.length) {
        (0, _jquery2.default)('.nav-tabs a[href="#' + panel.attr('id') + '"]').click();
    } else {
        (0, _jquery2.default)('.nav-tabs a').first().click();
    }
};

ContentEditPageBaseViewModel.prototype.finalize = function () {
    var self = this;

    self.takeOriginalModelSnapshot();
    _router2.default.navigating.subscribe(self.canNavigate, self);
    (0, _jquery2.default)(window).on('beforeunload.editpage', self.onBeforeUnload.bind(self));
};

ContentEditPageBaseViewModel.prototype.dispose = function () {
    var self = this;

    //this sucks... a dirty hack...
    if (!self.ignoreDispose) {
        self.disposeInner();
    }

    self.ignoreDispose = false;
};

ContentEditPageBaseViewModel.prototype.disposeInner = function () {
    var self = this;

    (0, _jquery2.default)(window).off('beforeunload.editpage');
    _router2.default.navigating.unsubscribe(self.canNavigate, self);
    self.disposer.dispose();
};

//todo: rename async
ContentEditPageBaseViewModel.prototype.saveInner = function (options) {
    var self = this;

    var writeModel = self.toOutputModel(options);

    if (self.editMode() === 'create') {
        return self.create(writeModel, options);
    } else {
        return self.update(writeModel, options);
    }
};

//todo: rename async
ContentEditPageBaseViewModel.prototype.loadContentInner = function (apiEndpointUrl) {
    var self = this;

    var dataParams = null;

    if (self.apiQueryParams) {
        dataParams = {
            data: _jquery2.default.param(self.apiQueryParams, true)
        };
    }

    if (apiEndpointUrl) {
        return self.api.getJson(apiEndpointUrl, dataParams).then(function (content) {
            return self.onContentLoaded(content);
        });
    }

    return _jquery2.default.Deferred().resolve().promise();
};

exports.default = ContentEditPageBaseViewModel;