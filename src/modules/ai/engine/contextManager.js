// Manages conversation context and memory for each user

const sessions = {}

export const contextManager = {
  getSession(userId) {
    if (!sessions[userId]) {
      sessions[userId] = {
        history: [],
        currentIntent: null,
        currentModule: null,
        mentionedEntity: null,
        mentionedEntityType: null,
        lastDataResult: null,
        conversationStage: 'start',
        timestamp: Date.now()
      }
    }
    // Clean old sessions (older than 30 minutes)
    if (Date.now() - sessions[userId].timestamp > 1800000) {
      sessions[userId] = {
        history: [],
        currentIntent: null,
        currentModule: null,
        mentionedEntity: null,
        mentionedEntityType: null,
        lastDataResult: null,
        conversationStage: 'start',
        timestamp: Date.now()
      }
    }
    sessions[userId].timestamp = Date.now()
    return sessions[userId]
  },

  updateContext(userId, updates) {
    const session = this.getSession(userId)
    Object.assign(session, updates)
    session.history.push({ ...updates, timestamp: Date.now() })
    if (session.history.length > 30) session.history.shift()
  },

  // Resolve pronouns and references
  resolveReference(userId, query) {
    const session = this.getSession(userId)
    const q = query.toLowerCase()

    // If query contains pronouns, use context
    if (this.matchAny(q, ['that', 'it', 'this', 'them', 'they', 'he', 'she', 'his', 'her', 'their', 'these', 'those'])) {
      if (session.mentionedEntity) {
        return {
          resolved: true,
          entity: session.mentionedEntity,
          type: session.mentionedEntityType,
          intent: session.currentIntent
        }
      }
    }

    return { resolved: false }
  },

  matchAny(text, keywords) {
    return keywords.some(kw => text.includes(kw))
  },

  // Clear session
  clearSession(userId) {
    delete sessions[userId]
  }
}
