# Changelog for UIBUILDER MQTT Explorer
All notable changes to this project will be documented in this file.

## 2025-11-29

* Publish new MQTT msg added to the details panel.
* Top level of topic tree is now sorted alphabetically.
* Raw message section added to the details panel, showing the full incoming message object as received from Node-RED.
* Summary of current value added to the topic tree. Auto-trimsed if too long.
* Expand/collapse icon re-added to topic tree items.
* Message history is now collapsible in the details panel.
* Bug fixes.

## 2025-11-28-a

- Rewrite to improve performance when handling large numbers of topics and messages.
- Incoming data is stored in a JavaScript Map object. This massively reduces browser overheads and allows for far larger datasets to be handled.
- The topic tree includes sub-topic counts. Leaf sub-topics include a count of value history entries.

## 2025-11-28

- Bug fix.

## Initial Release (< 2025-11-27)

- First version of the UIBUILDER MQTT Explorer.
- Incoming MQTT message data (from Node-RED) is added direct to the DOM.
- The UI has two columns: a topic tree on the left and message details on the right.
