import { Link } from 'react-router-dom';

export default function ModuleShell({ title, description, children }) {
    return (
        <main className="min-h-screen bg-[#f7faf7] px-6 py-8">
            <div className="mx-auto max-w-7xl">
                <Link to="/dashboard" className="text-sm text-[#4d7a39] hover:underline">&larr; Back to Dashboard</Link>
                <h1 className="mt-3 text-2xl font-semibold text-[#172316]">{title}</h1>
                <p className="mb-6 text-sm text-[#647260]">{description}</p>
                <div className="rounded-lg border border-[#dfe9de] bg-white p-6 shadow-sm">{children}</div>
            </div>
        </main>
    );
}