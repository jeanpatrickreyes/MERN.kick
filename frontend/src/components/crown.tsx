import AppAssets from "../ultis/assets";
import { getCrownCount } from "../ultis/crownUtils";

interface CrownProps {
    winRate: number;
    className?: string;
    size?: string;
}

export default function Crown({ winRate, className = "", size = "w-5" }: CrownProps) {
    const crownCount = getCrownCount(winRate);

    if (crownCount === 0) {
        return null;
    }

    return (
        <div className={`flex items-center gap-0.5 ${className}`}>
            {Array.from({ length: crownCount }).map((_, index) => (
                <img
                    key={index}
                    src={AppAssets.crown}
                    alt="crown"
                    className={size}
                    onError={(e) => {
                        console.error(`[Crown] Failed to load crown image: ${AppAssets.crown}`);
                        // Fallback to a data URI or hide the image
                        e.currentTarget.style.display = 'none';
                    }}
                />
            ))}
        </div>
    );
}

