{DockPaneView, Toolbar} = require 'atom-bottom-dock'
{Emitter, CompositeDisposable} = require 'atom'
OutputView = require './output-view'
ControlsView = require './controls-view'
FileFinderUtil = require '../file-finder-util'
{$} = require 'space-pen'

class LambdiumPaneView extends DockPaneView
  @content: ->
    @div class: 'lambdium-pane', style: 'display:flex;', =>
      @subview 'toolbar', new Toolbar()
      @subview 'outputView', new OutputView()

  initialize: ->
    super()
    @fileFinderUtil = new FileFinderUtil()
    @emitter = new Emitter()
    @subscriptions = new CompositeDisposable()
    @controlsView = new ControlsView()

    @outputView.show()

    @toolbar.addLeftTile item: @controlsView, priority: 0

    @subscriptions.add @controlsView.onDidSelectFunction @updateTargets
    @subscriptions.add @controlsView.onDidClickRefresh @refresh
    @subscriptions.add @controlsView.onDidClickStop @stop
    @subscriptions.add @controlsView.onDidClickClear @clear
    @subscriptions.add @controlsView.onSamToggled @toggleSam

    @getConfigFiles()

  getConfigFiles: ->
    configfiles = []

    for filePath in @fileFinderUtil.findFiles /^\.lambdium/i
      configfiles.push
        path: filePath
        relativePath: FileFinderUtil.getRelativePath filePath
    @controlsView.updateConfigFiles configfiles

  toggleSam: (event) =>
    samEnabled = event.state
    @outputView.toggleSam samEnabled

  updateTargets: (targetEvent) =>
    func = targetEvent.function
    project = targetEvent.project
    @outputView.refresh func, project

  refresh: =>
    @outputView.refresh()
    @getConfigFiles()

  stop: =>
    @outputView.stop()

  clear: =>
    @outputView.clear()

  destroy: ->
    @outputView.destroy()
    @subscriptions.dispose()
    @remove()

module.exports = LambdiumPaneView
