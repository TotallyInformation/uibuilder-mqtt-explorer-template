# uibuilder Template: mqtt-explorer

This is a simple uibuilder template that provides a basic web UI for exploring MQTT topics and messages. It uses the uibuilder client library to communicate with the Node-RED server and display MQTT data in a user-friendly way.

Its motivation was as a pure Node-RED replacement for the MQTT Explorer desktop application (https://mqtt-explorer.com/). Providing a pure Node-RED, web-based alternative that can be run anywhere Node-RED can run and accessed from anywhere via a web browser.

> [!NOTE]
> This template is intended for use with UIBUILDER for Node-RED v7.2.0 and later. It may not work correctly with earlier versions of uibuilder.

> [!WARNING]
> This template is currently EXPERIMENTAL. It may contain bugs or incomplete features. Use at your own risk.
>
> Also note that loading a UIBUILDER template **OVERWRITES** existing files in the uibuilder instance folder. So be careful not to overwrite any custom code you may have already written.

This template came out of some discussions on the [Node-RED forum about creating a web-based MQTT explorer using uibuilder](https://discourse.nodered.org/t/node-red-version-of-mqtt-explorer/99738). It is inspired by the [MQTT Explorer desktop application](https://mqtt-explorer.com/).

## Installation

Add a uibuilder node to your Node-RED flow. Give it a unique name and URL. Then deploy the flow. This creates the server file system structure for the uibuilder instance.

Then, in the node's configuration, choose "Load an external template using degit" from the Template Settings. Use the external reference `TotallyInformation/uibuilder-mqtt-explorer-template`. Then click "Load & Overwrite Files".

> [!NOTE]
> If you get an error trying to load the template. Firstly ensure that you have spelled it correctly. If it still fails, you may need to install `git` to your Node-RED server. This is a minor bug which should be fixed in a future UIBUILDER release.

Then wire an MQTT input node to the uibuilder node to receive MQTT messages. Configure the MQTT node with your broker settings and the topics you want to subscribe to. You may want to filter out some high-volume MQTT topics to avoid overwhelming the UI. You should also add a change node to provide a `msg.lastUpdated` timestamp property for each message.

Consider adding a delay node set to rate limit mode to limit the number of messages sent to the UI per second. This will help prevent flooding the UI with too many messages at once.

For a more complete flow, consider using the `uib-cache` node to cache MQTT messages and provide a way to request retained messages when the UI connects. This will help populate the UI with existing data when a user first opens it. Use multiple `uib-cache` nodes if you want to separate retained messages from live messages or keep larger/smaller caches for different topics. Switch nodes can be used to separate out different sub-flows for different topic hierarchies as needed.

> [!NOTE]
> Currently, the web DOM is used to retain the data in the browser. While this is efficient, remember that ultimately, the browser will slot down or even crash if too many topics are included.

## Folders

* `/` - The root folder contains this file. It can be used for other things **but** it will not be served up in the Node-RED web server. 
* `/src/` - The default folder that serves files as web resources. However, this can be changed to a different folder if desired.
* `/dist/` - Not currently used.
* `/routes/` - Not currently used.
* `/api/` - Not currently used.
* `/types/` - Contains typescript definition files (`*.d.ts`) for the uibuilder client library. This is not used by uibuilder but can be used by your IDE to provide type checking and auto-completion for the uibuilder client library. This is useful if you are using TypeScript or JavaScript with type checking enabled. Remember to update these for new uibuilder versions.

One reserved item in the root folder is `package.json` file. This will be used in the future to help with build/compile steps. You can still use it yourself, just bear in mind that a future version of uibuilder will make use it as well. If you need to have any development packages installed to build your UI, don't forget to tell `npm` to save them as development dependencies not normal dependencies.

The `dist` folder should be used if you have a build step to convert your source code to something that browsers understand. So if you are using a build (compile) step to produce your production code, ensure that it is configured to use the `dist` folder as the output folder and that it creates at least an `index.html` file.

You can switch between the `src` and `dist` (or other) folders using the matching setting in the Editor. See uibuilder's advanced settings tab.

Also note that you can use **linked** folders and files in this folder structure. This can be handy if you want to maintain your code in a different folder somewhere or if your default build process needs to use sub-folders other than `src` and `dist`.(Though as of v6, you can specify any sub-folder to be served)

## Files in this template

* `package.json`: REQUIRED. Defines the basic structure, name, description of the project and defines any local development dependencies if any. Also works with `npm` allowing the installation of dev packages (such as build or linting tools).
* `README.md`: This file. Change this to describe your web app and provide documentation for it.
* `eslint.config.js`: A pre-configured configuration for the ESLINT tool. Helps when writing front-end code. Note that you need at least eslint v8+ installed for this to work.
* `LICENSE`: A copy of the Apache 2.0 license. Replace with a different license if needed. Always license your code. Apache 2.0 matches the licensing of uibuilder.
* `src/index.html`: REQUIRED. Contains your basic HTML and will be the file loaded and displayed in the browser when going to the uibuilder defined URL.
* `src/index.mjs`: Contains all of the logic for your UI. It must be linked to in the html file. Note that is is named `.mjs` to indicate that it is a JavaScript module.
* `src/index.css`: Contains your custom CSS for styling. It must be linked to in the html file.
* `tsconfig.json`: A configuration file for TypeScript. This can be used by your IDE to provide descriptions, type checking and auto-completion for the uibuilder client library. This is useful if you are using TypeScript or JavaScript with type checking enabled. Uses the typescript definition files in the `/types` folder, remember to update these for new uibuilder versions.

Note that only the `package.json` and `index.html` files are actually _required_. uibuilder will not function as expected without them.

It is possible to use the index.html file simply as a link to other files but it must be present.

The other files are all optional. However, you will need to change the index.html file accordingly if you rename or remove them.

## License

This template is licensed under the Apache 2.0 License - see the [LICENSE](LICENSE) file for details.

The template may be used however you like for both commercial and non-commercial purposes. No warranty is provided. Use at your own risk.

## Contributing and support

If this template is useful to you, a star on the GitHub repository would be appreciated! If it provides value, please consider some sponsorship to help support ongoing development.

If you find any bugs or have any feature requests, please open an issue on the GitHub repository or discuss it on the Node-RED forum using the tag `uibuilder` to make sure I see it.

## Future roadmap

The initial release is no more than a basic proof-of-concept. However, if there is sufficient interest, I will continue to develop it further.

I will, for now, keep the backlog here.

### In the Front End (this template)

* [ ] Add visual indicator to topics with data.
* [ ] Add copy ability to topic names and values.
* [ ] Add text (maybe truncated) to topics with values.
* [ ] Add animation when new data arrives.
* [ ] Add variable to restrict the number of kept messages per topic level.
* [ ] Add search/filtering of topics.
* [ ] Add ability to send a new msg to a topic.
* [ ] Add ability to show other metadata (e.g. MQTT v5 properties).
* [ ] Add charting of numeric data over time.
* [ ] Add msg count and sub-topic count per topic level.
* [ ] Add ability to remove topics or clear data.
* [ ] Add ability to export data (e.g. JSON, CSV).
* [ ] Highlight currently selected topic.
* [ ] Colour-code retained messages in the topics list.
* [ ] Add broker definition and edit ability.

### In Node-RED (via an example flow)

* [ ] Add caching.
* [ ] Allow dynamic changing of subscriptions & broker.
 