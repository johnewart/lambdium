{CompositeDisposable} = require 'atom'
{BasicTabButton} = require 'atom-bottom-dock'

LambdiumPane = require './views/lambdium-pane'


module.exports =

  activate: (state) ->
    @subscriptions = new CompositeDisposable()
    @lamdiumPanes = []

    packageFound = atom.packages.getAvailablePackageNames()
      .indexOf('bottom-dock') != -1

    unless packageFound
      atom.notifications.addError 'Could not find Bottom-Dock',
        detail: 'Lambdium: The bottom-dock package is a dependency. \n
        Learn more about bottom-dock here: https://atom.io/packages/bottom-dock'
        dismissable: true

    @subscriptions.add atom.commands.add 'atom-workspace',
      'lambdium:add': => @add()

  consumeBottomDock: (@bottomDock) ->
    @add true

  add: (isInitial) ->
    console.log("Hey-yo!")

    if @bottomDock
      newPane = new LambdiumPane()
      @lamdiumPanes.push newPane

      config =
        name: 'Lambdium'
        id: newPane.getId()
        active: newPane.isActive()

      @bottomDock.addPane newPane, 'Lambdium', isInitial

  deactivate: ->
    @subscriptions.dispose()
    @bottomDock.deletePane pane.getId() for pane in @lamdiumPanes


  config: {
    pathToSAMBinary: {
      type: 'string',
      default: 'sam',
      order: 1,
      title: "Path to SAM binary"
    },
  };
