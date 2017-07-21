{DockPaneView} = require 'atom-bottom-dock'
{Emitter, CompositeDisposable} = require 'atom'
{$} = require 'space-pen'
Yaml = require 'js-yaml'
fs = require 'fs'

class ControlsView extends DockPaneView
  @content: ->
    @div =>
      @span outlet: 'stopButton', class: 'stop-button icon icon-primitive-square', click: 'onStopClicked'
      @span outlet: 'refreshButton', class: 'refresh-button icon icon-sync', click: 'onRefreshClicked'
      @span outlet: 'clearButton', class: 'clear-button icon icon-history', click: 'onClearClicked'
      @select outlet: 'functionSelector'

  initialize: ->
    super()
    @emitter = new Emitter()
    @subscriptions = new CompositeDisposable()

    @functionSelector.change(@onFunctionSelected)

    @setupTooltips()

  setupTooltips: ->
    config =
      trigger: 'hover focus'
      delay:
        show: 0

    stopConfig = $.extend true, title: 'Stop current task', config
    refreshConfig = $.extend true, title: 'Refetch config tasks', config
    clearConfig = $.extend true, title: 'Clear log', config

    atom.tooltips.add @stopButton, stopConfig
    atom.tooltips.add @refreshButton, refreshConfig
    atom.tooltips.add @clearButton, clearConfig


  updateConfigFiles: (configfiles) ->
    @functionConfigs = {}
    @projects = {}
    @functionSelector.empty()

    for configfile in configfiles
      project = Yaml.safeLoad(fs.readFileSync(configfile.path, 'utf8'))
      project.root = configfile.path.substring(0, configfile.path.lastIndexOf("/"));

      for func in project.functions
        functionKey = "#{project.name}/#{func.name}"
        @functionConfigs[functionKey] = func
        @projects[functionKey] = project
        console.log("Adding #{functionKey}")
        @functionSelector.append $("<option>#{functionKey}</option>")

    if configfiles.length
      @functionSelector.selectedIndex = 0
      @functionSelector.change()

  onDidClickRefresh: (callback) ->
    @emitter.on 'button:refresh:clicked', callback

  onDidClickStop: (callback) ->
    @emitter.on 'button:stop:clicked', callback

  onDidClickClear: (callback) ->
    @emitter.on 'button:clear:clicked', callback

  onDidSelectFunction: (callback) ->
    @emitter.on 'function:selected', callback

  onRefreshClicked: ->
    @emitter.emit 'button:refresh:clicked'

  onStopClicked: ->
    @emitter.emit 'button:stop:clicked'

  onClearClicked: (callback) ->
    @emitter.emit 'button:clear:clicked'

  onFunctionSelected: (e) =>
    func = @functionConfigs[e.target.value]
    project = @projects[e.target.value]
    @emitter.emit 'function:selected', { function: func, project: project }


module.exports = ControlsView
