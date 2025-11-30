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

/** Maximum length for value preview display
 * @type {number}
 */
const MAX_VALUE_PREVIEW_LENGTH = 20

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
            // JK: Keep a copy of the original msg
            originalMsg: msg,
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

    // Add expand/collapse indicator for nodes with children
    if (node.children.size > 0) {
        const expandIndicator = document.createElement('span')
        expandIndicator.className = 'expand-indicator'
        expandIndicator.textContent = '▶'
        expandIndicator.setAttribute('aria-hidden', 'true')
        summary.appendChild(expandIndicator)
    } else {
        // Placeholder to maintain alignment
        const placeholder = document.createElement('span')
        placeholder.className = 'expand-placeholder'
        placeholder.setAttribute('aria-hidden', 'true')
        summary.appendChild(placeholder)
    }

    // Build summary content
    const nameSpan = document.createElement('span')
    nameSpan.className = 'topic-name'
    nameSpan.textContent = name
    summary.appendChild(nameSpan)

    // Add simple value preview if latest message has a simple value
    if (node.messages.length > 0) {
        const latestPayload = node.messages[0].payload
        const valuePreview = document.createElement('span')
        valuePreview.className = 'value-preview'
        if (isSimpleValue(latestPayload)) {
            valuePreview.textContent = formatValuePreview(latestPayload)
            valuePreview.title = String(parsePayload(latestPayload))
        } else {
            valuePreview.textContent = '{…}'
            valuePreview.title = 'Complex value - click to view details'
            valuePreview.classList.add('complex-value')
        }
        summary.appendChild(valuePreview)
    }

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
            // Create new node and insert in sorted position
            const details = renderTopicNode(name, node, fullPath)
            insertNodeSorted(container, details, name)
        }
    }
}

/** Inserts a topic node element in alphabetically sorted position
 * @param {HTMLElement} container - Parent container element
 * @param {HTMLElement} newNode - The new details element to insert
 * @param {string} name - The topic name for comparison
 */
function insertNodeSorted(container, newNode, name) {
    const existingNodes = container.querySelectorAll(':scope > details[data-topic-path]')

    for (const existingNode of existingNodes) {
        const existingPath = existingNode.dataset.topicPath
        const existingName = existingPath.split('/').pop()

        if (name.localeCompare(existingName) < 0) {
            container.insertBefore(newNode, existingNode)
            return
        }
    }

    // If no insertion point found, append at end
    container.appendChild(newNode)
}

/** Updates an existing topic node element
 * @param {HTMLElement} details - The details element to update
 * @param {TopicNode} node - The topic node data
 */
