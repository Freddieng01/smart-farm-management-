import { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleSubmit(event) {
        event.preventDefault();
        setMessage('');
        setError('');
        setLoading(true);

        try {
            const response = await axios.post('/api/forgot-password', { email });
            setMessage(response.data.message);
        } catch (requestError) {
            setError(requestError.response?.data?.message || 'We could not send the reset link.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
            <section className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
                <h1 className="mb-2 text-2xl font-bold text-gray-800">Reset your password</h1>
                <p className="mb-6 text-sm text-gray-600">Enter your account email and we will send you a password reset link.</p>
                {message && <p className="mb-4 rounded bg-green-100 px-3 py-2 text-sm text-green-800">{message}</p>}
                {error && <p className="mb-4 rounded bg-red-100 px-3 py-2 text-sm text-red-800">{error}</p>}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input
                        type="email"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2"
                        placeholder="Email address"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        required
                    />
                    <button className="w-full rounded-lg bg-green-600 px-4 py-2 font-bold text-white disabled:opacity-50" disabled={loading}>
                        {loading ? 'Sending...' : 'Send reset link'}
                    </button>
                </form>
                <Link className="mt-5 inline-block text-sm text-green-700 hover:underline" to="/login">Back to sign in</Link>
            </section>
        </main>
    );
}
