// @ts-nocheck
// Give VS Code IntelliSense for uibuilder
/// <reference path="../types/uibuilder.d.ts" />

// @ts-ignore
import uibuilder from '../uibuilder/uibuilder.esm.min.js'

// #region --- DOM Element References ---

/** @type {HTMLElement} Reference to the topics container */
const elTopics = document.getElementById('topics')
/** @type {HTMLElement} Reference to the topic tree container */
const elTopicTree = document.getElementById('topicTree')
/** @type {HTMLElement} Reference to the details content area */
const elDetailContent = document.getElementById('detailContent')
/** @type {HTMLElement} Reference to the stats display */
const elStats = document.getElementById('stats')

// #endregion

// #region --- Configuration ---

/** Maximum messages to retain per topic
 * @type {number}
 */
const MAX_HISTORY_PER_TOPIC = 50

// #endregion

// #region --- Type Definitions ---

/** @typedef {Object} TopicMessage
 * @property {unknown} payload - The message payload
 * @property {string} timestamp - ISO timestamp when message was received
 * @property {number} qos - MQTT Quality of Service level
 * @property {boolean} retain - Whether the message was retained
 */

/** @typedef {Object} TopicNode
 * @property {string} name - Topic segment name
 * @property {Map<string, TopicNode>} children - Child topic nodes
 * @property {TopicMessage[]} messages - Message history for this topic
 */

// #endregion

// #region --- Data Store ---

/** Topic data store - tree structure mirroring MQTT hierarchy
 * @type {Map<string, TopicNode>}
 */
const topicStore = new Map()

/** Statistics for the topic store
 * @type {{totalTopics: number, totalMessages: number}}
 */
const stats = {
    totalTopics: 0,
    totalMessages: 0,
}

// #endregion

// #region --- Data Store Functions ---

/** Creates or retrieves a topic node in the store
 * @param {string[]} topicParts - Split topic path
 * @returns {TopicNode} The leaf node for this topic
 */
function getOrCreateTopicNode(topicParts) {
    let currentLevel = topicStore
    let node = null

    for (let i = 0; i < topicParts.length; i++) {
        const part = topicParts[i]

        if (!currentLevel.has(part)) {
            const newNode = {
                name: part,
                children: new Map(),
                messages: [],
            }
            currentLevel.set(part, newNode)
            stats.totalTopics++
        }

        node = currentLevel.get(part)
        currentLevel = node.children
    }

    return node
}

/** Retrieves a topic node from the store
 * @param {string[]} topicParts - Split topic path
 * @returns {TopicNode|null} The node or null if not found
 */
function getTopicNode(topicParts) {
    let currentLevel = topicStore

    for (let i = 0; i < topicParts.length; i++) {
        const part = topicParts[i]

        if (!currentLevel.has(part)) {
            return null
        }

        const node = currentLevel.get(part)
        if (i === topicParts.length - 1) {
            return node
        }
        currentLevel = node.children
    }

    return null
}

/** Adds a message to the topic store
 * @param {object} msg - Node-RED message object
 * @returns {TopicNode} The topic node that was updated
 */
function storeMessage(msg) {
    const topicParts = msg.topic.split('/')
    const node = getOrCreateTopicNode(topicParts)

    if (msg.payload !== undefined) {
        node.messages.unshift({
            payload: msg.payload,
            timestamp: msg.lastUpdate || new Date().toISOString(),
            qos: msg.qos ?? 0,
            retain: msg.retain ?? false,
        })

        stats.totalMessages++

        // Limit history per topic
        if (node.messages.length > MAX_HISTORY_PER_TOPIC) {
            node.messages.pop()
        }
    }

    return node
}

// #endregion

// #region --- UI Rendering Functions ---

/** Updates the statistics display */
function updateStatsDisplay() {
    const domCount = document.getElementsByTagName('*').length
    elStats.textContent = `Topics: ${stats.totalTopics} | Messages: ${stats.totalMessages} | DOM Elements: ${domCount}`
}

/** Renders a single topic node as a details element
 * @param {string} name - Topic segment name
 * @param {TopicNode} node - Topic node data
 * @param {string} fullPath - Full topic path
 * @returns {HTMLDetailsElement} The rendered details element
 */
function renderTopicNode(name, node, fullPath) {
    const details = document.createElement('details')
    const summary = document.createElement('summary')

    details.dataset.topicPath = fullPath

    // Build summary content
    const nameSpan = document.createElement('span')
    nameSpan.className = 'topic-name'
    nameSpan.textContent = name
    summary.appendChild(nameSpan)

    // Add message count badge if has messages
    if (node.messages.length > 0) {
        details.classList.add('hasData')
        const badge = document.createElement('span')
        badge.className = 'message-count'
        badge.textContent = `${node.messages.length}`
        badge.title = `${node.messages.length} message(s) stored`
        summary.appendChild(badge)
    }

    // Add child count indicator if has children
    if (node.children.size > 0) {
        const childIndicator = document.createElement('span')
        childIndicator.className = 'child-count'
        childIndicator.textContent = `▸ ${node.children.size}`
        childIndicator.title = `${node.children.size} sub-topic(s)`
        summary.appendChild(childIndicator)
    }

    details.appendChild(summary)

    // Create container for children (lazy-loaded)
    if (node.children.size > 0) {
        const childContainer = document.createElement('div')
        childContainer.className = 'topic-children'
        details.appendChild(childContainer)

        // Lazy-load children only when expanded
        details.addEventListener('toggle', () => {
            if (details.open && childContainer.children.length === 0) {
                renderTopicLevel(node.children, childContainer, fullPath)
            }
        })
    }

    return details
}

