// ============================================================================
//  Akademik+ — Backend API
//  Express + Socket.IO + persystencja w MSSQL (relacyjne) i MongoDB (dokumenty)
//
//  Podział danych:
//    SQL Server  -> Users, Rooms, Students, ResidenceHistory, Payments
//    MongoDB     -> conversations, chat_messages, issues, issue_messages
//
//  REST API i eventy Socket.IO są niezmienione w stosunku do wersji JSON,
//  dzięki czemu frontend działa bez modyfikacji.
// ============================================================================

import express from 'express';
import http from 'node:http';
import { Server as SocketIOServer } from 'socket.io';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { v4 as uuidv4 } from 'uuid';
import sql from 'mssql';
import { MongoClient } from 'mongodb';

const PORT = process.env.PORT || 4000;

// ---------------------------------------------------------------------------
//  Połączenie z MSSQL
// ---------------------------------------------------------------------------

const SQL_CONFIG = {
  server: process.env.SQL_HOST || 'sql-server',
  port: Number(process.env.SQL_PORT || 1433),
  user: process.env.SQL_USER || 'sa',
  password: process.env.SQL_PASSWORD || 'SuperSzK0lnaHaslo123!',
  database: process.env.SQL_DB || 'AkademikDB',
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
  pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
};

let sqlPool = null;
async function connectSql(retries = 30) {
  for (let i = 0; i < retries; i++) {
    try {
      sqlPool = await new sql.ConnectionPool(SQL_CONFIG).connect();
      console.log('[SQL] Połączono z MSSQL:', SQL_CONFIG.server, '/', SQL_CONFIG.database);
      return;
    } catch (err) {
      console.log(`[SQL] Próba ${i + 1}/${retries} nieudana: ${err.message}`);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
  throw new Error('Nie udało się połączyć z MSSQL po wielu próbach.');
}

// ---------------------------------------------------------------------------
//  Połączenie z MongoDB
// ---------------------------------------------------------------------------

const MONGO_URL = process.env.MONGO_URL || 'mongodb://mongo-db:27017';
const MONGO_DB_NAME = process.env.MONGO_DB || 'akademik';

let mongoClient = null;
let mongoDb = null;
async function connectMongo(retries = 30) {
  for (let i = 0; i < retries; i++) {
    try {
      mongoClient = new MongoClient(MONGO_URL, { serverSelectionTimeoutMS: 3000 });
      await mongoClient.connect();
      mongoDb = mongoClient.db(MONGO_DB_NAME);
      // upewnij się, że kolekcje istnieją
      const existing = (await mongoDb.listCollections().toArray()).map((c) => c.name);
      for (const name of ['conversations', 'chat_messages', 'issues', 'issue_messages']) {
        if (!existing.includes(name)) await mongoDb.createCollection(name);
      }
      console.log('[Mongo] Połączono z MongoDB:', MONGO_URL, '/', MONGO_DB_NAME);
      return;
    } catch (err) {
      console.log(`[Mongo] Próba ${i + 1}/${retries} nieudana: ${err.message}`);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
  throw new Error('Nie udało się połączyć z MongoDB po wielu próbach.');
}

// ---------------------------------------------------------------------------
//  Mapowanie wierszy SQL -> obiekty domenowe (camelCase, jak frontend oczekuje)
// ---------------------------------------------------------------------------

function mapUser(r) {
  if (!r) return null;
  return {
    id: r.Id,
    name: r.Name,
    email: r.Email,
    password: r.Password,
    role: r.Role,
    studentId: r.StudentMatriculationId || undefined,
  };
}

function mapRoom(r) {
  if (!r) return null;
  let equipment = [];
  try { equipment = r.Equipment ? JSON.parse(r.Equipment) : []; } catch { equipment = []; }
  return {
    id: r.Id,
    number: r.Number,
    floor: r.Floor,
    capacity: r.Capacity,
    occupied: r.Occupied,
    standard: r.Standard,
    pricePerMonth: r.PricePerMonth != null ? Number(r.PricePerMonth) : null,
    equipment,
    status: r.Status,
    soleUse: !!r.SoleUse,
  };
}

function isoDate(d) {
  if (!d) return null;
  if (d instanceof Date) return d.toISOString().split('T')[0];
  return String(d).split('T')[0];
}

function mapStudent(r) {
  if (!r) return null;
  return {
    id: r.Id,
    name: r.Name,
    email: r.Email,
    studentId: r.StudentMatriculationId,
    phoneNumber: r.PhoneNumber || '',
    roomId: r.RoomId,
    bedNumber: r.BedNumber,
    checkInDate: isoDate(r.CheckInDate),
    checkOutDate: isoDate(r.CheckOutDate),
  };
}

function mapPayment(r) {
  if (!r) return null;
  return {
    id: r.Id,
    studentId: r.StudentId,
    amount: Number(r.Amount),
    dueDate: isoDate(r.DueDate),
    paidDate: isoDate(r.PaidDate),
    status: r.Status,
    month: r.Month,
    year: r.Year,
  };
}

function mapResidence(r) {
  if (!r) return null;
  return {
    id: r.Id,
    studentId: r.StudentId,
    roomId: r.RoomId,
    checkInDate: isoDate(r.CheckInDate),
    checkOutDate: isoDate(r.CheckOutDate),
  };
}

// Mongo: konwertujemy _id <-> id, żeby format był identyczny jak w starym JSON.
function fromMongo(doc) {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return { id: _id, ...rest };
}

// ---------------------------------------------------------------------------
//  Pobierania kolekcji
// ---------------------------------------------------------------------------

async function getAllUsers() {
  const r = await sqlPool.request().query('SELECT * FROM Users');
  return r.recordset.map(mapUser);
}
async function getAllRooms() {
  const r = await sqlPool.request().query('SELECT * FROM Rooms ORDER BY Number');
  return r.recordset.map(mapRoom);
}
async function getAllStudents() {
  const r = await sqlPool.request().query('SELECT * FROM Students');
  return r.recordset.map(mapStudent);
}
async function getAllPayments() {
  const r = await sqlPool.request().query('SELECT * FROM Payments');
  return r.recordset.map(mapPayment);
}
async function getAllResidenceHistory() {
  const r = await sqlPool.request().query('SELECT * FROM ResidenceHistory');
  return r.recordset.map(mapResidence);
}
async function getAllConversations() {
  return (await mongoDb.collection('conversations').find().toArray()).map(fromMongo);
}
async function getAllChatMessages() {
  return (await mongoDb.collection('chat_messages').find().sort({ timestamp: 1 }).toArray()).map(fromMongo);
}
async function getAllIssues() {
  return (await mongoDb.collection('issues').find().toArray()).map(fromMongo);
}
async function getAllIssueMessages() {
  return (await mongoDb.collection('issue_messages').find().sort({ timestamp: 1 }).toArray()).map(fromMongo);
}

async function findUserByEmail(email) {
  const r = await sqlPool.request()
    .input('email', sql.NVarChar(255), String(email || ''))
    .query('SELECT * FROM Users WHERE LOWER(Email) = LOWER(@email)');
  return mapUser(r.recordset[0]);
}

// ---------------------------------------------------------------------------
//  Express + Socket.IO
// ---------------------------------------------------------------------------

const app = express();
const httpServer = http.createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: { origin: true, credentials: true },
});

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

const sessions = new Map();

function authMiddleware(req, _res, next) {
  const sessionId = req.cookies?.session_id;
  if (sessionId && sessions.has(sessionId)) {
    req.user = sessions.get(sessionId);
  }
  next();
}
app.use(authMiddleware);

function broadcast(event, payload) {
  io.emit(event, payload);
}

// ---------------------------------------------------------------------------
//  Healthcheck (musi być DOSTĘPNY zanim podłączą się DB - inaczej HEALTHCHECK
//  Dockerowy zabije kontener. Zwracamy 200 OK od razu.)
// ---------------------------------------------------------------------------

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'Healthy',
    service: 'akademik-plus-api',
    sql: !!sqlPool,
    mongo: !!mongoDb,
    timestamp: new Date().toISOString(),
  });
});

