# Database Setup Instructions

This guide will help you set up the Kayak database schema on your local machine.

## Prerequisites

- MySQL 8.0+ installed and running
- MySQL command-line client or MySQL Workbench
- Database credentials (username/password)

## 🔄 Migrating from Old Schema?

**If you already have the old schema** (`mysql-schema.sql`) with existing data:

```bash
# Navigate to the project root
cd /path/to/KayakSimulation

# Backup your current database first!
mysqldump -u root -p kayak_db > kayak_db_backup_$(date +%Y%m%d).sql

# Run the migration script (preserves all data)
mysql -u root -p kayak_db < database/migrate-to-complete-schema.sql
```

**This migration will:**
- ✅ Preserve ALL existing data (flights, hotels, cars, bookings, payments, users)
- ✅ Add new columns to existing tables
- ✅ Create new tables (hotel_rooms, flight_seats, billing, administrators)
- ✅ Update ENUM values (bookings.status includes 'hold')
- ✅ Rename columns to match new naming conventions

**Skip to [Environment Configuration](#environment-configuration) after migration.**

---

## Quick Setup (Fresh Install)

### Option 1: Command Line (Recommended)

```bash
# Navigate to the project root
cd /path/to/KayakSimulation

# Run the complete schema script
mysql -u root -p < database/complete-schema.sql

# Enter your MySQL password when prompted
```

### Option 2: MySQL Workbench

1. Open MySQL Workbench
2. Connect to your MySQL server
3. Click **File** → **Open SQL Script**
4. Select `database/complete-schema.sql`
5. Click the **Execute** button (lightning bolt icon)

## Step-by-Step Setup

### 1. Create Database

```sql
CREATE DATABASE IF NOT EXISTS kayak_db;
USE kayak_db;
```

### 2. Run Schema Script

```bash
mysql -u root -p kayak_db < database/complete-schema.sql
```

### 3. Verify Tables Created

```bash
mysql -u root -p kayak_db -e "SHOW TABLES;"
```

Expected output:
```
+---------------------+
| Tables_in_kayak_db  |
+---------------------+
| administrators      |
| billing             |
| bookings            |
| cars                |
| flight_seats        |
| flights             |
| hotel_rooms         |
| hotels              |
| payments            |
| users               |
+---------------------+
```

### 4. (Optional) Load Sample Flight Data

```bash
mysql -u root -p kayak_db < database/add-dec21-25-2025-flights.sql
```

This adds 108 sample flights between New York, Los Angeles, and Seattle.

## Environment Configuration

Create a `.env` file in the `backend/` directory:

```bash
cd backend
cat > .env << 'EOF'
# Server Configuration
PORT=8089
NODE_ENV=development

# MySQL Configuration
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password_here
MYSQL_DATABASE=kayak_db

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/kayak_db

# JWT Secret (generate a random string)
JWT_SECRET=your_jwt_secret_here_change_this_in_production
EOF
```

**Important:** Replace `your_password_here` with your actual MySQL password.

## Verify Setup

### Check Table Structures

```sql
USE kayak_db;

-- Show table structure
DESCRIBE users;
DESCRIBE flights;
DESCRIBE bookings;

-- Check for foreign keys
SELECT 
    TABLE_NAME,
    CONSTRAINT_NAME,
    REFERENCED_TABLE_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'kayak_db' 
AND REFERENCED_TABLE_NAME IS NOT NULL;
```

### Test Data Queries

```sql
-- Check if sample flights exist
SELECT COUNT(*) as total_flights FROM flights;

-- View flight routes
SELECT 
    departure_city, 
    arrival_city, 
    COUNT(*) as flights 
FROM flights 
GROUP BY departure_city, arrival_city;
```

## Troubleshooting

### Error: "Access denied for user"

**Solution:** Check your MySQL credentials and ensure the user has proper permissions:

```sql
GRANT ALL PRIVILEGES ON kayak_db.* TO 'root'@'localhost';
FLUSH PRIVILEGES;
```

### Error: "Unknown database 'kayak_db'"

**Solution:** Create the database first:

```bash
mysql -u root -p -e "CREATE DATABASE kayak_db;"
```

### Error: "Table already exists"

**Solution:** The script uses `CREATE TABLE IF NOT EXISTS`, so this shouldn't happen. If you want to start fresh:

```sql
DROP DATABASE kayak_db;
CREATE DATABASE kayak_db;
-- Then re-run the schema script
```

### Error: Foreign key constraint fails

**Solution:** Ensure you're running the complete schema script which creates tables in the correct order. Dependencies are:

1. `users` table (no dependencies)
2. `flights`, `hotels`, `cars` (no dependencies)
3. `flight_seats` (requires `flights`)
4. `hotel_rooms` (requires `hotels`)
5. `bookings` (requires `users`)
6. `payments` (requires `users` and `bookings`)
7. `billing` (requires `users`, `bookings`, and `payments`)
8. `administrators` (no dependencies)

## Database Schema Overview

### Tables Created

| Table | Purpose | Key Features |
|-------|---------|--------------|
| `users` | User accounts | SSN format ID, authentication, payment tokens |
| `flights` | Flight catalog | Routes, pricing, availability, status |
| `flight_seats` | Seat selection | Seat types, pricing modifiers |
| `hotels` | Hotel listings | Amenities (JSON), ratings, room counts |
| `hotel_rooms` | Room inventory | Types, pricing, availability |
| `cars` | Car rentals | Types, features (JSON), location-based |
| `bookings` | All bookings | Flexible JSON details, multi-type support |
| `payments` | Transactions | Payment gateway integration, refunds |
| `billing` | Invoices | Tax, fees, detailed breakdowns |
| `administrators` | Admin users | Role-based access, permissions (JSON) |

### Relationships

```
users ──┬─< bookings ──┬─< payments ──< billing
        │              │
        └─< payments   └─< billing

flights ──< flight_seats

hotels ──< hotel_rooms
```

## Next Steps

1. **Install Backend Dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Start Backend Server**
   ```bash
   npm start
   # Server runs on http://localhost:8089
   ```

3. **Install Frontend Dependencies**
   ```bash
   cd frontend
   npm install
   ```

4. **Start Frontend Server**
   ```bash
   npm start
   # Frontend runs on http://localhost:8088
   ```

## MongoDB Setup (Optional)

While MySQL handles the core transactional data, MongoDB is used for flexible data like reviews, images, and logs.

### Install MongoDB

```bash
# macOS (using Homebrew)
brew tap mongodb/brew
brew install mongodb-community

# Start MongoDB service
brew services start mongodb-community
```

### Verify MongoDB Connection

```bash
# Connect to MongoDB shell
mongosh

# Switch to kayak_db
use kayak_db

# Show collections (will be empty initially)
show collections
```

MongoDB collections are created automatically by the application when needed.

## Additional Resources

- **Full Database Documentation:** See `database/README-DATABASE-DESIGN.md`
- **API Documentation:** See `backend/README.md`
- **MongoDB Schemas:** See `database/mongodb-schemas.js`

## Support

If you encounter issues:

1. Check the troubleshooting section above
2. Verify all prerequisites are installed
3. Ensure MySQL service is running: `mysql.server status`
4. Check MySQL error logs: `tail -f /usr/local/var/mysql/*.err`
5. Contact the team for assistance

---

**Last Updated:** November 27, 2025  
**Schema Version:** 1.0.0  
**Compatible with:** MySQL 8.0+, Node.js 18+
