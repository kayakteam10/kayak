/**
 * CarController - HTTP request handling
 */

class CarController {
    constructor(carService) {
        this.carService = carService;

        this.search = this.search.bind(this);
        this.getDetails = this.getDetails.bind(this);
        this.reserve = this.reserve.bind(this);
        this.searchLocations = this.searchLocations.bind(this);
    }

    async search(req, res, next) {
        try {
            const filters = {
                location: req.query.location,
                pickupDate: req.query.pickupDate,
                returnDate: req.query.returnDate,
                carType: req.query.carType || 'any'
            };

            const cars = await this.carService.searchCars(filters);

            res.status(200).json({
                success: true,
                data: cars,
                count: cars.length,
                filters: filters
            });
        } catch (error) {
            next(error);
        }
    }

    async getDetails(req, res, next) {
        try {
            const { id } = req.params;

            if (!id || isNaN(id)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid car ID'
                });
            }

            const car = await this.carService.getCarById(parseInt(id));

            res.status(200).json({
                success: true,
                data: car
            });
        } catch (error) {
            if (error.message === 'Car not found') {
                return res.status(404).json({
                    success: false,
                    error: 'Car not found'
                });
            }
            next(error);
        }
    }

    async reserve(req, res, next) {
        try {
            const { id } = req.params;
            const { pickupDate, returnDate } = req.body;

            if (!id || isNaN(id)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid car ID'
                });
            }

            const result = await this.carService.reserveCar(
                parseInt(id),
                pickupDate,
                returnDate
            );

            res.status(201).json({
                success: true,
                data: result,
                message: 'Car reserved successfully'
            });
        } catch (error) {
            if (error.message.includes('available')) {
                return res.status(409).json({
                    success: false,
                    error: error.message
                });
            }
            next(error);
        }
    }

    async searchLocations(req, res, next) {
        try {
            const { q } = req.query;

            if (!q || q.length < 2) {
                return res.status(200).json({
                    success: true,
                    data: []
                });
            }

            const locations = await this.carService.searchLocations(q);

            res.status(200).json({
                success: true,
                data: locations
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = CarController;
