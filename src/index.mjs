// @ts-nocheck
// Give VS Code IntelliSense for uibuilder
/// <reference path="../types/uibuilder.d.ts" />

// @ts-ignore
import uibuilder from '../uibuilder/uibuilder.esm.min.js'

/** To DO - see the main README.md for the template */

/** @type {HTMLElement} Get fixed ref to the more div */
const elTopics = document.getElementById('topics')
/** @type {HTMLElement} Get fixed ref to the details div */
const elDetailContent = document.getElementById('detailContent')
/** @type {HTMLElement} Get fixed ref to the DOM warning element */
const elDomWarning = document.getElementById('domWarning')
/** @type {HTMLElement} Get fixed ref to the DOM count display */
const elDomCount = document.getElementById('domCount')

/** Threshold for DOM element count warning
 * @type {number}
 */
const DOM_WARNING_THRESHOLD = 1500

/** Checks the DOM element count and updates the warning indicator
 * @returns {number} The current DOM element count
 */
function checkDomElementCount() {
    const count = document.getElementsByTagName('*').length
    const topicsCount = elTopics.getElementsByTagName('*').length

    if (count >= DOM_WARNING_THRESHOLD) {
        elDomCount.textContent = `${count} total, ${topicsCount} in topics`
        elDomWarning.hidden = false
    } else {
        elDomWarning.hidden = true
    }

    return count
}

// Specify an HTML ID compatible separator string for topics - cannot clash with MQTT topic chars and can only contain _ or -
const topicSeparator = '___'

/** Format and return the details HTML for a given MQTT value input
 * @param {string|object} input The MQTT value input
 * @param {HTMLElement} elCurrent The current details element
 * @param {object} msg Node-RED message object
 * @returns 
 */
function details(input, elCurrent, msg) {
    const lastUpdate = new Date(msg.lastUpdate).toISOString() || new Date().toISOString()
    try {
        input = JSON.parse(input)
    } catch (e) { /* Not JSON, do nothing */ }
    return `
        <br><b>Topic</b>: ${msg.topic}<br>
        <span title="When received by Node-RED, not of the original message"><b>Timestamp</b>: ${lastUpdate}</span> | 
          <b>QoS</b>: ${msg.qos} | <b>Retained?</b>: ${msg.retain}
        <pre class="syntax-highlight">${uibuilder.syntaxHighlight(input)}</pre>
    `
}

// Listen for incoming messages from Node-RED and action
uibuilder.onChange('msg', (msg) => {
    // console.log({msg})
    // console.group(`MQTT Topic: ${msg.topic}`)

    // We are assuming that the topic levels are separated by '/'
    const splitTopic = msg.topic.split('/')
    const topicLeaf = splitTopic[splitTopic.length - 1]

    // Set these up so they are still in scope after the loop
    let parentId = 'topics'
    let elParent = elTopics
    let idTopic = ''
    let elCurrent = null
    let elSummary = null

    // Loop through each topic level to build out the nested structure
    const finalLevel = splitTopic.length - 1
    splitTopic.forEach( (topic, level) => {
        if (level > 0) {
            parentId = splitTopic.slice(0, level).join(topicSeparator)
            elParent = document.getElementById(parentId)
            idTopic = `${parentId}${topicSeparator}${topic}`
        } else {
            idTopic = topic
        }
        if (!elParent) { // Sanity check, should not happen
            console.warn(`Parent element with ID ${parentId} not found!`)
            return
        }
        
        elCurrent = document.getElementById(idTopic)
        // Current topic doesn't exist in the DOM, so create a new child element
        if (!elCurrent) {
            elCurrent = document.createElement('details')
            elSummary = document.createElement('summary')
            elCurrent.id = idTopic
            elSummary.textContent = topic
            elCurrent.appendChild(elSummary)
            elParent.appendChild(elCurrent)
        }
    })

    /** @type {HTMLTemplateElement} Does the final topic level already have a data template? */
    let elTemplate = elCurrent.querySelector('template')
    // If not, add one now and keep a reference to it
    if (!elTemplate) {
        elTemplate = document.createElement('template')
        elCurrent.appendChild(elTemplate)
    }
    // Add/Update the current timestamp to the data-last-update attribute
    elCurrent.dataset.lastUpdate = new Date().toISOString()
    if (msg.payload !== undefined) {
        // Add the hasData class to the final topic level
        elCurrent.classList.add('hasData')

        // Add the message payload to the final topic level template
        const elPayload = document.createElement('div')
        elPayload.innerHTML = details(msg.payload, elCurrent, msg)
        elTemplate.content.appendChild(elPayload)
    } else {
        // No payload, so just ensure the hasData class is not present
        elCurrent.classList.remove('hasData')
        // and remove any existing payload element
        const elPayloadCheck = elCurrent.querySelector('div')
        if (elPayloadCheck) {
            elCurrent.removeChild(elPayloadCheck)
        }
    }
    // Add a click event to the any section that has the hasData class that clones the template content to the details div
    if (elCurrent.classList.contains('hasData') && elSummary) {
        elSummary.onclick = (event) => {
            // don't propagate to parent details elements
            event.stopPropagation()
            elDetailContent.innerHTML = '' // Clear existing content
            const clone = elTemplate.content.cloneNode(true)
            // console.log(`Clicked on topic: ${msg.topic}`, {event, elTemplate, clone, elDetails: elDetailContent})
            elDetailContent.appendChild(clone)
        }
    }

    // Check DOM element count after processing each message
    checkDomElementCount()

    // console.groupEnd()
})