// ---------------------------------------------------------------------------
//  Auth
// ---------------------------------------------------------------------------

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const user = await findUserByEmail(email);
    if (!user || user.password !== password) {
      return res.status(401).json({ success: false, message: 'Nieprawidłowe dane logowania' });
    }
    const sessionId = uuidv4();
    sessions.set(sessionId, { id: user.id, email: user.email, role: user.role, name: user.name, studentId: user.studentId });
    res.cookie('session_id', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
    });
    return res.json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, studentId: user.studentId },
    });
  } catch (err) {
    console.error('[POST /api/login]', err);
    res.status(500).json({ success: false, message: 'Błąd serwera' });
  }
});

app.post('/api/logout', (req, res) => {
  const sessionId = req.cookies?.session_id;
  if (sessionId) sessions.delete(sessionId);
  res.clearCookie('session_id');
  res.json({ success: true });
});

app.get('/api/me', (req, res) => {
  if (req.user) return res.json({ authenticated: true, user: req.user });
  return res.status(401).json({ authenticated: false });
});

// ---------------------------------------------------------------------------
//  Zmiana hasła (wymaga zalogowania)
// ---------------------------------------------------------------------------

app.post('/api/change-password', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Niezalogowany' });
    }
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Wypełnij wszystkie pola' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Hasło musi mieć min. 6 znaków' });
    }

    // sprawdź obecne hasło
    const result = await sqlPool.request()
      .input('Id', sql.NVarChar(50), req.user.id)
      .query('SELECT Password FROM Users WHERE Id = @Id');

    const dbUser = result.recordset[0];
    if (!dbUser || dbUser.Password !== currentPassword) {
      return res.status(401).json({ success: false, message: 'Nieprawidłowe obecne hasło' });
    }

    // zaktualizuj hasło
    await sqlPool.request()
      .input('Id', sql.NVarChar(50), req.user.id)
      .input('Password', sql.NVarChar(255), newPassword)
      .query('UPDATE Users SET Password = @Password WHERE Id = @Id');

    return res.json({ success: true });
  } catch (err) {
    console.error('[POST /api/change-password]', err);
    res.status(500).json({ success: false, message: 'Błąd serwera' });
  }
});

