import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AcceptInvitation() {
    const { logout } = useAuth();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const [invitation, setInvitation] = useState(null);
    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');
    const [error, setError] = useState('');
    const [status, setStatus] = useState('loading');

    useEffect(() => {
        if (!token) {
            setError('This invitation link is missing its security token.');
            setStatus('error');
            return;
        }

        axios.get(`/api/invitations/${token}`)
            .then((response) => {
                setInvitation(response.data.data);
                setStatus('ready');
            })
            .catch((requestError) => {
                setError(requestError.response?.data?.message || 'This invitation is invalid, expired, or has already been used.');
                setStatus('error');
            });
    }, [token]);

    async function handleSubmit(event) {
        event.preventDefault();
        setError('');

        try {
            await axios.post('/api/invitations/accept', {
                token,
                password,
                password_confirmation: passwordConfirmation,
            });
            setStatus('accepted');
        } catch (requestError) {
            setError(requestError.response?.data?.message || requestError.response?.data?.errors?.password?.[0] || 'We could not set up your account.');
        }
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-[#eef5ee] px-4 py-10">
            <section className="w-full max-w-md rounded-lg border border-[#d7e3d6] bg-white p-8 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-wide text-[#4d7a39]">Smart Farm Management</p>
                {status === 'loading' && <p className="mt-4 text-sm text-[#647260]">Checking your invitation…</p>}
                {status === 'error' && (
                    <>
                        <h1 className="mt-2 text-2xl font-semibold text-[#172316]">Invitation unavailable</h1>
                        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
                    </>
                )}
                {status === 'accepted' && (
                    <>
                        <h1 className="mt-2 text-2xl font-semibold text-[#172316]">Account ready</h1>
                        <p className="mt-3 text-sm text-[#647260]">Your password has been set. You can now sign in.</p>
                        <Link
                            className="mt-6 inline-block rounded-md bg-[#315f2b] px-4 py-2 text-sm font-semibold text-white hover:bg-[#264b22]"
                            to="/login"
                            onClick={logout}
                        >
                            Go to sign in
                        </Link>
                    </>
                )}
                {status === 'ready' && invitation && (
                    <>
                        <h1 className="mt-2 text-2xl font-semibold text-[#172316]">Set up your account</h1>
                        <p className="mt-2 text-sm text-[#647260]">You are joining as <strong>{invitation.role}</strong> using {invitation.email}.</p>
                        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
                            <div>
                                <label className="block text-sm font-medium text-[#243322]" htmlFor="password">Create password</label>
                                <input className="mt-1 w-full rounded-md border border-[#cbd8ca] px-3 py-2" id="password" type="password" minLength="8" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[#243322]" htmlFor="passwordConfirmation">Confirm password</label>
                                <input className="mt-1 w-full rounded-md border border-[#cbd8ca] px-3 py-2" id="passwordConfirmation" type="password" minLength="8" autoComplete="new-password" value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} required />
                            </div>
                            {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
                            <button className="w-full rounded-md bg-[#315f2b] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#264b22]" type="submit">Finish account setup</button>
                        </form>
                    </>
                )}
            </section>
        </main>
    );
}
