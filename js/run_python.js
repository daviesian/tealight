importScripts("skulpt/skulpt.js", "skulpt/skulpt-stdlib.js")

modules = {};

function builtinRead(x) {
	if (modules[x])
		return modules[x];
		
    if (Sk.builtinFiles === undefined || Sk.builtinFiles["files"][x] === undefined)
            throw "File not found: '" + x + "'";
    return Sk.builtinFiles["files"][x];
}

self.onmessage = function(event) {

	switch (event.data.type)
	{
		case "MODULES":
			modules = event.data.modules;
			break;
		case "RUN":
			Sk.configure({
				output: function(text) {
					postMessage({type: "stdout", message: text});
					
				},
				read: builtinRead
				
			}); 
			
			eval(Sk.importMainWithBody("<stdin>", false, event.data.code)); 
			postMessage({type: "done"});
			break;
	}
}
