/**
 * FlightController
 * 
 * SOLID Principles Applied:
 * - Single Responsibility: Only handles HTTP requests/responses
 * - Dependency Inversion: Depends on FlightService interface
 * 
 * Responsibilities:
 * - Extract request parameters
 * - Call service layer
 * - Format responses
 * - Handle errors via middleware
 */

class FlightController {
    constructor(flightService) {
        this.flightService = flightService;

        // Bind methods to preserve 'this' context
        this.search = this.search.bind(this);
        this.getDetails = this.getDetails.bind(this);
        this.getSeats = this.getSeats.bind(this);
        this.reserveSeats = this.reserveSeats.bind(this);
        this.searchAirports = this.searchAirports.bind(this);
    }

    /**
     * Search flights
     * GET /flights/search?from=SFO&to=JFK&date=2024-12-01&passengers=2&type=oneway
     */
    async search(req, res, next) {
        try {
            const filters = {
                origin: req.query.from?.toUpperCase(),
                destination: req.query.to?.toUpperCase(),
                date: req.query.date,
                returnDate: req.query.return_date,
                passengers: req.query.passengers ? parseInt(req.query.passengers) : 1,
                tripType: req.query.type || 'oneway'
            };

            const flights = await this.flightService.searchFlights(filters);

            res.status(200).json({
                success: true,
                data: flights,
                count: flights.length,
                filters: filters
            });
        } catch (error) {
            next(error); // Pass to error middleware
        }
    }

    /**
     * Get flight details by ID
     * GET /flights/:id
     */
    async getDetails(req, res, next) {
        try {
            const { id } = req.params;

            if (!id || isNaN(id)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid flight ID'
                });
            }

            const flight = await this.flightService.getFlightById(parseInt(id));

            res.status(200).json({
                success: true,
                data: flight
            });
        } catch (error) {
            if (error.message === 'Flight not found') {
                return res.status(404).json({
                    success: false,
                    error: 'Flight not found'
                });
            }
            next(error);
        }
    }

    /**
     * Get available seats for a flight
     * GET /flights/:id/seats
     */
    async getSeats(req, res, next) {
        try {
            const { id } = req.params;

            if (!id || isNaN(id)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid flight ID'
                });
            }

            const seats = await this.flightService.getFlightSeats(parseInt(id));

            res.status(200).json({
                success: true,
                data: seats
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Reserve seats
     * POST /flights/:id/seats/reserve
     * Body: { seatNumbers: ['12A', '12B'] }
     */
    async reserveSeats(req, res, next) {
        try {
            const { id } = req.params;
            const { seatNumbers } = req.body;

            if (!id || isNaN(id)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid flight ID'
                });
            }

            if (!seatNumbers || !Array.isArray(seatNumbers)) {
                return res.status(400).json({
                    success: false,
                    error: 'seatNumbers must be an array'
                });
            }

            const result = await this.flightService.reserveSeats(
                parseInt(id),
                seatNumbers
            );

            res.status(201).json({
                success: true,
                data: result,
                message: 'Seats reserved successfully'
            });
        } catch (error) {
            // Handle specific business logic errors
            if (error.message.includes('available') ||
                error.message.includes('seats')) {
                return res.status(409).json({
                    success: false,
                    error: error.message
                });
            }
            next(error);
        }
    }

    /**
     * Search airports (autocomplete)
     * GET /airports/search?q=san
     */
    async searchAirports(req, res, next) {
        try {
            const { q } = req.query;

            if (!q || q.length < 2) {
                return res.status(200).json({
                    success: true,
                    data: []
                });
            }

            const airports = await this.flightService.searchAirports(q);

            res.status(200).json({
                success: true,
                data: airports
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = FlightController;
