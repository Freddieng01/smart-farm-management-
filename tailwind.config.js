/** @type {import('tailwindcss').Config} */
export default {
    content: [
        './resources/**/*.blade.php',
        './resources/**/*.js',
        './resources/**/*.jsx',
        './src/**/*.js',
        './src/**/*.jsx',
    ],
    theme: {
        extend: {
            colors: {
                farm: {
                    50: '#f1f8f1',
                    100: '#dcefdc',
                    200: '#bcdcbc',
                    300: '#8fc18f',
                    400: '#5fa05f',
                    500: '#3f8541',
                    600: '#2f6b33',
                    700: '#265629',
                    800: '#1f4422',
                    900: '#16301a',
                },
                harvest: {
                    50: '#fffaeb',
                    100: '#fef0c7',
                    200: '#fddf8a',
                    400: '#f5b932',
                    500: '#e69f0f',
                    600: '#c47f08',
                },
            },
            boxShadow: {
                card: '0 1px 2px rgba(22,48,26,.06), 0 4px 12px rgba(22,48,26,.06)',
            },
            keyframes: {
                drift: {
                    '0%': { transform: 'translateX(-25vw)' },
                    '100%': { transform: 'translateX(110vw)' },
                },
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-8px)' },
                },
                rise: {
                    '0%': { opacity: '0', transform: 'translateY(12px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
            },
            animation: {
                drift: 'drift 60s linear infinite',
                float: 'float 6s ease-in-out infinite',
                rise: 'rise 0.6s ease-out backwards',
            },
        },
    },
    plugins: [],
};