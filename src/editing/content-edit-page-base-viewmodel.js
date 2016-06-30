// Copyright (c) CBC/Radio-Canada. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

import ko from 'knockout';
import $ from 'jquery';
import _ from 'lodash';
import mappingUtilities from 'koco-mapping-utilities';
import koco from 'koco';
import toastr from 'toastr';
import modaler from 'koco-modaler';
import arrayUtilities from 'koco-array-utilities';
import validationUtilities from 'validation-utilities';
import Disposer from 'koco-disposer';
import httpUtilities from 'koco-http-utilities';

const defaultSettings = {
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
};

class ContentEditPageBaseViewModel {
  constructor(context, componentInfo, api, apiResourceName, observableContent, settings) {
    if (!api) {
      throw new Error('ContentEditPageBaseViewModel - missing api');
    }

    if (!apiResourceName) {
      throw new Error('ContentEditPageBaseViewModel - missing api resource name');
    }

    if (!observableContent) {
      throw new Error('ContentEditPageBaseViewModel - missing api observable content');
    }

    this.route = context.route;

    this.settings = $.extend({}, defaultSettings, settings);

    this.ignoreDispose = false;

    this.apiQueryParams = this.settings.apiQueryParams;

    this.api = api;

    this.disposer = new Disposer();

    this.mapping = this.settings.mapping || {};

    if (this.settings.observableValueObjects) {
      mappingUtilities.mapAsObservableValueObjects(this.mapping,
        this.settings.observableValueObjects);
    }

    this.observableContent = ko.validatedObservable(ko.mapping
      .fromJS(observableContent, this.mapping));
    this.observableContent.extend({
      bootstrapValidation: {}
    });

    this.originalModelSnapshot = ko.observable();

    this.apiResourceName = apiResourceName;

    this.validatedObservables = [this.observableContent];

    this.editMode = ko.pureComputed(() => this.getId() ? 'update' : 'create');
    this.disposer.add(this.editMode);

    this.serverSideValidationErrors = ko.observableArray([]);

    this.content = ko.pureComputed(() => mappingUtilities.toJS(this.observableContent));
    this.disposer.add(this.content);
  }

  activate() {
    return this.loadLookups()
      .then(() => this.loadContent(this.route.urlParams[0].id))
      .then(() => this.afterContentLoaded())
      .then(() => {
        this.finalize();
      })
      .catch((ex) => {
        this.handleUnknownError(ex);
      });
  }

  getId() {
    return this.observableContent().id();
  }

  canNavigate() {
    if (this.isChangesWillBeLostConfirmationDisabled) {
      return true;
    }

    if (!this.hasModelChanged()) {
      return true;
    }

    return modaler.show('confirm', {
      message: this.settings.quitConfirmMessage,
      okButtonHtml: this.settings.confirmQuitButtonText
    });
  }

  onBeforeUnload() {
    if (this.isChangesWillBeLostConfirmationDisabled) {
      return;
    }

    if (!this.hasModelChanged()) {
      return;
    }

    return this.settings.quitConfirmMessage;
  }

  save(options) {
    this.serverSideValidationErrors([]);

    return this.validate().then((isValid) => {
      if (isValid) {
        return this.saveInner(options);
      }

      return Promise.resolve();
    });
  }

  validate() {
    return this.validateInner()
      .then(isValid => {
        if (!isValid) {
          return this.prepareScreenForValidationErrors();
        }

        return Promise.resolve(true);
      });
  }

  validateInner() {
    return validationUtilities.validateObservables(this.validatedObservables);
  }

  toOutputModel( /*saveOptions*/ ) {
    return mappingUtilities.toJS(this.observableContent);
  }

  /* todo: extraire logique de isEqual pour contenu */

  hasModelChanged() {
    return this.isEqual(
      this.originalModelSnapshot(),
      this.takeCurrentModelSnapshot(),
      this.settings.tinymcePropertyNames,
      this.settings.alikeArraysPropertyNames
    ) === false;
  }

  isEqual(object, other, htmlPropertyNames, alikeArraysPropertyNames) {
    object = mappingUtilities.toJS(object);
    other = mappingUtilities.toJS(other);

    if (_.isObject(object) && _.isObject(other)) {
      var hasHtmlPropertyNames = arrayUtilities.isNotEmptyArray(htmlPropertyNames);
      var hasAlikeArraysPropertyNames = arrayUtilities.isNotEmptyArray(alikeArraysPropertyNames);

      return this.isEqualObject(object, other, htmlPropertyNames, alikeArraysPropertyNames, hasHtmlPropertyNames, hasAlikeArraysPropertyNames);
    }

    throw new Error('content-utilities - isEqual - this function can only compare objects (_.isObject).');
  }