function updateTopicNode(details, node) {
    const summary = details.querySelector(':scope > summary')
    let badge = summary.querySelector('.message-count')
    let childIndicator = summary.querySelector('.child-count')
    let valuePreview = summary.querySelector('.value-preview')

    // Update simple value preview
    if (node.messages.length > 0) {
        const latestPayload = node.messages[0].payload
        if (!valuePreview) {
            valuePreview = document.createElement('span')
            valuePreview.className = 'value-preview'
            // Insert after topic-name
            const topicName = summary.querySelector('.topic-name')
            if (topicName?.nextSibling) {
                summary.insertBefore(valuePreview, topicName.nextSibling)
            } else {
                summary.appendChild(valuePreview)
            }
        }

        if (isSimpleValue(latestPayload)) {
            valuePreview.textContent = formatValuePreview(latestPayload)
            valuePreview.title = String(parsePayload(latestPayload))
            valuePreview.classList.remove('complex-value')
        } else {
            valuePreview.textContent = '{…}'
            valuePreview.title = 'Complex value - click to view details'
            valuePreview.classList.add('complex-value')
        }
    }

    // Update message count badge
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

    // Update child count indicator
    if (node.children.size > 0) {
        // Add expand indicator if not present
        let expandIndicator = summary.querySelector('.expand-indicator')
        if (!expandIndicator) {
            // Remove placeholder if present
            const placeholder = summary.querySelector('.expand-placeholder')
            if (placeholder) {
                placeholder.remove()
            }
            // Add expand indicator at the start
            expandIndicator = document.createElement('span')
            expandIndicator.className = 'expand-indicator'
            expandIndicator.textContent = '▶'
            expandIndicator.setAttribute('aria-hidden', 'true')
            summary.insertBefore(expandIndicator, summary.firstChild)
        }

        if (!childIndicator) {
            childIndicator = document.createElement('span')
            childIndicator.className = 'child-count'
            summary.appendChild(childIndicator)
        }

        childIndicator.textContent = `▸ ${node.children.size}`
        childIndicator.title = `${node.children.size} sub-topic(s)`

        // Ensure child container exists for lazy loading
        let childContainer = details.querySelector(':scope > .topic-children')
        if (!childContainer) {
            childContainer = document.createElement('div')
            childContainer.className = 'topic-children'
            details.appendChild(childContainer)

            // Add lazy-load listener
            details.addEventListener('toggle', () => {
                if (details.open && childContainer.children.length === 0) {
                    const fullPath = details.dataset.topicPath
                    renderTopicLevel(node.children, childContainer, fullPath)
                }
            })
        }
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

/** Checks if a value is simple (can be displayed inline)
 * @param {unknown} value - The value to check
 * @returns {boolean} True if the value is simple
 */
function isSimpleValue(value) {
    const parsed = parsePayload(value)
    return parsed === null ||
           typeof parsed === 'string' ||
           typeof parsed === 'number' ||
           typeof parsed === 'boolean'
}

/** Formats a simple value for inline preview display
 * @param {unknown} value - The value to format
 * @returns {string} Formatted and truncated string
 */
function formatValuePreview(value) {
    const parsed = parsePayload(value)

    let display
    if (parsed === null) {
        display = 'null'
    } else if (typeof parsed === 'boolean') {
        display = parsed ? 'true' : 'false'
    } else if (typeof parsed === 'number') {
        display = String(parsed)
    } else {
        display = String(parsed)
    }

    // Truncate if too long
    if (display.length > MAX_VALUE_PREVIEW_LENGTH) {
        return display.substring(0, MAX_VALUE_PREVIEW_LENGTH - 1) + '…'
    }

    return display
}

/** Renders the detail panel for a selected topic
 * @param {TopicNode} node - Topic node to display
 * @param {string} topicPath - Full topic path
 */
function renderDetailPanel(node, topicPath) {
    const publishSection = `
        <details class="publish-section">
            <summary><h3>Publish</h3></summary>
            <div class="publish-form">
                <div class="form-group">
                    <label for="publishTopic">Topic</label>
                    <input type="text" id="publishTopic" value="${topicPath}" />
                </div>
                <div class="form-group">
                    <label for="publishValue">Value</label>
                    <textarea id="publishValue" rows="4"></textarea>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="publishQos">QoS</label>
                        <select id="publishQos">
                            <option value="0">0</option>
                            <option value="1">1</option>
                            <option value="2">2</option>
                        </select>
                    </div>
                    <div class="form-group form-group--checkbox">
                        <label>
                            <input type="checkbox" id="publishRetain" />
                            Retain
                        </label>
                    </div>
                    <button type="button" id="publishBtn" class="publish-btn">Publish</button>
                </div>
            </div>
        </details>
    `

    if (node.messages.length === 0) {
        elDetailContent.innerHTML = `
            <p class="topic-path"><strong>Topic:</strong> ${topicPath}</p>
            <p class="no-messages">No messages received for this topic yet.</p>
            ${publishSection}
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

    // Build raw message object from latest message
    const latestMsg = node.messages[0]
    const rawMessage = latestMsg.originalMsg

    elDetailContent.innerHTML = `
        <p class="topic-path"><strong>Topic:</strong> ${topicPath}</p>
        <p class="message-stats"><strong>Messages stored:</strong> ${node.messages.length} (max ${MAX_HISTORY_PER_TOPIC})</p>
        <details class="raw-message-section">
            <summary><h3>Raw Message</h3></summary>
            <div class="raw-message-content">
                <pre class="syntax-highlight">${uibuilder.syntaxHighlight(rawMessage)}</pre>
            </div>
        </details>
        <details class="message-history" open>
            <summary><h3>Message History</h3></summary>
            ${messagesHtml}
        </details>
        ${publishSection}
    `
}

// #endregion

// #region --- Event Handlers ---

// Event delegation for publish button
elDetailContent.addEventListener('click', (event) => {
    if (event.target.id !== 'publishBtn') return

    const cmd = 'publish'
    const topic = document.getElementById('publishTopic').value.trim()
    const value = document.getElementById('publishValue').value
    const qos = parseInt(document.getElementById('publishQos').value, 10)
    const retain = document.getElementById('publishRetain').checked

    if (!topic) {
        alert('Topic is required')
        return
    }

    // Try to parse value as JSON, otherwise send as string
    let payload
    try {
        payload = JSON.parse(value)
    } catch {
        payload = value
    }

    uibuilder.send({
        cmd,
        topic,
        payload,
        qos,
        retain,
    })
})

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