// ---------------------------------------------------------------------------
//  Rejestracja studenta (publiczna, używana przez stronę /register)
// ---------------------------------------------------------------------------

app.post('/api/register', async (req, res) => {
  try {
    const { name, email, studentId, phoneNumber, password } = req.body || {};
    if (!name || !email || !studentId || !password) {
      return res.status(400).json({ success: false, message: 'Brakuje wymaganych pól' });
    }
    if (await findUserByEmail(email)) {
      return res.status(409).json({ success: false, message: 'Użytkownik z tym adresem email już istnieje' });
    }
    const newId = `s_${Date.now()}`;
    const tx = new sql.Transaction(sqlPool);
    await tx.begin();
    try {
      await new sql.Request(tx)
        .input('Id', sql.NVarChar(50), newId)
        .input('Name', sql.NVarChar(150), name)
        .input('Email', sql.NVarChar(255), email)
        .input('Password', sql.NVarChar(255), password)
        .input('Role', sql.NVarChar(50), 'student')
        .input('StudentMatriculationId', sql.NVarChar(50), studentId)
        .query(`INSERT INTO Users (Id, Name, Email, Password, Role, StudentMatriculationId)
                VALUES (@Id, @Name, @Email, @Password, @Role, @StudentMatriculationId)`);

      await new sql.Request(tx)
        .input('Id', sql.NVarChar(50), newId)
        .input('UserId', sql.NVarChar(50), newId)
        .input('Name', sql.NVarChar(150), name)
        .input('Email', sql.NVarChar(255), email)
        .input('StudentMatriculationId', sql.NVarChar(50), studentId)
        .input('PhoneNumber', sql.NVarChar(50), phoneNumber || '')
        .query(`INSERT INTO Students (Id, UserId, Name, Email, StudentMatriculationId, PhoneNumber)
                VALUES (@Id, @UserId, @Name, @Email, @StudentMatriculationId, @PhoneNumber)`);
      await tx.commit();
    } catch (e) {
      await tx.rollback();
      throw e;
    }

    broadcast('students:changed', await getAllStudents());
    return res.json({ success: true });
  } catch (err) {
    console.error('[POST /api/register]', err);
    res.status(500).json({ success: false, message: 'Błąd serwera' });
  }
});

// ---------------------------------------------------------------------------
//  Snapshot - jednorazowe pobranie wszystkich danych domeny
// ---------------------------------------------------------------------------

app.get('/api/state', async (_req, res) => {
  try {
    const [rooms, students, payments, issues, residenceHistory, chatMessages, conversations, issueMessages] = await Promise.all([
      getAllRooms(),
      getAllStudents(),
      getAllPayments(),
      getAllIssues(),
      getAllResidenceHistory(),
      getAllChatMessages(),
      getAllConversations(),
      getAllIssueMessages(),
    ]);
    res.json({ rooms, students, payments, issues, residenceHistory, chatMessages, conversations, issueMessages });
  } catch (err) {
    console.error('[GET /api/state]', err);
    res.status(500).json({ message: 'Błąd serwera' });
  }
});

// ---------------------------------------------------------------------------
//  Pokoje
// ---------------------------------------------------------------------------

app.post('/api/rooms', async (req, res) => {
  try {
    const id = `room_${Date.now()}`;
    const r = req.body || {};
    await sqlPool.request()
      .input('Id', sql.NVarChar(50), id)
      .input('Number', sql.NVarChar(20), r.number)
      .input('Floor', sql.Int, r.floor)
      .input('Capacity', sql.Int, r.capacity)
      .input('Occupied', sql.Int, r.occupied || 0)
      .input('Standard', sql.NVarChar(50), r.standard)
      .input('PricePerMonth', sql.Decimal(10, 2), r.pricePerMonth)
      .input('Equipment', sql.NVarChar(sql.MAX), JSON.stringify(r.equipment || []))
      .input('Status', sql.NVarChar(50), r.status || 'available')
      .input('SoleUse', sql.Bit, r.soleUse ? 1 : 0)
      .query(`INSERT INTO Rooms (Id, Number, Floor, Capacity, Occupied, Standard, PricePerMonth, Equipment, Status, SoleUse)
              VALUES (@Id, @Number, @Floor, @Capacity, @Occupied, @Standard, @PricePerMonth, @Equipment, @Status, @SoleUse)`);
    const all = await getAllRooms();
    const created = all.find((x) => x.id === id);
    broadcast('rooms:changed', all);
    res.json(created);
  } catch (err) {
    console.error('[POST /api/rooms]', err);
    res.status(500).json({ message: 'Błąd serwera' });
  }
});

