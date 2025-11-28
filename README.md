# Kayak Simulation - Travel Booking Platform

A full-stack travel booking platform clone inspired by Kayak, featuring flight, hotel, and car rental bookings with a hybrid MySQL + MongoDB database architecture.

## 🚀 Tech Stack

### Frontend
- React.js
- CSS3 (Custom styling)
- Axios for API calls

### Backend
- Node.js + Express.js
- MySQL (Structured data: users, bookings, flights, hotels, cars)
- MongoDB (Unstructured data: images, reviews, logs, notifications)
- JWT Authentication
- bcrypt for password hashing

## 📋 Prerequisites

Before you begin, ensure you have installed:
- **Node.js** (v14 or higher)
- **MySQL** (v8.0 or higher)
- **MongoDB Atlas** account (or local MongoDB)
- **npm** or **yarn**

## 🛠️ Installation

### 1. Clone the Repository

```bash
git clone https://github.com/28mamtajha/KayakSimulation.git
cd KayakSimulation
```

### 2. Install Dependencies

#### Backend
```bash
cd backend
npm install
```

#### Frontend
```bash
cd frontend
npm install
```

## 🗄️ Database Setup

### MySQL Setup

1. **Create Database**
   ```bash
   mysql -u root -p
   ```
   ```sql
   CREATE DATABASE kayak_db;
   USE kayak_db;
   ```

2. **Run Schema Migration** (MUST run first)
   ```bash
   mysql -u root -p kayak_db < database-new/01-complete-schema-new.sql
   ```

3. **Load Dummy Data** (MUST run second)
   ```bash
   mysql -u root -p kayak_db < database-new/02-dummy-data.sql
   ```

### MongoDB Setup

MongoDB is automatically initialized via the backend configuration. No manual setup required - just configure your `.env` file with MongoDB Atlas credentials.

**Optional:** To manually initialize MongoDB collections with dummy data:
```bash
node database-new/init-mongodb-final.js
```

## ⚙️ Environment Configuration

Create a `.env` file in the `backend` directory:

### Backend `.env` File Structure

```env
# Server Configuration
PORT=8089
NODE_ENV=development

# MySQL Database Configuration
MYSQL_HOST=localhost
MYSQL_USER=root
MYSQL_PASSWORD=your_mysql_password
MYSQL_DATABASE=kayak_db

# MongoDB Configuration (MongoDB Atlas)
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/?appName=Cluster0
MONGODB_DATABASE=kayak_db

# JWT Secret (Generate a random secure string)
JWT_SECRET=your_super_secret_jwt_key_here_change_in_production

# Optional: CORS Configuration
CORS_ORIGIN=http://localhost:8088
```

### Example `.env` File

```env
PORT=8089
NODE_ENV=development

MYSQL_HOST=localhost
MYSQL_USER=root
MYSQL_PASSWORD=abcd@1234
MYSQL_DATABASE=kayak_db

MONGODB_URI=mongodb+srv://your_user:your_password@cluster0.fykdkql.mongodb.net/?appName=Cluster0
MONGODB_DATABASE=kayak_db

JWT_SECRET=my_super_secret_jwt_key_change_this_in_production
```

## 🏃 Running the Application

### Development Mode

1. **Start Backend Server**
   ```bash
   cd backend
   npm start
   ```
   Backend will run on `http://localhost:8089`

2. **Start Frontend** (in a new terminal)
   ```bash
   cd frontend
   PORT=8088 BROWSER=none npm start
   ```
   Frontend will run on `http://localhost:8088`

### Access the Application

Open your browser and navigate to: `http://localhost:8088`

## 📁 Project Structure

```
KayakSimulation/
├── backend/
│   ├── config/
│   │   ├── database.js       # MySQL connection
│   │   └── mongodb.js        # MongoDB connection
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── bookingController.js
│   │   ├── reviewController.js
│   │   └── ...
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── bookingRoutes.js
│   │   └── ...
│   ├── middleware/
│   │   └── auth.js           # JWT authentication
│   ├── utils/
│   │   ├── mongoHelpers.js   # MongoDB helper functions
│   │   └── validation.js     # Input validation
│   ├── server.js             # Express app entry point
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/       # Reusable components
│   │   ├── pages/           # Page components
│   │   ├── services/        # API service layer
│   │   └── App.js
│   └── package.json
│
├── database-new/
│   ├── 01-complete-schema-new.sql  # MySQL schema (RUN FIRST)
│   ├── 02-dummy-data.sql           # Dummy data (RUN SECOND)
│   ├── init-mongodb-final.js       # MongoDB initialization
│   └── mongodb-schemas.js          # MongoDB schema definitions
│
└── README.md
```

