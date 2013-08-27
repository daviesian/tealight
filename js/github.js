function GitHub(user, token)
{
	this.user = user;
	this.token = token;
}

GitHub.getUser = function(token, successCallback, errorCallback)
{
	// First get auths and check whether tealight already has one.
	$.ajax("https://api.github.com/user",
		{data: {"access_token": token},
		 type: "GET"})
		 .success(successCallback)
		 .error(errorCallback);

}

GitHub.prototype.getRepo = function(name, successCallback, errorCallback)
{
	$.ajax("https://api.github.com/repos/" + this.user.login + "/" + name,
	    {data: {"access_token": this.token}})
		.success(successCallback)
		.error(errorCallback);
}

GitHub.prototype.forkRepo = function(owner, name, successCallback, errorCallback)
{
	$.ajax("https://api.github.com/repos/" + owner + "/" + name + "/forks", 
		{data: {"access_token": this.token},
		 type: "POST",
		 })
		 .success(function(r)
		 {
			console.log("Repository \"" + owner + "/" + name + "\" forking started successfully.");
			if (successCallback)
				successCallback(r);
		 })
		 .error(errorCallback);
}

GitHub.prototype.createFile = function(repo, path, successCallback, errorCallback)
{
	$.ajax("https://api.github.com/repos/"+ this.user.login +"/"+ repo + "/contents/" + path,
		{
			type: "PUT",
			headers: {"Authorization": "token " + this.token},
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
	$.ajax("https://api.github.com/repos/"+ this.user.login +"/"+ repo + "/contents/" + path, 
		{
			data: {"access_token": this.token},
			type: "GET",
			cache: false
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

GitHub.prototype.commitChange = function(originalFile, newContent, message, successCallback, errorCallback)
{
	$.ajax(originalFile.url,
		{type: "PUT",
		 headers: {"Authorization": "token " + this.token},
		 data: JSON.stringify(
		 {
			message: message,
			content: btoa(newContent),
			sha: originalFile.sha
		 })
		 })
		 .success(function(f)
		 {
			console.log("File \"" + originalFile.path + "\" updated successfully.");
			if (successCallback)
				successCallback(f);
		 })
		 .error(errorCallback);
}
