
IF DB_ID('AkademikDB') IS NULL
BEGIN
    CREATE DATABASE AkademikDB;
END
GO

USE AkademikDB;
GO

-- ---------------------------------------------------------------------------
--  Tabele
-- ---------------------------------------------------------------------------

IF OBJECT_ID('dbo.Payments', 'U') IS NOT NULL DROP TABLE dbo.Payments;
IF OBJECT_ID('dbo.ResidenceHistory', 'U') IS NOT NULL DROP TABLE dbo.ResidenceHistory;
IF OBJECT_ID('dbo.Students', 'U') IS NOT NULL DROP TABLE dbo.Students;
IF OBJECT_ID('dbo.Rooms', 'U') IS NOT NULL DROP TABLE dbo.Rooms;
IF OBJECT_ID('dbo.Users', 'U') IS NOT NULL DROP TABLE dbo.Users;
GO

CREATE TABLE Users (
    Id            NVARCHAR(50) PRIMARY KEY,
    Name          NVARCHAR(150),
    Email         NVARCHAR(255) NOT NULL UNIQUE,
    Password      NVARCHAR(255) NOT NULL,
    Role          NVARCHAR(50)  NOT NULL DEFAULT 'student', -- 'student' | 'admin'
    StudentMatriculationId NVARCHAR(50) NULL
);
GO

CREATE TABLE Rooms (
    Id            NVARCHAR(50) PRIMARY KEY,
    Number        NVARCHAR(20) NOT NULL UNIQUE,
    Floor         INT NOT NULL,
    Capacity      INT NOT NULL,
    Occupied      INT NOT NULL DEFAULT 0,
    Standard      NVARCHAR(50),                 -- 'basic' | 'standard' | 'premium'
    PricePerMonth DECIMAL(10,2),
    Equipment     NVARCHAR(MAX),                -- JSON array
    Status        NVARCHAR(50) DEFAULT 'available',
    SoleUse       BIT DEFAULT 0
);
GO

CREATE TABLE Students (
    Id            NVARCHAR(50) PRIMARY KEY,
    UserId        NVARCHAR(50) NOT NULL UNIQUE FOREIGN KEY REFERENCES Users(Id),
    Name          NVARCHAR(150),
    Email         NVARCHAR(255),
    StudentMatriculationId NVARCHAR(50) UNIQUE,
    PhoneNumber   NVARCHAR(50),
    RoomId        NVARCHAR(50) NULL FOREIGN KEY REFERENCES Rooms(Id),
    BedNumber     INT NULL,
    CheckInDate   DATE NULL,
    CheckOutDate  DATE NULL
);
GO

CREATE TABLE ResidenceHistory (
    Id            NVARCHAR(50) PRIMARY KEY,
    StudentId     NVARCHAR(50) NOT NULL FOREIGN KEY REFERENCES Students(Id),
    RoomId        NVARCHAR(50) NOT NULL FOREIGN KEY REFERENCES Rooms(Id),
    CheckInDate   DATE NOT NULL,
    CheckOutDate  DATE NULL
);
GO

CREATE TABLE Payments (
    Id            NVARCHAR(50) PRIMARY KEY,
    StudentId     NVARCHAR(50) NOT NULL FOREIGN KEY REFERENCES Students(Id),
    Amount        DECIMAL(10,2) NOT NULL,
    DueDate       DATE NOT NULL,
    PaidDate      DATE NULL,
    Status        NVARCHAR(50) DEFAULT 'pending', -- 'paid' | 'pending' | 'overdue'
    Month         NVARCHAR(20) NOT NULL,
    Year          INT NOT NULL
);
GO

-- ---------------------------------------------------------------------------
-- ---------------------------------------------------------------------------

INSERT INTO Users (Id, Name, Email, Password, Role, StudentMatriculationId) VALUES
('admin1', 'Jan Kowalski (Admin)',     'admin@akademik.pl',                'admin',   'admin',   NULL),
('s1',     'Jan Kowalski',              'jan.kowalski@student.pl',         'student', 'student', 'STU001'),
('s2',     'Anna Nowak',                'anna.nowak@student.pl',           'student', 'student', 'STU002'),
('s3',     'Piotr Wiśniewski',          'piotr.wisniewski@student.pl',     'student', 'student', 'STU003'),
('s4',     'Maria Lewandowska',         'maria.lewandowska@student.pl',    'student', 'student', 'STU004'),
('s5',     'Tomasz Zieliński',          'tomasz.zielinski@student.pl',     'student', 'student', 'STU005'),
('s6',     'Katarzyna Szymańska',       'katarzyna.szymanska@student.pl',  'student', 'student', 'STU006'),
('s7',     'Michał Woźniak',            'michal.wozniak@student.pl',       'student', 'student', 'STU007');
GO

