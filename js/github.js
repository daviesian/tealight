function GitHub(user, token)
{
	this.user = user;
	this.token = token;
}

GitHub.getUserToken = function(user, password, successCallback, errorCallback)
{
	// First get auths and check whether tealight already has one.
	$.ajax("https://api.github.com/authorizations",
		{headers: {"Authorization": "Basic "+btoa(user+":"+password)},
		 type: "GET"})
		 
	.success(function(auths)
	{
		for(var a in auths)
		{
			console.log(auths[a]);
			if (auths[a].note == "tealight")
			{
				console.log("Found existing tealight auth token. Reusing.");
				if (successCallback)
					successCallback(auths[a]);
				return;
			}
		}
		
		console.warn("No existing tealight auth token found. Creating.");
		
		$.ajax("https://api.github.com/authorizations", 
			{headers: {"Authorization": "Basic "+btoa(user+":"+password)},
			 type: "POST",
			 data: JSON.stringify({scopes: ['repo'],
								   note: "tealight"})})
			.success(successCallback)
			.error(errorCallback);
		
	})
	.error(errorCallback);
		 
	
}

GitHub.prototype.getRepo = function(name, successCallback, errorCallback)
{
	$.ajax("https://api.github.com/repos/" + this.user + "/" + name,
	    {headers: {"Authorization": "token " + this.token}})
		.success(successCallback)
		.error(errorCallback);
}

GitHub.prototype.createRepo = function(name, successCallback, errorCallback)
{
	$.ajax("https://api.github.com/user/repos", 
		{headers: {"Authorization": "token " + this.token},
		 type: "POST",
		 data: 
		 JSON.stringify({
			name: name,
			description: "Tealight source files",
			has_issues: false,
			has_wiki: false,
			has_downloads: false,
			auto_init: true
		 })}).success(function(r)
			 {
				console.log("Repository \"\" created successfully.");
				if (successCallback)
					successCallback(r);
			 })
		     .error(errorCallback);
}

GitHub.prototype.getOrCreateRepo = function(name, successCallback, errorCallback)
{
	gh = this;
	this.getRepo(name, successCallback, function()
	{
		// getRepo failed. Create the repo.
		console.warn("Repository \"" + name + "\" not found. Creating.");
		gh.createRepo(name,successCallback, errorCallback);
	});
}

GitHub.prototype.createFile = function(repo, path, successCallback, errorCallback)
{
	$.ajax("https://api.github.com/repos/"+ this.user +"/"+ repo + "/contents/" + path, 
		{
			headers: {"Authorization": "token " + this.token},
			type: "PUT",
			data: 
			JSON.stringify({
				message: "Creating " + path,
				content: btoa(" "),
		})})
		.success(function(f)
		{
			console.log("Successfully created \"" + path + "\" in repo \"" + repo + "\".");
			if (successCallback)
				successCallback(f);
		})
		.error(errorCallback);
}

GitHub.prototype.getFile = function(repo, path, successCallback, errorCallback)
{
	$.ajax("https://api.github.com/repos/"+ this.user +"/"+ repo + "/contents/" + path, 
		{
			headers: {"Authorization": "token " + this.token},
			type: "GET"
		})
		.success(successCallback)
		.error(errorCallback);
}

GitHub.prototype.getOrCreateFile = function(repo, path, successCallback, errorCallback)
{
	gh = this;
	this.getFile(repo, path, successCallback, function()
	{
		// getFile failed. Create the file.
		console.warn("File \"" + path + "\" not found. Creating.");
		gh.createFile(repo, path, function()
		{
			gh.getFile(repo,path, successCallback,errorCallback);
		}, errorCallback);
	});
}

GitHub.prototype.listFiles = function(repo, directory, successCallback, errorCallback)
{
	this.getFile(repo, directory, successCallback, errorCallback);
}

















