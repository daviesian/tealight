var github = null;
var python_worker = null;
var currentFile = null;
var codeMirror = null;

String.prototype.capitalize = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
}
$(function()
{
	// Document ready
	
	
	ensureGithubAvailable();
	
	codeMirror = CodeMirror($("#code-editor")[0],
	{
		mode: "python",
		lineNumbers: true,
		theme: "solarized dark"
	});
	
});

// EVENT HANDLERS

$("body").on("click", ".github-signin", function(e)
{
	var btn = e.target;
	var userField = $(btn).closest("form").find("input[type='text']")[0];
	var passwordField = $(btn).closest("form").find("input[type='password']")[0];
	var username = userField.value;
	var password = passwordField.value;
	
	userField.value = "";
	passwordField.value = "";
	
	githubLogin(username, password);
	
	e.preventDefault();
	return false;
});

$("body").on("click", ".logout-button", function(e)
{
	githubLogout();
	e.preventDefault();
	return false;
});

$("body").on("click", ".choose-tab", function(e)
{
	$('#navtabs a[href="#' + $(e.target).data("targetTab") + '"]').tab("show")
});

$("body").on("click", ".choose-tealight-mode", function(e)
{
	$('#navtabs a[data-tealight-mode="' + $(e.target).data("targetTealightMode") + '"]').tab("show")
});

$("body").on("show.bs.tab", "a[data-toggle='tab']", function(e)
{
	var previousTab = $(e.relatedTarget).attr("href");
	var newTab = $(e.target).attr("href");
	console.log("Leaving tab", previousTab, "entering tab", newTab);
	
	if (newTab == "#code")
	{
		var codeMode = $(e.target).data("tealightMode");
		console.log("Code mode", codeMode);
		$(".mode-title").html(codeMode.capitalize() + " Mode");
		loadTealightFilesFromRepo(codeMode);
	}
});

$("body").on("click", "#run-code", function(e)
{
	runCode();
});

$("body").on("click", "#stop-code", function(e)
{
	stopCode();
});

$("body").on("code-started", function(e)
{
	$("#run-code").html("Restart");
	$("#stop-code").attr("disabled", false);
});

$("body").on("code-finished", function(e)
{
	$("#run-code").html("Run");
	$("#stop-code").attr("disabled", true);
});

$("body").on("tealight-files-repo-confirmed", function(e)
{
	//loadTealightFilesFromRepo();
});

$("body").on("file-loaded", function(e)
{
	$("#current-code-file").html(currentFile.name);
});

function modalError(title, message)
{
	$('#modal-error .modal-title').html(title);
	$('#modal-error .modal-body').html(message);
	$('#modal-error').modal("show");
}

function ensureGithubAvailable()
{
	if (github)
		return; // Github already logged in.
		
	github = githubFromCookie();
	if (github)
	{
		// Login was successful.
		ensureTealightFilesRepo();
		displayGithubStatus();
	}
	else
	{
		// No cookie, force login dialog.
		$('#myModal').modal({show: true,
							 backdrop: "static"});
	}
}

function displayGithubStatus()
{
	if(github)
	{
		$("#header-github-login").hide();
		$(".current-github-user").html("<a href=\"https://github.com/" + github.user + "\">" + github.user + "</a>");
		$("#header-github-user").show();
	}
	else
	{
		$("#header-github-user").hide();
		$("#header-github-login").show();
	}
}

function githubTokenToCookie(user, password, successCallback, errorCallback)
{
	GitHub.getUserToken(user, password, function(t) 
	{
		document.cookie = "tealight-user=" + user;
		document.cookie = "tealight-token=" + t.token;
		
		if (successCallback)
			successCallback();
	}, errorCallback);
}

function githubFromCookie()
{
	var user = getCookie("tealight-user");
	var token = getCookie("tealight-token");
	
	if (user && token)
	{
		var g = new GitHub(user, token);		
		return g
	}
	else
		return null;
}

function ajaxError(x)
{
	console.error("AJAX Error:",x.responseJSON.message);
}
function gotThing(x)
{
	console.log("Got thing:", x);
}

function getCookie(c_name)
{
	var c_value = document.cookie;
	var c_start = c_value.indexOf(" " + c_name + "=");
	
	if (c_start == -1)
		c_start = c_value.indexOf(c_name + "=");
		
	if (c_start == -1)
	{
		c_value = null;
	}
	else
	{
		c_start = c_value.indexOf("=", c_start) + 1;
		var c_end = c_value.indexOf(";", c_start);
		
		if (c_end == -1)
			c_end = c_value.length;
			
		c_value = unescape(c_value.substring(c_start,c_end));
	}
	
	return c_value;
}

function githubLogin(username, password)
{
	githubTokenToCookie(username, password, function()
	{// SUCCESS
		github = githubFromCookie();
		console.log("Logged in to Github as \"" + username + "\"");
		ensureTealightFilesRepo();
		displayGithubStatus();
	}, function(e)
	{// FAIL
		console.error("Could not login to Github: ", e.responseJSON.message);
		modalError("Login failed", e.responseJSON.message);
	})
}

