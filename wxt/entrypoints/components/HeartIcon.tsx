interface HeartIconProps {
    className?: string;
    size: number;
}

// GitHub Sponsors' heart. Decorative: every use sits beside text that says "Sponsor".
export default function HeartIcon({ className, size }: HeartIconProps) {
    return (
        <svg className={className} viewBox="0 0 16 16" width={size} height={size} aria-hidden="true">
            <path d="M8 14.25.345 6.595a4.25 4.25 0 0 1 6.01-6.01L8 2.23 9.645.585a4.25 4.25 0 0 1 6.01 6.01Z" />
        </svg>
    );
}
