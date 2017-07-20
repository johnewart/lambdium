'use babel';

import {requirePackages} from 'atom-utils'
import {CompositeDisposable} from 'atom'
import _ from 'lodash'
import $ from 'jquery'
import LambdiumPaneView from './lambdium-pane-view'
import JSZip from 'jszip'

// Polyfill for preprend() (for some reason, preprend itself stopped working in 1.16.0.
// Ideally, this should be changed to not use preprend() at all)
(function (arr) {
  arr.forEach(function (item) {
    if (item.hasOwnProperty('prepend')) {
      return;
    }
    Object.defineProperty(item, 'prepend', {
      configurable: true,
      enumerable: true,
      writable: true,
      value: function prepend() {
        var argArr = Array.prototype.slice.call(arguments),
          docFrag = document.createDocumentFragment();

        argArr.forEach(function (argItem) {
          var isNode = argItem instanceof Node;
          docFrag.appendChild(isNode ? argItem : document.createTextNode(String(argItem)));
        });

        this.insertBefore(docFrag, this.firstChild);
      }
    });
  });
})([Element.prototype, Document.prototype, DocumentFragment.prototype]);

let currentStateKey = null
export default class LambdiumView {
  constructor(addIconToElement) {
    // Create root element
    this.element = document.createElement('div');
    this.element.classList.add('lambdium');
    this.groups = []
    this.paneSub = new CompositeDisposable
    this.addIconToElement = addIconToElement
    let version = atom.getVersion()
  }

  // Returns an object that can be retrieved when package is activated
  serialize() {}

  // Tear down any state and detach
  destroy() {
    this.element.remove()
  this.paneSub.dispose()
    document.getElementById('foldersLabel').outerHTML = ''
  }

  createLambdium(treeView) {
    var AWS = require('aws-sdk');


    projectPaths = atom.project.getPaths()

    var fs = require('fs')
    var yaml = require('js-yaml')
    let that = this

    projectPaths.forEach(function(path) {
      var lambdiumConfig = path + "/.lambdium"
      var pane = null

      console.log(lambdiumConfig);
      if(fs.existsSync(lambdiumConfig)) {
          console.log('File exists')
          var config = yaml.safeLoad(fs.readFileSync(lambdiumConfig, 'utf8'))
          console.log(config)

          var creds = new AWS.SharedIniFileCredentials({profile: config.profile })
          AWS.config.credentials = creds
          AWS.config.region = config.region
          lambda = new AWS.Lambda()

          pane = new LambdiumPaneView(lambda, config, path)
          pane.updateFunctions()
      }

      that.element.appendChild(pane.panelRootList)

    });



    let treeViewInstance = treeView.getTreeViewInstance()
    let treeViewHeader = document.createElement('div')
    let treeViewHeaderSpan = document.createElement('span')
    let treeViewHeaderSpanStyle = document.createElement('strong')
    treeViewHeaderSpanStyle.innerText = 'FOLDERS'
    treeViewHeaderSpan.appendChild(treeViewHeaderSpanStyle)
    treeViewHeader.appendChild(treeViewHeaderSpan)
    treeViewHeader.setAttribute('id', 'foldersLabel');
    treeViewHeader.style.paddingLeft = '10px'
    treeViewHeader.style.marginTop = '5px'
    treeViewHeader.style.marginBottom = '5px'
    treeViewInstance.element.prepend(treeViewHeader)
    treeViewInstance.element.prepend(this.element)
    treeViewInstance.element.scrollTop
  }
}
