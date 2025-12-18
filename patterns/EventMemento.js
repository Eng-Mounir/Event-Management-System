// patterns/EventMemento.js
console.log('🔄 EventMemento.js module loaded');

// Singleton instance holder
let _instance = null;

class EventMemento {
  constructor(eventData) {
    this.state = { ...eventData };
    this.timestamp = new Date();
  }
  
  getState() {
    return { ...this.state };
  }
}

class EventOriginator {
  constructor(initialEvent) {
    this.state = { ...initialEvent };
  }
  
  setState(newState) {
    this.state = { ...newState };
  }
  
  getState() {
    return { ...this.state };
  }
  
  saveToMemento() {
    return new EventMemento(this.state);
  }
  
  restoreFromMemento(memento) {
    this.state = { ...memento.getState() };
    return this.state;
  }
}

class EventCaretaker {
  constructor(eventId, maxHistory = 20) {
    this.eventId = eventId;
    this.mementos = [];
    this.currentIndex = -1;
    this.maxHistory = maxHistory;
    console.log(`📁 Created caretaker for event ${eventId}`);
  }
  
  saveMemento(memento) {
    console.log(`💾 saveMemento for event ${this.eventId}`);
    console.log(`   Before - currentIndex: ${this.currentIndex}, mementos: ${this.mementos.length}`);
    
    // Remove any future states if we're not at the end
    if (this.currentIndex < this.mementos.length - 1) {
      this.mementos = this.mementos.slice(0, this.currentIndex + 1);
    }
    
    this.mementos.push(memento);
    this.currentIndex++;
    
    // Limit history size
    if (this.mementos.length > this.maxHistory) {
      this.mementos.shift();
      this.currentIndex--;
    }
    
    console.log(`   After - currentIndex: ${this.currentIndex}, mementos: ${this.mementos.length}`);
    return this.currentIndex;
  }
  
  undo() {
    console.log(`↩️  Caretaker.undo() for event ${this.eventId}`);
    console.log(`   Current index: ${this.currentIndex}, Mementos: ${this.mementos.length}`);
    
    // Check if we can undo
    if (this.currentIndex > 0) {
      this.currentIndex--;
      const memento = this.mementos[this.currentIndex];
      console.log(`   New index: ${this.currentIndex}, got memento: ${memento ? 'YES' : 'NO'}`);
      return memento;
    }
    
    console.log(`   Cannot undo - at beginning of history`);
    return null;
  }
  
  redo() {
    console.log(`↪️  Caretaker.redo() for event ${this.eventId}`);
    console.log(`   Current index: ${this.currentIndex}, Mementos: ${this.mementos.length}`);
    
    // Check if we can redo
    if (this.currentIndex < this.mementos.length - 1) {
      this.currentIndex++;
      const memento = this.mementos[this.currentIndex];
      console.log(`   New index: ${this.currentIndex}, got memento: ${memento ? 'YES' : 'NO'}`);
      return memento;
    }
    
    console.log(`   Cannot redo - at end of history`);
    return null;
  }
  
  canUndo() {
    const result = this.currentIndex > 0;
    return result;
  }
  
  canRedo() {
    const result = this.currentIndex < this.mementos.length - 1;
    return result;
  }
  
  getHistory() {
    if (!this.mementos || this.mementos.length === 0) {
      return [];
    }
    
    return this.mementos.map((memento, index) => ({
      timestamp: memento.timestamp,
      isCurrent: index === this.currentIndex
    }));
  }
  
  clearHistory() {
    const currentState = this.mementos[this.currentIndex];
    this.mementos = currentState ? [currentState] : [];
    this.currentIndex = currentState ? 0 : -1;
  }
  
  // Debug method
  debug() {
    return {
      eventId: this.eventId,
      currentIndex: this.currentIndex,
      mementosCount: this.mementos.length,
      canUndo: this.canUndo(),
      canRedo: this.canRedo()
    };
  }
}

// TRUE Singleton manager - FIXED VERSION
class EventMementoManager {
  constructor() {
    // Check if instance already exists
    if (_instance) {
      return _instance;
    }
    
    console.log('✅ Creating NEW EventMementoManager instance');
    this.caretakers = new Map();
    this.instanceId = Date.now(); // For debugging
    
    // Store in global to prevent module reload issues
    if (!global._eventMementoManager) {
      global._eventMementoManager = this;
    }
    
    _instance = this;
  }
  
