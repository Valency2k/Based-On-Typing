/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                background: '#0D0F16',
                card: '#141721',
                'card-glass': 'rgba(20, 23, 33, 0.7)',
                primary: '#4C82FB',
                error: '#FF5E5E',
                success: '#4DF07C',
                gold: '#F5C242',
                purple: '#B57EFF',
                text: '#FFFFFF',
                'text-muted': '#9CA3AF',
            },
            borderRadius: {
                'modern': '16px',
                'modern-lg': '24px',
            },
            boxShadow: {
                'modern': '0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)',
                'modern-lg': '0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05)',
                'glow-blue': '0 0 20px rgba(76, 130, 251, 0.3), 0 0 40px rgba(76, 130, 251, 0.3)',
                'glow-green': '0 0 20px rgba(77, 240, 124, 0.3), 0 0 40px rgba(77, 240, 124, 0.3)',
                'glow-red': '0 0 20px rgba(255, 94, 94, 0.3), 0 0 40px rgba(255, 94, 94, 0.3)',
                'glow-gold': '0 0 20px rgba(245, 194, 66, 0.3), 0 0 40px rgba(245, 194, 66, 0.3)',
                'glow-purple': '0 0 20px rgba(181, 126, 255, 0.3), 0 0 40px rgba(181, 126, 255, 0.3)',
            },
        },
    },
    plugins: [],
}
