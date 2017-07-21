'use babel';

import {CompositeDisposable} from 'atom'
import _ from 'lodash'
import $ from 'jquery'
import pathUtil from 'path'
import cuid from 'cuid'
import JSZip from 'jszip'

var MessagePanelView = require('atom-message-panel').MessagePanelView
var PlainMessageView = require('atom-message-panel').PlainMessageView

export default class LambdiumPaneView {
	constructor(lambda, config, projectPath) {

    this.entries = []
		this.activeEntry = null
		this.paneSub = new CompositeDisposable
    this.untitledCounter = 1
		this.lambda = lambda
		this.config = config
		this.projectPath = projectPath


    // Hierarchy of a panel:
    // <div class="lambdium"> -> created in lambdium-view.js as this.element
    //   <ul class="list-tree has-collapsable-children"> -> this.panelRootList
    //     <li class="list-nested-item expanded"> -> panelHeaderFileEntry
    //       <div class="lambdium-title"> -> header
    //         <span> -> headerSpan
    //           <strong> -> headerSpanStyle
    //             OPEN FILES
    //           </strong>
    //         </span>
    //       </div>
    //       <ol class="list-tree"> -> this.entriesList
    //          <li class="file list-item lambdium-item" is="tree-view-file"> -> fileEntry
    //            <button class="close-open-file"></button> -> closeButton
    //            <span class="name icon icon-file-text" data-path="/Users/..." data-name="open-file-view.js"> -> fileEntryName
    //              lambdium-view.js
    //            </span>
    //          </li>
    //          ...
    //       </ol>
    //     </li>
    //   </ul>
    // </div>

		this.panelRootList = document.createElement('ul')
		this.panelRootList.classList.add('list-tree', 'has-collapsable-children')
		let panelHeaderFileEntry = document.createElement('li')
		panelHeaderFileEntry.classList.add('list-nested-item', 'expanded')
		this.entriesList = document.createElement('ol')
		this.entriesList.classList.add('list-tree')
		let header = document.createElement('div')
    header.classList.add('lambdium-title')

		atom.config.observe('lambdium.collapsable', collapsable => {
			if (collapsable) {
				header.classList.add('list-item')
				header.style.height = '24px'
				header.style.paddingTop = '0px'
				header.style.marginTop = '-5px'
				header.style.paddingBottom = '10px'
				header.style.marginBottom = '1px'
			} else {
				header.classList.remove('list-item')
				header.style.height = '21px'
				header.style.paddingTop = '5px'
				header.style.marginTop = '0px'
				header.style.paddingBottom = '0px'
			}
		})

		let headerSpan = document.createElement('span')
		let headerSpanStyle = document.createElement('strong')
		headerSpanStyle.innerText = 'λ (' + config.profile + ')'
		header.style.paddingLeft = '5px'

		headerSpan.appendChild(headerSpanStyle)
		header.appendChild(headerSpan)
		panelHeaderFileEntry.appendChild(header)
		panelHeaderFileEntry.appendChild(this.entriesList)
		this.panelRootList.appendChild(panelHeaderFileEntry)

		$(this.panelRootList).on('click', '.list-nested-item > .list-item', function() {
			panelHeaderFileEntry = $(this).closest('.list-nested-item')
			panelHeaderFileEntry.toggleClass('expanded')
			return panelHeaderFileEntry.toggleClass('collapsed')
		})

    let self = this
		$(this.panelRootList).on('click', '.test-entry', function() {
			console.log("Clicked test!")
			console.log(this)
			var entry = self.entryForElementId(this.getAttribute('test-for'))
			var fs = require('fs'),
					path = require('path'),
					filePath = path.join(projectPath, this.getAttribute('data-file')),
					data = fs.readFileSync(filePath, {encoding: 'utf8'});

			console.log(data)

			var params = {
				FunctionName: entry.name,
				InvocationType: 'RequestResponse',
				LogType: 'Tail',
				Payload: data
			}
			let that = this

			self.lambda.invoke(params, function(err, data) {
				if (err) {
					console.log(err, err.stack); // an error occurred
				} else {
					var messages = new MessagePanelView({ title: 'Lambdium Output' });

					messages.attach();

					var msg = "Executed Lambda function " + entry.name + "!"
					messages.add(new PlainMessageView({
						message: msg,
						className: 'text-success'
					}));


					msg = "Status: " + data.StatusCode + " -- " + data.FunctionError;
					messages.add(new PlainMessageView({
						message: msg,
						className: 'text-success'
					}))

					msg = "Log: " + atob(data.LogResult)
					messages.add(new PlainMessageView({
						message: msg,
						className: 'text-success'
					}))

					console.log(data);           // successful response
				}
			})

		});


		$(this.panelRootList).on('click', '.function-entry', function() {
			console.log("Clicked function!")
			console.log(this)

			let tempScrollTop = $('.tree-view-scroller').scrollTop();
			//self.pane.activateItem(self.entryForElement(this).item)
			//editor = atom.workspace.open("lambda://test")
  		//editor.then(function(val) {
			//	val.insertText('Hello, World!')
			//});

			var zip = new JSZip()
			var f = null
			var entry = self.entryForElementId(this.id)
			console.log("Function: " + entry)
			var fs = require('fs'),
					path = require('path');

			var walk = function(dir) {
			    var results = []
			    var list = fs.readdirSync(dir)
			    list.forEach(function(file) {
			        file = dir + '/' + file
			        var stat = fs.statSync(file)
			        if (stat && stat.isDirectory()) results = results.concat(walk(file))
			        else results.push(file)
			    })
			    return results
			}

			config.functions.forEach(function(func) {
				if(func.name == entry.name) {
					fileList = []

					func.files.forEach(function(p) {
						p = p.replace(/\/$/,'')
						filePath = path.join(projectPath, p);
						if(fs.existsSync(filePath)) {
							if(fs.lstatSync(filePath).isDirectory()) {
								var subdirFiles = walk(filePath)
								subdirFiles.forEach(function(fullPath) {
									var shortPath = fullPath.replace(projectPath, "").replace(/^\//,'')
									fileList.push(shortPath);
								})
							} else {
								fileList.push(p)
							}
						}
					});


					fileList.forEach(function(p) {
						var include = true;

						func.ignore.forEach(function(extension) {
							var pattern = ".*\\." + extension + "$"
							var re = new RegExp(pattern, 'g')
							if (p.match(re)) {
								console.log("Ignoring " + p);
								include = false;
							}
						})

						if (include) {
							filePath = path.join(projectPath, p);
							data = fs.readFileSync(filePath, {encoding: 'utf8'});
							console.log('adding file ' + filePath + ' as ' + p)
							zip.file(p, data)
						}
					})
				}


				zip.generateAsync({type:"nodebuffer"}).then(function (buffer) {

					var params = {
						FunctionName: func.name,
						Publish: true,
						ZipFile: buffer
					}
					let that = this

					this.lambda.updateFunctionCode(params, function(err, data) {
						if (err) {
							console.log(err, err.stack); // an error occurred
						} else {
							var messages = new MessagePanelView({ title: 'Lambdium Output' });

							messages.attach();

							var msg = "Updated Lambda function " + data.FunctionName + " to version " + data.Version + "!"
							messages.add(new PlainMessageView({
								message: msg,
								className: 'text-success'
							}));
							console.log(data);           // successful response
						}
					})


					console.log(params)

				});

			});

			$('.tree-view-scroller').scrollTop(tempScrollTop);
		})
	}

	updateFunctions() {

    let delay = atom.config.get('lambdium.delay')
		let that = this
		let entryFunc = this.createEntryFromFunction

    setTimeout(function() {
			console.log("Updating function list")
			that.config.functions.forEach(function(func) {
				record = entryFunc(func)
				that.entriesList.appendChild(record.element);
				//$(fileEntry).hide().slideDown(animationDuration);
				that.entries.push(record)
			});
			/*this.lambda.listFunctions({}, function(err, data) {
				if (err) console.log(err, err.stack); // an error occurred
				else {
					console.log(data);
					data.Functions.forEach(function(item) {
						record = entryFunc(item)
    				that.entriesList.appendChild(record.element);
            //$(fileEntry).hide().slideDown(animationDuration);
						that.entries.push(record)
					});
				}
			});*/

    }, delay)


		return
	}

	createEntryFromFunction(fun) {
		console.log(fun);

		let funcEntry = document.createElement('li');
    let elementId = cuid();
    funcEntry.classList.add('file', 'list-item', 'lambdium-item');
		funcEntry.setAttribute('is', 'tree-view-function');
		let funcEntryName = document.createElement('span');
		funcEntryName.setAttribute('id', elementId);
		funcEntryName.classList.add('name', 'icon', 'icon-file-text', 'function-entry');
    //fileEntryName.setAttribute('data-path', '');

    let functionName = fun.name;
		let functionArn = fun.arn || "";


		funcEntryName.setAttribute('data-name', functionName);
		funcEntryName.innerHTML = functionName;
		funcEntry.appendChild(funcEntryName)

		let funcTestList = document.createElement("ul")

		fun.tests.forEach(function(test) {
			let testId = cuid()
			let funcTest = document.createElement("li")
			let funcTestName = document.createElement('span')
			funcTestName.innerHTML = test.name
			funcTestName.setAttribute('data-name', test.name)
			funcTestName.setAttribute('data-file', test.file)
			funcTestName.setAttribute('test-for', elementId)
			funcTestName.classList.add('name', 'icon', 'icon-file-text', 'test-entry');

			funcTest.appendChild(funcTestName)
			funcTest.setAttribute('is', 'tree-view-test')
			funcTest.setAttribute('id', testId)
			funcTestList.appendChild(funcTest)
		})

		funcEntry.appendChild(funcTestList)

		return {
			name: functionName,
			arn: functionArn,
			elementId: elementId,
      element: funcEntry
		}
	}

	entryForElementId(elementId) {
		return _.find(this.entries, entry => entry.elementId === elementId);
	}

	// Returns an object that can be retrieved when package is activated
	serialize() {}

	// Tear down any state and detach
	destroy() {
		this.panelRootList.remove();
		return this.paneSub.dispose();
	}
}
