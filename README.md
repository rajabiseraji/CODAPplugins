# Running this project

To run this, you just need to either put it in the webroot of your desired server. In my case, I'm using ``http-server`` which is a node.js-based one. You can install it globally by running 

``` 
npm install http-server -g
```

And then in the root of the project, go with

```
http-server -p 80 -c-1 --cors
```

This is to make sure that CORS is enabled for this and that it's running from your port 80. Also, I've set the caching to -1 to prevent result caching. 

Before using the plugins, you need to be running a local version of CODAP on your system, too. To do that, checkout : [CODAP's developers guide](https://github.com/concord-consortium/codap/wiki/Developer-Guide#codap-developer-guide)