  isEqualObject(object, other, htmlPropertyNames, alikeArraysPropertyNames, hasHtmlPropertyNames, hasAlikeArraysPropertyNames) {
    var propertiesEqual;

    if (_.keys(object).length !== _.keys(other).length) {
      return false;
    }

    for (var key in object) {
      if (object.hasOwnProperty(key)) {
        if (other.hasOwnProperty(key)) {
          propertiesEqual = this.isEqualProperty(key, object, other, htmlPropertyNames, alikeArraysPropertyNames, hasHtmlPropertyNames, hasAlikeArraysPropertyNames);

          if (!propertiesEqual) {
            return false;
          }
        } else {
          return false;
        }
      }
    }

    return true;
  }

  isEqualProperty(key, object, other, htmlPropertyNames, alikeArraysPropertyNames, hasHtmlPropertyNames, hasAlikeArraysPropertyNames) {
    var val1 = object[key];
    var val2 = other[key];

    if (_.isFunction(val1) || _.isFunction(val2)) {
      if (!_.isFunction(val1) || !_.isFunction(val2)) {
        return false;
      }

      return true; // we do not compare functions...
    }

    if (_.isArray(val1) || _.isArray(val2)) {
      if (hasAlikeArraysPropertyNames && _.includes(alikeArraysPropertyNames, key)) {
        // humm... c'est bon ça!? comparaison boiteuse... pourquoi on fait ça donc? pour ne pas tenir compte de l'ordre des valeurs de l'array!?
        return val1.length === val2.length && _.intersection(val1, val2).length === val1.length;
      }

      return val1.length === val2.length && _.every(val1, function(val, i) {
        // pas de récursion pour les valeurs des array
        return _.isEqual(val, val2[i]);
      });
    }

    if (_.isObject(val1) || _.isObject(val2)) {
      if (!_.isObject(val1) || !_.isObject(val2)) {
        return false;
      } else {
        return this.isEqualObject(val1, val2, htmlPropertyNames, alikeArraysPropertyNames, hasHtmlPropertyNames, hasAlikeArraysPropertyNames);
      }
    }

    if (hasHtmlPropertyNames && _.includes(htmlPropertyNames, key)) {
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

      // Attention: IE9+
      // http://stackoverflow.com/questions/10679762/how-to-compare-two-html-elements/19342581
      return html1.isEqualNode(html2);
    }

    return _.isEqual(val1, val2);
  }

  /*************************************************************/


  takeCurrentModelSnapshot() {
    var modelSnapshot = this.getModelSnapshot();

    for (var i = 0; i < this.settings.tinymcePropertyNames.length; i++) {
      var propertyName = this.settings.tinymcePropertyNames[i];

      if (modelSnapshot.hasOwnProperty(propertyName)) {
        modelSnapshot[propertyName] = this.clearContentFromTinymceSpecificMarkup(modelSnapshot[propertyName]);
      }
    }

    return modelSnapshot;
  }

  clearContentFromTinymceSpecificMarkup(tinymceContnet) {
    const $buffer = $('<div>');
    $buffer.html(tinymceContnet);
    $buffer.find('.articleBody').removeClass('articleBody');
    $buffer.find('.first').removeClass('first');
    $buffer.find('[itemprop]').removeAttr('itemprop');
    $buffer.find('*[class=""]').removeAttr('class');

    return $buffer.html();
  }

  takeOriginalModelSnapshot() {
    this.originalModelSnapshot(this.takeCurrentModelSnapshot());
  }

  getModelSnapshot() {
    return mappingUtilities.toJS(this.observableContent);
  }

  loadContent(id) {
    let apiEndpointUrl;

    if (id) {
      apiEndpointUrl = `${this.apiResourceName}/${id}`;
    }

    return this.loadContentInner(apiEndpointUrl);
  }

  loadLookups() {
    return Promise.resolve();
  }

  afterContentLoaded() {
    return Promise.resolve();
  }

  onContentLoaded(content) {
    return new Promise((resolve) => {
      this.updateObservableContent(content);
      this.takeOriginalModelSnapshot();
      resolve();
    });
  }

  updateObservableContent(content) {
    const adaptedContentFromServer = this.fromInputModel(content);

    ko.mapping.fromJS(adaptedContentFromServer, this.mapping, this.observableContent);
  }

  fromInputModel(inputModel) {
    return inputModel;
  }

  reload(id) {
    return this.loadContent(id).then(() => {
      const route = koco.router.context().route;
      const url = `${this.apiResourceName}/edit`;
      const defaultOptions = {
        url: route.url.replace(new RegExp(url, 'i'), `${url}/${id}`),
        pageTitle: koco.router.context().pageTitle,
        stateObject: {},
        replace: true
      };

      koco.router.setUrlSilently(defaultOptions);

      return this.refresh();
    });
  }

  create(writeModel) {
    return this.api.fetch(this.apiResourceName, {
        method: 'POST',
        body: JSON.stringify(writeModel)
      })
      .then(data => this.onCreateSuccess(data))
      .catch(ex => this.onCreateFail(ex));
  }

