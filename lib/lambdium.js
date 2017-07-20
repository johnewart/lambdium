'use babel';

import { requirePackages } from 'atom-utils'
import { CompositeDisposable } from 'atom';
import LambdiumView from './lambdium-view';

let addIconToElement;

export default {

  lambdiumView: null,
  config: {
    collapsable: {
      title: 'Collapsable',
      description: 'If selected, the open files panel becomes collapsable, i.e., it can be collapsed with a click on the header',
      type: 'boolean',
      default: true
    },
    sortOrder: {
      title: 'Sort Order',
      description: 'Indicate the order of the criteria for the sorting of the open files list, separated by commas. Options: base (filename), ext (extension), dir (directory)',
      type: 'string',
      default: 'base, ext, dir'
    },
    delay: {
      title: 'Delay',
      description: 'Apply a delay after opening a file before it appears in the \'Open Files\' panel in order to allow for double clicking of the file before it appears in the panel and the whole tree view slides down (in ms, i.e., 1000 = 1 second)',
      type: 'integer',
      default: 1000
    },
    animationDuration: {
      title: 'Animation Duration',
      description: 'Indicate the duration of the slide down animation for new elements in the \'Open Files\' panel (in ms, i.e., 1000 = 1 second)',
      type: 'integer',
      default: 300
    }
  },
  activate(state) {
    console.log("Activating lambdium!")
    requirePackages('tree-view').then(([treeView]) => {
			this.lambdiumView = new LambdiumView(addIconToElement)

			if (treeView) {
				this.lambdiumView.createLambdium(treeView)
			}
		})
  },

  deactivate() {
    console.log("Deactivating")
    this.lambdiumView.destroy()
  },

  serialize() {
    return {
    };
  },

  consumeElementIcons(func) {
    addIconToElement = func;
  },

  toggle() {
    console.log('Lambdium was toggled');

    return true;

  }

};