app.patch('/api/rooms/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const cur = (await sqlPool.request().input('Id', sql.NVarChar(50), id).query('SELECT * FROM Rooms WHERE Id = @Id')).recordset[0];
    if (!cur) return res.status(404).json({ message: 'Nie znaleziono pokoju' });
    const merged = { ...mapRoom(cur), ...req.body };

    await sqlPool.request()
      .input('Id', sql.NVarChar(50), id)
      .input('Number', sql.NVarChar(20), merged.number)
      .input('Floor', sql.Int, merged.floor)
      .input('Capacity', sql.Int, merged.capacity)
      .input('Occupied', sql.Int, merged.occupied)
      .input('Standard', sql.NVarChar(50), merged.standard)
      .input('PricePerMonth', sql.Decimal(10, 2), merged.pricePerMonth)
      .input('Equipment', sql.NVarChar(sql.MAX), JSON.stringify(merged.equipment || []))
      .input('Status', sql.NVarChar(50), merged.status)
      .input('SoleUse', sql.Bit, merged.soleUse ? 1 : 0)
      .query(`UPDATE Rooms SET Number=@Number, Floor=@Floor, Capacity=@Capacity, Occupied=@Occupied,
                  Standard=@Standard, PricePerMonth=@PricePerMonth, Equipment=@Equipment,
                  Status=@Status, SoleUse=@SoleUse WHERE Id=@Id`);

    const all = await getAllRooms();
    broadcast('rooms:changed', all);
    res.json(all.find((x) => x.id === id));
  } catch (err) {
    console.error('[PATCH /api/rooms/:id]', err);
    res.status(500).json({ message: 'Błąd serwera' });
  }
});

// ---------------------------------------------------------------------------
//  Studenci
// ---------------------------------------------------------------------------

app.post('/api/students', async (req, res) => {
  try {
    const id = `s_${Date.now()}`;
    const s = req.body || {};
    const tx = new sql.Transaction(sqlPool);
    await tx.begin();
    try {
      // Jeśli nie ma User-a o takim emailu, utwórz go z domyślnym hasłem 'student'
      const existing = await findUserByEmail(s.email);
      if (!existing) {
        await new sql.Request(tx)
          .input('Id', sql.NVarChar(50), id)
          .input('Name', sql.NVarChar(150), s.name)
          .input('Email', sql.NVarChar(255), s.email)
          .input('Password', sql.NVarChar(255), 'student')
          .input('Role', sql.NVarChar(50), 'student')
          .input('StudentMatriculationId', sql.NVarChar(50), s.studentId || null)
          .query(`INSERT INTO Users (Id, Name, Email, Password, Role, StudentMatriculationId)
                  VALUES (@Id, @Name, @Email, @Password, @Role, @StudentMatriculationId)`);
      }
      const userId = existing ? existing.id : id;

      await new sql.Request(tx)
        .input('Id', sql.NVarChar(50), id)
        .input('UserId', sql.NVarChar(50), userId)
        .input('Name', sql.NVarChar(150), s.name)
        .input('Email', sql.NVarChar(255), s.email)
        .input('StudentMatriculationId', sql.NVarChar(50), s.studentId || null)
        .input('PhoneNumber', sql.NVarChar(50), s.phoneNumber || '')
        .input('RoomId', sql.NVarChar(50), s.roomId || null)
        .input('BedNumber', sql.Int, s.bedNumber ?? null)
        .input('CheckInDate', sql.Date, s.checkInDate || null)
        .input('CheckOutDate', sql.Date, s.checkOutDate || null)
        .query(`INSERT INTO Students (Id, UserId, Name, Email, StudentMatriculationId, PhoneNumber, RoomId, BedNumber, CheckInDate, CheckOutDate)
                VALUES (@Id, @UserId, @Name, @Email, @StudentMatriculationId, @PhoneNumber, @RoomId, @BedNumber, @CheckInDate, @CheckOutDate)`);
      await tx.commit();
    } catch (e) {
      await tx.rollback();
      throw e;
    }

    const all = await getAllStudents();
    broadcast('students:changed', all);
    res.json(all.find((x) => x.id === id));
  } catch (err) {
    console.error('[POST /api/students]', err);
    res.status(500).json({ message: 'Błąd serwera' });
  }
});

