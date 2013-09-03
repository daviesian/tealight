var github = null;
var python_worker = null;
var currentFile = null;
var codeMirror = null;
var codeMode = null;

var tealightSkulptModuleCache = {};

String.prototype.capitalize = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
}

var urlParams;
(window.onpopstate = function () {
    var match,
        pl     = /\+/g,  // Regex for replacing addition symbol with a space
        search = /([^&=]+)=?([^&]*)/g,
        decode = function (s) { return decodeURIComponent(s.replace(pl, " ")); },
        query  = window.location.search.substring(1);

    urlParams = {};
    while (match = search.exec(query))
       urlParams[decode(match[1])] = decode(match[2]);
})();


$(function()
{
    // Document ready

    if (typeof tealight_auth_server === "undefined")
    {
        modalError("Server not configured", "The tealight authentication server has not been configured for this deployment of tealight. Please follow the instructions in <code><a href=\"js/github_application.TEMPLATE.js\">js/github_application.TEMPLATE.js</a></code> and then refresh this page.", true);
        return;
    }

    if ("code" in urlParams)
    {
        // This is a callback from Github auth page.

        $.ajax(tealight_auth_server + "?tealight_auth_code=" + tealight_auth_code + "&client_id=" + github_client_id + "&github_code=" + urlParams["code"],
               {type: "GET",
                dataType: "json"})
            .success(function(r)
            {
                if (r.access_token)
                {
                    document.cookie = "tealight-token=" + r.access_token;
                    document.location.href = document.location.href.split("?")[0];
                }
                else
                {
                    clearTealightCookies();
                    modalError("Login error", "The tealight auth server returned the following error: <code>" + r.error + "</code>");
                }
            }).error(function(e)
            {
                console.error(e);

            });
    }
    else if (getCookie("tealight-token"))
    {
        // We already have a token stored in the cookie, login as that user.
        GitHub.getUser(getCookie("tealight-token"), function(u)
        {
            github = new GitHub(u, getCookie("tealight-token"));
            ensureTealightFilesRepo();
            displayGithubStatus();
        }, function(e)
        {
            clearTealightCookies();
            modalError("Login failed", "Github returned the following error message during login: <p><code>" + e.responseJSON.message + "</code>. <p>Your access token may have expired, in which case refreshing this page should fix the problem.");
            ajaxError(e);
        });
    }
    else
    {
        // We do not have a token in the cookie. Display login button.
        displayGithubStatus();
    }

    if ("error" in urlParams)
    {
        modalError("Login Error", "Github returned an error during login: <code>" + urlParams["error"] + "</code>");
    }

    // Init code editor.
    codeMirror = CodeMirror($("#code-editor")[0], {
        mode: "python",
        lineNumbers: true,
        theme: "default",
        tabSize: 4,
        indentUnit: 4,
        extraKeys: {
            "Tab": function(cm){
                if (cm.somethingSelected()) return CodeMirror.Pass;

                var pos = cm.getCursor();
                var line_prefix = cm.getRange({line:pos.line, ch:0}, pos);

                if (line_prefix.match(/^ *$/)) {
                    // Add spaces up to indentation column if not aligned, or one level of indentation
                    var chars_from_indent = pos.ch % cm.options.indentUnit;
                    var chars_to_indent = cm.options.indentUnit - chars_from_indent;
                    var chars_to_add = chars_to_indent == 0 ?
                                         cm.options.indentUnit :
                                         chars_to_indent;

                    var spaces = Array(chars_to_add + 1).join(" ");
                    cm.replaceSelection(spaces, "end", "+input");
                } else {
                    // Add indentUnit spaces
                    var spaces = Array(cm.getOption("indentUnit") + 1).join(" ");
                    cm.replaceSelection(spaces, "end", "+input");
                }
            },
            "Backspace": function(cm) {
                // Check if not deleting a selection
                if (cm.somethingSelected()) return CodeMirror.Pass;

                var pos = cm.getCursor();

                // Check if not at start of line
                if (pos.ch === 0) return CodeMirror.Pass;

                var line_prefix = cm.getRange({line:pos.line, ch:0}, pos);

                // Check if we are deleting spaces
                if (line_prefix[pos.ch-1] !== " ") return CodeMirror.Pass;

                // Check if preceding characters are all spaces
                if (line_prefix.match(/^ *$/)) {
                    // Delete up to indentation column if not aligned, or one level of indentation
                    var chars_from_indent = pos.ch % cm.options.indentUnit;
                    var chars_to_delete = chars_from_indent == 0 ?
                                            cm.options.indentUnit :
                                            chars_from_indent;
                    cm.replaceRange("", {line:pos.line, ch:pos.ch-chars_to_delete}, pos);
                } else {
                    // Reverse find first character that isn't a space, up to indentUnit spaces
                    var ch = pos.ch - 1;
                    while (ch > pos.ch - cm.options.indentUnit && line_prefix[ch-1] === " ") {
                        --ch;
                    }
                    cm.replaceRange("", {line:pos.line, ch:ch}, pos);
                }
            }
        }
    });

});

