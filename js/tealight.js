var github = null;
var python_worker = null;

$(function()
{
	// Document ready
	
	
	//ensureGithubAvailable();
	
	$("body").on("click", ".github-signin", function(e)
	{
		var btn = e.target;
		var userField = $(btn).closest("form").find("input[type='text']")[0];
		var passwordField = $(btn).closest("form").find("input[type='password']")[0];
		var username = userField.value;
		var password = passwordField.value;
		
		userField.value = "";
		passwordField.value = "";
		
		githubTokenToCookie(username, password, function()
		{// SUCCESS
			github = githubFromCookie();
			console.log("Logged in to Github as \"" + username + "\"");
			displayGithubStatus();
		}, function(e)
		{// FAIL
		    console.error("Could not login to Github: ", e.responseJSON.message);
			modalError("Login failed", e.responseJSON.message);
		})
		
		e.preventDefault();
		return false;
	});
	
	$("body").on("click", ".logout-button", function(e)
	{
		github = null;
		document.cookie = 'tealight-user=; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
		document.cookie = 'tealight-token=; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
		displayGithubStatus();
		e.preventDefault();
		return false;
	});
});

function modalError(title, message)
{
	$('#modal-error .modal-title').html(title);
	$('#modal-error .modal-body').html(message);
	$('#modal-error').modal("show");
}

function ensureGithubAvailable()
{
	github = githubFromCookie();
	if (github)
	{
		displayGithubStatus();
	}
	else
	{
		doGithubLogin();
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
		return new GitHub(user, token);
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

function doGithubLogin()
{
	$('#myModal').modal({show: true,
	                     backdrop: "static"});
}


function runit() {
	if (python_worker) {
		python_worker.terminate();
	}
	python_worker = new Worker("js/run_python.js");

	document.getElementById("output").innerHTML = "";
	python_worker.addEventListener("message", function(event) {
		if (event.data.type === "stdout")
			document.getElementById("output").innerHTML += event.data.message;
		if (event.data.type === "done")
			document.getElementById("output").innerHTML += "Done!";
	});

	python_worker.postMessage(document.getElementById("code").value);
}