app.patch('/api/students/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const cur = (await sqlPool.request().input('Id', sql.NVarChar(50), id).query('SELECT * FROM Students WHERE Id = @Id')).recordset[0];
    if (!cur) return res.status(404).json({ message: 'Nie znaleziono studenta' });
    const merged = { ...mapStudent(cur), ...req.body };

    await sqlPool.request()
      .input('Id', sql.NVarChar(50), id)
      .input('Name', sql.NVarChar(150), merged.name)
      .input('Email', sql.NVarChar(255), merged.email)
      .input('StudentMatriculationId', sql.NVarChar(50), merged.studentId || null)
      .input('PhoneNumber', sql.NVarChar(50), merged.phoneNumber || '')
      .input('RoomId', sql.NVarChar(50), merged.roomId || null)
      .input('BedNumber', sql.Int, merged.bedNumber ?? null)
      .input('CheckInDate', sql.Date, merged.checkInDate || null)
      .input('CheckOutDate', sql.Date, merged.checkOutDate || null)
      .query(`UPDATE Students SET Name=@Name, Email=@Email, StudentMatriculationId=@StudentMatriculationId,
                  PhoneNumber=@PhoneNumber, RoomId=@RoomId, BedNumber=@BedNumber,
                  CheckInDate=@CheckInDate, CheckOutDate=@CheckOutDate WHERE Id=@Id`);

    const all = await getAllStudents();
    broadcast('students:changed', all);
    res.json(all.find((x) => x.id === id));
  } catch (err) {
    console.error('[PATCH /api/students/:id]', err);
    res.status(500).json({ message: 'Błąd serwera' });
  }
});

// Przypisanie do pokoju – w transakcji: aktualizacja Students, Rooms, ResidenceHistory.
app.post('/api/students/:id/assign-room', async (req, res) => {
  try {
    const studentId = req.params.id;
    const { roomId, bedNumber } = req.body || {};
    const today = new Date().toISOString().split('T')[0];

    const tx = new sql.Transaction(sqlPool);
    await tx.begin();
    try {
      const sr = await new sql.Request(tx).input('Id', sql.NVarChar(50), studentId)
        .query('SELECT * FROM Students WHERE Id = @Id');
      const rr = await new sql.Request(tx).input('Id', sql.NVarChar(50), roomId)
        .query('SELECT * FROM Rooms WHERE Id = @Id');
      if (!sr.recordset[0] || !rr.recordset[0]) {
        await tx.rollback();
        return res.status(404).json({ message: 'Nieprawidłowy student/pokój' });
      }
      const room = rr.recordset[0];
      const newOccupied = room.Occupied + 1;
      const newStatus = newOccupied >= room.Capacity ? 'full' : 'available';

      await new sql.Request(tx)
        .input('Id', sql.NVarChar(50), studentId)
        .input('RoomId', sql.NVarChar(50), roomId)
        .input('BedNumber', sql.Int, Number(bedNumber))
        .input('CheckInDate', sql.Date, today)
        .query(`UPDATE Students SET RoomId=@RoomId, BedNumber=@BedNumber, CheckInDate=@CheckInDate WHERE Id=@Id`);

      await new sql.Request(tx)
        .input('Id', sql.NVarChar(50), roomId)
        .input('Occupied', sql.Int, newOccupied)
        .input('Status', sql.NVarChar(50), newStatus)
        .query(`UPDATE Rooms SET Occupied=@Occupied, Status=@Status WHERE Id=@Id`);

      await new sql.Request(tx)
        .input('Id', sql.NVarChar(50), `rh_${Date.now()}`)
        .input('StudentId', sql.NVarChar(50), studentId)
        .input('RoomId', sql.NVarChar(50), roomId)
        .input('CheckInDate', sql.Date, today)
        .query(`INSERT INTO ResidenceHistory (Id, StudentId, RoomId, CheckInDate)
                VALUES (@Id, @StudentId, @RoomId, @CheckInDate)`);

      await tx.commit();
    } catch (e) {
      await tx.rollback();
      throw e;
    }

    broadcast('students:changed', await getAllStudents());
    broadcast('rooms:changed', await getAllRooms());
    res.json({ success: true });
  } catch (err) {
    console.error('[POST /api/students/:id/assign-room]', err);
    res.status(500).json({ message: 'Błąd serwera' });
  }
});