  static getInstance() {
    if (!_instance) {
      _instance = new EventMementoManager();
    }
    return _instance;
  }
  
  getCaretaker(eventId) {
    // Convert to string for consistent key access
    const key = String(eventId);
    
    // Debug: List all current keys
    if (this.caretakers.size > 0) {
      console.log(`   Existing keys:`, Array.from(this.caretakers.keys()));
    }
    
    if (!this.caretakers.has(key)) {
      console.log(`   Creating new caretaker for key "${key}"`);
      const newCaretaker = new EventCaretaker(eventId);
      this.caretakers.set(key, newCaretaker);
    } else {
      console.log(`   Found existing caretaker for key "${key}"`);
    }
    
    const caretaker = this.caretakers.get(key);
    return caretaker;
  }
  
  saveState(eventId, eventData) {
    console.log(`💾 Manager.saveState() for event ${eventId}`);
    
    const caretaker = this.getCaretaker(eventId);
    const originator = new EventOriginator(eventData);
    const result = caretaker.saveMemento(originator.saveToMemento());
    
    // Debug after save
    console.log(`   After save - caretaker debug:`, caretaker.debug());
    
    return result;
  }
  
  undo(eventId) {
    console.log(`↩️  Manager.undo() for event ${eventId}`);
    
    const caretaker = this.getCaretaker(eventId);
    
    if (!caretaker) {
      console.log(`❌ No caretaker found for event ${eventId}`);
      return null;
    }
    
    console.log(`   Before undo - caretaker debug:`, caretaker.debug());
    
    const memento = caretaker.undo();
    
    console.log(`   After undo - caretaker debug:`, caretaker.debug());
    
    if (memento) {
      console.log(`✅ Manager.undo() successful for event ${eventId}`);
      return memento.getState();
    }
    
    console.log(`❌ Manager.undo() failed for event ${eventId}`);
    return null;
  }
  
  redo(eventId) {
    console.log(`↪️  Manager.redo() for event ${eventId}`);
    
    const caretaker = this.getCaretaker(eventId);
    
    if (!caretaker) {
      console.log(`❌ No caretaker found for event ${eventId}`);
      return null;
    }
    
    console.log(`   Before redo - caretaker debug:`, caretaker.debug());
    
    const memento = caretaker.redo();
    
    console.log(`   After redo - caretaker debug:`, caretaker.debug());
    
    if (memento) {
      console.log(`✅ Manager.redo() successful for event ${eventId}`);
      return memento.getState();
    }
    
    console.log(`❌ Manager.redo() failed for event ${eventId}`);
    return null;
  }
  
  canUndo(eventId) {
    const caretaker = this.getCaretaker(eventId);
    if (!caretaker) return false;
    return caretaker.canUndo();
  }
  
  canRedo(eventId) {
    const caretaker = this.getCaretaker(eventId);
    if (!caretaker) return false;
    return caretaker.canRedo();
  }
  
  getHistory(eventId) {
    const caretaker = this.getCaretaker(eventId);
    if (!caretaker) return [];
    return caretaker.getHistory();
  }
  
  clearHistory(eventId) {
    const caretaker = this.getCaretaker(eventId);
    if (caretaker) {
      caretaker.clearHistory();
    }
  }
  
  // Debug method to see all caretakers
  dumpCaretakers() {
    console.log('📋 DUMPING ALL CARETAKERS:');
    console.log(`   Total: ${this.caretakers.size}`);
    console.log(`   Instance ID: ${this.instanceId}`);
    
    for (let [key, caretaker] of this.caretakers.entries()) {
      console.log(`   Key: "${key}" -> Event ${caretaker.eventId}`);
      console.log(`     Mementos: ${caretaker.mementos.length}, CurrentIndex: ${caretaker.currentIndex}`);
    }
  }
  
  // Debug method
  debug() {
    return {
      instanceId: this.instanceId,
      caretakersCount: this.caretakers.size,
      eventIds: Array.from(this.caretakers.keys())
    };
  }
}

// Export SINGLE instance - Use global to ensure true singleton
if (!global._eventMementoManagerInstance) {
  global._eventMementoManagerInstance = new EventMementoManager();
}

module.exports = global._eventMementoManagerInstance;