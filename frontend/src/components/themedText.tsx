import React from 'react';

export type ThemedTextProps = {
    colorText?: string;
    numberOfLines?: number;
    type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link' | 'light' | 'medium';
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
};

const fontLight = 'font-light';
const fontRegular = 'font-normal';
const fontMedium = 'font-medium';
const fontSemiBold = 'font-semibold';

const ThemedText: React.FC<ThemedTextProps> = ({
    colorText,
    numberOfLines,
    type = 'default',
    children,
    className,
    style,
}) => {
    const color = colorText ?? 'text-black';

    const textTypeClass = () => {
        switch (type) {
            case 'title':
                return 'font-bold';
            case 'defaultSemiBold':
                return fontSemiBold;
            case 'subtitle':
                return fontSemiBold;
            case 'link':
                return 'text-blue-500 underline';
            case 'light':
                return fontLight;
            case 'medium':
                return fontMedium;
            default:
                return fontRegular;
        }
    };

    const hasTextSize = className && /text-\S+/.test(className);

    return (
        <p
            className={`${color} ${!hasTextSize ? textTypeClass() : ''} font-poppins ${className}`}
            style={{
                WebkitLineClamp: numberOfLines,
                overflow: 'hidden',
                display: numberOfLines ? '-webkit-box' : undefined,
                WebkitBoxOrient: numberOfLines ? 'vertical' : undefined,
                ...style,
            }}
        >
            {children}
        </p>
    );
};
export default ThemedText;