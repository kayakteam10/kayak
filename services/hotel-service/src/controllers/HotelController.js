/**
 * HotelController
 * 
 * SOLID Principles Applied:
 * - Single Responsibility: Only handles HTTP requests/responses
 * - Dependency Inversion: Depends on HotelService interface
 */

class HotelController {
    constructor(hotelService) {
        this.hotelService = hotelService;

        // Bind methods
        this.search = this.search.bind(this);
        this.getDetails = this.getDetails.bind(this);
        this.getRoomTypes = this.getRoomTypes.bind(this);
        this.reserveRooms = this.reserveRooms.bind(this);
        this.searchCities = this.searchCities.bind(this);
    }

    /**
     * Search hotels
     * GET /hotels/search?location=San Francisco&checkIn=2025-12-01&checkOut=2025-12-03&guests=2
     */
    async search(req, res, next) {
        try {
            const filters = {
                location: req.query.location,
                checkIn: req.query.checkIn,
                checkOut: req.query.checkOut,
                guests: req.query.guests ? parseInt(req.query.guests) : 2
            };

            const hotels = await this.hotelService.searchHotels(filters);

            res.status(200).json({
                success: true,
                data: hotels,
                count: hotels.length,
                filters: filters
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get hotel details by ID
     * GET /hotels/:id
     */
    async getDetails(req, res, next) {
        try {
            const { id } = req.params;

            if (!id || isNaN(id)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid hotel ID'
                });
            }

            const hotel = await this.hotelService.getHotelById(parseInt(id));

            res.status(200).json({
                success: true,
                data: hotel
            });
        } catch (error) {
            if (error.message === 'Hotel not found') {
                return res.status(404).json({
                    success: false,
                    error: 'Hotel not found'
                });
            }
            next(error);
        }
    }

    /**
     * Get room types for a hotel
     * GET /hotels/:id/rooms
     */
    async getRoomTypes(req, res, next) {
        try {
            const { id } = req.params;

            if (!id || isNaN(id)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid hotel ID'
                });
            }

            const rooms = await this.hotelService.getRoomTypes(parseInt(id));

            res.status(200).json({
                success: true,
                data: rooms
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Reserve rooms
     * POST /hotels/:id/rooms/reserve
     * Body: { roomCount: 2 }
     */
    async reserveRooms(req, res, next) {
        try {
            const { id } = req.params;
            const { roomCount } = req.body;

            if (!id || isNaN(id)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid hotel ID'
                });
            }

            if (!roomCount || isNaN(roomCount)) {
                return res.status(400).json({
                    success: false,
                    error: 'roomCount must be a number'
                });
            }

            const result = await this.hotelService.reserveRooms(
                parseInt(id),
                parseInt(roomCount)
            );

            res.status(201).json({
                success: true,
                data: result,
                message: 'Rooms reserved successfully'
            });
        } catch (error) {
            if (error.message.includes('available') ||
                error.message.includes('rooms')) {
                return res.status(409).json({
                    success: false,
                    error: error.message
                });
            }
            next(error);
        }
    }

    /**
     * Search cities/hotels (autocomplete)
     * GET /hotels/search-cities?q=san
     */
    async searchCities(req, res, next) {
        try {
            const { query } = req.query;

            if (!query || query.length < 2) {
                return res.status(200).json({
                    success: true,
                    data: []
                });
            }

            const results = await this.hotelService.searchCities(query);

            res.status(200).json({
                success: true,
                data: results
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = HotelController;
