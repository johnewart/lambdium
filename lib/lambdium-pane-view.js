'use babel';

import {CompositeDisposable} from 'atom'
import _ from 'lodash'
import $ from 'jquery'
import pathUtil from 'path'
import cuid from 'cuid'
import JSZip from 'jszip'

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
		$(this.panelRootList).on('click', '.list-item[is=tree-view-file]', function() {
			let tempScrollTop = $('.tree-view-scroller').scrollTop();
			//self.pane.activateItem(self.entryForElement(this).item)
			//editor = atom.workspace.open("lambda://test")
  		//editor.then(function(val) {
			//	val.insertText('Hello, World!')
			//});

			var zip = new JSZip()
			var f = null
			var entry = self.entryForElement(this)
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

					this.lambda.updateFunctionCode(params, function(err, data) {
						if (err) console.log(err, err.stack); // an error occurred
						else     console.log(data);           // successful response
					})

					console.log(params)

				});



				zip
				.generateNodeStream({type:'nodebuffer',streamFiles:true})
				.pipe(fs.createWriteStream('/Users/jewart/Temp/zipfil3.zip'))
				.on('finish', function () {
				    // JSZip generates a readable stream with a "end" event,
				    // but is piped here in a writable stream which emits a "finish" event.
				    console.log("out.zip written.");
				});

				/*zip.generateAsync({type: "blob"}).then(function(content) {
					// upload to lambda
					console.log("ZIP FILE: " + content)
					var buf = new Buffer(content, 'base64'); // decode
					fs.writeFile("/Users/jewart/Temp/zipfile.zip", buf, function(err) {
					    if(err) {
					      console.log("err", err);
					    } else {
					      console.log("Success");
					    }
					  })
				});*/

			});

			console.log("Found function: " + f)

			$('.tree-view-scroller').scrollTop(tempScrollTop);
		})
	}

	updateFunctions() {

    let delay = atom.config.get('lambdium.delay')
		let that = this
		let entryFunc = this.createEntryFromFunction

    setTimeout(function() {
			console.log("Updating function list")

			this.lambda.listFunctions({}, function(err, data) {
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
			});

    }, delay)


		return
	}

	createEntryFromFunction(fun) {
		console.log(fun);
		let fileEntry = document.createElement('li');
    let elementId = cuid();
    fileEntry.setAttribute('id', elementId);
		fileEntry.classList.add('file', 'list-item', 'lambdium-item');
		fileEntry.setAttribute('is', 'tree-view-file');
		let fileEntryName = document.createElement('span');
		fileEntryName.classList.add('name', 'icon', 'icon-file-text');
    //fileEntryName.setAttribute('data-path', '');

    let functionName = fun.FunctionName;
		let functionArn = fun.FunctionArn;


		fileEntryName.setAttribute('data-name', functionName);
		fileEntryName.innerHTML = functionName;
		fileEntry.appendChild(fileEntryName)

		return {
			name: functionName,
			arn: functionArn,
			elementId: elementId,
      element: fileEntry
		}
	}

	entryForElement(element) {
		return _.find(this.entries, entry => entry.element === element);
	}

	// Returns an object that can be retrieved when package is activated
	serialize() {}

	// Tear down any state and detach
	destroy() {
		this.panelRootList.remove();
		return this.paneSub.dispose();
	}
}
