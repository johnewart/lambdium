{View, $} = require 'space-pen'
{Emitter, CompositeDisposable} = require 'atom'
LambdaTaskRunner = require '../lambda-task-runner'
Converter = require 'ansi-to-html'
{Toolbar} = require 'atom-bottom-dock'

class OutputView extends View
  @content: ->
    @div class: 'output-view', style: 'display:flex;', =>
      @div class: 'content-container', =>
        @div outlet: 'taskContainer', class: 'task-container', =>
          @div outlet: 'taskListContainer', class: 'task-list-container', =>
            @ul outlet: 'taskList'
        @div outlet: 'outputContainer', class: 'output-container native-key-bindings', tabindex: -1

  initialize: ->
    @emitter = new Emitter()
    @converter = new Converter fg: $('<span>').css('color')
    @subscriptions = new CompositeDisposable()


  setupTaskList: (tasks) ->
    for task in @tasks.sort()
      listItem = $("<li><span class='icon icon-zap'>#{task}</span></li>")

      do (task) => listItem.first().on 'click', =>
        @runTask task

      @taskList.append listItem


  addLambdaTasks: ->
    output = "Loading tasks for #{@func.name}"
    @writeOutput output, 'text-info'

    @taskList.empty()

    task = { action: "deploy" }
    listItem = $("<li><span class='icon icon-cloud-upload'>Deploy code</span></li>")
    do (task) => listItem.first().on 'click', =>
      @runTask task
    @taskList.append listItem

    for test in @func.tests
      task = { action: 'invoke', data: test.file }
      listItem = $("<li><span class='icon icon-zap'>#{test.name}</span></li>")
      do (task) => listItem.first().on 'click', =>
        @runTask task
      @taskList.append listItem


  setupLambdaTaskRunner: (func, project, projectRoot) ->
    @LambdaTaskRunner = new LambdaTaskRunner func, project, projectRoot

  runTask: (task) ->
    @LambdaTaskRunner.run(task, @onOutput, @onError, @onSuccess)



  chunkSubstr: (str, size) ->
    numChunks = Math.ceil(str.length / size)
    chunks = new Array(numChunks);
    offset = 0
    for i in [0...numChunks]
      chunks[i] = str.substr(offset, size)
      offset += size
    chunks


  writeOutput: (line, klass) ->
    return unless line?.length
    if line.length > 100
      lines = @chunkSubstr(line, 100)
      for l in lines
        el = $('<pre>')
        el.append l

        el.addClass klass if klass
        @outputContainer.append el
        @outputContainer.scrollToBottom()

    else
      el = $('<pre>')
      el.append line

      el.addClass klass if klass
      @outputContainer.append el
      @outputContainer.scrollToBottom()

  onSuccess: (output) =>
    for line in output.split '\n'
      @writeOutput @converter.toHtml(line), 'text-success'

  onOutput: (output) =>
    for line in output.split '\n'
      @writeOutput @converter.toHtml(line), 'text-info'

  onError: (output) =>
    for line in output.split '\n'
      @writeOutput @converter.toHtml(line), 'text-error'

  onExit: (code) =>
    @writeOutput "Exited with code #{code}",
      "#{if code then 'text-error' else 'text-success'}"

  stop: ->
    if @LambdaTaskRunner
      @LambdaTaskRunner.destroy()
      @writeOutput('Task Stopped', 'text-info')

  clear: ->
    @outputContainer.empty()

  refresh: (func, project) ->
    @destroy()
    @outputContainer.empty()
    @taskList.empty()

    unless func
      @func = null
      return

    @func = func
    @project = project
    @setupLambdaTaskRunner(func, project)
    @addLambdaTasks()

  destroy: ->
    @LambdaTaskRunner?.destroy()
    @LambdaTaskRunner = null
    @subscriptions?.dispose()

module.exports = OutputView