app.post('/api/students/:id/remove-room', async (req, res) => {
  try {
    const studentId = req.params.id;
    const today = new Date().toISOString().split('T')[0];

    const tx = new sql.Transaction(sqlPool);
    await tx.begin();
    try {
      const sr = await new sql.Request(tx).input('Id', sql.NVarChar(50), studentId)
        .query('SELECT * FROM Students WHERE Id = @Id');
      const student = sr.recordset[0];
      if (!student) {
        await tx.rollback();
        return res.status(404).json({ message: 'Nie znaleziono studenta' });
      }
      if (!student.RoomId) {
        await tx.commit();
        return res.json({ success: true });
      }

      const rr = await new sql.Request(tx).input('Id', sql.NVarChar(50), student.RoomId)
        .query('SELECT * FROM Rooms WHERE Id = @Id');
      const room = rr.recordset[0];

      await new sql.Request(tx)
        .input('Id', sql.NVarChar(50), studentId)
        .input('CheckOutDate', sql.Date, today)
        .query(`UPDATE Students SET RoomId=NULL, BedNumber=NULL, CheckOutDate=@CheckOutDate WHERE Id=@Id`);

      if (room) {
        const newOccupied = Math.max(0, room.Occupied - 1);
        const newStatus = room.Status === 'maintenance' ? 'maintenance' : (newOccupied >= room.Capacity ? 'full' : 'available');
        await new sql.Request(tx)
          .input('Id', sql.NVarChar(50), room.Id)
          .input('Occupied', sql.Int, newOccupied)
          .input('Status', sql.NVarChar(50), newStatus)
          .query(`UPDATE Rooms SET Occupied=@Occupied, Status=@Status WHERE Id=@Id`);
      }

      await new sql.Request(tx)
        .input('StudentId', sql.NVarChar(50), studentId)
        .input('CheckOutDate', sql.Date, today)
        .query(`UPDATE ResidenceHistory SET CheckOutDate=@CheckOutDate
                WHERE StudentId=@StudentId AND CheckOutDate IS NULL`);

      await tx.commit();
    } catch (e) {
      await tx.rollback();
      throw e;
    }

    broadcast('students:changed', await getAllStudents());
    broadcast('rooms:changed', await getAllRooms());
    res.json({ success: true });
  } catch (err) {
    console.error('[POST /api/students/:id/remove-room]', err);
    res.status(500).json({ message: 'Błąd serwera' });
  }
});

// ---------------------------------------------------------------------------
//  Płatności
// ---------------------------------------------------------------------------

app.post('/api/payments', async (req, res) => {
  try {
    const id = `payment_${Date.now()}`;
    const p = req.body || {};
    await sqlPool.request()
      .input('Id', sql.NVarChar(50), id)
      .input('StudentId', sql.NVarChar(50), p.studentId)
      .input('Amount', sql.Decimal(10, 2), p.amount)
      .input('DueDate', sql.Date, p.dueDate)
      .input('PaidDate', sql.Date, p.paidDate || null)
      .input('Status', sql.NVarChar(50), p.status || 'pending')
      .input('Month', sql.NVarChar(20), p.month)
      .input('Year', sql.Int, p.year)
      .query(`INSERT INTO Payments (Id, StudentId, Amount, DueDate, PaidDate, Status, Month, Year)
              VALUES (@Id, @StudentId, @Amount, @DueDate, @PaidDate, @Status, @Month, @Year)`);
    const all = await getAllPayments();
    broadcast('payments:changed', all);
    res.json(all.find((x) => x.id === id));
  } catch (err) {
    console.error('[POST /api/payments]', err);
    res.status(500).json({ message: 'Błąd serwera' });
  }
});

app.patch('/api/payments/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const cur = (await sqlPool.request().input('Id', sql.NVarChar(50), id).query('SELECT * FROM Payments WHERE Id = @Id')).recordset[0];
    if (!cur) return res.status(404).json({ message: 'Nie znaleziono płatności' });
    const merged = { ...mapPayment(cur), ...req.body };

    await sqlPool.request()
      .input('Id', sql.NVarChar(50), id)
      .input('StudentId', sql.NVarChar(50), merged.studentId)
      .input('Amount', sql.Decimal(10, 2), merged.amount)
      .input('DueDate', sql.Date, merged.dueDate)
      .input('PaidDate', sql.Date, merged.paidDate || null)
      .input('Status', sql.NVarChar(50), merged.status)
      .input('Month', sql.NVarChar(20), merged.month)
      .input('Year', sql.Int, merged.year)
      .query(`UPDATE Payments SET StudentId=@StudentId, Amount=@Amount, DueDate=@DueDate,
                  PaidDate=@PaidDate, Status=@Status, Month=@Month, Year=@Year WHERE Id=@Id`);

    const all = await getAllPayments();
    broadcast('payments:changed', all);
    res.json(all.find((x) => x.id === id));
  } catch (err) {
    console.error('[PATCH /api/payments/:id]', err);
    res.status(500).json({ message: 'Błąd serwera' });
  }
});

