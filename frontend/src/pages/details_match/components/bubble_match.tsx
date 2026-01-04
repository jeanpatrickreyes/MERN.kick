import { motion } from "framer-motion";

interface BubbleProps {
    title: string;
    subTitles: string[];
    color?: string;
    position: string;
    size: string;
    sizeSub?: any
    sizeTitle?: any
    shadow?: boolean
}

export function Bubble({
    title,
    subTitles,
    color = "from-purple-600 to-purple-800",
    position,
    sizeSub,
    sizeTitle,
    shadow
}: BubbleProps) {
    return (
        <motion.div
            className={`absolute ${position} flex flex-col items-center justify-center text-white gap-1
          rounded-full bg-gradient-to-br p-2 ${color}
          shadow-[0_0_20px_rgba(255,255,255,0.4)]
          transform -translate-x-1/2 -translate-y-1/2`}
            initial={{ scale: 0.3, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: false, amount: 0.5 }}
            transition={{ duration: 0.8 }}
        >
            <div
                className={`
          min-w-14 aspect-square
          flex flex-col justify-center items-center 
          rounded-full bg-gradient-to-br ${color}
${shadow ? "shadow-[0_0_30px_rgba(255,0,0,0.6)]" : "hover:shadow-[5px_5px_70px_rgba(255,0,0,0.6)]"}
        `}
            >
                <div className="flex flex-col items-center justify-center self-center">
                    <div className="text-sm font-bold text-white text-center"
                        style={{ fontSize: sizeTitle }}>
                        {title}
                    </div>
                    <div className="mt-1 flex flex-col items-center">
                        {subTitles.map((x, i) => (
                            <div key={i} style={{ fontSize: sizeSub }} className="text-[7px] text-white text-center leading-tight whitespace-pre-line">
                                {x}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
