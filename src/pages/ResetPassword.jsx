import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function ResetPassword() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [email, setEmail] = useState(searchParams.get('email') || '');
    const [password, setPassword] = useState('');
    const [confirmation, setConfirmation] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleSubmit(event) {
        event.preventDefault();
        setError('');
        setLoading(true);

        try {
            await axios.post('/api/reset-password', {
                token: searchParams.get('token'),
                email,
                password,
                password_confirmation: confirmation,
            });
            navigate('/login', { state: { message: 'Password reset successfully. You can now sign in.' } });
        } catch (requestError) {
            setError(requestError.response?.data?.message || requestError.response?.data?.errors?.password?.[0] || 'We could not reset your password.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
            <section className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
                <h1 className="mb-2 text-2xl font-bold text-gray-800">Create a new password</h1>
                <p className="mb-6 text-sm text-gray-600">Choose a new password for your account.</p>
                {error && <p className="mb-4 rounded bg-red-100 px-3 py-2 text-sm text-red-800">{error}</p>}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input type="email" className="w-full rounded-lg border border-gray-300 px-3 py-2" placeholder="Email address" value={email} onChange={(event) => setEmail(event.target.value)} required />
                    <input type="password" minLength="8" className="w-full rounded-lg border border-gray-300 px-3 py-2" placeholder="New password" value={password} onChange={(event) => setPassword(event.target.value)} required />
                    <input type="password" minLength="8" className="w-full rounded-lg border border-gray-300 px-3 py-2" placeholder="Confirm new password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required />
                    <button className="w-full rounded-lg bg-green-600 px-4 py-2 font-bold text-white disabled:opacity-50" disabled={loading}>
                        {loading ? 'Resetting...' : 'Reset password'}
                    </button>
                </form>
                <Link className="mt-5 inline-block text-sm text-green-700 hover:underline" to="/login">Back to sign in</Link>
            </section>
        </main>
    );
}
