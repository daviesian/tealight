importScripts("skulpt/skulpt.js", "skulpt/skulpt-stdlib.js")

self.onmessage = function(event) {
    Sk.configure({
        output: function(text) {
            postMessage({type: "stdout", message: text});
        }
    }); 
    eval(Sk.importMainWithBody("<stdin>", false, event.data)); 
    postMessage({type: "done"});
}
