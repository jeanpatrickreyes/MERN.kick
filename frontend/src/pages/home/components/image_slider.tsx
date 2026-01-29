import { useEffect, useState } from "react";
import useIsMobile from "../../../hooks/useIsMobile";

export default function ImageSlider() {
    const [currentIndex, setCurrentIndex] = useState(0);
    const isMobile = useIsMobile();
    
    // Array of slider images
    const sliderImages = [
        "/assets/slider-1.jpg",
        "/assets/slider-2.jpg",
        "/assets/slider-3.jpg",
        "/assets/slider-4.jpg",
        "/assets/slider-5.jpg",
        "/assets/slider-6.jpg",
        "/assets/slider-7.jpg",
        "/assets/slider-8.jpg",
    ];

    // Auto-advance slider
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % sliderImages.length);
        }, 5000); // Change image every 5 seconds
        return () => clearInterval(timer);
    }, [sliderImages.length]);

    const goToPrevious = () => {
        setCurrentIndex((prev) => (prev - 1 + sliderImages.length) % sliderImages.length);
    };

    const goToNext = () => {
        setCurrentIndex((prev) => (prev + 1) % sliderImages.length);
    };

    // Get the images to display based on device type
    const getVisibleImages = () => {
        if (isMobile) {
            // Mobile: show only the current image
            return [
                { image: sliderImages[currentIndex], index: currentIndex, isActive: true },
            ];
        } else {
            // Desktop: show previous, current, and next images
            const prevIndex = (currentIndex - 1 + sliderImages.length) % sliderImages.length;
            const nextIndex = (currentIndex + 1) % sliderImages.length;
            return [
                { image: sliderImages[prevIndex], index: prevIndex, isActive: false },
                { image: sliderImages[currentIndex], index: currentIndex, isActive: true },
                { image: sliderImages[nextIndex], index: nextIndex, isActive: false },
            ];
        }
    };

    const visibleImages = getVisibleImages();

    return (
        <div className="relative w-full flex items-center justify-center px-4 sm:px-8 py-8">
            {/* Left Navigation Button */}
            <button
                onClick={goToPrevious}
                className="absolute left-0 sm:left-4 z-20 bg-white/80 hover:bg-white text-gray-800 rounded-full p-3 sm:p-4 shadow-lg transition-all hover:scale-110"
                aria-label="Previous slide"
            >
                <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
            </button>

            {/* Images Container */}
            <div className={`flex items-center justify-center ${isMobile ? 'gap-0' : 'gap-3 sm:gap-6'} w-full ${isMobile ? 'max-w-full px-4' : 'max-w-6xl'}`}>
                {visibleImages.map((item, position) => (
                    <div
                        key={`${item.index}-${position}`}
                        className={`transition-all duration-700 ease-in-out ${
                            item.isActive
                                ? isMobile 
                                    ? 'w-full z-10 transform'
                                    : 'flex-1 max-w-[400px] sm:max-w-[500px] z-10 transform'
                                : 'flex-1 max-w-[200px] sm:max-w-[300px] opacity-60 scale-90 z-0 transform'
                        }`}
                        style={{
                            transition: 'all 0.7s cubic-bezier(0.4, 0, 0.2, 1)',
                        }}
                    >
                        <div
                            className={`backdrop-blur-sm bg-white/100 border-none border-white/20 rounded-xl overflow-hidden shadow-lg transition-all duration-700 ease-in-out ${
                                item.isActive
                                    ? 'shadow-2xl hover:scale-105'
                                    : 'shadow-md'
                            }`}
                            style={{
                                transition: 'all 0.7s cubic-bezier(0.4, 0, 0.2, 1)',
                            }}
                        >
                            <img
                                src={item.image}
                                alt={`Slider ${item.index + 1}`}
                                className={`w-full h-full object-contain transition-all duration-700 ease-in-out ${
                                    item.isActive
                                        ? isMobile
                                            ? 'min-h-[250px] sm:min-h-[400px]'
                                            : 'min-h-[300px] sm:min-h-[400px]'
                                        : 'min-h-[200px] sm:min-h-[250px]'
                                }`}
                                style={{
                                    transition: 'all 0.7s cubic-bezier(0.4, 0, 0.2, 1)',
                                    objectFit: 'contain',
                                }}
                                loading={position === 0 || (isMobile && item.isActive) ? "eager" : "lazy"}
                                onError={(e) => {
                                    console.error(`Failed to load slider image: ${item.image}`);
                                    e.currentTarget.style.display = 'none';
                                }}
                            />
                        </div>
                    </div>
                ))}
            </div>

            {/* Right Navigation Button */}
            <button
                onClick={goToNext}
                className="absolute right-0 sm:right-4 z-20 bg-white/80 hover:bg-white text-gray-800 rounded-full p-3 sm:p-4 shadow-lg transition-all hover:scale-110"
                aria-label="Next slide"
            >
                <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
            </button>

            {/* Dots indicator - Hidden */}
            {/* <div className="absolute bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                {sliderImages.map((_, index) => (
                    <button
                        key={index}
                        onClick={() => setCurrentIndex(index)}
                        className={`h-2 sm:h-3 rounded-full transition-all ${
                            index === currentIndex 
                                ? 'bg-red-500 w-6 sm:w-8' 
                                : 'bg-gray-400 hover:bg-gray-500 w-2 sm:w-3'
                        }`}
                        aria-label={`Go to slide ${index + 1}`}
                    />
                ))}
            </div> */}
        </div>
    );
}