/** Renders a level of the topic tree
 * @param {Map<string, TopicNode>} nodes - Nodes to render
 * @param {HTMLElement} container - Parent container element
 * @param {string} [pathPrefix=''] - Current topic path prefix
 */
function renderTopicLevel(nodes, container, pathPrefix = '') {
    // Sort topics alphabetically
    const sortedEntries = [...nodes.entries()].sort((a, b) => a[0].localeCompare(b[0]))

    for (const [name, node] of sortedEntries) {
        const fullPath = pathPrefix ? `${pathPrefix}/${name}` : name
        const existingDetails = container.querySelector(`[data-topic-path="${CSS.escape(fullPath)}"]`)

        if (existingDetails) {
            // Update existing node
            updateTopicNode(existingDetails, node)
        } else {
            // Create new node
            const details = renderTopicNode(name, node, fullPath)
            container.appendChild(details)
        }
    }
}

/** Updates an existing topic node element
 * @param {HTMLElement} details - The details element to update
 * @param {TopicNode} node - The topic node data
 */
function updateTopicNode(details, node) {
    const summary = details.querySelector(':scope > summary')
    let badge = summary.querySelector('.message-count')

    if (node.messages.length > 0) {
        details.classList.add('hasData')

        if (!badge) {
            badge = document.createElement('span')
            badge.className = 'message-count'
            const childCount = summary.querySelector('.child-count')
            if (childCount) {
                summary.insertBefore(badge, childCount)
            } else {
                summary.appendChild(badge)
            }
        }

        badge.textContent = `${node.messages.length}`
        badge.title = `${node.messages.length} message(s) stored`
    }

    // Update children if expanded
    if (details.open) {
        const childContainer = details.querySelector(':scope > .topic-children')
        if (childContainer && node.children.size > 0) {
            const fullPath = details.dataset.topicPath
            renderTopicLevel(node.children, childContainer, fullPath)
        }
    }
}

/** Renders the root level of the topic tree */
function renderRootTopics() {
    renderTopicLevel(topicStore, elTopicTree)
    updateStatsDisplay()
}

/** Parses a payload, attempting JSON parse if string
 * @param {unknown} payload - The payload to parse
 * @returns {unknown} The parsed payload
 */
function parsePayload(payload) {
    if (typeof payload === 'string') {
        try {
            return JSON.parse(payload)
        } catch {
            return payload
        }
    }
    return payload
}

/** Renders the detail panel for a selected topic
 * @param {TopicNode} node - Topic node to display
 * @param {string} topicPath - Full topic path
 */
function renderDetailPanel(node, topicPath) {
    if (node.messages.length === 0) {
        elDetailContent.innerHTML = `
            <p class="topic-path"><strong>Topic:</strong> ${topicPath}</p>
            <p class="no-messages">No messages received for this topic yet.</p>
        `
        return
    }

    const messagesHtml = node.messages.map((msg, i) => {
        const parsedPayload = parsePayload(msg.payload)
        const timestamp = new Date(msg.timestamp).toLocaleString()

        return `
            <details class="message-entry" ${i === 0 ? 'open' : ''}>
                <summary class="message-summary">
                    <span class="message-time">${timestamp}</span>
                    <span class="message-meta">QoS: ${msg.qos} | Retained: ${msg.retain}</span>
                </summary>
                <div class="message-content">
                    <pre class="syntax-highlight">${uibuilder.syntaxHighlight(parsedPayload)}</pre>
                </div>
            </details>
        `
    }).join('')

    elDetailContent.innerHTML = `
        <p class="topic-path"><strong>Topic:</strong> ${topicPath}</p>
        <p class="message-stats"><strong>Messages stored:</strong> ${node.messages.length} (max ${MAX_HISTORY_PER_TOPIC})</p>
        <div class="message-history">
            <h3>Message History</h3>
            ${messagesHtml}
        </div>
    `
}

// #endregion

// #region --- Event Handlers ---

// Event delegation for topic selection
elTopicTree.addEventListener('click', (event) => {
    const summary = event.target.closest('summary')
    if (!summary) return

    const details = summary.parentElement
    if (!details.classList.contains('hasData')) return

    // Prevent default toggle behavior when clicking on a topic with data
    // We want to show details, not just toggle
    const topicPath = details.dataset.topicPath
    const topicParts = topicPath.split('/')
    const node = getTopicNode(topicParts)

    if (node) {
        // Remove selected class from all other topics
        elTopicTree.querySelectorAll('.selected').forEach((el) => {
            el.classList.remove('selected')
        })
        details.classList.add('selected')

        renderDetailPanel(node, topicPath)
    }
})

// #endregion

// #region --- Message Handler ---

// Listen for incoming messages from Node-RED and action
uibuilder.onChange('msg', (msg) => {
    if (!msg.topic) {
        console.warn('Received message without topic:', msg)
        return
    }

    // Store the message in our data structure
    storeMessage(msg)

    // Re-render the topic tree (only updates changed nodes)
    renderRootTopics()

    // If the currently selected topic matches, refresh the detail panel
    const selectedTopic = elTopicTree.querySelector('.selected')
    if (selectedTopic?.dataset.topicPath === msg.topic) {
        const topicParts = msg.topic.split('/')
        const node = getTopicNode(topicParts)
        if (node) {
            renderDetailPanel(node, msg.topic)
        }
    }
})

// #endregion
