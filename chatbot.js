const Package = require('../models/Package');

const processChatbotMessage = async (message) => {
    const lowerMessage = message.toLowerCase();
    
    // 1. Handle greetings
    if (/hello|hi|hey/.test(lowerMessage)) {
        return {
            response: "Hello! I'm your WanderWave travel assistant. I can help you find packages by destination, price, or type (adventure, beach, cultural, etc.). How can I help?",
            intent: "greeting"
        };
    }

    // 2. Handle price range queries
    const priceMatch = lowerMessage.match(/\$?(\d+)/);
    if (priceMatch) {
        const price = parseInt(priceMatch[1]);
        const packages = await Package.find({
            price: { $lte: price + 100, $gte: price - 100 }
        }).sort({ price: 1 }).limit(5);

        if (packages.length > 0) {
            return {
                response: `Here are ${packages.length} packages around $${price}:`,
                intent: "price_query",
                packages: packages.map(pkg => ({
                    title: pkg.title,
                    destination: pkg.destination,
                    duration: pkg.duration,
                    price: `$${pkg.price}`,
                    type: pkg.type,
                    rating: pkg.rating,
                    image: pkg.image
                }))
            };
        }
        return {
            response: `No packages found around $${price}. Would you like to see our best deals?`,
            intent: "price_query_empty"
        };
    }

    // 3. Handle destination queries
    const destinations = ['bali', 'paris', 'tokyo', 'london', 'new york', 'rome'];
    const destinationMatch = destinations.find(dest => lowerMessage.includes(dest));
    
    if (destinationMatch) {
        const packages = await Package.find({
            destination: new RegExp(destinationMatch, 'i')
        }).sort({ price: 1 }).limit(5);

        if (packages.length > 0) {
            return {
                response: `Here are our ${destinationMatch} packages:`,
                intent: "destination_query",
                packages: packages.map(pkg => ({
                    title: pkg.title,
                    price: `$${pkg.price}`,
                    duration: pkg.duration,
                    type: pkg.type,
                    rating: pkg.rating,
                    image: pkg.image,
                    features: pkg.features.slice(0, 3)
                }))
            };
        }
        return {
            response: `Currently no packages available for ${destinationMatch}. Check out our other destinations!`,
            intent: "destination_query_empty"
        };
    }

    // 4. Handle package type queries
    const packageTypes = ['adventure', 'beach', 'cultural', 'luxury', 'family', 'festival'];
    const typeMatch = packageTypes.find(type => lowerMessage.includes(type));
    
    if (typeMatch) {
        const packages = await Package.find({
            type: typeMatch
        }).sort({ rating: -1 }).limit(5);

        if (packages.length > 0) {
            return {
                response: `Our top-rated ${typeMatch} packages:`,
                intent: "type_query",
                packages: packages.map(pkg => ({
                    title: pkg.title,
                    destination: pkg.destination,
                    price: `$${pkg.price}`,
                    duration: pkg.duration,
                    rating: pkg.rating,
                    image: pkg.image
                }))
            };
        }
    }

    // 5. Handle duration queries
    const durationMatch = lowerMessage.match(/(\d+)\s*(day|week)/i);
    if (durationMatch) {
        const days = durationMatch[1];
        const packages = await Package.find({
            durationDays: { $lte: parseInt(days) + 2, $gte: parseInt(days) - 2 }
        }).limit(5);

        if (packages.length > 0) {
            return {
                response: `Packages around ${days} days:`,
                intent: "duration_query",
                packages: packages
            };
        }
    }

    // 6. Handle feature queries
    const commonFeatures = ['flight', 'hotel', 'guide', 'meals', 'insurance'];
    const featureMatch = commonFeatures.find(feat => lowerMessage.includes(feat));
    if (featureMatch) {
        const packages = await Package.find({
            features: { $in: [new RegExp(featureMatch, 'i')] }
        }).limit(5);

        if (packages.length > 0) {
            return {
                response: `Packages including ${featureMatch}:`,
                intent: "feature_query",
                packages: packages
            };
        }
    }

    // Default response with suggestions
    return {
        response: "I can help you find packages by:\n- Price (e.g. 'under $500')\n- Destination (e.g. 'Bali packages')\n- Type (e.g. 'adventure trips')\n- Duration (e.g. '7 day packages')\nWhat are you looking for?",
        intent: "general_help",
        suggestions: [
            "Show me luxury packages",
            "What's available in Paris?",
            "Family trips under $1000",
            "Week-long beach vacations"
        ]
    };
};

module.exports = {
    processChatbotMessage
};