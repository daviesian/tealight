$(function()
{
	// Document ready
	
});

function githubTokenToCookie(user, password, successCallback, errorCallback)
{
	GitHub.getUserToken(user, password, function(t) 
	{
		document.cookie = "tealight-user=" + user;
		document.cookie = "tealight-token=" + t.token;
		
		successCallback();
	}, errorCallback);
}

function ajaxError(x)
{
	console.error("AJAX Error:",x.responseJSON.message);
}
function gotThing(x)
{
	console.log("Got thing:", x);
}