// EVENT HANDLERS

$("body").on("click", ".login-button", function(e)
{
    $(".login-button").button("loading");
    document.location.href="https://github.com/login/oauth/authorize?scope=public_repo&client_id=" + github_client_id;
});

$("body").on("click", ".logout-button", function(e)
{
    githubLogout();
});

$("body").on("click", ".choose-tab", function(e)
{
    $('#navtabs a[href="#' + $(e.target).data("targetTab") + '"]').tab("show")
});

/*
$("body").on("click", ".choose-tealight-mode", function(e)
{
    $('#navtabs a[data-tealight-mode="' + $(e.target).data("targetTealightMode") + '"]').tab("show")
});
*/

$("body").on("show.bs.tab", "a[data-toggle='tab']", function(e)
{
    if ($(e.target).data("githubRequired") && !github)
    {
        $("#modal-login").modal("show");
        return false;
    }

    var previousTab = $(e.relatedTarget).attr("href");
    var newTab = $(e.target).attr("href");
    console.log("Leaving tab", previousTab, "entering tab", newTab);

});

$("body").on("shown.bs.tab", "a[data-toggle='tab'][href='#code']", function(e)
{

    console.log("Entering code tab - refreshing codeMirror");
    codeMirror.refresh();
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

function modalError(title, message, preventDismiss)
{
    $('#modal-error .modal-title').html(title);
    $('#modal-error .modal-body').html(message);

    if (preventDismiss)
    {
        $('#modal-error .modal-footer button').hide();
        $('#modal-error').modal({show: true,
                                 backdrop: "static"});
    }
    else
    {
        $('#modal-error .modal-footer button').show();
        $('#modal-error').modal("show");
    }
}
/*
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
*/
function displayGithubStatus()
{
    if(github)
    {
        $("#header-github-login").hide();
        $(".current-github-user").html("<a target=\"_blank\" href=\"" + github.user.html_url + "\">" + github.user.login + "</a>");
        $("#header-github-user").show();
    }
    else
    {
        $("#header-github-user").hide();
        $("#header-github-login").show();
    }
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

function githubLogout()
{
    github = null;
    clearTealightCookies();
    displayGithubStatus();
}

function clearTealightCookies()
{
    document.cookie = 'tealight-token=; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
}

function ensureTealightFilesRepo(successCallback, errorCallback)
{
    // Check whether the tealight-files repo exists.
    var tf = github.getRepo("tealight-files", function(e)
    {
        console.log("User already has tealight-files repo.");
        $("body").trigger("tealight-files-repo-confirmed");
        loadModes(successCallback);
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
                loadModes(successCallback);
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

function loadModes(successCallback)
{
    github.listFiles("tealight-files", "", function(fs)
    {
        var loadedFirstMode = false;
        for(var f in fs)
        {
            if (fs[f].type != "dir")
                continue;

            $("#mode-list").append($('<li/>').append($('<a/>').attr("href", "#")
                                                      .html(fs[f].name.capitalize())
                                                      .data("mode", fs[f].name)
                                                      .click(function(e)
                {
                    //console.log("Clicked mode", $(e.target).data("mode"));
                    //loadFile($(e.target).data("mode"));
                    chooseMode($(e.target).data("mode"));
                })));

            console.log("Discovered mode:", fs[f].name);
        }

        $("#mode-list li:first a").trigger("click")

        if (successCallback)
            successCallback();
    }, ajaxError);
}

function chooseMode(mode)
{
    codeMode = mode;
    $("#current-mode").html(mode.capitalize() + " Mode");
    loadTealightFilesFromRepo(mode);

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
    initMode();
    python_worker.addEventListener("message", function(event)
    {
        switch (event.data.type)
        {
            case "stdout":
                $("#code-output").append(event.data.message);
                break;
            case "done":
                $("#code-output").append("Done!");
                $("body").trigger("code-finished");
                break;
            case "eval":
                eval(event.data.code);
                break;
            case "module_cache":
                tealightSkulptModuleCache = event.data.modules;
                break;

        }

        $("#code-output").scrollTop($("#code-output")[0].scrollHeight);
    });

    python_worker.postMessage({type: "MODULES", modules: tealightSkulptModuleCache});
    python_worker.postMessage({type: "RUN", code: codeMirror.getValue()});
    $("body").trigger("code-started");
}

function initMode()
{
    switch(codeMode)
    {
        case "logo":
            Logo.init($('#canvas')[0]);
            break;
    }
}
