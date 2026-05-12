// ============================================================================
// ============================================================================

db = db.getSiblingDB('akademik');

db.createCollection('conversations');
db.createCollection('chat_messages');
db.createCollection('issues');
db.createCollection('issue_messages');

db.issues.insertMany([
  {
    _id: 'i1',
    studentId: 's1',
    roomId: '1',
    title: 'Nieszczelny kran w łazience',
    description: 'Kran w łazience cały czas kapie, mimo zamknięcia.',
    category: 'plumbing',
    status: 'in-progress',
    priority: 'medium',
    createdAt: '2026-03-20T10:30:00.000Z',
    resolvedAt: null,
  },
  {
    _id: 'i2',
    studentId: 's3',
    roomId: '2',
    title: 'Nie działa gniazdko przy biurku',
    description: 'Gniazdko elektryczne po prawej stronie pokoju nie dostarcza prądu.',
    category: 'electrical',
    status: 'open',
    priority: 'high',
    createdAt: '2026-03-22T14:15:00.000Z',
    resolvedAt: null,
  },
  {
    _id: 'i3',
    studentId: 's4',
    roomId: '3',
    title: 'Zepsute krzesło',
    description: 'Jedno z krzeseł ma złamaną nogę.',
    category: 'furniture',
    status: 'resolved',
    priority: 'low',
    createdAt: '2026-03-15T09:00:00.000Z',
    resolvedAt: '2026-03-18T16:00:00.000Z',
  },
]);

// Indeksy pomocnicze
db.chat_messages.createIndex({ conversationId: 1, timestamp: 1 });
db.issue_messages.createIndex({ issueId: 1, timestamp: 1 });
db.conversations.createIndex({ studentId: 1 }, { unique: true });

print('Mongo akademik DB initialized.');