INSERT INTO Rooms (Id, Number, Floor, Capacity, Occupied, Standard, PricePerMonth, Equipment, Status, SoleUse) VALUES
('1', '101', 1, 2, 2, 'basic',    500.00, N'["Łóżko","Biurko","Szafa","Krzesło"]', 'full',        0),
('2', '102', 1, 2, 1, 'basic',    500.00, N'["Łóżko","Biurko","Szafa","Krzesło"]', 'available',   0),
('3', '201', 2, 3, 3, 'standard', 600.00, N'["Łóżko","Biurko","Szafa","Krzesło","Lodówka"]', 'full',      0),
('4', '202', 2, 3, 0, 'standard', 600.00, N'["Łóżko","Biurko","Szafa","Krzesło","Lodówka"]', 'available', 1),
('5', '301', 3, 1, 1, 'premium',  800.00, N'["Łóżko","Biurko","Szafa","Krzesło","Lodówka","Łazienka prywatna","TV"]', 'full',      0),
('6', '302', 3, 1, 0, 'premium',  800.00, N'["Łóżko","Biurko","Szafa","Krzesło","Lodówka","Łazienka prywatna","TV"]', 'available', 0),
('7', '103', 1, 2, 0, 'basic',    500.00, N'["Łóżko","Biurko","Szafa","Krzesło"]', 'maintenance', 0);
GO

INSERT INTO Students (Id, UserId, Name, Email, StudentMatriculationId, PhoneNumber, RoomId, BedNumber, CheckInDate, CheckOutDate) VALUES
('s1', 's1', 'Jan Kowalski',         'jan.kowalski@student.pl',         'STU001', '+48 123 456 789', '1', 1, '2024-09-01', NULL),
('s2', 's2', 'Anna Nowak',           'anna.nowak@student.pl',           'STU002', '+48 987 654 321', '1', 2, '2024-09-01', NULL),
('s3', 's3', 'Piotr Wiśniewski',     'piotr.wisniewski@student.pl',     'STU003', '+48 555 666 777', '2', 1, '2024-10-01', NULL),
('s4', 's4', 'Maria Lewandowska',    'maria.lewandowska@student.pl',    'STU004', '+48 111 222 333', '3', 1, '2024-09-01', NULL),
('s5', 's5', 'Tomasz Zieliński',     'tomasz.zielinski@student.pl',     'STU005', '+48 444 555 666', '3', 2, '2024-09-01', NULL),
('s6', 's6', 'Katarzyna Szymańska',  'katarzyna.szymanska@student.pl',  'STU006', '+48 777 888 999', '3', 3, '2024-09-15', NULL),
('s7', 's7', 'Michał Woźniak',       'michal.wozniak@student.pl',       'STU007', '+48 222 333 444', '5', 1, '2024-09-01', NULL);
GO

INSERT INTO ResidenceHistory (Id, StudentId, RoomId, CheckInDate, CheckOutDate) VALUES
('rh1', 's1', '1', '2024-09-01', NULL),
('rh2', 's2', '1', '2024-09-01', NULL);
GO

INSERT INTO Payments (Id, StudentId, Amount, DueDate, PaidDate, Status, Month, Year) VALUES
('p1', 's1', 500, '2026-01-10', '2026-01-08', 'paid',    N'Styczeń', 2026),
('p2', 's1', 500, '2026-02-10', '2026-02-05', 'paid',    N'Luty',    2026),
('p3', 's1', 500, '2026-03-10', NULL,         'pending', N'Marzec',  2026),
('p4', 's2', 500, '2026-01-10', '2026-01-09', 'paid',    N'Styczeń', 2026),
('p5', 's2', 500, '2026-02-10', NULL,         'overdue', N'Luty',    2026),
('p6', 's3', 500, '2026-03-10', NULL,         'pending', N'Marzec',  2026);
GO

PRINT 'AkademikDB initialized.';