function githubLogout()
{
	github = null;
	document.cookie = 'tealight-user=; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
	document.cookie = 'tealight-token=; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
	displayGithubStatus();
}

function ensureTealightFilesRepo(successCallback, errorCallback)
{
	// Check whether the tealight-files repo exists.
	var tf = github.getRepo("tealight-files", function(e)
	{
		console.log("User already has tealight-files repo.");
		$("body").trigger("tealight-files-repo-confirmed");
		if (successCallback)
			successCalback();
	}, function(e)
	{
		// If it doesn't, fork from tealight/tealight-files
		console.log("Could not find tealight-files repo. Forking");
		github.forkRepo("tealight", "tealight-files", function(e)
		{
			console.log("Started forking tealight-files");
			// Wait for fork to be completed (modal dialog)
			waitForRepo("tealight-files", 10, function(ev)
			{
				console.log("tealight-files repo forked successfully.");
				$("body").trigger("tealight-files-repo-confirmed");
				if (successCallback)
					successCallback();
			}, function(ev)
			{
				console.error("Timeout while waiting for tealight-files fork to become available");
				if (errorCallback)
					errorCallback(ev);
			});
		}, function(e)
		{
			console.log("Could not fork tealight-files");
			// Could not fork repo.
			modalError(e.responseJSON.message);
		});
	});
}

function modalDialog(title, message)
{
	$('#modal-tealight-dialog .modal-title').html(title);
	$('#modal-tealight-dialog .modal-body').html(message);
	$('#modal-tealight-dialog').modal("show");
}

function modalHide()
{
	$('#modal-tealight-dialog').modal("hide");
}
function waitForRepo(name, timeoutSecs, successCallback, errorCallback)
{
	// Show modal loading dialog
	modalDialog("Forking initial tealight source files", "Please wait...");
	
	var recheckRepo = function()
	{
		// Every 1 sec, check whether repo exists
		var r = github.getRepo(name, function()
		{
			// If exists, show success dialog.
			console.log("Repo created successfully");
			modalHide();
			
			if (successCallback)
				successCallback();
		}, function()
		{
			// If not, wait another second.
			console.log("Repo still doesn't exist. Waiting...");
			if (timeoutSecs > 0)
			{
				timeoutSecs -= 1000;
				setTimeout(recheckRepo, 1000);
			}
			else
			{
				// timeout expired
				modalHide();
				console.log("Timeout expired waiting for repo fork.");
				if (errorCallback)
					errorCallback();
			}
		});
	}
	
	// Force this to take long enough for the dialog to appear.
	setTimeout(recheckRepo, 3000);
	
		
}

function loadTealightFilesFromRepo(mode)
{
	console.log("Loading tealight source files from repo");
	var files = github.listFiles("tealight-files", mode, function(files)
	{
		$("#file-list").html("");
		var firstFile = null;
		for(var i in files)
		{
			var f = files[i];
			$("#file-list").append($('<li/>').append($('<a/>').attr("href", "#")
			                                                  .html(f.name)
															  .data("filePath", f.path)
															  .click(function(e)
			{
				console.log("Clicked file", $(e.target).data("filePath"));
				loadFile($(e.target).data("filePath"));
			})));
			
			if (!firstFile)
				firstFile = f.path;
		}
		loadFile(firstFile);
	},
	ajaxError);
}

function loadFile(path)
{
	console.log("Loading file", path);
	
	if (currentFile)
	{
		save("Closing " + currentFile.path);
	}
	
	
	github.getFile("tealight-files", path, function(newFile)
	{
		newFile.plainContent = atob(newFile.content.replace(/\s/g, ''));// content has a newline at the end!
		currentFile = newFile;
		console.log("Successfully loaded", path);
		codeMirror.setValue(newFile.plainContent);
		$("body").trigger("file-loaded");
	},
	function(e)
	{
		currentFile = null;
		ajaxError(e);
	});
	
}

function save(message)
{
	if (!message)
		message = "Update " + currentFile.path;
		
	if (currentFile)
	{
		var currentContent = codeMirror.getValue()
		if (currentFile.plainContent != currentContent)
		{
			console.log("Content has changed. Saving", currentFile.path, ".");
			github.commitChange(currentFile, currentContent, message, function(f)
			{
				console.log("Got back",f,"from commit");
				currentFile.sha = f.content.sha;
				currentFile.plainContent = currentContent;
			}, ajaxError);
		}
		else
		{
			console.log("Not saving. Content unchanged.");
		}
		// Save the current file.
	}
}

function stopCode() {
	if (python_worker) {
		python_worker.terminate();
		python_worker = null;
		$("body").trigger("code-finished");
	}
}

function runCode() {
	stopCode();
	python_worker = new Worker("js/run_python.js");

	save("Running " + currentFile.path);
	
	$("#code-output").html("");
	python_worker.addEventListener("message", function(event) {
		if (event.data.type === "stdout")
			$("#code-output").append(event.data.message);
		if (event.data.type === "done")
		{
			$("#code-output").append("Done!");
			$("body").trigger("code-finished");
		}
			
		$("#code-output").scrollTop($("#code-output")[0].scrollHeight);
	});

	python_worker.postMessage(codeMirror.getValue());
	$("body").trigger("code-started");
}
