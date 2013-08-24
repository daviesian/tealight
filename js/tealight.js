var github = null;

$(function()
{
	// Document ready
	
	
	ensureGithubAvailable();
	
	$("body").on("click", ".github-signin", function(e)
	{
		var btn = e.target;
		var username = $(e.target).closest("form").find("input[type='text']")[0].value;
		var password = $(e.target).closest("form").find("input[type='password']")[0].value;
		e.preventDefault();
		
		githubTokenToCookie(username, password, function()
		{
			github = githubFromCookie();
			console.log("Logged in to Github as \"" + username + "\"");
		}, ajaxError)
		
		return false;
	});
});

function ensureGithubAvailable()
{
	github = githubFromCookie();
	if (!github)
	{
		doGithubLogin();
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