  update(writeModel) {
    const id = this.getId();
    let url = `${this.apiResourceName}/${id}`;

    if (this.apiQueryParams) {
      // todo: why us $.param(.., true) here and false elsewhere?
      url = `${url}?${$.param(this.apiQueryParams, true)}`;
    }

    return this.api.fetch(url, {
        method: 'PUT',
        body: JSON.stringify(writeModel)
      })
      .then(data => this.onUpdateSuccess(id, data))
      .catch(ex => this.onUpdateFail(writeModel, id, ex));
  }

  onCreateSuccess(id) {
    this.isChangesWillBeLostConfirmationDisabled = true;
    toastr.success(this.settings.contentCreatedMessage);

    return this.reload(id);
  }

  refresh() {
    return new Promise((resolve) => {
      // hack!!! - todo: koco.router to be the creator of the viewmodel - refactoring maxime
      this.ignoreDispose = true;
      // hack pour rafraichir le formulaire car certain components ne supportent pas bien le two-way data binding!!!! - problematique!
      const viewModel = koco.router.context();
      koco.router.context(viewModel);
      resolve();
    });
  }

  onUpdateFail(writeModel, id, ex) {
    switch (ex.response.status) {
      case 400:
        return this.handleServerValidationErrors(ex.response.json());

      case 406:
        return this.handleServerValidationErrors([ex.response.json()]);

      case 409: // Version conflict
        return this.handleSaveConflict(writeModel, ex.response.json());

      default:
        return this.handleUnknownError(ex);
    }
  }

  onCreateFail(ex) {
    switch (ex.response.status) {
      case 400:
        return this.handleServerValidationErrors(ex.response.json());
      case 406:
        return this.handleServerValidationErrors([ex.response.json()]);
      default:
        return this.handleUnknownError(ex);
    }
  }

  handleUnknownError(ex) {
    toastr.error(`${this.settings.unknownErrorMessage} ${ex}`);

    return Promise.resolve();
  }

  onUpdateSuccess(id /* , data */ ) {
    toastr.success(this.settings.contentUpdatedMessage);

    return this.loadContent(id);
  }

  handleSaveConflict( /* writeModel, conflictInfo */ ) {
    return Promise.resolve();
  }

  handleServerValidationErrors(errors) {
    // On affiche seulement les erreurs globales (key = '') pour l'instant
    // TODO: Vider les erreurs avant de commencer ?

    var finalErrors = [];

    for (var key in errors) {
      for (var key2 in errors[key]) {
        finalErrors.push(errors[key][key2]);
      }
    }

    if (arrayUtilities.isNotEmptyArray(finalErrors)) {
      this.serverSideValidationErrors(finalErrors);
      return this.prepareScreenForValidationErrors();
    }

    return Promise.resolve();
  }

  prepareScreenForValidationErrors() {
    return new Promise((resolve) => {
      toastr.error(this.settings.validationErrorsMessage);

      if (this.selectFirstTabWithValidationErrors) {
        this.selectFirstTabWithValidationErrors();
      }

      $('html, body').animate({
        scrollTop: 0
      }, () => {
        resolve(false);
      });
    });
  }

  selectFirstTabWithValidationErrors() {
    let panel = $('.tab-pane.active');

    if (!panel.length || !panel.find('.form-group.has-error').length) {
      panel = $('.form-group.has-error').closest('.tab-pane');
    }

    if (panel.length) {
      $(`.nav-tabs a[href="#${panel.attr('id')}"]`).click();
    } else {
      $('.nav-tabs a').first().click();
    }
  }

  finalize() {
    this.takeOriginalModelSnapshot();
    koco.router.navigating.subscribe(this.canNavigate, this);
    $(window).on('beforeunload.editpage', this.onBeforeUnload.bind(this));
  }

  dispose() {
    // this sucks... a dirty hack...
    if (!this.ignoreDispose) {
      this.disposeInner();
    }

    this.ignoreDispose = false;
  }

  disposeInner() {
    $(window).off('beforeunload.editpage');
    koco.router.navigating.unsubscribe(this.canNavigate, this);
    this.disposer.dispose();
  }

  saveInner(options) {
    const writeModel = this.toOutputModel(options);

    if (this.editMode() === 'create') {
      return this.create(writeModel, options);
    }

    return this.update(writeModel, options);
  }

  loadContentInner(apiEndpointUrl) {
    if (apiEndpointUrl) {
      let url = apiEndpointUrl;

      if (this.apiQueryParams) {
        // todo: why us $.param(.., true) here and false elsewhere?
        url = `${url}?${$.param(this.apiQueryParams, true)}`;
      }

      return this.api.fetch(apiEndpointUrl)
        .then((content) => this.onContentLoaded(content));
    }

    return Promise.resolve();
  }
}

export default ContentEditPageBaseViewModel;