## 🔑 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user profile
- `PUT /api/auth/me` - Update user profile
- `POST /api/auth/logout` - Logout user

### Bookings
- `GET /api/bookings` - Get user bookings
- `POST /api/bookings/hold` - Create booking hold
- `GET /api/bookings/:id` - Get booking details
- `DELETE /api/bookings/:id` - Cancel booking

### Reviews (MongoDB)
- `GET /api/reviews/:entityType/:entityId` - Get reviews for entity
- `GET /api/reviews/user/my-reviews` - Get user's reviews
- `POST /api/reviews` - Create review
- `PUT /api/reviews/:id` - Update review
- `DELETE /api/reviews/:id` - Delete review

### Flights
- `GET /api/flights/search` - Search flights
- `GET /api/flights/:id` - Get flight details

### Hotels
- `GET /api/hotels/search` - Search hotels
- `GET /api/hotels/:id` - Get hotel details

### Cars
- `GET /api/cars/search` - Search cars
- `GET /api/cars/:id` - Get car details

## 🗃️ Database Architecture

### Hybrid Database Model

**MySQL (Relational Data)**
- Users, Authentication
- Bookings, Payments
- Flights, Hotels, Cars
- Seats, Availability

**MongoDB (Document Data)**
- Images (Base64 storage)
- Reviews & Ratings
- Analytics Logs
- Notifications
- User Preferences

### MongoDB Collections

1. **images** - User profiles, hotel/room photos (Base64)
2. **reviews** - Flight/hotel/car reviews with ratings
3. **logs** - Analytics events, user journey tracking
4. **notifications** - Price alerts, booking updates

## 👥 Default Test Users

After running `02-dummy-data.sql`, you'll have these test users:

| Email | Password | Role |
|-------|----------|------|
| john.doe@email.com | password123 | user |
| jane.smith@email.com | password123 | user |
| mike.b@email.com | password123 | user |
| admin@kayak.com | admin123 | admin |

## 🔧 Troubleshooting

### MySQL Connection Issues
```bash
# Check if MySQL is running
mysql --version
mysql -u root -p

# Verify database exists
mysql -u root -p -e "SHOW DATABASES;"
```

### MongoDB Connection Issues
- Verify MongoDB Atlas connection string in `.env`
- Check IP whitelist in MongoDB Atlas (allow `0.0.0.0/0` for development)
- Ensure username/password are correct

### Port Already in Use
```bash
# Kill process on port 8089 (backend)
lsof -ti:8089 | xargs kill -9

# Kill process on port 8088 (frontend)
lsof -ti:8088 | xargs kill -9
```

### JWT Token Errors
- Ensure `JWT_SECRET` is set in `.env`
- Clear browser localStorage and login again

## 📝 Development Notes

### Adding New Features
1. Create controller in `backend/controllers/`
2. Add routes in `backend/routes/`
3. Update frontend API service in `frontend/src/services/api.js`
4. Create UI components in `frontend/src/components/`

### Database Migrations
- MySQL: Create migration SQL files in `database-new/`
- MongoDB: Update schemas in `database-new/init-mongodb-final.js`

## 🚢 Deployment

### Backend Deployment
1. Set `NODE_ENV=production` in `.env`
2. Use strong `JWT_SECRET`
3. Configure production MongoDB Atlas cluster
4. Use environment variables for sensitive data

### Frontend Deployment
1. Build production bundle: `npm run build`
2. Serve static files via Nginx/Apache
3. Update API base URL to production backend

## 📄 License

This project is for educational purposes.

## 👨‍💻 Contributors

- [Your Team Name]

## 📞 Support

For issues and questions, please open an issue on GitHub.

---

**Happy Coding! ✈️🏨🚗**