// ---------------------------------------------------------------------------
//  Generowanie miesięcznych rachunków dla wszystkich studentów z pokojem
// ---------------------------------------------------------------------------

app.post('/api/payments/generate-monthly', async (req, res) => {
  try {
    const { month, year, dueDay } = req.body || {};
    if (!month || !year) {
      return res.status(400).json({ message: 'Brakuje pól month/year' });
    }
    const day = Number(dueDay) || 10;
    const dueDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    // mapowanie numeru miesiąca na polską nazwę (zgodnie z istniejącymi danymi)
    const monthNames = [
      '', 'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
      'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
    ];
    const monthName = monthNames[Number(month)] || String(month);

    // pobierz wszystkich studentów z pokojem + cenę pokoju
    const result = await sqlPool.request().query(`
      SELECT s.Id AS StudentId, r.PricePerMonth
      FROM Students s
      JOIN Rooms r ON s.RoomId = r.Id
      WHERE s.RoomId IS NOT NULL
    `);

    let created = 0;
    let skipped = 0;

    for (const row of result.recordset) {
      // sprawdź czy już istnieje rachunek za ten miesiąc dla tego studenta
      const existing = await sqlPool.request()
        .input('StudentId', sql.NVarChar(50), row.StudentId)
        .input('Month', sql.NVarChar(20), monthName)
        .input('Year', sql.Int, Number(year))
        .query('SELECT Id FROM Payments WHERE StudentId=@StudentId AND Month=@Month AND Year=@Year');

      if (existing.recordset.length > 0) {
        skipped++;
        continue;
      }

      const id = `payment_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      await sqlPool.request()
        .input('Id', sql.NVarChar(50), id)
        .input('StudentId', sql.NVarChar(50), row.StudentId)
        .input('Amount', sql.Decimal(10, 2), Number(row.PricePerMonth))
        .input('DueDate', sql.Date, dueDate)
        .input('PaidDate', sql.Date, null)
        .input('Status', sql.NVarChar(50), 'pending')
        .input('Month', sql.NVarChar(20), monthName)
        .input('Year', sql.Int, Number(year))
        .query(`INSERT INTO Payments (Id, StudentId, Amount, DueDate, PaidDate, Status, Month, Year)
                VALUES (@Id, @StudentId, @Amount, @DueDate, @PaidDate, @Status, @Month, @Year)`);
      created++;
    }

    const all = await getAllPayments();
    broadcast('payments:changed', all);
    res.json({ success: true, created, skipped });
  } catch (err) {
    console.error('[POST /api/payments/generate-monthly]', err);
    res.status(500).json({ message: 'Błąd serwera' });
  }
});

// ---------------------------------------------------------------------------
//  Zgłoszenia (issues) — Mongo
// ---------------------------------------------------------------------------

app.post('/api/issues', async (req, res) => {
  try {
    const _id = `issue_${Date.now()}`;
    const doc = {
      _id,
      ...req.body,
      createdAt: new Date().toISOString(),
      resolvedAt: null,
    };
    await mongoDb.collection('issues').insertOne(doc);
    const all = await getAllIssues();
    broadcast('issues:changed', all);
    res.json(fromMongo(doc));
  } catch (err) {
    console.error('[POST /api/issues]', err);
    res.status(500).json({ message: 'Błąd serwera' });
  }
});

app.patch('/api/issues/:id', async (req, res) => {
  try {
    const _id = req.params.id;
    const cur = await mongoDb.collection('issues').findOne({ _id });
    if (!cur) return res.status(404).json({ message: 'Nie znaleziono zgłoszenia' });

    const update = { ...req.body };
    if ((req.body.status === 'resolved' || req.body.status === 'closed') && !cur.resolvedAt) {
      update.resolvedAt = new Date().toISOString();
    }
    await mongoDb.collection('issues').updateOne({ _id }, { $set: update });
    const updated = await mongoDb.collection('issues').findOne({ _id });

    broadcast('issues:changed', await getAllIssues());
    res.json(fromMongo(updated));
  } catch (err) {
    console.error('[PATCH /api/issues/:id]', err);
    res.status(500).json({ message: 'Błąd serwera' });
  }
});

// ---------------------------------------------------------------------------
//  Wiadomości w zgłoszeniach — Mongo
// ---------------------------------------------------------------------------

app.post('/api/issues/:id/messages', async (req, res) => {
  try {
    const { senderId, senderName, senderRole, message } = req.body || {};
    if (!message || !senderId || !senderRole) {
      return res.status(400).json({ message: 'Brakuje wymaganych pól' });
    }
    const _id = `issue_msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const doc = {
      _id,
      issueId: req.params.id,
      senderId,
      senderName,
      senderRole,
      message,
      timestamp: new Date().toISOString(),
    };
    await mongoDb.collection('issue_messages').insertOne(doc);
    broadcast('issue-messages:new', fromMongo(doc));
    res.json(fromMongo(doc));
  } catch (err) {
    console.error('[POST /api/issues/:id/messages]', err);
    res.status(500).json({ message: 'Błąd serwera' });
  }
});

// ---------------------------------------------------------------------------
//  Czat (admin <-> student) — Mongo
// ---------------------------------------------------------------------------

async function getOrCreateConversationDb(studentId, studentName) {
  let conv = await mongoDb.collection('conversations').findOne({ studentId });
  if (!conv) {
    conv = {
      _id: `conv_${studentId}`,
      studentId,
      studentName,
      lastMessage: '',
      lastMessageTime: new Date().toISOString(),
      unreadCount: 0,
    };
    await mongoDb.collection('conversations').insertOne(conv);
  }
  return conv;
}

app.post('/api/chat/conversations', async (req, res) => {
  try {
    const { studentId, studentName } = req.body || {};
    if (!studentId) return res.status(400).json({ message: 'Brak studentId' });
    const conv = await getOrCreateConversationDb(studentId, studentName || 'Student');
    broadcast('conversations:changed', await getAllConversations());
    res.json(fromMongo(conv));
  } catch (err) {
    console.error('[POST /api/chat/conversations]', err);
    res.status(500).json({ message: 'Błąd serwera' });
  }
});

app.post('/api/chat/messages', async (req, res) => {
  try {
    const { conversationId, senderId, senderName, senderRole, message } = req.body || {};
    if (!conversationId || !senderId || !senderRole || !message) {
      return res.status(400).json({ message: 'Brakuje wymaganych pól' });
    }
    const _id = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const newMsg = {
      _id,
      conversationId,
      senderId,
      senderName,
      senderRole,
      message,
      timestamp: new Date().toISOString(),
      read: false,
    };
    await mongoDb.collection('chat_messages').insertOne(newMsg);

    // aktualizacja konwersacji
    const conv = await mongoDb.collection('conversations').findOne({ _id: conversationId });
    if (conv) {
      const inc = senderRole === 'student' ? (conv.unreadCount || 0) + 1 : conv.unreadCount || 0;
      await mongoDb.collection('conversations').updateOne(
        { _id: conversationId },
        { $set: { lastMessage: message, lastMessageTime: newMsg.timestamp, unreadCount: inc } },
      );
    }

    broadcast('chat:new-message', fromMongo(newMsg));
    broadcast('conversations:changed', await getAllConversations());
    res.json(fromMongo(newMsg));
  } catch (err) {
    console.error('[POST /api/chat/messages]', err);
    res.status(500).json({ message: 'Błąd serwera' });
  }
});

app.post('/api/chat/conversations/:id/read', async (req, res) => {
  try {
    const { userId } = req.body || {};
    const conversationId = req.params.id;

    await mongoDb.collection('chat_messages').updateMany(
      { conversationId, senderId: { $ne: userId } },
      { $set: { read: true } },
    );
    await mongoDb.collection('conversations').updateOne(
      { _id: conversationId },
      { $set: { unreadCount: 0 } },
    );

    broadcast('chat:read', { conversationId, readerId: userId });
    broadcast('conversations:changed', await getAllConversations());
    res.json({ success: true });
  } catch (err) {
    console.error('[POST /api/chat/conversations/:id/read]', err);
    res.status(500).json({ message: 'Błąd serwera' });
  }
});

// ---------------------------------------------------------------------------
//  Socket.IO
// ---------------------------------------------------------------------------

io.on('connection', (socket) => {
  socket.on('state:request', async () => {
    try {
      const [rooms, students, payments, issues, residenceHistory, chatMessages, conversations, issueMessages] = await Promise.all([
        getAllRooms(),
        getAllStudents(),
        getAllPayments(),
        getAllIssues(),
        getAllResidenceHistory(),
        getAllChatMessages(),
        getAllConversations(),
        getAllIssueMessages(),
      ]);
      socket.emit('state:snapshot', {
        rooms, students, payments, issues, residenceHistory, chatMessages, conversations, issueMessages,
      });
    } catch (err) {
      console.error('[socket state:request]', err);
    }
  });
});

// ---------------------------------------------------------------------------
//  Start
// ---------------------------------------------------------------------------

(async () => {
  // 1) startujemy HTTP od razu, żeby healthcheck Dockera nie zabił kontenera
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`[Akademik+] API + Socket.IO uruchomione na porcie ${PORT}`);
  });
  // 2) potem podłączamy bazy w tle z retry
  try {
    await connectSql();
    await connectMongo();
    console.log('[Akademik+] Bazy gotowe.');
  } catch (err) {
    console.error('[Akademik+] FATAL:', err.message);
    process.exit(1);
  }
})();
