import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
    const { login, authError, loading } = useAuth();
    const [form, setForm] = useState({
        email: '',
        password: '',
    });
    const [fieldErrors, setFieldErrors] = useState({});

    function updateField(event) {
        const { name, value } = event.target;

        setForm((current) => ({
            ...current,
            [name]: value,
        }));
    }

    async function submit(event) {
        event.preventDefault();
        setFieldErrors({});

        console.log('Login submit:', form);
        try {
            const result = await login(form.email, form.password);
            console.log('Login successful:', result);
        } catch (error) {
            console.error('Login error:', error);
            setFieldErrors(error.response?.data?.errors || {});
        }
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-[#eef5ee] px-4 py-10">
            <section className="w-full max-w-md rounded-lg border border-[#d7e3d6] bg-white p-8 shadow-sm">
                <div className="mb-8">
                    <p className="text-sm font-semibold uppercase tracking-wide text-[#4d7a39]">AgriCore Intelligence</p>
                    <h1 className="mt-2 text-2xl font-semibold text-[#172316]">Sign in to Farm Management</h1>
                    <p className="mt-2 text-sm text-[#647260]">Access farms, field records, labour assignments, and dashboards.</p>
                </div>

                <form className="space-y-5" onSubmit={submit}>
                    <div>
                        <label className="block text-sm font-medium text-[#243322]" htmlFor="email">Email</label>
                        <input
                            className="mt-2 w-full rounded-md border border-[#cbd8ca] px-3 py-2 text-sm outline-none transition focus:border-[#4d7a39] focus:ring-2 focus:ring-[#4d7a39]/20"
                            id="email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            value={form.email}
                            onChange={updateField}
                            required
                        />
                        {fieldErrors.email && <p className="mt-2 text-sm text-red-700">{fieldErrors.email[0]}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[#243322]" htmlFor="password">Password</label>
                        <input
                            className="mt-2 w-full rounded-md border border-[#cbd8ca] px-3 py-2 text-sm outline-none transition focus:border-[#4d7a39] focus:ring-2 focus:ring-[#4d7a39]/20"
                            id="password"
                            name="password"
                            type="password"
                            autoComplete="current-password"
                            value={form.password}
                            onChange={updateField}
                            required
                        />
                        {fieldErrors.password && <p className="mt-2 text-sm text-red-700">{fieldErrors.password[0]}</p>}
                    </div>

                    {authError && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{authError}</p>}

                    <button
                        className="w-full rounded-md bg-[#315f2b] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#264b22] disabled:cursor-not-allowed disabled:opacity-60"
                        type="submit"
                        disabled={loading}
                    >
                        {loading ? 'Signing in...' : 'Sign in'}
                    </button>
                </form>
            </section>
        </main>
    );
}
