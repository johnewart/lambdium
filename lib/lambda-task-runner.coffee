{BufferedProcess} = require 'atom'

Yaml = require 'js-yaml'
fs = require 'fs'
path = require 'path'
JSZip = require 'jszip'
AWS = require 'aws-sdk'



class LambdaTaskRunner
  constructor: (func, project) ->
    @function = func
    @project = project

    creds = new AWS.SharedIniFileCredentials({profile: @project.profile })
    AWS.config.credentials = creds
    AWS.config.region = project.region
    @lambda = new AWS.Lambda()

  run: (task, samEnabled, onOutput, onError, onSuccess) ->
    @log = onOutput
    @error = onError
    @success = onSuccess

    if task.action == 'deploy'
      @uploadCode()
    if task.action == 'invoke'
      if samEnabled
        @invokeLocally(task.data, onOutput, onError)
      else
        @invoke(task.data)

  uploadCode: ->
    @log("Upload function code!")
    console.log(@function)
    @log("Project files rooted at #{@project.root}")

    zip = new JSZip()

    fileList = []

    for p in @function.files
    	p = p.replace(/\/$/,'')
    	filePath = path.join(@project.root, p)
    	if(fs.existsSync(filePath))
    		if(fs.lstatSync(filePath).isDirectory())
          children = @walk(filePath)
          for f in children
            fileList.push f.replace(@project.root, "").replace(/^\//,'')
        else
          fileList.push p

    pattern = ".*\\.(" + @function.ignore.join("|") + ")$"
    @log("Ignoring pattern #{pattern}")
    ignoreRegex = new RegExp(pattern, 'g')

    for file in fileList
      if !file.match(ignoreRegex)
        filePath = path.join(@project.root, file);
        data = fs.readFileSync(filePath, {encoding: 'utf8'});
        @log("Adding #{file}...")
        zip.file(file, data)

    functionName = @function.name
    error = @error
    logger = @log

    zip
      .generateAsync({type:"nodebuffer"})
      .then (buffer) ->
        #params = {
        #    FunctionName: @function.name,
        #  Publish: true,
        #  ZipFile: buffer
        #}
        @lambda.updateFunctionCode FunctionName: functionName, Publish: true, ZipFile: buffer, (err, data) ->
          if err
            error "Unable to update Lambda function code: #{err}"
          else
            logger "Updated Lambda function #{data.FunctionName} to version #{data.Version}!"
            console.log(data)


  invokeLocally: (datafile, stdout, stderr) ->
    @log "Invoking SAM with #{@function.name} with data file #{datafile} in #{@project.root}"
    @process?.kill()
    @process = null

    executable = atom.config.get('lambdium.pathToSAMBinary')
    args = ['local', 'invoke', '-p', '-e', datafile, @function.name]

    @log "Running: #{executable} #{args.join ' '}"
    process.env.PATH = switch process.platform
      when 'win32' then process.env.PATH
      else "#{process.env.PATH}:/usr/local/bin"

    @process = new BufferedProcess
      command: executable
      args: args
      options:
        env: process.env
        cwd: @project.root
      stdout: stdout
      stderr: stderr

  invoke: (datafile) ->
    @log "Invoking #{@function.name} with data file #{datafile}..."
    filePath = path.join(@project.root, datafile);
    data = fs.readFileSync(filePath, {encoding: 'utf8'});

    error = @error
    logger = @log
    success = @success
    functionName = @function.name
    @lambda.invoke FunctionName: @function.name, InvocationType: 'RequestResponse', LogType: 'Tail', Payload: data, (err, data) ->
    	if err
    		error "Unable to invoke #{functionName}: #{err}"
    	else
        logger "Executed #{functionName}!"
        logger "Status: #{data.StatusCode}"

        if data.FunctionError is not "Unhandled"
          console.log("Error!")
          error data.FunctionError
          error atob(data.LogResult)
        else
          console.log("Success!")
          success "SUCCESS!"
          logger atob(data.LogResult)

        console.log(data)

  walk: (dir) ->
    results = []
    list = fs.readdirSync(dir)
    for file in list
      file = dir + '/' + file
      stat = fs.statSync(file)
      if (stat and stat.isDirectory())
        results = results.concat(@walk(file))
      else
        results.push(file)
    return results

  destroy: ->
    @process?.kill()
    @process = null

module.exports = LambdaTaskRunner
